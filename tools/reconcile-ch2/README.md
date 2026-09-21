# Reconcile CH2 Order — linked POS workbook v2

This Staff Hub tool keeps the normal staff workflow simple:

1. Drop the POS back-end order (`.xls`, `.xlsx` or `.csv`).
2. Drop one or more CH2 / supplier invoices (`.pdf`, `.xls`, `.xlsx` or `.csv`).
3. Run the reconciliation.
4. Download the full linked-POS workbook.

## One-time reference setup per computer

Open **Reference data** and load:

- the latest `merged_alligned_pos_supplier_uhp_full...` workbook; and
- the current `POS DB & SUPPLIER MERGE` workbook containing `SRC_POS_SUPPLIERS` and `SRC_POS_ONGOING_DISCOUNTS`.

These files are stored in IndexedDB in that browser on that computer. They are not committed to GitHub and are not uploaded to the Staff Hub.

## Excel output

The download recreates the established single-sheet `CH2 PDF Extract` workbook:

- exact 43-column A:AQ layout;
- row 1 summary / subtotal formulas;
- row 2 headers;
- data from row 3;
- bottom `SUM TOTALS` row;
- linked POS identity and pricing;
- CH2 Normal W/S / unit / RRP / totals;
- CH2 wholesale variance audit;
- live discount-rule audit from `SRC_POS_ONGOING_DISCOUNTS`;
- match status / method / confidence / fuzzy score;
- original workbook number formats, fills, row heights, widths, filters and frozen rows.

One supplier invoice creates one `.xlsx`. Multiple supplier invoices are returned as a ZIP containing one linked-POS `.xlsx` per invoice.

## Privacy

Do not put order files, invoice PDFs, the merged POS master or supplier/discount workbooks into the GitHub repository. Runtime files and cached reference data stay on the local computer/browser.
