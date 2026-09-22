# Reconcile CH2 Order

Staff-facing CH2 reconciliation tool.

## Normal staff workflow

1. Open **Reconcile CH2 Order**.
2. Add the **POS back-end order** (`.xls`, `.xlsx` or `.csv`).
3. Add one or more **supplier invoices** (`.pdf`, `.xls`, `.xlsx` or `.csv`).
4. Run reconciliation.
5. Download the 43-column linked-POS workbook.

The main page deliberately does not show file-pickers for master/reference workbooks.
It only shows a compact `Reference data: Ready` status.

## Reference data

Reference data is cached in IndexedDB in that browser/computer. A separate
`reference-admin.html` page contains the temporary manual fallback controls.

Configured central sources:

- POS master Drive folder: `1jGg6Kayma2KZpVxZFRcJMbim8JRBy8lh`
- POS master filename prefix: `merged_alligned_pos_supplier_uhp_full_`
- Supplier/discount workbook: `1Uyc9m5o4-b3n20SAFA5AcXfoJ2NyCTfc_0vV8Mn_gTs`

The automatic Drive/Google Sheet endpoint is intentionally configured separately
in `js/reference/reference-config.js`. Until the endpoint is deployed, the Admin
page can populate the local cache manually without exposing those controls to staff.

## Privacy

Do not commit POS orders, invoice PDFs, merged POS masters, supplier workbooks or
other business data to GitHub. Runtime files and cached reference data remain on
the local device/browser.


## v2.2 POS-order integrity rule

The Excel export is now POS-order driven. The first exported data row is always the first product row from the uploaded POS back-end order, the second is always the second, and so on. Every ordered line is retained even when it is not invoiced, short supplied, over supplied, low-confidence matched, or otherwise mismatched. The POS barcode, PLU, description, GST, WSP, last price and RRP are taken from the uploaded POS order snapshot. Supplier invoice values are merged into those fixed rows. Genuine supplier-only / not-ordered lines are appended only after the complete POS-order block. An integrity guard blocks the export if the POS row sequence changes.


## v2.3 Excel compatibility and presentation

- All generated workbook cells specify **Google Sans, size 8**.
- All output cells use Excel **Middle Align** vertically.
- Row 1 `INVOICE NUMBERS` and `UNIQUE REFS` are written as calculated text values rather than `UNIQUE(FILTER(...))` formulas. This avoids the Excel repair warning caused by unsupported/dynamic formula serialization in browser-generated XLSX files.
- Standard `SUBTOTAL` formulas are retained for filter-aware numeric totals.
