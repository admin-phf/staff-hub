# Staff Hub v21.25.7 — merge: sort menus, row tick boxes, no INDEX column, discount % (16 Oct 2026 17:30 AEDT)

**Summary:** v21.25.7 — POS New Product Check Clean v1.16.0: every column menu sorts (A–Z / highest–lowest), tick boxes with Delete rows on OUT_MERGED_DATA / SRC tabs / supplier sheet, no INDEX column, OUT toolbar simplified, plain supplier search bar, SUP DISCOUNT PRICE is a discount %

## Commit notes
- sheet-grid v1.9.0: the column menu has sort links above the value list — A to Z / Z to A, or Highest to lowest / Lowest
  to highest when most cells are numbers (view-only; ▲ / ▼ on the heading; Sort off). `create(host, { pick: true })` puts a
  tick box in every row number and one in the corner; Delete rows deletes the ticked rows first, else the selected rows.
  `edit.rows: 'delete'` = delete only (no Add / new row).
- app.js v1.16.0: OUT_MERGED_DATA grid created with `search: true, pick: true` and `rows: 'delete'`; the row status /
  price status / brand dropdowns and Reset are removed from index.html and the code; the app's search box shows only in the
  Review columns view. INDEX / POS INDEX columns are left out of every grid's `cols` (`isIndexHead`). The wb grid (SRC / POS
  tabs) is created with `pick: true` (POS tabs keep their Upload ticks — pick is off where rowFlags are on).
- Supplier sheet: `supFindSpec` is a plain text search (no `|` row form, no Add button, no prefill); "Clean up empty rows";
  a tick box in the INDEX cell of every row (`supView.picked`, by row object) and in the heading for every row shown;
  `deleteSelectedRows` deletes the ticked rows first; the button reads "Delete n ticked rows"; column A is 20 px wider.
- engine-host v1.7.2: `discountToPrice(v, wsp)` — the `m13ColVal_` / `hbbColVal_` hook turns SUP DISCOUNT PRICE into the
  price the script expects (WSP × (1 − N/100); 0.15 → 15 %; "15%" accepted; ≤ 0, ≥ 100 or no WSP → ''). Tick tip reads
  "Discount %".
- merge.css v1.14.0: `.wbg-psort`, `.wbg-sortmark`, `th.wbg-sorted`, `.wbg-rpick` / `.wbg-pick-all`, `tr.wbg-picked`,
  `.sup-pick`, `tr.is-picked`.

## Files
- Changed: index.html (v21.25.7), tools/pos-supplier-merge/{index.html, README.md, engine-frame.html, js/app.js v1.16.0,
  js/sheet-grid.js v1.9.0, js/engine-host.js v1.7.2, js/engine-worker.js, css/merge.css v1.14.0}, docs/ARCHITECTURE.md.
- New: docs/GITHUB-RELEASE-v21.25.7.md.

## Testing done (16 Oct, headless Chromium)
- 16 Oct files (POS set from the 16 Oct master, CH2 + Unique full sets, 15 Oct references): 14,529 supplier rows → 20,036
  OUT rows, 2,850 INSERT / 9,495 UPDATE, 224 s, no errors.
- 15 Oct rows: supplier sheet search bar plain, no Add button, "Clean up empty rows", 77 tick boxes + corner box; tick two
  → "Delete 2 ticked rows" → 3,125 → 3,123 rows, Undo back; search WELEDA 279 of 3,125. OUT: first heading ROW STATUS (no
  INDEX), no dropdowns, grid search shown, app search hidden; 62 tick boxes, Add hidden, Delete shown; PRICE STATUS menu
  A to Z / Z to A, Z to A sorts and marks the heading ▼; NEW WSP EXGST menu Highest to lowest → $557.87, $354.20, $247.31;
  tick two rows → "Delete 2 ticked rows" → 3,174 → 3,172, Undo back. INSERT tab: first heading main id (no POS INDEX),
  Upload ticks kept, no pick boxes; SRC_POS_FIND_REPLACE: first heading SUP FIND, 67 pick boxes.
- Discount %: PRANAON rows with 15 in N → NEW LAST PRICE = 0.85 × WSP on every row; no holds.
