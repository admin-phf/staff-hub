# Staff Hub v21.17.2 — POS New Product Check Clean v1.7.2: supplier sheet clean-up

Released 12 Oct 2026 20:15 AEDT. Based on v21.17.1.

## Commit notes

**Summary:** v21.17.2 — Supplier sheet clean-up: compact bands, two-row headings like the other tabs, fills the window

**Description:**
- IN_SUPPLIER sheet: the title, status and totals in one navy strip (how-to on the ⓘ); brands and Library buttons on one
  line; Update in POS and Discontinue in the toolbar (full wording on hover).
- Headings in two rows like the other workbook tabs: grey letters row (SUP BRAND filter), then each heading centred on up to
  two lines with its tick on one line. Same font and lines as the sheet grid.
- The sheet fills the window under the run bar: at 1880 × 1000 the first row is 253 px under the run bar (was 445) and 30
  rows show (was 19). Spare width goes to SUP PRODUCT, not every column; empty columns stay narrow.
- Pasted rows: the gold edge on INDEX stays, the + badge on every row is gone.
- Merge results unchanged.

## Files
- Changed: index.html, docs/ARCHITECTURE.md, tools/pos-supplier-merge/{index.html, README.md, css/merge.css, js/app.js}
- New: docs/GITHUB-RELEASE-v21.17.2.md

## Testing done (12 Oct real files)
- 1880, 1850, 1366 and 1024 px: no sideways scroll, no heading overflow, letters / heading centres / ticks each on one
  line; at 1850 no cell cut (STATUS in full after stage 1); at 1366 the text stays 11.5 px and only long product / brand
  text ends in …; at 1024 the text steps down and barcodes, IDs and prices stay whole.
- Update in POS: unticking SUP RRP INC GST marks the heading, the toolbar says what POS keeps, Update everything ticks it
  again; Discontinue switches off. Typing in a cell and Undo work. Run bar and SUP BRAND filter work.
- METAGENICS merge from the Library: OUT 249 / INSERT 17 / UPDATE 227, both TXT files identical to v21.17.1.
