/* PHF Staff Hub — Library panel v2.2.0 (23 Oct 2026: when Google Drive is set up (assets/js/phf-drive.js), a Google Drive line —
 * Save to Google Drive (this panel's files into the "PHF Staff Hub" folder, one copy per file, replaced each time), Get from Google
 * Drive (newer copies from that folder into this browser's Library, so another PC gets the same files) and Sign out)
 * v2.1.0 (21 Oct 2026: Delete all asks first; ✕ on a file several tools use — Ongoing
 * Discounts, the POS DB & Supplier Merge workbook — asks first and names the tools that lose it; a delete is a delete in every
 * tool, see phf-library.js v1.2.0)
 * v2.0.0 (17 Oct 2026)
 * One shared renderer for the files the tools save in this browser (assets/js/phf-library.js). It can be mounted:
 *   - on the home page as a SUMMARY (file count + storage line) with a "View all files" expander, and
 *   - inside a tool, SCOPED to that tool — only the files that tool makes or uses, with Download / ✕ as before.
 * The files themselves are one shared store (no duplication): a file shared by several tools shows in each tool's view
 * by reference. Nothing is uploaded; another browser or PC has its own Library.
 *
 * Use:
 *   PHFLibraryPanel.mount({ root:'#libraryPanel', summaryOnly:true })           // home page
 *   PHFLibraryPanel.mount({ root:'#toolLibrary', scope:'Build POS Master Databases' })   // a tool
 * Back-compat: if #libList already exists in the root (the old home-page markup), it is reused.
 */
(function () {
  'use strict';
  var L = window.PHFLibrary;
  if (!L) return;
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function size(b) { b = b || 0; if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(1) + ' MB'; }

  // A record is relevant to a tool when the tool's name is in what makes it, what uses it, or who saved it.
  function relevant(rec, scope) {
    if (!scope) return true;
    var info = L.info(rec.kind) || {};
    var hay = [info.made, info.used, rec.source && (L.displayName ? L.displayName(rec.source) : rec.source)].join(' ');
    return hay.indexOf(scope) >= 0;
  }

  var OTHER_STORES = ['phf-pos-supplier-merge'];   // POS New Product Check Clean's own store (reference tables + session)
  function clearOtherStores() {
    return Promise.all(OTHER_STORES.map(function (name) { return new Promise(function (res) { try { var r = indexedDB.deleteDatabase(name); r.onsuccess = r.onerror = r.onblocked = function () { res(); }; } catch (e) { res(); } }); }));
  }

  function Panel(opts) {
    var root = typeof opts.root === 'string' ? document.querySelector(opts.root) : opts.root;
    if (!root) return null;
    this.opts = opts; this.root = root; this.scope = opts.scope || ''; this.summaryOnly = !!opts.summaryOnly;
    this.showAll = false; this.urls = [];
    this.build();
    this.buildDrive();   // v2.2.0
    var self = this;
    this.onChange = function () { self.render(); };
    L.onChange(this.onChange);
    this.render();
  }

  Panel.prototype.build = function () {
    var r = this.root, hadList = r.querySelector('#libList');
    this.ids = {};
    if (hadList) {   // old home-page markup — reuse it
      this.listEl = r.querySelector('#libList'); this.sumEl = r.querySelector('#libSummary');
      this.usageEl = r.querySelector('#libUsage'); this.clearEl = r.querySelector('#libClearAll');
      this.bodyEl = r.querySelector('.phf-lib-body') || r;
    } else {
      var uid = 'lib' + Math.random().toString(36).slice(2, 7);
      var heading = this.opts.heading || (this.scope ? 'Files for this tool' : 'Library · saved in this browser');
      r.classList.add('phf-lib');
      r.innerHTML =
        '<div class="results-head phf-lib-head"><div><h2>' + esc(heading) + '</h2>' +
          '<p>' + (this.scope ? 'The files this tool makes or uses, saved in this browser. Shared files are the same copy the other tools use.' : 'Files the tools save in this browser.') + '</p></div>' +
          '<div class="result-badge" id="' + uid + 'sum">Checking…</div></div>' +
        '<div class="phf-lib-body">' +
          (this.scope ? '<label class="phf-lib-allchk"><input type="checkbox" id="' + uid + 'all"> Show all saved files</label>' : '') +
          '<div class="phf-lib-list" id="' + uid + 'list"></div>' +
          '<div class="phf-lib-foot"><span id="' + uid + 'usage"></span>' +
          (this.summaryOnly || this.scope ? '' : '<button type="button" class="phf-lib-btn danger" id="' + uid + 'clear" title="Delete every saved file except the Supplier Contacts list">Delete all</button>') +
          '</div></div>';
      this.listEl = r.querySelector('#' + uid + 'list'); this.sumEl = r.querySelector('#' + uid + 'sum');
      this.usageEl = r.querySelector('#' + uid + 'usage'); this.clearEl = r.querySelector('#' + uid + 'clear');
      this.bodyEl = r.querySelector('.phf-lib-body');
      var all = r.querySelector('#' + uid + 'all'); var self = this;
      if (all) all.onchange = function () { self.showAll = all.checked; self.render(); };
    }
    if (this.clearEl) { var s = this; this.clearEl.onclick = function () {
      // v2.1.0: one click used to delete everything with no question
      if (!window.confirm('Delete every saved file from this browser?\n\nBuild POS Master Databases, POS New Product Check Clean and Reconcile CH2 Order lose every file saved here (POS Database, CH2 / Unique sets, masters, Ongoing Discounts, reference files) and POS New Product Check Clean\'s saved reference tables and session. Open tool pages drop them too.\n\nThe Supplier Contacts list stays — it holds your only copy of edits made there (its own ✕ deletes it).')) return;
      s.clearEl.disabled = true; L.clearAll().then(clearOtherStores).then(function () { s.render(); }); }; }
  };

  // v2.2.0 — Google Drive line (only when Google Drive is set up). Sign-in is Google's own window, opened from the click.
  Panel.prototype.buildDrive = function () {
    var D = window.PHFDrive, self = this; if (!D || !D.configured() || !this.bodyEl || this.driveEl) return;
    var bar = document.createElement('div'); bar.className = 'phf-lib-drive';
    bar.innerHTML = '<span class="phf-lib-drive-what"><b>Google Drive</b> <span data-drive-state></span></span>' +
      '<button type="button" class="phf-lib-btn" data-drive-save title="Save ' + (this.scope ? 'this tool\'s' : 'all the') + ' saved files to the ' + esc(D.FOLDER) + ' folder in your Google Drive — one copy per file, replaced each time">Save to Google Drive</button>' +
      '<button type="button" class="phf-lib-btn" data-drive-get title="Copy the newer files from the ' + esc(D.FOLDER) + ' folder in Google Drive into this browser">Get from Google Drive</button>' +
      '<button type="button" class="phf-lib-btn" data-drive-out hidden title="Sign out of Google Drive on this page">Sign out</button>' +
      '<span class="phf-lib-drive-msg" aria-live="polite"></span>';
    this.bodyEl.insertBefore(bar, this.bodyEl.firstChild); this.driveEl = bar;
    var state = bar.querySelector('[data-drive-state]'), out = bar.querySelector('[data-drive-out]'), msg = bar.querySelector('.phf-lib-drive-msg');
    var say = function (t, bad) { msg.textContent = t; msg.className = 'phf-lib-drive-msg' + (bad ? ' is-error' : ''); };
    var paint = function () { var on = D.signedIn(); state.textContent = on ? '· signed in' : '· not signed in'; out.hidden = !on; };
    D.onChange(paint); paint();
    var busy = function (on) { bar.querySelectorAll('button').forEach(function (b) { b.disabled = on; }); };
    bar.querySelector('[data-drive-save]').onclick = function () {
      busy(true); say(D.signedIn() ? 'Saving…' : 'Signing in to Google…');
      D.signIn().then(function () { return L.list(); }).then(function (recs) {
        var list = (self.scope && !self.showAll) ? recs.filter(function (r) { return relevant(r, self.scope); }) : recs;
        if (!list.length) { say('No saved files here to save yet.'); return; }
        var n = 0;
        return list.reduce(function (p, r) { return p.then(function () { say('Saving ' + (++n) + ' of ' + list.length + ' to Google Drive…'); return D.saveRecord(r); }); }, Promise.resolve())
          .then(function () { say('Saved ' + list.length + ' file' + (list.length === 1 ? '' : 's') + ' to Google Drive › ' + D.FOLDER + '.'); });
      }).catch(function (e) { say(e.message || String(e), true); }).then(function () { busy(false); });
    };
    bar.querySelector('[data-drive-get]').onclick = function () {
      busy(true); say(D.signedIn() ? 'Checking Google Drive…' : 'Signing in to Google…');
      D.signIn().then(function () { return D.getLatest(L); }).then(function (r) {
        if (!r.total) say('Nothing saved in Google Drive yet — use Save to Google Drive on the PC that has the files.');
        else if (!r.got.length) say('Up to date — this browser already has the newest ' + r.total + ' file' + (r.total === 1 ? '' : 's') + '.');
        else say('Got ' + r.got.length + ' newer file' + (r.got.length === 1 ? '' : 's') + ' from Google Drive (' + r.got.map(function (f) { return (L.info(f.kind) || {}).label || f.name; }).join(', ') + ')' + (r.same ? ' · ' + r.same + ' already up to date' : '') + '. Reload a tool that is open to use them.');
        self.render();
      }).catch(function (e) { say(e.message || String(e), true); }).then(function () { busy(false); });
    };
    out.onclick = function () { D.signOut(); say('Signed out of Google Drive on this page.'); };
  };

  Panel.prototype.usageLine = function () {
    var el = this.usageEl; if (!el) return Promise.resolve();
    return L.estimate().then(function (est) {
      var usage = est && est.usage != null ? 'This site is using ' + size(est.usage) + (est.quota ? ' of ' + size(est.quota) + ' the browser allows' : '') + '.' : '';
      return (L.persisted ? L.persisted() : Promise.resolve(null)).then(function (p) {
        el.innerHTML = esc(usage) + (p === true ? ' <span class="phf-pill is-green">Storage protected</span> <span>the browser will not clear these files by itself.</span>'
          : p === false ? ' <span class="phf-pill is-amber">Storage not protected</span> <span>the browser may clear this site\'s saved files when disk space is short. Install the Staff Hub as an app or bookmark it, then reload, to protect them.</span>' : '');
      });
    }).catch(function () {});
  };

  Panel.prototype.render = function () {
    var self = this;
    this.urls.forEach(function (u) { URL.revokeObjectURL(u); }); this.urls = [];
    return L.list().then(function (recs) {
      var all = recs, shown = (self.scope && !self.showAll) ? recs.filter(function (r) { return relevant(r, self.scope); }) : recs;
      var total = all.reduce(function (a, r) { return a + (r.size || 0); }, 0);
      // summary badge: scoped count for a tool, total for the home page
      if (self.sumEl) {
        if (self.scope) self.sumEl.textContent = shown.length + ' file' + (shown.length === 1 ? '' : 's');
        else self.sumEl.textContent = all.length ? all.length + ' file' + (all.length === 1 ? '' : 's') + ' · ' + size(total) : 'Empty';
      }
      if (self.clearEl) self.clearEl.disabled = !all.length;

      // Home page in summary mode: keep the list collapsed inside a "View all files" expander.
      if (self.summaryOnly && self.listEl && !self._wrapped) { self.wrapSummary(); }

      if (!shown.length) {
        self.listEl.innerHTML = '<div class="phf-lib-empty">' + (self.scope
          ? 'No saved files for this tool yet.' + (all.length ? ' <label class="phf-lib-inline-all"><input type="checkbox" id="' + 'allx' + '"> Show all ' + all.length + ' saved file' + (all.length === 1 ? '' : 's') + '</label>' : '')
          : 'Nothing saved yet. Files appear here when Build POS Master Databases finishes a build, or when you load a reference file or the Supplier Contacts list.') + '</div>';
        var cb = self.listEl.querySelector('#allx'); if (cb) cb.onchange = function () { self.showAll = cb.checked; self.render(); };
        return self.usageLine();
      }
      self.listEl.innerHTML = shown.map(function (r) {
        var info = L.info(r.kind), stale = info.generated && L.isStale(r);
        var url = r.blob ? URL.createObjectURL(r.blob) : ''; if (url) self.urls.push(url);
        var offScope = self.scope && self.showAll && !relevant(r, self.scope);
        return '<div class="phf-lib-row' + (stale ? ' stale' : '') + (offScope ? ' off-scope' : '') + '"><span class="phf-lib-dot" aria-hidden="true">' + (stale ? '!' : '✓') + '</span>' +
          '<div class="phf-lib-what"><strong>' + esc(info.label) + '</strong><span>' + esc(r.name) + '</span></div>' +
          '<div class="phf-lib-when"><strong>' + esc(L.when(r)) + '</strong><span>' + esc(L.ago(r)) + (stale ? ' — over a day old' : '') + '</span></div>' +
          '<div class="phf-lib-size">' + size(r.size) + '</div>' +
          '<div class="phf-lib-flow"><strong>Used by</strong><span>' + esc(info.used || '') + '</span><span>' + esc(r.source ? 'Saved by ' + (L.displayName ? L.displayName(r.source) : r.source) : info.made || '') + '</span></div>' +
          '<div class="phf-lib-btns">' + (url ? '<a class="phf-lib-btn download" href="' + url + '" download="' + esc(r.name) + '">Download</a>' : '') +
          '<button type="button" class="phf-lib-btn del" data-del="' + esc(r.kind) + '" title="Delete ' + esc(info.label) + ' from this browser" aria-label="Delete ' + esc(info.label) + '">✕</button></div></div>';
      }).join('');
      self.listEl.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function () {
        // v2.1.0: a file several tools use is deleted for all of them (with its linked copy), so ask first
        var kinds = L.linked ? L.linked(b.dataset.del) : [b.dataset.del];
        if (kinds.indexOf('lib:ref-discounts') >= 0 && !window.confirm('Delete Ongoing Discounts from this browser?\n\nBuild POS Master Databases, POS New Product Check Clean and Reconcile CH2 Order all use it — they lose it too' + (kinds.length > 1 ? ', and the POS DB & Supplier Merge workbook it is made from goes with it' : '') + '. Drop the file again before the next build, merge or reconciliation.')) return;
        b.disabled = true; L.remove(b.dataset.del).then(function () { self.render(); }); }; });
      return self.usageLine();
    }).catch(function (e) {
      if (self.sumEl) self.sumEl.textContent = 'Unavailable';
      if (self.listEl) self.listEl.innerHTML = '<div class="phf-lib-empty">The Library is not available in this browser (' + esc(e.message) + '). The tools still work with drag and drop.</div>';
    });
  };

  // Home page: wrap the list + Delete all in a "View all files" <details> so the page shows only the summary by default.
  Panel.prototype.wrapSummary = function () {
    var body = this.bodyEl; if (!body) return;
    var det = document.createElement('details'); det.className = 'phf-lib-viewall';
    var sm = document.createElement('summary'); sm.textContent = 'View all files'; det.appendChild(sm);
    // move the list and foot into the details
    var foot = body.querySelector('.phf-lib-foot');
    det.appendChild(this.listEl);
    if (foot) det.appendChild(foot);
    body.appendChild(det);
    this._wrapped = true;
  };

  function mount(opts) { return new Panel(opts || {}); }

  window.PHFLibraryPanel = { mount: mount };

  // Auto-mount the home page panel if its markup is present (back-compat with the old inline script).
  if (document.querySelector('#libraryPanel') && document.querySelector('#libList')) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { mount({ root: '#libraryPanel', summaryOnly: true }); });
    else mount({ root: '#libraryPanel', summaryOnly: true });
  }
})();
