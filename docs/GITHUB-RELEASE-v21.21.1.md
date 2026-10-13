# Staff Hub v21.21.1 — pasted rows line up by their barcodes (includes v21.21.0)

Released 13 Oct 2026 21:30 AEDT. Based on v21.20.0. v21.21.0 was not committed, so this commit carries both. The
v21.21.0 details are in docs/GITHUB-RELEASE-v21.21.0.md.

## Commit notes

**Summary:** v21.21.1 — Search / add bar, fill down, M / N / O ticks, *SELL THRU*, N/A min order, pastes line up by barcode

**Description:**
- POS New Product Check Clean v1.11.1 — **pasted rows line up by their barcodes.**
  - A block copied from POS SUPPLIER NUMBER onwards and pasted at B3 used to go one column to the left. Nothing could
    match: every row came out UNMATCHABLE / IDENTITY REVIEW.
  - A pasted block of 6+ columns now goes where its barcodes land in D, whether you click B3, C3 or use the Paste
    button. The message says where it went.
  - A block with no barcode column is flagged straight away.
- **v21.21.0 — supplier sheet:**
  - A wide search / add bar that starts with the supplier: barcode first, then brand / Sub ID / product / WS; Add or
    Enter adds the row. Plain text still searches every column.
  - Add 5 rows and Clear empty rows.
  - Fill down: drag the corner square of a cell, or press Ctrl+D.
  - Ctrl+C copies on every sheet.
  - New ticks: M (stock in → a new product's pos soh), N (discount price used or not) and O (price levels 1–5, member
    pricing from O / the brand flags / POS).
- **v21.21.0 — elsewhere:**
  - The OUT_MERGED_DATA ticks are back.
  - " \*SELL THRU\*" on SUP PRODUCT for CH2 lines that say so in Description 2. It stays out of descr / pos desc.
  - Min order "N/A" stays on the sheets and becomes 1 / POS's own min order in the POS files.
  - A discontinued member-brand product keeps POS's 90% price level 1.
  - No lines between the supplier sheet's bands.
  - Build v21.14.3 (supplier-layout v1.1.0).

## Files
- Changed: index.html, docs/ARCHITECTURE.md, tools/database-build/{index.html, js/pipeline.js, js/supplier-layout.js},
  tools/pos-supplier-merge/{index.html, engine-frame.html, README.md, css/merge.css, js/app.js, js/engine-host.js,
  js/engine-worker.js, js/sheet-grid.js}
- New: docs/GITHUB-RELEASE-v21.21.0.md, docs/GITHUB-RELEASE-v21.21.1.md
- Delete by hand (still in the repo): tools/database-build/js/size-worker.js

## Testing done (13 Oct, real files)
- **The block from POS SUPPLIER NUMBER onwards** (347 CH2 rows, no name column):
  - Clicked B3 and pasted: it went in at C3, with the message "Pasted at C3 (not B3 — lined up so the barcodes are in
    D)".
  - Run all stages: Matched 271 · New 68 · Not used 3 · Unmatchable 5. This is the same result as the correctly laid-out
    rows; the names were filled in at stage 1.
  - With the Paste button (no cell selected): "347 rows added as columns C–L".
- **Pastes that should not move:**
  - The full B–L block at B3 stays at B3.
  - Two prices pasted at J3 stay at J3.
- **v21.21.0 tests** (see its release notes) were run on this code.
