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
