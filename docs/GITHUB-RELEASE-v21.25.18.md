# Staff Hub v21.25.18 — Reconcile auto-loads POS from the Library, chevrons everywhere, tidier supplier toolbar (19 Oct 2026 00:30 AEDT)

**Summary:** v21.25.18 — Reconcile CH2 Order now finds the POS Database in the browser Library automatically (it no longer says "POS / master missing" when the full set is already saved), every panel on every tool (including Reconcile and the file-editor panel) has the gold chevron, and the supplier toolbar's search box is shortened so the buttons sit on one row

## Commit notes
- Fix: Reconcile CH2 Order auto-loads its POS reference from the browser Library even without a full Combined Master build.
  It now uses the merged master (posMaster) when present, otherwise the POS Database full set (lib:pos-db) — both have the
  POS columns it needs. Before, Reconcile only recognised the merged master, so it showed "Reference data is not ready …
  POS / master required missing" even though the POS full set was saved in the Library.
- Chevrons everywhere: the collapsible accordion is now on Reconcile CH2 (Drop-all-files, Input readiness, the Reconcile
  stage card, Generated output files) and on the selected-input editor panel on both dashboard tools — so every panel on
  every page has the same gold chevron, consistently. The arrow is centred in its circle.
- Supplier toolbar: the search box is now a compact fixed width (280px) instead of full-width, so Paste, Undo, Add 5 rows,
  Clean up empty rows, Delete rows, Clear Sheet and Copy headings all sit on one row to its right (wrapping only on narrow
  windows).
- Confirmed every dashboard page reflows cleanly on resize — no horizontal page scroll at 1920 / 1440 / 1280 / 1024.

## Files
- Changed: index.html (v21.25.18), assets/js/phf-accordion.js (v1.2.1), assets/css/theme.css (v20.4.1),
  tools/database-build/{index.html, js/pipeline.js v21.16.2}, tools/pos-supplier-merge/{index.html, js/app.js v1.16.6,
  css/merge.css v1.16.0}, tools/reconcile-ch2/{index.html, js/reference/reference-data.js v2.12.0, js/ui/workspace.js
  v2.12.0}, docs/ARCHITECTURE.md.
- New: docs/GITHUB-RELEASE-v21.25.18.md.

## Testing done (19 Oct, headless Chromium)
- Reconcile: with only the POS Database full set (lib:pos-db) + Ongoing Discounts seeded in the Library and no merged
  master, the reference status now reads "Ready · clean_merged_pos_data.xlsx" and the banner moves from "Reference data is
  not ready" to "Add one POS order and at least one supplier invoice" — the auto-load fix works. Reconcile shows 5
  chevrons (Drop-all, readiness, stage, outputs, library).
- The selected-input editor panel gets a chevron on both tools, collapses (hiding the dropzone), and re-enhances each time
  a different input is selected.
- Supplier toolbar: the search box measures 280px and the Paste button sits on the same row as the search (same top);
  screenshot confirms all buttons on one row with UPDATE IN POS on the right.
- Responsive: 0px horizontal overflow at 1920 / 1440 / 1280 / 1024 on Build POS Master Databases, POS New Product Check
  Clean and Reconcile CH2 Order. All five pages load with no console errors.
