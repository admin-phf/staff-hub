# Staff Hub v21.11.0 — renamed tools, new layout, Google Sheet tabs in the merge tool

Released 11 Oct 2026 10:55 AEDT. Based on v21.10.1.

## Commit notes

**Summary:** v21.11.0 — renamed tools, Drop All row layout, Sheet tabs + all supplier rows in the merge tool, Reconcile row hover

**Description:**
- Renamed: Build POS Master Databases (Cleaning and Merging and Appending CH2 and Unique DB to POS) and POS Supplier
  New Product Check and Clean Merge (Import, Update, Discontinue and Clean Products and/or Supplier information against
  current POS Database). Hub tiles, headers, Library and messages updated; web addresses unchanged.
- Layout on all three tools: Drop All · selected input · readiness + Build / Run all in one row; stages in one row
  (merge tool: 3 stages + output files). Combined Master's long text sits under a "How it works" toggle.
- Merge tool v1.4.0: Google Sheet tabs along the bottom (IN_SUPPLIER, OUT_MERGED_DATA, OUT_POS_INSERT / UPDATE, SRC_
  tabs, TMP_MERGED_POS_DATA). OUT_MERGED_DATA shows review columns or every column. The supplier sheet shows every row
  (no pages). Long notes show 4 lines (click for the rest).
- FINAL SHELF RRP's GP NGST line now matches the Google Sheet to the cent (TO_TEXT reads the displayed cell).
- Reconcile CH2 v2.9.4: pale-yellow row highlight on hover, keeping each cell's colour.

## Testing done
- The 11 Oct Google Sheet export (371 supplier rows, 34,280 POS rows, SRC tabs) run through the web engine:
  supplier STATUS, OUT_MERGED_DATA (347 rows × 73 columns), OUT_POS_INSERT (6) and OUT_POS_UPDATE (327) identical.
- Supplier sheet: edit, undo, paste at a cell, add / delete rows, copy, Delete key all work while scrolling;
  pasted rows give byte-identical TXT files to the dropped file. Two-brand paste still merges only those brands.
- Every workbook tab opens with the right rows (1,149 POS rows, 1,073 update rows, SRC with SRC STATUS); search and
  OUT_MERGED_DATA filters work in the all-columns view.
- Layouts checked at 1920 and 1366 px wide on all three tools; Build All, Run All and a Reconcile CH2 run; no page errors.
