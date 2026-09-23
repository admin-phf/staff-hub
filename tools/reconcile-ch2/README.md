# Prahran Health Foods — CH2 Reconciler v2.4.7

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

## v2.4.7 POS preview usability refinements

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


## v2.4.7 wide POS preview + source-order lock

- Reconciliation results use the available desktop width (up to ~1680 px) while the upload workflow remains compact.
- POS Layout is always rendered from the uploaded POS source rows sorted by `sourceRow`; supplier PDF order can never control the preview order.
- Invoice/reconciliation detail is attached back to the POS row by `sourceRow`, matching the same principle used by the Excel export.
- Switching preview views resets the table to the first row and first column so a retained scroll position cannot make the sequence appear out of order.
- Existing grey not-supplied rows, sticky header/footer, totals, and price movement arrows are preserved.
