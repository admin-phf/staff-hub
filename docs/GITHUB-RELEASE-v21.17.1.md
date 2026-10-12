# Staff Hub v21.17.1 — supplier sheet columns sized to content, aligned headings, sticky run bar; home page back

Released 12 Oct 2026 19:30 AEDT. Based on v21.17.0 (+ the "password" commit).

## Commit notes

**Summary:** v21.17.1 — Supplier sheet columns sized to their content, aligned headings, sticky run bar; index.html restored

**Description:**
- index.html (the Staff Hub home page) is back — the "password" commit deleted it. phf-lock-config.js is untouched.
- POS New Product Check Clean v1.7.1, supplier sheet: every column is as wide as what it holds (INDEX with its + tag,
  every price, barcode and ID in full; empty columns narrow), the room left is shared, and on a narrow window SUP PRODUCT,
  names and STATUS give way before any number. Still no sideways scroll.
- Headings line up: column letters on one line, each heading centred in one band, the Update in POS ticks on one line.
- Run bar right above the workbook, sticky at the top of the window while scrolling, on every tab: 1 Highlight + Best
  Buy, 2 Build OUT_MERGED_DATA, 3 Insert + Update & Export (the same runs as the stage cards), each with its state, and
  the run status.
- Merge results unchanged.

**Delete in the repository (left over from v21.17.0):** `tools/database-build/js/size-worker.js`

## Files
- Changed: index.html (restored), docs/ARCHITECTURE.md, tools/pos-supplier-merge/{index.html, README.md, css/merge.css, js/app.js}
- New: docs/GITHUB-RELEASE-v21.17.1.md

## Testing done (12 Oct real files)
- CH2 + Unique full sets + 2 pasted rows (14,531 rows): at 1850 px no cell cut short (after stage 1 too, STATUS in full);
  at 1366 px only long SUP PRODUCT / SUP BRAND text ends in …; at 1024 px the text steps down a size and barcodes, IDs and
  prices stay whole; INDEX shows +14531 in full; no sideways scroll at any width; heading letters, label centres and ticks
  each on one line.
- Run bar: stays at the top of the window when scrolled (0 px), stage 1 and 2 run from it (cards and bar both DONE), shows
  on the OUT_MERGED_DATA tab. Typing in a cell and Undo work.
- METAGENICS merge from the Library: OUT 249 / INSERT 17 / UPDATE 227, both TXT files identical to v21.17.0.
