# Database Builder v21.2.0

Updated: 06 Oct 2026

## Supplier lifecycle / master integrity

The Combined Master now follows a strict lifecycle: **Supplier feeds → Review queue → POS creation/link → Reconciliation merge**.

### Clean primary master
- `merged_alligned_pos_supplier_uhp_full_*.xlsx` remains strictly POS-anchored.
- Supplier-only rows never enter the master.
- The full master continues to download automatically after verification.
- Workbook styling continues to match the Reconciled CH2 Order visual contract.

### Review outputs
Each master build also creates:
- `unmatched_supplier_review_*.csv` — unmatched lines, duplicate normalized barcodes and cost-variance warnings.
- `pos_new_line_import_*.csv` — clean intake template for unmatched supplier lines with Supplier Name, Supplier Code, Barcode, Description and Wholesale Cost.
- `reference-data_*.js` — portable snapshot of saved supplier→POS links and Do Not Range rules.

### Matching hierarchy
Supplier matching keeps barcode and supplier-code identifiers as the hard anchors, with normalized 13-digit barcode handling, brand and wholesale-price evidence as fallbacks. Saved manual links override automatic matching on later builds in the same browser.

### Review UI
The Database Builder now contains a collapsible Supplier Review Queue. Staff can:
- search POS by barcode, PLU, SUB ID, brand or description;
- use a fuzzy suggested POS match where one is available;
- save a supplier→POS link for future builds;
- mark a supplier item **Do Not Range** so it no longer appears in future review queues in that browser.

### Guardrails
- Duplicate normalized supplier barcodes mapped to different supplier codes are quarantined instead of using first/best match.
- Supplier wholesale differences of **25% or more** from POS wholesale are added to the review queue and called out in `MATCH_BASIS`.
- Unmatched supplier rows cannot merge into the master until a later POS export confirms the item exists or staff explicitly links it to an existing POS item.

### Persistence note
Saved links and Do Not Range decisions are stored in browser `localStorage`. Export `reference-data_*.js` as a portable backup/source-control artifact. Static GitHub Pages cannot write directly back to `reference-data.js` in the repository from the browser.
