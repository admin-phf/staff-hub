# Staff Hub v21.35.1 — POS New Product Check Clean no longer shows READY when the Supplier Updates are the POS's own products (22 Oct 2026 08:20 AEDT)

**Summary:** v21.35.1 — the Supplier Updates still held the POS's own 34,285 products. They were POS New Product Check Clean's own saved copy from the 20 Oct run, so the v21.35.0 Library clean-up didn't reach them. The page still showed READY and only asked at Run. POS New Product Check Clean v1.23.1 removes a supplier file named clean_merged_pos_data… when it comes back from the saved session. When 90% or more of the supplier rows are copies of POS Database rows, the page is not ready to run: the Supplier Updates row turns INCOMPATIBLE, the steps stay WAITING and the status line explains why. The Supplier Updates panel offers Remove the POS copies or Use these rows anyway; there's no pop-up any more.

## Changes — POS New Product Check Clean v1.23.1
- **On open, a supplier file named clean_merged_pos_data…** (the POS Database, or its products in the A–P layout) that comes back from the saved session is removed. The status line names it: "Removed from Supplier Updates: … — the POS's own products, not a supplier file." Dropping that file was already refused (v1.22.0), but a copy loaded before then kept coming back.
- **POS copies block the run as soon as both are loaded.** This applies when 90% or more of the supplier rows (and at least 50) have the same barcode and description as a POS Database row, whatever the file is called and including pasted rows. Then:
  - the Supplier Updates row is INCOMPATIBLE (yellow) and the steps stay WAITING
  - Run all and the stage buttons are off
  - the REQUIRED badge turns amber
  - the status line reads "Not ready — 34,283 of 34,285 supplier rows (100%) have the same barcode and description as a POS Database row …". The "Files assigned" and "loaded" messages no longer show green in that case.
- **Supplier Updates panel.** The notice explains, with two buttons:
  - **Remove the POS copies** removes the supplier files that are 90% or more copies, and keeps a genuine CH2 / Unique set loaded alongside.
  - **Use these rows anyway** is for a real supplier file that matches the POS that closely. It holds until those rows or the POS Database change; reloading the page asks again.
- The "Check the Supplier Updates before running" browser question at Run is gone; the block replaces it.

## Files
- Changed: index.html (hub v21.35.1); tools/pos-supplier-merge/index.html, js/app.js, css/merge.css (v1.23.1); docs/ARCHITECTURE.md; docs/GITHUB-RELEASE-v21.35.1.md (new).
- Unchanged: the merge engine, merge-map.js, the Apps Script files, every merge and export routine, the other tools.

## Tests run (22 Oct, headless Chromium, real files)
- **Renamed POS file.** POS Database from the Library + Product Prefixes, POS Suppliers, Find & Replace + "my supplier rows.xlsx" (the POS A–P file renamed, 34,285 rows):
  - Supplier Updates INCOMPATIBLE, steps WAITING, Run all off, badge amber, and the status gave the 34,283 of 34,285 (100%) reason.
  - Its panel showed the notice and both buttons.
- **Use these rows anyway** → READY, and the status said to check the results. After a reload it was blocked again.
- **Remove the POS copies** → the file was removed, with "Removed from Supplier Updates: my supplier rows.xlsx (the POS's own products)", and Supplier Updates showed as missing.
- **Real CH2 set.** + Add CH2 set (9,682 rows) → READY, not blocked. A full merge with it gave all three stages DONE, the POS INSERT / POS UPDATE rows named correctly, and zero page errors.
- **Restored file name.** The saved session's supplier file was renamed to clean_merged_pos_data_pos_db_20.10.26.xlsx and the page reopened. The file was removed on open and the status named it.
- Zero page errors.

## Not run
- Chrome on his PC.
