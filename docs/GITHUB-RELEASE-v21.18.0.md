# Staff Hub v21.18.0 — POS New Product Check Clean v1.8.0: sheets like the Google Sheet, one look across the tools

Released 13 Oct 2026 09:30 AEDT. Based on v21.17.2.

## Commit notes

**Summary:** v21.18.0 — Supplier sheet totals above the columns, navy headings, OUT ticks, one button look across tools

**Description:**
- IN_SUPPLIER sheet: the totals sit in row 1 above their columns, as in the Google Sheet (A total, B supplier names, C POS
  suppliers, D barcodes, E brands, J total WS, K total RRP, P the STATUS counts); the separate strip is gone.
- Headings navy with gold text; unticking Update in POS turns that heading's text grey (the navy stays).
- Prices (J, K, N) show 2 decimals — display only, values unchanged.
- The latest message is one line in the title band (no green box). Toolbar buttons 32 px, Paste blue, the rest white.
- Pasted / typed rows are no longer amber; amber marks a value changed after it arrived.
- OUT_MERGED_DATA: Update in POS tick under every column POS can keep (same setting as the supplier sheet, recalculates
  at once); no KEPT label; coloured tiles only with Review columns; 32 px toolbar.
- Run bar messages wrap to two lines instead of being cut off.
- Build POS Master Databases v21.14.1 and Reconcile CH2 Order v2.11.1: buttons in Sentence case at one height; a finished
  step is one line with a green tick; Reconcile's result numbers in one navy strip.
- Merge results unchanged.

## Files
- Changed: index.html, assets/css/theme.css, docs/ARCHITECTURE.md, tools/database-build/{index.html, js/pipeline.js},
  tools/reconcile-ch2/index.html, tools/pos-supplier-merge/{index.html, README.md, css/merge.css, js/app.js,
  js/sheet-grid.js}
- New: docs/GITHUB-RELEASE-v21.18.0.md

## Testing done (13 Oct, real files)
- 347 CH2 rows pasted at B3: row 1 shows TOTAL 347 · SUPPLIER NAMES 1 · POS SUPPLIERS 1 · BARCODES 341 · BRANDS 6 · TOTAL WS
  $11,059.96 · TOTAL RRP $17,087.39 · Matched 271 · New 68 / Not used 3 · Unmatchable 5; no row-1 value cut at 1880, 1366
  or 1024 px; no sideways scroll. No amber after the paste; a changed product name is amber, filling an empty N is not;
  Undo clears both. Prices show 87.00 / 37.50.
- Unticked H–L headings: grey text on navy. OUT_MERGED_DATA: 35 ticks, 27 off; ticking NEW WSP EXGST there ticks J on the
  supplier sheet and the 8 WSP columns turn back (19 off). Tiles hidden in Sheet view, shown in Review columns.
- METAGENICS from the Library with RRP kept, Run all stages: POS INSERT / POS UPDATE TXT byte-identical to v21.17.2 and
  the review workbook's sheets identical.
- Build, Reconcile and the merge page: Sentence-case 32 px buttons, one-line Complete messages, Reconcile navy strip;
  all hub pages load without errors; Update in POS and cell edit / Undo tests pass.
