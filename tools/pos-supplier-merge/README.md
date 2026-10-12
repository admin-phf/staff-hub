# POS New Product Check Clean v1.7.2 (Staff Hub v21.17.2)

Updated 12 Oct 2026 20:15 AEDT. (Named POS Supplier New Product Check and Clean Merge in v1.4.0 – v1.5.0 and POS Supplier
Merge up to v1.3.1; the folder and web address are unchanged.)

v1.7.2: supplier sheet clean-up —
- One navy strip: the title (ⓘ = how the sheet works), the STATUS summary and the totals, with the row count on the right.
  One cream line: the brands in the merge on one line (+N more) and the Library buttons. The toolbar holds search, the edit
  buttons, **Update in POS** (what POS keeps · Update everything; the full explanation on hover) and **Discontinue
  missing products**.
- Headings in two rows like the other tabs: the grey letters row (SUP BRAND filter in E), then each heading centred on up
  to two lines with its Update in POS tick on one line under it (the tick's hover says what it does). Empty columns take
  three lines only when the window is short of room. Same font and lines as the sheet grid.
- The sheet fills the window under the run bar (at 1880 × 1000: 30 rows instead of 19; the first row 253 px under the run
  bar instead of 445). Room left over goes to SUP PRODUCT (and a little to STATUS / names), not to every column.
- Pasted rows keep the gold edge on INDEX ("Added on this page" on hover) — no + badge on every row.

v1.7.1: the supplier sheet and a run bar —
- Every column is as wide as what it holds: the page measures the headings and the rows on show (INDEX with its + tag,
  every price, barcode and ID in full) and shares the room left; empty columns stay narrow. On a narrow window the text
  steps down a size, then SUP PRODUCT, POS SUPPLIER NAME, SUP BRAND and STATUS give way (in that order) before any number.
  A stray long value (CH2's "Log in to ParagonCare Direct to view pricing") ends in … with the full text on hover.
- The headings line up: column letters on one line, every heading centred in one band, the Update in POS ticks on one line.
- **Run bar** right above the workbook, kept at the top of the window while you scroll: **1 Highlight + Best Buy**,
  **2 Build OUT_MERGED_DATA**, **3 Insert + Update & Export** — the same runs as the stage cards (earlier stages run first
  when needed), each with its state, and the run status on the right. It shows on every workbook tab.

v1.7.0: the full sets —
- The Library now keeps the full sets from Build POS Master Databases v21.14.0: `clean_merged_pos_data` (POS Database),
  `clean_ch2_data` (CH2 full set) and `clean_uhp_data` (Unique full set).
- **+ Add CH2 full set / + Add Unique full set** turns the full file into the supplier rows A–P with the Build's own rules
  (`../database-build/js/supplier-layout.js`): exactly the rows of its `_pos_db` file, so the merge is the same. A full
  `clean_ch2_data` / `clean_uhp_data` dropped here works the same way ("supplier rows made from the full CH2 set" on its
  row). `_pos_db` files, the Google Sheet tab and the copies already in the Library load as before.
- The POS Database's POS MAIN ID is its 13-digit POS MASTER BARCODE when the file has both (the full POS set also has the
  raw POS_MAIN_ID) — what the merge has always used.
- The supplier sheet fits the page: no sideways scroll at any window width. Each column gets what its content needs (the
  13-digit barcode, prices, Sub IDs, the words of its heading), the room left goes mostly to SUP PRODUCT, headings wrap
  onto two lines and on a narrow window the text steps down a size. A cell cut short ends in … and shows its full text on
  hover.

v1.6.2: safety fixes —
- Files can't be added, replaced or removed while a stage runs or your last session is loading (the page says to wait);
  results made from files that changed during a run are not kept.
- A TAB inside a cell becomes a space before the merge, so it can't shift the columns of the POS TXT files.
- Number formats are never dropped any more (after very heavy editing, dropping them changed price levels in the TXT).
- If the browser refuses to save the session (storage full) the page says so instead of hanging on "Leave site?".
- Clear session files / removing Supplier Updates also clears the SUP BRAND filter.
- Price levels kept by an unticked SUP RRP INC GST are now POS's exact values (90.08, not 90): rebuild the POS Database in
  Build POS Master Databases v21.12.0 once.

v1.6.1: what POS keeps is what OUT_MERGED_DATA shows — with a column unticked, matched products show POS's current values
there (RRP, price levels 1–9, ret price, FINAL SHELF RRP, …), on the page and in the review workbook, in the Sheet's
"no change" grey; those cells cannot be edited. The POS UPDATE file was already right and is unchanged — see below.

v1.6.0: the session is kept in this browser; filters decide what each stage processes; **Update in POS** ticks keep POS's
own values (e.g. RRP and price levels) for matched products, and discontinuing can be turned off — see below.

v1.5.1: renamed; with a password set the page opens behind a **Still under development** prompt (below) and the hub tile
says In development. Ongoing Discounts is one shared file with Build POS Master Databases and Reconcile CH2 Order.

Import, Update, Discontinue and Clean Products and/or Supplier information against current POS Database.
The POS DB & SUPPLIER MERGE Google Sheet, run in the browser. It uses the **same script files** as the
Google Sheet (engine v6.3.89), so the matching, discontinued products, ZZZZ / DISC / SPEC ORD Sub IDs, pricing, OUT_MERGED_DATA
and the POS INSERT / UPDATE TXT files are the same. Nothing is uploaded: files stay in this browser.

## Your session is kept (v1.6.0)

Everything on the page stays in this browser until you clear it: the POS Database and Supplier Updates (with your sheet
edits and the SUP BRAND filter), the three stages' results, your edits on OUT_MERGED_DATA / OUT_POS_INSERT / OUT_POS_UPDATE,
the TXT files and review workbook, and the Update in POS / Discontinue options. Close the page and open it again (even the
next day) and it is all back, ready for Run stage 3 again or Export TXT again.

- **Clear Results** removes the results (the input files stay); **Clear session files** removes the POS Database and
  supplier rows too; running a stage replaces the results.
- The results come back only when the inputs are the same as when they were saved. If a reference table changed in the
  meantime (e.g. a new Ongoing Discounts saved in the Library), the inputs come back and the page asks you to run again.
- The session keeps the POS Database it used. When the Library has a newer one, the page says so — remove the POS
  Database (✕) and reload the page to use the newer one.
- Saved in this tool's IndexedDB store (`phf-pos-supplier-merge`, records `__session_inputs`, `__session_pos`,
  `__session_state`); the engine's sheets are saved with it (engine-host `dump` / `restore`).

## Filters decide what is processed (v1.6.0)

- **Supplier Updates:** the filter button on **SUP BRAND** (column E) picks the brands to merge. Stages 1 and 2 then use
  only the supplier rows of those brands — the merge matches, updates and discontinues only them, exactly as though the
  other rows were not uploaded (the Google Sheet's BUILD OUT_MERGED_DATA — FILTERED BRANDS). Brands are compared in
  capitals (BioCeuticals = BIOCEUTICALS). The search box only finds rows; it does not change the merge. When a brand is
  in the supplier rows under two names (e.g. BLACKMORES PROF and BLACKMORES PROFESSIONAL), tick both — otherwise the POS
  products matched by the other name can come out as discontinued.
- **OUT_MERGED_DATA:** when a column filter, the search or the status / price / brand selects hide rows, stage 3 makes
  OUT_POS_INSERT / UPDATE from the rows shown only (the Sheet's GENERATE INSERT + UPDATE — FROM FILTERED DATA).
- **OUT_POS_INSERT / OUT_POS_UPDATE:** when that tab is filtered, Export TXT again puts only its rows shown in that TXT.
- Column filters now work like the Google Sheet's: tick the values to show (several at once), OK applies.
- Each stage card says when a filter is on and how many rows / brands the next run covers.

## Update in POS ticks and Discontinue (v1.6.0)

Each supplier column that feeds the POS UPDATE file has an **Update in POS** tick under its heading:

| Untick | POS keeps (matched products) |
|---|---|
| POS SUPPLIER NUMBER | supplier |
| SUP BRAND | brand |
| SUP SUB ID | Sub ID |
| SUP PRODUCT | descr and pos desc |
| SUP UNITS IN PACK | units |
| SUP MIN ORDER WS | min order qty (box lot) |
| SUP WS EXGST | wsp excgst and last price |
| SUP RRP INC GST | rrp incgst, pr 1–9 pc and ret price — exactly as in POS, nothing recalculated or rounded |
| SUP GST | gst tax pc |

- The merge still uses every column for matching; the ticks decide what goes to POS. They act when stage 3 builds the
  POS files, so after changing one, **Run stage 3 again** (stages 1–2 do not need to run again).
- With any column unticked, a matched product that ends up the same as POS is left out of the POS UPDATE file — so a Sub
  ID / box-lot run touches only the products whose Sub ID or box lot changed, and keeping RRP means no new labels.
- New products (INSERT) always get the full supplier data. POS values come from TMP_MERGED_POS_DATA as they are; units,
  min order qty, RRP and price levels keep the merge's value only where POS has none (POS cannot take them blank).
- **Discontinue POS products of these brands that are not in the supplier rows** (ticked by default): untick it and the
  discontinued (ZZZZ) rows are left out of the POS UPDATE file. They still show in OUT_MERGED_DATA.
- OUT_MERGED_DATA shows POS's current values in the kept columns of matched products (v1.6.1), so what you see is what
  POS gets: on the page, in its row-1 totals and in the review workbook. Tick the heading again and the merge's values
  come back (the merge's own sheet is not changed). What each untick shows:
  - SUP RRP INC GST: NEW RRP, rrp incgst, pr 1–9 pc and ret price = POS's; FINAL SHELF RRP worked out from POS's RRP with
    the Sheet's formula. WSP TO RRP MARKUP % / +6.5% and RRP / MARKUP OVERRIDE stay as the merge worked them out (they
    are the supplier's figures and are not used for matched products).
  - SUP WS EXGST: NEW WSP EXGST / NEW LAST PRICE and wsp excgst / last price = POS's, WSP CHANGE and CHANGE LAST PRICE 0.
  - SUP BRAND: POS BRAND and brand = POS's, OLD BRAND empty. SUP PRODUCT: POS DESCR, descr and pos desc = POS's. The other
    ticks: their final-block column (sub id, units, min order qty, gst tax pc, supplier) = POS's.
- Kept cells of matched products are in the Sheet's "no change" grey text (#9E9E9E) on the row colours, and cannot be
  edited (clicking one says why); their headings say KEPT. The unticked supplier columns are in the same grey.
  OUT_POS_UPDATE marks the kept columns. Stage 3 says how many products kept POS values and how many were left out.
- The ticks are this tool's own (the Google Sheet does not have them); the script files are unchanged — engine-host
  v1.2.0 applies them around `m13BuildPosOutputRowsFromOut_`.

## Inputs (left rail)

| Rail row | Google Sheet tab | Where it comes from | Kept |
|---|---|---|---|
| POS Database (required) | TMP_MERGED_POS_DATA | Build POS Master Databases → full POS set `clean_merged_pos_data_….xlsx` (the Library copy) | Kept with the session (v1.6.0) |
| Supplier Updates (required, several files allowed) | IN_SUPPLIER_/_PRODUCT_UPDATES | Build POS Master Databases → full set `clean_ch2_data_….xlsx` / `clean_uhp_data_….xlsx` (made into the supplier rows here, v1.7.0) or the `_pos_db` file in the A–P layout | Kept with the session (v1.6.0) |
| Brand Name Changes (recommended) | SRC_POS_BRAND_NAME_CHANGES | Google Sheet tab | Saved in this browser |
| Product Prefixes (recommended) | SRC_POS_PRODUCT_PREFIX | Google Sheet tab | Saved in this browser |
| POS Suppliers (recommended) | SRC_POS_SUPPLIERS | Google Sheet tab | Saved in this browser |
| Ongoing Discounts (recommended) | SRC_POS_ONGOING_DISCOUNTS | One shared file with Build POS Master Databases and Reconcile CH2 Order — drop it in any of them | Saved in this browser (Library) |
| Find & Replace (optional) | SRC_POS_FIND_REPLACE | Google Sheet tab | Saved in this browser |

Files are recognised from their headings (the heading row can be row 1 or row 2). A downloaded copy of the
Google Sheet (File → Download → Microsoft Excel) can be dropped as one file: every recognised tab fills its
input. Columns are matched by heading, `POS_MASTER_BARCODE` fills POS MAIN ID, and INDEX is renumbered
1, 2, 3… the same way the Sheet's paste tidy does. STATUS columns are cleared because the merge writes them.

## Editing the sheets (v1.5.0)

Every workbook tab except TMP_MERGED_POS_DATA can be edited like the Google Sheet: click a cell and type (or Enter / F2 /
double-click to change it), Ctrl+V (⌘V) pastes from the selected cell, Delete clears, Ctrl+C copies, click row numbers to
select rows, **Add row** / **Delete rows** / **Undo** (Ctrl+Z). A small orange corner marks a cell changed on this page.
Columns the merge works out itself (INDEX, SRC STATUS / POS MATCH, FINAL SHELF RRP, rrp incgst) stay read-only.

| Tab | What an edit does | Then |
|---|---|---|
| SRC_POS_FIND_REPLACE · ONGOING_DISCOUNTS · BRAND_NAME_CHANGES · PRODUCT_PREFIX · SUPPLIERS | Changes the reference table, **saved in this browser straight away** (rows typed under the last row are added; an empty tab can be started by typing or pasting). POS DISCOUNT% takes 7.5, 7.5% or 0.075 as 7.50%, like the Sheet. | The stages reset — **Run All Stages** (button on the tab) uses the change. The Library copy of Ongoing Discounts (shared with Build POS Master Databases) is not changed. |
| OUT_MERGED_DATA | Goes into the engine's copy of the Sheet and runs the script's own **onEdit**: ROW STATUS → NEW writes the fake barcode (K / AP) when there is no real one, UPDATED SUPPLIER (G) shows SUP OVERRIDE PENDING and is queued, RRP / MARKUP OVERRIDE (AN) makes FINAL SHELF RRP / rrp incgst work out again, row-1 totals follow. | **Refresh supplier changes** (= REFRESH SUPPLIER CHANGES) checks G edits against the supplier upload; **Run stage 3 again** makes OUT_POS_INSERT / UPDATE and the TXT files from the edited sheet (it refreshes waiting supplier changes first). |
| OUT_POS_INSERT · OUT_POS_UPDATE | Changes the rows, adds or deletes rows. | **Export TXT again** writes the two TXT files from these sheets as they are (stage 3 again would make them again from OUT_MERGED_DATA). |
| IN_SUPPLIER_/_PRODUCT_UPDATES | As before (below). | Run the stages again. |

Edits on OUT_MERGED_DATA / OUT_POS_* are for this session; running stage 2 again builds OUT_MERGED_DATA afresh. The TXT
downloads say when they were made before your edits.

## The Google Sheet look (v1.5.0)

The tabs look like the POS DB & SUPPLIER MERGE Sheet (js/sheet-look.js, taken from 1.0 Setup): column letters, the navy
**row-1 totals band** with gold text (the SCHEMA totals formulas — CURRENT WSP, NEW WSP, CURRENT / NEW LAST PRICE, CURRENT /
NEW RRP, OVERRIDES, FINAL SHELF RRP, BRAND CHANGES … — SUBTOTAL totals count the rows a filter shows, SUM / COUNTIF totals
count every row, as in the Sheet), the light blue-grey row-2 headings with a **filter button** on each (show only one
value), the frozen-row line, F5F5F5 / E9F0F5 bands and the OUT_MERGED_DATA conditional colours: price increases red on pink,
decreases blue, no change grey, the higher RRP green, ☑ green / ☒ red / ☐ grey checks, FINAL SHELF RRP on two lines (red
up / blue down / grey same), NEW markup under 35% GP orange, OLD BRAND / BARCODE UPDATE / RRP OVERRIDE amber, supplier
overrides orange. Columns the Sheet centres are centred. The review workbook (.xlsx) uses the same colours and totals.

## Password lock (v1.5.0, prompt v1.5.1)

**Set password** (top right) makes `phf-lock-config.js`; put it in `assets/js/` and commit — from then on the tool opens
behind a **Still under development** message with a password box, once per browser (Lock asks again), and its Staff Hub
tile says In development. The Lock / Password buttons show only once the tool is open. The file holds a salted
PBKDF2-SHA-256 hash, never the password. Password / Remove the password makes a new file the same way. This is a
static GitHub Pages site, so the lock keeps staff out but is not real security (someone who can read the page code can get
round it); for that, put the site behind a sign-in such as Cloudflare Access.

## Workbook tabs (v1.4.0)

Under the stages the page shows the workbook the way the Google Sheet does, with its tabs along the bottom (they stay at
the bottom of the window while the workbook is on screen), in the Sheet's order and colours:

| Tab | Colour | What it shows |
|---|---|---|
| IN_SUPPLIER_/_PRODUCT_UPDATES | red | The editable supplier sheet (below). Every row, no pages. |
| OUT_MERGED_DATA | green | After stage 2: KPIs, search, status / price / brand filters, and **Sheet (all columns, editable)** (v1.5.0 default) or **Review columns**. Long NOTES show 4 lines in the review columns; click a note to open the rest. |
| OUT_POS_INSERT · OUT_POS_UPDATE | orange | After stage 3: the rows written to the two TXT files. |
| SRC_POS_FIND_REPLACE · SRC_POS_ONGOING_DISCOUNTS · SRC_POS_BRAND_NAME_CHANGES · SRC_POS_PRODUCT_PREFIX · SRC_POS_SUPPLIERS | blue | The reference tables as loaded, or with SRC STATUS filled in once stage 2 has run. |
| TMP_MERGED_POS_DATA | — | The POS Database. |

v1.5.0: every tab but TMP_MERGED_POS_DATA is editable (above). Each has its own search box. Only the rows near
the scroll position are drawn (js/sheet-grid.js), so a 34,000-row POS Database scrolls as quickly as a short list.
Stage 2 opens OUT_MERGED_DATA, as the Sheet's menu does.

## Brands in this merge (v1.3.1)

A merge only covers the brands in **Supplier Updates**: stage 2 matches, updates and discontinues (ZZZZ) the POS
products of those brands and returns them in full, and leaves every other POS brand out. Supplier Updates therefore
**starts empty** — paste or drop the supplier list / catalogue of the brand or distributor you are updating. The line
under the sheet's totals bar shows **Brands in this merge: N** with the rows per brand, so the scope can be checked
before running.

The CH2 and Unique full sets saved by Build POS Master Databases are **never loaded on their own**. To merge a
whole catalogue, press **+ Add CH2 full set** or **+ Add Unique full set** (on the sheet, or on the Supplier Updates
card) — the full file becomes the supplier rows A–P (v1.7.0). ✕ / Remove takes it out again.

## Staff Hub Library (v1.3.0)

When the page opens, files saved in this browser's Staff Hub Library (see the home page) fill empty inputs:
the **POS Database** from the last Build POS Master Databases build and the shared **Ongoing Discounts** file
(v1.3.0 also loaded the CH2 / Unique supplier files; from v1.3.1 they are added with their buttons; from v1.7.0 they are the full sets). Each shows "From the Library · built …"; a build over a day old turns the row amber
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
   │            js/sheet-grid.js (workbook tabs: every row, drawn around the scroll position; editable — v1.1.0)
   │            js/sheet-look.js (the Google Sheet's totals band, colours and centred columns — v1.0.0)
   │            ../../assets/js/phf-lock.js + phf-lock-config.js (optional password lock — v1.0.0)
   └─ Web Worker js/engine-worker.js
        ├─ js/sheets-formula.js + js/sheets-shim.js (in-memory stand-in for Google Sheets)
        ├─ engine/1.0-setup.js … engine/1.3-merge.js (the Apps Script files, unchanged)
        └─ js/engine-host.js (messages between the page and the engine; v1.1.0 sheet edits → the script's onEdit, undo)
```

When the page is opened straight from a file (no web server) browsers block Web Workers, so the same
engine runs in a hidden frame (`engine-frame.html`) instead. Results are the same.

**Same results as the Google Sheet.** On the 11 Oct 2026 Google Sheet run (371 supplier rows — Bioceuticals,
Bioceuticals Clinical, Blackmores Professional from Bioceuticals and Oborne / CH2 — against 34,280 POS rows and the Sheet's
SRC tabs) the page gives the same supplier STATUS, OUT_MERGED_DATA (347 rows, every column), OUT_POS_INSERT (6) and
OUT_POS_UPDATE (327). sheets-formula / sheets-shim v1.0.1: `TO_TEXT(cell)` reads the cell as displayed (e.g. `$15.02`),
as Google Sheets does, so FINAL SHELF RRP's GP NGST line matches to the cent.

**Merge v6.3.89 (1.3 Merge only — the other three files are unchanged).** Two additions, on the same 11 Oct run:
- **Shortened brand names (BE1).** A SUP BRAND cut to the 20-character POS brand field, or with its last word cut
  (BLACKMORES PROF = BLACKMORES PROFESSIONAL), takes the one listed full brand (SRC_POS_BRAND_NAME_CHANGES / Ongoing
  Discounts brands). The 25 Blackmores Professional rows keep their brand, get its 22.5% discount (last price $7.30, not
  $9.42) and the BM PROF prefix, and no longer show OLD BRAND / BRAND CHANGED / BRAND ☒. A matched POS
  brand that is the same brand shortened keeps its POS name. A real rename (BLACKMORES → BLACKMORES PROFESSIONAL) still
  shows. POS brand translation is unchanged.
- **POS size and form for a bare count (SZ1).** SUP PRODUCT "BIOCEUTICALS CLINICAL METHYL BIOACTIVE (60)" + ORIGINAL POS
  DESCR "BIOC CLIN METHYL BIOACTIVE 60T" → SIZE 60T, TYPE TABLETS, POS DESCR "BIOC CLIN METHYL BIOACTIVE 60T" (was
  "BIOC CLIN METHYL 60", SIZE 60, TYPE blank). Only when the counts are the same and the supplier gives no other form;
  a word the marketing purge removed (BIOACTIVE, EVERYDAY…) comes back only when the POS description has it too.
  135 Bioceuticals rows on that run; nothing else in OUT_MERGED_DATA, OUT_POS_INSERT or OUT_POS_UPDATE changed.

## Updating the engine

When the Google Sheet script changes, copy the four files from Apps Script into `engine/` with these names
(contents unchanged): `1.0-setup.js`, `1.1-format-clear-popup.js`, `1.2-highlight-new-products-best-buy.js`,
`1.3-merge.js`. Then bump the `?v=` numbers in `js/engine-worker.js` and `engine-frame.html` so browsers fetch
the new files. If the SCHEMA headings of an input tab change, update the matching entry in `js/merge-map.js`.

## Not in this version

The Filtered Brands build (BUILD OUT_MERGED_DATA — FILTERED BRANDS) and GENERATE FROM FILTERED DATA. A merge here covers
the brands in Supplier Updates, which does the same job. (Sheet editing with Refresh Supplier Changes and RRP / markup
overrides arrived in v1.5.0.)
