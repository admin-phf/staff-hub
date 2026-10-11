/* PHF Staff Hub · phf-lock.js v1.0.0 (11 Oct 2026)
 * Optional password lock for a tool page. A tool is locked when assets/js/phf-lock-config.js lists it (made with the
 * tool's own "Set password" button and committed to GitHub). The page asks for the password once per browser; Lock
 * asks again. The config holds a PBKDF2-SHA-256 hash with a random salt (150,000 rounds) — never the password.
 * GitHub Pages is a public static site, so this keeps staff out of a tool; it is not bank-grade security: anyone who can
 * read the page code could get round it. For real access control put the site behind a sign-in (e.g. Cloudflare Access).
 *
 *   PHFLock.guard('pos-supplier-merge', { label: 'POS Supplier …', ctl: element }) → Promise (resolves when unlocked)
 *   PHFLock.locked(toolId) → true when the config lists a password for the tool (used by the Staff Hub tiles)
 */
(function (G) {
  'use strict';
  var ROUNDS = 150000, MIN = 6, KEY = 'phf-lock:';
  function cfg() { var c = G.PHF_LOCK_CONFIG; return (c && c.tools) || {}; }
  function rec(tool) { var r = cfg()[tool]; return r && r.hash && r.salt ? r : null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function unhex(h) { var a = new Uint8Array(h.length / 2); for (var i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16); return a; }
  function canHash() { return !!(G.crypto && G.crypto.subtle && G.TextEncoder); }
  function derive(pw, saltHex, rounds) {
    var subtle = G.crypto.subtle;
    return subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']).then(function (key) {
      return subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(saltHex), iterations: rounds || ROUNDS }, key, 256);
    }).then(hex);
  }
  function remembered(tool, r) { try { return G.localStorage.getItem(KEY + tool) === r.hash; } catch (e) { return false; } }
  function remember(tool, r) { try { G.localStorage.setItem(KEY + tool, r.hash); } catch (e) {} }
  function forget(tool) { try { G.localStorage.removeItem(KEY + tool); } catch (e) {} }
  function melb() {
    var p = {}; new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Melbourne', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return p.day + '/' + p.month + '/' + p.year + ' ' + p.hour + ':' + p.minute;
  }

  // Styles live here so a page needs only this script (and the config) to be lockable.
  var CSS = 'html.phf-locked body>main,html.phf-locked .wb{visibility:hidden}' +
    '.phf-lock-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(18,36,60,.86);backdrop-filter:blur(6px)}' +
    '.phf-lock-card{width:min(460px,100%);background:#fff;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.35);padding:26px 26px 22px;font:400 14px/1.5 var(--phf-font,system-ui,sans-serif);color:#1C2833}' +
    '.phf-lock-card h2{margin:6px 0 8px;font:800 18px/1.25 var(--phf-font,system-ui,sans-serif);color:#1E3A5F}' +
    '.phf-lock-card p{margin:0 0 14px;color:#4A5562;font-size:13px}.phf-lock-card code{font-size:12px;background:#EEF1F3;padding:1px 5px;border-radius:4px}' +
    '.phf-lock-ico{width:44px;height:44px;border-radius:12px;background:#1E3A5F;color:#FFD966;display:flex;align-items:center;justify-content:center}.phf-lock-ico svg{width:24px;height:24px}.phf-lock-ico.is-ok{background:#E6F4EA;color:#137333}' +
    '.phf-lock-card label{display:block;font-weight:700;font-size:12px;color:#2C3E50;margin:0 0 10px}' +
    '.phf-lock-card input{display:block;width:100%;box-sizing:border-box;margin-top:4px;min-height:40px;border:1px solid #B8C2CC;border-radius:8px;padding:8px 10px;font-size:15px}' +
    '.phf-lock-card input:focus{outline:2px solid #A8C7FA;border-color:#1A73E8}' +
    '.phf-lock-err{min-height:18px;font-size:12.5px;font-weight:700;color:#C5221F;margin:2px 0 12px}.phf-lock-err.is-info{color:#5F6B7A}' +
    '.phf-lock-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}' +
    '.phf-lock-steps{margin:0 0 16px;padding-left:20px;font-size:13px;color:#4A5562}.phf-lock-steps li{margin:4px 0}' +
    '.phf-lock-ctl{display:flex;gap:6px;justify-content:flex-end;margin-top:6px}' +
    '.phf-lock-btn{display:inline-flex;align-items:center;gap:5px;border:1px solid #C9D3DD;background:#fff;color:#1E3A5F;border-radius:999px;padding:3px 10px;font:700 11px/1.2 var(--phf-font,system-ui,sans-serif);cursor:pointer}' +
    '.phf-lock-btn svg{width:13px;height:13px}.phf-lock-btn:hover{background:#EEF3F8}.phf-lock-btn.is-locked{background:#1E3A5F;color:#FFD966;border-color:#1E3A5F}.phf-lock-btn.is-locked:hover{background:#2B4A70}' +
    '.phf-page-hub .badge.lock{display:inline-flex;align-items:center;gap:4px;margin-left:auto;margin-right:6px;background:#1E3A5F;color:#FFD966;border-color:#1E3A5F}.phf-page-hub .badge.lock svg{width:11px;height:11px}';
  (function () { if (typeof document === 'undefined' || document.getElementById('phf-lock-css')) return; var st = document.createElement('style'); st.id = 'phf-lock-css'; st.textContent = CSS; (document.head || document.documentElement).appendChild(st); })();

  function overlay(html) {
    var o = document.createElement('div');
    o.className = 'phf-lock-overlay';
    o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true');
    o.innerHTML = '<div class="phf-lock-card">' + html + '</div>';
    document.body.appendChild(o);
    var f = o.querySelector('input'); if (f) setTimeout(function () { f.focus(); }, 30);
    return o;
  }
  var LOCK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

  // The password prompt over a locked page. Resolves once the right password is typed.
  function ask(tool, r, label) {
    return new Promise(function (resolve) {
      document.documentElement.classList.add('phf-locked');
      var o = overlay('<div class="phf-lock-ico">' + LOCK_SVG + '</div><h2>' + esc(label || 'This tool') + ' is locked</h2>' +
        '<p>Type the password to open it on this computer. It is remembered in this browser until someone presses Lock.</p>' +
        '<form><label>Password<input type="password" name="pw" autocomplete="current-password" required></label><div class="phf-lock-err" role="alert"></div>' +
        '<div class="phf-lock-actions"><a class="btn" href="' + esc(homeHref()) + '">Back to Staff Hub</a><button type="submit" class="btn primary">Open</button></div></form>');
      var form = o.querySelector('form'), err = o.querySelector('.phf-lock-err'), btn = o.querySelector('button[type=submit]');
      if (!canHash()) { err.textContent = 'This browser cannot check passwords here (it needs a secure https page). Open the Staff Hub from its GitHub Pages address.'; btn.disabled = true; }
      form.onsubmit = function (e) {
        e.preventDefault();
        var pw = form.pw.value; if (!pw) return;
        btn.disabled = true; err.textContent = 'Checking…'; err.className = 'phf-lock-err is-info';
        derive(pw, r.salt, r.iter).then(function (h) {
          if (h !== r.hash) { err.textContent = 'That password is not right.'; err.className = 'phf-lock-err'; btn.disabled = false; form.pw.select(); return; }
          remember(tool, r);
          o.remove(); document.documentElement.classList.remove('phf-locked');
          resolve();
        }).catch(function (x) { err.textContent = 'Could not check the password: ' + x.message; err.className = 'phf-lock-err'; btn.disabled = false; });
      };
    });
  }
  function homeHref() { var a = document.querySelector('.phf-shell-logo'); return a ? a.getAttribute('href') : '../../index.html'; }

  // Set / change / remove the password: makes a new phf-lock-config.js to download and commit (nothing changes until then).
  function setDialog(tool, label, done) {
    var r = rec(tool);
    var o = overlay('<div class="phf-lock-ico">' + LOCK_SVG + '</div><h2>' + (r ? 'Change the password' : 'Set a password') + ' for ' + esc(label) + '</h2>' +
      '<p>This makes a new <code>phf-lock-config.js</code> file. Put it in <code>assets/js/</code> of the Staff Hub (replace the old one) with GitHub Desktop and commit — the lock starts once it is on GitHub. The file keeps only a scrambled hash of the password, never the password.</p>' +
      '<form><label>New password<input type="password" name="a" autocomplete="new-password" required></label>' +
      '<label>Type it again<input type="password" name="b" autocomplete="new-password" required></label><div class="phf-lock-err" role="alert"></div>' +
      '<div class="phf-lock-actions">' + (r ? '<button type="button" class="btn" data-x="remove" title="Make a lock file without this tool, so it opens without a password">Remove the password</button>' : '') +
      '<button type="button" class="btn" data-x="cancel">Cancel</button><button type="submit" class="btn primary">Make the lock file</button></div></form>');
    var form = o.querySelector('form'), err = o.querySelector('.phf-lock-err');
    var close = function () { o.remove(); if (done) done(); };
    o.querySelector('[data-x="cancel"]').onclick = close;
    o.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    var finish = function (tools, what) {
      var text = '/* PHF Staff Hub — tool password locks (assets/js/phf-lock-config.js).\n' +
        ' * Made by a tool\'s Set password button (' + melb() + '). Each entry is a PBKDF2-SHA-256 hash with a random salt —\n' +
        ' * the password itself is not stored. Commit this file to lock / unlock the tools listed. An empty list = no locks. */\n' +
        'window.PHF_LOCK_CONFIG = ' + JSON.stringify({ version: 1, tools: tools }, null, 2) + ';\n';
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], { type: 'text/javascript' })); a.download = 'phf-lock-config.js';
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      o.querySelector('.phf-lock-card').innerHTML = '<div class="phf-lock-ico is-ok">' + LOCK_SVG + '</div><h2>Lock file downloaded</h2>' +
        '<p>' + esc(what) + '</p><ol class="phf-lock-steps"><li>Open the Staff Hub folder in GitHub Desktop (or File Explorer) and go to <code>assets/js/</code>.</li><li>Replace <code>phf-lock-config.js</code> with the file just downloaded (rename it if your browser added "(1)").</li><li>Commit and push. Pages update within a few minutes; this browser stays open until Lock is pressed.</li></ol>' +
        '<div class="phf-lock-actions"><button type="button" class="btn primary" data-x="cancel">Done</button></div>';
      o.querySelector('[data-x="cancel"]').onclick = close;
    };
    var others = function () { var t = Object.assign({}, cfg()); delete t[tool]; return t; };
    var rm = o.querySelector('[data-x="remove"]');
    if (rm) rm.onclick = function () { finish(others(), label + ' will open without a password once the new file is on GitHub. Other locked tools stay locked.'); };
    form.onsubmit = function (e) {
      e.preventDefault();
      var a = form.a.value, b = form.b.value;
      if (a.length < MIN) { err.textContent = 'Use at least ' + MIN + ' characters (a phrase of a few words is best).'; return; }
      if (a !== b) { err.textContent = 'The two passwords are not the same.'; return; }
      if (!canHash()) { err.textContent = 'This browser cannot make the hash here (it needs a secure https page).'; return; }
      var salt = new Uint8Array(16); G.crypto.getRandomValues(salt);
      var saltHex = hex(salt.buffer);
      err.textContent = 'Making the lock file…'; err.className = 'phf-lock-err is-info';
      derive(a, saltHex, ROUNDS).then(function (h) {
        var t = others(); t[tool] = { label: label, salt: saltHex, hash: h, iter: ROUNDS, setAt: melb() };
        finish(t, label + ' will ask for this password once the new file is on GitHub.');
      }).catch(function (x) { err.textContent = 'Could not make the hash: ' + x.message; err.className = 'phf-lock-err'; });
    };
  }

  function drawCtl(tool, label, host) {
    if (!host) return;
    var r = rec(tool);
    host.innerHTML = (r ? '<button type="button" class="phf-lock-btn is-locked" data-l="lock" title="Lock ' + esc(label) + ' in this browser — the password is needed to open it again">' + LOCK_SVG + '<span>Lock</span></button>' : '') +
      '<button type="button" class="phf-lock-btn" data-l="pw" title="' + (r ? 'Change or remove the password for this tool' : 'Set a password for this tool (makes a file to commit to GitHub)') + '">' + (r ? 'Password' : LOCK_SVG + '<span>Set password</span>') + '</button>';
    var lk = host.querySelector('[data-l="lock"]');
    if (lk) lk.onclick = function () { forget(tool); ask(tool, r, label).then(function () { drawCtl(tool, label, host); }); };
    host.querySelector('[data-l="pw"]').onclick = function () { setDialog(tool, label, function () { drawCtl(tool, label, host); }); };
  }

  function guard(tool, opts) {
    opts = opts || {};
    var label = opts.label || tool, r = rec(tool);
    drawCtl(tool, label, opts.ctl);
    if (!r || remembered(tool, r)) return Promise.resolve();
    return ask(tool, r, label);
  }

  // Staff Hub home page: a lock badge on the tile of every locked tool (tile href …/tools/<tool>/…).
  function markTiles() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('a.tile[href*="/tools/"]').forEach(function (a) {
      var m = a.getAttribute('href').match(/tools\/([^/]+)\//); if (!m || !rec(m[1]) || a.querySelector('.badge.lock')) return;
      var top = a.querySelector('.tile-top') || a, old = top.querySelector('.badge');
      var b = document.createElement('span'); b.className = 'badge lock'; b.title = 'Password needed to open'; b.innerHTML = LOCK_SVG + 'Locked';
      top.insertBefore(b, old || null);
    });
  }
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', markTiles); else markTiles(); }

  G.PHFLock = { VERSION: 'v1.0.0', guard: guard, locked: function (tool) { return !!rec(tool); } };
})(window);
