/* PHF Staff Hub — POS New Product Check Clean · engine-host.js v1.7.1 (16 Oct 2026)
 * v1.7.1: descriptions — a word the script's must-keep pass re-adds is dropped when the description already has it inside
 *   another token (NIGHT+L … L, WOMEN'S … WOMEN, CAT'S … CAT); a marketing word the script strips (BIOACTIVE, HIGH
 *   POTENCY …) stays when the matched POS description has it (BIOC UBIQ BIOACTIVE 150MG 30C). TYPE (AM) filled by
 *   inference when the text has no form word (inferType): VC / SG counts → CAPSULES, LOZ → LOZENGES; topical words
 *   (cream, serum, shampoo, soap, toothpaste …) → TOPICAL; ML / LTR otherwise → LIQUID (household cleaners too); KG →
 *   POWDER unless a food word; G → POWDER only with a powder word (protein, collagen, greens, creatine, electrolytes,
 *   amino acids, probiotic, formula, blend …) and no food word. A TYPE the script found is never changed.
 * v1.7.0: sell-through — the note on SUP PRODUCT in any of its forms (*SELL THRU*, *SELL THROUGH, NEW SKU 2959733*, SELL
 *   THROUGH) is read off before matching / descriptions (so no SELL or SKU number leaks into POS DESCR); after stage 2 /
 *   Refresh the row's POS DESCR ends with "*" (the marker POS staff look for), Q shows the note and NOTES (AF) says
 *   "SELL THROUGH — new SKU 2959733". Forms (refineForms): litres are written LTR in SIZE / itemsize and in POS DESCR
 *   (1L / 1LT / 1 LITRE → 1LTR); a POWDER product's POS DESCR carries PWD (ORAL → PWD, else PWD before the size when it
 *   fits in 35; otherwise an upload check says so). A possessive word (WOMEN'S, MEN'S, CAT'S) is not re-added as its
 *   base word by the script's must-keep pass (BIOC WOMEN'S ESS WOMEN 120C).
 * v1.6.3: the brand's CURRENT / NEW tick decides again (v1.6.2 kept POS's brand on every differing row by itself).
 * v1.6.1: hold every product of a brand that shares one last price while the WSPs differ (a discount % typed into N).
 * v1.6.0: SIZE (AL) gaps filled after stage 2 / Refresh (refineSizes): count × size (30X4.5G, 20X5G), weights and volumes
 *   (G / GM / ML / MLS / KG / L / LT / OZ / LB), counts (60S, 60TB, 60CHEW, 50 GUMMIES, 90 VEGIECAPS, 30CA, 3PK, 1PC,
 *   SACH) and doses (MG / MCG / IU) read from SUP PRODUCT first, then POS DESCR; a SIZE that is not a size (1000MG
 *   VITAMIN C, CONTAINS: …) is blanked. BR itemsize = AL SIZE as written (1KG, 300G, 60C) for new and matched rows
 *   (discontinued rows keep POS's). KEEP_COLS: `ws` is the WSP alone, `last` the last price, `size` the item size
 *   (unticked: matched products keep POS's item size, new products get 0).
 * v1.5.0: upload checks on every OUT_POS_INSERT / OUT_POS_UPDATE row after stage 3 (uploadChecks): hold (RRP below WSP,
 *   last price under half the WSP, barcode check digit, a new product whose barcode or Sub ID POS already has — the page
 *   unticks these), check (WSP / RRP moves more than 40 %, brand / Sub ID / size differ from POS, a discontinued product
 *   with stock on hand or a price change) and fixed (box / display WSP ÷ pack count, SELL text and repeated words taken
 *   out of descr / pos desc, a ZZZZ brand / descr made consistent — ZEN is no longer "EN", ZZEAGLE is EAGLE). The run's
 *   info.checks = { OUT_POS_INSERT: { sheetRow: { level, notes, fix } }, OUT_POS_UPDATE: {…}, n }. runOpts is set for
 *   every generate now (checks: false turns the checks off).
 * v1.4.0: OUT_MERGED_DATA's TYPE (AM) goes to packaging (BS) and from there to POS (the INSERT / UPDATE packaging field);
 *   refineTypes() after stage 2 / Refresh: a "STICK" alone is no longer SACHETS (deodorant, zinc, lip, balm sticks →
 *   TOPICAL; smudge / dental sticks → no type), SACH / SACHS / SACHE (also glued to a size, SACH12G; not SACHA INCHI) and
 *   single-serve packs in SUP PRODUCT (4.5G X 30 PACK, 30 X 6.5G — 15 g or less, not DISPLAY) are SACHETS. A TYPE typed
 *   in AM goes to BS too. KEEP_COLS.product keeps POS's packaging with the description (SUP PRODUCT unticked).
 *   TEA only when the product is tea: TEA TREE / TTREE and TEA LIGHT are not tea (→ OIL, TOPICAL … or no type), and an
 *   ingredient tea (GREEN / WHITE / BLACK / ICED TEA) gives way to another form in the text (SOAP LIQUID, CREAM, 30T).
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
      host: 'v1.6.3',
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
    if (sh.name === 'OUT_MERGED_DATA') { refineTypes(full ? null : rowsTouched, true); refineSizes(full ? null : rowsTouched, true); }   // v1.4.0: a TYPE typed in AM → BS; v1.6.0 AL → BR
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
    ws: [[12, 'POS WSP EXCGST']], last: [[13, 'POS LAST PRICE']], size: [[28, 'POS ITEMSIZE']],   // v1.6.0 last / size split out
    rrp: [[15, 'POS RRP INCGST'], [16, 'POS PR 1 PC'], [17, 'POS PR 2 PC'], [18, 'POS PR 3 PC'], [19, 'POS PR 4 PC'], [20, 'POS PR 5 PC'],
      [21, 'POS PR 6 PC'], [22, 'POS PR 7 PC'], [23, 'POS PR 8 PC'], [24, 'POS PR 9 PC'], [25, 'POS RET PRICE']],
    sub: [[2, 'POS SUB ID']], brand: [[3, 'POS BRAND']], product: [[4, 'POS DESCR'], [5, 'POS POS DESC'], [29, 'POS PACKAGING']],   // v1.4.0 packaging
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
  var SUP_SHEET = 'IN_SUPPLIER_/_PRODUCT_UPDATES';
  // v1.7.0: every form of the note — "*SELL THRU*", "*SELL THROUGH, NEW SKU 2959733*", "* SELL THROUGH *", a bare "SELL THROUGH, NEW SKU 2959733".
  var SELL_THRU = /\s*(?:\*\s*SELL\s*(?:THROUGH|THRU)\b[^*]*\*?|\bSELL\s*(?:THROUGH|THRU)\b(?:\s*,?\s*NEW\s*SKU\s*#?\s*\d+)?)\s*/gi;
  function sellNote(text) {                                    // → { sku } when the text carries the note, else null
    var t = String(text == null ? '' : text); if (!/SELL\s*(?:THROUGH|THRU)/i.test(t)) return null;
    var m = t.match(/NEW\s*SKU\s*#?\s*(\d+)/i); return { sku: m ? m[1] : '' };
  }
  function sellText(n) { return 'SELL THROUGH' + (n && n.sku ? ' — new SKU ' + n.sku : ''); }
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
    wrapCtx('m13BuildOneOutRow_', function (a) { var sup = a[2], pos = a[3]; return { plu: pos && pos.plu ? pluKey(pos.plu) : '', bc: sup && sup.barcode ? bcKey(sup.barcode) : ''}; });
    wrapCtx('m13BuildDiscontinuedOutRow_', function (a) { var pos = a[1]; return { plu: pos && pos.plu ? pluKey(pos.plu) : '', bc: '' }; });
    wrapCtx('m13ApplySupplierOverrideToOutRow_', function (a) { var row = a[0], sup = a[1]; return { plu: row ? pluKey(row[42]) : '', bc: sup && sup.barcode ? bcKey(sup.barcode) : '' }; });
    wrapCtx('m13ResolvedShelfPricingForOutput_', function (a) { var f = a[2]; return { plu: pluKey(f(1)), bc: bcKey(f(0)) }; });
  }
  // v1.7.1: the script strips marketing words (BIOACTIVE, HIGH POTENCY, CERTIFIED ORGANIC …) when the supplier row is read,
  // before it knows the POS product. When the matched POS description carries the word, POS wants it: after the polish
  // pass it goes back in front of the size (BIOC UBIQ BIOACTIVE 150MG 30C) when the 35 characters allow.
  function restoreMarketing(descr, originalPosDescr, supplierRaw) {
    var list = typeof G.m13MarketingPhrases_ === 'function' ? G.m13MarketingPhrases_ : null, rx = typeof G.m13MarketingPhraseRegex_ === 'function' ? G.m13MarketingPhraseRegex_ : null;
    var out = String(descr == null ? '' : descr), o = up(originalPosDescr), q = up(supplierRaw);
    if (!list || !rx || !out || !o || !q) return out;
    list().forEach(function (ph) {
      var test = function (t) { var r = rx(ph); r.lastIndex = 0; return r.test(t); };
      if (!test(o) || !test(q) || test(out)) return;
      var word = (o.match(rx(ph)) || [''])[0].replace(/^[^A-Z0-9]+/, '').trim(); if (!word) return;
      var stem = word.replace(/[^A-Z0-9]/g, '');
      if (out.split(' ').some(function (t) { var b = t.replace(/[^A-Z0-9]/g, ''); return b.length >= 4 && stem.indexOf(b) === 0; })) return;   // already there, abbreviated (BIOACT)
      var w = out.split(' '), at = w.length;
      for (var i = w.length - 1; i > 0; i--) if (SZ_OK.test(w[i]) || /^\d+(\.\d+)?(X\d+(\.\d+)?)?[A-Z]+$/.test(w[i]) || /^\d+MG$/.test(w[i])) at = i;
      w.splice(at, 0, word);
      var next = w.join(' ');
      if (next.length <= DESCR_MAX) out = next;
    });
    return out;
  }
  function stripNote(v) { return typeof v === 'string' && /SELL\s*(?:THROUGH|THRU)/i.test(v) ? v.replace(SELL_THRU, ' ').replace(/\s+/g, ' ').trim() : v; }   // v1.7.0: every form
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
    // v1.7.1: the script's own "purged POS words" restore (m13SZ1RestorePurgedPosWords_(descr, supplierRaw, originalPosDescr))
    // only works when the word before the phrase is unchanged; the marketing restore runs right after it.
    var origSZ = G.m13SZ1RestorePurgedPosWords_;
    if (typeof origSZ === 'function') G.m13SZ1RestorePurgedPosWords_ = function (descr, supplierRaw, originalPosDescr) {
      var r = origSZ.apply(this, arguments);
      return typeof r === 'string' ? restoreMarketing(r, originalPosDescr, stripNote(supplierRaw)) : r;
    };
    // v1.7.0: the script's must-keep pass puts the strongest supplier word back when it cannot see it in the description;
    // WOMEN'S / MEN'S / CAT'S hide the word behind the apostrophe, so it added WOMEN again (BIOC WOMEN'S ESS WOMEN 120C).
    var origMust = G.m13DP5EnsureMustKeepFromQ_;
    if (typeof origMust === 'function') G.m13DP5EnsureMustKeepFromQ_ = function (body) {
      var r = origMust.apply(this, arguments), was = up(body).split(' '), now = String(r == null ? '' : r).split(' ');
      if (now.length !== was.length + 1) return r;
      var added = now.filter(function (w) { return was.indexOf(w) < 0; });
      if (added.length !== 1) return r;
      var w = added[0], has = was.some(function (x) {
        var b = x.replace(/[^A-Z0-9']/g, ''); if (b === w + "'S" || b === w + 'S' || b === w + "'") return true;   // WOMEN'S → WOMEN
        return x.split(/[^A-Z0-9]+/).indexOf(w) >= 0;                                                              // v1.7.1: NIGHT+L → L, L-THN → L
      });
      if (!has) return r;
      now.splice(now.indexOf(w), 1); return now.join(' ');
    };
  }
  // After stage 2 / Refresh: for the supplier rows that carry the sell-through note, OUT_MERGED_DATA's Q (SUP PRODUCT) shows
  // it again, P (POS DESCR) ends with "*" (v1.7.0 — the marker that identifies sell-through stock in POS; stage 3 reads P),
  // and NOTES (AF, index 31) says "SELL THROUGH — new SKU 2959733". Runs after refineForms so the "*" is the last token.
  var DESCR_MAX = 35;
  function markStar(p) {
    p = up(p).replace(/\s*\*+$/, '').trim(); if (!p) return '';
    return (p + ' *').length <= DESCR_MAX ? p + ' *' : p + '*';
  }
  function noteSellThru() {
    var sup = shim && shim.ss._find(SUP_SHEET), out = shim && shim.ss._find('OUT_MERGED_DATA'); if (!sup || !out) return 0;
    // By the supplier barcode first; by the product text only when every supplier row with that text carries the note (the
    // replacement SKU often has the same name without it — EAGLE TRESOS B PRO 60T: old barcode sell-through, new barcode not).
    var byBc = {}, byText = {}, any = false, n = 0;
    for (var r = 2; r < sup.cells.length; r++) {
      var row = sup.cells[r], g = row && row[6] != null ? String(row[6]) : '', sn = sellNote(g), k = bcKey(row && row[3]), t = String(stripNote(g)).toUpperCase();
      if (!t) continue;
      if (sn) { any = true; if (k) byBc[k] = sn; if (byText[t] === undefined) byText[t] = sn; }
      else { byText[t] = null; }                                                           // the same name without the note: text is not enough
    }
    if (!any) return 0;
    for (var o = 2; o < out.cells.length; o++) {
      var orow = out.cells[o], q = orow && orow[16] != null ? String(orow[16]).trim() : '', key = String(stripNote(q)).toUpperCase();
      var sn2 = byBc[bcKey(orow && orow[10])] || (key ? byText[key] : null);
      if (!sn2 || /DISCONTINUED/.test(up(orow[1]))) continue;
      if (!sellNote(q)) orow[16] = key + ' *' + sellText(sn2).replace(' — new SKU', ', NEW SKU').toUpperCase() + '*';
      var p = up(orow[15]);
      if (p && !/^Z{3,}/.test(p) && !/\*$/.test(p)) { orow[15] = markStar(p); orow[45] = orow[15]; orow[46] = posDescOf(orow[15]); }
      var note = String(orow[31] == null ? '' : orow[31]).trim(), txt = sellText(sn2);
      if (note.toUpperCase().indexOf('SELL THROUGH') < 0) orow[31] = note ? note + ' | ' + txt : txt;
      n++;
    }
    return n;
  }
  // v1.4.0 — TYPE (AM, index 38) → packaging (BS, index 70). Q = 16, O = 14, P = 15.
  var T_SACH_WORD = /\bSACH(?:ETS?|S|E)?(?![A-Z])/, T_REAL_SACH = /SACHET|\bSACH(?:S|E)?(?![A-Z])|PACKETS?\b|STICK\s*PACKS?/;
  var T_STICK_TOPICAL = /\b(DEOD\w*|SUNSCREEN|SPF\d*|ZINC|LIP|BALM|SKIN|BLEMISH|CREAM|CRM)\b/;
  function singleServe(q) {
    var m = q.match(/\b(\d+(?:\.\d+)?)\s*G\s*X\s*\d{1,3}\s*(?:PACK|PK|BOX)\b/) || q.match(/\b\d{1,3}\s*X\s*(\d+(?:\.\d+)?)\s*G\b/);
    return !!m && Number(m[1]) > 0 && Number(m[1]) <= 15 && !/\bDISPLAY\b/.test(q);
  }
  function strictType(text, size) {
    var t = typeof G.m13StrictTypeFromText_ === 'function' ? G.m13StrictTypeFromText_(text) : '';
    if (!t && size && typeof G.m13StrictTypeFromSizeSuffix_ === 'function') t = G.m13StrictTypeFromSizeSuffix_(size);
    return t || '';
  }
  function refineType(row) {
    var up = function (v) { return String(v == null ? '' : v).toUpperCase(); };
    var q = up(row[16]).replace(SELL_THRU, ' ').trim(), src = q || (up(row[14]) + ' ' + up(row[15])), t = String(row[38] == null ? '' : row[38]).trim().toUpperCase();
    var size = up(row[37]);
    var stickOnly = !T_REAL_SACH.test(src) && /\bSTICKS?\b/.test(src), ev = stickOnly ? src.replace(/\bSTICKS?\b/g, ' ') : src;
    if (t === 'SACHETS' && stickOnly) t = strictType(ev, '');        // the only sachet evidence was STICK(S)
    if (t === 'TEA') {                                               // tea tree, tea lights and ingredient teas
      var m = ev.replace(/\bTEA\s*-?\s*TREE\b|\bTTREE\b|\bTEA\s*LIGHTS?\b/g, ' ');
      if (!/\bTEA\b/.test(m)) t = strictType(m, size);
      else if (/\b(GREEN|WHITE|BLACK|ICED|PEACH)\s+TEA\b/.test(m)) {
        var alt = strictType(m.replace(/\b(GREEN|WHITE|BLACK|ICED|PEACH)\s+TEA\b/g, ' '), size);
        if (alt && alt !== 'TEA') t = alt;
      }
    }
    if (!t && stickOnly && T_STICK_TOPICAL.test(src)) t = 'TOPICAL';  // deodorant, zinc, lip, balm, skin sticks
    if (!t && T_SACH_WORD.test(src)) t = 'SACHETS';
    if (!t && q && singleServe(q)) t = 'SACHETS';
    if (!t) t = inferType(src, size || sizeFrom(q) || sizeFrom(row[15]));   // v1.7.1
    return t;
  }
  // v1.7.1 — a form when the text names none. Only where the unit and the words leave little doubt; otherwise blank.
  var I_TOPICAL = /\b(LOTIONS?|SERUMS?|GELS?|BALMS?|TOOTHPASTE|TPASTE|WASH|SHAMPOO|SHAMP|CONDITIONER|COND|DEODORANTS?|DEOD|SOAPS?|CLEANSERS?|MOISTURI[SZ]ERS?|MOIST|MASKS?|SCRUBS?|SUNSCREEN|OINTMENT|ROLL[- ]?ON|LIP|SALVE|RUB|EXFOLIAT\w*|TONER|MOUTHWASH|MASSAGE|HAIR|SHAVING|CLEANSING)\b/;
  var I_CREAM = /\b(CREAMS?|CREME|CRM)\b/;                                                   // a cream — or a flavour (STRAWBERRIES & CREAM 450G)
  var I_CLEANER = /\b(CLEANERS?|DETERGENT|LAUNDRY|DISHWASH\w*|DISH|SOFTE?NER|FLOOR|TOILET|BLEACH|SANITI[SZ]ER|DISINFECTANT|SPRAY N WIPE)\b/;
  var I_FOOD = /\b(BARS?|BITES?|BALLS?|COOKIES?|BISCUITS?|NIBS|CHIPS|MUESLI|GRANOLA|CEREAL|OATS|HONEY|SYRUP|JAM|SPREAD|BUTTER|SUGAR|FLOUR|RICE|PASTA|SALT|COFFEE|NUTS?|SEEDS?|FRUIT|DRINKING|TEA|TBAGS?|LOLLIES|CHOCOLATE|CONC\w*|PASTE|CRACKERS?|NOODLES?|CHEWABLES?|CHEWS?|GUMMIES|GUMMY)\b/;
  var I_POWDER = /\b(PROTEINS?|PROT|WHEY|WPI|WPC|COLLAGEN|COLL|PEPTIDES?|GREENS|GRNS|CREATINE|CREAT|GLUTAMINE|BCAAS?|EAAS?|ELECTROLYTES?|HYDRATION|HYD|FIBRE|FIBER|PWD|PRE[- ]?WORKOUT|INTRA[- ]?WORKOUT|AMINOS?|AMINO ACIDS?|GLYCINE|LYSINE|ARGININE|TAURINE|CITRULLINE|CARNITINE|GLUCOSAMINE|INOSITOL|TYROSINE|BETA ALANINE|MAGNESIUM|MAG|SPIRULINA|CHLORELLA|MACA|CARBS?|GAINER|SMOOTHIE|SHAKE|MEAL|BIOTIC|PROBIOTICS?|FORMULA|BLEND|SUPERFOODS?|LATTE|ZINC|VITAMIN C|VIT C|MANNOSE|GLYCOCALYX|SUPP\w* PWD)\b/;
  function inferType(src, size) {
    var u = (String(size || '').match(/^[\d.]+(?:X[\d.]+)?([A-Z]+)$/) || [])[1] || '';
    if (u === 'VC' || u === 'SG') return 'CAPSULES';
    if (u === 'LOZ') return 'LOZENGES';
    var powder = (u === 'KG' && !I_FOOD.test(src)) || (u === 'G' && I_POWDER.test(src) && !I_FOOD.test(src));
    if (I_TOPICAL.test(src) && (u === 'ML' || u === 'LTR' || u === 'G' || u === 'KG' || !u)) return 'TOPICAL';
    if (powder) return 'POWDER';                                                           // before a CREAM that is a flavour
    if (I_CREAM.test(src) && (u === 'ML' || u === 'LTR' || u === 'G' || u === 'KG' || !u)) return 'TOPICAL';
    if (u === 'ML' || u === 'LTR') return I_FOOD.test(src) && !I_CLEANER.test(src) ? '' : 'LIQUID';
    return '';
  }
  function refineTypes(rowsOnly, syncOnly) {          // syncOnly: after an edit, AM as typed → BS (no refining)
    var out = shim && shim.ss._find('OUT_MERGED_DATA'); if (!out) return 0;
    var head = (out.cells[1] || []).map(function (h) { return String(h == null ? '' : h).trim().toUpperCase(); });
    if (head[38] !== 'TYPE' || head[70] !== 'PACKAGING') return 0;   // not the layout this was written for
    var n = 0, list = rowsOnly || null;
    var one = function (i) {
      var row = out.cells[i]; if (!row || String(row[0] == null ? '' : row[0]).trim() === '') return;
      var was = String(row[38] == null ? '' : row[38]), t = syncOnly ? was.trim().toUpperCase() : refineType(row);
      if (!syncOnly && t !== was) { row[38] = t; n++; }
      if (t && String(row[70] == null ? '' : row[70]) !== t) row[70] = t;
    };
    if (list) list.forEach(function (r) { if (r >= 3) one(r - 1); }); else for (var i = 2; i < out.cells.length; i++) one(i);
    return n;
  }
  // ------------------------------------------------ v1.6.0 SIZE (AL, index 37) gaps and BR itemsize (index 69)
  var SZ_UNIT = { KG: 'KG', G: 'G', GM: 'G', GMS: 'G', GRAM: 'G', GRAMS: 'G', ML: 'ML', MLS: 'ML', L: 'LTR', LT: 'LTR', LTR: 'LTR', LITRE: 'LTR', LITRES: 'LTR', LITER: 'LTR', OZ: 'OZ', LB: 'LB', LBS: 'LB' };
  var DOSE_UNIT = { MG: 'MG', MCG: 'MCG', IU: 'IU' };
  var CT_UNIT = { C: 'C', CA: 'C', CAP: 'C', CAPS: 'C', CAPSULE: 'C', CAPSULES: 'C', VC: 'VC', VCAP: 'VC', VCAPS: 'VC', VEGIECAP: 'VC', VEGIECAPS: 'VC', VEGECAPS: 'VC', VEGCAPS: 'VC',
    T: 'T', TAB: 'T', TABS: 'T', TABLET: 'T', TABLETS: 'T', TB: 'T', S: 'S', SG: 'SG', SOFTGEL: 'SG', SOFTGELS: 'SG', CHEW: 'CHEW', CHEWS: 'CHEW', CHEWABLE: 'CHEW', CHEWABLES: 'CHEW',
    GUMMY: 'GUMMIES', GUMMIES: 'GUMMIES', LOZ: 'LOZ', LOZENGE: 'LOZ', LOZENGES: 'LOZ', PK: 'PK', PACK: 'PK', PC: 'PC', PCS: 'PC', PIECE: 'PC', PIECES: 'PC',
    SACH: 'SACHET', SACHS: 'SACHET', SACHET: 'SACHET', SACHETS: 'SACHET', BAG: 'BAG', BAGS: 'BAG', TEABAG: 'TB', TEABAGS: 'TB', SERVE: 'SERVE', SERVES: 'SERVE', PADS: 'PADS', PAD: 'PADS' };
  var SZ_OK = /^\d+(\.\d+)?(KG|G|ML|LTR|OZ|LB|MG|MCG|IU|C|VC|T|S|SG|CHEW|GUMMIES|LOZ|PK|PC|SACHET|BAG|TB|SERVE|PADS)$|^\d+X\d+(\.\d+)?(KG|G|ML|LTR)$|^\d+XSACHET$/;   // v1.7.0 LTR
  var LITRE_RE = /\b(\d+(?:\.\d+)?)\s?(?:L|LT|LTR|LITRES?|LITER)\b/g;                          // v1.7.0: 1L, 1LT, 1 LITRE → 1LTR
  function litres(t) { return String(t == null ? '' : t).replace(LITRE_RE, '$1LTR'); }
  function sizeFrom(text) {
    var t = up(text).replace(SELL_THRU, ' ').replace(/\d+(\.\d+)?\s*%/g, ' ').replace(/[(),]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!t) return '';
    var m;
    if ((m = t.match(/\b(\d{1,3})\s*X\s*(\d+(?:\.\d+)?)\s*(KG|G|GM|ML|MLS|L|LT|LTR)\b/))) return m[1] + 'X' + m[2] + SZ_UNIT[m[3]];           // 20 X 5G, 30X4.5G
    if ((m = t.match(/\b(\d+(?:\.\d+)?)\s*(KG|G|GM|ML|MLS|L|LT|LTR)\s*X\s*(\d{1,3})\b/))) return m[3] + 'X' + m[1] + SZ_UNIT[m[2]];         // 4.5G X 30
    if ((m = t.match(/\b(\d{1,3})\s*X\s*(?:SACH\w*)\b/))) return m[1] + 'XSACHET';                                                       // 30 X SACH
    var re = /\b(\d+(?:\.\d+)?)\s*([A-Z]+)\b/g, best = null, rank = 9;
    while ((m = re.exec(t))) {
      var u = m[2], r = SZ_UNIT[u] ? 1 : CT_UNIT[u] ? 2 : DOSE_UNIT[u] ? 3 : 0;
      if (!r || r >= rank) continue;                                                      // weight / volume beats a count beats a dose; first of a kind wins
      if (r === 2 && (u === 'S' || u === 'T' || u === 'C') && Number(m[1]) > 1000) continue;
      best = m[1] + (SZ_UNIT[u] || CT_UNIT[u] || DOSE_UNIT[u]); rank = r;
    }
    return best || '';
  }
  // After stage 2 / Refresh (and an OUT edit, syncOnly): AL filled from Q (SUP PRODUCT), then P (POS DESCR), then O, when it is
  // empty or not a size; BR itemsize = AL for every row that is not DISCONTINUED (POS keeps a discontinued product's).
  function refineSizes(rowsOnly, syncOnly) {
    var out = shim && shim.ss._find('OUT_MERGED_DATA'); if (!out) return 0;
    var head = (out.cells[1] || []).map(function (h) { return String(h == null ? '' : h).trim().toUpperCase(); });
    if (head[37] !== 'SIZE' || head[69] !== 'ITEMSIZE') return 0;
    var n = 0, list = rowsOnly || null;
    var one = function (i) {
      var row = out.cells[i]; if (!row || String(row[0] == null ? '' : row[0]).trim() === '') return;
      var was = up(row[37]), t = was;
      if (/^\d+(\.\d+)?(X\d+(\.\d+)?)?(L|LT|LITRES?)$/.test(was)) { t = litres(was); if (t !== was) { row[37] = t; was = t; n++; } }   // v1.7.0: 1LT → 1LTR
      if (!syncOnly && !SZ_OK.test(was)) { t = sizeFrom(row[16]) || sizeFrom(row[15]) || sizeFrom(row[14]); if (t !== was) { row[37] = t; n++; } }
      if (/DISCONTINUED/.test(up(row[1]))) return;
      if (t && String(row[69] == null ? '' : row[69]) !== t) row[69] = t;
    };
    if (list) list.forEach(function (r) { if (r >= 3) one(r - 1); }); else for (var i = 2; i < out.cells.length; i++) one(i);
    return n;
  }
  // v1.7.0 — forms written one way in POS DESCR (P, index 15; stage 3 reads P): litres as LTR (1L / 1LT / 1 LITRE → 1LTR) and a
  // POWDER product (AM) carries PWD — ORAL becomes PWD, else PWD goes in before the size when the 35 characters allow; a
  // powder that cannot fit PWD is listed by the upload checks. Not for discontinued or ZZZZ rows. AP / AQ (descr, pos desc) follow.
  function pwdFits(p) { return p.length + 4 <= DESCR_MAX; }
  function addPwd(p) {
    if (/\bPWD\b/.test(p)) return p;
    if (/\bORAL\b/.test(p)) return p.replace(/\bORAL\b/, 'PWD').replace(/\s+/g, ' ').trim();
    if (/\bPOWDER\b/.test(p)) return p.replace(/\bPOWDER\b/, 'PWD');
    if (!pwdFits(p)) return p;
    var w = p.split(' '), at = w.length;
    for (var i = w.length - 1; i > 0; i--) if (SZ_OK.test(w[i]) || /^\d+(\.\d+)?(X\d+(\.\d+)?)?[A-Z]+$/.test(w[i])) { at = i; }
    w.splice(at, 0, 'PWD'); return w.join(' ');
  }
  function refineForms(rowsOnly) {
    var out = shim && shim.ss._find('OUT_MERGED_DATA'); if (!out) return 0;
    var head = (out.cells[1] || []).map(function (h) { return String(h == null ? '' : h).trim().toUpperCase(); });
    if (head[15] !== 'POS DESCR' || head[38] !== 'TYPE') return 0;
    var n = 0, one = function (i) {
      var row = out.cells[i]; if (!row || String(row[0] == null ? '' : row[0]).trim() === '' || /DISCONTINUED/.test(up(row[1]))) return;
      var p = up(row[15]); if (!p || /^Z{3,}/.test(p)) return;
      var star = /\*$/.test(p); if (star) p = p.replace(/\s*\*+$/, '').trim();
      var t = litres(p);
      if (t.length > DESCR_MAX && t !== p) { var t1 = t.replace(/(\d)LTR\b/g, '$1LT'); t = t1.length <= DESCR_MAX ? t1 : t.replace(/(\d)LTR\b/g, '$1L'); }   // no room for LTR: 10LT, else 10L
      if (up(row[38]) === 'POWDER') t = addPwd(t);
      if (star) t = markStar(t);
      if (t !== up(row[15])) { row[15] = t; row[45] = t; row[46] = posDescOf(t); n++; }
    };
    if (rowsOnly) rowsOnly.forEach(function (r) { if (r >= 3) one(r - 1); }); else for (var i = 2; i < out.cells.length; i++) one(i);
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
  // ------------------------------------------------ v1.5.0 upload checks on OUT_POS_INSERT / OUT_POS_UPDATE
  /* After the keep / discontinue filter, every POS row is checked before it goes to the TXT files. Three levels:
   *   hold  — the row would damage POS (RRP below WSP, a last price under half the WSP, a bad barcode, a new product POS
   *           already has): the page unticks its Upload tick, so it stays out of the TXT until Kenneth ticks it.
   *   check — plausibly right, worth a look (price moved more than 40 %, brand / Sub ID / size differ from POS, a
   *           discontinued product with stock on hand or a price change): stays in the TXT, amber on the tab.
   *   fixed — the row was changed here and says so (box / display WSP divided by the pack count, SELL text or a
   *           repeated word taken out of the description, a ZZZZ brand / descr made consistent).
   * The result goes back with the run as info.checks = { OUT_POS_INSERT: { sheetRow: { level, notes, fix } }, … }.
   * Row fields: 1 barcode / PLU, 2 sub id, 3 brand, 4 descr, 5 pos desc, 8 supplier, 12 wsp, 13 last, 15 rrp, 30 soh. */
  var SIZE_RE = /(\d+(?:\.\d+)?)\s*(KG|G|GM|GRAMS?|ML|LTR|LT|L|MG|MCG)\b/g, COUNT_RE = /\b(\d{1,4})\s*(T|TABS?|TABLETS?|C|CAPS?|CAPSULES?|VC|S|SG|SOFTGELS?|LOZ|SACH\w*|PK|PACK|PADS?|TEABAGS?|TB)\b/g;
  function num(v) { var t = String(v == null ? '' : v).replace(/[$,%\s]/g, ''); return t !== '' && isFinite(Number(t)) ? Number(t) : 0; }
  function money(n) { return (Math.round(n * 100) / 100).toFixed(2); }
  function pct(a, b) { return b > 0 ? Math.abs(a - b) / b : 0; }
  function gs1Ok(d) {                                         // EAN-8 / UPC-A / EAN-13 / GTIN-14 check digit
    var s = 0; for (var i = 0; i < d.length - 1; i++) s += Number(d.charAt(d.length - 2 - i)) * (i % 2 === 0 ? 3 : 1);
    return (10 - (s % 10)) % 10 === Number(d.charAt(d.length - 1));
  }
  function up(v) { return String(v == null ? '' : v).toUpperCase().replace(/\s+/g, ' ').trim(); }
  function stripZ(v) { return up(v).replace(/^(?:Z{2,}\s*)+/, '').trim(); }
  function uniq(a) { var o = [], m = {}; a.forEach(function (x) { if (!m[x]) { m[x] = 1; o.push(x); } }); return o; }
  function sizeKey(text) { var m, t = up(text).replace(/\bGM\b|\bGRAMS?\b/g, 'G').replace(/\d+\s*%/g, ' '), out = []; SIZE_RE.lastIndex = 0; while ((m = SIZE_RE.exec(t))) out.push(Number(m[1]) + (m[2] === 'LT' || m[2] === 'LTR' ? 'L' : m[2] === 'GM' ? 'G' : m[2])); return uniq(out); }
  function countKey(text) { var m, t = up(text), out = []; COUNT_RE.lastIndex = 0; while ((m = COUNT_RE.exec(t))) out.push(m[1]); return uniq(out); }   // the number only: 60C, 60VC and 60SG are one pack
  function shares(a, b) { return a.some(function (x) { return b.indexOf(x) >= 0; }); }
  // The pack count in a box / display description: "7G X 20 DISPLAY", "35G 12", "12 X 35G", "20 PK", "X 20 DISPLAY".
  function packCount(descr) {
    var t = up(descr), m;
    if ((m = t.match(/\b(\d+(?:\.\d+)?)\s*(?:G|GM|ML|KG|L|LT|MG)\s*X\s*(\d{1,3})\b/))) return Number(m[2]);
    if ((m = t.match(/\b(\d{1,3})\s*X\s*\d+(?:\.\d+)?\s*(?:G|GM|ML|KG|L|LT|MG)\b/))) return Number(m[1]);
    if ((m = t.match(/\bX\s*(\d{1,3})\s*(?:DISPLAY|DISP|PK|PACK|BOX|CTN|CARTON|TRAY)\b/))) return Number(m[1]);
    if ((m = t.match(/\b(\d{1,3})\s*(?:DISPLAY|DISP|CTN|CARTON|TRAY|BOX)\b/))) return Number(m[1]);
    if ((m = t.match(/\b\d+(?:\.\d+)?\s*(?:G|GM|ML|KG|L|LT)\s+(\d{1,3})$/))) return Number(m[1]);   // "35G 12"
    return 0;
  }
  // Description clean-up: "SELL" left from SELL THROUGH, a word repeated straight after itself (210G 210G, CREAT CREAT), the
  // brand prefix repeated later (CABOT DR CABOT …) and 210GM 210G. Returns '' when nothing changed.
  var DOUBLED = { PAW: 1, YLANG: 1, AGAR: 1, BYE: 1, CHA: 1, BON: 1, PIRI: 1, TUK: 1, MAHI: 1, COUS: 1, GOJI: 0, NIGHT: 0 };   // real doubled words (PAW PAW)
  function cleanDescr(descr) {
    var s = up(descr); if (!s) return '';
    var t = s.replace(/\bSELL\s*(?:THROUGH|THRU)\b/g, ' ').replace(/\bSELLTHRU\b/g, ' ').replace(/\bSELL\b/g, ' ').replace(/\s+/g, ' ').trim();
    var w = t.split(' '), out = [], norm = function (x) { return x.replace(/^(\d+(?:\.\d+)?)GM$/, '$1G'); };
    for (var i = 0; i < w.length; i++) {
      if (i > 0 && w[i].length > 1 && !DOUBLED[w[i]] && norm(w[i]) === norm(w[i - 1])) continue;   // 210G 210G, K2 K2, CREAT CREAT (not MP T T …, PAW PAW)
      if (i > 1 && i <= 3 && w[i] === w[0] && w[0].length >= 5 && !/^\d/.test(w[0])) continue;   // CABOT DR CABOT …, PRANA SPORT PRANA … (not PROT SUPP … PROT)
      out.push(w[i]);
    }
    t = out.join(' ');
    return t !== s ? t : '';
  }
  // MELROSE ORGANIC / MELROSE, ENDURA SPORT / ENDURA, BOOKS CABOT HEALTH / CABOT HEALTH: the same brand family, not a wrong match.
  function sameFamily(a, b) { var wa = a.split(' ')[0], wb = b.split(' ')[0]; return wa === wb || a.indexOf(b) >= 0 || b.indexOf(a) >= 0; }
  function posDescOf(descr) { return typeof G.m13PosDesc_ === 'function' ? G.m13PosDesc_(descr) : up(descr); }
  // POS lookups for the checks: by barcode, by supplier + sub id, the live brand names and the prefix words.
  function posIndex(pos) {
    var t = shim.ss._find('TMP_MERGED_POS_DATA'), ix = { bc: {}, sub: {}, brands: {}, words: {} }; if (!t || !pos) return ix;
    var c = pos.col, cB = c['POS MASTER BARCODE'], cM = c['POS MAIN ID'], cS = c['POS SUPPLIER'], cI = c['POS SUB ID'], cBr = c['POS BRAND'], cP = c['POS PLU'];
    for (var r = 2; r < t.cells.length; r++) {
      var row = t.cells[r]; if (!row) continue;
      var plu = pluKey(row[cP]);
      [cB, cM].forEach(function (ci) { if (ci === undefined) return; var k = bcKey(row[ci]); if (k && !ix.bc[k]) ix.bc[k] = plu; });
      if (cS !== undefined && cI !== undefined) { var sk = pluKey(row[cS]) + '|' + up(row[cI]); if (up(row[cI]) && !ix.sub[sk]) ix.sub[sk] = plu; }
      if (cBr !== undefined) { var b = up(row[cBr]); if (b && !/^Z{2,}/.test(b)) ix.brands[b] = 1; }
    }
    var pf = shim.ss._find('SRC_POS_PRODUCT_PREFIX');
    if (pf) for (var q = 2; q < pf.cells.length; q++) { var pr = pf.cells[q]; if (!pr) continue; if (up(pr[0])) ix.brands[up(pr[0])] = 1; if (up(pr[1])) ix.words[up(pr[1])] = 1; }
    ix.renamed = {};                                                                       // SUP BRAND → POS BRAND (Brand Name Changes): an expected brand change
    var bn = shim.ss._find('SRC_POS_BRAND_NAME_CHANGES');
    if (bn) for (var z = 2; z < bn.cells.length; z++) { var br = bn.cells[z]; if (!br) continue; var a = up(br[1]), b = up(br[2]); if (a && b) { ix.renamed[a + '>' + b] = 1; ix.renamed[b + '>' + a] = 1; } }
    return ix;
  }
  // "ZZZZ " + the brand / descr with every ZZZ… marker gone. A ZZ glued to a known brand or prefix word (ZZEAGLE, ZZWELEDA)
  // is a marker too; a real word starting with Z (ZEN, ZINC) is not.
  function zzzzBrand(v, ix) {
    var rest = up(v).replace(/^(?:Z{3,}\s*)+/, '').trim(), m = rest.match(/^ZZ([A-Z].*)$/);
    if (m && (ix.brands[m[1]] || ix.words[m[1].split(' ')[0]])) rest = m[1];
    return rest ? 'ZZZZ ' + rest : '';
  }
  function zzzzDescr(engineDescr, posDescr, ix) {
    var cur = up(engineDescr); if (!/^ZZZZ /.test(cur) || !up(posDescr)) return '';
    var right = up(posDescr).replace(/^(?:Z{3,}\s*)+/, '').trim(), m = right.match(/^ZZ([A-Z]\S*)(.*)$/);
    if (m && (ix.brands[m[1]] || ix.words[m[1]])) right = (m[1] + m[2]).trim();         // ZZWELEDA … → WELEDA …
    var buggy = up(posDescr).replace(/^Z+\s*/, '').replace(/^Z+\s*/, '').trim();          // what the script starts from (every leading Z gone)
    if (buggy === right || cur.indexOf('ZZZZ ' + buggy) !== 0) return '';
    return 'ZZZZ ' + right + cur.slice(('ZZZZ ' + buggy).length);                           // the script's own suffix (60TABS 60T) stays
  }
  function uploadChecks(built, pos, opts) {
    var ix = posIndex(pos), col = pos ? pos.col : {}, keep = {}, out = { OUT_POS_INSERT: {}, OUT_POS_UPDATE: {}, n: { hold: 0, check: 0, fixed: 0, rows: 0 } };
    (opts && opts.keep || []).forEach(function (g) { keep[g] = 1; });
    var P = function (p, name) { var ci = col[name]; return p && ci !== undefined ? p[ci] : ''; };
    var seen = { bc: {}, sub: {} };
    function one(row, sheet, status, i) {
      var notes = [], fix = {}, level = '';
      var hold = function (t) { notes.push({ k: 'hold', t: t }); level = 'hold'; };
      var check = function (t) { notes.push({ k: 'check', t: t }); if (!level) level = 'check'; };
      var fixed = function (t, c, old) { notes.push({ k: 'fixed', t: t }); if (c !== undefined) fix[c] = String(old == null ? '' : old); if (!level) level = 'fixed'; };
      var isNew = sheet === 'OUT_POS_INSERT', disc = status === 'DISCONTINUED';
      var p = !isNew && pos ? pos.map[String(row[1] == null ? '' : row[1]).trim()] : null;
      var wsp = num(row[12]), last = num(row[13]), rrp = num(row[15]);
      // A ZZZZ row: discontinued now, or matched to a product POS already holds as ZZZZ (the supplier still lists it).
      var zRow = /^Z{3,}/i.test(String(row[3] == null ? '' : row[3])) || /^Z{3,}/i.test(String(row[4] == null ? '' : row[4]));
      if (p && (disc || zRow)) {
        var cb = zzzzBrand(row[3], ix), cd = zzzzDescr(row[4], P(p, 'POS DESCR'), ix);
        if (cb && cb !== up(row[3])) { fixed('Brand made ' + cb + ' (was ' + up(row[3]) + ')', 3, row[3]); row[3] = cb; }
        cd = cd || up(row[4]);
        if (/^ZZZZ /.test(cd)) {                                                             // a ZZZZ left inside (ZZZZ PRANA SPORT ZZZZPRANA 40G …), then the usual clean-up
          var inner = cd.slice(5).replace(/(^|\s)Z{3,}\s*(?=[A-Z])/g, '$1').replace(/(^|\s)Z{3,}(?=\s|$)/g, '$1').replace(/\s+/g, ' ').trim();
          inner = cleanDescr(inner) || inner;
          cd = 'ZZZZ ' + inner;
        }
        if (cd && cd !== up(row[4])) { fixed('Descr made ' + cd + ' (was ' + up(row[4]) + ')', 4, row[4]); row[4] = cd; var pdn = posDescOf(cd); if (pdn !== up(row[5])) { fix[5] = row[5]; row[5] = pdn; } }
      }
      if (disc) {
        if (p) {
          var soh = num(P(p, 'POS SOH')); if (soh > 0) check('Still has ' + soh + ' on hand in POS');
          [[12, 'POS WSP EXCGST', 'WSP'], [13, 'POS LAST PRICE', 'last price'], [15, 'POS RRP INCGST', 'RRP']].forEach(function (f) {
            var pv = P(p, f[1]); if (String(pv).trim() !== '' && !sameVal(row[f[0]], pv)) check('Discontinuing changes the ' + f[2] + ' ' + money(num(pv)) + ' → ' + money(num(row[f[0]])) + ' (a discontinued product keeps its POS prices)');
          });
        } else if (pos) check('PLU ' + row[1] + ' is not in the POS Database');
        return finish();
      }
      // Box / display prices: WSP per display, RRP per item (Melrose). Divide by the pack count when that gives a sensible
      // margin (new product) or lands near POS's own WSP (matched); keep it when POS sells the box; otherwise hold.
      var n = packCount(row[4]);
      if (n >= 2 && wsp > 0) {
        var per = wsp / n, posW = p ? num(P(p, 'POS WSP EXCGST')) : 0, divide = false;
        if (posW > 0) { if (pct(per, posW) <= 0.25) divide = true; else if (pct(wsp, posW) > 0.25) hold('Box / display price? WSP ' + money(wsp) + ' for ' + n + ' — POS WSP is ' + money(posW) + ' (÷' + n + ' = ' + money(per) + ')'); }
        else if (rrp > 0 && wsp > rrp) { if (per <= rrp * 0.85 && per >= rrp * 0.25) divide = true; else hold('Box / display price? WSP ' + money(wsp) + ' for ' + n + ' but RRP ' + money(rrp) + ' per item (÷' + n + ' = ' + money(per) + ')'); }
        if (divide && !(keep.ws && !isNew)) {
          fixed('WSP ' + money(wsp) + ' ÷ ' + n + ' = ' + money(per) + ' per item (box / display price)', 12, row[12]); row[12] = money(per); wsp = per;
          if (last > 0 && last > per * 1.5) { fix[13] = row[13]; row[13] = money(last / n); last = last / n; }
        }
      }
      if (wsp > 0 && rrp > 0 && rrp < wsp) hold('RRP ' + money(rrp) + ' is below the WSP ' + money(wsp));
      if (wsp > 0 && last > 0 && last < wsp * 0.5) hold('Last price ' + money(last) + ' is under half the WSP ' + money(wsp));
      if (wsp > 0 && last > 0 && last > wsp * 2) hold('Last price ' + money(last) + ' is more than double the WSP ' + money(wsp));
      else if (wsp > 0 && last > 0 && last > wsp * 1.5) check('Last price ' + money(last) + ' is well above the WSP ' + money(wsp));
      if (isNew) {
        var d = String(row[1] == null ? '' : row[1]).replace(/\D/g, ''), k = bcKey(row[1]);
        if (!d || String(row[1]).replace(/\s/g, '') !== d) hold('Barcode "' + row[1] + '" is not a number');
        else if ([8, 12, 13, 14].indexOf(d.length) < 0) check('Barcode ' + d + ' is ' + d.length + ' digits (not EAN-8 / UPC / EAN-13)');
        else if (!gs1Ok(d)) hold('Barcode ' + d + ' fails its check digit');
        if (k && ix.bc[k]) hold('POS already has this barcode — PLU ' + ix.bc[k]);
        if (k) { if (seen.bc[k]) hold('Barcode is on INSERT row ' + seen.bc[k] + ' too'); else seen.bc[k] = i + 3; }
        var sk = pluKey(row[8]) + '|' + up(row[2]);
        if (up(row[2]) && ix.sub[sk]) hold('POS already has Sub ID ' + up(row[2]) + ' for supplier ' + pluKey(row[8]) + ' — PLU ' + ix.sub[sk]);
      } else if (p) {
        if (!keep.ws) { var pw = num(P(p, 'POS WSP EXCGST')); if (pw > 0 && wsp > 0 && pct(wsp, pw) > 0.4) check('WSP moves ' + (wsp > pw ? 'up' : 'down') + ' ' + Math.round(pct(wsp, pw) * 100) + '% (' + money(pw) + ' → ' + money(wsp) + ')'); }
        if (!keep.rrp) { var pr = num(P(p, 'POS RRP INCGST')); if (pr > 0 && rrp > 0 && pct(rrp, pr) > 0.4) check('RRP moves ' + (rrp > pr ? 'up' : 'down') + ' ' + Math.round(pct(rrp, pr) * 100) + '% (' + money(pr) + ' → ' + money(rrp) + ')'); }
        // POS keeps 20 characters of a brand; a pair in Brand Name Changes is an expected change (sub-brand → POS brand).
        // v1.6.3: the brand's CURRENT / NEW tick decides (NEW by default — the supplier's brand is the master, OLD BRAND shows
        // what POS had); this note only shows when NEW is ticked and the supplier's brand is a different name (not the family).
        if (!keep.brand) { var pb = stripZ(P(p, 'POS BRAND')), nb = stripZ(row[3]); if (pb && nb && pb.slice(0, 20) !== nb.slice(0, 20) && !ix.renamed[pb + '>' + nb] && !sameFamily(pb, nb)) check('Brand ' + pb + ' → ' + nb + ' (NEW brand is ticked)'); }
      }
      if ((isNew || !keep.product) && !zRow) {
        var cl = cleanDescr(row[4]);
        if (cl) { fixed('Descr "' + up(row[4]) + '" → "' + cl + '"', 4, row[4]); row[4] = cl; var pd2 = posDescOf(cl); if (pd2 !== up(row[5])) { fix[5] = row[5]; row[5] = pd2; } }
      }
      if ((isNew || !keep.product) && !zRow && up(row[29]) === 'POWDER' && !/\bPWD\b|\bPOWDER\b/.test(up(row[4]))) check('Powder without PWD in the description — no room in 35 characters (' + up(row[4]) + ')');   // v1.7.0
      if (p && !keep.product) {                                                            // size / pack after the clean-up: no size in common = look again
        var pd = P(p, 'POS DESCR'), sz = sizeKey(pd), nz = sizeKey(row[4]), ck = countKey(pd), nk = countKey(row[4]);
        if (sz.length && nz.length && !shares(sz, nz)) check('Size ' + sz.join('/') + ' → ' + nz.join('/') + ' (POS: ' + up(pd) + ')');
        else if (ck.length && nk.length && !shares(ck, nk)) check('Pack ' + ck.join('/') + ' → ' + nk.join('/') + ' (POS: ' + up(pd) + ')');
      }
      return finish();
      function finish() {
        if (!notes.length) return null;
        out.n[level]++; out.n.rows++;
        return { level: level, notes: notes, fix: Object.keys(fix).length ? fix : null };
      }
    }
    (built.insertRows || []).forEach(function (row, i) { var r = one(row, 'OUT_POS_INSERT', 'NEW', i); if (r) out.OUT_POS_INSERT[i + 3] = r; });
    (built.updateRows || []).forEach(function (row, i) { var r = one(row, 'OUT_POS_UPDATE', row.__status || 'MATCHED', i); if (r) out.OUT_POS_UPDATE[i + 3] = r; });
    // v1.6.1: one last price on three or more products of a brand whose WSPs differ — a discount percentage typed into
    // SUP DISCOUNT PRICE (15 on every PRANAON row, 440 g to 2.2 kg) rather than a price. Every one of them is held, not
    // only the ones that happen to fall under half the WSP.
    var byBrand = {};
    function gather(rows, sheet) {
      (rows || []).forEach(function (row, i) {
        if ((sheet === 'OUT_POS_UPDATE' && row.__status === 'DISCONTINUED') || /^Z{3,}/i.test(String(row[3] == null ? '' : row[3]))) return;
        var w = num(row[12]), l = num(row[13]); if (!(w > 0 && l > 0)) return;
        var k = up(row[3]) + '|' + money(l); (byBrand[k] = byBrand[k] || []).push({ sheet: sheet, r: i + 3, w: w, l: l });
      });
    }
    gather(built.insertRows, 'OUT_POS_INSERT'); gather(built.updateRows, 'OUT_POS_UPDATE');
    Object.keys(byBrand).forEach(function (k) {
      var g = byBrand[k]; if (g.length < 3) return;
      var lo = Math.min.apply(null, g.map(function (x) { return x.w; })), hi = Math.max.apply(null, g.map(function (x) { return x.w; }));
      if (hi < lo * 1.5) return;
      var t = 'Last price ' + money(g[0].l) + ' is the same on ' + g.length + ' ' + k.split('|')[0] + ' products whose WSP runs ' + money(lo) + ' to ' + money(hi) + ' — a discount percentage typed as the price? (SUP DISCOUNT PRICE, column N)';
      g.forEach(function (x) {
        var cur = out[x.sheet][x.r];
        if (!cur) { cur = out[x.sheet][x.r] = { level: 'hold', notes: [], fix: null }; out.n.hold++; out.n.rows++; }
        else if (cur.level !== 'hold') { out.n[cur.level]--; out.n.hold++; cur.level = 'hold'; }
        if (!cur.notes.some(function (n) { return n.t === t; })) cur.notes.push({ k: 'hold', t: t });
      });
    });
    return out;
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
      var posAll = posByPlu();
      var minFixed = fixMinOrder(built, posAll);                       // v1.3.0: "N/A" min order → 1 / POS's
      if (!runOpts) { runInfo = minFixed ? { kept: 0, same: 0, disc: 0, notFound: 0, stock: 0, minOrder: minFixed } : null; return built; }
      var keep = (runOpts.keep || []).filter(function (g) { return KEEP_COLS[g]; }), noDisc = runOpts.discontinue === false, pos = keep.length ? posAll : null;
      var info = { kept: 0, same: 0, disc: 0, notFound: 0, stock: 0, minOrder: minFixed };
      // v1.3.0: SUP STOCK IN (M) → a new product's stock on hand (pos soh, the last INSERT field).
      if (keep.indexOf('size') >= 0) (built.insertRows || []).forEach(function (row) { row[28] = '0'; });   // v1.6.0: item size unticked → a new product gets none
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
      if (runOpts.checks !== false) { try { info.checks = uploadChecks(built, posAll, runOpts); } catch (e) { info.checksError = String(e && e.message ? e.message : e); } }   // v1.5.0
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
        runOpts = step === 'generate'                                  // v1.5.0: always on for generate (the upload checks run every time)
          ? { visible: msg.visible || null, keep: msg.keep || [], discontinue: msg.discontinue !== false, stock: !!msg.stock, checks: msg.checks !== false } : null;
        if (step === 'generate' && msg.visible) fnName = 'generateInsertUpdateSheetsFromFilteredData';
        var ret;
        try { ret = step === 'export' && msg.only ? withOnlyRows(msg.only, function () { return G[fnName](); }) : G[fnName](); }
        finally { runOpts = null; }
        if (step === 'build' || step === 'refresh') { refineTypes(); refineSizes(); refineForms(); noteSellThru(); }   // v1.3.0 / v1.4.0 / v1.6.0 / v1.7.0 (forms before the sell-through "*")
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
