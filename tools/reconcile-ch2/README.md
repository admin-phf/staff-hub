# Reconcile CH2 Order

Staff-facing browser tool for reconciling a POS back-end order against one or more CH2 / supplier invoices.

## Current workflow

1. Drop the POS back-end order (`.xls`, `.xlsx` or `.csv`).
2. Drop one or more supplier invoices (`.pdf`, `.xls`, `.xlsx` or `.csv`).
3. Run reconciliation.
4. Review exceptions on screen.
5. Download the full Excel reconciliation workbook.

## Current CH2 logic

The browser implementation ports the useful reconciliation rules from the existing Python workflow:

- reads POS order quantity (`or_qty`) and POS product identifiers/descriptions;
- uses POS normal wholesale (`adjwsprce`) and expected discounted unit price (`adjdprce`);
- derives the expected discount percentage from those POS prices;
- extracts CH2 PDF product code, supplier SKU, description, quantity supplied, discount %, unit price ex GST, line totals, RRP and Normal W/S;
- supports CH2 lines with a printed discount and lines with no discount value;
- matches exact CH2 product codes first, then Normal W/S + description, then description fallback;
- flags low-confidence fallback matches for review;
- compares ordered vs supplied quantity;
- checks wholesale changes and adverse unit-price / discount differences;
- calculates potential missed pricing only when the invoiced unit cost is higher than the expected POS order unit cost;
- produces a multi-sheet Excel report.

## Privacy

Files are selected by the user and parsed in the browser. They are not intentionally uploaded to the Staff Hub or stored in the GitHub repository.

Do not commit business PDFs, order files or exported reconciliation workbooks to GitHub.

## External browser libraries

The page currently loads SheetJS and PDF.js from their CDNs. A later hardening pass can vendor pinned copies into this folder so the tool has no runtime CDN dependency.

## Next expansion

The separate POS/master merge workflow can be incorporated behind the parser layer without changing Update Specials or the Staff Hub home page. Keep that code isolated inside this tool.
