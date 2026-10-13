# Staff Hub v21.20.0 — POS New Product Check Clean v1.10.0: heading blocks without inner lines, ticks on the supplier sheet only

Released 13 Oct 2026 18:30 AEDT. Based on v21.19.0.

## Commit notes

**Summary:** v21.20.0 — No inner lines in the sheet headings, Update in POS ticks back on the supplier sheet only

**Description:**
- POS New Product Check Clean v1.10.0: the heading block of every sheet (IN_SUPPLIER and every workbook tab) has no inner
  lines. The row-1 totals and the headings read as one band, with no vertical lines between columns and no line between
  row 1 and the headings. The A B C letters row, the row numbers and the data rows keep their grid lines, and the column
  widths are unchanged.
- The Update in POS ticks are on the supplier sheet only again (C, E, F, G, H, I, J, K, L). OUT_MERGED_DATA has none. It
  still recalculates from the supplier sheet ticks, and the headings of the columns POS keeps have grey text.
- The review workbook stamp now gives the tool's own version (it still said v1.7.2).
- Merge results unchanged.

## Files
- Changed: index.html, docs/ARCHITECTURE.md, tools/pos-supplier-merge/{index.html, README.md, css/merge.css, js/app.js,
  js/sheet-grid.js}
- New: docs/GITHUB-RELEASE-v21.20.0.md
- Delete by hand (still in the repo): tools/database-build/js/size-worker.js

## Testing done (13 Oct, real files)
- **Heading lines:** IN_SUPPLIER, OUT_MERGED_DATA and OUT_POS_UPDATE were checked after Run all stages. Row-1 and heading
  cells have no right or bottom line between them. The letters row and data cells keep their lines.
- **Column widths:** the IN_SUPPLIER widths are identical to v21.19.0 (48, 100, 90, 105 … 159 px).
- **Ticks:** IN_SUPPLIER has 9 ticks (C, E–L); OUT_MERGED_DATA has 0.
  - Unticking K on IN_SUPPLIER turns 16 OUT headings grey (NEW RRP, the markups, FINAL SHELF RRP, rrp incgst, price
    levels 1–9, ret price), and OUT recalculates: NEW RRP $15,436.35 → $16,415.80, POS's own RRPs.
  - Each grey heading's hover says why.
- **Merge results:** METAGENICS was run from the Library with the reference tables loaded. The POS INSERT and POS UPDATE
  TXT files are byte-identical to v21.19.0. The review workbook matches apart from the run time and the version stamp.
- **Other checks:** every hub page loads without errors, and the Update in POS, Discontinue and cell edit / Undo tests pass.
