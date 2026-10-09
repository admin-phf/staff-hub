# POS Supplier Merge v1.0.0 (Staff Hub v21.7.0)

Updated 10 Oct 2026 02:30 AEDT.

The POS Supplier Merge Google Sheet, run in the browser. It uses the **same script files** as the
Google Sheet (engine v6.3.87), so the matching, ZZZZ / DISC / SPEC ORD Sub IDs, pricing, OUT_MERGED_DATA
and the POS INSERT / UPDATE TXT files are the same. Nothing is uploaded: files stay in this browser.

## Inputs (left rail)

| Rail row | Google Sheet tab | Where it comes from | Kept |
|---|---|---|---|
| POS Database (required) | TMP_MERGED_POS_DATA | Build Master Databases → POS Database output `clean_merged_pos_data_pos_db_….xlsx` | This session |
| Supplier Updates (required, several files allowed) | IN_SUPPLIER_/_PRODUCT_UPDATES | Build Master Databases → `clean_ch2_data_pos_db_….xlsx` / `clean_uhp_data_pos_db_….xlsx` | This session |
| Brand Name Changes (recommended) | SRC_POS_BRAND_NAME_CHANGES | Google Sheet tab | Saved in this browser |
| Product Prefixes (recommended) | SRC_POS_PRODUCT_PREFIX | Google Sheet tab | Saved in this browser |
| POS Suppliers (recommended) | SRC_POS_SUPPLIERS | Google Sheet tab | Saved in this browser |
| Ongoing Discounts (recommended) | SRC_POS_ONGOING_DISCOUNTS | Same file Build Master Databases uses | Saved in this browser |
| Find & Replace (optional) | SRC_POS_FIND_REPLACE | Google Sheet tab | Saved in this browser |

Files are recognised from their headings (the heading row can be row 1 or row 2). A downloaded copy of the
Google Sheet (File → Download → Microsoft Excel) can be dropped as one file: every recognised tab fills its
input. Columns are matched by heading, `POS_MASTER_BARCODE` fills POS MAIN ID, and INDEX is renumbered
1, 2, 3… the same way the Sheet's paste tidy does. STATUS columns are cleared because the merge writes them.

## Stages

1. **Highlight New Products + Best Buy** — `runHighlightNewProductsBestBuy`
2. **Build OUT_MERGED_DATA** — `buildOutMergedDataFromSupplierStatus`
3. **Generate Insert + Update & Export** — `generateInsertUpdateSheets` + `exportPosFiles`

Running a later stage runs the earlier ones first when needed. Changing any input clears the results and
restarts the engine, so every run starts from a clean workbook.

## Outputs

- `POS INSERT yyyy-MM-dd BRANDS.txt` and `POS UPDATE yyyy-MM-dd BRANDS.txt` — exactly what EXPORT POS FILES makes.
- `POS SUPPLIER MERGE yyyy-MM-dd BRANDS.xlsx` — review workbook: OUT_MERGED_DATA, OUT_POS_INSERT,
  OUT_POS_UPDATE, the supplier STATUS and the reference tabs, with the Sheet's banding and status colours.
- The OUT_MERGED_DATA review table on the page (search, row / price status and brand filters).

## How it runs

```
index.html ── js/app.js (rail, drag and drop, stages, outputs, review)
   │            js/merge-map.js (input definitions, recognition, column mapping)
   │            js/xlsx-writer.js (review workbook)
   └─ Web Worker js/engine-worker.js
        ├─ js/sheets-formula.js + js/sheets-shim.js (in-memory stand-in for Google Sheets)
        ├─ engine/1.0-setup.js … engine/1.3-merge.js (the Apps Script files, unchanged)
        └─ js/engine-host.js (messages between the page and the engine)
```

When the page is opened straight from a file (no web server) browsers block Web Workers, so the same
engine runs in a hidden frame (`engine-frame.html`) instead. Results are the same.

## Updating the engine

When the Google Sheet script changes, copy the four files from Apps Script into `engine/` with these names
(contents unchanged): `1.0-setup.js`, `1.1-format-clear-popup.js`, `1.2-highlight-new-products-best-buy.js`,
`1.3-merge.js`. Then bump the `?v=` numbers in `js/engine-worker.js` and `engine-frame.html` so browsers fetch
the new files. If the SCHEMA headings of an input tab change, update the matching entry in `js/merge-map.js`.

## Not in this version (Phase 2)

Editing in the review table (UPDATED SUPPLIER overrides with Refresh Supplier Changes, RRP / markup
overrides) and the Filtered Brands build. Use the review workbook or the Google Sheet for those for now.
