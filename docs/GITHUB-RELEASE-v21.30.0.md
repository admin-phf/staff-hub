# Staff Hub v21.30.0 — Saved-Files-style generated-file rows, drop anywhere on the rail, REQUIRED-style CLEAR pills, Reconcile result toolbar with step pills (20 Oct 2026 14:20 AEDT)

**Summary:** v21.30.0 — six polish points across all three tools: the apple home link on the sticky strip loses its white disc; every CLEAR button is now the small pink REQUIRED-style pill, and the rail's clear buttons sit side by side; generated-file rows use exactly the Saved Files row (tick · bold name · filename · time made · size · notes · Download) in Build POS Master, POS New Product Check Clean and Reconcile; a file dropped anywhere on the INPUT FILES panel is recognised and assigned like Drop All (dropping on a row still targets that row); and the Reconcile result toolbar uses the strip's button styles with the three step pills in a row above it, while step 3 lists the four exports as rows. No change to any build, merge, reconciliation, output, download, storage or Library behaviour.

## Commit notes
- Home link: transparent, no disc — just the apple; gold ring on hover / keyboard focus.
- CLEAR buttons (CLEAR SESSION / RESULTS / FILES, CLEAR INPUT FILES, CLEAR SESSION FILES, CLEAR SAVED REFERENCE, CLEAR ORDER FILES, CLEAR ALL INPUT FILES, CLEAR QTY): one pill matching the REQUIRED badge — pink fill, red text and line, small caps, auto width. The rail's buttons are a side-by-side row in every tool. All handlers kept (Build POS Master's Clear session still confirms).
- Generated-file rows: the same markup and look as a Saved Files row in all three tools, with the time the file was made. Warning text stays on its own line; every Download kept. Reconcile step 3 lists POSActive import (.txt), Full reconciliation (.xlsx), Full reconciliation (.csv) and POS key review (.csv) as those rows once a run exists — each Download runs the same code as its toolbar button; before a run the placeholder remains.
- Drop anywhere on INPUT FILES: the whole rail is a drop target with a gold "Drop to add input files" ring; the files go through the same recognise-and-assign path as Drop All. Dropping on an input row still loads that row; the browser never opens the file.
- Reconcile result toolbar: downloads are the gold strip pills, Tick all / Remove not supplied / view toggles are outlined pills (active view navy), Clear qty is the pink pill; the search box is unchanged. A row with the ① Check inputs ② Reconcile ③ Export files pills sits directly above the toolbar and stays in sync with the strip.
- Shared CSS phf-ui.css v1.2.0; tool stylesheets untouched.

## Files
- Changed: index.html (hub v21.30.0, stamp); assets/css/phf-ui.css (v1.2.0); tools/database-build/index.html (v21.20.0, busters), js/pipeline.js (VERSION v21.20.0 — libRow, wireRailDrop); tools/pos-supplier-merge/index.html (v1.20.0, busters), js/app.js (TOOL_VERSION v1.20.0 — libRow, wireRailDrop); tools/reconcile-ch2/index.html (v2.14.0, busters), js/ui/workspace.js (v2.14.0 — export rows, result steps, toolbar classes, wireRailDrop); docs/ARCHITECTURE.md; docs/GITHUB-RELEASE-v21.30.0.md (new).
- Unchanged: master-core.js, the merge engine and Apps Script files, reconcile core / parsers / export builders, hub-library.js, phf-library.js, the merge workbook.

## Tests run (20 Oct, headless Chromium, empty lock config, stubbed xlsx / ExcelJS / pdf.js / JSZip)
- All three tools: zero console or page errors; strip sticky at top 0 after scroll; home link background transparent with no border; every CLEAR pill computes the pink fill and is not full width; two-button rails share one row.
- Build POS Master: a seeded generated-file row has the identical class list and six grid columns as a real Saved Files row; a synthetic drop of the real uhp_products_export.xlsx on the rail (outside any row) loads the Unique row and leaves the Drop-All list empty.
- Reconcile: three step pills above the result toolbar carrying data-run-step; downloads carry the gold pill class; active view navy; Clear qty pink; step-3 placeholder present before a run.

## Not verified (sandbox limits — please check on first use)
- Real builds / merges / a real reconciliation run; generated-file rows with real times and warnings (only a seeded row); Reconcile export rows after a genuine run and their sizes; the drag highlight in a real browser (synthetic events only); the rail pills' wrap below ~820 px.
