/* PHF Staff Hub — Library v1.0.0 (10 Oct 2026)
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
  var STALE_MS = 24 * 60 * 60 * 1000;

  // kind → what it is, which tool makes it and which tools use it (shown on the home page Library panel).
  var KINDS = {
    'lib:pos-db':          { label: 'POS Database', made: 'Build Master Databases', used: 'POS Supplier Merge', generated: true },
    'lib:ch2-db':          { label: 'CH2 supplier import', made: 'Build Master Databases', used: 'POS Supplier Merge', generated: true },
    'lib:uhp-db':          { label: 'Unique supplier import', made: 'Build Master Databases', used: 'POS Supplier Merge', generated: true },
    'posMaster':           { label: 'Full merged master', made: 'Build Master Databases', used: 'Reconcile CH2 Order', generated: true },
    'lib:master-selected': { label: 'Selected-columns master', made: 'Build Master Databases', used: 'Kept here to download', generated: true },
    'lib:to-order':        { label: 'To-Order file', made: 'Build Master Databases', used: 'Kept here to download', generated: true },
    'lib:ref-brand':       { label: 'Brand Abbreviation', made: 'Loaded in Build Master Databases', used: 'Build Master Databases' },
    'lib:ref-box':         { label: 'Weight & Dimensions', made: 'Loaded in Build Master Databases', used: 'Build Master Databases' },
    'lib:ref-discounts':   { label: 'Ongoing Discounts', made: 'Loaded in Build Master Databases or POS Supplier Merge', used: 'Build Master Databases · POS Supplier Merge' },
    'supplierMerge':       { label: 'Supplier + discount rules', made: 'Loaded in Reconcile CH2 Order', used: 'Reconcile CH2 Order' }
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

  /* Save a file (Blob / File) under a kind. info: { name, source, meta }. Resolves with the saved record (no blob). */
  function put(kind, blob, info) {
    info = info || {};
    var rec = {
      kind: kind, name: info.name || blob.name || kind, size: blob.size || 0, type: blob.type || '',
      lastModified: blob.lastModified || Date.now(), savedAt: new Date().toISOString(), blob: blob,
      source: info.source || '', meta: info.meta || ''
    };
    askPersist();
    return tx('readwrite', function (store) {
      store.put(rec);
      // Reconcile CH2 keeps a parsed copy of its reference files; a new master / rules file must be parsed again.
      if (kind === 'posMaster' || kind === 'supplierMerge') store.delete('parsedReferenceCache');
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
    return tx('readwrite', function (store) {
      store.delete(kind);
      if (kind === 'posMaster' || kind === 'supplierMerge') store.delete('parsedReferenceCache');
    }).then(function () { emit({ action: 'remove', kind: kind }); });
  }
  function clearAll() {
    return tx('readwrite', function (store) { store.clear(); }).then(function () { emit({ action: 'clear' }); });
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
  function onChange(fn) { if (typeof fn === 'function') listeners.push(fn); }
  function estimate() {
    try { if (navigator.storage && navigator.storage.estimate) return navigator.storage.estimate(); } catch (e) {}
    return Promise.resolve(null);
  }

  // A tool can skip reloading a Library file the person removed from that page, until a newer copy is saved.
  function dismissKey(tool, kind) { return 'phf-lib-dismissed:' + tool + ':' + kind; }
  function dismiss(tool, rec) { try { localStorage.setItem(dismissKey(tool, rec.kind), rec.savedAt || ''); } catch (e) {} }
  function isDismissed(tool, rec) { try { return !!rec && localStorage.getItem(dismissKey(tool, rec.kind)) === (rec.savedAt || ''); } catch (e) { return false; } }

  g.PHFLibrary = {
    VERSION: 'v1.0.0', KINDS: KINDS, ORDER: ORDER,
    put: put, get: get, list: list, remove: remove, clearAll: clearAll,
    toFile: toFile, isStale: isStale, when: when, ago: ago, info: info, onChange: onChange, estimate: estimate,
    dismiss: dismiss, isDismissed: isDismissed
  };
})(window);
