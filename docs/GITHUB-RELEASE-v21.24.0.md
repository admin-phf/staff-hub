# Staff Hub v21.24.0 — POS New Product Check Clean v1.14.0: CURRENT / NEW ticks, item size from SIZE, Ctrl + arrow

Released 14 Oct 2026 10:30 AEDT. Based on v21.23.0 (same morning, not yet committed — one commit can carry both; its notes
are in docs/GITHUB-RELEASE-v21.23.0.md).

## Commit notes

**Summary:** v21.24.0 — OUT_MERGED_DATA ticks only on CURRENT / NEW pairs, last price its own tick, item size to POS from SIZE, SIZE gaps filled, Ctrl + arrow

**Description:**
- **Ticks only where there is a choice.** On OUT_MERGED_DATA each CURRENT / NEW pair carries one tick: supplier
  (POS SUPPLIER / UPDATED SUPPLIER), brand (POS BRAND / SUP BRAND), description (ORIGINAL POS DESCR / POS DESCR),
  WSP, last price and RRP. Tick NEW = the merge's value goes to POS; tick CURRENT = POS keeps its own for matched
  products. The internal columns (WSP CHANGE %, CHANGE $, WSP TO RRP MARKUP %, +6.5 %, CURRENT WSP TO RRP, RRP /
  MARKUP OVERRIDE, FINAL SHELF RRP) and the final POS block have no ticks any more.
- **Last price has its own tick** (it was tied to the WSP tick): the WSP can update while POS keeps its last price, or the
  reverse. On the supplier sheet J covers the WSP only.
- **Item size goes to POS** from SIZE (AL), as written — 1KG, 300G, 60C, 20X5G — for new and matched products, with a tick
  on the SIZE heading (unticked: matched products keep POS's item size, new products get none). Discontinued products keep
  POS's.
- **SIZE gaps filled** from SUP PRODUCT, then POS DESCR: 60S, 60TB, 60CHEW, 50 GUMMIES, 90 VEGIECAPS, 30CA, 70MLS, 2LB,
  3PK, 1PC, 30 X SACH, 20 X 5G; a SIZE that is not a size (1000MG VITAMIN C, CONTAINS: …) is blanked. Weight / volume
  beats a count beats a dose (COQ10 150MG 60C → 60C).
- **Ctrl + arrow** (⌘ + arrow) jumps to the edge of the data on every sheet, Ctrl + Shift + arrow extends the selection.

## Files
- Changed: index.html, docs/ARCHITECTURE.md, tools/pos-supplier-merge/{index.html, engine-frame.html, README.md,
  js/app.js, js/engine-host.js, js/engine-worker.js, js/sheet-grid.js}
- New: docs/GITHUB-RELEASE-v21.24.0.md
- Delete by hand (still in the repo): tools/database-build/js/size-worker.js

## Testing done (14 Oct, the same files as v21.23.0, against the v21.23.0 outputs)
- **Default ticks, Discontinue on:** INSERT 158 rows and UPDATE 2,991 rows — the same rows; the only field that differs is
  item size: 152 of 158 INSERT rows and 1,757 of 2,991 UPDATE rows now carry it (10ML, 60T, 15LT, 500G, 1KG …); 6 INSERT
  rows and the discontinued rows stay 0. Nothing else in either file changed. The upload checks are unchanged (35 / 109
  held).
- **SIZE:** blank SIZE rows 400 → 192 (the 192 have no size: books, kits, packs, sprays, and discontinued names POS cut
  off). No SIZE left that is not a size.
- **CURRENT last price ticked:** the UPDATE file keeps POS's last price on 787 rows and still updates the WSP; the PRANA
  15.00 rows are no longer held (they now carry POS's last price). **SIZE unticked:** item size 0 on every INSERT row and
  POS's on the UPDATE rows. Nothing else moved in either test.
- **Ctrl + arrow:** end of a filled run, next filled cell, sheet edge — on OUT_MERGED_DATA, the POS tabs and the supplier
  sheet.
- **Unchanged:** stages 1–2 (OUT_MERGED_DATA identical except AL / BR), the Apps Script files, the TXT layout.
