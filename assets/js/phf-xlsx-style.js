/* PHF Staff Hub — phf-xlsx-style.js v1.0.0 (17 Oct 2026)
 * One shared style profile for every generated .xlsx, taken from the POS SUPPLIER review workbook (the preferred look):
 *   row 1 = navy title / totals band, gold text; row 2 = light header fill, dark text; Google Sans size 9; banded rows;
 *   column widths by heading; freeze top two rows; filter from row 2.
 * This is formatting only — it never changes a value, a column, a formula or the order of anything.
 *
 * Both Excel engines in the Hub use it:
 *   - XlsxLite builds read PALETTE / widthFor / headerDisplay and build their own style specs.
 *   - ExcelJS builds read the same and map to ExcelJS fill / font / alignment (argb = 'FF' + hex).
 *
 * headerDisplay(h, spaced): on a review / display sheet pass spaced=true to show "MASTER BARCODE" instead of
 * "MASTER_BARCODE"; on a POS-import or supplier-layout sheet that a script re-reads, pass spaced=false (default) to keep
 * the exact identifier.
 */
(function () {
  'use strict';
  var PALETTE = {
    titleBg: '1E3A5F',   // navy — row 1 band
    titleFg: 'FFD966',   // gold — row 1 text
    hdrBg: 'E9F0F5',     // light blue — row 2 header fill
    hdrFg: '2C3E50',     // dark slate — row 2 header text
    ink: '1C2833',       // body text
    bands: ['F5F5F5', 'E9F0F5'],   // banded data rows (odd / even)
    font: 'Calibri',     // the reference workbook's font
    size: 9,
    thin: 'D9E2F3'       // thin gridline / border
  };

  // Column width by heading (matches the merge tool's widthFor). Underscores or spaces both match.
  function widthFor(h) {
    var u = String(h == null ? '' : h).toUpperCase().replace(/_/g, ' ');
    if (/NOTES/.test(u)) return 48;
    if (/DESCR|DESCRIPTION|PRODUCT$|\bPRODUCT\b|LONG|POS DESC|MATCH BASIS|CHK FLAGS/.test(u)) return 36;
    if (/WSP TO RRP|FINAL SHELF|CURRENT WSP TO/.test(u)) return 24;
    if (/BRAND|SUPPLIER|VENDOR|STATUS|MAIN ID|BARCODE/.test(u) && !/^(BC|SUB ID|BRAND|WSP)$/.test(u)) return 18;
    if (/^(BC|SUB ID|BRAND|WSP)$/.test(u)) return 7;
    if (/PLU|SUB ID|CODE|INDEX/.test(u)) return 12;
    if (/WSP|LAST PRICE|RRP|WS EX|WHOLESALE|RET PRICE|DISCOUNT PRICE|QTY|UNITS|SOH|STOCK|GST|PC$|PCT|%|CONF|SCORE/.test(u)) return 11;
    return Math.min(30, Math.max(10, String(h).length + 2));
  }

  // Heading shown to the reader. spaced=true turns MASTER_BARCODE into MASTER BARCODE; the underlying column identifier
  // used by the build is never touched — only what row 2 displays.
  function headerDisplay(h, spaced) {
    var s = String(h == null ? '' : h);
    return spaced ? s.replace(/_/g, ' ') : s;
  }

  // Which money / percent number format a heading should carry (so figures line up and read as currency).
  function numFmtFor(h) {
    var u = String(h == null ? '' : h).toUpperCase().replace(/_/g, ' ');
    if (/%|\bPCT\b|PC$|DISCOUNT$/.test(u)) return '0.00%';
    if (/WSP|LAST PRICE|RRP|WS EX|WHOLESALE|RET PRICE|PRICE|COST/.test(u) && !/CODE|INDEX|LEVEL/.test(u)) return '$#,##0.00';
    return null;
  }

  function isTextHead(h) {
    return /(MAIN ID|\bPLU\b|SUB ID|BARCODE|^INDEX$|^POS INDEX$|ACCNO|SUPPLIER NUMBER|^BC$|ITEM CODE|PRODUCT CODE)/i.test(String(h == null ? '' : h).replace(/_/g, ' '));
  }

  window.PHFXlsxStyle = {
    PALETTE: PALETTE, widthFor: widthFor, headerDisplay: headerDisplay, numFmtFor: numFmtFor, isTextHead: isTextHead,
    argb: function (hex) { return 'FF' + hex; },
    heights: { title: 30, header: 30, data: 15 }
  };
})();
