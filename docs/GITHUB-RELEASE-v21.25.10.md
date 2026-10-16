# Staff Hub v21.25.10 — whole checkbox cell clickable, tidier supplier toolbar (16 Oct 2026 22:30 AEDT)

**Summary:** v21.25.10 — POS New Product Check Clean v1.16.3 / sheet-grid v1.10.0: every tick box toggles when you click anywhere in its cell, the supplier toolbar leads with Paste then Undo, and Clear added rows becomes Clear Sheet with a confirm

## Commit notes
- sheet-grid v1.10.0: the grid `mousedown` toggles the tick in any checkbox cell (row numbers, pick-all header, Update in
  POS heading ticks) when you click anywhere in the cell, not only the small box; data cells still select as before. The
  sort / filter button keeps its own behaviour.
- app.js v1.16.3: the supplier sheet gets the same full-cell toggle (row pick boxes in the INDEX cell, Update in POS and
  pick-all heading ticks). Supplier toolbar reordered to Paste · Undo · Add 5 rows · Clean up empty rows · Delete rows ·
  Clear Sheet · Copy headings. "Clear added rows" renamed "Clear Sheet" with a confirmation; it still clears only the rows
  typed or pasted into the sheet (dropped supplier files and saved library files are untouched) and Undo still reverses it.
- merge.css v1.15.0: pointer cursor across the whole checkbox cell; `pointer-events:none` on the inner tick labels.

This is phase 1 of 4 of the Staff Hub UI / Excel / file-library improvements. Still to come: consistent Excel formatting
across all generated files, function-specific file libraries, and collapsible accordions for Build POS Database and POS
New Products Check.

## Files
- Changed: index.html (v21.25.10), tools/pos-supplier-merge/{index.html, README.md, css/merge.css v1.15.0, js/sheet-grid.js
  v1.10.0, js/app.js v1.16.3}, docs/ARCHITECTURE.md.
- New: docs/GITHUB-RELEASE-v21.25.10.md.

## Testing done (16 Oct, headless Chromium)
- Full-cell toggle verified on all four tick types: OUT heading tick (Update in POS) off→on by clicking the heading text;
  OUT row pick box off→on by clicking the row-number cell (row gains wbg-picked); supplier row pick box off→on via the
  INDEX cell; supplier Update in POS heading tick on→off via the heading cell. Clicking a data cell still selects it; no
  page errors.
- Supplier toolbar renders in the new order; "Clear Sheet" present, "Clear added rows" gone; the confirm dialog fires and,
  on accept, clears the 5 added rows with Undo still enabled.
