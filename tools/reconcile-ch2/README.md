# Reconcile CH2 Order

This tool is deliberately independent from `tools/update-specials/`.

## Intended flow
1. Staff drag in one POS back-end order (`.xls`, `.xlsx` or `.csv`).
2. Staff drag in one or more supplier invoices (`.pdf`, `.xls`, `.xlsx` or `.csv`).
3. Browser validates and parses the files locally.
4. Reconciliation engine compares ordered vs invoiced/supplied quantities, product matches, pricing and discounts.
5. Staff review exceptions and download a full Excel reconciliation report.

## Code boundaries
- `index.html` — screen only
- `css/app.css` — reconciliation screen styling only
- `js/app.js` — screen state / drag-and-drop only
- `js/parsers/pos-order.js` — POS export parsing only
- `js/parsers/supplier-invoice.js` — CH2/supplier invoice parsing only
- `js/core/reconcile.js` — reconciliation rules only
- `js/export/report.js` — output workbook/report only

Do not put live invoices/orders in this folder or repository.
