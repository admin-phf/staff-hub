/* PHF Staff Hub — Google Drive v1.2.0 (23 Oct 2026, Staff Hub v21.42.0)
 * v1.2.0: under the drop box, signed out shows one button — Sign in to Google Drive — and what then loads by itself; From Google
 *   Drive and the folder line appear once signed in. Centred, the same on every tool.
 * v1.1.0 (Staff Hub v21.41.0)
 * v1.1.0: loads by itself. Sign in once (one click — Google opens its own window) and, for up to an hour in that browser tab:
 *   - every page keeps this browser's saved files (Library) and Google Drive › "PHF Staff Hub" in step: a newer copy in Drive
 *     comes in (Reconcile CH2 Order: the POS master and Ongoing Discounts; POS New Product Check Clean: the POS Database and
 *     supplier sets; the hub: everything), and a file a tool saves goes to Drive straight away. Unchanged files are not copied
 *     again (each copy carries a fingerprint, phfHash);
 *   - Build POS Master Databases and POS New Product Check Clean load every file in their own Drive folder (picked once per
 *     browser, "Loads every time") when the page opens, through the tool's own drop handler — a file dropped on top replaces one.
 *   Access: "drive.file" (the PHF Staff Hub folder it writes) + "drive.readonly" (read the folder you choose; it never changes or
 *   deletes anything in Drive). The token is kept in this tab's sessionStorage until it expires (about an hour), never longer.
 * v1.0.0: From Google Drive under Drop all; Save to / Get from Google Drive in the Saved files panel.
 * Nothing here runs until assets/js/phf-drive-config.js has the Google settings (docs/GOOGLE-DRIVE-SETUP.md).
 *
 * Security: sign-in is Google's own (Google Identity Services, token model); the Staff Hub never sees a password. Sign out
 * revokes the token. Files go straight between Google Drive and this browser; no other server is involved.
 *
 * Use:
 *   PHFDrive.configured(), signedIn(), signIn() (from a click), signOut(), onChange(fn), onReport(fn)
 *   PHFDrive.pick({ multi }) / pickFolder()  → Google's picker
 *   PHFDrive.download(doc) → File (a Google Sheet comes back as .xlsx)
 *   PHFDrive.saveRecord(rec[, list]), saveAll(records, step) → one Drive file per Library kind in "PHF Staff Hub" (skipped when unchanged)
 *   PHFDrive.listSaved(), getLatest(Library[, kinds]), sync(Library, kinds, { pull, push, force })
 * A saved file deleted in a browser is not brought back there by itself until a newer copy is saved (phf.drive.gone.<kind>).
 */
(function (g) {
  'use strict';
  var CFG = g.PHF_DRIVE_CONFIG || {};
  var SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.readonly'];
  var SCOPE = SCOPES.join(' ');
  var FOLDER = 'PHF Staff Hub', FOLDER_MIME = 'application/vnd.google-apps.folder', SHEET = 'application/vnd.google-apps.spreadsheet';
  var XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  var API = 'https://www.googleapis.com/drive/v3/files', UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
  var FROM_DRIVE = 'from Google Drive', SKEY = 'phf.drive.session', FKEY = 'phf.drive.folder.', GKEY = 'phf.drive.gone.';
  // Which saved files each page takes from Drive by itself (null = all), and the pages that load their own Drive folder.
  var PAGE = (function () { var m = String(g.location && g.location.pathname || '').match(/\/tools\/([^\/]+)\//); return m ? m[1] : 'hub'; })();
  var PULL = {
    'reconcile-ch2': ['posMaster', 'lib:ref-discounts', 'supplierMerge'],
    'pos-supplier-merge': ['lib:pos-db', 'lib:ch2-posdb', 'lib:uhp-posdb', 'lib:ch2-db', 'lib:uhp-db', 'lib:ref-discounts'],
    'database-build': ['lib:ref-brand', 'lib:ref-box', 'lib:ref-discounts'],
    hub: null
  };
  var FOLDER_PAGES = { 'database-build': 1, 'pos-supplier-merge': 1 };
  var token = null, tokenExp = 0, canRead = true, tokenClient = null, gisReady = null, pickerReady = null, folderReq = null;
  var listeners = [], reporters = [], chain = Promise.resolve(), pending = {}, pushTimer = null, wasIn = false;

  function configured() { return !!(CFG.clientId && CFG.apiKey && CFG.appId); }
  function signedIn() { return !!token && Date.now() < tokenExp - 60000; }
  function emit() { var on = signedIn(); listeners.slice().forEach(function (fn) { try { fn({ signedIn: on }); } catch (e) {} }); if (on && !wasIn) { wasIn = true; autoSync(); } if (!on) wasIn = false; }
  function onChange(fn) { if (typeof fn === 'function') listeners.push(fn); }
  function report(r) { reporters.slice().forEach(function (fn) { try { fn(r); } catch (e) {} }); }
  function onReport(fn) { if (typeof fn === 'function') reporters.push(fn); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function q(v) { return String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
  function queue(fn) { var p = chain.then(function () { return fn(); }); chain = p.catch(function () {}); return p; }
  function label(kind) { var L = g.PHFLibrary, i = L && L.info ? L.info(kind) : null; return (i && i.label) || kind; }
  function hhmm() { var d = new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }

  // ---- sign-in (kept for this browser tab until Google's token expires, so every tool can load by itself)
  function restore() {
    try { var s = JSON.parse(g.sessionStorage.getItem(SKEY) || 'null');
      if (s && s.t && s.scope === SCOPE && s.exp > Date.now() + 60000) { token = s.t; tokenExp = s.exp; canRead = s.read !== false; } } catch (e) {}
  }
  function keep() { try { if (token) g.sessionStorage.setItem(SKEY, JSON.stringify({ t: token, exp: tokenExp, scope: SCOPE, read: canRead })); else g.sessionStorage.removeItem(SKEY); } catch (e) {} }
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.async = true;
      s.onload = function () { res(); }; s.onerror = function () { rej(new Error('Could not reach Google (' + src.split('/')[2] + '). Check the internet connection.')); };
      document.head.appendChild(s);
    });
  }
  function loadGis() {
    if (!gisReady) gisReady = loadScript('https://accounts.google.com/gsi/client').then(function () {
      tokenClient = g.google.accounts.oauth2.initTokenClient({ client_id: CFG.clientId, scope: SCOPE, callback: function () {} });
    });
    return gisReady;
  }
  function loadPicker() {
    if (!pickerReady) pickerReady = loadScript('https://apis.google.com/js/api.js').then(function () {
      return new Promise(function (res, rej) { g.gapi.load('picker', { callback: res, onerror: function () { rej(new Error('Google Picker did not load.')); } }); });
    });
    return pickerReady;
  }
  // Google opens its sign-in window only from a click, so the sign-in library is loaded when the page opens and
  // requestAccessToken runs straight from the click.
  function signIn() {
    if (signedIn()) return Promise.resolve(token);
    if (!configured()) return Promise.reject(new Error('Google Drive is not set up yet (assets/js/phf-drive-config.js).'));
    var ask = function () {
      return new Promise(function (res, rej) {
        tokenClient.callback = function (r) {
          if (r && r.access_token) {
            token = r.access_token; tokenExp = Date.now() + (Number(r.expires_in) || 3600) * 1000;
            canRead = !r.scope || String(r.scope).split(' ').indexOf(SCOPES[1]) >= 0;   // the read permission can be unticked
            keep(); emit(); res(token);
          } else rej(new Error((r && (r.error_description || r.error)) || 'Google sign-in was cancelled.'));
        };
        tokenClient.error_callback = function (e) { rej(new Error(e && e.type === 'popup_closed' ? 'Google sign-in was closed before it finished.' : (e && e.message) || 'Google sign-in did not open — allow pop-ups for this site and click again.')); };
        tokenClient.requestAccessToken({ prompt: '' });
      });
    };
    if (tokenClient) return ask();
    return loadGis().then(ask);
  }
  function signOut() {
    var t = token; token = null; tokenExp = 0; folderReq = null; keep(); emit();
    try { if (t && g.google && g.google.accounts && g.google.accounts.oauth2) g.google.accounts.oauth2.revoke(t, function () {}); } catch (e) {}
  }
  function api(url, opt) {
    opt = opt || {}; opt.headers = Object.assign({ Authorization: 'Bearer ' + token }, opt.headers || {});
    return fetch(url, opt).then(function (r) {
      if (r.status === 401) { token = null; tokenExp = 0; keep(); emit(); throw new Error('The Google sign-in has expired — sign in again.'); }
      if (!r.ok) return r.text().then(function (t) { var m = ''; try { m = JSON.parse(t).error.message; } catch (e) { m = t.slice(0, 160); } throw new Error('Google Drive said: ' + (m || r.status)); });
      return r;
    });
  }

  // ---- Google's picker: files (From Google Drive) or one folder (Loads every time)
  function picker(o, view, map) {
    return signIn().then(loadPicker).then(function () {
      return new Promise(function (res) {
        var P = g.google.picker, v = view(P);
        if (P.DocsViewMode && v.setMode) v.setMode(P.DocsViewMode.LIST);
        var b = new P.PickerBuilder().setAppId(CFG.appId).setOAuthToken(token).setDeveloperKey(CFG.apiKey).addView(v).setTitle(o.title)
          .setCallback(function (d) {
            if (d.action === P.Action.PICKED) res(map((d.docs || []).map(function (x) { return { id: x.id, name: x.name, mimeType: x.mimeType }; })));
            else if (d.action === P.Action.CANCEL) res(map([]));
          });
        if (o.multi) b.enableFeature(P.Feature.MULTISELECT_ENABLED);
        b.build().setVisible(true);
      });
    });
  }
  function pick(o) {
    o = o || {};
    return picker({ title: o.title || 'Choose files for the Staff Hub', multi: o.multi !== false },
      function (P) { return new P.DocsView(P.ViewId.DOCS).setIncludeFolders(true).setSelectFolderEnabled(false); },
      function (docs) { return docs; });
  }
  function pickFolder() {
    return picker({ title: 'Choose the Google Drive folder to load every time', multi: false },
      function (P) { return new P.DocsView(P.ViewId.FOLDERS || P.ViewId.DOCS).setIncludeFolders(true).setSelectFolderEnabled(true).setMimeTypes(FOLDER_MIME); },
      function (docs) { return docs[0] ? { id: docs[0].id, name: docs[0].name } : null; });
  }

  function download(doc) {
    var sheet = doc.mimeType === SHEET;
    if (!sheet && /^application\/vnd\.google-apps\./.test(doc.mimeType || '')) return Promise.reject(new Error(doc.name + ' is a Google Doc / Slides file — only files and Google Sheets can be used.'));
    var url = sheet ? API + '/' + encodeURIComponent(doc.id) + '/export?mimeType=' + encodeURIComponent(XLSX) : API + '/' + encodeURIComponent(doc.id) + '?alt=media&supportsAllDrives=true';
    return api(url).then(function (r) { return r.blob(); }).then(function (blob) {
      var name = sheet && !/\.xlsx$/i.test(doc.name) ? doc.name + '.xlsx' : doc.name;
      return new File([blob], name, { type: sheet ? XLSX : (blob.type || doc.mimeType || ''), lastModified: Date.now() });
    });
  }
  function downloadAll(docs) { return docs.reduce(function (p, d) { return p.then(function (out) { return download(d).then(function (f) { out.push(f); return out; }); }); }, Promise.resolve([])); }

  // ---- the "PHF Staff Hub" folder this app made, and its saved copies of the Library
  function folderId() {
    if (folderReq) return folderReq;
    var find = API + '?q=' + encodeURIComponent("appProperties has { key='phfFolder' and value='1' } and trashed=false") + '&fields=files(id,name)&pageSize=5';
    folderReq = api(find).then(function (r) { return r.json(); }).then(function (j) {
      if (j.files && j.files.length) return j.files[0].id;
      return api(API + '?fields=id', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: FOLDER, mimeType: FOLDER_MIME, appProperties: { phfFolder: '1' } }) })
        .then(function (r) { return r.json(); }).then(function (f) { return f.id; });
    }).catch(function (e) { folderReq = null; throw e; });
    return folderReq;
  }
  function listSaved() {
    return folderId().then(function (fid) {
      var url = API + '?q=' + encodeURIComponent("'" + q(fid) + "' in parents and trashed=false") + '&fields=files(id,name,size,modifiedTime,mimeType,appProperties)&pageSize=200&orderBy=modifiedTime desc';
      return api(url).then(function (r) { return r.json(); }).then(function (j) {
        return (j.files || []).filter(function (f) { return f.appProperties && f.appProperties.phfKind; })
          .map(function (f) { var a = f.appProperties; return { id: f.id, name: f.name, size: Number(f.size) || 0, modifiedTime: f.modifiedTime, mimeType: f.mimeType, kind: a.phfKind, source: a.phfSource || '', savedAt: a.phfSavedAt || f.modifiedTime, hash: a.phfHash || '' }; });
      });
    });
  }
  // A short fingerprint of a file, so an unchanged file is not copied again either way.
  function hashBlob(blob) {
    if (!(g.crypto && g.crypto.subtle && blob && blob.arrayBuffer)) return Promise.resolve('');
    return blob.arrayBuffer().then(function (b) { return g.crypto.subtle.digest('SHA-256', b); })
      .then(function (h) { return Array.prototype.map.call(new Uint8Array(h).slice(0, 16), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); })
      .catch(function () { return ''; });
  }
  // One Drive file per Library kind: a new save replaces the content of the same file (its link stays the same).
  function saveRecord(rec, list) {
    if (!rec || !rec.blob) return Promise.reject(new Error('Nothing to save for ' + (rec && rec.kind)));
    return Promise.all([folderId(), list ? Promise.resolve(list) : listSaved(), hashBlob(rec.blob)]).then(function (a) {
      var fid = a[0], h = a[2], existing = a[1].filter(function (f) { return f.kind === rec.kind; })[0];
      if (existing && h && existing.hash === h) return { id: existing.id, same: true };
      var meta = { name: rec.name || rec.kind, appProperties: { phfKind: String(rec.kind), phfSource: String(rec.source || '').slice(0, 60), phfSavedAt: rec.savedAt || new Date().toISOString(), phfHash: h } };
      if (!existing) meta.parents = [fid];
      var fd = new FormData();
      fd.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
      fd.append('file', rec.blob, rec.name || rec.kind);
      var url = (existing ? UPLOAD + '/' + encodeURIComponent(existing.id) : UPLOAD) + '?uploadType=multipart&fields=id,name,modifiedTime';
      return api(url, { method: existing ? 'PATCH' : 'POST', body: fd }).then(function (r) { return r.json(); });
    });
  }
  // A saved file deleted in this browser stays deleted here: the Drive copy is not brought back by itself unless a newer one is
  // saved later (Get from Google Drive still takes it on purpose).
  function goneAt(kind) { try { var a = g.localStorage.getItem(GKEY + kind) || '', b = g.localStorage.getItem(GKEY + '*') || ''; return a > b ? a : b; } catch (e) { return ''; } }
  function watchDeletes() {
    var L = g.PHFLibrary; if (!L || !L.onChange) return;
    L.onChange(function (m) {
      if (!m) return; var now = new Date().toISOString();
      try { if (m.action === 'remove' && m.kind) g.localStorage.setItem(GKEY + m.kind, now); else if (m.action === 'clear') g.localStorage.setItem(GKEY + '*', now); else if (m.action === 'put' && m.kind) g.localStorage.removeItem(GKEY + m.kind); } catch (e) {}
    });
  }
  // Bring this browser and Drive into step: newer Drive copies (of `kinds`, or all) come in; this browser's own newer files go
  // out (not ones that came from Drive). → { got: [drive files], saved: [records], same, total }
  function sync(L, kinds, o) {
    o = o || {};
    return Promise.all([listSaved(), L.list()]).then(function (a) {
      var files = a[0], local = a[1], newest = {}, here = {}, got = [], saved = [], same = 0, steps = [];
      files.forEach(function (f) { if (!newest[f.kind] || f.savedAt > newest[f.kind].savedAt) newest[f.kind] = f; });
      local.forEach(function (r) { here[r.kind] = r; });
      if (o.pull !== false) Object.keys(newest).forEach(function (kind) {
        if (kinds && kinds.indexOf(kind) < 0) return;
        var f = newest[kind], h = here[kind], gone = !h && !o.force && goneAt(kind);
        if (gone && f.savedAt <= gone) return;   // deleted here; no newer copy since
        if (h && h.savedAt && h.savedAt >= f.savedAt) { same++; return; }
        steps.push(function () {
          return (h && h.blob && f.hash ? hashBlob(h.blob) : Promise.resolve('')).then(function (lh) {
            if (lh && lh === f.hash) { same++; return; }
            return download(f).then(function (file) { return L.put(kind, file, { name: f.name, source: f.source, meta: FROM_DRIVE }); }).then(function () { got.push(f); });
          });
        });
      });
      if (o.push !== false) local.forEach(function (r) {
        if (!r.blob || r.meta === FROM_DRIVE || (o.pushKinds && o.pushKinds.indexOf(r.kind) < 0)) return;
        var f = newest[r.kind]; if (f && f.savedAt >= r.savedAt) return;
        steps.push(function () { return saveRecord(r, files).then(function (x) { if (x && x.same) same++; else saved.push(r); }); });
      });
      return steps.reduce(function (p, s) { return p.then(s); }, Promise.resolve()).then(function () { return { got: got, saved: saved, same: same, total: Object.keys(newest).length }; });
    });
  }
  function getLatest(L, onlyKinds) { return queue(function () { return sync(L, onlyKinds || null, { push: false, force: true }); }); }
  // Save these Library records now (the Saved files panel's button), one by one; unchanged ones are skipped.
  function saveAll(records, step) {
    return queue(function () {
      return listSaved().then(function (files) {
        var out = { saved: [], same: 0 }, n = 0;
        return records.reduce(function (p, r) { return p.then(function () { if (step) step(++n, records.length); return saveRecord(r, files).then(function (x) { if (x && x.same) out.same++; else out.saved.push(r); }); }); }, Promise.resolve()).then(function () { return out; });
      });
    });
  }
  function syncText(r) {
    var bits = [];
    if (r.got.length) bits.push('newer ' + r.got.map(function (f) { return label(f.kind); }).join(', ') + ' from Google Drive');
    if (r.saved.length) bits.push(r.saved.map(function (x) { return label(x.kind); }).join(', ') + ' saved to Google Drive');
    return bits.length ? bits.join(' · ') + ' (' + hhmm() + ')' : (r.total ? 'saved files up to date' : 'no saved files in Drive yet') + ' (' + hhmm() + ')';
  }
  // Every page, once signed in (and on open when the tab is still signed in): take the newer copies this page uses, send
  // this browser's newer files. A tool that saves a file afterwards sends it at once (below).
  function autoSync() {
    var L = g.PHFLibrary; if (!L || !configured() || !signedIn()) return;
    queue(function () { return sync(L, PULL[PAGE] === undefined ? null : PULL[PAGE]); })
      .then(function (r) { report({ type: 'sync', result: r, text: syncText(r) }); })
      .catch(function (e) { report({ type: 'error', text: e.message || String(e) }); });
  }
  // A file a tool saves to the Library goes to Drive straight away (one file per kind; unchanged files are skipped).
  function wrapLibrary() {
    var L = g.PHFLibrary; if (!L || L.__phfDrive) return; L.__phfDrive = true;
    var put = L.put;
    L.put = function (kind, blob, info) {
      return put.apply(L, arguments).then(function (out) {
        if (!(info && info.meta === FROM_DRIVE)) { pending[kind] = 1; if (signedIn()) { clearTimeout(pushTimer); pushTimer = setTimeout(flushPush, 1500); } }
        return out;
      });
    };
  }
  function flushPush() {
    var L = g.PHFLibrary, kinds = Object.keys(pending); pending = {};
    if (!L || !kinds.length || !signedIn()) return;
    queue(function () { return sync(L, null, { pull: false, pushKinds: kinds }); })
      .then(function (r) { if (r.saved.length) report({ type: 'saved', result: r, text: syncText(r) }); })
      .catch(function (e) { report({ type: 'error', text: e.message || String(e) }); });
  }

  // ---- a tool's own Drive folder: picked once in this browser, loaded every time the page opens
  function folderPref() { try { var f = JSON.parse(g.localStorage.getItem(FKEY + PAGE) || 'null'); return f && f.id ? f : null; } catch (e) { return null; } }
  function setFolderPref(f) { try { if (f) g.localStorage.setItem(FKEY + PAGE, JSON.stringify({ id: f.id, name: f.name })); else g.localStorage.removeItem(FKEY + PAGE); } catch (e) {} }
  function listFolder(id) {
    var url = API + '?q=' + encodeURIComponent("'" + q(id) + "' in parents and trashed=false") + '&fields=files(id,name,mimeType,size,modifiedTime)&pageSize=200&orderBy=name&supportsAllDrives=true&includeItemsFromAllDrives=true';
    return api(url).then(function (r) { return r.json(); }).then(function (j) {
      return (j.files || []).filter(function (f) { return f.mimeType !== FOLDER_MIME && (f.mimeType === SHEET || !/^application\/vnd\.google-apps\./.test(f.mimeType || '')); });
    });
  }
  // The tool wires its drop handler when it starts (after its password, if it has one); wait for that.
  function whenReady(input) {
    return new Promise(function (res) { (function wait(n) { if (typeof input.onchange === 'function' || n > 2400) res(); else setTimeout(function () { wait(n + 1); }, 250); })(0); });
  }

  // ---- the Google Drive line under each tool's "Drop all input files here"
  function feed(input, files) {
    var dt = new DataTransfer(); files.forEach(function (f) { dt.items.add(f); });
    input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  var ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.7 3.5h8.6l5.2 9-4.3 7.5H6.8L2.5 12.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M7.7 3.5l4.3 7.5h9.5M2.5 12.5h9.5l4.3 7.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  function wireDropButtons() {
    if (!configured()) return;
    var zone = document.querySelector('#bulkDrop'), input = document.querySelector('#bulkInput');
    if (!zone || !input || zone.parentNode.querySelector('.phf-drive-row')) return;
    var hasFolder = !!FOLDER_PAGES[PAGE];
    var row = document.createElement('div'); row.className = 'phf-drive-row';
    // v1.2.0: signed out there is one thing to press (Sign in to Google Drive) and a line saying what then loads by itself;
    // signed in, From Google Drive and the folder line show. Centred under the drop box on every page.
    row.innerHTML = '<div class="phf-drive-btns"><button type="button" class="phf-drive-btn phf-drive-in" data-drive-in hidden title="One click signs in to Google Drive for this browser tab (up to an hour)">' + ICON + 'Sign in to Google Drive</button>' +
      '<button type="button" class="phf-drive-btn" data-drive-pick hidden title="Choose particular files in Google Drive (Google\'s own window) — they are checked exactly as if dropped here">' + ICON + 'From Google Drive</button></div>' +
      '<span class="phf-drive-hint" data-drive-hint hidden></span>' +
      (hasFolder ? '<div class="phf-drive-folder" data-drive-folder hidden></div>' : '') +
      '<span class="phf-drive-note" aria-live="polite"></span><span class="phf-drive-sync" aria-live="polite"></span>';
    zone.insertAdjacentElement('afterend', row);
    var pickBtn = row.querySelector('[data-drive-pick]'), inBtn = row.querySelector('[data-drive-in]'), fold = row.querySelector('[data-drive-folder]'), hint = row.querySelector('[data-drive-hint]');
    var note = row.querySelector('.phf-drive-note'), syncNote = row.querySelector('.phf-drive-sync'), loading = false;
    var say = function (t, bad) { note.className = 'phf-drive-note' + (bad ? ' is-error' : ''); note.textContent = t || ''; };
    var paintFolder = function () {
      if (!fold) return; var f = folderPref();
      fold.innerHTML = f ? '<span>Loads every time: <b>' + esc(f.name) + '</b></span><button type="button" class="phf-drive-link" data-folder-load>Load again</button><button type="button" class="phf-drive-link" data-folder-pick>Change</button><button type="button" class="phf-drive-link" data-folder-off title="Stop loading a Drive folder here">✕</button>'
        : '<button type="button" class="phf-drive-link" data-folder-pick title="Pick the Google Drive folder that holds this tool\'s files — they load by themselves whenever this page opens">Choose a Drive folder to load every time</button>';
    };
    var loadFolder = function () {
      var f = folderPref(); if (!f || loading) return Promise.resolve();
      if (!signedIn()) { say('Sign in to load "' + f.name + '" from Google Drive.'); return Promise.resolve(); }
      if (!canRead) { say('Google Drive read access was not allowed, so "' + f.name + '" cannot be listed. Sign out (Saved files) and sign in again, allowing it.', true); return Promise.resolve(); }
      loading = true; say('Loading "' + f.name + '" from Google Drive…');
      return whenReady(input).then(function () { return listFolder(f.id); }).then(function (docs) {
        if (!docs.length) { say('"' + f.name + '" in Google Drive has no files to load.'); return; }
        say('Getting ' + docs.length + ' file' + (docs.length === 1 ? '' : 's') + ' from "' + f.name + '"…');
        return downloadAll(docs).then(function (files) { feed(input, files); say('From Google Drive › ' + f.name + ': ' + files.length + ' file' + (files.length === 1 ? '' : 's') + ' (' + hhmm() + '). Drop a file on top to replace one.'); });
      }).catch(function (e) { say(/not found|File not found|404/i.test(e.message || '') ? 'The Drive folder "' + f.name + '" could not be opened — choose it again.' : (e.message || String(e)), true); })
        .then(function () { loading = false; });
    };
    var hintText = function () {
      if (hasFolder) { var f = folderPref(); return f ? 'Then "' + f.name + '" loads by itself, every time this page opens.' : 'Then choose the Drive folder to load every time.'; }
      return PAGE === 'reconcile-ch2' ? 'Then the newest POS master and Ongoing Discounts load by themselves.' : 'Then the saved files load by themselves.';
    };
    var paint = function () {
      var on = signedIn(); inBtn.hidden = on; pickBtn.hidden = !on; hint.hidden = on; hint.textContent = on ? '' : hintText();
      if (fold) fold.hidden = !on; paintFolder();
    };
    onChange(paint); paint();
    onReport(function (r) { if (r.text) { syncNote.className = 'phf-drive-sync' + (r.type === 'error' ? ' is-error' : ''); syncNote.textContent = r.type === 'error' ? 'Google Drive: ' + r.text : 'Google Drive: ' + r.text; } });
    pickBtn.onclick = function () {
      say(signedIn() ? 'Opening Google Drive…' : 'Signing in to Google…');
      pick({ multi: true }).then(function (docs) {
        if (!docs.length) { say(''); return; }
        pickBtn.disabled = true; say('Getting ' + docs.length + ' file' + (docs.length === 1 ? '' : 's') + ' from Google Drive…');
        return downloadAll(docs).then(function (files) { feed(input, files); say('From Google Drive: ' + files.map(function (f) { return f.name; }).join(', ')); });
      }).catch(function (e) { say(e.message || String(e), true); }).then(function () { pickBtn.disabled = false; });
    };
    inBtn.onclick = function () {
      say('Signing in to Google…');
      signIn().then(function () { say(''); return loadFolder(); }).catch(function (e) { say(e.message || String(e), true); });
    };
    if (fold) fold.onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-folder-load')) loadFolder();
      else if (b.hasAttribute('data-folder-off')) { setFolderPref(null); paint(); say('This page no longer loads a Drive folder by itself.'); }
      else if (b.hasAttribute('data-folder-pick')) {
        say(signedIn() ? 'Opening Google Drive…' : 'Signing in to Google…');
        pickFolder().then(function (f) { if (!f) { say(''); return; } setFolderPref(f); paint(); return loadFolder(); }).catch(function (err) { say(err.message || String(err), true); });
      }
    };
    if (hasFolder && signedIn() && folderPref()) loadFolder();   // the page opened while this tab is signed in
  }

  restore();
  if (configured()) { wrapLibrary(); watchDeletes(); }
  function boot() { if (!configured()) return; loadGis().catch(function () {}); wireDropButtons(); if (signedIn()) { wasIn = true; autoSync(); } }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  g.PHFDrive = { VERSION: 'v1.2.0', configured: configured, signedIn: signedIn, signIn: signIn, signOut: signOut, pick: pick, pickFolder: pickFolder,
    download: download, saveRecord: saveRecord, saveAll: saveAll, listSaved: listSaved, getLatest: getLatest, sync: sync, onChange: onChange, onReport: onReport,
    esc: esc, FOLDER: FOLDER, FROM_DRIVE: FROM_DRIVE };
})(window);
