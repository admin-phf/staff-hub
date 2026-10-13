/* PHF Staff Hub — POS New Product Check Clean · engine-host.js v1.3.0 (13 Oct 2026)
 * v1.3.0 (still outside the Apps Script files):
 *   keep:['member'] → matched products keep POS's price levels 1–5 (the POS MEMBER tick, column O);
 *   generate + stock:true → a NEW product's pos soh (OUT_POS_INSERT) = its SUP STOCK IN (column M) when that is a number;
 *   member pricing (m13IsMemberBrand_): the supplier row's O also when stage 3 works the price levels out again (TRUE /
 *     FALSE wins), then the script's own checks (Product Prefixes D, Ongoing Discounts J), then POS — a matched product's
 *     own price level 1 (90% = member), a new product's brand: most of its POS products on 90%;
 *   the " *SELL THRU*" note on SUP PRODUCT: the script reads SUP PRODUCT without it (m13ColVal_ / hbbColVal_), so matching
 *     and descr / pos desc are exactly as without the note; after stage 2 (and Refresh) OUT_MERGED_DATA's Q gets it back;
 *   min order qty that is not a number ("N/A", "8 X 1.1KG") stays on the sheets until OUT_POS_INSERT / OUT_POS_UPDATE:
 *     there it becomes 1 (INSERT, as a blank one does) or POS's current min order (UPDATE; 1 when POS has none).
 * v1.2.1: a TAB in an edited cell becomes a space (the POS TXT files are tab-separated).
 * v1.2.0 (all outside the Apps Script files, which are unchanged):
 *   run 'generate' + visible:[OUT sheet rows] → the Sheet's "from filtered data" generate (only those OUT rows);
 *   run 'generate' + keep:['ws','rrp','sub','brand','product','units','minorder','gst','supplier'] → matched products keep
 *     POS's current value for those fields in OUT_POS_UPDATE (from TMP_MERGED_POS_DATA, exactly as stored) and a matched
 *     product that ends up the same as POS is left out; discontinue:false leaves the DISCONTINUED rows out;
 *   run 'export' + only:{ sheet: [sheet rows] } → the TXT for that sheet has only those rows;
 *   { cmd:'dump' } / { cmd:'restore', dump } → the engine's sheets (all but TMP_MERGED_POS_DATA) and document properties,
 *     so the page can keep a session in the browser and put it back after the inputs are loaded again.
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
      host: 'v1.2.1',
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
    // v1.2.1: a TAB becomes a space — the POS TXT files are tab-separated, so a TAB inside a cell would shift every later column.
    var s = String(v).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').replace(/\t/g, ' ');
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

  // ------------------------------------------------ v1.2.0 run options (keep POS values, discontinue, filtered rows)
  var KEEP_COLS = {                       // OUT_POS_UPDATE column → TMP_MERGED_POS_DATA heading, by tick group
    ws: [[12, 'POS WSP EXCGST'], [13, 'POS LAST PRICE']],
    rrp: [[15, 'POS RRP INCGST'], [16, 'POS PR 1 PC'], [17, 'POS PR 2 PC'], [18, 'POS PR 3 PC'], [19, 'POS PR 4 PC'], [20, 'POS PR 5 PC'],
      [21, 'POS PR 6 PC'], [22, 'POS PR 7 PC'], [23, 'POS PR 8 PC'], [24, 'POS PR 9 PC'], [25, 'POS RET PRICE']],
    sub: [[2, 'POS SUB ID']], brand: [[3, 'POS BRAND']], product: [[4, 'POS DESCR'], [5, 'POS POS DESC']],
    units: [[10, 'POS UNITS']], minorder: [[11, 'POS MIN ORDER QTY']], gst: [[14, 'POS GST TAX PC']], supplier: [[8, 'POS SUPPLIER']],
    member: [[16, 'POS PR 1 PC'], [17, 'POS PR 2 PC'], [18, 'POS PR 3 PC'], [19, 'POS PR 4 PC'], [20, 'POS PR 5 PC']]   // v1.3.0
  };
  // Columns compared to say a matched product is the same as POS (POS INDEX and pos soh are not product data).
  var SAME_COLS = [[2, 'POS SUB ID'], [3, 'POS BRAND'], [4, 'POS DESCR'], [5, 'POS POS DESC'], [6, 'POS DISSNO'], [7, 'POS PROD GRP'], [8, 'POS SUPPLIER'],
    [9, 'POS LOYALTY SCHEME'], [10, 'POS UNITS'], [11, 'POS MIN ORDER QTY'], [12, 'POS WSP EXCGST'], [13, 'POS LAST PRICE'], [14, 'POS GST TAX PC'],
    [15, 'POS RRP INCGST'], [16, 'POS PR 1 PC'], [17, 'POS PR 2 PC'], [18, 'POS PR 3 PC'], [19, 'POS PR 4 PC'], [20, 'POS PR 5 PC'], [21, 'POS PR 6 PC'],
    [22, 'POS PR 7 PC'], [23, 'POS PR 8 PC'], [24, 'POS PR 9 PC'], [25, 'POS RET PRICE'], [26, 'POS PHARM PROD'], [27, 'POS SCALES'], [28, 'POS ITEMSIZE'], [29, 'POS PACKAGING']];
  var runOpts = null, runInfo = null;
  function posByPlu() {
    var t = shim.ss._find('TMP_MERGED_POS_DATA'); if (!t) return null;
    var head = (t.cells[1] || []).map(function (h) { return String(h == null ? '' : h).trim().toUpperCase(); });
    var col = {}; head.forEach(function (h, i) { if (h && col[h] === undefined) col[h] = i; });
    var plu = col['POS PLU'], map = {};
    if (plu === undefined) return null;
    for (var r = 2; r < t.cells.length; r++) { var row = t.cells[r]; if (!row) continue; var k = String(row[plu] == null ? '' : row[plu]).trim(); if (k && !map[k]) map[k] = row; }
    return { map: map, col: col };
  }
  function sameVal(a, b) {
    var x = String(a == null ? '' : a).replace(/[$,]/g, '').trim(), y = String(b == null ? '' : b).replace(/[$,]/g, '').trim();
    if (x === y) return true;
    var nx = Number(x), ny = Number(y);
    if (x !== '' && y !== '' && isFinite(nx) && isFinite(ny)) return Math.abs(nx - ny) < 0.00005;
    return false;
  }
  // ------------------------------------------------ v1.3.0 supplier columns M / O, member pricing, SELL THRU
  var SUP_SHEET = 'IN_SUPPLIER_/_PRODUCT_UPDATES', SELL_THRU = /\s*\*SELL THRU\*\s*/gi;
  function bcKey(v) { return String(v == null ? '' : v).replace(/\D/g, '').replace(/^0+/, ''); }
  function pluKey(v) { return String(v == null ? '' : v).trim().replace(/\.0+$/, ''); }
  // IN_SUPPLIER column c by barcode (D); numeric = only cells that are a number (stock).
  function supColByBarcode(c, numeric) {
    var sh = shim && shim.ss._find(SUP_SHEET), map = {}; if (!sh) return map;
    for (var r = 2; r < sh.cells.length; r++) {
      var row = sh.cells[r]; if (!row) continue;
      var k = bcKey(row[3]), v = row[c] == null ? '' : String(row[c]).trim(); if (!k || v === '' || map[k] !== undefined) continue;
      if (numeric) { var n = Number(v.replace(/,/g, '')); if (!isFinite(n) || n < 0) continue; v = n; }
      map[k] = v;
    }
    return map;
  }
  var memCtx = null, memCache = null, supMemCache = null;
  function supMemberFlag(bc) {
    var sh = shim && shim.ss._find(SUP_SHEET); if (!sh) return '';
    if (!supMemCache || supMemCache.sh !== sh || supMemCache.n !== sh.cells.length) supMemCache = { sh: sh, n: sh.cells.length, map: supColByBarcode(14, false) };
    return supMemCache.map[bc] || '';
  }
  // POS: a product's own price level 1 (about 90% = member, 100% = not; the four "no discount" DISSNOs say nothing) and,
  // per brand, whether most of its live POS products are on 90%.
  function posMember() {
    var t = shim && shim.ss._find('TMP_MERGED_POS_DATA'); if (!t) return null;
    if (memCache && memCache.t === t && memCache.n === t.cells.length) return memCache;
    var head = (t.cells[1] || []).map(function (h) { return String(h == null ? '' : h).trim().toUpperCase(); }), col = {};
    head.forEach(function (h, i) { if (h && col[h] === undefined) col[h] = i; });
    var cP = col['POS PLU'], c1 = col['POS PR 1 PC'], cB = col['POS BRAND'], cD = col['POS DISSNO'], cX = col['POS DESCR'];
    var out = { t: t, n: t.cells.length, plu: {}, brand: {} }, cnt = {};
    if (cP === undefined || c1 === undefined) { memCache = out; return out; }
    var EXCEPT = { '33': 1, '29': 1, '8': 1, '13': 1 }, norm = typeof G.m13NormBrand_ === 'function' ? G.m13NormBrand_ : function (x) { return String(x || '').trim().toUpperCase(); };
    for (var r = 2; r < t.cells.length; r++) {
      var row = t.cells[r]; if (!row) continue;
      var p1 = Number(String(row[c1] == null ? '' : row[c1]).replace(/[%,\s]/g, '')); if (String(row[c1] == null ? '' : row[c1]).trim() === '' || !isFinite(p1)) continue;
      if (cD !== undefined && EXCEPT[pluKey(row[cD]).split('.')[0]]) continue;
      var m = p1 >= 89 && p1 < 91 ? true : p1 >= 99.5 ? false : null; if (m === null) continue;
      var k = pluKey(row[cP]); if (k && out.plu[k] === undefined) out.plu[k] = m;
      if (cB === undefined || (cX !== undefined && /^ZZZZ/i.test(String(row[cX] || '')))) continue;
      var b = norm(row[cB]); if (!b) continue;
      cnt[b] = cnt[b] || [0, 0]; cnt[b][m ? 0 : 1]++;
    }
    Object.keys(cnt).forEach(function (b) { if (cnt[b][0] > cnt[b][1]) out.brand[b] = true; });
    memCache = out; return out;
  }
  function wrapCtx(name, mk) {
    var orig = G[name]; if (typeof orig !== 'function') return;
    G[name] = function () { var prev = memCtx; try { memCtx = mk(arguments); } catch (e) { memCtx = null; } try { return orig.apply(this, arguments); } finally { memCtx = prev; } };
  }
  function installMemberHooks() {
    var origMem = G.m13IsMemberBrand_; if (typeof origMem !== 'function') return;
    G.m13IsMemberBrand_ = function (brandNorm, supplierNum, memberFlag, prefixMap, discountRules) {
      var c = memCtx, flag = String(memberFlag == null ? '' : memberFlag).trim();
      if (!flag && c && c.bc) flag = supMemberFlag(c.bc);          // the supplier row's O, also when stage 3 works the levels out again
      if (/^(FALSE|NO|N|0)$/i.test(flag)) return false;            // O = FALSE: not a member, whatever else says
      if (origMem.call(this, brandNorm, supplierNum, flag, prefixMap, discountRules)) return true;
      var pm = posMember(); if (!pm) return false;
      if (c && c.plu && pm.plu[c.plu] !== undefined) return pm.plu[c.plu];   // a matched product: its own PL1 in POS
      return !!(brandNorm && pm.brand[brandNorm]);                          // otherwise most of the brand's POS products
    };
    wrapCtx('m13BuildOneOutRow_', function (a) { var sup = a[2], pos = a[3]; return { plu: pos && pos.plu ? pluKey(pos.plu) : '', bc: sup && sup.barcode ? bcKey(sup.barcode) : '' }; });
    wrapCtx('m13BuildDiscontinuedOutRow_', function (a) { var pos = a[1]; return { plu: pos && pos.plu ? pluKey(pos.plu) : '', bc: '' }; });
    wrapCtx('m13ApplySupplierOverrideToOutRow_', function (a) { var row = a[0], sup = a[1]; return { plu: row ? pluKey(row[42]) : '', bc: sup && sup.barcode ? bcKey(sup.barcode) : '' }; });
    wrapCtx('m13ResolvedShelfPricingForOutput_', function (a) { var f = a[2]; return { plu: pluKey(f(1)), bc: bcKey(f(0)) }; });
  }
  function stripNote(v) { return typeof v === 'string' && v.indexOf('*') >= 0 ? v.replace(SELL_THRU, ' ').replace(/\s+/g, ' ').trim() : v; }
  function installSellThruHooks() {
    // The script reads SUP PRODUCT through m13ColVal_ / hbbColVal_ with 'SUP PRODUCT' first in the list.
    ['m13ColVal_', 'hbbColVal_'].forEach(function (name) {
      var orig = G[name]; if (typeof orig !== 'function') return;
      G[name] = function (row, map, candidates) {
        var v = orig.apply(this, arguments);
        return candidates && candidates[0] === 'SUP PRODUCT' ? stripNote(v) : v;
      };
    });
    var origP = G.m13PolishColumnPDescription_;
    if (typeof origP === 'function') G.m13PolishColumnPDescription_ = function () {
      var a = Array.prototype.slice.call(arguments);
      a[0] = stripNote(a[0]); a[2] = stripNote(a[2]);
      return origP.apply(this, a);
    };
  }
  // After stage 2 / Refresh: OUT_MERGED_DATA's Q (SUP PRODUCT) shows the note again for the supplier rows that have it.
  function noteSellThru() {
    var sup = shim && shim.ss._find(SUP_SHEET), out = shim && shim.ss._find('OUT_MERGED_DATA'); if (!sup || !out) return 0;
    var noted = {}, any = false, n = 0;
    for (var r = 2; r < sup.cells.length; r++) {
      var row = sup.cells[r], g = row && row[6] != null ? String(row[6]) : '';
      if (g && /\*SELL THRU\*/i.test(g)) { noted[stripNote(g).toUpperCase()] = 1; any = true; }
    }
    if (!any) return 0;
    for (var o = 2; o < out.cells.length; o++) {
      var orow = out.cells[o], q = orow && orow[16] != null ? String(orow[16]).trim() : '';
      if (q && !/\*SELL THRU\*/i.test(q) && noted[q.toUpperCase()]) { orow[16] = q + ' *SELL THRU*'; n++; }
    }
    return n;
  }
  // OUT_POS_INSERT / OUT_POS_UPDATE: min order qty (field 11) must be a number for POS.
  function fixMinOrder(built, pos) {
    var isNum = function (v) { var t = String(v == null ? '' : v).replace(/,/g, '').trim(); return t !== '' && isFinite(Number(t)); };
    var n = 0;
    (built.insertRows || []).forEach(function (row) { if (!isNum(row[11])) { row[11] = '1'; n++; } });
    (built.updateRows || []).forEach(function (row) {
      if (isNum(row[11])) return;
      var p = pos && pos.map[String(row[1] == null ? '' : row[1]).trim()], ci = pos ? pos.col['POS MIN ORDER QTY'] : undefined;
      var v = p && ci !== undefined ? p[ci] : '';
      row[11] = isNum(v) ? v : '1'; n++;
    });
    return n;
  }
  // Fields POS cannot take blank: when POS itself has no value there, the merge's value stays.
  var NEED_VALUE = { 10: 1, 11: 1, 15: 1, 16: 1, 17: 1, 18: 1, 19: 1, 20: 1, 21: 1, 22: 1, 23: 1, 24: 1, 25: 1 };
  function installRunHooks() {
    if (G.__phfHooks) return; G.__phfHooks = true;
    installMemberHooks(); installSellThruHooks();                    // v1.3.0
    var origUpd = G.m13BuildUpdateOutputRow_, origBuilt = G.m13BuildPosOutputRowsFromOut_, origVis = G.m13BuildVisibleRowSetFromHelper_;
    if (typeof origUpd === 'function') G.m13BuildUpdateOutputRow_ = function (row, headers) {
      var out = origUpd.apply(this, arguments);
      if (runOpts) { try { out.__status = G.m13OutStatusKey_(G.m13OutVal_(row, headers, ['ROW STATUS', 'STATUS'])); } catch (e) { out.__status = ''; } }
      return out;
    };
    if (typeof origBuilt === 'function') G.m13BuildPosOutputRowsFromOut_ = function () {
      var built = origBuilt.apply(this, arguments);
      var minFixed = fixMinOrder(built, posByPlu());                   // v1.3.0: "N/A" min order → 1 / POS's
      if (!runOpts) { runInfo = minFixed ? { kept: 0, same: 0, disc: 0, notFound: 0, stock: 0, minOrder: minFixed } : null; return built; }
      var keep = (runOpts.keep || []).filter(function (g) { return KEEP_COLS[g]; }), noDisc = runOpts.discontinue === false, pos = keep.length ? posByPlu() : null;
      var info = { kept: 0, same: 0, disc: 0, notFound: 0, stock: 0, minOrder: minFixed };
      // v1.3.0: SUP STOCK IN (M) → a new product's stock on hand (pos soh, the last INSERT field).
      if (runOpts.stock) {
        var stockBy = supColByBarcode(12, true);
        (built.insertRows || []).forEach(function (row) { var v = stockBy[bcKey(row[1])]; if (v !== undefined) { row[30] = v; info.stock++; } });
      }
      built.updateRows = built.updateRows.filter(function (row) {
        if (row.__status === 'DISCONTINUED') { if (noDisc) { info.disc++; return false; } return true; }
        if (row.__status !== 'MATCHED' || !keep.length) return true;
        var p = pos && pos.map[String(row[1] == null ? '' : row[1]).trim()];
        if (!p) { info.notFound++; return true; }
        keep.forEach(function (g) {
          (KEEP_COLS[g] || []).forEach(function (kc) {
            var ci = pos.col[kc[1]]; if (ci === undefined) return;
            var v = p[ci] == null ? '' : p[ci];
            if (String(v).trim() === '' && NEED_VALUE[kc[0]]) return;
            row[kc[0]] = v;
          });
        });
        info.kept++;
        var same = SAME_COLS.every(function (sc) { var ci = pos.col[sc[1]]; return ci === undefined || sameVal(row[sc[0]], p[ci]); });
        if (same) { info.same++; info.kept--; return false; }
        return true;
      });
      built.updateRows.forEach(function (row, i) { row[0] = i + 1; delete row.__status; });
      runInfo = info;
      return built;
    };
    if (typeof origVis === 'function') G.m13BuildVisibleRowSetFromHelper_ = function () {
      if (runOpts && runOpts.visible) { var v = {}; runOpts.visible.forEach(function (r) { v[r] = true; }); return v; }
      return origVis.apply(this, arguments);
    };
  }
  // Export with only some rows of a POS sheet: the other rows are emptied for the export (the TXT skips empty rows) and
  // put back after it, so row positions and number formats stay as they are.
  function withOnlyRows(only, fn) {
    var saved = [];
    Object.keys(only || {}).forEach(function (name) {
      var sh = shim.ss._find(name); if (!sh) return;
      var keep = {}; (only[name] || []).forEach(function (r) { keep[r] = true; });
      saved.push({ sh: sh, snap: snapSheet(sh) });
      for (var r = 3; r <= sh.cells.length; r++) if (!keep[r]) sh.cells[r - 1] = null;
      sh._recount();
    });
    try { return fn(); }
    finally { saved.forEach(function (s) { s.sh.cells = s.snap.cells; s.sh.notes = s.snap.notes; s.sh.maxRows = s.snap.maxRows; s.sh._recount(); }); }
  }
  // ------------------------------------------------ v1.2.0 session dump / restore
  var SKIP_KEYS = { ss: 1, _proxy: 1, filter: 1 };
  function dumpSheets() {
    var out = [];
    shim.ss.sheets.forEach(function (sh) {
      if (sh.name === 'TMP_MERGED_POS_DATA') { out.push({ name: sh.name, tmp: true }); return; }
      var o = { name: sh.name };
      Object.keys(sh).forEach(function (k) { if (!SKIP_KEYS[k] && typeof sh[k] !== 'function') o[k] = sh[k]; });
      out.push(o);
    });
    return { v: 1, sheets: out, props: G.PropertiesService.getDocumentProperties().getProperties() };
  }
  function restoreSheets(d) {
    if (!d || d.v !== 1 || !d.sheets) throw new Error('The saved session is from another version.');
    var tmp = shim.ss._find('TMP_MERGED_POS_DATA'), list = [];
    d.sheets.forEach(function (o) {
      if (o.tmp) { if (tmp) list.push(tmp); return; }
      shim.addSheet(o.name, []);
      var sh = shim.ss._find(o.name);
      shim.ss.sheets.splice(shim.ss.sheets.indexOf(sh), 1);
      Object.keys(o).forEach(function (k) { if (k !== 'name') sh[k] = o[k]; });
      sh.filter = null;
      list.push(sh);
    });
    shim.ss.sheets = list;
    var dp = G.PropertiesService.getDocumentProperties(); dp.deleteAllProperties(); dp.setProperties(d.props || {});
    undo = {};
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
      if (msg.cmd === 'dump') {
        if (!shim) throw new Error('Nothing is loaded in the engine.');
        post({ type: 'result', id: msg.id, dump: dumpSheets() });
        return;
      }
      if (msg.cmd === 'restore') {
        if (!shim) throw new Error('Load the inputs before putting a session back.');
        restoreSheets(msg.dump);
        var shown = {};
        (msg.sheets || []).forEach(function (n) { var dd = shim.sheetDisplay(n); if (dd) shown[n] = dd; });
        post({ type: 'result', id: msg.id, sheets: shown, pending: pending() });
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
        installRunHooks();
        runInfo = null;
        runOpts = (step === 'generate' && (msg.visible || (msg.keep && msg.keep.length) || msg.discontinue === false || msg.stock))
          ? { visible: msg.visible || null, keep: msg.keep || [], discontinue: msg.discontinue !== false, stock: !!msg.stock } : null;
        if (step === 'generate' && msg.visible) fnName = 'generateInsertUpdateSheetsFromFilteredData';
        var ret;
        try { ret = step === 'export' && msg.only ? withOnlyRows(msg.only, function () { return G[fnName](); }) : G[fnName](); }
        finally { runOpts = null; }
        if (step === 'build' || step === 'refresh') noteSellThru();       // v1.3.0
        var files = [];
        if (step === 'export' && ret && ret.length) {
          files = ret.map(function (f) { return { label: f.label, filename: f.filename, rowCount: f.rowCount, base64: f.base64 }; });
        }
        post({ type: 'result', id: msg.id, step: step, ms: Date.now() - t0, alerts: alerts, dialogs: dialogs, logs: logs.slice(-40), sheets: sheetsFor(step), files: files, pending: pending(), info: runInfo });
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
