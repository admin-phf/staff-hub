# POS Supplier Merge v1.3.0 (Staff Hub v21.10.0)

Updated 10 Oct 2026 19:40 AEDT.

The POS Supplier Merge Google Sheet, run in the browser. It uses the **same script files** as the
Google Sheet (engine v6.3.88), so the matching, discontinued products, ZZZZ / DISC / SPEC ORD Sub IDs, pricing, OUT_MERGED_DATA
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

## Brands in this merge (v1.3.1)

A merge only covers the brands in **Supplier Updates**: stage 2 matches, updates and discontinues (ZZZZ) the POS
products of those brands and returns them in full, and leaves every other POS brand out. Supplier Updates therefore
**starts empty** — paste or drop the supplier list / catalogue of the brand or distributor you are updating. The line
under the sheet's totals bar shows **Brands in this merge: N** with the rows per brand, so the scope can be checked
before running.

The CH2 and Unique supplier imports saved by Build Master Databases are **never loaded on their own**. To merge a
whole catalogue, press **+ Add CH2 supplier import** or **+ Add Unique supplier import** (on the sheet, or on the
Supplier Updates card). ✕ / Remove takes it out again.

## Staff Hub Library (v1.3.0)

When the page opens, files saved in this browser's Staff Hub Library (see the home page) fill empty inputs:
the **POS Database** from the last Build Master Databases build and the shared **Ongoing Discounts** file
(v1.3.0 also loaded the CH2 / Unique supplier imports; from v1.3.1 they are added with their buttons). Each shows "From the Library · built …"; a build over a day old turns the row amber
(CHECK DATE). A file dropped on the page always wins. ✕ / Remove on a Library file stops it loading here again until
a newer build is saved; Ongoing Discounts is one shared file, so removing it here deletes the saved copy. An Ongoing
Discounts file dropped here is saved to the Library for Build Master Databases too.

## Supplier Updates sheet (v1.2.0 — editable)

The IN_SUPPLIER_/_PRODUCT_UPDATES tab is always on the page, full width under the stages (the same width as the
OUT_MERGED_DATA review). It works like a small Google Sheet:

- **Totals bar** (Sheet row 1): TOTAL · ⭐ MATCHED · 🟢 NEW · 🚫 NOT USED · ⚠️ UNMATCHABLE, SUPPLIER NAMES, TOTAL POS SUPPLIERS,
  UNIQUE BARCODES (column D — older copies of the Sheet label this cell UNIQUE BRANDS), UNIQUE BRANDS, TOTAL WS, TOTAL RRP
  and the stage-1 STATUS summary. Like the Sheet's SUBTOTAL formulas, the totals count only the rows the search shows.
- **Edit**: click a cell and type (or double-click / Enter / F2 to change it). Enter, Tab and the arrow keys move;
  Shift + click or drag selects a range; Delete clears it; Ctrl+C copies it. Changed cells turn amber.
- **Paste**: click a cell and press Ctrl+V (⌘V) — the copied block fills from that cell, adding rows past the last one
  (click B in the empty row under the last row to add rows). A block with the heading row is matched by heading.
  Nothing selected: columns are read by position (16 = A–P, 14 = B–O, 15 = B–P) and checked against the data.
- **Rows**: Add row; click INDEX numbers (Shift + click for several) and Delete rows; Undo (Ctrl+Z) steps back one change.
  Typed or pasted rows are kept as an "Added rows" supplier entry (+ in INDEX); Clear added rows removes them.
- INDEX is numbered automatically and STATUS is written by the merge, so A and P are read-only.
- Every change updates the supplier input for this session and resets the stages, so the next run uses it.

## Removing inputs

Each loaded input in the rail has its own ✕: it removes that input straight away (a saved reference table is deleted
from this browser). Clear session files removes the POS Database and every supplier row (including sheet edits);
Clear saved reference removes every saved reference table. Drop-list rows that only filled removed inputs go too.

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
