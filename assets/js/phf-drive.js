/* PHF Staff Hub — Google Drive v1.0.0 (23 Oct 2026, Staff Hub v21.40.0)
 * Optional: load files from Google Drive instead of dragging them in, and keep the Library's files in Drive so every PC and
 * browser can get the same copy. Nothing here runs until assets/js/phf-drive-config.js has the Google settings filled in
 * (docs/GOOGLE-DRIVE-SETUP.md); until then the buttons stay hidden and the tools work exactly as before.
 *
 * Security: sign-in is Google's own (Google Identity Services, token model). The page asks only for the "drive.file"
 * permission — it can see the files you choose in Google's picker and the files it saved itself (the "PHF Staff Hub" folder),
 * nothing else in your Drive. The access token lives in this page's memory only (never saved), expires after about an hour,
 * and Sign out revokes it. Files go straight between Google Drive and this browser; no other server is involved.
 *
 * Use:
 *   PHFDrive.configured()            → true when the settings are filled in
 *   PHFDrive.signedIn() / signIn()   → sign in (call from a click: Google opens its own window)
 *   PHFDrive.pick({ multi })         → [{ id, name, mimeType }] chosen in Google's picker ([] when cancelled)
 *   PHFDrive.download(doc)           → File (a Google Sheet comes back as .xlsx)
 *   PHFDrive.saveRecord(rec)         → saves a Library record into "PHF Staff Hub" (one file per kind, replaced in place)
 *   PHFDrive.listSaved()             → the files this app saved, with their Library kind
 *   PHFDrive.getLatest(Library)      → copies newer Drive copies into this browser's Library → { got: [...], same: n }
 *   PHFDrive.signOut(), PHFDrive.onChange(fn)
 * The "From Google Drive" button under each tool's "Drop all input files here" is added here (it feeds the chosen files to
 * that tool's own drop handler, so every file is recognised and checked exactly as if it had been dropped).
 */
(function (g) {
  'use strict';
  var CFG = g.PHF_DRIVE_CONFIG || {};
  var SCOPE = 'https://www.googleapis.com/auth/drive.file';
  var FOLDER = 'PHF Staff Hub';
  var XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  var API = 'https://www.googleapis.com/drive/v3/files', UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
  var token = null, tokenExp = 0, tokenClient = null, gisReady = null, pickerReady = null, folderReq = null, listeners = [];

  function configured() { return !!(CFG.clientId && CFG.apiKey && CFG.appId); }
  function signedIn() { return !!token && Date.now() < tokenExp - 60000; }
  function emit() { listeners.slice().forEach(function (fn) { try { fn({ signedIn: signedIn() }); } catch (e) {} }); }
  function onChange(fn) { if (typeof fn === 'function') listeners.push(fn); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function q(v) { return String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }

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
          if (r && r.access_token) { token = r.access_token; tokenExp = Date.now() + (Number(r.expires_in) || 3600) * 1000; emit(); res(token); }
          else rej(new Error((r && (r.error_description || r.error)) || 'Google sign-in was cancelled.'));
        };
        tokenClient.error_callback = function (e) { rej(new Error(e && e.type === 'popup_closed' ? 'Google sign-in was closed before it finished.' : (e && e.message) || 'Google sign-in did not open — allow pop-ups for this site and click again.')); };
        tokenClient.requestAccessToken({ prompt: '' });
      });
    };
    if (tokenClient) return ask();
    return loadGis().then(ask);
  }
  function signOut() {
    var t = token; token = null; tokenExp = 0; folderReq = null; emit();
    try { if (t && g.google && g.google.accounts && g.google.accounts.oauth2) g.google.accounts.oauth2.revoke(t, function () {}); } catch (e) {}
  }

  function api(url, opt) {
    opt = opt || {}; opt.headers = Object.assign({ Authorization: 'Bearer ' + token }, opt.headers || {});
    return fetch(url, opt).then(function (r) {
      if (r.status === 401) { token = null; tokenExp = 0; emit(); throw new Error('The Google sign-in has expired — click again to sign in.'); }
      if (!r.ok) return r.text().then(function (t) { var m = ''; try { m = JSON.parse(t).error.message; } catch (e) { m = t.slice(0, 160); } throw new Error('Google Drive said: ' + (m || r.status)); });
      return r;
    });
  }

  function pick(o) {
    o = o || {};
    return signIn().then(loadPicker).then(function () {
      return new Promise(function (res) {
        var P = g.google.picker;
        var view = new P.DocsView(P.ViewId.DOCS).setIncludeFolders(true).setSelectFolderEnabled(false);
        if (P.DocsViewMode && view.setMode) view.setMode(P.DocsViewMode.LIST);   // drive.file has no thumbnail access (Google's advice)
        var b = new P.PickerBuilder().setAppId(CFG.appId).setOAuthToken(token).setDeveloperKey(CFG.apiKey).addView(view)
          .setTitle(o.title || 'Choose files for the Staff Hub')
          .setCallback(function (d) {
            if (d.action === P.Action.PICKED) res((d.docs || []).map(function (x) { return { id: x.id, name: x.name, mimeType: x.mimeType }; }));
            else if (d.action === P.Action.CANCEL) res([]);
          });
        if (o.multi !== false) b.enableFeature(P.Feature.MULTISELECT_ENABLED);
        b.build().setVisible(true);
      });
    });
  }

  function download(doc) {
    var sheet = doc.mimeType === 'application/vnd.google-apps.spreadsheet';
    if (!sheet && /^application\/vnd\.google-apps\./.test(doc.mimeType || '')) return Promise.reject(new Error(doc.name + ' is a Google Doc / Slides file — only files and Google Sheets can be used.'));
    var url = sheet ? API + '/' + encodeURIComponent(doc.id) + '/export?mimeType=' + encodeURIComponent(XLSX) : API + '/' + encodeURIComponent(doc.id) + '?alt=media&supportsAllDrives=true';
    return api(url).then(function (r) { return r.blob(); }).then(function (blob) {
      var name = sheet && !/\.xlsx$/i.test(doc.name) ? doc.name + '.xlsx' : doc.name;
      return new File([blob], name, { type: sheet ? XLSX : (blob.type || doc.mimeType || ''), lastModified: Date.now() });
    });
  }

  // The "PHF Staff Hub" folder this app made (drive.file only sees folders and files the app created or you picked).
  function folderId() {
    if (folderReq) return folderReq;
    var find = API + '?q=' + encodeURIComponent("appProperties has { key='phfFolder' and value='1' } and trashed=false") + '&fields=files(id,name)&pageSize=5';
    folderReq = api(find).then(function (r) { return r.json(); }).then(function (j) {
      if (j.files && j.files.length) return j.files[0].id;
      return api(API + '?fields=id', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: FOLDER, mimeType: 'application/vnd.google-apps.folder', appProperties: { phfFolder: '1' } }) })
        .then(function (r) { return r.json(); }).then(function (f) { return f.id; });
    }).catch(function (e) { folderReq = null; throw e; });
    return folderReq;
  }
  function listSaved() {
    return folderId().then(function (fid) {
      var url = API + '?q=' + encodeURIComponent("'" + q(fid) + "' in parents and trashed=false") + '&fields=files(id,name,size,modifiedTime,mimeType,appProperties)&pageSize=200&orderBy=modifiedTime desc';
      return api(url).then(function (r) { return r.json(); }).then(function (j) {
        return (j.files || []).filter(function (f) { return f.appProperties && f.appProperties.phfKind; })
          .map(function (f) { return { id: f.id, name: f.name, size: Number(f.size) || 0, modifiedTime: f.modifiedTime, mimeType: f.mimeType, kind: f.appProperties.phfKind, source: f.appProperties.phfSource || '', savedAt: f.appProperties.phfSavedAt || f.modifiedTime }; });
      });
    });
  }
  // One Drive file per Library kind: a new save replaces the content of the same file (its link stays the same).
  function saveRecord(rec) {
    if (!rec || !rec.blob) return Promise.reject(new Error('Nothing to save for ' + (rec && rec.kind)));
    return Promise.all([folderId(), listSaved()]).then(function (a) {
      var fid = a[0], existing = a[1].filter(function (f) { return f.kind === rec.kind; })[0];
      var meta = { name: rec.name || rec.kind, appProperties: { phfKind: String(rec.kind), phfSource: String(rec.source || '').slice(0, 60), phfSavedAt: rec.savedAt || new Date().toISOString() } };
      if (!existing) meta.parents = [fid];
      var fd = new FormData();
      fd.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
      fd.append('file', rec.blob, rec.name || rec.kind);
      var url = (existing ? UPLOAD + '/' + encodeURIComponent(existing.id) : UPLOAD) + '?uploadType=multipart&fields=id,name,modifiedTime';
      return api(url, { method: existing ? 'PATCH' : 'POST', body: fd }).then(function (r) { return r.json(); });
    });
  }
  // Copy into this browser's Library every Drive copy that is newer than (or missing from) the Library here.
  function getLatest(L, onlyKinds) {
    return listSaved().then(function (files) {
      var newest = {};
      files.forEach(function (f) { if (onlyKinds && onlyKinds.indexOf(f.kind) < 0) return; if (!newest[f.kind] || f.savedAt > newest[f.kind].savedAt) newest[f.kind] = f; });
      var kinds = Object.keys(newest), got = [], same = 0;
      return kinds.reduce(function (p, kind) {
        return p.then(function () {
          return L.get(kind).then(function (here) {
            var f = newest[kind];
            if (here && here.savedAt && here.savedAt >= f.savedAt) { same++; return; }
            return download(f).then(function (file) {
              return L.put(kind, file, { name: f.name, source: f.source, meta: 'from Google Drive' }).then(function () { got.push(f); });
            });
          });
        });
      }, Promise.resolve()).then(function () { return { got: got, same: same, total: kinds.length }; });
    });
  }

  // ---- "From Google Drive" under each tool's "Drop all input files here" (the files go to the tool's own drop handler)
  function feed(input, files) {
    var dt = new DataTransfer(); files.forEach(function (f) { dt.items.add(f); });
    input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function wireDropButtons() {
    if (!configured()) return;
    document.querySelectorAll('#bulkDrop').forEach(function (zone) {
      var input = document.querySelector('#bulkInput'); if (!input || zone.parentNode.querySelector('.phf-drive-row')) return;
      var row = document.createElement('div'); row.className = 'phf-drive-row';
      row.innerHTML = '<button type="button" class="phf-drive-btn" title="Choose the files in Google Drive (Google\'s own window) — they are checked exactly as if dropped here">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.7 3.5h8.6l5.2 9-4.3 7.5H6.8L2.5 12.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M7.7 3.5l4.3 7.5h9.5M2.5 12.5h9.5l4.3 7.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>' +
        'From Google Drive</button><span class="phf-drive-note" aria-live="polite"></span>';
      zone.insertAdjacentElement('afterend', row);
      var btn = row.querySelector('button'), note = row.querySelector('.phf-drive-note');
      btn.onclick = function () {
        note.className = 'phf-drive-note'; note.textContent = signedIn() ? 'Opening Google Drive…' : 'Signing in to Google…';
        pick({ multi: true }).then(function (docs) {
          if (!docs.length) { note.textContent = ''; return; }
          btn.disabled = true; note.textContent = 'Getting ' + docs.length + ' file' + (docs.length === 1 ? '' : 's') + ' from Google Drive…';
          return docs.reduce(function (p, d) { return p.then(function (out) { return download(d).then(function (f) { out.push(f); return out; }); }); }, Promise.resolve([]))
            .then(function (files) { feed(input, files); note.textContent = 'From Google Drive: ' + files.map(function (f) { return f.name; }).join(', '); });
        }).catch(function (e) { note.className = 'phf-drive-note is-error'; note.textContent = e.message || String(e); })
          .then(function () { btn.disabled = false; });
      };
    });
  }
  function boot() { if (!configured()) return; loadGis().catch(function () {}); wireDropButtons(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  g.PHFDrive = { VERSION: 'v1.0.0', configured: configured, signedIn: signedIn, signIn: signIn, signOut: signOut, pick: pick, download: download,
    saveRecord: saveRecord, listSaved: listSaved, getLatest: getLatest, onChange: onChange, esc: esc, FOLDER: FOLDER };
})(window);
