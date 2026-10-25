# Staff Hub v21.45.0 — Build POS Master Databases opens with the shop folder in about 10 seconds, not 35–40 (25 Oct 2026 11:15 AEDT)

**Summary:** v21.45.0 — Build POS Master Databases recognises its files from their headings, so the shop folder's 9 files are ready in about 10 seconds instead of 35–40.
- **Faster recognition:** each file is read in full only once, when you build. Before, every file was read in full just to recognise it, then read again to build.
- **Row counts:** the CH2 pricelist, Stock On Hand and Unique files show their row counts in Status once built. Until then, Status reads "… recognised from its headings (rows counted at build)."
- **Same results:** recognition and checking give the same answers as before (16 files tested: same 8 assigned, same 8 to review; right and wrong files on their rows give the same result).
- **Outputs unchanged.**

This release also carries **v21.44.2**, if that hasn't been committed yet (see docs/GITHUB-RELEASE-v21.44.2.md):
- Reconcile's ✕ works every time.
- Reconcile stays fast after the other tools open.
- There are no false UPDATED rows.

## Build POS Master Databases v21.27.0
- **Recognising a file** (shop folder, Drop all, a drop on its row, or a saved reference file from the Library) reads the first 200 rows of each sheet. Every heading search in the tool looks within the first 120 rows, so the decision is the same as reading the whole file.
- **Building** reads each file in full, as before. The file's Status then shows its row count, for example "CH2 pricelist recognised (9,682 rows)."
- **Status before building:**
  - CH2 pricelist, CR666a Stock On Hand and Unique / UHP: "… recognised from its headings (rows counted at build)."
  - The other files' messages never had counts and are unchanged.

## Versions
- Hub v21.45.0; Build POS Master Databases v21.27.0 (pipeline.js ?v=21.27.0).
- Unchanged since v21.44.2: Reconcile CH2 Order v2.26.2, POS New Product Check Clean v1.28.2, phf-library.js 1.2.1.

## Files (all changed since v21.44.1, the last commit)
- Changed:
  - index.html
  - assets/js/phf-library.js
  - tools/reconcile-ch2/index.html, js/ui/workspace.js
  - tools/database-build/index.html, js/pipeline.js
  - tools/pos-supplier-merge/index.html, js/app.js
  - docs/ARCHITECTURE.md
- New: docs/GITHUB-RELEASE-v21.44.2.md, docs/GITHUB-RELEASE-v21.45.0.md.

## Tests run (25 Oct, headless Chromium, the shop folder's real files)
- **Opening with the shop folder linked:** 36–40 s → 10.7–11.2 s (this test machine; a shop PC may differ). All 9 files assigned, none shown as UPDATED.
- **Drop all with 16 files** (the 9 inputs, 4 POS New Product Check Clean files, an order, an invoice PDF and a POS Database): 25.3 s → 8.4 s.
  - Same 8 assigned and same 8 to review, with the same messages apart from the row counts.
- **A file dropped on a row:** 10 tries, 3 right and 7 wrong. For example, the CH2 pricelist on Stock On Hand, BrowseStockItems1 on Product Insert Template, and Weight & Dimensions on Ongoing Discounts. Each gave the same result as v21.44.1: loaded, or INCOMPATIBLE with the same reason.
- **Build All:**
  - 123–128 s; afterwards Status shows "CH2 pricelist recognised (9,682 rows)", "CR666a SOH structure recognised (19,873 rows)" and "Unique / UHP structure recognised (4,847 rows)", the same as v21.44.1.
  - All 8 saved outputs are cell-for-cell identical to the earlier build, and the master (38,291 rows) is identical.
- Zero page errors.

## Not run
- Real Chrome on Windows with Google Drive for desktop.
