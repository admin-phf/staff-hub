# Prahran Health Foods — CH2 Reconciler v2.5.8

Complete staff-facing browser application for reconciling a POS back-end order against one or more CH2 supplier invoices.

## Core operating rule

**The uploaded POS order is the row skeleton.**

The reconciliation/export must never reorder, remove or replace those POS rows. Supplier invoice data is merged onto the existing POS rows. If a product is not invoiced, short supplied, over supplied, mismatched or low-confidence matched, the POS row remains in its original position. Genuine invoice-only lines are appended only after the complete POS-order block.

## Normal staff workflow

1. Open **Reconcile CH2 Order**.
2. Add the POS back-end order (`.xls`, `.xlsx` or `.csv`).
3. Add one or more CH2 invoices (`.pdf`, `.xls`, `.xlsx` or `.csv`).
4. Run reconciliation.
5. Review exceptions and the integrity result.
6. Download the full linked-POS workbook only when integrity shows **PASS**.

All runtime files are processed locally in the browser.

## Reference data

The Admin page stores two reference sources locally in IndexedDB on that computer/browser:

1. Latest merged POS/master workbook, normally named:
   `merged_alligned_pos_supplier_uhp_full_DD.MM.YY.xlsx`
2. Supplier/discount reference data:
   - full `POS DB & SUPPLIER MERGE.xlsx`, or
   - a CSV export of `SRC_POS_ONGOING_DISCOUNTS`

Configured central source IDs are retained in `js/reference/reference-config.js` for later authenticated Drive sync, but v2.4 does **not** require an automatic Drive endpoint to operate.


## v2.4.5 preview and metadata refinements

- `Your Ref` recognises both legacy date/store references and numeric POS order references such as `105-0008788`; the uploaded POS order number is also used as a safe fallback.
- Expected discount unit prices use commercial **half-up** rounding for displayed/audited two-decimal values.
- The browser preview now has three staff views:
  1. **Exceptions** — only rows needing attention.
  2. **All lines** — all reconciled POS rows plus genuine invoice-only rows.
  3. **POS layout** — the uploaded POS order in the same source order using the familiar POS columns: Product #, Sub Id, Product Description, GST %, Units, Qty, Stk In, Ok, MU%, GP%, AdjRRPrc, AdjWSPrc, AdjCatPrc, AdjDPrc, Adj Qty and Inc.

The POS-layout preview is source-only: it shows the actual uploaded POS order values and does not replace or recalculate them.

## v2.4 integrity engine

Before Excel export is allowed, the application checks:

- reconciliation row count equals the uploaded POS order row count;
- each reconciliation row still maps to the same POS source row;
- every parsed supplier invoice row is allocated exactly once (matched or unmatched);
- invoice line arithmetic is valid;
- when the CH2 PDF footer is machine-readable, parsed Ex-GST/GST/Total values reconcile to the invoice footer;
- output retains every POS row in exact source order;
- invoice-only rows are appended after the POS block;
- the generated workbook has exactly one `CH2 PDF Extract` worksheet;
- the 43 output headers match the approved specification exactly;
- the generated XLSX contains no unsupported `_xlfn`, `__xludf`, `DUMMYFUNCTION` or invalid formula markers;
- the generated workbook re-opens in SheetJS and still preserves the POS-order identity sequence.

If a blocking integrity test fails, Excel download is disabled.

## 43-column output contract

The output is exactly:

1. INDEX
2. Order Date
3. Invoice Date
4. Invoice Number
5. Your Ref
6. Line Count
7. Tax Amount
8. Invoice Total
9. POS SUPPLIER
10. MATCH STATUS
11. MATCH METHOD
12. MATCH CONFIDENCE
13. FUZZY SCORE
14. POS MASTER BARCODE
15. POS PLU
16. POS BRAND
17. POS DESCR
18. CH2 SUPPLIER SKU
19. CH2 PRODUCT CODE
20. CH2 QTY SUPPLIED
21. CH2 DISC %
22. CH2 GST
23. POS GST TAX PC
24. POS WSP EXCGST
25. CH2 NORMAL W/S
26. POS LAST PRICE
27. CH2 UNIT PRICE EX GST
28. POS RRP INCGST
29. CH2 RRP
30. POS TOTAL
31. CH2 TOTAL
32. POS CH2 WHOLESALE EX GST
33. CH2 WHOLESALE VARIANCE
34. CH2 WHOLESALE CHECK
35. DIS EXPECTED %
36. DIS MATCH TYPE
37. DIS MATCH KEY
38. DIS MATCH RULE
39. DIS CH2 DISC CHECK
40. DIS EXPECTED UNIT EXGST
41. DIS UNIT VARIANCE
42. DIS UNIT CHECK
43. DIS MISSED TOTAL

## Approved workbook presentation

The spreadsheet renderer is isolated in `js/export/report.js` and the exact column/schema settings are isolated in `js/core/schema.js`.

- Worksheet: `CH2 PDF Extract`
- Freeze: rows 1 and 2 (`A3`)
- Filters: row 2
- Page orientation: landscape
- Font: **Google Sans 8**
- Entire output: Excel vertical **Middle Align**
- Row 1: dark navy `#1E3A5F`, gold `#E6CD74`, height 25.5
- Row 2: `#DDE6ED`, bold centred wrapped header, height 42
- Data: alternating `#FFFFFF` / `#F3F6F9`, height 18
- Borders: thin `#D9E2F3`
- Positive/OK statuses: pale green
- Errors/mismatches: pale red
- Informational/better results: pale blue
- Bottom SUM TOTALS row: same treatment as row 1
- Exact column widths are defined in `schema.js`

## File responsibilities

- `js/parsers/pos-order.js` — POS order parsing only; preserves source order and source row.
- `js/parsers/supplier-invoice.js` — invoice extraction only; includes line and footer integrity.
- `js/reference/reference-data.js` — reference-data parsing/cache only.
- `js/core/reconcile.js` — invoice-to-POS allocation/matching.
- `js/core/linked-pos.js` — converts reconciled rows into the fixed 43-column output record.
- `js/core/integrity.js` — blocking run/export/workbook integrity checks.
- `js/core/schema.js` — fixed output contract, exact widths and visual specification.
- `js/export/report.js` — workbook rendering/validation/download only.
- `js/app.js` — staff UI orchestration.

## Privacy

Do not commit supplier invoices, POS orders, merged POS masters, customer information, pricing workbooks or other business data to GitHub. Only application code belongs in the repository.


## v2.4.1 refinements
- Missing CH2 discount percentages remain blank/unknown rather than being converted to 0%.
- Positive supplier outcomes are identified as BETTER DISCOUNT / BETTER PRICE instead of red mismatches.
- Discount/price audit calculations use the raw invoice unit price precision; display cells remain aligned to the approved 43-column format.
- Low-confidence matches are explicitly labelled REVIEW in the exported workbook.
- The XLSX package is post-processed and validated against the exact approved column-width contract, including explicit CH2 GST width 9.


## v2.4.2 refinements
- Restores the approved quick visual price movement styling across all three price pairs.
- POS/current reference prices are muted grey.
- CH2/new prices within ±$0.03 of the POS reference remain muted grey (unchanged/neutral).
- CH2/new price increases greater than $0.03 are highlighted pale red with red text.
- CH2/new price decreases greater than $0.03 are highlighted pale blue with blue text.
- The comparison pairs are POS WSP vs CH2 Normal W/S, POS Last Price vs CH2 Unit Price Ex GST, and POS RRP vs CH2 RRP.
- Existing green OK/MATCHED/HIGH-confidence status styling remains unchanged.


## v2.4.3 POS-style price movement refinements
- Keeps the existing 43-column audit contract and POS-order row sequence unchanged.
- Adds POS-style movement symbols directly to the CH2/new price cells while preserving numeric cell values.
- `↑` red = CH2/new price is higher than the POS reference by more than $0.03.
- `↓` blue = CH2/new price is lower than the POS reference by more than $0.03.
- `—` grey = effectively unchanged within the ±$0.03 tolerance.
- Adds a compact row-1 legend: `PRICE MOVE: ↑ HIGHER  ↓ LOWER  — SAME`.
- Movement is shown for POS WSP → CH2 Normal W/S, POS Last Price → CH2 Unit Price, and POS RRP → CH2 RRP.
- The symbols are applied with Excel number formats, so the cells stay numeric for filtering, formulas and audit calculations.
- Green remains reserved for true OK/pass states; price movement colours indicate direction only, not whether the supplier result is commercially correct.


## v2.4.4 parser resilience + cancelled-line handling
- Fixes CH2 PDFs where PDF.js combines the line number, product code, description, UOM, quantity or price into the same text item.
- Adds a token-level fallback line-start detector without changing the normal fast-path parser.
- Separates billed rows from CH2 `C` cancelled/backordered rows instead of reporting them as generic incomplete candidates.
- Supports partial-cancel sublines such as `131.001` / `132.001`, where CH2 prints `C + quantity + unit price` without a billed extended total.
- Preserves the integrity block: Excel is generated only when billed line sums reconcile to the supplier invoice footer.
- Regression-tested against invoice 74089986: 116 billed rows, 42 cancelled/backordered line segments, 0 unclassified candidates, and footer totals 4,943.10 + GST 417.31 = 5,360.41.

## v2.4.8 POS preview usability refinements

- The POS-layout preview continues to show **every ordered POS row in the exact uploaded source order**.
- A POS row with zero supplier quantity is retained and greyed out instead of disappearing.
- The POS-layout table is placed in its own scroll area with a **frozen header row** so the familiar POS column names remain visible while reviewing long orders.
- A **sticky totals bar** at the bottom mirrors the POS screen style:
  - Current total = source `last_price × qty` (falling back to the source discounted price where required).
  - Adjusted total = source `adjdprce × or_qty`.
- Directional price movement overlays are shown directly on the familiar POS pricing cells while preserving the original POS value:
  - `AdjRRPrc` compared with CH2 RRP.
  - `AdjWSPrc` compared with CH2 Normal W/S.
  - `AdjDPrc` compared with CH2 Unit Price Ex GST.
  - red `↑` = CH2/new price higher by more than $0.03;
  - blue `↓` = CH2/new price lower by more than $0.03;
  - grey `—` = effectively unchanged within ±$0.03.
- The comparison is presentation-only. It does not replace the source POS values or alter reconciliation calculations.


## v2.4.8 wide POS preview + source-order lock

- Reconciliation results use the available desktop width (up to ~1680 px) while the upload workflow remains compact.
- POS Layout is always rendered from the uploaded POS source rows sorted by `sourceRow`; supplier PDF order can never control the preview order.
- Invoice/reconciliation detail is attached back to the POS row by `sourceRow`, matching the same principle used by the Excel export.
- Switching preview views resets the table to the first row and first column so a retained scroll position cannot make the sequence appear out of order.
- Existing grey not-supplied rows, sticky header/footer, totals, and price movement arrows are preserved.


## v2.4.8 true full-width results workspace

- Fixes the v2.4.7 stylesheet deployment issue where escaped newline text prevented the desktop breakout rules from being parsed by the browser.
- Reconciliation results now use essentially the full browser width on desktop, leaving only a small outer margin.
- Upload/reference panels remain compact and centred.
- POS layout keeps its sticky header/footer, exact POS source order, unsupplied greying and price movement visuals.


## v2.4.9 responsive POS workspace

- Results workspace dynamically follows the browser viewport rather than a fixed pixel target.
- POS preview height scales with available screen height.
- Product Description absorbs spare horizontal width.
- Numeric, quantity and price columns remain compact instead of stretching into wasted space.
- Small screens retain a readable minimum grid width and scroll horizontally.
- Sticky POS header, sticky totals, source-row ordering, grey unsupplied rows and price movement arrows are unchanged.


## v2.5.0 adaptive content-aware POS columns

- Replaces hard-coded POS preview column widths with a measured column-sizing engine.
- Measures the actual header and every displayed value in the uploaded order using the rendered table font.
- Applies safe per-column minimum/maximum bounds so IDs and numeric fields stay legible.
- Product Description is the primary elastic column; Product # and Sub Id can also flex within safe bounds.
- On wider windows, spare width is distributed to flexible columns so there is no dead workspace gap.
- On narrower windows, flexible text columns shrink first. Horizontal scrolling begins only after safe minimums are reached.
- ResizeObserver re-runs sizing whenever the preview area changes dimensions, so dragging/resizing the browser updates the table live.
- Existing POS-order source sequencing, not-supplied greying, frozen header, sticky totals and price-direction arrows are preserved.
- v2.5.0 adds local asset cache-busting to make deployed CSS/JS updates easier to verify.


## v2.5.1 adaptive POS workspace + unpacking checklist

- POS preview widths now start from the **actual longest displayed value/header** in the current order, then stay within sensible min/max bounds.
- Product Description is capped instead of absorbing unlimited ultrawide-screen space.
- Spare width is distributed only as modest breathing room across selected columns; the table is allowed to remain naturally compact on very wide monitors.
- On smaller windows, Description/ID/price columns shrink first and horizontal scrolling appears only after safe minimums are reached.
- A new interactive **unpacking checkbox** appears immediately to the left of Product # in POS Layout.
- Checking an item strikes through the entire POS row while preserving existing supply/price colours.
- The checklist works on supplied and grey not-supplied rows alike.
- Checklist state is session-local and survives switching between Exceptions / All lines / POS layout and rerunning the same order in the current browser tab.
- A **Checked X / N** progress counter and **Clear checks** button are shown in POS Layout.
- Checklist state is operational only; it does not change reconciliation logic, invoice allocation, integrity checks or Excel output.


## v2.5.2 workspace-aware POS preview
- POS Layout now fills the available preview workspace instead of stopping at natural content width.
- Column widths are still measured from the actual order data, then spare window width is distributed intelligently across Product Description, POS Brand, IDs and price columns.
- Resizing the browser recalculates the plan live through ResizeObserver.
- POS Layout identity block is now: unpacking check → Product # / barcode → POS Brand → POS PLU → Sub Id → Product Description.
- POS Brand is read from the cached merged POS/master reference. If a master record cannot be resolved, the brand is left blank rather than guessed.
- POS PLU comes from the uploaded POS order, preserving the source snapshot.


## v2.5.3 cumulative unpacking quantity tally

- POS Layout adds two operational unpacking columns immediately after the POS Qty column: **Add Qty** and **Found**.
- **Add Qty** accepts the quantity found in the current carton/box. Press **Enter**, **Tab**, or click away to add it to the running **Found** total; the Add Qty field then clears automatically.
- Negative entries are supported for corrections (for example `-6`). Running totals are never allowed below zero.
- The **Found** field is read-only and shows the cumulative physical quantity entered for that POS row.
- Quantity totals are session-local, keyed to the POS order/product identity, and survive switching between preview views and rerunning the same order in the current browser tab.
- A **Clear qty** control resets only the physical-count totals; **Clear checks** continues to reset only the row checklist.
- Quantity entry works on supplied and grey not-supplied rows alike. It is operational only and does not change reconciliation, pricing, supplier quantities, integrity checks, or Excel output.


## v2.5.4 unpack quantity status + lossless input commit

- **Found** now compares the cumulative physical count with the supplier quantity expected in the delivery.
- A counted row is **bold red** when Found is under expected, **neutral grey** when it is exact, and **bold green** when it is over expected.
- Rows that have not been counted yet remain neutral rather than showing as shortages before unpacking begins.
- Short-supplied lines compare against the supplier quantity actually invoiced/supplied; cancelled/not-invoiced lines expect zero.
- Add Qty now commits on Enter, Tab, normal blur/change, clicking another control, switching browser window/tab, and page hide/navigation.
- Negative corrections remain supported. A correction back to zero remains marked as a counted row until **Clear qty** is used.
- These receiving controls remain operational only and do not alter reconciliation, supplier quantities, integrity checks, or Excel output.


## v2.5.5 aligned previews + progressive receiving

- Header alignment now matches body-cell alignment in Exceptions, All lines and POS Layout.
- Preview typography is increased by 2px across all three views; the POS width engine measures the new computed font size so adaptive columns remain accurate.
- The first POS receiving checkbox now means “all expected units accounted for”. Checking it writes the expected delivery quantity into Found.
- Manual Add Qty completion (Found >= expected) automatically marks the row complete; a negative correction below expected returns it to remaining.
- POS Layout displays remaining rows first and completed rows second, preserving original POS source order within each group.
- A green divider marks the completed block and the progress indicator reports Complete / Remaining counts.
- Receiving workflow changes are preview-only and do not alter the audit engine or Excel output.


## v2.5.6 editable Found + receiving-control polish

- POS Layout **Found** is directly editable. Staff can type the actual running total to override the accumulated count instead of entering a negative correction.
- Direct Found edits retain the red / grey / green under-correct-over status colours and drive row completion exactly like Add Qty.
- Add Qty remains cumulative and still accepts negative corrections.
- Both Add Qty and Found commit on Enter, Tab, blur/change, click-away, window/tab switch and page hide.
- Completed-row strikethrough no longer affects the Add Qty or Found controls, so receiving counts remain readable/editable after completion.
- POS receiving rows and quantity inputs are taller so native number up/down steppers are fully visible.
- Ok / Inc checkbox cells are slightly wider and no longer inherit text-overflow ellipsis, removing stray dots beside checkbox squares.
- Reconciliation, matching, pricing, integrity checks and Excel export remain unchanged.


## v2.5.7 selected-view exports + not-supplied workflow

- The Excel download follows the active preview view: Exceptions, All lines, or POS layout.
- Exceptions exports the visible exception/review set.
- All lines preserves the established detailed linked-POS reconciliation workbook.
- POS layout exports an invoice-style operational workbook using Date / Document Number / UPC / Item / Description / Quantity / tax / wholesale / RRP / discount / ex-GST / GST / gross columns.
- POS Layout adds **Remove not supplied**, which processes every grey/not-supplied row and moves it below the active unpacking list while retaining POS order.
- Completed supplied rows remain fully readable; strikethrough is reserved for grey/not-supplied products.


## v2.5.8 full reconciliation + exact POS text export

- Restored the always-available original **Download Full Reconciliation.xlsx** export.
- The original full export remains the established validated 43-column `CH2 PDF Extract` workbook.
- Exceptions view can still download its exceptions-only `.xlsx`.
- POS layout now exports a **tab-delimited `.txt`** file matching the supplied reference structure/type: 14 exact columns, tab separators, CRLF line endings, and one row per POS-order line in source order.
- `Quantity` is the reconciled supplied quantity, so not-supplied lines remain present with `0`.
