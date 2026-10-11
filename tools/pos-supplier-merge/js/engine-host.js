/* PHF Staff Hub — POS Supplier New Product Check and Clean Merge · engine-host.js v1.1.0 (11 Oct 2026)
 * Message handler around the unchanged Apps Script engine.
 * Runs inside the Web Worker (js/engine-worker.js) or, when workers are not
 * available (page opened from a file), inside engine-frame.html.
 *
 *   page → engine   { cmd:'load', id, sheets:{ name: rows[][] } }
 *                   { cmd:'run',  id, step:'highlight'|'build'|'generate'|'export'|'refresh' }
 *                   { cmd:'edit', id, sheet, op:'cells', blocks:[{ r1, c1, values:[[…]] }] }   (1-based Sheet row / column)
 *                   { cmd:'edit', id, sheet, op:'deleteRows', rows:[sheetRow…] } | { …, op:'appendRows', values:[[…]] }
 *                   { cmd:'undo', id, sheet }
 *   engine → page   { type:'ready' | 'loaded' | 'progress' | 'result' | 'error', id, … }
 * v1.1.0: edits to OUT_MERGED_DATA / OUT_POS_INSERT / OUT_POS_UPDATE go into the in-memory Sheet and run the script's
 * own onEdit (1.0 Setup) exactly as typing in the Google Sheet does — ROW STATUS → NEW writes a fake barcode, an
 * UPDATED SUPPLIER change is queued for REFRESH SUPPLIER CHANGES, formulas (FINAL SHELF RRP, rrp incgst) work out
 * again. The changed rows come back as the Sheet shows them. Each edit can be undone (whole rows are restored).
 */
(function (G) {
  'use strict';

  var isWorker = typeof G.importScripts === 'function' && typeof G.document === 'undefined';
  function post(msg) {
    if (isWorker) G.postMessage(msg);
    else G.parent.postMessage(Object.assign({ __phfMergeEngine: true }, msg), '*');
  }

  var shim = null, currentId = null, alerts = [], dialogs = [], logs = [], undo = {};
  var UNDO_MAX = 30, QUEUE = '_M13_SUPPLIER_QUEUE';
  function makeShim() {
    alerts = []; dialogs = []; logs = []; undo = {};
    shim = G.PHFSheetsShim.create({
      onToast: function (title, msg) { post({ type: 'progress', id: currentId, title: title, msg: msg }); },
      onAlert: function (title, msg) { alerts.push({ title: title, msg: msg }); },
      onDialog: function (title) { dialogs.push({ title: title }); },
      onLog: function (m) { logs.push(m); if (logs.length > 300) logs.shift(); }
    });
    shim.install(G);
  }

  function versions() {
    return {
      setup: typeof G.SCRIPT_VERSION !== 'undefined' ? G.SCRIPT_VERSION : '',
      merge: (typeof G.M13 !== 'undefined' && G.M13 && G.M13.VERSION) ? G.M13.VERSION : '',
      host: 'v1.1.0',
      worker: isWorker
    };
  }

  var STEP_FN = {
    highlight: 'runHighlightNewProductsBestBuy',
    build: 'buildOutMergedDataFromSupplierStatus',
    generate: 'generateInsertUpdateSheets',
    export: 'exportPosFiles',
    refresh: 'refreshSupplierChanges'
  };

  function sheetsFor(step) {
    var SH = G.CFG.SH, out = {};
    var names = step === 'highlight' ? [SH.IN_SUP]
      : step === 'build' ? [SH.OUT_MERGED, SH.IN_SUP, SH.SRC_BRANDS, SH.SRC_PREFIX, SH.SRC_FR, SH.SRC_SUPP, SH.SRC_DISC]
      : step === 'generate' ? [SH.OUT_INSERT, SH.OUT_UPDATE]
      : step === 'refresh' ? [SH.OUT_MERGED]
      : [];
    names.forEach(function (n) { var d = shim.sheetDisplay(n); if (d) out[n] = d; });
    return out;
  }
  function pending() {
    try { return typeof G.m13GetQueuedSupplierChangeRows_ === 'function' ? G.m13GetQueuedSupplierChangeRows_().length : 0; } catch (e) { return 0; }
  }
  function clearQueue() {
    try { var q = shim.ss._find(QUEUE); if (q) q.clear(); G.PropertiesService.getDocumentProperties().deleteProperty('M13_PENDING_SUPPLIER_CHANGE_ROWS'); } catch (e) {}
  }

  // ---------------------------------------------------------------- edits
  function sheetOf(name) { var s = shim && shim.ss._find(name); if (!s) throw new Error(name + ' is not in the engine yet — run the stage that makes it first.'); return s; }
  function textCol(name, c) { var sc = G.SCHEMA && G.SCHEMA[name]; return !!(sc && sc.textCols && sc.textCols.indexOf(c) >= 0); }
  // What a typed value becomes: text in '@' / text columns (codes keep leading zeros), otherwise a number when it is one.
  function coerce(sh, r, c, v) {
    if (v === null || v === undefined) return '';
    var s = String(v).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    if (s.trim() === '') return '';
    if (s.charAt(0) === '=') return s;
    if (sh._formatAt(r, c) === '@' || textCol(sh.name, c)) return s;
    var t = s.trim();
    if (/^-?\$?\s?(\d{1,3}(,\d{3})+|\d+)?(\.\d+)?$/.test(t) && /\d/.test(t) && !/^-?0\d/.test(t)) return Number(t.replace(/[$,\s]/g, ''));
    if (/^-?\d+(\.\d+)?%$/.test(t)) return Number(t.replace('%', '')) / 100;
    return s;
  }
  function snapRows(sh, rows) {
    var o = {};
    rows.forEach(function (r) { var row = sh.cells[r - 1]; o[r] = row ? row.slice() : null; });
    return o;
  }
  function snapSheet(sh) { return { cells: sh.cells.map(function (r) { return r ? r.slice() : r; }), notes: Object.assign({}, sh.notes), maxRows: sh.maxRows }; }
  function snapState(sh, rows) {
    var q = shim.ss._find(QUEUE);
    return { rows: rows ? snapRows(sh, rows) : null, full: rows ? null : snapSheet(sh), queue: q ? snapSheet(q) : null, props: G.PropertiesService.getDocumentProperties().getProperties() };
  }
  function restore(sh, snap) {
    if (snap.full) { sh.cells = snap.full.cells; sh.notes = snap.full.notes; sh.maxRows = snap.full.maxRows; }
    else Object.keys(snap.rows).forEach(function (r) { r = Number(r); while (sh.cells.length < r) sh.cells.push(null); sh.cells[r - 1] = snap.rows[r]; });
    sh._recount();
    var q = shim.ss._find(QUEUE);
    if (snap.queue) { if (!q) { shim.ss.insertSheet(QUEUE); q = shim.ss._find(QUEUE); } q.cells = snap.queue.cells; q.notes = snap.queue.notes; q._recount(); }
    else if (q) q.clear();
    var dp = G.PropertiesService.getDocumentProperties(); dp.deleteAllProperties(); dp.setProperties(snap.props || {});
  }
  function displayRows(sh, rows) {
    var lc = Math.max(sh.getLastColumn(), 1), out = {};
    rows.forEach(function (r) { out[r] = sh.getRange(r, 1, 1, lc).getDisplayValues()[0]; });
    return out;
  }
  function fireOnEdit(sh, r1, c1, nr, nc) {
    if (typeof G.onEdit !== 'function') return;
    var rng = sh._proxy.getRange(r1, c1, nr, nc);
    var e = { range: rng, source: shim.ss._proxy, value: nr * nc === 1 ? rng.getValue() : undefined, user: { getEmail: function () { return ''; } } };
    G.onEdit(e);
  }
  function doEdit(msg) {
    var sh = sheetOf(msg.sheet), op = msg.op || 'cells', stack = undo[msg.sheet] || (undo[msg.sheet] = []);
    var rowsTouched = [], full = false;
    if (op === 'cells') {
      // One or more blocks (a paste into filtered rows arrives as one block per run of Sheet rows); one undo step.
      var blocks = msg.blocks || [{ r1: msg.r1, c1: msg.c1, values: msg.values }];
      blocks.forEach(function (bk) { for (var i = 0; i < (bk.values || []).length; i++) if (rowsTouched.indexOf(Number(bk.r1) + i) < 0) rowsTouched.push(Number(bk.r1) + i); });
      if (!rowsTouched.length || rowsTouched.some(function (r) { return !(r >= 3); })) throw new Error('Nothing to change.');
      stack.push(snapState(sh, rowsTouched));
      blocks.forEach(function (bk) {
        var vals = bk.values || [], r1 = Number(bk.r1), c1 = Number(bk.c1), nr = vals.length;
        var nc = Math.max.apply(null, vals.map(function (v) { return v.length; }).concat([1]));
        for (var a = 0; a < nr; a++) for (var b = 0; b < (vals[a] || []).length; b++) {
          var v = vals[a][b]; if (v === undefined || v === null) continue;   // null = leave this cell (read-only gaps in a paste)
          sh._set(r1 + a, c1 + b, coerce(sh, r1 + a, c1 + b, v));
        }
        fireOnEdit(sh, r1, c1, nr, nc);
      });
    } else if (op === 'deleteRows') {
      full = true; stack.push(snapState(sh, null));
      (msg.rows || []).map(Number).filter(function (r) { return r >= 3; }).sort(function (x, y) { return y - x; }).forEach(function (r) { sh.deleteRows(r, 1); });
    } else if (op === 'appendRows') {
      full = true; stack.push(snapState(sh, null));
      var start = Math.max(sh.getLastRow(), 2) + 1, head = String(sh._get(2, 1) || '').toUpperCase(), n = Math.max(0, start - 3);
      (msg.values || []).forEach(function (row, k) {
        for (var c = 0; c < row.length; c++) if (row[c] !== null && row[c] !== undefined && String(row[c]) !== '') sh._set(start + k, c + 1, coerce(sh, start + k, c + 1, row[c]));
        if ((head === 'INDEX' || head === 'POS INDEX') && String(sh._get(start + k, 1) || '') === '') sh._set(start + k, 1, String(n + k + 1));
      });
      var nr2 = (msg.values || []).length, nc2 = Math.max.apply(null, (msg.values || []).map(function (v) { return v.length; }).concat([1]));
      if (nr2) fireOnEdit(sh, start, 1, nr2, nc2);
    } else throw new Error('Unknown edit ' + op);
    if (stack.length > UNDO_MAX) stack.shift();
    return reply(sh, full ? null : rowsTouched);
  }
  function doUndo(msg) {
    var sh = sheetOf(msg.sheet), stack = undo[msg.sheet] || [];
    var snap = stack.pop();
    if (!snap) throw new Error('Nothing to undo.');
    restore(sh, snap);
    return reply(sh, snap.full ? null : Object.keys(snap.rows).map(Number));
  }
  function reply(sh, rows) {
    var out = { sheet: sh.name, pending: pending(), undo: (undo[sh.name] || []).length, alerts: alerts.slice(), logs: logs.slice(-20) };
    if (rows) out.rows = displayRows(sh, rows); else out.display = shim.sheetDisplay(sh.name);
    return out;
  }

  function handle(msg) {
    if (!msg || !msg.cmd) return;
    currentId = msg.id;
    var step = msg.step || '';
    try {
      if (msg.cmd === 'ping') { post({ type: 'ready', id: msg.id, versions: versions() }); return; }
      if (msg.cmd === 'load') {
        makeShim();
        Object.keys(msg.sheets || {}).forEach(function (name) { shim.addSheet(name, msg.sheets[name]); });
        post({ type: 'loaded', id: msg.id, versions: versions() });
        return;
      }
      if (msg.cmd === 'edit' || msg.cmd === 'undo') {
        if (!shim) throw new Error('No input files have been loaded into the engine yet.');
        alerts = []; dialogs = [];
        var res = msg.cmd === 'edit' ? doEdit(msg) : doUndo(msg);
        post(Object.assign({ type: 'result', id: msg.id }, res));
        return;
      }
      if (msg.cmd === 'run') {
        if (!shim) throw new Error('No input files have been loaded into the engine yet.');
        var fnName = STEP_FN[step];
        if (!fnName || typeof G[fnName] !== 'function') throw new Error('Unknown step: ' + step);
        alerts = []; dialogs = [];
        if (step === 'build') clearQueue();          // a new OUT_MERGED_DATA: supplier changes queued for the old one no longer apply
        undo = {};                                   // the script rewrote its sheets: earlier edits can no longer be undone
        var t0 = Date.now();
        var ret = G[fnName]();
        var files = [];
        if (step === 'export' && ret && ret.length) {
          files = ret.map(function (f) { return { label: f.label, filename: f.filename, rowCount: f.rowCount, base64: f.base64 }; });
        }
        post({ type: 'result', id: msg.id, step: step, ms: Date.now() - t0, alerts: alerts, dialogs: dialogs, logs: logs.slice(-40), sheets: sheetsFor(step), files: files, pending: pending() });
        return;
      }
    } catch (e) {
      post({ type: 'error', id: msg.id, step: step, message: String(e && e.message ? e.message : e), stack: String(e && e.stack ? e.stack : ''), alerts: alerts, logs: logs.slice(-40) });
    }
  }

  if (isWorker) {
    G.onmessage = function (ev) { handle(ev.data); };
  } else {
    G.addEventListener('message', function (ev) { if (ev.data && ev.data.__phfMergeCmd) handle(ev.data); });
  }
  post({ type: 'ready', id: 0, versions: versions() });
})(typeof self !== 'undefined' ? self : this);
