# Staff Hub v21.17.0 — the full sets in the Library, _pos_db back to columns A–P, supplier sheet on one page

Released 12 Oct 2026 18:05 AEDT. Based on v21.16.0.

## Commit notes

**Summary:** v21.17.0 — Full sets in the Library, _pos_db = supplier layout A–P only, supplier sheet fits the page

**Description:**
- Build POS Master Databases v21.14.0: the files without `_pos_db` are the full sets with every column, and they are the
  Library copies the other tools use: `clean_merged_pos_data`, `clean_ch2_data`, `clean_uhp_data`.
- `clean_merged_pos_data` has every column again (POS_INDEX, POS_MASTER_BRAND, POS_MASTER_BARCODE, POS_MAIN_ID … POS_SOH,
  sheet Clean_Merged_POS_Data), sorted A–Z; POS_INDEX keeps the BrowseStockItems row number, the same POS_INDEX as in the
  merged master.
- The three `_pos_db` files are the shortened supplier layout A–P for your own scripts (download only). SUP SIZE / SUP TYPE
  are gone — POS New Product Check Clean works size and type out itself in OUT_MERGED_DATA (AL / AM → BR itemsize / BS
  packaging). They keep the 13-digit barcodes, the cleaned CH2 SUP PRODUCT and the blank N/A min order.
- POS New Product Check Clean v1.7.0: **+ Add CH2 full set / + Add Unique full set** makes the supplier rows from the full
  file with the Build's own rules (the same rows as the `_pos_db` file); a full `clean_ch2_data` / `clean_uhp_data`
  dropped in works too. `_pos_db` files and the Library copies from v21.16.0 still load.
- The supplier input sheet (IN_SUPPLIER_/_PRODUCT_UPDATES) always fits the page width — no sideways scroll; headings wrap,
  long cells end in … with the full text on hover.
- Merged master files and the To-Order file are unchanged.

**Delete in the repository:** `tools/database-build/js/size-worker.js`

## Files
- Changed: index.html, assets/js/phf-library.js, docs/ARCHITECTURE.md, tools/database-build/{index.html, js/pipeline.js},
  tools/pos-supplier-merge/{index.html, README.md, css/merge.css, js/app.js, js/merge-map.js}
- New: docs/GITHUB-RELEASE-v21.17.0.md, tools/database-build/js/supplier-layout.js
- Deleted: tools/database-build/js/size-worker.js

## Testing done (12 Oct real files)
- Build All: `clean_merged_pos_data` has the same columns as v21.15.1 and the same rows (put back in POS_INDEX order it is
  identical), in the same A–Z order as v21.16.0; the three `_pos_db` files are v21.16.0's columns A–P exactly (16
  columns); `clean_ch2_data`, `clean_uhp_data`, both merged masters and the To-Order file identical to v21.16.0. Library:
  clean_merged_pos_data, clean_ch2_data, clean_uhp_data, the masters and the To-Order file.
- Full CH2 / Unique file → supplier rows (as POS New Product Check Clean reads it) = the `_pos_db` file, 0 cells different
  (9,682 / 4,847 rows).
- POS New Product Check Clean, METAGENICS: with the new Library files and with the v21.16.0 ones the same — OUT 249
  (173 matched, 17 new, 5 review, 54 discontinued), INSERT 17, UPDATE 227; both TXT files byte-identical, review workbook
  identical apart from the time stamp. A full Unique set in Drop All goes to Supplier Updates (4,847 rows).
- Supplier sheet at 1920, 1850, 1600, 1440, 1366, 1280, 1100, 1024 and 900 px: no sideways scroll; INDEX, barcode, Sub ID,
  wholesale and RRP never cut short; no heading word broken; typing in a cell and Undo work.
