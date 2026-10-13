# Staff Hub v21.21.0 — POS New Product Check Clean v1.11.0: search / add bar, fill down, M / N / O ticks, SELL THRU

Released 13 Oct 2026 21:00 AEDT. Based on v21.20.0.

## Commit notes

**Summary:** v21.21.0 — Search / add bar, fill down, M / N / O ticks, *SELL THRU*, N/A min order kept until the POS files

**Description:**
- POS New Product Check Clean v1.11.0 — supplier sheet:
  - **Search / add bar:** the search box is now a wide search / add bar that starts with the supplier
    (`OBORNE / CH2 | 134 | `).
    - Typing slots in column order (`| barcode | brand | sub id | product | …`) looks for the barcode first, then falls
      back to brand / Sub ID / product / WS.
    - Add (or Enter) adds the row. It won't add a barcode that's already on the sheet, and warns about the same brand
      with the same Sub ID or WS.
    - Plain text still searches every column.
  - **Rows:** "Add row" is now **Add 5 rows**, and there's a new **Clear empty rows** button.
  - **Fill down:** drag the corner square of a selected cell down, as in Excel, or press Ctrl+D (⌘D).
  - **Ctrl+C / ⌘C** copies the selected cells on every sheet. While typing in a cell with nothing highlighted, it copies
    the whole cell.
  - **New Update in POS ticks:**
    - **M (stock in):** a number becomes a new product's stock on hand (pos soh).
    - **N (discount price):** when unticked, the discount price isn't used.
    - **O (member):** covers price levels 1–5. Member status comes from O, then the brand flags, then POS's own price
      level 1. Unticked, POS keeps its levels 1–5.
  - **Borders:** no lines between the title band, brands line and toolbar.
- **OUT_MERGED_DATA:** the Update in POS ticks are back (as v21.18.0).
- **\*SELL THRU\*:** a CH2 line whose Description 2 says SELL THROUGH / SELL THRU ends SUP PRODUCT in " \*SELL THRU\*".
  This applies in the merge and in Build's `_pos_db` file. It stays out of descr / pos desc, and matching is unchanged.
- **Min order "N/A":** it stays on the supplier sheet and OUT_MERGED_DATA. In OUT_POS_INSERT / OUT_POS_UPDATE and the TXT
  it becomes 1 for a new product, or POS's own min order for a matched one.
- **Member pricing fix:** a discontinued product of a member brand now keeps POS's 90% price level 1. It used to be
  set to 100%.
- Build POS Master Databases v21.14.3 loads the new supplier-layout v1.1.0.

## Files
- Changed: index.html, docs/ARCHITECTURE.md, tools/database-build/{index.html, js/pipeline.js, js/supplier-layout.js},
  tools/pos-supplier-merge/{index.html, engine-frame.html, README.md, css/merge.css, js/app.js, js/engine-host.js,
  js/engine-worker.js, js/sheet-grid.js}
- New: docs/GITHUB-RELEASE-v21.21.0.md
- Delete by hand (still in the repo): tools/database-build/js/size-worker.js

## Testing done (13 Oct, real files)
- **Search / add bar:**
  - The bar starts as `OBORNE / CH2 | 134 | `.
  - An existing barcode finds 1 row.
  - An unknown barcode with an existing brand and Sub ID finds 1 row through the fallback search.
  - A new barcode shows "not on the sheet — Add puts it in", and Add puts the row in.
  - Adding the same barcode again says "Already on row 9685 — not added again".
  - Adding the same brand and Sub ID adds the row with a warning.
- **Add 5 rows, fill down and copy:**
  - Add 5 rows added 5 rows.
  - Dragging the fill square down filled the rows below.
  - Ctrl+D filled 2 cells.
  - Ctrl+C copied "12.5".
  - Clear empty rows removed the 3 rows that were left empty.
- **SELL THRU:** 930 CH2 lines carry *SELL THRU* in the merge and in Build's `clean_ch2_data_pos_db`.
- **ETHIQUE + METAGENICS + BROTH OF LIFE**, compared with v21.20.0:
  - The INSERT TXT is identical.
  - In the UPDATE TXT only price level 1 differs, on 27 discontinued METAGENICS products. It's now POS's own 90 / 90.04 /
    90.02…, where v21.20.0 set 100.
  - No SELL / THRU appears in any descr or pos desc.
  - OUT_MERGED_DATA Q shows the note.
- **Min order "N/A"** (CABOT HEALTH + HEALING CONCEPTS):
  - OUT_MERGED_DATA shows N/A on 66 rows.
  - The INSERT and UPDATE TXT are identical to v21.20.0 (no N/A in the TXT).
  - A new row with min order N/A and stock in 7 went to the INSERT file as min order 1 and pos soh 7.
- **Ticks:**
  - IN has 12 ticks (C, E–O). OUT has 35, with pr 1–5 on the O tick.
  - Unticking N resets the stages.
  - Unticking O reads "keeping POS’s price levels 1–5".
- **Other checks:**
  - The v21.19.0 totals / rail / Reconcile test and the Update in POS / edit / Undo tests pass.
  - Every hub page loads without errors.
