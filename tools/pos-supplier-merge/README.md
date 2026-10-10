# POS Supplier Merge v1.1.0 (Staff Hub v21.8.0)

Updated 10 Oct 2026 11:30 AEDT.

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

## Supplier Updates sheet (v1.1.0)

Click **Supplier Updates** in the rail: under its card is the IN_SUPPLIER_/_PRODUCT_UPDATES tab as the Google Sheet shows it.

- **Totals bar** (Sheet row 1): TOTAL · ⭐ MATCHED · 🟢 NEW · 🚫 NOT USED · ⚠️ UNMATCHABLE, SUPPLIER NAMES, TOTAL POS SUPPLIERS,
  UNIQUE BARCODES (column D — older copies of the Sheet label this cell UNIQUE BRANDS), UNIQUE BRANDS, TOTAL WS, TOTAL RRP, and
  the stage-1 STATUS summary (e.g. `Matched: 488 | New: 121 | Not Used: 6 | Unmatchable: 8 | Blank: 0 | 0.2s`). Like the
  Sheet's SUBTOTAL formulas, the totals count only the rows the search leaves visible.
- **The 16 headings** INDEX … STATUS and every supplier row from all loaded files, 100 rows a page, with search.
  STATUS fills in (and is coloured) after stage 1.
- **Paste rows**: copy rows in Excel or Google Sheets, click the sheet and press Ctrl+V (⌘V on Mac), or use Paste rows.
  With the heading row, columns are matched by heading in any order; without it they are read by position (16 columns =
  A–P, 14 = B–O, 15 = B–P). INDEX is renumbered and STATUS is left for the merge. Pasted rows are kept as a "Pasted rows"
  supplier entry next to any dropped files (this session only). Undo last paste, Clear pasted rows and Copy headings
  (a 16-heading template for Excel / Sheets) are beside the search.

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
