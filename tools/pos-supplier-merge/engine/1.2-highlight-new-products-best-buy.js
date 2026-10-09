/**
 * =============================================================================
 * POS DB & SUPPLIER MERGE
 * 1.2 - HighlightNewProductsBestBuy.gs
 * Script version: v6.3.84-schema-aware-edit-style-retention-v1
 *
 * Purpose:
 *   Supplier STATUS / best-buy highlighter only.
 *
 * v6.3.77 filtered-brand early-scope support:
 *   - Marks the shared supplier STATUS freshness fingerprint current only after
 *     the complete Highlight/status write succeeds.
 *   - Matching, ranking, discount priority and STATUS logic are unchanged.
 *
 * v6.3.78 filtered-brand scope v2 support:
 *   - No Highlight matching/ranking logic change. The existing freshness mark
 *     remains the hand-off point used by the m13FB2 filtered merge path.
 *
 * v6.3.79 filtered-brand direct TMP scope v3 support:
 *   - No Highlight matching/ranking logic change. The same completed STATUS
 *     freshness mark is handed to the m13FB3 filtered TMP selector path.
 *
 * v6.3.80 filtered-brand clean-output v4 support:
 *   - No Highlight matching/ranking logic change. STATUS freshness behaviour is
 *     unchanged; only filtered OUT sheet cleanup is restored in the Merge file.
 *
 * v6.3.82 new-product brand price-level support:
 *   - No Highlight matching, ranking, STATUS, discount or freshness logic change.
 *   - Full-build optimisation remains isolated under m13FM1 in the Merge file.
 *   - NEW PRODUCT brand price-level inheritance is isolated under m13PL1 in Merge.
 *
 * v6.3.83 NEW PRODUCT price-level RRP independence:
 *   - Version alignment only in Highlight; the PL2 price-level correction is isolated in Merge.
 *   - No supplier STATUS, best-buy, discount priority, effective-cost, barcode or Highlight behaviour changed.
 *
 * v6.3.84 schema-aware edit-style retention:
 *   - Version alignment only in Highlight; ES1 edit-style retention is isolated in Setup.
 *   - No supplier STATUS, best-buy, discount priority, effective-cost, barcode or Highlight behaviour changed.
 *
 * v6.3.47-v2 correction:
 *   - Preflight resets IN_SUPPLIER_/_PRODUCT_UPDATES column P STATUS content,
 *     notes, text style, and alternating background before Highlight matching.
 *
 * v6.3.9 corrections safely merged:
 *   - Uses shared POS-is-king barcode variants and brand-map translation helpers.
 *   - Preserves TMP/POS barcode display values for output while using canonical values only for matching.
 *
 * v6.3.8 corrections safely merged:
 *   - Brand translation is applied before scoring/discount checks.
 *   - Discount priority is PLU → Barcode → Brand+Supplier → Brand → Supplier.
 *   - SRC_POS_SUPPLIERS only blocks suppliers when explicitly marked BLOCKED/EXCLUDE/UNUSED; blank status remains allowed for current uploads.
 *   - Prefix map is loaded for note-level validation without changing matching behaviour.
 *   No OUT_MERGED_DATA, no INSERT/UPDATE, no export, no external workbook IDs.
 *
 * Reads only this bound workbook:
 *   - IN_SUPPLIER_/_PRODUCT_UPDATES
 *   - TMP_MERGED_POS_DATA
 *   - SRC_POS_BRAND_NAME_CHANGES
 *   - SRC_POS_SUPPLIERS
 *   - SRC_POS_ONGOING_DISCOUNTS
 *   - SRC_POS_FIND_REPLACE
 *
 * Writes only:
 *   - IN_SUPPLIER_/_PRODUCT_UPDATES column P / STATUS
 *   - row 1 summary cells on IN_SUPPLIER_/_PRODUCT_UPDATES
 * =============================================================================
 */

var HBB = {
  VERSION: 'v6.3.84-schema-aware-edit-style-retention-v1',
  HEADER_ROW: 2,
  DATA_ROW: 3,
  STATUS_COL: 16, // P
  WRITE_NOTES: true,
  WRITE_STATUS_CELL_ONLY: true,
  USE_SRC_DISCOUNTS: true,
  USE_FIND_REPLACE_FOR_SCORING: false, // Faster: merge/output still applies SRC find/replace; highlight scoring does not need it.
  MAX_NOTE_LEN: 500,
  STATUS: {
    BEST_BUY_MATCHED: 'BEST BUY • MATCHED',
    BEST_BUY_NEW: 'BEST BUY • NEW',
    NOT_USED: 'NOT USED',
    UNMATCHABLE: 'UNMATCHABLE',
    BLANK: ''
  },
  STYLE: {} // Runtime styles come from LEGEND via hbbStatusStyle_().
};

// Backwards-compatible alias if an older menu item calls this name.
function highlightNewProductsMenu() { return runHighlightNewProductsBestBuy(); }

function runHighlightNewProductsBestBuy() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var t0 = Date.now();

  // Mark any previous STATUS fingerprint stale before this run starts. It is
  // stamped current again only after the complete STATUS write succeeds.
  try {
    if (typeof setupInvalidateSupplierStatusFingerprint_ === 'function') {
      setupInvalidateSupplierStatusFingerprint_('highlight-start');
    }
  } catch (_statusFpStart) {}

  try {
    var shSup = hbbSheet_(ss, CFG.SH.IN_SUP, true);
    var shTmp = hbbSheet_(ss, CFG.SH.TMP_MERGED, true);

    var supLastRow = shSup.getLastRow();
    var tmpLastRow = shTmp.getLastRow();
    if (supLastRow < HBB.DATA_ROW) throw new Error('No supplier rows found in ' + CFG.SH.IN_SUP + '.');
    if (tmpLastRow < HBB.DATA_ROW) throw new Error('No POS/TMP rows found in ' + CFG.SH.TMP_MERGED + '.');

    // Protect the user's existing INDEX column before any schema/header/status work.
    // Highlight must never rebuild, blank, or overwrite column A data.
    var indexSnapshot = hbbSnapshotIndexColumn_(shSup);

    ss.toast('Reading local SRC tables…', '🪄 Supplier Highlight', 30);
    var brandMap = hbbLoadBrandMap_(ss);
    var supplierMap = hbbLoadSupplierMap_(ss);
    var activeSuppliers = hbbLoadActiveSuppliers_(ss);
    var prefixMap = hbbLoadPrefixMap_(ss);
    var findReplaceRules = HBB.USE_FIND_REPLACE_FOR_SCORING ? hbbLoadFindReplaceRules_(ss) : [];
    var discountRules = HBB.USE_SRC_DISCOUNTS ? hbbLoadDiscountRules_(ss, brandMap) : hbbEmptyDiscountRules_();

    // Ensure the supplier sheet has STATUS at column P without touching INDEX values.
    if (typeof ensureSupplierSheetSchema_ === 'function') {
      ensureSupplierSheetSchema_(shSup, { supplierMap: supplierMap });
    } else {
      hbbEnsureCol_(shSup, HBB.STATUS_COL);
      shSup.getRange(HBB.HEADER_ROW, HBB.STATUS_COL).setValue('STATUS');
    }
    hbbEnsureCol_(shSup, HBB.STATUS_COL);
    shSup.getRange(HBB.HEADER_ROW, HBB.STATUS_COL).setValue('STATUS');

    hbbRestoreIndexColumnIfChanged_(shSup, indexSnapshot);

    ss.toast('Preparing supplier STATUS column P…', '🪄 Supplier Highlight', 30);
    // v6.3.47-v2 P-RESET: every Highlight rerun preflight-resets Column P so
    // stale STATUS colours/notes are removed before matching starts. This only
    // touches STATUS column P and keeps the protected INDEX snapshot intact.
    if (typeof hbbResetStatusColumnForRun_ === 'function') {
      hbbResetStatusColumnForRun_(shSup);
    }
    hbbRestoreIndexColumnIfChanged_(shSup, indexSnapshot);

    ss.toast('Reading TMP POS barcode snapshot…', '🪄 Supplier Highlight', 60);
    var posIndex = hbbBuildPosBarcodeIndex_(shTmp, brandMap);

    ss.toast('Reading supplier upload…', '🪄 Supplier Highlight', 60);
    var supLastCol = shSup.getLastColumn();
    var nRows = supLastRow - HBB.DATA_ROW + 1;
    var supHeaders = hbbHeaderMap_(shSup, HBB.HEADER_ROW);
    var supData = shSup.getRange(HBB.DATA_ROW, 1, nRows, supLastCol).getDisplayValues();

    ss.toast('Matching supplier rows and grouping barcodes…', '🪄 Supplier Highlight', 120);

    var results = new Array(nRows);
    var groups = {}; // family key -> result row indexes

    for (var i = 0; i < supData.length; i++) {
      var sup = hbbMakeSupplierObj_(
        supData[i],
        supHeaders,
        brandMap,
        supplierMap,
        activeSuppliers,
        discountRules,
        findReplaceRules,
        prefixMap,
        HBB.DATA_ROW + i
      );

      if (hbbBlankSupplier_(sup)) {
        results[i] = hbbBlankResult_(i);
        continue;
      }

      // v6.3.61: SRC_POS_SUPPLIERS is a current-use marker, not a whitelist.
      // Blank SRC STATUS must not block a supplier that appears in the current upload.
      // Only explicit block/exclude statuses are rejected before barcode grouping.
      if (sup.isActive === false) {
        results[i] = {
          rowIdx: i,
          sheetRow: HBB.DATA_ROW + i,
          supplier: sup,
          pos: null,
          familyKey: '',
          isNew: false,
          score: 0,
          status: HBB.STATUS.NOT_USED,
          note: 'NOT USED: POS supplier number ' + (sup.supplierNum || '—') + ' is explicitly blocked/excluded in SRC_POS_SUPPLIERS.'
        };
        continue;
      }

      if (!sup.barcode.valid) {
        results[i] = {
          rowIdx: i,
          sheetRow: HBB.DATA_ROW + i,
          supplier: sup,
          pos: null,
          familyKey: '',
          isNew: false,
          score: 0,
          status: HBB.STATUS.UNMATCHABLE,
          note: 'UNMATCHABLE: missing or invalid supplier barcode. Raw barcode: ' + (sup.rawBarcode || '—')
        };
        continue;
      }

      var posHit = hbbFindPosByBarcode_(posIndex, sup.barcode.variants);
      var familyKey = posHit ? posHit.familyKey : sup.barcode.canonical;
      var score = posHit ? hbbScoreSupplierVsPos_(sup, posHit.pos) : hbbScoreNewSupplier_(sup);

      var res = {
        rowIdx: i,
        sheetRow: HBB.DATA_ROW + i,
        supplier: sup,
        pos: posHit ? posHit.pos : null,
        familyKey: familyKey,
        isNew: !posHit,
        score: score,
        status: '',
        note: ''
      };
      results[i] = res;
      if (!groups[familyKey]) groups[familyKey] = [];
      groups[familyKey].push(i);
    }

    ss.toast('Selecting best-buy winners…', '🪄 Supplier Highlight', 60);

    Object.keys(groups).forEach(function(familyKey) {
      var idxs = groups[familyKey];
      var winnerIdx = hbbChooseBestBuy_(idxs, results);
      var winner = results[winnerIdx];

      for (var j = 0; j < idxs.length; j++) {
        var idx = idxs[j];
        var r = results[idx];
        if (!r) continue;
        if (idx === winnerIdx) {
          r.status = r.isNew ? HBB.STATUS.BEST_BUY_NEW : HBB.STATUS.BEST_BUY_MATCHED;
          r.note = hbbWinnerNote_(r, idxs.length);
        } else {
          r.status = HBB.STATUS.NOT_USED;
          r.note = hbbLoserNote_(r, winner);
        }
      }
    });

    // Cross-barcode duplicate guard:
    // If a supplier row looks NEW only because its barcode differs, but another
    // supplier row for the same brand/product/pack/price is already MATCHED to
    // an existing POS item, suppress the NEW row. This prevents duplicate insert
    // candidates such as BioCeuticals Zinc Sustain appearing as both MATCHED and NEW.
    hbbSuppressDuplicateNewRowsAlreadyMatched_(results);

    ss.toast('Writing STATUS to supplier column P…', '🪄 Supplier Highlight', 30);
    hbbWriteStatus_(shSup, results);
    hbbRestoreIndexColumnIfChanged_(shSup, indexSnapshot);

    var summary = hbbSummarise_(results);
    hbbWriteHeaderSummary_(shSup, summary, t0);
    hbbRestoreFilter_(shSup);

    // STATUS is current only after every row/value/note write has completed.
    // The filtered-brand build uses this marker to avoid an unnecessary full
    // Highlight/TMP scan when the existing STATUS results are still current.
    try {
      if (typeof setupMarkSupplierStatusFingerprintCurrent_ === 'function') {
        setupMarkSupplierStatusFingerprintCurrent_();
      }
    } catch (_statusFpMark) {}

    var elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    ss.toast(
      '⭐ Matched: ' + fmt_(summary.bestBuyMatched) +
      ' | 🟢 New: ' + fmt_(summary.bestBuyNew) +
      ' | 🚫 Not Used: ' + fmt_(summary.notUsed) +
      ' | ⚠️ Unmatchable: ' + fmt_(summary.unmatchable) +
      ' | ' + elapsed + 's',
      '✅ Supplier Highlight Complete',
      12
    );
  } catch (err) {
    ss.toast('Highlight failed: ' + err.message, '❌ Error', 10);
    ui.alert('Supplier Highlight failed', String(err && err.stack ? err.stack : err), ui.ButtonSet.OK);
    throw err;
  }
}

function clearSupplierStatusOnly() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = hbbSheet_(ss, CFG.SH.IN_SUP, true);
  var cleared = 0;

  if (typeof resetSupplierStatusColumn_ === 'function') {
    cleared = resetSupplierStatusColumn_(sh, { resetTextStyle: true });
  } else {
    // Fallback if this file is run without the reviewed Setup helper.
    var lastRow = sh.getLastRow();
    if (lastRow >= HBB.DATA_ROW) {
      hbbEnsureCol_(sh, HBB.STATUS_COL);
      var rng = sh.getRange(HBB.DATA_ROW, HBB.STATUS_COL, lastRow - HBB.DATA_ROW + 1, 1);
      rng.clearContent();
      try { rng.clearNote(); } catch(e) {}
      hbbApplyStatusBaseBackground_(sh, lastRow - HBB.DATA_ROW + 1)
      rng.setFontSize(8).setFontStyle('italic').setHorizontalAlignment('center').setNumberFormat('@');
      cleared = lastRow - HBB.DATA_ROW + 1;
    }
  }

  hbbWriteHeaderSummary_(sh, hbbSummariseFromStatusColumn_(sh), Date.now());
  ss.toast('Supplier STATUS column P cleared: ' + fmt_(cleared) + ' row(s).', '🧹 Clear', 5);
}

function showSupplierStatusSummary() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = hbbSheet_(ss, CFG.SH.IN_SUP, true);
  var summary = hbbSummariseFromStatusColumn_(sh);
  SpreadsheetApp.getUi().alert(
    'Supplier STATUS Summary',
    'BEST BUY • MATCHED: ' + fmt_(summary.bestBuyMatched) + '\n' +
    'BEST BUY • NEW: ' + fmt_(summary.bestBuyNew) + '\n' +
    'NOT USED: ' + fmt_(summary.notUsed) + '\n' +
    'UNMATCHABLE: ' + fmt_(summary.unmatchable) + '\n' +
    'Blank: ' + fmt_(summary.blank),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// =============================================================================
// POS INDEX
// =============================================================================
function hbbBuildPosBarcodeIndex_(shTmp, brandMap) {
  var lastRow = shTmp.getLastRow();
  var lastCol = shTmp.getLastColumn();
  var headers = hbbHeaderMap_(shTmp, HBB.HEADER_ROW);
  var data = shTmp.getRange(HBB.DATA_ROW, 1, lastRow - HBB.DATA_ROW + 1, lastCol).getDisplayValues();
  var index = {};

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var rawBarcode = hbbStr_(hbbColVal_(row, headers, ['POS MAIN ID', 'MAIN ID', 'MAIN_ID', 'POS MASTER BARCODE', 'MASTER BARCODE', 'BARCODE']));
    var bc = hbbBarcode_(rawBarcode);
    if (!bc.valid) continue;

    var rawBrand = hbbStr_(hbbColVal_(row, headers, ['POS MASTER BRAND', 'POS BRAND', 'BRAND']));
    var brand = hbbTranslateBrand_(rawBrand, brandMap);
    var descr = hbbStr_(hbbColVal_(row, headers, ['POS DESCR', 'POS POS DESC', 'POS PRODUCT', 'DESCR', 'DESCRIPTION']));

    var pos = {
      sheetRow: HBB.DATA_ROW + i,
      rawBarcode: rawBarcode,
      barcode: bc.canonical,
      variants: bc.variants,
      plu: hbbStr_(hbbColVal_(row, headers, ['POS PLU', 'PLU'])),
      brand: rawBrand,
      translatedBrand: brand,
      brandKey: hbbNormBrand_(brand || rawBrand),
      descr: descr,
      // Keep POS indexing fast. SRC find/replace is for supplier/output description building, not for every TMP row.
      cleanDescr: hbbUpper_(descr),
      supplier: hbbStr_(hbbColVal_(row, headers, ['POS SUPPLIER', 'SUPPLIER'])),
      subId: hbbStr_(hbbColVal_(row, headers, ['POS SUB ID', 'SUB ID', 'SUB_ID'])),
      wsp: hbbNum_(hbbColVal_(row, headers, ['POS WSP EXCGST', 'WSP EXCGST', 'WSP'])),
      lastPrice: hbbNum_(hbbColVal_(row, headers, ['POS LAST PRICE', 'LAST PRICE'])),
      rrp: hbbNum_(hbbColVal_(row, headers, ['POS RRP INCGST', 'RRP INCGST', 'RRP'])),
      soh: hbbNum_(hbbColVal_(row, headers, ['POS SOH', 'SOH']))
    };

    for (var v = 0; v < bc.variants.length; v++) {
      var key = bc.variants[v];
      if (!index[key]) index[key] = { familyKey: bc.canonical, pos: pos };
    }
  }
  return index;
}

function hbbFindPosByBarcode_(posIndex, variants) {
  for (var i = 0; i < variants.length; i++) {
    if (posIndex[variants[i]]) return posIndex[variants[i]];
  }
  return null;
}

// =============================================================================
// SUPPLIER ROWS + RANKING
// =============================================================================
function hbbMakeSupplierObj_(row, headers, brandMap, supplierMap, activeSuppliers, discountRules, findReplaceRules, prefixMap, sheetRow) {
  var supplierNameRaw = hbbStr_(hbbColVal_(row, headers, ['POS SUPPLIER NAME', 'SUPPLIER NAME', 'POS SUPPLIER']));
  var supplierNum = hbbStr_(hbbColVal_(row, headers, ['POS SUPPLIER NUMBER', 'SUPPLIER NUMBER', 'SUPPLIER NO', 'SUPPLIER']));
  var rawBarcode = hbbStr_(hbbColVal_(row, headers, ['SUP BARCODE', 'SUP MASTER BARCODE', 'BARCODE', 'POS MASTER BARCODE']));
  var rawBrand = hbbStr_(hbbColVal_(row, headers, ['SUP BRAND', 'BRAND']));
  var product = hbbStr_(hbbColVal_(row, headers, ['SUP PRODUCT', 'PRODUCT', 'SUP DESCR', 'DESCR']));

  // v6.3.8: brand translation happens before scoring and discount checks.
  var translatedBrand = hbbTranslateBrand_(rawBrand, brandMap);

  var wsp = hbbNum_(hbbColVal_(row, headers, ['SUP WS EXGST', 'SUP WSP', 'WSP EXGST', 'WSP']));
  var discountPrice = hbbNum_(hbbColVal_(row, headers, ['SUP DISCOUNT PRICE', 'DISCOUNT PRICE', 'DISC PRICE']));
  var stockRaw = hbbStr_(hbbColVal_(row, headers, ['SUP STOCK IN', 'STOCK IN', 'IN STOCK']));
  var barcode = hbbBarcode_(rawBarcode);
  var subId = hbbStr_(hbbColVal_(row, headers, ['SUP SUB ID', 'SUB ID', 'SUB_ID']));
  var cleanedProduct = (findReplaceRules && findReplaceRules.length) ? hbbApplyFindReplace_(product, findReplaceRules) : hbbUpper_(product);
  var expectedPrefix = hbbExpectedPrefixForBrand_(translatedBrand || rawBrand, prefixMap);

  var sup = {
    sheetRow: sheetRow,
    supplierNum: supplierNum,
    supplierName: supplierNameRaw || supplierMap[supplierNum] || supplierMap[hbbNormId_(supplierNum)] || '',
    rawBarcode: rawBarcode,
    barcode: barcode,
    rawBrand: rawBrand,
    translatedBrand: translatedBrand,
    brandKey: hbbNormBrand_(translatedBrand || rawBrand),
    subId: subId,
    product: product,
    cleanProduct: cleanedProduct,
    cleanedProduct: cleanedProduct,
    expectedPrefix: expectedPrefix,
    prefixValid: hbbPrefixLooksValid_(product, expectedPrefix),
    units: hbbNum_(hbbColVal_(row, headers, ['SUP UNITS IN PACK', 'UNITS IN PACK', 'UNITS'])),
    minOrder: hbbNum_(hbbColVal_(row, headers, ['SUP MIN ORDER WS', 'MIN ORDER WS', 'MIN ORDER'])),
    wsp: wsp,
    rrp: hbbNum_(hbbColVal_(row, headers, ['SUP RRP INC GST', 'RRP INC GST', 'RRP'])),
    gst: hbbStr_(hbbColVal_(row, headers, ['SUP GST', 'GST'])),
    stockRaw: stockRaw,
    inStock: hbbInStock_(stockRaw),
    discountPrice: discountPrice,
    member: hbbStr_(hbbColVal_(row, headers, ['POS MEMBER', 'MEMBER'])),
    isActive: hbbIsSupplierActive_(supplierNum, activeSuppliers)
  };

  var disc = hbbBestDiscountForSupplier_(sup, discountRules);
  sup.discountPct = disc.pct || 0;
  sup.discountSource = disc.label || '';
  sup.discountType = disc.type || '';
  sup.effectivePrice = hbbEffectivePrice_(wsp, discountPrice, sup.discountPct);
  return sup;
}

function hbbBlankSupplier_(sup) {
  return !sup.rawBarcode && !sup.rawBrand && !sup.product && !sup.supplierNum;
}

function hbbBlankResult_(idx) {
  return { rowIdx: idx, status: HBB.STATUS.BLANK, note: '' };
}

function hbbChooseBestBuy_(idxs, results) {
  var sorted = idxs.slice().sort(function(a, b) {
    var A = results[a], B = results[b];
    var ap = A.supplier.effectivePrice || 999999999;
    var bp = B.supplier.effectivePrice || 999999999;

    if (A.supplier.inStock !== B.supplier.inStock) return A.supplier.inStock ? -1 : 1;
    if (ap !== bp) return ap - bp;
    if ((B.score || 0) !== (A.score || 0)) return (B.score || 0) - (A.score || 0);
    var aComplete = hbbCompleteness_(A.supplier), bComplete = hbbCompleteness_(B.supplier);
    if (bComplete !== aComplete) return bComplete - aComplete;
    return A.rowIdx - B.rowIdx;
  });
  return sorted[0];
}

function hbbCompleteness_(sup) {
  var n = 0;
  if (sup.rawBarcode) n++;
  if (sup.rawBrand) n++;
  if (sup.product) n++;
  if (sup.supplierNum) n++;
  if (sup.wsp > 0) n++;
  if (sup.rrp > 0) n++;
  if (sup.subId) n++;
  return n;
}

function hbbScoreSupplierVsPos_(sup, pos) {
  var score = 0;

  // Brand has already been translated using SRC_POS_BRAND_NAME_CHANGES.
  var supBrandNorm = hbbNormBrand_(sup.translatedBrand || sup.rawBrand || '');
  var posBrandNorm = hbbNormBrand_(pos.translatedBrand || pos.brand || '');
  if (supBrandNorm && posBrandNorm && supBrandNorm === posBrandNorm) score += 20;

  var supSubIdNorm = hbbNormId_(sup.subId || '');
  var posSubIdNorm = hbbNormId_(pos.subId || '');
  if (supSubIdNorm && posSubIdNorm && supSubIdNorm === posSubIdNorm) score += 45;

  var supSupplierNorm = hbbNormId_(sup.supplierNum || '');
  var posSupplierNorm = hbbNormId_(pos.supplier || '');
  if (supSupplierNorm && posSupplierNorm && supSupplierNorm === posSupplierNorm) score += 15;

  var d = hbbDice_(hbbNormText_(sup.cleanedProduct || sup.cleanProduct || sup.product), hbbNormText_(pos.cleanDescr || pos.descr));
  if (d >= 0.92) score += 18;
  else if (d >= 0.82) score += 12;
  else if (d >= 0.68) score += 6;

  if (sup.effectivePrice > 0 && pos.wsp > 0) {
    var diff = Math.abs(sup.effectivePrice - pos.wsp);
    if (diff <= 0.25) score += 8;
    else if (diff <= 2) score += 4;
  }
  return score;
}

function hbbScoreNewSupplier_(sup) {
  var score = 0;
  if (sup.rawBarcode) score += 10;
  if (sup.rawBrand) score += 5;
  if (sup.product) score += 5;
  if (sup.supplierNum) score += 3;
  if (sup.inStock) score += 5;
  if (sup.effectivePrice > 0) score += 5;
  return score;
}

function hbbEffectivePrice_(wsp, discountPrice, discountPct) {
  var base = Number(wsp || 0);
  var discPrice = Number(discountPrice || 0);
  if (discPrice > 0 && (base <= 0 || discPrice < base)) return discPrice;
  if (base > 0 && discountPct > 0) return +(base * (1 - discountPct / 100)).toFixed(4);
  return base || discPrice || 0;
}

function hbbInStock_(v) {
  var s = hbbUpper_(v);
  if (!s) return true;
  if (['N','NO','FALSE','0','OUT','OUT OF STOCK','BACKORDER','DISCONTINUED'].indexOf(s) >= 0) return false;
  return true;
}


// =============================================================================
// CROSS-BARCODE DUPLICATE NEW GUARD
// =============================================================================
function hbbSuppressDuplicateNewRowsAlreadyMatched_(results) {
  if (!results || !results.length) return { suppressed: 0, reviewed: 0 };

  var matched = [];
  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    if (!r || !r.supplier) continue;
    if (r.status === HBB.STATUS.BEST_BUY_MATCHED) matched.push(r);
  }
  if (!matched.length) return { suppressed: 0, reviewed: 0 };

  var suppressed = 0;
  var reviewed = 0;
  for (var n = 0; n < results.length; n++) {
    var cand = results[n];
    if (!cand || !cand.supplier || cand.status !== HBB.STATUS.BEST_BUY_NEW) continue;

    var dup = hbbFindMatchedDuplicateForNew_(cand, matched);
    if (!dup) continue;

    var reviewReason = hbbDuplicateNewReviewReason_(cand.supplier, dup.supplier);
    if (reviewReason) {
      cand.status = HBB.STATUS.UNMATCHABLE;
      cand.note = 'UNMATCHABLE: duplicate product review required. Similar brand/product/pack already MATCHED on supplier row ' +
        (dup.supplier.sheetRow || '—') + ' (' + hbbSupplierLabelForNote_(dup.supplier) + '). ' + reviewReason +
        ' Not auto-suppressed as NOT USED because this could hide a barcode/sub-id/price correction.';
      cand.duplicateMatchedRow = dup.supplier.sheetRow || '';
      reviewed++;
      continue;
    }

    cand.status = HBB.STATUS.NOT_USED;
    cand.note = 'NOT USED: duplicate NEW suppressed. Same brand/product/pack/price already MATCHED on supplier row ' +
      (dup.supplier.sheetRow || '—') + ' (' + hbbSupplierLabelForNote_(dup.supplier) + '). ' +
      'This protects OUT_MERGED_DATA from creating a duplicate NEW product when barcode/sub-id differs between suppliers.';
    cand.duplicateMatchedRow = dup.supplier.sheetRow || '';
    suppressed++;
  }
  return { suppressed: suppressed, reviewed: reviewed };
}

function hbbFindMatchedDuplicateForNew_(newResult, matchedResults) {
  for (var i = 0; i < matchedResults.length; i++) {
    if (hbbSuppliersLookLikeSameProduct_(newResult.supplier, matchedResults[i].supplier)) {
      return matchedResults[i];
    }
  }
  return null;
}

function hbbSuppliersLookLikeSameProduct_(a, b) {
  if (!a || !b) return false;

  var brandA = hbbNormBrand_(a.translatedBrand || a.rawBrand || '');
  var brandB = hbbNormBrand_(b.translatedBrand || b.rawBrand || '');
  if (!brandA || !brandB || brandA !== brandB) return false;

  var keyA = hbbDuplicateProductKey_(a);
  var keyB = hbbDuplicateProductKey_(b);
  if (!keyA || !keyB || !keyA.name || !keyB.name) return false;

  // Variant-safe duplicate rule:
  // A duplicate candidate must have a compatible pack AND an effectively identical
  // product key. Do not use broad fuzzy thresholds here, because they catch real
  // flavour/variant siblings such as Chocolate vs Choc Honeycomb, Red vs Black
  // Maca, Cherry Blossom vs Peppermint, 250g vs 500g, etc.
  if (!hbbDuplicatePackCompatible_(keyA.pack, keyB.pack)) return false;
  return hbbDuplicateNameCompatible_(keyA.name, keyB.name);
}

function hbbDuplicateNameCompatible_(nameA, nameB) {
  nameA = hbbDuplicateNameNormalise_(nameA);
  nameB = hbbDuplicateNameNormalise_(nameB);
  if (!nameA || !nameB) return false;
  if (nameA === nameB) return true;

  var toksA = hbbDuplicateNameTokens_(nameA);
  var toksB = hbbDuplicateNameTokens_(nameB);
  if (!toksA.length || !toksB.length) return false;

  var keyA = toksA.join(' ');
  var keyB = toksB.join(' ');
  if (keyA === keyB) return true;

  // Only allow near-identical spelling/abbreviation differences when there are
  // no meaningful one-sided tokens. Any meaningful extra token is treated as a
  // variant signal, not a duplicate signal.
  if (hbbDuplicateHasMeaningfulTokenDifference_(toksA, toksB)) return false;
  return hbbDice_(keyA, keyB) >= 0.96;
}

function hbbDuplicateNameNormalise_(s) {
  s = hbbUpper_(s || '');
  s = s.replace(/&/g, ' AND ')
       .replace(/CHOC/g, 'CHOCOLATE')
       .replace(/CHOC\s+PB/g, 'CHOCOLATE PEANUT BUTTER')
       .replace(/PB/g, 'PEANUT BUTTER')
       .replace(/ORG/g, 'ORGANIC')
       .replace(/CERT/g, 'CERTIFIED')
       .replace(/GELATINISED/g, 'GELATINIZED')
       .replace(/[^A-Z0-9 ]/g, ' ')
       .replace(/\s+/g, ' ')
       .trim();
  return s;
}

function hbbDuplicateNameTokens_(s) {
  s = hbbDuplicateNameNormalise_(s);
  if (!s) return [];
  var skip = {
    AND:1, THE:1, A:1, AN:1, OF:1, WITH:1, FOR:1,
    ORGANIC:1, CERTIFIED:1, ORIGIN:1, RAW:1,
    PURE:1, NATURAL:1, AUSTRALIAN:1,
    POWDER:1, PWD:1, PROTEIN:1, SUPPLEMENTS:1, SUPPLEMENT:1
  };
  var out = [];
  var seen = {};
  var parts = s.split(' ');
  for (var i = 0; i < parts.length; i++) {
    var t = parts[i];
    if (!t || skip[t]) continue;
    if (!seen[t]) { seen[t] = true; out.push(t); }
  }
  return out.sort();
}

function hbbDuplicateHasMeaningfulTokenDifference_(toksA, toksB) {
  var a = {}, b = {}, i;
  for (i = 0; i < toksA.length; i++) a[toksA[i]] = true;
  for (i = 0; i < toksB.length; i++) b[toksB[i]] = true;
  for (i = 0; i < toksA.length; i++) if (!b[toksA[i]]) return true;
  for (i = 0; i < toksB.length; i++) if (!a[toksB[i]]) return true;
  return false;
}

function hbbDuplicateNewReviewReason_(newSup, matchedSup) {
  if (!newSup || !matchedSup) return 'Missing supplier detail for duplicate comparison.';

  var sameSupplier = hbbSameSupplierNumber_(newSup, matchedSup);
  var sameBarcode = hbbSupplierBarcodeEquivalent_(newSup, matchedSup);
  var sameSubId = hbbSupplierSubIdEquivalent_(newSup, matchedSup);
  var priceClose = hbbSupplierPriceClose_(newSup, matchedSup);

  // Same supplier + different barcode or sub-id is not a normal multi-supplier
  // best-buy duplicate. It usually means the supplier file has a true identity
  // conflict, size issue, old/new barcode, or incorrect product description.
  if (sameSupplier && (!sameBarcode || !sameSubId)) {
    return 'Same supplier has a similar matched product but the barcode/sub-id identity differs ' +
      '(new barcode ' + (newSup.rawBarcode || '—') + ', sub-id ' + (newSup.subId || '—') +
      ' vs matched barcode ' + (matchedSup.rawBarcode || '—') + ', sub-id ' + (matchedSup.subId || '—') + ').';
  }

  // Cross-supplier duplicates are only safe to suppress when the price is also
  // effectively the same. Material price differences should be reviewed rather
  // than hidden as NOT USED.
  if (!priceClose) {
    return 'Similar product/pack but WSP/RRP differs ' +
      '(new WSP/RRP ' + hbbMoneyForNote_(newSup.wsp) + '/' + hbbMoneyForNote_(newSup.rrp) +
      ' vs matched ' + hbbMoneyForNote_(matchedSup.wsp) + '/' + hbbMoneyForNote_(matchedSup.rrp) + ').';
  }

  return '';
}

function hbbSameSupplierNumber_(a, b) {
  var an = hbbNormId_(a && a.supplierNum || '');
  var bn = hbbNormId_(b && b.supplierNum || '');
  return !!(an && bn && an === bn);
}

function hbbSupplierBarcodeEquivalent_(a, b) {
  var av = (a && a.barcode && a.barcode.variants) ? a.barcode.variants : [];
  var bv = (b && b.barcode && b.barcode.variants) ? b.barcode.variants : [];
  if (!av.length && !bv.length) {
    var ar = hbbNormId_(a && a.rawBarcode || '');
    var br = hbbNormId_(b && b.rawBarcode || '');
    return !!(ar && br && ar === br);
  }
  var map = {};
  for (var i = 0; i < av.length; i++) if (av[i]) map[hbbNormId_(av[i])] = true;
  for (var j = 0; j < bv.length; j++) if (bv[j] && map[hbbNormId_(bv[j])]) return true;
  return false;
}

function hbbSupplierSubIdEquivalent_(a, b) {
  var as = hbbNormId_(a && a.subId || '');
  var bs = hbbNormId_(b && b.subId || '');
  return !!(as && bs && as === bs);
}

function hbbMoneyForNote_(v) {
  var n = Number(v || 0);
  return n ? ('$' + n.toFixed(2)) : '$0.00';
}

function hbbDuplicateProductKey_(sup) {
  var brand = hbbUpper_(sup.translatedBrand || sup.rawBrand || '');
  var product = hbbUpper_(sup.cleanedProduct || sup.cleanProduct || sup.product || '');
  product = product.replace(/[™®©]/g, ' ');

  // Strip full brand and common supplier abbreviations at the start only.
  if (brand) product = product.replace(new RegExp('^' + hbbEscReg_(brand) + '\\b\\s*', 'i'), '');
  product = product.replace(/^(BC|BIOC|BIOCEUTICALS|BIO CEUTICALS)\b\s*/i, '');

  var pack = hbbDuplicatePackKey_(product);

  var name = product
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b\d+(?:\.\d+)?\s*(?:TABS?|TABLETS?|T|CAPSULES?|CAPS?|VCAPS?|V\s*CAPS?|VC|C|ML|L|LT|LTR|LITRE|G|GM|KG|MG|MCG|IU)\b/g, ' ')
    .replace(/\b\d{1,5}\b/g, ' ')
    .replace(/\b(ORAL|VEG|VEGE|VEGETARIAN|CAPSULES?|CAPS?|TABLETS?|TABS?|VCAPS?|SOFTGELS?|PWD|POWDER|LIQUID)\b/g, ' ')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { name: name, pack: pack };
}

function hbbDuplicatePackKey_(s) {
  s = hbbUpper_(s).replace(/V\s*CAPS?/g, 'VC').replace(/TABLETS?/g, 'T').replace(/TABS?/g, 'T').replace(/CAPSULES?/g, 'C').replace(/CAPS?/g, 'C');
  var m = s.match(/\b(\d+(?:\.\d+)?)\s*(VC|C|T|ML|LT|L|G|GM|KG|MG|MCG|IU)\b/);
  if (m) return String(parseFloat(m[1])) + hbbDuplicatePackUnit_(m[2]);
  m = s.match(/\((\d+(?:\.\d+)?)\)/);
  if (m) return String(parseFloat(m[1]));
  m = s.match(/\b(\d{1,5})\b/);
  return m ? String(parseFloat(m[1])) : '';
}


function hbbDuplicatePackUnit_(unit) {
  unit = hbbUpper_(unit).replace(/\s+/g, '');
  if (unit === 'GM') return 'G';
  if (unit === 'LTR' || unit === 'LITRE' || unit === 'L') return 'LT';
  if (unit === 'VCAPS' || unit === 'VCAP' || unit === 'V-CAPS') return 'VC';
  return unit;
}

function hbbDuplicatePackParts_(pack) {
  pack = hbbUpper_(pack).replace(/\s+/g, '');
  if (!pack) return { n: 0, unit: '' };
  var m = pack.match(/^(\d+(?:\.\d+)?)([A-Z]+)?$/);
  if (!m) return { n: 0, unit: '' };
  return { n: Number(m[1] || 0), unit: hbbDuplicatePackUnit_(m[2] || '') };
}

function hbbDuplicatePackCompatible_(packA, packB) {
  var a = hbbDuplicatePackParts_(packA);
  var b = hbbDuplicatePackParts_(packB);
  if (!a.n || !b.n) return false;
  if (Math.abs(a.n - b.n) > 0.0001) return false;
  if (!a.unit || !b.unit) return true; // e.g. "120T" vs "(120)"
  if (a.unit === b.unit) return true;
  if ((a.unit === 'VC' && b.unit === 'C') || (a.unit === 'C' && b.unit === 'VC')) return true;
  return false;
}

function hbbSupplierPriceClose_(a, b) {
  var aw = Number(a.wsp || 0), bw = Number(b.wsp || 0);
  var ar = Number(a.rrp || 0), br = Number(b.rrp || 0);
  var wspOk = aw > 0 && bw > 0 && Math.abs(aw - bw) <= 0.02;
  var rrpOk = ar > 0 && br > 0 && Math.abs(ar - br) <= 0.05;
  if (wspOk && rrpOk) return true;
  var ae = Number(a.effectivePrice || 0), be = Number(b.effectivePrice || 0);
  return ae > 0 && be > 0 && Math.abs(ae - be) <= 0.02 && rrpOk;
}

function hbbSupplierLabelForNote_(sup) {
  var name = hbbStr_(sup.supplierName || '');
  var num = hbbStr_(sup.supplierNum || '');
  if (name && num) return name + ' ' + num;
  return name || num || 'supplier';
}

// =============================================================================
// STATUS CSS FROM LEGEND ONLY
// =============================================================================
function hbbStatusStyle_(key) {
  var L = (typeof LEGEND !== 'undefined') ? LEGEND : {};
  // LEGEND remains the source of truth. The fallback values match LEGEND and are
  // only used if an old Setup file is accidentally paired with this Highlight file.
  var styles = {
    BEST_BUY_MATCHED: {
      bg: L.STATUS_MATCHED_BG || '#e8f0fe',
      fg: L.STATUS_MATCHED_FG || '#1565c0'
    },
    BEST_BUY_NEW: {
      bg: L.STATUS_NEW_BG || '#e6f4ea',
      fg: L.STATUS_NEW_FG || '#137333'
    },
    NOT_USED: {
      bg: L.STATUS_NOT_USED_BG || L.ALT_ODD || '#f5f5f5',
      fg: L.STATUS_NOT_USED_FG || L.STATUS_FG || '#9aa0a6'
    },
    UNMATCHABLE: {
      bg: L.STATUS_UNMATCHABLE_BG || '#fff3cd',
      fg: L.STATUS_UNMATCHABLE_FG || '#856404'
    },
    BLANK: {
      bg: L.STATUS_BLANK_BG || L.ALT_ODD || '#ffffff',
      fg: L.STATUS_FG || '#9aa0a6'
    }
  };
  return styles[key] || styles.BLANK;
}

function hbbReapplyStatusColumnCss_(sh, results) {
  if (!sh || !results || !results.length) return;
  var bgs = [], fgs = [];
  for (var i = 0; i < results.length; i++) {
    var st = results[i] && results[i].status ? results[i].status : '';
    var key = st === HBB.STATUS.BEST_BUY_MATCHED ? 'BEST_BUY_MATCHED' :
              st === HBB.STATUS.BEST_BUY_NEW ? 'BEST_BUY_NEW' :
              st === HBB.STATUS.NOT_USED ? 'NOT_USED' :
              st === HBB.STATUS.UNMATCHABLE ? 'UNMATCHABLE' : 'BLANK';
    var sty = hbbStatusStyle_(key);
    var baseBg = (i % 2 === 0)
      ? ((typeof LEGEND !== 'undefined' && LEGEND.ALT_ODD) ? LEGEND.ALT_ODD : '#f5f5f5')
      : ((typeof LEGEND !== 'undefined' && LEGEND.ALT_EVEN) ? LEGEND.ALT_EVEN : '#e9f0f5');
    bgs.push([(key === 'BLANK' || key === 'NOT_USED') ? baseBg : sty.bg]);
    fgs.push([key === 'BLANK' ? hbbStatusStyle_('BLANK').fg : sty.fg]);
  }
  sh.getRange(HBB.DATA_ROW, HBB.STATUS_COL, results.length, 1)
    .setBackgrounds(bgs)
    .setFontColors(fgs)
    .setFontFamily((typeof CFG !== 'undefined' && CFG.FONT && CFG.FONT.FAMILY) ? CFG.FONT.FAMILY : 'Google Sans')
    .setFontSize(8)
    .setFontStyle('italic')
    .setFontWeight('normal')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setNumberFormat('@');
}

// =============================================================================
// WRITE STATUS + SUMMARIES
// =============================================================================
function hbbWriteStatus_(sh, results) {
  var vals = [], bgs = [], fgs = [], notes = [];
  for (var i = 0; i < results.length; i++) {
    var st = results[i] && results[i].status ? results[i].status : '';
    var key = st === HBB.STATUS.BEST_BUY_MATCHED ? 'BEST_BUY_MATCHED' :
              st === HBB.STATUS.BEST_BUY_NEW ? 'BEST_BUY_NEW' :
              st === HBB.STATUS.NOT_USED ? 'NOT_USED' :
              st === HBB.STATUS.UNMATCHABLE ? 'UNMATCHABLE' : 'BLANK';
    var sty = hbbStatusStyle_(key);
    vals.push([st]);

    // Blank supplier rows should go back to the normal alternating sheet colour,
    // not plain white. Status rows still get their status colour.
    var baseBg = (i % 2 === 0)
      ? ((typeof LEGEND !== 'undefined' && LEGEND.ALT_ODD) ? LEGEND.ALT_ODD : '#f5f5f5')
      : ((typeof LEGEND !== 'undefined' && LEGEND.ALT_EVEN) ? LEGEND.ALT_EVEN : '#e9f0f5');
    // NOT USED rows should not introduce red visual emphasis in the supplier sheet.
    // Keep the STATUS cell on the normal zebra background; the whole row text is
    // softened to #9aa0a6 by hbbApplyNotUsedRowTextColour_ below.
    bgs.push([(key === 'BLANK' || key === 'NOT_USED') ? baseBg : sty.bg]);
    fgs.push([key === 'BLANK' ? ((typeof LEGEND !== 'undefined' && LEGEND.STATUS_FG) ? LEGEND.STATUS_FG : '#9aa0a6') : sty.fg]);
    notes.push([hbbTrimNote_(results[i] ? results[i].note : '')]);
  }

  var rng = sh.getRange(HBB.DATA_ROW, HBB.STATUS_COL, results.length, 1);

  // One final output pass. No separate pre-clear is required because these
  // batched calls replace every visible STATUS cell, background and note.
  rng.setValues(vals)
    .setBackgrounds(bgs)
    .setFontColors(fgs)
    .setFontFamily(CFG.FONT && CFG.FONT.FAMILY ? CFG.FONT.FAMILY : 'Google Sans')
    .setFontSize(8)
    .setFontStyle('italic')
    .setFontWeight('normal')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setNumberFormat('@');

  if (HBB.WRITE_NOTES) {
    // Batch only: never fall back to per-row setNote() calls.
    try { rng.setNotes(notes); } catch(e) { try { rng.clearNote(); } catch(_) {} }
  } else {
    try { rng.clearNote(); } catch(eNoNotes) {}
  }

  hbbApplyNotUsedRowTextColour_(sh, results);
  // Final narrow re-application on Column P only. This protects the visible
  // STATUS colour if any row-level text/style operation ran after the STATUS
  // write. It does not touch values or notes.
  hbbReapplyStatusColumnCss_(sh, results);
}

function hbbApplyNotUsedRowTextColour_(sh, results) {
  if (!sh || !results || !results.length) return;
  var lastCol = Math.max(HBB.STATUS_COL, Math.min(sh.getLastColumn(), HBB.STATUS_COL));
  var dataFg = (typeof LEGEND !== 'undefined' && LEGEND.DATA_FG) ? LEGEND.DATA_FG : '#1c2833';
  var mutedFg = (typeof LEGEND !== 'undefined' && LEGEND.STATUS_FG) ? LEGEND.STATUS_FG : '#9aa0a6';

  var fontColours = new Array(results.length);
  for (var r = 0; r < results.length; r++) {
    var st = results[r] && results[r].status ? results[r].status : '';
    var isNotUsed = st === HBB.STATUS.NOT_USED;
    var row = new Array(lastCol);
    for (var c = 0; c < lastCol; c++) row[c] = isNotUsed ? mutedFg : dataFg;

    // Preserve the STATUS column's meaningful text colour for non-NOT USED rows.
    if (!isNotUsed) {
      var key = st === HBB.STATUS.BEST_BUY_MATCHED ? 'BEST_BUY_MATCHED' :
                st === HBB.STATUS.BEST_BUY_NEW ? 'BEST_BUY_NEW' :
                st === HBB.STATUS.UNMATCHABLE ? 'UNMATCHABLE' : 'BLANK';
      var sty = hbbStatusStyle_(key);
      row[HBB.STATUS_COL - 1] = key === 'BLANK' ? mutedFg : sty.fg;
    } else {
      row[HBB.STATUS_COL - 1] = mutedFg;
    }

    fontColours[r] = row;
  }

  // Text colour only. No background, borders, row heights, values or notes changed.
  sh.getRange(HBB.DATA_ROW, 1, results.length, lastCol).setFontColors(fontColours);
}

function hbbSummarise_(results) {
  var s = { bestBuyMatched:0, bestBuyNew:0, notUsed:0, unmatchable:0, blank:0 };
  for (var i = 0; i < results.length; i++) {
    var st = results[i] && results[i].status ? results[i].status : '';
    if (st === HBB.STATUS.BEST_BUY_MATCHED) s.bestBuyMatched++;
    else if (st === HBB.STATUS.BEST_BUY_NEW) s.bestBuyNew++;
    else if (st === HBB.STATUS.NOT_USED) s.notUsed++;
    else if (st === HBB.STATUS.UNMATCHABLE) s.unmatchable++;
    else s.blank++;
  }
  return s;
}

function hbbSummariseFromStatusColumn_(sh) {
  var s = { bestBuyMatched:0, bestBuyNew:0, notUsed:0, unmatchable:0, blank:0 };
  var lastRow = sh.getLastRow();
  if (lastRow < HBB.DATA_ROW) return s;
  var vals = sh.getRange(HBB.DATA_ROW, HBB.STATUS_COL, lastRow - HBB.DATA_ROW + 1, 1).getDisplayValues();
  for (var i = 0; i < vals.length; i++) {
    var st = hbbUpper_(vals[i][0]);
    if (st.indexOf('BEST BUY') >= 0 && st.indexOf('MATCHED') >= 0) s.bestBuyMatched++;
    else if (st.indexOf('BEST BUY') >= 0 && st.indexOf('NEW') >= 0) s.bestBuyNew++;
    else if (st.indexOf('NOT USED') >= 0) s.notUsed++;
    else if (st.indexOf('UNMATCHABLE') >= 0) s.unmatchable++;
    else s.blank++;
  }
  return s;
}

function hbbWriteHeaderSummary_(sh, s, t0) {
  var elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  var text = 'Matched: ' + fmt_(s.bestBuyMatched) +
    ' | New: ' + fmt_(s.bestBuyNew) +
    ' | Not Used: ' + fmt_(s.notUsed) +
    ' | Unmatchable: ' + fmt_(s.unmatchable) +
    ' | Blank: ' + fmt_(s.blank) +
    ' | ' + elapsed + 's';

  try {
    sh.getRange(1, HBB.STATUS_COL).setValue(text)
      .setBackground(LEGEND.TITLE_BG)
      .setFontColor(LEGEND.TITLE_FG)
      .setFontWeight('bold')
      .setFontStyle('normal')
      .setHorizontalAlignment('center')
      .setWrap(true);
  } catch(e) {}
}

function hbbWinnerNote_(r, groupSize) {
  var sup = r.supplier, pos = r.pos;
  var parts = [];
  parts.push('WINNER: ' + r.status);
  parts.push('Barcode family rows: ' + groupSize);
  parts.push('Supplier: ' + (sup.supplierName || sup.supplierNum || '—'));
  parts.push('Supplier Active in POS: ' + (sup.isActive ? 'Yes (USED)' : 'No (UNUSED/NEW)'));
  parts.push('Original Brand: ' + (sup.rawBrand || '—'));
  parts.push('Translated Brand: ' + (sup.translatedBrand || '—'));
  parts.push('Product: ' + (sup.product || '—'));
  parts.push('Cleaned Product: ' + (sup.cleanedProduct || sup.cleanProduct || '—'));
  if (sup.expectedPrefix) parts.push('Expected Prefix: ' + sup.expectedPrefix + ' | Prefix Looks Valid: ' + (sup.prefixValid ? 'Yes' : 'Check'));
  parts.push('Effective WSP: ' + (sup.effectivePrice || '—'));

  if (sup.discountPct) {
    parts.push('Discount Applied: ' + sup.discountPct + '% (' + (sup.discountType || 'unknown') + ')');
    parts.push('Discount Source: ' + (sup.discountSource || '—'));
  }

  parts.push('In stock: ' + (sup.inStock ? 'Yes' : 'No'));
  if (pos) parts.push('POS match: PLU ' + (pos.plu || '—') + ' | ' + (pos.brand || '—') + ' | ' + (pos.descr || '—'));
  parts.push('Score: ' + (r.score || 0));
  return parts.join('\n');
}

function hbbLoserNote_(r, winner) {
  var sup = r.supplier, win = winner.supplier;
  return [
    'NOT USED: duplicate barcode family / non-winner.',
    'This row remains visible but is not the selected best-buy source.',
    'This supplier: ' + (sup.supplierName || sup.supplierNum || '—') +
      ' | Brand: ' + (sup.translatedBrand || sup.rawBrand || '—') +
      ' | Effective WSP ' + (sup.effectivePrice || '—') +
      ' | Score ' + (r.score || 0),
    'Winner: ' + (win.supplierName || win.supplierNum || '—') +
      ' | Effective WSP ' + (win.effectivePrice || '—') +
      ' | Score ' + (winner.score || 0)
  ].join('\n');
}

function hbbTrimNote_(s) {
  s = hbbStr_(s);
  return s.length > HBB.MAX_NOTE_LEN ? s.slice(0, HBB.MAX_NOTE_LEN - 3) + '...' : s;
}


// =============================================================================
// STATUS RESET + INDEX PRESERVATION
// =============================================================================
function hbbResetStatusColumnForRun_(sh) {
  if (!sh || sh.getLastRow() < HBB.DATA_ROW) return 0;
  hbbEnsureCol_(sh, HBB.STATUS_COL);

  var nRows = sh.getLastRow() - HBB.DATA_ROW + 1;
  if (typeof preflightReset_ === 'function') {
    return preflightReset_(sh, {
      row: HBB.DATA_ROW,
      col: HBB.STATUS_COL,
      rows: nRows,
      cols: 1,
      clearContent: true,
      clearNotes: true,
      resetBackground: true,
      resetTextStyle: true,
      fontColor: (typeof LEGEND !== 'undefined' ? LEGEND.STATUS_FG : null),
      fontStyle: 'italic',
      horizontalAlignment: 'center',
      verticalAlignment: 'middle',
      numberFormat: '@'
    });
  }

  var rng = sh.getRange(HBB.DATA_ROW, HBB.STATUS_COL, nRows, 1);
  rng.clearContent();
  try { rng.clearNote(); } catch(eNote) {}
  rng.setFontColor((typeof LEGEND !== 'undefined') ? LEGEND.STATUS_FG : null)
    .setFontStyle('italic')
    .setFontWeight('normal')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setNumberFormat('@');
  hbbApplyStatusBaseBackground_(sh, nRows);
  return nRows;
}

function hbbApplyStatusBaseBackground_(sh, nRows) {
  if (!sh || nRows <= 0) return;
  hbbEnsureCol_(sh, HBB.STATUS_COL);
  var odd = (typeof LEGEND !== 'undefined') ? LEGEND.ALT_ODD : null;
  var even = (typeof LEGEND !== 'undefined') ? LEGEND.ALT_EVEN : null;
  var bgs = new Array(nRows);
  for (var i = 0; i < nRows; i++) bgs[i] = [(i % 2 === 0) ? odd : even];
  sh.getRange(HBB.DATA_ROW, HBB.STATUS_COL, nRows, 1).setBackgrounds(bgs);
}

function hbbSnapshotIndexColumn_(sh) {
  if (!sh || sh.getLastRow() < HBB.DATA_ROW) return null;
  var nRows = sh.getLastRow() - HBB.DATA_ROW + 1;
  var rng = sh.getRange(HBB.DATA_ROW, 1, nRows, 1);
  var values = rng.getValues();
  var formulas = rng.getFormulas();
  var display = rng.getDisplayValues();
  var mixed = new Array(nRows);
  for (var i = 0; i < nRows; i++) mixed[i] = [formulas[i][0] || values[i][0]];
  return { rows: nRows, display: display, mixed: mixed };
}

function hbbRestoreIndexColumnIfChanged_(sh, snap) {
  if (!sh || !snap || !snap.rows || sh.getLastRow() < HBB.DATA_ROW) return false;
  var nRows = Math.min(snap.rows, sh.getLastRow() - HBB.DATA_ROW + 1);
  if (nRows <= 0) return false;

  var cur = sh.getRange(HBB.DATA_ROW, 1, nRows, 1).getDisplayValues();
  var changed = false;
  for (var i = 0; i < nRows; i++) {
    if (String(cur[i][0]) !== String(snap.display[i][0])) { changed = true; break; }
  }
  if (!changed) return false;

  sh.getRange(HBB.DATA_ROW, 1, nRows, 1).setValues(snap.mixed.slice(0, nRows));
  return true;
}

// =============================================================================
// LOCAL SRC LOADERS
// =============================================================================
function hbbLoadBrandMap_(ss) {
  return posKingLoadBrandMap_(ss);
}

function hbbLoadSupplierMap_(ss) {
  var map = {};
  var sh = hbbSheet_(ss, CFG.SH.SRC_SUPP, false);
  if (!sh || sh.getLastRow() < HBB.DATA_ROW) return map;
  var vals = sh.getRange(HBB.DATA_ROW, 1, sh.getLastRow() - HBB.DATA_ROW + 1, Math.min(sh.getLastColumn(), 4)).getDisplayValues();
  for (var i = 0; i < vals.length; i++) {
    var num = hbbStr_(vals[i][1]);
    var name = hbbStr_(vals[i][2]);
    if (num) map[num] = name;
  }
  return map;
}

function hbbIsBlockedSupplierStatus_(status) {
  var s = hbbUpper_(status).replace(/[^A-Z0-9]+/g, ' ').trim();
  if (!s) return false;
  return /^(BLOCK|BLOCKED|EXCLUDE|EXCLUDED|DO NOT USE|DNU|UNUSED|INACTIVE|DISABLED|NO|N|FALSE|NOT USED)$/.test(s);
}

function hbbIsUsedSupplierStatus_(status) {
  var s = hbbUpper_(status).replace(/[^A-Z0-9]+/g, ' ').trim();
  return /^(USED|ACTIVE|YES|Y|TRUE)$/.test(s);
}

function hbbLoadActiveSuppliers_(ss) {
  // v6.3.61: this is no longer a whitelist.
  // SRC_POS_SUPPLIERS D / SRC STATUS is a current-use marker unless a row is
  // explicitly blocked. Blank status is allowed so current supplier uploads
  // such as CABOT HEALTH / 691 can still enter barcode-family best-buy matching.
  var active = { __blocked: {}, __used: {}, __blockedCount: 0, __usedCount: 0 };
  var sh = hbbSheet_(ss, CFG.SH.SRC_SUPP, false);
  if (!sh || sh.getLastRow() < HBB.DATA_ROW) return active;

  var headers = hbbHeaderMap_(sh, HBB.HEADER_ROW);
  var data = sh.getRange(HBB.DATA_ROW, 1, sh.getLastRow() - HBB.DATA_ROW + 1, sh.getLastColumn()).getDisplayValues();

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var accno = hbbStr_(hbbColValFallback_(row, headers, ['POS ACCNO', 'ACCNO', 'POS SUPPLIER NUMBER', 'SUPPLIER NUMBER', 'SUPPLIER NO', 'SUPPLIER'], 1));
    var status = hbbUpper_(hbbColValFallback_(row, headers, ['SRC STATUS', 'STATUS', 'USED STATUS'], 3));
    if (!accno) continue;

    var rawKey = accno;
    var normKey = hbbNormId_(accno);
    if (hbbIsBlockedSupplierStatus_(status)) {
      active.__blocked[rawKey] = true;
      active.__blocked[normKey] = true;
      active.__blockedCount++;
    } else if (hbbIsUsedSupplierStatus_(status)) {
      active.__used[rawKey] = true;
      active.__used[normKey] = true;
      active.__usedCount++;
    }
  }

  return active;
}

function hbbIsSupplierActive_(supplierNum, activeSuppliers) {
  if (!activeSuppliers || !activeSuppliers.__blocked) return true;
  var raw = hbbStr_(supplierNum);
  var key = hbbNormId_(supplierNum);
  return !(activeSuppliers.__blocked[raw] || activeSuppliers.__blocked[key]);
}

function hbbLoadPrefixMap_(ss) {
  var map = { __brandToPrefix: {}, __activePrefixes: {} };
  var sheetName = CFG.SH.SRC_PREFIX || 'SRC_POS_PRODUCT_PREFIX';
  var sh = hbbSheet_(ss, sheetName, false);
  if (!sh || sh.getLastRow() < HBB.DATA_ROW) return map;

  var headers = hbbHeaderMap_(sh, HBB.HEADER_ROW);
  var data = sh.getRange(HBB.DATA_ROW, 1, sh.getLastRow() - HBB.DATA_ROW + 1, sh.getLastColumn()).getDisplayValues();

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var brand = hbbStr_(hbbColValFallback_(row, headers, ['POS BRAND', 'BRAND'], 1));
    var prefix = hbbStr_(hbbColValFallback_(row, headers, ['POS PREFIX', 'PREFIX'], 2));
    var status = hbbUpper_(hbbColValFallback_(row, headers, ['SRC STATUS', 'STATUS'], 4));
    if (!brand || !prefix) continue;

    map.__brandToPrefix[hbbUpper_(brand)] = prefix;
    map.__brandToPrefix[hbbNormBrand_(brand)] = prefix;
    if (!status || status === 'USED') map.__activePrefixes[prefix] = true;
  }

  return map;
}

function hbbExpectedPrefixForBrand_(brand, prefixMap) {
  if (!prefixMap || !prefixMap.__brandToPrefix) return '';
  var raw = hbbStr_(brand);
  return prefixMap.__brandToPrefix[hbbUpper_(raw)] || prefixMap.__brandToPrefix[hbbNormBrand_(raw)] || '';
}

function hbbPrefixLooksValid_(product, expectedPrefix) {
  if (!expectedPrefix) return true;
  var p = hbbNormText_(product);
  var pref = hbbNormText_(expectedPrefix);
  if (!p || !pref) return true;
  return p.indexOf(pref) === 0 || p.indexOf(pref + ' ') === 0;
}


function hbbLoadFindReplaceRules_(ss) {
  var rules = [];
  var sh = hbbSheet_(ss, CFG.SH.SRC_FR, false);
  if (!sh || sh.getLastRow() < HBB.DATA_ROW) return rules;
  var vals = sh.getRange(HBB.DATA_ROW, 1, sh.getLastRow() - HBB.DATA_ROW + 1, Math.min(sh.getLastColumn(), 4)).getDisplayValues();
  for (var i = 0; i < vals.length; i++) {
    var find = hbbStr_(vals[i][1]).toUpperCase();
    var repl = hbbStr_(vals[i][2]).toUpperCase();
    if (find) rules.push({ find: find, replace: repl });
  }
  rules.sort(function(a, b) { return String(b.find || '').length - String(a.find || '').length; });
  return rules;
}

function hbbEmptyDiscountRules_() {
  return { byPlu: {}, byBarcode: {}, byBrandSupplier: [], byBrand: [], bySupplier: [] };
}

function hbbColValFallback_(row, map, candidates, fallbackIndex) {
  var v = hbbColVal_(row, map, candidates);
  if (v !== '' && v != null) return v;
  if (fallbackIndex != null && fallbackIndex >= 0 && fallbackIndex < row.length) return row[fallbackIndex];
  return '';
}

function hbbDiscountPctFromDiscountOrMaintenance_(discountRaw, maintenanceRaw) {
  // SRC_POS_ONGOING_DISCOUNTS column H is the explicit discount percentage.
  // Column I is usually the maintenance/remaining percentage, e.g. 30% discount → 70.00% maintenance.
  var disc = hbbPct_(discountRaw);
  if (disc > 0) return +disc.toFixed(4);

  var maintenance = hbbPct_(maintenanceRaw);
  if (maintenance > 0 && maintenance < 100) return +(100 - maintenance).toFixed(4);
  return 0;
}

function hbbDiscountType_(supplierNum, brandRaw, plu, barcodeRaw, descr) {
  if (plu) return 'PLU MATCH';
  if (barcodeRaw) return 'BARCODE MATCH';
  if (supplierNum && brandRaw) return 'BRAND + SUPPLIER';
  if (brandRaw) return 'BRAND ONLY';
  if (supplierNum) return 'SUPPLIER ONLY';
  if (descr) return 'DESCRIPTION';
  return 'GENERAL';
}

function hbbKeepBestRule_(bucket, key, rule) {
  if (!key) return;
  if (!bucket[key] || Number(rule.pct || 0) > Number(bucket[key].pct || 0)) bucket[key] = rule;
}

function hbbPushBestComboRule_(list, brandKey, supplierKey, rule) {
  for (var i = 0; i < list.length; i++) {
    if (list[i].brandKey === brandKey && list[i].supplierKey === supplierKey) {
      if (Number(rule.pct || 0) > Number(list[i].rule.pct || 0)) list[i].rule = rule;
      return;
    }
  }
  list.push({ brandKey: brandKey, supplierKey: supplierKey, rule: rule });
}

function hbbPushBestBrandRule_(list, brandKey, rule) {
  for (var i = 0; i < list.length; i++) {
    if (list[i].brandKey === brandKey) {
      if (Number(rule.pct || 0) > Number(list[i].rule.pct || 0)) list[i].rule = rule;
      return;
    }
  }
  list.push({ brandKey: brandKey, rule: rule });
}

function hbbPushBestSupplierRule_(list, supplierKey, rule) {
  for (var i = 0; i < list.length; i++) {
    if (list[i].supplierKey === supplierKey) {
      if (Number(rule.pct || 0) > Number(list[i].rule.pct || 0)) list[i].rule = rule;
      return;
    }
  }
  list.push({ supplierKey: supplierKey, rule: rule });
}

function hbbRuleReturn_(rule) {
  return { pct: Number(rule && rule.pct || 0), label: rule && rule.label || '', type: rule && rule.type || '' };
}


function hbbLoadDiscountRules_(ss, brandMap) {
  var rules = hbbEmptyDiscountRules_();
  var sh = hbbSheet_(ss, CFG.SH.SRC_DISC, false);
  if (!sh || sh.getLastRow() < HBB.DATA_ROW) return rules;

  var headers = hbbHeaderMap_(sh, HBB.HEADER_ROW);
  var data = sh.getRange(HBB.DATA_ROW, 1, sh.getLastRow() - HBB.DATA_ROW + 1, sh.getLastColumn()).getDisplayValues();

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var brandRaw = hbbStr_(hbbColValFallback_(row, headers, ['POS MASTER BRAND', 'POS BRAND PREFIX', 'POS BRAND', 'BRAND'], 1));
    var supplierNum = hbbStr_(hbbColValFallback_(row, headers, ['POS SUPPLIER NUMBER', 'SUPPLIER NUMBER', 'SUPPLIER NO', 'SUPPLIER'], 3));
    var plu = hbbStr_(hbbColValFallback_(row, headers, ['POS PLU', 'PLU'], 4));
    var barcodeRaw = hbbStr_(hbbColValFallback_(row, headers, ['POS MASTER BARCODE', 'MASTER BARCODE', 'BARCODE'], 5));
    var descr = hbbStr_(hbbColValFallback_(row, headers, ['POS DESCR', 'DESCR', 'DESCRIPTION'], 6));
    var discountRaw = hbbColValFallback_(row, headers, ['POS DISCOUNT%', 'DISCOUNT%', 'DISCOUNT %', 'DISCOUNT'], 7);
    var maintenanceRaw = hbbColValFallback_(row, headers, ['POS MARKUP%', 'MARKUP%', 'MAINTAINING %', 'MAINTAINING%', 'MAINTENANCE %'], 8);

    var pct = hbbDiscountPctFromDiscountOrMaintenance_(discountRaw, maintenanceRaw);
    if (!pct) continue;

    var translatedBrand = hbbTranslateBrand_(brandRaw, brandMap);
    var brandKey = hbbNormBrand_(translatedBrand || brandRaw);
    var supplierKey = hbbNormId_(supplierNum);
    var barcode = hbbBarcode_(barcodeRaw);

    var rule = {
      pct: pct,
      label: (brandRaw || 'DISCOUNT') + (supplierNum ? ' / SUP ' + supplierNum : ''),
      type: hbbDiscountType_(supplierNum, brandRaw, plu, barcodeRaw, descr),
      brandKey: brandKey,
      supplierNum: supplierNum,
      supplierKey: supplierKey,
      plu: plu,
      barcode: barcode.canonical,
      descr: hbbNormText_(descr)
    };

    // Store in explicit priority buckets. If duplicates exist inside a bucket,
    // keep the highest discount within that same priority only.
    if (plu) hbbKeepBestRule_(rules.byPlu, hbbNormId_(plu), rule);
    if (barcode.canonical) hbbKeepBestRule_(rules.byBarcode, barcode.canonical, rule);

    if (brandKey && supplierKey) {
      hbbPushBestComboRule_(rules.byBrandSupplier, brandKey, supplierKey, rule);
    } else if (brandKey) {
      hbbPushBestBrandRule_(rules.byBrand, brandKey, rule);
    } else if (supplierKey) {
      hbbPushBestSupplierRule_(rules.bySupplier, supplierKey, rule);
    }
  }

  return rules;
}

function hbbBestDiscountForSupplier_(sup, rules) {
  if (!rules) return { pct: 0, label: '', type: '' };

  // Backward compatibility if an older array-based rules object is passed in.
  if (Object.prototype.toString.call(rules) === '[object Array]') {
    var best = { pct: 0, label: '', type: '' };
    for (var i = 0; i < rules.length; i++) {
      var old = rules[i];
      if (old.supplier && hbbNormId_(old.supplier) !== hbbNormId_(sup.supplierNum)) continue;
      if (old.brandKey && old.brandKey !== sup.brandKey) continue;
      if (old.barcode && old.barcode !== sup.barcode.canonical && sup.barcode.variants.indexOf(old.barcode) < 0) continue;
      if (old.descr && hbbNormText_(sup.product).indexOf(old.descr) < 0 && old.descr.indexOf(hbbNormText_(sup.product)) < 0) continue;
      if (old.pct > best.pct) best = { pct: old.pct, label: old.label || '', type: old.type || '' };
    }
    return best;
  }

  var subKey = hbbNormId_(sup.subId || '');
  var supplierKey = hbbNormId_(sup.supplierNum || '');
  var brandKey = hbbNormBrand_(sup.translatedBrand || sup.rawBrand || '');

  // Priority 1: PLU / Sub-ID
  if (subKey && rules.byPlu && rules.byPlu[subKey]) return hbbRuleReturn_(rules.byPlu[subKey]);

  // Priority 2: Barcode, checking all normalized variants.
  if (sup.barcode && sup.barcode.variants && rules.byBarcode) {
    for (var i = 0; i < sup.barcode.variants.length; i++) {
      var bc = sup.barcode.variants[i];
      if (rules.byBarcode[bc]) return hbbRuleReturn_(rules.byBarcode[bc]);
    }
  }

  // Priority 3: Brand + Supplier
  if (brandKey && supplierKey && rules.byBrandSupplier) {
    for (var j = 0; j < rules.byBrandSupplier.length; j++) {
      var bs = rules.byBrandSupplier[j];
      if (bs.brandKey === brandKey && bs.supplierKey === supplierKey) return hbbRuleReturn_(bs.rule);
    }
  }

  // Priority 4: Brand only
  if (brandKey && rules.byBrand) {
    for (var k = 0; k < rules.byBrand.length; k++) {
      var br = rules.byBrand[k];
      if (br.brandKey === brandKey) return hbbRuleReturn_(br.rule);
    }
  }

  // Priority 5: Supplier only
  if (supplierKey && rules.bySupplier) {
    for (var m = 0; m < rules.bySupplier.length; m++) {
      var sp = rules.bySupplier[m];
      if (sp.supplierKey === supplierKey) return hbbRuleReturn_(sp.rule);
    }
  }

  return { pct: 0, label: '', type: '' };
}

// =============================================================================
// UTILITIES — prefixed to avoid fighting Setup.gs helper names
// =============================================================================
function hbbSheet_(ss, name, required) {
  var sh = ss.getSheetByName(name);
  if (!sh && required) throw new Error('Missing required sheet: ' + name);
  return sh;
}

function hbbEnsureCol_(sh, col) {
  if (sh.getMaxColumns() < col) sh.insertColumnsAfter(sh.getMaxColumns(), col - sh.getMaxColumns());
}

function hbbRestoreFilter_(sh) {
  // v6.3.4: do not remove/recreate an existing filter. That is slower and it
  // can disrupt the user's current filtered view. Only create row-2 filter if
  // it is missing.
  try {
    if (sh.getFilter()) return;
    var lr = sh.getLastRow(), lc = sh.getLastColumn();
    if (lr >= 2 && lc >= 1) sh.getRange(2, 1, Math.max(lr - 1, 1), lc).createFilter();
  } catch(e) {}
}

function hbbHeaderMap_(sh, rowNum) {
  var vals = sh.getRange(rowNum || 2, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
  var map = {};
  for (var i = 0; i < vals.length; i++) {
    var key = hbbUpper_(vals[i]);
    if (key && map[key] == null) map[key] = i;
  }
  return map;
}

function hbbColVal_(row, map, candidates) {
  for (var i = 0; i < candidates.length; i++) {
    var idx = map[hbbUpper_(candidates[i])];
    if (idx != null && idx >= 0 && idx < row.length) {
      var v = row[idx];
      if (v !== '' && v != null) return v;
    }
  }
  return '';
}

function hbbBarcode_(raw) {
  return posKingBarcodeObject_(raw);
}

function hbbTranslateBrand_(brand, map) {
  return posKingTranslateBrand_(brand, map);
}

function hbbApplyFindReplace_(text, rules) {
  var out = hbbStr_(text).toUpperCase();
  if (!rules || !rules.length) return out;

  var phrase = [], token = [];
  for (var i = 0; i < rules.length; i++) {
    var f = hbbStr_(rules[i].find).toUpperCase();
    if (!f) continue;
    if (/^[A-Z0-9]+$/.test(f)) token.push(rules[i]);
    else phrase.push(rules[i]);
  }

  function applyList(list, useBoundary) {
    for (var j = 0; j < list.length; j++) {
      var find = hbbStr_(list[j].find).toUpperCase();
      var repl = hbbStr_(list[j].replace).toUpperCase();
      if (!find) continue;
      try {
        var pattern = useBoundary && /^[A-Z0-9]+$/.test(find)
          ? '\\b' + hbbEscReg_(find) + '\\b'
          : hbbEscReg_(find);
        out = out.replace(new RegExp(pattern, 'g'), repl);
      } catch(e) {}
    }
    out = out.replace(/\s+/g, ' ').trim();
  }

  // Match the full merge behaviour more closely:
  // longest phrase rules → token rules → phrase rules again.
  applyList(phrase, false);
  applyList(token, true);
  applyList(phrase, false);

  return out.replace(/\s+/g, ' ').trim();
}

function hbbEscReg_(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function hbbStr_(v) { return String(v == null ? '' : v).trim(); }
function hbbUpper_(v) { return hbbStr_(v).toUpperCase(); }
function hbbNum_(v) { var n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; }
function hbbPct_(v) { var n = hbbNum_(v); if (n > 0 && n <= 1) n = n * 100; return n > 0 ? n : 0; }
function hbbNormBrand_(s) { return hbbUpper_(s).replace(/^Z+\s*/,'').replace(/[^A-Z0-9]/g,'').slice(0, 24); }
function hbbNormId_(s) { return hbbUpper_(s).replace(/[^A-Z0-9]/g,''); }
function hbbNormText_(s) { return hbbUpper_(s).replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim(); }

function hbbDice_(a, b) {
  a = hbbNormText_(a); b = hbbNormText_(b);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  var m = {}, i;
  for (i = 0; i < a.length - 1; i++) m[a.slice(i, i + 2)] = (m[a.slice(i, i + 2)] || 0) + 1;
  var inter = 0, total = a.length - 1 + b.length - 1;
  for (i = 0; i < b.length - 1; i++) {
    var g = b.slice(i, i + 2);
    if (m[g]) { inter++; m[g]--; }
  }
  return (2 * inter) / total;
}

// =============================================================================
// END — 1.2 - HighlightNewProductsBestBuy.gs
// =============================================================================