/* PHF Staff Hub · phf-notices.js v1.0.0 (14 Oct 2026)
 * The Staff Noticeboard's store. Notices live in ONE file in the repository, data/notices.enc.json, encrypted with a
 * staff passphrase (AES-GCM 256, key from PBKDF2-SHA-256, 150,000 rounds — the same scheme as phf-lock.js). GitHub
 * Pages serves the file to everyone; only a browser that has the passphrase can read it. The passphrase (as its derived
 * key) stays in that browser's storage once entered.
 *
 * Two kinds of notice, always told apart:
 *   published — what is in data/notices.enc.json on GitHub: everyone with the passphrase sees these.
 *   draft     — added or edited in THIS browser (localStorage). Nobody else sees a draft until it is published: either
 *               "Download notices file" (commit data/notices.enc.json with GitHub Desktop, like phf-lock-config.js) or
 *               "Publish to GitHub" (a fine-grained GitHub token kept only in this browser writes the file through the
 *               GitHub API). Both re-encrypt with the current passphrase.
 *
 *   PHFNotices.load(base)          → Promise<{ state: 'open'|'locked'|'empty'|'error', notices, drafts, file }>
 *   PHFNotices.unlock(passphrase)  → Promise<bool>   (wrong passphrase → false; right one is remembered in this browser)
 *   PHFNotices.forgetKey()           forgets the passphrase in this browser
 *   PHFNotices.all()               → published with drafts applied (draft notices carry _draft: 'new' | 'edited' | 'removed')
 *   PHFNotices.saveDraft(notice) / removeDraft(id) / discardDrafts()
 *   PHFNotices.exportFile()        → Promise<{ name, text }>  the encrypted file with the drafts applied
 *   PHFNotices.publish(token)      → Promise<{ sha, url }>    writes the file to GitHub and clears the drafts
 *   PHFNotices.setPassphrase(pw)   → Promise<{ name, text }>  re-encrypts everything with a new passphrase (then publish)
 *   PHFNotices.render(notice)      → HTML for the full content (the light markdown below)
 *   PHFNotices.CATEGORIES / PRIORITIES / token(get, set) / searchText(notice)
 * Content is light markdown: "## Heading", "### Sub-heading", "- item", "1. step", "**bold**", "[text](url)", blank line
 * between paragraphs. Nothing else is rewritten — the words stay as typed.
 */
(function (G) {
  'use strict';
  var FILE = 'data/notices.enc.json', REPO = 'admin-phf/staff-hub', BRANCH = 'main', ROUNDS = 150000;
  var LS_KEY = 'phf-notices:key', LS_DRAFTS = 'phf-notices:drafts', LS_TOKEN = 'phf-notices:token';
  var CATEGORIES = ['Product Recalls & Withdrawals', 'Supplier Updates', 'Store Operations', 'Staff Announcements', 'General Information'];
  var PRIORITIES = [
    { id: 'urgent', label: 'Urgent / Action required', short: 'Urgent', cls: 'is-red' },
    { id: 'important', label: 'Important', short: 'Important', cls: 'is-amber' },
    { id: 'info', label: 'Information', short: 'Information', cls: 'is-blue' },
    { id: 'pending', label: 'Pending confirmation', short: 'Pending', cls: 'is-grey' }
  ];
  var st = { base: './', file: null, key: null, keyHex: '', published: [], state: 'empty', error: '' };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function unhex(h) { var a = new Uint8Array(h.length / 2); for (var i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16); return a; }
  function b64(buf) { var s = '', u = new Uint8Array(buf); for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }
  function unb64(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function ls(k, v) { try { if (v === undefined) return G.localStorage.getItem(k); if (v === null) G.localStorage.removeItem(k); else G.localStorage.setItem(k, v); } catch (e) { return null; } }
  function subtle() { return G.crypto && G.crypto.subtle; }
  function stamp() {
    var p = {}; new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Melbourne', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return p.day + '/' + p.month + '/' + p.year + ' ' + p.hour + ':' + p.minute;
  }
  function today() { var p = {}; new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Melbourne', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; }); return p.year + '-' + p.month + '-' + p.day; }

  // ---- crypto
  function deriveKey(pw, saltHex) {
    return subtle().importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']).then(function (k) {
      return subtle().deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(saltHex), iterations: ROUNDS }, k, 256);
    });
  }
  function importKey(raw) { return subtle().importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']); }
  function decrypt(file, key) {
    return subtle().decrypt({ name: 'AES-GCM', iv: unhex(file.iv) }, key, unb64(file.data)).then(function (buf) { return JSON.parse(new TextDecoder().decode(buf)); });
  }
  function encrypt(obj, key, saltHex) {
    var iv = new Uint8Array(12); G.crypto.getRandomValues(iv);
    return subtle().encrypt({ name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(JSON.stringify(obj))).then(function (buf) {
      return { version: 1, kdf: 'PBKDF2-SHA256', iter: ROUNDS, salt: saltHex, cipher: 'AES-GCM', iv: hex(iv.buffer), data: b64(buf), updatedAt: stamp(), count: (obj.notices || []).length };
    });
  }

  // ---- load / unlock
  function load(base) {
    st.base = base || st.base;
    var url = st.base + FILE + '?t=' + Date.now();
    return fetch(url, { cache: 'no-store' }).then(function (r) {
      if (r.status === 404) { st.state = 'empty'; st.file = null; return null; }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (file) {
      if (!file) return result();
      st.file = file;
      if (!subtle()) { st.state = 'error'; st.error = 'This browser cannot decrypt the notices here (it needs a secure https page). Open the Staff Hub from its GitHub Pages address.'; return result(); }
      var k = ls(LS_KEY);
      if (!k) { st.state = 'locked'; return result(); }
      return importKey(unhex(k)).then(function (key) { return decrypt(file, key).then(function (obj) { st.key = key; st.keyHex = k; st.published = obj.notices || []; st.state = 'open'; return result(); }); })
        .catch(function () { ls(LS_KEY, null); st.state = 'locked'; return result(); });
    }).catch(function (e) { st.state = 'error'; st.error = String(e && e.message || e); return result(); });
  }
  function unlock(pw) {
    if (!st.file) return Promise.resolve(false);
    return deriveKey(pw, st.file.salt).then(function (raw) {
      return importKey(raw).then(function (key) { return decrypt(st.file, key).then(function (obj) { st.key = key; st.keyHex = hex(raw); ls(LS_KEY, st.keyHex); st.published = obj.notices || []; st.state = 'open'; return true; }); });
    }).catch(function () { return false; });
  }
  function forgetKey() { ls(LS_KEY, null); st.key = null; st.keyHex = ''; if (st.file) st.state = 'locked'; st.published = []; }
  function result() { return { state: st.state, error: st.error, notices: all(), drafts: drafts(), file: st.file ? { updatedAt: st.file.updatedAt, count: st.file.count } : null }; }

  // ---- drafts (this browser only)
  function drafts() { try { var d = JSON.parse(ls(LS_DRAFTS) || '{}'); return d && d.items ? d : { items: {}, removed: [] }; } catch (e) { return { items: {}, removed: [] }; } }
  function writeDrafts(d) { d.updatedAt = stamp(); ls(LS_DRAFTS, JSON.stringify(d)); }
  function draftCount() { var d = drafts(); return Object.keys(d.items).length + (d.removed || []).length; }
  function all() {
    var d = drafts(), out = [], seen = {};
    st.published.forEach(function (n) {
      seen[n.id] = 1;
      if ((d.removed || []).indexOf(n.id) >= 0) { out.push(Object.assign({}, n, { _draft: 'removed' })); return; }
      if (d.items[n.id]) { out.push(Object.assign({}, d.items[n.id], { _draft: 'edited' })); return; }
      out.push(Object.assign({}, n));
    });
    Object.keys(d.items).forEach(function (id) { if (!seen[id]) out.push(Object.assign({}, d.items[id], { _draft: 'new' })); });
    return out.sort(byRecent);
  }
  function byRecent(a, b) { return String(b.updated || b.date || '').localeCompare(String(a.updated || a.date || '')) || String(a.title).localeCompare(String(b.title)); }
  function saveDraft(n) {
    var d = drafts();
    n = Object.assign({}, n); delete n._draft;
    if (!n.id) n.id = 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    n.updated = today();
    if (!n.date) n.date = n.updated;
    d.items[n.id] = n; d.removed = (d.removed || []).filter(function (x) { return x !== n.id; });
    writeDrafts(d); return n;
  }
  function removeDraft(id) {
    var d = drafts();
    if (d.items[id]) delete d.items[id];
    if (st.published.some(function (n) { return n.id === id; }) && (d.removed || []).indexOf(id) < 0) d.removed = (d.removed || []).concat([id]);
    writeDrafts(d);
  }
  function restoreDraft(id) { var d = drafts(); delete d.items[id]; d.removed = (d.removed || []).filter(function (x) { return x !== id; }); writeDrafts(d); }
  function discardDrafts() { ls(LS_DRAFTS, null); }

  // ---- export / publish
  function merged() { return all().filter(function (n) { return n._draft !== 'removed'; }).map(function (n) { var c = Object.assign({}, n); delete c._draft; return c; }); }
  function fileFor(notices, key, saltHex) { return encrypt({ version: 1, notices: notices, savedAt: stamp() }, key, saltHex).then(function (f) { return { name: 'notices.enc.json', text: JSON.stringify(f, null, 2) + '\n', file: f }; }); }
  function exportFile() {
    if (!st.key) return Promise.reject(new Error('Enter the noticeboard passphrase first.'));
    return fileFor(merged(), st.key, st.file.salt);
  }
  function setPassphrase(pw) {
    if (!subtle()) return Promise.reject(new Error('This browser cannot encrypt here (it needs a secure https page).'));
    var salt = new Uint8Array(16); G.crypto.getRandomValues(salt); var saltHex = hex(salt.buffer);
    return deriveKey(pw, saltHex).then(function (raw) {
      return importKey(raw).then(function (key) {
        return fileFor(merged(), key, saltHex).then(function (out) { st.key = key; st.keyHex = hex(raw); ls(LS_KEY, st.keyHex); st.pendingFile = out.file; return out; });
      });
    });
  }
  function token(v) { if (v === undefined) return ls(LS_TOKEN) || ''; ls(LS_TOKEN, v || null); return v || ''; }
  function gh(path, opts, tok) {
    opts = opts || {}; opts.headers = Object.assign({ Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + tok, 'X-GitHub-Api-Version': '2022-11-28' }, opts.headers || {});
    return fetch('https://api.github.com/repos/' + REPO + '/contents/' + path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j && j.message ? j.message + ' (HTTP ' + r.status + ')' : 'HTTP ' + r.status); return j; });
    });
  }
  function publish(tok, out) {
    tok = tok || token(); if (!tok) return Promise.reject(new Error('No GitHub token in this browser — set one first.'));
    var make = out ? Promise.resolve(out) : exportFile();
    return make.then(function (o) {
      return gh(FILE + '?ref=' + BRANCH, {}, tok).then(function (cur) { return cur && cur.sha; }, function () { return null; }).then(function (sha) {
        var body = { message: 'Noticeboard: ' + o.file.count + ' notice' + (o.file.count === 1 ? '' : 's') + ' published ' + o.file.updatedAt + ' from the Staff Hub', content: btoa(unescape(encodeURIComponent(o.text))), branch: BRANCH };
        if (sha) body.sha = sha;
        return gh(FILE, { method: 'PUT', body: JSON.stringify(body) }, tok).then(function (res) {
          st.file = o.file; st.published = merged(); discardDrafts(); st.state = 'open';
          return { sha: res && res.content && res.content.sha, url: res && res.content && res.content.html_url };
        });
      });
    });
  }
  function afterDownload() { st.file = st.pendingFile || st.file; }   // the exported file is the new published one once committed

  // ---- rendering (light markdown) and search text
  function inline(s) {
    return esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }
  function render(n) {
    var lines = String(n.body || '').replace(/\r\n?/g, '\n').split('\n'), html = [], list = null, para = [];
    var flushP = function () { if (para.length) { html.push('<p>' + para.map(inline).join('<br>') + '</p>'); para = []; } };
    var flushL = function () { if (list) { html.push('<' + list.t + '>' + list.items.map(function (x) { return '<li>' + inline(x) + '</li>'; }).join('') + '</' + list.t + '>'); list = null; } };
    lines.forEach(function (ln) {
      var m;
      if ((m = ln.match(/^###\s+(.*)/))) { flushP(); flushL(); html.push('<h4>' + inline(m[1]) + '</h4>'); return; }
      if ((m = ln.match(/^##\s+(.*)/))) { flushP(); flushL(); html.push('<h3>' + inline(m[1]) + '</h3>'); return; }
      if ((m = ln.match(/^\s*[-*]\s+(.*)/))) { flushP(); if (!list || list.t !== 'ul') { flushL(); list = { t: 'ul', items: [] }; } list.items.push(m[1]); return; }
      if ((m = ln.match(/^\s*\d+[.)]\s+(.*)/))) { flushP(); if (!list || list.t !== 'ol') { flushL(); list = { t: 'ol', items: [] }; } list.items.push(m[1]); return; }
      if (!ln.trim()) { flushP(); flushL(); return; }
      flushL(); para.push(ln);
    });
    flushP(); flushL();
    var extra = '';
    if (n.action) extra += '<div class="ntc-action"><strong>Action required</strong><div>' + inline(n.action).replace(/\n/g, '<br>') + '</div></div>';
    if (n.links && n.links.length) extra += '<div class="ntc-links"><strong>Links</strong><ul>' + n.links.map(function (l) { return '<li><a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.label || l.url) + '</a></li>'; }).join('') + '</ul></div>';
    return '<div class="ntc-body">' + html.join('') + extra + '</div>';
  }
  function priority(id) { return PRIORITIES.filter(function (p) { return p.id === id; })[0] || PRIORITIES[2]; }
  function searchText(n) { return [n.title, n.category, priority(n.priority).label, n.summary, n.body, n.action, (n.links || []).map(function (l) { return l.label + ' ' + l.url; }).join(' ')].join(' ').toLowerCase(); }
  function fmtDate(d) { if (!d) return ''; var m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : String(d); }

  G.PHFNotices = { VERSION: 'v1.0.0', FILE: FILE, REPO: REPO, CATEGORIES: CATEGORIES, PRIORITIES: PRIORITIES, priority: priority,
    load: load, unlock: unlock, forgetKey: forgetKey, hasKey: function () { return !!st.key; }, state: function () { return st.state; }, fileInfo: function () { return st.file ? { updatedAt: st.file.updatedAt, count: st.file.count } : null; },
    all: all, published: function () { return st.published.slice(); }, drafts: drafts, draftCount: draftCount, saveDraft: saveDraft, removeDraft: removeDraft, restoreDraft: restoreDraft, discardDrafts: discardDrafts,
    exportFile: exportFile, afterDownload: afterDownload, publish: publish, setPassphrase: setPassphrase, token: token,
    render: render, searchText: searchText, fmtDate: fmtDate, today: today, esc: esc };
})(window);
