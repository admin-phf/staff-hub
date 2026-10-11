# Staff Hub v21.14.0 — POS New Product Check Clean v1.6.0

Released 12 Oct 2026 10:30 AEDT. Based on v21.13.1.

## Commit notes

**Summary:** v21.14.0 — POS New Product Check Clean v1.6.0: session kept in the browser, filters at every step, Update in POS ticks

**Description:**
- The whole session is kept in this browser: POS Database, Supplier Updates (with edits and the brand filter), the stage
  results with your edits, the TXT files and the options come back when the page opens — until Clear Results, Clear
  session files or a new run.
- Filters decide what is processed: a SUP BRAND filter on the supplier sheet merges only those brands (stages 1–2);
  filtered OUT_MERGED_DATA rows make stage 3 use only the rows shown; a filtered OUT_POS_INSERT / UPDATE tab makes Export
  TXT again use only its rows shown. Column filters take several values, like the Google Sheet.
- Update in POS ticks on the supplier headings: untick a column and POS keeps its current value for matched products —
  SUP RRP INC GST keeps RRP, price levels 1–9 and ret price exactly as they are (no new labels); SUP SUB ID, SUP BRAND,
  SUP UNITS IN PACK / MIN ORDER WS (box lots), SUP WS EXGST, SUP PRODUCT, SUP GST and POS SUPPLIER NUMBER likewise.
  Matched products that end up the same as POS are left out of the POS UPDATE file.
- "Discontinue POS products of these brands that are not in the supplier rows" can be turned off.
- The merge script (v6.3.89) is unchanged; the options are applied around it (engine-host v1.2.0).

## Files
- Changed: index.html (hub version and tile), docs/ARCHITECTURE.md, tools/pos-supplier-merge/{index.html, README.md,
  engine-frame.html, css/merge.css, js/app.js, js/engine-host.js, js/engine-worker.js, js/sheet-grid.js}
- New: docs/GITHUB-RELEASE-v21.14.0.md
- No Apps Script changes.

## Testing done
- 11 Oct Google Sheet download: Run All as before (OUT 347, INSERT 6, UPDATE 327); untick SUP RRP INC GST → UPDATE 260
  (117 matched with POS RRP / levels exactly, 67 unchanged left out); Discontinue off → UPDATE 117; every column unticked →
  only discontinued rows; OUT filtered to BIOCEUTICALS + BIOCEUTICALS CLINICAL → stage 3 from those 178 rows; Export TXT
  again with only some UPDATE rows; full export identical to before.
- SUP BRAND filter BIOCEUTICALS (BioCeuticals + BIOCEUTICALS, 268 rows) → merge of that brand only.
- Reload: results, edits, TXT files, ticks and the brand filter come back; stage 3 runs again without stages 1–2; a
  brand filter changed before the reload makes the next run merge only the new brands; Clear Results → only the inputs
  come back. Engine dump / restore checked in Node (OUT identical, same TXT after restore, edits work after restore).
- Large merge (14,877 supplier rows → OUT 19,649 / INSERT 2,708 / UPDATE 15,784, 155 s): session saved in 2.6 s and back
  in about 20 s on reload.
- Earlier tests still pass (sheet editing, Export TXT again, SRC edits, review workbook, development prompt).
