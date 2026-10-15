# Staff Hub v21.25.3 — Build workbooks in the merge look (totals band, unique brands, widths); Ctrl + C on the sheets (15 Oct 2026 13:30 AEDT)

**Summary:** v21.25.3 — every Build POS Master Databases workbook has the merge workbook's layout (totals band row 1 with unique brand counts, navy headings row 2, column widths); Ctrl + C on the merge sheets uses the clipboard API

## Commit notes
- **Build POS Master Databases v21.15.0** — all nine output files share one look, the one the POS New Product Check Clean
  workbook has: a navy / gold **totals band on row 1**, **headings on row 2**, banded rows, set column widths, filter and
  freeze from row 2. Row 1 holds `TOTAL ROWS: n` (a SUBTOTAL formula with its text cached — it follows Excel's filters),
  `UNIQUE: n` above every brand / vendor / supplier-name column (worked out at build time; a live unique count over
  38,000 rows would stall Excel), `TOTAL: $…` above price columns and `TOTAL: n` above stock columns (SUBTOTAL, live), and
  on the master files the Python counts / sums / averages as SUBTOTAL formulas with cached values. Column A of the master
  carries both: `TOTAL ROWS: 38,291 · UNIQUE: 2,944`. The totals row that used to sit under the data is gone. Values,
  column order and sheet names are unchanged (POS v5.3.0, CH2 v1.3.0, Unique v1.3.0, MasterCore v2.5.0, XlsxLite v1.2.0
  writes a formula's cached text). The re-open checks read the headings from row 2.
- Every reader was run against the new files: Reconcile CH2 Order with the new master (same result: 104/106, Integrity
  PASS); POS New Product Check Clean with the new POS set, the new CH2 full set and the five reference tables (7 / 7
  recognised, 9,682 supplier rows, 15,226 OUT rows). The hub Library and supplier-layout are unaffected.
- **POS New Product Check Clean v1.14.9** — Ctrl + C on the supplier sheet and the OUT grids writes through the clipboard
  API first (the hidden-text-box trick only when that is refused) and copies an empty selection as empty text; the
  "Copied G3." note confirms the key was seen. Ctrl + V was already working (paste event); both verified headless.

## Files
- Changed: index.html (v21.25.3), tools/database-build/{index.html v21.15.0, js/pipeline.js v21.15.0, js/master-core.js
  v2.5.0, js/xlsx-writer.js v1.2.0}, tools/pos-supplier-merge/{index.html, js/app.js v1.14.9, js/sheet-grid.js v1.7.2},
  docs/ARCHITECTURE.md.
- New: docs/GITHUB-RELEASE-v21.25.3.md.

## Testing done (15 Oct, headless Chromium)
- Build all with the handoff inputs: Complete, 9 outputs, no verify warnings, 103 s. Row 1 / row 2 of every file checked.
- Reconcile and merge runs above. Supplier sheet: Ctrl + C → clipboard "Banana Split 440g", note "Copied G3."; Ctrl + V
  writes the cell.
