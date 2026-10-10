/* PHF Staff Hub — POS Supplier New Product Check and Clean Merge · merge-map v1.0.1 (11 Oct 2026: renamed tools in the input descriptions)
 * merge-map.js — input definitions, file recognition and column mapping.
 * Shared by the page (to check dropped files) and the engine (to build the
 * in-memory workbook). Sheet names, headings and text columns are the ones in
 * the POS Supplier Merge script SCHEMA (1.0 Setup, v6.3.87).
 */
(function (root) {
  'use strict';

  var SCHEMAS = {
    'TMP_MERGED_POS_DATA': {
      headers: ['INDEX', 'POS MASTER BRAND', 'POS MAIN ID', 'POS PLU', 'POS SUB ID', 'POS BRAND', 'POS DESCR', 'POS POS DESC', 'POS DISSNO', 'POS PROD GRP', 'POS SUPPLIER', 'POS LOYALTY SCHEME', 'POS UNITS', 'POS MIN ORDER QTY', 'POS WSP EXCGST', 'POS LAST PRICE', 'POS GST TAX PC', 'POS RRP INCGST', 'POS PR 1 PC', 'POS PR 2 PC', 'POS PR 3 PC', 'POS PR 4 PC', 'POS PR 5 PC', 'POS PR 6 PC', 'POS PR 7 PC', 'POS PR 8 PC', 'POS PR 9 PC', 'POS RET PRICE', 'POS PHARM PROD', 'POS SCALES', 'POS ITEMSIZE', 'POS PACKAGING', 'POS SOH', 'STATUS'],
      textCols: [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 29, 30, 31, 32, 34]
    },
    'IN_SUPPLIER_/_PRODUCT_UPDATES': {
      headers: ['INDEX', 'POS SUPPLIER NAME', 'POS SUPPLIER NUMBER', 'SUP BARCODE', 'SUP BRAND', 'SUP SUB ID', 'SUP PRODUCT', 'SUP UNITS IN PACK', 'SUP MIN ORDER WS', 'SUP WS EXGST', 'SUP RRP INC GST', 'SUP GST', 'SUP STOCK IN', 'SUP DISCOUNT PRICE', 'POS MEMBER', 'STATUS'],
      textCols: [2, 3, 4, 6]
    },
    'SRC_POS_BRAND_NAME_CHANGES': { headers: ['INDEX', 'SUP BRAND', 'POS BRAND', 'SRC STATUS'], textCols: [1] },
    'SRC_POS_PRODUCT_PREFIX': { headers: ['INDEX', 'POS BRAND', 'POS PREFIX', 'POS MEMBER', 'SRC STATUS'], textCols: [1] },
    'SRC_POS_FIND_REPLACE': { headers: ['INDEX', 'SUP FIND', 'POS REPLACE', 'SRC STATUS'], textCols: [1] },
    'SRC_POS_SUPPLIERS': { headers: ['INDEX', 'POS ACCNO', 'POS ACNAME', 'SRC STATUS'], textCols: [1, 2] },
    'SRC_POS_ONGOING_DISCOUNTS': { headers: ['INDEX', 'POS MASTER BRAND', 'POS BRAND PREFIX', 'POS SUPPLIER NUMBER', 'POS PLU', 'POS MASTER BARCODE', 'POS DESCR', 'POS DISCOUNT%', 'POS MARKUP%', 'POS MEMBER', 'POS MATCH'], textCols: [1, 5, 6] }
  };

  // id, sheet, title, rail group, required / recommended, saved in this browser, several files
  var INPUTS = [
    { id: 'pos', sheet: 'TMP_MERGED_POS_DATA', title: 'POS Database', group: 'POS data', required: true, stored: false, multi: false,
      desc: 'Build POS Master Databases → POS Database output (clean_merged_pos_data_pos_db_….xlsx), or the TMP_MERGED_POS_DATA tab of the Google Sheet.',
      need: ['POS MASTER BRAND', 'POS PLU', 'POS SUB ID', 'POS DESCR'] },
    { id: 'sup', sheet: 'IN_SUPPLIER_/_PRODUCT_UPDATES', title: 'Supplier Updates', group: 'Supplier updates', required: true, stored: false, multi: true,
      desc: 'Build POS Master Databases → Oborne / CH2 or Unique / UHP supplier import (clean_…_pos_db_….xlsx), or the IN_SUPPLIER tab. Several supplier files are combined into one list.',
      need: ['SUP BARCODE', 'SUP BRAND', 'SUP PRODUCT', 'SUP WS EXGST'] },
    { id: 'brands', sheet: 'SRC_POS_BRAND_NAME_CHANGES', title: 'Brand Name Changes', group: 'Reference data', recommended: true, stored: true,
      desc: 'SRC_POS_BRAND_NAME_CHANGES — supplier brand → POS brand.', need: ['SUP BRAND', 'POS BRAND'] },
    { id: 'prefix', sheet: 'SRC_POS_PRODUCT_PREFIX', title: 'Product Prefixes', group: 'Reference data', recommended: true, stored: true,
      desc: 'SRC_POS_PRODUCT_PREFIX — POS brand → description prefix.', need: ['POS BRAND', 'POS PREFIX'] },
    { id: 'suppliers', sheet: 'SRC_POS_SUPPLIERS', title: 'POS Suppliers', group: 'Reference data', recommended: true, stored: true,
      desc: 'SRC_POS_SUPPLIERS — POS supplier account numbers and names.', need: ['POS ACCNO', 'POS ACNAME'] },
    { id: 'disc', sheet: 'SRC_POS_ONGOING_DISCOUNTS', title: 'Ongoing Discounts', group: 'Reference data', recommended: true, stored: true,
      desc: 'SRC_POS_ONGOING_DISCOUNTS — the same discount file Build POS Master Databases uses.', need: ['POS DISCOUNT%'] },
    { id: 'fr', sheet: 'SRC_POS_FIND_REPLACE', title: 'Find & Replace', group: 'Reference data', recommended: false, stored: true,
      desc: 'SRC_POS_FIND_REPLACE — supplier wording → POS wording for descriptions.', need: ['SUP FIND', 'POS REPLACE'] }
  ];

  // Source headings accepted for a schema heading (normalised), in order of preference.
  var ALIASES = {
    'INDEX': ['INDEX', 'POS INDEX'],
    'POS MAIN ID': ['POS MAIN ID', 'POS MASTER BARCODE'],
    'POS SUPPLIER NUMBER': ['POS SUPPLIER NUMBER', 'POS SUPPLIER NO', 'POS SUPPLIER'],
    'POS ACCNO': ['POS ACCNO', 'ACCNO'],
    'POS ACNAME': ['POS ACNAME', 'ACNAME']
  };
  // Columns the engine writes itself — cleared on input.
  var OUTPUT_HEADS = { 'STATUS': true, 'SRC STATUS': true, 'POS MATCH': true };

  function normHead(h) {
    return String(h == null ? '' : h).toUpperCase().replace(/_/g, ' ').replace(/[^A-Z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function inputDef(id) { for (var i = 0; i < INPUTS.length; i++) if (INPUTS[i].id === id) return INPUTS[i]; return null; }
  function isBlank(v) { return v === '' || v === null || v === undefined; }

  function headSet(rows, maxRows) {
    var set = {};
    for (var i = 0; i < Math.min(maxRows || 8, rows.length); i++) {
      var r = rows[i] || [];
      for (var j = 0; j < r.length; j++) { var h = normHead(r[j]); if (h) set[h] = true; }
    }
    return set;
  }

  // Which input(s) a table looks like, from its headings.
  function identifyRows(rows) {
    var s = headSet(rows, 8), has = function (h) { return !!s[normHead(h)]; };
    var any = function (list) { return list.some(has); }, all = function (list) { return list.every(has); };
    var ids = [];
    if (all(['POS MASTER BRAND', 'POS PLU', 'POS SUB ID']) && any(['POS SOH', 'POS RRP INCGST', 'POS WSP EXCGST'])) ids.push('pos');
    if (all(['SUP BARCODE', 'SUP PRODUCT']) && any(['SUP WS EXGST', 'SUP RRP INC GST'])) ids.push('sup');
    if (has('POS DISCOUNT%') && any(['POS MARKUP%', 'POS PLU', 'POS MASTER BRAND'])) ids.push('disc');
    if (has('POS PREFIX') && has('POS BRAND')) ids.push('prefix');
    if (has('POS ACCNO') && has('POS ACNAME')) ids.push('suppliers');
    if (has('SUP FIND') && has('POS REPLACE')) ids.push('fr');
    if (all(['SUP BRAND', 'POS BRAND']) && !any(['SUP PRODUCT', 'POS PLU', 'SUP BARCODE', 'POS PREFIX'])) ids.push('brands');
    return ids;
  }

  function findHeaderRow(rows, headers) {
    var want = headers.map(normHead), best = -1, bestScore = 0;
    for (var i = 0; i < Math.min(8, rows.length); i++) {
      var r = rows[i] || [], set = {};
      for (var j = 0; j < r.length; j++) { var h = normHead(r[j]); if (h) set[h] = true; }
      var score = 0;
      want.forEach(function (w) { var al = ALIASES[w] || [w]; if (al.some(function (a) { return set[a]; })) score++; });
      if (score > bestScore) { bestScore = score; best = i; }
    }
    return { row: best, score: bestScore };
  }

  // Map a table (2-D array, header row anywhere in the first 8 rows) onto the
  // schema columns of `sheet`. Returns data rows (no header) plus a report.
  function mapTable(rows, sheet, id) {
    var schema = SCHEMAS[sheet];
    if (!schema) throw new Error('Unknown sheet ' + sheet);
    var def = id ? inputDef(id) : null;
    var hr = findHeaderRow(rows || [], schema.headers);
    if (hr.row < 0) throw new Error('No matching column headings were found.');
    var src = (rows[hr.row] || []).map(normHead);
    var heads = schema.headers.map(normHead);
    var colMap = heads.map(function (h) {
      if (OUTPUT_HEADS[h]) return -1;
      var al = ALIASES[h] || [h];
      for (var a = 0; a < al.length; a++) { var k = src.indexOf(al[a]); if (k >= 0) return k; }
      return -1;
    });
    var missingNeed = (def && def.need ? def.need : []).filter(function (n) { var i = heads.indexOf(normHead(n)); return i < 0 || colMap[i] < 0; });
    if (missingNeed.length) throw new Error('Missing column' + (missingNeed.length === 1 ? '' : 's') + ': ' + missingNeed.join(', ') + '.');
    var text = {}; (schema.textCols || []).forEach(function (c) { text[c - 1] = true; });
    var out = [];
    for (var i = hr.row + 1; i < rows.length; i++) {
      var r = rows[i] || [], o = new Array(heads.length), any = false;
      for (var c = 0; c < heads.length; c++) {
        var k = colMap[c], v = k >= 0 ? r[k] : '';
        if (isBlank(v)) v = '';
        else {
          if (typeof v === 'string') v = v.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
          if (text[c] && typeof v !== 'string') v = String(v);
          if (c > 0 && String(v).trim() !== '') any = true;
        }
        o[c] = v;
      }
      if (any) out.push(o);
    }
    var found = colMap.filter(function (k, i) { return k >= 0 || OUTPUT_HEADS[heads[i]] || i === 0; }).length;
    var missing = heads.filter(function (h, i) { return colMap[i] < 0 && !OUTPUT_HEADS[h] && i !== 0; });
    return { data: out, report: { headerRow: hr.row + 1, found: found, total: heads.length, missing: missing, rows: out.length } };
  }

  // Rows for the in-memory sheet: row 1 blank (totals bar), row 2 headings,
  // data from row 3 with INDEX renumbered 1, 2, 3… like the paste tidy does.
  function sheetRows(sheet, dataRows) {
    var schema = SCHEMAS[sheet];
    var rows = [[''], schema.headers.slice()];
    (dataRows || []).forEach(function (r, i) { var o = r.slice(0, schema.headers.length); o[0] = String(i + 1); rows.push(o); });
    return rows;
  }

  root.PHFMergeMap = { SCHEMAS: SCHEMAS, INPUTS: INPUTS, ALIASES: ALIASES, normHead: normHead, inputDef: inputDef, identifyRows: identifyRows, findHeaderRow: findHeaderRow, mapTable: mapTable, sheetRows: sheetRows };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.PHFMergeMap;
})(typeof self !== 'undefined' ? self : this);
