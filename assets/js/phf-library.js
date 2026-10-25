/* PHF Staff Hub — Library v1.2.1 (25 Oct 2026, Staff Hub v21.44.2: a file saved again unchanged — same name, same bytes — keeps the
 *         saved copy as it is, its date and Reconcile CH2 Order's parsed copy of it.)
 * v1.2.0 (21 Oct 2026: a delete is a delete everywhere — removing Ongoing Discounts also removes the
 *         POS DB & Supplier Merge workbook it is rebuilt from (Reconcile CH2 Order made it again from that copy); a remove or
 *         Delete all also drops any "hidden on this page" marker for that file, so nothing old is kept as hidden.)
 * v1.1.3 (20 Oct 2026: the A–P supplier-layout kinds lib:ch2-posdb / lib:uhp-posdb) · v1.1.2 (15 Oct 2026: persisted() — is the site's storage protected from automatic clearing)
 * v1.1.1 (12 Oct 2026)
 * v1.1.1: the POS, CH2 and Unique entries are the full sets from Build POS Master Databases v21.14.0 (clean_merged_pos_data,
 *         clean_ch2_data, clean_uhp_data); POS New Product Check Clean makes its supplier rows from the CH2 / Unique ones.
 * v1.1.0: Supplier Contacts list ("lib:contacts") — the only copy of edits made there, so Delete all keeps it (its own ✕
 *         deletes it). Ongoing Discounts is also Reconcile CH2 Order's discount file; a POS DB & SUPPLIER MERGE workbook
 *         dropped there stays as "supplierMerge" for its supplier names. Tool renamed POS New Product Check Clean.
 * v1.0.2: tool names Build POS Master Databases / POS Supplier New Product Check and Clean Merge; records saved under the
 *         old names show the new ones (info().made / displayName()).
 * v1.0.1: the CH2 / Unique supplier imports are used by POS Supplier Merge only when its Add button is pressed.
 * Files saved in this browser and shared by every Staff Hub tool, so a file one tool makes (or a reference file
 * you load once) is there for the next tool without dragging it in again. Everything stays in this browser on this
 * computer: nothing is uploaded, and another browser or PC has its own separate Library.
 *
 * Storage: IndexedDB "PHFStaffHub", store "referenceFiles" (keyPath "kind") — the store Reconcile CH2 Order already
 * uses for its reference files, so its saved POS / master file ("posMaster") is the same Library entry that Build
 * Master Databases writes. One record per kind (the newest copy replaces the older one):
 *   { kind, name, size, type, lastModified, savedAt (ISO), blob, source, meta }
 * Tools load this file with <script src="…/assets/js/phf-library.js"> and use window.PHFLibrary.
 */
(function (g) {
  'use strict';

  var DB_NAME = 'PHFStaffHub', DB_VERSION = 1, STORE = 'referenceFiles';
  var HIDDEN = { parsedReferenceCache: true };
  var PARSED = { posMaster: true, supplierMerge: true, 'lib:ref-discounts': true }; // kinds Reconcile CH2 keeps parsed
  // v1.2.0: kinds that are one set of data — deleting one deletes the others too (Reconcile CH2 Order makes the Ongoing
  // Discounts again from a saved POS DB & Supplier Merge workbook, so deleting only the discounts brought them back).
  var LINKED = { 'lib:ref-discounts': ['supplierMerge'], supplierMerge: ['lib:ref-discounts'] };
  var STALE_MS = 24 * 60 * 60 * 1000;

  // kind → what it is, which tool makes it and which tools use it (shown on the home page Library panel).
  var MERGE = 'POS New Product Check Clean';
  var KINDS = {
    'lib:pos-db':          { label: 'POS Database (full set)', made: 'Build POS Master Databases', used: MERGE, generated: true },
    'lib:ch2-db':          { label: 'CH2 full set', made: 'Build POS Master Databases', used: MERGE + ' (Add button, only when the A–P file is not saved)', generated: true },
    'lib:uhp-db':          { label: 'Unique full set', made: 'Build POS Master Databases', used: MERGE + ' (Add button, only when the A–P file is not saved)', generated: true },
    // v1.1.3: the supplier-layout A–P files (clean_ch2_data_pos_db / clean_uhp_data_pos_db) — already in the IN_SUPPLIER columns,
    // so POS New Product Check Clean's Add buttons take these (smaller, no conversion) and fall back to the full sets.
    'lib:ch2-posdb':       { label: 'CH2 supplier layout (A–P)', made: 'Build POS Master Databases', used: MERGE + ' (Add CH2 button)', generated: true },
    'lib:uhp-posdb':       { label: 'Unique supplier layout (A–P)', made: 'Build POS Master Databases', used: MERGE + ' (Add Unique button)', generated: true },
    'posMaster':           { label: 'Full merged master', made: 'Build POS Master Databases', used: 'Reconcile CH2 Order', generated: true },
    'lib:master-selected': { label: 'Selected-columns master', made: 'Build POS Master Databases', used: 'Kept here to download', generated: true },
    'lib:to-order':        { label: 'To-Order file', made: 'Build POS Master Databases', used: 'Kept here to download', generated: true },
    'lib:ref-brand':       { label: 'Brand Abbreviation', made: 'Loaded in Build POS Master Databases', used: 'Build POS Master Databases' },
    'lib:ref-box':         { label: 'Weight & Dimensions', made: 'Loaded in Build POS Master Databases', used: 'Build POS Master Databases' },
    'lib:ref-discounts':   { label: 'Ongoing Discounts', made: 'Loaded in Build POS Master Databases, Reconcile CH2 Order or ' + MERGE, used: 'Build POS Master Databases · Reconcile CH2 Order · ' + MERGE },
    'supplierMerge':       { label: 'POS DB & Supplier Merge workbook', made: 'Loaded in Reconcile CH2 Order (its discounts are saved as Ongoing Discounts)', used: 'Reconcile CH2 Order (supplier names and CH2 supplier links)' },
    'lib:contacts':        { label: 'Supplier Contacts', made: 'Loaded and edited in Supplier Contacts', used: 'Supplier Contacts — the only copy of edits made there (Download it to share or back up)', keep: true }
  };
  var ORDER = Object.keys(KINDS);

  var dbPromise = null, persistAsked = false;
  var channel = null;
  try { channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('phf-library') : null; } catch (e) { channel = null; }
  var listeners = [];
  if (channel) channel.onmessage = function (e) { listeners.forEach(function (fn) { try { fn(e.data || {}); } catch (err) { console.error(err); } }); };
  function emit(msg) {
    if (channel) { try { channel.postMessage(msg); } catch (e) {} }
    listeners.forEach(function (fn) { try { fn(msg); } catch (err) { console.error(err); } });
  }

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (typeof indexedDB === 'undefined') { reject(new Error('This browser has no IndexedDB storage.')); return; }
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () { var db = req.result; if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'kind' }); };
      req.onsuccess = function () { var db = req.result; db.onversionchange = function () { db.close(); dbPromise = null; }; resolve(db); };
      req.onerror = function () { dbPromise = null; reject(req.error); };
      req.onblocked = function () { dbPromise = null; reject(new Error('The Library is busy in another tab — close other Staff Hub tabs and try again.')); };
    });
    return dbPromise;
  }
  function tx(mode, fn) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORE, mode), out;
        try { out = fn(t.objectStore(STORE)); } catch (e) { reject(e); return; }
        t.oncomplete = function () { resolve(typeof IDBRequest !== 'undefined' && out instanceof IDBRequest ? out.result : out); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error || new Error('Library write was cancelled (the browser may be out of storage).')); };
      });
    });
  }
  function askPersist() {
    if (persistAsked) return; persistAsked = true;
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {}); } catch (e) {}
  }

  /* Save a file (Blob / File) under a kind. info: { name, source, meta }. Resolves with the saved record (no blob).
     v1.2.1: the same file saved again (same name, same bytes) keeps the saved copy as it is — its date, and Reconcile CH2
     Order's parsed copy of it. Before, every tool that loaded the shop folder saved Ongoing Discounts again, which threw
     away Reconcile's parsed POS / master, so its next run read the whole master again (half a minute or more). */
  function put(kind, blob, info) {
    info = info || {};
    return unchanged(kind, blob, info).then(function (old) { return old ? strip(old) : write(kind, blob, info); });
  }
  function unchanged(kind, blob, info) {
    if (!blob || typeof blob.arrayBuffer !== 'function') return Promise.resolve(null);
    return get(kind).then(function (old) {
      if (!old || !old.blob || typeof old.blob.arrayBuffer !== 'function' || (old.blob.size || 0) !== (blob.size || 0)) return null;
      if (String(old.name || '') !== String(info.name || blob.name || kind)) return null;
      return Promise.all([old.blob.arrayBuffer(), blob.arrayBuffer()]).then(function (ab) {
        var a = new Uint8Array(ab[0]), b = new Uint8Array(ab[1]);
        if (a.length !== b.length) return null;
        for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return null;
        return old;
      });
    }).catch(function () { return null; });
  }
  function write(kind, blob, info) {
    var rec = {
      kind: kind, name: info.name || blob.name || kind, size: blob.size || 0, type: blob.type || '',
      lastModified: blob.lastModified || Date.now(), savedAt: new Date().toISOString(), blob: blob,
      source: info.source || '', meta: info.meta || ''
    };
    askPersist();
    return tx('readwrite', function (store) {
      store.put(rec);
      // Reconcile CH2 keeps a parsed copy of its reference files; a new master / rules file must be parsed again.
      if (PARSED[kind]) store.delete('parsedReferenceCache');
    }).then(function () { var out = strip(rec); emit({ action: 'put', kind: kind, record: out }); return out; });
  }
  function get(kind) {
    return tx('readonly', function (store) { return store.get(kind); }).then(function (r) { return r || null; });
  }
  function list() {
    return tx('readonly', function (store) { return store.getAll(); }).then(function (all) {
      return (all || []).filter(function (r) { return r && !HIDDEN[r.kind]; }).sort(function (a, b) {
        var ia = ORDER.indexOf(a.kind), ib = ORDER.indexOf(b.kind);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || String(a.kind).localeCompare(String(b.kind));
      });
    });
  }
  function remove(kind) {
    var kinds = [kind].concat(LINKED[kind] || []);
    return tx('readwrite', function (store) {
      kinds.forEach(function (k) { store.delete(k); if (PARSED[k]) store.delete('parsedReferenceCache'); });
    }).then(function () { kinds.forEach(function (k) { forgetDismissed(k); emit({ action: 'remove', kind: k }); }); });
  }
  // Delete all keeps the kinds marked keep (the Supplier Contacts list); each one's own ✕ deletes it.
  function clearAll() {
    return tx('readwrite', function (store) {
      var req = store.getAllKeys();
      req.onsuccess = function () { (req.result || []).forEach(function (k) { if (!(KINDS[k] && KINDS[k].keep)) store.delete(k); }); };
    }).then(function () { forgetDismissed(); emit({ action: 'clear' }); });
  }
  function strip(rec) { var o = {}; for (var k in rec) if (k !== 'blob') o[k] = rec[k]; return o; }
  function toFile(rec) {
    try { return new File([rec.blob], rec.name, { type: rec.type || rec.blob.type || '', lastModified: rec.lastModified || Date.now() }); }
    catch (e) { var b = rec.blob; b.name = rec.name; return b; }
  }
  function ageMs(rec) { var t = rec && rec.savedAt ? Date.parse(rec.savedAt) : NaN; return isFinite(t) ? Math.max(0, Date.now() - t) : Infinity; }
  function isStale(rec) { return ageMs(rec) > STALE_MS; }
  function when(rec) {
    var t = rec && rec.savedAt ? new Date(rec.savedAt) : null;
    if (!t || isNaN(t)) return '';
    try {
      return new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Melbourne', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(t).replace(',', '');
    } catch (e) { return t.toLocaleString(); }
  }
  function ago(rec) {
    var ms = ageMs(rec); if (!isFinite(ms)) return '';
    var m = Math.round(ms / 60000);
    if (m < 1) return 'just now'; if (m < 60) return m + ' min ago';
    var h = Math.round(m / 60); if (h < 24) return h + ' hour' + (h === 1 ? '' : 's') + ' ago';
    var d = Math.round(h / 24); return d + ' day' + (d === 1 ? '' : 's') + ' ago';
  }
  function info(kind) { return KINDS[kind] || { label: kind, made: '', used: '' }; }
  // Records saved before the 11 / 12 Oct 2026 renames carry the old tool names as their source.
  var RENAMED = { 'Build Master Databases': 'Build POS Master Databases', 'POS Supplier Merge': MERGE, 'POS Supplier New Product Check and Clean Merge': MERGE };
  function displayName(name) { return RENAMED[name] || name || ''; }
  function onChange(fn) { if (typeof fn === 'function') listeners.push(fn); }
  // v1.1.2: is this site's storage protected from the browser's automatic clearing? (Chrome grants it once the site is
  // installed as an app, bookmarked or used a lot; persist() is asked on every save.)
  function persisted() {
    try { if (navigator.storage && navigator.storage.persisted) return navigator.storage.persisted().catch(function () { return null; }); } catch (e) {}
    return Promise.resolve(null);
  }
  function estimate() {
    try { if (navigator.storage && navigator.storage.estimate) return navigator.storage.estimate(); } catch (e) {}
    return Promise.resolve(null);
  }

  // A tool can skip reloading a Library file the person removed from that page, until a newer copy is saved.
  function dismissKey(tool, kind) { return 'phf-lib-dismissed:' + tool + ':' + kind; }
  function dismiss(tool, rec) { try { localStorage.setItem(dismissKey(tool, rec.kind), rec.savedAt || ''); } catch (e) {} }
  function isDismissed(tool, rec) { try { return !!rec && localStorage.getItem(dismissKey(tool, rec.kind)) === (rec.savedAt || ''); } catch (e) { return false; } }
  // v1.2.0: a deleted file needs no "hidden" marker — drop the markers for one kind (or all of them).
  function forgetDismissed(kind) {
    try {
      var drop = [];
      for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf('phf-lib-dismissed:') === 0 && (!kind || k.slice(-(kind.length + 1)) === ':' + kind)) drop.push(k); }
      drop.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) {}
  }
  function linked(kind) { return [kind].concat(LINKED[kind] || []); }

  g.PHFLibrary = {
    VERSION: 'v1.2.0', KINDS: KINDS, ORDER: ORDER, persisted: persisted,
    put: put, get: get, list: list, remove: remove, clearAll: clearAll,
    toFile: toFile, isStale: isStale, when: when, ago: ago, info: info, displayName: displayName, onChange: onChange, estimate: estimate,
    dismiss: dismiss, isDismissed: isDismissed, forgetDismissed: forgetDismissed, linked: linked
  };
})(window);
