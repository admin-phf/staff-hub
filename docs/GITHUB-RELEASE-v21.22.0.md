# Staff Hub v21.22.0 — POS New Product Check Clean v1.12.0: TYPE is the packaging POS gets, TYPE review (includes v21.21.1)

Released 13 Oct 2026 22:30 AEDT. Based on v21.21.0. v21.21.1 (pasted rows line up by their barcodes) was not committed, so
this commit carries it too. Its notes are in docs/GITHUB-RELEASE-v21.21.1.md.

## Commit notes

**Summary:** v21.22.0 — TYPE goes to POS as packaging, sachet / stick / tea types fixed, pastes line up by barcode

**Description:**
- **TYPE is the packaging POS gets.** OUT_MERGED_DATA's packaging (BS) is now its TYPE (AM): CAPSULES, TABLETS, OIL,
  TOPICAL, LIQUID, POWDER, TEA, SACHETS, LOZENGES or SOFTGELS.
  - It goes into the POS INSERT / UPDATE packaging field.
  - With no TYPE, BS stays as before.
  - A TYPE typed in AM goes to BS too.
  - SUP PRODUCT unticked keeps POS's packaging.
- **TYPE fixes:**
  - Missed sachets are found: SACH / SACHS / SACHE abbreviations, and single-serve packs of 15 g or less
    (4.5G X 30 PACK).
  - A STICK alone is no longer a sachet: deodorant / zinc / lip / balm sticks → TOPICAL.
  - TEA TREE, TEA LIGHT and ingredient teas no longer count as TEA: tea tree oil → OIL, soap liquid with green tea →
    LIQUID.
  - LIQUID from ML is unchanged.
- **v21.21.1:** a pasted block lines up so its barcodes land in D. A block copied from POS SUPPLIER NUMBER onwards and
  pasted at B3 no longer goes one column to the left.

## Files
- Changed: index.html, docs/ARCHITECTURE.md, tools/pos-supplier-merge/{index.html, engine-frame.html, README.md,
  js/app.js, js/engine-host.js, js/engine-worker.js}
- New: docs/GITHUB-RELEASE-v21.21.1.md, docs/GITHUB-RELEASE-v21.22.0.md
- Delete by hand (still in the repo): tools/database-build/js/size-worker.js

## Testing done (13 Oct, real files)
- **Full CH2 set (15,224 OUT rows) vs v21.21.1:** 207 TYPEs changed, and no other OUT column changed.

  | Change | Rows |
  |---|---|
  | Blank → SACHETS | 42 |
  | SACHETS → TOPICAL | 34 |
  | SACHETS → no type | 11 |
  | TEA → OIL / TOPICAL / LIQUID / TABLETS / POWDER / no type | 120 |

- **Packaging (BS) = TYPE (AM)** on all 6,915 rows that have a TYPE.
  - The INSERT TXT differs only in packaging (1,199 rows).
  - The UPDATE TXT differs only in packaging (5,283 rows).
- **ETHIQUE + METAGENICS + BROTH OF LIFE vs v21.21.0:** only packaging differs, e.g. MET ADAPTAN 60T 0 → TABLETS, MET
  ACTIVAT B'S 60VC 0 → CAPSULES, ETHIQUE BALM 9G blank → TOPICAL.
- **Other changes:**
  - Typing POWDER in AM sets BS to POWDER.
  - With SUP PRODUCT unticked, the UPDATE file keeps POS's packaging.
  - The OUT packaging heading carries the SUP PRODUCT tick.
- **Other checks:** the paste, Update in POS, edit / Undo and smoke tests pass.
