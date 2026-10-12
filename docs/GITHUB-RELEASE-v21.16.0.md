# Staff Hub v21.16.0 — Build POS Master Databases v21.13.0

Released 12 Oct 2026 16:55 AEDT. Based on v21.15.1.

## Commit notes

**Summary:** v21.16.0 — Build POS Master Databases v21.13.0: same file pair for POS, CH2 and Unique, size / type columns

**Description:**
- POS, CH2 and Unique now give the same pair of files: the complete set first, and `_pos_db` = the shortened file in the
  supplier layout (columns A–P as the POS New Product Check Clean supplier sheet) plus SUP SIZE and SUP TYPE.
- POS: `clean_merged_pos_data_DD.MM.YY.xlsx` is the complete POS Database (sorted A–Z, sheet POS_DB_Data — what
  `clean_merged_pos_data_pos_db` was) and is still the POS Database in the Library, so POS New Product Check Clean works as
  before. `clean_merged_pos_data_pos_db_DD.MM.YY.xlsx` is now the POS products in the supplier layout, same A–Z order.
  The old BrowseStockItems-order POS file (with POS_INDEX and the raw POS_MAIN_ID) is no longer made.
- CH2 / Unique `_pos_db`: barcodes 13 digits; CH2 SUP PRODUCT cleaned (** SELL THROUGH **, *SELL THROUGH, NEW SKU …*,
  ** CH2 REDUNDANT **, ** OBSOLETE MANUFACTURER ** removed) and in capitals; CH2 min order "N/A" left blank.
- SUP SIZE / SUP TYPE come from the product description with the merge's own size rules (e.g. `… GI RE-LAX 60C` → 60C ·
  CAPSULES, `… SEA SALT FINE 454G` → 454G).
- The complete CH2 / Unique files and the Combined Master are unchanged.

## Files
- Changed: index.html, docs/ARCHITECTURE.md, tools/database-build/{index.html, js/pipeline.js},
  tools/pos-supplier-merge/{index.html, README.md, js/merge-map.js}
- New: docs/GITHUB-RELEASE-v21.16.0.md, tools/database-build/js/size-worker.js

## Testing done
- 12 Oct real files, Build All: `clean_merged_pos_data` identical to the previous `clean_merged_pos_data_pos_db`;
  complete CH2 / Unique files identical; the CH2 / Unique `_pos_db` files differ only in the barcode (13 digits), CH2 SUP
  PRODUCT (cleaned, capitals — no * or SELL THROUGH left), CH2 min order (1,250 N/A → blank) and the new SUP SIZE / TYPE
  (CH2 8,602 sizes, Unique 4,121, POS 22,364).
- Library → POS New Product Check Clean (METAGENICS): the same results as before — OUT 249 (173 matched, 17 new, 5 review,
  54 discontinued), INSERT 17, UPDATE 227.
- Heading variants, required-column stop, drops during Build All, Combined Master: as in v21.15.x.
