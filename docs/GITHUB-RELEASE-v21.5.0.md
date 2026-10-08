# Staff Hub v21.5.0 — Database Builder v21.5.0 (Master v2.3.0) + Reconcile CH2 v2.8.0

Released 08 Oct 2026 17:20 AEDT. Based on the live v21.4.0 repository (Reconcile CH2 v2.7.3), with the v21.1.0
output / auto-download changes carried forward.

## Commit notes

**Summary:** v21.5.0 — keep every supplier row, one-to-one brand + description matching, bulk file drop, Found-quantity POSActive import

**Description:**
- Build Master Databases v21.5.0 / Combined Master v2.3.0: CH2-only and Unique-only rows are back in both masters; supplier
  rows link one-to-one (barcode first, then SUB ID / brand / W/S with 2+ points, then brand + description for products bought
  elsewhere, e.g. Herbs of Gold); To-Order PLUs not in POS kept as "AV Only"; discount rule and To-Order source columns plus
  source sheets in the full master; full master downloads when the build finishes; output rows match Reconcile; file checks
  are warnings, never blocks.
- Drop All Input Files Here in both tools: files are identified and assigned, anything unclear is listed for review, nothing
  runs until a stage / Run is pressed. Individual controls unchanged.
- Reconcile CH2 v2.8.0: the POSActive TXT imports Found quantities (overs and unders) with all other values from the CH2
  invoice; price, arithmetic, duplicate-upload and integrity checks are review notes and never disable a download.

## Build Master Databases v21.5.0 — Combined Master v2.3.0

### Matching (points mode, used by the page)
1. **Barcode first** — cleaned and unified to the POS 13-digit form. A barcode match links on its own; brand and W/S add
   points. A barcode-only link (brand and W/S both differ) is flagged in MATCH_BASIS for checking.
2. **No barcode match** — SUB ID / supplier code, brand and W/S (within 40% or $0.50) with at least 2 points including
   SUB ID (SUB ID + W/S alone also needs a shared description word, so BC-01 Boulder ≠ BC01 Byron Chai).
3. **Still unlinked** — brand + description (+ W/S): for products bought elsewhere that CH2 or Unique also list. Brands must
   agree (brand abbreviation file, discount prefixes, initials, ZZZ prefixes), pack sizes must not conflict (21VC = 21c,
   60T ≠ 30T, 1KG = 1000G), every word of the shorter description must appear in the other (abbreviations allowed: HG
   LTHEANINE 200MG 14C = Herbs of Gold L-Theanine 200mg 14c; POS ".." truncation handled) and W/S must be close unless the
   descriptions are identical. Both rows must clearly pick each other; near-identical POS duplicates prefer the active
   (non-ZZZ) row with the closest W/S. Test: 1,159 barcode-confirmed pairs had their barcode hidden; 832 were relinked by
   brand + description and 95% of those picked the same POS row as the barcode (most of the rest are the same product
   listed twice in POS); the other 327 stayed unlinked rather than guess.
- **One-to-one:** a CH2 or Unique row links to at most one POS row (strongest link first: barcode, points, active row
  before a ZZZ discontinued duplicate, closest W/S, file order). The other POS row keeps a MATCH_BASIS note naming the POS row that holds the link.
- **Every CH2 and Unique row is kept** — linked, "CH2 Only" (one-to-one to a free Unique row by barcode, then brand +
  description) or "UHP Only" (barcode-less Unique rows included). Reverts the v21.4.0 POS-only exclusion.
- **AV / To-Order:** every line stays in the master and the order file; a To-Order PLU that is not in POS becomes an
  "AV Only" row (shortfall = quantity).
- `matchMode:'python'` still reproduces Python V30.15 cell for cell (checked again on the 05/06 Oct inputs).

Sample run (05/06 Oct inputs): 38,284 rows · POS→CH2 6,061 · POS→Unique 4,402 · CH2 only 3,621 · Unique only 411 ·
125 brand + description links (Herbs of Gold Liver Cleanse & Protect, L-Theanine, PEA Forte 21c/42c, Sour Cherry & Celery,
BioCeuticals Cognition Performance+, Ultra Muscleze Night + L-Theanine …) · 374 duplicate POS rows left unlinked by the
one-to-one rule · order check 100%.

### Outputs
- Order unchanged: clean_merged_pos_data, _pos_db, clean_ch2_data, _pos_db, clean_uhp_data, _pos_db,
  merged_alligned_pos_supplier_uhp_full, _selected_columns (98 columns), to_order_with_av_supplier_codes (all _DD.MM.YY.xlsx).
- Full master: the 147 Python columns unchanged in order, then MATCH_BASIS and audit columns AV_SOURCE_ROWS (To-Order lines
  behind the quantity), OD_SOURCE_ROW, OD_INDEX, OD_RULE, OD_DISCOUNT_PCT, OD_MARKUP_PCT, OD_MEMBER, OD_MATCH, OD_DESCR (the
  ongoing-discount rule that priced the row) = 157 columns. Two extra sheets keep the loaded Ongoing Discounts and To-Order
  files exactly as supplied (Ongoing_Discounts_Source, To_Order_Source). Sheet 1 is unchanged for anything reading it.
- The full master downloads automatically when a manually started Combined Master / Build All finishes; a button beside the
  status is left in case the browser blocks automatic downloads.
- Output rows use the same layout and Download buttons as Reconcile CH2's "Generated output files".
- Re-opening checks (row counts, headers, totals row, sampled keys) are shown as a warning on the output row; the file stays
  downloadable. Only a file that cannot be written stops its stage.

### Drop All Input Files Here
- One drop zone above the input card. Each file is read once and identified from its headings (file name only as a
  fallback): BrowseStockItems1 (PLU / LAST_DPRICE), Product Insert Template (POS_DESC / WSP_EXCGST), Brand Abbreviation,
  ParagonCare / CH2 pricelist, CR666a SOH, Weight & Dimensions, Unique export, Ongoing Discounts, To-Order.
- Unique matches are assigned and validated with the same checks as the individual controls; ambiguous, duplicate,
  invalid or unrecognised files stay listed with a picker. Nothing is built until a stage or Build All is pressed.
- Stock vs template validators are stricter (each rejects the other file).

## Reconcile CH2 v2.8.0
- **POSActive TXT = Found quantities.** Each ticked / counted row imports its Found quantity, overs and unders included
  (v2.7.3 kept the invoice quantity). CH2 code, supplier code, description, Normal W/S, unit price, Disc % and GST rate come
  from the CH2 invoice line; Extended, GST and Total are recalculated at the invoice unit price when the quantity differs.
  Found 0 / unticked omits the line. A product spread over several billed lines is filled in invoice-line order (last line
  takes any excess). A back-ordered line (CH2 supplied 0 but printed a price) imports the Found quantity at that price.
- **No blocking checks.** Unit × Qty, GST 10%, Ext + GST = Total, import totals, invoice-total gaps, the per-line invoice
  check (now: invoice prices + Found-quantity arithmetic), integrity checks, layout checks on the Full Excel, duplicate
  invoice uploads (an identical copy is used once; files with the same number but different lines are all kept), missing
  invoice / order numbers, order-override mismatch, missing CH2 code and
  TAB / line breaks in a Sub ID (replaced with a space) are all review notes. Every download is enabled once a run finishes.
  Only a file that cannot be written correctly (no supplied rows, the 15-column / CRLF self-checks) stops the TXT.
- Detailed v2.7.2 / v2.7.3 notes kept: invoice / line / CH2 code / description on every W/S note, SHARED POS SUB ID listing
  (now with imported quantities) and invoice-vs-POS GST notes.
- **Drop All Input Files Here:** PDFs and invoice spreadsheets → Supplier invoices; merged_alligned master → POS / master
  (validated and saved); discount rules → Supplier + discount rules (validated and saved); POS order export → POS back-end
  order. Unclear files stay listed for review. Nothing runs until Run reconciliation is pressed.

## Checks run
- `node --check` on every changed script.
- Combined Master python mode vs Python V30.15: 38,386 rows, same keys and order, all 147 columns identical except the six
  known `_x0002_` control-character cells.
- Points mode: precision test on held-out barcode pairs; Herbs of Gold / BioCeuticals rows reviewed.
- Headless Chromium on the real inputs (BIFF2 .XLS POS files): Drop All with 9 inputs + an image → 9 assigned, 1 flagged,
  no stage started; Build All → 9 outputs in order, full master auto-downloaded at completion, no page errors.
- POSActive export scenarios: as invoiced, under (8 of 10), over (12 of 10), Found 0, split under / over, price mismatch,
  back order with Found 4, identical duplicate upload, invoice split over two files, missing order number → TXT created
  with warnings; nothing ticked → the only blocking case.
- Reconcile in Chromium: Drop All (master, rules, order, invoice, an identical invoice copy with a $1 arithmetic error +
  an image) → 5 assigned, 1 flagged; run → copy used once, TXT with Found quantities (5 of 4, 4 of 6, 0 of 3 omitted) at
  invoice prices; Full Excel / CSV downloads enabled.
- Independent code review of the change; its findings (bulk-drop robustness, back-order Found lines, ZZZ tie-break,
  duplicate-invoice rule, file-type checks, Safari-safe regex) were fixed and re-tested.
