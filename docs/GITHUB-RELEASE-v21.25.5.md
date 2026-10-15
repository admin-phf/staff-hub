# Staff Hub v21.25.5 — merge: no OUT ticks, read-only POS columns, fill down, sell-through, forms (16 Oct 2026 09:30 AEDT)

**Summary:** v21.25.5 — POS New Product Check Clean v1.15.0: OUT_MERGED_DATA ticks removed (updated columns go to POS, edit to override), read-only POS columns, fill down on every sheet, supplier tick on B + C; engine-host v1.7.0 sell-through `*` + NOTES, LTR / PWD forms, no WOMEN'S … WOMEN

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
- Supplier sheet: a tick on every heading except INDEX, SUP BARCODE and STATUS — the supplier's tick shows under both POS
  SUPPLIER NAME (B) and POS SUPPLIER NUMBER (C) as one setting (unticked greys both). Ticked = the column goes into the
  merge / POS files; unticked = matched products keep POS's value (unchanged meaning).
- engine-host v1.7.0 (the Apps Script files are unchanged):
  - Sell-through: the note on SUP PRODUCT in any form (`*SELL THRU*`, `*SELL THROUGH, NEW SKU 2959733*`, bare `SELL
    THROUGH`) is read off before matching / descriptions, so no `SELL` or SKU number leaks into POS DESCR (WELEDA NAIL CRM
    50ML 2893931 → WELEDA HND NAIL CRM CITRUS 50ML *). After stage 2 / Refresh the row's POS DESCR ends with `*` (kept in
    descr / pos desc), Q shows the note, NOTES (AF) gets `SELL THROUGH — new SKU 2959733`. Keyed by supplier barcode, with
    the product text only when every row with that name has the note (EAGLE TRESOS B PRO 60T: old barcode marked, the
    replacement SKU not).
  - Forms: litres → LTR in SIZE / itemsize and POS DESCR (1L / 1LT / 1 LITRE → 1LTR; LT then L when LTR breaks the 35
    characters). POWDER products carry PWD in POS DESCR (ORAL → PWD, else before the size when it fits); the rest get an
    upload check "Powder without PWD in the description" (13 on the 15 Oct rows).
  - `m13DP5EnsureMustKeepFromQ_` wrapped: a word the pass re-adds is dropped when the description already has it as a
    possessive (WOMEN'S / MEN'S / CAT'S) — BIOC WOMEN'S ESS 120C, EA CAT'S CLAW ECHINE 60T.
- A restored session drops the old `size` / `last` keep settings (they had ticks on OUT only).

## Files
- Changed: index.html (v21.25.5), tools/pos-supplier-merge/{index.html, README.md, engine-frame.html, js/app.js v1.15.0,
  js/sheet-grid.js v1.8.0, js/engine-host.js v1.7.0, js/engine-worker.js v1.7.0, css/merge.css v1.13.4}, docs/ARCHITECTURE.md.
- New: docs/GITHUB-RELEASE-v21.25.5.md.

## Testing done (16 Oct, headless Chromium, 15 Oct supplier rows + 13 Oct POS Database)
- OUT: 0 heading ticks; F double-click opens no editor and shows the reason; G `134` → `OBORNE / CH2 (134)` approved and
  orange; G `NOT A SUPPLIER` refused and put back; P edit then drag-fill P5 → P8 (3 cells), Ctrl+D P9:P10, O:P fill skips
  the 7 read-only O cells; Undo restores. Supplier sheet: fill handle present, ticks on B, E–O.
- Merge run (13 Oct POS Database + 15 Oct supplier rows, discontinue off) against the v1.14.10 baseline: same 1,754 /
  195 / 35 / 1,190 counts; UPDATE TXT differs only on the LTR rows, the five sell-through rows (`*`), the four
  WOMEN'S / MEN'S rows and CAT'S CLAW; INSERT TXT on the LTR rows and the EAGLE sell-through row. 13 "Powder without PWD"
  checks, 8 descr fixes. Supplier sheet: ticks on B, C, E–O; unticking B unticks C.
