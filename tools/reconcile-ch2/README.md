# Prahran Health Foods — CH2 Reconciler v2.6.12

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


## v2.5.9 reference drag/drop + POS import mapping

- POS/master and Supplier + discount reference cards now accept drag-and-drop as well as file chooser.
- POS Layout `AdjCatPrc` and `AdjDPrc` intentionally show the same expected discounted unit cost: supplier Normal W/S per unit ex GST less the matched Supplier + discount rule.
- The POS import text export keeps the exact 14-column legacy tab-delimited layout and uses the canonical POS Sub ID from the linked master when available.
- POS import filenames follow `oborne_invoice_{INVOICE}_(PO).txt`.
- POS import text download is blocked if a supplied line has no Item/Sub Id.


## v2.6.0 robust legacy POS import contract

- POS-layout import export is isolated in `js/export/pos-import.js` so the known-working legacy POS-import contract cannot be accidentally changed by the 43-column Excel renderer.
- Exact 12-column contract: `Date`, `Name`, `Document Number`, `Item`, `Description`, `Quantity`, `W/S ex GST`, `Discount`, `GST`, `Gross Amt`, `Barcode`, `Shipping Address`.
- Fixed legacy customer values are retained: `JPRAHRAN Prahran Health Foods` and the known-working multiline shipping address.
- `Document Number` is the actual CH2 supplier invoice number printed on the PDF. Customer PO/order number remains a separate reconciliation identity.
- `Item` is the canonical POS Sub ID from the POS/master; supplied CH2 product codes are independently cross-checked against all available master mappings before download.
- `W/S ex GST` is the actual discounted line total excluding GST. `Discount` uses legacy `less X%` text.
- Zero/not-supplied order rows remain present in original POS sequence; the final `Overall Total` row is restored.
- TXT format is CRLF tab-delimited, no BOM, with legacy-style quoted multiline address and comma-formatted totals.
- POS import preflight blocks unsafe output for mismatched Customer PO, unmatched invoice lines, missing/ambiguous master identity, LOW-confidence matches, inconsistent discount rates or non-reconciling totals.
- If one POS order is split across multiple supplier invoices, each actual invoice gets its own validated TXT inside one ZIP rather than mixing Document Numbers in a single legacy import file.
- All v2.5.9 reconciliation, receiving, preview, reference-data and full 43-column Excel behaviour is preserved.


## v2.6.1 POS import download reliability

- Preserves the uploaded POS order `Sub Id` exactly in the legacy 12-column `Item` field.
- A blank order Sub Id remains blank; it is never replaced by a CH2 product code or a newer master value.
- Blank Item is allowed when the order has a valid barcode; supplied rows are blocked only when both Item and Barcode are unavailable.
- CH2/master cross-checks now confirm the order row by barcode, POS PLU or order Sub Id rather than requiring every current-master identity field to be identical.
- If POS import validation blocks a download, the reason is shown immediately in a dialog as well as the page status.
- All v2.6.0 reconciliation, receiving, Excel, reference-data and POS-layout features remain unchanged.


## v2.6.2 smarter POS import validation

- Keeps the legacy 12-column POS TXT contract and all v2.6.1 order-identity rules unchanged.
- Master cross-checks now distinguish **reference gaps/stale mappings** from a **genuine competing-order conflict** instead of blocking every master disagreement.
- CH2-only master records with no POS barcode/PLU/Sub Id are non-blocking `MASTER LINK MISSING` notes.
- CH2 codes absent from the current master are non-blocking `MASTER CODE NOT FOUND` notes; the uploaded order identity is preserved.
- If the master identity points to another row in the same uploaded POS order, export remains hard-blocked because that can post invoice values to the wrong stock item.
- If the master identifiers differ but no competing order row exists, a strong invoice/order match (description plus Normal W/S and RRP, or a direct exact order-code/barcode match) is allowed with a non-blocking `MASTER IDENTITY DIFFERENCE` note.
- Weak/LOW-confidence master contradictions still block.
- A supplied line with a valid Item/Sub Id but no barcode is now allowed with a warning; only missing both Item and Barcode is a hard identity failure.
- Successful POS downloads now report the count of non-blocking validation notes in the page status, while the POS application remains the final import gate.
- Full 43-column reconciliation, Exceptions export, POS receiving workflow, reference drag/drop, pricing/discount logic and all other v2.6.1 behaviour are preserved.


## v2.6.3 manual order-link override + Reference Admin layout fix

- Reference Admin cards no longer allow long cached filenames/status text to squeeze the file-select buttons into awkward multi-line wrapping.
- Cached reference filenames remain compact with ellipsis and expose their full text as a hover tooltip.
- When a CH2 invoice Customer PO differs from the uploaded POS order, the result screen now shows an explicit **Invoice → POS order link** control.
- Staff can deliberately confirm a manual link, for example invoice `73930346` / CH2 Customer PO `02.09.2026-MELB-SID` → uploaded POS order `105-0008640`.
- The manual override bypasses **only** the Customer PO equality check. It does not bypass invoice-number, product, quantity, price, master-identity, discount, arithmetic or total validation.
- The original CH2 Customer PO is preserved; it is never rewritten in the reconciliation data.
- POS import download remains disabled until every detected Customer PO mismatch has either matched normally or been explicitly confirmed.
- Overrides are per invoice and session/current file selection, can be undone, and are cleared when the POS order or supplier files are changed.
- The generated POS TXT continues to use the real CH2 invoice number as `Document Number` and the uploaded POS order number only as the order/import reference.
- All v2.6.2 master-validation, 12-column legacy TXT, full 43-column Excel, Exceptions, receiving, preview and reference-data behaviour is preserved.


## v2.6.4 proven POSActive import + POS Layout receiving export

- **POS Layout is now the default result view** after a reconciliation finishes. The view buttons are ordered POS layout → Exceptions → All lines.
- POSActive export now uses the **proven 15-field positional contract** accepted by Apply Oborne Health Services Invoice:
  `Invoice No`, `Line`, `CH2 Code`, `Supplier Code`, `Sub ID`, `Description`, `Qty`, `Qty Supplied`, `Normal WS`, `Unit Price ex GST`, `Rebate`, `Extended ex GST`, `GST`, `Total inc GST`, `Disc %`.
- POSActive reads those fields by position. The exporter therefore hard-validates exactly 15 tab-delimited fields, CRLF endings, no BOM, no quotes/currency/percent symbols in data rows, and the exact header order.
- The filename is generated automatically in the POSActive-required format: `oborne_invoice_{INVOICE}_(POS-ORDER).txt`.
- If CH2 Customer PO differs from the one uploaded POS order, the uploaded POS order is **auto-linked for POSActive routing/filename**. The original CH2 Customer PO remains unchanged in the audit and all product/price/quantity/master/totals checks remain active.
- POS Sub ID overrides are automatic: column 3 always keeps the CH2 product code; column 5 uses the uploaded POS order Sub ID when it differs (for example Biopractica/BioGaia codes), otherwise the CH2 code is used.
- **POS Layout receiving counts now feed the POSActive download.** Untouched rows use CH2 Qty Supplied. If a staff member enters/ticks `Found`, that value becomes `Qty` and `Qty Supplied` in the POSActive file.
- When Found is short/over versus CH2, Extended ex GST, GST and Total inc GST are recalculated from the invoice unit price and actual Found quantity so POSActive derives the same WS price/discount instead of distorting unit cost. The full reconciliation workbook remains unchanged and preserves the original supplier invoice.
- A Found value of zero is omitted because POSActive cannot safely import zero-quantity lines; the browser returns a note that the zero line must be set manually in POSActive.
- A positive Found quantity on a product with no CH2 invoice line remains blocked from automatic import because no invoice price/discount exists to populate safely.
- The full 43-column reconciliation workbook, Exceptions export, Reference Admin drag/drop/layout fixes, master identity checks, discount auditing, receiving checklist and all established POS preview behaviour remain available.


## v2.6.5 GST-inclusive live totals + explicit zero receiving

- POS Layout footer totals are now explicitly **GST-inclusive**.
- **Current Total inc GST** mirrors the uploaded POS order: current POS unit cost × ordered quantity, applying each row's POS GST %.
- **Adjusted Total inc GST** is built from the same proven 15-column POSActive export payload that will be downloaded, so it includes GST and reflects current Found receiving quantities. Untouched rows therefore reconcile to the supplier invoice gross total; short/over receiving updates the displayed import total live.
- Entering **0 in Add Qty** is now a deliberate receiving action: it clears any existing Found quantity to zero, marks the row accounted/not supplied, and moves it into the completed section.
- An explicit zero remains visually under-supplied (`Not supplied · expected …`) rather than being mistaken for an exact count.
- The POSActive contract cannot safely carry zero-quantity lines, so an explicit Found 0 is omitted from the TXT and retained as a validation note/manual zero action for POSActive.
- Entering a later positive Add Qty value after an explicit zero resumes normal receiving; if still below expected, the row returns to Remaining.
- The proven 15-column contract, automatic POS-order filename routing, Sub ID override logic, POS Layout-first workflow, full 43-column Excel, Exceptions export and all v2.6.4 reconciliation behaviour are preserved.


## v2.6.6 POS receiving selection + simplified layout

- POS Layout visually removes **Stk In**, **Ok** and **Inc** only. The source/order data and full reconciliation workbook are unchanged.
- The first POS Layout column now has a header **All** checkbox control. Click it to tick all rows; click again when all are selected to untick all. Existing manual Found values are preserved when simply unticking, while **Clear qty** is the separate destructive reset.
- **Clear qty** now sits directly above the **Add Qty** column rather than in the general toolbar.
- The POSActive download now treats **every unticked POS row as not supplied by default**. Ticked rows use Found when entered, otherwise the expected CH2 supplied quantity.
- Any deliberate Add Qty or Found entry automatically ticks/accounts for that row, including under-supplied, over-supplied and explicit zero counts.
- Entering **0** records an explicit not-supplied result, keeps the row accounted, and omits the zero-quantity line from the 15-column POSActive TXT as required by the proven importer contract.
- Row movement between Remaining and Accounted/Completed is debounced by **1.5 seconds**, giving staff time to correct a quantity before the row relocates.
- Adjusted Total remains GST-inclusive and mirrors the current POSActive export selection/Found quantities.
- The proven 15-column POSActive contract, auto filename/order routing, Sub ID overrides, full 43-column Excel and Exceptions export are preserved.


## v2.6.7 incremental receiving completion restored

- Fixes the v2.6.6 regression where entering any Add Qty / Found value immediately marked the product complete.
- **Under-supplied counts stay in Remaining** so staff can continue adding units until the invoiced/CH2 supplied quantity is reached.
- **Over-supplied counts also stay in Remaining** so the discrepancy remains visible until staff correct it or deliberately tick the row to accept/account for it.
- A row auto-completes only when **Found exactly matches the CH2 supplied quantity** (within the existing 0.0005 receiving tolerance).
- The left checkbox remains the deliberate manual override: staff may tick a short/over row to accept that physical count for the POSActive download. If no Found count exists, ticking seeds Found to the expected CH2 supplied quantity.
- **Add Qty = 0** and direct **Found = 0** remain explicit “none supplied” actions: Found is set to zero, the row is accounted/completed, and the zero line is omitted from the POSActive TXT with the existing validation note.
- Negative corrections remain supported. If an exact completed count is corrected below or above expected, it returns to Remaining.
- The 1.5 second delayed row movement, Tick All / Untick All, Clear qty in the Add Qty header, simplified POS Layout columns, GST-inclusive totals and the proven 15-column POSActive import contract are preserved.
- v2.6.7 uses fresh receiving-state keys. If v2.6.6 Found totals exist in the same browser session, the numeric counts are migrated once but the faulty v2.6.6 completion flags are not. Exact and zero counts are rebuilt as completed; partial/over counts are restored to Remaining.


## v2.6.8 receiving focus + persistent completion + row total

- Pressing **Enter** in an **Add Qty** field commits the quantity and moves the cursor directly to the next visible Add Qty row.
- The 1.5 second delayed Remaining / Completed re-order still applies. If the delayed render occurs while a receiving field is focused, the same field is re-focused after the table moves so counting can continue without losing the cursor.
- Once a row is already **accounted / checked**, later edits to Add Qty or Found no longer silently untick it or send it back to Remaining. It stays in Completed until staff explicitly untick the left checkbox.
- Untouched partial/over counts still stay in Remaining; exact counts still auto-complete; explicit zero still means accounted / not supplied.
- POS Layout adds a final **Total inc GST** column. It uses the current physical receiving quantity when Found has been entered; otherwise it uses the reconciled CH2 supplied quantity. Formula: `quantity × AdjCatPrc × (1 + POS GST % / 100)`.
- The new row total is preview-only. It does not alter the proven 15-column POSActive import contract or the full 43-column reconciliation workbook.
- Existing POS Layout simplification remains: Stk In / Ok / Inc are hidden only from this preview; Tick All / Untick All, Clear qty, Found status colours, short/over receiving download behaviour, and GST-inclusive footer totals are preserved.


## v2.6.9 fresh-run receiving reset + POSActive plain-text normalization

- **Every Run starts fresh.** Re-running the same files clears all receiving checkboxes, Found/Add Qty totals, explicit zero/not-supplied decisions and prior Remove-not-supplied processing before the new reconciliation is displayed.
- Changing/removing invoice files, changing/removing the POS order, or using **Clear Files** also clears the current receiving session and its browser session-storage keys.
- Grey/not-invoiced rows therefore appear again by default on each new run until staff deliberately choose **Remove not supplied**.
- The POSActive 15-column exporter now preserves the exact header (including `Disc %`) while normalizing **data rows only**. Quote marks, dollar signs and percent signs found in display-only text such as product descriptions are removed from the POSActive TXT, with a validation note; the reconciliation/audit data is not changed.
- POSActive match keys are still protected: if a **Sub ID** itself contains a forbidden quote/dollar/percent character, export remains blocked rather than silently changing the key.
- All v2.6.8 receiving behaviour remains: partial/over counts stay in Remaining until exact or manually ticked, explicit zero is accounted/not supplied, delayed row movement, focus restoration, Tick All / Untick All, Clear qty, hidden Stk In/Ok/Inc, GST-inclusive totals, row Total inc GST and the proven 15-column POSActive import contract.


## v2.6.10 CH2 line visibility + strict incremental receiving restoration

- POS Layout adds a compact **CH2 Line** column beside the receiving checkbox. It shows the supplier invoice line number(s) linked to each POS product, so export errors such as `Invoice line 20` can be found immediately in the receiving grid.
- POSActive validation messages now identify **both CH2 invoice line and POS row/product** for unsafe Sub ID match keys, and show the offending Sub ID value.
- The v2.6.8/v2.6.9 completion persistence regression is removed. Entering any partial or over quantity no longer leaves an automatically completed row in Completed.
- Automatic completion again occurs only when **Found exactly equals CH2 Qty Supplied**, or when an explicit zero records none supplied.
- If an automatically exact row is later corrected short/over, it returns to Remaining after the existing 1.5 second delay.
- The left checkbox is now tracked as the **only persistent manual acceptance**. If staff explicitly tick a short/over row, it stays completed through later quantity edits until they deliberately untick it.
- Tick All / Untick All are treated as deliberate manual checkbox actions. Clear qty clears counts, selections and manual acceptance state.
- Add Qty = 0 remains an explicit accounted/not-supplied action, but a later positive partial count returns the row to Remaining unless the left checkbox was deliberately ticked.
- Stk In / Ok / Inc remain hidden only from POS Layout. GST-inclusive Current / Adjusted totals, row Total inc GST, the 1.5 second movement delay, Enter-to-next-row behavior, fresh-run receiving reset, and the proven 15-column POSActive import contract are preserved.
- The stricter Sub ID character check introduced in v2.6.9 remains intentionally active because POSActive matches on column 5 Sub ID and the proven plain-text contract does not allow quote, dollar or percent characters in data rows. v2.6.10 improves identification rather than silently changing a match key.


## v2.6.11 literal POS Sub ID support

- Removes the v2.6.9/v2.6.10 hard block on quote (`"`), dollar (`$`) and percent (`%`) characters when those characters genuinely occur in the uploaded POS order **Sub ID**.
- Column 5 **Sub ID** is now preserved literally in the POSActive 15-column TXT because POSActive uses that field as the match key. Silently deleting a real character would change the key and is less safe than preserving it.
- A special-character Sub ID produces a visible non-blocking warning so staff know POSActive will perform the final match validation.
- TAB, carriage-return and line-feed characters remain hard-blocked in Sub ID because they would corrupt the tab-delimited positional file.
- Supplier Code and Description retain the existing import-only cleanup for quote / dollar / percent characters; reconciliation/audit data is unchanged.
- The proven 15-column contract, POS Layout-first workflow, strict incremental receiving, explicit zero handling, Tick All / Untick All, 1.5 second movement delay, GST-inclusive totals, row Total inc GST, hidden Stk In / Ok / Inc, fresh-run reset, CH2 Line visibility and full Excel/Exceptions exports are otherwise unchanged.


## v2.6.12 strict completion + partial receiving export restoration

- Restores the original incremental receiving rule: positive partial and over counts stay in **Remaining**; they do not move to Completed merely because a quantity was entered.
- Automatic completion occurs only when **Found exactly equals CH2 Qty Supplied**. The deliberate exceptions remain: an explicit **Add Qty = 0 / Found = 0** records not supplied and completes the row, and a deliberate left-checkbox tick manually accepts/completes a row.
- A later correction from an automatically exact count back to short/over returns the row to Remaining after the existing 1.5 second movement delay unless the left checkbox was deliberately ticked.
- Crucially, completion state no longer controls receiving quantity export. If staff enter a positive partial or over **Found** quantity, that exact Found quantity is used in the POSActive TXT even while the row correctly remains in Remaining.
- Untouched + unticked rows still default to not supplied for the download. A tick with no entered Found quantity uses the expected CH2 supplied quantity.
- Add Qty remains cumulative, Found remains directly editable, negative corrections remain supported, explicit zero remains accounted/not supplied, Tick All / Untick All and Clear qty remain available, and completed rows still move only after the short delay.
- No reconciliation, PDF parsing, 43-column Excel, proven 15-column POSActive contract, price/discount logic, GST-inclusive totals, hidden POS-only columns, CH2 Line visibility, or reference-data behavior is removed.
