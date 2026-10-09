// =============================================================================
//  POS DB & SUPPLIER MERGE
//  1.0 - Setup.gs
//  Script version: v6.3.87-paste-auto-tidy-v1
//
//  Contains: SCRIPT_VERSION, LEGEND, CSS_, CFG, SCHEMA, menu, format engine,
//            clear helpers, status column helpers, primitive helpers.
//
//  Companion files:
//    1.1 - FormatClearPopup.gs  — Format / Clear modal dialog
//    1.2 - HighlightNewProductsBestBuy.gs — Supplier highlight + best-buy only
//    1.3 - Merge.gs — full + FB3 direct-scoped filtered-brand OUT builder with FB4 output cleanup
// =============================================================================

// v6.3.44 correction:
//   - OUT_MERGED_DATA grey/no-change formatting is font-only so native zebra
//     banding stays visible.
//   - Adds a lightweight onEdit formatter that strips pasted/keyed data-area
//     styling back to plain text while preserving row 1/2 structure.
// v6.3.47 TMP robust format correction:
//   - TMP_MERGED_POS_DATA format now uses chunked body text styling, native
//     banding, a forced INDEX rebuild, and a forced row-2 filter reset.
//   - TMP Clear is content-only and preserves row capacity/styles for repaste.
// v6.3.77 filtered-brand early-scope correction:
//   - Adds the filtered-brand build menu path immediately after Highlight.
//   - Adds a lightweight STATUS source-generation fingerprint so filtered builds
//     can reuse current Highlight results without re-running Highlight unnecessarily.
//   - Relevant supplier/TMP/SRC edits invalidate that fingerprint; filter changes do not.
// v6.3.78 filtered-brand scope v2 support:
//   - Keeps the same STATUS freshness protection and menu workflow.
//   - Filtered-path performance helpers are isolated under the m13FB2 prefix
//     in 1.3 so they cannot collide with the established merge/helper namespace.
//   - Full BUILD OUT_MERGED_DATA behaviour remains unchanged.
// v6.3.79 filtered-brand direct TMP scope v3 support:
//   - Keeps the same early Column-E supplier brand scope and STATUS freshness gate.
//   - New filtered-only TMP selector helpers are isolated under m13FB3.
//   - Removes the active FB2 scratch-formula/flush selector from the filtered path;
//     direct range TextFinder candidate searches are exact-verified before full row reads.
//   - Full BUILD OUT_MERGED_DATA behaviour remains unchanged.
// v6.3.80 filtered-brand clean-output v4 support:
//   - Keeps the m13FB3 direct TMP selector and existing scoped merge engine.
//   - Restores the established OUT_MERGED_DATA physical excess-row cleanup for
//     filtered builds through isolated m13FB4 output-preparation hand-off.
//   - Full BUILD OUT_MERGED_DATA behaviour remains unchanged.
// v6.3.82 new-product brand price-level support:
//   - Keeps every existing merge, pricing, review, barcode, description, export,
//     filtered-build and safety rule intact.
//   - Full-build performance helpers remain isolated under the m13FM1 prefix in 1.3.
//   - NEW PRODUCT brand price-level inheritance is isolated under m13PL1 in 1.3.
//   - Preserves the user's requested custom menu text and order exactly.
// v6.3.83 NEW PRODUCT price-level RRP independence:
//   - Version alignment only in Setup; the surgical PL2 correction is isolated in 1.3 Merge.
//   - Exact custom menu order/text, formatting, schema, STATUS fingerprint and document-lock behaviour remain unchanged.
// v6.3.84 schema-aware edit-style retention:
//   - Replaces the blanket onEdit left/text restyle with a single schema-aware edit guard.
//   - Ordinary single-cell keying retains existing alignment/number formatting unless a column has an explicit native rule.
//   - Multi-cell edits/pastes normalise only the edited range, column by column, using existing SCHEMA alignment/text rules and established OUT/SRC number formats.
//   - No merge, pricing, matching, STATUS, export, menu, filtered-build or document-lock behaviour changed.
// v6.3.87 paste auto-tidy:
//   - onEdit: data pasted into an input / SRC sheet (not OUT_*) now gets column A INDEX renumbered,
//     native alternating-row colours extended over all data rows (pasted fill cleared so banding shows),
//     spare rows/columns trimmed and the row-2 filter added/extended. Single-cell keying only tidies a new row.
//   - Existing style guard, STATUS fingerprint, source-sheet helpers and OUT edit router unchanged.
var SCRIPT_VERSION = 'v6.3.87-paste-auto-tidy-v1';

// =============================================================================
//  COLOUR LEGEND
//  Single source of truth for every colour used across sheets and popups.
//  Change any value here and it propagates everywhere automatically.
// =============================================================================
var LEGEND = {
  // ── Sheet chrome (rows 1–2) ─────────────────────────────────────────────
  TITLE_BG: '#1e3a5f',   // Row 1 background — deep navy
  TITLE_FG: '#ffd966',   // Row 1 text — gold
  HDR_BG:   '#e9f0f5',   // Row 2 background — light blue-grey
  HDR_FG:   '#2c3e50',   // Row 2 text — dark navy
  DATA_FG:  '#1c2833',   // Default data text — near-black

  // ── Alternating rows ─────────────────────────────────────────────────────
  ALT_ODD:  '#f5f5f5',   // Odd rows  — light grey      (rows 3,5,7…)
  ALT_EVEN: '#e9f0f5',   // Even rows — light blue-grey (rows 4,6,8…)

  // ── OUT_MERGED_DATA: NEW rows (green gradient) ────────────────────────────
  NEW_BG:      '#b7e0c8',
  NEW_MID:     '#c8e8d4',
  NEW_AUDIT:   '#daeee3',

  // ── OUT_MERGED_DATA: DISCONTINUED rows (amber gradient) ──────────────────
  DISC_LEAD:   '#fde8c1',
  DISC_MID:    '#fef0d3',
  DISC_AUDIT:  '#fef8e8',

  // ── OUT_MERGED_DATA: Price-INCREASE rows (red gradient) ──────────────────
  UP_LEAD:     '#fadbd8',
  UP_AUDIT:    '#fae5e4',

  // ── OUT_MERGED_DATA: Price-DECREASE rows (blue gradient) ─────────────────
  DN_LEAD:     '#d4eaf7',
  DN_AUDIT:    '#e4f1f9',

  // ── OUT_MERGED_DATA: Barcode-UPDATE rows (amber/gold gradient) ───────────
  BC_LEAD:     '#fde8a0',
  BC_AUDIT:    '#fef6d3',

  // ── Accent cells ─────────────────────────────────────────────────────────
  UNM_BG:  '#fef9e7',
  UNM_FG:  '#b7950b',

  // ── Status column text ────────────────────────────────────────────────────
  STATUS_FG:  '#9aa0a6',

  // ── State automation colours used by onEdit / supplier overrides ───────────
  STATE_PENDING_BG:  '#fef3e2',
  STATE_PENDING_FG:  '#e37400',
  STATE_ACCEPTED_BG: '#e6f4ea',
  STATE_ACCEPTED_FG: '#0f9d58',
  STATE_REJECTED_BG: '#fce8e6',
  STATE_REJECTED_FG: '#d93025',

  // ── Supplier STATUS colours; functional files reference these only ─────────
  STATUS_MATCHED_BG:     '#e8f0fe',
  STATUS_MATCHED_FG:     '#1565c0',
  STATUS_NEW_BG:         '#e6f4ea',
  STATUS_NEW_FG:         '#137333',
  STATUS_NOT_USED_BG:    '#f5f5f5',
  STATUS_NOT_USED_FG:    '#9aa0a6',
  STATUS_UNMATCHABLE_BG: '#fff3cd',
  STATUS_UNMATCHABLE_FG: '#856404',
  STATUS_BLANK_BG:       '#ffffff',

  MATCH_ODD:  '#f5f5f5',
  MATCH_EVEN: '#e9f0f5',

  // ── P5 Revive ─────────────────────────────────────────────────────────────
  REVIVE_BG:  '#e8daef',
  REVIVE_FG:  '#6c3483',

  // ── Price-arrow font colours ──────────────────────────────────────────────
  FG_UP:      '#7b241c',
  FG_DN:      '#154360',
  FG_FLAT:    '#9e9e9e',
  FG_BC_CELL: '#9c640c',

  // ── Row text colours ──────────────────────────────────────────────────────
  FG_NEW:     '#145a32',
  FG_DISC:    '#6e2c00',

  // ── Popup chrome ─────────────────────────────────────────────────────────
  POPUP_NAV:  '#1e3a5f',
  POPUP_NAV2: '#2d5a8e',
  POPUP_GOLD: '#ffd966',
  POPUP_GI:   '#2e7d32',
  POPUP_BU:   '#1565c0',
  POPUP_DC:   '#e65100',
  POPUP_OR:   '#ef6c00',
};


// =============================================================================
//  CSS COLOUR CONSTANTS  (mirrors LEGEND for use in HTML/CSS string builders)
// =============================================================================
var CSS_ = {
  NAV:        LEGEND.POPUP_NAV,
  NAV2:       LEGEND.POPUP_NAV2,
  GOLD:       LEGEND.POPUP_GOLD,
  TITLE_BG:   LEGEND.TITLE_BG,
  TITLE_FG:   LEGEND.TITLE_FG,
  HDR_BG:     LEGEND.HDR_BG,
  NEW_BG:     LEGEND.NEW_BG,
  DISC_BG:    LEGEND.DISC_LEAD,
  UP_BG:      LEGEND.UP_LEAD,
  DN_BG:      LEGEND.DN_LEAD,
  BC_BG:      LEGEND.BC_LEAD,
  REVIVE_BG:  LEGEND.REVIVE_BG,
  REVIVE_FG:  LEGEND.REVIVE_FG,
  GI:         LEGEND.POPUP_GI,
  BU:         LEGEND.POPUP_BU,
  DC:         LEGEND.POPUP_DC,
  OR:         LEGEND.POPUP_OR,
  WARN_BG:    '#fff8e1',
  WARN_FG:    '#8a6d3b',
  BC_HDR_BG:  '#fff3e0',
  BC_HDR_FG:  '#bf360c',
  BC_OLD:     '#e85424',
  BC_NEW:     LEGEND.POPUP_GI,
};


// =============================================================================
//  CONFIGURATION
// =============================================================================
var CFG = {
  VERSION: 'v6.3.87-paste-auto-tidy-v1',

  // Sheet names
  SH: {
    IN_POS:      'IN_PRODUCT-INSERT-TEMPLATE',
    IN_BROWSE:   'IN_BROWSESTOCKITEMS1',
    IN_SUP:      'IN_SUPPLIER_/_PRODUCT_UPDATES',
    TMP_MERGED:  'TMP_MERGED_POS_DATA',
    OUT_MERGED:  'OUT_MERGED_DATA',
    OUT_INSERT:  'OUT_POS_INSERT',
    OUT_UPDATE:  'OUT_POS_UPDATE',
    SRC_FR:      'SRC_POS_FIND_REPLACE',
    SRC_DISC:    'SRC_POS_ONGOING_DISCOUNTS',
    SRC_BRANDS:  'SRC_POS_BRAND_NAME_CHANGES',
    SRC_PREFIX:  'SRC_POS_PRODUCT_PREFIX',
    SRC_SUPP:    'SRC_POS_SUPPLIERS',
  },

  // Sheets skipped during a full merge format pass (large formula-driven inputs)
  FORMAT_SKIP_DURING_MERGE: ['TMP_MERGED_POS_DATA'],

  // Prefixes excluded from the Clear action
  CLEAR_EXCLUDE_PREFIXES: ['SRC_', 'TMP_'],

  // Row heights and font
  ROW:  { TITLE: 28, HEADER: 28, DATA: 20 },
  FONT: { FAMILY: 'Google Sans', SIZE: 8 },

  BLANK_BUFFER:    0,
  LARGE_THRESHOLD: 5000,
  CHUNK_SIZE:      10000,
  TOAST_EVERY_N:   10,

  // Sheets that manage their own INDEX column
  SKIP_INDEX:     [],

  // Sheets whose data cells are driven by ARRAYFORMULA (never overwrite those)
  FORMULA_DRIVEN: ['TMP_MERGED_POS_DATA'],

  // STATUS column positions
  SUP_STATUS_COL: 16,  // Column P — local supplier STATUS output
  POS_STATUS_COL: 34,   // TMP_MERGED_POS_DATA STATUS column

  // Match engine thresholds
  FUZZY_MIN:     0.68,
  FUZZY_MIN_RAW: 0.60,
  FUZZY_HIGH:    0.88,
  FUZZY_MEDIUM:  0.78,
  WSP_BONUS:     0.20,
  WSP_RANGE:     3.00,
  P5_NAME_MIN:   0.65,
  P5_PRICE_TOL:  0.20,

  SUBID_SKIP:   ['DISCONTINUED', 'NAN', ''],
  SPECIAL_KEEP: ['SPECIAL ORDER', 'SPECIAL', 'BUY', 'SHIPPER', 'NO REORDER'],

  THIRD_PARTY_BC_PREFIXES: ['7350012', '9421908', '4035303'],
  THIRD_PARTY_KEYWORDS:    ['BIOGAIA', 'TOXAPREVENT'],

  PACK_THEMES:   { BRAIN:1, CALM:1, ENERGY:1, FEMME:1, FEMALE:1, IMMUNE:1, MINERAL:1, SLEEP:1, DETOX:1 },
  PACK_SYNONYMS: { FEMME: 'FEMALE', FEMALE: 'FEMME' },
};


// =============================================================================
//  SCHEMA  — headers + totals formulas for every sheet
// =============================================================================
var SCHEMA = {

  'IN_PRODUCT-INSERT-TEMPLATE': {
    headers: [
      'INDEX','main_id','sub_id','brand','descr','pos_desc',
      'dissno','prod_grp','supplier','loyalty_scheme','units','min_order_qty',
      'wsp_excgst','last_price','gst_tax_pc','rrp_incgst',
      'pr_1_pc','pr_2_pc','pr_3_pc','pr_4_pc','pr_5_pc',
      'pr_6_pc','pr_7_pc','pr_8_pc','pr_9_pc',
      'ret_price','pharm_prod','scales','itemsize','packaging','STATUS',
    ],
    totals: {
      A: '="TOTAL ROWS: "&TEXT(SUBTOTAL(103,B3:B),"#,##0")',
      D: '="UNIQUE BRANDS: "&TEXT(IFERROR(COUNTA(UNIQUE(FILTER(D3:D,D3:D<>"",MAP(D3:D,LAMBDA(c,SUBTOTAL(103,c)))=1))),0),"#,##0")',
      E: '="TOTAL PRODUCTS: "&TEXT(SUBTOTAL(103,E3:E),"#,##0")',
      I: '="UNIQUE SUPPLIERS: "&TEXT(IFERROR(COUNTA(UNIQUE(FILTER(I3:I,I3:I<>"",MAP(I3:I,LAMBDA(c,SUBTOTAL(103,c)))=1))),0),"#,##0")',
    },
    textCols: [2, 3],
  },

  'IN_SUPPLIER_/_PRODUCT_UPDATES': {
    headers: [
      'INDEX','POS SUPPLIER NAME','POS SUPPLIER NUMBER','SUP BARCODE','SUP BRAND','SUP SUB ID','SUP PRODUCT',
      'SUP UNITS IN PACK','SUP MIN ORDER WS','SUP WS EXGST','SUP RRP INC GST',
      'SUP GST','SUP STOCK IN','SUP DISCOUNT PRICE','POS MEMBER','STATUS',
    ],
    totals: {
      A: null,
      B: null,
      C: null,
      E: null,
      J: '="TOTAL WS: $"&TEXT(IFERROR(SUM(FILTER(IFERROR(VALUE(J3:J),0),MAP(J3:J,LAMBDA(r,SUBTOTAL(103,r)))=1,IFERROR(VALUE(J3:J),0)>0)),0),"#,##0.00")',
      K: '="TOTAL RRP: $"&TEXT(IFERROR(SUM(FILTER(IFERROR(VALUE(K3:K),0),MAP(K3:K,LAMBDA(r,SUBTOTAL(103,r)))=1,IFERROR(VALUE(K3:K),0)>0)),0),"#,##0.00")',
    },
    textCols: [2, 3, 4, 6],
    centreDataCols: [8, 9, 10, 11, 12, 13, 14, 15],
  },

  'TMP_MERGED_POS_DATA': {
    headers: [
      'INDEX',
      'POS MASTER BRAND','POS MAIN ID','POS PLU',
      'POS SUB ID','POS BRAND','POS DESCR','POS POS DESC','POS DISSNO','POS PROD GRP',
      'POS SUPPLIER','POS LOYALTY SCHEME','POS UNITS','POS MIN ORDER QTY',
      'POS WSP EXCGST','POS LAST PRICE','POS GST TAX PC','POS RRP INCGST',
      'POS PR 1 PC','POS PR 2 PC','POS PR 3 PC','POS PR 4 PC','POS PR 5 PC',
      'POS PR 6 PC','POS PR 7 PC','POS PR 8 PC','POS PR 9 PC',
      'POS RET PRICE','POS PHARM PROD','POS SCALES','POS ITEMSIZE','POS PACKAGING',
      'POS SOH','STATUS',
    ],
    totals: {
      A: '="TOTAL ROWS: "&TEXT(SUBTOTAL(103,B3:B),"#,##0")',
      B: '="UNIQUE MASTER BRANDS: "&TEXT(IFERROR(COUNTA(UNIQUE(FILTER(B3:B,B3:B<>"",MAP(B3:B,LAMBDA(c,SUBTOTAL(103,c)))=1))),0),"#,##0")',
      F: '="UNIQUE MAPPED BRANDS: "&TEXT(IFERROR(COUNTA(UNIQUE(FILTER(F3:F,F3:F<>"",MAP(F3:F,LAMBDA(c,SUBTOTAL(103,c)))=1))),0),"#,##0")',
      G: '="TOTAL PRODUCTS: "&TEXT(SUBTOTAL(103,G3:G),"#,##0")',
      K: '="UNIQUE SUPPLIERS: "&TEXT(IFERROR(COUNTA(UNIQUE(FILTER(K3:K,K3:K<>"",MAP(K3:K,LAMBDA(c,SUBTOTAL(103,c)))=1))),0),"#,##0")',
      O: '="TOTAL VALUATION: "&TEXT(IFERROR(SUMPRODUCT(MAP(A3:A,LAMBDA(c,SUBTOTAL(103,c))),IFERROR(VALUE(O3:O),0),IFERROR(VALUE(AG3:AG),0),(IFERROR(VALUE(AG3:AG),0)>0)),0),"$#,##0.00")',
      P: '="TOTAL LAST PRICE: "&TEXT(IFERROR(SUMPRODUCT(MAP(A3:A,LAMBDA(c,SUBTOTAL(103,c))),IFERROR(VALUE(P3:P),0),IFERROR(VALUE(AG3:AG),0),(IFERROR(VALUE(AG3:AG),0)>0)),0),"$#,##0.00")',
    },
    // Keep barcode/PLU/sub-id/description columns as text without touching
    // pricing/stock numeric columns. This prevents pasted identifiers losing
    // leading zeroes while preserving POS numeric fields.
    textCols: [1,2,3,4,5,6,7,8,10,11,12,13,14,29,30,31,32,34],
    // TMP fast format explicitly centres INDEX but otherwise retains body alignment.
    editCentreDataCols: [1],
    editRetainDefaultAlignment: true,
  },

  'IN_BROWSESTOCKITEMS1': {
    headers: [
      'INDEX','main_id','plu','sub_id','brand','descr',
      'dissno','prod_grp','last_price','last_dprice','gst_tax_pc','supplier','soh',
    ],
    totals: {
      A: '="TOTAL ROWS: "&TEXT(SUBTOTAL(103,B3:B),"#,##0")',
      E: '="UNIQUE BRANDS: "&TEXT(IFERROR(COUNTA(UNIQUE(FILTER(E3:E,E3:E<>"",MAP(E3:E,LAMBDA(c,SUBTOTAL(103,c)))=1))),0),"#,##0")',
      F: '="TOTAL PRODUCTS: "&TEXT(SUBTOTAL(103,F3:F),"#,##0")',
    },
    textCols: [1, 2, 3, 4],
  },

  'OUT_MERGED_DATA': {
    headers: [
      'INDEX','ROW STATUS','PRICE STATUS','MATCH METHOD','CONF %',
      'POS SUPPLIER','UPDATED SUPPLIER','POS BRAND','SUP BRAND','OLD BRAND',
      'POS MAIN ID','BARCODE UPDATE','POS PLU','POS SUB ID','ORIGINAL POS DESCR',
      'POS DESCR','SUP PRODUCT','CURRENT WSP EXGST','NEW WSP EXGST','WSP CHANGE %',
      'WSP CHANGE $','CURRENT LAST PRICE','NEW LAST PRICE','CHANGE LAST PRICE %','CHANGE LAST PRICE $',
      'CURRENT RRP','NEW RRP','HAS GST','CURRENT WSP TO RRP','WSP TO RRP MARKUP %',
      'WSP TO RRP MARKUP +6.5%','NOTES','BC','SUB ID','BRAND','WSP','TEXT %','SIZE','TYPE','RRP / MARKUP OVERRIDE','FINAL SHELF RRP','main id','plu','sub id',
      'brand','descr','pos desc','dissno','prod grp',
      'supplier','loyalty scheme','units','min order qty','wsp excgst',
      'last price','gst tax pc','rrp incgst','pr 1 pc','pr 2 pc',
      'pr 3 pc','pr 4 pc','pr 5 pc','pr 6 pc','pr 7 pc',
      'pr 8 pc','pr 9 pc','ret price','pharm prod','scales',
      'itemsize','packaging','pos soh','STATUS',
    ],
    totals: {
      A:  '="TOTAL ROWS: "&TEXT(SUBTOTAL(103,B3:B),"#,##0")',
      B:  '="NEW: "&TEXT(COUNTIF(B3:B,"*NEW*"),"#,##0")&"  |  MATCHED: "&TEXT(COUNTIF(B3:B,"*MATCHED*"),"#,##0")&"  |  DISC: "&TEXT(COUNTIF(B3:B,"*DISCONTINUED*"),"#,##0")',
      C:  '="UP: "&TEXT(COUNTIF(C3:C,"PRICE INCREASE"),"#,##0")&"  |  DOWN: "&TEXT(COUNTIF(C3:C,"PRICE DECREASE"),"#,##0")&"  |  NEW: "&TEXT(COUNTIF(C3:C,"NEW PRODUCT"),"#,##0")&"  |  FLAT: "&TEXT(COUNTIF(C3:C,"NO CHANGE"),"#,##0")',
      F:  '="POS SUPPLIERS: "&TEXT(IFERROR(COUNTA(UNIQUE(FILTER(F3:F,F3:F<>""))),0),"#,##0")',
      G:  '="UPDATED SUPPLIERS: "&TEXT(IFERROR(COUNTA(UNIQUE(FILTER(G3:G,G3:G<>""))),0),"#,##0")',
      H:  '="POS BRANDS: "&TEXT(IFERROR(COUNTA(UNIQUE(FILTER(H3:H,H3:H<>""))),0),"#,##0")',
      I:  '="SUP BRANDS: "&TEXT(IFERROR(COUNTA(UNIQUE(FILTER(I3:I,I3:I<>""))),0),"#,##0")',
      J:  '="BRAND CHANGES: "&TEXT(COUNTIF(J3:J,"<>"),"#,##0")',
      L:  '="BARCODES TO UPDATE: "&TEXT(COUNTIF(L3:L,"<>"),"#,##0")',
      O:  '="TOTAL POS PRODUCTS: "&TEXT(SUBTOTAL(103,O3:O),"#,##0")',
      P:  '="TOTAL SUP PRODUCTS: "&TEXT(SUBTOTAL(103,Q3:Q),"#,##0")',
      R:  '="CURRENT WSP: "&TEXT(SUM(R3:R),"$#,##0.00")',
      S:  '="NEW WSP: "&TEXT(SUM(S3:S),"$#,##0.00")',
      V:  '="CURRENT LAST PRICE: "&TEXT(SUM(V3:V),"$#,##0.00")',
      W:  '="NEW LAST PRICE: "&TEXT(SUM(W3:W),"$#,##0.00")',
      Z:  '="CURRENT RRP: "&TEXT(SUM(Z3:Z),"$#,##0.00")',
      AA: '="NEW RRP: "&TEXT(SUM(AA3:AA),"$#,##0.00")',
      AD: '="DISCOUNT TYPES: "&TEXT(IFERROR(COUNTA(UNIQUE(FILTER(REGEXEXTRACT(AF3:AF,"^[A-Z +()]+"),REGEXMATCH(AF3:AF,"% /")))),0),"#,##0")',
      AE: '="DISCOUNTED ROWS: "&TEXT(COUNTIF(AF3:AF,"*% /*"),"#,##0")',
      AN: '="OVERRIDES: "&TEXT(COUNTIF(AN3:AN,"<>"),"#,##0")',
      AO: '="FINAL SHELF RRP: "&TEXT(SUM(BE3:BE),"$#,##0.00")',
      BB: '="TOTAL WS: $"&TEXT(SUM(BB3:BB),"#,##0.00")',
      BC: '="TOTAL LAST PRICE: $"&TEXT(SUM(BC3:BC),"#,##0.00")',
      BE: '="TOTAL RRP: $"&TEXT(SUM(BE3:BE),"#,##0.00")',
    },
    textCols: [1, 5, 10, 11, 12, 13, 14, 15, 16, 17, 32, 33, 34, 35, 36, 37, 38, 39, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 73],
    centreDataCols: [1, 2, 3, 4, 5, 20, 21, 24, 25, 28, 33, 34, 35, 36, 37, 38, 39, 40, 51, 52, 53, 56, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72],
    // Edit-only native formats mirror the established OUT write/format path.
    editNumberFormats: {
      '$#,##0.00': [18, 19, 21, 22, 23, 25, 26, 27, 54, 55, 57],
      '0.00%': [20, 24],
      '0': [34, 35, 36, 37, 39, 44],
      '@': [40, 41],
    },
  },

  'OUT_POS_INSERT': {
    headers: [
      'POS INDEX','main id','sub id','brand','descr','pos desc','dissno','prod grp',
      'supplier','loyalty scheme','units','min order qty','wsp excgst','last price',
      'gst tax pc','rrp incgst','pr 1 pc','pr 2 pc','pr 3 pc','pr 4 pc','pr 5 pc',
      'pr 6 pc','pr 7 pc','pr 8 pc','pr 9 pc',
      'ret price','pharm prod','scales','itemsize','packaging','pos soh',
    ],
    totals: {
      A: '="TOTAL ROWS: "&TEXT(SUBTOTAL(103,B3:B),"#,##0")',
      D: '="UNIQUE BRANDS: "&TEXT(IFERROR(COUNTA(UNIQUE(FILTER(D3:D,D3:D<>"",MAP(D3:D,LAMBDA(c,SUBTOTAL(103,c)))=1))),0),"#,##0")',
      E: '="TOTAL PRODUCTS: "&TEXT(SUBTOTAL(103,E3:E),"#,##0")',
      I: '="SUPPLIERS: "&TEXT(IFERROR(COUNTA(UNIQUE(FILTER(I3:I,I3:I<>"",MAP(I3:I,LAMBDA(c,SUBTOTAL(103,c)))=1))),0),"#,##0")',
      M: '="TOTAL WS: $"&TEXT(IFERROR(SUM(FILTER(VALUE(M3:M),MAP(M3:M,LAMBDA(r,SUBTOTAL(103,r)))=1,IFERROR(VALUE(M3:M))>0)),0),"#,##0.00")',
      N: '="TOTAL LAST PRICE: $"&TEXT(IFERROR(SUM(FILTER(VALUE(N3:N),MAP(N3:N,LAMBDA(r,SUBTOTAL(103,r)))=1,IFERROR(VALUE(N3:N))>0)),0),"#,##0.00")',
    },
    textCols: [1, 2, 3],
    editNumberFormats: {
      '@': [1, 2, 3, 4, 5, 6, 30],
      '#,##0.00': [13, 14, 16],
      '0': [7, 8, 9, 10, 11, 12, 15, 27, 28, 29, 31],
      '0.##': [17, 18, 19, 20, 21, 22, 23, 24, 25, 26],
    },
  },

  'OUT_POS_UPDATE': {
    headers: [
      'POS INDEX','plu','sub id','brand','descr','pos desc','dissno','prod grp',
      'supplier','loyalty scheme','units','min order qty','wsp excgst','last price',
      'gst tax pc','rrp incgst','pr 1 pc','pr 2 pc','pr 3 pc','pr 4 pc','pr 5 pc',
      'pr 6 pc','pr 7 pc','pr 8 pc','pr 9 pc',
      'ret price','pharm prod','scales','itemsize','packaging','pos soh',
    ],
    totals: {
      A: '="TOTAL ROWS: "&TEXT(SUBTOTAL(103,B3:B),"#,##0")',
      D: '="UNIQUE BRANDS: "&TEXT(IFERROR(COUNTA(UNIQUE(FILTER(D3:D,D3:D<>"",MAP(D3:D,LAMBDA(c,SUBTOTAL(103,c)))=1))),0),"#,##0")',
      E: '="TOTAL PRODUCTS: "&TEXT(SUBTOTAL(103,E3:E),"#,##0")',
      I: '="SUPPLIERS: "&TEXT(IFERROR(COUNTA(UNIQUE(FILTER(I3:I,I3:I<>"",MAP(I3:I,LAMBDA(c,SUBTOTAL(103,c)))=1))),0),"#,##0")',
      M: '="TOTAL WS: $"&TEXT(IFERROR(SUM(FILTER(VALUE(M3:M),MAP(M3:M,LAMBDA(r,SUBTOTAL(103,r)))=1,IFERROR(VALUE(M3:M))>0)),0),"#,##0.00")',
      N: '="TOTAL LAST PRICE: $"&TEXT(IFERROR(SUM(FILTER(VALUE(N3:N),MAP(N3:N,LAMBDA(r,SUBTOTAL(103,r)))=1,IFERROR(VALUE(N3:N))>0)),0),"#,##0.00")',
    },
    textCols: [1, 2, 3],
    editNumberFormats: {
      '@': [1, 2, 3, 4, 5, 6, 30],
      '#,##0.00': [13, 14, 16],
      '0': [7, 8, 9, 10, 11, 12, 15, 27, 28, 29, 31],
      '0.##': [17, 18, 19, 20, 21, 22, 23, 24, 25, 26],
    },
  },

  'SRC_POS_FIND_REPLACE': {
    headers: ['INDEX','SUP FIND','POS REPLACE','SRC STATUS'],
    totals: {
      A: '="TOTAL ROWS: "&TEXT(SUBTOTAL(103,B3:B),"#,##0")',
      B: '="TOTAL SUP FIND: "&TEXT(SUBTOTAL(103,B3:B),"#,##0")',
      C: '="TOTAL POS REPLACE: "&TEXT(SUBTOTAL(103,C3:C),"#,##0")',
      D: '="USED: "&TEXT(IFERROR(COUNTIF(D3:D,"USED"),0),"#,##0")&"  |  UNUSED: "&TEXT(IFERROR(COUNTIF(D3:D,""),0),"#,##0")',
    },
    textCols: [1],
  },

  'SRC_POS_ONGOING_DISCOUNTS': {
    headers: [
      'INDEX','POS MASTER BRAND','POS BRAND PREFIX','POS SUPPLIER NUMBER',
      'POS PLU','POS MASTER BARCODE','POS DESCR',
      'POS DISCOUNT%','POS MARKUP%','POS MEMBER','POS MATCH',
    ],
    totals: {
      A: '="TOTAL ROWS: "&TEXT(SUBTOTAL(103,A3:A),"#,##0")',
      B: '="BRANDS: " & TEXT(COUNTUNIQUE(FILTER(B3:B, B3:B<>"", BYROW(B3:B, LAMBDA(row, SUBTOTAL(103, row))))), "#,##0")',
      D: '="SUPPLIERS: " & TEXT(COUNTUNIQUE(FILTER(D3:D, D3:D<>"", BYROW(D3:D, LAMBDA(row, SUBTOTAL(103, row))))), "#,##0")',
    },
    textCols: [1, 5, 6],
    centreDataCols: [8, 9, 10, 11],
    editNumberFormats: {
      '0.00%': [8],
      '0.###': [9],
    },
  },

  'SRC_POS_BRAND_NAME_CHANGES': {
    headers: ['INDEX','SUP BRAND','POS BRAND','SRC STATUS'],
    totals: {
      A: '="TOTAL ROWS: "&TEXT(SUBTOTAL(103,B3:B),"#,##0")',
      B: '="TOTAL SUP BRANDS: "&TEXT(IFERROR(SUMPRODUCT((SUBTOTAL(103,OFFSET(B3,ROW(B3:B)-ROW(B3),0,1,1))>0)/COUNTIF(B3:B,B3:B&"")),0),"#,##0")',
      C: '="TOTAL POS BRANDS: "&TEXT(IFERROR(SUMPRODUCT((SUBTOTAL(103,OFFSET(C3,ROW(C3:C)-ROW(C3),0,1,1))>0)/COUNTIF(C3:C,C3:C&"")),0),"#,##0")',
      D: '="USED: "&TEXT(IFERROR(COUNTIF(D3:D,"USED"),0),"#,##0")&"  |  UNUSED: "&TEXT(IFERROR(COUNTIF(D3:D,""),0),"#,##0")',
    },
    textCols: [1],
  },

  'SRC_POS_PRODUCT_PREFIX': {
    headers: ['INDEX','POS BRAND','POS PREFIX','POS MEMBER','SRC STATUS'],
    totals: {
      A: '="TOTAL ROWS: "&TEXT(SUBTOTAL(103,B3:B),"#,##0")',
      B: '="UNIQUE BRANDS: "&TEXT(IFERROR(SUMPRODUCT((SUBTOTAL(103,OFFSET(B3,ROW(B3:B)-ROW(B3),0,1,1))>0)/COUNTIF(B3:B,B3:B&"")),0),"#,##0")',
      C: '="UNIQUE PREFIXES: "&TEXT(IFERROR(SUMPRODUCT((SUBTOTAL(103,OFFSET(C3,ROW(C3:C)-ROW(C3),0,1,1))>0)/COUNTIF(C3:C,C3:C&"")),0),"#,##0")',
      E: '="USED: "&TEXT(IFERROR(COUNTIF(E3:E,"USED"),0),"#,##0")&"  |  UNUSED: "&TEXT(IFERROR(COUNTIF(E3:E,""),0),"#,##0")',
    },
    textCols: [1],
  },

  'SRC_POS_SUPPLIERS': {
    headers: ['INDEX','POS ACCNO','POS ACNAME','SRC STATUS'],
    totals: {
      A: '="TOTAL ROWS: "&TEXT(SUBTOTAL(103,B3:B),"#,##0")',
      B: '="POS ACCOUNT NUMBER: "&TEXT(IFERROR(SUMPRODUCT((SUBTOTAL(103,OFFSET(B3,ROW(B3:B)-ROW(B3),0,1,1))>0)/COUNTIF(B3:B,B3:B&"")),0),"#,##0")',
      C: '="POS ACCOUNTS NAME: "&TEXT(IFERROR(SUMPRODUCT((SUBTOTAL(103,OFFSET(C3,ROW(C3:C)-ROW(C3),0,1,1))>0)/COUNTIF(C3:C,C3:C&"")),0),"#,##0")',
      D: '="USED: "&TEXT(IFERROR(COUNTIF(D3:D,"USED"),0),"#,##0")&"  |  UNUSED: "&TEXT(IFERROR(COUNTIF(D3:D,""),0),"#,##0")',
    },
    textCols: [1, 2],
  },

};


// =============================================================================
//  MENU
// =============================================================================
function onOpen(e) {
  var ui;
  try { ui = SpreadsheetApp.getUi(); } catch (err) { return; }

  ui.createMenu('🧩 POS Merge Tools')
    .addItem('🔍  HIGHLIGHT NEW PRODUCTS + BEST BUY', 'runHighlightNewProductsBestBuy')
    .addItem('📐  BUILD OUT_MERGED_DATA', 'buildOutMergedDataFromSupplierStatus')
    .addItem(' ➡️➡️🎯  BUILD OUT_MERGED_DATA — FILTERED BRANDS (COL E)', 'buildOutMergedDataFromFilteredBrands')
    .addSeparator()
    .addItem('🔁  REFRESH SUPPLIER CHANGES', 'refreshSupplierChanges')
    .addSeparator()
    .addItem('📤  GENERATE INSERT + UPDATE SHEETS', 'generateInsertUpdateSheets')
    .addItem('📄  EXPORT POS FILES', 'exportPosFiles')
    .addItem(' ➡️➡️🎯  GENERATE INSERT + UPDATE FROM FILTERED DATA', 'generateInsertUpdateSheetsFromFilteredData')
    .addSeparator()
    .addItem('🧹  FORMAT / CLEAR…', 'showWorkbookPopup')
    .addItem('🎨  FORMAT CURRENT SHEET', 'formatCurrentSheet')
    .addToUi();

  // Keep the internal supplier-change queue out of the user's sheet tabs.
  try { m13EnsureSupplierQueueHidden_(); } catch(eHideQueue) {}

  // Also build the diagnostics menu
  try { onOpenDiagnostics_(); } catch(e) {}
}

/**
 * Run manually from the Apps Script editor (Run → createMenuManually) if the
 * custom menu is missing after saving.
 */
function createMenuManually() { onOpen({}); }


// =============================================================================
//  WORKBOOK VIEW HELPERS
// =============================================================================
function clearAllFilters_(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  ss.getSheets().forEach(function(sh) { clearFilter_(sh); });
}

function setWorkbookZoom_(ss, zoom) {
  ss   = ss   || SpreadsheetApp.getActiveSpreadsheet();
  zoom = zoom || 80;
  ss.getSheets().forEach(function(sh) { try { sh.setZoomScale(zoom); } catch(e) {} });
}

function ensureAllFilters_(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  ss.getSheets().forEach(function(sh) {
    try {
      var lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
      if (lastRow < 2 || lastCol < 1) return;
      if (!sh.getFilter()) sh.getRange(2, 1, Math.max(lastRow - 1, 1), lastCol).createFilter();
    } catch(e) {}
  });
}

function resetWorkbookView_(ss) {
  setWorkbookZoom_(ss, 80);
}


// =============================================================================
//  FAST FORMAT HELPERS
// =============================================================================
/**
 * Full data-body formatting on TMP_MERGED_POS_DATA is very slow because it is
 * ~31k rows x 34 columns (>1M cells). Format actions should not rewrite or
 * restyle that formula-driven body. They only need to restore row 1 totals,
 * row 2 headers, freeze panes and the row-2 filter.
 */
function shouldUseStructuralFormatOnly_(name, nData) {
  if (name === CFG.SH.TMP_MERGED) return true;
  if (CFG.FORMULA_DRIVEN && CFG.FORMULA_DRIVEN.indexOf(name) >= 0 && nData > 1000) return true;
  return false;
}

/**
 * Keeps an existing filter when possible. Removing/recreating a filter across
 * 30k+ rows can be slow, so this only creates it when missing.
 */
function ensureRow2FilterFast_(sh, lastRow, lastCol) {
  try {
    if (!sh || lastRow < 2 || lastCol < 1) return;
    if (!sh.getFilter()) sh.getRange(2, 1, Math.max(lastRow - 1, 1), lastCol).createFilter();
  } catch(e) {
    log_('[FORMAT] ensureRow2FilterFast_ failed on ' + sh.getName() + ': ' + e.message);
  }
}

function resetRow2FilterFast_(sh, lastRow, lastCol) {
  try {
    if (!sh || lastCol < 1) return;
    var lr = Math.max(lastRow || sh.getLastRow() || 2, 2);
    clearFilter_(sh);
    sh.getRange(2, 1, Math.max(lr - 1, 1), lastCol).createFilter();
  } catch(e) {
    log_('[FORMAT] resetRow2FilterFast_ failed on ' + (sh ? sh.getName() : 'sheet') + ': ' + e.message);
  }
}

/**
 * TMP_MERGED_POS_DATA is intentionally formatted on a lightweight path.
 * It is large and formula-driven, so this does not stamp backgrounds across
 * the full 31k x 34 body. It only applies the standard readable text style
 * and rewrites column A as a simple INDEX, matching the other table sheets.
 */
function safeWriteIndexColumn_(sh, nData, opt) {
  opt = opt || {};
  if (!sh || nData <= 0) return true;
  var startRow = opt.startRow || 3;
  var chunkSize = opt.chunkSize || 5000;
  var maxRetries = opt.maxRetries || 3;
  var grey = opt.fontColor || ((typeof LEGEND !== 'undefined' && LEGEND.STATUS_FG) ? LEGEND.STATUS_FG : '#9aa0a6');
  var font = opt.font || ((typeof CFG !== 'undefined' && CFG.FONT) ? CFG.FONT : { FAMILY: 'Google Sans', SIZE: 8 });

  for (var attempt = 0; attempt < maxRetries; attempt++) {
    try {
      for (var start = 0; start < nData; start += chunkSize) {
        var len = Math.min(chunkSize, nData - start);
        var idxChunk = new Array(len);
        for (var i = 0; i < len; i++) idxChunk[i] = [String(start + i + 1)];
        sh.getRange(startRow + start, 1, len, 1)
          .setValues(idxChunk)
          .setNumberFormat('@')
          .setHorizontalAlignment('center')
          .setFontColor(grey)
          .setFontSize(font.SIZE || 8)
          .setFontFamily(font.FAMILY || 'Google Sans')
          .setFontWeight('normal')
          .setFontStyle('normal');
      }
      return true;
    } catch(e) {
      try { log_('[FORMAT] INDEX write attempt ' + (attempt + 1) + ' failed on ' + sh.getName() + ': ' + e.message); } catch(_eLog) {}
      if (attempt === maxRetries - 1) {
        try {
          SpreadsheetApp.getActiveSpreadsheet().toast(
            'INDEX column may be incomplete on ' + sh.getName() + '. Run Format Current Sheet manually.',
            '⚠️ Partial Write',
            10
          );
        } catch(_eToast) {}
        return false;
      }
      try { Utilities.sleep(1000 * (attempt + 1)); } catch(_eSleep) {}
    }
  }
  return false;
}

function formatTmpMergedDataFast_(sh, lastRow, lastCol, nData, F, R, CLIP) {
  if (!sh || lastCol < 1) return;
  var dataStartRow = 3;
  var grey = (LEGEND && LEGEND.STATUS_FG) ? LEGEND.STATUS_FG : '#9aa0a6';
  var rowHeight = (R && R.DATA) ? R.DATA : 20;
  var chunkSize = 3000;

  // Always keep the visible body background on native banding. This is fast on
  // large TMP sheets and avoids huge setBackgrounds() matrices.
  if (nData > 0) {
    try { applyBandedRange_(sh, lastRow, lastCol); } catch(eBand) {
      try { log_('[FORMAT] TMP native banding skipped: ' + eBand.message); } catch(_eLogBand) {}
    }
  }

  // Body styling is chunked so TMP can be formatted reliably at 31k x 34 without
  // one very large styling call timing out or partially applying.
  if (nData > 0) {
    for (var start = 0; start < nData; start += chunkSize) {
      var len = Math.min(chunkSize, nData - start);
      try {
        sh.getRange(dataStartRow + start, 1, len, lastCol)
          .setFontFamily(F.FAMILY)
          .setFontSize(F.SIZE)
          .setFontColor(grey)
          .setFontWeight('normal')
          .setFontStyle('normal')
          .setVerticalAlignment('middle')
          .setWrapStrategy(CLIP);
      } catch(eBody) {
        try { log_('[FORMAT] TMP body text chunk skipped rows ' + (dataStartRow + start) + '-' + (dataStartRow + start + len - 1) + ': ' + eBody.message); } catch(_eLogBody) {}
      }
      try { sh.setRowHeights(dataStartRow + start, len, rowHeight); } catch(eHeight) {}
    }
  }

  // Reset INDEX column after body styling so it is never left with stale pasted
  // values or external formatting.
  safeWriteIndexColumn_(sh, nData, {
    startRow: dataStartRow,
    chunkSize: 5000,
    maxRetries: 3,
    fontColor: grey,
    font: F
  });

  // Apply text number format to known identifier/description columns only.
  try {
    var schema = SCHEMA[sh.getName()] || {};
    var textCols = schema.textCols || [];
    if (nData > 0 && textCols.length) {
      var ranges = [];
      for (var i = 0; i < textCols.length; i++) {
        var c = textCols[i];
        if (c <= lastCol) ranges.push(colLetter_(c) + dataStartRow + ':' + colLetter_(c) + (dataStartRow + nData - 1));
      }
      if (ranges.length) sh.getRangeList(ranges).setNumberFormat('@');
    }
  } catch(eTextFmt) {
    try { log_('[FORMAT] TMP text number-format skipped: ' + eTextFmt.message); } catch(_eLogFmt) {}
  }
}

// =============================================================================
//  FORMAT ENGINE
// =============================================================================
function applyFormat_(ss, sh, skipDuringMerge) {
  var name   = sh.getName();
  if (skipDuringMerge && CFG.FORMAT_SKIP_DURING_MERGE.indexOf(name) >= 0) {
    log_('[FORMAT] Skipping full styling for ' + name + ' during merge (large input sheet)');
    var _skipSchema = SCHEMA[name];
    var _skipLastRow = Math.max(sh.getLastRow(), 2);
    var _skipLastCol = Math.max(sh.getLastColumn(), (_skipSchema && _skipSchema.headers ? _skipSchema.headers.length : 1));
    var _F = CFG.FONT, _R = CFG.ROW;
    var _WRAP = SpreadsheetApp.WrapStrategy.WRAP;
    try {
      sh.getRange(1, 1, 1, _skipLastCol)
        .setBackground(LEGEND.TITLE_BG).setFontColor(LEGEND.TITLE_FG)
        .setFontFamily(_F.FAMILY).setFontSize(_F.SIZE)
        .setFontWeight('bold').setFontStyle('normal')
        .setHorizontalAlignment('center').setVerticalAlignment('middle')
        .setWrapStrategy(_WRAP);
      sh.setRowHeight(1, _R.TITLE);
    } catch(e) {}
    try {
      if (_skipSchema && _skipSchema.headers && _skipSchema.headers.length) {
        sh.getRange(2, 1, 1, _skipSchema.headers.length).setValues([_skipSchema.headers]);
      }
      sh.getRange(2, 1, 1, _skipLastCol)
        .setBackground(LEGEND.HDR_BG).setFontColor(LEGEND.HDR_FG)
        .setFontFamily(_F.FAMILY).setFontSize(_F.SIZE)
        .setFontWeight('bold').setFontStyle('normal')
        .setHorizontalAlignment('center').setVerticalAlignment('middle')
        .setWrapStrategy(_WRAP);
      sh.setRowHeight(2, _R.HEADER);
    } catch(e) {}
    try { sh.setFrozenRows(2); } catch(e) {}
    rebuildTotals_(sh, _skipSchema, _skipLastRow);
    if (name === CFG.SH.TMP_MERGED) {
      // Even on the fast/merge-safe path, TMP keeps its visible table controls correct.
      formatTmpMergedDataFast_(sh, _skipLastRow, _skipLastCol, Math.max(0, _skipLastRow - 2), _F, _R, SpreadsheetApp.WrapStrategy.CLIP);
      resetRow2FilterFast_(sh, Math.max(_skipLastRow, 2), _skipLastCol);
    } else {
      clearFilter_(sh);
      if (_skipLastRow >= 2 && _skipLastCol >= 1) {
        try { sh.getRange(2, 1, Math.max(_skipLastRow - 1, 1), _skipLastCol).createFilter(); } catch(e) {}
      }
    }
    return;
  }

  var schema          = SCHEMA[name];
  var CLIP            = SpreadsheetApp.WrapStrategy.CLIP;
  var WRAP            = SpreadsheetApp.WrapStrategy.WRAP;
  var isFormulaDriven = CFG.FORMULA_DRIVEN.indexOf(name) >= 0;
  var isOutMerged     = name === CFG.SH.OUT_MERGED;
  var isOutSheet      = name === CFG.SH.OUT_INSERT || name === CFG.SH.OUT_UPDATE;
  var lastRow         = sh.getLastRow();
  var lastCol         = sh.getLastColumn();

  if (schema && schema.headers && schema.headers.length > 0) {
    var schemaColCount = schema.headers.length;
    if (sh.getMaxColumns() < schemaColCount) sh.insertColumnsAfter(sh.getMaxColumns(), schemaColCount - sh.getMaxColumns());
    if (sh.getMaxRows() < 3) sh.insertRowsAfter(sh.getMaxRows(), 3 - sh.getMaxRows());
    lastRow = sh.getLastRow();
    lastCol = Math.max(lastCol, schemaColCount);
  } else if (lastRow < 2) {
    if (sh.getMaxRows() < 3) sh.insertRowsAfter(sh.getMaxRows(), 3 - sh.getMaxRows());
    lastRow = sh.getLastRow(); lastCol = sh.getLastColumn();
  }

  if (lastRow < 1 || lastCol < 1) return;

  var nData = Math.max(0, lastRow - 2);
  var F = CFG.FONT, R = CFG.ROW;

  // Reset only status columns that are regenerated by Highlight/Merge.
  // This keeps formatting/clear actions visually honest without touching source
  // data columns. The affected columns are refreshed again by Highlight or Merge:
  //   IN_SUPPLIER column P; SRC_* status/helper columns D/E/K.
  resetRefreshDrivenStatusColumnsForFormat_(sh);

  // Row 1 — title bar
  sh.getRange(1, 1, 1, lastCol)
    .setBackground(LEGEND.TITLE_BG).setFontColor(LEGEND.TITLE_FG)
    .setFontFamily(F.FAMILY).setFontSize(F.SIZE)
    .setFontWeight('bold').setFontStyle('normal')
    .setHorizontalAlignment('center').setVerticalAlignment('middle')
    .setWrapStrategy(WRAP);
  sh.setRowHeight(1, R.TITLE);

  // Row 2 — column headers
  if (schema && schema.headers && schema.headers.length > 0) {
    var need2 = schema.headers.length;
    if (sh.getMaxColumns() < need2) sh.insertColumnsAfter(sh.getMaxColumns(), need2 - sh.getMaxColumns());
    sh.getRange(2, 1, 1, need2).setValues([schema.headers]);
    lastCol = Math.max(lastCol, need2);
  }
  sh.getRange(2, 1, 1, lastCol)
    .setBackground(LEGEND.HDR_BG).setFontColor(LEGEND.HDR_FG)
    .setFontFamily(F.FAMILY).setFontSize(F.SIZE)
    .setFontWeight('bold').setFontStyle('normal')
    .setHorizontalAlignment('center').setVerticalAlignment('middle')
    .setWrapStrategy(WRAP);
  sh.setRowHeight(2, R.HEADER);

  rebuildTotals_(sh, schema, lastRow);

  sh.setFrozenRows(2);

  // Fast structural-only path for large formula-driven sheets like TMP_MERGED_POS_DATA.
  // This avoids rewriting/restyling ~1M data cells and prevents the Format popup
  // from appearing frozen for several minutes.
  if (shouldUseStructuralFormatOnly_(name, nData)) {
    if (name === CFG.SH.TMP_MERGED) {
      // TMP is large, but Format must still behave like the other table sheets:
      // row 2 headers restored, column A INDEX overwritten, and the filter reset.
      formatTmpMergedDataFast_(sh, lastRow, lastCol, nData, F, R, CLIP);
      resetRow2FilterFast_(sh, Math.max(lastRow, 2), lastCol);
    } else {
      ensureRow2FilterFast_(sh, lastRow, lastCol);
    }
    log_('[FORMAT] ' + name + ' | rows=' + fmt_(lastRow) + ' cols=' + lastCol + ' (structural-only fast format)');
    return;
  }

  clearFilter_(sh);
  if (lastRow >= 2) {
    try { sh.getRange(2, 1, Math.max(lastRow - 1, 1), lastCol).createFilter(); } catch(e) {
      log_('[FORMAT] createFilter failed on ' + name + ': ' + e.message);
    }
  }

  // INDEX column
  if (nData > 0 && CFG.SKIP_INDEX.indexOf(name) < 0) {
    var idxArr = new Array(nData);
    for (var ii = 0; ii < nData; ii++) idxArr[ii] = [String(ii + 1)];
    sh.getRange(3, 1, nData, 1).setValues(idxArr).setNumberFormat('@');
  }

  // v6.3.16: zero-data output-sheet safety.
  // OUT_POS_INSERT / OUT_POS_UPDATE can legitimately contain only rows 1-2
  // before the user runs Generate Insert + Update. Format must still restore
  // rows 1-2 and the row-2 filter, but must not call getRange(..., 0, ...).
  if (nData <= 0) {
    try {
      if (sh.getMaxRows() < 3) sh.insertRowsAfter(sh.getMaxRows(), 3 - sh.getMaxRows());
      sh.getRange(3, 1, 1, lastCol)
        .setBackground(LEGEND.STATUS_BLANK_BG)
        .setFontColor(LEGEND.DATA_FG)
        .setFontFamily(F.FAMILY)
        .setFontSize(F.SIZE)
        .setFontWeight('normal')
        .setFontStyle('normal')
        .setHorizontalAlignment('left')
        .setVerticalAlignment('middle')
        .setWrapStrategy(CLIP)
        .setNumberFormat('@');
      sh.setRowHeight(3, R.DATA || 20);
    } catch(eZeroData) {
      log_('[FORMAT] zero-data placeholder failed on ' + name + ': ' + eZeroData.message);
    }
    trimSheet_(sh);
    log_('[FORMAT] ' + name + ' | rows=' + fmt_(lastRow) + ' cols=' + lastCol + ' (zero-data safe)');
    return;
  }

  var LARGE_THRESHOLD = 500;

  if (isOutMerged) {
    // v6.3.7: zero-row safe OUT_MERGED_DATA formatting.
    // If the sheet has only rows 1-2, do not call getRange(3, ..., 0, ...).
    if (nData > 0) {
      sh.getRange(3, 1, nData, lastCol)
        .setFontFamily(F.FAMILY).setFontSize(F.SIZE)
        .setFontStyle('normal')
        .setHorizontalAlignment('left').setVerticalAlignment('middle')
        .setWrapStrategy(CLIP);
      formatOutMerged_(ss, sh, nData, lastCol);
      // Do not rewrite AO/BE shelf-price formulas during ordinary formatting.
      // Rewriting formulas on every Format pass caused avoidable speed loss.
      // Use repairFinalShelfRrpFormulas() only when formulas actually need repair.
      if (typeof styleOutMergedShelfPriceColumns_ === 'function') {
        try { styleOutMergedShelfPriceColumns_(sh, nData); } catch(eShelfStyle) { try { log_('[FORMAT] Shelf RRP style skipped: ' + eShelfStyle.message); } catch(_eShelfLog) {} }
      }

      // v6.3.3: keep OUT_MERGED_DATA review rows compact.
      // Wrapped notes/markup cells can otherwise cause Sheets to auto-expand row heights.
      try {
        if (nData > 0) sh.setRowHeights(3, nData, R.DATA || 20);
      } catch(eRowHeight) {
        try {
          for (var _rh = 0; _rh < nData; _rh += 1000) {
            sh.setRowHeights(3 + _rh, Math.min(1000, nData - _rh), R.DATA || 20);
          }
        } catch(_eRowHeight2) {}
      }

      if (schema && schema.textCols && schema.textCols.length) {
        var tlrM = [];
        for (var tiM = 0; tiM < schema.textCols.length; tiM++) {
          var tcM = schema.textCols[tiM];
          if (tcM <= lastCol) tlrM.push(colLetter_(tcM) + '3:' + colLetter_(tcM) + (nData + 2));
        }
        if (tlrM.length) sh.getRangeList(tlrM).setNumberFormat('@');
      }
      if (schema && schema.centreDataCols && schema.centreDataCols.length) {
        var clrM = [];
        for (var ciM = 0; ciM < schema.centreDataCols.length; ciM++) {
          var ccM = schema.centreDataCols[ciM];
          if (ccM <= lastCol) clrM.push(colLetter_(ccM) + '3:' + colLetter_(ccM) + (nData + 2));
        }
        if (clrM.length) sh.getRangeList(clrM).setHorizontalAlignment('center');
      }
      var intColsM = [34, 35, 36, 37, 39, 44];
      var nfrM = [];
      for (var niM = 0; niM < intColsM.length; niM++) {
        var ncM = intColsM[niM];
        if (ncM <= lastCol) nfrM.push(colLetter_(ncM) + '3:' + colLetter_(ncM) + (nData + 2));
      }
      if (nfrM.length) sh.getRangeList(nfrM).setNumberFormat('0');
      try { sh.getRange(3, 40, nData, 1).setNumberFormat('@').setHorizontalAlignment('center').setVerticalAlignment('middle').setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP); } catch(eShelfMarkup) {}
      // AO / FINAL SHELF RRP is a two-line display like AC:AE, so keep the same left justification and compact clipped layout.
      try { sh.getRange(3, 41, nData, 1).setNumberFormat('@').setHorizontalAlignment('left').setVerticalAlignment('middle').setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP); } catch(eShelfRrp) {}
      try { sh.getRange(3, 54, nData, 2).setNumberFormat('$#,##0.00'); } catch(eOutMoney) {}
      try { sh.getRange(3, 57, nData, 1).setNumberFormat('$#,##0.00'); } catch(eOutRrp) {}


    } else {
      try {
        sh.getRange(3, 1, 1, lastCol)
          .setBackground(LEGEND.STATUS_BLANK_BG)
          .setFontColor(LEGEND.DATA_FG)
          .setFontFamily(F.FAMILY)
          .setFontSize(F.SIZE)
          .setFontWeight('normal')
          .setFontStyle('normal')
          .setHorizontalAlignment('left')
          .setVerticalAlignment('middle')
          .setWrapStrategy(CLIP);
        sh.setRowHeight(3, R.DATA || 20);
      } catch(eZeroOut) {}
    }
  } else if (nData > LARGE_THRESHOLD) {
    sh.getRange(3, 1, nData, lastCol)
      .setFontFamily(F.FAMILY).setFontSize(F.SIZE)
      .setFontColor(LEGEND.DATA_FG).setFontWeight('normal').setFontStyle('normal')
      .setHorizontalAlignment('left').setVerticalAlignment('middle')
      .setWrapStrategy(CLIP);
    applyBandedRange_(sh, lastRow, lastCol);
    if (schema && schema.textCols && schema.textCols.length) {
      var tlrL = [];
      for (var ti = 0; ti < schema.textCols.length; ti++) {
        var tc = schema.textCols[ti];
        if (tc <= lastCol) tlrL.push(colLetter_(tc) + '3:' + colLetter_(tc) + (nData + 2));
      }
      if (tlrL.length) sh.getRangeList(tlrL).setNumberFormat('@');
    }
    if (schema && schema.centreDataCols && schema.centreDataCols.length) {
      var clrL = [];
      for (var ci = 0; ci < schema.centreDataCols.length; ci++) {
        var cc = schema.centreDataCols[ci];
        if (cc <= lastCol) clrL.push(colLetter_(cc) + '3:' + colLetter_(cc) + (nData + 2));
      }
      if (clrL.length) sh.getRangeList(clrL).setHorizontalAlignment('center');
    }

  } else {
    // Native banding is used for small sheets too. This keeps Format Current Sheet,
    // popup format, and merge-format behaviour visually consistent without building
    // manual background matrices.
    applyBandedRange_(sh, lastRow, lastCol);
    sh.getRange(3, 1, nData, lastCol)
      .setFontFamily(F.FAMILY).setFontSize(F.SIZE)
      .setFontColor(LEGEND.DATA_FG).setFontWeight('normal').setFontStyle('normal')
      .setHorizontalAlignment('left').setVerticalAlignment('middle')
      .setWrapStrategy(CLIP);
    if (schema && schema.centreDataCols && schema.centreDataCols.length) {
      var clrS = [];
      for (var ci2 = 0; ci2 < schema.centreDataCols.length; ci2++) {
        var cc2 = schema.centreDataCols[ci2];
        if (cc2 <= lastCol) clrS.push(colLetter_(cc2) + '3:' + colLetter_(cc2) + (nData + 2));
      }
      if (clrS.length) sh.getRangeList(clrS).setHorizontalAlignment('center');
    }
    if (schema && schema.textCols && schema.textCols.length) {
      var tlrS = [];
      for (var ti2 = 0; ti2 < schema.textCols.length; ti2++) {
        var tc2 = schema.textCols[ti2];
        if (tc2 <= lastCol) tlrS.push(colLetter_(tc2) + '3:' + colLetter_(tc2) + (nData + 2));
      }
      if (tlrS.length) sh.getRangeList(tlrS).setNumberFormat('@');
    }
    if (isOutSheet) {
      var _ot  = [1,2,3,4,5,6,30];
      var _om  = [13,14,16];
      var _oi  = [7,8,9,10,11,12,15,27,28,29,31];
      var _opr = [17,18,19,20,21,22,23,24,25,26];
      var _ofmt = { '@':[], '#,##0.00':[], '0':[], '0.##':[] };
      _ot.forEach(function(c){  if(c<=lastCol) _ofmt['@'].push(colLetter_(c)+'3:'+colLetter_(c)+(nData+2)); });
      _om.forEach(function(c){  if(c<=lastCol) _ofmt['#,##0.00'].push(colLetter_(c)+'3:'+colLetter_(c)+(nData+2)); });
      _oi.forEach(function(c){  if(c<=lastCol) _ofmt['0'].push(colLetter_(c)+'3:'+colLetter_(c)+(nData+2)); });
      _opr.forEach(function(c){ if(c<=lastCol) _ofmt['0.##'].push(colLetter_(c)+'3:'+colLetter_(c)+(nData+2)); });
      if(_ofmt['@'].length)        sh.getRangeList(_ofmt['@']).setNumberFormat('@');
      if(_ofmt['#,##0.00'].length) sh.getRangeList(_ofmt['#,##0.00']).setNumberFormat('#,##0.00');
      if(_ofmt['0'].length)        sh.getRangeList(_ofmt['0']).setNumberFormat('0');
      if(_ofmt['0.##'].length)     sh.getRangeList(_ofmt['0.##']).setNumberFormat('0.##');
    }
  }

  if (nData <= 0) {
    try {
      sh.getRange(3, 1, 1, lastCol)
        .setBackground(LEGEND.STATUS_BLANK_BG).setFontColor(LEGEND.DATA_FG)
        .setFontWeight('normal').setFontStyle('normal')
        .setHorizontalAlignment('left').setNumberFormat('@');
    } catch(e) {}
  }


  // v6.3.69 surgical: keep SRC_POS_ONGOING_DISCOUNTS H/I display stable.
  // H is an actual percent; I is a decimal multiplier/maintaining value.
  if (name === CFG.SH.SRC_DISC && typeof setupFormatSrcDiscountColumns_ === 'function') {
    try { setupFormatSrcDiscountColumns_(sh, nData); } catch(eDiscFormat) {
      try { log_('[FORMAT] SRC discount H/I format skipped: ' + eDiscFormat.message); } catch(_eDiscLog) {}
    }
  }

  trimSheet_(sh);

  log_('[FORMAT] ' + name + ' | rows=' + fmt_(lastRow) + ' cols=' + lastCol +
    (nData > LARGE_THRESHOLD ? ' (fast/banded)' : ' (full)') +
    (isFormulaDriven ? ' (formula-driven)' : '') +
    (name === CFG.SH.IN_SUP ? ' (STATUS P reset)' : '') +
    ((name === CFG.SH.SRC_FR || name === CFG.SH.SRC_DISC || name === CFG.SH.SRC_BRANDS || name === CFG.SH.SRC_PREFIX || name === CFG.SH.SRC_SUPP) ? ' (SRC status reset)' : ''));
}

function applyBandedRange_(sh, lastRow, lastCol) {
  try {
    if (!sh || lastRow < 3 || lastCol < 1) return;
    var nData = lastRow - 2;
    if (nData <= 0) return;

    var odd  = (typeof LEGEND !== 'undefined' && LEGEND.ALT_ODD)  ? LEGEND.ALT_ODD  : '#f5f5f5';
    var even = (typeof LEGEND !== 'undefined' && LEGEND.ALT_EVEN) ? LEGEND.ALT_EVEN : '#e9f0f5';
    var targetR1 = 3;
    var targetR2 = lastRow;
    var targetC1 = 1;
    var targetC2 = lastCol;
    var targetRange = sh.getRange(3, 1, nData, lastCol);
    var bandings = [];

    // v6.3.69 surgical: clear direct pasted/inserted backgrounds before native
    // banding is reused/recreated. This lets Format Current Sheet and the
    // Format/Clear popup restore the real alternating row colours.
    try { targetRange.setBackground(null); } catch(eClearBg) {}

    try { bandings = sh.getBandings ? sh.getBandings() : []; } catch(eGetBands) { bandings = []; }

    // Re-use an existing native band when it already covers the current body.
    for (var i = 0; i < bandings.length; i++) {
      try {
        var r = bandings[i].getRange();
        var r1 = r.getRow();
        var r2 = r1 + r.getNumRows() - 1;
        var c1 = r.getColumn();
        var c2 = c1 + r.getNumColumns() - 1;
        if (r1 <= targetR1 && r2 >= targetR2 && c1 <= targetC1 && c2 >= targetC2) {
          try { bandings[i].setFirstRowColor(odd).setSecondRowColor(even); } catch(eColourExisting) {}
          return;
        }
      } catch(eReadBand) {}
    }

    // Remove only overlapping data-body banding, then add one native band.
    for (var b = 0; b < bandings.length; b++) {
      try {
        var br = bandings[b].getRange();
        var br1 = br.getRow();
        var br2 = br1 + br.getNumRows() - 1;
        var bc1 = br.getColumn();
        var bc2 = bc1 + br.getNumColumns() - 1;
        if (br1 <= targetR2 && br2 >= targetR1 && bc1 <= targetC2 && bc2 >= targetC1) bandings[b].remove();
      } catch(eRemoveBand) {
        try { log_('[FORMAT] applyBandedRange_ band remove skipped: ' + eRemoveBand.message); } catch(_eLogRemove) {}
      }
    }

    var band = targetRange.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false);
    try { band.setFirstRowColor(odd).setSecondRowColor(even); } catch(eColour) {}
  } catch(e) {
    try { log_('[FORMAT] applyBandedRange_ native banding failed: ' + e.message); } catch(_eLog) {}
  }
}


function styleOutMergedShelfPriceColumns_(sh, nData) {
  if (!sh || !nData || nData <= 0) return;
  var L = (typeof LEGEND !== 'undefined') ? LEGEND : {};
  var F = (typeof CFG !== 'undefined' && CFG.FONT) ? CFG.FONT : { FAMILY: 'Google Sans', SIZE: 8 };
  var odd = L.ALT_ODD || '#f5f5f5';
  var even = L.ALT_EVEN || '#e9f0f5';
  var dataFg = L.DATA_FG || '#1c2833';
  var clip = SpreadsheetApp.WrapStrategy.CLIP;

  // Reset direct AN backgrounds left behind by earlier manual overrides so
  // blank AN cells return to normal zebra/background. The conditional-format
  // rule then colours only filled AN cells orange.
  try {
    var bgs = new Array(nData);
    for (var i = 0; i < nData; i++) bgs[i] = [(i % 2 === 0) ? odd : even];
    sh.getRange(3, 40, nData, 1)
      .setBackgrounds(bgs)
      .setFontColor(dataFg)
      .setFontFamily(F.FAMILY || 'Google Sans')
      .setFontSize(F.SIZE || 8)
      .setFontWeight('normal')
      .setFontStyle('normal')
      .setNumberFormat('@')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle')
      .setWrapStrategy(clip);
  } catch(eAn) {
    try { log_('[FORMAT] AN base reset skipped: ' + eAn.message); } catch(_eLogAn) {}
  }

  // AO is display text like AC:AE. Its colour is handled by conditional rules
  // based on BE vs Z, so direct styling remains neutral and lightweight.
  try {
    sh.getRange(3, 41, nData, 1)
      .setFontFamily(F.FAMILY || 'Google Sans')
      .setFontSize(F.SIZE || 8)
      .setFontWeight('normal')
      .setFontStyle('normal')
      .setNumberFormat('@')
      .setHorizontalAlignment('left')
      .setVerticalAlignment('middle')
      .setWrapStrategy(clip);
  } catch(eAo) {
    try { log_('[FORMAT] AO style skipped: ' + eAo.message); } catch(_eLogAo) {}
  }
}

function freezeOutMergedReviewColumns() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var name = (typeof CFG !== 'undefined' && CFG.SH && CFG.SH.OUT_MERGED) ? CFG.SH.OUT_MERGED : 'OUT_MERGED_DATA';
  var sh = ss.getSheetByName(name);
  if (!sh) throw new Error('Missing sheet: ' + name);
  ss.setActiveSheet(sh);
  // Google Sheets can only freeze contiguous columns from the left edge.
  // This freezes A:P so H / POS BRAND and P / POS DESCR remain visible.
  sh.setFrozenColumns(16);
  ss.toast('Frozen OUT_MERGED_DATA columns A:P. Google Sheets cannot freeze H and P only.', '❄️ Review columns', 6);
}

function unfreezeOutMergedReviewColumns() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var name = (typeof CFG !== 'undefined' && CFG.SH && CFG.SH.OUT_MERGED) ? CFG.SH.OUT_MERGED : 'OUT_MERGED_DATA';
  var sh = ss.getSheetByName(name);
  if (!sh) throw new Error('Missing sheet: ' + name);
  ss.setActiveSheet(sh);
  sh.setFrozenColumns(0);
  ss.toast('OUT_MERGED_DATA frozen columns cleared.', '❄️ Review columns', 5);
}

function formatOutMerged_(ss, sh, nData, lastCol) {
  // v6.3.20: OUT_MERGED_DATA visuals are structural and fast.
  // Base zebra striping uses native Sheet banding. Status/warning accents use
  // conditional formatting on key columns only. This avoids the expensive
  // setBackgrounds/setFontColors/setFontWeights matrix that caused slow builds.
  if (!sh) return;
  ensureOutMergedVisualRules_(sh, nData, lastCol);
  if (typeof styleOutMergedShelfPriceColumns_ === 'function') {
    try { styleOutMergedShelfPriceColumns_(sh, nData); } catch(eShelfCols) { try { log_('[OUT VISUAL] shelf column style skipped: ' + eShelfCols.message); } catch(_eShelfLog) {} }
  }
}

function ensureOutMergedVisualRules_(sh, nData, lastCol) {
  if (!sh) return;
  var name = sh.getName ? sh.getName() : '';
  if (CFG && CFG.SH && CFG.SH.OUT_MERGED && name !== CFG.SH.OUT_MERGED) return;

  lastCol = Math.max(lastCol || sh.getLastColumn() || 1, 73);
  nData = Math.max(Number(nData || 0), Math.max((sh.getLastRow ? sh.getLastRow() : 3) - 2, 1));

  try { ensureOutMergedNativeBanding_(sh, lastCol, nData); } catch(eBand) {
    try { log_('[OUT VISUAL] native banding skipped: ' + eBand.message); } catch(_e1) {}
  }

  try { ensureOutMergedConditionalFormatting_(sh, lastCol, nData); } catch(eCf) {
    try { log_('[OUT VISUAL] conditional formatting skipped: ' + eCf.message); } catch(_e2) {}
  }
}

function ensureOutMergedNativeBanding_(sh, lastCol, nData) {
  if (!sh) return;
  lastCol = Math.max(lastCol || sh.getLastColumn() || 1, 73);
  var nRows = Math.max(Number(nData || 0), Math.max((sh.getLastRow ? sh.getLastRow() : 3) - 2, 1));
  var odd = (LEGEND && LEGEND.ALT_ODD) ? LEGEND.ALT_ODD : '#f5f5f5';
  var even = (LEGEND && LEGEND.ALT_EVEN) ? LEGEND.ALT_EVEN : '#e9f0f5';

  var bandings = [];
  try { bandings = sh.getBandings ? sh.getBandings() : []; } catch(e) { bandings = []; }

  for (var i = 0; i < bandings.length; i++) {
    try {
      var r = bandings[i].getRange();
      if (r.getRow() === 3 && r.getColumn() === 1 && r.getNumColumns() >= lastCol && r.getNumRows() >= nRows) {
        try { bandings[i].setFirstRowColor(odd).setSecondRowColor(even); } catch(_eSet) {}
        return;
      }
    } catch(_eRead) {}
  }

  try {
    var targetR1 = 3, targetR2 = 2 + nRows, targetC1 = 1, targetC2 = lastCol;
    for (var b = 0; b < bandings.length; b++) {
      var br = bandings[b].getRange();
      var r1 = br.getRow(), r2 = r1 + br.getNumRows() - 1;
      var c1 = br.getColumn(), c2 = c1 + br.getNumColumns() - 1;
      if (r1 <= targetR2 && r2 >= targetR1 && c1 <= targetC2 && c2 >= targetC1) bandings[b].remove();
    }
  } catch(eRemove) {}

  var band = sh.getRange(3, 1, nRows, lastCol).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false);
  try { band.setFirstRowColor(odd).setSecondRowColor(even); } catch(eColour) {}
}

function ensureOutMergedConditionalFormatting_(sh, lastCol, nData) {
  if (!sh) return;

  var marker = 'V6_3_59_MULTI_SOURCE_RECONCILIATION_OUT_CF';
  var legacyMarkers = ['V6320_OUT_CF', 'V6_3_44_CF', 'V6_3_44_OUT_CF', 'V6_3_45_OUT_CF', 'V6_3_47_SUPPLIER_STATE_CSS_FIX_OUT_CF', 'V6_3_47_SUPPLIER_STATE_CSS_QUEUE_RECOVERY_OUT_CF', 'V6_3_52_SHELF_RRP_DISPLAY_CFG_FIX_OUT_CF', 'V6_3_54_AN_RRP_OR_MARKUP_FIX_OUT_CF', 'V6_3_55_AO_ALIGNMENT_FIX_OUT_CF', 'V6_3_56_OUT_FORMAT_AN_AO_FIX_OUT_CF', 'V6_3_59_MULTI_SOURCE_RECONCILIATION_OUT_CF', marker];
  var nRows = Math.max(Number(nData || 0), Math.max((sh.getLastRow ? sh.getLastRow() : 3) - 2, 1));
  var neededEndRow = 2 + nRows;

  function ruleHasAnyManagedMarker_(rule) {
    for (var m = 0; m < legacyMarkers.length; m++) {
      if (conditionalRuleHasMarker_(rule, legacyMarkers[m])) return true;
    }
    return false;
  }

  function ruleHasCurrentMarker_(rule) {
    return conditionalRuleHasMarker_(rule, marker);
  }

  function ruleIsSentinel_(rule) {
    if (!ruleHasCurrentMarker_(rule)) return false;
    try {
      var ranges = rule.getRanges ? rule.getRanges() : [];
      for (var r = 0; r < ranges.length; r++) {
        if (ranges[r].getRow() === 1 && ranges[r].getColumn() === 1) return true;
      }
    } catch(e) {}
    return false;
  }

  function currentRulesCoverRows_(rule) {
    if (!ruleHasCurrentMarker_(rule)) return false;
    try {
      var ranges = rule.getRanges ? rule.getRanges() : [];
      for (var r = 0; r < ranges.length; r++) {
        var rg = ranges[r];
        if (rg.getRow() <= 3 && (rg.getRow() + rg.getNumRows() - 1) >= neededEndRow) return true;
      }
    } catch(e) {}
    return false;
  }

  var existing = sh.getConditionalFormatRules ? sh.getConditionalFormatRules() : [];
  var hasCurrentSentinel = false;
  var currentRulesCoverData = false;
  for (var i = 0; i < existing.length; i++) {
    if (ruleIsSentinel_(existing[i])) hasCurrentSentinel = true;
    if (currentRulesCoverRows_(existing[i])) currentRulesCoverData = true;
  }

  // Current version already exists and covers the current data range: do nothing.
  // This prevents the previous repeated 40+ rule rebuild/accumulation problem.
  if (hasCurrentSentinel && currentRulesCoverData) return;

  var kept = [];
  for (var k = 0; k < existing.length; k++) {
    if (!ruleHasAnyManagedMarker_(existing[k])) kept.push(existing[k]);
  }

  var CF = {
    UP_BG:      '#fce8e6',
    UP_FG:      '#d93025',
    DOWN_BG:    '#e8f0fe',
    DOWN_FG:    '#1a73e8',
    WARN_BG:    '#fef3e2',
    WARN_FG:    '#e37400',
    NEW_BG:     '#e6f4ea',
    NEW_FG:     '#0f9d58',
    ACCEPT_BG:  '#e6f4ea',
    ACCEPT_FG:  '#0f9d58',
    REVIEW_BG:  '#f3e8fd',
    REVIEW_FG:  '#9334e6',
    MATCH_FG:   '#1565c0',
    NEUTRAL_FG: '#9e9e9e',
    FLAT_BG:    '#f1f3f4',
    FLAT_FG:    '#9e9e9e'
  };

  function rg_(col) { return sh.getRange(3, col, nRows, 1); }
  function rgBlock_(startCol, width) { return sh.getRange(3, startCol, nRows, width); }
  function add_(range, formula, bg, fg, bold) {
    var b = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(formula)
      .setRanges([range]);
    if (bg) b.setBackground(bg);
    if (fg) b.setFontColor(fg);
    if (bold) b.setBold(true);
    kept.push(b.build());
  }

  // B / ROW STATUS — status badge only, not whole-row fill.
  add_(rg_(2), '=AND(N("' + marker + '_ROW_NEW")=0,REGEXMATCH(UPPER($B3),"NEW"))', CF.NEW_BG, CF.NEW_FG, true);
  add_(rg_(2), '=AND(N("' + marker + '_ROW_DISC")=0,REGEXMATCH(UPPER($B3),"DISCONTINUED"))', CF.WARN_BG, CF.WARN_FG, true);
  add_(rg_(2), '=AND(N("' + marker + '_ROW_REVIEW")=0,REGEXMATCH(UPPER($B3),"REVIEW"))', CF.REVIEW_BG, CF.REVIEW_FG, true);
  add_(rg_(2), '=AND(N("' + marker + '_ROW_MATCH")=0,REGEXMATCH(UPPER($B3),"MATCHED"))', null, CF.MATCH_FG, true);

  // C / PRICE STATUS — price badge only. Supplier overrides are intentionally
  // shown in C so a user can immediately see whether their column G change was accepted.
  add_(rg_(3), '=AND(N("' + marker + '_SUP_PENDING_C")=0,REGEXMATCH(UPPER($C3),"SUP OVERRIDE PENDING"))', CF.WARN_BG, CF.WARN_FG, true);
  add_(rg_(3), '=AND(N("' + marker + '_SUP_ACCEPTED_C")=0,REGEXMATCH(UPPER($C3),"SUP OVERRIDE ACCEPTED"))', CF.ACCEPT_BG, CF.ACCEPT_FG, true);
  add_(rg_(3), '=AND(N("' + marker + '_SUP_REJECTED_C")=0,REGEXMATCH(UPPER($C3),"SUP OVERRIDE REJECTED"))', CF.UP_BG, CF.UP_FG, true);
  add_(rg_(3), '=AND(N("' + marker + '_PRICE_UP")=0,REGEXMATCH(UPPER($C3),"INCREASE"))', CF.UP_BG, CF.UP_FG, true);
  add_(rg_(3), '=AND(N("' + marker + '_PRICE_DOWN")=0,REGEXMATCH(UPPER($C3),"DECREASE"))', CF.DOWN_BG, CF.DOWN_FG, true);
  add_(rg_(3), '=AND(N("' + marker + '_PRICE_NEW")=0,REGEXMATCH(UPPER($C3),"NEW"))', CF.NEW_BG, CF.NEW_FG, true);
  add_(rg_(3), '=AND(N("' + marker + '_PRICE_DISC")=0,REGEXMATCH(UPPER($C3),"DISCONTINUED"))', CF.WARN_BG, CF.WARN_FG, true);
  add_(rg_(3), '=AND(N("' + marker + '_PRICE_REVIEW")=0,REGEXMATCH(UPPER($C3),"REVIEW"))', CF.REVIEW_BG, CF.REVIEW_FG, true);
  add_(rg_(3), '=AND(N("' + marker + '_PRICE_FLAT")=0,REGEXMATCH(UPPER($C3),"NO CHANGE"))', null, CF.NEUTRAL_FG, false);

  // Pricing movement columns — R:Y are visually quiet by default for non-new rows.
  // Grey/no-change rules are FONT-ONLY so native zebra banding remains visible.
  // T/U and X/Y only colour when the movement is meaningful, avoiding $0.01 /
  // 0.01%-style rounding noise from looking like a real change.
  var notNew = 'NOT(REGEXMATCH(UPPER($B3),"NEW PRODUCT"))';
  var wspPctAbs = 'ABS(IFERROR(VALUE(REGEXREPLACE(TO_TEXT($T3),"%","")),0))';
  var wspDollarAbs = 'ABS(IFERROR(VALUE(REGEXREPLACE(TO_TEXT($U3),"[^0-9.-]","")),0))';
  var lastPctAbs = 'ABS(IFERROR(VALUE(REGEXREPLACE(TO_TEXT($X3),"%","")),0))';
  var lastDollarAbs = 'ABS(IFERROR(VALUE(REGEXREPLACE(TO_TEXT($Y3),"[^0-9.-]","")),0))';
  var wspMeaningful = 'AND(' + wspPctAbs + '>=0.5,' + wspDollarAbs + '>=0.02)';
  var lastMeaningful = 'AND(' + lastPctAbs + '>=0.5,' + lastDollarAbs + '>=0.02)';

  add_(rgBlock_(18, 2), '=AND(N("' + marker + '_WSP_VALUES_GREY")=0,' + notNew + ')', null, CF.FLAT_FG, false);
  add_(rgBlock_(22, 2), '=AND(N("' + marker + '_LAST_VALUES_GREY")=0,' + notNew + ')', null, CF.FLAT_FG, false);
  add_(rgBlock_(20, 2), '=AND(N("' + marker + '_WSP_CHANGE_GREY")=0,' + notNew + ',NOT(' + wspMeaningful + '))', null, CF.FLAT_FG, false);
  add_(rgBlock_(24, 2), '=AND(N("' + marker + '_LAST_CHANGE_GREY")=0,' + notNew + ',NOT(' + lastMeaningful + '))', null, CF.FLAT_FG, false);

  add_(rg_(20), '=AND(N("' + marker + '_WSP_PCT_UP")=0,' + notNew + ',' + wspMeaningful + ',IFERROR(VALUE(REGEXREPLACE(TO_TEXT($T3),"%","")),0)>0)', CF.UP_BG, CF.UP_FG, true);
  add_(rg_(20), '=AND(N("' + marker + '_WSP_PCT_DOWN")=0,' + notNew + ',' + wspMeaningful + ',IFERROR(VALUE(REGEXREPLACE(TO_TEXT($T3),"%","")),0)<0)', CF.DOWN_BG, CF.DOWN_FG, true);
  add_(rg_(21), '=AND(N("' + marker + '_WSP_DOLLAR_UP")=0,' + notNew + ',' + wspMeaningful + ',IFERROR(VALUE(REGEXREPLACE(TO_TEXT($U3),"[^0-9.-]","")),0)>0)', CF.UP_BG, CF.UP_FG, true);
  add_(rg_(21), '=AND(N("' + marker + '_WSP_DOLLAR_DOWN")=0,' + notNew + ',' + wspMeaningful + ',IFERROR(VALUE(REGEXREPLACE(TO_TEXT($U3),"[^0-9.-]","")),0)<0)', CF.DOWN_BG, CF.DOWN_FG, true);
  add_(rg_(24), '=AND(N("' + marker + '_LAST_PCT_UP")=0,' + notNew + ',' + lastMeaningful + ',IFERROR(VALUE(REGEXREPLACE(TO_TEXT($X3),"%","")),0)>0)', CF.UP_BG, CF.UP_FG, true);
  add_(rg_(24), '=AND(N("' + marker + '_LAST_PCT_DOWN")=0,' + notNew + ',' + lastMeaningful + ',IFERROR(VALUE(REGEXREPLACE(TO_TEXT($X3),"%","")),0)<0)', CF.DOWN_BG, CF.DOWN_FG, true);
  add_(rg_(25), '=AND(N("' + marker + '_LAST_DOLLAR_UP")=0,' + notNew + ',' + lastMeaningful + ',IFERROR(VALUE(REGEXREPLACE(TO_TEXT($Y3),"[^0-9.-]","")),0)>0)', CF.UP_BG, CF.UP_FG, true);
  add_(rg_(25), '=AND(N("' + marker + '_LAST_DOLLAR_DOWN")=0,' + notNew + ',' + lastMeaningful + ',IFERROR(VALUE(REGEXREPLACE(TO_TEXT($Y3),"[^0-9.-]","")),0)<0)', CF.DOWN_BG, CF.DOWN_FG, true);

  // Z:AA no-change RRP block — outside the R:Y pricing quiet-zone request.
  add_(rgBlock_(26, 2), '=AND(N("' + marker + '_RRP_NO_CHANGE")=0,LEN($Z3&$AA3)>0,ABS(IFERROR(VALUE(REGEXREPLACE(TO_TEXT($AA3),"[^0-9.-]","")),0)-IFERROR(VALUE(REGEXREPLACE(TO_TEXT($Z3),"[^0-9.-]","")),0))<0.005)', null, CF.FLAT_FG, false);

  // Z / CURRENT RRP and AA / NEW RRP — highlight only the higher RRP.
  // The lower/non-used RRP is intentionally left uncoloured so it falls back to normal banding.
  add_(rg_(26), '=AND(N("' + marker + '_CURRENT_RRP_HIGHER")=0,IFERROR(VALUE(REGEXREPLACE(TO_TEXT($Z3),"[^0-9.-]","")),0)>IFERROR(VALUE(REGEXREPLACE(TO_TEXT($AA3),"[^0-9.-]","")),0))', CF.NEW_BG, CF.NEW_FG, true);
  add_(rg_(27), '=AND(N("' + marker + '_NEW_RRP_HIGHER")=0,IFERROR(VALUE(REGEXREPLACE(TO_TEXT($AA3),"[^0-9.-]","")),0)>IFERROR(VALUE(REGEXREPLACE(TO_TEXT($Z3),"[^0-9.-]","")),0))', CF.NEW_BG, CF.NEW_FG, true);

  // AN / manual markup or actual shelf RRP. Only filled override cells go orange.
  add_(rg_(40), '=AND(N("' + marker + '_RRP_MARKUP_OVERRIDE")=0,LEN($AN3)>0)', CF.WARN_BG, CF.WARN_FG, true);

  // AO / FINAL SHELF RRP movement. Compare the numeric POS RRP output in BE
  // against the current POS RRP in Z. Do not mark new/no-baseline rows as
  // red increases simply because the current RRP is blank.
  var finalShelfRrpVal = 'IFERROR(VALUE(REGEXREPLACE(TO_TEXT($BE3),"[^0-9.-]","")),0)';
  var currentRrpVal = 'IFERROR(VALUE(REGEXREPLACE(TO_TEXT($Z3),"[^0-9.-]","")),0)';
  add_(rg_(41), '=AND(N("' + marker + '_FINAL_SHELF_RRP_UP")=0,' + currentRrpVal + '>0,' + finalShelfRrpVal + '>' + currentRrpVal + '+0.004)', CF.UP_BG, CF.UP_FG, true);
  add_(rg_(41), '=AND(N("' + marker + '_FINAL_SHELF_RRP_DOWN")=0,' + currentRrpVal + '>0,' + finalShelfRrpVal + '<' + currentRrpVal + '-0.004)', CF.DOWN_BG, CF.DOWN_FG, true);
  add_(rg_(41), '=AND(N("' + marker + '_FINAL_SHELF_RRP_FLAT")=0,' + currentRrpVal + '>0,ABS(' + finalShelfRrpVal + '-' + currentRrpVal + ')<0.005)', null, CF.FLAT_FG, false);

  // AD / AE markup warnings — cells contain text such as "149.96%\nGP NGST 38.65%".
  add_(rg_(30), '=AND(N("' + marker + '_AD_LOW_GP")=0,IFERROR(VALUE(REGEXEXTRACT(TO_TEXT($AD3),"GP NGST ([0-9.]+)%")),999)<35)', CF.WARN_BG, CF.WARN_FG, true);
  add_(rg_(31), '=AND(N("' + marker + '_AE_LOW_GP")=0,IFERROR(VALUE(REGEXEXTRACT(TO_TEXT($AE3),"GP NGST ([0-9.]+)%")),999)<35)', CF.WARN_BG, CF.WARN_FG, true);

  // J / OLD BRAND and L / BARCODE UPDATE — only when populated.
  add_(rg_(10), '=AND(N("' + marker + '_OLD_BRAND")=0,LEN($J3)>0)', CF.WARN_BG, CF.WARN_FG, true);
  add_(rg_(12), '=AND(N("' + marker + '_BARCODE_UPDATE")=0,LEN($L3)>0)', CF.WARN_BG, CF.WARN_FG, true);

  // AG:AJ / match-audit checkbox columns — BC, SUB ID, BRAND, WSP.
  // Keep each checkbox column independently coloured instead of applying AG's
  // result across the whole AG:AJ block.
  ['AG','AH','AI','AJ'].forEach(function(colLetter, auditOffset) {
    var colNum = 33 + auditOffset;
    add_(rg_(colNum), '=AND(N("' + marker + '_AUDIT_OK_' + colLetter + '")=0,LEFT(TO_TEXT(' + colLetter + '3),1)="☑")', CF.NEW_BG, CF.NEW_FG, true);
    add_(rg_(colNum), '=AND(N("' + marker + '_AUDIT_FAIL_' + colLetter + '")=0,LEFT(TO_TEXT(' + colLetter + '3),1)="☒")', CF.UP_BG, CF.UP_FG, true);
    add_(rg_(colNum), '=AND(N("' + marker + '_AUDIT_UNKNOWN_' + colLetter + '")=0,LEFT(TO_TEXT(' + colLetter + '3),1)="☐")', null, CF.FLAT_FG, false);
  });

  // Discontinued rows use the same AG:AJ checkbox indicators as matched rows.
  // Do not apply a separate discontinued orange strip here, otherwise it masks
  // the independent green/red/grey audit checkbox colours.

  // G / UPDATED SUPPLIER and N / POS SUB ID — supplier override visual feedback.
  // Pending manual supplier changes are orange immediately. Accepted rows keep
  // G/N orange as the manual override marker, while only C turns green. Rejected
  // rows deliberately do NOT colour G/N because refresh reverts those cells.
  var overridePendingOrAcceptedFormula = '=AND(N("' + marker + '_SUP_OVERRIDE_GN_ORANGE")=0,OR(REGEXMATCH(UPPER($C3),"SUP OVERRIDE PENDING|SUP OVERRIDE ACCEPTED"),AND(LEN($G3)>0,LEN($AX3)>0,IFERROR(REGEXEXTRACT(TO_TEXT($G3),"\\(([^)]+)\\)\\s*$"),REGEXREPLACE(TO_TEXT($G3),"[^0-9]",""))<>TO_TEXT($AX3),NOT(REGEXMATCH(UPPER($C3&" "&$AF3),"SUP OVERRIDE REJECTED|SUPPLIER OVERRIDE REJECTED|SUPPLIER CHANGE REJECTED")))))';
  add_(rg_(7),  overridePendingOrAcceptedFormula, CF.WARN_BG, CF.WARN_FG, true);
  add_(rg_(14), overridePendingOrAcceptedFormula, CF.WARN_BG, CF.WARN_FG, true);

  // Sentinel rule. It is deliberately scoped to A1 and styled to match row 1,
  // so it acts as a current-version marker without changing visible workbook UX.
  var sentinel = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=N("' + marker + '_SENTINEL")=0')
    .setRanges([sh.getRange('A1')])
    .setFontColor((typeof LEGEND !== 'undefined' && LEGEND.TITLE_FG) ? LEGEND.TITLE_FG : '#ffd966')
    .setBackground((typeof LEGEND !== 'undefined' && LEGEND.TITLE_BG) ? LEGEND.TITLE_BG : '#1e3a5f')
    .build();
  kept.push(sentinel);

  try {
    sh.setConditionalFormatRules(kept);
  } catch(eSet) {
    try { log_('[OUT VISUAL] conditional formatting rebuild failed: ' + eSet.message); } catch(_eLog) {}
  }
}

function conditionalRuleHasMarker_(rule, marker) {
  try {
    var bc = rule.getBooleanCondition && rule.getBooleanCondition();
    if (!bc) return false;
    var vals = bc.getCriteriaValues ? bc.getCriteriaValues() : [];
    for (var i = 0; i < vals.length; i++) {
      if (String(vals[i] || '').indexOf(marker) >= 0) return true;
    }
  } catch(e) {}
  return false;
}

function m13FormatStatusKey_(value) {
  var s = String(value || '').toUpperCase()
    .replace(/[✅🟢⛔⚠️➕🔴🟠🔵⭐•]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (s.indexOf('NEW') >= 0) return 'NEW';
  if (s.indexOf('MATCHED') >= 0) return 'MATCHED';
  if (s.indexOf('DISCONTINUED') >= 0) return 'DISCONTINUED';
  if (s.indexOf('REVIEW') >= 0) return 'REVIEW';
  return s;
}

function boundFormulaRanges_(formula, endRow) {
  return String(formula || '').replace(/\b([A-Z]{1,3})3:\1(?!\d)/g, function(_, col) {
    return col + '3:' + col + endRow;
  });
}

function rebuildTotals_(sh, schema, lastRow) {
  var name = sh.getName();
  var _tmpNames = [CFG.SH.TMP_MERGED, 'TMP_MERGED_POS_DATA'];
  if (_tmpNames.indexOf(name) >= 0) {
    try { var lc = sh.getLastColumn(); if (lc > 1) sh.getRange(1, 2, 1, lc - 1).clearContent(); } catch(e) {}
  }
  if (name === CFG.SH.IN_SUP) {
    var col = colLetter_(CFG.SUP_STATUS_COL);
    var a = col+'3', r = col+'3:'+col;
    var f0 = '="TOTAL: "&TEXT(SUBTOTAL(103,A3:A),"#,##0")' +
      '&"  |  ⭐ MATCHED: "&SUMPRODUCT((SUBTOTAL(103,OFFSET('+a+',ROW('+r+')-ROW('+a+'),0,1,1)))*(--REGEXMATCH(UPPER('+r+'),"BEST BUY.*MATCHED|^MATCHED$")))' +
      '&"  |  🟢 NEW: "&SUMPRODUCT((SUBTOTAL(103,OFFSET('+a+',ROW('+r+')-ROW('+a+'),0,1,1)))*(--REGEXMATCH(UPPER('+r+'),"BEST BUY.*NEW|^NEW")))' +
      '&"  |  🚫 NOT USED: "&SUMPRODUCT((SUBTOTAL(103,OFFSET('+a+',ROW('+r+')-ROW('+a+'),0,1,1)))*(--REGEXMATCH(UPPER('+r+'),"NOT USED")))' +
      '&"  |  ⚠️ UNMATCHABLE: "&SUMPRODUCT((SUBTOTAL(103,OFFSET('+a+',ROW('+r+')-ROW('+a+'),0,1,1)))*(--REGEXMATCH(UPPER('+r+'),"UNMATCHABLE")))';
    var f1 = '="SUPPLIER NAMES: "&TEXT(IFERROR(COUNTA(UNIQUE(FILTER(B3:B,B3:B<>"",MAP(B3:B,LAMBDA(c,SUBTOTAL(103,c)))=1))),0),"#,##0")';
    var f2 = '="TOTAL POS SUPPLIERS: "&TEXT(IFERROR(COUNTA(UNIQUE(FILTER(C3:C,C3:C<>"",MAP(C3:C,LAMBDA(c,SUBTOTAL(103,c)))=1))),0),"#,##0")';
    var f4 = '="UNIQUE BRANDS: "&TEXT(IFERROR(COUNTA(UNIQUE(FILTER(E3:E,E3:E<>"",MAP(E3:E,LAMBDA(c,SUBTOTAL(103,c)))=1))),0),"#,##0")';
    var _F2 = CFG.FONT, _WRAP2 = SpreadsheetApp.WrapStrategy.WRAP;
    [[1,f0],[2,f1],[3,f2],[5,f4]].forEach(function(p) {
      sh.getRange(1, p[0]).setFormula(p[1]).setNumberFormat('@')
        .setBackground(LEGEND.TITLE_BG).setFontColor(LEGEND.TITLE_FG)
        .setFontFamily(_F2.FAMILY).setFontSize(_F2.SIZE)
        .setFontWeight('bold').setFontStyle('normal')
        .setHorizontalAlignment('center').setVerticalAlignment('middle')
        .setWrapStrategy(_WRAP2);
    });
    var _supSchema = SCHEMA[name];
    if (_supSchema && _supSchema.totals) {
      ['J','K'].forEach(function(letter) {
        var f = _supSchema.totals[letter]; if (!f) return;
        sh.getRange(1, col_(letter)).setFormula(f).setNumberFormat('@')
          .setBackground(LEGEND.TITLE_BG).setFontColor(LEGEND.TITLE_FG)
          .setFontFamily(_F2.FAMILY).setFontSize(_F2.SIZE)
          .setFontWeight('bold').setFontStyle('normal')
          .setHorizontalAlignment('center').setVerticalAlignment('middle')
          .setWrapStrategy(_WRAP2);
      });
    }
    return;
  }
  if (!schema || !schema.totals) return;
  var _F = CFG.FONT, _WRAP = SpreadsheetApp.WrapStrategy.WRAP;
  var _writtenCols = {};
  Object.keys(schema.totals).forEach(function(letter) {
    var f = schema.totals[letter];
    var colIdx = col_(letter);
    _writtenCols[colIdx] = true;
    if (!f) return;
    sh.getRange(1, colIdx).setFormula(f).setNumberFormat('@')
      .setBackground(LEGEND.TITLE_BG).setFontColor(LEGEND.TITLE_FG)
      .setFontFamily(_F.FAMILY).setFontSize(_F.SIZE)
      .setFontWeight('bold').setFontStyle('normal')
      .setHorizontalAlignment('center').setVerticalAlignment('middle')
      .setWrapStrategy(_WRAP);
  });
  var _lastC = Math.max(sh.getLastColumn(), (schema.headers ? schema.headers.length : 1));
  var _unstyledCols = [];
  for (var _ci = 1; _ci <= _lastC; _ci++) {
    if (!_writtenCols[_ci]) _unstyledCols.push(colLetter_(_ci) + '1');
  }
  if (_unstyledCols.length) {
    try {
      sh.getRangeList(_unstyledCols)
        .setBackground(LEGEND.TITLE_BG).setFontColor(LEGEND.TITLE_FG)
        .setFontFamily(_F.FAMILY).setFontSize(_F.SIZE)
        .setFontWeight('bold').setFontStyle('normal')
        .setHorizontalAlignment('center').setVerticalAlignment('middle')
        .setWrapStrategy(_WRAP);
    } catch(e) {}
  }
}

function rebuildSupplierTotals_(ss, sh) {
  if (!sh) return;
  var lastRow = Math.max(sh.getLastRow(), 3);
  try { rebuildTotals_(sh, null, lastRow); } catch(e) { log_('[rebuildSupplierTotals_] ' + e.message); }
}


// =============================================================================
//  CLEAR HELPERS
// =============================================================================
function clearRows_(sh) {
  clearFilter_(sh);
  var name = sh.getName ? sh.getName() : '';
  var lastRow = sh.getLastRow(), maxC = sh.getMaxColumns(), maxR = sh.getMaxRows();

  // TMP is a large working input. Do not delete rows or wipe its established
  // body formatting/banding, because the user often clears then repastes a new
  // TMP export. Content-only clear is faster and preserves the paste target.
  if (name === CFG.SH.TMP_MERGED) {
    var clearLastCol = Math.max(sh.getLastColumn(), (SCHEMA[name] && SCHEMA[name].headers ? SCHEMA[name].headers.length : maxC));
    if (lastRow >= 3) {
      var nRows = lastRow - 2;
      var chunkSize = 3000;
      for (var r = 0; r < nRows; r += chunkSize) {
        var len = Math.min(chunkSize, nRows - r);
        var rng = sh.getRange(3 + r, 1, len, clearLastCol);
        rng.clearContent();
        try { rng.clearNote(); } catch(eNote) {}
      }
    }
    return;
  }

  if (lastRow >= 3) sh.getRange(3, 1, lastRow - 2, maxC).clear({ contentsOnly: true, formatOnly: true });
  try { sh.getRange(3, 1, 1, Math.max(maxC, 1)).setBackground(LEGEND.STATUS_BLANK_BG).setFontWeight('normal'); } catch(e) {}
  if (maxR > 4) { try { sh.deleteRows(4, maxR - 3); } catch(e) {} }
}

function clearFilter_(sh) {
  try { var f = sh.getFilter(); if (f) f.remove(); } catch(e) {}
}

function trimSheet_(sh) {
  try {
    var schema = SCHEMA[sh.getName()];
    var maxR   = sh.getMaxRows(), maxC = sh.getMaxColumns();
    var lastR  = Math.max(sh.getLastRow(), 3);
    var lastC  = Math.max(sh.getLastColumn(), 3);
    if (schema && schema.headers && schema.headers.length) lastC = Math.max(lastC, schema.headers.length);
    if (maxR <= 5000 && maxR > lastR + 10) sh.deleteRows(lastR + 6, maxR - lastR - 5);
    if (maxC > lastC) sh.deleteColumns(lastC + 1, maxC - lastC);
  } catch(e) {}
}

function formatCurrentSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getActiveSheet();
  var t0 = Date.now();
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(5000)) {
    ss.toast('Another POS Merge task is still running. Try again once it finishes.', '⏳ Format not started', 8);
    return;
  }
  try {
    applyFormat_(ss, sh);
    try {
      var _lr = sh.getLastRow(), _lc = sh.getLastColumn();
      if (_lr >= 2 && _lc >= 1 && !sh.getFilter()) sh.getRange(2, 1, Math.max(_lr - 1, 1), _lc).createFilter();
    } catch(eFilter) {}
    try { SpreadsheetApp.flush(); } catch(eFlush) {}
    ss.toast('✅ ' + fmt_(Math.max(0, sh.getLastRow() - 2)) + ' rows formatted (' + ((Date.now() - t0) / 1000).toFixed(1) + 's)', '📐 Done', 6);
  } catch(err) {
    ss.toast('Format failed: ' + (err && err.message ? err.message : err), '❌ Format', 10);
    throw err;
  } finally {
    try { lock.releaseLock(); } catch(eUnlock) {}
  }
}

function formatWorkbook() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(5000)) {
    ss.toast('Another POS Merge task is still running. Try again once it finishes.', '⏳ Format not started', 8);
    return;
  }
  try {
    ss.getSheets().forEach(function(sh) { applyFormat_(ss, sh, true); });
    ensureAllFilters_(ss);
    try { SpreadsheetApp.flush(); } catch(eFlush) {}
    ss.toast('✅ All sheets formatted.', '📚 Done', 6);
  } catch(err) {
    ss.toast('Workbook format failed: ' + (err && err.message ? err.message : err), '❌ Format', 10);
    throw err;
  } finally {
    try { lock.releaseLock(); } catch(eUnlock) {}
  }
}



// =============================================================================
//  SUPPLIER SHEET SCHEMA REPAIR
// =============================================================================
/**
 * Ensures IN_SUPPLIER_/_PRODUCT_UPDATES uses the local 16-column layout:
 * A INDEX, B POS SUPPLIER NAME, C POS SUPPLIER NUMBER, D SUP BARCODE,
 * E SUP BRAND, F SUP SUB ID, G SUP PRODUCT, H:O supplier values, P STATUS.
 *
 * If the older 15-column layout is detected, this inserts the missing
 * POS SUPPLIER NAME column after INDEX and shifts the existing data right.
 */
function ensureSupplierSheetSchema_(sh, opt) {
  opt = opt || {};
  if (!sh || sh.getName() !== CFG.SH.IN_SUP) return false;

  var expected = (SCHEMA[CFG.SH.IN_SUP] && SCHEMA[CFG.SH.IN_SUP].headers) || [];
  if (!expected.length) return false;

  ensureCol_(sh, expected.length);

  var maxRead = Math.max(sh.getLastColumn(), expected.length);
  var hdr = sh.getRange(2, 1, 1, maxRead).getDisplayValues()[0].map(function(v) {
    return String(v || '').trim().toUpperCase();
  });

  var hasSupplierName = hdr.indexOf('POS SUPPLIER NAME') >= 0;
  var colB = hdr[1] || '';
  var colC = hdr[2] || '';

  // Old layout: A INDEX, B POS SUPPLIER NUMBER, C SUP BARCODE...
  // Insert the missing supplier-name column at B, preserving data by shifting right.
  if (!hasSupplierName && (colB === 'POS SUPPLIER NUMBER' || colC === 'SUP BARCODE')) {
    sh.insertColumnAfter(1);
  }

  ensureCol_(sh, expected.length);
  sh.getRange(2, 1, 1, expected.length).setValues([expected]);

  if (opt.populateSupplierNames !== false) {
    populateSupplierNames_(sh, opt.supplierMap || loadLocalSupplierMap_());
  }
  return true;
}

function loadLocalSupplierMap_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var map = {};
  try {
    var sh = ss.getSheetByName(CFG.SH.SRC_SUPP);
    if (!sh || sh.getLastRow() < 3) return map;
    var data = sh.getRange(3, 1, sh.getLastRow() - 2, Math.min(4, sh.getLastColumn())).getDisplayValues();
    for (var i = 0; i < data.length; i++) {
      var acc = String(data[i][1] || '').trim();
      var name = String(data[i][2] || '').trim();
      if (acc && name) map[acc] = name;
    }
  } catch(e) {}
  return map;
}

function populateSupplierNames_(sh, supplierMap) {
  if (!sh || sh.getName() !== CFG.SH.IN_SUP) return 0;
  supplierMap = supplierMap || {};
  var lastRow = sh.getLastRow();
  if (lastRow < 3) return 0;

  // After schema repair: B = supplier name, C = supplier number.
  var nRows = lastRow - 2;
  var nums = sh.getRange(3, 3, nRows, 1).getDisplayValues();
  var names = sh.getRange(3, 2, nRows, 1).getDisplayValues();
  var out = new Array(nRows);
  var changed = 0;

  for (var i = 0; i < nRows; i++) {
    var existing = String(names[i][0] || '').trim();
    var num = String(nums[i][0] || '').trim();
    var mapped = num && supplierMap[num] ? supplierMap[num] : '';
    var next = existing || mapped;
    if (!existing && mapped) changed++;
    out[i] = [next];
  }

  if (changed > 0) sh.getRange(3, 2, nRows, 1).setValues(out);
  return changed;
}


// =============================================================================
//  FORMAT-TIME STATUS RESET HELPERS
// =============================================================================
/**
 * Clears only helper/status columns that are regenerated by workflow functions.
 * This is intentionally conservative: product/source data is never cleared here.
 *
 * Format Current Sheet / Format popup behaviour:
 *   - IN_SUPPLIER_/_PRODUCT_UPDATES: clears P STATUS values + notes + old colour.
 *   - SRC_POS_FIND_REPLACE: clears D SRC STATUS.
 *   - SRC_POS_BRAND_NAME_CHANGES: clears D SRC STATUS.
 *   - SRC_POS_PRODUCT_PREFIX: clears E SRC STATUS.
 *   - SRC_POS_SUPPLIERS: clears D SRC STATUS.
 *   - SRC_POS_ONGOING_DISCOUNTS: clears K POS MATCH.
 */
function resetRefreshDrivenStatusColumnsForFormat_(sh) {
  if (!sh) return 0;
  var name = sh.getName ? sh.getName() : '';
  if (!name || sh.getLastRow() < 3) return 0;

  if (name === CFG.SH.IN_SUP) {
    return resetSupplierStatusColumn_(sh, { resetTextStyle: true, resetBackground: true });
  }

  var col = 0;
  if (name === CFG.SH.SRC_FR) col = 4;       // D / SRC STATUS
  else if (name === CFG.SH.SRC_BRANDS) col = 4;  // D / SRC STATUS
  else if (name === CFG.SH.SRC_PREFIX) col = 5;  // E / SRC STATUS
  else if (name === CFG.SH.SRC_SUPP) col = 4;    // D / SRC STATUS
  else if (name === CFG.SH.SRC_DISC) col = 11;   // K / POS MATCH
  else return 0;

  return resetSingleRefreshStatusColumn_(sh, col, {
    resetTextStyle: true,
    resetBackground: true,
    clearNotes: true
  });
}

function resetSingleRefreshStatusColumn_(sh, col, opt) {
  opt = opt || {};
  if (!sh || !col || col < 1) return 0;
  var lastRow = sh.getLastRow();
  if (lastRow < 3) return 0;
  ensureCol_(sh, col);

  var nRows = lastRow - 2;
  var rng = sh.getRange(3, col, nRows, 1);
  rng.clearContent();
  if (opt.clearNotes !== false) { try { rng.clearNote(); } catch(eNote) {} }

  if (opt.resetTextStyle === true) {
    rng.setFontColor(LEGEND.STATUS_FG)
      .setFontStyle('italic')
      .setFontWeight('normal')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle')
      .setNumberFormat('@');
  }

  if (opt.resetBackground === true) {
    applySingleColumnBaseBackground_(sh, col, nRows);
  }
  return nRows;
}

function applySingleColumnBaseBackground_(sh, col, nRows) {
  if (!sh || !col || nRows <= 0) return;
  ensureCol_(sh, col);
  var odd = (typeof LEGEND !== 'undefined' && LEGEND.ALT_ODD) ? LEGEND.ALT_ODD : '#f5f5f5';
  var even = (typeof LEGEND !== 'undefined' && LEGEND.ALT_EVEN) ? LEGEND.ALT_EVEN : '#e9f0f5';
  var chunk = 2000;
  for (var start = 0; start < nRows; start += chunk) {
    var len = Math.min(chunk, nRows - start);
    var bgs = new Array(len);
    for (var i = 0; i < len; i++) bgs[i] = [((start + i) % 2 === 0) ? odd : even];
    sh.getRange(3 + start, col, len, 1).setBackgrounds(bgs);
  }
}

// =============================================================================
//  SUPPLIER STATUS COLUMN HELPERS
// =============================================================================
/**
 * Clears only the supplier STATUS output cells in column P.
 *
 * Intentional behaviour:
 *   - clears values
 *   - clears notes
 *   - optionally restores the STATUS text style
 *   - optionally restores column P's base alternating background
 *
 * Supplier-sheet Format calls this near the start and now also restores Column P
 * base alternating background immediately, so stale highlight/status colours
 * cannot remain visible during reformatting or after reruns.
 */
function resetSupplierStatusColumn_(sh, opt) {
  opt = opt || {};
  if (!sh || sh.getName() !== CFG.SH.IN_SUP) return 0;

  try { setupInvalidateSupplierStatusFingerprint_('supplier-status-reset'); } catch (_statusFpReset) {}

  var lastRow = sh.getLastRow();
  if (lastRow < 3) return 0;

  var col = CFG.SUP_STATUS_COL || 16;
  ensureCol_(sh, col);

  var nRows = lastRow - 2;
  var rng = sh.getRange(3, col, nRows, 1);

  // IMPORTANT: do not use Range.clear() here. It is too destructive for this
  // workflow because it can remove the visible row/background styling the user
  // expects to keep. STATUS reset means: remove old status text + notes, then
  // optionally restore only the STATUS text style and/or base row background.
  rng.clearContent();
  try { rng.clearNote(); } catch(e) {}

  if (opt.resetTextStyle === true) {
    rng.setFontColor(LEGEND.STATUS_FG)
      .setFontStyle('italic')
      .setFontWeight('normal')
      .setHorizontalAlignment('center')
      .setNumberFormat('@');
  }

  // Supplier Format / Clear / Highlight preflight can request a base-background
  // reset for P only. This deliberately touches only the STATUS column, not
  // the whole supplier table.
  if (opt.resetBackground === true) {
    applySupplierStatusBaseBackground_(sh, nRows);
  }

  return nRows;
}

function applySupplierStatusBaseBackground_(sh, nRows) {
  if (!sh || nRows <= 0) return;
  applySingleColumnBaseBackground_(sh, CFG.SUP_STATUS_COL || 16, nRows);
}

// Backwards-compatible name used by the format/clear popup.
function clearStatusColumn_(sh) {
  return resetSupplierStatusColumn_(sh, { resetTextStyle: true, resetBackground: true });
}

function ensureCol_(sh, col) {
  if (sh.getMaxColumns() < col) sh.insertColumnsAfter(sh.getMaxColumns(), col - sh.getMaxColumns());
}


// =============================================================================
//  SUPPLIER STATUS FRESHNESS FINGERPRINT — v6.3.77
// =============================================================================
// Highlight is intentionally still the single source of STATUS truth. The
// filtered-brand build must know whether those STATUS values belong to the
// current supplier/TMP/reference inputs without re-reading the entire TMP body.
// A lightweight source-generation fingerprint is invalidated by relevant edits
// and stamped current only after Highlight finishes writing STATUS column P.
function setupSupplierStatusFingerprintKeys_() {
  return {
    SOURCE_GEN: 'M13_SUPPLIER_STATUS_SOURCE_GENERATION',
    HIGHLIGHT_GEN: 'M13_SUPPLIER_STATUS_HIGHLIGHT_GENERATION',
    HIGHLIGHT_META: 'M13_SUPPLIER_STATUS_HIGHLIGHT_META'
  };
}

function setupSupplierStatusSourceGeneration_() {
  var keys = setupSupplierStatusFingerprintKeys_();
  try {
    var raw = PropertiesService.getDocumentProperties().getProperty(keys.SOURCE_GEN);
    var n = Number(raw || 0);
    return isFinite(n) && n >= 0 ? n : 0;
  } catch (_statusFpRead) {
    return 0;
  }
}

function setupInvalidateSupplierStatusFingerprint_(reason) {
  var keys = setupSupplierStatusFingerprintKeys_();
  try {
    var props = PropertiesService.getDocumentProperties();
    var current = Number(props.getProperty(keys.SOURCE_GEN) || 0);
    if (!isFinite(current) || current < 0) current = 0;
    current += 1;
    props.setProperty(keys.SOURCE_GEN, String(current));
    props.setProperty(keys.HIGHLIGHT_META, JSON.stringify({
      current: false,
      reason: String(reason || 'source-change'),
      sourceGeneration: current,
      changedAt: new Date().toISOString()
    }));
    return current;
  } catch (_statusFpInvalidate) {
    return -1;
  }
}

function setupMarkSupplierStatusFingerprintCurrent_() {
  var keys = setupSupplierStatusFingerprintKeys_();
  try {
    var props = PropertiesService.getDocumentProperties();
    var current = setupSupplierStatusSourceGeneration_();
    props.setProperty(keys.HIGHLIGHT_GEN, String(current));
    props.setProperty(keys.HIGHLIGHT_META, JSON.stringify({
      current: true,
      sourceGeneration: current,
      highlightedAt: new Date().toISOString(),
      version: SCRIPT_VERSION
    }));
    return true;
  } catch (_statusFpMark) {
    return false;
  }
}

function setupIsSupplierStatusFingerprintCurrent_() {
  var keys = setupSupplierStatusFingerprintKeys_();
  try {
    var props = PropertiesService.getDocumentProperties();
    var highlighted = props.getProperty(keys.HIGHLIGHT_GEN);
    if (highlighted === null) return false;
    return Number(highlighted) === setupSupplierStatusSourceGeneration_();
  } catch (_statusFpCurrent) {
    return false;
  }
}

function setupInvalidateSupplierStatusFromEdit_(e) {
  if (!e || !e.range) return false;
  var rng = e.range;
  var sh = rng.getSheet();
  if (!sh) return false;

  var name = sh.getName();
  var row1 = rng.getRow();
  var row2 = row1 + rng.getNumRows() - 1;
  var col1 = rng.getColumn();
  var col2 = col1 + rng.getNumColumns() - 1;
  if (row2 < 3) return false;

  var relevant = false;
  if (name === CFG.SH.IN_SUP) {
    // A:O are Highlight inputs. A manual edit to P / STATUS also makes the
    // prior Highlight fingerprint unsafe. Script-driven STATUS writes do not
    // fire simple onEdit, so the successful Highlight can still stamp current.
    relevant = col1 <= 16 && col2 >= 1;
  } else if (name === CFG.SH.TMP_MERGED) {
    relevant = true;
  } else if (
    name === CFG.SH.SRC_BRANDS ||
    name === CFG.SH.SRC_SUPP ||
    name === CFG.SH.SRC_DISC ||
    name === CFG.SH.SRC_FR ||
    name === CFG.SH.SRC_PREFIX
  ) {
    relevant = true;
  }

  if (!relevant) return false;
  setupInvalidateSupplierStatusFingerprint_('edit:' + name + ':' + row1 + '-' + row2 + ':' + col1 + '-' + col2);
  return true;
}


// =============================================================================
//  PASTE / MANUAL ENTRY STYLE GUARD + OUT_MERGED_DATA SUPPLIER EDIT ROUTER
// =============================================================================
/**
 * Simple trigger:
 *   1) strips pasted/keyed data-area styling back to workbook defaults;
 *   2) detects Column G / UPDATED SUPPLIER edits, including multi-cell paste;
 *   3) applies the orange pending state immediately and queues only edited rows;
 *   4) applies green/red state styling when Column C / PRICE STATUS is accepted/rejected.
 *
 * Heavy supplier validation is intentionally not run inside simple onEdit. The
 * menu refresh uses the queued row list, so pasted supplier blocks stay fast.
 */
function onEdit(e) {
  normalizeEditedDataStyle_(e);

  // v6.3.87: pasted data on input / SRC sheets gets INDEX, alternating rows,
  // trim and row-2 filter straight away (no Format Current Sheet needed).
  try { setupAutoTidyAfterPaste_(e); } catch (errTidy) { try { log_('[onEdit paste tidy] ' + errTidy.message); } catch (_logTidy) {} }

  // v6.3.77: invalidate the supplier STATUS fingerprint only when a source data
  // area changes. Applying/changing a sheet filter does not trigger this path.
  try { setupInvalidateSupplierStatusFromEdit_(e); } catch (errFp) { try { log_('[onEdit STATUS fingerprint] ' + errFp.message); } catch (_logFp) {} }

  // v6.3.69 surgical: source-sheet helpers only.
  // - SRC_POS_ONGOING_DISCOUNTS: keep H as % and I as decimal when edited/pasted.
  // - IN_SUPPLIER_/_PRODUCT_UPDATES: when supplier name is entered in B, fill account number in C.
  try { setupHandleSourceSheetEdits_(e); } catch (errSrc) { try { log_('[onEdit source sheet handler] ' + errSrc.message); } catch (_logSrc) {} }

  try { m13HandleOutMergedEdit_(e); } catch (err) { try { log_('[onEdit OUT supplier handler] ' + err.message); } catch (_log) {} }
}

// =============================================================================
//  v6.3.87 PASTE AUTO-TIDY — INDEX, ALTERNATING ROW COLOURS, TRIM, FILTER
//  When data is pasted into an input / SRC sheet, the pasted rows are finished
//  the same way Format Current Sheet finishes them, without a full re-format:
//    • column A INDEX renumbered 1, 2, 3… (only rows that are wrong are rewritten)
//    • native alternating-row banding extended over every data row; pasted cells
//      drop their own fill so the banding shows (and stays right after sorting)
//    • spare empty rows / columns trimmed (existing trimSheet_)
//    • row-2 filter added, or extended over the new rows when no filter is in use
//  OUT_MERGED_DATA / OUT_POS_INSERT / OUT_POS_UPDATE are script output and keep
//  their existing edit handling.
// =============================================================================
function setupAutoTidyAfterPaste_(e) {
  if (!e || !e.range) return false;
  var rng = e.range;
  var sh = rng.getSheet();
  if (!sh) return false;

  var name = sh.getName();
  var schema = (typeof SCHEMA !== 'undefined' && SCHEMA) ? SCHEMA[name] : null;
  if (!schema || !schema.headers || !schema.headers.length) return false;
  if (name === CFG.SH.OUT_MERGED || name === CFG.SH.OUT_INSERT || name === CFG.SH.OUT_UPDATE) return false;

  var r1 = rng.getRow();
  var nR = rng.getNumRows();
  var nC = rng.getNumColumns();
  var r2 = r1 + nR - 1;
  if (r2 < 3 || nC <= 0) return false;

  // Paste / fill = more than one cell. Single-cell typing only tidies when it
  // starts a new row (INDEX in column A still blank), so normal keying stays fast.
  if (nR * nC < 2) {
    if (rng.getColumn() === 1 || r1 < 3) return false;
    if (String(rng.getDisplayValue() || '').trim() === '') return false;
    if (String(sh.getRange(r1, 1).getDisplayValue() || '').trim() !== '') return false;
  }

  var lastRow = sh.getLastRow();
  var width = Math.max(sh.getLastColumn(), schema.headers.length);
  var nData = Math.max(0, lastRow - 2);

  if (nData > 0) {
    try { setupPasteTidyIndex_(sh, schema, nData); } catch (eIdx) { try { log_('[PASTE TIDY] INDEX skipped on ' + name + ': ' + eIdx.message); } catch (_l1) {} }
  }
  try { setupPasteTidyBanding_(sh, lastRow, width, rng); } catch (eBand) { try { log_('[PASTE TIDY] banding skipped on ' + name + ': ' + eBand.message); } catch (_l2) {} }

  var p1 = Math.max(r1, 3);
  var p2 = Math.min(r2, lastRow);
  if (p2 >= p1) {
    try { sh.setRowHeights(p1, p2 - p1 + 1, (CFG.ROW && CFG.ROW.DATA) || 20); } catch (eHeight) {}
  }

  try { trimSheet_(sh); } catch (eTrim) {}
  try { setupPasteTidyFilter_(sh, Math.max(sh.getLastRow(), 2), width); } catch (eFilter) { try { log_('[PASTE TIDY] filter skipped on ' + name + ': ' + eFilter.message); } catch (_l3) {} }
  return true;
}

function setupPasteTidyIndex_(sh, schema, nData) {
  var head = String((schema.headers && schema.headers[0]) || '').trim().toUpperCase();
  if (head !== 'INDEX' && head !== 'POS INDEX') return 0;
  if (CFG.SKIP_INDEX && CFG.SKIP_INDEX.indexOf(sh.getName()) >= 0) return 0;

  // Rewrite from the first wrong INDEX cell down, so small pastes write very little.
  var cur = sh.getRange(3, 1, nData, 1).getDisplayValues();
  var first = -1;
  for (var i = 0; i < nData; i++) {
    if (String(cur[i][0] == null ? '' : cur[i][0]).trim() !== String(i + 1)) { first = i; break; }
  }
  if (first < 0) return 0;

  var len = nData - first;
  var vals = new Array(len);
  for (var j = 0; j < len; j++) vals[j] = [String(first + j + 1)];

  var F = (CFG && CFG.FONT) ? CFG.FONT : { FAMILY: 'Google Sans', SIZE: 8 };
  var isTmp = sh.getName() === CFG.SH.TMP_MERGED;
  var fg = isTmp
    ? ((typeof LEGEND !== 'undefined' && LEGEND.STATUS_FG) ? LEGEND.STATUS_FG : '#9aa0a6')
    : ((typeof LEGEND !== 'undefined' && LEGEND.DATA_FG) ? LEGEND.DATA_FG : '#1c2833');
  var centre = setupES1ColumnInList_(setupES1MergeColumnLists_(schema.centreDataCols, schema.editCentreDataCols), 1);

  sh.getRange(3 + first, 1, len, 1)
    .setNumberFormat('@')
    .setValues(vals)
    .setFontFamily(F.FAMILY || 'Google Sans')
    .setFontSize(F.SIZE || 8)
    .setFontColor(fg)
    .setFontWeight('normal')
    .setFontStyle('normal')
    .setHorizontalAlignment(centre ? 'center' : 'left')
    .setVerticalAlignment('middle');
  return len;
}

function setupPasteTidyBanding_(sh, lastRow, width, pasted) {
  if (!sh || lastRow < 3 || width < 1) return false;
  var ok = setupPasteTidyEnsureBanding_(sh, lastRow, width);
  if (!ok || !pasted) return ok;

  // The style guard paints pasted cells directly; clear that fill so the native
  // banding shows through. Rows 1-2 are never touched.
  var p1 = Math.max(pasted.getRow(), 3);
  var p2 = Math.min(pasted.getRow() + pasted.getNumRows() - 1, lastRow);
  if (p2 >= p1) sh.getRange(p1, pasted.getColumn(), p2 - p1 + 1, pasted.getNumColumns()).setBackground(null);
  return ok;
}

function setupPasteTidyEnsureBanding_(sh, lastRow, width) {
  var odd  = (typeof LEGEND !== 'undefined' && LEGEND.ALT_ODD)  ? LEGEND.ALT_ODD  : '#f5f5f5';
  var even = (typeof LEGEND !== 'undefined' && LEGEND.ALT_EVEN) ? LEGEND.ALT_EVEN : '#e9f0f5';
  try {
    var bandings = [];
    try { bandings = sh.getBandings ? sh.getBandings() : []; } catch (eGet) { bandings = []; }

    // Existing banding already covers every data row → keep it (colours re-asserted).
    for (var i = 0; i < bandings.length; i++) {
      try {
        var r = bandings[i].getRange();
        var r1 = r.getRow(), r2 = r1 + r.getNumRows() - 1;
        var c1 = r.getColumn(), c2 = c1 + r.getNumColumns() - 1;
        if (r1 <= 3 && r2 >= lastRow && c1 <= 1 && c2 >= width) {
          try { bandings[i].setFirstRowColor(odd).setSecondRowColor(even); } catch (eColourExisting) {}
          return true;
        }
      } catch (eRead) {}
    }

    // Otherwise replace the short / partial body banding with one over 3..lastRow.
    for (var b = 0; b < bandings.length; b++) {
      try {
        var br = bandings[b].getRange();
        var br1 = br.getRow(), br2 = br1 + br.getNumRows() - 1;
        var bc1 = br.getColumn(), bc2 = bc1 + br.getNumColumns() - 1;
        if (br1 <= lastRow && br2 >= 3 && bc1 <= width && bc2 >= 1) bandings[b].remove();
      } catch (eRemove) {}
    }

    var band = sh.getRange(3, 1, lastRow - 2, width).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false);
    try { band.setFirstRowColor(odd).setSecondRowColor(even); } catch (eColour) {}
    return true;
  } catch (e) {
    try { log_('[PASTE TIDY] banding failed on ' + sh.getName() + ': ' + e.message); } catch (_eLog) {}
    return false;
  }
}

function setupPasteTidyFilter_(sh, lastRow, width) {
  if (!sh || lastRow < 2 || width < 1) return;
  var f = sh.getFilter();
  if (!f) {
    sh.getRange(2, 1, lastRow - 1, width).createFilter();
    return;
  }
  var fr = f.getRange();
  if (fr.getRow() === 2 && fr.getColumn() === 1 && fr.getLastRow() >= lastRow && fr.getLastColumn() >= width) return;

  // Leave a filter that is actively hiding rows alone; otherwise widen it.
  for (var c = fr.getColumn(); c <= fr.getLastColumn(); c++) {
    try { if (f.getColumnFilterCriteria(c)) return; } catch (eCrit) {}
  }
  f.remove();
  sh.getRange(2, 1, lastRow - 1, width).createFilter();
}

// =============================================================================
//  v6.3.69 SURGICAL SOURCE-SHEET EDIT HELPERS
//  Keeps discount columns H/I stable and links supplier name B -> account number C.
// =============================================================================

function setupHandleSourceSheetEdits_(e) {
  if (!e || !e.range) return;
  var rng = e.range;
  var sh = rng.getSheet();
  if (!sh) return;

  var name = sh.getName();
  var dataRow = 3;
  var endRow = rng.getRow() + rng.getNumRows() - 1;
  if (endRow < dataRow) return;

  if (name === CFG.SH.SRC_DISC) {
    // H = POS DISCOUNT%, I = POS MARKUP%.
    if (setupRangeTouchesCol_(rng, 8) || setupRangeTouchesCol_(rng, 9)) {
      setupNormaliseSrcDiscountPercentEdit_(sh, rng);
      setupFormatSrcDiscountColumns_(sh, Math.max(0, sh.getLastRow() - 2));
    }
    return;
  }

  if (name === CFG.SH.IN_SUP) {
    // B = POS SUPPLIER NAME, C = POS SUPPLIER NUMBER.
    if (setupRangeTouchesCol_(rng, 2)) {
      setupAutofillSupplierNumberFromNameEdit_(sh, rng);
    }
  }
}

function setupRangeTouchesCol_(rng, targetCol) {
  if (!rng || !targetCol) return false;
  var c1 = rng.getColumn();
  var c2 = c1 + rng.getNumColumns() - 1;
  return c1 <= targetCol && c2 >= targetCol;
}

function setupFormatSrcDiscountColumns_(sh, nRows) {
  if (!sh || sh.getName() !== CFG.SH.SRC_DISC) return;
  var lastRow = sh.getLastRow();
  nRows = nRows == null ? Math.max(0, lastRow - 2) : Math.max(0, Number(nRows || 0));
  if (nRows <= 0) return;

  try {
    sh.getRange(3, 8, nRows, 1) // H / POS DISCOUNT%
      .setNumberFormat('0.00%')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
  } catch(eH) {}

  try {
    sh.getRange(3, 9, nRows, 1) // I / POS MARKUP%
      .setNumberFormat('0.###')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
  } catch(eI) {}
}

function setupNormaliseSrcDiscountPercentEdit_(sh, rng) {
  if (!sh || !rng || sh.getName() !== CFG.SH.SRC_DISC) return;
  if (!setupRangeTouchesCol_(rng, 8)) return;

  var dataRow = 3;
  var r1 = Math.max(rng.getRow(), dataRow);
  var r2 = rng.getRow() + rng.getNumRows() - 1;
  if (r2 < dataRow) return;

  var nRows = r2 - r1 + 1;
  var hRange = sh.getRange(r1, 8, nRows, 1);
  var vals = hRange.getValues();
  var displays = hRange.getDisplayValues();
  var changed = false;

  for (var i = 0; i < vals.length; i++) {
    var raw = vals[i][0];
    var disp = String(displays[i][0] == null ? '' : displays[i][0]).trim();
    if (raw === '' || raw == null || disp === '') continue;

    var n;
    if (typeof raw === 'number') {
      n = raw;
    } else {
      var s = String(raw).replace(/%/g, '').replace(/,/g, '').trim();
      if (!s) continue;
      n = Number(s);
    }

    if (!isFinite(n)) continue;

    // User intent:
    //   7.5  -> 7.50%
    //   40   -> 40.00%
    //   0.075 stays 7.50%
    //   7.5% also becomes 7.50%
    if (n > 1) n = n / 100;
    if (n < 0) n = 0;

    vals[i][0] = n;
    changed = true;
  }

  if (changed) hRange.setValues(vals);
  hRange.setNumberFormat('0.00%').setHorizontalAlignment('center').setVerticalAlignment('middle');
}

function setupAutofillSupplierNumberFromNameEdit_(sh, rng) {
  if (!sh || !rng || sh.getName() !== CFG.SH.IN_SUP) return;
  if (!setupRangeTouchesCol_(rng, 2)) return;

  var dataRow = 3;
  var r1 = Math.max(rng.getRow(), dataRow);
  var r2 = rng.getRow() + rng.getNumRows() - 1;
  if (r2 < dataRow) return;

  var map = setupLoadSupplierNameToNumberMap_();
  if (!map || !map.__nameToAcc) return;

  var nRows = r2 - r1 + 1;
  var names = sh.getRange(r1, 2, nRows, 1).getDisplayValues();
  var numsRange = sh.getRange(r1, 3, nRows, 1);
  var nums = numsRange.getDisplayValues();

  var out = new Array(nRows);
  var changed = false;

  for (var i = 0; i < nRows; i++) {
    var supplierName = String(names[i][0] || '').trim();
    var existingNum = String(nums[i][0] || '').trim();
    var key = setupSupplierLookupKey_(supplierName);
    var matchedNum = key ? (map.__nameToAcc[key] || '') : '';

    // Blank supplier name means leave C alone.
    if (!supplierName) {
      out[i] = [existingNum];
      continue;
    }

    // If B has a known supplier name, C should reflect SRC_POS_SUPPLIERS.
    if (matchedNum && existingNum !== matchedNum) {
      out[i] = [matchedNum];
      changed = true;
    } else {
      out[i] = [existingNum];
    }
  }

  if (changed) {
    numsRange.setNumberFormat('@').setValues(out).setHorizontalAlignment('center').setVerticalAlignment('middle');
  }
}

function setupLoadSupplierNameToNumberMap_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var out = { __nameToAcc: {}, __accToName: {} };

  try {
    var sh = ss.getSheetByName(CFG.SH.SRC_SUPP);
    if (!sh || sh.getLastRow() < 3) return out;

    var rows = sh.getRange(3, 1, sh.getLastRow() - 2, Math.max(3, Math.min(4, sh.getLastColumn()))).getDisplayValues();
    for (var i = 0; i < rows.length; i++) {
      // Existing SRC_POS_SUPPLIERS layout used elsewhere:
      // B = POS ACCNO / supplier account number
      // C = POS ACNAME / supplier name
      var acc = String(rows[i][1] || '').trim();
      var name = String(rows[i][2] || '').trim();
      if (!acc || !name) continue;

      out.__accToName[acc] = name;
      out.__nameToAcc[setupSupplierLookupKey_(name)] = acc;
    }
  } catch(e) {}

  return out;
}

function setupSupplierLookupKey_(v) {
  return String(v == null ? '' : v)
    .toUpperCase()
    .replace(/&/g, ' AND ')
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function plainPasteGuardTargets_(e) {
  var out = [];
  try {
    if (!e || !e.range) return out;
    var rng = e.range, sh = rng.getSheet();
    if (!sh) return out;
    var dataStart = 3;
    var startRow = Math.max(rng.getRow(), dataStart);
    var endRow = rng.getRow() + rng.getNumRows() - 1;
    if (endRow < dataStart) return out;
    var target = sh.getRange(startRow, rng.getColumn(), endRow - startRow + 1, rng.getNumColumns());
    out.push({ sheet: sh.getName(), a1: target.getA1Notation(), row: startRow, rows: target.getNumRows(), col: target.getColumn(), cols: target.getNumColumns() });
  } catch (_err) {}
  return out;
}

function normalizeEditedDataStyle_(e) {
  try {
    if (!e || !e.range) return;
    var rng = e.range;
    var sh = rng.getSheet();
    if (!sh) return;

    // v6.3.84 ES1: only sheets managed by the established workbook SCHEMA are
    // normalised. Unknown/user-added sheets retain their own formatting.
    var schema = (typeof SCHEMA !== 'undefined' && SCHEMA) ? SCHEMA[sh.getName()] : null;
    if (!schema) return;

    var row = rng.getRow();
    var col = rng.getColumn();
    var numRows = rng.getNumRows();
    var numCols = rng.getNumColumns();
    var dataStart = 3;
    var startRow = Math.max(row, dataStart);
    var endRow = row + numRows - 1;
    if (endRow < dataStart || numCols <= 0) return;

    var target = sh.getRange(startRow, col, endRow - startRow + 1, numCols);
    var F = (typeof CFG !== 'undefined' && CFG.FONT) ? CFG.FONT : { FAMILY: 'Google Sans', SIZE: 8 };
    var dataFg = (typeof LEGEND !== 'undefined' && LEGEND.DATA_FG) ? LEGEND.DATA_FG : '#1c2833';
    var clip = SpreadsheetApp.WrapStrategy.CLIP;

    // Retain alignment/number format here. ES1 applies only explicit native
    // column rules below, so ordinary keying no longer becomes LEFT + TEXT.
    target
      .setFontFamily(F.FAMILY || 'Google Sans')
      .setFontSize(F.SIZE || 8)
      .setFontColor(dataFg)
      .setFontWeight('normal')
      .setFontStyle('normal')
      .setVerticalAlignment('middle')
      .setWrapStrategy(clip);
    try { target.setFontLine('none'); } catch(_line) {}

    setupES1ApplyEditedNativeColumnStyles_(sh, target, schema, numRows === 1 && numCols === 1);
    restoreEditedRangeBaseBackground_(sh, target);
  } catch(err) { try { log_('[onEdit style guard] ' + err.message); } catch(_log) {} }
}

// =============================================================================
//  v6.3.84 ES1 — SCHEMA-AWARE EDIT-STYLE RETENTION
//  Keeps ordinary keying visually stable while still cleaning pasted formatting
//  in the edited range. These helpers do not read/write workbook data values.
// =============================================================================
function setupES1ApplyEditedNativeColumnStyles_(sh, target, schema, isSingleCell) {
  if (!sh || !target || !schema) return;

  var sheetName = sh.getName();
  var startCol = target.getColumn();
  var endCol = startCol + target.getNumColumns() - 1;
  var startRow = target.getRow();
  var endRow = startRow + target.getNumRows() - 1;
  var centreCols = setupES1MergeColumnLists_(schema.centreDataCols, schema.editCentreDataCols);
  var textCols = schema.textCols || [];
  var explicitFormats = schema.editNumberFormats || {};
  var centreRanges = [];
  var leftRanges = [];
  var formatRanges = {};

  for (var col = startCol; col <= endCol; col++) {
    var a1 = colLetter_(col) + startRow + ':' + colLetter_(col) + endRow;
    var isCentre = setupES1ColumnInList_(centreCols, col);

    // Explicitly centred columns always keep their native justification.
    // For a normal one-cell edit, every other column retains its current
    // alignment. For multi-cell edits/pastes, managed sheets return to the
    // same left-default used by the full format engine. TMP is the exception:
    // its fast format intentionally retains non-INDEX horizontal alignment.
    if (isCentre) centreRanges.push(a1);
    else if (!isSingleCell && !schema.editRetainDefaultAlignment) leftRanges.push(a1);

    var fmt = setupES1NativeNumberFormatForColumn_(textCols, explicitFormats, col);
    if (fmt) {
      if (!formatRanges[fmt]) formatRanges[fmt] = [];
      formatRanges[fmt].push(a1);
    }
  }

  try { if (centreRanges.length) sh.getRangeList(centreRanges).setHorizontalAlignment('center'); } catch(eCentre) {}
  try { if (leftRanges.length) sh.getRangeList(leftRanges).setHorizontalAlignment('left'); } catch(eLeft) {}

  Object.keys(formatRanges).forEach(function(fmt) {
    try {
      if (formatRanges[fmt] && formatRanges[fmt].length) {
        sh.getRangeList(formatRanges[fmt]).setNumberFormat(fmt);
      }
    } catch(eFmt) {}
  });
}

function setupES1NativeNumberFormatForColumn_(textCols, explicitFormats, col) {
  var selected = '';

  // Explicit format metadata wins because some established numeric/output
  // columns need stronger formats than generic text protection.
  Object.keys(explicitFormats || {}).some(function(fmt) {
    if (setupES1ColumnInList_(explicitFormats[fmt], col)) {
      selected = fmt;
      return true;
    }
    return false;
  });
  if (selected) return selected;

  return setupES1ColumnInList_(textCols || [], col) ? '@' : '';
}

function setupES1MergeColumnLists_(a, b) {
  var seen = {};
  var out = [];
  (a || []).concat(b || []).forEach(function(v) {
    var n = Number(v);
    if (!n || !isFinite(n) || seen[n]) return;
    seen[n] = true;
    out.push(n);
  });
  return out;
}

function setupES1ColumnInList_(list, col) {
  if (!list || !list.length) return false;
  col = Number(col);
  for (var i = 0; i < list.length; i++) {
    if (Number(list[i]) === col) return true;
  }
  return false;
}

function m13HandleOutMergedEdit_(e) {
  if (!e || !e.range) return;
  var rng = e.range, sh = rng.getSheet();
  if (!sh) return;
  var outName = (typeof CFG !== 'undefined' && CFG.SH && CFG.SH.OUT_MERGED) ? CFG.SH.OUT_MERGED : 'OUT_MERGED_DATA';
  if (sh.getName() !== outName) return;

  // v6.3.74: manual Row Status override.
  // If the user changes OUT_MERGED_DATA column B to NEW, generate a unique
  // internal fake GTIN-13 placeholder into K / POS MAIN ID and mirror it to
  // AP / final POS output main id so OUT_POS_INSERT can import the product.
  if (m13RangeTouchesCol_(rng, 2)) {
    var bRows = m13SupplierEditRowsFromEvent_(e, 2);
    if (bRows.length) m13HandleOutMergedNewStatusFakeBarcodes_(sh, bRows);
  }

  if (m13RangeTouchesCol_(rng, 7)) {
    var gRows = m13SupplierEditRowsFromEvent_(e, 7);
    if (gRows.length) { applyOutMergedSupplierPendingStyleFromEdit_(sh, gRows); m13QueueSupplierChangeRows_(gRows); }
  }
  if (m13RangeTouchesCol_(rng, 3)) {
    var cRows = m13SupplierEditRowsFromEvent_(e, 3);
    if (cRows.length) m13ApplyOutMergedPriceStatusStylesFromEdit_(sh, cRows);
  }
  if (m13RangeTouchesCol_(rng, 40)) { // AN / RRP / MARKUP OVERRIDE
    var anRows = m13SupplierEditRowsFromEvent_(e, 40);
    if (anRows.length) m13ApplyShelfRrpOverrideStyleFromEdit_(sh, anRows);
  }
}

function m13RangeTouchesCol_(rng, targetCol) {
  if (!rng) return false;
  var c1 = rng.getColumn();
  var c2 = c1 + rng.getNumColumns() - 1;
  return c1 <= targetCol && c2 >= targetCol;
}

function m13SupplierEditRowsFromEvent_(e, requiredCol) {
  if (!e || !e.range) return [];
  var rng = e.range;
  if (requiredCol && !m13RangeTouchesCol_(rng, requiredCol)) return [];
  var dataRow = (typeof M13 !== 'undefined' && M13.DATA_ROW) ? M13.DATA_ROW : 3;
  var r1 = Math.max(dataRow, rng.getRow());
  var r2 = rng.getRow() + rng.getNumRows() - 1;
  if (r2 < dataRow) return [];
  var rows = [];
  for (var r = r1; r <= r2; r++) rows.push(r);
  return rows;
}



// =============================================================================
//  v6.3.74 OUT_MERGED_DATA NEW-STATUS FAKE BARCODE HELPER
// =============================================================================
/**
 * When the user manually changes OUT_MERGED_DATA column B / ROW STATUS to NEW,
 * this helper writes a unique internal placeholder barcode to:
 *   - K  / POS MAIN ID
 *   - AP / final POS output main id
 *
 * Important:
 *   - This is for internal POS import placeholders only.
 *   - The script calculates the GTIN/EAN-13 check digit; do not hard-code the
 *     last digit by eye.
 *   - It scans existing K and AP values first so placeholders are not duplicated
 *     inside the current OUT_MERGED_DATA sheet.
 */
function m13HandleOutMergedNewStatusFakeBarcodes_(sh, rows) {
  if (!sh || !rows || !rows.length) return;
  var lastRow = sh.getLastRow();
  if (lastRow < 3) return;

  rows = m13FakeBarcodeUniqueRows_(rows).filter(function(r) { return r >= 3 && r <= lastRow; });
  if (!rows.length) return;

  var statusMap = m13FakeBarcodeReadRows_(sh, 2, rows);  // B / ROW STATUS
  var kMap = m13FakeBarcodeReadRows_(sh, 11, rows);      // K / POS MAIN ID
  var apMap = m13FakeBarcodeReadRows_(sh, 42, rows);     // AP / main id
  var used = m13BuildExistingOutFakeBarcodeSet_(sh, rows);

  var statusWrites = [];
  var kWrites = [];
  var apWrites = [];
  var changedRows = [];

  for (var i = 0; i < rows.length; i++) {
    var sheetRow = rows[i];
    var status = m13FakeBarcodeUpper_(statusMap[sheetRow]);
    if (status.indexOf('NEW') < 0) continue;

    var existingK = m13FakeBarcodeDigits_(kMap[sheetRow]);
    var existingAp = m13FakeBarcodeDigits_(apMap[sheetRow]);
    var fake = '';

    // Prefer the new consistent 939999 fake range when it is already present.
    // Legacy generated placeholders from v6.3.74 (930000... / 931234...) are
    // deliberately replaced so future fake barcodes stay visually grouped.
    // If a real/non-generated GTIN already exists, preserve it and mirror K/AP
    // rather than overwriting a genuine barcode.
    if (m13IsPreferredFakeGtin13_(existingK)) fake = existingK;
    else if (m13IsPreferredFakeGtin13_(existingAp)) fake = existingAp;
    else if (existingK && m13IsValidGtin13_(existingK) && !m13IsGeneratedFakeGtin13_(existingK)) fake = existingK;
    else if (existingAp && m13IsValidGtin13_(existingAp) && !m13IsGeneratedFakeGtin13_(existingAp)) fake = existingAp;
    else fake = m13NextFakeGtin13_(used);

    used[fake] = true;
    statusWrites.push({ row: sheetRow, value: '🟢 NEW PRODUCT' });
    kWrites.push({ row: sheetRow, value: fake });
    apWrites.push({ row: sheetRow, value: fake });
    changedRows.push(sheetRow);
  }

  m13FakeBarcodeWriteSingleCells_(sh, 2, statusWrites, '@');
  m13FakeBarcodeWriteSingleCells_(sh, 11, kWrites, '@');
  m13FakeBarcodeWriteSingleCells_(sh, 42, apWrites, '@');

  // v6.3.76: generated/internal fake barcode cells should remain visually
  // flagged like other edited cells, but keep normal left data alignment.
  if (changedRows.length) m13StyleFakeBarcodeCells_(sh, changedRows);

  if (changedRows.length) {
    try {
      sh.getParent().toast(
        'Generated fake barcode(s) for NEW row(s): ' + changedRows.length,
        '🟢 OUT_MERGED_DATA',
        5
      );
    } catch (_toastErr) {}
  }
}

/**
 * Optional manual repair helper: run this from the Apps Script editor if some
 * rows were already changed to NEW before the onEdit helper was installed.
 */
function m13GenerateFakeBarcodesForCurrentNewRows() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var outName = (typeof CFG !== 'undefined' && CFG.SH && CFG.SH.OUT_MERGED) ? CFG.SH.OUT_MERGED : 'OUT_MERGED_DATA';
  var sh = ss.getSheetByName(outName);
  if (!sh) throw new Error('Missing sheet: ' + outName);
  var lastRow = sh.getLastRow();
  if (lastRow < 3) return;
  var rows = [];
  var vals = sh.getRange(3, 2, lastRow - 2, 1).getDisplayValues();
  for (var i = 0; i < vals.length; i++) {
    if (m13FakeBarcodeUpper_(vals[i][0]).indexOf('NEW') >= 0) rows.push(3 + i);
  }
  m13HandleOutMergedNewStatusFakeBarcodes_(sh, rows);
}

function m13BuildExistingOutFakeBarcodeSet_(sh, ignoreRows) {
  var used = {};
  var ignore = {};
  (ignoreRows || []).forEach(function(r) { ignore[Number(r)] = true; });

  var lastRow = sh.getLastRow();
  var nRows = Math.max(0, lastRow - 2);
  if (nRows <= 0) return used;

  // Scan K and AP so generated placeholders cannot collide with existing review
  // or final POS output barcodes in the sheet.
  var kVals = sh.getRange(3, 11, nRows, 1).getDisplayValues();
  var apVals = sh.getRange(3, 42, nRows, 1).getDisplayValues();
  for (var i = 0; i < nRows; i++) {
    var sheetRow = 3 + i;
    if (ignore[sheetRow]) continue;
    var k = m13FakeBarcodeDigits_(kVals[i][0]);
    var ap = m13FakeBarcodeDigits_(apVals[i][0]);
    if (k) used[k] = true;
    if (ap) used[ap] = true;
  }
  return used;
}

function m13NextFakeGtin13_(used) {
  used = used || {};

  // v6.3.75: keep generated placeholders visually grouped and obvious.
  // All new fake barcodes use the 939999xxxxxx namespace, with the check
  // digit calculated correctly. This means the visible values will be close
  // together, but the final digit will not simply count 2, 3, 4 because GTIN-13
  // requires a mod-10 checksum.
  // First values generated are:
  //   9399999999992
  //   9399999999985
  //   9399999999978
  //   9399999999961
  for (var seq = 999999; seq >= 0; seq--) {
    var base12 = '939999' + ('000000' + seq).slice(-6);
    var gtin = base12 + m13Gtin13CheckDigit_(base12);
    if (!used[gtin]) return gtin;
  }

  throw new Error('Unable to generate a unique fake GTIN-13 placeholder. The fake 939999 range is exhausted.');
}

function m13Gtin13CheckDigit_(base12) {
  var s = m13FakeBarcodeDigits_(base12);
  if (s.length !== 12) throw new Error('GTIN-13 base must be 12 digits before checksum: ' + base12);
  var sum = 0;
  for (var i = 0; i < 12; i++) {
    var n = Number(s.charAt(i));
    sum += (i % 2 === 0) ? n : n * 3;
  }
  return String((10 - (sum % 10)) % 10);
}

function m13IsValidGtin13_(value) {
  var s = m13FakeBarcodeDigits_(value);
  if (s.length !== 13) return false;
  return m13Gtin13CheckDigit_(s.slice(0, 12)) === s.charAt(12);
}

function m13IsGeneratedFakeGtin13_(value) {
  return m13IsPreferredFakeGtin13_(value) || m13IsLegacyGeneratedFakeGtin13_(value);
}

function m13IsPreferredFakeGtin13_(value) {
  var s = m13FakeBarcodeDigits_(value);
  if (!m13IsValidGtin13_(s)) return false;
  return /^939999\d{6}\d$/.test(s);
}

function m13IsLegacyGeneratedFakeGtin13_(value) {
  var s = m13FakeBarcodeDigits_(value);
  if (!m13IsValidGtin13_(s)) return false;
  if (s === '9300000000002' || s === '9312345678907') return true;
  return /^930000\d{6}\d$/.test(s);
}

function m13FakeBarcodeDigits_(value) {
  return String(value == null ? '' : value).replace(/[^0-9]/g, '');
}

function m13FakeBarcodeUpper_(value) {
  return String(value == null ? '' : value).toUpperCase().replace(/\s+/g, ' ').trim();
}

function m13FakeBarcodeUniqueRows_(rows) {
  var seen = {}, out = [];
  for (var i = 0; i < (rows || []).length; i++) {
    var r = Number(rows[i]);
    if (r && isFinite(r) && !seen[r]) { seen[r] = true; out.push(r); }
  }
  out.sort(function(a, b) { return a - b; });
  return out;
}

function m13FakeBarcodeReadRows_(sh, col, rows) {
  var out = {};
  if (!sh || !rows || !rows.length) return out;
  rows = m13FakeBarcodeUniqueRows_(rows);
  var minRow = rows[0];
  var maxRow = rows[rows.length - 1];
  var vals = sh.getRange(minRow, col, maxRow - minRow + 1, 1).getDisplayValues();
  for (var i = 0; i < rows.length; i++) {
    out[rows[i]] = vals[rows[i] - minRow][0];
  }
  return out;
}

function m13FakeBarcodeWriteSingleCells_(sh, col, writes, numberFormat) {
  if (!sh || !writes || !writes.length) return;
  writes.sort(function(a, b) { return Number(a.row) - Number(b.row); });

  var groups = [];
  var current = null;
  for (var i = 0; i < writes.length; i++) {
    var w = writes[i];
    if (!current || Number(w.row) !== current.end + 1) {
      current = { start: Number(w.row), end: Number(w.row), values: [[w.value]] };
      groups.push(current);
    } else {
      current.end = Number(w.row);
      current.values.push([w.value]);
    }
  }

  for (var g = 0; g < groups.length; g++) {
    var group = groups[g];
    sh.getRange(group.start, col, group.end - group.start + 1, 1)
      .setNumberFormat(numberFormat || '@')
      .setValues(group.values)
      .setHorizontalAlignment('left')
      .setVerticalAlignment('middle')
      .setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
  }
}

function m13StyleFakeBarcodeCells_(sh, rows) {
  rows = m13FakeBarcodeUniqueRows_(rows || []);
  if (!sh || !rows.length) return;
  var L = (typeof LEGEND !== 'undefined') ? LEGEND : {};
  var bg = L.STATE_PENDING_BG || '#fef3e2';
  var fg = L.STATE_PENDING_FG || '#e37400';
  for (var i = 0; i < rows.length; i++) {
    try {
      sh.getRange(rows[i], 11, 1, 1)
        .setBackground(bg)
        .setFontColor(fg)
        .setNumberFormat('@')
        .setHorizontalAlignment('left')
        .setVerticalAlignment('middle')
        .setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
      sh.getRange(rows[i], 42, 1, 1)
        .setBackground(bg)
        .setFontColor(fg)
        .setNumberFormat('@')
        .setHorizontalAlignment('left')
        .setVerticalAlignment('middle')
        .setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
    } catch (_styleErr) {}
  }
}

function m13ApplyShelfRrpOverrideStyleFromEdit_(sh, rows) {
  if (!sh || !rows || !rows.length) return;
  rows = m13UniqueSortedRows_(rows).filter(function (r) { return r >= 3 && r <= sh.getLastRow(); });
  if (!rows.length) return;

  var values = m13ReadSingleColumnBySheetRows_(sh, 40, rows); // AN
  var filledRows = [];
  var blankRows = [];
  rows.forEach(function (sheetRow) {
    var v = values[sheetRow];
    if (String(v == null ? '' : v).trim()) filledRows.push(sheetRow);
    else blankRows.push(sheetRow);
  });

  if (filledRows.length) m13StyleShelfRrpOverrideRows_(sh, filledRows);
  if (blankRows.length) m13ResetShelfRrpOverrideRows_(sh, blankRows);
}

function m13StyleShelfRrpOverrideRows_(sh, rows) {
  rows = m13UniqueSortedRows_(rows || []);
  if (!sh || !rows.length) return;
  var L = (typeof LEGEND !== 'undefined') ? LEGEND : {};
  var css = { bg: L.STATE_PENDING_BG || '#fef3e2', fg: L.STATE_PENDING_FG || '#e37400' };
  var clip = SpreadsheetApp.WrapStrategy.CLIP;
  m13GroupContiguousRows_(rows).forEach(function (g) {
    try {
      sh.getRange(g.start, 40, g.len, 1)
        .setBackground(css.bg)
        .setFontColor(css.fg)
        .setFontWeight('normal')
        .setFontStyle('normal')
        .setNumberFormat('@')
        .setHorizontalAlignment('center')
        .setVerticalAlignment('middle')
        .setWrapStrategy(clip);
    } catch (_styleErr) {}
  });
}

function m13ResetShelfRrpOverrideRows_(sh, rows) {
  rows = m13UniqueSortedRows_(rows || []);
  if (!sh || !rows.length) return;
  var oddBg = (typeof LEGEND !== 'undefined' && LEGEND.ALT_ODD) ? LEGEND.ALT_ODD : '#f5f5f5';
  var evenBg = (typeof LEGEND !== 'undefined' && LEGEND.ALT_EVEN) ? LEGEND.ALT_EVEN : '#e9f0f5';
  var fg = (typeof LEGEND !== 'undefined' && LEGEND.DATA_FG) ? LEGEND.DATA_FG : '#1c2833';
  var oddCells = [], evenCells = [];
  rows.forEach(function (r) { (((r - 3) % 2 === 0) ? oddCells : evenCells).push('AN' + r); });
  if (oddCells.length) sh.getRangeList(oddCells).setBackground(oddBg).setFontColor(fg).setFontWeight('normal').setFontStyle('normal').setNumberFormat('@').setHorizontalAlignment('center').setVerticalAlignment('middle');
  if (evenCells.length) sh.getRangeList(evenCells).setBackground(evenBg).setFontColor(fg).setFontWeight('normal').setFontStyle('normal').setNumberFormat('@').setHorizontalAlignment('center').setVerticalAlignment('middle');
}

function applyOutMergedSupplierPendingStyleFromEdit_(shOrEvent, rowsOpt) {
  var sh, rows;
  if (shOrEvent && shOrEvent.range) {
    sh = shOrEvent.range.getSheet();
    rows = m13SupplierEditRowsFromEvent_(shOrEvent, 7);
  } else {
    sh = shOrEvent;
    rows = rowsOpt || [];
  }
  if (!sh || !rows.length) return;

  var maxRow = sh.getLastRow();
  rows = m13UniqueSortedRows_(rows).filter(function (r) { return r >= 3 && r <= maxRow; });
  if (!rows.length) return;

  // Fast + reliable: Column G edits are treated as the source of truth for a
  // pending supplier override. Do not compare against AV here — that comparison
  // caused valid pasted/edited rows to miss the orange pending state when the
  // accepted supplier field had already been partially updated.
  var gValues = m13ReadSingleColumnBySheetRows_(sh, 7, rows);
  var pendingRows = [];
  var resetRows = [];
  rows.forEach(function (sheetRow) {
    var v = gValues[sheetRow];
    if (String(v == null ? '' : v).trim()) pendingRows.push(sheetRow);
    else resetRows.push(sheetRow);
  });

  if (pendingRows.length) {
    m13SetColumnValuesByRows_(sh, 3, pendingRows, 'SUP OVERRIDE PENDING');
    m13ApplyOverrideStateStyles_(sh, pendingRows, 'PENDING');
    // Small guarded flush: makes the orange C/G/N state visible immediately
    // after manual edits/pastes without touching merge/pricing logic.
    if (pendingRows.length <= 50) { try { SpreadsheetApp.flush(); } catch (_flush) {} }
  }
  if (resetRows.length) m13ResetOutOverrideStyleRows_(sh, resetRows);
}

function m13ApplyOutMergedPriceStatusStylesFromEdit_(sh, rows) {
  if (!sh || !rows || !rows.length) return;
  var rowData = m13ReadOutRowsBySheetRows_(sh, rows, Math.max(sh.getLastColumn(), 14));
  var acceptedRows = [], rejectedRows = [], pendingRows = [];
  rows.forEach(function (sheetRow) {
    var row = rowData[sheetRow]; if (!row) return;
    var s = m13UpperSafe_(row[2]);
    if (s.indexOf('ACCEPTED') >= 0) acceptedRows.push(sheetRow);
    else if (s.indexOf('REJECTED') >= 0) rejectedRows.push(sheetRow);
    else if (s.indexOf('PENDING') >= 0) pendingRows.push(sheetRow);
  });
  if (pendingRows.length) m13ApplyOverrideStateStyles_(sh, pendingRows, 'PENDING');
  if (acceptedRows.length) m13ApplyOverrideStateStyles_(sh, acceptedRows, 'ACCEPTED');
  if (rejectedRows.length) m13ApplyOverrideStateStyles_(sh, rejectedRows, 'REJECTED');
}

function m13ApplyOverrideStateStyles_(sh, rows, state) {
  rows = m13UniqueSortedRows_(rows);
  if (!rows.length) return;
  var cssMap = m13SupplierOverrideCss_();
  var pendingCss = cssMap.PENDING;
  var acceptedCss = cssMap.ACCEPTED;
  var rejectedCss = cssMap.REJECTED;

  // Supplier override state rules, intentionally simple and fast:
  //   PENDING  → C/G/N orange immediately.
  //   ACCEPTED → C green, G/N remain orange as the visible manual override marker.
  //   REJECTED → C red, G/N reset to normal row formatting because G is reverted.
  // No centre-align, no indent, no bold weight changes.
  if (state === 'ACCEPTED') {
    m13StyleOverrideColumnsByRows_(sh, rows, [3], acceptedCss);
    m13StyleOverrideColumnsByRows_(sh, rows, [7, 14], pendingCss);
    return;
  }

  if (state === 'REJECTED') {
    m13StyleOverrideColumnsByRows_(sh, rows, [3], rejectedCss);
    m13ResetOutOverrideStyleColumns_(sh, rows, [7, 14]);
    return;
  }

  m13StyleOverrideColumnsByRows_(sh, rows, [3, 7, 14], pendingCss);
}

function m13StyleOverrideColumnsByRows_(sh, rows, cols, css) {
  rows = m13UniqueSortedRows_(rows || []);
  if (!sh || !rows.length || !cols || !cols.length || !css) return;
  var clip = SpreadsheetApp.WrapStrategy.CLIP;
  m13GroupContiguousRows_(rows).forEach(function (g) {
    cols.forEach(function (col) {
      try {
        sh.getRange(g.start, col, g.len, 1)
          .setBackground(css.bg)
          .setFontColor(css.fg)
          .setFontWeight('normal')
          .setFontStyle('normal')
          .setHorizontalAlignment('left')
          .setVerticalAlignment('middle')
          .setWrapStrategy(clip);
      } catch (_styleErr) {}
    });
  });
}

function m13ResetOutOverrideStyleColumns_(sh, rows, cols) {
  rows = m13UniqueSortedRows_(rows || []);
  if (!sh || !rows.length || !cols || !cols.length) return;
  var oddBg = (typeof LEGEND !== 'undefined' && LEGEND.ALT_ODD) ? LEGEND.ALT_ODD : '#f5f5f5';
  var evenBg = (typeof LEGEND !== 'undefined' && LEGEND.ALT_EVEN) ? LEGEND.ALT_EVEN : '#e9f0f5';
  var fg = (typeof LEGEND !== 'undefined' && LEGEND.DATA_FG) ? LEGEND.DATA_FG : '#1c2833';
  var oddCells = [], evenCells = [];
  rows.forEach(function (r) {
    var bucket = (((r - 3) % 2 === 0) ? oddCells : evenCells);
    cols.forEach(function (col) { bucket.push(m13ColumnLetter_(col) + r); });
  });
  if (oddCells.length) sh.getRangeList(oddCells).setBackground(oddBg).setFontColor(fg).setFontWeight('normal').setFontStyle('normal').setHorizontalAlignment('left').setVerticalAlignment('middle');
  if (evenCells.length) sh.getRangeList(evenCells).setBackground(evenBg).setFontColor(fg).setFontWeight('normal').setFontStyle('normal').setHorizontalAlignment('left').setVerticalAlignment('middle');
}

function m13ColumnLetter_(col) {
  var s = '';
  while (col > 0) {
    var m = (col - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    col = Math.floor((col - m - 1) / 26);
  }
  return s;
}

function m13ResetOutOverrideStyleRows_(sh, rows) {
  rows = m13UniqueSortedRows_(rows);
  if (!rows.length) return;
  var oddBg = (typeof LEGEND !== 'undefined' && LEGEND.ALT_ODD) ? LEGEND.ALT_ODD : '#f5f5f5';
  var evenBg = (typeof LEGEND !== 'undefined' && LEGEND.ALT_EVEN) ? LEGEND.ALT_EVEN : '#e9f0f5';
  var fg = (typeof LEGEND !== 'undefined' && LEGEND.DATA_FG) ? LEGEND.DATA_FG : '#1c2833';
  var oddCells = [], evenCells = [];
  rows.forEach(function (r) { var bucket = (((r - 3) % 2 === 0) ? oddCells : evenCells); bucket.push('C' + r); bucket.push('G' + r); bucket.push('N' + r); });
  if (oddCells.length) sh.getRangeList(oddCells).setBackground(oddBg).setFontColor(fg).setFontWeight('normal').setFontStyle('normal');
  if (evenCells.length) sh.getRangeList(evenCells).setBackground(evenBg).setFontColor(fg).setFontWeight('normal').setFontStyle('normal');
}

function m13SupplierOverrideCss_() {
  var L = (typeof LEGEND !== 'undefined') ? LEGEND : {};
  return {
    PENDING:  { label: 'SUP OVERRIDE PENDING',  bg: L.STATE_PENDING_BG,  fg: L.STATE_PENDING_FG  },
    ACCEPTED: { label: 'SUP OVERRIDE ACCEPTED', bg: L.STATE_ACCEPTED_BG, fg: L.STATE_ACCEPTED_FG },
    REJECTED: { label: 'SUP OVERRIDE REJECTED', bg: L.STATE_REJECTED_BG, fg: L.STATE_REJECTED_FG }
  };
}


function m13SupplierQueueSheet_(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var name = '_M13_SUPPLIER_QUEUE';
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, 3).setValues([['ROW_INDEX', 'QUEUED_AT', 'SOURCE']]);
  }
  try { if (!sh.isSheetHidden || !sh.isSheetHidden()) sh.hideSheet(); } catch (_hide) {}
  return sh;
}

function m13EnsureSupplierQueueHidden_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('_M13_SUPPLIER_QUEUE');
  if (sh) { try { if (!sh.isSheetHidden || !sh.isSheetHidden()) sh.hideSheet(); } catch (_hide) {} }
}

function m13QueueSupplierChangeRows_(rows) {
  rows = m13UniqueSortedRows_(rows);
  if (!rows.length) return;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = m13SupplierQueueSheet_(ss);
  var existing = m13GetQueuedSupplierChangeRows_();
  var merged = m13UniqueSortedRows_(existing.concat(rows));
  var now = new Date();
  var values = merged.map(function (r) { return [r, now, 'OUT_MERGED_DATA!G']; });

  var maxRows = Math.max(sh.getLastRow() - 1, 0);
  if (maxRows > 0) sh.getRange(2, 1, maxRows, 3).clearContent();
  if (values.length) sh.getRange(2, 1, values.length, 3).setValues(values);

  try {
    PropertiesService.getDocumentProperties().setProperty('M13_PENDING_SUPPLIER_CHANGE_ROWS', JSON.stringify(merged));
  } catch (_props) {}
}

function m13GetQueuedSupplierChangeRows_() {
  var rows = [];
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('_M13_SUPPLIER_QUEUE');
    if (sh && sh.getLastRow() >= 2) {
      var vals = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getDisplayValues();
      rows = vals.map(function (r) { return r[0]; });
    }
  } catch (_sheet) {}

  if (!rows.length) {
    try {
      rows = JSON.parse(PropertiesService.getDocumentProperties().getProperty('M13_PENDING_SUPPLIER_CHANGE_ROWS') || '[]');
    } catch (_props) { rows = []; }
  }
  return m13UniqueSortedRows_(rows);
}

function m13ClearQueuedSupplierChangeRows_(rowsDone) {
  rowsDone = m13UniqueSortedRows_(rowsDone);
  if (!rowsDone.length) return;

  var current = m13GetQueuedSupplierChangeRows_();
  if (!current.length) return;

  var done = {};
  rowsDone.forEach(function (r) { done[r] = true; });
  var remaining = current.filter(function (r) { return !done[r]; });

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('_M13_SUPPLIER_QUEUE');
  if (sh) {
    var maxRows = Math.max(sh.getLastRow() - 1, 0);
    if (maxRows > 0) sh.getRange(2, 1, maxRows, 3).clearContent();
    if (remaining.length) {
      var now = new Date();
      sh.getRange(2, 1, remaining.length, 3).setValues(remaining.map(function (r) { return [r, now, 'REMAINING']; }));
    }
  }

  try {
    var props = PropertiesService.getDocumentProperties();
    if (remaining.length) props.setProperty('M13_PENDING_SUPPLIER_CHANGE_ROWS', JSON.stringify(remaining));
    else props.deleteProperty('M13_PENDING_SUPPLIER_CHANGE_ROWS');
  } catch (_props) {}
}
function m13ReadOutRowsBySheetRows_(sh, sheetRows, lastCol) {
  var out = {};
  sheetRows = m13UniqueSortedRows_(sheetRows);
  if (!sheetRows.length) return out;

  var minRow = sheetRows[0];
  var maxRow = sheetRows[sheetRows.length - 1];
  var vals = sh.getRange(minRow, 1, maxRow - minRow + 1, lastCol).getValues();
  sheetRows.forEach(function (sheetRow) {
    out[sheetRow] = vals[sheetRow - minRow];
  });
  return out;
}
function m13ReadSingleColumnBySheetRows_(sh, col, sheetRows) {
  var out = {};
  sheetRows = m13UniqueSortedRows_(sheetRows);
  if (!sheetRows.length) return out;
  m13GroupContiguousRows_(sheetRows).forEach(function (g) {
    var vals = sh.getRange(g.start, col, g.len, 1).getDisplayValues();
    for (var i = 0; i < vals.length; i++) out[g.start + i] = vals[i][0];
  });
  return out;
}

function m13SetColumnValuesByRows_(sh, col, rows, value) {
  rows = m13UniqueSortedRows_(rows);
  if (!rows.length) return;
  var minRow = rows[0];
  var maxRow = rows[rows.length - 1];
  var vals = sh.getRange(minRow, col, maxRow - minRow + 1, 1).getValues();
  rows.forEach(function (sheetRow) { vals[sheetRow - minRow][0] = value; });
  sh.getRange(minRow, col, vals.length, 1).setValues(vals);
}
function m13GroupContiguousRows_(rows) {
  rows = m13UniqueSortedRows_(rows); var groups=[], start=null, prev=null;
  rows.forEach(function(r){ if(start===null){start=r;prev=r;return;} if(r===prev+1){prev=r;return;} groups.push({start:start,len:prev-start+1}); start=r; prev=r; });
  if(start!==null) groups.push({start:start,len:prev-start+1}); return groups;
}
function m13UniqueSortedRows_(rows) { var seen={}; (rows||[]).forEach(function(r){ r=Number(r); if(r&&isFinite(r)) seen[r]=true; }); return Object.keys(seen).map(Number).sort(function(a,b){return a-b;}); }
function m13SupplierNumberFromCellSafe_(value, supplierMap) {
  if (typeof m13SupplierNumberFromCell_ === 'function') { try { var direct = m13SupplierNumberFromCell_(value, supplierMap || {}); if (direct) return direct; } catch (_err) {} }
  var s = String(value == null ? '' : value).trim(); if (!s) return '';
  var m = s.match(/\((\d{1,8})\)\s*$/); if (m) return m[1];
  if (/^\d{1,8}$/.test(s)) return s;
  m = s.match(/(?:#|SUPPLIER\s*)\s*(\d{1,8})/i); if (m) return m[1];
  if (supplierMap) { var target = m13UpperSafe_(s).replace(/\s+/g, ' ').trim(); for (var k in supplierMap) { if (supplierMap.hasOwnProperty(k) && m13UpperSafe_(supplierMap[k]).replace(/\s+/g, ' ').trim() === target) return k; } }
  return '';
}
function m13NormIdSafe_(s) { if (typeof m13NormId_ === 'function') return m13NormId_(s); return m13UpperSafe_(s).replace(/[^A-Z0-9]/g, ''); }
function m13UpperSafe_(s) { return String(s == null ? '' : s).toUpperCase(); }
function restoreEditedRangeBaseBackground_(sh, rng) {
  try {
    if (!sh || !rng) return;
    var odd = (typeof LEGEND !== 'undefined' && LEGEND.ALT_ODD) ? LEGEND.ALT_ODD : '#f5f5f5';
    var even = (typeof LEGEND !== 'undefined' && LEGEND.ALT_EVEN) ? LEGEND.ALT_EVEN : '#e9f0f5';
    var rows = rng.getNumRows(), cols = rng.getNumColumns(), startRow = rng.getRow(), bgs = new Array(rows);
    for (var r = 0; r < rows; r++) { var colour = (((startRow + r) - 3) % 2 === 0) ? odd : even; var row = new Array(cols); for (var c = 0; c < cols; c++) row[c] = colour; bgs[r] = row; }
    rng.setBackgrounds(bgs);
  } catch(eBg) {}
}


// =============================================================================
//  SHARED PREFLIGHT RESET
// =============================================================================
function preflightReset_(sh, opt) {
  opt = opt || {};
  if (!sh) return 0;

  var startRow = Math.max(1, Number(opt.row || opt.startRow || 3));
  var startCol = Math.max(1, Number(opt.col || opt.startCol || 1));
  var rows = Number(opt.rows || 0);
  var cols = Number(opt.cols || 1);
  if (!rows) rows = Math.max(0, sh.getLastRow() - startRow + 1);
  if (!cols) cols = 1;
  if (rows <= 0 || cols <= 0) return 0;

  var rng = sh.getRange(startRow, startCol, rows, cols);

  if (opt.clearContent) rng.clearContent();
  if (opt.clearNotes !== false) { try { rng.clearNote(); } catch (_note) {} }

  if (opt.resetTextStyle !== false) {
    var F = (typeof CFG !== 'undefined' && CFG.FONT) ? CFG.FONT : { FAMILY: 'Google Sans', SIZE: 8 };
    var fg = (typeof LEGEND !== 'undefined' && LEGEND.DATA_FG) ? LEGEND.DATA_FG : '#1c2833';
    rng.setFontFamily(F.FAMILY || 'Google Sans')
      .setFontSize(opt.fontSize || F.SIZE || 8)
      .setFontColor(opt.fontColor || fg)
      .setFontWeight(opt.fontWeight || 'normal')
      .setFontStyle(opt.fontStyle || 'normal')
      .setHorizontalAlignment(opt.horizontalAlignment || 'left')
      .setVerticalAlignment(opt.verticalAlignment || 'middle')
      .setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP)
      .setNumberFormat(opt.numberFormat || '@');
    try { rng.setFontLine('none'); } catch (_line) {}
  }

  if (opt.resetBackground !== false) {
    var odd = (typeof LEGEND !== 'undefined' && LEGEND.ALT_ODD) ? LEGEND.ALT_ODD : '#f5f5f5';
    var even = (typeof LEGEND !== 'undefined' && LEGEND.ALT_EVEN) ? LEGEND.ALT_EVEN : '#e9f0f5';
    var bgs = new Array(rows);
    for (var r = 0; r < rows; r++) {
      var colour = (((startRow + r) - 3) % 2 === 0) ? odd : even;
      var row = new Array(cols);
      for (var c = 0; c < cols; c++) row[c] = colour;
      bgs[r] = row;
    }
    rng.setBackgrounds(bgs);
  }

  return rows;
}

// =============================================================================
//  PRIMITIVE HELPERS
// =============================================================================
function col_(letter)  { var r=0,u=(letter||'').toUpperCase(); for(var i=0;i<u.length;i++) r=r*26+(u.charCodeAt(i)-64); return r; }
function colLetter_(n) { var r='',c=n; while(c>0){var rem=(c-1)%26; r=String.fromCharCode(65+rem)+r; c=Math.floor((c-1)/26);} return r; }
function stripZzz_(b)  { return String(b||'').replace(/^ZZZ\s*/i,'').trim(); }
function fmt_(v)       { return String(v||0).replace(/\B(?=(\d{3})+(?!\d))/g,','); }
function log_(msg)     { Logger.log(msg); }

function v42_safe_(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try { return String(v); } catch(e) { return ''; }
}
function v42_upper_(s)  { return String(v42_safe_(s)).trim().toUpperCase(); }
function v42_num_(v)    { if(v===''||v===null||v===undefined)return 0; var n=parseFloat(String(v).replace(/[^0-9.\-]/g,'')); return isNaN(n)?0:n; }
function v42_html_(s)   { return String(v42_safe_(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function v42_js_(s)     { return String(v42_safe_(s)).replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,'\\n').replace(/\r/g,''); }
function v42_normBrand_(s) {
  return v42_upper_(String(s||'').replace(/^Z+\s*/i,'').replace(/[^A-Z0-9 ]/ig,' ')
    .replace(/\bAUSTRALIA\b/ig,'AUS').replace(/\bAUSTRALIAN\b/ig,'AUS').replace(/\bAUST\b/ig,'AUS')
    .replace(/\s+/g,' ').trim());
}
function v42_normText_(s)  { return String(s||'').toUpperCase().replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim(); }
function v42_normId_(s)    { return String(s||'').replace(/\s+/g,'').trim().toUpperCase(); }
function v42_firstNonBlank_() { for(var i=0;i<arguments.length;i++){var v=arguments[i];if(v!==''&&v!==null&&v!==undefined)return v;} return ''; }
function v42_pill_(cls,label,n) { return '<span class="pill '+cls+'">'+v42_html_(label)+': '+(n||0)+'</span>'; }
function v42_statBox_(label,n,cls) { return '<div class="sbox '+cls+'"><div class="snum">'+(n||0)+'</div><div class="slbl">'+v42_html_(label)+'</div></div>'; }


// =============================================================================
//  POS-IS-KING BARCODE + BRAND HELPERS
// =============================================================================
// Shared by supplier highlight + OUT_MERGED_DATA build.
// Intentional behaviour:
//   - TMP_MERGED_POS_DATA / POS barcode display value is preserved for output.
//   - Canonical barcode is used only for matching / lookup.
//   - UPC/EAN/GTIN formatting variants do not trigger BARCODE UPDATE.
//   - SRC_POS_BRAND_NAME_CHANGES is applied with truncated-brand safety.
function posKingSafe_(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function posKingUpper_(v) {
  return posKingSafe_(v).toUpperCase();
}

function posKingNormBrand_(s) {
  return posKingUpper_(s)
    .replace(/^Z+\s*/i, '')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\bAUSTRALIA\b/g, 'AUS')
    .replace(/\bAUSTRALIAN\b/g, 'AUS')
    .replace(/\bAUST\b/g, 'AUS')
    .replace(/\s+/g, ' ')
    .trim();
}

function posKingCleanBarcode_(raw) {
  var clean = posKingSafe_(raw)
    .replace(/["']/g, '')
    .replace(/\.0+$/, '')
    .replace(/\D/g, '');

  if (!clean) return '';
  if (clean.length > 14) return '';
  if (clean.length === 14) clean = clean.slice(1);
  else if (clean.length < 13) clean = clean.padStart(13, '0');

  return /^\d{13}$/.test(clean) ? clean : '';
}

function posKingCanonicalBarcode_(raw) {
  // Clean/compare key only: normalize UPC-A, EAN-13 and GTIN-14 into one
  // 13-digit EAN-13 barcode exactly like the external clean_barcode() logic.
  return posKingCleanBarcode_(raw);
}

function posKingOutputBarcode_(raw, fallback) {
  var cleaned = posKingCleanBarcode_(raw);
  if (cleaned) return cleaned;
  cleaned = posKingCleanBarcode_(fallback);
  return cleaned || '';
}

function posKingBarcodeKeySet_(raw) {
  var keys = {};

  function add_(v) {
    v = posKingSafe_(v);
    if (v) keys[v] = true;
  }

  var rawText = posKingSafe_(raw);
  if (rawText) {
    add_(rawText);

    var digits = rawText
      .replace(/\.0+$/, '')
      .replace(/[^0-9]/g, '');

    add_(digits);

    if (digits) {
      add_(digits.replace(/^0+/, '') || '0');
      if (digits.length === 14) add_(digits.slice(1));
      if (digits.length === 13) add_('0' + digits);
      if (digits.length === 12) add_('0' + digits);
      if (digits.length === 11) add_(digits.padStart(13, '0'));
    }
  }

  var canonical = posKingCanonicalBarcode_(raw);
  if (canonical) {
    add_(canonical);
    add_(canonical.replace(/^0+/, '') || '0');
    if (canonical.length === 13) add_('0' + canonical);
  }

  return keys;
}

function posKingBarcodeKeysList_(raw) {
  return Object.keys(posKingBarcodeKeySet_(raw));
}

function posKingBarcodeSetsIntersect_(a, b) {
  a = a || {};
  b = b || {};
  var keys = Object.keys(a);
  for (var i = 0; i < keys.length; i++) {
    if (b[keys[i]]) return true;
  }
  return false;
}

function posKingBarcodeObject_(raw) {
  var rawText = posKingSafe_(raw);
  var canonical = posKingCanonicalBarcode_(rawText);
  var variants = posKingBarcodeKeysList_(rawText);
  return {
    valid: !!canonical,
    raw: rawText,
    canonical: canonical,
    variants: variants
  };
}


function posKingNormText_(s) {
  return posKingUpper_(s).replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function posKingDice_(a, b) {
  a = posKingNormText_(a);
  b = posKingNormText_(b);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  var map = {};
  var i;
  for (i = 0; i < a.length - 1; i++) {
    var gram = a.slice(i, i + 2);
    map[gram] = (map[gram] || 0) + 1;
  }
  var intersect = 0;
  var total = (a.length - 1) + (b.length - 1);
  for (i = 0; i < b.length - 1; i++) {
    var bg = b.slice(i, i + 2);
    if (map[bg]) {
      intersect++;
      map[bg]--;
    }
  }
  return total ? (2 * intersect) / total : 0;
}

function posKingBarcodeUpdateValue_(posRawBarcode, supRawBarcode, posDescr, supProduct) {
  var posRaw = posKingSafe_(posRawBarcode);
  var supRaw = posKingSafe_(supRawBarcode);

  if (!posRaw || !supRaw) return '';

  var posCan = posKingCanonicalBarcode_(posRaw);
  var supCan = posKingCanonicalBarcode_(supRaw);

  if (!posCan || !supCan) return '';

  // Formatting-only variants are not real barcode updates.
  var posKeys = posKingBarcodeKeySet_(posRaw);
  var supKeys = posKingBarcodeKeySet_(supRaw);
  if (posKingBarcodeSetsIntersect_(posKeys, supKeys)) return '';

  // Extra guard for barcode-replacement candidates: when the product text is
  // clearly unrelated, do not silently auto-update the barcode. Flag the OUT
  // BARCODE UPDATE cell for review instead.
  try {
    if (posDescr && supProduct) {
      var posNorm = posKingNormText_(posDescr);
      var supNorm = posKingNormText_(supProduct);
      var dice = posKingDice_(posNorm, supNorm);
      if (dice < 0.35) return 'REVIEW: ' + supCan;
    }
  } catch(eReviewGuard) {
    try { log_('[BARCODE UPDATE] text similarity guard skipped: ' + eReviewGuard.message); } catch(_eLog) {}
  }

  // True replacement barcode. Return clean 13-digit EAN-13 for the update cell.
  // Existing POS/TMP barcode display stays POS-is-king in K/AG; L shows the
  // replacement barcode in the scan-ready format the POS import expects.
  return supCan;
}

function posKingHeaderMap_(sh, rowNum) {
  var lastCol = sh.getLastColumn();
  var vals = sh.getRange(rowNum || 2, 1, 1, lastCol).getDisplayValues()[0];
  var map = {};
  for (var i = 0; i < vals.length; i++) {
    var h = posKingUpper_(vals[i]);
    if (h) map[h] = i;
  }
  return map;
}

function posKingColVal_(row, map, candidates) {
  for (var i = 0; i < candidates.length; i++) {
    var key = posKingUpper_(candidates[i]);
    var idx = map[key];
    if (idx !== undefined && idx >= 0 && idx < row.length) {
      var v = row[idx];
      if (v !== '' && v !== null && v !== undefined) return v;
    }
  }
  return '';
}

function posKingAddBrandMapKeys_(map, fromBrand, toBrand, sheetRow) {
  fromBrand = posKingSafe_(fromBrand);
  toBrand = posKingSafe_(toBrand);
  if (!fromBrand || !toBrand) return;

  if (!map.__rows) map.__rows = [];
  if (!map.__keyRows) map.__keyRows = {};
  if (!map.__usedRows) map.__usedRows = {};
  if (sheetRow) {
    map.__rows.push({ row: sheetRow, supBrand: fromBrand, posBrand: toBrand });
  }

  var keys = [];

  function addKey_(v) {
    v = posKingSafe_(v);
    if (!v) return;
    keys.push(posKingUpper_(v));
    keys.push(posKingNormBrand_(v));
    // POS often carries 20-character truncated brand text; index both forms.
    keys.push(posKingUpper_(v).slice(0, 20));
    keys.push(posKingNormBrand_(v).slice(0, 20));
  }

  addKey_(fromBrand);
  addKey_(toBrand);

  keys.forEach(function(k) {
    if (k) {
      map[k] = toBrand;
      if (sheetRow) map.__keyRows[k] = sheetRow;
    }
  });
}

function posKingLoadBrandMap_(ss) {
  var map = { __rows: [], __keyRows: {}, __usedRows: {} };
  var shName = (CFG && CFG.SH && CFG.SH.SRC_BRANDS) || 'SRC_POS_BRAND_NAME_CHANGES';
  var sh = ss.getSheetByName(shName);
  if (!sh || sh.getLastRow() < 3) return map;

  var headers = posKingHeaderMap_(sh, 2);
  var data = sh.getRange(3, 1, sh.getLastRow() - 2, sh.getLastColumn()).getDisplayValues();

  for (var i = 0; i < data.length; i++) {
    var row = data[i];

    var supBrand = posKingColVal_(row, headers, [
      'SUP BRAND',
      'SUPPLIER BRAND',
      'SOURCE BRAND',
      'BRAND FROM'
    ]);

    var posBrand = posKingColVal_(row, headers, [
      'POS BRAND',
      'POS MASTER BRAND',
      'BRAND TO'
    ]);

    if (supBrand && posBrand) {
      posKingAddBrandMapKeys_(map, supBrand, posBrand, 3 + i);
    }
  }

  return map;
}

function posKingTranslateBrand_(brand, brandMap) {
  brandMap = brandMap || {};
  var raw = posKingSafe_(brand);
  if (!raw) return '';

  var keys = [
    posKingUpper_(raw),
    posKingNormBrand_(raw),
    posKingUpper_(raw).slice(0, 20),
    posKingNormBrand_(raw).slice(0, 20)
  ];

  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (!k) continue;
    if (brandMap[k]) {
      if (brandMap.__usedRows && brandMap.__keyRows && brandMap.__keyRows[k]) {
        brandMap.__usedRows[brandMap.__keyRows[k]] = true;
      }
      return brandMap[k];
    }
  }
  return raw;
}


// =============================================================================
//  END — 1.0 - Setup.gs
// =============================================================================