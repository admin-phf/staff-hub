# POS Supplier New Product Check and Clean Merge v1.4.0 (Staff Hub v21.11.0)

Updated 11 Oct 2026 10:55 AEDT. (Named POS Supplier Merge up to v1.3.1; the folder and web address are unchanged.)

Import, Update, Discontinue and Clean Products and/or Supplier information against current POS Database.
The POS DB & SUPPLIER MERGE Google Sheet, run in the browser. It uses the **same script files** as the
Google Sheet (engine v6.3.88), so the matching, discontinued products, ZZZZ / DISC / SPEC ORD Sub IDs, pricing, OUT_MERGED_DATA
and the POS INSERT / UPDATE TXT files are the same. Nothing is uploaded: files stay in this browser.

## Inputs (left rail)

| Rail row | Google Sheet tab | Where it comes from | Kept |
|---|---|---|---|
| POS Database (required) | TMP_MERGED_POS_DATA | Build POS Master Databases → POS Database output `clean_merged_pos_data_pos_db_….xlsx` | This session |
| Supplier Updates (required, several files allowed) | IN_SUPPLIER_/_PRODUCT_UPDATES | Build POS Master Databases → `clean_ch2_data_pos_db_….xlsx` / `clean_uhp_data_pos_db_….xlsx` | This session |
| Brand Name Changes (recommended) | SRC_POS_BRAND_NAME_CHANGES | Google Sheet tab | Saved in this browser |
| Product Prefixes (recommended) | SRC_POS_PRODUCT_PREFIX | Google Sheet tab | Saved in this browser |
| POS Suppliers (recommended) | SRC_POS_SUPPLIERS | Google Sheet tab | Saved in this browser |
| Ongoing Discounts (recommended) | SRC_POS_ONGOING_DISCOUNTS | Same file Build POS Master Databases uses | Saved in this browser |
| Find & Replace (optional) | SRC_POS_FIND_REPLACE | Google Sheet tab | Saved in this browser |

Files are recognised from their headings (the heading row can be row 1 or row 2). A downloaded copy of the
Google Sheet (File → Download → Microsoft Excel) can be dropped as one file: every recognised tab fills its
input. Columns are matched by heading, `POS_MASTER_BARCODE` fills POS MAIN ID, and INDEX is renumbered
1, 2, 3… the same way the Sheet's paste tidy does. STATUS columns are cleared because the merge writes them.

## Workbook tabs (v1.4.0)

Under the stages the page shows the workbook the way the Google Sheet does, with its tabs along the bottom (they stay at
the bottom of the window while the workbook is on screen), in the Sheet's order and colours:

| Tab | Colour | What it shows |
|---|---|---|
| IN_SUPPLIER_/_PRODUCT_UPDATES | red | The editable supplier sheet (below). Every row, no pages. |
| OUT_MERGED_DATA | green | After stage 2: the review (KPIs, search, status / price / brand filters) with **Review columns** or **All columns (Sheet)** — every column with the Sheet's row numbers and column letters. Long NOTES show 4 lines; click a note to open the rest. |
| OUT_POS_INSERT · OUT_POS_UPDATE | orange | After stage 3: the rows written to the two TXT files. |
| SRC_POS_FIND_REPLACE · SRC_POS_ONGOING_DISCOUNTS · SRC_POS_BRAND_NAME_CHANGES · SRC_POS_PRODUCT_PREFIX · SRC_POS_SUPPLIERS | blue | The reference tables as loaded, or with SRC STATUS filled in once stage 2 has run. |
| TMP_MERGED_POS_DATA | — | The POS Database. |

All but IN_SUPPLIER are read-only here (text can be selected and copied) and have their own search box. Only the rows near
the scroll position are drawn (js/sheet-grid.js), so a 34,000-row POS Database scrolls as quickly as a short list.
Stage 2 opens OUT_MERGED_DATA, as the Sheet's menu does.

## Brands in this merge (v1.3.1)

A merge only covers the brands in **Supplier Updates**: stage 2 matches, updates and discontinues (ZZZZ) the POS
products of those brands and returns them in full, and leaves every other POS brand out. Supplier Updates therefore
**starts empty** — paste or drop the supplier list / catalogue of the brand or distributor you are updating. The line
under the sheet's totals bar shows **Brands in this merge: N** with the rows per brand, so the scope can be checked
before running.

The CH2 and Unique supplier imports saved by Build POS Master Databases are **never loaded on their own**. To merge a
whole catalogue, press **+ Add CH2 supplier import** or **+ Add Unique supplier import** (on the sheet, or on the
Supplier Updates card). ✕ / Remove takes it out again.

## Staff Hub Library (v1.3.0)

When the page opens, files saved in this browser's Staff Hub Library (see the home page) fill empty inputs:
the **POS Database** from the last Build POS Master Databases build and the shared **Ongoing Discounts** file
(v1.3.0 also loaded the CH2 / Unique supplier imports; from v1.3.1 they are added with their buttons). Each shows "From the Library · built …"; a build over a day old turns the row amber
(CHECK DATE). A file dropped on the page always wins. ✕ / Remove on a Library file stops it loading here again until
a newer build is saved; Ongoing Discounts is one shared file, so removing it here deletes the saved copy. An Ongoing
Discounts file dropped here is saved to the Library for Build POS Master Databases too.

## Supplier Updates sheet (v1.2.0 — editable; v1.4.0 — every row, no pages)

The IN_SUPPLIER_/_PRODUCT_UPDATES tab is the first workbook tab, full width under the stages. Every row is in one
scrolling sheet with the headings fixed at the top (v1.4.0 — no pages; only the rows near the scroll position are drawn,
so a long list stays quick). It works like a small Google Sheet:

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
   │            js/sheet-grid.js (read-only workbook tabs: every row, drawn around the scroll position)
   └─ Web Worker js/engine-worker.js
        ├─ js/sheets-formula.js + js/sheets-shim.js (in-memory stand-in for Google Sheets)
        ├─ engine/1.0-setup.js … engine/1.3-merge.js (the Apps Script files, unchanged)
        └─ js/engine-host.js (messages between the page and the engine)
```

When the page is opened straight from a file (no web server) browsers block Web Workers, so the same
engine runs in a hidden frame (`engine-frame.html`) instead. Results are the same.

**Same results as the Google Sheet.** On the 11 Oct 2026 Google Sheet run (371 supplier rows — Bioceuticals,
Bioceuticals Clinical, Blackmores Professional from Bioceuticals and Oborne / CH2 — against 34,280 POS rows and the Sheet's
SRC tabs) the page gives the same supplier STATUS, OUT_MERGED_DATA (347 rows, every column), OUT_POS_INSERT (6) and
OUT_POS_UPDATE (327). sheets-formula / sheets-shim v1.0.1: `TO_TEXT(cell)` reads the cell as displayed (e.g. `$15.02`),
as Google Sheets does, so FINAL SHELF RRP's GP NGST line matches to the cent.

## Updating the engine

When the Google Sheet script changes, copy the four files from Apps Script into `engine/` with these names
(contents unchanged): `1.0-setup.js`, `1.1-format-clear-popup.js`, `1.2-highlight-new-products-best-buy.js`,
`1.3-merge.js`. Then bump the `?v=` numbers in `js/engine-worker.js` and `engine-frame.html` so browsers fetch
the new files. If the SCHEMA headings of an input tab change, update the matching entry in `js/merge-map.js`.

## Not in this version (Phase 2)

Editing in the review table (UPDATED SUPPLIER overrides with Refresh Supplier Changes, RRP / markup
overrides) and the Filtered Brands build. Use the review workbook or the Google Sheet for those for now.
