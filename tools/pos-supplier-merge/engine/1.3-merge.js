// =============================================================================
//  POS DB & SUPPLIER MERGE
//  1.3 - Merge.gs
//
//  Clean no-duplicate merge file.
//  Fast local-only OUT_MERGED_DATA builder from supplier STATUS column P.
//  v6.3.13 fix:
//    - Column AD / WSP TO RRP MARKUP % now uses the same two-line display
//      structure as AC and AE: markup ratio plus GP NGST line.
//  v6.3.7 fixes:
//    - Removes duplicated override function blocks from previous merge file.
//    - Forces OUT_MERGED_DATA generated data rows to fixed 20px height after write.
//    - Forces POS output defaults exactly: AN/AP/AQ/AR = 1 and BG/BH/BI = 0.
//    - Keeps actual SRC header aliases: POS BRAND / POS PREFIX and POS ACCNO / POS ACNAME.
//    - Keeps supplier product pipeline: brand strip → find/replace → prefix → final format.
//  v6.3.9 source-priority corrections applied on top of v6.3.8:
//    - Uses shared POS-is-king barcode variants and brand-map translation helpers.
//    - Preserves TMP/POS barcode display values in POS MAIN ID/main id output.
//    - BARCODE UPDATE is only populated for true supplier-vs-POS barcode replacements.
//    - Adds old-script P6 barcode relink pass: DISCONTINUED + NEW same-product
//      pairs become MATCHED rows with BARCODE UPDATE instead of staying split.
//
//  v6.3.8 source-priority corrections applied on top of v6.3.7 price-tier additions:
//    - m13LoadPrefixMap_: captures SRC_POS_PRODUCT_PREFIX col D (POS MEMBER) into
//      __memberBrands for loyalty-tier detection.
//    - m13LoadDiscountRules_: captures SRC_POS_ONGOING_DISCOUNTS col J (POS MEMBER)
//      as isMember flag on each rule.
//    - New helpers: m13TierPct_, m13Pr5Pct_, m13IsMemberBrand_, m13CalcPriceTiers_.
//    - m13BuildOneOutRow_ / m13BuildDiscontinuedOutRow_: all pr/ret columns now
//      computed (ceiling-to-$0.05) rather than copied from POS; dissno 33/29/8/13
//      exception forces pr1–pr4 / pr6–pr9 / ret to 100 (pr5 staff formula always runs).
//  v6.3.12 brand-column correction:
//    - OUT_MERGED_DATA column H now shows the final/new updated brand.
//    - OUT_MERGED_DATA column J now shows the old POS brand only when changed.
//  v6.3.32 note:
//    - Carries forward the end-user Format/Clear popup v2 layout only.
//    - No merge, matching, pricing, barcode, export, or supplier refresh logic changed.
//  v6.3.25 correction:
//    - POS output sheets now read by fixed final OUT positions AN:BR, not header fallbacks.
//  v6.3.30 precision corrections:
//    - Compact markup display uses "% | GP NGST %" instead of two-line wrap.
//    - POS TXT export file names use the top 3 most frequent brands, comma-separated.
//    - Keeps v6.3.24 barcode-normalisation correction:
//    - New product barcodes and barcode-update values are written as clean
//      13-digit EAN-13 values. Existing POS/TMP barcode display remains POS-is-king.
//  v6.3.31 supplier-change refresh:
//    - Adds controlled refreshSupplierChanges() for manual edits in OUT_MERGED_DATA column G.
//    - Validates selected supplier against supplier upload by barcode/sub-id/brand/product.
//    - Updates only supplier-driven pricing/output fields, preserving POS-is-king IDs.
//  v6.3.33 precision correction:
//    - Adds missing m13BlankSupplier_ helper used by supplier-change refresh index.
//      No matching, pricing, barcode, export, popup, or highlight logic changed.
//  v6.3.35 supplier refresh correction:
//    - Multi-check supplier change validation treats barcode as shared product
//      identity and sub-id as distributor-specific.
//  v6.3.36 supplier refresh correction:
//    - Rejected supplier changes revert G back to the accepted supplier.
//    - Accepted supplier changes only keep N / POS SUB ID amber after refresh.
//    - Treats sub-id as distributor-specific and never mandatory across suppliers.
//    - Supplier swap validation now uses barcode first, then sub-id, then conservative
//      brand + fuzzy product + pack/size + WSP fallback for existing OUT rows.
//    - Rejection notes now explain when a barcode exists under another supplier.
//  v6.3.41 clean display correction:
//    - NOTES is kept short (accepted/rejected/review only) so duplicate trace text
//      does not expand row heights.
//    - Audit columns AG:AM are centred; TEXT %, SIZE and TYPE now display values
//      only, not checkbox prefixes.
//    - AC:AE markup cells return to the previous two-line layout for readability.
//  v6.3.42 markup display correction:
//    - AE header now carries the +6.5% uplift label; cell values no longer repeat KEEP.
//    - AC:AE add GP NGST dollar yield after the GP percentage.
//  v6.3.43 OUT_MERGED_DATA display correction:
//    - Sorts by ROW STATUS: IDENTITY REVIEW, MATCHED, NEW PRODUCT, DISCONTINUED.
//    - Supplier refresh writes SUP OVERRIDE ACCEPTED / REJECTED into C.
//    - Rounding-noise thresholds suppress $0.01 / tiny percentage price changes.
//    - AG:AJ checkbox audit columns use 10pt font.
//  v6.3.44 visual/style correction:
//    - Setup conditional-format rules now keep grey/no-change cells font-only so
//      zebra banding remains visible.
//    - Highlight no longer pre-clears supplier STATUS P immediately before its
//      final full STATUS write.
//    - Setup adds a data-area onEdit style guard for plain-text paste/entry.
//  v6.3.47 type-acronym POS DESCR correction:
//    - Adds verified C / VC / T dosage-form suffix to OUT column P only when missing.
//    - Uses strict multi-source evidence; no weight-to-type guessing is introduced.
//  v6.3.47 export-price-format correction:
//    - POS UPDATE/INSERT sheet + TXT export now strip currency symbols from POS
//      price fields while preserving the visible workbook formatting elsewhere.
//  v6.3.60 POS description safety correction:
//    - Reconciliation engine keeps Supplier product as foundation and grafts only
//      explicit missing POS size/type context from ORIGINAL POS DESCR.
//    - Adds strict whole-token cleanup, stronger size/type dedupe, and DFH/Biopractica
//      brand-specific evidence rules without guessing dosage form from units globally.
//  v6.3.47 prefix-protect correction:
//    - Prevents m13ApplyPrefix_ from stripping Find/Replace-created leading
//      descriptors such as COCO, LAV, ORG, NAT, AUST, and ESSEN just because
//      they match another brand's POS prefix.
//  v6.3.59 reconciled POS description correction:
//    - Column P now starts from supplier product text, then surgically patches
//      missing size/type context from ORIGINAL POS DESCR column O.
//    - Find/Replace uses whole-token boundaries and longest-first order.
//    - Marketing/noise phrases are purged before SRC_POS_FIND_REPLACE rules.
//    - Size/type extraction stays strict; fallback to POS context only fills blanks.
//  v6.3.46 size/type parser correction:
//    - Enhances AL / SIZE and AM / TYPE extraction from supplier product text.
//    - Adds LT/Litre support, capsule/tablet sentence parsing, and contextual
//      size-unit inference while keeping the existing audit-column integration.
//  v6.3.59 POS import safety correction:
//    - Price level 5 is now clamped to the POS-safe percentage range before
//      export. This prevents POS upload errors where calculated PR5 falls below
//      the minimum accepted percentage because the final shelf RRP is unusually
//      high compared with last price.
//  v6.3.68 POS DESCR character safety correction:
//    - Normalises mojibake/Unicode punctuation in column P and POS output descr/pos desc.
//    - Preserves normal ASCII hyphens while converting en/em dashes to '-'.
//  v6.3.70 discontinued-brand output correction:
//    - Cleans leading ZZZ/ZZZZ discontinued prefixes from brand fields only.
//    - Keeps discontinued descriptions unchanged so POS discontinue markers remain intact.
//  v6.3.71 final Column P find/replace correction:
//    - After Column P is fully reconciled/polished, runs a controlled final pass
//      using SRC_POS_FIND_REPLACE word/phrase rules only. Symbol-only and blank
//      replacement rules are skipped so hyphens/brackets are not over-stripped.
//    - Restores supplier-evidence hyphenated tokens such as Z-MAG and protects
//      known final display abbreviations such as LCARN from over-correction.
//  v6.3.73 Column P serve-count preservation:
//    - Preserves explicit supplier serve counts such as 30 SERVINGS as 30 SERV
//      in OUT_MERGED_DATA column P, instead of stripping the count before size.
//  v6.3.77 filtered-brand early-scope correction:
//    - Adds BUILD OUT_MERGED_DATA — FILTERED BRANDS (COL E).
//    - Resolves currently visible supplier brands immediately after STATUS
//      freshness validation and before normal heavy merge preparation.
//    - Reads only narrow TMP selector columns across the full TMP body, then
//      reads full TMP/supplier row bodies through bounded windows for scoped rows.
//    - Uses the same m13BuildPosBundle_ and m13BuildRows_ engines as the full build.
//    - The existing full BUILD OUT_MERGED_DATA function body is unchanged.
//  v6.3.78 filtered-brand scope v2 performance correction:
//    - Isolates every new optimisation helper under the m13FB2 prefix.
//    - Fast-path resolves a normal Column-E value filter directly from its hidden
//      values without inserting/deleting a temporary supplier helper column.
//    - Uses a hidden _M13_FB2_V638_SCOPE scratch cell so Google Sheets resolves
//      candidate TMP sheet-row numbers internally from brand/barcode/supplier+sub-ID
//      scope; Apps Script no longer transfers four full-height TMP selector columns.
//    - Candidate TMP rows are still read through bounded windows and exact row
//      membership rejects unrelated window rows before POS object construction.
//    - Filtered output preparation no longer deleteRows() thousands of old physical
//      OUT rows; it clears the previous used body and recreates the exact filter range.
//    - Any native selector failure falls back to the v6.3.77 narrow-scan selector.
//    - The existing full BUILD OUT_MERGED_DATA function body remains unchanged.
//  v6.3.79 filtered-brand direct TMP scope v3 performance correction:
//    - Treats the user's reduced-input timing as the behavioural target: once the
//      visible Column-E brand scope is known, unrelated supplier rows stay out of
//      the expensive merge path exactly as though they were absent from the upload.
//    - New m13FB3 helpers use direct TextFinder searches on TMP brand, barcode and
//      sub-ID selector columns instead of the FB2 scratch-sheet FILTER/TEXTJOIN formula.
//    - TextFinder hits are only candidate sheet rows. They are exact-verified with
//      the same m13BrandInScope_, barcode-key intersection and supplier+sub-ID rules
//      before any full TMP row body is read or any POS merge object is constructed.
//    - Fragmented verified TMP rows are still grouped into bounded full-row read windows.
//    - Any direct-selector error falls back to the exact v6.3.77 narrow selector scan.
//    - The existing full BUILD OUT_MERGED_DATA function body remains unchanged.
//  v6.3.80 filtered-brand clean-output v4 correction:
//    - Keeps the active m13FB3 direct TMP selector and all existing scoped merge logic.
//    - Restores the established physical excess-row removal for filtered OUT builds
//      through isolated m13FB4PrepareOutSheet_, which delegates to the existing
//      m13PrepareOutSheet_ output-preparation engine instead of retaining empty rows.
//    - No matching, pricing, description, review, discontinued or POS export logic changed.
//    - The existing full BUILD OUT_MERGED_DATA function body remains unchanged.
//  v6.3.81 full-merge performance v1 correction:
//    - Isolates full-build performance helpers under m13FM1.
//    - Buckets duplicate-new candidates by the exact same normalised brand equality
//      already required by m13OutRowsLookLikeSameProduct_.
//    - Buckets DISC+NEW barcode-relink candidates by the exact same 20-character
//      relink brand-family lane already accepted by m13RelinkBrandsMatch_.
//    - Precompiles SRC find/replace whole-token regex objects once at load time.
//    - Compiles TMP header alias positions once before the 31,000+ row POS pass.
//    - Full-build output prep may defer two body pre-format calls that m13WriteOut_
//      performs immediately before/after write; final formatting and row heights stay unchanged.
//    - Adds full-build stage timings without changing row results or export behaviour.
//  v6.3.82 new-product brand price-level inheritance:
//    - NEW PRODUCT rows can follow the established PR 1 PC–PR 9 PC pattern
//      of existing TMP/POS products from the same translated/normalised brand.
//    - Brand profiles are resolved per price level from the unique dominant
//      existing-brand nominal tier; ambiguous tied brand patterns fall back to
//      the existing default calculation for that individual price level.
//    - PR5 keeps the existing last-price/GST staff formula exactly.
//    - DISSNO 33/29/8/13 protected price-level exceptions remain unchanged.
//    - The inheritance pass runs only after barcode relink, duplicate-new guard,
//      and description review promotion, so only rows still genuinely NEW use it.
//    - No matched, review, discontinued, pricing, matching, export, filtered-build,
//      or POS-is-king identity rules are replaced or weakened.
//  v6.3.83 NEW PRODUCT price-level RRP-independent v2 correction:
//    - Removes the v6.3.82 NEW-only RRP hard gate that skipped brand inheritance
//      when BE / rrp incgst was blank.
//    - Adds isolated m13PL2 helpers so NEW PRODUCT nominal PR tiers are direct
//      percentages when RRP is absent; with RRP, the established $0.05 ceiling
//      and back-calculated percentage behaviour remains unchanged.
//    - Brand price-level voting can fall back to stored POS percentages when a
//      source TMP/POS row has no RRP instead of discarding that brand evidence.
//    - NEW PRODUCT INSERT generation preserves resolved OUT PR1-4/PR6-9 values,
//      so generation no longer recalculates inherited tiers back to defaults.
//    - PR5 remains the existing last-price/GST staff formula. Protected DISSNO
//      33/29/8/13, matched, review and discontinued price-tier paths remain unchanged.
//  DP6 Q-authoritative family + identity-safe compression:
//    - Builds brand-relative token frequency from current SUP PRODUCT/Q only.
//    - Protects distinctive Q terms before generic category wording at 35 chars.
//    - Preserves numeric ranges, removes NONE sentinels and prefix/body repeats.
//    - O remains presentation/reference only and cannot add current product facts.
//  DP8 conservative O/Q balance + resilient explicit-prefix lookup:
//    - Q/SUP PRODUCT remains the only source allowed to introduce current facts.
//    - Existing O/ORIGINAL POS DESCR preference is retained only for concepts
//      independently confirmed by Q; no broad scoring increase is introduced.
//    - Natural Q range names that happen to equal another brand prefix are kept.
//    - Explicit prefix lookup tolerates one spelling edit or a unique 1-2 word
//      trailing brand extension only after exact lookup fails.
//    - DP7 export RRP/PR5 and K/L safeguards are preserved unchanged.
//  v6.3.84 schema-aware edit-style retention:
//    - Version alignment only in Merge; ES1 edit-style retention is isolated in 1.0 Setup.
//    - No merge, price-level, matching, review, barcode, filtered-build, output or export logic changed.
//  v6.3.86 ZZZZ brand + Sub ID PLU additions:
//    - Discontinued rows: brand (H / AS and the POS UPDATE brand) gets a leading "ZZZZ ";
//      Sub ID becomes "DISC <PLU>".
//    - Matched rows the supplier upload marks discontinued (SUP SUB ID DISCONTINUED or SUP PRODUCT
//      starting ZZZ): brand H / I / AS → "ZZZZ <brand>", OLD BRAND → previous brand,
//      Sub ID → "DISC <PLU>", POS DESCR → existing discontinued "ZZZZ " description rule.
//    - All rows with a POS PLU: blank Sub ID becomes the PLU; SPECIAL ORDER → "SPEC ORD <PLU>",
//      DISCONTINUED → "DISC <PLU>" (M13.SUBID_PLU_LABELS), kept within the 15-character POS Sub ID.
//    - "SPEC ORD" Sub IDs stay protected from discontinuation like SPECIAL ORDER.
//    - SUB ID audit tick treats "SPEC ORD <PLU>" / "DISC <PLU>" as SPECIAL ORDER / DISCONTINUED.
//    - No other merge, matching, pricing or export logic changed.
//  v6.3.87 discontinued OLD BRAND + single ZZZZ description:
//    - Discontinued rows: J / OLD BRAND shows the brand before ZZZZ.
//    - Supplier-discontinued matched rows: POS DESCR / descr is built from the supplier and POS text
//      without their ZZZZ marker, then gets one leading "ZZZZ " (no ZZZZ repeated inside).
//      SUP PRODUCT (Q) and ORIGINAL POS DESCR (O) still show the uploaded text unchanged.
//  v6.3.88 discontinued brand scope (DS1):
//    - Unmatched POS products are discontinued for every POS name of an uploaded brand, not only
//      a POS brand spelled exactly like SUP BRAND: the 20-character POS brand form
//      (BIOCEUTICALS CLINICA = BIOCEUTICALS CLINICAL) and POS brands the upload's barcode matches
//      link to (AUSTRALIAN BUSH FLOW = BUSH FLOWER, MELROSE ORGANIC = MELROSE). See m13DS1… helpers.
//    - Placeholder POS brands (DISCONTINUED, UNKNOWN, BOOK…) are never linked. SPECIAL ORDER /
//      NO REORDER protection, matching, pricing and the discontinued row layout are unchanged.
//    - Linked rows say why in NOTES; the build message shows how many were added this way.
//    - Filtered-brand build reads the linked POS brands' TMP rows too.
//  v6.3.89 shortened brand names (BE1) + POS size/type for bare supplier counts (SZ1):
//    - BE1: a brand shortened to fit the 20-character POS brand field, or with its last word cut
//      (BLACKMORES PROF = BLACKMORES PROFESSIONAL), is the same brand. SUP BRAND takes the one listed
//      brand it is short for (SRC_POS_BRAND_NAME_CHANGES / SRC_POS_ONGOING_DISCOUNTS names), so its
//      discount, member flag and prefix apply; OLD BRAND / "BRAND CHANGED" and the BRAND ☒ are no
//      longer shown for the same brand (the POS name is kept). A real rename (BLACKMORES → BLACKMORES
//      PROFESSIONAL) still is. POS brand translation is unchanged.
//    - SZ1: when SUP PRODUCT gives only a bare count ("(60)") and the matched ORIGINAL POS DESCR has the
//      same count with its form (60T / 60C / 60VC), AL / SIZE and AM / TYPE use the POS size and form,
//      and POS DESCR gets the form letter (BIOC CLIN METHYL 60 → 60T). A word the marketing purge took
//      out of SUP PRODUCT is put back when ORIGINAL POS DESCR has it too (BIOC CLIN METHYL BIOACTIVE 60T).
//    - No matching, pricing formula, discontinued scope, Sub ID or export logic changed.
// =============================================================================

var M13 = {
//  v6.3.60 POS description safety correction:
//    - Supplier text stays the foundation, but weak supplier-only counts such
//      as (120) no longer overwrite a clear POS size/type like 60C.
//    - Strong supplier/POS size conflicts are promoted to IDENTITY REVIEW.
//    - Final POS DESCR cleanup removes duplicate type counts and repeated
//      prefix/descriptor tokens without aggressive clipping.
  VERSION: 'v6.3.89-brand-length-size-type-v1',
  // v6.3.86: [text found in the Sub ID, short label written before the POS PLU]. Blank Sub ID → PLU.
  SUBID_PLU_LABELS: [
    ['SPECIAL ORDER', 'SPEC ORD'], ['SPICAL ORDER', 'SPEC ORD'], ['SPRICAL ORDER', 'SPEC ORD'], ['SPEC ORD', 'SPEC ORD'],
    ['DISCONTINUED', 'DISC'],
    ['UNKNOWN', 'UNKNOWN']
  ],
  SUBID_MAX_LEN: 15, // POS Sub ID field width
  // v6.3.88 DS1 discontinued scope — POS names of the uploaded brands (m13DS1… helpers).
  DS1_POS_BRAND_WIDTH: 20,     // POS brand field width (BIOCEUTICALS CLINICAL → BIOCEUTICALS CLINICA)
  DS1_MIN_LINK_MATCHES: 2,     // barcode matches needed to link a POS brand whose name shares no word
  DS1_MIN_LINK_SHARE: 0.5,     // …and the share of that POS brand's rows those matches must cover
  DS1_PLACEHOLDER_BRANDS: ['DISCONTINUED', 'DISC', 'UNKNOWN', 'BOOK', 'BOOKS', 'MISC', 'MISCELLANEOUS', 'SPECIAL ORDER',
    'GENERAL', 'VARIOUS', 'NO BRAND', 'NONE', 'IN HOUSE', 'HOUSE BRAND', 'TEST'],
  DS1_GENERIC_WORDS: ['THE', 'AND', 'FOR', 'WITH', 'PTY', 'LTD', 'INC', 'COMPANY', 'NATURAL', 'NATURALS', 'NATURE', 'NATURES',
    'ORGANIC', 'ORGANICS', 'HEALTH', 'HEALTHY', 'HEALTHCARE', 'PRODUCTS', 'PRODUCT', 'PROD', 'AUSTRALIA', 'AUSTRALIAN', 'AUS',
    'AUST', 'INTERNATIONAL', 'LABS', 'LAB', 'LABORATORIES', 'FOOD', 'FOODS', 'CARE', 'BEAUTY', 'SKIN', 'SKINCARE', 'BODY',
    'HOME', 'WELLNESS', 'NUTRITION', 'NUTRITIONAL', 'PROFESSIONAL', 'CLINICAL', 'CLINIC', 'PURE', 'LIFE', 'LIVING', 'BOOK',
    'BOOKS', 'MISC', 'MISCELLANEOUS', 'SUPER', 'SUPERFOODS', 'HERBAL', 'HERBALS', 'HERBS', 'HERB', 'TEA', 'TEAS', 'OIL',
    'OILS', 'ESSENTIAL', 'ESSENTIALS', 'REMEDIES', 'REMEDY', 'PHARMACEUTICALS', 'PHARMA', 'SOLUTIONS', 'SUPPLIES', 'GROUP',
    'BRANDS', 'THERAPEUTICS', 'NATUROPATHICS', 'SPECIAL', 'ORDER'],
  HEADER_ROW: 2,
  DATA_ROW: 3,
  STATUS_COL: 16,
  OUT_SHEET: 'OUT_MERGED_DATA',
  INCLUDE_NOT_USED: false,
  INCLUDE_UNMATCHABLE: true,
  INCLUDE_DISCONTINUED: true,
  WRITE_ROW_CSS: false,
  TARGET_RRP_UPLIFT: 0.065,
  // Treat tiny supplier/import rounding noise as no price movement.
  PRICE_ROUNDING_MIN_DOLLARS: 0.02,
  PRICE_ROUNDING_MIN_PCT: 0.005,
  // DP6: POS DESCR only. No matching/pricing/export/status behaviour reads this value.
  POS_DESCR_MAX: 35,
  HEADERS: [
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
  'itemsize','packaging','pos soh','STATUS'
  ]
};

function mergeOutMergedMenu() { return buildOutMergedDataFromSupplierStatus(); }

function m13BuildPosBarcodeIndex_(shTmp, brandMap, findReplaceRules) {
  var lastRow = shTmp.getLastRow();
  var lastCol = shTmp.getLastColumn();
  var headers = m13HeaderMap_(shTmp, M13.HEADER_ROW);
  var data = shTmp.getRange(M13.DATA_ROW, 1, lastRow - M13.DATA_ROW + 1, lastCol).getDisplayValues();
  var index = {};

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var rawBarcode = m13Str_(m13ColVal_(row, headers, ['POS MAIN ID', 'MAIN ID', 'MAIN_ID', 'POS MASTER BARCODE', 'MASTER BARCODE', 'BARCODE']));
    var bc = m13Barcode_(rawBarcode);
    if (!bc.valid) continue;

    var rawBrand = m13Str_(m13ColVal_(row, headers, ['POS MASTER BRAND', 'POS BRAND', 'BRAND']));
    var translatedBrand = m13TranslateBrand_(rawBrand, brandMap);
    var descr = m13Str_(m13ColVal_(row, headers, ['POS DESCR', 'POS POS DESC', 'POS PRODUCT', 'DESCR', 'DESCRIPTION']));

    var pos = {
      sheetRow: M13.DATA_ROW + i,
      rawBarcode: rawBarcode,
      barcode: bc.canonical,
      variants: bc.variants,
      plu: m13Str_(m13ColVal_(row, headers, ['POS PLU', 'PLU'])),
      subId: m13Str_(m13ColVal_(row, headers, ['POS SUB ID', 'SUB ID', 'SUB_ID'])),
      brand: rawBrand,
      translatedBrand: translatedBrand,
      descr: descr,
      cleanDescr: m13ApplyFindReplace_(descr, findReplaceRules),
      posDesc: m13Str_(m13ColVal_(row, headers, ['POS POS DESC', 'POS DESC', 'POS_DESCR'])),
      dissno: m13Str_(m13ColVal_(row, headers, ['POS DISSNO', 'DISSNO'])),
      prodGrp: m13Str_(m13ColVal_(row, headers, ['POS PROD GRP', 'PROD GRP', 'PROD_GRP'])),
      supplier: m13Str_(m13ColVal_(row, headers, ['POS SUPPLIER', 'SUPPLIER'])),
      loyalty: m13Str_(m13ColVal_(row, headers, ['POS LOYALTY SCHEME', 'LOYALTY SCHEME'])),
      units: m13Str_(m13ColVal_(row, headers, ['POS UNITS', 'UNITS'])),
      minOrder: m13Str_(m13ColVal_(row, headers, ['POS MIN ORDER QTY', 'MIN ORDER QTY'])),
      wsp: m13Num_(m13ColVal_(row, headers, ['POS WSP EXCGST', 'WSP EXCGST', 'WSP'])),
      lastPrice: m13Num_(m13ColVal_(row, headers, ['POS LAST PRICE', 'LAST PRICE'])),
      gstPct: m13GstPct_(m13ColVal_(row, headers, ['POS GST TAX PC', 'GST TAX PC', 'GST'])),
      rrp: m13Num_(m13ColVal_(row, headers, ['POS RRP INCGST', 'RRP INCGST', 'RRP'])),
      pr1: m13Str_(m13ColVal_(row, headers, ['POS PR 1 PC', 'PR 1 PC'])),
      pr2: m13Str_(m13ColVal_(row, headers, ['POS PR 2 PC', 'PR 2 PC'])),
      pr3: m13Str_(m13ColVal_(row, headers, ['POS PR 3 PC', 'PR 3 PC'])),
      pr4: m13Str_(m13ColVal_(row, headers, ['POS PR 4 PC', 'PR 4 PC'])),
      pr5: m13Str_(m13ColVal_(row, headers, ['POS PR 5 PC', 'PR 5 PC'])),
      pr6: m13Str_(m13ColVal_(row, headers, ['POS PR 6 PC', 'PR 6 PC'])),
      pr7: m13Str_(m13ColVal_(row, headers, ['POS PR 7 PC', 'PR 7 PC'])),
      pr8: m13Str_(m13ColVal_(row, headers, ['POS PR 8 PC', 'PR 8 PC'])),
      pr9: m13Str_(m13ColVal_(row, headers, ['POS PR 9 PC', 'PR 9 PC'])),
      retPrice: m13Str_(m13ColVal_(row, headers, ['POS RET PRICE', 'RET PRICE'])),
      pharmProd: m13Str_(m13ColVal_(row, headers, ['POS PHARM PROD', 'PHARM PROD'])),
      scales: m13Str_(m13ColVal_(row, headers, ['POS SCALES', 'SCALES'])),
      itemsize: m13Str_(m13ColVal_(row, headers, ['POS ITEMSIZE', 'ITEMSIZE'])),
      packaging: m13Str_(m13ColVal_(row, headers, ['POS PACKAGING', 'PACKAGING'])),
      soh: m13Str_(m13ColVal_(row, headers, ['POS SOH', 'SOH']))
    };

    for (var v = 0; v < bc.variants.length; v++) {
      if (!index[bc.variants[v]]) index[bc.variants[v]] = { familyKey: bc.canonical, pos: pos };
    }
  }
  return index;
}

function m13FindPosByBarcode_(posIndex, variants) {
  for (var i = 0; i < variants.length; i++) {
    if (posIndex[variants[i]]) return posIndex[variants[i]];
  }
  return null;
}

function m13LoadBrandMap_(ss) {
  return posKingLoadBrandMap_(ss);
}

function m13LoadSupplierMap_(ss) {
  var map = {};
  var sh = m13Sheet_(ss, CFG.SH.SRC_SUPP || 'SRC_POS_SUPPLIERS', false);
  if (!sh || sh.getLastRow() < M13.DATA_ROW) return map;
  var data = sh.getRange(M13.DATA_ROW, 1, sh.getLastRow() - M13.DATA_ROW + 1, Math.max(3, sh.getLastColumn())).getDisplayValues();
  for (var i = 0; i < data.length; i++) {
    var acc = m13Str_(data[i][1]);
    var name = m13Str_(data[i][2]);
    if (acc && name) map[acc] = name;
  }
  return map;
}

function m13IsBlockedSupplierStatus_(status) {
  var s = m13Upper_(status).replace(/[^A-Z0-9]+/g, ' ').trim();
  if (!s) return false;
  return /^(BLOCK|BLOCKED|EXCLUDE|EXCLUDED|DO NOT USE|DNU|UNUSED|INACTIVE|DISABLED|NO|N|FALSE|NOT USED)$/.test(s);
}

function m13IsUsedSupplierStatus_(status) {
  var s = m13Upper_(status).replace(/[^A-Z0-9]+/g, ' ').trim();
  return /^(USED|ACTIVE|YES|Y|TRUE)$/.test(s);
}

function m13LoadActiveSuppliers_(ss) {
  // v6.3.61: SRC_POS_SUPPLIERS is not a supplier whitelist.
  // Blank SRC STATUS stays allowed. Only explicit block/exclude statuses
  // prevent a current supplier row from participating in the merge.
  var active = { __blocked: {}, __used: {}, __blockedCount: 0, __usedCount: 0, __rows: {}, __usedRows: {} };
  var sh = m13Sheet_(ss, CFG.SH.SRC_SUPP || 'SRC_POS_SUPPLIERS', false);
  if (!sh || sh.getLastRow() < M13.DATA_ROW) return active;

  var headers = m13HeaderMap_(sh, M13.HEADER_ROW);
  var data = sh.getRange(M13.DATA_ROW, 1, sh.getLastRow() - M13.DATA_ROW + 1, Math.max(4, sh.getLastColumn())).getDisplayValues();
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var accno = m13Str_(m13ColVal_(row, headers, ['POS ACCNO', 'ACCNO', 'POS SUPPLIER NUMBER', 'SUPPLIER NUMBER', 'SUPPLIER NO']));
    if (!accno) accno = m13Str_(row[1]); // fallback to col B
    var status = m13Upper_(m13ColVal_(row, headers, ['SRC STATUS', 'STATUS', 'POS STATUS']));
    if (!status) status = m13Upper_(row[3]); // fallback to col D
    if (!accno) continue;

    var rawKey = accno;
    var normKey = m13NormId_(accno);
    active.__rows[normKey] = M13.DATA_ROW + i;
    active.__rows[rawKey] = M13.DATA_ROW + i;

    if (m13IsBlockedSupplierStatus_(status)) {
      active.__blocked[rawKey] = true;
      active.__blocked[normKey] = true;
      active.__blockedCount++;
    } else if (m13IsUsedSupplierStatus_(status)) {
      active.__used[rawKey] = true;
      active.__used[normKey] = true;
      active.__usedCount++;
    }
  }
  return active;
}

function m13IsActiveSupplier_(activeSuppliers, supplierNum) {
  if (!activeSuppliers || !activeSuppliers.__blocked) return true;
  var raw = m13Str_(supplierNum);
  var norm = m13NormId_(raw);
  var ok = !(activeSuppliers.__blocked[raw] || activeSuppliers.__blocked[norm]);
  if (ok && activeSuppliers.__usedRows && activeSuppliers.__rows) {
    var row = activeSuppliers.__rows[raw] || activeSuppliers.__rows[norm];
    if (row) activeSuppliers.__usedRows[row] = true;
  }
  return ok;
}


function m13RowCss_(kind, priceStatus, idx) {
  var n = M13.HEADERS.length;
  var bg = new Array(n);
  var fg = new Array(n);
  var base = (idx % 2 === 0) ? LEGEND.ALT_EVEN : LEGEND.ALT_ODD;
  var text = LEGEND.DATA_FG;
  for (var i = 0; i < n; i++) { bg[i] = base; fg[i] = text; }

  function fillRange_(start, end, colour) {
    for (var c = start; c <= end && c < n; c++) bg[c] = colour;
  }

  if (kind === 'NEW') {
    fillRange_(0, 13, LEGEND.NEW_BG);
    fillRange_(14, 26, LEGEND.NEW_MID || LEGEND.NEW_BG);
    fillRange_(27, n - 1, LEGEND.NEW_AUDIT || LEGEND.NEW_BG);
    for (var a = 0; a < n; a++) fg[a] = LEGEND.FG_NEW || '#145a32';
  } else if (kind === 'REVIEW') {
    fillRange_(0, 13, LEGEND.REVIVE_BG || '#e8daef');
    fillRange_(14, 26, '#faf5ff');
    fillRange_(27, n - 1, '#fdfaff');
    for (var b = 0; b < n; b++) fg[b] = LEGEND.REVIVE_FG || '#6c3483';
  } else if (priceStatus.indexOf('INCREASE') >= 0) {
    fillRange_(0, 13, LEGEND.UP_LEAD);
    fillRange_(14, n - 1, LEGEND.UP_AUDIT);
    for (var d = 0; d < n; d++) fg[d] = LEGEND.FG_UP;
  } else if (priceStatus.indexOf('DECREASE') >= 0) {
    fillRange_(0, 13, LEGEND.DN_LEAD);
    fillRange_(14, n - 1, LEGEND.DN_AUDIT);
    for (var e = 0; e < n; e++) fg[e] = LEGEND.FG_DN;
  }

  // Highlight barcode-update column I if populated later.
  bg[8] = (kind === 'MATCHED' && priceStatus.indexOf('BARCODE') >= 0) ? LEGEND.BC_LEAD : bg[8];
  return { bg: bg, fg: fg };
}

function m13StatusSummary_(sh) {
  var s = { bestBuyMatched: 0, bestBuyNew: 0, notUsed: 0, unmatchable: 0, blank: 0 };
  var lastRow = sh.getLastRow();
  if (lastRow < M13.DATA_ROW) return s;
  var vals = sh.getRange(M13.DATA_ROW, M13.STATUS_COL, lastRow - M13.DATA_ROW + 1, 1).getDisplayValues();
  for (var i = 0; i < vals.length; i++) {
    var st = m13Upper_(vals[i][0]);
    if (!st) s.blank++;
    else if (st.indexOf('BEST BUY') >= 0 && st.indexOf('MATCHED') >= 0) s.bestBuyMatched++;
    else if (st.indexOf('BEST BUY') >= 0 && st.indexOf('NEW') >= 0) s.bestBuyNew++;
    else if (st.indexOf('NOT USED') >= 0) s.notUsed++;
    else if (st.indexOf('UNMATCHABLE') >= 0) s.unmatchable++;
  }
  return s;
}

function m13EffectivePrice_(wsp, discountPrice, discountPct) {
  if (discountPrice && discountPrice > 0) return discountPrice;
  if (wsp && discountPct && discountPct > 0) return +(wsp * (1 - discountPct / 100)).toFixed(4);
  return wsp || 0;
}

function m13GstPct_(v) {
  var s = m13Upper_(v);
  if (!s) return 0;
  if (s === 'Y' || s === 'YES' || s === 'TRUE') return 10;
  if (s === 'N' || s === 'NO' || s === 'FALSE') return 0;
  var n = m13Num_(s);
  if (!n) return 0;
  return n > 1 ? n : n * 100;
}

function m13SupplierLabel_(num, supplierMap, fallbackName) {
  num = m13Str_(num);
  var name = fallbackName || supplierMap[num] || '';
  if (num && name) return name + ' (' + num + ')';
  return name || num || '';
}

function m13PosDesc_(s) {
  // Match desired POS short-description output: keep readable start + end.
  // Keep the ellipsis compact: no spaces before/after "..".
  // Example: MEL FUT .. COMP 90C -> MEL FUT..COMP 90C
  s = m13FixPosDescrCharacters_(s).toUpperCase().replace(/\s+/g, ' ').trim();
  if (s.length <= 19) return s.replace(/\s*\.\.\s*/g, '..');
  var left = s.slice(0, 8).replace(/\s+$/g, '');
  var right = s.slice(-9).replace(/^\s+/g, '');
  return (left + '..' + right)
    .replace(/\s*\.\.\s*/g, '..')
    .replace(/\s+/g, ' ')
    .trim();
}

function m13TranslateBrand_(brand, map) {
  return posKingTranslateBrand_(brand, map);
}

// v6.3.89 BE1: SUP BRAND translation. A supplier brand that is not listed takes the one listed brand it is a
// shortened form of (BLACKMORES PROF → BLACKMORES PROFESSIONAL). POS brands keep m13TranslateBrand_ as before.
function m13BE1TranslateSupplierBrand_(brand, map) {
  var out = m13TranslateBrand_(brand, map);
  if (map && out && !m13BE1IsListed_(brand, map)) {
    var full = m13BE1FullBrandName_(out, map);
    if (full) return full;
  }
  return out;
}

// =============================================================================
//  v6.3.89 BE1 — SHORTENED BRAND NAMES ARE THE SAME BRAND
// =============================================================================
// POS brands are cut to the 20-character POS brand field (BIOCEUTICALS CLINICA) and are sometimes
// shortened by hand (BLACKMORES PROF). Either form is the same brand as the full name, so it must not
// read as a brand change, and the full name's discount / member flag / prefix apply.
//   20  the shorter name is the longer one cut at 20 characters;
//   W   same number of words (2+), every word the same except the last, which the shorter name cuts
//       (3+ letters kept): BLACKMORES PROF = BLACKMORES PROFESSIONAL, BIOCEUTICALS CLIN = … CLINICAL.
// A different word count is a different brand (BLACKMORES ≠ BLACKMORES PROFESSIONAL).
function m13BE1Words_(s) {
  return m13Upper_(s).replace(/^Z{3,}\s*/, '').replace(/[^A-Z0-9]+/g, ' ').trim().split(' ').filter(function(w) { return !!w; });
}

function m13BE1BrandsEquivalent_(a, b) {
  return m13BE1WordsEquivalent_(m13BE1Words_(a), m13BE1Words_(b), a, b);
}

function m13BE1WordsEquivalent_(wa, wb, rawA, rawB) {
  if (!wa.length || !wb.length) return false;
  var sa = wa.join(' '), sb = wb.join(' ');
  if (sa === sb || sa.replace(/ /g, '') === sb.replace(/ /g, '')) return true;
  var aShort = sa.length <= sb.length;
  var ws = aShort ? wa : wb, wl = aShort ? wb : wa;
  var s = aShort ? sa : sb, l = aShort ? sb : sa, rawL = aShort ? rawB : rawA;
  var width = M13.DS1_POS_BRAND_WIDTH || 20;
  if (l.length > width && s.length >= width - 1) {
    if (s === l.slice(0, width).trim()) return true;
    if (s === m13BE1Words_(m13Upper_(rawL).replace(/^Z{3,}\s*/, '').slice(0, width)).join(' ')) return true;
  }
  var n = ws.length;
  if (n < 2 || n !== wl.length) return false;
  for (var i = 0; i < n - 1; i++) if (ws[i] !== wl[i]) return false;
  var cut = ws[n - 1], full = wl[n - 1];
  return cut.length >= 3 && cut.length < full.length && full.indexOf(cut) === 0;
}

// Listed = SRC_POS_BRAND_NAME_CHANGES has it (any form posKingTranslateBrand_ looks up), or it is a
// brand named in SRC_POS_ONGOING_DISCOUNTS. A listed brand is never re-mapped by BE1.
function m13BE1IsListed_(brand, map) {
  var raw = posKingSafe_(brand);
  if (!raw || !map) return true;
  var keys = [posKingUpper_(raw), posKingNormBrand_(raw), posKingUpper_(raw).slice(0, 20), posKingNormBrand_(raw).slice(0, 20)];
  for (var i = 0; i < keys.length; i++) if (keys[i] && map[keys[i]]) return true;
  return !!(map.__be1 && map.__be1.listed[m13NormBrand_(raw)]);
}

function m13BE1State_(map) {
  if (!map.__be1) map.__be1 = { names: null, extra: [], listed: {}, cache: {} };
  var be = map.__be1;
  if (!be.names) {
    be.names = [];
    (map.__rows || []).forEach(function(r) {
      if (!r || !r.posBrand) return;
      if (r.supBrand) be.names.push({ name: r.supBrand, to: r.posBrand, words: m13BE1Words_(r.supBrand) });
      be.names.push({ name: r.posBrand, to: r.posBrand, words: m13BE1Words_(r.posBrand) });
    });
  }
  return be;
}

// Extra full brand names (SRC_POS_ONGOING_DISCOUNTS POS MASTER BRAND) a shortened brand can take.
function m13BE1RegisterNames_(map, names) {
  if (!map) return;
  var be = m13BE1State_(map);
  (names || []).forEach(function(n) {
    n = m13Str_(n);
    if (!n) return;
    var k = m13NormBrand_(n);
    if (!k || be.listed[k]) return;
    be.listed[k] = true;
    be.extra.push({ name: n, to: n, words: m13BE1Words_(n) });
  });
  be.cache = {};
}

// The one listed brand `brand` is a shortened form of, or '' (none, or more than one).
function m13BE1FullBrandName_(brand, map) {
  var key = m13Upper_(brand);
  if (!key || !map) return '';
  var be = m13BE1State_(map);
  if (Object.prototype.hasOwnProperty.call(be.cache, key)) return be.cache[key];
  var words = m13BE1Words_(key), list = be.names.concat(be.extra), hit = '', hitKey = '';
  for (var i = 0; i < list.length; i++) {
    var c = list[i];
    if (!c.to || m13Upper_(c.name).length <= key.length) continue;   // only a longer listed name is the full form
    if (!m13BE1WordsEquivalent_(words, c.words, key, c.name)) continue;
    var toKey = m13NormBrand_(c.to);
    if (hit && toKey !== hitKey) { hit = ''; break; }                   // short for two brands: leave it alone
    hit = c.to; hitKey = toKey;
  }
  be.cache[key] = hit;
  return hit;
}

function m13Barcode_(raw) {
  return posKingBarcodeObject_(raw);
}

function m13HeaderMap_(sh, rowNum) {
  var lastCol = sh.getLastColumn();
  var vals = sh.getRange(rowNum || M13.HEADER_ROW, 1, 1, lastCol).getDisplayValues()[0];
  var map = {};
  for (var i = 0; i < vals.length; i++) {
    var h = m13Upper_(vals[i]);
    if (h) map[h] = i;
  }
  return map;
}

function m13ColVal_(row, map, candidates) {
  for (var i = 0; i < candidates.length; i++) {
    var idx = map[m13Upper_(candidates[i])];
    if (idx != null && idx >= 0 && idx < row.length) {
      var v = row[idx];
      if (v !== '' && v != null) return v;
    }
  }
  return '';
}

function m13Sheet_(ss, name, required) {
  var sh = ss.getSheetByName(name);
  if (!sh && required) throw new Error('Missing required sheet: ' + name);
  return sh;
}

function m13Str_(v) { return String(v == null ? '' : v).trim(); }

function m13Upper_(v) { return m13Str_(v).toUpperCase(); }

function m13FixPosDescrCharacters_(s) {
  // Character safety only: convert corrupted/Unicode punctuation to POS-safe ASCII.
  // Important: normal ASCII hyphens '-' are preserved, not removed.
  // POS description character safety gate.
  // Fixes common UTF-8/Windows mojibake such as "â€“" / "â€”" before writing
  // OUT_MERGED_DATA column P or exporting AP:AU fields. Normal ASCII hyphens
  // are preserved; Unicode dash variants are converted to a normal hyphen.
  var out = m13Str_(s);
  if (!out) return '';

  out = out
    .replace(/\u00C2/g, '')                         // stray Â from UTF-8 mojibake
    .replace(/\u00E2\u20AC[\u201C\u201D]/g, '-')      // â€“ / â€”
    .replace(/\u00E2\u20AC[\u02DC\u2122]/g, "'")     // â€˜ / â€™
    .replace(/\u00E2\u20AC[\u0152\u0153\u009C\u009D]/g, '"') // â€œ / â€
    .replace(/\u00E2\u20AC\u00A6/g, '...')          // â€¦
    .replace(/\u00E2\u20AC\u00A2/g, ' ')            // â€¢
    .replace(/\u00E2\u201E\u00A2/g, '')             // â„¢
    .replace(/\u00C3\u2014/g, 'X')                  // Ã—
    .replace(/\u00E2\u20AC(?=\s|$)/g, '-')          // partial â€ at word end
    .replace(/\u00E2\u20AC/g, '-')                  // remaining partial â€ sequences
    .replace(/[\u2010-\u2015\u2212]/g, '-')          // Unicode hyphen/en dash/em dash/minus
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")       // curly apostrophes
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')       // curly quotes
    .replace(/\u2026/g, '...')
    .replace(/\u00D7/g, 'X')
    .replace(/[\u2122\u00AE\u00A9]/g, '')
    .replace(/[\u00A0\u2007\u202F]/g, ' ')
    .replace(/[\x00-\x1F\x7F]/g, ' ');

  // Final POS-safe character pass: keep ordinary printable ASCII only. This
  // preserves allowed characters such as hyphen, slash, plus, ampersand,
  // brackets and full stops while removing hidden/corrupt characters.
  out = out.replace(/[^\x20-\x7E]/g, ' ');
  return out.replace(/\s+/g, ' ').trim();
}

function m13Num_(v) { var n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; }

function m13Pct_(v) { var n = m13Num_(v); if (n > 0 && n <= 1) n = n * 100; return n > 0 ? n : 0; }

function m13NormBrand_(s) { return m13Upper_(s).replace(/^Z+\s*/,'').replace(/[^A-Z0-9]/g,'').slice(0, 24); }

function m13CleanDiscontinuedBrand_(s) {
  // Display/output cleanup only. Some POS discontinued brands carry ZZZ/ZZZZ
  // prefixes such as ZZZATP SCIENCE or ZZZZ ATP SCIENCE. Strip only 3+ leading
  // Z markers so real brands beginning with a single Z are not damaged.
  var out = m13Str_(s);
  if (!out) return '';
  out = out.replace(/^\s*(?:Z{3,}\s*)+/i, '');
  out = out.replace(/^\s*DISCONTINUED\s+/i, '');
  return out.replace(/\s+/g, ' ').trim();
}

function m13NormText_(s) { return m13Upper_(s).replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim(); }

function m13EscReg_(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function m13Fmt_(n) { try { return Number(n || 0).toLocaleString(); } catch(e) { return String(n || 0); } }

function m13TrimNote_(s) { s = m13Str_(s); return s.length > 48000 ? s.slice(0, 48000) : s; }

// =============================================================================
// DICE COEFFICIENT & SCORING FUNCTIONS (ADD THESE)
// =============================================================================

function m13Dice_(a, b) {
  a = m13NormText_(a);
  b = m13NormText_(b);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  var m = {}, i;
  for (i = 0; i < a.length - 1; i++) {
    var bigram = a.slice(i, i + 2);
    m[bigram] = (m[bigram] || 0) + 1;
  }
  var inter = 0, total = a.length - 1 + b.length - 1;
  for (i = 0; i < b.length - 1; i++) {
    var bg = b.slice(i, i + 2);
    if (m[bg]) {
      inter++;
      m[bg]--;
    }
  }
  return (2 * inter) / total;
}

function m13ScoreSupplierVsPos_(sup, pos) {
  var score = 0;
  if (!sup || !pos) return score;
  
  // BRAND match (20 points)
  var supBrandNorm = m13NormBrand_(sup.translatedBrand || sup.rawBrand || '');
  var posBrandNorm = m13NormBrand_(pos.translatedBrand || pos.brand || '');
  if (supBrandNorm && posBrandNorm && (supBrandNorm === posBrandNorm ||
      m13BE1BrandsEquivalent_(sup.translatedBrand || sup.rawBrand, pos.translatedBrand || pos.brand))) score += 20; // v6.3.89 BE1
  
  // SUB-ID match (45 points - highest weight)
  var supSubIdNorm = m13SubIdCompareKey_(sup.subId || '');
  var posSubIdNorm = m13SubIdCompareKey_(pos.subId || '');
  if (supSubIdNorm && posSubIdNorm && supSubIdNorm === posSubIdNorm) score += 45;
  
  // SUPPLIER NUMBER match (15 points)
  var supSupplierNorm = m13NormId_(sup.supplierNum || '');
  var posSupplierNorm = m13NormId_(pos.supplier || '');
  if (supSupplierNorm && posSupplierNorm && supSupplierNorm === posSupplierNorm) score += 15;
  
  // PRODUCT TEXT similarity (up to 18 points)
  var supDescrNorm = m13NormText_(sup.cleanProduct || sup.product || '');
  var posDescrNorm = m13NormText_(pos.cleanDescr || pos.descr || '');
  var dice = m13Dice_(supDescrNorm, posDescrNorm);
  if (dice >= 0.92) score += 18;
  else if (dice >= 0.82) score += 12;
  else if (dice >= 0.68) score += 6;
  
  // WSP price proximity (up to 8 points)
  var supWsp = Number(sup.wsp || 0);
  var posWsp = Number(pos.wsp || 0);
  if (supWsp > 0 && posWsp > 0) {
    var diff = Math.abs(supWsp - posWsp);
    if (diff <= 0.25) score += 8;
    else if (diff <= 2) score += 4;
  }
  
  return score;
}

// =============================================================================


function buildOutMergedDataFromSupplierStatus() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var t0 = Date.now();
  var fm1Stage = t0;
  var fm1Timing = { status: 0, src: 0, tmp: 0, supplier: 0, merge: 0, srcStatus: 0, write: 0 };

  var shSup = m13Sheet_(ss, CFG.SH.IN_SUP || 'IN_SUPPLIER_/_PRODUCT_UPDATES', true);
  var shTmp = m13Sheet_(ss, CFG.SH.TMP_MERGED || 'TMP_MERGED_POS_DATA', true);

  if (!shSup || !shTmp) return;
  if (shSup.getLastRow() < M13.DATA_ROW) { ui.alert('No supplier data found.'); return; }
  if (shTmp.getLastRow() < M13.DATA_ROW) { ui.alert('No TMP POS data found.'); return; }

  try {
    ss.toast('Checking supplier STATUS column P…', '🧱 OUT_MERGED_DATA', 30);
    try { if (typeof ensureSupplierSheetSchema_ === 'function') ensureSupplierSheetSchema_(shSup); } catch(eSchema) {}

    var statusSummary = m13StatusSummary_(shSup);
    var usableStatusCount = statusSummary.bestBuyMatched + statusSummary.bestBuyNew + statusSummary.unmatchable;

    // Clean-menu workflow: BUILD OUT_MERGED_DATA can be run first.
    // If supplier STATUS column P is blank/not yet generated, run the highlight
    // step automatically, then continue the OUT build using the fresh statuses.
    if (usableStatusCount === 0 && statusSummary.notUsed === 0) {
      if (typeof runHighlightNewProductsBestBuy !== 'function') {
        ui.alert(
          'Supplier highlight function is missing',
          'Column P has no usable STATUS data, and runHighlightNewProductsBestBuy() was not found. Please make sure the 1.2 Highlight file is saved in this Apps Script project.',
          ui.ButtonSet.OK
        );
        return;
      }

      ss.toast('No supplier STATUS found — running Highlight New Products first…', '🪄 Auto Highlight', 60);
      runHighlightNewProductsBestBuy();
      SpreadsheetApp.flush();

      // Re-read the same supplier sheet after highlight has written column P.
      shSup = m13Sheet_(ss, CFG.SH.IN_SUP || 'IN_SUPPLIER_/_PRODUCT_UPDATES', true);
      statusSummary = m13StatusSummary_(shSup);
      usableStatusCount = statusSummary.bestBuyMatched + statusSummary.bestBuyNew + statusSummary.unmatchable;
    }

    if (usableStatusCount === 0) {
      ui.alert(
        'No usable supplier STATUS values found',
        'Column P exists but contains no BEST BUY / NEW / UNMATCHABLE rows after checking. Run Highlight New Products and review the supplier upload/status results.',
        ui.ButtonSet.OK
      );
      return;
    }
    fm1Timing.status = Date.now() - fm1Stage;
    fm1Stage = Date.now();

    ss.toast('Loading local SRC reference tables…', '🧱 OUT_MERGED_DATA', 30);
    var brandMap = m13LoadBrandMap_(ss);                       // SRC_POS_BRAND_NAME_CHANGES
    var supplierMap = m13LoadSupplierMap_(ss);                 // SRC_POS_SUPPLIERS name lookup
    var activeSuppliers = m13LoadActiveSuppliers_(ss);         // SRC_POS_SUPPLIERS explicit block/exclude only
    var findReplaceRules = m13LoadFindReplaceRules_(ss);       // SRC_POS_FIND_REPLACE
    var prefixMap = m13LoadPrefixMap_(ss);                     // SRC_POS_PRODUCT_PREFIX prefix + member flag
    var discountRules = m13LoadDiscountRules_(ss, brandMap);   // SRC_POS_ONGOING_DISCOUNTS priority rules
    fm1Timing.src = Date.now() - fm1Stage;
    fm1Stage = Date.now();

    ss.toast('Indexing TMP POS rows once…', '🧱 OUT_MERGED_DATA', 60);
    var posBundle = m13BuildPosBundle_(shTmp, brandMap, findReplaceRules);
    fm1Timing.tmp = Date.now() - fm1Stage;
    fm1Stage = Date.now();

    ss.toast('Reading supplier rows + STATUS…', '🧱 OUT_MERGED_DATA', 60);
    var supLastRow = shSup.getLastRow();
    var supLastCol = Math.max(shSup.getLastColumn(), M13.STATUS_COL);
    var supHeaders = m13HeaderMap_(shSup, M13.HEADER_ROW);
    var supData = shSup.getRange(M13.DATA_ROW, 1, supLastRow - M13.DATA_ROW + 1, supLastCol).getDisplayValues();
    var supNotes = shSup.getRange(M13.DATA_ROW, M13.STATUS_COL, supData.length, 1).getNotes();
    fm1Timing.supplier = Date.now() - fm1Stage;
    fm1Stage = Date.now();

    ss.toast('Building OUT_MERGED_DATA rows…', '🧱 OUT_MERGED_DATA', 90);
    var built = m13BuildRows_(supData, supNotes, supHeaders, posBundle, brandMap, supplierMap, activeSuppliers, discountRules, findReplaceRules, prefixMap);
    fm1Timing.merge = Date.now() - fm1Stage;
    fm1Stage = Date.now();

    ss.toast('Updating SRC usage status columns…', '🧱 OUT_MERGED_DATA', 30);
    try {
      m13StampSrcStatuses_(ss, {
        brandMap: brandMap,
        supplierMap: supplierMap,
        activeSuppliers: activeSuppliers,
        findReplaceRules: findReplaceRules,
        prefixMap: prefixMap,
        discountRules: discountRules,
        posBundle: posBundle,
        built: built,
        supData: supData,
        supHeaders: supHeaders
      });
    } catch(eSrcStatus) {
      try { log_('[SRC STATUS] ' + eSrcStatus.message); } catch(_eLog) {}
    }
    fm1Timing.srcStatus = Date.now() - fm1Stage;
    fm1Stage = Date.now();

    ss.toast('Writing OUT_MERGED_DATA…', '🧱 OUT_MERGED_DATA', 90);
    var shOut = m13PrepareOutSheet_(ss, built.rows.length, { deferBodyPreformat: built.rows.length > 0 });
    m13WriteOut_(shOut, built.rows);
    fm1Timing.write = Date.now() - fm1Stage;

    var elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    var msg = 'OUT_MERGED_DATA built: ' + m13Fmt_(built.rows.length) +
      ' rows | Matched: ' + m13Fmt_(built.counts.matched) +
      ' | New: ' + m13Fmt_(built.counts.newRows) +
      ' | Review: ' + m13Fmt_(built.counts.review) +
      ' | Discontinued: ' + m13DS1DiscontinuedText_(built.counts) +
      ' | Skipped NOT USED: ' + m13Fmt_(built.counts.skippedNotUsed) +
      ' | ' + elapsed + 's';
    var timingMsg = 'Timing — STATUS ' + m13FM1Sec_(fm1Timing.status) +
      ' | SRC ' + m13FM1Sec_(fm1Timing.src) +
      ' | TMP ' + m13FM1Sec_(fm1Timing.tmp) +
      ' | Supplier ' + m13FM1Sec_(fm1Timing.supplier) +
      ' | Merge ' + m13FM1Sec_(fm1Timing.merge) +
      ' | SRC status ' + m13FM1Sec_(fm1Timing.srcStatus) +
      ' | Write ' + m13FM1Sec_(fm1Timing.write);

    try { shOut.getRange(1, M13.HEADERS.length).setValue(msg); } catch(eMsg) {}
    ss.setActiveSheet(shOut);
    ss.toast(msg, '✅ Merge build complete', 15);
    ui.alert('✅ OUT_MERGED_DATA built', msg + '\n\n' + timingMsg, ui.ButtonSet.OK);
  } catch (err) {
    ss.toast('OUT_MERGED_DATA build failed: ' + err.message, '❌ Error', 10);
    throw err;
  }
}


// =============================================================================
//  FILTERED-BRAND OUT BUILD — v6.3.79 EARLY SCOPE + DIRECT TMP SELECTOR
// =============================================================================
// Public menu entry. This is not a second merge engine: it establishes the
// selected Column-E brand scope first, reads only scoped supplier/TMP row bodies,
// then calls the same m13BuildPosBundle_ + m13BuildRows_ engines used above.
function buildOutMergedDataFromFilteredBrands() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var t0 = Date.now();
  var timing = {};
  var stageStart = t0;

  var shSup = m13Sheet_(ss, CFG.SH.IN_SUP || 'IN_SUPPLIER_/_PRODUCT_UPDATES', true);
  var shTmp = m13Sheet_(ss, CFG.SH.TMP_MERGED || 'TMP_MERGED_POS_DATA', true);

  if (!shSup || !shTmp) return;
  if (shSup.getLastRow() < M13.DATA_ROW) { ui.alert('No supplier data found.'); return; }
  if (shTmp.getLastRow() < M13.DATA_ROW) { ui.alert('No TMP POS data found.'); return; }

  try {
    ss.toast('Checking supplier STATUS freshness…', '🎯 Filtered Brand Merge', 30);
    try { if (typeof ensureSupplierSheetSchema_ === 'function') ensureSupplierSheetSchema_(shSup); } catch (eSchema) {}

    var statusSummary = m13StatusSummary_(shSup);
    var usableStatusCount = statusSummary.bestBuyMatched + statusSummary.bestBuyNew + statusSummary.unmatchable;
    var statusFresh = usableStatusCount > 0;
    if (typeof setupIsSupplierStatusFingerprintCurrent_ === 'function') {
      try { statusFresh = setupIsSupplierStatusFingerprintCurrent_(); } catch (_statusFpCheck) { statusFresh = false; }
    }

    // Highlight remains the single STATUS/best-buy engine. Run it only when the
    // shared freshness fingerprint says the source inputs changed, or STATUS is absent.
    if (!statusFresh || (usableStatusCount === 0 && statusSummary.notUsed === 0)) {
      if (typeof runHighlightNewProductsBestBuy !== 'function') {
        ui.alert(
          'Supplier highlight function is missing',
          'Supplier STATUS is missing/stale, and runHighlightNewProductsBestBuy() was not found. Please make sure the 1.2 Highlight file is saved in this Apps Script project.',
          ui.ButtonSet.OK
        );
        return;
      }

      ss.toast('Supplier STATUS is missing/stale — running Highlight New Products first…', '🪄 Auto Highlight', 60);
      runHighlightNewProductsBestBuy();
      SpreadsheetApp.flush();

      shSup = m13Sheet_(ss, CFG.SH.IN_SUP || 'IN_SUPPLIER_/_PRODUCT_UPDATES', true);
      statusSummary = m13StatusSummary_(shSup);
      usableStatusCount = statusSummary.bestBuyMatched + statusSummary.bestBuyNew + statusSummary.unmatchable;
    }

    if (usableStatusCount === 0) {
      ui.alert(
        'No usable supplier STATUS values found',
        'Column P contains no BEST BUY / NEW / UNMATCHABLE rows after freshness validation. Review the supplier Highlight results before running the filtered-brand build.',
        ui.ButtonSet.OK
      );
      return;
    }
    timing.status = Date.now() - stageStart;
    stageStart = Date.now();

    // EARLY SCOPE: brand-map translation remains the only reference data loaded
    // before resolving the current Column-E brand scope. The FB2 fast path reads
    // the existing value-filter criteria directly; unusual/custom filters fall
    // back to the v6.3.77 visibility helper so behaviour is not simplified.
    var brandMap = m13LoadBrandMap_(ss);
    ss.toast('Resolving visible SUP BRAND values from Column E…', '🎯 Filtered Brand Merge', 30);
    var brandScope = m13FB2ResolveVisibleSupplierBrandScope_(shSup, brandMap);
    if (!brandScope.labels.length) {
      ui.alert(
        'No visible supplier brands found',
        'Filter IN_SUPPLIER_/_PRODUCT_UPDATES Column E — SUP BRAND so the required brand or brands are visible, then run the filtered-brand build again.',
        ui.ButtonSet.OK
      );
      return;
    }

    ss.toast('Scope: ' + brandScope.labels.join(', '), '🎯 Filtered Brand Merge', 30);

    // Read only selected supplier brand rows. Fragmented selected rows are folded
    // into bounded read windows; unrelated rows inside a window are rejected by
    // preselected sheet-row membership before any supplier object is created.
    var supplierSource = m13ReadScopedSupplierSource_(shSup, brandScope, brandMap);
    var supplierIdentity = m13CollectScopedSupplierIdentity_(supplierSource.data, supplierSource.headers);
    timing.scope = Date.now() - stageStart;
    stageStart = Date.now();

    ss.toast('Loading local SRC reference tables for selected brands…', '🎯 Filtered Brand Merge', 30);
    var supplierMap = m13LoadSupplierMap_(ss);
    var activeSuppliers = m13LoadActiveSuppliers_(ss);
    var findReplaceRules = m13LoadFindReplaceRules_(ss);
    var prefixMap = m13LoadPrefixMap_(ss);
    var discountRules = m13LoadDiscountRules_(ss, brandMap);
    timing.references = Date.now() - stageStart;
    stageStart = Date.now();

    // FB3 direct selector: search only the TMP identity columns needed to locate
    // candidate brand/barcode/sub-ID rows. Candidate hits are exact-verified with
    // the same scope predicates before full TMP row bodies or POS objects exist.
    // This removes the FB2 scratch FILTER/TEXTJOIN formula + forced flush cost.
    ss.toast('Resolving scoped TMP/POS sheet rows…', '🎯 Filtered Brand Merge', 60);
    var tmpSource = m13FB3ReadScopedTmpSource_(shTmp, brandScope, brandMap, supplierIdentity);

    ss.toast('Building scoped TMP barcode indexes…', '🎯 Filtered Brand Merge', 60);
    var posBundle = m13BuildPosBundle_(shTmp, brandMap, findReplaceRules, tmpSource);

    // v6.3.88 DS1: the selected brands may have other POS names (20-character POS form, or POS brands
    // their barcodes match). Read those TMP rows too so their unmatched products can be discontinued.
    var ds1Scope = m13DS1ExtendFilteredScope_(supplierSource, posBundle, brandMap, brandScope);
    if (ds1Scope) {
      ss.toast('Adding ' + ds1Scope.ds1Added + ' linked POS brand name(s) to the TMP scope…', '🎯 Filtered Brand Merge', 60);
      tmpSource = m13FB3ReadScopedTmpSource_(shTmp, ds1Scope, brandMap, supplierIdentity);
      posBundle = m13BuildPosBundle_(shTmp, brandMap, findReplaceRules, tmpSource);
    }
    timing.tmp = Date.now() - stageStart;
    stageStart = Date.now();

    ss.toast('Building selected-brand OUT_MERGED_DATA rows…', '🎯 Filtered Brand Merge', 90);
    var built = m13BuildRows_(
      supplierSource.data,
      supplierSource.notes,
      supplierSource.headers,
      posBundle,
      brandMap,
      supplierMap,
      activeSuppliers,
      discountRules,
      findReplaceRules,
      prefixMap,
      { supplierSheetRows: supplierSource.sheetRows }
    );
    timing.merge = Date.now() - stageStart;
    stageStart = Date.now();

    // Deliberately do not globally re-stamp SRC usage columns from a partial brand
    // build. The normal full build retains its existing complete SRC status pass.

    ss.toast('Writing OUT_MERGED_DATA…', '🎯 Filtered Brand Merge', 90);
    var shOut = m13FB4PrepareOutSheet_(ss, built.rows.length);
    m13WriteOut_(shOut, built.rows);
    timing.write = Date.now() - stageStart;

    var elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    var msg = 'OUT_MERGED_DATA built: ' + m13Fmt_(built.rows.length) +
      ' rows | Filtered brands: ' + brandScope.labels.join(', ') +
      ' | Matched: ' + m13Fmt_(built.counts.matched) +
      ' | New: ' + m13Fmt_(built.counts.newRows) +
      ' | Review: ' + m13Fmt_(built.counts.review) +
      ' | Discontinued: ' + m13DS1DiscontinuedText_(built.counts) +
      ' | Skipped NOT USED: ' + m13Fmt_(built.counts.skippedNotUsed) +
      ' | ' + elapsed + 's';

    var timingMsg = m13FB3TimingSummary_(timing, tmpSource && tmpSource.stats);
    try { shOut.getRange(1, M13.HEADERS.length).setValue(msg).setNote(timingMsg); } catch (eMsg) {}
    ss.setActiveSheet(shOut);
    ss.toast(msg, '✅ Filtered brand merge complete', 15);
    ui.alert('✅ OUT_MERGED_DATA built — filtered brands', msg + '\n\n' + timingMsg, ui.ButtonSet.OK);
    return built;
  } catch (err) {
    ss.toast('Filtered-brand OUT build failed: ' + err.message, '❌ Error', 10);
    throw err;
  }
}


// =============================================================================
//  FILTERED-BRAND SCOPE V3 — m13FB3 DIRECT TMP SELECTOR HELPERS
// =============================================================================
// These helpers are filtered-build only. They locate a conservative candidate
// set with server-side TextFinder searches, then exact-verify every candidate
// using the same scope predicates as the v6.3.77 narrow selector. Only verified
// sheet rows are passed to the existing bounded full-row reader and shared merge
// engine. No matching, pricing, description, review or POS safety rule is copied.

function m13FB3RegexEscape_(value) {
  return String(value == null ? '' : value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function m13FB3LooseAlnumPattern_(key, alphaNumericClass) {
  key = m13Upper_(key).replace(/[^A-Z0-9]/g, '');
  if (!key) return '';
  var chars = key.split('');
  var gap = alphaNumericClass === 'DIGIT' ? '[^0-9]*' : '[^A-Z0-9]*';
  return chars.join(gap);
}

function m13FB3BuildBrandAlternatives_(brandScope, brandMap) {
  var keys = {};
  var rawAliases = {};

  function addKey_(value) {
    var norm = m13Upper_(value).replace(/^Z+\s*/, '').replace(/[^A-Z0-9]/g, '');
    if (!norm) return;
    var k24 = norm.slice(0, 24);
    if (k24) keys[k24] = true;
    if (norm.length >= 20) keys[norm.slice(0, 20)] = true;
  }

  function addRawAlias_(value) {
    var raw = m13Str_(value);
    if (!raw) return;
    rawAliases[m13FB3RegexEscape_(raw)] = true;
    // posKingTranslateBrand_ also recognises the first 20 raw characters.
    // Search that same raw-prefix form and exact-verify the returned rows.
    if (raw.length >= 20) rawAliases[m13FB3RegexEscape_(raw.slice(0, 20)) + '.*'] = true;
  }

  Object.keys((brandScope && brandScope.keys) || {}).forEach(addKey_);
  var labels = (brandScope && brandScope.labels) || [];
  for (var l = 0; l < labels.length; l++) addRawAlias_(labels[l]);

  var supplierBrands = (brandScope && brandScope.allBrandValues) || [];
  for (var s = 0; s < supplierBrands.length; s++) {
    var supplierBrand = supplierBrands[s] && supplierBrands[s][0];
    if (m13BrandInScope_(supplierBrand, brandMap, brandScope)) addRawAlias_(supplierBrand);
  }

  var mapRows = (brandMap && brandMap.__rows) || [];
  for (var i = 0; i < mapRows.length; i++) {
    var row = mapRows[i] || {};
    var touchesScope = m13BrandInScope_(row.supBrand, brandMap, brandScope) ||
      m13BrandInScope_(row.posBrand, brandMap, brandScope);
    if (!touchesScope) continue;
    addKey_(row.supBrand);
    addKey_(row.posBrand);
    addRawAlias_(row.supBrand);
    addRawAlias_(row.posBrand);
  }

  var alternatives = Object.keys(rawAliases);
  Object.keys(keys).sort(function(a, b) { return b.length - a.length || a.localeCompare(b); }).forEach(function(key) {
    var seq = m13FB3LooseAlnumPattern_(key, 'ALNUM');
    if (!seq) return;
    // m13NormBrand_ removes leading Z markers. Keys of 20/24 chars can also
    // represent a truncated POS brand/map key, so allow a tail and exact-verify.
    var tail = key.length >= 20 ? '.*' : '[^A-Z0-9]*';
    alternatives.push('Z*[^A-Z0-9]*' + seq + tail);
  });
  return alternatives;
}

function m13FB3BuildBarcodeAlternatives_(supplierIdentity) {
  var alternatives = {};
  var barcodeKeys = Object.keys((supplierIdentity && supplierIdentity.barcodeKeys) || {});

  for (var i = 0; i < barcodeKeys.length; i++) {
    var key = m13Str_(barcodeKeys[i]);
    if (!key) continue;

    if (/^\d+$/.test(key)) {
      var seq = m13FB3LooseAlnumPattern_(key, 'DIGIT');
      if (!seq) continue;
      var exactBody = '[^0-9]*' + seq + '([^0-9]*[.]0+)?[^0-9]*';
      alternatives[exactBody] = true;

      // posKing barcode normalisation drops the first digit from a 14-digit GTIN.
      // A supplier 13-digit canonical key can therefore intersect a TMP 14-digit
      // raw value with any leading digit. Add that conservative candidate form;
      // m13ScopeBarcodeIntersects_ performs the exact acceptance test afterwards.
      if (key.length === 13) {
        alternatives['[^0-9]*[0-9][^0-9]*' + seq + '([^0-9]*[.]0+)?[^0-9]*'] = true;
      }
    } else {
      alternatives[m13FB3RegexEscape_(key)] = true;
    }
  }

  return Object.keys(alternatives);
}

function m13FB3BuildSubIdAlternatives_(supplierIdentity) {
  var subIds = {};
  var identityKeys = Object.keys((supplierIdentity && supplierIdentity.identityKeys) || {});
  for (var i = 0; i < identityKeys.length; i++) {
    var pipe = identityKeys[i].indexOf('|');
    if (pipe < 0) continue;
    var subId = identityKeys[i].slice(pipe + 1);
    if (subId) subIds[subId] = true;
  }

  var alternatives = [];
  Object.keys(subIds).sort(function(a, b) { return b.length - a.length || a.localeCompare(b); }).forEach(function(subId) {
    var seq = m13FB3LooseAlnumPattern_(subId, 'ALNUM');
    if (seq) alternatives.push('[^A-Z0-9]*' + seq + '[^A-Z0-9]*');
  });
  return alternatives;
}

function m13FB3ChunkAlternatives_(alternatives, maxPatternChars) {
  alternatives = alternatives || [];
  maxPatternChars = Math.max(1000, Number(maxPatternChars || 7000));
  var chunks = [];
  var chunk = [];
  var chars = 0;

  for (var i = 0; i < alternatives.length; i++) {
    var alt = m13Str_(alternatives[i]);
    if (!alt) continue;
    var add = alt.length + (chunk.length ? 1 : 0);
    if (chunk.length && chars + add > maxPatternChars) {
      chunks.push(chunk);
      chunk = [];
      chars = 0;
    }
    chunk.push(alt);
    chars += add;
  }
  if (chunk.length) chunks.push(chunk);
  return chunks;
}

function m13FB3FindRowsByAlternatives_(range, alternatives) {
  var chunks = m13FB3ChunkAlternatives_(alternatives, 7000);
  var rows = {};
  var calls = 0;
  var rawHits = 0;

  for (var i = 0; i < chunks.length; i++) {
    var pattern = '^(' + chunks[i].join('|') + ')$';
    var finder = range.createTextFinder(pattern)
      .useRegularExpression(true)
      .matchCase(false)
      .matchEntireCell(true)
      .matchFormulaText(false);
    var hits = finder.findAll() || [];
    calls++;
    rawHits += hits.length;
    for (var h = 0; h < hits.length; h++) rows[hits[h].getRow()] = true;
  }

  return { rows: rows, calls: calls, rawHits: rawHits };
}

function m13FB3ResolveTmpCandidateRows_(shTmp, brandScope, brandMap, supplierIdentity) {
  var lastRow = shTmp.getLastRow();
  var nRows = lastRow - M13.DATA_ROW + 1;
  var headers = m13HeaderMap_(shTmp, M13.HEADER_ROW);
  var brandCol = m13HeaderColumn_(headers, ['POS MASTER BRAND', 'POS BRAND', 'BRAND']);
  var barcodeCol = m13HeaderColumn_(headers, ['POS MAIN ID', 'MAIN ID', 'MAIN_ID', 'POS MASTER BARCODE', 'MASTER BARCODE', 'BARCODE']);
  var subIdCol = m13HeaderColumn_(headers, ['POS SUB ID', 'SUB ID', 'SUB_ID']);

  if (!brandCol) throw new Error('TMP/POS brand column could not be resolved.');
  if (!barcodeCol) throw new Error('TMP/POS barcode column could not be resolved.');

  var union = {};
  var brandSearch = m13FB3FindRowsByAlternatives_(
    shTmp.getRange(M13.DATA_ROW, brandCol, nRows, 1),
    m13FB3BuildBrandAlternatives_(brandScope, brandMap)
  );
  Object.keys(brandSearch.rows).forEach(function(row) { union[row] = true; });

  var barcodeSearch = m13FB3FindRowsByAlternatives_(
    shTmp.getRange(M13.DATA_ROW, barcodeCol, nRows, 1),
    m13FB3BuildBarcodeAlternatives_(supplierIdentity)
  );
  Object.keys(barcodeSearch.rows).forEach(function(row) { union[row] = true; });

  var subIdSearch = { rows: {}, calls: 0, rawHits: 0 };
  if (subIdCol && Object.keys((supplierIdentity && supplierIdentity.identityKeys) || {}).length) {
    subIdSearch = m13FB3FindRowsByAlternatives_(
      shTmp.getRange(M13.DATA_ROW, subIdCol, nRows, 1),
      m13FB3BuildSubIdAlternatives_(supplierIdentity)
    );
    Object.keys(subIdSearch.rows).forEach(function(row) { union[row] = true; });
  }

  var sheetRows = Object.keys(union).map(Number).filter(function(row) {
    return isFinite(row) && row >= M13.DATA_ROW && row <= lastRow;
  }).sort(function(a, b) { return a - b; });

  return {
    sheetRows: sheetRows,
    method: 'FB3_TEXTFINDER_EXACT_VERIFY',
    totalTmpRows: nRows,
    textFinderCalls: brandSearch.calls + barcodeSearch.calls + subIdSearch.calls,
    brandHits: brandSearch.rawHits,
    barcodeHits: barcodeSearch.rawHits,
    subIdHits: subIdSearch.rawHits
  };
}

function m13FB3VerifyTmpCandidateRows_(shTmp, candidateRows, brandScope, brandMap, supplierIdentity) {
  candidateRows = m13UniqueSortedRows_(candidateRows || []);
  var out = { sheetRows: [], windowCount: 0, windowRows: 0 };
  if (!candidateRows.length) return out;

  var headers = m13HeaderMap_(shTmp, M13.HEADER_ROW);
  var brandCol = m13HeaderColumn_(headers, ['POS MASTER BRAND', 'POS BRAND', 'BRAND']);
  var barcodeCol = m13HeaderColumn_(headers, ['POS MAIN ID', 'MAIN ID', 'MAIN_ID', 'POS MASTER BARCODE', 'MASTER BARCODE', 'BARCODE']);
  var supplierCol = m13HeaderColumn_(headers, ['POS SUPPLIER', 'SUPPLIER']);
  var subIdCol = m13HeaderColumn_(headers, ['POS SUB ID', 'SUB ID', 'SUB_ID']);
  if (!brandCol || !barcodeCol) throw new Error('TMP/POS selector columns could not be resolved for FB3 verification.');

  var cols = [brandCol, barcodeCol];
  if (supplierCol) cols.push(supplierCol);
  if (subIdCol) cols.push(subIdCol);
  var minCol = Math.min.apply(null, cols);
  var maxCol = Math.max.apply(null, cols);
  var width = maxCol - minCol + 1;

  var candidate = {};
  for (var i = 0; i < candidateRows.length; i++) candidate[candidateRows[i]] = true;
  var windows = m13BuildBoundedReadWindows_(candidateRows, { maxGap: 36, maxWindowRows: 1600 });
  out.windowCount = windows.length;

  var allowedBarcodeKeys = supplierIdentity && supplierIdentity.barcodeKeys ? supplierIdentity.barcodeKeys : {};
  var allowedIdentityKeys = supplierIdentity && supplierIdentity.identityKeys ? supplierIdentity.identityKeys : {};

  for (var w = 0; w < windows.length; w++) {
    var win = windows[w];
    out.windowRows += win.len;
    var values = shTmp.getRange(win.start, minCol, win.len, width).getDisplayValues();

    for (var r = 0; r < win.len; r++) {
      var sheetRow = win.start + r;
      if (!candidate[sheetRow]) continue;
      var row = values[r] || [];
      var rawBrand = row[brandCol - minCol];
      var rawBarcode = row[barcodeCol - minCol];
      var selected = m13BrandInScope_(rawBrand, brandMap, brandScope);

      if (!selected && m13ScopeBarcodeIntersects_(rawBarcode, allowedBarcodeKeys)) selected = true;
      if (!selected && supplierCol && subIdCol) {
        var identityKey = m13ScopeSupplierSubIdKey_(row[supplierCol - minCol], row[subIdCol - minCol]);
        if (identityKey && allowedIdentityKeys[identityKey]) selected = true;
      }
      if (selected) out.sheetRows.push(sheetRow);
    }
  }

  out.sheetRows = m13UniqueSortedRows_(out.sheetRows);
  return out;
}

function m13FB3ReadScopedTmpSource_(shTmp, brandScope, brandMap, supplierIdentity) {
  var selector = null;
  var verified = null;
  var selectorError = '';

  try {
    selector = m13FB3ResolveTmpCandidateRows_(shTmp, brandScope, brandMap, supplierIdentity);
    verified = m13FB3VerifyTmpCandidateRows_(
      shTmp,
      selector.sheetRows,
      brandScope,
      brandMap,
      supplierIdentity
    );
  } catch (errSelector) {
    selectorError = errSelector && errSelector.message ? errSelector.message : String(errSelector);
    try { log_('[FB3 TMP SELECTOR FALLBACK] ' + selectorError); } catch (_logSelector) {}
  }

  if (!selector || !verified) {
    var fallback = m13ReadScopedTmpSource_(shTmp, brandScope, brandMap, supplierIdentity);
    fallback.stats = fallback.stats || {};
    fallback.stats.selectorMethod = 'FB3_NARROW_SCAN_FALLBACK';
    fallback.stats.selectorError = selectorError;
    return fallback;
  }

  var lastCol = shTmp.getLastColumn();
  var read = m13ReadScopedRowsByWindows_(shTmp, verified.sheetRows, lastCol, 0, {
    maxGap: 36,
    maxWindowRows: 1600
  });
  read.stats = {
    totalTmpRows: selector.totalTmpRows,
    candidateTmpRows: selector.sheetRows.length,
    selectedTmpRows: read.sheetRows.length,
    verifyWindows: verified.windowCount,
    verifyWindowRows: verified.windowRows,
    readWindows: read.windowCount,
    readWindowRows: read.windowRows,
    selectorMethod: selector.method,
    textFinderCalls: selector.textFinderCalls,
    brandHits: selector.brandHits,
    barcodeHits: selector.barcodeHits,
    subIdHits: selector.subIdHits
  };
  return read;
}

function m13FB3TimingSummary_(timing, scopeStats) {
  timing = timing || {};
  scopeStats = scopeStats || {};
  function sec_(ms) { return (Number(ms || 0) / 1000).toFixed(1) + 's'; }

  var selector = scopeStats.selectorMethod || 'UNKNOWN';
  var candidates = m13Fmt_(scopeStats.candidateTmpRows || 0);
  var selected = m13Fmt_(scopeStats.selectedTmpRows || 0);
  var windowRows = m13Fmt_(scopeStats.readWindowRows || 0);
  var windows = m13Fmt_(scopeStats.readWindows || 0);
  var calls = m13Fmt_(scopeStats.textFinderCalls || 0);

  var out = 'Timing — STATUS ' + sec_(timing.status) +
    ' | Scope ' + sec_(timing.scope) +
    ' | SRC ' + sec_(timing.references) +
    ' | TMP ' + sec_(timing.tmp) +
    ' | Merge ' + sec_(timing.merge) +
    ' | Write ' + sec_(timing.write) +
    '\nTMP selector: ' + selector +
    ' | candidates ' + candidates +
    ' | selected ' + selected +
    ' | full-row window rows read ' + windowRows + ' across ' + windows + ' window(s)';

  if (scopeStats.textFinderCalls != null) {
    out += '\nDirect TMP searches: ' + calls +
      ' call(s) | brand hits ' + m13Fmt_(scopeStats.brandHits || 0) +
      ' | barcode hits ' + m13Fmt_(scopeStats.barcodeHits || 0) +
      ' | sub-ID hits ' + m13Fmt_(scopeStats.subIdHits || 0);
  }
  if (scopeStats.selectorError) out += '\nSelector fallback reason: ' + scopeStats.selectorError;
  return out;
}


// =============================================================================
//  FILTERED-BRAND SCOPE V2 — m13FB2 ISOLATED PERFORMANCE HELPERS
// =============================================================================
// These helpers are used only by BUILD OUT_MERGED_DATA — FILTERED BRANDS (COL E).
// They do not replace or duplicate the merge engine. m13BuildPosBundle_ and
// m13BuildRows_ remain the shared POS-is-king matching/pricing/review engines.

function m13FB2ResolveVisibleSupplierBrandScope_(shSup, brandMap) {
  var filter = shSup.getFilter();
  if (!filter) {
    throw new Error('No supplier filter is active. Filter Column E — SUP BRAND before running the filtered-brand build.');
  }

  var criteria = null;
  try { criteria = filter.getColumnFilterCriteria(5); } catch (_criteria) {}
  if (!criteria) {
    throw new Error('Column E — SUP BRAND has no active filter criteria. Apply the brand filter in Column E before running the filtered-brand build.');
  }

  var hiddenValues = [];
  try { hiddenValues = criteria.getHiddenValues() || []; } catch (_hiddenValues) { hiddenValues = []; }

  // The common workflow is the normal checkbox/value filter on Column E only.
  // In that case the visible brand set can be derived from the filter criteria
  // with one Column-E read: no temporary column, formulas, flush or column delete.
  if (hiddenValues.length && m13FB2OnlyColumnEFilterActive_(filter)) {
    var nRows = shSup.getLastRow() - M13.DATA_ROW + 1;
    var brandVals = shSup.getRange(M13.DATA_ROW, 5, nRows, 1).getDisplayValues();
    var hidden = {};
    for (var h = 0; h < hiddenValues.length; h++) hidden[String(hiddenValues[h] == null ? '' : hiddenValues[h])] = true;

    var keys = {};
    var labelSeen = {};
    var labels = [];
    var visibleRows = 0;

    for (var i = 0; i < brandVals.length; i++) {
      var rawDisplay = String(brandVals[i][0] == null ? '' : brandVals[i][0]);
      if (hidden[rawDisplay]) continue;
      var rawBrand = m13Str_(rawDisplay);
      if (!rawBrand) continue;
      visibleRows++;

      var translated = m13BE1TranslateSupplierBrand_(rawBrand, brandMap);
      var rawKey = m13NormBrand_(rawBrand);
      var translatedKey = m13NormBrand_(translated || rawBrand);
      if (rawKey) keys[rawKey] = true;
      if (translatedKey) keys[translatedKey] = true;

      var label = translated || rawBrand;
      var labelKey = m13Upper_(label);
      if (!labelSeen[labelKey]) {
        labelSeen[labelKey] = true;
        labels.push(label);
      }
    }

    labels.sort(function(a, b) { return m13Str_(a).localeCompare(m13Str_(b)); });
    return {
      keys: keys,
      labels: labels,
      visibleRows: visibleRows,
      allBrandValues: brandVals,
      selectorMethod: 'COLUMN_E_VALUE_FILTER'
    };
  }

  // Preserve support for custom formulas/conditions, colour filters, or any
  // workbook state with additional active filter columns. The established
  // visibility helper remains the accuracy-first fallback for those cases.
  var fallback = m13ResolveVisibleSupplierBrandScope_(shSup, brandMap);
  fallback.selectorMethod = 'VISIBILITY_HELPER_FALLBACK';
  return fallback;
}

function m13FB2OnlyColumnEFilterActive_(filter) {
  if (!filter) return false;
  var range = null;
  try { range = filter.getRange(); } catch (_range) { return false; }
  if (!range) return false;

  var firstCol = range.getColumn();
  var lastCol = firstCol + range.getNumColumns() - 1;
  for (var col = firstCol; col <= lastCol; col++) {
    if (col === 5) continue;
    var criteria = null;
    try { criteria = filter.getColumnFilterCriteria(col); } catch (_criteria) { return false; }
    if (criteria) return false;
  }
  return true;
}

function m13FB2BuildTmpBrandSelectorKeys_(brandScope, brandMap) {
  var full = {};
  var prefix20 = {};

  function add_(value) {
    var key = m13NormBrand_(value || '');
    if (!key) return;
    full[key] = true;
    prefix20[key.slice(0, 20)] = true;
  }

  Object.keys((brandScope && brandScope.keys) || {}).forEach(add_);
  var labels = (brandScope && brandScope.labels) || [];
  for (var i = 0; i < labels.length; i++) add_(labels[i]);

  var rows = brandMap && brandMap.__rows ? brandMap.__rows : [];
  for (var r = 0; r < rows.length; r++) {
    var mapRow = rows[r] || {};
    if (!m13BrandInScope_(mapRow.supBrand, brandMap, brandScope) &&
        !m13BrandInScope_(mapRow.posBrand, brandMap, brandScope)) continue;
    add_(mapRow.supBrand);
    add_(mapRow.posBrand);
    add_(m13TranslateBrand_(mapRow.supBrand, brandMap));
    add_(m13TranslateBrand_(mapRow.posBrand, brandMap));
  }

  return { full: Object.keys(full), prefix20: Object.keys(prefix20) };
}

function m13FB2BuildBarcodeSelectorKeys_(supplierIdentity) {
  var raw = {};
  var digits = {};
  var source = supplierIdentity && supplierIdentity.barcodeKeys ? supplierIdentity.barcodeKeys : {};

  Object.keys(source).forEach(function(key) {
    var value = m13Str_(key);
    if (!value) return;
    raw[m13Upper_(value)] = true;
    var digitKey = value.replace(/\.0+$/, '').replace(/[^0-9]/g, '');
    if (digitKey) digits[digitKey] = true;
  });

  return { raw: Object.keys(raw), digits: Object.keys(digits) };
}

function m13FB2RegexEscape_(value) {
  return String(value == null ? '' : value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function m13FB2FormulaStringEscape_(value) {
  return String(value == null ? '' : value).replace(/"/g, '""');
}

function m13FB2BuildRegexTerms_(expression, keys, maxPatternChars) {
  keys = keys || [];
  maxPatternChars = maxPatternChars || 5500;
  var terms = [];
  var chunk = [];
  var chunkLen = 0;

  function flush_() {
    if (!chunk.length) return;
    var pattern = '^(' + chunk.join('|') + ')$';
    terms.push('REGEXMATCH(' + expression + ',"' + m13FB2FormulaStringEscape_(pattern) + '")');
    chunk = [];
    chunkLen = 0;
  }

  for (var i = 0; i < keys.length; i++) {
    var escaped = m13FB2RegexEscape_(keys[i]);
    if (!escaped) continue;
    var addLen = escaped.length + (chunk.length ? 1 : 0);
    if (chunk.length && chunkLen + addLen > maxPatternChars) flush_();
    chunk.push(escaped);
    chunkLen += addLen;
  }
  flush_();
  return terms;
}

function m13FB2SheetRangeRef_(sh, col, firstRow, lastRow) {
  var safeName = String(sh.getName() || '').replace(/'/g, "''");
  var letter = m13ColLetter_(col);
  return "'" + safeName + "'!" + letter + firstRow + ':' + letter + lastRow;
}

function m13FB2GetScopeScratchSheet_(ss) {
  var name = '_M13_FB2_V638_SCOPE';
  var marker = 'M13_FB2_V638_INTERNAL_SCOPE';
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange('A1').setValue(marker);
  } else {
    var existing = m13Str_(sh.getRange('A1').getDisplayValue());
    if (existing && existing !== marker) {
      throw new Error('Internal filtered-scope sheet name is already in use: ' + name + '. No existing data was overwritten.');
    }
    if (!existing) sh.getRange('A1').setValue(marker);
  }
  try { sh.hideSheet(); } catch (_hide) {}
  return sh;
}

function m13FB2ResolveTmpSheetRows_(shTmp, brandScope, brandMap, supplierIdentity) {
  var lastRow = shTmp.getLastRow();
  var nRows = lastRow - M13.DATA_ROW + 1;
  var headers = m13HeaderMap_(shTmp, M13.HEADER_ROW);

  var brandCol = m13HeaderColumn_(headers, ['POS MASTER BRAND', 'POS BRAND', 'BRAND']);
  var barcodeCol = m13HeaderColumn_(headers, ['POS MAIN ID', 'MAIN ID', 'MAIN_ID', 'POS MASTER BARCODE', 'MASTER BARCODE', 'BARCODE']);
  var supplierCol = m13HeaderColumn_(headers, ['POS SUPPLIER', 'SUPPLIER']);
  var subIdCol = m13HeaderColumn_(headers, ['POS SUB ID', 'SUB ID', 'SUB_ID']);

  if (!brandCol) throw new Error('TMP/POS brand column could not be resolved.');
  if (!barcodeCol) throw new Error('TMP/POS barcode column could not be resolved.');

  var firstRow = M13.DATA_ROW;
  var brandRef = m13FB2SheetRangeRef_(shTmp, brandCol, firstRow, lastRow);
  var barcodeRef = m13FB2SheetRangeRef_(shTmp, barcodeCol, firstRow, lastRow);
  var supplierRef = supplierCol ? m13FB2SheetRangeRef_(shTmp, supplierCol, firstRow, lastRow) : '';
  var subIdRef = subIdCol ? m13FB2SheetRangeRef_(shTmp, subIdCol, firstRow, lastRow) : '';

  var brandKeys = m13FB2BuildTmpBrandSelectorKeys_(brandScope, brandMap);
  var barcodeKeys = m13FB2BuildBarcodeSelectorKeys_(supplierIdentity);
  var identityKeys = Object.keys((supplierIdentity && supplierIdentity.identityKeys) || {});

  var brandNorm = 'LEFT(REGEXREPLACE(REGEXREPLACE(UPPER(TO_TEXT(' + brandRef + ')),"^Z+\\s*",""),"[^A-Z0-9]",""),24)';
  var brand20 = 'LEFT(' + brandNorm + ',20)';
  var barcodeRaw = 'UPPER(TRIM(TO_TEXT(' + barcodeRef + ')))';
  var barcodeDigits = 'REGEXREPLACE(REGEXREPLACE(TO_TEXT(' + barcodeRef + '),"\\.0+$",""),"[^0-9]","")';
  var barcodeNoZeros = 'IF(' + barcodeDigits + '="","",IF(REGEXREPLACE(' + barcodeDigits + ',"^0+","")="","0",REGEXREPLACE(' + barcodeDigits + ',"^0+","")))';
  var barcodeCanonical = 'IF(' + barcodeDigits + '="","",IF(LEN(' + barcodeDigits + ')>14,"",IF(LEN(' + barcodeDigits + ')=14,RIGHT(' + barcodeDigits + ',13),IF(LEN(' + barcodeDigits + ')<13,RIGHT(REPT("0",13)&' + barcodeDigits + ',13),' + barcodeDigits + '))))';
  var barcodeCanonicalPlusZero = 'IF(LEN(' + barcodeCanonical + ')=13,"0"&' + barcodeCanonical + ',"")';

  var terms = [];
  terms = terms.concat(m13FB2BuildRegexTerms_(brandNorm, brandKeys.full));
  terms = terms.concat(m13FB2BuildRegexTerms_(brand20, brandKeys.prefix20));
  terms = terms.concat(m13FB2BuildRegexTerms_(barcodeRaw, barcodeKeys.raw));
  terms = terms.concat(m13FB2BuildRegexTerms_(barcodeDigits, barcodeKeys.digits));
  terms = terms.concat(m13FB2BuildRegexTerms_(barcodeNoZeros, barcodeKeys.digits));
  terms = terms.concat(m13FB2BuildRegexTerms_(barcodeCanonical, barcodeKeys.digits));
  terms = terms.concat(m13FB2BuildRegexTerms_(barcodeCanonicalPlusZero, barcodeKeys.digits));

  if (supplierRef && subIdRef && identityKeys.length) {
    var identityExpr = 'REGEXREPLACE(UPPER(TO_TEXT(' + supplierRef + ')),"[^A-Z0-9]","")&"|"&REGEXREPLACE(UPPER(TO_TEXT(' + subIdRef + ')),"[^A-Z0-9]","")';
    terms = terms.concat(m13FB2BuildRegexTerms_(identityExpr, identityKeys));
  }

  if (!terms.length) return { sheetRows: [], method: 'FB2_NATIVE_FORMULA', formulaChars: 0, totalTmpRows: nRows };

  var condition = '(' + terms.join('+') + ')>0';
  var formula = '=IFNA(TEXTJOIN("|",TRUE,FILTER(ROW(' + brandRef + '),ARRAYFORMULA(' + condition + '))),"")';
  if (formula.length > 45000) {
    throw new Error('FB2 selector formula exceeded the safe formula-size limit (' + formula.length + ' characters).');
  }

  var scratch = m13FB2GetScopeScratchSheet_(shTmp.getParent());
  var resultCell = scratch.getRange('A2');
  var raw = '';
  try {
    resultCell.clearContent().setFormula(formula);
    SpreadsheetApp.flush();
    raw = m13Str_(resultCell.getDisplayValue());
  } finally {
    try { resultCell.clearContent(); } catch (_clearResult) {}
  }

  if (raw && raw.charAt(0) === '#') {
    throw new Error('FB2 native TMP selector returned ' + raw + '.');
  }

  var seen = {};
  var sheetRows = [];
  if (raw) {
    var parts = raw.split('|');
    for (var i = 0; i < parts.length; i++) {
      var rowNum = Number(parts[i]);
      if (!isFinite(rowNum) || rowNum < M13.DATA_ROW || rowNum > lastRow || seen[rowNum]) continue;
      seen[rowNum] = true;
      sheetRows.push(rowNum);
    }
  }
  sheetRows.sort(function(a, b) { return a - b; });

  return {
    sheetRows: sheetRows,
    method: 'FB2_NATIVE_FORMULA',
    formulaChars: formula.length,
    totalTmpRows: nRows
  };
}

function m13FB2ReadScopedTmpSource_(shTmp, brandScope, brandMap, supplierIdentity) {
  var selector = null;
  var selectorError = '';

  try {
    selector = m13FB2ResolveTmpSheetRows_(shTmp, brandScope, brandMap, supplierIdentity);
  } catch (errSelector) {
    selectorError = errSelector && errSelector.message ? errSelector.message : String(errSelector);
    try { log_('[FB2 TMP SELECTOR FALLBACK] ' + selectorError); } catch (_logSelector) {}
  }

  if (!selector) {
    var fallback = m13ReadScopedTmpSource_(shTmp, brandScope, brandMap, supplierIdentity);
    fallback.stats = fallback.stats || {};
    fallback.stats.selectorMethod = 'V637_NARROW_SCAN_FALLBACK';
    fallback.stats.selectorError = selectorError;
    return fallback;
  }

  var lastCol = shTmp.getLastColumn();
  var read = m13ReadScopedRowsByWindows_(shTmp, selector.sheetRows, lastCol, 0, {
    maxGap: 36,
    maxWindowRows: 1600
  });
  read.stats = {
    totalTmpRows: selector.totalTmpRows,
    selectedTmpRows: read.sheetRows.length,
    readWindows: read.windowCount,
    readWindowRows: read.windowRows,
    selectorMethod: selector.method,
    selectorFormulaChars: selector.formulaChars
  };
  return read;
}

// v6.3.80 FB4 filtered-output cleanup hand-off.
// Reuse the established OUT preparation engine so filtered builds physically
// remove excess rows exactly like the normal full BUILD OUT_MERGED_DATA path.
// The legacy FB2 preparation helper is preserved below for project integrity,
// but is no longer the active filtered-build output preparation path.
function m13FB4PrepareOutSheet_(ss, dataRows) {
  return m13PrepareOutSheet_(ss, dataRows);
}

function m13FB2PrepareOutSheet_(ss, dataRows) {
  var name = M13.OUT_SHEET;
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);

  var oldLastRow = sh.getLastRow();
  var oldLastCol = sh.getLastColumn();
  var needRows = Math.max(2 + dataRows, 3);
  var needCols = M13.HEADERS.length;

  if (sh.getMaxColumns() < needCols) sh.insertColumnsAfter(sh.getMaxColumns(), needCols - sh.getMaxColumns());
  if (sh.getMaxRows() < needRows) sh.insertRowsAfter(sh.getMaxRows(), needRows - sh.getMaxRows());

  // Filtered builds can follow a 4,000+ row full build. Do not physically delete
  // thousands of sheet rows merely to write a 61-row brand result. Clear only the
  // previously used/current body so getLastRow(), exports and later full builds see
  // no stale data. Physical row capacity and existing workbook structure are kept.
  var width = Math.max(needCols, oldLastCol, sh.getLastColumn());
  var clearRows = Math.max(Math.max(0, oldLastRow - 2), dataRows);
  if (clearRows > 0) {
    try {
      sh.getRange(3, 1, clearRows, width)
        .clearContent()
        .clearNote();
    } catch (eClr) {}
  }

  var row1 = m13OutTotalsRow_();
  sh.getRange(1, 1, 1, needCols).setValues([row1]);
  sh.getRange(2, 1, 1, needCols).setValues([M13.HEADERS]);

  var F = (CFG && CFG.FONT) ? CFG.FONT : { FAMILY: 'Google Sans', SIZE: 8 };
  var R = (CFG && CFG.ROW) ? CFG.ROW : { TITLE: 28, HEADER: 28, DATA: 20 };

  sh.getRange(1, 1, 1, needCols)
    .setBackground(LEGEND.TITLE_BG).setFontColor(LEGEND.TITLE_FG)
    .setFontFamily(F.FAMILY).setFontSize(F.SIZE).setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);

  sh.getRange(2, 1, 1, needCols)
    .setBackground(LEGEND.HDR_BG).setFontColor(LEGEND.HDR_FG)
    .setFontFamily(F.FAMILY).setFontSize(F.SIZE).setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);

  try { sh.setFrozenRows(2); } catch (eFreeze) {}
  try { sh.setRowHeight(1, R.TITLE || 28); } catch (eH1) {}
  try { sh.setRowHeight(2, R.HEADER || 28); } catch (eH2) {}

  m13FixOutMergedRowHeights_(sh, Math.max(1, dataRows));
  m13FormatBarcodeTextColumns_(sh, Math.max(1, dataRows));

  try { if (sh.getFilter()) sh.getFilter().remove(); } catch (eF0) {}
  try { sh.getRange(2, 1, Math.max(needRows - 1, 1), needCols).createFilter(); } catch (eF1) {}

  return sh;
}

function m13FB2TimingSummary_(timing, scopeStats) {
  timing = timing || {};
  scopeStats = scopeStats || {};
  function sec_(ms) { return (Number(ms || 0) / 1000).toFixed(1) + 's'; }

  var selector = scopeStats.selectorMethod || 'UNKNOWN';
  var scopedRows = m13Fmt_(scopeStats.selectedTmpRows || 0);
  var windowRows = m13Fmt_(scopeStats.readWindowRows || 0);
  var windows = m13Fmt_(scopeStats.readWindows || 0);

  return 'Timing — STATUS ' + sec_(timing.status) +
    ' | Scope ' + sec_(timing.scope) +
    ' | SRC ' + sec_(timing.references) +
    ' | TMP ' + sec_(timing.tmp) +
    ' | Merge ' + sec_(timing.merge) +
    ' | Write ' + sec_(timing.write) +
    '\nTMP selector: ' + selector +
    ' | selected ' + scopedRows +
    ' | bounded-window rows read ' + windowRows +
    ' across ' + windows + ' window(s)';
}

function m13ResolveVisibleSupplierBrandScope_(shSup, brandMap) {
  var filter = shSup.getFilter();
  if (!filter) {
    throw new Error('No supplier filter is active. Filter Column E — SUP BRAND before running the filtered-brand build.');
  }

  var criteria = null;
  try { criteria = filter.getColumnFilterCriteria(5); } catch (_criteria) {}
  if (!criteria) {
    throw new Error('Column E — SUP BRAND has no active filter criteria. Apply the brand filter in Column E before running the filtered-brand build.');
  }

  var nRows = shSup.getLastRow() - M13.DATA_ROW + 1;
  var brandVals = shSup.getRange(M13.DATA_ROW, 5, nRows, 1).getDisplayValues();
  var helperCol = shSup.getMaxColumns() + 1;
  var visibility = [];
  var insertedHelper = false;

  try {
    shSup.insertColumnAfter(shSup.getMaxColumns());
    insertedHelper = true;
    shSup.getRange(M13.HEADER_ROW, helperCol).setValue('__M13_FILTER_VISIBLE__');
    var helperRange = shSup.getRange(M13.DATA_ROW, helperCol, nRows, 1);
    helperRange.setFormulaR1C1('=SUBTOTAL(103,RC5)');
    try { shSup.hideColumns(helperCol); } catch (_hideHelper) {}
    SpreadsheetApp.flush();
    visibility = helperRange.getDisplayValues();
  } finally {
    if (insertedHelper) {
      try { shSup.deleteColumn(helperCol); } catch (_deleteHelper) {
        try { shSup.getRange(M13.HEADER_ROW, helperCol, nRows + 1, 1).clearContent(); } catch (_clearHelper) {}
      }
    }
  }

  var keys = {};
  var labelSeen = {};
  var labels = [];
  var visibleRows = 0;
  for (var i = 0; i < brandVals.length; i++) {
    if (!(Number(visibility[i] && visibility[i][0]) > 0)) continue;
    var rawBrand = m13Str_(brandVals[i][0]);
    if (!rawBrand) continue;
    visibleRows++;

    var translated = m13BE1TranslateSupplierBrand_(rawBrand, brandMap);
    var rawKey = m13NormBrand_(rawBrand);
    var translatedKey = m13NormBrand_(translated || rawBrand);
    if (rawKey) keys[rawKey] = true;
    if (translatedKey) keys[translatedKey] = true;

    var label = translated || rawBrand;
    var labelKey = m13Upper_(label);
    if (!labelSeen[labelKey]) {
      labelSeen[labelKey] = true;
      labels.push(label);
    }
  }

  labels.sort(function(a, b) { return m13Str_(a).localeCompare(m13Str_(b)); });
  return {
    keys: keys,
    labels: labels,
    visibleRows: visibleRows,
    allBrandValues: brandVals
  };
}

function m13BrandInScope_(rawBrand, brandMap, brandScope) {
  if (!brandScope || !brandScope.keys) return false;
  var rawKey = m13NormBrand_(rawBrand);
  if (rawKey && brandScope.keys[rawKey]) return true;
  var translated = m13BE1TranslateSupplierBrand_(rawBrand, brandMap);
  var translatedKey = m13NormBrand_(translated || rawBrand);
  return !!(translatedKey && brandScope.keys[translatedKey]);
}

function m13ReadScopedSupplierSource_(shSup, brandScope, brandMap) {
  var headers = m13HeaderMap_(shSup, M13.HEADER_ROW);
  var brandVals = brandScope.allBrandValues || [];
  var sheetRows = [];

  for (var i = 0; i < brandVals.length; i++) {
    if (m13BrandInScope_(brandVals[i][0], brandMap, brandScope)) {
      sheetRows.push(M13.DATA_ROW + i);
    }
  }

  var lastCol = Math.max(shSup.getLastColumn(), M13.STATUS_COL);
  var read = m13ReadScopedRowsByWindows_(shSup, sheetRows, lastCol, M13.STATUS_COL, {
    maxGap: 24,
    maxWindowRows: 1200
  });
  read.headers = headers;
  return read;
}

function m13CollectScopedSupplierIdentity_(supData, supHeaders) {
  var barcodeKeys = {};
  var identityKeys = {};

  for (var i = 0; i < (supData || []).length; i++) {
    var row = supData[i] || [];
    var rawBarcode = m13Str_(m13ColVal_(row, supHeaders, ['SUP BARCODE', 'SUP MASTER BARCODE', 'BARCODE', 'POS MASTER BARCODE']));
    var bcKeys = (typeof posKingBarcodeKeySet_ === 'function')
      ? posKingBarcodeKeySet_(rawBarcode)
      : m13ScopeBarcodeKeySet_(rawBarcode);
    Object.keys(bcKeys || {}).forEach(function(k) { barcodeKeys[k] = true; });

    var supplierNum = m13Str_(m13ColVal_(row, supHeaders, ['POS SUPPLIER NUMBER', 'SUPPLIER NUMBER', 'SUPPLIER NO', 'SUPPLIER']));
    var subId = m13Str_(m13ColVal_(row, supHeaders, ['SUP SUB ID', 'SUB ID', 'SUB_ID']));
    var identityKey = m13ScopeSupplierSubIdKey_(supplierNum, subId);
    if (identityKey) identityKeys[identityKey] = true;
  }

  return { barcodeKeys: barcodeKeys, identityKeys: identityKeys };
}

function m13ReadScopedTmpSource_(shTmp, brandScope, brandMap, supplierIdentity) {
  var lastRow = shTmp.getLastRow();
  var nRows = lastRow - M13.DATA_ROW + 1;
  var lastCol = shTmp.getLastColumn();
  var headers = m13HeaderMap_(shTmp, M13.HEADER_ROW);

  var brandCol = m13HeaderColumn_(headers, ['POS MASTER BRAND', 'POS BRAND', 'BRAND']);
  var barcodeCol = m13HeaderColumn_(headers, ['POS MAIN ID', 'MAIN ID', 'MAIN_ID', 'POS MASTER BARCODE', 'MASTER BARCODE', 'BARCODE']);
  var supplierCol = m13HeaderColumn_(headers, ['POS SUPPLIER', 'SUPPLIER']);
  var subIdCol = m13HeaderColumn_(headers, ['POS SUB ID', 'SUB ID', 'SUB_ID']);

  if (!brandCol) throw new Error('TMP/POS brand column could not be resolved.');
  if (!barcodeCol) throw new Error('TMP/POS barcode column could not be resolved.');

  var brandVals = shTmp.getRange(M13.DATA_ROW, brandCol, nRows, 1).getDisplayValues();
  var barcodeVals = shTmp.getRange(M13.DATA_ROW, barcodeCol, nRows, 1).getDisplayValues();
  var supplierVals = supplierCol ? shTmp.getRange(M13.DATA_ROW, supplierCol, nRows, 1).getDisplayValues() : null;
  var subIdVals = subIdCol ? shTmp.getRange(M13.DATA_ROW, subIdCol, nRows, 1).getDisplayValues() : null;

  var allowedBarcodeKeys = supplierIdentity && supplierIdentity.barcodeKeys ? supplierIdentity.barcodeKeys : {};
  var allowedIdentityKeys = supplierIdentity && supplierIdentity.identityKeys ? supplierIdentity.identityKeys : {};
  var sheetRows = [];

  for (var i = 0; i < nRows; i++) {
    var selected = m13BrandInScope_(brandVals[i][0], brandMap, brandScope);
    if (!selected && m13ScopeBarcodeIntersects_(barcodeVals[i][0], allowedBarcodeKeys)) selected = true;
    if (!selected && supplierVals && subIdVals) {
      var identityKey = m13ScopeSupplierSubIdKey_(supplierVals[i][0], subIdVals[i][0]);
      if (identityKey && allowedIdentityKeys[identityKey]) selected = true;
    }
    if (selected) sheetRows.push(M13.DATA_ROW + i);
  }

  var read = m13ReadScopedRowsByWindows_(shTmp, sheetRows, lastCol, 0, {
    maxGap: 36,
    maxWindowRows: 1600
  });
  read.stats = {
    totalTmpRows: nRows,
    selectedTmpRows: read.sheetRows.length,
    readWindows: read.windowCount,
    readWindowRows: read.windowRows
  };
  return read;
}

function m13HeaderColumn_(headers, candidates) {
  headers = headers || {};
  for (var i = 0; i < candidates.length; i++) {
    var idx = headers[m13Upper_(candidates[i])];
    if (idx != null && idx >= 0) return idx + 1;
  }
  return 0;
}

function m13ScopeSupplierSubIdKey_(supplierNum, subId) {
  var supplierKey = m13NormId_(supplierNum || '');
  var subKey = m13NormId_(subId || '');
  return supplierKey && subKey ? (supplierKey + '|' + subKey) : '';
}

function m13ScopeBarcodeKeySet_(raw) {
  var keys = {};
  var bc = m13Barcode_(raw);
  var variants = bc && bc.variants ? bc.variants : [];
  for (var i = 0; i < variants.length; i++) if (variants[i]) keys[variants[i]] = true;
  return keys;
}

function m13ScopeBarcodeIntersects_(raw, allowedKeys) {
  if (!raw || !allowedKeys) return false;
  var keys = (typeof posKingBarcodeKeySet_ === 'function')
    ? posKingBarcodeKeySet_(raw)
    : m13ScopeBarcodeKeySet_(raw);
  var list = Object.keys(keys || {});
  for (var i = 0; i < list.length; i++) if (allowedKeys[list[i]]) return true;
  return false;
}

function m13ReadScopedRowsByWindows_(sh, selectedRows, lastCol, noteCol, opt) {
  selectedRows = m13UniqueSortedRows_(selectedRows || []);
  var out = { data: [], notes: [], sheetRows: [], windowCount: 0, windowRows: 0 };
  if (!selectedRows.length) return out;

  var selected = {};
  for (var i = 0; i < selectedRows.length; i++) selected[selectedRows[i]] = true;
  var windows = m13BuildBoundedReadWindows_(selectedRows, opt || {});
  out.windowCount = windows.length;

  for (var w = 0; w < windows.length; w++) {
    var win = windows[w];
    out.windowRows += win.len;
    var values = sh.getRange(win.start, 1, win.len, lastCol).getDisplayValues();
    var notes = noteCol ? sh.getRange(win.start, noteCol, win.len, 1).getNotes() : null;

    for (var r = 0; r < win.len; r++) {
      var sheetRow = win.start + r;
      if (!selected[sheetRow]) continue;
      // Unrelated rows included only to make the API read efficient are rejected
      // here by preselected row membership before barcode parsing/object creation.
      out.data.push(values[r]);
      out.sheetRows.push(sheetRow);
      if (noteCol) out.notes.push([notes[r] && notes[r][0] ? notes[r][0] : '']);
    }
  }
  return out;
}

function m13BuildBoundedReadWindows_(rows, opt) {
  rows = m13UniqueSortedRows_(rows || []);
  if (!rows.length) return [];
  opt = opt || {};
  var maxGap = Math.max(0, Number(opt.maxGap == null ? 24 : opt.maxGap));
  var maxWindowRows = Math.max(1, Number(opt.maxWindowRows == null ? 1200 : opt.maxWindowRows));
  var windows = [];
  var start = rows[0];
  var end = rows[0];

  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    var gap = row - end - 1;
    var proposedLen = row - start + 1;
    if (gap <= maxGap && proposedLen <= maxWindowRows) {
      end = row;
      continue;
    }
    windows.push({ start: start, len: end - start + 1 });
    start = row;
    end = row;
  }
  windows.push({ start: start, len: end - start + 1 });
  return windows;
}

// =============================================================================
// v6.3.81 FM1 FULL-MERGE PERFORMANCE HELPERS
// Same merge rules; these helpers only remove repeated impossible-candidate and
// repeated header/regex preparation work from the large full-build path.
// =============================================================================
function m13FM1Sec_(ms) {
  return (Math.max(0, Number(ms || 0)) / 1000).toFixed(1) + 's';
}

function m13FM1OutBrandKey_(row) {
  return m13NormBrand_(row && (row[7] || row[8] || row[34] || row[44]) || '');
}

function m13FM1RelinkLaneKey_(brand) {
  var key = m13RelinkBrandKey_(brand || '');
  return key ? key.slice(0, 20) : '';
}

function m13FM1CompileColumnReader_(headers, candidates) {
  var indexes = [];
  for (var i = 0; i < candidates.length; i++) {
    var idx = headers[m13Upper_(candidates[i])];
    if (idx != null && idx >= 0) indexes.push(idx);
  }
  return indexes;
}

function m13FM1ReadCompiled_(row, indexes) {
  for (var i = 0; i < indexes.length; i++) {
    var idx = indexes[i];
    if (idx >= 0 && idx < row.length) {
      var v = row[idx];
      if (v !== '' && v != null) return v;
    }
  }
  return '';
}

function m13FM1CompileTmpReaders_(headers) {
  return {
    barcode: m13FM1CompileColumnReader_(headers, ['POS MAIN ID', 'MAIN ID', 'MAIN_ID', 'POS MASTER BARCODE', 'MASTER BARCODE', 'BARCODE']),
    brand: m13FM1CompileColumnReader_(headers, ['POS MASTER BRAND', 'POS BRAND', 'BRAND']),
    posBrand: m13FM1CompileColumnReader_(headers, ['POS BRAND']),
    descr: m13FM1CompileColumnReader_(headers, ['POS DESCR', 'POS POS DESC', 'POS PRODUCT', 'DESCR', 'DESCRIPTION']),
    plu: m13FM1CompileColumnReader_(headers, ['POS PLU', 'PLU']),
    subId: m13FM1CompileColumnReader_(headers, ['POS SUB ID', 'SUB ID', 'SUB_ID']),
    posDesc: m13FM1CompileColumnReader_(headers, ['POS POS DESC', 'POS DESC', 'POS_DESCR']),
    dissno: m13FM1CompileColumnReader_(headers, ['POS DISSNO', 'DISSNO']),
    prodGrp: m13FM1CompileColumnReader_(headers, ['POS PROD GRP', 'PROD GRP', 'PROD_GRP']),
    supplier: m13FM1CompileColumnReader_(headers, ['POS SUPPLIER', 'SUPPLIER']),
    loyalty: m13FM1CompileColumnReader_(headers, ['POS LOYALTY SCHEME', 'LOYALTY SCHEME']),
    units: m13FM1CompileColumnReader_(headers, ['POS UNITS', 'UNITS']),
    minOrder: m13FM1CompileColumnReader_(headers, ['POS MIN ORDER QTY', 'MIN ORDER QTY']),
    wsp: m13FM1CompileColumnReader_(headers, ['POS WSP EXCGST', 'WSP EXCGST', 'WSP']),
    lastPrice: m13FM1CompileColumnReader_(headers, ['POS LAST PRICE', 'LAST PRICE']),
    gstPct: m13FM1CompileColumnReader_(headers, ['POS GST TAX PC', 'GST TAX PC', 'GST']),
    rrp: m13FM1CompileColumnReader_(headers, ['POS RRP INCGST', 'RRP INCGST', 'RRP']),
    pr1: m13FM1CompileColumnReader_(headers, ['POS PR 1 PC', 'PR 1 PC']),
    pr2: m13FM1CompileColumnReader_(headers, ['POS PR 2 PC', 'PR 2 PC']),
    pr3: m13FM1CompileColumnReader_(headers, ['POS PR 3 PC', 'PR 3 PC']),
    pr4: m13FM1CompileColumnReader_(headers, ['POS PR 4 PC', 'PR 4 PC']),
    pr5: m13FM1CompileColumnReader_(headers, ['POS PR 5 PC', 'PR 5 PC']),
    pr6: m13FM1CompileColumnReader_(headers, ['POS PR 6 PC', 'PR 6 PC']),
    pr7: m13FM1CompileColumnReader_(headers, ['POS PR 7 PC', 'PR 7 PC']),
    pr8: m13FM1CompileColumnReader_(headers, ['POS PR 8 PC', 'PR 8 PC']),
    pr9: m13FM1CompileColumnReader_(headers, ['POS PR 9 PC', 'PR 9 PC']),
    retPrice: m13FM1CompileColumnReader_(headers, ['POS RET PRICE', 'RET PRICE']),
    pharmProd: m13FM1CompileColumnReader_(headers, ['POS PHARM PROD', 'PHARM PROD']),
    scales: m13FM1CompileColumnReader_(headers, ['POS SCALES', 'SCALES']),
    itemsize: m13FM1CompileColumnReader_(headers, ['POS ITEMSIZE', 'ITEMSIZE']),
    packaging: m13FM1CompileColumnReader_(headers, ['POS PACKAGING', 'PACKAGING']),
    soh: m13FM1CompileColumnReader_(headers, ['POS SOH', 'SOH']),
    status: m13FM1CompileColumnReader_(headers, ['STATUS', 'POS STATUS'])
  };
}

function m13FM1CompileFindReplaceRule_(find, repl, sheetRow) {
  var rule = { find: find, repl: repl, sheetRow: sheetRow, __used: false };
  try {
    var pat = m13WholeTokenPattern_(find);
    rule.__fm1HasPrefix = !!pat.hasPrefix;
    rule.__fm1Regex = new RegExp(pat.pattern, 'g');
  } catch (e) {}
  return rule;
}

function m13BuildRows_(supData, supNotes, supHeaders, posBundle, brandMap, supplierMap, activeSuppliers, discountRules, findReplaceRules, prefixMap, scopeCtx) {
  // Backwards compatibility if this helper is ever called with the old v6.3.7
  // argument order: (supData, supNotes, supHeaders, posBundle, brandMap,
  // supplierMap, discountRules, findReplaceRules, prefixMap).
  if (arguments.length === 9) {
    prefixMap = findReplaceRules;
    findReplaceRules = discountRules;
    discountRules = activeSuppliers;
    activeSuppliers = null;
  }

  var rows = [];
  var counts = { matched: 0, newRows: 0, review: 0, discontinued: 0, skippedNotUsed: 0, skippedBlank: 0, skippedOther: 0 };
  var usedPosRows = {};
  var supplierBrandKeys = {};
  var ds1 = m13DS1NewContext_(); // v6.3.88: POS names of the uploaded brands, for the discontinued pass
  var supplierSheetRows = scopeCtx && scopeCtx.supplierSheetRows ? scopeCtx.supplierSheetRows : null;

  // DP5 description-only context: build a lightweight Q-token frequency map by
  // translated brand before the supplier loop. It is used only to decide which
  // supplier-Q words are most identity-bearing when Column P must be compressed
  // to the POS 35-character limit. No matching, pricing or supplier-selection
  // logic reads this context.
  var dp5IdentityCtx = m13DP5BuildIdentityContext_(supData, supHeaders, brandMap, findReplaceRules);

  // Single-pass supplier processing. This preserves the original status logic
  // while avoiding the previous preparedSup[] duplicate array over the upload.
  for (var r = 0; r < supData.length; r++) {
    var supplierSheetRow = supplierSheetRows && supplierSheetRows[r] ? supplierSheetRows[r] : (M13.DATA_ROW + r);
    var supObj = m13MakeSupplierObj_(supData[r], supHeaders, brandMap, supplierMap, activeSuppliers, discountRules, findReplaceRules, prefixMap, supplierSheetRow);
    supObj.__dp5IdentityCtx = dp5IdentityCtx;
    if (supObj.rawBrand || supObj.translatedBrand) {
      supplierBrandKeys[m13NormBrand_(supObj.rawBrand)] = true;
      supplierBrandKeys[m13NormBrand_(supObj.translatedBrand)] = true;
      m13DS1NoteSupplierBrand_(ds1, supObj.rawBrand, supObj.translatedBrand);
    }

    var status = m13Str_(m13ColVal_(supData[r], supHeaders, ['STATUS']));
    var statusUpper = m13Upper_(status);
    if (!statusUpper) { counts.skippedBlank++; continue; }
    if (statusUpper.indexOf('NOT USED') >= 0 && !M13.INCLUDE_NOT_USED) { counts.skippedNotUsed++; continue; }
    if (statusUpper.indexOf('BEST BUY') < 0 && statusUpper.indexOf('UNMATCHABLE') < 0) { counts.skippedOther++; continue; }

    var posHit = supObj.barcode.valid ? m13FindPosByBarcode_(posBundle.index, supObj.barcode.variants) : null;
    var pos = posHit ? posHit.pos : null;

    // v6.3.69 surgical:
    // Re-resolve discount after matched POS identity is known. This allows
    // SRC_POS_ONGOING_DISCOUNTS POS PLU rules to apply even when supplier
    // sub-id differs. Still applies one discount only through priority order.
    if (pos) {
      var resolvedDisc = m13BestDiscountForSupplier_(supObj, discountRules, pos);
      supObj.discountPct = resolvedDisc.pct || 0;
      supObj.discountSource = resolvedDisc.label || '';
      supObj.discountType = resolvedDisc.type || '';
      supObj.isMemberDiscount = !!resolvedDisc.isMember;
      supObj.effectivePrice = m13EffectivePrice_(supObj.wsp, supObj.discountPrice, supObj.discountPct);
    }

    var statusNote = (supNotes[r] && supNotes[r][0]) ? m13Str_(supNotes[r][0]) : '';

    var kind;
    if (statusUpper.indexOf('UNMATCHABLE') >= 0) kind = 'REVIEW';
    else if (statusUpper.indexOf('NEW') >= 0) kind = 'NEW';
    else kind = 'MATCHED';

    if (kind === 'MATCHED' && !pos) kind = 'REVIEW';
    if (kind === 'MATCHED' && pos) usedPosRows[pos.sheetRow] = true;
    if (kind === 'MATCHED' && pos) m13DS1NoteMatch_(ds1, supObj.rawBrand, supObj.translatedBrand, pos);

    rows.push(m13BuildOneOutRow_(rows.length + 1, kind, supObj, pos, status, statusNote, supplierMap, discountRules, prefixMap, posBundle.brandDissnoMap, findReplaceRules));
    if (kind === 'MATCHED') counts.matched++;
    else if (kind === 'NEW') counts.newRows++;
    else counts.review++;
  }

  if (M13.INCLUDE_DISCONTINUED) {
    var ds1Scope = m13DS1ResolveScope_(ds1, posBundle, supplierBrandKeys);
    for (var p = 0; p < posBundle.rows.length; p++) {
      var posRow = posBundle.rows[p];
      if (!posRow || usedPosRows[posRow.sheetRow]) continue;
      var ds1Link = supplierBrandKeys[posRow.brandKey] ? null : ds1Scope[posRow.brandKey];
      if (!supplierBrandKeys[posRow.brandKey] && !ds1Link) continue;
      if (m13ShouldSkipDiscontinuedPos_(posRow)) continue;
      var discRow = m13BuildDiscontinuedOutRow_(rows.length + 1, posRow, supplierMap, discountRules, prefixMap);
      if (ds1Link) m13DS1AddNote_(discRow, posRow, ds1Link);
      rows.push(discRow);
      counts.discontinued++;
    }
  }

  // v6.3.11: old-script barcode update behaviour.
  // If the fast barcode-first pass produced a NEW supplier row and a DISCONTINUED
  // POS row for the same product/brand, relink them into one MATCHED row with
  // POS MAIN ID = old POS barcode and BARCODE UPDATE = new supplier barcode.
  var relinked = m13ReconcileDiscontinuedNewBarcodeUpdates_(rows);
  if (relinked && relinked.relinkCount) {
    rows = relinked.rows;
    counts.matched += relinked.relinkCount;
    counts.newRows = Math.max(0, counts.newRows - relinked.relinkCount);
    counts.discontinued = Math.max(0, counts.discontinued - relinked.relinkCount);
  }

  // Cross-barcode duplicate guard:
  // If Highlight missed a supplier barcode/sub-id variation and a NEW row is
  // clearly the same brand/product/pack/price as an existing MATCHED row, drop
  // the NEW candidate before OUT_MERGED_DATA is written. POS-is-King means the
  // existing POS row wins; we do not create duplicate INSERT rows for the same item.
  var duplicateGuard = m13RemoveDuplicateNewRowsAlreadyMatched_(rows);
  if (duplicateGuard && (duplicateGuard.removed || duplicateGuard.reviewed)) {
    rows = duplicateGuard.rows;
    if (duplicateGuard.removed) {
      counts.newRows = Math.max(0, counts.newRows - duplicateGuard.removed);
      counts.skippedNotUsed += duplicateGuard.removed;
    }
    if (duplicateGuard.reviewed) {
      counts.newRows = Math.max(0, counts.newRows - duplicateGuard.reviewed);
      counts.review += duplicateGuard.reviewed;
    }
  }

  var descrSafety = m13ApplyDescriptionSafetyReviews_(rows);
  if (descrSafety && descrSafety.reviewed) {
    rows = descrSafety.rows;
    counts = m13RecountOutRows_(rows, counts);
  }

  // v6.3.82 PL1 / v6.3.83 PL2: only rows still genuinely NEW at final merge
  // stage inherit the unique dominant price-level pattern of existing POS products
  // from the same translated/normalised brand. Target RRP is not a prerequisite;
  // existing NEW PRODUCT nominal defaults remain the fallback.
  m13PL1ApplyNewProductBrandPriceLevels_(rows, posBundle.brandPriceLevelMap);

  // ── Sort output: IDENTITY REVIEW → MATCHED → NEW PRODUCT → DISCONTINUED ─
  // Use B / ROW STATUS as the source of truth. Earlier versions accidentally
  // sorted from a shifted POS price-tier column after the AG:AM audit columns
  // were inserted.
  rows.sort(function(a, b) {
    var aKey = m13OutMergedSortRank_(a && a[1]);
    var bKey = m13OutMergedSortRank_(b && b[1]);
    if (aKey !== bKey) return aKey - bKey;
    return m13CleanDiscontinuedBrand_(a && a[7]).localeCompare(m13CleanDiscontinuedBrand_(b && b[7])) || m13Str_(a && a[15]).localeCompare(m13Str_(b && b[15]));
  });
  // Re-index after sort so INDEX column (row[0]) stays sequential.
  for (var si = 0; si < rows.length; si++) rows[si][0] = si + 1;
  // ─────────────────────────────────────────────────────────────────────────

  counts.discontinuedLinked = m13DS1CountLinkedRows_(rows); // v6.3.88: shown in the build message
  return { rows: rows, counts: counts };
}


// =============================================================================
//  v6.3.88 DS1 — DISCONTINUED SCOPE: EVERY POS NAME OF AN UPLOADED BRAND
// =============================================================================
// A POS product is discontinued when its brand is in the supplier upload and no upload row
// matched it. Up to v6.3.87 "in the upload" meant the POS brand key equals a SUP BRAND key
// (raw, or translated by SRC_POS_BRAND_NAME_CHANGES). When POS names the brand differently,
// the rest of that POS brand was left alone, so a new catalogue added products beside the old
// ones. DS1 also counts these POS brands as in the upload:
//   T  the supplier brand cut to the 20-character POS brand field (BIOCEUTICALS CLINICA);
//   W  a POS brand the upload's barcode matches link to, when the two names share a distinctive
//      word or one name starts the other (AUSTRALIAN BUSH FLOW = BUSH FLOWER, BACH = BACH FLOWER
//      REMEDIES, CHINA MED = CHINAMED SUN HERBAL);
//   M  a POS brand with no name in common, when 2+ barcode matches link it and they cover at
//      least half of that POS brand's rows (RESTQ = MARTIN & PLEASANCE).
// Placeholder POS brands (DISCONTINUED, UNKNOWN, BOOK…) are never linked. Only the scope
// changes: SPECIAL ORDER / NO REORDER protection and the discontinued row stay as they were.
function m13DS1NewContext_() { return { truncKeys: {}, links: {} }; }

function m13DS1Compact_(s) { return m13Upper_(s).replace(/^Z{3,}\s*/, '').replace(/[^A-Z0-9]/g, ''); }

function m13DS1NoteSupplierBrand_(ctx, rawBrand, translatedBrand) {
  var width = Number(M13.DS1_POS_BRAND_WIDTH || 20);
  [rawBrand, translatedBrand].forEach(function (b) {
    var s = m13Upper_(b).replace(/\s+/g, ' ');
    if (s.length <= width) return;
    var k = m13NormBrand_(s.slice(0, width).trim());
    if (k && !ctx.truncKeys[k]) ctx.truncKeys[k] = m13Str_(b);
  });
}

function m13DS1NoteMatch_(ctx, supRawBrand, supTranslatedBrand, pos) {
  if (!pos || !pos.brandKey) return;
  var link = ctx.links[pos.brandKey] || (ctx.links[pos.brandKey] = { posBrand: m13Str_(pos.brand || pos.translatedBrand), count: 0, supBrands: {} });
  link.count++;
  [supRawBrand, supTranslatedBrand].forEach(function (b) { b = m13Str_(b); if (b) link.supBrands[b] = (link.supBrands[b] || 0) + 1; });
}

function m13DS1IsPlaceholder_(brand) {
  var c = m13DS1Compact_(brand);
  if (!c) return true;
  var list = M13.DS1_PLACEHOLDER_BRANDS || [];
  for (var i = 0; i < list.length; i++) if (m13DS1Compact_(list[i]) === c) return true;
  return false;
}

function m13DS1Words_(s) {
  var generic = M13.DS1_GENERIC_WORDS || [], out = {};
  m13Upper_(s).replace(/['\u2019`]/g, '').split(/[^A-Z0-9]+/).forEach(function (w) {
    if (w.length >= 3 && generic.indexOf(w) < 0) out[w] = true;
  });
  return out;
}

function m13DS1NamesAgree_(posBrand, supBrand) {
  var a = m13DS1Words_(posBrand), b = m13DS1Words_(supBrand), w;
  for (w in a) if (b[w]) return true;
  var ca = m13DS1Compact_(posBrand), cb = m13DS1Compact_(supBrand);
  var shorter = ca.length <= cb.length ? ca : cb, longer = ca.length <= cb.length ? cb : ca;
  return shorter.length >= 4 && longer.indexOf(shorter) === 0 && (M13.DS1_GENERIC_WORDS || []).indexOf(shorter) < 0;
}

// brandKey → { rule, posBrand, supBrand, count } for POS brands DS1 adds to the discontinued scope.
function m13DS1ResolveScope_(ctx, posBundle, supplierBrandKeys) {
  var scope = {}, posCount = {}, i;
  supplierBrandKeys = supplierBrandKeys || {};
  var rowsAll = (posBundle && posBundle.rows) || [];
  for (i = 0; i < rowsAll.length; i++) { var k = rowsAll[i] && rowsAll[i].brandKey; if (k) posCount[k] = (posCount[k] || 0) + 1; }
  Object.keys(ctx.truncKeys || {}).forEach(function (key) {
    if (!supplierBrandKeys[key]) scope[key] = { rule: 'T', supBrand: ctx.truncKeys[key], count: 0 };
  });
  var minMatches = Number(M13.DS1_MIN_LINK_MATCHES || 2), minShare = Number(M13.DS1_MIN_LINK_SHARE || 0.5);
  Object.keys(ctx.links || {}).forEach(function (key) {
    if (supplierBrandKeys[key] || scope[key]) return;
    var link = ctx.links[key];
    if (m13DS1IsPlaceholder_(link.posBrand)) return;
    var sups = Object.keys(link.supBrands).sort(function (a, b) { return link.supBrands[b] - link.supBrands[a]; });
    var agreeing = sups.filter(function (s) { return m13DS1NamesAgree_(link.posBrand, s); });
    if (agreeing.length) { scope[key] = { rule: 'W', posBrand: link.posBrand, supBrand: agreeing[0], count: link.count }; return; }
    if (link.count >= minMatches && link.count >= minShare * (posCount[key] || 0)) {
      scope[key] = { rule: 'M', posBrand: link.posBrand, supBrand: sups[0] || '', count: link.count };
    }
  });
  return scope;
}

var M13_DS1_NOTE_MARK = 'BRAND LINK:';
function m13DS1AddNote_(row, pos, link) {
  var posBrand = m13Str_(pos.brand || pos.translatedBrand);
  var why = link.rule === 'T'
    ? 'POS BRAND "' + posBrand + '" IS THE 20-CHARACTER POS FORM OF "' + link.supBrand + '" IN THIS UPLOAD.'
    : 'POS BRAND "' + posBrand + '" IS "' + link.supBrand + '" IN THIS UPLOAD (' + link.count + ' BARCODE MATCH' + (link.count === 1 ? '' : 'ES') + ').';
  var ni = M13.HEADERS.indexOf('NOTES'); if (ni < 0) ni = 31;
  row[ni] = m13Str_(row[ni]) + ' ' + M13_DS1_NOTE_MARK + ' ' + why;
}

function m13DS1CountLinkedRows_(rows) {
  var ni = M13.HEADERS.indexOf('NOTES'); if (ni < 0) ni = 31;
  var n = 0;
  for (var i = 0; i < (rows || []).length; i++) {
    var r = rows[i];
    if (r && m13Upper_(r[1]).indexOf('DISCONTINUED') >= 0 && m13Upper_(r[ni]).indexOf(M13_DS1_NOTE_MARK) >= 0) n++;
  }
  return n;
}

function m13DS1DiscontinuedText_(counts) {
  var linked = Number((counts && counts.discontinuedLinked) || 0);
  return m13Fmt_(counts.discontinued) + (linked ? ' (incl. ' + m13Fmt_(linked) + ' by linked POS brand names — see NOTES)' : '');
}

// Filtered-brand build: the scoped TMP read holds only rows of the selected brand names (plus barcode / Sub ID
// hits). Returns the brand scope widened with the DS1 POS brand keys, or null when nothing new is linked.
function m13DS1ExtendFilteredScope_(supplierSource, posBundle, brandMap, brandScope) {
  var ctx = m13DS1NewContext_(), headers = supplierSource.headers || {}, data = supplierSource.data || [];
  var keys = {};
  Object.keys((brandScope && brandScope.keys) || {}).forEach(function (k) { keys[k] = true; });
  for (var r = 0; r < data.length; r++) {
    var rawBrand = m13Str_(m13ColVal_(data[r], headers, ['SUP BRAND', 'BRAND']));
    var translated = m13BE1TranslateSupplierBrand_(rawBrand, brandMap);
    if (rawBrand || translated) m13DS1NoteSupplierBrand_(ctx, rawBrand, translated);
    var st = m13Upper_(m13ColVal_(data[r], headers, ['STATUS']));
    if (!st || st.indexOf('NOT USED') >= 0 || st.indexOf('BEST BUY') < 0 || st.indexOf('UNMATCHABLE') >= 0 || st.indexOf('NEW') >= 0) continue;
    var bc = m13Barcode_(m13Str_(m13ColVal_(data[r], headers, ['SUP BARCODE', 'SUP MASTER BARCODE', 'BARCODE', 'POS MASTER BARCODE'])));
    var hit = bc.valid ? m13FindPosByBarcode_(posBundle.index, bc.variants) : null;
    if (hit && hit.pos) m13DS1NoteMatch_(ctx, rawBrand, translated, hit.pos);
  }
  var scope = m13DS1ResolveScope_(ctx, posBundle, keys);
  var added = Object.keys(scope).filter(function (k) { return !keys[k]; });
  if (!added.length) return null;
  var out = {};
  Object.keys(brandScope).forEach(function (k) { out[k] = brandScope[k]; });
  added.forEach(function (k) { keys[k] = true; });
  out.keys = keys;
  out.ds1Added = added.length;
  return out;
}


function m13ApplyDescriptionSafetyReviews_(rows) {
  // Promote risky supplier/POS description conflicts to IDENTITY REVIEW before
  // sort/index. This avoids silently turning a wrong match into a clean POS file.
  var reviewed = 0;
  for (var i = 0; i < (rows || []).length; i++) {
    var row = rows[i];
    if (!row || m13Upper_(row[1]).indexOf('MATCHED') < 0) continue;

    var posDescr = row[14] || '';
    var outDescr = row[15] || '';
    var supProduct = row[16] || '';
    var check = m13DescriptionSafetyCheck_(supProduct, posDescr, outDescr);
    if (!check.review) continue;

    row[1] = '⚠️ IDENTITY REVIEW';
    row[2] = 'DESCRIPTION REVIEW';
    row[3] = 'REVIEW';
    row[4] = '—';
    row[31] = m13TrimNote_((row[31] ? row[31] + ' | ' : '') + check.note);
    reviewed++;
  }
  return { rows: rows || [], reviewed: reviewed };
}

function m13DescriptionSafetyCheck_(supplierProduct, originalPosDescr, outDescr) {
  var supEx = m13ExtractSizeAndTypeFromText_(supplierProduct || '');
  var posEx = m13ExtractSizeAndTypeFromText_(originalPosDescr || '');
  if (!supEx.size || !posEx.size) return { review: false, note: '' };

  var supWeak = m13SupplierSizeIsWeakBareCount_(supplierProduct, supEx.size);
  if (supWeak) return { review: false, note: '' };

  if (m13SizeValuesConflict_(supEx.size, posEx.size)) {
    return {
      review: true,
      note: 'DESCRIPTION REVIEW: supplier size/type appears to conflict with ORIGINAL POS DESCR. POS O="' +
        m13ShortNote_(originalPosDescr, 80) + '" | SUP Q="' + m13ShortNote_(supplierProduct, 80) + '" | P="' + m13ShortNote_(outDescr, 80) + '"'
    };
  }
  return { review: false, note: '' };
}

function m13SizeValuesConflict_(a, b) {
  var pa = m13SizeParts_(a);
  var pb = m13SizeParts_(b);
  if (!pa.n || !pb.n) return false;
  if (m13SizesEquivalent_(pa, pb)) return false;
  var va = m13ComparablePackValue_(pa);
  var vb = m13ComparablePackValue_(pb);
  if (va.kind && vb.kind && va.kind === vb.kind) return Math.abs(va.value - vb.value) > 0.0001;
  // Cross-unit conflicts such as 75ML vs 97.5G are still suspicious for an existing matched row.
  if (pa.unit && pb.unit && pa.unit !== pb.unit) return true;
  return Math.abs(pa.n - pb.n) > 0.0001;
}

function m13ComparablePackValue_(parts) {
  var unit = m13NormExtractUnit_((parts && parts.unit) || '');
  var n = Number((parts && parts.n) || 0);
  if (!(n > 0)) return { kind: '', value: 0 };
  if (unit === 'KG') return { kind: 'WEIGHT', value: n * 1000 };
  if (unit === 'G') return { kind: 'WEIGHT', value: n };
  if (unit === 'LT' || unit === 'L') return { kind: 'VOLUME', value: n * 1000 };
  if (unit === 'ML') return { kind: 'VOLUME', value: n };
  if (unit === 'C' || unit === 'VC' || unit === 'SG' || unit === 'T' || unit === 'LOZ') return { kind: 'COUNT', value: n };
  return { kind: unit || '', value: n };
}

function m13ShortNote_(value, maxLen) {
  var s = m13Str_(value).replace(/\s+/g, ' ').trim();
  maxLen = Number(maxLen || 80);
  return s.length > maxLen ? s.slice(0, maxLen - 1) + '…' : s;
}

function m13RecountOutRows_(rows, counts) {
  var out = { matched: 0, newRows: 0, review: 0, discontinued: 0, skippedNotUsed: 0, skippedBlank: 0, skippedOther: 0 };
  counts = counts || {};
  out.skippedNotUsed = Number(counts.skippedNotUsed || 0);
  out.skippedBlank = Number(counts.skippedBlank || 0);
  out.skippedOther = Number(counts.skippedOther || 0);
  for (var i = 0; i < (rows || []).length; i++) {
    var status = m13Upper_(rows[i] && rows[i][1]);
    if (status.indexOf('DISCONTINUED') >= 0) out.discontinued++;
    else if (status.indexOf('NEW') >= 0) out.newRows++;
    else if (status.indexOf('MATCHED') >= 0) out.matched++;
    else if (status.indexOf('REVIEW') >= 0) out.review++;
  }
  return out;
}

function m13RemoveDuplicateNewRowsAlreadyMatched_(rows) {
  if (!rows || !rows.length) return { rows: rows || [], removed: 0, reviewed: 0 };

  var matched = [];
  var matchedByBrand = {};
  for (var i = 0; i < rows.length; i++) {
    if (m13Upper_(rows[i] && rows[i][1]).indexOf('MATCHED') >= 0) {
      var matchedRow = rows[i];
      matched.push(matchedRow);
      var matchedBrandKey = m13FM1OutBrandKey_(matchedRow);
      if (matchedBrandKey) {
        if (!matchedByBrand[matchedBrandKey]) matchedByBrand[matchedBrandKey] = [];
        matchedByBrand[matchedBrandKey].push(matchedRow);
      }
    }
  }
  if (!matched.length) return { rows: rows, removed: 0, reviewed: 0 };

  var out = [];
  var removed = 0;
  var reviewed = 0;
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    if (m13Upper_(row && row[1]).indexOf('NEW') >= 0) {
      var newBrandKey = m13FM1OutBrandKey_(row);
      // m13OutRowsLookLikeSameProduct_ already requires exact normalised-brand
      // equality. Restricting its candidates to that exact brand lane therefore
      // preserves every acceptance/review/removal rule and the original row order.
      var matchedCandidates = newBrandKey ? (matchedByBrand[newBrandKey] || []) : matched;
      var dup = m13FindMatchedDuplicateForNewRow_(row, matchedCandidates);
      if (dup) {
        var reviewReason = m13DuplicateOutReviewReason_(row, dup);
        if (reviewReason) {
          row[1] = '⚠️ IDENTITY REVIEW';
          row[2] = 'DUPLICATE REVIEW';
          row[31] = 'DUPLICATE REVIEW: similar brand/product/pack already MATCHED, but ' + reviewReason +
            ' Not auto-removed as NOT USED because this could hide a barcode/sub-id/price correction.';
          reviewed++;
          out.push(row);
          continue;
        }
        removed++;
        continue;
      }
    }
    out.push(row);
  }
  return { rows: out, removed: removed, reviewed: reviewed };
}

function m13FindMatchedDuplicateForNewRow_(newRow, matchedRows) {
  for (var i = 0; i < matchedRows.length; i++) {
    if (m13OutRowsLookLikeSameProduct_(newRow, matchedRows[i])) return matchedRows[i];
  }
  return null;
}

function m13NewRowDuplicatesMatchedRow_(newRow, matchedRows) {
  return !!m13FindMatchedDuplicateForNewRow_(newRow, matchedRows);
}

function m13OutRowsLookLikeSameProduct_(a, b) {
  if (!a || !b) return false;

  var brandA = m13NormBrand_(a[7] || a[8] || a[34] || a[44] || '');
  var brandB = m13NormBrand_(b[7] || b[8] || b[34] || b[44] || '');
  if (!brandA || !brandB || brandA !== brandB) return false;

  var keyA = m13DuplicateOutProductKey_(a);
  var keyB = m13DuplicateOutProductKey_(b);
  if (!keyA.name || !keyB.name) return false;

  // Variant-safe duplicate rule. OUT second-pass protection must be stricter
  // than normal product matching, otherwise legitimate flavour/size/form
  // variants get converted into review rows or removed.
  if (!m13DuplicatePackCompatible_(keyA.pack, keyB.pack)) return false;
  return m13DuplicateNameCompatible_(keyA.name, keyB.name);
}

function m13DuplicateNameCompatible_(nameA, nameB) {
  nameA = m13DuplicateNameNormalise_(nameA);
  nameB = m13DuplicateNameNormalise_(nameB);
  if (!nameA || !nameB) return false;
  if (nameA === nameB) return true;

  var toksA = m13DuplicateNameTokens_(nameA);
  var toksB = m13DuplicateNameTokens_(nameB);
  if (!toksA.length || !toksB.length) return false;

  var keyA = toksA.join(' ');
  var keyB = toksB.join(' ');
  if (keyA === keyB) return true;

  if (m13DuplicateHasMeaningfulTokenDifference_(toksA, toksB)) return false;
  return m13Dice_(keyA, keyB) >= 0.96;
}

function m13DuplicateNameNormalise_(s) {
  s = m13Upper_(s || '');
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

function m13DuplicateNameTokens_(s) {
  s = m13DuplicateNameNormalise_(s);
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

function m13DuplicateHasMeaningfulTokenDifference_(toksA, toksB) {
  var a = {}, b = {}, i;
  for (i = 0; i < toksA.length; i++) a[toksA[i]] = true;
  for (i = 0; i < toksB.length; i++) b[toksB[i]] = true;
  for (i = 0; i < toksA.length; i++) if (!b[toksA[i]]) return true;
  for (i = 0; i < toksB.length; i++) if (!a[toksB[i]]) return true;
  return false;
}

function m13DuplicateOutReviewReason_(newRow, matchedRow) {
  var sameSupplier = m13DuplicateOutSameSupplier_(newRow, matchedRow);
  var sameBarcode = m13DuplicateOutBarcodeEquivalent_(newRow, matchedRow);
  var sameSubId = m13DuplicateOutSubIdEquivalent_(newRow, matchedRow);
  var priceClose = m13OutRowPriceClose_(newRow, matchedRow);

  if (sameSupplier && (!sameBarcode || !sameSubId)) {
    return 'same supplier has different barcode/sub-id identity ' +
      '(new barcode ' + (newRow[10] || newRow[41] || '—') + ', sub-id ' + (newRow[13] || newRow[43] || '—') +
      ' vs matched barcode ' + (matchedRow[10] || matchedRow[41] || '—') + ', sub-id ' + (matchedRow[13] || matchedRow[43] || '—') + ').';
  }

  if (!priceClose) {
    return 'WSP/RRP differs ' +
      '(new ' + m13MoneyForNote_(newRow[18]) + '/' + m13MoneyForNote_(newRow[26]) +
      ' vs matched ' + m13MoneyForNote_(matchedRow[18]) + '/' + m13MoneyForNote_(matchedRow[26]) + ').';
  }

  return '';
}

function m13DuplicateOutSameSupplier_(a, b) {
  var as = m13NormId_(a && (a[49] || a[5] || a[6]) || '');
  var bs = m13NormId_(b && (b[49] || b[5] || b[6]) || '');
  return !!(as && bs && as === bs);
}

function m13DuplicateOutBarcodeEquivalent_(a, b) {
  var av = m13DuplicateBarcodeVariants_(a && (a[10] || a[41]) || '');
  var bv = m13DuplicateBarcodeVariants_(b && (b[10] || b[41]) || '');
  if (!av.length || !bv.length) return false;
  var map = {};
  for (var i = 0; i < av.length; i++) if (av[i]) map[m13NormId_(av[i])] = true;
  for (var j = 0; j < bv.length; j++) if (bv[j] && map[m13NormId_(bv[j])]) return true;
  return false;
}

function m13DuplicateBarcodeVariants_(raw) {
  try {
    var bc = m13Barcode_(raw);
    if (bc && bc.variants && bc.variants.length) return bc.variants;
    if (bc && bc.canonical) return [bc.canonical];
  } catch(e) {}
  var s = m13NormId_(raw || '');
  return s ? [s] : [];
}

function m13DuplicateOutSubIdEquivalent_(a, b) {
  var as = m13NormId_(a && (a[13] || a[43]) || '');
  var bs = m13NormId_(b && (b[13] || b[43]) || '');
  return !!(as && bs && as === bs);
}

function m13MoneyForNote_(v) {
  var n = m13Num_(v);
  return n ? ('$' + n.toFixed(2)) : '$0.00';
}

function m13DuplicateOutProductKey_(row) {
  var brand = m13Upper_(row[7] || row[8] || row[34] || row[44] || '');
  var product = m13Upper_(row[16] || row[15] || row[45] || '');
  product = product.replace(/[™®©]/g, ' ');
  if (brand) product = product.replace(new RegExp('^' + m13EscReg_(brand) + '\\b\\s*', 'i'), '');
  product = product.replace(/^(BC|BIOC|BIOCEUTICALS|BIO CEUTICALS)\b\s*/i, '');

  var pack = m13DuplicatePackKey_(product);
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

function m13DuplicatePackKey_(s) {
  s = m13Upper_(s).replace(/V\s*CAPS?/g, 'VC').replace(/TABLETS?/g, 'T').replace(/TABS?/g, 'T').replace(/CAPSULES?/g, 'C').replace(/CAPS?/g, 'C');
  var m = s.match(/\b(\d+(?:\.\d+)?)\s*(VC|C|T|ML|LT|L|G|GM|KG|MG|MCG|IU)\b/);
  if (m) return String(parseFloat(m[1])) + m13DuplicatePackUnit_(m[2]);
  m = s.match(/\((\d+(?:\.\d+)?)\)/);
  if (m) return String(parseFloat(m[1]));
  m = s.match(/\b(\d{1,5})\b/);
  return m ? String(parseFloat(m[1])) : '';
}


function m13DuplicatePackUnit_(unit) {
  unit = m13Upper_(unit).replace(/\s+/g, '');
  if (unit === 'GM') return 'G';
  if (unit === 'LTR' || unit === 'LITRE' || unit === 'L') return 'LT';
  if (unit === 'VCAPS' || unit === 'VCAP' || unit === 'V-CAPS') return 'VC';
  return unit;
}

function m13DuplicatePackParts_(pack) {
  pack = m13Upper_(pack).replace(/\s+/g, '');
  if (!pack) return { n: 0, unit: '' };
  var m = pack.match(/^(\d+(?:\.\d+)?)([A-Z]+)?$/);
  if (!m) return { n: 0, unit: '' };
  return { n: Number(m[1] || 0), unit: m13DuplicatePackUnit_(m[2] || '') };
}

function m13DuplicatePackCompatible_(packA, packB) {
  var a = m13DuplicatePackParts_(packA);
  var b = m13DuplicatePackParts_(packB);
  if (!a.n || !b.n) return false;
  if (Math.abs(a.n - b.n) > 0.0001) return false;
  if (!a.unit || !b.unit) return true; // e.g. "120T" vs "(120)"
  if (a.unit === b.unit) return true;
  if ((a.unit === 'VC' && b.unit === 'C') || (a.unit === 'C' && b.unit === 'VC')) return true;
  return false;
}

function m13OutRowPriceClose_(a, b) {
  var aw = m13Num_(a[18]), bw = m13Num_(b[18]); // NEW WSP EXGST
  var ar = m13Num_(a[26]), br = m13Num_(b[26]); // NEW RRP
  var wspOk = aw > 0 && bw > 0 && Math.abs(aw - bw) <= 0.02;
  var rrpOk = ar > 0 && br > 0 && Math.abs(ar - br) <= 0.05;
  return wspOk && rrpOk;
}

function m13OutMergedSortRank_(status) {
  var s = m13Upper_(status);
  if (s.indexOf('REVIEW') >= 0) return 0;
  if (s.indexOf('MATCHED') >= 0) return 1;
  if (s.indexOf('NEW') >= 0) return 2;
  if (s.indexOf('DISCONTINUED') >= 0) return 3;
  return 99;
}


function m13SrcStatusKey_(v) {
  return m13NormText_(v || '').replace(/[^A-Z0-9]+/g, ' ').trim();
}

function m13SrcAddKey_(set, v) {
  var raw = m13Str_(v);
  if (!raw) return;
  set[m13Upper_(raw)] = true;
  set[m13NormBrand_(raw)] = true;
  set[m13SrcStatusKey_(raw)] = true;
}

function m13SrcHasKey_(set, v) {
  var raw = m13Str_(v);
  if (!raw || !set) return false;
  return !!(set[m13Upper_(raw)] || set[m13NormBrand_(raw)] || set[m13SrcStatusKey_(raw)]);
}

function m13SrcIsActiveOutRow_(row) {
  var s = m13Upper_(row && row.length > 1 ? row[1] : '');
  if (!s) return false;
  return s.indexOf('DISCONTINUED') < 0;
}

function m13BuildCurrentRunSrcContext_(ctx) {
  ctx = ctx || {};
  var out = {
    supplierNums: {},
    supplierBrands: {},
    activePosBrands: {},
    activeSupBrands: {},
    activeText: []
  };

  var supRows = ctx.supData || [];
  var supHeaders = ctx.supHeaders || {};
  for (var s = 0; s < supRows.length; s++) {
    var sr = supRows[s] || [];
    var supNum = m13Str_(m13ColVal_(sr, supHeaders, ['POS SUPPLIER NUMBER', 'SUPPLIER NUMBER', 'SUPPLIER NO', 'SUPPLIER']));
    if (!supNum && sr.length > 2) supNum = m13Str_(sr[2]); // supplier sheet col C fallback
    if (supNum) out.supplierNums[m13NormId_(supNum)] = true;

    var supBrand = m13Str_(m13ColVal_(sr, supHeaders, ['SUP BRAND', 'BRAND', 'SUPPLIER BRAND']));
    if (!supBrand && sr.length > 4) supBrand = m13Str_(sr[4]); // supplier sheet col E fallback
    m13SrcAddKey_(out.supplierBrands, supBrand);
  }

  var builtRows = (ctx.built && ctx.built.rows) ? ctx.built.rows : [];
  for (var r = 0; r < builtRows.length; r++) {
    var row = builtRows[r] || [];
    if (!m13SrcIsActiveOutRow_(row)) continue;

    m13SrcAddKey_(out.activePosBrands, row[7]); // H / POS BRAND
    m13SrcAddKey_(out.activeSupBrands, row[8]); // I / SUP BRAND

    // Current-run description sources only. Do not use TMP indexing side-effects.
    var o = m13Str_(row[14]); // O / ORIGINAL POS DESCR
    var p = m13Str_(row[15]); // P / POS DESCR
    var q = m13Str_(row[16]); // Q / SUP PRODUCT
    if (o) out.activeText.push(o);
    if (p) out.activeText.push(p);
    if (q) out.activeText.push(q);
  }

  return out;
}

function m13CurrentRunFindRuleUsed_(rule, runCtx) {
  if (!rule || !rule.find || !runCtx || !runCtx.activeText) return false;
  var find = m13Str_(rule.find).toUpperCase();
  if (!find) return false;
  var re;
  try {
    var pat = m13WholeTokenPattern_(find);
    re = new RegExp(pat.pattern, 'g');
  } catch(e) { return false; }

  for (var i = 0; i < runCtx.activeText.length; i++) {
    var txt = m13Str_(runCtx.activeText[i]).toUpperCase();
    if (!txt) continue;
    re.lastIndex = 0;
    if (re.test(txt)) return true;
  }
  return false;
}

function m13SrcDiscountStatusLabel_(r) {
  if (!r || (!r.__used && !r.__usedMember)) return '';
  var label = r.type || 'DISCOUNT';
  if      (label === 'PLU')              label = 'PLU';
  else if (label === 'BARCODE')          label = 'BARCODE';
  else if (label === 'SUPPLIER + BRAND') label = 'BRAND+SUP';
  else if (label === 'BRAND')            label = 'BRAND';
  else if (label === 'SUPPLIER (POS)')   label = 'SUPPLIER';
  else if (label === 'PRODUCT')          label = 'DESCR';

  // POS MEMBER in SRC_POS_ONGOING_DISCOUNTS means the applied rule contributes
  // member pricing/tier behaviour. Older status text only showed / MEMBER when
  // the rule was used solely as the member detector, which made many active
  // member discount rows look like ordinary applied discounts.
  var member = !!(r.__usedMember || (r.__used && r.isMember));
  return label + ' APPLIED' + (member ? ' / MEMBER' : '');
}

function m13StampSrcStatuses_(ss, ctx) {
  ctx = ctx || {};
  var runCtx = m13BuildCurrentRunSrcContext_(ctx);

  // SRC_POS_FIND_REPLACE: current-run description use only.
  // Do not use rule.__used because TMP_MERGED_POS_DATA indexing can touch every
  // POS row and falsely mark old/history-only cleanup rules as USED.
  m13StampSrcStatusFromRows_(ss, CFG.SH.SRC_FR || 'SRC_POS_FIND_REPLACE', 4, function(sheetRow) {
    var rules = ctx.findReplaceRules || [];
    for (var i = 0; i < rules.length; i++) {
      if (rules[i].sheetRow === sheetRow) return m13CurrentRunFindRuleUsed_(rules[i], runCtx);
    }
    return false;
  });

  // SRC_POS_BRAND_NAME_CHANGES: current supplier upload + active OUT rows only.
  // This prevents every old TMP/POS brand translation from appearing as USED.
  m13StampSrcStatusFromRows_(ss, CFG.SH.SRC_BRANDS || 'SRC_POS_BRAND_NAME_CHANGES', 4, function(sheetRow, rowVals, headers) {
    var supBrand = m13Str_(m13ColVal_(rowVals, headers, ['SUP BRAND', 'SUPPLIER BRAND', 'BRAND FROM', 'FROM']));
    if (!supBrand) supBrand = m13Str_(rowVals[1]);
    var posBrand = m13Str_(m13ColVal_(rowVals, headers, ['POS BRAND', 'BRAND TO', 'TO']));
    if (!posBrand) posBrand = m13Str_(rowVals[2]);

    var seenInSupplier = m13SrcHasKey_(runCtx.supplierBrands, supBrand);
    var seenInActiveOut = m13SrcHasKey_(runCtx.activePosBrands, posBrand) || m13SrcHasKey_(runCtx.activeSupBrands, supBrand);
    return !!(seenInSupplier && seenInActiveOut);
  });

  // SRC_POS_PRODUCT_PREFIX: active OUT rows only. Discontinued POS-history rows
  // do not make a prefix row USED because no new/updated POS description is built from them.
  m13StampSrcStatusFromRows_(ss, CFG.SH.SRC_PREFIX || 'SRC_POS_PRODUCT_PREFIX', 5, function(sheetRow, rowVals, headers) {
    var brand = m13Str_(m13ColVal_(rowVals, headers, ['POS BRAND', 'BRAND']));
    if (!brand) brand = m13Str_(rowVals[1]);
    return m13SrcHasKey_(runCtx.activePosBrands, brand);
  });

  // SRC_POS_ONGOING_DISCOUNTS col K: current supplier/output calculations only.
  // Shows the rule type that actually won/applied, plus / MEMBER whenever the
  // applied row has POS MEMBER truthy.
  m13StampSrcStatusFromRows_(ss, CFG.SH.SRC_DISC || 'SRC_POS_ONGOING_DISCOUNTS', 11, function(sheetRow) {
    var list = ctx.discountRules && ctx.discountRules.__list ? ctx.discountRules.__list : [];
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (r.sheetRow !== sheetRow) continue;
      return m13SrcDiscountStatusLabel_(r);
    }
    return '';
  });

  // SRC_POS_SUPPLIERS col D: current supplier upload only.
  // Preserve explicit block/exclude statuses; otherwise mark only suppliers
  // appearing in IN_SUPPLIER_/_PRODUCT_UPDATES as USED.
  m13StampSrcStatusFromRows_(ss, CFG.SH.SRC_SUPP || 'SRC_POS_SUPPLIERS', 4, function(sheetRow, rowVals, headers) {
    var acc = m13Str_(m13ColVal_(rowVals, headers, ['POS ACCNO', 'ACCNO', 'POS SUPPLIER NUMBER', 'SUPPLIER NUMBER', 'SUPPLIER NO']));
    if (!acc) acc = m13Str_(rowVals[1]);
    var existingStatus = m13Upper_(m13ColVal_(rowVals, headers, ['SRC STATUS', 'STATUS', 'POS STATUS']));
    if (!existingStatus) existingStatus = m13Upper_(rowVals[3]);
    if (m13IsBlockedSupplierStatus_(existingStatus)) return existingStatus;
    return !!runCtx.supplierNums[m13NormId_(acc)];
  });
}

// Updated to support returning a descriptive string instead of just 'USED'
function m13StampSrcStatusFromRows_(ss, sheetName, statusCol, valueFn) {
  var sh = m13Sheet_(ss, sheetName, false);
  if (!sh || sh.getLastRow() < M13.DATA_ROW || statusCol < 1) return 0;
  var n = sh.getLastRow() - M13.DATA_ROW + 1;
  var lastCol = Math.max(sh.getLastColumn(), statusCol);
  if (sh.getMaxColumns() < statusCol) sh.insertColumnsAfter(sh.getMaxColumns(), statusCol - sh.getMaxColumns());
  var headers = m13HeaderMap_(sh, M13.HEADER_ROW);
  var data = sh.getRange(M13.DATA_ROW, 1, n, lastCol).getDisplayValues();
  var vals = new Array(n);
  var used = 0;
  for (var i = 0; i < n; i++) {
    var sheetRow = M13.DATA_ROW + i;
    var result = '';
    try { result = valueFn(sheetRow, data[i], headers) || ''; } catch(e) { result = ''; }
    // Support boolean true → 'USED' for all non-discount sheets
    if (result === true) result = 'USED';
    else if (result === false) result = '';
    vals[i] = [result];
    if (result) used++;
  }
  var rng = sh.getRange(M13.DATA_ROW, statusCol, n, 1);
  rng.setValues(vals)
    .setFontColor('#9aa0a6')
    .setFontStyle('italic')
    .setFontWeight('normal')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setNumberFormat('@');
  try { rng.clearNote(); } catch(eNote) {}
  return used;
}

function m13ReconcileDiscontinuedNewBarcodeUpdates_(rows) {
  rows = rows || [];

  var C_STATUS     = 1;
  var C_PRICE      = 2;
  var C_METHOD     = 3;
  var C_CONF       = 4;
  var C_UPDSUP     = 6;
  var C_POSBRAND   = 7;
  var C_SUPBRAND   = 8;
  var C_OLDBRAND   = 9;
  var C_MAINID     = 10; // POS MAIN ID / old barcode
  var C_BCUPDATE   = 11; // new barcode
  var C_POSPLU     = 12;
  var C_POSSUBID   = 13;
  var C_ORIGDESCR  = 14;
  var C_POSDESCR   = 15;
  var C_SUPPRODUCT = 16;
  var C_CURWSP     = 17;
  var C_NEWWSP     = 18;
  var C_WSPPCT     = 19;
  var C_WSPDIFF    = 20;
  var C_CURLAST    = 21;
  var C_NEWLAST    = 22;
  var C_LASTPCT    = 23;
  var C_LASTDIFF   = 24;
  var C_CURRRP     = 25;
  var C_NEWRRP     = 26;
  var C_HASGST     = 27;
  var C_AC_MARKUP  = 28;
  var C_AD_MARKUP  = 29;
  var C_AE_MARKUP  = 30;
  var C_NOTES      = 31;
  var C_AUDIT_BC    = 32;
  var C_AUDIT_SUBID = 33;
  var C_AUDIT_BRAND = 34;
  var C_AUDIT_WSP   = 35;
  var C_AUDIT_TEXT  = 36;
  var C_AUDIT_SIZE  = 37;
  var C_AUDIT_TYPE  = 38;
  var C_OUT_MAINID = 41;
  var C_OUT_PLU    = 42;
  var C_OUT_SUBID  = 43;
  var C_OUT_BRAND  = 44;
  var C_OUT_DESCR  = 45;
  var C_OUT_POSDESC = 46;
  var C_OUT_SUPPLIER = 49;
  var C_RAWSTATUS  = 72;

  var discIdxs = [];
  var newIdxs = [];

  for (var i = 0; i < rows.length; i++) {
    var r = rows[i] || [];
    var status = m13RelinkStatusKey_(r[C_RAWSTATUS] || r[C_STATUS]);
    if (status === 'DISCONTINUED') discIdxs.push(i);
    else if (status === 'NEW') newIdxs.push(i);
  }

  if (!discIdxs.length || !newIdxs.length) return { rows: rows, relinkCount: 0 };

  // m13RelinkBrandsMatch_ accepts only the same 20-character relink brand lane.
  // Pre-bucket NEW row indexes by that exact lane while preserving original order.
  var newIdxsByBrandLane = {};
  for (var nb = 0; nb < newIdxs.length; nb++) {
    var bucketNewIdx = newIdxs[nb];
    var bucketNewRow = rows[bucketNewIdx] || [];
    var bucketBrand = bucketNewRow[C_SUPBRAND] || bucketNewRow[C_POSBRAND] || bucketNewRow[C_OUT_BRAND];
    var bucketKey = m13FM1RelinkLaneKey_(bucketBrand);
    if (!bucketKey) continue;
    if (!newIdxsByBrandLane[bucketKey]) newIdxsByBrandLane[bucketKey] = [];
    newIdxsByBrandLane[bucketKey].push(bucketNewIdx);
  }

  var dropNewIdxs = {};
  var relinkCount = 0;

  for (var d = 0; d < discIdxs.length; d++) {
    var di = discIdxs[d];
    var disc = rows[di];
    var dBrand = m13RelinkBrandKey_(disc[C_SUPBRAND] || disc[C_POSBRAND] || disc[C_OUT_BRAND]);
    var dDescr = m13RelinkCleanDescr_(disc[C_ORIGDESCR] || disc[C_POSDESCR] || disc[C_OUT_DESCR]);
    if (!dBrand || !dDescr) continue;

    var bestIdx = -1;
    var bestScore = -1;
    var bestPack = false;

    var candidateNewIdxs = newIdxsByBrandLane[m13FM1RelinkLaneKey_(dBrand)] || [];
    for (var n = 0; n < candidateNewIdxs.length; n++) {
      var ni = candidateNewIdxs[n];
      if (dropNewIdxs[ni]) continue;
      var newRow = rows[ni];
      var nBrand = m13RelinkBrandKey_(newRow[C_SUPBRAND] || newRow[C_POSBRAND] || newRow[C_OUT_BRAND]);
      if (!m13RelinkBrandsMatch_(dBrand, nBrand)) continue;

      var nDescr = m13RelinkCleanDescr_(newRow[C_SUPPRODUCT] || newRow[C_POSDESCR] || newRow[C_OUT_DESCR]);
      if (!nDescr) continue;

      var score = m13Dice_(dDescr, nDescr);
      var dPack = m13RelinkPackSignature_(dDescr);
      var nPack = m13RelinkPackSignature_(nDescr);
      var packMatch = !!(dPack && nPack && dPack === nPack);

      // Same brand is mandatory. Accept either a strong text match, or a moderate
      // text match where the pack/size also agrees. This mirrors the old long
      // script's DISC+NEW barcode relink intent without reopening broad fuzzy matching.
      var acceptable = (score >= 0.68) || (packMatch && score >= 0.52);
      if (!acceptable) continue;

      var rank = score + (packMatch ? 0.15 : 0);
      if (rank > bestScore) {
        bestScore = rank;
        bestIdx = ni;
        bestPack = packMatch;
      }
    }

    if (bestIdx < 0) continue;

    var newMatch = rows[bestIdx];
    var oldBarcode = m13Str_(disc[C_MAINID] || disc[C_OUT_MAINID]);
    var newBarcodeRaw = m13Str_(newMatch[C_OUT_MAINID] || newMatch[C_MAINID] || newMatch[C_BCUPDATE]);
    var newBarcode = posKingOutputBarcode_(newBarcodeRaw, newBarcodeRaw);
    if (!oldBarcode || !newBarcode) continue;

    // Do not create a barcode update for formatting-only differences.
    if (posKingBarcodeSetsIntersect_(posKingBarcodeKeySet_(oldBarcode), posKingBarcodeKeySet_(newBarcode))) continue;

    var relinkRow = disc.slice();

    var oldBrandForRelink = m13CleanDiscontinuedBrand_(disc[C_POSBRAND] || disc[C_OUT_BRAND] || '');
    var updatedBrandForRelink = m13Str_(newMatch[C_OUT_BRAND] || newMatch[C_POSBRAND] || newMatch[C_SUPBRAND] || oldBrandForRelink);
    var relinkOldBrandValue = '';
    if (oldBrandForRelink && updatedBrandForRelink && m13NormBrand_(oldBrandForRelink) !== m13NormBrand_(updatedBrandForRelink) &&
        !m13BE1BrandsEquivalent_(oldBrandForRelink, updatedBrandForRelink)) { // v6.3.89 BE1: shortened = same brand
      relinkOldBrandValue = oldBrandForRelink;
    }

    relinkRow[C_STATUS] = '✅ MATCHED';
    relinkRow[C_PRICE] = 'BARCODE UPDATE';
    relinkRow[C_METHOD] = 'P6-BARCODE-RELINK';
    relinkRow[C_CONF] = Math.round(Math.max(0, Math.min(1, bestScore)) * 100) + '%';
    relinkRow[C_UPDSUP] = newMatch[C_UPDSUP] || relinkRow[C_UPDSUP];
    relinkRow[C_POSBRAND] = updatedBrandForRelink;
    relinkRow[C_SUPBRAND] = newMatch[C_SUPBRAND] || relinkRow[C_SUPBRAND];
    relinkRow[C_OLDBRAND] = relinkOldBrandValue;
    relinkRow[C_BCUPDATE] = newBarcode;
    var relinkSupplierSubId = newMatch[C_POSSUBID] || newMatch[C_OUT_SUBID] || '';
    relinkRow[C_POSSUBID] = m13SubIdWithPlu_(relinkSupplierSubId || (m13IsDiscontinuedSubId_(relinkRow[C_POSSUBID]) ? '' : relinkRow[C_POSSUBID]), disc[C_POSPLU] || disc[C_OUT_PLU] || '');
    relinkRow[C_POSDESCR] = newMatch[C_POSDESCR] || newMatch[C_SUPPRODUCT] || relinkRow[C_POSDESCR];
    relinkRow[C_SUPPRODUCT] = newMatch[C_SUPPRODUCT] || relinkRow[C_SUPPRODUCT];
    for (var ac = C_AUDIT_BC; ac <= C_AUDIT_TYPE; ac++) {
      if (newMatch[ac] !== undefined && newMatch[ac] !== '') relinkRow[ac] = newMatch[ac];
    }

    // POS-is-king: K and AN keep the existing POS barcode.
    // L is the only place the new supplier barcode is shown for review/update.
    relinkRow[C_MAINID] = oldBarcode;
    relinkRow[C_OUT_MAINID] = oldBarcode;
    relinkRow[C_OUT_PLU] = disc[C_POSPLU] || disc[C_OUT_PLU] || '';
    relinkRow[C_OUT_SUBID] = m13SubIdWithPlu_(relinkSupplierSubId || (m13IsDiscontinuedSubId_(relinkRow[C_OUT_SUBID]) ? '' : relinkRow[C_OUT_SUBID]), disc[C_POSPLU] || disc[C_OUT_PLU] || '');
    relinkRow[C_OUT_BRAND] = newMatch[C_OUT_BRAND] || newMatch[C_SUPBRAND] || relinkRow[C_OUT_BRAND];
    relinkRow[C_OUT_DESCR] = newMatch[C_OUT_DESCR] || newMatch[C_POSDESCR] || relinkRow[C_OUT_DESCR];
    relinkRow[C_OUT_POSDESC] = newMatch[C_OUT_POSDESC] || relinkRow[C_OUT_POSDESC];
    relinkRow[C_OUT_SUPPLIER] = newMatch[C_OUT_SUPPLIER] || relinkRow[C_OUT_SUPPLIER];

    // Supplier/current price fields: keep current POS baseline from the discontinued row,
    // copy the supplier's new values from the NEW row, then recalc change columns.
    relinkRow[C_NEWWSP] = newMatch[C_NEWWSP] || relinkRow[C_NEWWSP];
    relinkRow[C_NEWLAST] = newMatch[C_NEWLAST] || relinkRow[C_NEWLAST];
    relinkRow[C_NEWRRP] = newMatch[C_NEWRRP] || relinkRow[C_NEWRRP];
    m13RelinkRecalcPriceChange_(relinkRow, C_CURWSP, C_NEWWSP, C_WSPPCT, C_WSPDIFF);
    m13RelinkRecalcPriceChange_(relinkRow, C_CURLAST, C_NEWLAST, C_LASTPCT, C_LASTDIFF);

    var relinkGstPct = m13Upper_(relinkRow[C_HASGST]) === 'YES' ? 10 : m13GstPct_(relinkRow[C_HASGST]);
    var relinkCurWsp = m13Num_(relinkRow[C_CURWSP]);
    var relinkNewWsp = m13Num_(relinkRow[C_NEWWSP]);
    var relinkCurLast = m13Num_(relinkRow[C_CURLAST]);
    var relinkNewLast = m13Num_(relinkRow[C_NEWLAST]);
    var relinkCurRrp = m13Num_(relinkRow[C_CURRRP]);
    var relinkNewRrp = m13Num_(relinkRow[C_NEWRRP]);
    relinkRow[C_AC_MARKUP] = m13MarkupDisplay_(relinkCurWsp, relinkCurLast, relinkCurRrp, relinkGstPct, false, 'CUR');
    relinkRow[C_AD_MARKUP] = m13MarkupPctDisplay_(relinkNewWsp, relinkNewLast, relinkNewRrp, relinkGstPct);
    relinkRow[C_AE_MARKUP] = m13MaintainingMarkupDisplay_(relinkNewWsp, relinkNewLast, relinkNewRrp, relinkGstPct);

    // Copy supplier-driven export values from NEW row, while preserving POS PLU above.
    for (var ec = 50; ec <= 66; ec++) {
      if (newMatch[ec] !== undefined && newMatch[ec] !== '') relinkRow[ec] = newMatch[ec];
    }
    for (var ec2 = 67; ec2 <= 70; ec2++) {
      if (newMatch[ec2] !== undefined && newMatch[ec2] !== '') relinkRow[ec2] = newMatch[ec2];
    }

    relinkRow[C_RAWSTATUS] = 'MATCHED';
    relinkRow[C_NOTES] = m13TrimNote_(
      m13Str_(relinkRow[C_NOTES]) +
      (m13Str_(relinkRow[C_NOTES]) ? ' | ' : '') +
      'BARCODE RELINK: old POS barcode ' + oldBarcode + ' → supplier barcode ' + newBarcode +
      ' (description score ' + Math.round(Math.max(0, Math.min(1, bestScore)) * 100) + '%' +
      (bestPack ? ', pack matched' : '') + ').'
    );

    rows[di] = relinkRow;
    dropNewIdxs[bestIdx] = true;
    relinkCount++;
  }

  if (!relinkCount) return { rows: rows, relinkCount: 0 };

  var kept = [];
  for (var k = 0; k < rows.length; k++) {
    if (!dropNewIdxs[k]) kept.push(rows[k]);
  }
  return { rows: kept, relinkCount: relinkCount };
}

function m13RelinkStatusKey_(s) {
  return m13Upper_(s).replace(/^[^A-Z]+/, '').replace(/ PRODUCT$/, '').trim();
}

function m13RelinkBrandKey_(s) {
  return m13NormBrand_(m13Upper_(s).replace(/^Z+\s*/i, '').trim());
}

function m13RelinkBrandsMatch_(a, b) {
  a = m13RelinkBrandKey_(a);
  b = m13RelinkBrandKey_(b);
  if (!a || !b) return false;
  if (a === b) return true;
  return a.slice(0, 20) === b.slice(0, 20);
}

function m13RelinkCleanDescr_(s) {
  return m13NormText_(m13Upper_(s).replace(/^Z+\s*/i, '').replace(/^DISCONTINUED\s*/i, '').trim());
}

function m13RelinkPackSignature_(s) {
  s = m13Upper_(s);
  var m = s.match(/\b(\d+(?:\.\d+)?)\s*(MG|MCG|G|KG|ML|L|T|TAB|TABS|C|CAP|CAPS|VCAP|SACHET|SACHETS|PK|PACK)\b/);
  if (!m) return '';
  var unit = m[2];
  if (unit === 'TAB' || unit === 'TABS') unit = 'T';
  if (unit === 'CAP' || unit === 'CAPS' || unit === 'VCAP') unit = 'C';
  if (unit === 'SACHET' || unit === 'SACHETS') unit = 'SACHET';
  return String(m[1]).replace(/\.0$/, '') + unit;
}

function m13RelinkRecalcPriceChange_(row, curIdx, newIdx, pctIdx, diffIdx) {
  var cur = m13Num_(row[curIdx]);
  var nxt = m13Num_(row[newIdx]);
  row[pctIdx] = cur > 0 ? ((nxt - cur) / cur) : '';
  row[diffIdx] = (cur || nxt) ? (nxt - cur) : '';
}

function m13OutTotalsRow_() {
  var r = m13BlankRow_();
  r[0]  = '="TOTAL ROWS: "&TEXT(SUBTOTAL(103,B3:B),"#,##0")';
  r[1]  = '="NEW: "&TEXT(COUNTIF(B3:B,"*NEW*"),"#,##0")&"  |  MATCHED: "&TEXT(COUNTIF(B3:B,"*MATCHED*"),"#,##0")&"  |  DISC: "&TEXT(COUNTIF(B3:B,"*DISCONTINUED*"),"#,##0")';
  r[2]  = '="UP: "&TEXT(COUNTIF(C3:C,"PRICE INCREASE"),"#,##0")&"  |  DOWN: "&TEXT(COUNTIF(C3:C,"PRICE DECREASE"),"#,##0")&"  |  NEW: "&TEXT(COUNTIF(C3:C,"NEW PRODUCT"),"#,##0")&"  |  FLAT: "&TEXT(COUNTIF(C3:C,"NO CHANGE"),"#,##0")';
  r[5]  = '="POS SUPPLIERS: "&TEXT(IFERROR(COUNTA(UNIQUE(FILTER(F3:F,F3:F<>""))),0),"#,##0")';
  r[6]  = '="UPDATED SUPPLIERS: "&TEXT(IFERROR(COUNTA(UNIQUE(FILTER(G3:G,G3:G<>""))),0),"#,##0")';
  r[7]  = '="POS BRANDS: "&TEXT(IFERROR(COUNTA(UNIQUE(FILTER(H3:H,H3:H<>""))),0),"#,##0")';
  r[8]  = '="SUP BRANDS: "&TEXT(IFERROR(COUNTA(UNIQUE(FILTER(I3:I,I3:I<>""))),0),"#,##0")';
  r[9]  = '="BRAND CHANGES: "&TEXT(COUNTIF(J3:J,"<>"),"#,##0")';
  r[11] = '="BARCODES TO UPDATE: "&TEXT(COUNTIF(L3:L,"<>"),"#,##0")';
  r[14] = '="TOTAL POS PRODUCTS: "&TEXT(SUBTOTAL(103,O3:O),"#,##0")';
  r[15] = '="TOTAL SUP PRODUCTS: "&TEXT(SUBTOTAL(103,Q3:Q),"#,##0")';
  r[17] = '="CURRENT WSP: "&TEXT(SUM(R3:R),"$#,##0.00")';
  r[18] = '="NEW WSP: "&TEXT(SUM(S3:S),"$#,##0.00")';
  r[21] = '="CURRENT LAST PRICE: "&TEXT(SUM(V3:V),"$#,##0.00")';
  r[22] = '="NEW LAST PRICE: "&TEXT(SUM(W3:W),"$#,##0.00")';
  r[25] = '="CURRENT RRP: "&TEXT(SUM(Z3:Z),"$#,##0.00")';
  r[26] = '="NEW RRP: "&TEXT(SUM(AA3:AA),"$#,##0.00")';
  r[29] = '="DISCOUNT TYPES: "&TEXT(IFERROR(COUNTA(UNIQUE(FILTER(REGEXEXTRACT(AF3:AF,"^[A-Z +()]+"),REGEXMATCH(AF3:AF,"% /")))),0),"#,##0")';
  r[30] = '="DISCOUNTED ROWS: "&TEXT(COUNTIF(AF3:AF,"*% /*"),"#,##0")';
  r[39] = '="OVERRIDES: "&TEXT(COUNTIF(AN3:AN,"<>"),"#,##0")';
  r[40] = '="FINAL SHELF RRP: "&TEXT(SUM(BE3:BE),"$#,##0.00")';
  r[53] = '="TOTAL WS: $"&TEXT(SUM(BB3:BB),"#,##0.00")';
  r[54] = '="TOTAL LAST PRICE: $"&TEXT(SUM(BC3:BC),"#,##0.00")';
  r[56] = '="TOTAL RRP: $"&TEXT(SUM(BE3:BE),"#,##0.00")';
  return r;
}

function m13BlankRow_() {
  var row = new Array(M13.HEADERS.length);
  for (var i = 0; i < row.length; i++) row[i] = '';
  return row;
}


function m13MakeSupplierObj_(row, headers, brandMap, supplierMap, activeSuppliers, discountRules, findReplaceRules, prefixMap, sheetRow) {
  // Backwards compatibility with the old v6.3.7 argument order:
  // (row, headers, brandMap, supplierMap, discountRules, findReplaceRules, prefixMap, sheetRow).
  if (arguments.length === 8) {
    sheetRow = prefixMap;
    prefixMap = findReplaceRules;
    findReplaceRules = discountRules;
    discountRules = activeSuppliers;
    activeSuppliers = null;
  }

  var supplierNameRaw = m13Str_(m13ColVal_(row, headers, ['POS SUPPLIER NAME', 'SUPPLIER NAME', 'POS SUPPLIER']));
  var supplierNum = m13Str_(m13ColVal_(row, headers, ['POS SUPPLIER NUMBER', 'SUPPLIER NUMBER', 'SUPPLIER NO', 'SUPPLIER']));
  var rawBarcode = m13Str_(m13ColVal_(row, headers, ['SUP BARCODE', 'SUP MASTER BARCODE', 'BARCODE', 'POS MASTER BARCODE']));
  var rawBrand = m13Str_(m13ColVal_(row, headers, ['SUP BRAND', 'BRAND']));
  var product = m13Str_(m13ColVal_(row, headers, ['SUP PRODUCT', 'PRODUCT', 'SUP DESCR', 'DESCR']));
  // Hard fallback to supplier upload Column Q (zero-based index 16) so AL/AM
  // extraction always receives the raw SUP PRODUCT text even if the header
  // label changes or is not mapped cleanly.
  if (!product && row && row.length > 16) product = m13Str_(row[16]);

  // Brand translation is intentionally first. Every later comparison uses the
  // canonical POS brand where SRC_POS_BRAND_NAME_CHANGES provides one.
  // v6.3.89 BE1: a shortened SUP BRAND (BLACKMORES PROF) takes the full listed brand it is short for.
  var translatedBrand = m13BE1TranslateSupplierBrand_(rawBrand, brandMap);

  var wsp = m13Num_(m13ColVal_(row, headers, ['SUP WS EXGST', 'SUP WSP', 'WSP EXGST', 'WSP']));
  var discountPrice = m13Num_(m13ColVal_(row, headers, ['SUP DISCOUNT PRICE', 'DISCOUNT PRICE', 'DISC PRICE']));
  var gstRaw = m13Str_(m13ColVal_(row, headers, ['SUP GST', 'GST']));
  var bc = m13Barcode_(rawBarcode);
  var memberFlag = m13Str_(m13ColVal_(row, headers, ['POS MEMBER', 'MEMBER']));

  var supplierSubId = m13Str_(m13ColVal_(row, headers, ['SUP SUB ID', 'SUB ID', 'SUB_ID']));
  // Hard fallback to supplier upload Column F (SUP SUB ID) so NEW/revived rows
  // always carry the supplier sub-id into OUT_MERGED_DATA N / AP.
  if (!supplierSubId && row && row.length > 5) supplierSubId = m13Str_(row[5]);

  var supplierUnitsInPack = m13Str_(m13ColVal_(row, headers, ['SUP UNITS IN PACK', 'UNITS IN PACK', 'UNITS']));
  // Hard fallback to supplier upload Column H so OUT_MERGED_DATA AZ reflects
  // the uploaded supplier pack/unit quantity even if a header is changed.
  if (!supplierUnitsInPack && row && row.length > 7) supplierUnitsInPack = m13Str_(row[7]);

  var supplierMinOrderWs = m13Str_(m13ColVal_(row, headers, ['SUP MIN ORDER WS', 'MIN ORDER WS', 'MIN ORDER']));
  // Hard fallback to supplier upload Column I so OUT_MERGED_DATA BA reflects
  // the uploaded supplier minimum wholesale order even if a header is changed.
  if (!supplierMinOrderWs && row && row.length > 8) supplierMinOrderWs = m13Str_(row[8]);

  var sup = {
    sheetRow: sheetRow,
    supplierNum: supplierNum,
    supplierName: supplierNameRaw || supplierMap[supplierNum] || '',
    rawBarcode: rawBarcode,
    barcode: bc,
    rawBrand: rawBrand,
    translatedBrand: translatedBrand,
    brandKey: m13NormBrand_(translatedBrand || rawBrand),
    subId: supplierSubId,
    product: product,
    cleanProduct: '',
    cleanedProduct: '',
    units: supplierUnitsInPack,
    minOrder: supplierMinOrderWs,
    wsp: wsp,
    rrp: m13Num_(m13ColVal_(row, headers, ['SUP RRP INC GST', 'RRP INC GST', 'RRP'])),
    gstRaw: gstRaw,
    gstPct: m13GstPct_(gstRaw),
    stockRaw: m13Str_(m13ColVal_(row, headers, ['SUP STOCK IN', 'STOCK IN', 'IN STOCK'])),
    discountPrice: discountPrice,
    member: memberFlag,
    isActive: m13IsActiveSupplier_(activeSuppliers, supplierNum)
  };

  // Keep the existing v6.3.7 supplier product pipeline intact:
  // brand strip → find/replace → prefix → final POS-safe formatting.
  sup.cleanProduct = m13BuildSupplierPosDescr_(sup, findReplaceRules, prefixMap);
  sup.cleanedProduct = sup.cleanProduct;

  var disc = m13BestDiscountForSupplier_(sup, discountRules);
  sup.discountPct = disc.pct || 0;
  sup.discountSource = disc.label || '';
  sup.discountType = disc.type || '';
  sup.isMemberDiscount = !!disc.isMember;
  sup.effectivePrice = m13EffectivePrice_(wsp, discountPrice, sup.discountPct);
  return sup;
}

function m13BlankSupplier_(sup) {
  // Same blank-row definition used by the supplier highlighter, kept local to
  // the merge/supplier-change file so refreshSupplierChanges() is self-contained.
  return !sup || (!m13Str_(sup.rawBarcode) && !m13Str_(sup.rawBrand) && !m13Str_(sup.product) && !m13Str_(sup.supplierNum));
}

function m13LoadPrefixMap_(ss) {
  var map = {
    __allPrefixes: [],
    __memberBrands: {},
    __brandToPrefix: {},
    __activePrefixes: {},
    __rows: [],
    __brandToRow: {},
    __prefixToRow: {},
    __usedRows: {}
  };
  var sh = m13Sheet_(ss, CFG.SH.SRC_PREFIX || 'SRC_POS_PRODUCT_PREFIX', false);
  if (!sh || sh.getLastRow() < M13.DATA_ROW) return map;
  var data = sh.getRange(M13.DATA_ROW, 1, sh.getLastRow() - M13.DATA_ROW + 1, Math.max(5, sh.getLastColumn())).getDisplayValues();
  for (var i = 0; i < data.length; i++) {
    var sheetRow = M13.DATA_ROW + i;
    var brand  = m13Str_(data[i][1]);                       // col B — POS BRAND
    var prefix = m13Str_(data[i][2]).toUpperCase();         // col C — POS PREFIX
    var member = m13Upper_(m13Str_(data[i][3]));            // col D — POS MEMBER (TRUE/FALSE)
    var status = m13Upper_(m13Str_(data[i][4]));            // col E — SRC STATUS, if present
    if (!brand) continue;                                   // keep member rows even when prefix is blank

    var brandUpper = m13Upper_(brand);
    var brandNorm = m13NormBrand_(brand);
    map.__rows.push({ row: sheetRow, brand: brand, prefix: prefix, member: member, status: status });
    map.__brandToRow[brandUpper] = sheetRow;
    map.__brandToRow[brandNorm] = sheetRow;

    if (prefix) {
      map[m13Upper_(brand)]     = prefix;
      map[m13NormBrand_(brand)] = prefix;
      map.__brandToPrefix[m13Upper_(brand)]     = prefix;
      map.__brandToPrefix[m13NormBrand_(brand)] = prefix;
      map.__prefixToRow[prefix] = sheetRow;
      if (map.__allPrefixes.indexOf(prefix) < 0) map.__allPrefixes.push(prefix);
      if (status === 'USED') map.__activePrefixes[prefix] = true;
    }

    if (member === 'TRUE' || member === '1' || member === 'YES' || member === 'Y') {
      map.__memberBrands[brandNorm] = true;
    }
  }
  map.__allPrefixes.sort(function(a, b) { return b.length - a.length; });
  return map;
}
function m13PreSpaceSupplierProduct_(s) {
  return m13FixPosDescrCharacters_(s).replace(/[™®©]/g, '').replace(/\s*\(\s*/g, ' (').replace(/\s*\)\s*/g, ') ').replace(/\s+/g, ' ').trim();
}

function m13StripMarketingPhrases_(s) {
  var out = m13Str_(s);
  if (!out) return '';

  // Surgical marketing/noise purge. These phrases are removed BEFORE
  // SRC_POS_FIND_REPLACE runs so user rules operate on product content only.
  // Boundaries are alphanumeric-safe, so a short phrase cannot damage a longer word.
  var phrases = m13MarketingPhrases_();

  for (var i = 0; i < phrases.length; i++) {
    out = out.replace(m13MarketingPhraseRegex_(phrases[i]), '$1 ');
  }

  // Remove bracketed pure marketing fragments without touching true size/type text.
  var bracketNoise = [
    /\(\s*CONTAINS[^)]*\)/gi,
    /\(\s*COMPLETE PROTEIN WITH BCAA[^)]*\)/gi,
    /\(\s*FAST RELEASE HIGH PROTEIN[^)]*\)/gi,
    /\(\s*EVERYDAY\s*\)/gi
  ];
  for (var j = 0; j < bracketNoise.length; j++) out = out.replace(bracketNoise[j], ' ');

  return out.replace(/\s+/g, ' ').trim();
}

// v6.3.89: the purge list on its own so SZ1 can put a purged word back when O has it too.
function m13MarketingPhrases_() {
  return [
    'EXTEMPORANEOUS COMPOUNDING',
    'BIO-ACTIVE',
    'BIOACTIVE',
    'NZ GRASS FED',
    'PASTURE RAISED',
    'MICRO-ENCAPSULATED',
    'MICRO ENCAPSULATED',
    'HIGH POTENCY',
    'CERTIFIED ORGANIC',
    'CONTAINS ELECTROLYTES + BCAA',
    'COMPLETE PROTEIN WITH BCAA',
    'FAST RELEASE HIGH PROTEIN',
    'EVERYDAY',
    'COMING SOON'
  ];
}

function m13MarketingPhraseRegex_(phrase) {
  var body = m13EscReg_(phrase).replace(/\s+/g, '\\s+').replace(/\\\-/g, '[-\\s]*');
  return new RegExp('(^|[^A-Z0-9])' + body + '(?=$|[^A-Z0-9])', 'gi');
}

// =============================================================================
//  v6.3.89 SZ1 — POS SIZE / FORM FOR A BARE SUPPLIER COUNT
// =============================================================================
// SUP PRODUCT often gives only the count ("BIOCEUTICALS CLINICAL METHYL BIOACTIVE (60)"), while the
// matched ORIGINAL POS DESCR has the count with its form ("BIOC CLIN METHYL BIOACTIVE 60T"). When the
// counts are the same, AL / SIZE = 60T and AM / TYPE = TABLETS, and POS DESCR gets the form letter.
// A supplier type that disagrees with O's form (CAPSULES vs 60T) or a different count leaves Q as is.
function m13SZ1PosSizeForBareCount_(supplierText, supplierEx, originalPosDescr, posEx) {
  if (!originalPosDescr || !posEx || !posEx.size || !supplierEx || !supplierEx.size) return null;
  var qSize = m13NormalizeExtractedSize_(supplierEx.size).replace(/\s+/g, '');
  if (!/^\d{1,4}$/.test(qSize) || !m13SupplierSizeIsWeakBareCount_(supplierText, qSize)) return null;
  var oSize = m13NormalizeExtractedSize_(posEx.size).replace(/\s+/g, '');
  var o = m13SizeParts_(oSize);
  if (!o.n || o.n !== Number(qSize) || !/^(VC|SG|C|T|LOZ|SACHET)$/.test(o.unit)) return null;
  var oType = m13Upper_(posEx.type) || m13StrictTypeFromSizeSuffix_(oSize);
  if (!oType || oType !== (m13StrictTypeFromSizeSuffix_(oSize) || oType)) return null;
  var qType = m13Upper_(supplierEx.type);
  if (qType && qType !== oType) return null;
  return { size: oSize, type: qType || oType, fromPos: true };
}

// A purged marketing word (BIOACTIVE) that SUP PRODUCT and ORIGINAL POS DESCR both have goes back into
// POS DESCR after the same word it follows in O, while POS DESCR stays within 35 characters.
function m13SZ1RestorePurgedPosWords_(descr, supplierRaw, originalPosDescr) {
  var out = m13Str_(descr).toUpperCase();
  var q = m13Upper_(supplierRaw), o = m13Upper_(originalPosDescr);
  if (!out || !q || !o) return out;
  var max = M13.POS_DESCR_MAX || 35;
  m13MarketingPhrases_().forEach(function(phrase) {
    var rq = m13MarketingPhraseRegex_(phrase), ro = m13MarketingPhraseRegex_(phrase);
    if (!rq.test(q)) return;
    var mo = ro.exec(o);
    if (!mo || m13MarketingPhraseRegex_(phrase).test(out)) return;
    var before = o.slice(0, mo.index + mo[1].length).replace(/[^A-Z0-9]+$/, '').split(/[^A-Z0-9]+/).pop();
    if (!before) return;
    var word = mo[0].slice(mo[1].length).trim();
    var at = new RegExp('(^|[^A-Z0-9])(' + m13EscReg_(before) + ')(?=$|[^A-Z0-9])').exec(out);
    if (!at) return;
    var cut = at.index + at[1].length + at[2].length;
    var next = (out.slice(0, cut) + ' ' + word + ' ' + out.slice(cut)).replace(/\s+/g, ' ').trim();
    if (next.length <= max) out = next;
  });
  return out;
}

function m13MarkPrefixRowUsed_(prefixMap, brandOrPrefix) {
  if (!prefixMap || !brandOrPrefix) return;
  var raw = m13Str_(brandOrPrefix).toUpperCase();
  var norm = m13NormBrand_(brandOrPrefix);
  var row = (prefixMap.__brandToRow && (prefixMap.__brandToRow[raw] || prefixMap.__brandToRow[norm])) ||
            (prefixMap.__prefixToRow && prefixMap.__prefixToRow[raw]);
  if (row && prefixMap.__usedRows) prefixMap.__usedRows[row] = true;
}


function m13DP8OneEditBrandMatch_(a, b) {
  // Conservative typo tolerance for explicit prefix rows only.
  // Accept at most one insertion/deletion/substitution, and only on reasonably
  // long normalised brand names. This catches source-table typos such as
  // PLEASENCE vs PLEASANCE without turning prefix lookup into fuzzy matching.
  a = m13NormBrand_(a || '');
  b = m13NormBrand_(b || '');
  if (!a || !b || a.length < 8 || b.length < 8) return false;
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;

  if (a.length === b.length) {
    var diff = 0;
    for (var i = 0; i < a.length; i++) {
      if (a.charAt(i) !== b.charAt(i) && ++diff > 1) return false;
    }
    return diff === 1;
  }

  if (a.length > b.length) { var tmp = a; a = b; b = tmp; }
  var ia = 0, ib = 0, edits = 0;
  while (ia < a.length && ib < b.length) {
    if (a.charAt(ia) === b.charAt(ib)) { ia++; ib++; continue; }
    edits++;
    if (edits > 1) return false;
    ib++;
  }
  return true;
}

function m13DP8ParentBrandMatch_(currentBrand, listedBrand) {
  // Explicit prefix rows may represent a parent/range brand while the current
  // supplier brand has one or two trailing qualifiers, e.g.
  // MACRO MIKE -> MACRO MIKE PROTEIN. Require at least two exact leading words
  // and accept only a small extension; ambiguous candidates are rejected later.
  function words_(s) {
    return m13Upper_(s || '').replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(function(v) { return !!v; });
  }
  var cur = words_(currentBrand);
  var listed = words_(listedBrand);
  if (listed.length < 2 || cur.length <= listed.length || cur.length > listed.length + 2) return false;
  for (var i = 0; i < listed.length; i++) if (cur[i] !== listed[i]) return false;
  return true;
}

function m13DP8ApproxPrefixForBrand_(brand, prefixMap) {
  if (!brand || !prefixMap || !prefixMap.__rows) return '';
  var norm = m13NormBrand_(brand);
  if (!norm || norm.length < 8) return '';

  prefixMap.__dp8ApproxCache = prefixMap.__dp8ApproxCache || {};
  if (Object.prototype.hasOwnProperty.call(prefixMap.__dp8ApproxCache, norm)) {
    return prefixMap.__dp8ApproxCache[norm] || '';
  }

  var hit = null;
  for (var i = 0; i < prefixMap.__rows.length; i++) {
    var row = prefixMap.__rows[i] || {};
    if (!row.prefix || !row.brand) continue;
    var typoMatch = m13DP8OneEditBrandMatch_(norm, row.brand);
    var parentMatch = m13DP8ParentBrandMatch_(brand, row.brand);
    if (!typoMatch && !parentMatch) continue;

    if (hit && hit.prefix !== row.prefix) {
      prefixMap.__dp8ApproxCache[norm] = '';
      return '';
    }
    hit = row;
  }

  if (!hit) {
    prefixMap.__dp8ApproxCache[norm] = '';
    return '';
  }

  prefixMap.__dp8ApproxCache[norm] = hit.prefix;
  if (hit.row && prefixMap.__usedRows) prefixMap.__usedRows[hit.row] = true;
  return hit.prefix;
}

function m13PrefixForBrand_(sup, prefixMap) {
  // DP2 description-only fallback:
  // 1) An explicit SRC_POS_PRODUCT_PREFIX entry always wins.
  // 2) If no prefix is listed, use the canonical/translated POS brand itself.
  // This affects only generated POS DESCR grouping; matching, pricing, supplier,
  // barcode, status, review and export identity logic are unchanged.
  sup = sup || {};
  var rawBrand = m13Str_(sup.rawBrand);
  var translatedBrand = m13Str_(sup.translatedBrand);

  if (prefixMap) {
    // Keep the established explicit-prefix lookup behaviour. Check both source and
    // translated names so an existing SRC mapping is never bypassed by fallback.
    var candidates = [rawBrand, translatedBrand];
    for (var i = 0; i < candidates.length; i++) {
      var b = m13Str_(candidates[i]);
      if (!b) continue;
      var hit = prefixMap[m13Upper_(b)] || prefixMap[m13NormBrand_(b)];
      if (hit) {
        m13MarkPrefixRowUsed_(prefixMap, b);
        return hit;
      }
    }

    // DP8: conservative one-edit typo tolerance only after exact lookup fails.
    for (var j = 0; j < candidates.length; j++) {
      var approx = m13DP8ApproxPrefixForBrand_(candidates[j], prefixMap);
      if (approx) return approx;
    }
  }

  // No listed prefix: group the product under its current/canonical POS brand.
  // Prefer translatedBrand because SRC_POS_BRAND_NAME_CHANGES may have normalised
  // the supplier brand to the established POS brand. Fall back to rawBrand only
  // when no translated value exists.
  return m13Upper_(translatedBrand || rawBrand);
}

function m13GetPrefixForBrand_(brand, prefixMap) {
  var b = m13Str_(brand);
  if (!b) return '';

  if (prefixMap) {
    if (prefixMap.__brandToPrefix) {
      var hit = prefixMap.__brandToPrefix[m13Upper_(b)] || prefixMap.__brandToPrefix[m13NormBrand_(b)];
      if (hit) {
        m13MarkPrefixRowUsed_(prefixMap, b);
        return hit;
      }
    }
    var listed = prefixMap[m13Upper_(b)] || prefixMap[m13NormBrand_(b)] || '';
    if (listed) {
      m13MarkPrefixRowUsed_(prefixMap, b);
      return listed;
    }

    var approx = m13DP8ApproxPrefixForBrand_(b, prefixMap);
    if (approx) return approx;
  }

  // Consistent DP2 fallback for any future/direct callers of this helper.
  return m13Upper_(b);
}


function m13ApplyPrefix_(descr, prefix, prefixMap, opt) {
  var out = m13Str_(descr).toUpperCase();
  prefix = m13Str_(prefix).toUpperCase();
  if (!prefix) return out;

  opt = opt || {};
  var beforeFindReplace = m13Str_(opt.beforeFindReplace || '').toUpperCase();

  var all = prefixMap && prefixMap.__allPrefixes ? prefixMap.__allPrefixes : [];
  for (var i = 0; i < all.length; i++) {
    var p = all[i];
    if (!p || p === prefix) continue;
    var re = new RegExp('^' + m13EscReg_(p) + '\\s+', 'i');
    if (!re.test(out)) continue;

    // DP8: if the definitive supplier product body itself began with this token
    // before find/replace, it is product/range identity, not another brand prefix.
    // Example: ZEN SPORTS under MARTIN & PLEASANCE must remain ZEN after MP is added.
    if (beforeFindReplace && re.test(beforeFindReplace)) break;

    // Safety correction:
    // Do NOT strip a leading token just because it matches another brand's POS prefix
    // if that token was introduced by SRC_POS_FIND_REPLACE from a longer product word.
    // Examples that must be preserved:
    //   COCONUT -> COCO  => BIOL COCO VEGGIE CREAM 100G
    //   LAVENDER -> LAV  => BIOL LAV BODY WASH 500ML
    //   ORGANIC -> ORG   => MEL ORG ALOE VERA JUICE 500ML
    // Previous behaviour stripped COCO/LAV/ORG/NAT/AUST/ESSEN because those tokens
    // also existed as unrelated brand prefixes in SRC_POS_PRODUCT_PREFIX.
    if (m13LeadingPrefixWasFindReplaceDescriptor_(p, out, beforeFindReplace)) break;

    out = out.replace(re, '').trim();
    break;
  }
  if (out.indexOf(prefix + ' ') !== 0 && out !== prefix) out = prefix + ' ' + out;
  return out.replace(/\s+/g, ' ').trim();
}

function m13LeadingPrefixWasFindReplaceDescriptor_(candidatePrefix, currentText, beforeFindReplace) {
  candidatePrefix = m13Str_(candidatePrefix).toUpperCase();
  currentText = m13Str_(currentText).toUpperCase();
  beforeFindReplace = m13Str_(beforeFindReplace).toUpperCase();
  if (!candidatePrefix || !currentText || !beforeFindReplace) return false;

  var nowRe = new RegExp('^' + m13EscReg_(candidatePrefix) + '(?:\\s+|$)', 'i');
  if (!nowRe.test(currentText)) return false;

  // If the pre-find/replace value already started with the exact same token,
  // then this was not introduced by find/replace and may still be a real prefix.
  if (nowRe.test(beforeFindReplace)) return false;

  // If current text starts with the candidate but the pre-FR text did not, the
  // candidate is almost certainly a product descriptor abbreviation created by
  // SRC_POS_FIND_REPLACE. Keep it rather than treating it as a brand prefix.
  return true;
}

function m13FinalFormatDescr_(s) {
  var out = m13FixPosDescrCharacters_(s).toUpperCase()
    .replace(/[™®©]/g, '')
    .replace(/,/g, ' ')
    .replace(/\s*([/+&-])\s*/g, '$1')
    // Keep grade/strength plus markers separate from a following pack size:
    // MGO550+ 250G must not become the single token MGO550+250G.
    .replace(/\b([A-Z]{2,}\d+\+)(\d+(?:\.\d+)?(?:MG|MCG|G|KG|ML|LT|L|IU|C|VC|SG|T|LOZ|PK))\b/g, '$1 $2')
    .replace(/\s*\(\s*/g, ' (')
    .replace(/\s*\)\s*/g, ') ')
    .replace(/\b(\d+(?:\.\d+)?)\s*(GRAMS?|GRAMMES?|GMS?|GM)\b/g, '$1G')
    .replace(/\b(\d+(?:\.\d+)?)\s+(MG|ML|G|KG|MCG|L|LT|T|C|VC|SG|LOZ)\b/g, '$1$2')
    .replace(/\bM\s*G\b/g, 'MG')
    .replace(/\bM\s*L\b/g, 'ML')
    .replace(/\bM\s*C\s*G\b/g, 'MCG')
    .replace(/\bL\s*T\b/g, 'LT')
    .replace(/\b(\d{1,4})\s*(?:SOFT\s*GELS?|SOFTGELS?|SOFTGEL\s+CAPSULES?|SOFT\s+GEL\s+CAPSULES?)\s*(?:CAPSULES?|CAPS?|C)?\b/g, '$1SG')
    .replace(/\b(\d{1,4})\s*(?:VEG\s*CAPS?|VEGE\s*CAPS?|VEGETARIAN\s+CAPSULES?|VCAPS?|V\s*CAPS?|VEGICAPS?)\b/g, '$1VC')
    .replace(/\b(\d{1,4})\s*(?:CAPSULES?|CAPS?)\b/g, '$1C')
    .replace(/\b(\d{1,4})\s*(?:TABLETS?|TABS?)\b/g, '$1T')
    .replace(/\bNUTRA\s+ORG\s+ORG\b/g, 'NUTRA ORG')
    .replace(/\bPROT\s+PROT\+MULTI\b/g, 'PROT+MULTI')
    .replace(/\bPROT\s+PROT\b/g, 'PROT')
    .replace(/\s+/g, ' ')
    .trim();

  var prev = '';
  while (prev !== out) {
    prev = out;
    out = out
      .replace(/\b(\d{1,4})(C|VC|SG|T)\s+\1(C|VC|SG|T)\b/g, function(_, n, a, b) {
        var rank = { VC: 4, SG: 3, C: 2, T: 1 };
        return n + ((rank[b] || 0) > (rank[a] || 0) ? b : a);
      })
      .replace(/\b(\d{1,4})(C|VC|SG|T)\s+\1\2\b/g, '$1$2')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return out;
}

function m13DiscontinuedDescr_(s) {
  var out = m13FixPosDescrCharacters_(s).toUpperCase().replace(/^Z+\s*/i, '').replace(/^Z+\s*/i, '').replace(/\s+/g, ' ').trim();
  return ('ZZZZ ' + out).replace(/\s+/g, ' ').trim();
}

function m13MeaningfulPriceChange_(currentValue, newValue) {
  var cur = Number(currentValue || 0);
  var next = Number(newValue || 0);
  if (!(cur > 0) || !(next > 0)) return Math.abs(next - cur) >= (M13.PRICE_ROUNDING_MIN_DOLLARS || 0.02);
  var diff = next - cur;
  var absDiff = Math.abs(diff);
  var absPct = Math.abs(diff / cur);
  return absDiff >= (M13.PRICE_ROUNDING_MIN_DOLLARS || 0.02) && absPct >= (M13.PRICE_ROUNDING_MIN_PCT || 0.005);
}

function m13PriceDelta_(currentValue, newValue) {
  var cur = Number(currentValue || 0);
  var next = Number(newValue || 0);
  var diff = next - cur;
  if (!m13MeaningfulPriceChange_(cur, next)) {
    return { changed: false, diff: 0, pct: cur > 0 ? 0 : '' };
  }
  return { changed: true, diff: diff, pct: cur > 0 ? (diff / cur) : '' };
}

function m13PriceStatus_(kind, curWsp, newWsp) {
  if (kind === 'NEW') return 'NEW PRODUCT';
  if (kind === 'REVIEW') return 'REVIEW';
  if (!curWsp || !newWsp) return 'NO PRICE BASELINE';
  var delta = m13PriceDelta_(curWsp, newWsp);
  if (!delta.changed) return 'NO CHANGE';
  return delta.diff > 0 ? 'PRICE INCREASE' : 'PRICE DECREASE';
}

function m13MarkupDisplay_(cost, lastPrice, rrpInc, gstPct, applyUplift, label) {
  var ex = m13RrpExGst_(rrpInc, gstPct);
  var displayRrpInc = Number(rrpInc || 0);
  if (applyUplift) {
    ex = ex * (1 + M13.TARGET_RRP_UPLIFT);
    displayRrpInc = ex * (1 + Number(gstPct || 0) / 100);
  }
  return m13MarkupDisplayFromEx_(cost, lastPrice, ex, label, displayRrpInc);
}

function m13MarkupDisplayFromEx_(cost, lastPrice, ex, label, rrpIncForDisplay) {
  if (!(cost > 0) || !(ex > 0)) return '';
  var prefix = label ? (String(label).toUpperCase() + ' ') : '';
  var ratio = prefix + m13FmtPctNumber_(ex / cost * 100);
  var displayRrp = Number(rrpIncForDisplay || 0);
  if (displayRrp > 0) ratio += ' | ' + m13FmtCurrency_(displayRrp);
  if (!(lastPrice > 0)) return ratio;
  var gpDollars = ex - lastPrice;
  var gp = 'GP NGST ' + m13FmtPctNumber_(gpDollars / ex * 100) + ' | ' + m13FmtCurrency_(gpDollars);
  return ratio + '\n' + gp;
}

function m13MarkupPctDisplay_(wsp, lastPrice, rrpInc, gstPct) {
  // Column AD: two-line label + ratio + GP % / dollar yield for readability.
  return m13MarkupDisplay_(wsp, lastPrice, rrpInc, gstPct, false, 'NEW');
}

function m13MaintainingMarkupDisplay_(newWsp, newLast, newRrpInc, gstPct) {
  var ex = m13RrpExGst_(newRrpInc, gstPct);
  if (!(newWsp > 0) || !(ex > 0)) return '';
  var targetEx = ex * (1 + M13.TARGET_RRP_UPLIFT);
  var targetRrpInc = targetEx * (1 + Number(gstPct || 0) / 100);
  return m13MarkupDisplayFromEx_(newWsp, newLast, targetEx, '', targetRrpInc);
}

function m13FmtCurrency_(n) {
  n = Number(n || 0);
  var sign = n < 0 ? '-' : '';
  return sign + '$' + Math.abs(n).toFixed(2);
}

function m13RrpExGst_(rrpInc, gstPct) {
  var r = Number(rrpInc || 0);
  var g = Number(gstPct || 0);
  if (!(r > 0)) return 0;
  return g > 0 ? r / (1 + g / 100) : r;
}

function m13FriendlyRrp_(value) {
  var n = Number(value || 0);
  if (!(n > 0)) return 0;

  // Prefer rounding up to the next 5c retail point, but do not tip values like
  // 48.96 or 27.96 up to the next whole dollar. Those become 48.95 / 27.95.
  var cents = Math.round(n * 100);
  var roundedUpCents = Math.ceil(cents / 5) * 5;
  if (roundedUpCents % 100 === 0 && cents % 100 !== 0) roundedUpCents -= 5;
  return Math.round(roundedUpCents) / 100;
}

function m13CheckBox_(ok, unknown) {
  if (unknown) return '☐';
  return ok ? '☑' : '☒';
}

function m13AuditTextCell_(textOk, textUnknown, textPct) {
  // TEXT % column should show the percentage only; the column header already
  // explains what the value represents. Blank means not available/not checked.
  if (textUnknown) return '';
  return textPct || '0%';
}

function m13ExtractTruth_(descriptions, brandHint) {
  // Multi-source evidence pooling for OUT_MERGED_DATA AL / SIZE and AM / TYPE.
  // Sources should be passed in order of preference, usually:
  //   1) SUP PRODUCT        → OUT column Q
  //   2) ORIGINAL POS DESCR → OUT column O
  //   3) POS DESCR          → OUT column P
  // This deliberately avoids type hallucinations. A weight such as 50G or 500G
  // may be a valid size, but it is NOT enough evidence to call the item POWDER.
  var out = { size: '', type: '' };
  try {
    var list = Array.isArray(descriptions) ? descriptions : [descriptions];
    for (var i = 0; i < list.length; i++) {
      var ex = m13ExtractSizeAndTypeFromText_(list[i]);
      if (!out.size && ex.size) out.size = ex.size;
      if (!out.type && ex.type) out.type = ex.type;
      if (out.size && out.type) break;
    }
    out = m13ApplyBrandSpecificTruthRules_(out, brandHint, list);
  } catch(e) {
    try { log_('[SIZE/TYPE] truth extraction skipped: ' + e.message); } catch(_eLog) {}
  }
  return out;
}


function m13ApplyBrandSpecificTruthRules_(extraction, brandHint, sources) {
  // Expandable brand intelligence. These rules only use explicit evidence already
  // present in supplier/POS source columns; they do not invent missing forms.
  var out = {
    size: extraction && extraction.size ? extraction.size : '',
    type: extraction && extraction.type ? extraction.type : ''
  };
  var brand = m13NormBrand_(brandHint || '');
  var evidence = (Array.isArray(sources) ? sources : [sources]).map(function(v) { return m13Upper_(v); }).join(' | ');

  // Designs for Health / DFH: softgel capsule wording is represented as SG.
  if (brand === 'DFH' || brand.indexOf('DESIGNSFORHEALTH') >= 0) {
    if (/\b(SOFT\s*GELS?|SOFTGELS?|SOFTGEL\s+CAPSULES?|SOFT\s+GEL\s+CAPSULES?)\b/.test(evidence)) {
      out.type = 'SOFTGELS';
      if (out.size) out.size = m13NormalizeExtractedSize_(out.size).replace(/C$/, 'SG');
    }
    // DFH liquid products are commonly identified by an ML/LT unit. This is the
    // only brand-specific volume-to-type bridge and is deliberately not global.
    if (!out.type && /\b\d+(?:\.\d+)?\s*(ML|LT|LTRS?|LITRES?|L)\b/.test(evidence)) out.type = 'LIQUID';
  }

  return out;
}

function m13ExtractSizeAndType_(desc) {
  // Backwards-compatible single-source wrapper. New build logic should call
  // m13ExtractTruth_([SUP PRODUCT, ORIGINAL POS DESCR, POS DESCR]).
  return m13ExtractTruth_([desc]);
}

function m13ExtractSizeAndType_v2_(desc) {
  // Compatibility wrapper for any direct test calls using the v2 function name.
  return m13ExtractSizeAndType_(desc);
}


function m13ReconcileProductDescription_(supplierDescr, supplierRaw, originalPosDescr, prefixMap, sup, findReplaceRules) {
  // DP4 MASTER RULE:
  //   Q / supplier product information is the current, definitive source of product truth.
  //   O / original POS description is REFERENCE ONLY: it may guide presentation/style
  //   and may be compared for review warnings, but it must never add or override a
  //   size, type/form, ingredient, flavour, variant, punctuation or other product fact.
  //   v6.3.89 SZ1 exceptions: a bare Q count ("(60)") takes O's form for the same count (60T), and a
  //   word the marketing purge took out of Q is put back when O has it too (both shown in Q already).
  var supplierEvidence = m13Str_(supplierRaw || supplierDescr || '');
  var hasSupplierTruth = !!supplierEvidence;
  supplierRaw = m13Str_(supplierRaw || '');
  originalPosDescr = m13Str_(originalPosDescr || '');

  // If Q is absent there is no current supplier truth from which to build an
  // update. Preserve O unchanged as a no-update fallback rather than using O to
  // invent/reconcile new product facts. Normal current supplier rows should have Q.
  if (!hasSupplierTruth) {
    var unchanged = m13FinalFormatDescr_(originalPosDescr || '');
    return {
      descr: unchanged,
      extraction: m13ExtractSizeAndTypeFromText_(originalPosDescr || ''),
      truthSources: originalPosDescr ? [originalPosDescr] : [],
      supplierExtraction: { size: '', type: '' },
      posExtraction: m13ExtractSizeAndTypeFromText_(originalPosDescr || ''),
      noSupplierTruth: true
    };
  }

  var base = m13Str_(supplierDescr || supplierRaw || '').toUpperCase();
  if (!base) return { descr: '', extraction: { size: '', type: '' }, truthSources: [] };
  var brandHint = sup ? (sup.translatedBrand || sup.rawBrand || '') : '';

  var supplierExtraction = m13ApplyBrandSpecificTruthRules_(
    m13ExtractSizeAndTypeFromText_(supplierEvidence || base),
    brandHint,
    [supplierEvidence || base, base]
  );

  // O is retained only as separate comparison/reference evidence. It is deliberately
  // NOT merged into finalExtraction and is never appended into Column P.
  var posExtraction = m13ApplyBrandSpecificTruthRules_(
    m13ExtractSizeAndTypeFromText_(originalPosDescr),
    brandHint,
    [originalPosDescr]
  );

  var finalExtraction = hasSupplierTruth
    ? m13ApplyBrandSpecificTruthRules_({
        size: supplierExtraction.size || '',
        type: supplierExtraction.type || ''
      }, brandHint, [supplierEvidence || base, base])
    : m13ApplyBrandSpecificTruthRules_({
        size: posExtraction.size || '',
        type: posExtraction.type || ''
      }, brandHint, [originalPosDescr, base]);

  // v6.3.89 SZ1: Q gives only a bare count and O has the same count with its form → use O's size / form.
  var sz1 = m13SZ1PosSizeForBareCount_(supplierEvidence || base, supplierExtraction, originalPosDescr, posExtraction);
  if (sz1) finalExtraction = sz1;

  // Keep the brand prefix anchored at the start. This changes presentation only.
  if (sup && prefixMap) {
    base = m13ApplyPrefix_(base, m13PrefixForBrand_(sup, prefixMap), prefixMap, {
      beforeFindReplace: supplierRaw || base
    });
  }

  // Type/form acronym creation may use supplier evidence only when Q exists.
  // Legacy O fallback is retained solely for the exceptional no-supplier-text case.
  var truthSources = hasSupplierTruth
    ? [supplierEvidence || base, base]
    : [originalPosDescr, base];
  if (sz1) truthSources = truthSources.concat([originalPosDescr]);   // v6.3.89 SZ1: O's form (60VC) is the evidence

  var finalBrandPrefix = (sup && prefixMap) ? m13PrefixForBrand_(sup, prefixMap) : '';
  base = m13AppendTypeAcronymToPosDescr_(base, finalExtraction, truthSources);
  base = m13FinalFormatDescr_(base);

  // O may still guide compact POS presentation inside the polish layer, but any
  // retained/product-identifying information must be supported independently by Q.
  base = m13PolishColumnPDescription_(base, originalPosDescr, supplierRaw, finalBrandPrefix, prefixMap, sup);

  base = m13ApplyFinalColumnPFindReplace_(base, findReplaceRules, supplierRaw, originalPosDescr, finalBrandPrefix);
  base = m13FinalFormatDescr_(base);
  base = m13PolishColumnPDescription_(base, originalPosDescr, supplierRaw, finalBrandPrefix, prefixMap, sup);
  base = m13SZ1RestorePurgedPosWords_(base, supplierRaw, originalPosDescr);   // v6.3.89 SZ1

  return {
    descr: base,
    extraction: finalExtraction,
    truthSources: truthSources,
    supplierExtraction: supplierExtraction,
    posExtraction: posExtraction
  };
}

function m13SupplierSizeIsWeakBareCount_(sourceText, extractedSize) {
  var size = m13NormalizeExtractedSize_(extractedSize || '').replace(/\s+/g, '');
  if (!size || !/^\d{1,4}$/.test(size)) return false;
  var src = m13Upper_(sourceText || '');
  if (!src) return true;
  // Explicit unit/type near the number means it is not weak.
  var explicit = new RegExp('\\b' + m13EscReg_(size) + '\\s*(VC|SG|C|T|ML|LT|L|G|KG|MG|MCG|IU|CAPS?|CAPSULES?|TABLETS?|TABS?|SOFTGELS?|LOZ|LOZENGES?)\\b');
  if (explicit.test(src)) return false;
  return new RegExp('\\(\\s*' + m13EscReg_(size) + '\\s*\\)').test(src) || new RegExp('\\b' + m13EscReg_(size) + '\\b').test(src);
}

function m13RemoveWeakSupplierBareCount_(descr, weakSize) {
  var out = m13Str_(descr).toUpperCase();
  var size = m13NormalizeExtractedSize_(weakSize || '').replace(/\s+/g, '');
  if (!out || !size || !/^\d{1,4}$/.test(size)) return out;
  var esc = m13EscReg_(size);
  out = out.replace(new RegExp('\\(\\s*' + esc + '\\s*\\)', 'g'), ' ');
  // Only remove an untyped bare number at the end. Do not remove strengths or pack values inside names.
  out = out.replace(new RegExp('(?:^|\\s)' + esc + '\\s*$', 'g'), ' ');
  return out.replace(/\s+/g, ' ').trim();
}

function m13DescrHasSize_(descr, size) {
  // Strict but tolerant size dedupe. It must catch exact values (500G) and
  // mathematically equivalent capsule counts (60C already present as 60VC/60SG).
  var d = m13Upper_(descr).replace(/\s+/g, ' ').trim();
  var s = m13NormalizeExtractedSize_(size).replace(/\s+/g, '');
  if (!d || !s) return false;
  var compact = d.replace(/\s+/g, '');
  if (compact.indexOf(s) >= 0) return true;

  var wanted = m13SizeParts_(s);
  if (!wanted.n) return false;
  var sizeRx = /\b(\d+(?:\.\d+)?)(?:\s*)(VC|SG|C|T|LOZ|SACHET|PK|ML|LT|L|G|KG|MG|MCG|IU|CAPS?|CAPSULES?|VCAPS?|V\s*CAPS?|SOFTGELS?|TABLETS?|TABS?)\b/g;
  var m;
  while ((m = sizeRx.exec(d)) !== null) {
    var found = m13SizeParts_(m13CleanExtractNumber_(m[1]) + m13NormExtractUnit_(m[2]));
    if (m13SizesEquivalent_(wanted, found)) return true;
  }
  return false;
}

function m13SizeParts_(size) {
  var s = m13NormalizeExtractedSize_(size).replace(/\s+/g, '').trim();
  var m = s.match(/^(\d+(?:\.\d+)?)(VC|SG|C|T|LOZ|SACHET|PK|ML|LT|G|KG|MG|MCG|IU)?$/);
  if (!m) return { n: 0, unit: '' };
  return { n: Number(m[1] || 0), unit: m13NormExtractUnit_(m[2] || '') };
}

function m13SizesEquivalent_(a, b) {
  if (!a || !b || !a.n || !b.n) return false;
  if (Math.abs(a.n - b.n) > 0.0001) return false;
  if (!a.unit || !b.unit) return true;
  if (a.unit === b.unit) return true;
  var cap = { C: true, VC: true, SG: true };
  return !!(cap[a.unit] && cap[b.unit]);
}

function m13TypeCodeForDescription_(type, size, evidenceList) {
  type = m13Upper_(type);
  if (type === 'POWDER') return 'PWD';
  if (type === 'LOZENGES') return 'LOZ';
  if (type === 'TABLETS') return 'T';
  if (type === 'SOFTGELS') return 'SG';
  if (type === 'CAPSULES') return m13TypeAcronymFromEvidence_(type, size, evidenceList) || 'C';
  if (type === 'SACHETS') return 'SACHET';
  // Do not append broad descriptors such as LIQUID/TOPICAL/OIL/TEA. They are
  // useful in AL/AM audit context, but too noisy for the short POS description.
  return '';
}

function m13DescrHasTypeCode_(descr, code) {
  var d = m13Upper_(descr).replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
  code = m13Upper_(code).replace(/\s+/g, '');
  if (!d || !code) return false;
  if (code === 'PWD') return /\b(PWD|PWDR|POWDER)\b/.test(d);
  if (code === 'LOZ') return /\b(LOZ|LOZENGES?|PASTILLES?)\b/.test(d) || /\b\d{1,4}\s*LOZ\b/.test(d);
  if (code === 'SACHET') return /\b(SACHET|SACHETS|STICK|STICKS)\b/.test(d);
  if (code === 'SG') return m13PosDescrAlreadyHasTypeAcronym_(d, 'SG');
  if (code === 'VC') return m13PosDescrAlreadyHasTypeAcronym_(d, 'VC');
  if (code === 'C') return m13PosDescrAlreadyHasTypeAcronym_(d, 'C');
  if (code === 'T') return m13PosDescrAlreadyHasTypeAcronym_(d, 'T');
  return new RegExp('\\b' + m13EscReg_(code) + '\\b').test(d);
}

function m13AppendTypeAcronymToPosDescr_(descr, extraction, evidenceList) {
  // Adds only the verified dosage-form acronym to OUT_MERGED_DATA column P / POS DESCR.
  // No guessing: this uses the existing strict multi-source extraction output and
  // only appends C / VC / T when the product description is missing that suffix.
  var base = m13Str_(descr);
  if (!base) return base;

  extraction = extraction || {};
  var type = m13Upper_(extraction.type || extraction.typeForm || '');
  var acronym = m13TypeAcronymFromEvidence_(type, extraction.size || '', evidenceList);
  if (!acronym) return base;
  if (m13PosDescrAlreadyHasTypeAcronym_(base, acronym)) return base;

  var count = m13CountFromExtractedSize_(extraction.size || '');
  if (!count) return base;

  var compactBase = base.replace(/\s+/g, ' ').trim();
  var endNum = compactBase.match(/^(.*?)(\d{1,4})\s*$/);
  if (endNum && endNum[2] === count) {
    return (endNum[1] + count + acronym).replace(/\s+/g, ' ').trim();
  }

  // If a count exists elsewhere but no dosage suffix exists, append compactly at the end.
  return (compactBase + ' ' + count + acronym).replace(/\s+/g, ' ').trim();
}

function m13TypeAcronymFromEvidence_(type, size, evidenceList) {
  type = m13Upper_(type);
  var sizeNorm = String(size || '').toUpperCase().replace(/\s+/g, '');
  var list = Array.isArray(evidenceList) ? evidenceList : [evidenceList];
  var evidence = list.map(function(v) { return m13Upper_(v); }).join(' | ');

  if (type === 'TABLETS') return 'T';
  if (type === 'SOFTGELS' || /\b(SOFT\s*GELS?|SOFTGEL\s+CAPSULES?|SOFT\s+GEL\s+CAPSULES?)\b/.test(evidence) || /\d{1,4}SG$/.test(sizeNorm)) return 'SG';
  if (type !== 'CAPSULES') return '';

  // Preserve vegetable-capsule evidence as VC. Do not collapse VC to C here.
  if (/\b\d{1,4}\s*(?:VC|VCAPS?|V\s*CAPS?)\b/.test(evidence)) return 'VC';
  if (/\b(?:VEG|VEGE|VEGETARIAN|VEGICAPS?|VCAPS?|V\s*CAPS?)\b/.test(evidence)) return 'VC';
  if (/\d{1,4}VC$/.test(sizeNorm)) return 'VC';
  return 'C';
}

function m13CountFromExtractedSize_(size) {
  var s = String(size || '').toUpperCase().replace(/\s+/g, '').trim();
  if (!s) return '';
  var m = s.match(/^([0-9]{1,4})(?:VC|SG|C|T)$/);
  if (m) return m[1];
  m = s.match(/^([0-9]{1,4})$/);
  if (m) return m[1];
  return '';
}

function m13PosDescrAlreadyHasTypeAcronym_(descr, acronym) {
  var d = m13Upper_(descr).replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!d) return false;

  if (acronym === 'T') {
    return /\b\d{1,4}\s*T\b/.test(d) || /\b(TABLETS?|TABS?)\b/.test(d);
  }

  if (acronym === 'SG') {
    return /\b\d{1,4}\s*SG\b/.test(d) || /\b(SOFT\s*GELS?|SOFTGEL\s+CAPSULES?|SOFT\s+GEL\s+CAPSULES?)\b/.test(d);
  }

  if (acronym === 'VC') {
    return /\b\d{1,4}\s*VC\b/.test(d) || /\b(VCAPS?|V\s*CAPS?|VEG\s*CAPS?|VEGE\s*CAPS?|VEGETARIAN\s+CAPSULES?|VEGICAPS?)\b/.test(d);
  }

  if (acronym === 'C') {
    return /\b\d{1,4}\s*(?:C|CAPS?)\b/.test(d) || /\b(CAPSULES?|CAPS?|SOFTGELS?)\b/.test(d);
  }

  return false;
}

function m13ExtractSizeAndTypeFromText_(desc) {
  var res = { size: '', type: '' };
  try {
    if (!desc) return res;

    var d = String(desc)
      .toUpperCase()
      .replace(/[™®©]/g, '')
      .replace(/[×]/g, ' X ')
      .replace(/[\u2010-\u2015]/g, '-')
      .replace(/\s+/g, ' ')
      .trim();
    if (!d) return res;

    res.type = m13StrictTypeFromText_(d);
    res.size = m13BestSizeFromText_(d);

    // Secondary evidence: infer type only when the unit itself is a type marker
    // or a true volume unit. Do NOT infer POWDER from G/KG.
    if (!res.type && res.size) res.type = m13StrictTypeFromSizeSuffix_(res.size);

    res.size = res.size ? String(res.size).toUpperCase().replace(/\s+/g, ' ').trim() : '';
    res.type = res.type ? String(res.type).toUpperCase().replace(/\s+/g, ' ').trim() : '';
  } catch(e) {
    try { log_('[SIZE/TYPE] extraction skipped: ' + e.message); } catch(_eLog) {}
  }
  return res;
}


function m13MaskFlavourPhrasesForType_(d) {
  // Prevent flavour phrases from being misread as topical dosage forms.
  // Example: "BERRIES & CREAM" is a flavour, not TYPE = TOPICAL.
  var out = String(d || '').toUpperCase();
  if (!out) return '';

  var flavourWords = '(?:BERRIES|BERRY|STRAWBERR(?:Y|IES)|RASPBERR(?:Y|IES)|COOKIES?|CHOC(?:OLATE)?|VANILLA|MANGO|BANANA|CARAMEL|COCONUT|COCO|MOCHA|COFFEE)';
  var re1 = new RegExp('\\b' + flavourWords + '\\s*(?:&|AND)?\\s*CREAM\\b', 'g');
  var re2 = new RegExp('\\bCREAM\\s*(?:&|AND)?\\s*' + flavourWords + '\\b', 'g');
  out = out.replace(re1, function(m) { return m.replace(/\bCREAM\b/g, 'CRM'); });
  out = out.replace(re2, function(m) { return m.replace(/\bCREAM\b/g, 'CRM'); });
  out = out.replace(/\bCREAMY\s+(?:VANILLA|CHOC|CHOCOLATE|BERRY|BERRIES|STRAWBERRY|COCONUT)\b/g, function(m) {
    return m.replace(/\bCREAMY\b/g, 'CRMY');
  });
  return out;
}

function m13StrictTypeFromText_(d) {
  d = String(d || '').toUpperCase();
  if (!d) return '';

  d = m13MaskFlavourPhrasesForType_(d);

  // Strict keyword mapping. These are explicit words/forms, not guesses based
  // only on weight. Order is intentional: OIL beats LIQUID when both could apply.
  var typeMap = [
    { rx: /\b(LOZENGES?|PASTILLES?)\b/, type: 'LOZENGES' },
    { rx: /\b(SACHETS?|STICK\s*PACKS?|STICKS?|PACKETS?)\b/, type: 'SACHETS' },
    { rx: /\b(TEA|TEABAGS?|TEA\s*BAGS?|HERBAL\s*TEA)\b/, type: 'TEA' },
    { rx: /\b(CREAM|GEL|BALM|LOTION|OINTMENT|SALVE|TOPICAL)\b/, type: 'TOPICAL' },
    { rx: /\b(OIL|OILS)\b/, type: 'OIL' },
    { rx: /\b(ORAL\s+LIQUID|LIQUID|TINCTURE|SYRUP|DROPS?|ELIXIR|ESSENCE|TONIC)\b/, type: 'LIQUID' },
    { rx: /\b(POWDER|PWD|PWDR)\b/, type: 'POWDER' },
    { rx: /\b(SOFT\s*GELS?|SOFTGELS?|SOFTGEL\s+CAPSULES?|SOFT\s+GEL\s+CAPSULES?)\b/, type: 'SOFTGELS' },
    { rx: /\b(VEG\s*CAPS?|VEGE\s*CAPS?|VEGETARIAN\s+CAPSULES?|HARD\s+VEGETARIAN\s+CAPSULES?|CAPSULES?|CAPS?|VCAPS?|V\s*CAPS?|VC|VEGICAPS?)\b/, type: 'CAPSULES' },
    { rx: /\b(TABLETS?|TABS?)\b/, type: 'TABLETS' }
  ];

  for (var i = 0; i < typeMap.length; i++) {
    if (typeMap[i].rx.test(d)) return typeMap[i].type;
  }
  return '';
}

function m13BestSizeFromText_(d) {
  d = String(d || '').toUpperCase();
  if (!d) return '';

  var candidates = [];
  function add_(raw, score, pos) {
    raw = m13NormalizeExtractedSize_(raw);
    if (!raw || !/\d/.test(raw)) return;
    candidates.push({ raw: raw, score: score, pos: pos || 0 });
  }

  var m;

  // Multi-pack: 8 X 125G, 6 X 1LT, 30 X 5ML.
  var reMulti = /\b(\d{1,4})\s*X\s*(\d+(?:\.\d+)?)\s*(MCG|MG|GM|G|KG|ML|LT|LTR|LTRS|LITRE|LITRES|L|IU|VCAPS?|V\s*CAPS?|VC|SG|SOFT\s*GELS?|SOFTGELS?|CAPSULES?|CAPS?|CAP|C|TABLETS?|TABS?|TAB|T|LOZENGES?|LOZ|SACHETS?|SACHET|STICKS?|STICK|PK|PACK|PCK)\b/g;
  while ((m = reMulti.exec(d)) !== null) {
    add_(m[1] + 'X' + m13CleanExtractNumber_(m[2]) + m13NormExtractUnit_(m[3]), 100, m.index);
  }

  // Supplement count phrases: 90 Tablets, 30 hard vegetarian capsules, 10 lozenges.
  var reCountPhrase = /\b(\d{1,4})\s+(?:(?:HARD|SOFT|VEGETARIAN|VEG|VEGE|ENTERIC|COATED)\s+)*(CAPSULES?|CAPS?|VCAPS?|V\s*CAPS?|VC|SOFTGELS?|SOFT\s*GELS?|VEGICAPS?|TABLETS?|TABS?|LOZENGES?|SACHETS?)\b/g;
  while ((m = reCountPhrase.exec(d)) !== null) {
    add_(m13CleanExtractNumber_(m[1]) + m13NormExtractUnit_(m[2]), 95, m.index);
  }

  // Direct type suffixes: 60VC, 60C, 90T, 12 SACHETS.
  var reTypeSuffix = /\b(\d{1,4})\s*(VCAPS?|V\s*CAPS?|VC|SG|SOFT\s*GELS?|SOFTGELS?|CAPSULES?|CAPS?|CAP|C|TABLETS?|TABS?|TAB|T|LOZENGES?|LOZ|SACHETS?|SACHET)\b/g;
  while ((m = reTypeSuffix.exec(d)) !== null) {
    add_(m13CleanExtractNumber_(m[1]) + m13NormExtractUnit_(m[2]), 90, m.index);
  }

  // Volume/weight pack size. Valid as SIZE, but not enough to infer POWDER.
  var rePackUnit = /\b(\d+(?:\.\d+)?)\s*(ML|LT|LTR|LTRS|LITRE|LITRES|L|GM|G|KG)\b/g;
  while ((m = rePackUnit.exec(d)) !== null) {
    add_(m13CleanExtractNumber_(m[1]) + m13NormExtractUnit_(m[2]), 75, m.index);
  }

  // Strength only; use only as a last resort if there is no pack/count.
  var reStrength = /\b(\d+(?:\.\d+)?)\s*(MCG|MG|IU)\b/g;
  while ((m = reStrength.exec(d)) !== null) {
    add_(m13CleanExtractNumber_(m[1]) + m13NormExtractUnit_(m[2]), 20, m.index);
  }

  // Parenthesised pack counts, e.g. BC Zinc Sustain (120). Only useful as size;
  // type still requires keyword or a high-certainty suffix from another source.
  var reParen = /\(([^)]+)\)/g;
  while ((m = reParen.exec(d)) !== null) {
    var p = String(m[1] || '').trim();
    if (/^\d{1,4}$/.test(p)) add_(p, 35, m.index);
    else if (/\d/.test(p)) add_(p, 50, m.index);
  }

  if (!candidates.length) return '';
  candidates.sort(function(a, b) {
    if (b.score !== a.score) return b.score - a.score;
    return b.pos - a.pos;
  });
  return candidates[0].raw;
}

function m13StrictTypeFromSizeSuffix_(size) {
  var s = String(size || '').toUpperCase().replace(/\s+/g, '').trim();
  if (!s) return '';
  // Strict suffix evidence only. Do not infer LIQUID from ML/LT or POWDER from G/KG.
  // A type must come from an explicit type keyword/acronym such as C, VC, T, LOZ or SACHET.
  if (/(?:^|X)\d+(?:\.\d+)?SG$/.test(s)) return 'SOFTGELS';
  if (/(?:^|X)\d+(?:\.\d+)?(?:VC|C)$/.test(s)) return 'CAPSULES';
  if (/(?:^|X)\d+(?:\.\d+)?T$/.test(s)) return 'TABLETS';
  if (/(?:^|X)\d+(?:\.\d+)?LOZ$/.test(s)) return 'LOZENGES';
  if (/(?:^|X)\d+(?:\.\d+)?SACHET$/.test(s)) return 'SACHETS';
  return '';
}

function m13CleanExtractNumber_(n) {
  return String(n || '').replace(/\.0$/, '');
}

function m13NormExtractUnit_(unit) {
  var u = String(unit || '').toUpperCase().replace(/\s+/g, '').replace(/\./g, '');
  if (u === 'GM' || u === 'GRAM' || u === 'GRAMS' || u === 'GMS') return 'G';
  if (u === 'L' || u === 'LTR' || u === 'LTRS' || u === 'LITRE' || u === 'LITRES') return 'LT';
  if (u === 'VCAP' || u === 'VCAPS' || u === 'VC' || u === 'VCAPSULE' || u === 'VCAPSULES') return 'VC';
  if (u === 'SOFTGEL' || u === 'SOFTGELS' || u === 'SOFTGELCAPSULE' || u === 'SOFTGELCAPSULES' || u === 'SG') return 'SG';
  if (u === 'CAP' || u === 'CAPS' || u === 'CAPSULE' || u === 'CAPSULES' || u === 'VEGICAP' || u === 'VEGICAPS') return 'C';
  if (u === 'TAB' || u === 'TABS' || u === 'TABLET' || u === 'TABLETS') return 'T';
  if (u === 'LOZENGE' || u === 'LOZENGES') return 'LOZ';
  if (u === 'SACHETS' || u === 'SACHET' || u === 'STICK' || u === 'STICKS') return 'SACHET';
  if (u === 'PACK' || u === 'PCK') return 'PK';
  return u;
}

function m13NormalizeExtractedSize_(value) {
  var s = String(value == null ? '' : value).toUpperCase().replace(/\s+/g, ' ').trim();
  if (!s) return '';
  s = s.replace(/[()]/g, '');
  s = s.replace(/\bLITRES?\b/g, 'LT').replace(/\bLTRS?\b/g, 'LT').replace(/\bL\b/g, 'LT');
  s = s.replace(/\bGRAMS?\b/g, 'G').replace(/\bGMS?\b/g, 'G').replace(/\bGM\b/g, 'G');
  s = s.replace(/\bV\s*CAPS?\b/g, 'VC').replace(/\bVCAPS?\b/g, 'VC').replace(/\bVC\b/g, 'VC');
  s = s.replace(/\bSOFT\s*GELS?\b/g, 'SG').replace(/\bSOFTGELS?\b/g, 'SG');
  s = s.replace(/\bCAPSULES?\b/g, 'C').replace(/\bCAPS?\b/g, 'C').replace(/\bVEGICAPS?\b/g, 'C');
  s = s.replace(/\bTABLETS?\b/g, 'T').replace(/\bTABS?\b/g, 'T');
  s = s.replace(/\bLOZENGES?\b/g, 'LOZ');
  s = s.replace(/\bSACHETS?\b/g, 'SACHET').replace(/\bSTICKS?\b/g, 'SACHET');
  s = s.replace(/\bPACK\b/g, 'PK').replace(/\bPCK\b/g, 'PK');
  s = s.replace(/\s*(X)\s*/g, 'X');
  s = s.replace(/(\d)\s+(MCG|MG|G|KG|ML|LT|IU|VC|SG|C|T|LOZ|PK|SACHET)\b/g, '$1$2');
  s = s.replace(/\.0(?=\D|$)/g, '');
  return s.replace(/\s+/g, ' ').trim();
}

function m13BuildAuditCellsFromMatchDetails_(matchDetails) {
  matchDetails = matchDetails || {};
  var barcodeUnknown = (matchDetails.barcodeMatched === undefined);
  var subIdUnknown   = (matchDetails.subIdMatched === undefined);
  var brandUnknown   = (matchDetails.brandMatched === undefined);
  var wspUnknown     = (matchDetails.wspMatched === undefined);

  var textUnknown = (matchDetails.productMatchPct === undefined || matchDetails.productMatchPct === null);
  var textPct = textUnknown ? '' : Math.round(matchDetails.productMatchPct * 100) + '%';
  var textOk = !textUnknown && matchDetails.productMatchPct >= 0.68;

  var size = matchDetails.size ? String(matchDetails.size).toUpperCase() : '';
  var type = '';
  if (matchDetails.typeForm && matchDetails.typeForm !== '-') type = matchDetails.typeForm;
  else if (matchDetails.type && matchDetails.type !== 'GENERAL' && matchDetails.type !== '-') type = matchDetails.type;

  return [
    m13CheckBox_(matchDetails.barcodeMatched === true, barcodeUnknown),
    m13CheckBox_(matchDetails.subIdMatched === true, subIdUnknown),
    m13CheckBox_(matchDetails.brandMatched === true, brandUnknown),
    m13CheckBox_(matchDetails.wspMatched === true, wspUnknown),
    m13AuditTextCell_(textOk, textUnknown, textPct),
    size || '',
    type ? String(type).toUpperCase() : ''
  ];
}

function m13BuildAuditCellsFromSupplierOverride_(sup, match) {
  var checks = (match && match.checks) ? match.checks : {};
  var source = match && match.source ? String(match.source).toUpperCase() : '';
  var textPctNum = (checks.productPct !== undefined && checks.productPct !== null) ? Number(checks.productPct) : null;
  var textUnknown = textPctNum === null || isNaN(textPctNum);
  var textOk = !textUnknown && textPctNum >= 68;
  var extraction = m13ExtractTruth_([
    sup && (sup.product || ''),
    sup && (sup.cleanProduct || ''),
    sup && (sup.cleanedProduct || '')
  ], sup && (sup.translatedBrand || sup.rawBrand || ''));

  return [
    m13CheckBox_(source === 'BARCODE' || checks.bc === true, false),
    m13CheckBox_(source === 'SUB ID' || checks.subId === true, false),
    m13CheckBox_(checks.brand === true, checks.brand === undefined),
    m13CheckBox_(checks.wspClose === true, checks.wspClose === undefined),
    textUnknown ? '' : (Math.round(textPctNum) + '%'),
    extraction.size || checks.size || '',
    extraction.type || checks.type || ''
  ];
}

function m13ApplyAuditCellsToRow_(row, cells) {
  cells = cells || [];
  for (var i = 0; i < 7; i++) {
    // First four audit columns are true checkbox indicators. TEXT %, SIZE and
    // TYPE are value columns, so blanks should remain blank.
    row[32 + i] = (cells[i] !== undefined && cells[i] !== null && String(cells[i]) !== '') ? cells[i] : (i < 4 ? '☐' : '');
  }
}

function m13BuildNotes_(kind, priceStatus, oldBrand, sup, pos, statusNote, matchDetails) {
  // Keep NOTES concise. The detailed match facts now live in dedicated columns
  // AG:AM, and verbose status text causes row-height blowouts in dense view.
  if (kind === 'REVIEW') {
    if (!sup || !sup.barcode || !sup.barcode.valid) return 'REVIEW: MISSING BARCODE';
    return 'REVIEW: BARCODE MISMATCH';
  }

  var parts = [];
  if (priceStatus && m13Upper_(priceStatus).indexOf('BARCODE UPDATE') >= 0) parts.push('BARCODE UPDATE REVIEW');
  if (oldBrand) parts.push('BRAND CHANGED FROM ' + oldBrand);
  return m13TrimNote_(parts.join(' | '));
}

function m13ShouldSkipDiscontinuedPos_(pos) {
  if (!pos) return true;
  if (!pos.rawBarcode && !pos.plu && !pos.descr) return true;
  var special = (CFG && CFG.SPECIAL_KEEP) ? CFG.SPECIAL_KEEP : ['SPECIAL ORDER','SPECIAL','BUY','SHIPPER','NO REORDER'];
  special = special.concat(['SPEC ORD']); // v6.3.86: short special-order Sub ID (SPEC ORD <PLU>)
  var joined = m13Upper_([pos.subId, pos.descr, pos.posDesc].join(' '));
  for (var i = 0; i < special.length; i++) if (joined.indexOf(m13Upper_(special[i])) >= 0) return true;
  return false;
}


function m13LoadDiscountRules_(ss, brandMap) {
  var rules = {
    __isPriorityRuleSet: true,
    __list: [],
    byPlu: {},
    byBarcode: {},
    byBrandSupplier: [],
    byBrand: [],
    bySupplier: [],
    byDescr: [] // legacy/fallback only, used after the requested priority buckets
  };

  var sh = m13Sheet_(ss, CFG.SH.SRC_DISC || 'SRC_POS_ONGOING_DISCOUNTS', false);
  if (!sh || sh.getLastRow() < M13.DATA_ROW) return rules;
  var headers = m13HeaderMap_(sh, M13.HEADER_ROW);
  var data = sh.getRange(M13.DATA_ROW, 1, sh.getLastRow() - M13.DATA_ROW + 1, sh.getLastColumn()).getDisplayValues();

  // v6.3.89 BE1: the discount brands are full POS brand names a shortened SUP BRAND can take.
  if (brandMap) m13BE1RegisterNames_(brandMap, data.map(function(row) { return m13ColVal_(row, headers, ['POS MASTER BRAND']); }));

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var brandRaw = m13Str_(m13ColVal_(row, headers, ['POS MASTER BRAND', 'POS BRAND PREFIX', 'POS BRAND', 'BRAND']));
    var supplierNum = m13Str_(m13ColVal_(row, headers, ['POS SUPPLIER NUMBER', 'SUPPLIER NUMBER', 'SUPPLIER']));
    var plu = m13Str_(m13ColVal_(row, headers, ['POS PLU', 'PLU']));
    var barcodeRaw = m13Str_(m13ColVal_(row, headers, ['POS MASTER BARCODE', 'BARCODE', 'POS BARCODE']));
    var descr = m13Str_(m13ColVal_(row, headers, ['POS DESCR', 'DESCR']));
    var pct = m13DiscountPctFromDiscountMarkup_(
      m13ColVal_(row, headers, ['POS DISCOUNT%', 'DISCOUNT%', 'DISCOUNT', 'POS DISCOUNT']),
      m13ColVal_(row, headers, ['POS MARKUP%', 'MARKUP%', 'POS MARKUP'])
    );
    if (!pct) continue;

    var brandKey = m13NormBrand_(m13TranslateBrand_(brandRaw, brandMap) || brandRaw);
    var barcodeObj = m13Barcode_(barcodeRaw);
    var barcode = barcodeObj.canonical;
    var type = m13DiscountType_(supplierNum, brandRaw, plu, barcodeRaw, descr);
    var rule = {
      brandKey:    brandKey,
      supplierNum: supplierNum,
      plu:         plu,
      barcode:     barcode,
      barcodeVariants: barcodeObj.variants || [],
      descr:       m13NormText_(descr),
      pct:         pct,
      type:        type,
      label:       type + ': ' + m13FmtPctNumber_(pct) + ' / ' + m13FmtPctNumber_(100 - pct) + '.',
      isMember:    m13IsTrueFlag_(m13ColVal_(row, headers, ['POS MEMBER', 'MEMBER'])),
      sheetRow:    M13.DATA_ROW + i,
      __used:      false,
      __usedMember:false
    };

    rules.__list.push(rule);

    // v6.3.69 surgical:
    // Product-specific rows can contain BOTH POS PLU and barcode. Store both.
    // Then stop so a product-specific row does not accidentally become a lower
    // priority brand/supplier-wide rule.
    if (plu) {
      var pluKey = m13NormId_(plu);
      if (!rules.byPlu[pluKey] || pct > rules.byPlu[pluKey].pct) rules.byPlu[pluKey] = rule;
    }

    if (barcode) {
      var bcKeys = barcodeObj.variants && barcodeObj.variants.length ? barcodeObj.variants : [barcode];
      for (var v = 0; v < bcKeys.length; v++) {
        var bcKey = bcKeys[v];
        if (!bcKey) continue;
        if (!rules.byBarcode[bcKey] || pct > rules.byBarcode[bcKey].pct) rules.byBarcode[bcKey] = rule;
      }
    }

    if (plu || barcode) continue;

    if (brandKey && supplierNum) {
      rules.byBrandSupplier.push(rule);
      continue;
    }

    if (brandKey) {
      rules.byBrand.push(rule);
      continue;
    }

    if (supplierNum) {
      rules.bySupplier.push(rule);
      continue;
    }

    if (rule.descr) rules.byDescr.push(rule);
  }

  return rules;
}

function m13IsTrueFlag_(v) {
  var s = m13Upper_(v);
  return s === 'TRUE' || s === '1' || s === 'YES' || s === 'Y' || s === 'MEMBER';
}
function m13DiscountPctFromDiscountMarkup_(discountRaw, markupRaw) {
  var keep = m13PctFlexible_(markupRaw);
  if (keep > 0 && keep <= 100) {
    if (keep > 1) keep = keep / 100;
    return +(100 * (1 - keep)).toFixed(4);
  }
  var disc = m13PctFlexible_(discountRaw);
  if (!disc) return 0;
  if (disc <= 1) disc = disc * 100;
  return +disc.toFixed(4);
}


function m13BestDiscountForSupplier_(sup, rules, pos) {
  var blank = { pct: 0, label: '', type: '', isMember: false };
  if (!rules) return blank;

  // v6.3.8 priority rules, refined v6.3.69:
  // POS PLU / supplier sub-id → Barcode → Brand+Supplier → Brand → Supplier.
  // Only one discount is returned.
  if (rules.__isPriorityRuleSet) {
    var supBrand = m13NormBrand_(sup.translatedBrand || sup.rawBrand);
    var supDescr = m13NormText_(sup.product || '');
    var supBarcode = sup.barcode ? sup.barcode.canonical : '';
    var supBarcodeVariants = sup.barcode && sup.barcode.variants ? sup.barcode.variants : [];
    var supSupplier = m13NormId_(sup.supplierNum || '');
    var supPlu = m13NormId_(sup.subId || '');
    var posPlu = pos && pos.plu ? m13NormId_(pos.plu) : '';
    var posSubId = pos && pos.subId ? m13NormId_(pos.subId) : '';
    // v6.3.89 BE1: the matched POS brand also counts when it is the same brand shortened.
    var posBrandKey = '';
    if (pos) {
      var posBrandName = pos.translatedBrand || pos.brand || '';
      var pbk = m13NormBrand_(posBrandName);
      if (pbk && pbk !== supBrand && m13BE1BrandsEquivalent_(posBrandName, sup.translatedBrand || sup.rawBrand)) posBrandKey = pbk;
    }
    function brandHit_(r) { return !!r.brandKey && (r.brandKey === supBrand || (!!posBrandKey && r.brandKey === posBrandKey)); }

    function pack_(r) {
      if (r) r.__used = true;
      return r ? { pct: r.pct || 0, label: r.label || '', type: r.type || '', isMember: !!r.isMember } : blank;
    }

    function bestFromList_(list, predicate) {
      var best = null;
      if (!list || !list.length) return null;
      for (var i = 0; i < list.length; i++) {
        var r = list[i];
        if (!predicate(r)) continue;
        if (!best || Number(r.pct || 0) > Number(best.pct || 0)) best = r;
      }
      return best;
    }

    // 1) Product-specific PLU/sub-id bucket.
    // POS PLU is checked before supplier sub-id because supplier sub-id is
    // distributor-specific and often differs from your POS data.
    if (rules.byPlu) {
      if (posPlu && rules.byPlu[posPlu]) return pack_(rules.byPlu[posPlu]);
      if (posSubId && rules.byPlu[posSubId]) return pack_(rules.byPlu[posSubId]);
      if (supPlu && rules.byPlu[supPlu]) return pack_(rules.byPlu[supPlu]);
    }

    // 2) Barcode, including POS and supplier barcode variants.
    if (rules.byBarcode) {
      var seenBc = {};
      function barcodeRule_(b) {
        b = String(b || '').trim();
        if (!b || seenBc[b]) return null;
        seenBc[b] = true;
        return rules.byBarcode[b] || null;
      }

      var hit = null;

      if (pos) {
        hit = barcodeRule_(pos.barcode);
        if (hit) return pack_(hit);
        if (pos.variants) {
          for (var pv = 0; pv < pos.variants.length; pv++) {
            hit = barcodeRule_(pos.variants[pv]);
            if (hit) return pack_(hit);
          }
        }
      }

      hit = barcodeRule_(supBarcode);
      if (hit) return pack_(hit);
      for (var bv = 0; bv < supBarcodeVariants.length; bv++) {
        hit = barcodeRule_(supBarcodeVariants[bv]);
        if (hit) return pack_(hit);
      }
    }

    // 3) Brand + Supplier
    var brandSupplierRule = bestFromList_(rules.byBrandSupplier, function(r) {
      return brandHit_(r) &&
             r.supplierNum && m13NormId_(r.supplierNum) === supSupplier;
    });
    if (brandSupplierRule) return pack_(brandSupplierRule);

    // 4) Brand only
    var brandRule = bestFromList_(rules.byBrand, function(r) {
      return brandHit_(r);
    });
    if (brandRule) return pack_(brandRule);

    // 5) Supplier only
    var supplierRule = bestFromList_(rules.bySupplier, function(r) {
      return r.supplierNum && m13NormId_(r.supplierNum) === supSupplier;
    });
    if (supplierRule) return pack_(supplierRule);

    // Legacy/fallback only: description-only rules that do not fall into the
    // requested priority buckets above.
    var descrRule = bestFromList_(rules.byDescr, function(r) {
      return r.descr && supDescr && (supDescr.indexOf(r.descr) >= 0 || r.descr.indexOf(supDescr) >= 0);
    });
    if (descrRule) return pack_(descrRule);

    return blank;
  }

  // Old array-style fallback retained for safety.
  var best = blank;
  if (!rules.length) return best;

  var brand = m13NormBrand_(sup.translatedBrand || sup.rawBrand);
  var descr = m13NormText_(sup.product || '');
  var barcodeSeen = {};
  function addBarcode_(b) { b = String(b || '').trim(); if (b) barcodeSeen[b] = true; }
  if (sup.barcode) {
    addBarcode_(sup.barcode.canonical);
    if (sup.barcode.variants) for (var sb = 0; sb < sup.barcode.variants.length; sb++) addBarcode_(sup.barcode.variants[sb]);
  }
  if (pos) {
    addBarcode_(pos.barcode);
    if (pos.variants) for (var pb = 0; pb < pos.variants.length; pb++) addBarcode_(pos.variants[pb]);
  }

  var pluSeen = {};
  function addPlu_(p) { p = m13NormId_(p || ''); if (p) pluSeen[p] = true; }
  addPlu_(sup.subId);
  addPlu_(pos && pos.plu);
  addPlu_(pos && pos.subId);

  for (var i = 0; i < rules.length; i++) {
    var r = rules[i];
    if (r.supplierNum && sup.supplierNum && m13NormId_(r.supplierNum) !== m13NormId_(sup.supplierNum)) continue;
    if (r.brandKey && brand && r.brandKey !== brand) continue;
    if (r.plu && !pluSeen[m13NormId_(r.plu)]) continue;
    if (r.barcode && !barcodeSeen[r.barcode]) continue;
    if (r.descr && descr && descr.indexOf(r.descr) < 0 && r.descr.indexOf(descr) < 0) continue;
    if (r.pct > best.pct) best = { pct: r.pct, label: r.label, type: r.type, isMember: !!r.isMember };
  }
  return best;
}
// =============================================================================
//  PRICE TIER HELPERS  (v6.3.7+)
// =============================================================================

/**
 * Ceiling-round a raw price to the nearest $0.05, then back-calculate as % of RRP.
 * Returns 100 if nominalPct >= 100 or RRP is zero/missing.
 */
function m13TierPct_(rrp, nominalPct) {
  if (!rrp || nominalPct >= 100) return 100;

  // Integer cents math avoids floating-point drift before the $0.05 ceiling.
  var rrpCents = Math.round(Number(rrp || 0) * 100);
  if (!rrpCents) return 100;
  var rawCents = Math.round(rrpCents * Number(nominalPct || 0) / 100);
  var remainder = rawCents % 5;
  var humanizedCents = remainder === 0 ? rawCents : rawCents + (5 - remainder);
  var pct = (humanizedCents / rrpCents) * 100;
  return Math.round(pct * 100) / 100;
}

/**
 * Staff price (pr5): lastPrice (always ex-GST) × 1.1 handling markup,
 * plus a further 10% if the product has GST (gstPct === 10).
 * Result ceiling-rounded to the nearest $0.05 then back-calc'd as % of RRP.
 */
function m13Pr5Pct_(rrp, lastPrice, gstPct) {
  if (!rrp || !lastPrice) return 100;
  var raw       = lastPrice * 1.1 * (gstPct === 10 || Number(gstPct) === 10 ? 1.1 : 1);
  var humanized = Math.ceil(Math.round(raw / 0.05 * 1e8) / 1e8) * 0.05;
  humanized     = Math.round(humanized * 100) / 100;

  var pct = Math.round(humanized / rrp * 10000) / 100;
  return m13PosSafePriceLevelPct_(pct);
}

/**
 * POS import guard for price-level percentages.
 * Price Level 5 can become very low when a shelf RRP is deliberately or
 * accidentally much higher than the last-price based staff calculation.
 * PosActive rejects those rows during import, so keep PR5 inside a safe range.
 * This only changes the exported percentage value; it does not change RRP,
 * WSP, last price, matching, identity, barcode, or shelf-price calculations.
 */
function m13PosSafePriceLevelPct_(pct) {
  var n = Number(pct || 0);
  if (!isFinite(n) || n <= 0) return 100;

  // Observed POS upload failures occurred where PR5 was below 20%.
  // Keep the minimal valid floor instead of forcing 100, so the export remains
  // as close as possible to the intended staff-price calculation.
  if (n < 20) return 20;
  if (n > 100) return 100;
  return Math.round(n * 100) / 100;
}

/**
 * Returns true if the product qualifies for the 90% loyalty-member pricing tier.
 * Checks three sources in priority order:
 *   1. Column O (POS MEMBER) on the supplier row — direct flag passed as memberFlag.
 *   2. SRC_POS_PRODUCT_PREFIX col D — brand-level member flag in prefixMap.__memberBrands.
 *   3. SRC_POS_ONGOING_DISCOUNTS col J — isMember flag on matching discount rules.
 */

function m13IsMemberBrand_(brandNorm, supplierNum, memberFlag, prefixMap, discountRules) {
  if (m13IsTrueFlag_(memberFlag)) return true;

  if (prefixMap && prefixMap.__memberBrands && brandNorm &&
      prefixMap.__memberBrands[brandNorm]) {
    m13MarkPrefixRowUsed_(prefixMap, brandNorm);
    return true;
  }

  var list = [];
  if (discountRules && discountRules.__isPriorityRuleSet && discountRules.__list) list = discountRules.__list;
  else if (discountRules && discountRules.length) list = discountRules;

  for (var i = 0; i < list.length; i++) {
    var r = list[i];
    if (!r.isMember) continue;

    // ── FIX: PLU/barcode-only rules have no brand or supplier key.
    // They are product-specific discounts, NOT brand-level membership indicators.
    // Without this guard, every product matches because the next two conditions
    // only skip when a key EXISTS and DOESN'T match — never when no key exists.
    if (!r.brandKey && !r.supplierNum) continue;

    if (r.brandKey    && brandNorm   && r.brandKey !== brandNorm) continue;
    if (r.supplierNum && supplierNum &&
        m13NormId_(r.supplierNum) !== m13NormId_(supplierNum)) continue;
    r.__used = true;
    r.__usedMember = true;
    return true;
  }
  return false;
}

/**
 * Compute all pr_pc / ret_price values for one product row.
 *
 * Rules:
 *   dissno 33 / 29 / 8 / 13  → pr1–pr4 = 100, pr6–pr9 = 100, ret = 100
 *                               pr5 always = staff formula (exception never suppresses it)
 *   isMember true             → pr1 = pr2 = 90% tier; else pr1 = pr2 = 100
 *   pr3                       → 85% tier
 *   pr4                       → 80% tier
 *   ret                       → 85% tier
 *   pr5                       → lastPrice × 1.1 [× 1.1 if GST], ceiling → back-calc
 *   pr6–pr9                   → 100 (always)
 *
 * All non-100 values are ceiling-rounded to the nearest $0.05 then expressed as
 * a 2dp percentage of RRP (e.g. 85.08 for $46.75 on a $54.95 RRP).
 */
function m13CalcPriceTiers_(rrp, lastPrice, gstPct, dissno, isMember) {
  var EXCEPT = { '33': 1, '29': 1, '8': 1, '13': 1 };
  var isExcept = !!EXCEPT[String(dissno || '').trim().split('.')[0]];
  var pr5 = m13Pr5Pct_(rrp, lastPrice, gstPct);

  if (isExcept) {
    return { pr1: 100, pr2: 100, pr3: 100, pr4: 100,
             pr5: pr5,
             pr6: 100, pr7: 100, pr8: 100, pr9: 100, ret: 100 };
  }
  var tier1 = isMember ? 90 : 100;
  return {
    pr1: m13TierPct_(rrp, tier1),
    pr2: m13TierPct_(rrp, 90),
    pr3: m13TierPct_(rrp, 85),
    pr4: m13TierPct_(rrp, 80),
    pr5: pr5,
    pr6: 100, pr7: 100, pr8: 100, pr9: 100,
    ret: m13TierPct_(rrp, 85)
  };
}

// =============================================================================

function m13DiscountType_(supplierNum, brandRaw, plu, barcodeRaw, descr) {
  if (plu) return 'PLU';
  if (barcodeRaw) return 'BARCODE';
  if (supplierNum && brandRaw) return 'SUPPLIER + BRAND';
  if (supplierNum) return 'SUPPLIER (POS)';
  if (brandRaw) return 'BRAND';
  if (descr) return 'PRODUCT';
  return 'DISCOUNT';
}

function m13PctFlexible_(v) {
  var s = m13Str_(v);
  if (!s) return 0;
  var n = parseFloat(s.replace('%', '').replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function m13FmtPctNumber_(n) {
  if (!(Number(n) || Number(n) === 0)) return '';
  return (Math.round(Number(n) * 100) / 100).toFixed(2) + '%';
}

function m13NormId_(s) { return m13Upper_(s).replace(/[^A-Z0-9]/g, ''); }

function m13PrepareOutSheet_(ss, dataRows, options) {
  options = options || {};
  var name = M13.OUT_SHEET;
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);

  var needRows = Math.max(2 + dataRows, 3);
  var needCols = M13.HEADERS.length;

  if (sh.getMaxColumns() < needCols) sh.insertColumnsAfter(sh.getMaxColumns(), needCols - sh.getMaxColumns());
  if (sh.getMaxRows() < needRows) sh.insertRowsAfter(sh.getMaxRows(), needRows - sh.getMaxRows());

  var extraRows = sh.getMaxRows() - needRows;
  if (extraRows > 0) {
    try { sh.deleteRows(needRows + 1, extraRows); } catch(eDel) {}
  }

  var width = Math.max(needCols, sh.getLastColumn());
  if (sh.getMaxRows() > 2) {
    try {
      sh.getRange(3, 1, sh.getMaxRows() - 2, width)
        .clearContent()
        .clearNote()
        .setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
    } catch(eClr) {}
  }

  var row1 = m13OutTotalsRow_();
  sh.getRange(1, 1, 1, needCols).setValues([row1]);
  sh.getRange(2, 1, 1, needCols).setValues([M13.HEADERS]);

  var F = (CFG && CFG.FONT) ? CFG.FONT : { FAMILY: 'Google Sans', SIZE: 8 };
  var R = (CFG && CFG.ROW) ? CFG.ROW : { TITLE: 28, HEADER: 28, DATA: 20 };

  sh.getRange(1, 1, 1, needCols)
    .setBackground(LEGEND.TITLE_BG).setFontColor(LEGEND.TITLE_FG)
    .setFontFamily(F.FAMILY).setFontSize(F.SIZE).setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);

  sh.getRange(2, 1, 1, needCols)
    .setBackground(LEGEND.HDR_BG).setFontColor(LEGEND.HDR_FG)
    .setFontFamily(F.FAMILY).setFontSize(F.SIZE).setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);

  try { sh.setFrozenRows(2); } catch(eFreeze) {}
  try { sh.setRowHeight(1, R.TITLE || 28); } catch(eH1) {}
  try { sh.setRowHeight(2, R.HEADER || 28); } catch(eH2) {}

  // Default behaviour is unchanged for every existing caller. The full FM1 build
  // may explicitly defer these two body pre-format calls because m13WriteOut_()
  // performs the barcode text format before setValues and the final row-height
  // enforcement after formatting/flush. Final sheet state therefore stays the same.
  if (!options.deferBodyPreformat) {
    m13FixOutMergedRowHeights_(sh, Math.max(1, needRows - 2));
    m13FormatBarcodeTextColumns_(sh, Math.max(1, needRows - 2));
  }

  try { if (sh.getFilter()) sh.getFilter().remove(); } catch(eF0) {}
  try { sh.getRange(2, 1, Math.max(needRows - 1, 1), needCols).createFilter(); } catch(eF1) {}

  return sh;
}

function m13FormatBarcodeTextColumns_(sh, nData) {
  if (!sh || !nData || nData <= 0) return;
  var lastCol = sh.getMaxColumns();
  var cols = [11, 12, 13, 14, 42, 43, 44]; // K:L, M:N, AP:AR final POS ids
  var ranges = [];
  for (var i = 0; i < cols.length; i++) {
    if (cols[i] <= lastCol) ranges.push(m13ColLetter_(cols[i]) + '3:' + m13ColLetter_(cols[i]) + (nData + 2));
  }
  if (ranges.length) {
    try { sh.getRangeList(ranges).setNumberFormat('@'); } catch(eText) {}
  }
}

function m13FixOutMergedRowHeights_(sh, nData) {
  if (!sh || !nData || nData <= 0) return;
  var height = (CFG && CFG.ROW && CFG.ROW.DATA) ? CFG.ROW.DATA : 20;
  try {
    sh.setRowHeights(3, nData, height);
  } catch(eRowHeight) {
    for (var r = 0; r < nData; r += 500) {
      try { sh.setRowHeights(3 + r, Math.min(500, nData - r), height); } catch(_eRowHeight2) {}
    }
  }
}

function m13ColLetter_(col) {
  var s = '';
  while (col > 0) {
    var m = (col - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    col = Math.floor((col - m) / 26);
  }
  return s;
}

function m13LoadFindReplaceRules_(ss) {
  var rules = [];
  var sh = m13Sheet_(ss, CFG.SH.SRC_FR || 'SRC_POS_FIND_REPLACE', false);
  if (!sh || sh.getLastRow() < M13.DATA_ROW) return rules;
  var data = sh.getRange(M13.DATA_ROW, 1, sh.getLastRow() - M13.DATA_ROW + 1, Math.max(3, sh.getLastColumn())).getDisplayValues();
  for (var i = 0; i < data.length; i++) {
    var find = m13Str_(data[i][1]).toUpperCase();
    var repl = m13CleanFindReplaceReplacement_(find, m13Str_(data[i][2]).toUpperCase());
    if (find) rules.push(m13FM1CompileFindReplaceRule_(find, repl, M13.DATA_ROW + i));
  }
  rules.sort(function(a, b) { return String(b.find || '').length - String(a.find || '').length; });
  return rules;
}


function m13CleanFindReplaceReplacement_(find, repl) {
  // Output-description safety: when a phrase rule contains ampersand wording,
  // keep the replacement compact so a later generic "& -> AND" rule cannot turn
  // short flavour text like "BER & CRM" into the longer "BER AND CRM".
  find = m13Str_(find).toUpperCase();
  repl = m13Str_(repl).toUpperCase();
  if (!repl) return '';
  if (find.indexOf('&') >= 0 && repl.indexOf('&') >= 0) {
    repl = repl.replace(/\s*&\s*/g, ' ');
  }
  return repl.replace(/\s+/g, ' ').trim();
}

function m13ApplyFindReplace_(text, rules) {
  var out = m13Str_(text).toUpperCase();
  if (!rules || !rules.length) return out;

  // Longest-first rules are loaded by m13LoadFindReplaceRules_(). Every rule is
  // applied with the same alphanumeric boundaries as before. FM1 simply reuses
  // the already-compiled RegExp object instead of rebuilding it for every product.
  for (var i = 0; i < rules.length; i++) {
    var find = m13Str_(rules[i].find).toUpperCase();
    var repl = m13Str_(rules[i].repl).toUpperCase();
    if (!find) continue;
    try {
      var hasPrefix;
      var re;
      if (rules[i].__fm1Regex) {
        re = rules[i].__fm1Regex;
        re.lastIndex = 0;
        hasPrefix = !!rules[i].__fm1HasPrefix;
      } else {
        var pat = m13WholeTokenPattern_(find);
        re = new RegExp(pat.pattern, 'g');
        hasPrefix = !!pat.hasPrefix;
      }
      var used = false;
      out = out.replace(re, function(match, prefix) {
        used = true;
        return (hasPrefix ? (prefix || '') : '') + repl;
      });
      if (used) rules[i].__used = true;
      out = out.replace(/\s+/g, ' ').trim();
    } catch(e) {}
  }

  return out.replace(/\s+/g, ' ').trim();
}



function m13DP5ApplyFindReplaceForSupplierDescr_(text, rules, dp9Capture) {
  // Description-only F/R wrapper. The shared m13ApplyFindReplace_ remains
  // unchanged because it is also used by the established POS matching index.
  // Specific/long phrase rules still run first. Only the final generic hyphen
  // deletion is treated differently for Q-derived display text:
  //   3-6 stays 3-6; CANDA-PLEX becomes CANDA PLEX rather than CANDAPLEX.
  var out = m13Str_(text).toUpperCase();
  if (!rules || !rules.length) return out;

  for (var i = 0; i < rules.length; i++) {
    var find = m13Str_(rules[i].find).toUpperCase();
    var repl = m13Str_(rules[i].repl).toUpperCase();
    if (!find) continue;

    try {
      if (find === '-' && repl === '') {
        var beforeHyphen = out;
        // Remove only non-numeric-range hyphens and replace them with a word
        // boundary so product identity does not get glued into a new token.
        out = out.replace(/(^|[^0-9])-(?=[^0-9]|$)/g, '$1 ');
        if (out !== beforeHyphen) rules[i].__used = true;
        out = out.replace(/\s+/g, ' ').trim();
        continue;
      }

      var hasPrefix;
      var re;
      if (rules[i].__fm1Regex) {
        re = rules[i].__fm1Regex;
        re.lastIndex = 0;
        hasPrefix = !!rules[i].__fm1HasPrefix;
      } else {
        var pat = m13WholeTokenPattern_(find);
        re = new RegExp(pat.pattern, 'g');
        hasPrefix = !!pat.hasPrefix;
      }

      var used = false;
      out = out.replace(re, function(match, prefix) {
        used = true;
        return (hasPrefix ? (prefix || '') : '') + repl;
      });
      if (used) {
        rules[i].__used = true;
        if (dp9Capture && m13DP9PhraseRuleEligible_(find, repl)) {
          if (!dp9Capture.exact) dp9Capture.exact = [];
          m13DP9PushDirective_(dp9Capture.exact, find, repl, true);
        }
      }
      out = out.replace(/\s+/g, ' ').trim();
    } catch(e) {}
  }

  return out.replace(/\s+/g, ' ').trim();
}


// =============================================================================
// DP9 — EXPLICIT FIND/REPLACE AUTHORITY FOR COLUMN P ONLY
// Q remains factual truth. Long explicit SRC_POS_FIND_REPLACE phrase mappings
// are presentation vocabulary supplied by the user and must survive later
// compression. O can confirm a near-identical phrase mapping, but can never
// introduce a replacement unless that replacement is configured in SRC.
// =============================================================================
function m13DP9PhraseTokens_(text) {
  return m13Upper_(text || '')
    .replace(/[^A-Z0-9%+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(function(v) { return !!v; });
}

function m13DP9PhraseRuleEligible_(find, repl) {
  find = m13Upper_(find || '');
  repl = m13Upper_(repl || '');
  if (!find || !repl || !/[A-Z0-9]/.test(repl)) return false;
  return m13DP9PhraseTokens_(find).length >= 5;
}

function m13DP9PushDirective_(arr, find, repl, exact) {
  arr = arr || [];
  find = m13Upper_(find || '');
  repl = m13Upper_(repl || '');
  if (!m13DP9PhraseRuleEligible_(find, repl)) return arr;
  var key = find + '=>' + repl + '|' + (exact ? 'E' : 'N');
  for (var i = 0; i < arr.length; i++) if (arr[i] && arr[i].key === key) return arr;
  arr.push({ key:key, find:find, repl:repl, exact:!!exact,
    findTokens:m13DP9PhraseTokens_(find), replTokens:m13DP9PhraseTokens_(repl) });
  return arr;
}

function m13DP9LcsLen_(a, b) {
  a = a || []; b = b || [];
  var prev = new Array(b.length + 1).fill(0);
  for (var i = 0; i < a.length; i++) {
    var cur = new Array(b.length + 1).fill(0);
    for (var j = 0; j < b.length; j++) cur[j + 1] = (a[i] === b[j]) ? (prev[j] + 1) : Math.max(prev[j + 1], cur[j]);
    prev = cur;
  }
  return prev[b.length] || 0;
}

function m13DP9RuleExactOnText_(text, rule) {
  text = m13Upper_(text || '');
  var find = m13Upper_(rule && rule.find || '');
  if (!text || !find) return false;
  try {
    var pat = m13WholeTokenPattern_(find);
    return new RegExp(pat.pattern, 'g').test(text);
  } catch (_e) { return false; }
}

function m13DP9BuildNearFindReplaceDirectives_(sourceText, rules, exactDirectives) {
  var out = [], q = m13DP9PhraseTokens_(sourceText || '');
  if (!q.length || !rules || !rules.length) return out;
  var exactKeys = {};
  exactDirectives = exactDirectives || [];
  for (var e = 0; e < exactDirectives.length; e++) if (exactDirectives[e] && exactDirectives[e].find) exactKeys[exactDirectives[e].find] = true;

  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i] || {}, find = m13Upper_(rule.find || ''), repl = m13Upper_(rule.repl || '');
    if (!m13DP9PhraseRuleEligible_(find, repl) || exactKeys[find] || m13DP9RuleExactOnText_(sourceText, rule)) continue;
    var ft = m13DP9PhraseTokens_(find);
    if (ft.length < 6) continue;
    if (m13DP9LcsLen_(ft, q) < ft.length - 1) continue;
    if (q.indexOf(ft[0]) < 0 || q.indexOf(ft[ft.length - 1]) < 0) continue;
    m13DP9PushDirective_(out, find, repl, false);
  }
  return out;
}

function m13DP9CanonSetFromText_(text, sup) {
  var toks = m13DP9PhraseTokens_(text || ''), set = {};
  for (var i = 0; i < toks.length; i++) {
    var k = m13DP5MappedIdentityKey_(toks[i], sup);
    if (k) set[k] = true;
  }
  return set;
}

function m13DP9ReplacementConfirmedByO_(directive, originalPosDescr, sup) {
  if (!directive) return false;
  if (directive.exact) return true;
  if (!originalPosDescr) return false;
  var oSet = m13DP9CanonSetFromText_(originalPosDescr, sup), rt = directive.replTokens || [];
  if (!rt.length) return false;
  for (var i = 0; i < rt.length; i++) {
    var rk = m13DP5MappedIdentityKey_(rt[i], sup);
    if (rk && !oSet[rk]) return false;
  }
  return true;
}

function m13DP9ActiveFindReplaceDirectives_(originalPosDescr, sup) {
  var all = (sup && sup.__dp9FrDirectives) || [], out = [];
  for (var i = 0; i < all.length; i++) if (all[i] && (all[i].exact || m13DP9ReplacementConfirmedByO_(all[i], originalPosDescr, sup))) out.push(all[i]);
  out.sort(function(a,b){ if (!!a.exact !== !!b.exact) return a.exact ? -1 : 1; return String(b.find||'').length - String(a.find||'').length; });
  return out;
}

function m13DP9ReferenceAnchorKeys_(directive, originalPosDescr, supplierRaw, sup) {
  var keep = {};
  if (!directive || !originalPosDescr || !supplierRaw) return keep;
  var oSet = m13DP9CanonSetFromText_(originalPosDescr, sup), qSet = m13DP9CanonSetFromText_(supplierRaw, sup), replSet = {};
  var rt = directive.replTokens || [];
  for (var r = 0; r < rt.length; r++) replSet[m13DP5MappedIdentityKey_(rt[r], sup)] = true;
  var generic = {ALL:1,IN:1,ONE:1,DAILY:1,HEALTH:1,SUPPLEMENT:1,SUPP:1,PRODUCT:1,PRODUCTS:1,FORMULA:1,RANGE:1,WITH:1,AND:1,THE:1,FOR:1,FROM:1,OF:1,TO:1,OR:1,PURE:1,NATURAL:1,ORGANIC:1,ORG:1};
  var ft = directive.findTokens || [];
  for (var i = 0; i < ft.length; i++) {
    var k = m13DP5MappedIdentityKey_(ft[i], sup);
    if (!k || generic[k] || replSet[k]) continue;
    if (oSet[k] && qSet[k]) keep[k] = true;
  }
  return keep;
}

function m13DP9AnchorLiterals_(anchors, originalPosDescr, sup) {
  var out = [], seen = {};
  var toks = m13DP9PhraseTokens_(originalPosDescr || '');
  for (var i = 0; i < toks.length; i++) {
    var k = m13DP5MappedIdentityKey_(toks[i], sup);
    if (!k || !anchors[k] || seen[k]) continue;
    seen[k] = true;
    out.push(toks[i]);
    if (out.length >= 2) break;
  }
  return out;
}

function m13DP9ProtectedFindReplaceKeys_(originalPosDescr, supplierRaw, sup) {
  var map = {}, active = m13DP9ActiveFindReplaceDirectives_(originalPosDescr, sup);
  for (var i = 0; i < active.length; i++) {
    var rt = active[i].replTokens || [];
    for (var r = 0; r < rt.length; r++) { var k = m13DP5MappedIdentityKey_(rt[r], sup); if (k) map[k] = true; }
    var anchors = m13DP9ReferenceAnchorKeys_(active[i], originalPosDescr, supplierRaw, sup);
    for (var a in anchors) map[a] = true;
  }
  return map;
}

function m13DP9ApplyExplicitFindReplaceDirectives_(body, originalPosDescr, supplierRaw, sup) {
  var out = m13DP1Clean_(body || '');
  if (!out || !sup) return out;
  var active = m13DP9ActiveFindReplaceDirectives_(originalPosDescr, sup);
  if (!active.length) return out;

  for (var d = 0; d < active.length; d++) {
    var dir = active[d], anchors = m13DP9ReferenceAnchorKeys_(dir, originalPosDescr, supplierRaw, sup), replKeys = {};
    var replTokens = dir.replTokens || [];
    for (var rr = 0; rr < replTokens.length; rr++) { var rrk = m13DP5MappedIdentityKey_(replTokens[rr], sup); if (rrk) replKeys[rrk] = true; }

    var consume = {}, ft = dir.findTokens || [];
    for (var f = 0; f < ft.length; f++) {
      var fk = m13DP5MappedIdentityKey_(ft[f], sup);
      if (fk && !anchors[fk] && !replKeys[fk]) consume[fk] = true;
    }

    var parts = out.split(' ').filter(function(v){return !!v;}), cleaned = [];
    for (var p = 0; p < parts.length; p++) {
      var pk = m13DP5MappedIdentityKey_(parts[p], sup);
      if (consume[pk] || replKeys[pk]) continue;
      cleaned.push(parts[p]);
    }

    // O may restore a familiar anchor only when that exact concept is present in
    // both Q and the matched SRC phrase. This is reference-only, never O-only data.
    var have = {};
    for (var h = 0; h < cleaned.length; h++) have[m13DP5MappedIdentityKey_(cleaned[h], sup)] = true;
    var anchorLits = m13DP9AnchorLiterals_(anchors, originalPosDescr, sup);
    var missingAnchors = [];
    for (var al = 0; al < anchorLits.length; al++) {
      var ak = m13DP5MappedIdentityKey_(anchorLits[al], sup);
      if (ak && !have[ak]) { missingAnchors.push(anchorLits[al]); have[ak] = true; }
    }
    if (missingAnchors.length) cleaned = missingAnchors.concat(cleaned);

    var at = 0;
    for (var c = 0; c < cleaned.length; c++) {
      var ck = m13DP5MappedIdentityKey_(cleaned[c], sup);
      if (anchors[ck]) at = c + 1;
      if (m13DP1IsSizeToken_(cleaned[c])) break;
    }
    if (!Object.keys(anchors).length) at = 0;
    var literal = m13DP1Clean_(dir.repl || '').split(' ').filter(function(v){return !!v;});
    cleaned.splice.apply(cleaned, [at, 0].concat(literal));
    out = m13DP1Dedupe_(cleaned.join(' '), originalPosDescr, supplierRaw);
  }
  return out.replace(/\s+/g, ' ').trim();
}

function m13ApplyFinalColumnPFindReplace_(text, rules, supplierRaw, originalPosDescr, brandPrefix) {
  var out = m13Str_(text).toUpperCase();
  if (!out) return '';

  // DP5: the final F/R pass must never rewrite the brand grouping prefix itself.
  // Example: fallback prefix AUSTRALIA'S MANUKA must not become AUS'S MANUKA
  // because a generic AUSTRALIA -> AUS product-description rule exists.
  var fixedPrefix = m13DP1Clean_(brandPrefix || '');
  var body = fixedPrefix ? m13DP1StripPrefix_(out, fixedPrefix) : out;

  // Supplier evidence restoration is deliberately tiny and late-stage only.
  // It restores visible punctuation from the supplier product where the compact
  // no-punctuation form has survived into final Column P, e.g. ZMAG -> Z-MAG.
  body = m13RestoreFinalColumnPSupplierEvidence_(body, supplierRaw, originalPosDescr);

  if (!rules || !rules.length) return m13DP1Join_(fixedPrefix, body).replace(/\s+/g, ' ').trim();

  out = body;

  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i] || {};
    if (!m13FinalColumnPFindReplaceRuleAllowed_(rule, supplierRaw, originalPosDescr)) continue;

    var find = m13Str_(rule.find).toUpperCase();
    var repl = m13Str_(rule.repl).toUpperCase();
    try {
      var hasPrefix;
      var re;
      if (rule.__fm1Regex) {
        re = rule.__fm1Regex;
        re.lastIndex = 0;
        hasPrefix = !!rule.__fm1HasPrefix;
      } else {
        var pat = m13WholeTokenPattern_(find);
        re = new RegExp(pat.pattern, 'g');
        hasPrefix = !!pat.hasPrefix;
      }
      var used = false;
      out = out.replace(re, function(match, prefix) {
        used = true;
        return (hasPrefix ? (prefix || '') : '') + repl;
      });
      if (used) rule.__used = true;
      out = m13FinalFormatDescr_(out);
    } catch(e) {}
  }

  out = m13RestoreFinalColumnPSupplierEvidence_(out, supplierRaw, originalPosDescr);
  out = m13DP5RemoveSentinels_(out);
  out = m13DP5RemovePrefixOverlap_(out, fixedPrefix);
  return m13DP1Join_(fixedPrefix, out).replace(/\s+/g, ' ').trim();
}

function m13FinalColumnPFindReplaceRuleAllowed_(rule, supplierRaw, originalPosDescr) {
  var find = m13Str_(rule && rule.find).toUpperCase();
  var repl = m13Str_(rule && rule.repl).toUpperCase();
  if (!find || !repl) return false;

  // Final Column P is already symbol-cleaned. Do not re-run destructive cleanup
  // rules like "- -> blank", "( -> blank", ") -> blank", "* -> blank", or
  // phrase deletion rows with blank replacement.
  if (!/[A-Z0-9]/.test(find)) return false;
  if (/^[^A-Z0-9]+$/.test(find)) return false;
  if (find.charAt(0) === '(' || find.indexOf('*') >= 0) return false;
  if (find === '&') return false;

  // Known final-display protections from the ATP test set:
  // - LCARN is the accepted compact POS description form for acetyl L-carnitine.
  // - BETA ALANINE should stay readable in final Column P if supplier evidence
  //   restored it from legacy BALA/B-ALA style POS text.
  var protectedFinds = {
    'LCARN': true,
    'LCARNITINE': true,
    'L-CARNITINE': true,
    'BETA ALANINE': true,
    'BETA ALANINE POWDER': true
  };
  if (protectedFinds[find]) return false;

  return true;
}

function m13RestoreFinalColumnPSupplierEvidence_(text, supplierRaw, originalPosDescr) {
  var out = m13Str_(text).toUpperCase();

  // DP4: Q-only evidence restoration. O is intentionally ignored here because
  // punctuation/form restored into P is still product information and therefore
  // must be supported by the current supplier product text.
  var source = m13Upper_(supplierRaw || '');
  if (!out || !source) return out;

  var hyphenTokens = source.match(/\b[A-Z0-9]+(?:-[A-Z0-9]+)+\b/g) || [];
  var seen = {};
  for (var i = 0; i < hyphenTokens.length; i++) {
    var token = m13Str_(hyphenTokens[i]).toUpperCase();
    if (!token || seen[token]) continue;
    seen[token] = true;
    var compact = token.replace(/-/g, '');
    if (compact.length < 4) continue;
    try {
      out = out.replace(new RegExp('\\b' + m13EscReg_(compact) + '\\b', 'g'), token);
    } catch(e) {}
  }

  if (/\bBETA\s+ALANINE\b/.test(source)) {
    out = out.replace(/\bB-?ALA\b/g, 'BETA ALANINE');
  }

  return out.replace(/\s+/g, ' ').trim();
}

function m13WholeTokenPattern_(find) {
  find = m13Str_(find).toUpperCase();
  var escaped = m13EscReg_(find).replace(/\s+/g, '\\s+');
  var first = find.charAt(0);
  var last = find.charAt(find.length - 1);
  var startsWord = /[A-Z0-9]/.test(first);
  var endsWord = /[A-Z0-9]/.test(last);
  return {
    hasPrefix: startsWord,
    pattern: (startsWord ? '(^|[^A-Z0-9])' : '') + escaped + (endsWord ? '(?=$|[^A-Z0-9])' : '')
  };
}

function m13BuildSupplierPosDescr_(sup, findReplaceRules, prefixMap) {
  // Foundation remains supplier-first: SUP PRODUCT is cleaned, brand-stripped,
  // marketing-purged, find/replaced, prefixed, and finally POS-formatted.
  var out = m13PreSpaceSupplierProduct_(sup.product).toUpperCase();
  out = m13StripLeadingBrand_(out, [sup.rawBrand, sup.translatedBrand]);
  out = m13StripMarketingPhrases_(out);
  var beforeFindReplace = out;
  var dp9Capture = { exact: [] };
  out = m13DP5ApplyFindReplaceForSupplierDescr_(out, findReplaceRules, dp9Capture);

  // DP9 description-only authority bridge: retain provenance for meaningful
  // multi-word SRC_POS_FIND_REPLACE rules. Exact rules are authoritative.
  // A one-token-near match is only eligible later when O independently confirms
  // the configured replacement concept (for example VITAL GREENS).
  sup.__dp9FrDirectives = (dp9Capture.exact || []).concat(
    m13DP9BuildNearFindReplaceDirectives_(beforeFindReplace, findReplaceRules, dp9Capture.exact || [])
  );

  out = m13ApplyPrefix_(out, m13PrefixForBrand_(sup, prefixMap), prefixMap, {
    beforeFindReplace: beforeFindReplace
  });
  return m13FinalFormatDescr_(out);
}

function m13StripLeadingBrand_(productUpper, brands) {
  var out = m13Str_(productUpper).toUpperCase();
  var list = [];

  function addBrand_(b) {
    b = m13Upper_(b);
    if (!b) return;
    if (list.indexOf(b) < 0) list.push(b);
    var normWords = b.replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (normWords && list.indexOf(normWords) < 0) list.push(normWords);
  }

  for (var i = 0; i < brands.length; i++) addBrand_(brands[i]);
  list.sort(function(a, b) { return b.length - a.length; });

  for (var j = 0; j < list.length; j++) {
    var brand = list[j];
    var words = brand.replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim().split(' ');
    if (!words.length || !words[0]) continue;

    var pat = '^\\s*' + words.map(m13EscReg_).join('[^A-Z0-9]+') + '(?:[^A-Z0-9]+|\\s+|$)';
    var re = new RegExp(pat, 'i');
    if (re.test(out)) return out.replace(re, '').replace(/\s+/g, ' ').trim();

    var re2 = new RegExp('^\\s*' + m13EscReg_(brand).replace(/\s+/g, '\\s+') + '(\\s+|[-:–—]+\\s*|$)', 'i');
    if (re2.test(out)) return out.replace(re2, '').replace(/\s+/g, ' ').trim();
  }

  return out;
}


function m13PolishColumnPDescription_(descr, originalPosDescr, supplierRaw, brandPrefix, prefixMap, sup) {
  // Final OUT_MERGED_DATA column P quality gate.
  // This uses the same three-column evidence idea without changing matching:
  //   O / ORIGINAL POS DESCR = presentation/style reference only
  //   P / current POS DESCR  = generated output
  //   Q / SUP PRODUCT        = current definitive product truth
  var out = m13FixPosDescrCharacters_(descr).toUpperCase();
  if (!out) return '';

  out = m13ColumnPRemoveNoise_(out);
  out = m13ColumnPPreserveServingCount_(out, supplierRaw);
  out = m13ColumnPMoveLeadingForm_(out);
  out = m13ColumnPCompactLongDescr_(out, originalPosDescr, supplierRaw);
  out = m13ColumnPPreserveServingCount_(out, supplierRaw);
  out = m13FinalFormatDescr_(out);
  out = m13ColumnPRemoveNoise_(out);
  out = m13ColumnPPreserveServingCount_(out, supplierRaw);
  out = m13ColumnPCompactLongDescr_(out, originalPosDescr, supplierRaw);
  out = m13ColumnPPreserveServingCount_(out, supplierRaw);

  // DP5 is deliberately last and description-only: brand cleanup, identity-safe de-duplication,
  // safe family ordering and an intelligent <=35-character POS description cap.
  // It does not mutate supplier/POS identity, extracted truth, pricing or status.
  out = m13DP1FinalisePosDescr_(out, originalPosDescr, supplierRaw, brandPrefix, prefixMap, sup);

  return out.replace(/\s+/g, ' ').trim();
}

function m13ColumnPRemoveNoise_(descr) {
  var out = m13FixPosDescrCharacters_(descr).toUpperCase();
  if (!out) return '';

  var hasSize = /\b\d+(?:\.\d+)?\s*(MG|MCG|G|KG|ML|LT|L|IU|C|VC|SG|T|LOZ|SACH|SACHET|PK)\b/.test(out);

  out = out
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/\bCOMING\s+SOON\b/g, ' ')
    .replace(/\b(?:CTN|CARTON|CASE)\s*\d{1,4}\b/g, ' ')
    .replace(/\b(\d{1,4})\s*(?:SERVE|SERVES|SERVINGS?)\b/g, '$1 SERV')
    .replace(/\bBER\s+AND\s+CRM\b/g, 'BER CRM')
    .replace(/\bBERRIES\s+AND\s+CREAM\b/g, 'BER CRM')
    .replace(/\bBERRIES\s*&\s*CREAM\b/g, 'BER CRM')
    .replace(/\bCOOKIES\s+AND\s+CREAM\b/g, 'COOKIE CRM')
    .replace(/\bCOOKIES\s*&\s*CREAM\b/g, 'COOKIE CRM');

  // If the pack size is already present, container words add clutter to POS DESCR.
  if (hasSize) out = out.replace(/\b(?:JAR|TUB)\b/g, ' ');

  // Remove standalone serve-count remnants that commonly sit immediately before
  // the true pack size after supplier wording has been shortened.
  out = out.replace(/\b(?:15|20|25|30|50|100|200)\s+(?=\d+(?:\.\d+)?\s*(?:G|KG|ML|LT|L)\b)/g, ' ');

  return out.replace(/\b(\d{1,4})\s+PK\b/g, '$1PK')
    .replace(/\b(\d{1,4})\s+SACH\b/g, '$1SACH')
    .replace(/\s+/g, ' ')
    .trim();
}

function m13ColumnPMoveLeadingForm_(descr) {
  var out = m13FixPosDescrCharacters_(descr).toUpperCase();
  if (!out) return '';

  // Supplier strings such as "BAR - NOWAY..." become "ATP BAR NOWAY..." after
  // prefixing. Keep RTD near the front, but move BAR/POUCH/SACHET before size
  // so the final POS description reads more like the existing POS column O.
  var m = out.match(/^([A-Z0-9+]+)\s+(BAR|POUCH|SACHET|SACH)\s+(.+)$/);
  if (!m) return out;

  var prefix = m[1];
  var form = m[2] === 'SACH' ? 'SACHET' : m[2];
  var rest = m[3].replace(/\s*-\s*/g, ' - ').replace(/\s+/g, ' ').trim();
  if (!rest || new RegExp('\\b' + m13EscReg_(form) + '\\b').test(rest)) return out;

  var sizeRe = /\b\d+(?:\.\d+)?\s*(?:MG|MCG|G|KG|ML|LT|L|IU|C|VC|SG|T|LOZ|SACH|SACHET|PK)\b/;
  var sizeMatch = rest.match(sizeRe);
  if (sizeMatch && typeof sizeMatch.index === 'number') {
    var before = rest.slice(0, sizeMatch.index).replace(/\s+$/g, '');
    var after = rest.slice(sizeMatch.index).replace(/^\s+/g, '');
    return (prefix + ' ' + before + ' ' + form + ' ' + after).replace(/\s+/g, ' ').trim();
  }

  return (prefix + ' ' + rest + ' ' + form).replace(/\s+/g, ' ').trim();
}

function m13ColumnPCompactLongDescr_(descr, originalPosDescr, supplierRaw) {
  var out = m13FixPosDescrCharacters_(descr).toUpperCase();
  if (!out) return '';

  var original = m13Str_(originalPosDescr).toUpperCase();
  var supplier = m13Str_(supplierRaw).toUpperCase();
  var target = original ? Math.max(42, Math.min(48, original.length + 10)) : 48;

  out = out
    .replace(/\bBELGIAN\b/g, 'BELG')
    .replace(/\bMILKSHAKE\b/g, 'MILK')
    .replace(/\bSTRAWBERRY\b/g, 'STRAWB')
    .replace(/\bRASPBERRY\b/g, 'RASP')
    .replace(/\bBLACKCURRANT\b/g, 'BLACKCURR')
    .replace(/\bBLUEBERRY\b/g, 'BLUEB')
    .replace(/\bPINEAPPLE\b/g, 'PINE')
    .replace(/\bCOCONUT\b/g, 'COCO')
    .replace(/\bSACHET\b/g, 'SACH')
    .replace(/\bSACHETS\b/g, 'SACH')
    .replace(/\bSPARKLING\s+WATER\b/g, 'SPARK')
    .replace(/\bSPARKLING\b/g, 'SPARK')
    .replace(/\bPROT\s+WATER\s+SPARK\b/g, 'PROT SPARK')
    .replace(/\bWATER\s+WATER\b/g, 'WATER')
    .replace(/\bLEMONADE\b/g, 'LEMON')
    .replace(/\bLEMON\s+SQUASH\b/g, 'LEMN SQSH')
    .replace(/\bMIXED\s+BERRY\b/g, 'MIXED BRY')
    .replace(/\bBER\s+AND\s+CRM\b/g, 'BER CRM');

  if (out.length > target) {
    out = out
      .replace(/\bFUSION\b/g, ' ')
      .replace(/\bSPARK\b/g, 'SPK')
      .replace(/\bCREATINE\b/g, 'CREAT')
      .replace(/\bELECTROLYTES\b/g, 'ELEC')
      .replace(/\bCHOCOLATE\b/g, 'CHOC')
      .replace(/\bORIGINAL\b/g, 'ORIG')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // When supplier has explicit serve wording, keep the meaningful count as
  // compact POS text: 30 SERV 105G, 90 SERV 310G, etc.
  if (/\b(?:SERVE|SERVES|SERVINGS?)\b/.test(supplier)) {
    out = m13ColumnPPreserveServingCount_(out, supplierRaw);
  }

  return out.replace(/\s+/g, ' ').trim();
}

function m13ColumnPPreserveServingCount_(descr, supplierRaw) {
  // Supplier examples like "30 SERVINGS 105G TUB" contain useful sell-size
  // context that should survive final Column P cleanup. Store it compactly as
  // "30 SERV" immediately before the matching weight/volume size.
  var out = m13FixPosDescrCharacters_(descr).toUpperCase();
  var supplier = m13FixPosDescrCharacters_(supplierRaw).toUpperCase();
  if (!out || !supplier) return out.replace(/\s+/g, ' ').trim();

  var serveRe = /\b(\d{1,4})\s*(?:SERVE|SERVES|SERVINGS?)\b/g;
  var m;
  while ((m = serveRe.exec(supplier)) !== null) {
    var count = m[1];
    if (!count) continue;

    var token = count + ' SERV';
    var alreadyRe = new RegExp('\\b' + m13EscReg_(count) + '\\s+SERV\\b');
    if (alreadyRe.test(out)) continue;

    var after = supplier.slice(m.index + m[0].length);
    var sizeMatch = after.match(/\b\d+(?:\.\d+)?\s*(?:MG|MCG|G|KG|ML|LT|L)\b/);
    if (!sizeMatch) continue;

    var size = m13Str_(sizeMatch[0]).toUpperCase().replace(/\s+/g, '');
    var sizeParts = size.match(/^(\d+(?:\.\d+)?)(MG|MCG|G|KG|ML|LT|L)$/);
    if (!sizeParts) continue;

    var num = sizeParts[1];
    var unit = sizeParts[2];
    var sizeBody = m13EscReg_(num) + '\\s*' + m13EscReg_(unit);
    var sizeRe = new RegExp('\\b' + sizeBody + '\\b');
    var bareCountBeforeSizeRe = new RegExp('\\b' + m13EscReg_(count) + '\\s+(?=' + sizeBody + '\\b)', 'g');

    // If earlier find/replace has already removed SERVINGS, repair "30 105G"
    // to "30 SERV 105G". Otherwise insert "30 SERV" before the size.
    out = out.replace(bareCountBeforeSizeRe, count + ' SERV ');
    if (!alreadyRe.test(out) && sizeRe.test(out)) {
      out = out.replace(sizeRe, token + ' $&');
    }
  }

  return out.replace(/\s+/g, ' ').trim();
}


// =============================================================================
// DP1 — ISOLATED POS DESCRIPTION FINALISER
// Scope: OUT_MERGED_DATA Column P / downstream POS descr text only.
// Safety: no barcode, matching, supplier, pricing, discount, status, review,
//         formatting, menu, filtered-build, price-tier or export-routing logic.
// Master truth is Q/SUP PRODUCT. O/ORIGINAL POS DESCR is presentation/reference only and may never add product facts.
// =============================================================================
function m13DP1FinalisePosDescr_(descr, originalPosDescr, supplierRaw, brandPrefix, prefixMap, sup) {
  var maxLen = (typeof M13 !== 'undefined' && M13.POS_DESCR_MAX) ? Number(M13.POS_DESCR_MAX) : 35;
  if (!(maxLen > 0)) maxLen = 35;

  var prefix = m13DP1Clean_(brandPrefix || '');
  var out = m13DP1Clean_(descr || '');
  if (!out) return '';

  var body = m13DP1StripPrefix_(out, prefix);
  body = m13DP1RemovePrefixRedundancy_(body, prefix, prefixMap, sup);
  body = m13DP5RemovePrefixOverlap_(body, prefix);
  body = m13DP5RemoveSentinels_(body);
  body = m13DP1CompactPack_(body);
  body = m13DP1Dedupe_(body, originalPosDescr, supplierRaw);
  body = m13DP9ApplyExplicitFindReplaceDirectives_(body, originalPosDescr, supplierRaw, sup);
  body = m13DP5EnsureMustKeepFromQ_(body, supplierRaw, sup);
  body = m13DP6EnsureSemanticQualifiersFromQ_(body, supplierRaw);
  body = m13DP1PromoteFamily_(body, supplierRaw);
  body = m13DP1RemoveRedundantFamilyWords_(body);
  body = m13DP9ApplyExplicitFindReplaceDirectives_(body, originalPosDescr, supplierRaw, sup);
  out = m13DP1Join_(prefix, body);
  if (out.length <= maxLen) return out;

  // Pressure abbreviations are deliberately late and description-only.
  body = m13DP1PressureAbbrev_(body);
  body = m13DP5RemoveSentinels_(body);
  body = m13DP1CompactPack_(body);
  body = m13DP1Dedupe_(body, originalPosDescr, supplierRaw);
  body = m13DP5RemovePrefixOverlap_(body, prefix);
  body = m13DP9ApplyExplicitFindReplaceDirectives_(body, originalPosDescr, supplierRaw, sup);
  body = m13DP5EnsureMustKeepFromQ_(body, supplierRaw, sup);
  body = m13DP6EnsureSemanticQualifiersFromQ_(body, supplierRaw);
  body = m13DP1PromoteFamily_(body, supplierRaw);
  body = m13DP1RemoveRedundantFamilyWords_(body);
  body = m13DP9ApplyExplicitFindReplaceDirectives_(body, originalPosDescr, supplierRaw, sup);
  out = m13DP1Join_(prefix, body);
  if (out.length <= maxLen) return out;

  return m13DP1SmartCap_(body, originalPosDescr, supplierRaw, prefix, maxLen, sup);
}

function m13DP1Clean_(s) {
  return m13FixPosDescrCharacters_(s).toUpperCase()
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/\s+:\s+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function m13DP1Join_(prefix, body) {
  prefix = m13DP1Clean_(prefix || '');
  body = m13DP1Clean_(body || '');
  if (!prefix) return body;
  if (!body) return prefix;
  return (prefix + ' ' + body).replace(/\s+/g, ' ').trim();
}

function m13DP1StripPrefix_(text, prefix) {
  var out = m13DP1Clean_(text || '');
  prefix = m13DP1Clean_(prefix || '');
  if (!prefix) return out;
  try {
    var re = new RegExp('^' + m13EscReg_(prefix).replace(/\s+/g, '\\s+') + '(?:\\s+|$)', 'i');
    if (re.test(out)) return out.replace(re, '').trim();
  } catch (_e) {}
  return out;
}

function m13DP1RemovePrefixRedundancy_(body, prefix, prefixMap, sup) {
  var out = m13DP1Clean_(body || '');
  prefix = m13DP1Clean_(prefix || '');
  if (!out) return '';

  // DP5 description-only brand cleanup. When an explicit prefix is used, strip
  // the actual mapped brand wording from the product body before rejoining it.
  // This prevents results such as "MM MACRO MIKE ..." while leaving the prefix
  // source table authoritative. Fallback full-brand prefixes are handled too.
  var aliases = [];
  var mappedFirstWords = {};
  function addAlias_(v, isMapped) {
    v = m13DP1Clean_(v || '');
    if (!v || v === prefix) return;
    if (aliases.indexOf(v) < 0) aliases.push(v);
    if (isMapped) {
      var first = v.split(' ')[0] || '';
      if (first.length >= 4 && first !== prefix) mappedFirstWords[first] = true;
    }
  }

  sup = sup || {};
  addAlias_(sup.rawBrand, false);
  addAlias_(sup.translatedBrand, false);

  if (prefixMap && prefixMap.__rows) {
    for (var i = 0; i < prefixMap.__rows.length; i++) {
      var row = prefixMap.__rows[i] || {};
      if (m13DP1Clean_(row.prefix || '') === prefix) addAlias_(row.brand, true);
    }
  }

  aliases.sort(function(a, b) { return b.length - a.length; });
  for (var a = 0; a < aliases.length; a++) {
    try {
      var re = new RegExp('^' + m13EscReg_(aliases[a]).replace(/\\s+/g, '\\s+') + '(?:\\s+|$)', 'i');
      if (re.test(out)) {
        out = out.replace(re, '').trim();
        break;
      }
    } catch (_e) {}
  }

  // Some ranges repeat the first brand word after the full brand has been stripped,
  // e.g. MACRO MIKE -> MM then "THE MACRO SHAKE". For explicit mapped prefixes,
  // that repeated brand token is grouping noise, not product identity.
  var firstOut = (out.split(' ')[0] || '');
  if (mappedFirstWords[firstOut]) out = out.replace(new RegExp('^' + m13EscReg_(firstOut) + '\\s+', 'i'), '').trim();

  // Existing Protein Supplies guard retained: its prefix already contains PROT.
  if (prefix === 'PROT SUPP') out = out.replace(/^PROT\s+/, '');

  return out.replace(/\s+/g, ' ').trim();
}



function m13DP6EnsureSemanticQualifiersFromQ_(body, supplierRaw) {
  // Q-only phrase integrity. Earlier generic polishing may remove one half of a
  // meaningful qualifier; rehydrate the compact semantic form from definitive Q
  // before the 35-character scorer decides whether it can fit.
  var out = m13DP1Clean_(body || '');
  var q = m13DP1Clean_(supplierRaw || '');
  if (!out || !q) return out;

  function hasKey_(key) {
    var parts = out.split(' ').filter(function(v) { return !!v; });
    for (var i = 0; i < parts.length; i++) {
      if (m13DP3CanonKey_(parts[i]) === key) return true;
    }
    return false;
  }
  function insertBeforeSize_(token) {
    var parts = out.split(' ').filter(function(v) { return !!v; });
    var at = parts.length;
    for (var i = 0; i < parts.length; i++) {
      if (m13DP1IsSizeToken_(parts[i])) { at = i; break; }
    }
    parts.splice(at, 0, token);
    out = parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  if (/\bFLUOR(?:IDE)?\s+FREE\b/.test(q) && !hasKey_('FFREE')) insertBeforeSize_('F/FREE');
  if (/\bALCOHOL\s+FREE\b/.test(q) && !hasKey_('AFREE')) insertBeforeSize_('A/FREE');
  return out;
}

function m13DP5RemoveSentinels_(text) {
  // Supplier exports sometimes use NONE as a placeholder for an absent option/
  // size/value. It is metadata, not sellable product identity, so never surface
  // it in the POS description.
  return m13DP1Clean_(text || '')
    .replace(/\bNONE\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function m13DP5RemovePrefixOverlap_(body, prefix) {
  // General boundary de-duplication: if the end of the brand/prefix is repeated
  // at the start of the Q-derived product body, remove only that repeated body
  // segment. Example: AUSTRALIA'S MANUKA + MANUKA HONEY -> ... + HONEY.
  var b = m13DP1Clean_(body || '');
  var p = m13DP1Clean_(prefix || '');
  if (!b || !p) return b;

  var bt = b.split(' ');
  var pt = p.split(' ');
  var max = Math.min(bt.length, pt.length);
  var remove = 0;

  for (var n = max; n >= 1; n--) {
    var ok = true;
    for (var j = 0; j < n; j++) {
      var pk = m13DP3CanonKey_(pt[pt.length - n + j]);
      var bk = m13DP3CanonKey_(bt[j]);
      if (!pk || !bk || pk !== bk) { ok = false; break; }
    }
    if (ok) { remove = n; break; }
  }

  if (remove > 0) bt.splice(0, remove);
  return bt.join(' ').replace(/\s+/g, ' ').trim();
}


function m13DP5IdentityTokensFromQ_(text, ctx) {
  // Canonicalise raw Q tokens into the same vocabulary Column P receives.
  // Source one-token F/R aliases win (WATERMELON -> WMELON,
  // BLACKCURRANT -> BLK); only then fall back to the internal pressure/canonical
  // aliases. This prevents identity protection from targeting a token spelling
  // that can never appear in the generated description.
  var src = m13DP1Clean_(text || '')
    // DP6 semantic phrases: keep qualifiers with their meaning intact so the
    // compressor cannot leave orphan words such as FREE or ALC.
    .replace(/\bFLUORIDE\s+FREE\b/g, 'FFREE')
    .replace(/\bFLUOR\s+FREE\b/g, 'FFREE')
    .replace(/\bALCOHOL\s+FREE\b/g, 'AFREE')
    .replace(/\bALC\s+FREE\b/g, 'AFREE')
    .replace(/\bTEA\s+TREE\b/g, 'TTREE')
    .replace(/\bT\s*\/\s*TREE\b/g, 'TTREE')
    .replace(/(^|[^0-9])-(?=[^0-9]|$)/g, '$1 ')
    .replace(/[^A-Z0-9%:+\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!src) return [];

  var raw = src.split(' ');
  var out = [];
  for (var i = 0; i < raw.length; i++) {
    var rawKey = m13DP1TokenKey_(raw[i]);
    if (!rawKey) continue;
    var key = (ctx && ctx.tokenMap && ctx.tokenMap[rawKey]) ? ctx.tokenMap[rawKey] : m13DP3CanonKey_(raw[i]);
    if (key) out.push(key);
  }
  return out;
}

function m13DP5BuildIdentityContext_(supData, supHeaders, brandMap, findReplaceRules) {
  // Lightweight document-frequency map from current definitive Q text only.
  // This is intentionally independent of O and independent of POS matching.
  var ctx = { brands: {}, tokenMap: {} };
  supData = supData || [];
  supHeaders = supHeaders || {};

  // Reuse simple one-token F/R abbreviations only as canonical aliases so raw-Q
  // identity tokens line up with the already-cleaned Column-P body. This does
  // not execute the F/R pipeline or modify rule usage/status.
  var rules = findReplaceRules || [];
  for (var rr = 0; rr < rules.length; rr++) {
    var rawFind = m13Str_(rules[rr] && rules[rr].find || '');
    var rawRepl = m13Str_(rules[rr] && rules[rr].repl || '');
    var f = m13DP1TokenKey_(rawFind);
    if (!f || /\s/.test(rawFind) || !rawRepl) continue;

    // For a one-token supplier word that expands to multiple POS tokens
    // (BLACKCURRANT -> BLK CURRANT), map the source identity to the first compact
    // output token. This is enough to keep that variant distinct under pressure
    // without executing all 601 F/R regexes during context construction.
    var replParts = rawRepl.toUpperCase().replace(/[^A-Z0-9%:+\-]+/g, ' ').split(/\s+/).filter(function(v) { return !!v; });
    if (!replParts.length) continue;
    var v = m13DP1TokenKey_(replParts[0]);
    if (!/^[A-Z0-9%:+\-]+$/.test(f) || !/^[A-Z0-9%:+\-]+$/.test(v)) continue;
    ctx.tokenMap[f] = v;
  }

  for (var i = 0; i < supData.length; i++) {
    var row = supData[i] || [];
    var status = m13Upper_(m13ColVal_(row, supHeaders, ['STATUS']));
    if (!status) continue;
    if (status.indexOf('NOT USED') >= 0 && !M13.INCLUDE_NOT_USED) continue;
    if (status.indexOf('BEST BUY') < 0 && status.indexOf('UNMATCHABLE') < 0) continue;

    var rawBrand = m13Str_(m13ColVal_(row, supHeaders, ['SUP BRAND', 'BRAND']));
    var translatedBrand = m13TranslateBrand_(rawBrand, brandMap);
    var brandKey = m13NormBrand_(translatedBrand || rawBrand);
    var product = m13Str_(m13ColVal_(row, supHeaders, ['SUP PRODUCT', 'PRODUCT', 'SUP DESCR', 'DESCR']));
    if (!product && row.length > 16) product = m13Str_(row[16]);
    if (!brandKey || !product) continue;

    var body = m13StripLeadingBrand_(product, [rawBrand, translatedBrand]);
    body = m13DP5RemoveSentinels_(body);
    // Mirror the product-text hyphen rule for identity analysis while retaining
    // numeric ranges. Alpha hyphenated ranges such as CANDA-PLEX become the same
    // CANDA / PLEX tokens that Column P receives.
    body = body.replace(/(^|[^0-9])-(?=[^0-9]|$)/g, '$1 ');
    var toks = m13DP5IdentityTokensFromQ_(body, ctx);
    var brand = ctx.brands[brandKey];
    if (!brand) brand = ctx.brands[brandKey] = { docs: 0, df: {}, products: [] };
    brand.docs++;

    var seen = {};
    for (var t = 0; t < toks.length; t++) {
      var key = m13DP3CanonKey_(toks[t]);
      if (ctx.tokenMap[key]) key = ctx.tokenMap[key];
      if (!key || key === 'NONE' || m13DP1IsSizeToken_(key)) continue;
      if (seen[key]) continue;
      seen[key] = true;
      brand.df[key] = (brand.df[key] || 0) + 1;
    }
    brand.products.push({
      qKey: m13NormText_(product || ''),
      keys: seen
    });
  }
  return ctx;
}

function m13DP5DistinctiveInfo_(supplierRaw, sup) {
  var info = { rarity: {}, contrast: {}, protected: {}, mustKeep: {} };
  sup = sup || {};
  var ctx = sup.__dp5IdentityCtx || null;
  if (!ctx) return info;

  var brandKey = sup.brandKey || m13NormBrand_(sup.translatedBrand || sup.rawBrand || '');
  var stats = ctx.brands && ctx.brands[brandKey];
  if (!stats || !stats.docs) return info;

  var body = m13StripLeadingBrand_(supplierRaw || '', [sup.rawBrand, sup.translatedBrand]);
  body = m13DP5RemoveSentinels_(body);
  body = body.replace(/(^|[^0-9])-(?=[^0-9]|$)/g, '$1 ');
  var toks = m13DP5IdentityTokensFromQ_(body, ctx);
  var unique = [];
  var seen = {};

  // DP6: category/form words are useful for the final POS description, but they
  // must not win the single strongest *identity* slot merely because they are
  // rare inside a brand.  The SmartCap scorer separately protects useful product
  // families/forms.  This lets variants such as FUDGE vs MACAD, BLUEBERRY vs
  // CHERRY and SUNSHINE vs WOODFORD remain the must-keep identity.
  var generic = {
    AND:1, THE:1, WITH:1, FOR:1, FROM:1, OF:1, TO:1, OR:1, PLUS:1,
    PURE:1, AUS:1, AUST:1, GRS:1, FED:1,
    PROT:1, PROTEIN:1, SNACK:1, BAR:1, BARS:1, BITES:1,
    COOKIE:1, COOKIES:1, MIX:1, DRINK:1, PRODUCT:1, FORMULA:1, RANGE:1,
    PACK:1, PK:1, PWD:1, LIQ:1, THINS:1, TRUFFLE:1,
    DARK:1, CHOC:1, CHOCOLATE:1, FREE:1, ACT:1, ACTION:1, OIL:1,
    LEAVE:1, IN:1, HAIR:1,
    BEANS:1, BLEND:1, GROUND:1, PLUNGER:1,
    REFILLABLE:1, SHAKER:1
  };

  for (var i = 0; i < toks.length; i++) {
    var key = m13DP3CanonKey_(toks[i]);
    if (ctx.tokenMap && ctx.tokenMap[key]) key = ctx.tokenMap[key];
    if (!key || key === 'NONE' || m13DP1IsSizeToken_(key) || seen[key]) continue;
    seen[key] = true;

    var df = stats.df[key] || 0;
    var rarity = stats.docs <= 1 ? 0.5 : Math.max(0, Math.min(1, 1 - ((df - 1) / Math.max(1, stats.docs - 1))));
    info.rarity[key] = rarity;
  }

  // Nearest-sibling contrast: rarity across an entire brand is not enough.
  // VANILLA may be common across AMAZONIA generally but is still exactly what
  // distinguishes VANILLA from CHOCOLATE inside one protein family. Compare the
  // current Q token set with the most similar Q products in the same brand and
  // reward tokens those siblings do not share.
  var peers = [];
  var products = stats.products || [];
  var currentQ = m13NormText_(supplierRaw || '');
  var currentKeys = Object.keys(seen);
  var currentSig = currentKeys.slice().sort().join('|');
  var peerSigs = {};
  for (var p = 0; p < products.length; p++) {
    var peer = products[p] || {};
    if (!peer.keys || peer.qKey === currentQ) continue;

    // Ignore duplicate pack-size rows of the same identity. Sizes are excluded
    // from the token set, so VANILLA 500G and VANILLA 1KG share one signature;
    // allowing both to dominate the neighbour list would hide the VANILLA vs
    // CHOCOLATE distinction we are trying to preserve.
    var peerSig = Object.keys(peer.keys).sort().join('|');
    if (!peerSig || peerSig === currentSig || peerSigs[peerSig]) continue;
    peerSigs[peerSig] = true;

    var shared = 0;
    var union = {};
    for (var ck = 0; ck < currentKeys.length; ck++) {
      var ckey = currentKeys[ck];
      union[ckey] = true;
      if (peer.keys[ckey]) shared++;
    }
    var peerKeys = Object.keys(peer.keys);
    for (var pk = 0; pk < peerKeys.length; pk++) union[peerKeys[pk]] = true;
    var unionN = Object.keys(union).length;
    if (shared < 2 || !unionN) continue;
    var sim = shared / unionN;
    if (sim < 0.28) continue;
    peers.push({ sim: sim, keys: peer.keys });
  }
  peers.sort(function(a, b) { return b.sim - a.sim; });
  if (peers.length) {
    // Stay local to the closest product family/range rather than letting distant
    // same-brand products dilute the exact VANILLA-vs-CHOC / SHAMP-vs-COND
    // contrast. Duplicate size-only identities were already removed above.
    var maxSim = peers[0].sim;
    var minLocalSim = Math.max(0.35, maxSim * 0.72);
    peers = peers.filter(function(peer) { return peer.sim >= minLocalSim; });
  }
  if (peers.length > 8) peers.length = 8;

  if (peers.length) {
    for (var ci = 0; ci < currentKeys.length; ci++) {
      var ik = currentKeys[ci];
      var missingWeight = 0;
      var totalWeight = 0;
      for (var pi = 0; pi < peers.length; pi++) {
        var w = Math.max(0.1, peers[pi].sim);
        totalWeight += w;
        if (!peers[pi].keys[ik]) missingWeight += w;
      }
      info.contrast[ik] = totalWeight ? (missingWeight / totalWeight) : 0;
    }
  }

  // Q-only product family/type anchors.  These are not facts invented by code:
  // a key can only be protected if it is present in definitive supplier Q.
  // Keeping one useful family token gives ranges a consistent POS shape such as
  // ALOEDENT TPASTE ..., BIOL SHAMP/COND ..., BLUE DINOSAUR ... BAR.
  var formKeys = {
    SHAMP:1, COND:1, SERUM:1, CREAM:1, CRM:1, LOTION:1, LTN:1, MASK:1,
    CLEANSER:1, TONER:1, SCRUB:1, GEL:1, SUNSCREEN:1,
    TPASTE:1, MOUTHWASH:1, MWASH:1, SPRAY:1, SPR:1, BALM:1, DEOD:1,
    SOAP:1, WASH:1, DROPS:1,
    BAR:1, BARS:1, BITES:1, COOKIE:1, COOKIES:1,
    BEANS:1, PLUNGER:1, FILTER:1, CARTRIDGE:1, CART:1, DOME:1, BEADS:1,
    BTL:1, BOTTLE:1, SHAKER:1,
    EXT:1, PST:1
  };
  var hasForm = false;
  var firstForm = '';
  for (var fk in formKeys) {
    if (seen[fk]) {
      hasForm = true;
      if (!firstForm) firstForm = fk;
    }
  }
  // DP6: a supplier-stated product family/type is valuable POS context even when
  // it is shared by every sibling (e.g. TOOTHPASTE). Protect, but do not make it
  // the strongest identity fact; the distinctive variant still owns mustKeep.
  if (firstForm) info.protected[firstForm] = true;

  for (var ui = 0; ui < currentKeys.length; ui++) {
    var ukey = currentKeys[ui];
    if (generic[ukey] || formKeys[ukey]) continue;
    if (/^\d+(?:\.\d+)?%$/.test(ukey) || /^\d+$/.test(ukey)) continue;

    var bonus = 0;
    var contrast = info.contrast[ukey] || 0;
    var rarity2 = info.rarity[ukey] == null ? 0 : info.rarity[ukey];
    if (/[A-Z]/.test(ukey) && /\d/.test(ukey)) bonus += 25;
    if (/^(WPC|WPI|EAA|BCAA|HMB|NMN|NAC|TMG|ALCAR)$/.test(ukey)) bonus += 20;

    var descriptorPenalty = {
      HYDRATING:30, HYDR:30, BALANCING:30, BAL:30, PURIFYING:30, PUR:30,
      STIMULATING:30, STIM:30, SOOTHING:25, SOOTH:25, REJUVENATING:25,
      REJUV:25, REVITALISE:25, REVITALIZE:25, REVIT:25, GENTLE:20,
      NOURISH:20, CURIOUSLY:35, SIMPLY:30, VIVACIOUS:30,
      ORG:25, ORGANIC:25, NATURAL:25, PREMIUM:25, PREM:25,
      DARK:15, LIGHT:15, BIOACTIVE:20, BIOACT:20
    };
    var penalty = descriptorPenalty[ukey] || 0;

    unique.push({
      key: ukey,
      score: contrast * 120 + rarity2 * 45 + bonus - penalty,
      order: ui
    });
  }

  unique.sort(function(a, b) {
    if (b.score !== a.score) return b.score - a.score;
    return a.order - b.order;
  });

  // DP6: if this Q has no close same-brand sibling, rarity cannot tell us which
  // descriptor is more useful. Prefer the supplier-stated product type/family as
  // the anchor and merely protect the best Q descriptor behind it.
  if (!peers.length && firstForm) {
    info.mustKeep[firstForm] = true;
    info.protected[firstForm] = true;
    if (unique.length) info.protected[unique[0].key] = true;
    if (unique.length > 1 && unique[1].score >= 75) info.protected[unique[1].key] = true;
    return info;
  }

  // Treat form/type as one identity candidate rather than automatically giving it
  // the strongest slot. A SHAMP/COND contrast should win when it truly separates
  // close siblings, while a qualifier such as TRAD/ADD/ALC may outrank a shared
  // EXT/PST form inside a same-form range.
  var contrastingForm = '';
  var contrastingFormScore = -1;
  for (var fkey in formKeys) {
    if (!seen[fkey]) continue;
    var fc = info.contrast[fkey] || 0;
    var fr = info.rarity[fkey] == null ? 0 : info.rarity[fkey];
    var fs = fc * 130 + fr * 35 + 18;
    if (fs > contrastingFormScore) {
      contrastingFormScore = fs;
      contrastingForm = fkey;
    }
  }

  var topUniqueScore = unique.length ? unique[0].score : -1;
  if (contrastingForm && contrastingFormScore >= 70 && contrastingFormScore >= topUniqueScore) {
    info.mustKeep[contrastingForm] = true;
    info.protected[contrastingForm] = true;
    if (unique.length) info.protected[unique[0].key] = true;
  } else if (unique.length) {
    info.mustKeep[unique[0].key] = true;
    info.protected[unique[0].key] = true;
    if (contrastingForm && contrastingFormScore >= 70) info.protected[contrastingForm] = true;
    // Two Q-only contrast terms are useful for compound variants such as
    // LEMON + MACADAMIA or BANANA + BREAD.
    if (unique.length > 1) info.protected[unique[1].key] = true;
    if (unique.length > 2 && unique[2].score >= 125) info.protected[unique[2].key] = true;
  } else if (contrastingForm && contrastingFormScore >= 70) {
    info.mustKeep[contrastingForm] = true;
    info.protected[contrastingForm] = true;
  }

  return info;
}


function m13DP5EnsureMustKeepFromQ_(body, supplierRaw, sup) {
  // A second polish pass may receive a description from which the first 35-char
  // pass already removed the distinguishing Q token. Rehydrate only the single
  // strongest current-Q identity token; O is never consulted and no new fact can
  // enter from legacy POS text.
  var out = m13DP1Clean_(body || '');
  if (!out || !supplierRaw || !sup) return out;

  var info = m13DP5DistinctiveInfo_(supplierRaw, sup);
  var must = Object.keys(info.mustKeep || {});
  if (!must.length) return out;

  var wanted = must[0];
  var parts = out.split(' ').filter(function(v) { return !!v; });
  for (var i = 0; i < parts.length; i++) {
    if (m13DP5MappedIdentityKey_(parts[i], sup) === wanted) return out;
  }

  // Use the canonical compact token already aligned to the source F/R vocabulary.
  // Insert immediately before the first pack-size token so sorting/family order
  // at the front remains stable.
  var at = parts.length;
  for (var s = 0; s < parts.length; s++) {
    if (m13DP1IsSizeToken_(parts[s])) { at = s; break; }
  }
  parts.splice(at, 0, wanted);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function m13DP5MappedIdentityKey_(token, sup) {
  var key = m13DP3CanonKey_(token || '');
  var ctx = sup && sup.__dp5IdentityCtx;
  if (ctx && ctx.tokenMap && ctx.tokenMap[key]) key = ctx.tokenMap[key];
  return key;
}


function m13DP1CompactPack_(body) {
  var out = m13DP1Clean_(body || '');
  // 45G X 12PK -> 12X45G; 30G X 4PK -> 4X30G.
  out = out.replace(/\b(\d+(?:\.\d+)?(?:MG|MCG|G|KG|ML|L))\s+X\s+(\d+)PK\b/g, '$2X$1');
  out = out.replace(/\b(\d+)PK\s+X\s+(\d+(?:\.\d+)?(?:MG|MCG|G|KG|ML|L))\b/g, '$1X$2');
  return out.replace(/\s+/g, ' ').trim();
}

function m13DP1Dedupe_(body, originalPosDescr, supplierRaw) {
  var parts = m13DP1Clean_(body || '').split(' ').filter(function(v) { return !!v; });
  if (!parts.length) return '';

  // DP5: Column P body-only de-duplication. Meaningful 3-character acronyms are
  // safe here because the brand prefix has already been separated.
  var never = { AND:1, THE:1, WITH:1, FOR:1, FROM:1, OF:1, TO:1, OR:1, PLUS:1 };
  var seen = {};
  var out = [];
  for (var i = 0; i < parts.length; i++) {
    var token = parts[i];
    var key = m13DP3CanonKey_(token).replace(/[^A-Z0-9]/g, '');
    var canDedupe = key.length >= 3 && !/\d/.test(key) && !never[key];
    if (canDedupe && Object.prototype.hasOwnProperty.call(seen, key)) {
      // Prefer the chemically specific L- form when it duplicates a plain token.
      var prevIdx = seen[key];
      if (/^L[- ]/.test(token) && !/^L[- ]/.test(out[prevIdx] || '')) out[prevIdx] = token;
      continue;
    }
    if (canDedupe) seen[key] = out.length;
    out.push(token);
  }
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

function m13DP1PromoteFamily_(body, originalPosDescr) {
  var out = m13DP1Clean_(body || '');
  if (!out) return '';

  var tokens = out.split(' ');
  var original = m13DP1Clean_(originalPosDescr || '');
  var descriptor = { NAKED:1, ROUGH:1, WICKED:1, WILD:1, BRY:1, ORG:1, AUS:1, AUST:1, GRS:1, FED:1, PREM:1, PREMIUM:1, HYDRO:1, HYD:1 };

  function findPhrase_(phrase) {
    var p = phrase.split(' ');
    for (var i = 0; i <= tokens.length - p.length; i++) {
      var ok = true;
      for (var j = 0; j < p.length; j++) if (tokens[i + j] !== p[j]) { ok = false; break; }
      if (ok) return i;
    }
    return -1;
  }
  function originalHas_(phrase) {
    try { return new RegExp('(?:^|[^A-Z0-9])' + m13EscReg_(phrase).replace(/\s+/g, '\\s+') + '(?=$|[^A-Z0-9])').test(original); }
    catch (_e) { return original.indexOf(phrase) >= 0; }
  }
  function predecessorsAreDescriptors_(idx) {
    if (idx <= 0) return true;
    for (var i = 0; i < idx; i++) if (!descriptor[tokens[i]]) return false;
    return true;
  }
  function moveFront_(phrase, idx) {
    if (idx <= 0) return;
    var n = phrase.split(' ').length;
    tokens.splice(idx, n);
    tokens = phrase.split(' ').concat(tokens);
  }

  // WPC/WPI are unambiguous product-family codes and are always grouped first.
  var idx = findPhrase_('WPC');
  if (idx > 0) moveFront_('WPC', idx);
  idx = findPhrase_('WPI');
  if (idx > 0) moveFront_('WPI', idx);

  // Protein-family phrases are promoted only when source order is descriptor-led
  // (e.g. WICKED ORG PEA PROT) or O already treats the phrase as a family.
  var proteinFamilies = ['PEA PROT', 'BEEF PROT', 'PLANT PROT'];
  for (var f = 0; f < proteinFamilies.length; f++) {
    idx = findPhrase_(proteinFamilies[f]);
    if (idx > 0 && (predecessorsAreDescriptors_(idx) || originalHas_(proteinFamilies[f]))) {
      moveFront_(proteinFamilies[f], idx);
      break;
    }
  }

  // COLL is promoted through source descriptors (GRS FED / AUS / ORG etc.) but
  // not through a real form/range such as WATER, BAR or MARINE.
  idx = findPhrase_('COLL');
  if (idx > 0 && predecessorsAreDescriptors_(idx)) moveFront_('COLL', idx);

  return tokens.join(' ').replace(/\s+/g, ' ').trim();
}

function m13DP1RemoveRedundantFamilyWords_(body) {
  var out = m13DP1Clean_(body || '');
  if (/\b(?:WPC|WPI)\b/.test(out)) out = out.replace(/\bWHEY\b/g, ' ');
  return out.replace(/\s+/g, ' ').trim();
}

function m13DP1PressureAbbrev_(body) {
  var out = m13DP1Clean_(body || '')
    .replace(/\bFLUOR(?:IDE)? FREE\b/g, 'F/FREE')
    .replace(/\bALCOHOL FREE\b/g, 'A/FREE')
    .replace(/\bALC FREE\b/g, 'A/FREE')
    .replace(/\bT\s*\/\s*TREE\b/g, 'TTREE')
    .replace(/\bTEA TREE\b/g, 'TTREE');
  var pairs = [
    [/\bELECTROLYTES?\b/g, 'ELEC'],
    [/\bPRE[- ]?WORKOUT\b/g, 'PREWO'],
    [/\bPEPTIDES?\b/g, 'PEP'],
    [/\bPEPP\b/g, 'PEP'],
    [/\bTRIPLE\b/g, 'TRI'],
    [/\bESSENTIALS\b/g, 'ESS'],
    [/\bCHEESECAKE\b/g, 'CHCAKE'],
    [/\bBLENDER\b/g, 'BLNDR'],
    [/\bBOTTLE\b/g, 'BTL'],
    [/\bSTRAINER\b/g, 'STRNR'],
    [/\bFLAVOURS?\b/g, 'FLAV'],
    [/\bMUSHROOMS?\b/g, 'MUSH'],
    [/\bNITRATE\b/g, 'NITRA'],
    [/\bBOVINE\b/g, 'BOV'],
    [/\bCREATINE\b/g, 'CREAT'],
    [/\bGLUTAMINE\b/g, 'GLUT'],
    [/\bINOSITOL\b/g, 'INOS'],
    [/\bRECOVERY\b/g, 'RCVY'],
    [/\bSAMPLE\b/g, 'SAMP'],
    [/\bGREENS\b/g, 'GRNS'],
    [/\bSLEEP\b/g, 'SLP'],

    // DP3 pressure-only identity-preserving abbreviations. These are deliberately
    // not blanket Find/Replace rules; they run only when a description is too long.
    [/\bCONDITIONER\b/g, 'COND'],
    [/\bSHAMPOO\b/g, 'SHAMP'],
    [/\bCLARIFYING\b/g, 'CLAR'],
    [/\bBRIGHTENING\b/g, 'BRIGHT'],
    [/\bSTRAWBERRY\b/g, 'STRAWB'],
    [/\bRASPBERRY\b/g, 'RASP'],
    [/\bWATERMELON\b/g, 'WMEL'],
    [/\bHAZELNUT\b/g, 'HAZEL'],
    [/\bPEANUT\b/g, 'PNUT'],
    [/\bBUTTER\b/g, 'BUTTR'],
    [/\bCARAMEL\b/g, 'CARAM'],
    [/\bCHOCOLATE\b/g, 'CHOC'],
    [/\bCOCONUT\b/g, 'COCO'],
    [/\bVANILLA\b/g, 'VAN'],
    [/\bCRUNCH\b/g, 'CRNCH'],
    [/\bBRULEE\b/g, 'BRULE'],
    [/\bALMONDS\b/g, 'ALMOND'],
    [/\bSALTED\b/g, 'SALT'],
    [/\bEXTRACT\b/g, 'EXT'],
    [/\bTRADITIONAL\b/g, 'TRAD'],
    [/\bALCOHOL\b/g, 'ALC'],
    [/\bADDITIVE\b/g, 'ADD'],
    [/\bPASTE\b/g, 'PST'],
    [/\bHYDRATING\b/g, 'HYDR'],
    [/\bBALANCING\b/g, 'BAL'],
    [/\bPURIFYING\b/g, 'PUR'],
    [/\bSTIMULATING\b/g, 'STIM'],
    [/\bSOOTHING\b/g, 'SOOTH'],
    [/\bREJUVENATING\b/g, 'REJUV'],
    [/\bREVITALISE\b/g, 'REVIT'],
    [/\bREVITALIZE\b/g, 'REVIT'],
    [/\bDAMAGED\b/g, 'DMG'],
    [/\bGRAPEFRUIT\b/g, 'GRAPE'],
    [/\bGERANIUM\b/g, 'GERAN'],
    [/\bTOOTHPASTE\b/g, 'TPASTE'],
    [/\bCHILDREN\b/g, 'KIDS'],
    [/\bFLUORIDE\b/g, 'FLUOR'],
    // DP6 pressure-only POS vocabulary. These run only after the ordinary
    // description is already too long, so readable full wording wins whenever
    // it fits.
    [/\bACTION\b/g, 'ACT'],
    [/\bWHITENING\b/g, 'WHITEN'],
    [/\bMOUTHWASH\b/g, 'M/WASH'],
    [/\bCARTRIDGE\b/g, 'CART'],
    [/\bFILTRATION\b/g, 'FILT'],
    [/\bPARTICLES\b/g, 'PART']
  ];
  for (var i = 0; i < pairs.length; i++) out = out.replace(pairs[i][0], pairs[i][1]);
  return out.replace(/\s+/g, ' ').trim();
}

function m13DP3CanonKey_(token) {
  var k = m13DP1TokenKey_(token || '');
  var map = {
    SHAMPOO:'SHAMP', CONDITIONER:'COND', TOOTHPASTE:'TPASTE',
    STRAW:'STRAWB', STRAWBERRY:'STRAWB', RASPBERRY:'RASP', WATERMELON:'WMEL',
    HAZELNUT:'HAZEL', PEANUT:'PNUT', BUTTER:'BUTTR', BTR:'BUTTR',
    CARAMEL:'CARAM', CARML:'CARAM', SALTED:'SALT', ALMONDS:'ALMOND',
    CHOCOLATE:'CHOC', COCONUT:'COCO', VANILLA:'VAN', CRUNCH:'CRNCH',
    BRULEE:'BRULE', ELECTROLYTE:'ELEC', ELECTROLYTES:'ELEC',
    PEPTIDE:'PEP', PEPTIDES:'PEP', TRIPLE:'TRI', ESSENTIALS:'ESS',
    CHEESECAKE:'CHCAKE', BLENDER:'BLNDR', BOTTLE:'BTL', STRAINER:'STRNR',
    FLAVOUR:'FLAV', FLAVOURS:'FLAV', MUSHROOM:'MUSH', MUSHROOMS:'MUSH',
    NITRATE:'NITRA', BOVINE:'BOV', CREATINE:'CREAT', GLUTAMINE:'GLUT',
    INOSITOL:'INOS', RECOVERY:'RCVY', SAMPLE:'SAMP', GREENS:'GRNS',
    SLEEP:'SLP', CLARIFYING:'CLAR', BRIGHTENING:'BRIGHT',
    EXTRACT:'EXT', TRADITIONAL:'TRAD', ALCOHOL:'ALC', ADDITIVE:'ADD',
    PASTE:'PST', HYDRATING:'HYDR', BALANCING:'BAL', PURIFYING:'PUR',
    STIMULATING:'STIM', SOOTHING:'SOOTH', REJUVENATING:'REJUV',
    REVITALISE:'REVIT', REVITALIZE:'REVIT', DAMAGED:'DMG',
    GRAPEFRUIT:'GRAPE', GERANIUM:'GERAN', CHILDREN:'KIDS', FLUORIDE:'FLUOR',
    ACTION:'ACT', WHITENING:'WHITEN', CARTRIDGE:'CART', FILTRATION:'FILT',
    PARTICLES:'PART', MOUTHWASH:'MWASH', FLUORFREE:'FFREE', FF:'FFREE', FFREE:'FFREE',
    ALCOHOLFREE:'AFREE', AFREE:'AFREE', TTREE:'TTREE',
    'L-TYROSINE':'TYROSINE', LTYROSINE:'TYROSINE'
  };
  return map[k] || k;
}

function m13DP3IdentityTokens_(text) {
  var out = m13DP1PressureAbbrev_(m13DP1Clean_(text || ''));
  out = out
    .replace(/\bLEMON GRASS\b/g, 'LEMONGRASS')
    .replace(/\bCREME BRULEE\b/g, 'CREME BRULE')
    .replace(/\bCREME BRUL[EÉ]E\b/g, 'CREME BRULE');
  var raw = out.replace(/[^A-Z0-9%:+\-]+/g, ' ').split(' ').filter(function(v) { return !!v; });
  var canon = [];
  for (var i = 0; i < raw.length; i++) canon.push(m13DP3CanonKey_(raw[i]));
  return canon;
}

function m13DP3IdentityInfo_(originalPosDescr, supplierRaw) {
  // DP4/DP5: identity priority is Q-only.
  // O must not decide which current supplier facts survive the 35-character cap,
  // because O may itself contain an older/truncated/generated POS description.
  var q = m13DP3IdentityTokens_(supplierRaw || '');

  // Generic/category wording can be sacrificed before the distinguishing Q terms
  // nearest the end of the supplier description (typically flavour, shade, form,
  // model/variant), while size remains independently protected by SmartCap.
  var ignoreTail = {
    AND:1, THE:1, WITH:1, FOR:1, FROM:1, OF:1, TO:1, OR:1, PLUS:1,
    PURE:1, ORG:1, ORGANIC:1, AUS:1, AUST:1, GRS:1, FED:1, '100%':1,
    CHOC:1, CHOCOLATE:1, DARK:1, PREMIUM:1, PREM:1, NATURAL:1,
    TRUFFLE:1, THINS:1, MIX:1, DRINK:1, PROT:1, PROTEIN:1
  };

  var tail = {};
  var tailCount = 0;
  for (var t = q.length - 1; t >= 0 && tailCount < 4; t--) {
    var k = q[t];
    if (!k || ignoreTail[k] || m13DP1IsSizeToken_(k) || /^\d+(?:\.\d+)?%$/.test(k)) continue;
    tail[k] = true;
    tailCount++;
  }

  return { confirmed: {}, tail: tail };
}

function m13DP1TokenKey_(token) {
  return m13DP1Clean_(token || '').replace(/[^A-Z0-9%:+\-]/g, '');
}

function m13DP1IsSizeToken_(token) {
  var t = m13DP1TokenKey_(token);
  return /^(?:\d+(?:\.\d+)?(?:MG|MCG|G|KG|ML|LT|L|IU|C|VC|SG|T|LOZ|SACH|PK)|\d+X\d+(?:\.\d+)?(?:MG|MCG|G|KG|ML|L)|\d+PK)$/.test(t);
}


function m13DP6ReferenceConfirmedKeys_(originalPosDescr, supplierRaw, sup) {
  // O is reference only.  This helper can only boost a token when the same
  // canonical fact independently exists in Q.  Nothing from O is inserted into
  // P and O can never create size/type/flavour/variant facts.
  var out = {};
  if (!originalPosDescr || !supplierRaw) return out;
  var ctx = sup && sup.__dp5IdentityCtx;

  function alias_(k) {
    k = m13DP5MappedIdentityKey_(k, sup);
    var map = {
      BLUEBERRIES:'BLUEBERRY', BLUEBERRY:'BLUEBERRY',
      CHERRIES:'CHERRY', CHERRY:'CHERRY',
      BERRIES:'BERRY', BERRY:'BERRY',
      COOKIES:'COOKIE', COOKIE:'COOKIE',
      MACADAMIA:'MACAD', MACAD:'MACAD',
      STRAWBERRIES:'STRAWB', STRAWB:'STRAWB'
    };
    return map[k] || k;
  }

  var qBody = m13StripLeadingBrand_(supplierRaw || '', [
    sup && sup.rawBrand || '', sup && sup.translatedBrand || ''
  ]);
  qBody = m13DP5RemoveSentinels_(qBody);
  var qToks = ctx ? m13DP5IdentityTokensFromQ_(qBody, ctx) : m13DP3IdentityTokens_(qBody);
  var oToks = ctx ? m13DP5IdentityTokensFromQ_(originalPosDescr || '', ctx) : m13DP3IdentityTokens_(originalPosDescr || '');

  var qSet = {};
  for (var q = 0; q < qToks.length; q++) {
    var qk = alias_(qToks[q]);
    if (qk) qSet[qk] = true;
  }
  for (var o = 0; o < oToks.length; o++) {
    var ok = alias_(oToks[o]);
    if (ok && qSet[ok]) out[ok] = true;
  }
  return out;
}

function m13DP6IsProductTypeKey_(key) {
  return !!({
    SHAMP:1, COND:1, SERUM:1, CREAM:1, CRM:1, LOTION:1, LTN:1, MASK:1,
    CLEANSER:1, TONER:1, SCRUB:1, GEL:1, SUNSCREEN:1,
    TPASTE:1, MOUTHWASH:1, MWASH:1, SPRAY:1, SPR:1, BALM:1, DEOD:1,
    SOAP:1, WASH:1, DROPS:1, BAR:1, BARS:1, BITES:1,
    COOKIE:1, COOKIES:1, BEANS:1, PLUNGER:1, FILTER:1, CARTRIDGE:1,
    CART:1, DOME:1, BEADS:1, BTL:1, BOTTLE:1, SHAKER:1, EXT:1, PST:1
  })[key];
}

function m13DP1SmartCap_(body, originalPosDescr, supplierRaw, prefix, maxLen, sup) {
  var tokens = m13DP5RemoveSentinels_(body || '').split(' ').filter(function(v) { return !!v; });
  if (!tokens.length) return m13DP1Join_(prefix, '');

  // DP8 conservative blend:
  // Q remains authoritative for current facts. O keeps the existing preference
  // only where the same canonical concept is independently present in Q.
  var identity = m13DP5DistinctiveInfo_(supplierRaw, sup);
  var reference = m13DP6ReferenceConfirmedKeys_(originalPosDescr, supplierRaw, sup);
  var frProtected = m13DP9ProtectedFindReplaceKeys_(originalPosDescr, supplierRaw, sup);

  function canon_(token) { return m13DP5MappedIdentityKey_(token, sup); }
  function current_() { return m13DP1Join_(prefix, tokens.join(' ')); }

  function removeExact_(key) {
    for (var i = 0; i < tokens.length && current_().length > maxLen; ) {
      var ck = canon_(tokens[i]);
      if (ck === key && !(identity.mustKeep[ck] || identity.protected[ck] || frProtected[ck])) tokens.splice(i, 1);
      else i++;
    }
  }

  // Lowest-information Q wording first. NONE is already removed before scoring.
  var low = ['WITH','AND','THE','100%','PURE','DRINK','MIX','AUS','AUST','GRS','FED','DUAL','DAILY','LIQ','ORGANIC','ORG'];
  for (var l = 0; l < low.length && current_().length > maxLen; l++) removeExact_(low[l]);
  if (current_().length <= maxLen) return current_();

  var hasSize = false;
  for (var s = 0; s < tokens.length; s++) if (m13DP1IsSizeToken_(tokens[s])) { hasSize = true; break; }
  if (hasSize) removeExact_('PWD');
  if (current_().length <= maxLen) return current_();

  function rarityScore_(key) {
    if (!identity) return 0;
    var r = identity.rarity[key] == null ? 0 : identity.rarity[key];
    var c = identity.contrast[key] == null ? 0 : identity.contrast[key];
    if (!r && !c) return 0;
    return Math.min(94, 40 + Math.round(r * 28 + c * 38));
  }

  function score_(i) {
    var t = canon_(tokens[i]);
    if (!t) return 0;
    if (m13DP1IsSizeToken_(tokens[i])) return 100;
    if (frProtected[t]) return 99;

    if (identity.mustKeep[t]) return 99;
    if (identity.protected[t]) return 97;

    // Definitive Q identifiers carrying letters + numbers are often strengths
    // or grades. Give them maximum priority only when they are distinctive among
    // similar same-brand products; common identifiers may yield to the flavour/
    // model term that actually distinguishes the sibling.
    if (/[A-Z]/.test(t) && /\d/.test(t)) {
      var ar = identity.rarity[t] == null ? 0.4 : identity.rarity[t];
      var ac = identity.contrast[t] == null ? 0 : identity.contrast[t];
      return Math.min(96, 62 + Math.round(ar * 18 + ac * 24));
    }
    if (/^\d+(?:-\d+)+$/.test(t)) return 92; // numeric range, e.g. 3-6
    if (/^(MTHS?|MONTHS?|YRS?|YEARS?)$/.test(t)) return 90;

    if (t === 'WPC' || t === 'WPI') return 97;

    if (t === 'PEA' || t === 'BEEF' || t === 'PLANT') {
      if ((tokens[i+1] && canon_(tokens[i+1]) === 'PROT') ||
          (tokens[i-1] && canon_(tokens[i-1]) === 'PROT')) return 88;
    }
    if (t === 'PROT' && ((tokens[i-1] && /^(PEA|BEEF|PLANT)$/.test(canon_(tokens[i-1]))) ||
                         (tokens[i+1] && /^(PEA|BEEF|PLANT)$/.test(canon_(tokens[i+1]))))) return 88;
    if (t === 'EAA' || t === 'BCAA' || t === 'HMB' || t === 'NMN' || t === 'NAC' || t === 'TMG' || t === 'ALCAR') return 92;
    if (t === 'FFREE' || t === 'AFREE') return reference[t] ? 92 : 86;
    if (t === 'TTREE') return reference[t] ? 88 : 78;
    if ((t === 'VIT' && tokens[i+1] && canon_(tokens[i+1]) === 'C') ||
        (t === 'C' && tokens[i-1] && canon_(tokens[i-1]) === 'VIT')) return 90;

    // Product/form families directly stated in Q. They are deliberately strong
    // but sit below the one must-keep distinguishing Q identity token.
    if (m13DP6IsProductTypeKey_(t)) {
      var typeScore = 84;
      if (reference[t]) typeScore += 7; // only if the same fact is also in Q
      return Math.min(94, typeScore);
    }
    if (/^(PREWO|UNFLAV|ISO|S\/F)$/.test(t)) return reference[t] ? 76 : 68;
    if (/^(COLL|CREAT|GLUT|INOS|ELEC|PEP|RCVY)$/.test(t)) return 74;

    var rare = rarityScore_(t);
    if (rare) return Math.min(96, rare + (reference[t] ? 12 : 0));

    var generic = {
      TRI:1, STR:1, EXT:1, LIQ:1, PWD:1, SACH:1, BOV:1, ORG:1, SAMP:1, PK:1,
      BLNDR:1, BALL:1, SPROUT:1, DARK:1, CHOC:1, PREMIUM:1, PREM:1, THINS:1,
      TRUFFLE:1, MIX:1, DRINK:1, AMINO:1, SNACK:1, BAR:1, NATURAL:1
    };
    if (generic[t]) return reference[t] ? 30 : 18;

    if (t === 'WATER') {
      var hasBottle = tokens.some(function(v) { return canon_(v) === 'BTL'; });
      return hasBottle ? 25 : 62;
    }
    if (t === 'BTL' || t === 'STRNR') return 55;
    if (/^\d+(?:\.\d+)?%$/.test(t) || /^\d+:\d+$/.test(t)) return 42;
    return reference[t] ? 54 : 38;
  }

  function removableNonSizeCount_() {
    var n = 0;
    for (var i = 0; i < tokens.length; i++) if (!m13DP1IsSizeToken_(tokens[i])) n++;
    return n;
  }

  // Remove the lowest-value whole Q-derived token first. The single strongest
  // brand-relative identity token is held until every other removable body token
  // has been exhausted.
  while (current_().length > maxLen && tokens.length > 1) {
    var bestIdx = -1;
    var bestScore = 999;
    var removable = removableNonSizeCount_();

    for (var i = 0; i < tokens.length; i++) {
      if (m13DP1IsSizeToken_(tokens[i])) continue;
      var key = canon_(tokens[i]);
      if ((identity.mustKeep[key] || frProtected[key]) && removable > 1) continue;
      var sc = score_(i);
      if (sc < bestScore) { bestScore = sc; bestIdx = i; }
    }
    if (bestIdx < 0) break;
    tokens.splice(bestIdx, 1);
  }

  // Final safety valve for unusually long fallback brand names. Size is always
  // protected; no word is truncated. The strongest distinctive Q token is only
  // removed if prefix + that token + size physically cannot fit the POS limit.
  while (current_().length > maxLen && tokens.length > 1) {
    var removeAt = -1;
    var lowest = 999;
    for (var r = 0; r < tokens.length; r++) {
      if (m13DP1IsSizeToken_(tokens[r])) continue;
      var rs = score_(r);
      if (rs < lowest) { lowest = rs; removeAt = r; }
    }
    if (removeAt < 0) break;
    tokens.splice(removeAt, 1);
  }

  return current_();
}

function m13PL1TierKeys_() {
  return ['pr1', 'pr2', 'pr3', 'pr4', 'pr6', 'pr7', 'pr8', 'pr9'];
}

function m13PL1BrandKey_(brand) {
  // Preserve genuine leading-Z brands such as ZEALLY. Only 3+ leading Z markers
  // are treated as legacy POS discontinued prefixes, matching the established
  // discontinued-brand display cleanup safety rule.
  var out = m13Upper_(brand || '');
  out = out.replace(/^\s*(?:Z{3,}\s*)+/i, '');
  out = out.replace(/^\s*DISCONTINUED\s+/i, '');
  return out.replace(/[^A-Z0-9]/g, '').slice(0, 24);
}

function m13PL1IsProtectedDissno_(dissno) {
  var key = String(dissno || '').trim().split('.')[0];
  return key === '33' || key === '29' || key === '8' || key === '13';
}

// =============================================================================
// v6.3.83 PL2 NEW-PRODUCT RRP-INDEPENDENT PRICE-LEVEL HELPERS
// Price-level columns are percentages. RRP is only required for the established
// $0.05 shelf-price humanisation/back-calculation step; it is not required merely
// to carry a same-brand/default percentage onto a genuinely NEW product row.
// =============================================================================
function m13PL2DirectPct_(value) {
  var n = m13PctFlexible_(value);
  if (!isFinite(n) || !(n > 0) || n > 100) return null;
  return Math.round(n * 100) / 100;
}

function m13PL2TierPctForNewProduct_(rrp, nominalPct) {
  var nominal = m13PL2DirectPct_(nominalPct);
  if (nominal == null) return 100;
  if (nominal >= 100) return 100;

  // Existing behaviour remains exact whenever an RRP is available.
  if (Number(rrp || 0) > 0) return m13TierPct_(rrp, nominal);

  // No RRP means there is no shelf price to ceiling-round to $0.05. Keep the
  // logical price-level percentage directly instead of silently forcing 100.
  return nominal;
}

function m13PL2CalcNewProductPriceTiers_(rrp, lastPrice, gstPct, dissno, isMember) {
  // Delegate to the established engine unchanged whenever RRP exists.
  if (Number(rrp || 0) > 0) {
    return m13CalcPriceTiers_(rrp, lastPrice, gstPct, dissno, isMember);
  }

  var isExcept = m13PL1IsProtectedDissno_(dissno);
  var pr5 = m13Pr5Pct_(rrp, lastPrice, gstPct); // Existing staff formula; without RRP this safely remains 100.

  if (isExcept) {
    return { pr1: 100, pr2: 100, pr3: 100, pr4: 100,
             pr5: pr5,
             pr6: 100, pr7: 100, pr8: 100, pr9: 100, ret: 100 };
  }

  var tier1 = isMember ? 90 : 100;
  return {
    pr1: m13PL2TierPctForNewProduct_(0, tier1),
    pr2: m13PL2TierPctForNewProduct_(0, 90),
    pr3: m13PL2TierPctForNewProduct_(0, 85),
    pr4: m13PL2TierPctForNewProduct_(0, 80),
    pr5: pr5,
    pr6: 100, pr7: 100, pr8: 100, pr9: 100,
    ret: m13PL2TierPctForNewProduct_(0, 85)
  };
}

function m13PL1InferNominalTierPct_(rrp, storedPct, cache) {
  rrp = Number(rrp || 0);
  var observed = m13PctFlexible_(storedPct);
  if (!(rrp > 0) || !(observed > 0)) return null;
  if (observed >= 99.995) return 100;

  cache = cache || {};
  var cacheKey = String(Math.round(rrp * 100)) + '|' + String(Math.round(observed * 10000) / 10000);
  if (Object.prototype.hasOwnProperty.call(cache, cacheKey)) {
    return cache[cacheKey] === '' ? null : cache[cacheKey];
  }

  // m13TierPct_ ceiling-rounds the actual price to $0.05, so the stored POS
  // percentage can sit slightly above the underlying nominal tier. Reverse only
  // a tight band around the observed value and keep exact engine equivalence.
  var minNominal = Math.max(20, Math.floor((observed - 3) * 4) / 4);
  var maxNominal = Math.min(100, Math.ceil((observed + 0.75) * 4) / 4);
  var bestNominal = null;
  var bestDiff = Infinity;
  var bestObservedDistance = Infinity;

  for (var quarter = Math.round(minNominal * 4); quarter <= Math.round(maxNominal * 4); quarter++) {
    var nominal = quarter / 4;
    var calculated = m13TierPct_(rrp, nominal);
    var diff = Math.abs(calculated - observed);
    var observedDistance = Math.abs(nominal - observed);
    if (diff < bestDiff - 1e-9 ||
        (Math.abs(diff - bestDiff) <= 1e-9 && observedDistance < bestObservedDistance - 1e-9) ||
        (Math.abs(diff - bestDiff) <= 1e-9 && Math.abs(observedDistance - bestObservedDistance) <= 1e-9 &&
         (bestNominal == null || nominal < bestNominal))) {
      bestNominal = nominal;
      bestDiff = diff;
      bestObservedDistance = observedDistance;
    }
  }

  // Stored POS PR percentages are normally 2dp. A 0.03 tolerance allows display
  // precision only; anything less certain is deliberately excluded from voting.
  var resolved = bestNominal != null && bestDiff <= 0.03 ? bestNominal : null;
  cache[cacheKey] = resolved == null ? '' : resolved;
  return resolved;
}

function m13PL1CaptureBrandPriceLevelVotes_(votesByBrand, pos, inferCache) {
  if (!votesByBrand || !pos) return;
  var brandKey = m13PL1BrandKey_(pos.translatedBrand || pos.brand || '');
  var rrp = Number(pos.rrp || 0);
  if (!brandKey) return;

  if (!votesByBrand[brandKey]) votesByBrand[brandKey] = {};
  var brandVotes = votesByBrand[brandKey];
  var keys = m13PL1TierKeys_();

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var nominal = rrp > 0 ? m13PL1InferNominalTierPct_(rrp, pos[key], inferCache) : null;

    // v6.3.83 PL2: stored POS price-level percentages remain valid brand evidence
    // even when that source TMP/POS row has no RRP. Prefer exact nominal reverse-
    // inference when possible; otherwise vote using the stored percentage itself.
    if (nominal == null) nominal = m13PL2DirectPct_(pos[key]);
    if (nominal == null) continue;

    if (!brandVotes[key]) brandVotes[key] = {};
    var voteKey = String(nominal);
    brandVotes[key][voteKey] = (brandVotes[key][voteKey] || 0) + 1;
  }
}

function m13PL1ResolveBrandPriceLevelVotes_(votesByBrand) {
  var out = {};
  var keys = m13PL1TierKeys_();

  Object.keys(votesByBrand || {}).forEach(function(brandKey) {
    var brandVotes = votesByBrand[brandKey] || {};
    var profile = {};

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var votes = brandVotes[key] || {};
      var voteKeys = Object.keys(votes);
      var bestCount = 0;
      var winners = [];

      for (var v = 0; v < voteKeys.length; v++) {
        var voteKey = voteKeys[v];
        var count = Number(votes[voteKey] || 0);
        if (count > bestCount) {
          bestCount = count;
          winners = [voteKey];
        } else if (count === bestCount && count > 0) {
          winners.push(voteKey);
        }
      }

      // Unique dominant pattern only. A tied brand level is ambiguous and must
      // retain the established default for that NEW PRODUCT price-level column.
      if (winners.length === 1) profile[key] = Number(winners[0]);
    }

    if (Object.keys(profile).length) out[brandKey] = profile;
  });

  return out;
}

function m13PL1ApplyNewProductBrandPriceLevels_(rows, brandPriceLevelMap) {
  var updatedRows = 0;
  var keys = m13PL1TierKeys_();
  var rowIndexes = { pr1: 57, pr2: 58, pr3: 59, pr4: 60, pr6: 62, pr7: 63, pr8: 64, pr9: 65 };

  for (var i = 0; i < (rows || []).length; i++) {
    var row = rows[i];
    if (!row) continue;

    // Final-state gate: barcode relinks and review promotions have already run.
    if (m13Upper_(row[72]) !== 'NEW' || m13Upper_(row[1]).indexOf('NEW PRODUCT') < 0) continue;

    var brandKey = m13PL1BrandKey_(row[44] || row[8] || row[7] || row[34] || '');
    var profile = brandKey && brandPriceLevelMap ? brandPriceLevelMap[brandKey] : null;
    if (!profile) continue;

    var rrp = m13Num_(row[56]);
    var lastPrice = m13Num_(row[54]);
    var gstPct = m13GstPct_(row[55]);
    var dissno = row[47];
    var changed = false;

    // Preserve the existing protected DISSNO exception exactly. These products
    // must keep PR1-4/PR6-9 at 100 regardless of an otherwise matching brand.
    if (!m13PL1IsProtectedDissno_(dissno)) {
      for (var k = 0; k < keys.length; k++) {
        var key = keys[k];
        if (profile[key] == null) continue;
        var idx = rowIndexes[key];

        // v6.3.83 PL2: target NEW PRODUCT RRP is optional for brand inheritance.
        // With RRP, retain the established $0.05 ceiling/back-calculation. Without
        // RRP, carry the resolved same-brand nominal percentage directly.
        var value = m13PL2TierPctForNewProduct_(rrp, profile[key]);
        if (String(row[idx]) !== String(value)) changed = true;
        row[idx] = value;
      }
    }

    // PR5 remains the established cost-based staff calculation and is never
    // copied from another product's price-level percentage.
    var pr5 = m13Pr5Pct_(rrp, lastPrice, gstPct);
    if (String(row[61]) !== String(pr5)) changed = true;
    row[61] = pr5;

    if (changed) updatedRows++;
  }

  return { rows: rows || [], updatedRows: updatedRows };
}

function m13BuildPosBundle_(shTmp, brandMap, findReplaceRules, scopedSource) {
  var lastRow = shTmp.getLastRow();
  var lastCol = shTmp.getLastColumn();
  var headers = m13HeaderMap_(shTmp, M13.HEADER_ROW);
  var fm1Cols = m13FM1CompileTmpReaders_(headers);
  var data = scopedSource && scopedSource.data
    ? scopedSource.data
    : shTmp.getRange(M13.DATA_ROW, 1, lastRow - M13.DATA_ROW + 1, lastCol).getDisplayValues();
  var sourceSheetRows = scopedSource && scopedSource.sheetRows ? scopedSource.sheetRows : null;
  var index = {};
  var rows = [];
  var dissnoVotesByBrand = {};
  var priceLevelVotesByBrand = {};
  var priceLevelInferCache = {};

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var rawBarcode = m13Str_(m13FM1ReadCompiled_(row, fm1Cols.barcode));
    var bc = m13Barcode_(rawBarcode);
    var rawBrand = m13Str_(m13FM1ReadCompiled_(row, fm1Cols.brand));
    var translatedBrand = m13TranslateBrand_(rawBrand, brandMap);
    var descr = m13Str_(m13FM1ReadCompiled_(row, fm1Cols.descr));

    var pos = {
      sheetRow: sourceSheetRows && sourceSheetRows[i] ? sourceSheetRows[i] : (M13.DATA_ROW + i),
      rawBarcode: rawBarcode,
      barcode: bc.canonical,
      variants: bc.variants,
      barcodeValid: bc.valid,
      plu: m13Str_(m13FM1ReadCompiled_(row, fm1Cols.plu)),
      subId: m13Str_(m13FM1ReadCompiled_(row, fm1Cols.subId)),
      brand: rawBrand,
      translatedBrand: translatedBrand,
      brandKey: m13NormBrand_(translatedBrand || rawBrand),
      descr: descr,
      // Do not run SRC_POS_FIND_REPLACE here. TMP is large and this value is
      // not used by the STATUS-driven OUT_MERGED_DATA build. Supplier rows still
      // receive the full brand-strip/find-replace/prefix pipeline.
      cleanDescr: descr,
      posDesc: m13Str_(m13FM1ReadCompiled_(row, fm1Cols.posDesc)),
      dissno: m13Str_(m13FM1ReadCompiled_(row, fm1Cols.dissno)),
      prodGrp: m13Str_(m13FM1ReadCompiled_(row, fm1Cols.prodGrp)),
      supplier: m13Str_(m13FM1ReadCompiled_(row, fm1Cols.supplier)),
      loyalty: m13Str_(m13FM1ReadCompiled_(row, fm1Cols.loyalty)),
      units: m13Str_(m13FM1ReadCompiled_(row, fm1Cols.units)),
      minOrder: m13Str_(m13FM1ReadCompiled_(row, fm1Cols.minOrder)),
      wsp: m13Num_(m13FM1ReadCompiled_(row, fm1Cols.wsp)),
      lastPrice: m13Num_(m13FM1ReadCompiled_(row, fm1Cols.lastPrice)),
      gstPct: m13GstPct_(m13FM1ReadCompiled_(row, fm1Cols.gstPct)),
      rrp: m13Num_(m13FM1ReadCompiled_(row, fm1Cols.rrp)),
      pr1: m13Str_(m13FM1ReadCompiled_(row, fm1Cols.pr1)),
      pr2: m13Str_(m13FM1ReadCompiled_(row, fm1Cols.pr2)),
      pr3: m13Str_(m13FM1ReadCompiled_(row, fm1Cols.pr3)),
      pr4: m13Str_(m13FM1ReadCompiled_(row, fm1Cols.pr4)),
      pr5: m13Str_(m13FM1ReadCompiled_(row, fm1Cols.pr5)),
      pr6: m13Str_(m13FM1ReadCompiled_(row, fm1Cols.pr6)),
      pr7: m13Str_(m13FM1ReadCompiled_(row, fm1Cols.pr7)),
      pr8: m13Str_(m13FM1ReadCompiled_(row, fm1Cols.pr8)),
      pr9: m13Str_(m13FM1ReadCompiled_(row, fm1Cols.pr9)),
      retPrice: m13Str_(m13FM1ReadCompiled_(row, fm1Cols.retPrice)),
      pharmProd: m13Str_(m13FM1ReadCompiled_(row, fm1Cols.pharmProd)),
      scales: m13Str_(m13FM1ReadCompiled_(row, fm1Cols.scales)),
      itemsize: m13Str_(m13FM1ReadCompiled_(row, fm1Cols.itemsize)),
      packaging: m13Str_(m13FM1ReadCompiled_(row, fm1Cols.packaging)),
      soh: m13Str_(m13FM1ReadCompiled_(row, fm1Cols.soh)),
      status: m13Str_(m13FM1ReadCompiled_(row, fm1Cols.status))
    };

    var posBrandForDissno = m13Str_(m13FM1ReadCompiled_(row, fm1Cols.posBrand)) || translatedBrand || rawBrand;
    var dissnoKey = m13NormBrand_(posBrandForDissno);
    if (dissnoKey && pos.dissno) {
      if (!dissnoVotesByBrand[dissnoKey]) dissnoVotesByBrand[dissnoKey] = {};
      dissnoVotesByBrand[dissnoKey][pos.dissno] = (dissnoVotesByBrand[dissnoKey][pos.dissno] || 0) + 1;
    }

    m13PL1CaptureBrandPriceLevelVotes_(priceLevelVotesByBrand, pos, priceLevelInferCache);

    rows.push(pos);
    if (bc.valid) {
      for (var v = 0; v < bc.variants.length; v++) {
        if (!index[bc.variants[v]]) index[bc.variants[v]] = { familyKey: bc.canonical, pos: pos };
      }
    }
  }
  return {
    index: index,
    rows: rows,
    brandDissnoMap: m13ResolveBrandDissnoVotes_(dissnoVotesByBrand),
    brandPriceLevelMap: m13PL1ResolveBrandPriceLevelVotes_(priceLevelVotesByBrand),
    scopeStats: scopedSource && scopedSource.stats ? scopedSource.stats : null
  };
}

function m13ResolveBrandDissnoVotes_(votesByBrand) {
  var out = {};
  Object.keys(votesByBrand || {}).forEach(function (brandKey) {
    var votes = votesByBrand[brandKey] || {};
    var best = '';
    var bestCount = -1;
    Object.keys(votes).forEach(function (dissno) {
      var count = votes[dissno] || 0;
      if (count > bestCount || (count === bestCount && String(dissno).localeCompare(String(best)) < 0)) {
        best = dissno;
        bestCount = count;
      }
    });
    if (best) out[brandKey] = best;
  });
  return out;
}

function m13ResolveNewProductDissno_(brand, gstPct, brandDissnoMap) {
  var key = m13NormBrand_(brand);
  if (key && brandDissnoMap && brandDissnoMap[key]) return brandDissnoMap[key];
  // Completely new brand: POS rule requested by user.
  return Number(gstPct || 0) > 0 ? '2' : '1';
}

function m13WriteOut_(sh, rows) {
  var n = rows.length;
  var c = M13.HEADERS.length;
  var CLIP = SpreadsheetApp.WrapStrategy.CLIP;

  if (!n) {
    m13ApplyPlainOutMergedFormat_(sh, 1, c);
    m13FixOutMergedRowHeights_(sh, 1);
    return;
  }

  // Prepare barcode/id columns as text before writing, so leading zeroes survive.
  m13FormatBarcodeTextColumns_(sh, n);

  // Output all data rows uppercase and apply fixed output defaults before write.
  rows = m13PrepareOutRowsForWrite_(rows);
  sh.getRange(3, 1, n, c).setValues(rows);

  // Lightweight formatting only. Avoid expensive background matrix writes here.
  m13ApplyPlainOutMergedFormat_(sh, n, c);

  try { sh.getRange(3, 1, n, c).setWrapStrategy(CLIP); } catch(eClip) {}
  try { sh.getRange(3, 1, n, 1).setHorizontalAlignment('center').setNumberFormat('0'); } catch(e1) {}
  try { sh.getRange(3, 18, n, 2).setNumberFormat('$#,##0.00'); } catch(e2) {}
  try { sh.getRange(3, 20, n, 1).setNumberFormat('0.00%'); } catch(e3) {}
  try { sh.getRange(3, 21, n, 1).setNumberFormat('$#,##0.00'); } catch(e4) {}
  try { sh.getRange(3, 22, n, 2).setNumberFormat('$#,##0.00'); } catch(e5) {}
  try { sh.getRange(3, 24, n, 1).setNumberFormat('0.00%'); } catch(e6) {}
  try { sh.getRange(3, 25, n, 3).setNumberFormat('$#,##0.00'); } catch(e7) {}
  try { sh.getRange(3, 40, n, 1).setNumberFormat('@'); } catch(eShelfMarkup) {}
  try { sh.getRange(3, 41, n, 1).setNumberFormat('@').setHorizontalAlignment('left').setVerticalAlignment('middle').setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP); } catch(eShelfRrp) {}
  if (typeof m13StyleOutMergedShelfPriceColumns_ === 'function') { try { m13StyleOutMergedShelfPriceColumns_(sh, n); } catch(eShelfCols) {} }
  try { sh.getRange(3, 54, n, 2).setNumberFormat('$#,##0.00'); } catch(e8) {}
  try { sh.getRange(3, 57, n, 1).setNumberFormat('$#,##0.00'); } catch(e9) {}

  m13FixOutMergedRowHeights_(sh, n);
  try { SpreadsheetApp.flush(); } catch(eFlush) {}
  // Final hard reset after all formatting/writes, so generated rows do not stay at 34px.
  m13FixOutMergedRowHeights_(sh, n);
}


function m13StyleOutMergedShelfPriceColumns_(sh, nData) {
  if (!sh || !nData || nData <= 0) return;
  var L = (typeof LEGEND !== 'undefined') ? LEGEND : {};
  var F = (typeof CFG !== 'undefined' && CFG.FONT) ? CFG.FONT : { FAMILY: 'Google Sans', SIZE: 8 };
  var odd = L.ALT_ODD || '#f5f5f5';
  var even = L.ALT_EVEN || '#e9f0f5';
  var dataFg = L.DATA_FG || '#1c2833';
  var clip = SpreadsheetApp.WrapStrategy.CLIP;
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
    try { log_('[OUT FORMAT] AN base reset skipped: ' + eAn.message); } catch(_eLogAn) {}
  }
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
    try { log_('[OUT FORMAT] AO style skipped: ' + eAo.message); } catch(_eLogAo) {}
  }
}

function m13ApplyPlainOutMergedFormat_(sh, nData, lastCol) {
  if (!nData || nData <= 0 || !lastCol || lastCol <= 0) return;

  var F = (CFG && CFG.FONT) ? CFG.FONT : { FAMILY: 'Google Sans', SIZE: 8 };
  var CLIP = SpreadsheetApp.WrapStrategy.CLIP;
  var fg = (LEGEND && LEGEND.DATA_FG) ? LEGEND.DATA_FG : '#1c2833';

  // Keep this formatting pass intentionally light. Do not write a full 2D
  // background matrix here — that is what caused the 200s+ rebuild time.
  // The data body receives one normal style pass, then fast native banding.
  try {
    sh.getRange(3, 1, nData, lastCol)
      .setFontFamily(F.FAMILY)
      .setFontSize(F.SIZE)
      .setFontColor(fg)
      .setFontWeight('normal')
      .setFontStyle('normal')
      .setHorizontalAlignment('left')
      .setVerticalAlignment('middle')
      .setWrapStrategy(CLIP);
  } catch(eStyle) {}

  // Keep the compact audit columns centred. TEXT %, SIZE and TYPE are values,
  // not checkboxes, but still read best as a small centred audit strip.
  try {
    sh.getRange(3, 33, nData, 7)
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle')
      .setWrapStrategy(CLIP);
  } catch(eAuditAlign) {}
  // AG:AJ are checkbox indicators; keep them slightly larger than the dense body font.
  try { sh.getRange(3, 33, nData, 4).setFontSize(10); } catch(eAuditFont) {}
  try { sh.getRange(3, 32, nData, 1).setWrapStrategy(CLIP).setHorizontalAlignment('left'); } catch(eNotesClip) {}

  // AC:AE intentionally use newline text. Keep the row height controlled while
  // allowing the cell text to read more clearly than the single-line version.
  try { sh.getRange(3, 29, nData, 3).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP).setVerticalAlignment('middle'); } catch(eMarkupClip) {}
  try { sh.getRange(3, 40, nData, 1).setNumberFormat('@').setHorizontalAlignment('center').setVerticalAlignment('middle').setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP); } catch(eShelfAlignAn) {}
  // AO / FINAL SHELF RRP is a two-line display like AC:AE, so keep it left-justified and compact.
  try { sh.getRange(3, 41, nData, 1).setHorizontalAlignment('left').setVerticalAlignment('middle').setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP); } catch(eShelfAlignAo) {}
  if (typeof m13StyleOutMergedShelfPriceColumns_ === 'function') { try { m13StyleOutMergedShelfPriceColumns_(sh, nData); } catch(eShelfCols) {} }

  // Visual rules are structural: native banding + conditional formatting.
  // Do not stamp a full background/font matrix during merge.
  if (typeof ensureOutMergedVisualRules_ === 'function') {
    try { ensureOutMergedVisualRules_(sh, nData, lastCol); } catch(eVis) {}
  } else {
    m13ApplyFastOutMergedBanding_(sh, nData, lastCol);
  }
}

function m13ApplyFastOutMergedBanding_(sh, nData, lastCol) {
  if (!sh || !nData || nData <= 0 || !lastCol || lastCol <= 0) return;

  var odd = (LEGEND && LEGEND.ALT_ODD) ? LEGEND.ALT_ODD : '#f5f5f5';
  var even = (LEGEND && LEGEND.ALT_EVEN) ? LEGEND.ALT_EVEN : '#e9f0f5';
  var target = sh.getRange(3, 1, nData, lastCol);

  // Remove only banding that overlaps the generated OUT_MERGED_DATA body.
  // This keeps the operation fast and avoids accumulating banding rules on
  // repeated builds.
  try {
    var targetR1 = 3;
    var targetR2 = 2 + nData;
    var targetC1 = 1;
    var targetC2 = lastCol;
    var bandings = sh.getBandings ? sh.getBandings() : [];
    for (var i = 0; i < bandings.length; i++) {
      var r = bandings[i].getRange();
      var r1 = r.getRow();
      var r2 = r1 + r.getNumRows() - 1;
      var c1 = r.getColumn();
      var c2 = c1 + r.getNumColumns() - 1;
      var overlaps = r1 <= targetR2 && r2 >= targetR1 && c1 <= targetC2 && c2 >= targetC1;
      if (overlaps) bandings[i].remove();
    }
  } catch(eRemoveBanding) {}

  try {
    var band = target.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false);
    band.setFirstRowColor(odd);
    band.setSecondRowColor(even);
  } catch(eBanding) {
    // Fallback is deliberately non-blocking. Data correctness and speed win.
    try { log_('[OUT FORMAT] Fast banding skipped: ' + eBanding.message); } catch(_eLog) {}
  }
}

function m13PrepareOutRowsForWrite_(rows) {
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    m13ApplyOutDefaultsToRow_(row);
    m13ApplyShelfRrpFormulaToRow_(row, M13.DATA_ROW + r);
    for (var c = 0; c < row.length; c++) {
      // Do not uppercase formulas. Uppercasing a LET formula can turn variable
      // names into invalid cell-like tokens and cause Formula parse errors.
      if (typeof row[c] === 'string' && row[c].charAt(0) !== '=') row[c] = row[c].toUpperCase();
    }
  }
  return rows;
}

function m13DefaultShelfRrp_(currentRrp, newRrp) {
  var cur = m13Num_(currentRrp);
  var nxt = m13Num_(newRrp);
  var best = Math.max(cur || 0, nxt || 0);
  return best > 0 ? m13FriendlyRrp_(best) : '';
}

function m13FormulaNumberExpr_(a1Ref) {
  return 'IFERROR(VALUE(REGEXREPLACE(TO_TEXT(' + a1Ref + '),"[^0-9.-]","")),0)';
}

function m13OutputRrpFormula_(sheetRow) {
  sheetRow = Number(sheetRow || 0);
  if (!sheetRow) return '';

  // Numeric RRP used by POS output.
  // AN supports three user entry styles:
  //   • blank      → use the higher of CURRENT RRP (Z) and NEW RRP (AA)
  //   • 1.65      → markup multiplier from NEW WSP EXGST (S), including GST where applicable
  //   • 165%      → same as 1.65 markup multiplier
  //   • 39.95     → actual shelf RRP inc GST / final price to use
  var wsp = m13FormulaNumberExpr_('$S' + sheetRow);
  var curRrp = m13FormulaNumberExpr_('$Z' + sheetRow);
  var newRrp = m13FormulaNumberExpr_('$AA' + sheetRow);
  var ov = m13FormulaNumberExpr_('$AN' + sheetRow);
  var ovText = 'TO_TEXT($AN' + sheetRow + ')';
  var ovHasPercent = 'REGEXMATCH(' + ovText + ',"%")';
  var gst = 'IF($AB' + sheetRow + '="YES",1.1,1)';
  var maxRrp = 'MAX(' + curRrp + ',' + newRrp + ')';

  // If AN contains a percent sign, treat it as a percentage/multiplier.
  // If AN is <= 10, treat it as a multiplier (1.65 etc).
  // If AN is > 10 and has no percent sign, treat it as an actual shelf RRP.
  var ovMultiplier = 'IF(' + ovHasPercent + ',' + ov + '/100,' + ov + ')';
  var overrideRrp = 'IF(OR(' + ovHasPercent + ',' + ov + '<=10),' + wsp + '*' + ovMultiplier + '*' + gst + ',' + ov + ')';

  return '=IFERROR(IF($AN' + sheetRow + '<>"",ROUND(MROUND(' + overrideRrp + ',0.05),2),IF(' + maxRrp + '>0,ROUND(MROUND(' + maxRrp + ',0.05),2),"")),"")';
}

function m13ShelfRrpFormula_(sheetRow) {
  sheetRow = Number(sheetRow || 0);
  if (!sheetRow) return '';

  // Display-only companion to BE / rrp incgst. Avoid LET(), because the merge
  // write-prep uppercases strings and LET variable names can become invalid
  // cell-like names in Google Sheets. This version uses only normal cell refs.
  var rrp = '$BE' + sheetRow;
  var wsp = m13FormulaNumberExpr_('$S' + sheetRow);
  var last = m13FormulaNumberExpr_('$W' + sheetRow);
  var gst = 'IF($AB' + sheetRow + '="YES",1.1,1)';
  var ex = '(' + rrp + '/' + gst + ')';

  return '=IFERROR(IF(' + rrp + '="","",IF(' + wsp + '>0,TEXT(' + ex + '/' + wsp + ',"0.00%")&" | $"&TEXT(' + rrp + ',"0.00")&CHAR(10)&IF(' + last + '>0,"GP NGST "&TEXT((' + ex + '-' + last + ')/' + ex + ',"0.00%")&" | $"&TEXT(' + ex + '-' + last + ',"0.00"),""),"$"&TEXT(' + rrp + ',"0.00"))),"")';
}

function m13ApplyShelfRrpFormulaToRow_(row, sheetRow) {
  if (!row) return row;
  while (row.length < M13.HEADERS.length) row.push('');
  // Keep AN as the user's editable override value. It can be a multiplier/percent or actual shelf RRP. BE is numeric POS RRP; AO is display text.
  row[56] = m13OutputRrpFormula_(sheetRow);
  row[40] = m13ShelfRrpFormula_(sheetRow);
  return row;
}

function repairFinalShelfRrpFormulas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = m13Sheet_(ss, M13.OUT_SHEET || 'OUT_MERGED_DATA', true);
  var lastRow = sh.getLastRow();
  if (lastRow < M13.DATA_ROW) return;
  var n = lastRow - M13.DATA_ROW + 1;
  var ao = new Array(n);
  var be = new Array(n);
  for (var i = 0; i < n; i++) {
    var r = M13.DATA_ROW + i;
    ao[i] = [m13ShelfRrpFormula_(r)];
    be[i] = [m13OutputRrpFormula_(r)];
  }
  sh.getRange(M13.DATA_ROW, 41, n, 1).setValues(ao).setNumberFormat('@').setHorizontalAlignment('left').setVerticalAlignment('middle').setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
  sh.getRange(M13.DATA_ROW, 57, n, 1).setValues(be).setNumberFormat('$#,##0.00');
  if (typeof m13StyleOutMergedShelfPriceColumns_ === 'function') { try { m13StyleOutMergedShelfPriceColumns_(sh, n); } catch(eShelfCols) {} }
  try { SpreadsheetApp.flush(); } catch(e) {}
  ss.toast('FINAL SHELF RRP formulas repaired: ' + n + ' row(s).', '✅ Shelf RRP', 8);
}

function m13ApplyOutDefaultsToRow_(row) {
  // Default only the POS-required fields that are blank.
  // v6.3.72: keep supplier H/I values mapped into AZ/BA; only use 1 when blank.
  // v6.3.51: AG:AM identity stays fixed; AN/AO shelf-price controls shift final POS output to AP:BU.
  row[48] = m13DefaultIfBlank_(row[48], '1'); // AW / prod grp
  row[50] = m13DefaultIfBlank_(row[50], '1'); // AY / loyalty scheme
  row[51] = m13DefaultIfBlank_(row[51], '1'); // AZ / units ← IN_SUP H / SUP UNITS IN PACK
  row[52] = m13DefaultIfBlank_(row[52], '1'); // BA / min order qty ← IN_SUP I / SUP MIN ORDER WS
  row[67] = m13DefaultIfBlank_(row[67], '0'); // BQ / pharm prod
  row[68] = m13DefaultIfBlank_(row[68], '0'); // BR / scales
  row[69] = m13DefaultIfBlank_(row[69], '0'); // BS / itemsize
}

function m13DefaultIfBlank_(value, fallback) {
  return (value === '' || value === null || value === undefined) ? fallback : value;
}

function m13IsDiscontinuedSubId_(value) {
  var s = m13NormId_(value || '');
  // v6.3.86: also the short "DISC <PLU>" Sub ID written for discontinued products.
  return !!s && (s.indexOf('DISCONTINUED') >= 0 || /^DISC\d*$/.test(s));
}

function m13SubIdWithPlu_(subId, plu) {
  // v6.3.86: blank Sub ID → POS PLU; SPECIAL ORDER → "SPEC ORD <PLU>"; DISCONTINUED → "DISC <PLU>".
  // A Sub ID already written this way is rebuilt to the same value, so re-runs never repeat the PLU.
  var s = m13Str_(subId);
  plu = m13Str_(plu).replace(/\s+/g, '');
  if (!plu) return s;
  if (!s) return plu;
  var up = s.toUpperCase().replace(/\s+/g, ' ');
  var labels = M13.SUBID_PLU_LABELS || [];
  var label = '';
  var i;
  for (i = 0; i < labels.length && !label; i++) {
    if (up.indexOf(m13Upper_(labels[i][0])) >= 0) label = m13Upper_(labels[i][1] || labels[i][0]);
  }
  for (i = 0; i < labels.length && !label; i++) {
    var shortLabel = m13Upper_(labels[i][1] || labels[i][0]);
    if (new RegExp('^' + m13EscReg_(shortLabel) + ' ?\\d+$').test(up)) label = shortLabel;
  }
  if (!label) return s;
  var out = label + ' ' + plu;
  if (out.length > Number(M13.SUBID_MAX_LEN || 15)) out = label + plu; // 7-digit PLU: drop the space to fit
  return out;
}

function m13SubIdCompareKey_(value) {
  // v6.3.86: "SPEC ORD 978019" / "DISC 980335" compare equal to the supplier's SPECIAL ORDER / DISCONTINUED
  // so the SUB ID audit tick stays the same after the new Sub IDs are imported into POS.
  var s = m13Str_(value);
  if (!s) return '';
  var up = s.toUpperCase().replace(/\s+/g, ' ');
  var labels = M13.SUBID_PLU_LABELS || [];
  for (var i = 0; i < labels.length; i++) {
    var shortLabel = m13Upper_(labels[i][1] || labels[i][0]);
    if (up.indexOf(m13Upper_(labels[i][0])) >= 0 || new RegExp('^' + m13EscReg_(shortLabel) + ' ?\\d*$').test(up)) return m13NormId_(shortLabel);
  }
  return m13NormId_(s);
}

function m13SupplierMarksDiscontinued_(sup) {
  // v6.3.86: the supplier upload marks the product discontinued:
  // SUP SUB ID contains DISCONTINUED, or SUP PRODUCT starts with ZZZ.
  if (!sup) return false;
  if (m13IsDiscontinuedSubId_(sup.subId)) return true;
  return /^\s*Z{3,}/i.test(m13Str_(sup.product));
}

function m13StripZzzTokens_(s) {
  // v6.3.87: remove standalone ZZZ / ZZZZ marker words (description building only).
  return m13Str_(s).replace(/(^|\s)Z{3,}(?=\s|$)/gi, ' ').replace(/\s+/g, ' ').trim();
}

function m13SupWithoutZzzProduct_(sup, findReplaceRules, prefixMap) {
  // v6.3.87: description-only copy of the supplier row with the ZZZZ marker removed from SUP PRODUCT.
  // The real supplier row (Q / SUP PRODUCT, matching, pricing) is not changed.
  if (!sup || !/(^|\s)Z{3,}(?=\s|$)/i.test(m13Str_(sup.product))) return sup;
  var product = m13StripZzzTokens_(sup.product);
  if (!product) return sup;
  var copy = {};
  for (var k in sup) if (Object.prototype.hasOwnProperty.call(sup, k)) copy[k] = sup[k];
  copy.product = product;
  copy.cleanProduct = m13BuildSupplierPosDescr_(copy, findReplaceRules, prefixMap);
  copy.cleanedProduct = copy.cleanProduct;
  return copy;
}

function m13ZzzzBrand_(brand) {
  // v6.3.85: discontinued brand → "ZZZZ " + brand (any existing ZZZ / ZZZZ prefix is removed first).
  var b = m13CleanDiscontinuedBrand_(brand);
  return b ? 'ZZZZ ' + b : b;
}

function m13ResolvedSupplierSubId_(sup, pos) {
  // Supplier sub-id wins for NEW and revived/matched rows. If the old POS row
  // carried DISCONTINUED in SUB ID, do not carry that marker forward.
  var supplierSubId = m13Str_(sup && sup.subId);
  if (supplierSubId) return supplierSubId;
  var posSubId = m13Str_(pos && pos.subId);
  return m13IsDiscontinuedSubId_(posSubId) ? '' : posSubId;
}

function m13BuildOneOutRow_(idx, kind, sup, pos, status, statusNote, supplierMap, discountRules, prefixMap, brandDissnoMap, findReplaceRules) {
  supplierMap = supplierMap || {};
  var row = m13BlankRow_();
  var hasPos = !!pos;

  var currentWsp = hasPos ? pos.wsp : 0;
  var newWsp = sup.wsp || 0;
  var currentLast = hasPos ? pos.lastPrice : 0;
  var newLast = sup.effectivePrice || sup.discountPrice || sup.wsp || 0;
  var currentRrp = hasPos ? pos.rrp : 0;
  var newRrp = m13FriendlyRrp_(sup.rrp || 0);
  var gstPct = sup.gstPct != null ? sup.gstPct : (hasPos ? pos.gstPct : 0);

  var wspDelta = m13PriceDelta_(currentWsp, newWsp);
  var lastDelta = m13PriceDelta_(currentLast, newLast);
  var wspDiff = wspDelta.diff;
  var wspPct = wspDelta.pct;
  var lastDiff = lastDelta.diff;
  var lastPct = lastDelta.pct;

  var priceStatus = m13PriceStatus_(kind, currentWsp, newWsp);

  var posRawBarcode = hasPos ? m13Str_(pos.rawBarcode || pos.barcode) : '';
  var posCanonBarcode = hasPos ? (pos.barcode || m13Barcode_(posRawBarcode).canonical) : '';

  var supRawBarcode = sup ? m13Str_(sup.rawBarcode || (sup.barcode && sup.barcode.raw) || '') : '';
  var supCanonBarcode = sup && sup.barcode && sup.barcode.valid ? sup.barcode.canonical : '';

  var cleanSupplierBarcode = posKingOutputBarcode_(supRawBarcode, supCanonBarcode);
  var barcodeUpdate = hasPos
    ? posKingBarcodeUpdateValue_(posRawBarcode, supRawBarcode || supCanonBarcode, pos && (pos.cleanDescr || pos.descr || pos.posDesc || ''), sup && (sup.cleanProduct || sup.product || ''))
    : '';

  // POS is king:
  // - Existing matched/relinked rows keep the original TMP/POS barcode in AN / main id.
  // - L / BARCODE UPDATE is the only place the replacement supplier barcode is shown.
  // - New rows have no existing POS barcode, so use the supplier barcode normalized
  //   to clean 13-digit EAN-13 before it reaches OUT/INSERT export.
  var finalMainId = hasPos
    ? (posRawBarcode || posCanonBarcode || '')
    : cleanSupplierBarcode;

  // Show supplier barcode in POS MAIN ID for NEW rows so barcode data is not blank,
  // but normalize it to the same clean 13-digit EAN-13 format used for matching.
  var reviewMainId = hasPos ? posRawBarcode : cleanSupplierBarcode;

  var posSupplierLabel = hasPos ? m13SupplierLabel_(pos.supplier, supplierMap) : '';
  var supSupplierLabel = m13SupplierLabel_(sup.supplierNum, supplierMap, sup.supplierName);
  var posBrand = hasPos ? (pos.translatedBrand || pos.brand || '') : '';
  var supBrand = sup.rawBrand || sup.translatedBrand || '';
  var outBrand = sup.translatedBrand || sup.rawBrand || posBrand;
  var oldBrand = '';
  if (hasPos && m13NormBrand_(posBrand) && m13NormBrand_(outBrand) && m13NormBrand_(posBrand) !== m13NormBrand_(outBrand)) {
    // v6.3.89 BE1: the same brand shortened (20-character POS field / cut last word) keeps the POS name, no brand change.
    if (m13BE1BrandsEquivalent_(posBrand, outBrand)) outBrand = posBrand;
    else oldBrand = posBrand;
  }
  // v6.3.86: supplier upload marks this POS product discontinued → same ZZZZ brand rule as discontinued rows.
  var supDiscontinued = hasPos && m13SupplierMarksDiscontinued_(sup);
  if (supDiscontinued) {
    var zzzzBrand = m13ZzzzBrand_(outBrand);
    if (m13Upper_(posBrand) !== m13Upper_(zzzzBrand)) oldBrand = posBrand || outBrand;
    outBrand = zzzzBrand;
    supBrand = m13ZzzzBrand_(supBrand);
  }

  var posDescr = hasPos ? (pos.descr || '') : '';
  // v6.3.87: supplier-discontinued rows build POS DESCR from the text without its ZZZZ marker,
  // so P / AT get one leading "ZZZZ " only (e.g. "ZZZZ BIOC ULTRADEFENCE MUSH 7 9").
  var descrSup = supDiscontinued ? m13SupWithoutZzzProduct_(sup, findReplaceRules, prefixMap) : sup;
  var descrPos = supDiscontinued ? m13StripZzzTokens_(posDescr) : posDescr;
  var supplierBaseDescr = descrSup.cleanProduct || descrSup.product || descrPos;
  var reconciledDescr = m13ReconcileProductDescription_(supplierBaseDescr, descrSup && descrSup.product, descrPos, prefixMap, descrSup, findReplaceRules);
  var outDescr = m13FixPosDescrCharacters_(reconciledDescr.descr || supplierBaseDescr || descrPos);
  var truthSourcesForDescr = reconciledDescr.truthSources || [descrSup && (descrSup.product || ''), descrPos || '', outDescr || ''];
  var truthExtractionForDescr = reconciledDescr.extraction || m13ExtractTruth_(truthSourcesForDescr);
  if (supDiscontinued) outDescr = m13DiscontinuedDescr_(outDescr); // v6.3.86: existing discontinued "ZZZZ " description rule
  var posDescOut = m13PosDesc_(outDescr || posDescr);

  row[0]  = idx;
  row[1]  = kind === 'NEW' ? '🟢 NEW PRODUCT' : (kind === 'MATCHED' ? '✅ MATCHED' : '⚠️ IDENTITY REVIEW');
  row[2]  = priceStatus;
  row[3]  = kind === 'NEW' ? 'NEW' : (kind === 'MATCHED' ? 'P1-EXACT' : 'REVIEW');
  row[4]  = kind === 'REVIEW' ? '—' : 'HIGH';
  row[5]  = posSupplierLabel;
  row[6]  = supSupplierLabel;
  // Column H is the final/new updated brand; column J keeps the previous POS brand only when it changed.
  row[7]  = outBrand;
  row[8]  = supBrand;
  row[9]  = oldBrand;
  row[10] = reviewMainId;
  row[11] = barcodeUpdate;
  row[12] = hasPos ? pos.plu : '';
  var resolvedSupplierSubId = m13SubIdWithPlu_(supDiscontinued ? 'DISCONTINUED' : m13ResolvedSupplierSubId_(sup, pos), hasPos ? pos.plu : '');
  row[13] = resolvedSupplierSubId;
  row[14] = posDescr;
  row[15] = outDescr;
  row[16] = sup.product;
  row[17] = currentWsp || '';
  row[18] = newWsp || '';
  row[19] = currentWsp > 0 ? wspPct : '';
  row[20] = (currentWsp || newWsp) ? wspDiff : '';
  row[21] = currentLast || '';
  row[22] = newLast || '';
  row[23] = currentLast > 0 ? lastPct : '';
  row[24] = (currentLast || newLast) ? lastDiff : '';
  row[25] = currentRrp || '';
  row[26] = newRrp || '';
  row[27] = gstPct ? 'YES' : 'NO';
  row[28] = m13MarkupDisplay_(currentWsp, currentLast, currentRrp, gstPct, false, 'CUR');
  row[29] = m13MarkupPctDisplay_(newWsp, newLast, newRrp, gstPct);
  row[30] = m13MaintainingMarkupDisplay_(newWsp, newLast, newRrp, gstPct);
     
  // Build match details for the notes column
  var matchDetails = {};
  if (hasPos && kind !== 'REVIEW') {
    // BARCODE match
    var supCanon = sup && sup.barcode && sup.barcode.valid ? sup.barcode.canonical : '';
    var posCanon = pos && pos.barcode ? pos.barcode : '';
    matchDetails.barcodeMatched = !!(
      (supRawBarcode || supCanon) &&
      (posRawBarcode || posCanon) &&
      posKingBarcodeSetsIntersect_(
        posKingBarcodeKeySet_(posRawBarcode || posCanon),
        posKingBarcodeKeySet_(supRawBarcode || supCanon)
      )
    );
    
    // SUB-ID match
    var supSubId = m13SubIdCompareKey_(sup.subId || '');
    var posSubId = m13SubIdCompareKey_(pos.subId || '');
    matchDetails.subIdMatched = (supSubId && posSubId && supSubId === posSubId);
    
    // BRAND match
    var supBrandNorm = m13NormBrand_(sup.translatedBrand || sup.rawBrand || '');
    var posBrandNorm = m13NormBrand_(pos.translatedBrand || pos.brand || '');
    matchDetails.brandMatched = (supBrandNorm && posBrandNorm && (supBrandNorm === posBrandNorm ||
      m13BE1BrandsEquivalent_(sup.translatedBrand || sup.rawBrand, pos.translatedBrand || pos.brand))); // v6.3.89 BE1
    
    // RAW WSP match (within 5% tolerance)
    var wspTolerance = 0.05;
    var supWsp = Number(sup.wsp || 0);
    var posWsp = Number(pos.wsp || 0);
    if (supWsp > 0 && posWsp > 0) {
      var wspDiffCalc = Math.abs(supWsp - posWsp) / Math.max(supWsp, posWsp);
      matchDetails.wspMatched = (wspDiffCalc <= wspTolerance);
    } else {
      matchDetails.wspMatched = false;
    }
    
    // PRODUCT TEXT match percentage (Dice coefficient)
    var supProductNorm = m13NormText_(sup.cleanProduct || sup.product || '');
    var posDescrNorm = m13NormText_(pos.cleanDescr || pos.descr || '');
    matchDetails.productMatchPct = m13Dice_(supProductNorm, posDescrNorm);
    
    // Extract SIZE / TYPE from the full evidence pool:
    // SUP PRODUCT (Q), ORIGINAL POS DESCR (O), POS DESCR (P).
    var pooledExtraction = truthExtractionForDescr;
    if (pooledExtraction.size) matchDetails.size = pooledExtraction.size;
    if (pooledExtraction.type) matchDetails.typeForm = pooledExtraction.type;
    
    // SCORE from matching algorithm
    matchDetails.score = m13ScoreSupplierVsPos_(sup, pos);
  }

  // Ensure AL / SIZE and AM / TYPE are populated for NEW and REVIEW rows as well,
  // using the same three-column evidence pool: SUP PRODUCT, ORIGINAL POS DESCR, POS DESCR.
  var alwaysExtraction = truthExtractionForDescr;
  if (alwaysExtraction.size && !matchDetails.size) matchDetails.size = alwaysExtraction.size;
  if (alwaysExtraction.type && !matchDetails.typeForm) matchDetails.typeForm = alwaysExtraction.type;

  row[31] = m13BuildNotes_(kind, priceStatus, oldBrand, sup, pos, statusNote, matchDetails);
  if (sup && sup.isActive === false) row[31] = m13TrimNote_('SUPPLIER BLOCKED/EXCLUDED | ' + row[31]);
  m13ApplyAuditCellsToRow_(row, m13BuildAuditCellsFromMatchDetails_(matchDetails));

  // AN/AO shelf-price controls. AG:AM identity columns stay fixed.
  row[39] = ''; // RRP / MARKUP OVERRIDE — optional multiplier (1.65), percent (165%), or actual shelf RRP (39.95)
  row[40] = ''; // FINAL SHELF RRP formula is applied immediately before writing

  row[41] = finalMainId;
  row[42] = hasPos ? pos.plu : '';
  row[43] = resolvedSupplierSubId;
  row[44] = outBrand;
  row[45] = outDescr;
  row[46] = posDescOut;
  var resolvedDissno = hasPos ? pos.dissno : m13ResolveNewProductDissno_(outBrand, gstPct, brandDissnoMap);
  row[47] = resolvedDissno;
  row[48] = hasPos ? pos.prodGrp : '';
  row[49] = sup.supplierNum || (hasPos ? pos.supplier : '');
  row[50] = '1';
  row[51] = m13DefaultIfBlank_(sup.units, '1');     // AZ ← IN_SUP H / SUP UNITS IN PACK
  row[52] = m13DefaultIfBlank_(sup.minOrder, '1');  // BA ← IN_SUP I / SUP MIN ORDER WS
  row[53] = newWsp || '';
  row[54] = newLast || '';
  row[55] = gstPct || 0;
  var finalShelfRrp = m13DefaultShelfRrp_(currentRrp, newRrp);
  row[56] = finalShelfRrp || '';

  // ── Price tiers (v6.3.7+) ────────────────────────────────────────────────
  // All pr/ret values are computed from FINAL SHELF RRP, not raw supplier RRP.
  var _dissno    = resolvedDissno || (hasPos ? pos.dissno : '');
  var _rrp       = finalShelfRrp || newRrp || (hasPos ? pos.rrp : 0);
  var _lastPrice = newLast || (hasPos ? pos.lastPrice : 0);
  var _brandNorm = m13NormBrand_(sup.translatedBrand || sup.rawBrand || (hasPos ? pos.brand : ''));
  var _supNum    = sup.supplierNum || (hasPos ? pos.supplier : '');
  var _isMember  = m13IsMemberBrand_(_brandNorm, _supNum, sup.member || '', prefixMap, discountRules);
  var _tiers     = kind === 'NEW'
    ? m13PL2CalcNewProductPriceTiers_(_rrp, _lastPrice, gstPct, _dissno, _isMember)
    : m13CalcPriceTiers_(_rrp, _lastPrice, gstPct, _dissno, _isMember);

  row[57] = _tiers.pr1;
  row[58] = _tiers.pr2;
  row[59] = _tiers.pr3;
  row[60] = _tiers.pr4;
  row[61] = _tiers.pr5;
  row[62] = _tiers.pr6;
  row[63] = _tiers.pr7;
  row[64] = _tiers.pr8;
  row[65] = _tiers.pr9;
  row[66] = _tiers.ret;
  // ─────────────────────────────────────────────────────────────────────────
  row[67] = hasPos ? pos.pharmProd : '';
  row[68] = hasPos ? pos.scales : '';
  row[69] = hasPos ? pos.itemsize : '';
  row[70] = hasPos ? pos.packaging : '';
  row[71] = hasPos ? pos.soh : '';
  row[72] = kind === 'NEW' ? 'NEW' : (kind === 'MATCHED' ? 'MATCHED' : 'IDENTITY REVIEW');

  m13ApplyOutDefaultsToRow_(row);
  return row;
}

function m13BuildDiscontinuedOutRow_(idx, pos, supplierMap, discountRules, prefixMap) {
  var row = m13BlankRow_();
  var currentWsp = pos.wsp || 0;
  var currentLast = pos.lastPrice || 0;
  var currentRrp = pos.rrp || 0;
  var gstPct = pos.gstPct || 0;
  var discBrand = m13CleanDiscontinuedBrand_(pos.translatedBrand || pos.brand || '');
  var discTruthSources = [pos.descr || '', pos.posDesc || ''];
  var discontinuedExtraction = m13ExtractTruth_(discTruthSources, pos && discBrand);
  var discDescr = m13DiscontinuedDescr_(pos.descr || pos.posDesc || '');
  discDescr = m13AppendTypeAcronymToPosDescr_(discDescr, discontinuedExtraction, discTruthSources);

  row[0]  = idx;
  row[1]  = '⛔ DISCONTINUED';
  var discontinuedSoh = m13Str_(pos.soh || '');
  var discontinuedSohNum = m13Num_(discontinuedSoh);
  row[2]  = discontinuedSohNum > 0 ? ('DISCONTINUED SOH ' + discontinuedSoh) : 'DISCONTINUED';
  row[3]  = 'NONE';
  row[4]  = '—';
  row[5]  = m13SupplierLabel_(pos.supplier, supplierMap);
  row[7]  = m13ZzzzBrand_(discBrand);
  row[9]  = discBrand; // v6.3.87: J / OLD BRAND shows the brand before ZZZZ
  row[10] = pos.rawBarcode || pos.barcode || '';
  row[12] = pos.plu || '';
  row[13] = m13SubIdWithPlu_('DISCONTINUED', pos.plu);
  row[14] = pos.descr || '';
  row[15] = discDescr;
  row[17] = currentWsp || '';
  row[21] = currentLast || '';
  row[25] = currentRrp || '';
  row[26] = currentRrp || '';
  row[27] = gstPct ? 'YES' : 'NO';
  row[28] = m13MarkupDisplay_(currentWsp, currentLast, currentRrp, gstPct, false, 'CUR');
  row[29] = m13MarkupPctDisplay_(currentWsp, currentLast, currentRrp, gstPct);
  row[30] = m13MaintainingMarkupDisplay_(currentWsp, currentLast, currentRrp, gstPct);
  row[31] = 'NO SUPPLIER MATCH — SAFE TO REVIEW FOR DISCONTINUATION.';
  // AG:AJ must remain checkbox audit indicators, not POS context text.
  // Discontinued rows have no active supplier match, so they show failed checks
  // in the same coloured checkbox style used by matched rows.
  m13ApplyAuditCellsToRow_(row, [
    m13CheckBox_(false, false),
    m13CheckBox_(false, false),
    m13CheckBox_(false, false),
    m13CheckBox_(false, false),
    '',
    discontinuedExtraction.size || '',
    discontinuedExtraction.type || ''
  ]);

  row[39] = ''; // RRP / MARKUP OVERRIDE — multiplier/percent or actual shelf RRP
  row[40] = ''; // FINAL SHELF RRP formula is applied immediately before writing
  row[41] = pos.rawBarcode || pos.barcode || '';
  row[42] = pos.plu || '';
  row[43] = m13SubIdWithPlu_('DISCONTINUED', pos.plu);
  row[44] = m13ZzzzBrand_(discBrand);
  row[45] = discDescr;
  row[46] = m13PosDesc_(discDescr);
  row[47] = pos.dissno || '';
  row[48] = pos.prodGrp || '';
  row[49] = pos.supplier || '';
  row[50] = pos.loyalty || '';
  row[51] = pos.units || '';
  row[52] = pos.minOrder || '';
  row[53] = currentWsp || '';
  row[54] = currentLast || '';
  row[55] = gstPct || 0;
  var finalDiscRrp = m13DefaultShelfRrp_(currentRrp, currentRrp);
  row[56] = finalDiscRrp || '';

  // ── Price tiers (v6.3.7+) ────────────────────────────────────────────────
  var _brandNorm = m13NormBrand_(discBrand);
  var _isMember  = m13IsMemberBrand_(_brandNorm, pos.supplier || '', '', prefixMap, discountRules);
  var _tiers     = m13CalcPriceTiers_(finalDiscRrp || currentRrp, currentLast, gstPct, pos.dissno, _isMember);

  row[57] = _tiers.pr1;
  row[58] = _tiers.pr2;
  row[59] = _tiers.pr3;
  row[60] = _tiers.pr4;
  row[61] = _tiers.pr5;
  row[62] = _tiers.pr6;
  row[63] = _tiers.pr7;
  row[64] = _tiers.pr8;
  row[65] = _tiers.pr9;
  row[66] = _tiers.ret;
  // ─────────────────────────────────────────────────────────────────────────
  row[67] = pos.pharmProd || '';
  row[68] = pos.scales || '';
  row[69] = pos.itemsize || '';
  row[70] = pos.packaging || '';
  row[71] = pos.soh || '';
  row[72] = 'DISCONTINUED';

  m13ApplyOutDefaultsToRow_(row);
  return row;
}

// =============================================================================

// =============================================================================
// SUPPLIER CHANGE REFRESH — controlled column G workflow (v6.3.31)
// =============================================================================

function refreshSupplierChanges() {
  return m13RefreshSupplierChangesCore_({ visibleOnly: false, consumeQueue: true, silent: false });
}
function refreshSupplierChangesFiltered() {
  return m13RefreshSupplierChangesCore_({ visibleOnly: true, consumeQueue: true, silent: false });
}
function m13AutoRefreshSupplierChangesFromEdit_(e) {
  var rows = m13SupplierEditRowsFromEvent_(e, 7);
  if (!rows.length) return null;
  return m13RefreshSupplierChangesCore_({ rows: rows, visibleOnly: false, consumeQueue: false, silent: true });
}
function m13AutoRefreshSupplierOverrideFromEdit_(e) { return m13AutoRefreshSupplierChangesFromEdit_(e); }
function m13SupplierOverrideRowsFromEdit_(e) { return m13SupplierEditRowsFromEvent_(e, 7); }
function m13RefreshSupplierOverrideRows_(rows, opt) { opt = opt || {}; opt.rows = rows || opt.rows || []; opt.consumeQueue = false; return m13RefreshSupplierChangesCore_(opt); }
function m13ResolveSupplierOverrideEditRow_(row) { return row || null; }
function m13ApplySupplierOverrideResultStyles_(sh, acceptedRows, rejectedRows, pendingRows) { if (pendingRows && pendingRows.length) m13ApplyOverrideStateStyles_(sh, pendingRows, 'PENDING'); if (acceptedRows && acceptedRows.length) m13ApplyOverrideStateStyles_(sh, acceptedRows, 'ACCEPTED'); if (rejectedRows && rejectedRows.length) m13ApplyOverrideStateStyles_(sh, rejectedRows, 'REJECTED'); }
function m13IsSupplierOverrideAccepted_(value) { return m13UpperSafe_(value).indexOf('SUP OVERRIDE ACCEPTED') >= 0; }
function m13IsSupplierOverrideRejected_(value) { return m13UpperSafe_(value).indexOf('SUP OVERRIDE REJECTED') >= 0; }
function ensureOutMergedVisualRulesIfNeeded_(sh) { if (typeof ensureOutMergedVisualRules_ === 'function' && sh) return ensureOutMergedVisualRules_(sh, Math.max(1, sh.getLastRow() - 2), Math.max(sh.getLastColumn(), M13.HEADERS.length)); }
function m13ProcessQueuedSupplierOverrides() { return m13RefreshSupplierChangesCore_({ visibleOnly: false, consumeQueue: true, silent: true }); }
function m13RefreshSupplierChangesCore_(opt) {
  opt = opt || {};
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var t0 = Date.now();
  try {
    try { if (typeof m13EnsureSupplierQueueHidden_ === 'function') m13EnsureSupplierQueueHidden_(); } catch (_hideQueue) {}
    var shOut = m13Sheet_(ss, CFG.SH.OUT_MERGED || M13.OUT_SHEET || 'OUT_MERGED_DATA', true);
    var shSup = m13Sheet_(ss, CFG.SH.IN_SUP || 'IN_SUPPLIER_/_PRODUCT_UPDATES', true);
    var lastRow = shOut.getLastRow();
    var lastCol = Math.min(Math.max(shOut.getLastColumn(), M13.HEADERS.length), M13.HEADERS.length);
    if (lastRow < M13.DATA_ROW) { if (!opt.silent) ss.toast('OUT_MERGED_DATA has no data rows.', '🔁 Supplier Changes', 6); return { accepted: 0, rejected: 0, skipped: 0, targets: 0 }; }
    var supplierMap = m13LoadSupplierMap_(ss);
    var targetRows = m13GetSupplierChangeTargetRows_(shOut, supplierMap, opt);
    if (!targetRows.length) { if (!opt.silent) ss.toast('No pending supplier changes found in Column G.', '✅ Supplier Changes', 6); return { accepted: 0, rejected: 0, skipped: 0, targets: 0 }; }
    if (!opt.silent) ss.toast('Validating ' + targetRows.length + ' changed supplier row(s)…', '🔁 Supplier Changes', 30);
    var visibleSet = opt.visibleOnly ? m13BuildVisibleRowSetFromHelper_(shOut) : null;
    var brandMap = m13LoadBrandMap_(ss);
    var activeSuppliers = m13LoadActiveSuppliers_(ss);
    var findReplaceRules = m13LoadFindReplaceRules_(ss);
    var prefixMap = m13LoadPrefixMap_(ss);
    var discountRules = m13LoadDiscountRules_(ss, brandMap);
    var supplierIndex = m13BuildSupplierOverrideIndex_(shSup, brandMap, supplierMap, activeSuppliers, discountRules, findReplaceRules, prefixMap);
    var outRows = m13ReadOutRowsBySheetRows_(shOut, targetRows, lastCol);
    // Reinforce orange pending style before validation so queued/recovered rows
    // do not appear frozen while supplier lookup is running. Accepted/rejected
    // state is applied after the row values are written.
    if (targetRows.length <= 100) { try { m13ApplyOverrideStateStyles_(shOut, targetRows, 'PENDING'); } catch (_pendingStyle) {} }
    var changedRows=[], changedRowValues={}, noteRows=[], acceptedRows=[], rejectedRows=[], skippedRows=[];
    var accepted=0, rejected=0, skipped=0;
    targetRows.forEach(function(sheetRow){
      if (visibleSet && !visibleSet[sheetRow]) { skipped++; skippedRows.push(sheetRow); return; }
      var row = outRows[sheetRow];
      if (!row) { skipped++; skippedRows.push(sheetRow); return; }
      var selectedRaw = row[6];
      var selectedNum = m13SupplierNumberFromCellSafe_(selectedRaw, supplierMap);
      if (!selectedNum) { skipped++; skippedRows.push(sheetRow); return; }
      var acceptedSupplierNum = m13NormIdSafe_(row[49]);
      var statusText = m13UpperSafe_(row[2]);
      if (acceptedSupplierNum && m13NormIdSafe_(selectedNum) === acceptedSupplierNum && statusText.indexOf('PENDING') < 0 && !m13IsSupplierOverrideAccepted_(row[2])) { skipped++; skippedRows.push(sheetRow); return; }
      var match = m13FindSupplierOverrideCandidate_(supplierIndex, selectedNum, row);
      if (!match.ok) {
        row[2] = 'SUP OVERRIDE REJECTED';
        row[31] = m13BuildSupplierOverrideRejectedNote_(selectedRaw, match.reason, row[31]);
        row[6] = m13OriginalSupplierLabelForRejectedOverride_(row, supplierMap, acceptedSupplierNum);
        changedRows.push(sheetRow); changedRowValues[sheetRow]=row; noteRows.push({row:sheetRow,note:row[31]}); rejectedRows.push(sheetRow); rejected++; return;
      }
      m13ApplySupplierOverrideToOutRow_(row, match.sup, supplierMap, discountRules, prefixMap, match);
      row[2] = 'SUP OVERRIDE ACCEPTED';
      changedRows.push(sheetRow); changedRowValues[sheetRow]=row; noteRows.push({row:sheetRow,note:row[31]}); acceptedRows.push(sheetRow); accepted++;
    });
    if (changedRows.length) {
      m13WriteChangedOutRowsBySheetRow_(shOut, changedRows, changedRowValues, lastCol);
      m13ApplySupplierChangeNotesFast_(shOut, noteRows);
      m13FormatChangedOutRowsFast_(shOut, changedRows);
      if (acceptedRows.length) m13ApplyOverrideStateStyles_(shOut, acceptedRows, 'ACCEPTED');
      if (rejectedRows.length) m13ApplyOverrideStateStyles_(shOut, rejectedRows, 'REJECTED');
      m13ClearQueuedSupplierChangeRows_(changedRows.concat(skippedRows));
    } else if (skippedRows.length) m13ClearQueuedSupplierChangeRows_(skippedRows);
    try { ensureOutMergedVisualRulesIfNeeded_(shOut); } catch (_vis) {}
    var elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    var msg = 'Targets: ' + targetRows.length + ' | Accepted: ' + accepted + ' | Rejected: ' + rejected + ' | Skipped: ' + skipped + ' | ' + elapsed + 's';
    if (!opt.silent) ss.toast(msg, '✅ Supplier Changes', 10);
    return { targets: targetRows.length, accepted: accepted, rejected: rejected, skipped: skipped, seconds: Number(elapsed) };
  } catch (err) {
    ss.toast('Supplier change refresh failed: ' + err.message, '❌ Supplier Changes', 10);
    try { ui.alert('Supplier change refresh failed', String(err && err.stack ? err.stack : err), ui.ButtonSet.OK); } catch (_alert) {}
    throw err;
  }
}

function m13GetPendingSupplierOverrideRowsFromColumnC_(shOut) {
  var rows = [];
  if (!shOut) return rows;
  var lastRow = shOut.getLastRow();
  if (lastRow < M13.DATA_ROW) return rows;

  // Recovery path: one lightweight read of Column C only. This catches rows that
  // visibly show SUP OVERRIDE PENDING but were not written to the hidden queue
  // because a paste/edit trigger was interrupted or timed out. It does not scan
  // the whole OUT data matrix and it does not compare every row against AV.
  var vals = shOut.getRange(M13.DATA_ROW, 3, lastRow - M13.DATA_ROW + 1, 1).getDisplayValues();
  for (var i = 0; i < vals.length; i++) {
    if (m13UpperSafe_(vals[i][0]).indexOf('SUP OVERRIDE PENDING') >= 0) rows.push(M13.DATA_ROW + i);
  }
  return rows;
}

function m13GetSupplierChangeTargetRows_(shOut, supplierMap, opt) {
  opt = opt || {};

  // Targeted refresh with recovery: explicit rows + queued rows + visible
  // Column C pending rows. The Column C recovery is intentional because simple
  // onEdit can be interrupted during large pastes, leaving rows coloured/marked
  // as pending but missing from the hidden queue. This still avoids a full
  // C/G/AV supplier scan.
  var targetRows = [];
  if (opt.rows && opt.rows.length) targetRows = targetRows.concat(opt.rows);

  if (opt.consumeQueue !== false) {
    targetRows = targetRows.concat(m13GetQueuedSupplierChangeRows_());
  }

  targetRows = targetRows.concat(m13GetPendingSupplierOverrideRowsFromColumnC_(shOut));
  return m13UniqueSortedRows_(targetRows);
}
function m13WriteChangedOutRowsBySheetRow_(sh, sheetRows, rowValuesBySheetRow, lastCol) {
  sheetRows = m13UniqueSortedRows_(sheetRows);
  if (!sheetRows.length) return;

  var minRow = sheetRows[0];
  var maxRow = sheetRows[sheetRows.length - 1];
  var blockHeight = maxRow - minRow + 1;
  var block = sh.getRange(minRow, 1, blockHeight, lastCol).getValues();

  sheetRows.forEach(function (sheetRow) {
    if (rowValuesBySheetRow[sheetRow]) {
      var nextRow = rowValuesBySheetRow[sheetRow].slice(0, lastCol);
      if (typeof m13ApplyShelfRrpFormulaToRow_ === 'function') m13ApplyShelfRrpFormulaToRow_(nextRow, sheetRow);
      block[sheetRow - minRow] = nextRow;
    }
  });

  // One value commit for the entire targeted execution block.
  sh.getRange(minRow, 1, blockHeight, lastCol).setValues(block);
}
function m13ApplySupplierChangeNotesFast_(sh, notes) {
  if (!notes || !notes.length) return;
  var byRow={}; notes.forEach(function(n){ byRow[Number(n.row)] = String(n.note || ''); });
  var rows=m13UniqueSortedRows_(Object.keys(byRow).map(Number));
  m13GroupContiguousRows_(rows).forEach(function(g){ var vals=[]; for(var r=g.start;r<g.start+g.len;r++) vals.push([byRow[r]||'']); try { sh.getRange(g.start,7,g.len,1).setNotes(vals); } catch(_err) {} });
}
function m13FormatChangedOutRowsFast_(sh, sheetRows) {
  sheetRows=m13UniqueSortedRows_(sheetRows); if(!sheetRows.length) return;
  var family=(CFG&&CFG.FONT&&CFG.FONT.FAMILY)?CFG.FONT.FAMILY:'Google Sans'; var size=(CFG&&CFG.FONT&&CFG.FONT.SIZE)?CFG.FONT.SIZE:8; var clip=SpreadsheetApp.WrapStrategy.CLIP; var nCols=M13.HEADERS.length;
  m13GroupContiguousRows_(sheetRows).forEach(function(g){ var r=g.start,len=g.len;
    try{ sh.getRange(r,1,len,nCols).setFontFamily(family).setFontSize(size).setWrapStrategy(clip).setVerticalAlignment('middle'); }catch(_e0){}
    try{ sh.getRange(r,18,len,2).setNumberFormat('$#,##0.00'); }catch(_e1){}
    try{ sh.getRange(r,20,len,1).setNumberFormat('0.00%'); }catch(_e2){}
    try{ sh.getRange(r,21,len,1).setNumberFormat('$#,##0.00'); }catch(_e3){}
    try{ sh.getRange(r,22,len,2).setNumberFormat('$#,##0.00'); }catch(_e4){}
    try{ sh.getRange(r,24,len,1).setNumberFormat('0.00%'); }catch(_e5){}
    try{ sh.getRange(r,25,len,3).setNumberFormat('$#,##0.00'); }catch(_e6){}
    try{ sh.getRange(r,40,len,1).setNumberFormat('0.00'); }catch(_eShelf1){}
    try{ sh.getRange(r,41,len,1).setNumberFormat('@').setHorizontalAlignment('left').setVerticalAlignment('middle').setWrapStrategy(clip); }catch(_eShelf2){}
    try{ sh.getRange(r,54,len,2).setNumberFormat('$#,##0.00'); }catch(_e7){}
    try{ sh.getRange(r,57,len,1).setNumberFormat('$#,##0.00'); }catch(_e7b){}
    try{ sh.getRange(r,33,len,7).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrapStrategy(clip); }catch(_e8){}
    try{ sh.getRange(r,33,len,4).setFontSize(10); }catch(_e8b){}
    try{ sh.getRange(r,32,len,1).setWrapStrategy(clip).setHorizontalAlignment('left'); }catch(_e9){}
    try{ sh.getRange(r,29,len,3).setWrapStrategy(clip).setVerticalAlignment('middle'); }catch(_e10){}
  });
}

function m13BuildSupplierOverrideIndex_(shSup, brandMap, supplierMap, activeSuppliers, discountRules, findReplaceRules, prefixMap) {
  var out = {
    bySupplierBarcode: {},
    bySupplierSubId: {},
    listBySupplier: {},
    byBarcodeAnySupplier: {},
    bySubIdAnySupplier: {}
  };
  var lastRow = shSup.getLastRow();
  if (lastRow < M13.DATA_ROW) return out;

  var lastCol = shSup.getLastColumn();
  var headers = m13HeaderMap_(shSup, M13.HEADER_ROW);
  var data = shSup.getRange(M13.DATA_ROW, 1, lastRow - M13.DATA_ROW + 1, lastCol).getDisplayValues();

  function add_(bucket, key, sup) {
    if (!key) return;
    if (!bucket[key]) bucket[key] = [];
    bucket[key].push(sup);
  }

  for (var i = 0; i < data.length; i++) {
    var sup = m13MakeSupplierObj_(data[i], headers, brandMap, supplierMap, activeSuppliers, discountRules, findReplaceRules, prefixMap, M13.DATA_ROW + i);
    if (!sup || m13BlankSupplier_(sup)) continue;
    var sn = m13NormId_(sup.supplierNum);
    if (!sn) continue;

    add_(out.listBySupplier, sn, sup);

    if (sup.barcode && sup.barcode.valid && sup.barcode.variants) {
      for (var v = 0; v < sup.barcode.variants.length; v++) {
        add_(out.bySupplierBarcode, sn + '|' + sup.barcode.variants[v], sup);
        add_(out.byBarcodeAnySupplier, sup.barcode.variants[v], sup);
      }
    }
    if (sup.subId) {
      var subKey = m13NormId_(sup.subId);
      add_(out.bySupplierSubId, sn + '|' + subKey, sup);
      add_(out.bySubIdAnySupplier, subKey, sup);
    }
  }
  return out;
}

function m13GetAdaptiveThreshold_(brand, category) {
  var key = m13Upper_(brand || category || '');
  var lenientBrands = {
    'BIOGLAN': 0.65,
    'NATURES WAY': 0.65,
    'NATURE\'S WAY': 0.65,
    'BLACKMORES': 0.68,
    'SWISSE': 0.68
  };
  var lower = 0.72;
  Object.keys(lenientBrands).forEach(function(name) {
    var normName = m13Upper_(name).replace(/[^A-Z0-9]/g, '');
    var normKey = key.replace(/[^A-Z0-9]/g, '');
    if (normName && normKey.indexOf(normName) >= 0) lower = Math.min(lower, lenientBrands[name]);
  });
  return {
    fallbackStrong: lower,
    fallbackVeryStrong: Math.min(0.92, lower + 0.14)
  };
}

function m13FindSupplierOverrideCandidate_(index, selectedSupplierNum, outRow) {
  var sn = m13NormId_(selectedSupplierNum);
  if (!sn) return { ok: false, reason: 'No supplier number could be read from column G.' };

  var allSupplierRows = index.listBySupplier[sn] || [];
  if (!allSupplierRows.length) return { ok: false, reason: 'Selected supplier was not found in IN_SUPPLIER_/_PRODUCT_UPDATES.' };

  var candidates = [];
  var seenRows = {};
  function addCandidates_(list, source) {
    for (var i = 0; list && i < list.length; i++) {
      var sup = list[i];
      var key = String(sup.sheetRow || '');
      if (seenRows[key]) continue;
      seenRows[key] = true;
      candidates.push({ sup: sup, source: source });
    }
  }

  // 1) Primary path: same barcode under the selected supplier.
  //    Sub-ID is deliberately NOT required here. Sub-IDs are distributor-local,
  //    just like our POS PLU is local to us.
  var barcodeKeys = m13OutRowBarcodeKeys_(outRow);
  for (var b = 0; b < barcodeKeys.length; b++) {
    addCandidates_(index.bySupplierBarcode[sn + '|' + barcodeKeys[b]], 'BARCODE');
  }

  // Keep a diagnostic list of exact barcode hits that exist, but under a different
  // supplier. This is important for the BioCeuticals/CH2 use case: it tells the
  // user the product exists, but not with the distributor selected in G.
  var exactBarcodeOtherSupplier = [];
  if (!candidates.length) {
    for (var ob = 0; ob < barcodeKeys.length; ob++) {
      var anyBarcodeRows = index.byBarcodeAnySupplier[barcodeKeys[ob]] || [];
      for (var abr = 0; abr < anyBarcodeRows.length; abr++) {
        if (m13NormId_(anyBarcodeRows[abr].supplierNum) !== sn) exactBarcodeOtherSupplier.push(anyBarcodeRows[abr]);
      }
    }
  }

  // 2) Secondary path: same sub-id. This remains useful where a distributor keeps
  //    a stable sub-id, but it is never treated as mandatory for another supplier.
  var subKeys = [];
  if (!candidates.length) {
    subKeys = [m13NormId_(outRow[13]), m13NormId_(outRow[43])].filter(function(x, idx, arr) { return x && arr.indexOf(x) === idx; });
    for (var s = 0; s < subKeys.length; s++) {
      addCandidates_(index.bySupplierSubId[sn + '|' + subKeys[s]], 'SUB ID');
    }
  }

  var exactSubIdOtherSupplier = [];
  if (!candidates.length && subKeys.length) {
    for (var os = 0; os < subKeys.length; os++) {
      var anySubRows = index.bySubIdAnySupplier[subKeys[os]] || [];
      for (var asr = 0; asr < anySubRows.length; asr++) {
        if (m13NormId_(anySubRows[asr].supplierNum) !== sn) exactSubIdOtherSupplier.push(anySubRows[asr]);
      }
    }
  }

  // 3) Fallback path: selected supplier has the product but the barcode/sub-id is
  //    not enough to identify it. This allows controlled supplier swapping for
  //    existing OUT_MERGED_DATA rows using brand + fuzzy product + pack + WSP.
  if (!candidates.length) addCandidates_(allSupplierRows, 'BRAND/PRODUCT/WSP');
  if (!candidates.length) return { ok: false, reason: 'Selected supplier has no candidate rows to compare.' };

  var best = null;
  for (var i = 0; i < candidates.length; i++) {
    var scored = m13ScoreSupplierOverrideCandidate_(candidates[i].sup, outRow, candidates[i].source);
    var wrapped = {
      sup: candidates[i].sup,
      source: candidates[i].source,
      score: scored.score,
      brandOk: scored.brandOk,
      productScore: scored.productScore,
      packOk: scored.packOk,
      wspClose: scored.wspClose,
      wspDiffPct: scored.wspDiffPct,
      checks: scored.checks
    };
    if (!best || wrapped.score > best.score) best = wrapped;
  }

  if (!best) return { ok: false, reason: 'No supplier candidate could be scored.' };

  // Exact barcode is the safest and should win even when sub-id differs.
  // We still require brand/product/price sanity to avoid accepting a bad barcode row.
  if (best.source === 'BARCODE') {
    if (best.brandOk || best.productScore >= 0.62 || best.wspClose) {
      best.ok = true;
      best.reason = 'Accepted by matching barcode. Sub-ID difference is allowed because sub-id is distributor-specific.';
      return best;
    }
    return { ok: false, reason: 'Barcode matched selected supplier, but brand/product/WSP sanity checks failed.' };
  }

  // Sub-ID match can accept, but is weaker than barcode because it is distributor-local.
  if (best.source === 'SUB ID') {
    if (best.brandOk && (best.productScore >= 0.62 || best.wspClose || best.packOk)) {
      best.ok = true;
      best.reason = 'Accepted by sub-id plus brand/product/WSP checks.';
      return best;
    }
    return { ok: false, reason: 'Sub-ID matched selected supplier, but brand/product/WSP validation failed.' };
  }

  // Controlled fallback for existing matched rows: allow a supplier swap if the
  // selected supplier has a strong same-product candidate even without barcode/sub-id.
  // This is intentionally conservative: brand must match, and product similarity
  // must be supported by pack/size or wholesale proximity.
  var thresholds = m13GetAdaptiveThreshold_(best.sup && (best.sup.translatedBrand || best.sup.rawBrand || ''));
  var fallbackStrong = best.brandOk && best.productScore >= thresholds.fallbackStrong && (best.packOk || best.wspClose);
  var fallbackVeryStrong = best.brandOk && best.productScore >= thresholds.fallbackVeryStrong;
  if (fallbackStrong || fallbackVeryStrong) {
    best.ok = true;
    best.source = 'BRAND/PRODUCT/WSP';
    best.reason = 'Accepted by brand + fuzzy product + ' + (best.packOk ? 'pack/size' : 'wholesale') + ' checks. Barcode/sub-id was not required.';
    return best;
  }

  if (exactBarcodeOtherSupplier.length) {
    return {
      ok: false,
      reason: 'Barcode exists in the supplier upload, but not under selected supplier ' + selectedSupplierNum + '. Found under: ' + m13SupplierRowsSummary_(exactBarcodeOtherSupplier) + '. Sub-ID differences are allowed, but the selected supplier still needs a matching barcode or strong brand/product/WSP match.'
    };
  }
  if (exactSubIdOtherSupplier.length) {
    return {
      ok: false,
      reason: 'Sub-ID exists in supplier upload, but not under selected supplier ' + selectedSupplierNum + '. Found under: ' + m13SupplierRowsSummary_(exactSubIdOtherSupplier) + '. Sub-ID is supplier-specific, so this alone is not enough to reject/accept; selected supplier still needs barcode or strong brand/product/WSP match.'
    };
  }

  return {
    ok: false,
    reason: 'Selected supplier does not have a matching barcode/sub-id, and the best brand/product/WSP fallback was not strong enough. Best product score was ' +
      Math.round((best.productScore || 0) * 100) + '%, pack/size=' + (best.packOk ? 'YES' : 'NO') + ', WSP close=' + (best.wspClose ? 'YES' : 'NO') + '.'
  };
}

function m13SupplierRowsSummary_(rows) {
  var seen = {}, parts = [];
  for (var i = 0; rows && i < rows.length; i++) {
    var r = rows[i] || {};
    var sn = m13NormId_(r.supplierNum || '');
    var label = (r.supplierName || 'SUPPLIER') + (sn ? ' (' + sn + ')' : '');
    var key = sn + '|' + label;
    if (seen[key]) continue;
    seen[key] = true;
    parts.push(label + (r.sheetRow ? ' row ' + r.sheetRow : ''));
    if (parts.length >= 5) break;
  }
  return parts.length ? parts.join('; ') : 'other supplier row(s)';
}

function m13ScoreSupplierOverrideCandidate_(sup, outRow, source) {
  var outBrand = m13NormBrand_(outRow[7] || outRow[8] || outRow[44]);
  var supBrand = m13NormBrand_(sup.translatedBrand || sup.rawBrand || '');
  var brandOk = !!(outBrand && supBrand && outBrand === supBrand);

  var outText = m13NormText_([
    outRow[15], // POS DESCR
    outRow[16], // SUP PRODUCT currently shown in OUT
    outRow[14], // ORIGINAL POS DESCR
    outRow[45]  // final POS descr
  ].join(' '));
  var supText = m13NormText_(sup.cleanProduct || sup.product || '');
  var productScore = m13Dice_(outText, supText);

  var outPack = m13SupplierOverridePackSignature_(outText);
  var supPack = m13SupplierOverridePackSignature_(supText);
  var packOk = !!(outPack && supPack && outPack === supPack);

  var oldWsp = m13Num_(outRow[18] || outRow[17]); // current NEW WSP first, then CURRENT WSP
  var wspClose = false;
  var wspDiffPct = '';
  if (sup.wsp > 0 && oldWsp > 0) {
    var diff = Math.abs(sup.wsp - oldWsp);
    wspDiffPct = diff / Math.max(sup.wsp, oldWsp);
    // Supplier swap often preserves wholesale exactly; allow a small buffer for
    // rounding or distributor import differences.
    wspClose = (diff <= 0.25 || wspDiffPct <= 0.08);
  }

  var score = 0;
  if (source === 'BARCODE') score += 120;
  else if (source === 'SUB ID') score += 65;
  else score += 0;

  if (brandOk) score += 35;
  if (packOk) score += 15;
  if (wspClose) score += 15;
  score += Math.round(productScore * 55);

  return {
    score: score,
    brandOk: brandOk,
    productScore: productScore,
    packOk: packOk,
    wspClose: wspClose,
    wspDiffPct: wspDiffPct,
    checks: {
      bc: source === 'BARCODE',
      subId: !!(sup.subId && (m13NormId_(sup.subId) === m13NormId_(outRow[13]) || m13NormId_(sup.subId) === m13NormId_(outRow[43]))),
      brand: brandOk,
      productPct: Math.round(productScore * 100),
      pack: packOk,
      size: supPack || outPack || '',
      type: m13SupplierOverrideTypeForm_(supText),
      wspClose: wspClose
    }
  };
}

function m13SupplierOverrideTypeForm_(s) {
  // Keep supplier-override audit TYPE consistent with the strict AL/AM parser.
  // This avoids old behaviour where TABLETS were grouped as CAPSULES or where
  // weak clues could create a type guess.
  var text = m13Upper_(s);
  if (!text) return '';
  return m13StrictTypeFromText_(text) || m13StrictTypeFromSizeSuffix_(m13BestSizeFromText_(text)) || '';
}

function m13SupplierOverridePackSignature_(s) {
  s = m13Upper_(s);
  var out = [];
  var rx = /\b(\d+(?:\.\d+)?)\s*(MCG|MG|GM|G|KG|ML|LT|LTR|LTRS|LITRE|LITRES|L|T|TAB|TABS|C|CAP|CAPS|VC|VCAP|VCAPS|SACHET|SACHETS|SOFTGEL|SOFTGELS)\b/g;
  var m;
  while ((m = rx.exec(s)) !== null) {
    var unit = m[2];
    if (unit === 'TAB' || unit === 'TABS') unit = 'T';
    if (unit === 'GM') unit = 'G';
    if (unit === 'L' || unit === 'LTR' || unit === 'LTRS' || unit === 'LITRE' || unit === 'LITRES') unit = 'LT';
    if (unit === 'CAP' || unit === 'CAPS' || unit === 'VCAP' || unit === 'VCAPS') unit = 'C';
    if (unit === 'SACHET' || unit === 'SACHETS') unit = 'SACHET';
    if (unit === 'SOFTGEL' || unit === 'SOFTGELS') unit = 'C';
    out.push(String(m[1]).replace(/\.0$/, '') + unit);
  }
  // Prefer the last size/qty token because product text often starts with
  // strengths such as 500MG but ends with pack size like 60C.
  return out.length ? out[out.length - 1] : '';
}

function m13ApplySupplierOverrideToOutRow_(row, sup, supplierMap, discountRules, prefixMap, match) {
  var kind = m13Upper_(row[1]).indexOf('NEW') >= 0 ? 'NEW' : 'MATCHED';
  var currentWsp = m13Num_(row[17]);
  var currentLast = m13Num_(row[21]);
  var currentRrp = m13Num_(row[25]);
  var newWsp = sup.wsp || 0;
  var newLast = sup.effectivePrice || sup.discountPrice || sup.wsp || 0;
  var newRrp = m13FriendlyRrp_(sup.rrp || m13Num_(row[26]));
  var gstPct = sup.gstPct != null ? sup.gstPct : (m13Upper_(row[27]) === 'YES' ? 10 : m13GstPct_(row[55]));
  var wspDelta = m13PriceDelta_(currentWsp, newWsp);
  var lastDelta = m13PriceDelta_(currentLast, newLast);
  var wspDiff = wspDelta.diff;
  var lastDiff = lastDelta.diff;
  var priceStatus = 'SUP OVERRIDE ACCEPTED';
  var supplierLabel = m13SupplierLabel_(sup.supplierNum, supplierMap, sup.supplierName);
  var brandNorm = m13NormBrand_(sup.translatedBrand || sup.rawBrand || row[7] || row[44]);
  var isMember = m13IsMemberBrand_(brandNorm, sup.supplierNum, sup.member, prefixMap, discountRules);
  var finalShelfRrp = m13DefaultShelfRrp_(currentRrp, newRrp);
  var tiers = kind === 'NEW'
    ? m13PL2CalcNewProductPriceTiers_(finalShelfRrp || newRrp, newLast, gstPct, row[47], isMember)
    : m13CalcPriceTiers_(finalShelfRrp || newRrp, newLast, gstPct, row[47], isMember);

  row[2]  = priceStatus;
  row[6]  = supplierLabel;
  row[13] = m13SubIdWithPlu_(sup.subId || (m13IsDiscontinuedSubId_(row[13]) ? '' : row[13]), row[12]);
  row[16] = sup.product || row[16];
  row[18] = newWsp || '';
  row[19] = currentWsp > 0 ? wspDelta.pct : '';
  row[20] = (currentWsp || newWsp) ? wspDiff : '';
  row[22] = newLast || '';
  row[23] = currentLast > 0 ? lastDelta.pct : '';
  row[24] = (currentLast || newLast) ? lastDiff : '';
  row[26] = newRrp || '';
  row[27] = gstPct ? 'YES' : 'NO';
  row[29] = m13MarkupPctDisplay_(newWsp, newLast, newRrp, gstPct);
  row[30] = m13MaintainingMarkupDisplay_(newWsp, newLast, newRrp, gstPct);
  row[31] = m13BuildSupplierOverrideAcceptedNote_(sup, match);
  m13ApplyAuditCellsToRow_(row, m13BuildAuditCellsFromSupplierOverride_(sup, match));

  // Final POS-output section. Preserve POS-is-king AP/AQ and existing brand/description fields.
  row[43] = m13SubIdWithPlu_(sup.subId || (m13IsDiscontinuedSubId_(row[43]) ? '' : row[43]), row[42] || row[12]);       // AR / sub id
  row[49] = sup.supplierNum || row[49]; // AX / supplier
  row[51] = m13DefaultIfBlank_(sup.units, '1');    // AZ / units ← IN_SUP H / SUP UNITS IN PACK
  row[52] = m13DefaultIfBlank_(sup.minOrder, '1'); // BA / min order qty ← IN_SUP I / SUP MIN ORDER WS
  row[53] = newWsp || '';               // BB / wsp excgst
  row[54] = newLast || '';              // BC / last price
  row[55] = gstPct || 0;                // BD / gst tax pc
  row[56] = finalShelfRrp || newRrp || ''; // BE / rrp incgst, final shelf price
  row[57] = tiers.pr1; row[58] = tiers.pr2; row[59] = tiers.pr3; row[60] = tiers.pr4; row[61] = tiers.pr5;
  row[62] = tiers.pr6; row[63] = tiers.pr7; row[64] = tiers.pr8; row[65] = tiers.pr9; row[66] = tiers.ret;
}

function m13OutRowBarcodeKeys_(row) {
  var keys = [];
  var seen = {};
  [row[10], row[11], row[41]].forEach(function(v) {
    var set = posKingBarcodeKeySet_(v);
    Object.keys(set || {}).forEach(function(k) { if (k && !seen[k]) { seen[k] = true; keys.push(k); } });
  });
  return keys;
}

function m13SupplierNumberFromCell_(value, supplierMap) {
  var s = m13Str_(value);
  if (!s) return '';
  var m = s.match(/\(([^)]+)\)\s*$/);
  if (m && m[1]) return m13NormId_(m[1]);
  if (/^\d+(?:\.0+)?$/.test(s)) return m13NormId_(s);
  var nums = s.match(/\b\d+\b/g);
  if (nums && nums.length === 1) return m13NormId_(nums[0]);
  var wanted = m13NormText_(s);
  for (var num in supplierMap) if (supplierMap.hasOwnProperty(num) && m13NormText_(supplierMap[num]) === wanted) return m13NormId_(num);
  return '';
}

function m13OriginalSupplierLabelForRejectedOverride_(row, supplierMap, acceptedSupplierNum) {
  // Rejected G edits should not leave the attempted supplier in the table.
  // Restore G to the currently accepted final supplier (AV) when available,
  // falling back to the original POS supplier label in F if AV is missing.
  var sn = m13NormId_(acceptedSupplierNum || row[49]);
  if (sn) return m13SupplierLabel_(sn, supplierMap, supplierMap[sn] || '');

  var posRaw = row[5]; // F / POS SUPPLIER
  var posNum = m13SupplierNumberFromCell_(posRaw, supplierMap);
  if (posNum) return m13SupplierLabel_(posNum, supplierMap, supplierMap[posNum] || '');
  return posRaw || '';
}

function m13BuildSupplierOverrideAcceptedNote_(sup, match) {
  // Short marker used by conditional formatting to keep G/N amber after a valid
  // supplier change. Full audit details are stored in AG:AM.
  var source = match && match.source ? String(match.source).toUpperCase() : '';
  return 'SUPPLIER OVERRIDE ACCEPTED' + (source ? ' | MATCH ' + source : '');
}

function m13BuildSupplierOverrideRejectedNote_(selectedSupplier, reason, oldNote) {
  var prev = m13Str_(oldNote);
  if (prev.indexOf('SUPPLIER OVERRIDE REJECTED') === 0) prev = '';
  var note = 'SUPPLIER OVERRIDE REJECTED: ' + m13Str_(reason || 'No matching supplier product found') + ' | SELECTED: ' + m13Str_(selectedSupplier || '—');
  return prev ? note + ' | PREVIOUS: ' + prev : note;
}

function m13WriteChangedOutRows_(sh, values, changedIdxs, lastCol) {
  changedIdxs = m13UniqueSortedRows_(changedIdxs || []);
  if (!changedIdxs.length) return;
  var bySheetRow = {};
  changedIdxs.forEach(function (idx) { bySheetRow[M13.DATA_ROW + idx] = values[idx]; });
  m13WriteChangedOutRowsBySheetRow_(sh, changedIdxs.map(function (idx) { return M13.DATA_ROW + idx; }), bySheetRow, lastCol);
}

function m13ApplySupplierChangeNotes_(sh, notes) {
  return m13ApplySupplierChangeNotesFast_(sh, notes || []);
}

function m13FormatChangedOutRows_(sh, changedIdxs) {
  changedIdxs = m13UniqueSortedRows_(changedIdxs || []);
  return m13FormatChangedOutRowsFast_(sh, changedIdxs.map(function (idx) { return M13.DATA_ROW + idx; }));
}

//  POS OUTPUT SHEET GENERATOR — v6.3.22
//  Builds OUT_POS_INSERT and OUT_POS_UPDATE strictly from the final POS-output
//  columns inside OUT_MERGED_DATA, never from audit columns or supplier raw data.
//  Menu functions only; merge/build logic is unchanged.
// =============================================================================

function generateInsertUpdateSheets() {
  return m13GenerateInsertUpdateSheetsFromOut_(false);
}

function generateInsertUpdateSheetsFromFilteredData() {
  return m13GenerateInsertUpdateSheetsFromOut_(true);
}

function m13GenerateInsertUpdateSheetsFromOut_(visibleOnly) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var t0 = Date.now();

  try {
    SpreadsheetApp.flush();

    var shOut = m13Sheet_(ss, CFG.SH.OUT_MERGED || 'OUT_MERGED_DATA', true);
    if (shOut.getLastRow() < M13.DATA_ROW) {
      ui.alert('OUT_MERGED_DATA is empty', 'Run BUILD OUT_MERGED_DATA first.', ui.ButtonSet.OK);
      return;
    }

    var built = m13BuildPosOutputRowsFromOut_(shOut, !!visibleOnly);

    ss.toast('Writing OUT_POS_INSERT and OUT_POS_UPDATE…', '📤 POS Sheets', 30);
    m13WritePosOutputSheet_(ss, CFG.SH.OUT_INSERT || 'OUT_POS_INSERT', built.insertRows);
    m13WritePosOutputSheet_(ss, CFG.SH.OUT_UPDATE || 'OUT_POS_UPDATE', built.updateRows);

    var elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    var scope = visibleOnly ? 'filtered/visible OUT_MERGED_DATA rows' : 'all OUT_MERGED_DATA rows';
    var msg = 'Generated from ' + scope + ': ' +
      m13Fmt_(built.insertRows.length) + ' insert row(s), ' +
      m13Fmt_(built.updateRows.length) + ' update row(s)' +
      (built.skipped ? ', skipped review rows: ' + m13Fmt_(built.skipped) : '') +
      (built.skippedNoRrp ? ', skipped no-RRP rows: ' + m13Fmt_(built.skippedNoRrp) : '') +
      ' | ' + elapsed + 's';

    ss.toast(msg, '✅ POS sheets generated', 12);
    ui.alert('✅ POS sheets generated', msg, ui.ButtonSet.OK);
    return built;
  } catch (err) {
    var details = String(err && err.stack ? err.stack : (err && err.message ? err.message : err));
    ss.toast('Generate POS sheets failed: ' + (err && err.message ? err.message : err), '❌ Error', 10);
    try { ui.alert('Generate POS sheets failed', details, ui.ButtonSet.OK); } catch(eAlert) {}
    throw err;
  }
}

function m13BuildPosOutputRowsFromOut_(shOut, visibleOnly) {
  var lastRow = shOut.getLastRow();
  var lastCol = shOut.getLastColumn();
  var headers = m13HeaderMap_(shOut, M13.HEADER_ROW);
  var nRows = Math.max(0, lastRow - M13.DATA_ROW + 1);
  var values = nRows ? shOut.getRange(M13.DATA_ROW, 1, nRows, lastCol).getDisplayValues() : [];
  var visibleSet = visibleOnly ? m13BuildVisibleRowSetFromHelper_(shOut) : null;
  var ss = shOut.getParent ? shOut.getParent() : SpreadsheetApp.getActiveSpreadsheet();
  var shelfCtx = m13BuildShelfExportContext_(ss);
  var insertRows = [], updateRows = [], skipped = 0, skippedNoRrp = 0;
  for (var i = 0; i < values.length; i++) {
    var sheetRow = M13.DATA_ROW + i;
    if (visibleSet && !visibleSet[sheetRow]) continue;
    var row = values[i];
    var status = m13OutStatusKey_(m13OutVal_(row, headers, ['ROW STATUS', 'STATUS']));

    if (status === 'NEW') {
      var insertRow = m13BuildInsertOutputRow_(row, headers, insertRows.length + 1, shelfCtx);
      // POS cannot safely import an INSERT without an RRP. Skip it rather than
      // writing a structurally valid row that the POS will later reject.
      if (m13Num_(insertRow[15]) > 0) insertRows.push(insertRow);
      else skippedNoRrp++;
    } else if (status === 'MATCHED' || status === 'DISCONTINUED') {
      var updateRow = m13BuildUpdateOutputRow_(row, headers, updateRows.length + 1, shelfCtx);
      // Same safeguard for UPDATE: no usable resolved RRP means no export row.
      if (m13Num_(updateRow[15]) > 0) updateRows.push(updateRow);
      else skippedNoRrp++;
    } else {
      skipped++;
    }
  }
  return {
    insertRows: insertRows,
    updateRows: updateRows,
    skipped: skipped,
    skippedNoRrp: skippedNoRrp
  };
}
function m13BuildVisibleRowSetFromHelper_(shOut) {
  var lastRow = shOut.getLastRow();
  var nRows = Math.max(0, lastRow - M13.DATA_ROW + 1);
  var visible = {};
  if (!nRows) return visible;

  var helperCol = m13EnsureOutVisibleHelperCol_(shOut, nRows);
  var formulas = new Array(nRows);
  for (var i = 0; i < nRows; i++) {
    formulas[i] = ['=SUBTOTAL(103,B' + (M13.DATA_ROW + i) + ')'];
  }
  shOut.getRange(M13.DATA_ROW, helperCol, nRows, 1).setFormulas(formulas);
  SpreadsheetApp.flush();

  var vals = shOut.getRange(M13.DATA_ROW, helperCol, nRows, 1).getDisplayValues();
  for (var r = 0; r < vals.length; r++) {
    if (Number(vals[r][0]) > 0) visible[M13.DATA_ROW + r] = true;
  }
  return visible;
}
function m13EnsureOutVisibleHelperCol_(shOut, nRows) {
  var helperHeader = '__EXPORT_VISIBLE__';
  var lastCol = shOut.getLastColumn();
  var row2 = shOut.getRange(2, 1, 1, lastCol).getDisplayValues()[0];
  var helperCol = 0;
  for (var i = 0; i < row2.length; i++) {
    if (String(row2[i] || '').trim() === helperHeader) { helperCol = i + 1; break; }
  }
  if (!helperCol) {
    helperCol = lastCol + 1;
    if (shOut.getMaxColumns() < helperCol) shOut.insertColumnAfter(shOut.getMaxColumns());
    shOut.getRange(2, helperCol).setValue(helperHeader).setNumberFormat('@');
    try { shOut.hideColumns(helperCol); } catch (_hide) {}
  }
  return helperCol;
}
function m13IsOutRowHidden_(sh, rowNum) {
  throw new Error('m13IsOutRowHidden_ is deprecated. Use m13BuildVisibleRowSetFromHelper_().');
}

function m13OutStatusKey_(value) {
  var s = m13Upper_(value).replace(/[✅🟢⛔⚠️➕🔴🟠🔵⭐•]/g, '').replace(/\s+/g, ' ').trim();
  if (s.indexOf('NEW') >= 0) return 'NEW';
  if (s.indexOf('MATCHED') >= 0) return 'MATCHED';
  if (s.indexOf('DISCONTINUED') >= 0) return 'DISCONTINUED';
  if (s.indexOf('IDENTITY REVIEW') >= 0) return 'IDENTITY REVIEW';
  if (s.indexOf('DISC SUSPECT') >= 0) return 'DISC SUSPECT';
  return s;
}

function m13OutVal_(row, headers, candidates) {
  return m13ColVal_(row, headers, candidates);
}

function m13OutFirst_(row, headers, candidates) {
  for (var i = 0; i < candidates.length; i++) {
    var v = m13Str_(m13OutVal_(row, headers, [candidates[i]]));
    if (v) return v;
  }
  return '';
}

function m13BuildInsertOutputRow_(row, headers, idx, shelfCtx) {
  // OUT_POS_INSERT is built from AP:BU final POS-output section.
  // RRP and price tiers are recalculated from FINAL SHELF RRP (AO) at generation time.
  function f_(offset) { return m13OutFinalPosField_(row, offset); }
  var pricing = m13ResolvedShelfPricingForOutput_(row, headers, f_, shelfCtx);
  return [
    idx,
    posKingOutputBarcode_(f_(0), f_(0)), // AP main id, clean EAN-13 for inserts/new products
    f_(2),  // AR sub id
    f_(3),  // AS brand
    f_(4),  // AT descr
    f_(5),  // AU pos desc
    f_(6),  // AV dissno
    f_(7),  // AW prod grp
    f_(8),  // AX supplier
    f_(9),  // AY loyalty scheme
    m13DefaultIfBlank_(f_(10), '1'), // AZ units -> OUT column K must never be blank
    m13DefaultIfBlank_(f_(11), '1'), // BA min order qty -> OUT column L must never be blank
    f_(12), // BB wsp excgst
    f_(13), // BC last price
    f_(14), // BD gst tax pc
    pricing.rrp,
    pricing.tiers.pr1,
    pricing.tiers.pr2,
    pricing.tiers.pr3,
    pricing.tiers.pr4,
    pricing.tiers.pr5,
    pricing.tiers.pr6,
    pricing.tiers.pr7,
    pricing.tiers.pr8,
    pricing.tiers.pr9,
    pricing.tiers.ret,
    f_(26), // BQ pharm prod
    f_(27), // BR scales
    f_(28), // BS itemsize
    f_(29), // BT packaging
    f_(30)  // BU pos soh
  ];
}

function m13BuildUpdateOutputRow_(row, headers, idx, shelfCtx) {
  // OUT_POS_UPDATE is PLU-driven and built from AP:BU final POS-output section.
  // RRP and price tiers are recalculated from FINAL SHELF RRP (AO) at generation time.
  function f_(offset) { return m13OutFinalPosField_(row, offset); }
  var pricing = m13ResolvedShelfPricingForOutput_(row, headers, f_, shelfCtx);
  var updateStatus = m13OutStatusKey_(m13OutVal_(row, headers, ['ROW STATUS', 'STATUS']));
  var updateSubId = f_(2);
  var updateBrand = f_(3);
  if (updateStatus === 'DISCONTINUED') {
    updateBrand = m13ZzzzBrand_(updateBrand);
  } else if (m13Upper_(updateSubId).indexOf('DISCONTINUED') >= 0) {
    updateBrand = m13CleanDiscontinuedBrand_(updateBrand);
  }
  return [
    idx,
    f_(1),  // AQ plu
    updateSubId,  // AR sub id
    updateBrand,  // AS brand
    f_(4),  // AT descr
    f_(5),  // AU pos desc
    f_(6),  // AV dissno
    f_(7),  // AW prod grp
    f_(8),  // AX supplier
    f_(9),  // AY loyalty scheme
    m13DefaultIfBlank_(f_(10), '1'), // AZ units -> OUT column K must never be blank
    m13DefaultIfBlank_(f_(11), '1'), // BA min order qty -> OUT column L must never be blank
    f_(12), // BB wsp excgst
    f_(13), // BC last price
    f_(14), // BD gst tax pc
    pricing.rrp,
    pricing.tiers.pr1,
    pricing.tiers.pr2,
    pricing.tiers.pr3,
    pricing.tiers.pr4,
    pricing.tiers.pr5,
    pricing.tiers.pr6,
    pricing.tiers.pr7,
    pricing.tiers.pr8,
    pricing.tiers.pr9,
    pricing.tiers.ret,
    f_(26), // BQ pharm prod
    f_(27), // BR scales
    f_(28), // BS itemsize
    f_(29), // BT packaging
    f_(30)  // BU pos soh
  ];
}

function m13BuildShelfExportContext_(ss) {
  try {
    var brandMap = m13LoadBrandMap_(ss);
    return {
      prefixMap: m13LoadPrefixMap_(ss),
      discountRules: m13LoadDiscountRules_(ss, brandMap)
    };
  } catch(e) {
    try { log_('[SHELF RRP] export context fallback: ' + e.message); } catch(_eLog) {}
    return { prefixMap: null, discountRules: null };
  }
}


function m13ShelfRrpValueFromDisplay_(value) {
  var s = m13Str_(value);
  if (!s) return 0;
  // Preferred display: "159.85% | $39.35\nGP NGST ...". Extract the RRP after the first pipe.
  var m = s.match(/\|\s*\$?([0-9,]+(?:\.[0-9]+)?)/);
  if (m && m[1]) return m13Num_(m[1]);
  // Fallback for older numeric AO values.
  if (s.indexOf('%') < 0) return m13Num_(s);
  return 0;
}

/**
 * Price Level 5 correction used ONLY by OUT_POS_INSERT / OUT_POS_UPDATE.
 *
 * Supplier files sometimes carry a carton/pack last price while POS RRP is the
 * single-unit shelf RRP. In that narrow case the normal PR5 calculation exceeds
 * 100% and is safely clamped to 100, even though the intended staff price should
 * be based on the per-unit last price.
 *
 * To avoid changing established pricing elsewhere, only normalise by POS `units`
 * when ALL of the following are true:
 *   - normal PR5 has reached 100%;
 *   - units > 1;
 *   - last price itself is greater than the unit RRP; and
 *   - dividing last price by units produces a valid 20–<100% PR5.
 *
 * Normal unit-priced rows, legitimate 100% rows, OUT_MERGED_DATA pricing and all
 * other price levels remain untouched.
 */
function m13Pr5PctForPosOutput_(rrp, lastPrice, gstPct, units) {
  var normal = m13Pr5Pct_(rrp, lastPrice, gstPct);
  var rrpNum = Number(rrp || 0);
  var lastNum = Number(lastPrice || 0);
  var unitCount = Math.floor(Number(units || 0));

  if (!(rrpNum > 0) || !(lastNum > 0) || !(unitCount > 1)) return normal;
  if (normal < 99.995) return normal;
  if (!(lastNum > rrpNum)) return normal;

  var perUnitLast = lastNum / unitCount;
  if (!(perUnitLast > 0) || !(perUnitLast < lastNum)) return normal;

  var corrected = m13Pr5Pct_(rrpNum, perUnitLast, gstPct);
  if (corrected >= 20 && corrected < 100) return corrected;
  return normal;
}

function m13ResolvedShelfPricingForOutput_(row, headers, f_, ctx) {
  ctx = ctx || {};
  // Prefer the numeric POS RRP field (BE / rrp incgst). AO is display text only.
  var finalRrp = m13Num_(f_(15));
  if (!finalRrp) finalRrp = m13ShelfRrpValueFromDisplay_(m13OutValStrict_(row, headers, 'FINAL SHELF RRP'));
  if (!finalRrp) finalRrp = m13Num_(m13OutValStrict_(row, headers, 'NEW RRP'));
  if (!finalRrp) finalRrp = m13Num_(m13OutValStrict_(row, headers, 'CURRENT RRP'));
  finalRrp = finalRrp ? m13FriendlyRrp_(finalRrp) : 0;

  var lastPrice = m13Num_(f_(13));
  var gstPct = m13GstPct_(f_(14));
  var dissno = f_(6);
  var brandNorm = m13NormBrand_(f_(3));
  var supplierNum = f_(8);
  var isMember = m13IsMemberBrand_(brandNorm, supplierNum, '', ctx.prefixMap, ctx.discountRules);
  var outStatus = m13OutStatusKey_(m13OutVal_(row, headers, ['ROW STATUS', 'STATUS']));
  var tiers = outStatus === 'NEW'
    ? m13PL2CalcNewProductPriceTiers_(finalRrp, lastPrice, gstPct, dissno, isMember)
    : m13CalcPriceTiers_(finalRrp, lastPrice, gstPct, dissno, isMember);

  // v6.3.83 PL2: only NEW PRODUCT PR1-4 / PR6-9 values are preserved from
  // OUT_MERGED_DATA. Those values were resolved after relink, duplicate and
  // description-review safety gates and may carry a same-brand profile. Do not
  // erase them by recalculating generic defaults during INSERT generation.
  // PR5 deliberately stays the existing staff-price calculation.
  if (outStatus === 'NEW' && !m13PL1IsProtectedDissno_(dissno)) {
    var stored = {
      pr1: m13PL2DirectPct_(f_(16)), pr2: m13PL2DirectPct_(f_(17)),
      pr3: m13PL2DirectPct_(f_(18)), pr4: m13PL2DirectPct_(f_(19)),
      pr6: m13PL2DirectPct_(f_(21)), pr7: m13PL2DirectPct_(f_(22)),
      pr8: m13PL2DirectPct_(f_(23)), pr9: m13PL2DirectPct_(f_(24))
    };
    var keys = m13PL1TierKeys_();
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (stored[key] != null) tiers[key] = stored[key];
    }
  }

  // Export-only PR5 carton/unit guard. This intentionally runs after the normal
  // tier engine so every other tier keeps its established calculation.
  tiers.pr5 = m13Pr5PctForPosOutput_(finalRrp, lastPrice, gstPct, f_(10));

  return { rrp: finalRrp || '', tiers: tiers };
}

function m13OutFinalPosField_(row, offset) {
  // Final POS output section in OUT_MERGED_DATA is AP:BU because AG:AM are identity checks and AN:AO are shelf-price controls.
  // AP is zero-based index 41; offset 0 = AP, offset 30 = BT/BU final output fields.
  // v6.3.67 surgical correction:
  //   When building OUT_POS_INSERT / OUT_POS_UPDATE, treat OUT_MERGED_DATA
  //   column P / POS DESCR as the live source for the exported POS descr field.
  //   This allows any manual user adjustment made in column P after BUILD
  //   OUT_MERGED_DATA to carry through without requiring the user to also edit
  //   the hidden/final AP:BU POS-output section.
  var outOffset = Number(offset || 0);
  if ((outOffset === 4 || outOffset === 5) && row && row.length > 15) {
    var posDescr = m13FixPosDescrCharacters_(row[15]).trim();
    if (posDescr) {
      if (outOffset === 4) return posDescr;
      return m13PosDesc_(posDescr);
    }
  }
  var idx = 41 + outOffset;
  if (idx < 0 || idx >= row.length) return '';
  var v = row[idx];
  var out = String(v == null ? '' : v).trim();
  if (outOffset === 4 || outOffset === 5) return m13FixPosDescrCharacters_(out);
  return out;
}

function m13OutValStrict_(row, headers, headerName) {
  var idx = headers[m13Upper_(headerName)];
  if (idx == null || idx < 0 || idx >= row.length) return '';
  var v = row[idx];
  return String(v == null ? '' : v).trim();
}

function m13WritePosOutputSheet_(ss, sheetName, rows) {
  var sh = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
  var schema = SCHEMA[sheetName];
  if (!schema || !schema.headers || !schema.headers.length) {
    throw new Error('Missing schema for ' + sheetName);
  }

  var width = schema.headers.length;
  var neededRows = Math.max(3, rows.length + 2);

  if (sh.getMaxColumns() < width) sh.insertColumnsAfter(sh.getMaxColumns(), width - sh.getMaxColumns());
  if (sh.getMaxRows() < neededRows) sh.insertRowsAfter(sh.getMaxRows(), neededRows - sh.getMaxRows());

  clearFilter_(sh);

  var currentLastRow = Math.max(sh.getLastRow(), 3);
  if (currentLastRow >= 3) {
    if (typeof preflightReset_ === 'function') {
      preflightReset_(sh, {
        row: 3,
        col: 1,
        rows: Math.max(currentLastRow - 2, 1),
        cols: width,
        clearContent: true,
        clearNotes: true,
        resetBackground: true,
        resetTextStyle: true
      });
    } else {
      sh.getRange(3, 1, Math.max(currentLastRow - 2, 1), width).clear({ contentsOnly: true, formatOnly: true });
    }
  }

  sh.getRange(2, 1, 1, width).setValues([schema.headers]);
  if (rows.length) {
    var out = m13NormaliseOutputRows_(rows, width, sheetName);
    sh.getRange(3, 1, out.length, width).setNumberFormat('@').setValues(out);
  }

  if (typeof applyFormat_ === 'function') applyFormat_(ss, sh);
  else {
    try { sh.setFrozenRows(2); } catch(eFrozen) {}
    try { sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), width).createFilter(); } catch(eFilter) {}
  }

  try { sh.getRange(3, 1, Math.max(rows.length, 1), width).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP); } catch(eClip) {}
  return sh;
}


// =============================================================================
//  POS TXT EXPORT — v6.3.17
//  Exports the current OUT_POS_INSERT / OUT_POS_UPDATE sheets to TXT files.
//  The TXT files intentionally omit the internal POS INDEX column so their
//  structure matches the POS import samples supplied by the user.
// =============================================================================

function exportPosFiles() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var t0 = Date.now();

  try {
    SpreadsheetApp.flush();

    var insertPayload = m13ReadPosOutputSheetForTxt_(ss, CFG.SH.OUT_INSERT || 'OUT_POS_INSERT');
    var updatePayload = m13ReadPosOutputSheetForTxt_(ss, CFG.SH.OUT_UPDATE || 'OUT_POS_UPDATE');

    if (!insertPayload.rows.length && !updatePayload.rows.length) {
      ui.alert(
        'No POS rows to export',
        'OUT_POS_INSERT and OUT_POS_UPDATE have no data rows. Run Generate Insert + Update Sheets first.',
        ui.ButtonSet.OK
      );
      return;
    }

    var tz = Session.getScriptTimeZone() || 'Australia/Sydney';
    var dateStamp = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
    var files = [];

    if (insertPayload.rows.length) {
      var insertName = m13BuildExportFileName_('POS INSERT', dateStamp, insertPayload.rows);
      files.push(m13BuildDownloadPayload_('POS INSERT', insertName, insertPayload.rows));
    }

    if (updatePayload.rows.length) {
      var updateName = m13BuildExportFileName_('POS UPDATE', dateStamp, updatePayload.rows);
      files.push(m13BuildDownloadPayload_('POS UPDATE', updateName, updatePayload.rows));
    }

    var elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    ss.toast('Prepared ' + files.length + ' POS TXT download(s) in ' + elapsed + 's.', '📄 POS Export', 10);
    m13ShowExportDialog_(files, elapsed);
    return files;
  } catch (err) {
    var details = String(err && err.stack ? err.stack : (err && err.message ? err.message : err));
    ss.toast('Export POS files failed: ' + (err && err.message ? err.message : err), '❌ Error', 10);
    try { ui.alert('Export POS files failed', details, ui.ButtonSet.OK); } catch(eAlert) {}
    throw err;
  }
}

function m13ReadPosOutputSheetForTxt_(ss, sheetName) {
  var sh = ss.getSheetByName(sheetName);
  if (!sh || sh.getLastRow() < 3) return { rows: [] };

  var schema = SCHEMA[sheetName];
  var schemaWidth = schema && schema.headers ? schema.headers.length : sh.getLastColumn();
  var lastRow = sh.getLastRow();
  var lastCol = Math.max(sh.getLastColumn(), schemaWidth || 1);
  var firstHeader = String(sh.getRange(2, 1).getDisplayValue() || '').trim().toUpperCase();
  var omitIndex = firstHeader === 'POS INDEX';
  var startCol = omitIndex ? 2 : 1;
  var exportWidth = Math.max(1, Math.min(lastCol - startCol + 1, omitIndex ? schemaWidth - 1 : schemaWidth));
  var values = sh.getRange(3, startCol, lastRow - 2, exportWidth).getDisplayValues();
  var rows = [];

  var exportHeaders = (schema && schema.headers ? schema.headers.slice(startCol - 1, startCol - 1 + exportWidth) : []);

  for (var r = 0; r < values.length; r++) {
    var row = values[r].slice(0, exportWidth);
    var hasValue = false;
    for (var c = 0; c < row.length; c++) {
      var headerName = exportHeaders[c] || '';
      row[c] = m13SanitisePosExportCell_(row[c], headerName);
      if (row[c]) hasValue = true;
    }
    if (hasValue) rows.push(row);
  }
  return { rows: rows };
}

function m13BuildDownloadPayload_(label, filename, rows) {
  var content = m13RowsToTxt_(rows);
  return {
    label: label,
    filename: filename,
    rowCount: rows.length,
    base64: Utilities.base64Encode(content, Utilities.Charset.UTF_8)
  };
}

function m13RowsToTxt_(rows) {
  return rows.map(function(row) {
    return row.map(function(v) {
      return String(v == null ? '' : v).replace(/\r?\n/g, ' ').trim();
    }).join('\t');
  }).join('\r\n') + (rows.length ? '\r\n' : '');
}

function m13BuildExportFileName_(prefix, dateStamp, rows) {
  var brands = m13BrandSummaryForFileName_(rows);
  var name = prefix + ' ' + dateStamp + (brands ? ' ' + brands : '') + '.txt';
  return m13SanitiseFileName_(name, 180);
}

function m13BrandSummaryForFileName_(rows) {
  var stats = {};
  for (var i = 0; i < rows.length; i++) {
    // After omitting POS INDEX, export col 3 is brand for both INSERT and UPDATE.
    var brand = String(rows[i][2] || '').trim();
    if (!brand) continue;
    var token = m13BrandTokenForFileName_(brand);
    if (!token) continue;
    if (!stats[token]) stats[token] = { token: token, count: 0, first: i };
    stats[token].count++;
  }

  return Object.keys(stats)
    .map(function(k) { return stats[k]; })
    .sort(function(a, b) {
      if (b.count !== a.count) return b.count - a.count;
      return a.first - b.first;
    })
    .slice(0, 3)
    .map(function(x) { return x.token; })
    .join(', ');
}

function m13BrandTokenForFileName_(brand) {
  var b = String(m13CleanDiscontinuedBrand_(brand || '') || '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!b) return '';

  var aliases = {
    'AINSWORTHS BACH': 'BACH FLOWER',
    'AINSWORTHS': 'BACH FLOWER',
    'BACH FLOWER': 'BACH FLOWER',
    'BIOCEUTICALS': 'BIOC',
    'BIOCEUTICALS CLINICAL': 'BIOC CLIN',
    'BIOLOGIKA': 'BIOL',
    'BIOPRACTICA': 'BIOP',
    'CABOT HEALTH': 'CABOT',
    'CLINICIANS': 'CLIN',
    'EAGLE': 'EAGLE',
    'ETHICAL NUTRIENTS': 'ETH NUTS',
    'MELROSE FUTURELAB': 'MEL',
    'MELROSE': 'MEL',
    'NUTRA LIFE': 'NL',
    'ORGANIC FORMULATIONS': 'ORG FORM',
    'POWER SUPER FOODS': 'POWER',
    'PROTEIN SUPPLIES AUSTRALIA': 'PROT SUPP',
    'SWITCH NUTRITION': 'SWITCH',
    'WELEDA': 'WELEDA'
  };
  if (aliases[b]) return aliases[b];

  var words = b.split(' ');
  if (words.length >= 2 && (words[0].length <= 4 || words[1].length <= 5)) {
    return (words[0] + ' ' + words[1]).slice(0, 14).trim();
  }
  return words[0].slice(0, 12);
}

function m13SanitiseFileName_(name, maxLen) {
  name = String(name || 'POS EXPORT.txt').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
  maxLen = maxLen || 180;
  if (name.length <= maxLen) return name;
  var ext = '.txt';
  if (name.slice(-4).toLowerCase() === ext) name = name.slice(0, maxLen - ext.length).trim() + ext;
  else name = name.slice(0, maxLen).trim();
  return name;
}

function m13ShowExportDialog_(files, elapsed) {
  function card_(item, id) {
    return '<div class="card">' +
      '<div class="label">' + m13HtmlEsc_(item.label) + '</div>' +
      '<div class="rows">' + m13HtmlEsc_(item.rowCount) + ' row(s)</div>' +
      '<div class="name">' + m13HtmlEsc_(item.filename) + '</div>' +
      '<button id="' + id + '" onclick="downloadOne(' + id.replace('dl','') + ')">Download</button>' +
    '</div>';
  }

  var cards = files.map(function(f, i) { return card_(f, 'dl' + i); }).join('');
  var html = '<!doctype html><html><head><base target="_top"><style>' +
    'body{font-family:Google Sans,Arial,sans-serif;margin:0;background:#f8fafd;color:#1c2833;font-size:13px}' +
    '.top{background:' + CSS_.NAV + ';color:white;padding:16px 18px}.top b{color:' + CSS_.GOLD + '}' +
    '.wrap{padding:14px 18px 18px}.note{background:#fff8e1;color:#8a6d3b;border-radius:10px;padding:10px 12px;margin-bottom:12px}' +
    '.card{background:white;border:1px solid #e3e8ef;border-radius:12px;padding:12px;margin:10px 0;box-shadow:0 1px 2px rgba(0,0,0,.04)}' +
    '.label{font-weight:800;color:' + CSS_.BU + ';font-size:14px}.rows{font-size:12px;color:#5f6368;margin-top:2px}.name{font-family:Consolas,monospace;margin:8px 0;color:#1c2833;word-break:break-word}' +
    'button{border:0;border-radius:8px;padding:8px 12px;background:' + CSS_.BU + ';color:white;font-weight:700;cursor:pointer}.secondary{background:#5f6368}.bar{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}' +
    '</style></head><body>' +
    '<div class="top"><b>POS TXT export ready</b><br>No headers, no internal POS INDEX column. The browser should download both files automatically.</div>' +
    '<div class="wrap"><div class="note">Prepared in ' + m13HtmlEsc_(elapsed) + 's. If your browser blocks multiple downloads, click each Download button below.</div>' +
    cards + '<div class="bar"><button onclick="downloadAll()">Download all</button><button class="secondary" onclick="google.script.host.close()">Close</button></div></div>' +
    '<script>var FILES=' + JSON.stringify(files.map(function(f){ return {name:f.filename, base64:f.base64}; })) + ';' +
    'function downloadOne(i){var f=FILES[i];if(!f)return;var bin=atob(f.base64);var bytes=new Uint8Array(bin.length);for(var x=0;x<bin.length;x++){bytes[x]=bin.charCodeAt(x)}var blob=new Blob([bytes],{type:"text/plain;charset=utf-8"});var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=f.name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);document.body.removeChild(a)},500)}' +
    'function downloadAll(){FILES.forEach(function(_,i){setTimeout(function(){downloadOne(i)},i*450)})}setTimeout(downloadAll,700);</script>' +
    '</body></html>';

  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(620).setHeight(520),
    '📄 Export POS Files'
  );
}

function m13HtmlEsc_(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}


function m13NormaliseOutputRows_(rows, width, sheetName) {
  var schema = (typeof SCHEMA !== 'undefined' && SCHEMA) ? SCHEMA[sheetName] : null;
  var headers = schema && schema.headers ? schema.headers : [];
  var out = [];
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r].slice(0, width);
    while (row.length < width) row.push('');
    for (var c = 0; c < row.length; c++) {
      row[c] = m13SanitisePosOutputSheetCell_(row[c], headers[c] || '');
    }
    out.push(row);
  }
  return out;
}

function m13SanitisePosOutputSheetCell_(value, headerName) {
  headerName = m13Upper_(headerName);
  if (m13IsPosMoneyHeader_(headerName)) return m13FormatPosDecimal_(value, 2);
  if (m13IsPosPercentHeader_(headerName)) return m13FormatPosDecimal_(value, 2, true);
  if (m13IsPosIntegerHeader_(headerName)) return m13FormatPosInteger_(value);
  return String(value == null ? '' : value).replace(/\r?\n/g, ' ').trim();
}

function m13SanitisePosExportCell_(value, headerName) {
  headerName = m13Upper_(headerName);
  if (m13IsPosMoneyHeader_(headerName)) return m13FormatPosDecimal_(value, 2);
  if (m13IsPosPercentHeader_(headerName)) return m13FormatPosDecimal_(value, 2, true);
  if (m13IsPosIntegerHeader_(headerName)) return m13FormatPosInteger_(value);
  return String(value == null ? '' : value).replace(/\r?\n/g, ' ').trim();
}

function m13IsPosMoneyHeader_(headerName) {
  headerName = m13Upper_(headerName);
  return headerName === 'WSP EXCGST' || headerName === 'LAST PRICE' || headerName === 'RRP INCGST';
}

function m13IsPosPercentHeader_(headerName) {
  headerName = m13Upper_(headerName);
  return /^PR\s+\d+\s+PC$/.test(headerName) || headerName === 'RET PRICE';
}

function m13IsPosIntegerHeader_(headerName) {
  headerName = m13Upper_(headerName);
  return headerName === 'DISSNO' || headerName === 'PROD GRP' || headerName === 'SUPPLIER' ||
    headerName === 'LOYALTY SCHEME' || headerName === 'UNITS' || headerName === 'MIN ORDER QTY' ||
    headerName === 'GST TAX PC' || headerName === 'PHARM PROD' || headerName === 'SCALES' ||
    headerName === 'ITEMSIZE' || headerName === 'POS SOH';
}

function m13FormatPosDecimal_(value, places, trimZeros) {
  var raw = String(value == null ? '' : value).replace(/\r?\n/g, ' ').trim();
  if (!raw) return '';
  var cleaned = raw.replace(/[$,\s]/g, '');
  if (!/^[-+]?\d*(?:\.\d+)?$/.test(cleaned) || cleaned === '' || cleaned === '-' || cleaned === '+') return raw;
  var n = Number(cleaned);
  if (!isFinite(n)) return raw;
  var s = n.toFixed(places == null ? 2 : places);
  if (trimZeros) s = s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  return s;
}

function m13FormatPosInteger_(value) {
  var raw = String(value == null ? '' : value).replace(/\r?\n/g, ' ').trim();
  if (!raw) return '';
  var cleaned = raw.replace(/[$,\s]/g, '');
  if (!/^[-+]?\d+(?:\.0+)?$/.test(cleaned)) return raw;
  var n = Number(cleaned);
  if (!isFinite(n)) return raw;
  return String(Math.round(n));
}
