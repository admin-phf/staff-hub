/* PHF Staff Hub — supplier-layout v1.1.1 (20 Oct 2026: fromFullSheet reads the spaced headings of the full sets) · v1.1.0 (13 Oct 2026; v1.0.0 12 Oct 2026)
 * v1.1.0: a CH2 line whose Description 2 says SELL THROUGH / SELL THRU (** SELL THROUGH **, *SELL THRU, NEW SKU …*) gets
 * " *SELL THRU*" at the end of SUP PRODUCT. POS New Product Check Clean keeps it out of descr / pos desc. A SUP MIN ORDER WS that
 * is not a number (N/A) is kept as it is (it was blanked) — POS New Product Check Clean replaces it only in the POS files.
 * The _pos_db rows: POS New Product Check Clean's supplier sheet (IN_SUPPLIER columns A–P) made from a full CH2 or
 * Unique set. One copy of the rules for both tools:
 *   - Build POS Master Databases writes clean_ch2_data_pos_db / clean_uhp_data_pos_db with them;
 *   - POS New Product Check Clean turns a full clean_ch2_data / clean_uhp_data (from the Library, or dropped in) into the
 *     same supplier rows, so the merge gets exactly what the _pos_db file holds.
 * Rules: CH2Core / UHPCore.buildSupplierImport, then SUP BARCODE 13 digits (bc13), CH2 SUP PRODUCT without CH2's stock
 * notes and in capitals (cleanCh2Product), CH2 SUP MIN ORDER WS a number when it is one (v1.1.0: else kept, e.g. N/A).
 * Needs ch2-core.js (CH2Core) and uhp-core.js (UHPCore) loaded first.
 */
(function (global) {
  'use strict';

  var HEADERS = ['INDEX', 'POS SUPPLIER NAME', 'POS SUPPLIER NUMBER', 'SUP BARCODE', 'SUP BRAND', 'SUP SUB ID', 'SUP PRODUCT', 'SUP UNITS IN PACK', 'SUP MIN ORDER WS', 'SUP WS EXGST', 'SUP RRP INC GST', 'SUP GST', 'SUP STOCK IN', 'SUP DISCOUNT PRICE', 'POS MEMBER', 'STATUS'];

  // 13-digit barcode as in the POS Database: digits only, leading zeros dropped above 13 digits (CH2 prints 14), padded below.
  function bc13(v) {
    var d = String(v == null ? '' : v).replace(/\D/g, '');
    if (!d) return '';
    while (d.length > 13 && d[0] === '0') d = d.slice(1);
    return d.length < 13 ? ('0000000000000' + d).slice(-13) : d;
  }
  // CH2 SUP PRODUCT: the stock notes CH2 adds (** SELL THROUGH **, *SELL THROUGH, NEW SKU …*, ** CH2 REDUNDANT **,
  // ** OBSOLETE MANUFACTURER **, *IF UNAVAIL SEE SUBSTITUTE …*) come out; other starred notes keep their words; capitals.
  var CH2_NOTE = /SELL\s*-?\s*TH(?:ROUGH|RU)|REDUNDANT|OBSOLETE|UNAVAIL|SUBSTITUTE|NEW\s+SKU/i;
  function cleanCh2Product(v) {
    var s = String(v == null ? '' : v).replace(/\*+\s*([^*]*?)\s*\*+/g, function (m, inner) { return CH2_NOTE.test(inner) ? ' ' : ' ' + inner + ' '; });
    return s.replace(/\*+/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
  }
  function numOrText(v) {                                   // v1.1.0: N/A and other text stay
    var s = String(v == null ? '' : v).trim();
    if (s === '') return '';
    var n = Number(s);
    return isFinite(n) ? (typeof v === 'number' ? v : n) : s;
  }
  function numOrBlank(v) {
    var s = String(v == null ? '' : v).trim();
    if (s === '') return '';
    var n = Number(s);
    return isFinite(n) ? (typeof v === 'number' ? v : n) : '';
  }

  function core(name) {
    var c = global[name];
    if (!c || typeof c.buildSupplierImport !== 'function') throw new Error(name + ' did not load — reload the page.');
    return c;
  }
  // headers = the full file's headings (CH2_… / UHP_…), rows = data rows in the same column order.
  var SELL_THRU = /SELL\s*-?\s*TH(?:ROUGH|RU)/i;
  function ch2(headers, rows) {
    var d2 = (headers || []).map(function (h) { return String(h == null ? '' : h).trim().toUpperCase(); }).indexOf('CH2_DESCRIPTION_2');
    return core('CH2Core').buildSupplierImport(headers, rows).map(function (r, i) {
      r = r.slice(); r[3] = bc13(r[3]); r[6] = cleanCh2Product(r[6]); r[8] = numOrText(r[8]);
      var note = d2 >= 0 && rows[i] ? rows[i][d2] : '';                                    // v1.1.0
      if (r[6] && SELL_THRU.test(String(note == null ? '' : note))) r[6] += ' *SELL THRU*';
      return r;
    });
  }
  function uhp(headers, rows) {
    return core('UHPCore').buildSupplierImport(headers, rows).map(function (r) { r = r.slice(); r[3] = bc13(r[3]); return r; });
  }

  // A sheet (2-D array, heading row in the first 8 rows) that is a full CH2 or Unique set, as Build POS Master Databases
  // writes it (clean_ch2_data / clean_uhp_data) → { kind: 'CH2' | 'UHP', label, headerRow, rows: [HEADERS, …supplier rows] };
  // anything else → null.
  function fromFullSheet(rows) {
    rows = rows || [];
    for (var i = 0; i < Math.min(8, rows.length); i++) {
      // v1.1.1: the full sets show spaced headings since Build POS Master v21.16 (CH2 MASTER BARCODE) — read them back as the
      // underscore identifiers (a pure space ↔ underscore swap), so a full set is recognised and converted again.
      var h = (rows[i] || []).map(function (x) { return String(x == null ? '' : x).trim().toUpperCase().replace(/\s+/g, '_'); });
      var has = function (n) { return h.indexOf(n) >= 0; };
      var kind = has('CH2_MASTER_BARCODE') && has('CH2_WHOLESALE_EX_GST') ? 'CH2' : has('UHP_MASTER_BARCODE') && has('UHP_WS_EX_GST') ? 'UHP' : '';
      if (!kind) continue;
      var data = [];
      for (var j = i + 1; j < rows.length; j++) {
        var r = rows[j] || [], any = false;
        for (var k = 0; k < r.length; k++) if (r[k] !== '' && r[k] != null) { any = true; break; }
        if (!any) continue;
        var o = new Array(h.length);
        for (k = 0; k < h.length; k++) o[k] = r[k] == null ? '' : r[k];
        data.push(o);
      }
      return { kind: kind, label: kind === 'CH2' ? 'full CH2 set' : 'full Unique set', headerRow: i + 1, rows: [HEADERS.slice()].concat(kind === 'CH2' ? ch2(h, data) : uhp(h, data)) };
    }
    return null;
  }

  var api = { VERSION: '1.1.1', HEADERS: HEADERS, bc13: bc13, cleanCh2Product: cleanCh2Product, numOrBlank: numOrBlank, numOrText: numOrText, ch2: ch2, uhp: uhp, fromFullSheet: fromFullSheet };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.PHFSupplierLayout = api;
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : globalThis));
