/* PHF Staff Hub — Google Drive v2.0.2 (25 Oct 2026, Staff Hub v21.45.1)
 * v2.0.2: the picker (Choose the shop folder, From Google Drive) lists everything the account can open first, then tabs for Shared
 *   with me and Shared drives — it showed only shared drives ("No folders"). A saved file over 4 MB goes up as a resumable upload (Google takes
 *   at most 5 MB in one request; the POS master is about 24 MB). A saved file that fails to go up or come in no longer stops the
 *   files after it: each is tried, and the line under the drop box says which did not make it (tried again next time).
 * v2.0.1 (24 Oct 2026, Staff Hub v21.43.1)
 * v2.0.1: the shop folder is checked when it is linked or chosen — a folder inside it (e.g. "2, pos-supplier-merge") or one without
 *   "1, …" / "2, …" is refused with what to pick instead; a PC already linked to the wrong folder says so and offers "Link the shop
 *   folder" (no files are loaded from it until then).
 * v2.0.0 (23 Oct 2026, Staff Hub v21.43.0)
 * One shared SHOP FOLDER for everyone (e.g. "GitHub Input Excel Data and Sheets 23.10.26", shared with the shop's accounts):
 *   "1, database-build"      → loads by itself in Build POS Master Databases
 *   "2, pos-supplier-merge"  → loads by itself in POS New Product Check Clean
 *   "Staff Hub saved files"  → the tools' saved files (POS master, Ongoing Discounts, the sets …), kept in step on every PC
 *                              (made when first needed; each file is "[kind] original name")
 * Two ways for a PC to reach it, set up once on the home page (Google Drive card):
 *   1. LINKED FOLDER — Google Drive for desktop syncs the shop folder to this PC; it is linked once (File System Access API,
 *      Chrome: "Allow on every visit"). No Google sign-in, nothing expires; Drive for desktop does the syncing and sharing.
 *   2. BROWSER SIGN-IN — Google Identity Services token (drive.file + drive.readonly), kept in this browser until it expires
 *      (about an hour; never longer) and renewed by itself before then; when Chrome blocks that, on the next click anywhere.
 *      The shop folder is chosen once in Google's picker.
 *   The linked folder is used when it is there; otherwise the sign-in.
 * Every page: newer saved files come in (Reconcile: POS master + Ongoing Discounts; merge: POS Database + supplier sets; hub:
 * all), and a file a tool saves goes out straight away. A file deleted in this browser is not brought back by itself.
 * Nothing runs until the browser can link a folder or assets/js/phf-drive-config.js has the Google settings.
 * v1.2.0: one Sign in button, centred. v1.1.0: loads by itself (app folder + per-tool folder). v1.0.0: From Google Drive.
 */
(function (g) {
  'use strict';
  var CFG = g.PHF_DRIVE_CONFIG || {};
  var SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.readonly'];
  var SCOPE = SCOPES.join(' ');
  var FOLDER_MIME = 'application/vnd.google-apps.folder', SHEET = 'application/vnd.google-apps.spreadsheet';
  var XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  var API = 'https://www.googleapis.com/drive/v3/files', UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files', ALL = 'supportsAllDrives=true';
  var BIG = 4 * 1024 * 1024;   // v2.0.2: bigger saved files go to Google Drive as a resumable upload
  var SAVED = 'Staff Hub saved files', FROM_DRIVE = 'from Google Drive';
  var K = { session: 'phf.drive.session', user: 'phf.drive.user', shop: 'phf.drive.shop', gone: 'phf.drive.gone.', seen: 'phf.drive.seen.', sub: 'phf.drive.sub.' };
  var PAGE = (function () { var m = String(g.location && g.location.pathname || '').match(/\/tools\/([^\/]+)\//); return m ? m[1] : 'hub'; })();
  var PULL = {
    'reconcile-ch2': ['posMaster', 'lib:ref-discounts', 'supplierMerge'],
    'pos-supplier-merge': ['lib:pos-db', 'lib:ch2-posdb', 'lib:uhp-posdb', 'lib:ch2-db', 'lib:uhp-db', 'lib:ref-discounts'],
    'database-build': ['lib:ref-brand', 'lib:ref-box', 'lib:ref-discounts'],
    hub: null
  };
  // Each tool's own subfolder in the shop folder, found by its name.
  var SUB = { 'database-build': { re: /database[\s-]*build|^\s*1\s*[,.\-\s]/i, label: '1, database-build' },
              'pos-supplier-merge': { re: /supplier[\s-]*merge|^\s*2\s*[,.\-\s]/i, label: '2, pos-supplier-merge' } };
  // v2.0.1 — is this the shop folder (the one holding "1, …" and "2, …")? A folder inside it is the usual slip in the picker.
  var INSIDE = /^\s*3\s*[,.\-\s]|orders|staff hub saved files/i;
  function shopCheck(name, subNames) {
    var has1 = subNames.some(function (n) { return SUB['database-build'].re.test(n); }), has2 = subNames.some(function (n) { return SUB['pos-supplier-merge'].re.test(n); });
    var inside = !has1 && !has2 && (SUB['database-build'].re.test(name) || SUB['pos-supplier-merge'].re.test(name) || INSIDE.test(name));
    return { ok: has1 || has2, has1: has1, has2: has2, inside: inside, name: name };
  }
  function shopProblem(c, how) {
    var pick = how === 'drive' ? 'In Google\'s window, pick the folder that holds "1, database-build", "2, pos-supplier-merge" and "3, Orders".'
      : 'In the window, open the folder that holds "1, database-build", "2, pos-supplier-merge" and "3, Orders" so you can see them, click an empty space (nothing highlighted), then Select Folder.';
    return c.inside ? '"' + c.name + '" is one of the folders inside the shop folder. Pick the folder one level up. ' + pick
      : '"' + c.name + '" has no "1, database-build" or "2, pos-supplier-merge" folder inside. ' + pick;
  }
  var linkCheck = null;   // shopCheck of the linked folder (null until looked at)
  var token = null, tokenExp = 0, canRead = true, tokenClient = null, gisReady = null, pickerReady = null, renewTimer = null, clickArmed = false;
  var link = null, linkState = 'none';   // the linked folder (FileSystemDirectoryHandle) and 'none' | 'granted' | 'prompt'
  var listeners = [], reporters = [], chain = Promise.resolve(), pending = {}, pushTimer = null, lastMode = null, started = false;

  // ---------------------------------------------------------------- small helpers
  function ls(k, v) { try { if (v === undefined) return g.localStorage.getItem(k); if (v === null) g.localStorage.removeItem(k); else g.localStorage.setItem(k, v); } catch (e) {} return null; }
  function lsJson(k) { try { return JSON.parse(ls(k) || 'null'); } catch (e) { return null; } }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function q(v) { return String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
  function queue(fn) { var p = chain.then(function () { return fn(); }); chain = p.catch(function () {}); return p; }
  function label(kind) { var L = g.PHFLibrary, i = L && L.info ? L.info(kind) : null; return (i && i.label) || kind; }
  function hhmm() { var d = new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function report(r) { reporters.slice().forEach(function (fn) { try { fn(r); } catch (e) {} }); }
  function onReport(fn) { if (typeof fn === 'function') reporters.push(fn); }
  function onChange(fn) { if (typeof fn === 'function') listeners.push(fn); }
  function slug(kind) { return String(kind).replace(/:/g, '-'); }
  function unslug(s) { return /^lib-/.test(s) ? 'lib:' + s.slice(4) : s; }
  function savedName(rec) { return '[' + slug(rec.kind) + '] ' + String(rec.name || rec.kind).replace(/[\\\/:*?"<>|]/g, '_'); }
  function parseSaved(name) { var m = /^\[([A-Za-z0-9-]+)\] (.+?)(?: \(\d+\))?(\.[A-Za-z0-9]+)?$/.exec(name || ''); return m ? { kind: unslug(m[1]), name: m[2] + (m[3] || '') } : null; }
  function skipName(n) { return /^(~\$|\.|desktop\.ini$|thumbs\.db$)|\.(crswap|tmp|lnk|gdoc|gsheet|gslides)$/i.test(n || ''); }
  function hashBlob(blob) {
    if (!(g.crypto && g.crypto.subtle && blob && blob.arrayBuffer)) return Promise.resolve('');
    return blob.arrayBuffer().then(function (b) { return g.crypto.subtle.digest('SHA-256', b); })
      .then(function (h) { return Array.prototype.map.call(new Uint8Array(h).slice(0, 16), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); })
      .catch(function () { return ''; });
  }

  // ---------------------------------------------------------------- 1. linked folder (Google Drive for desktop)
  var linkSupported = typeof g.showDirectoryPicker === 'function' && typeof g.indexedDB !== 'undefined';
  function idb(mode, fn) {
    return new Promise(function (res, rej) {
      var r = g.indexedDB.open('PHFStaffHubLink', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('handles'); };
      r.onerror = function () { rej(r.error); };
      r.onsuccess = function () { var db = r.result, t = db.transaction('handles', mode), out = fn(t.objectStore('handles')); t.oncomplete = function () { db.close(); res(out && out.result); }; t.onerror = function () { db.close(); rej(t.error); }; };
    });
  }
  function loadLink() {
    if (!linkSupported) return Promise.resolve();
    return idb('readonly', function (s) { return s.get('shop'); }).then(function (h) {
      link = h || null; if (!link) { linkState = 'none'; return; }
      return (link.queryPermission ? link.queryPermission({ mode: 'readwrite' }) : Promise.resolve('granted')).then(function (p) { linkState = p === 'granted' ? 'granted' : 'prompt'; return checkLink(); });
    }).catch(function () { link = null; linkState = 'none'; });
  }
  function checkLink() {
    if (!link || linkState !== 'granted') { linkCheck = null; return Promise.resolve(); }
    return iterate(link, 'directory').then(function (ds) { linkCheck = shopCheck(link.name, ds.map(function (d) { return d.name; })); }).catch(function () { linkCheck = null; });
  }
  function linkFolder() {   // from a click — only the shop folder itself is kept
    return g.showDirectoryPicker({ id: 'phf-shop-folder', mode: 'readwrite' }).then(function (h) {
      return iterate(h, 'directory').then(function (ds) {
        var c = shopCheck(h.name, ds.map(function (d) { return d.name; }));
        if (!c.ok) throw new Error(shopProblem(c, 'local'));
        return idb('readwrite', function (s) { return s.put(h, 'shop'); }).then(function () { link = h; linkState = 'granted'; linkCheck = c; changed(); return c; });
      });
    });
  }
  function reconnect() {    // from a click — Chrome asks; "Allow on every visit" stops it asking again
    if (!link) return Promise.reject(new Error('No folder is linked on this PC.'));
    return link.requestPermission({ mode: 'readwrite' }).then(function (p) { linkState = p === 'granted' ? 'granted' : 'prompt'; return checkLink().then(function () { changed(); if (p !== 'granted') throw new Error('The folder was not allowed — click Reconnect again and choose Allow.'); }); });
  }
  function unlink() { return idb('readwrite', function (s) { return s.delete('shop'); }).then(function () { link = null; linkState = 'none'; linkCheck = null; changed(); }); }
  function iterate(dir, kind) {
    var out = [], it = dir.values();
    return (function next() { return it.next().then(function (r) { if (r.done) return out; if (r.value.kind === kind) out.push(r.value); return next(); }); })();
  }
  var localStore = {
    type: 'local',
    ready: function () { return !!link && linkState === 'granted' && !(linkCheck && !linkCheck.ok); },
    where: function () { return link ? link.name : ''; },
    folders: function () { return iterate(link, 'directory').then(function (a) { return a.map(function (h) { return { ref: h, name: h.name }; }); }); },
    listFiles: function (dir) { return iterate(dir.ref, 'file').then(function (a) { return a.filter(function (h) { return !skipName(h.name); }).map(function (h) { return { ref: h, name: h.name }; }); }); },
    readFile: function (f) { return f.ref.getFile(); },
    savedDir: function (create) { return link.getDirectoryHandle(SAVED, { create: !!create }).catch(function (e) { if (create) throw e; return null; }); },
    listSaved: function () {
      return localStore.savedDir(false).then(function (d) {
        if (!d) return [];
        return iterate(d, 'file').then(function (hs) {
          return Promise.all(hs.map(function (h) { var p = parseSaved(h.name); if (!p) return null; return h.getFile().then(function (f) { return { ref: h, file: f, fileName: h.name, kind: p.kind, name: p.name, size: f.size, savedAt: new Date(f.lastModified).toISOString(), hash: '' }; }); }))
            .then(function (a) { return a.filter(Boolean); });
        });
      });
    },
    read: function (e) { return Promise.resolve(e.file || e.ref.getFile()).then(function (f) { return new File([f], e.name, { type: f.type, lastModified: Date.now() }); }); },
    write: function (rec, same) {   // one file per kind: write "[kind] name", then remove the older copies of that kind
      return localStore.savedDir(true).then(function (d) {
        var name = savedName(rec);
        return d.getFileHandle(name, { create: true }).then(function (h) { return h.createWritable().then(function (w) { return w.write(rec.blob).then(function () { return w.close(); }); }).then(function () { return h.getFile(); }); })
          .then(function (f) {
            return Promise.all(same.filter(function (e) { return e.fileName !== name; }).map(function (e) { return d.removeEntry(e.fileName).catch(function () {}); }))
              .then(function () { return { savedAt: new Date(f.lastModified).toISOString(), size: f.size }; });
          });
      });
    }
  };

  // ---------------------------------------------------------------- 2. browser sign-in (Google Identity Services)
  function configured() { return !!(CFG.clientId && CFG.apiKey && CFG.appId); }
  function signedIn() { return !!token && Date.now() < tokenExp - 60000; }
  function restore() { var s = lsJson(K.session); if (s && s.t && s.scope === SCOPE && s.exp > Date.now() + 60000) { token = s.t; tokenExp = s.exp; canRead = s.read !== false; } }
  function keep() { if (token) ls(K.session, JSON.stringify({ t: token, exp: tokenExp, scope: SCOPE, read: canRead })); else ls(K.session, null); }
  function user() { return lsJson(K.user); }
  function shop() { return lsJson(K.shop); }
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
  function ask() {
    return new Promise(function (res, rej) {
      tokenClient.callback = function (r) {
        if (r && r.access_token) {
          token = r.access_token; tokenExp = Date.now() + (Number(r.expires_in) || 3600) * 1000;
          canRead = !r.scope || String(r.scope).split(' ').indexOf(SCOPES[1]) >= 0;
          keep(); clickArmed = false; scheduleRenew(); changed(); res(token);
          if (!user()) api('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress,displayName)').then(function (x) { return x.json(); })
            .then(function (j) { if (j && j.user) { ls(K.user, JSON.stringify({ email: j.user.emailAddress, name: j.user.displayName })); changed(); } }).catch(function () {});
        } else rej(new Error((r && (r.error_description || r.error)) || 'Google sign-in was cancelled.'));
      };
      tokenClient.error_callback = function (e) {
        var t = e && e.type;
        rej(new Error(t === 'popup_closed' ? 'Google sign-in was closed before it finished.' : t === 'popup_failed_to_open' ? 'Chrome blocked Google\'s sign-in window — allow pop-ups for this site, or click again.' : (e && e.message) || 'Google sign-in did not open.'));
      };
      var u = user(), o = { prompt: '' }; if (u && u.email) o.hint = u.email;
      tokenClient.requestAccessToken(o);
    });
  }
  function signIn() {
    if (signedIn()) return Promise.resolve(token);
    if (!configured()) return Promise.reject(new Error('Google sign-in is not set up (assets/js/phf-drive-config.js).'));
    return tokenClient ? ask() : loadGis().then(ask);
  }
  // Renew by itself 5 minutes before the hour is up; if Chrome blocks the window, on the next click anywhere instead.
  function scheduleRenew() {
    clearTimeout(renewTimer); if (!token) return;
    renewTimer = setTimeout(function () {
      if (!tokenClient) return armClick();
      var keepTok = token, keepExp = tokenExp; token = null;   // ask for a fresh one
      ask().catch(function () { token = keepTok; tokenExp = keepExp; armClick(); });
    }, Math.max(5000, tokenExp - Date.now() - 5 * 60000));
  }
  function armClick() {
    if (clickArmed || !configured() || !user()) return; clickArmed = true; changed();
    document.addEventListener('pointerdown', function once(e) {
      if (signedIn()) { clickArmed = false; document.removeEventListener('pointerdown', once, true); return; }
      if (e.target && e.target.closest && e.target.closest('input,[data-drive-act],[data-drive-in],[data-drive-shop],[data-link]')) return;   // their own handlers
      document.removeEventListener('pointerdown', once, true); clickArmed = false;
      signIn().catch(function () { changed(); });
    }, true);
  }
  function signOut() {
    var t = token; token = null; tokenExp = 0; keep(); clearTimeout(renewTimer); ls(K.user, null); changed();
    try { if (t && g.google && g.google.accounts && g.google.accounts.oauth2) g.google.accounts.oauth2.revoke(t, function () {}); } catch (e) {}
  }
  function api(url, opt) {
    opt = opt || {}; opt.headers = Object.assign({ Authorization: 'Bearer ' + token }, opt.headers || {});
    return fetch(url, opt).then(function (r) {
      if (r.status === 401) { token = null; tokenExp = 0; keep(); armClick(); changed(); throw new Error('The Google sign-in has run out — it renews on your next click.'); }
      if (!r.ok) return r.text().then(function (t) { var m = ''; try { m = JSON.parse(t).error.message; } catch (e) { m = t.slice(0, 160); } var err = new Error('Google Drive said: ' + (m || r.status)); err.status = r.status; throw err; });
      return r;
    });
  }
  function picker(o, view) {
    return signIn().then(loadPicker).then(function () {
      return new Promise(function (res) {
        // v2.0.2: setEnableDrives(true) makes a view show ONLY shared drives — on the first view it left My Drive users with
        // "No folders". The first view is everything the account can open; then Shared with me, then Shared drives.
        var P = g.google.picker, v = view(P), sw = view(P), sd = view(P);
        [v, sw, sd].forEach(function (x) { if (P.DocsViewMode && x.setMode) x.setMode(P.DocsViewMode.LIST); });
        try { if (sw.setOwnedByMe) sw.setOwnedByMe(false); else sw = null; } catch (e) { sw = null; }
        try { if (sd.setEnableDrives) sd.setEnableDrives(true); else sd = null; } catch (e) { sd = null; }
        var b = new P.PickerBuilder().setAppId(CFG.appId).setOAuthToken(token).setDeveloperKey(CFG.apiKey).addView(v).setTitle(o.title)
          .setCallback(function (d) {
            if (d.action === P.Action.PICKED) res((d.docs || []).map(function (x) { return { id: x.id, name: x.name, mimeType: x.mimeType }; }));
            else if (d.action === P.Action.CANCEL) res([]);
          });
        if (sw) b.addView(sw);
        if (sd) b.addView(sd);
        if (P.Feature && P.Feature.SUPPORT_DRIVES) try { b.enableFeature(P.Feature.SUPPORT_DRIVES); } catch (e) {}
        if (o.multi) b.enableFeature(P.Feature.MULTISELECT_ENABLED);
        b.build().setVisible(true);
      });
    });
  }
  function pick() { return picker({ title: 'Choose files for the Staff Hub', multi: true }, function (P) { return new P.DocsView(P.ViewId.DOCS).setIncludeFolders(true).setSelectFolderEnabled(false); }); }
  function chooseShop() {
    return picker({ title: 'Choose the shop folder (the one holding "1, database-build" and "2, pos-supplier-merge")', multi: false },
      function (P) { return new P.DocsView(P.ViewId.FOLDERS || P.ViewId.DOCS).setIncludeFolders(true).setSelectFolderEnabled(true).setMimeTypes(FOLDER_MIME); })
      .then(function (d) {
        if (!d[0]) return null;
        return children(d[0].id, true).then(function (a) {
          var c = shopCheck(d[0].name, a.map(function (f) { return f.name; }));
          if (!c.ok) throw new Error(shopProblem(c, 'drive'));
          savedFolderReq = null; ls(K.shop, JSON.stringify({ id: d[0].id, name: d[0].name })); changed(); return d[0];
        });
      });
  }
  function download(doc) {
    var sheet = doc.mimeType === SHEET;
    if (!sheet && /^application\/vnd\.google-apps\./.test(doc.mimeType || '')) return Promise.reject(new Error(doc.name + ' is a Google Doc / Slides file — only files and Google Sheets can be used.'));
    var url = sheet ? API + '/' + encodeURIComponent(doc.id) + '/export?mimeType=' + encodeURIComponent(XLSX) : API + '/' + encodeURIComponent(doc.id) + '?alt=media&' + ALL;
    return api(url).then(function (r) { return r.blob(); }).then(function (blob) {
      var name = sheet && !/\.xlsx$/i.test(doc.name) ? doc.name + '.xlsx' : doc.name;
      return new File([blob], name, { type: sheet ? XLSX : (blob.type || doc.mimeType || ''), lastModified: Date.now() });
    });
  }
  function children(id, foldersOnly) {
    var qq = "'" + q(id) + "' in parents and trashed=false" + (foldersOnly ? " and mimeType='" + FOLDER_MIME + "'" : '');
    return api(API + '?q=' + encodeURIComponent(qq) + '&fields=files(id,name,mimeType,size,modifiedTime,appProperties)&pageSize=300&orderBy=name&' + ALL + '&includeItemsFromAllDrives=true')
      .then(function (r) { return r.json(); }).then(function (j) { return j.files || []; });
  }
  var savedFolderReq = null;
  var driveStore = {
    type: 'drive',
    ready: function () { return signedIn() && !!shop(); },
    where: function () { var s = shop(); return s ? s.name : ''; },
    folders: function () { return children(shop().id, true).then(function (a) { return a.map(function (f) { return { ref: f, name: f.name }; }); }); },
    listFiles: function (dir) { return children(dir.ref.id).then(function (a) { return a.filter(function (f) { return f.mimeType !== FOLDER_MIME && (f.mimeType === SHEET || !/^application\/vnd\.google-apps\./.test(f.mimeType || '')) && !skipName(f.name); }).map(function (f) { return { ref: f, name: f.name }; }); }); },
    readFile: function (f) { return download(f.ref); },
    savedDir: function (create) {
      if (savedFolderReq) return savedFolderReq;
      var sid = shop().id;
      savedFolderReq = children(sid, true).then(function (a) {
        var hit = a.filter(function (f) { return f.name === SAVED; })[0]; if (hit || !create) return hit || null;
        return api(API + '?fields=id,name&' + ALL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: SAVED, mimeType: FOLDER_MIME, parents: [sid] }) }).then(function (r) { return r.json(); });
      }).then(function (f) { if (!f) savedFolderReq = null; return f; }, function (e) { savedFolderReq = null; throw e; });
      return savedFolderReq;
    },
    listSaved: function () {
      return driveStore.savedDir(false).then(function (d) {
        if (!d) return [];
        return children(d.id).then(function (a) {
          return a.map(function (f) { var p = parseSaved(f.name); if (!p) return null; var ap = f.appProperties || {};
            return { ref: f, fileName: f.name, kind: p.kind, name: p.name, size: Number(f.size) || 0, savedAt: ap.phfSavedAt || f.modifiedTime, hash: ap.phfHash || '', mine: !!ap.phfKind }; }).filter(Boolean);
        });
      });
    },
    read: function (e) { return download(Object.assign({}, e.ref, { name: e.name })); },
    write: function (rec, same, hash) {
      return driveStore.savedDir(true).then(function (d) {
        var own = same.filter(function (e) { return e.mine; })[0];
        var meta = { name: savedName(rec), appProperties: { phfKind: String(rec.kind), phfSavedAt: rec.savedAt || new Date().toISOString(), phfHash: hash || '' } };
        if (!own) meta.parents = [d.id];
        var target = (own ? UPLOAD + '/' + encodeURIComponent(own.ref.id) : UPLOAD), method = own ? 'PATCH' : 'POST', up;
        if ((rec.blob.size || 0) > BIG) {
          // v2.0.2: Google takes a file of up to 5 MB in one request; a bigger one (the POS master is about 24 MB) goes up as a
          // resumable upload — the first request sends the details and gets an upload address, the second sends the file to it.
          var type = rec.blob.type || 'application/octet-stream';
          up = api(target + '?uploadType=resumable&fields=id,modifiedTime&' + ALL, { method: method, headers: { 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': type, 'X-Upload-Content-Length': String(rec.blob.size || 0) }, body: JSON.stringify(meta) })
            .then(function (r) { var at = r.headers.get('Location'); if (!at) throw new Error('Google Drive did not start the upload of ' + meta.name + ' — it will be tried again next time.'); return api(at, { method: 'PUT', headers: { 'Content-Type': type }, body: rec.blob }); });
        } else {
          var fd = new FormData();
          fd.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
          fd.append('file', rec.blob, meta.name);
          up = api(target + '?uploadType=multipart&fields=id,modifiedTime&' + ALL, { method: method, body: fd });
        }
        return up.then(function () { return { savedAt: meta.appProperties.phfSavedAt, size: rec.blob.size || 0 }; })
          .catch(function (e) { if (e.status === 403 || e.status === 404) e.message = 'This browser can read the shop folder but not save into "' + SAVED + '" — save from a PC with the linked folder, or ask the folder\'s owner for edit access.'; throw e; });
      });
    }
  };

  // ---------------------------------------------------------------- the active connection
  function store() { return localStore.ready() ? localStore : driveStore.ready() ? driveStore : null; }
  function status() {
    var s = store(), u = user();
    if (s === localStore) return { mode: 'local', ok: true, text: 'linked folder "' + link.name + '" on this PC — no sign-in needed' };
    if (s === driveStore) return { mode: 'drive', ok: true, text: 'signed in' + (u && u.email ? ' as ' + u.email : '') + ' · shop folder "' + shop().name + '"' };
    if (link && linkState === 'prompt') return { mode: 'local', ok: false, need: 'reconnect', text: 'linked folder "' + link.name + '" — one click to reconnect' };
    if (link && linkCheck && !linkCheck.ok) return { mode: 'local', ok: false, need: 'relink', text: 'linked folder "' + link.name + '" is not the shop folder — link the one that holds 1, 2 and 3' };
    if (signedIn()) return { mode: 'drive', ok: false, need: 'shop', text: 'signed in' + (u && u.email ? ' as ' + u.email : '') + ' — choose the shop folder' };
    if (configured() && u && clickArmed) return { mode: 'drive', ok: false, need: 'click', text: 'reconnects on your next click' };
    if (configured() || linkSupported) return { mode: null, ok: false, need: 'connect', text: 'not connected on this PC' };
    return { mode: null, ok: false, need: null, text: '' };
  }
  function available() { return configured() || linkSupported; }
  function changed() {
    var st = status();
    listeners.slice().forEach(function (fn) { try { fn(st); } catch (e) {} });
    var mode = st.ok ? st.mode : null;
    if (mode && mode !== lastMode && started) { lastMode = mode; autoSync(); loadToolFolder(); }
    if (!mode) lastMode = null;
  }

  // ---------------------------------------------------------------- saved files ↔ "Staff Hub saved files"
  var stuck = {};   // v2.0.2: kind → why its last upload failed (cleared when it goes up)
  function goneAt(kind) { var a = ls(K.gone + kind) || '', b = ls(K.gone + '*') || ''; return a > b ? a : b; }
  function seenKey(s, kind) { return K.seen + s.type + '.' + kind; }
  function seen(s, e) { return ls(seenKey(s, e.kind)) === e.savedAt + '|' + e.size; }
  function markSeen(s, kind, savedAt, size) { ls(seenKey(s, kind), savedAt + '|' + size); }
  function sync(L, kinds, o) {
    o = o || {}; var s = store(); if (!s) return Promise.reject(new Error('Google Drive is not connected on this PC.'));
    return Promise.all([s.listSaved(), L.list()]).then(function (a) {
      var files = a[0], local = a[1], newest = {}, byKind = {}, here = {}, got = [], saved = [], same = 0, steps = [], failed = [];
      files.forEach(function (f) { (byKind[f.kind] = byKind[f.kind] || []).push(f); if (!newest[f.kind] || f.savedAt > newest[f.kind].savedAt) newest[f.kind] = f; });
      local.forEach(function (r) { here[r.kind] = r; });
      if (o.pull !== false) Object.keys(newest).forEach(function (kind) {
        if (kinds && kinds.indexOf(kind) < 0) return;
        var f = newest[kind], h = here[kind], gone = !h && !o.force && goneAt(kind);
        if (gone && f.savedAt <= gone) return;
        if (h && ((h.savedAt && h.savedAt >= f.savedAt) || seen(s, f))) { same++; return; }
        steps.push(function () {
          return s.read(f).then(function (file) {
            return (h && h.blob ? Promise.all([hashBlob(h.blob), hashBlob(file)]) : Promise.resolve(['', '1'])).then(function (hh) {
              markSeen(s, kind, f.savedAt, f.size);
              if (hh[0] && hh[0] === hh[1]) { same++; return; }
              return L.put(kind, file, { name: f.name, source: SAVED, meta: FROM_DRIVE }).then(function () { got.push(f); });
            });
          });
        });
      });
      if (o.push !== false) local.forEach(function (r) {
        if (!r.blob || r.meta === FROM_DRIVE || (o.pushKinds && o.pushKinds.indexOf(r.kind) < 0) || (o.only && o.only.indexOf(r.kind) < 0)) return;
        var f = newest[r.kind]; if (f && f.savedAt >= r.savedAt && !o.only) return;
        steps.push(function () {
          return hashBlob(r.blob).then(function (h) {
            // the copy there may be the same file (e.g. one the tool saved again unchanged): compare before writing
            var there = !f ? Promise.resolve('') : f.hash ? Promise.resolve(f.hash) : f.size === (r.blob.size || 0) ? s.read(f).then(hashBlob) : Promise.resolve('');
            return there.then(function (th) { return [h, th]; });
          }).then(function (hh) {
            var h = hh[0];
            if (hh[1] && hh[1] === h) { same++; markSeen(s, r.kind, f.savedAt, f.size); return; }
            return s.write(r, byKind[r.kind] || [], h).then(function (w) { markSeen(s, r.kind, w.savedAt, w.size); saved.push(r); });
          }).then(function () { delete stuck[r.kind]; }, function (e) { stuck[r.kind] = (e && e.message) || String(e); throw e; });
        });
      });
      // v2.0.2: a file that fails no longer stops the files after it — each is tried; the ones that failed are reported
      var run = function (st) { return function () { return st().catch(function (e) { var m = (e && e.message) || String(e); if (failed.indexOf(m) < 0) failed.push(m); }); }; };
      return steps.reduce(function (p, st) { return p.then(run(st)); }, Promise.resolve()).then(function () { return { got: got, saved: saved, same: same, failed: failed, total: Object.keys(newest).length, where: s.where(), mode: s.type }; });
    });
  }
  function syncText(r) {
    var bits = [];
    if (r.got.length) bits.push('newer ' + r.got.map(function (f) { return label(f.kind); }).join(', ') + ' came in');
    if (r.saved.length) bits.push(r.saved.map(function (x) { return label(x.kind); }).join(', ') + ' saved');
    var k = Object.keys(stuck);   // v2.0.2: a file that did not go up stays on the line until it does
    if (k.length) bits.push('not saved yet: ' + k.map(label).join(', ') + ' — ' + stuck[k[0]] + ' (tried again next time)');
    else if (r.failed && r.failed.length) bits.push('not all came in — ' + r.failed[0] + ' (tried again next time)');
    return (bits.length ? bits.join(' · ') : r.total ? 'up to date' : 'none in the shop folder yet') + ' (' + hhmm() + ')';
  }
  function autoSync() {
    var L = g.PHFLibrary; if (!L || !store()) return;
    queue(function () { return sync(L, PULL[PAGE] === undefined ? null : PULL[PAGE]); })
      .then(function (r) { report({ type: failing(r) ? 'error' : 'sync', result: r, text: (failing(r) ? 'Saved files: ' : '') + syncText(r) }); })
      .catch(function (e) { report({ type: 'error', text: e.message || String(e) }); });
  }
  function failing(r) { return r.failed.length > 0 || Object.keys(stuck).length > 0; }
  function getLatest(L) { return queue(function () { return sync(L, null, { push: false, force: true }); }).then(function (r) { if (r.failed.length && !r.got.length) throw new Error(r.failed[0]); return r; }); }
  function saveAll(records) {
    var kinds = records.map(function (r) { return r.kind; }), L = g.PHFLibrary;
    return queue(function () { return sync(L, null, { pull: false, only: kinds }); }).then(function (r) { if (r.failed.length) throw new Error((r.saved.length ? r.saved.length + ' saved; ' : '') + 'not saved: ' + r.failed[0]); return { saved: r.saved, same: r.same }; });
  }
  function wrapLibrary() {
    var L = g.PHFLibrary; if (!L || L.__phfDrive) return; L.__phfDrive = true;
    var put = L.put;
    L.put = function (kind, blob, info) {
      return put.apply(L, arguments).then(function (out) {
        if (!(info && info.meta === FROM_DRIVE)) { pending[kind] = 1; if (store()) { clearTimeout(pushTimer); pushTimer = setTimeout(flushPush, 1500); } }
        return out;
      });
    };
    L.onChange(function (m) {   // a file deleted in this browser is not brought back by itself
      if (!m) return; var now = new Date().toISOString();
      if (m.action === 'remove' && m.kind) ls(K.gone + m.kind, now); else if (m.action === 'clear') ls(K.gone + '*', now); else if (m.action === 'put' && m.kind) ls(K.gone + m.kind, null);
    });
  }
  function flushPush() {
    var L = g.PHFLibrary, kinds = Object.keys(pending); pending = {};
    if (!L || !kinds.length || !store()) return;
    queue(function () { return sync(L, null, { pull: false, pushKinds: kinds }); })
      .then(function (r) { if (r.saved.length || failing(r)) report({ type: failing(r) ? 'error' : 'saved', result: r, text: (failing(r) ? 'Saved files: ' : '') + syncText(r) }); })
      .catch(function (e) { report({ type: 'error', text: e.message || String(e) }); });
  }

  // ---------------------------------------------------------------- a tool's own subfolder, loaded when the page opens
  var toolUi = null, loading = false;
  function subFor(s) {
    var def = SUB[PAGE]; if (!def) return Promise.resolve(null);
    var want = ls(K.sub + PAGE);
    return s.folders().then(function (fs) { return fs.filter(function (f) { return want ? f.name === want : def.re.test(f.name); })[0] || null; });
  }
  function feed(input, files) {
    var dt = new DataTransfer(); files.forEach(function (f) { dt.items.add(f); });
    input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function whenReady(input) {
    // The tool wires its drop handler when it starts (after its password, if it has one); POS New Product Check Clean also
    // brings back its last session first and takes no files until then.
    var busy = function () { return g.PHFMergeSession && g.PHFMergeSession.pending && g.PHFMergeSession.pending(); };
    return new Promise(function (res) { (function wait(n) { if ((typeof input.onchange === 'function' && !busy()) || n > 2400) res(); else setTimeout(function () { wait(n + 1); }, 250); })(0); });
  }
  function loadToolFolder() {
    var s = store(), input = document.querySelector('#bulkInput'); if (!s || !SUB[PAGE] || !input || loading) return Promise.resolve();
    if (s === driveStore && !canRead) { if (toolUi) toolUi.say('Google Drive read access was not allowed — sign out and sign in again, allowing both.', true); return Promise.resolve(); }
    loading = true; if (toolUi) toolUi.say('Loading from the shop folder…');
    return whenReady(input).then(function () { return subFor(s); }).then(function (dir) {
      if (!dir) { if (toolUi) toolUi.say('No "' + SUB[PAGE].label + '" folder inside "' + s.where() + '". Add it there (the name should start with "' + SUB[PAGE].label.split(',')[0] + ',").', true); return; }
      return s.listFiles(dir).then(function (fs) {
        if (!fs.length) { if (toolUi) toolUi.say('"' + dir.name + '" has no files to load.'); return; }
        if (toolUi) toolUi.say('Getting ' + fs.length + ' file' + (fs.length === 1 ? '' : 's') + ' from "' + dir.name + '"…');
        return fs.reduce(function (p, f) { return p.then(function (out) { return s.readFile(f).then(function (x) { out.push(x); return out; }); }); }, Promise.resolve([]))
          .then(function (files) { feed(input, files); if (toolUi) toolUi.say('From "' + dir.name + '": ' + files.length + ' file' + (files.length === 1 ? '' : 's') + ' (' + hhmm() + '). Drop a file on top to replace one.'); });
      });
    }).catch(function (e) { if (toolUi) toolUi.say(e.message || String(e), true); }).then(function () { loading = false; });
  }

  // ---------------------------------------------------------------- the Google Drive block under each tool's drop box
  var ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.7 3.5h8.6l5.2 9-4.3 7.5H6.8L2.5 12.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M7.7 3.5l4.3 7.5h9.5M2.5 12.5h9.5l4.3 7.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  var HOME = PAGE === 'hub' ? '#driveCard' : '../../index.html#driveCard';
  function wireDropBlock() {
    var zone = document.querySelector('#bulkDrop'), input = document.querySelector('#bulkInput');
    if (!zone || !input || zone.parentNode.querySelector('.phf-drive-row') || !available()) return;
    var row = document.createElement('div'); row.className = 'phf-drive-row';
    row.innerHTML = '<div class="phf-drive-btns"><button type="button" class="phf-drive-btn" data-drive-act hidden></button></div>' +
      '<div class="phf-drive-lines"><span class="phf-drive-state" data-drive-state></span><span class="phf-drive-note" aria-live="polite"></span><span class="phf-drive-sync" aria-live="polite"></span></div>';
    zone.insertAdjacentElement('afterend', row);
    var btn = row.querySelector('[data-drive-act]'), stateEl = row.querySelector('[data-drive-state]'), note = row.querySelector('.phf-drive-note'), syncEl = row.querySelector('.phf-drive-sync');
    toolUi = { say: function (t, bad) { note.className = 'phf-drive-note' + (bad ? ' is-error' : ''); note.textContent = t || ''; } };
    var act = null;
    var setBtn = function (text, fn, primary) { btn.hidden = !text; btn.innerHTML = text ? ICON + esc(text) : ''; btn.classList.toggle('phf-drive-in', !!primary); act = fn; };
    var paint = function (st) {
      st = st || status(); var sub = SUB[PAGE];
      var where = sub ? ' · loads "' + (ls(K.sub + PAGE) || sub.label) + '" each time' : '';
      if (st.ok && st.mode === 'local') { setBtn(null); stateEl.innerHTML = 'Google Drive: <b>' + esc(link.name) + '</b> (linked on this PC)' + esc(where) + ' · <a href="' + HOME + '">change</a>'; }
      else if (st.ok) { setBtn('From Google Drive', pickFiles, false); stateEl.innerHTML = 'Google Drive: <b>' + esc(shop().name) + '</b>' + esc(where) + ' · <a href="' + HOME + '">change</a>'; }
      else if (st.need === 'relink') { setBtn('Link the shop folder', linkFolder, true); stateEl.textContent = '"' + link.name + '" is linked, but it is a folder inside the shop folder. Link the folder that holds "1, database-build", "2, pos-supplier-merge" and "3, Orders" — open it, click an empty space, then Select Folder.'; }
      else if (st.need === 'reconnect') { setBtn('Reconnect the shop folder', reconnect, true); stateEl.textContent = 'One click, no Google window. Choose "Allow on every visit" and it will not ask again.'; }
      else if (st.need === 'shop') { setBtn('Choose the shop folder', chooseShop, true); stateEl.textContent = 'Pick the folder that holds "1, database-build" and "2, pos-supplier-merge" (once on this PC).'; }
      else if (st.need === 'click') { setBtn('Sign in to Google Drive', signIn, true); stateEl.textContent = 'Google Drive reconnects on your next click.'; }
      else if (configured()) { setBtn('Sign in to Google Drive', signIn, true); stateEl.innerHTML = 'Then the shop folder\'s files load by themselves. Or <a href="' + HOME + '">link the shop folder on this PC</a> (Google Drive for desktop): no sign-in at all.'; }
      else { setBtn('Link the shop folder on this PC', linkFolder, true); stateEl.textContent = 'The Google Drive for desktop folder — once, then it loads by itself.'; }
    };
    btn.onclick = function () { if (!act) return; toolUi.say(''); Promise.resolve().then(act).catch(function (e) { if (e && e.name === 'AbortError') return; toolUi.say(e.message || String(e), true); }); };
    onChange(paint); paint();
    onReport(function (r) { if (r.text) { syncEl.className = 'phf-drive-sync' + (r.type === 'error' ? ' is-error' : ''); syncEl.textContent = r.type === 'error' ? r.text : 'Saved files: ' + r.text; } });
  }
  function pickFiles() {
    var input = document.querySelector('#bulkInput');
    return pick().then(function (docs) {
      if (!docs.length) return;
      toolUi.say('Getting ' + docs.length + ' file' + (docs.length === 1 ? '' : 's') + ' from Google Drive…');
      return docs.reduce(function (p, d) { return p.then(function (out) { return download(d).then(function (f) { out.push(f); return out; }); }); }, Promise.resolve([]))
        .then(function (files) { feed(input, files); toolUi.say('From Google Drive: ' + files.map(function (f) { return f.name; }).join(', ')); });
    });
  }

  // ---------------------------------------------------------------- the home page card (#driveCard)
  function wireHomeCard() {
    var card = document.querySelector('#driveCard'); if (!card) return;
    if (!available()) { card.hidden = true; return; }
    card.hidden = false;
    var body = card.querySelector('[data-drive-body]'), chip = card.querySelector('[data-drive-chip]'), lastMsg = ['', false];
    var paint = function () {
      var st = status(), u = user(), s = shop(), h = '';
      chip.textContent = st.ok ? (st.mode === 'local' ? 'LINKED FOLDER' : 'SIGNED IN') : st.need === 'reconnect' ? 'ONE CLICK TO RECONNECT' : st.need === 'relink' ? 'WRONG FOLDER LINKED' : 'NOT CONNECTED';
      chip.className = 'phf-drive-chip' + (st.ok ? ' ok' : '');
      h += '<div class="phf-drive-ways"><div class="phf-drive-way"><h3>1 · Linked folder <small>Google Drive for desktop · no sign-in · never runs out</small></h3>';
      if (!linkSupported) h += '<p>This browser cannot link a folder — use Chrome or Edge on the PC.</p>';
      else if (link && linkState === 'granted' && linkCheck && !linkCheck.ok) h += '<p class="phf-drive-warn">This PC: <b>' + esc(link.name) + '</b> — ' + esc(shopProblem(linkCheck, 'local')) + '</p><div class="phf-drive-acts"><button type="button" class="phf-lib-btn phf-lib-btn-primary" data-link="change">Link the shop folder</button><button type="button" class="phf-lib-btn" data-link="off">Unlink</button></div>';
      else if (link && linkState === 'granted') h += '<p>This PC: <b>' + esc(link.name) + '</b> ✓' + (linkCheck && !(linkCheck.has1 && linkCheck.has2) ? ' — no "' + (linkCheck.has1 ? '2, pos-supplier-merge' : '1, database-build') + '" folder inside yet' : '') + '</p><div class="phf-drive-acts"><button type="button" class="phf-lib-btn" data-link="change">Link another folder</button><button type="button" class="phf-lib-btn" data-link="off">Unlink</button></div>';
      else if (link) h += '<p>This PC: <b>' + esc(link.name) + '</b> — Chrome needs one click to reconnect it. Choose <b>Allow on every visit</b>.</p><div class="phf-drive-acts"><button type="button" class="phf-lib-btn phf-lib-btn-primary" data-link="again">Reconnect</button><button type="button" class="phf-lib-btn" data-link="off">Unlink</button></div>';
      else h += '<p>Pick the shop folder where Google Drive for desktop shows it on this PC (for example G:\\My Drive\\… or G:\\Shared drives\\…). When Chrome asks, choose <b>Allow on every visit</b>.</p><div class="phf-drive-acts"><button type="button" class="phf-lib-btn phf-lib-btn-primary" data-link="pick">Link the shop folder on this PC</button></div>';
      h += '</div>';
      if (configured()) {
        h += '<div class="phf-drive-way"><h3>2 · Browser sign-in <small>any PC · renews by itself</small></h3>';
        if (signedIn()) h += '<p>Signed in' + (u && u.email ? ' as <b>' + esc(u.email) + '</b>' : '') + '. It renews by itself before the hour is up.</p>' +
          (s ? '<p>Shop folder: <b>' + esc(s.name) + '</b></p>' : '<p>Now choose the shop folder (once on this PC).</p>') +
          '<div class="phf-drive-acts"><button type="button" class="phf-lib-btn' + (s ? '' : ' phf-lib-btn-primary') + '" data-drive-shop>' + (s ? 'Change the shop folder' : 'Choose the shop folder') + '</button><button type="button" class="phf-lib-btn" data-drive-out>Sign out</button></div>';
        else h += '<p>' + (u && u.email ? 'Last signed in as <b>' + esc(u.email) + '</b>. ' : '') + (clickArmed ? 'It reconnects on your next click, or:' : 'Sign in with your shop account.') + '</p><div class="phf-drive-acts"><button type="button" class="phf-lib-btn phf-lib-btn-primary" data-drive-in>Sign in to Google Drive</button></div>';
        h += '</div>';
      }
      h += '</div><div class="phf-drive-map"><h3>What loads by itself</h3><ul>' +
        '<li>Build POS Master Databases ← <b>' + esc(ls(K.sub + 'database-build') || SUB['database-build'].label) + '</b></li>' +
        '<li>POS New Product Check Clean ← <b>' + esc(ls(K.sub + 'pos-supplier-merge') || SUB['pos-supplier-merge'].label) + '</b></li>' +
        '<li>Reconcile CH2 Order ← the newest POS master and Ongoing Discounts</li>' +
        '<li>Every tool\'s saved files ↔ <b>' + SAVED + '</b> (made in the shop folder when first needed)</li></ul>' +
        '<p class="phf-drive-now">' + (st.ok ? 'Using: ' + esc(st.text) : 'Not connected on this PC yet.') + '</p><p class="phf-drive-msg" data-drive-msg></p></div>';
      body.innerHTML = h; say(lastMsg[0], lastMsg[1]);
    };
    var say = function (t, bad) { lastMsg = [t || '', !!bad]; var m = card.querySelector('[data-drive-msg]'); if (m) { m.textContent = t || ''; m.classList.toggle('is-error', !!bad); } };
    card.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var run = function (p, ok) { p.then(function () { if (ok) say(ok); }).catch(function (err) { if (err && err.name === 'AbortError') return; say(err.message || String(err), true); }); };
      if (b.dataset.link === 'pick' || b.dataset.link === 'change') run(linkFolder(), 'Linked. The tools load and save through this folder now.');   // linkFolder refuses a folder inside the shop folder
      else if (b.dataset.link === 'again') run(reconnect(), 'Reconnected.');
      else if (b.dataset.link === 'off') run(unlink(), 'Unlinked on this PC.');
      else if (b.hasAttribute('data-drive-in')) run(signIn());
      else if (b.hasAttribute('data-drive-shop')) run(chooseShop());
      else if (b.hasAttribute('data-drive-out')) { signOut(); say('Signed out of Google Drive.'); }
    });
    onChange(paint); paint();
    onReport(function (r) { if (r.text) say((r.type === 'error' ? '' : 'Saved files: ') + r.text, r.type === 'error'); });
  }

  // ---------------------------------------------------------------- start
  restore();
  if (available()) wrapLibrary();
  g.addEventListener('storage', function (e) { if (e.key === K.session) { token = null; restore(); changed(); } else if (e.key === K.shop) { savedFolderReq = null; changed(); } });
  function boot() {
    if (!available()) return;
    if (configured()) loadGis().catch(function () {});
    loadLink().then(function () {
      started = true;
      wireDropBlock(); wireHomeCard();
      if (signedIn()) scheduleRenew(); else if (configured() && user() && !(link && linkState === 'granted')) armClick();
      var st = status(); lastMode = st.ok ? st.mode : null;
      if (st.ok) { autoSync(); loadToolFolder(); }
      changed();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  g.PHFDrive = { VERSION: 'v2.0.1', configured: configured, available: available, status: status, signedIn: signedIn, signIn: signIn, signOut: signOut,
    linkFolder: linkFolder, reconnect: reconnect, unlink: unlink, chooseShop: chooseShop, pick: pick, download: download,
    sync: sync, getLatest: getLatest, saveAll: saveAll, onChange: onChange, onReport: onReport, esc: esc, FOLDER: SAVED, FROM_DRIVE: FROM_DRIVE, HOME: HOME };
})(window);
