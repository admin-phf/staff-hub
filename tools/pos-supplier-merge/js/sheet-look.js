/* PHF Staff Hub — POS Supplier New Product Check and Clean Merge · sheet-look.js v1.0.0 (11 Oct 2026)
 * The POS DB & SUPPLIER MERGE Google Sheet's look for the web workbook tabs and the review workbook, taken from the
 * script itself (1.0 Setup): the row-1 totals band (SCHEMA totals formulas — SUBTOTAL ones count the rows a filter
 * leaves showing, SUM / COUNTIF / UNIQUE ones count every row, as in the Sheet), the conditional-format colours on
 * OUT_MERGED_DATA (ensureOutMergedConditionalFormatting_), the centred columns (SCHEMA centreDataCols), number formats
 * the Sheet shows on SRC_POS_ONGOING_DISCOUNTS, and the grey text of TMP_MERGED_POS_DATA.
 *
 *   var look = PHFSheetLook.forSheet(sheetName, head)   // head = the row-2 headings
 *   look.totals(allRows, visibleRows) → { colIndex: 'CURRENT WSP: $9,453.26', … }
 *   look.style(row, colIndex)        → { bg: 'fce8e6', fg: 'd93025', b: true } | null
 *   look.centre[colIndex], look.readOnly[colIndex], look.grey, look.twoLine, look.display(value, colIndex)
 */
(function (G) {
  'use strict';

  // 1.0 Setup → LEGEND and the CF palette of ensureOutMergedConditionalFormatting_
  var C = {
    TITLE_BG: '1e3a5f', TITLE_FG: 'ffd966', HDR_BG: 'e9f0f5', HDR_FG: '2c3e50', DATA_FG: '1c2833', ALT_ODD: 'f5f5f5', ALT_EVEN: 'e9f0f5',
    STATUS_FG: '9aa0a6',
    UP_BG: 'fce8e6', UP_FG: 'd93025', DOWN_BG: 'e8f0fe', DOWN_FG: '1a73e8', WARN_BG: 'fef3e2', WARN_FG: 'e37400',
    NEW_BG: 'e6f4ea', NEW_FG: '0f9d58', REVIEW_BG: 'f3e8fd', REVIEW_FG: '9334e6', MATCH_FG: '1565c0', FLAT_FG: '9e9e9e'
  };
  var S = {
    up: { bg: C.UP_BG, fg: C.UP_FG, b: true }, down: { bg: C.DOWN_BG, fg: C.DOWN_FG, b: true }, warn: { bg: C.WARN_BG, fg: C.WARN_FG, b: true },
    ok: { bg: C.NEW_BG, fg: C.NEW_FG, b: true }, review: { bg: C.REVIEW_BG, fg: C.REVIEW_FG, b: true }, match: { fg: C.MATCH_FG, b: true },
    flat: { fg: C.FLAT_FG }
  };

  function str(v) { return v == null ? '' : String(v); }
  function up(v) { return str(v).toUpperCase(); }
  // VALUE(REGEXREPLACE(TO_TEXT(x),"[^0-9.-]","")) — the number in a displayed cell ($1,234.50 → 1234.5, 18.71% → 18.71)
  function num(v) { var n = parseFloat(str(v).replace(/[^0-9.\-]/g, '')); return isFinite(n) ? n : 0; }
  function money(n) { var s = Math.abs(n).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); return (n < 0 ? '-$' : '$') + s; }
  function plain2(n) { return Number(n || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function int(n) { return Number(n || 0).toLocaleString('en-AU'); }
  function letterIndex(l) { var n = 0; for (var i = 0; i < l.length; i++) n = n * 26 + (l.charCodeAt(i) - 64); return n - 1; }

  // ---------------------------------------------------------------- totals helpers
  function nonBlank(rows, c) { var n = 0; for (var i = 0; i < rows.length; i++) if (str(rows[i][c]).trim() !== '') n++; return n; }
  function uniq(rows, c) { var s = {}, n = 0; for (var i = 0; i < rows.length; i++) { var v = str(rows[i][c]).trim(); if (v && !s[v]) { s[v] = 1; n++; } } return n; }
  function sum(rows, c, positiveOnly) { var t = 0; for (var i = 0; i < rows.length; i++) { var v = num(rows[i][c]); if (!positiveOnly || v > 0) t += v; } return t; }
  function countIf(rows, c, test) { var n = 0; for (var i = 0; i < rows.length; i++) if (test(up(rows[i][c]).trim())) n++; return n; }
  function used(rows, c) { return 'USED: ' + int(countIf(rows, c, function (s) { return s === 'USED'; })) + '  |  UNUSED: ' + int(countIf(rows, c, function (s) { return s === ''; })); }

  // SCHEMA totals, column by heading. `all` = every row (SUM / COUNTIF / UNIQUE), `vis` = rows left by a filter (SUBTOTAL).
  var TOTALS = {
    'OUT_MERGED_DATA': function (H, all, vis) {
      var o = {};
      var B = H('ROW STATUS'), Cc = H('PRICE STATUS'), Q = H('SUP PRODUCT'), AF = H('NOTES');
      o[H('INDEX')] = 'TOTAL ROWS: ' + int(nonBlank(vis, B));
      o[B] = 'NEW: ' + int(countIf(all, B, function (s) { return s.indexOf('NEW') >= 0; })) + '  |  MATCHED: ' + int(countIf(all, B, function (s) { return s.indexOf('MATCHED') >= 0; })) + '  |  DISC: ' + int(countIf(all, B, function (s) { return s.indexOf('DISCONTINUED') >= 0; }));
      o[Cc] = 'UP: ' + int(countIf(all, Cc, function (s) { return s === 'PRICE INCREASE'; })) + '  |  DOWN: ' + int(countIf(all, Cc, function (s) { return s === 'PRICE DECREASE'; })) + '  |  NEW: ' + int(countIf(all, Cc, function (s) { return s === 'NEW PRODUCT'; })) + '  |  FLAT: ' + int(countIf(all, Cc, function (s) { return s === 'NO CHANGE'; }));
      o[H('POS SUPPLIER')] = 'POS SUPPLIERS: ' + int(uniq(all, H('POS SUPPLIER')));
      o[H('UPDATED SUPPLIER')] = 'UPDATED SUPPLIERS: ' + int(uniq(all, H('UPDATED SUPPLIER')));
      o[H('POS BRAND')] = 'POS BRANDS: ' + int(uniq(all, H('POS BRAND')));
      o[H('SUP BRAND')] = 'SUP BRANDS: ' + int(uniq(all, H('SUP BRAND')));
      o[H('OLD BRAND')] = 'BRAND CHANGES: ' + int(nonBlank(all, H('OLD BRAND')));
      o[H('BARCODE UPDATE')] = 'BARCODES TO UPDATE: ' + int(nonBlank(all, H('BARCODE UPDATE')));
      o[H('ORIGINAL POS DESCR')] = 'TOTAL POS PRODUCTS: ' + int(nonBlank(vis, H('ORIGINAL POS DESCR')));
      o[H('POS DESCR')] = 'TOTAL SUP PRODUCTS: ' + int(nonBlank(vis, Q));
      o[H('CURRENT WSP EXGST')] = 'CURRENT WSP: ' + money(sum(all, H('CURRENT WSP EXGST')));
      o[H('NEW WSP EXGST')] = 'NEW WSP: ' + money(sum(all, H('NEW WSP EXGST')));
      o[H('CURRENT LAST PRICE')] = 'CURRENT LAST PRICE: ' + money(sum(all, H('CURRENT LAST PRICE')));
      o[H('NEW LAST PRICE')] = 'NEW LAST PRICE: ' + money(sum(all, H('NEW LAST PRICE')));
      o[H('CURRENT RRP')] = 'CURRENT RRP: ' + money(sum(all, H('CURRENT RRP')));
      o[H('NEW RRP')] = 'NEW RRP: ' + money(sum(all, H('NEW RRP')));
      var types = {}, nt = 0, nd = 0;
      for (var i = 0; i < all.length; i++) {
        var note = str(all[i][AF]);
        if (/% \//.test(note)) { nd++; var m = note.match(/^[A-Z +()]+/); if (m && !types[m[0]]) { types[m[0]] = 1; nt++; } }
      }
      o[H('WSP TO RRP MARKUP %')] = 'DISCOUNT TYPES: ' + int(nt);
      o[H('WSP TO RRP MARKUP +6.5%')] = 'DISCOUNTED ROWS: ' + int(nd);
      o[H('RRP / MARKUP OVERRIDE')] = 'OVERRIDES: ' + int(nonBlank(all, H('RRP / MARKUP OVERRIDE')));
      o[H('FINAL SHELF RRP')] = 'FINAL SHELF RRP: ' + money(sum(all, H('rrp incgst')));
      o[H('wsp excgst')] = 'TOTAL WS: $' + plain2(sum(all, H('wsp excgst')));
      o[H('last price')] = 'TOTAL LAST PRICE: $' + plain2(sum(all, H('last price')));
      o[H('rrp incgst')] = 'TOTAL RRP: $' + plain2(sum(all, H('rrp incgst')));
      return o;
    },
    'OUT_POS_INSERT': posTotals, 'OUT_POS_UPDATE': posTotals,
    'SRC_POS_FIND_REPLACE': function (H, all, vis) {
      var o = {}; o[0] = 'TOTAL ROWS: ' + int(nonBlank(vis, 1)); o[1] = 'TOTAL SUP FIND: ' + int(nonBlank(vis, 1)); o[2] = 'TOTAL POS REPLACE: ' + int(nonBlank(vis, 2)); o[3] = used(all, 3); return o;
    },
    'SRC_POS_ONGOING_DISCOUNTS': function (H, all, vis) {
      var o = {}; o[0] = 'TOTAL ROWS: ' + int(vis.length); o[1] = 'BRANDS: ' + int(uniq(vis, 1)); o[3] = 'SUPPLIERS: ' + int(uniq(vis, 3)); return o;
    },
    'SRC_POS_BRAND_NAME_CHANGES': function (H, all, vis) {
      var o = {}; o[0] = 'TOTAL ROWS: ' + int(nonBlank(vis, 1)); o[1] = 'TOTAL SUP BRANDS: ' + int(uniq(vis, 1)); o[2] = 'TOTAL POS BRANDS: ' + int(uniq(vis, 2)); o[3] = used(all, 3); return o;
    },
    'SRC_POS_PRODUCT_PREFIX': function (H, all, vis) {
      var o = {}; o[0] = 'TOTAL ROWS: ' + int(nonBlank(vis, 1)); o[1] = 'UNIQUE BRANDS: ' + int(uniq(vis, 1)); o[2] = 'UNIQUE PREFIXES: ' + int(uniq(vis, 2)); o[4] = used(all, 4); return o;
    },
    'SRC_POS_SUPPLIERS': function (H, all, vis) {
      var o = {}; o[0] = 'TOTAL ROWS: ' + int(nonBlank(vis, 1)); o[1] = 'POS ACCOUNT NUMBER: ' + int(uniq(vis, 1)); o[2] = 'POS ACCOUNTS NAME: ' + int(uniq(vis, 2)); o[3] = used(all, 3); return o;
    },
    'TMP_MERGED_POS_DATA': function (H, all, vis) {
      var o = {}, soh = H('POS SOH'), wsp = H('POS WSP EXCGST'), last = H('POS LAST PRICE');
      var val = function (c) { var t = 0; for (var i = 0; i < vis.length; i++) { var q = num(vis[i][soh]); if (q > 0) t += num(vis[i][c]) * q; } return t; };
      o[0] = 'TOTAL ROWS: ' + int(nonBlank(vis, 1)); o[1] = 'UNIQUE MASTER BRANDS: ' + int(uniq(vis, 1)); o[H('POS BRAND')] = 'UNIQUE MAPPED BRANDS: ' + int(uniq(vis, H('POS BRAND')));
      o[H('POS DESCR')] = 'TOTAL PRODUCTS: ' + int(nonBlank(vis, H('POS DESCR'))); o[H('POS SUPPLIER')] = 'UNIQUE SUPPLIERS: ' + int(uniq(vis, H('POS SUPPLIER')));
      o[wsp] = 'TOTAL VALUATION: ' + money(val(wsp)); o[last] = 'TOTAL LAST PRICE: ' + money(val(last));
      return o;
    }
  };
  function posTotals(H, all, vis) {
    var o = {};
    o[0] = 'TOTAL ROWS: ' + int(nonBlank(vis, 1)); o[3] = 'UNIQUE BRANDS: ' + int(uniq(vis, 3)); o[4] = 'TOTAL PRODUCTS: ' + int(nonBlank(vis, 4)); o[8] = 'SUPPLIERS: ' + int(uniq(vis, 8));
    o[12] = 'TOTAL WS: $' + plain2(sum(vis, 12, true)); o[13] = 'TOTAL LAST PRICE: $' + plain2(sum(vis, 13, true));
    return o;
  }

  // ---------------------------------------------------- OUT_MERGED_DATA conditional formats
  function outStyle(H) {
    var B = H('ROW STATUS'), Cc = H('PRICE STATUS'), G_ = H('UPDATED SUPPLIER'), J = H('OLD BRAND'), L = H('BARCODE UPDATE'), N = H('POS SUB ID');
    var R = H('CURRENT WSP EXGST'), Sx = H('NEW WSP EXGST'), T = H('WSP CHANGE %'), U = H('WSP CHANGE $'), V = H('CURRENT LAST PRICE'), W = H('NEW LAST PRICE');
    var X = H('CHANGE LAST PRICE %'), Y = H('CHANGE LAST PRICE $'), Z = H('CURRENT RRP'), AA = H('NEW RRP'), AD = H('WSP TO RRP MARKUP %'), AE = H('WSP TO RRP MARKUP +6.5%');
    var AF = H('NOTES'), AN = H('RRP / MARKUP OVERRIDE'), AO = H('FINAL SHELF RRP'), AX = H('supplier'), BE = H('rrp incgst');
    var audit = {}; [H('BC'), H('SUB ID'), H('BRAND'), H('WSP')].forEach(function (c) { if (c >= 0) audit[c] = 1; });
    var gp = /GP NGST ([0-9.]+)%/;
    return function (row, c) {
      var v = row[c], s;
      if (c === B) { s = up(v); return /NEW/.test(s) ? S.ok : /DISCONTINUED/.test(s) ? S.warn : /REVIEW/.test(s) ? S.review : /MATCHED/.test(s) ? S.match : null; }
      if (c === Cc) {
        s = up(v);
        return /SUP OVERRIDE PENDING/.test(s) ? S.warn : /SUP OVERRIDE ACCEPTED/.test(s) ? S.ok : /SUP OVERRIDE REJECTED/.test(s) ? S.up : /INCREASE/.test(s) ? S.up : /DECREASE/.test(s) ? S.down
          : /NEW/.test(s) ? S.ok : /DISCONTINUED/.test(s) ? S.warn : /REVIEW/.test(s) ? S.review : /NO CHANGE/.test(s) ? S.flat : null;
      }
      var notNew = up(row[B]).indexOf('NEW PRODUCT') < 0;
      if (c === R || c === Sx || c === V || c === W) return notNew ? S.flat : null;
      if (c === T || c === U || c === X || c === Y) {
        if (!notNew) return null;
        var pc = (c === T || c === U) ? T : X, dc = (c === T || c === U) ? U : Y;
        var meaningful = Math.abs(num(row[pc])) >= 0.5 && Math.abs(num(row[dc])) >= 0.02;
        if (!meaningful) return S.flat;
        var n = num(row[c]);
        return n > 0 ? S.up : n < 0 ? S.down : null;
      }
      if (c === Z || c === AA) {
        var z = num(row[Z]), a = num(row[AA]);
        if (str(row[Z]) + str(row[AA]) !== '' && Math.abs(a - z) < 0.005) return S.flat;
        if (c === Z) return z > a ? S.ok : null;
        return a > z ? S.ok : null;
      }
      if (c === AN) return str(v) !== '' ? S.warn : null;
      if (c === AO) {
        var cur = num(row[Z]), fin = num(row[BE]);
        if (!(cur > 0)) return null;
        return fin > cur + 0.004 ? S.up : fin < cur - 0.004 ? S.down : Math.abs(fin - cur) < 0.005 ? S.flat : null;
      }
      if (c === AD || c === AE) { var m = str(v).match(gp); return m && Number(m[1]) < 35 ? S.warn : null; }
      if (c === J || c === L) return str(v) !== '' ? S.warn : null;
      if (audit[c]) { var ch = str(v).charAt(0); return ch === '☑' ? S.ok : ch === '☒' ? S.up : ch === '☐' ? S.flat : null; }
      if (c === G_ || c === N) {
        var cs = up(row[Cc]);
        if (/SUP OVERRIDE PENDING|SUP OVERRIDE ACCEPTED/.test(cs)) return S.warn;
        var g = str(row[G_]).trim(), ax = str(row[AX]).trim();
        if (g && ax && !/SUP OVERRIDE REJECTED|SUPPLIER OVERRIDE REJECTED|SUPPLIER CHANGE REJECTED/.test(cs + ' ' + up(row[AF]))) {
          var mm = g.match(/\(([^)]+)\)\s*$/), num_ = mm ? mm[1] : g.replace(/[^0-9]/g, '');
          if (num_ !== ax) return S.warn;
        }
        return null;
      }
      return null;
    };
  }
  function statusStyle(c) {
    return function (row, cc) {
      if (cc !== c) return null;
      var s = up(row[cc]).trim();
      if (!s) return null;
      return s === 'USED' || /APPLIED|USED BY/.test(s) ? S.match : /NOT USED|UNUSED/.test(s) ? S.flat : S.warn;
    };
  }

  // SCHEMA centreDataCols (1-based in the Sheet) and the columns the merge writes itself.
  var CENTRE = {
    'OUT_MERGED_DATA': [1, 2, 3, 4, 5, 20, 21, 24, 25, 28, 33, 34, 35, 36, 37, 38, 39, 40, 51, 52, 53, 56, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72],
    'SRC_POS_ONGOING_DISCOUNTS': [8, 9, 10, 11],
    'TMP_MERGED_POS_DATA': [1]
  };
  var READ_ONLY_HEADS = { 'INDEX': 1, 'POS INDEX': 1, 'SRC STATUS': 1, 'POS MATCH': 1, 'FINAL SHELF RRP': 1, 'rrp incgst': 1 };

  function forSheet(sheet, head) {
    head = (head || []).map(str);
    var idx = {}; head.forEach(function (h, i) { if (idx[h] === undefined) idx[h] = i; });
    var H = function (name) { return idx[name] === undefined ? -1 : idx[name]; };
    var centre = {}; (CENTRE[sheet] || []).forEach(function (n) { centre[n - 1] = 1; });
    var readOnly = {}; head.forEach(function (h, i) { if (READ_ONLY_HEADS[h]) readOnly[i] = 1; });
    var style = sheet === 'OUT_MERGED_DATA' ? outStyle(H)
      : /^SRC_/.test(sheet) ? statusStyle(H(sheet === 'SRC_POS_ONGOING_DISCOUNTS' ? 'POS MATCH' : 'SRC STATUS')) : null;
    var tot = TOTALS[sheet];
    var disc = sheet === 'SRC_POS_ONGOING_DISCOUNTS', pct = H('POS DISCOUNT%'), mk = H('POS MARKUP%');
    return {
      sheet: sheet, head: head, H: H, centre: centre, readOnly: readOnly, style: style,
      grey: sheet === 'TMP_MERGED_POS_DATA',
      twoLine: sheet === 'OUT_MERGED_DATA',
      totals: function (all, vis) { if (!tot) return {}; var o = tot(H, all || [], vis || all || []); delete o[-1]; return o; },
      // How the Sheet shows a raw input value (SRC_POS_ONGOING_DISCOUNTS H as 0.00%, I as 0.###).
      display: function (v, c) {
        if (!disc || v === '' || v == null) return v;
        if (c === pct) { var n = typeof v === 'number' ? v : Number(String(v).replace(/[%,\s]/g, '')); if (!isFinite(n) || String(v).trim() === '') return v; if (typeof v !== 'number' && /%/.test(String(v))) return String(v); if (n > 1) n = n / 100; return (n * 100).toFixed(2) + '%'; }
        if (c === mk && typeof v === 'number') return String(Math.round(v * 1000) / 1000);
        return v;
      }
    };
  }

  G.PHFSheetLook = { VERSION: 'v1.0.0', COLORS: C, forSheet: forSheet, num: num, letterIndex: letterIndex };
})(typeof window !== 'undefined' ? window : this);
