# Staff Hub v21.10.1 — compact card layout + merge only the brands you paste or drop

Released 10 Oct 2026 21:30 AEDT. Based on v21.10.0.

## Commit notes

**Summary:** v21.10.1 — cards side by side on all tools; POS Supplier Merge merges only the brands in Supplier Updates

**Description:**
- POS Supplier Merge v1.3.1: Supplier Updates starts empty, so a merge covers only the brands pasted or dropped
  (fixes 2-brand merges returning every brand). CH2 / Unique imports in the Library are added only with their new
  "+ Add … from the Library" buttons. New "Brands in this merge" line above the sheet.
- Compact layout (new assets/css/compact-layout.css): selected input, readiness and Build / Run all sit in one row;
  Build Master Databases shows its 4 stage cards in one row; Drop All results and output files list in 2 columns.
- Reconcile CH2 v2.9.3: stage and output files side by side; Invoice → POS order link | POSActive import keys and
  Not on POS order | GST differences side by side. Totals, notes and tables stay full width.
- Nothing removed from any page; narrow windows fall back to one column. No change to builds, merge results or exports.

## Testing done
- POS Supplier Merge with POS Database + CH2 / Unique imports in the Library: opens with Supplier Updates empty;
  pasting WELEDA + AMAZONIA (204 rows) gives OUT_MERGED_DATA of those 2 brands only (372 rows incl. 169 ZZZZ
  discontinued); Add CH2 import adds its 623 rows (8 brands); ✕ and reload leave it empty.
- Build All, Run All and a Reconcile CH2 run (PDF invoice) checked at 1920 and 1366 px wide: all panels, messages
  and downloads present; page length cut by ~25% on Build Master Databases. No page errors.
