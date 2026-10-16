# Staff Hub v21.25.11 — collapsible panels and one consistent Excel look (17 Oct 2026 00:20 AEDT)

**Summary:** v21.25.11 — collapsible accordion panels across Build POS Master Databases and POS New Product Check, and one shared Excel style (the POS SUPPLIER look) across every generated workbook, with spaced headings on the review sheets

## Commit notes
- Accordions: new shared `assets/js/phf-accordion.js` + accordion styles in theme.css. Any panel marked `data-acc`
  collapses to its heading (click the heading); the badge / status stays visible as the summary and the open / closed
  state is remembered in this browser. Applied to the input, readiness, stage and output panels of Build POS Master
  Databases and POS New Product Check. Expanding / collapsing never resets inputs, interrupts a build or touches saved
  files. The primary actions (Build all / Run all) and the selected-input workspace stay open.
- Excel formatting: new shared `assets/js/phf-xlsx-style.js` holds one style profile taken from the preferred POS SUPPLIER
  workbook — navy row-1 totals band / gold text, light row-2 header / dark text, Calibri 9, banded rows, column widths by
  heading, freeze top two rows, filter from row 2. pipeline.js (POS / CH2 / Unique full sets) and master-core.js (full /
  selected / To-Order master + Match_Audit / Links_To_Check) now use it, so every generated workbook matches the merge
  tool's review workbook.
- Headers: on the review / display sheets the headings show with spaces (MASTER_BRAND → MASTER BRAND); the POS-import and
  supplier-layout sheets that scripts re-read keep their exact identifiers. The underlying columns, order, values and
  formulas are unchanged — formatting only. Every reader (the merge tool, Reconcile) already treats underscores and
  spaces the same, so nothing downstream changes.

This is phases 2 and 4 of the Staff Hub UI / Excel / file-library work (checkboxes + toolbar shipped in v21.25.10). Still
to come: function-specific file libraries and a tidier homepage (phase 3).

## Files
- Changed: index.html (v21.25.11), assets/css/theme.css (v20.2.0), tools/database-build/{index.html, js/pipeline.js v21.16.0,
  js/master-core.js v2.6.0}, tools/pos-supplier-merge/{index.html, README.md, js/app.js v1.16.4}, docs/ARCHITECTURE.md.
- New: assets/js/phf-accordion.js, assets/js/phf-xlsx-style.js, docs/GITHUB-RELEASE-v21.25.11.md.

## Testing done (17 Oct, headless Chromium + Node)
- Accordions on both tools: panels collapse / expand by clicking the heading, the body hides while the badge stays
  visible, stage cards collapse with their status badge shown, and the state survives a reload. The workbook grids below
  the merge stages still render and the checkbox ticks still work. No page errors.
- Excel (master-core, run in Node with the real modules): the full master now writes row-1 navy / gold totals, a light
  E9F0F5 header with dark 2C3E50 Calibri 9 text, spaced headings (MASTER BRAND, POS INDEX, WSP CHANGE PCT), banded rows,
  freeze H3 and filter from row 2 — data values unchanged (ACME / BONVIT sample rows intact).
- The shared profile's widths / display names / palette verified in the browser (18 / 36 / 48 / 7 / 11; MASTER_BRAND →
  MASTER BRAND; Calibri; navy 1E3A5F / gold FFD966 / header E9F0F5 / 2C3E50).
- Merge-tool regression unchanged: 3,174 OUT rows, 1,754 matched / 195 new / 35 review, 0 description changes vs the prior
  build (its writer was not touched).
- The legacy standalone ch2.html / uhp.html / master.html pages (not linked from the hub) were left as-is.
