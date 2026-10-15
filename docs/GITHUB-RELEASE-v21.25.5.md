# Staff Hub v21.25.5 — merge: no OUT ticks, read-only POS columns, fill down (16 Oct 2026 09:00 AEDT)

**Summary:** v21.25.5 — POS New Product Check Clean v1.15.0: OUT_MERGED_DATA ticks removed (updated columns go to POS, edit to override), POS SUPPLIER / OLD BRAND / ORIGINAL POS DESCR / CURRENT prices read-only, fill down on every sheet, supplier tick on POS SUPPLIER NAME

## Commit notes
- OUT_MERGED_DATA has no heading ticks. The updated column of each pair (UPDATED SUPPLIER, POS BRAND, POS DESCR, NEW WSP /
  LAST PRICE / RRP) and SIZE are what goes to POS; the user overrides by editing that cell (orange). UPDATED SUPPLIER edits
  are still checked against POS Suppliers (approved → `NAME (NUMBER)`, else refused and put back).
- POS SUPPLIER (F), OLD BRAND, ORIGINAL POS DESCR, CURRENT WSP EXGST, CURRENT LAST PRICE and CURRENT RRP are read-only on
  OUT_MERGED_DATA; the heading hover and the click note say which column to change instead (sheet-grid v1.8.0:
  `edit.readOnly[col]` may be the reason text).
- Fill down on the workbook sheets (sheet-grid v1.8.0): the corner square drag and Ctrl+D (⌘D), as the supplier sheet has
  had since v1.11.0. Read-only / locked cells are skipped and counted; the note reads "Filled P6:P8 from P5: 3 cells
  changed"; Undo takes it back.
- Supplier sheet: the supplier's Update in POS tick is under POS SUPPLIER NAME (B), not POS SUPPLIER NUMBER (C); unticked
  greys both B and C. The other supplier-sheet ticks are unchanged.
- A restored session drops the old `size` / `last` keep settings (they had ticks on OUT only).

## Files
- Changed: index.html (v21.25.5), tools/pos-supplier-merge/{index.html, README.md, js/app.js v1.15.0, js/sheet-grid.js
  v1.8.0, css/merge.css v1.13.4}, docs/ARCHITECTURE.md.
- New: docs/GITHUB-RELEASE-v21.25.5.md.

## Testing done (16 Oct, headless Chromium, 15 Oct supplier rows + 13 Oct POS Database)
- OUT: 0 heading ticks; F double-click opens no editor and shows the reason; G `134` → `OBORNE / CH2 (134)` approved and
  orange; G `NOT A SUPPLIER` refused and put back; P edit then drag-fill P5 → P8 (3 cells), Ctrl+D P9:P10, O:P fill skips
  the 7 read-only O cells; Undo restores. Supplier sheet: fill handle present, ticks on B, E–O.
