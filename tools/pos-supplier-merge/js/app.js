/* PHF Staff Hub — POS New Product Check Clean v1.16.6 (19 Oct 2026; was POS Supplier New Product Check and Clean Merge,
 * before that POS Supplier Merge)
 * Page controller: input rail + drag and drop, saved reference data, the
 * engine (Web Worker running the unchanged Apps Script v6.3.88 files), the
 * three merge stages, downloads and the OUT_MERGED_DATA review table.
 * v1.1.0: Supplier Updates sheet on the page (totals bar, 16 headings, paste rows).
 * v1.2.0: the sheet is editable (cells, paste at a cell, add / delete rows, undo), full width under the stages and
 *         always shown; every input in the rail has its own ✕ to remove it.
 * v1.3.0: Staff Hub Library — the POS Database and supplier files from Build Master Databases and the shared Ongoing
 *         Discounts file load on open (assets/js/phf-library.js); files dropped here for Ongoing Discounts are saved to it.
 * v1.3.1: Supplier Updates starts empty — a merge only covers the brands pasted or dropped. The CH2 / Unique supplier
 *         imports in the Library are added only with their "Add … from the Library" buttons. "Brands in this merge"
 *         line above the sheet. Compact card layout (rows of cards side by side).
 * v1.4.0 (11 Oct 2026): renamed POS Supplier New Product Check and Clean Merge. Workbook with the Google Sheet's tabs
 *         along the bottom (IN_SUPPLIER, OUT_MERGED_DATA review / all columns, OUT_POS_INSERT / UPDATE, SRC_ tabs,
 *         TMP_MERGED_POS_DATA — read-only sheets in js/sheet-grid.js). The supplier sheet shows every row (no pages).
 *         Engine formulas: TO_TEXT reads the displayed cell (sheets-formula / sheets-shim v1.0.1).
 * v1.5.0 (11 Oct 2026): every workbook tab except TMP_MERGED_POS_DATA is editable (js/sheet-grid.js v1.1.0):
 *         the SRC_ tabs change the saved reference tables (run the stages again to use them); OUT_MERGED_DATA edits run
 *         the Sheet's own onEdit in the engine (fake barcode for NEW, UPDATED SUPPLIER queued for Refresh supplier
 *         changes, FINAL SHELF RRP worked out again) and stage 3 can run again; OUT_POS_INSERT / UPDATE edits go into
 *         the TXT files with Export TXT again. The tabs look like the Google Sheet (js/sheet-look.js: row-1 totals band,
 *         conditional colours, centred columns). Optional password lock (assets/js/phf-lock.js). Merge v6.3.89.

 * v1.6.0 (12 Oct 2026): (1) the whole session is kept in this browser — POS Database, Supplier Updates, the stage results
 *         with your edits, the TXT files and the options — and comes back when the page opens, until Clear or a new run;
 *         (2) filters decide what is processed: a SUP BRAND filter on the supplier sheet merges only those brands (stages
 *         1–2), filtered OUT_MERGED_DATA rows make stage 3 use only the rows shown (the Sheet's "from filtered data"),
 *         a filtered OUT_POS_INSERT / UPDATE tab makes Export TXT again use only its rows shown; (3) "Update in POS" ticks on
 *         the supplier sheet headings: an unticked column keeps POS's current value for matched products (RRP + price
 *         levels exactly as they are, no new labels), and matched products that end up the same as POS are left out;
 *         "Discontinue missing products" can be turned off. All done around the unchanged script (engine-host v1.2.0).
 * v1.6.1 (12 Oct 2026): what POS keeps is what OUT_MERGED_DATA shows — for matched products the kept columns show POS's
 *         current values (NEW RRP, rrp incgst, price levels 1–9, ret price, FINAL SHELF RRP worked out from POS's RRP;
 *         wholesale with no change; Sub ID, brand, description, units, box lot, GST, supplier), on the page, in its totals
 *         and in the review workbook; those cells cannot be edited (sheet-grid v1.2.1 cellLock). Kept cells take the Sheet's
 *         "no change" grey text (#9E9E9E) on the row bands, on the supplier sheet too. The POS UPDATE file is unchanged.
 * v1.6.2 (12 Oct 2026): files cannot be added, replaced or removed while a stage runs or the last session is coming back
 *         (inputsLocked; results made from inputs that changed during a run are not kept); a TAB inside a cell becomes a
 *         space before the merge (merge-map v1.0.3 / engine-host v1.2.1); number formats are never dropped (sheets-shim
 *         v1.0.3); a save the browser refuses (storage full) is reported instead of hanging; removing Supplier Updates
 *         clears the SUP BRAND filter.
 * v1.5.1 (12 Oct 2026): renamed POS New Product Check Clean. With a password set, it opens behind a "Still under
 *         development" prompt and the Lock / Password buttons appear only once it is open (phf-lock.js v1.1.0).
 *         Ongoing Discounts dropped here (on its row or in Drop All) is saved to the Library as that table alone, so the
 *         other tools can read it (Reconcile CH2 Order now uses the same file).
 * v1.7.0 (12 Oct 2026): the Library keeps the full sets from Build POS Master Databases v21.14.0 (clean_merged_pos_data,
 *         clean_ch2_data, clean_uhp_data). A full CH2 / Unique set — from the Add buttons or dropped in — becomes the
 *         supplier rows A–P with the Build's own rules (../database-build/js/supplier-layout.js), the same rows as its
 *         _pos_db file; supplier files in the A–P layout and the older Library copies load as before. The supplier sheet
 *         fits the page width (no sideways scroll): fixed column widths, headings on two lines, long cells end in … with
 *         the full text on hover.
 * v1.7.1 (12 Oct 2026): supplier sheet columns as wide as what they hold (supFit measures the rows on show — INDEX with
 *         its + tag, empty columns narrow, SUP PRODUCT / STATUS / names give way first on a narrow window); headings in
 *         three aligned bands (letter · heading centred · Update in POS tick on one line). Run bar above the workbook,
 *         sticky while scrolling: the three stages with their state and the run status (the same runs as the cards).
 * v1.7.2 (12 Oct 2026): supplier sheet clean-up — one navy strip (title, status, totals, rows), one scope line, the
 *         Update in POS / Discontinue options in the toolbar; headings in two rows like the other tabs (letters, then the
 *         heading on up to 2 lines with its tick); the sheet fills the window under the run bar; spare width goes to
 *         SUP PRODUCT; no + badge on pasted rows (the gold edge stays).
 * v1.8.0 (13 Oct 2026): the supplier sheet looks like its Google Sheet tab — the totals sit in a navy row 1 above the
 *         columns (A total · B supplier names · C POS suppliers · D barcodes · E brands · J total WS · K total RRP · P the
 *         STATUS counts) instead of a strip above the sheet; navy headings with gold text, an unticked Update in POS heading
 *         turns its text grey (the navy stays); prices (J, K, N) show 2 decimals (display only); the latest message is one
 *         line in the title band (no green box); toolbar buttons 32 px, blue Paste and white the rest, as on OUT_MERGED_DATA.
 *         Rows pasted or typed here are not amber — amber marks a value changed after it arrived (rows from files: any
 *         change). OUT_MERGED_DATA: the Update in POS tick is under every heading POS can keep (the same setting as the
 *         supplier sheet; it recalculates straight away), no KEPT label; its coloured tiles show only in Review columns (the
 *         Sheet view has the same totals in row 1); toolbar 32 px. Run bar messages wrap to two lines.
 * v1.9.0 (13 Oct 2026): every row-1 total on every tab follows the search and column filters (sheet-look v1.1.0: unique
 *         brands / suppliers, status counts, $ totals of the rows shown; TMP's price × SOH totals are STOCK VALUE); the
 *         rows badges say N OF M ROWS for the column filters too. Brand Name Changes, Product Prefixes, POS Suppliers and
 *         Ongoing Discounts are required (merge-map v1.2.0). Before stage 1, an empty POS SUPPLIER NAME is filled from
 *         POS Suppliers by its POS SUPPLIER NUMBER (fillSupNames).
 * v1.10.0 (13 Oct 2026): the Update in POS ticks are on the supplier sheet only again — OUT_MERGED_DATA's headings have
 *         none (keptDim: a column POS keeps has grey heading text, sheet-grid v1.4.0 `dim`). No inner lines in the
 *         heading block of any sheet (merge.css). The review workbook's stamp gives this version (it said v1.7.2).
 * v1.11.0 (13 Oct 2026): OUT_MERGED_DATA's Update in POS ticks are back (keepTicks, as v1.8.0). New ticks on the supplier
 *         sheet: M SUP STOCK IN (a new product's pos soh), N SUP DISCOUNT PRICE (used or not — the merge runs again),
 *         O POS MEMBER (price levels 1–5; engine-host v1.3.0 works member out from O, the brand flags, then POS). The
 *         search box is a search / add bar (supFindSpec / supFindRows / supFindAdd: started with the supplier, | slots
 *         in column order, barcode first then brand / Sub ID / product / WS); Add 5 rows; Clear empty rows; fill down
 *         (the corner square, Ctrl+D); Ctrl+C writes the clipboard itself. No lines between the sheet's bands.
 * v1.11.1 (13 Oct 2026): a pasted block lines up so its barcodes land in D (barcodeCol) — at a selected cell (6+ columns,
 *         pasted at B–D) and with the Paste button; a row-shaped block with no barcode column is flagged at once.
 * v1.12.0 (13 Oct 2026): OUT_MERGED_DATA's TYPE (AM) is the packaging (BS) POS gets (engine-host v1.4.0, which also
 *         fixes SACHETS: STICK alone is not a sachet; SACH abbreviations and single-serve packs are). SUP PRODUCT's
 *         Update in POS tick covers packaging too (unticked = POS keeps its packaging).
 * v1.13.0 (14 Oct 2026): upload checks before the TXT files (engine-host v1.5.0 uploadChecks). Every OUT_POS_INSERT /
 *         OUT_POS_UPDATE row has an Upload tick in its row number (sheet-grid v1.6.0): a row the checks HOLD (RRP below
 *         WSP, last price under half the WSP, barcode check digit, a new product POS already has by barcode or Sub ID)
 *         starts unticked and stays out of the TXT until it is ticked; CHECK rows (price moved more than 40 %, brand /
 *         Sub ID / size differ from POS, a discontinued product with stock on hand or a price change) and FIXED rows
 *         (box / display WSP ÷ pack count, SELL text or a repeated word taken out of the description, ZZZZ brand / descr
 *         made consistent) stay ticked and are coloured. The "Upload checks" list above the tab shows every flagged row
 *         with its reason, Show held / to check / fixed / all buttons, Tick all / Untick all held. Stage 3 and Export TXT
 *         again write only the ticked rows (uploadOnly → the engine's `only`); the ticks are kept with the session and
 *         the review workbook has an OUT_UPLOAD_CHECKS sheet. Column ticks (Update in POS) never apply to INSERT rows.
 * v1.14.0 (14 Oct 2026): OUT_MERGED_DATA ticks only where there is a choice — one tick on each CURRENT / NEW pair
 *         (supplier, brand, description, WSP, last price, RRP; keepTicks / KEEP_GROUPS cur + new) and one on SIZE; the
 *         internal columns (CHANGE %, MARKUP, FINAL SHELF RRP) and the POS block have none. Last price has its own tick
 *         (KEEP_GROUPS `last`, split from `ws`); item size (`size`) goes to POS from SIZE as written (engine-host v1.6.0
 *         refineSizes fills the SIZE gaps: 60S, 60TB, 50 GUMMIES, 90 VEGIECAPS, 70MLS, 5LB, 3PK, 30 X SACH, 20X5G).
 *         Ctrl + arrow jumps to the edge of the data on every sheet (sheet-grid v1.7.0 jump; the supplier sheet too).
 * v1.14.1 (14 Oct 2026): a Combined Master (Full_Data, from Build POS Master Databases) dropped on an input is named as
 *         such — it is not the POS Database (its POS block has blank rows for CH2 / Unique-only products) and it is not a
 *         supplier set — instead of "Missing columns: POS MASTER BRAND …" after supplier-layout turned its CH2 columns
 *         into supplier rows. A Library file that cannot be read says so on the page instead of only in the console.
 * v1.14.2 (14 Oct 2026): a newer POS Database in the Library (a new Build) replaces the one brought back from last
 *         session instead of being skipped; a file dropped in this session still wins.
 * v1.14.3 (15 Oct 2026): engine-host v1.6.1 — one last price on three or more products of a brand whose WSPs differ
 *         (a discount % typed into SUP DISCOUNT PRICE) holds every one of them.
 * v1.14.4 (15 Oct 2026): engine-host v1.6.2 — the POS brand is the master for matched products (POS keeps brand, descr
 *         and pos desc when the supplier's brand differs: MELROSE for MELROSE PEAK, MARTIN & PLEASANCE for RESTQ); the
 *         supplier-sheet search bar looks like the other search bars (icon, ×).
 * v1.14.5 (15 Oct 2026): the brand pair starts on CURRENT (POS's brand is the master; tick NEW to take the supplier's)
 *         — engine-host v1.6.3 no longer keeps it by itself; a cell changed by hand on OUT_MERGED_DATA shows orange text
 *         on an orange band (as on the supplier sheet); an UPDATED SUPPLIER typed in is approved against POS Suppliers
 *         (→ "NAME (NUMBER)") or refused and put back; an Upload tick changed from the checks' default shows orange.
 * v1.14.6 (15 Oct 2026): the brand pair starts on NEW again — the supplier's brand (after Brand Name Changes) is the
 *         master and OLD BRAND shows what POS had; tick CURRENT, or change the cell, to keep POS's.
 * v1.14.7 (15 Oct 2026): Find & Replace is a required reference table (merge-map v1.2.1); the rail says whether this
 *         browser's storage is protected from automatic clearing (PHFLibrary.persisted) — saved reference tables and the
 *         session disappear when the browser clears the site's storage.
 * v1.14.8 (15 Oct 2026): a POS Database that Build saves while this page is open is loaded at once when the slot is empty
 *         or holds an older Library copy (it said "reload this page"); the session's own copy of a Library file that was
 *         ✕-ed is not brought back by a newer build being dismissed — dismissal is per saved copy, as before.
 * v1.14.9 (15 Oct 2026): Ctrl + C on the sheets writes through the clipboard API first (the hidden-box trick only as a
 *         fallback) and copies an empty selection as empty text; sheet-grid v1.7.2 the same.
 * v1.14.10 (16 Oct 2026): the brand tick pair is OLD BRAND (current) / POS BRAND (new) — OUT_MERGED_DATA's POS BRAND is
 *         the updated brand and OLD BRAND what POS had; v1.14.0 had it on POS BRAND / SUP BRAND (the raw supplier word).
 * v1.15.0 (16 Oct 2026): no ticks on OUT_MERGED_DATA's headings — the updated columns (UPDATED SUPPLIER, POS BRAND, POS
 *         DESCR, NEW WSP / LAST PRICE / RRP, SIZE) are what goes to POS; to override, edit that cell (orange; UPDATED
 *         SUPPLIER is checked against POS Suppliers). The "what POS has now" columns (POS SUPPLIER, OLD BRAND, ORIGINAL
 *         POS DESCR, CURRENT WSP / LAST PRICE / RRP) are read-only. Update in POS ticks stay on the supplier sheet. Fill
 *         down on the workbook sheets (the corner square, Ctrl+D; sheet-grid v1.8.0). The supplier sheet's Update in POS
 *         tick for the supplier is on POS SUPPLIER NAME (B) and POS SUPPLIER NUMBER (C) — one setting, shown on both.
 *         Engine-host v1.7.0: sell-through "*" on POS DESCR + NOTES, LTR / PWD forms, WOMEN'S / MEN'S not doubled.
 * v1.15.1 (16 Oct 2026): the price tick pairs are back on OUT_MERGED_DATA — CURRENT / NEW WSP EXGST, LAST PRICE and RRP,
 *         with the v1.14.0 rules (NEW = the merge's price goes to POS, CURRENT = matched products keep POS's, same
 *         setting as the supplier sheet's J / K ticks). Supplier, brand, description and SIZE stay tick-less.
 * v1.15.2 (16 Oct 2026): the supplier sheet's J tick covers the WSP and the last price again (as before v1.14.0) — it sets
 *         both OUT pairs; the OUT NEW / CURRENT LAST PRICE tick can still split them for a run. The CURRENT WSP / LAST
 *         PRICE / RRP columns are editable again (v1.15.0 had locked them).
 * v1.15.3 (16 Oct 2026): the WSP and last price pairs move together on OUT_MERGED_DATA too — tick CURRENT WSP EXGST and
 *         CURRENT LAST PRICE ticks with it, tick NEW WSP EXGST and NEW LAST PRICE follows (either pair's tick sets both).
 *         Edited cells look the same on every sheet (merge.css v1.13.5).
 * v1.15.4 (16 Oct 2026): the pricing review columns always show the merge's new price and its coloured change (NEW WSP
 *         EXGST, WSP CHANGE % / $, NEW LAST PRICE, CHANGE LAST PRICE % / $, NEW RRP) — with CURRENT ticked they are only
 *         greyed. The POS block (wsp excgst, last price, rrp incgst, price levels, ret price) and FINAL SHELF RRP still
 *         show what POS will have.
 * v1.15.5 (16 Oct 2026): SUP SUB ID unticked greys OUT_MERGED_DATA's POS SUB ID (N) on matched rows as well as the POS
 *         block's sub id (which shows POS's own) — the POS files already kept POS's Sub ID (verified: 1,753 of 1,753).
 *         UPDATED SUPPLIER (G) greys the same way with B / C unticked. New products always carry the supplier's values.
 *         Unticked, N and G show POS's existing Sub ID / supplier on matched rows (as POS BRAND and POS DESCR already did):
 *         the sheet shows what POS will have. Prices keep showing the new price and its change (v1.15.4).
 * v1.16.0 (16 Oct 2026): sheet-grid v1.9.0 — every column menu sorts (A–Z / Z–A, highest–lowest) as well as filters; tick
 *         boxes in the row numbers of OUT_MERGED_DATA and the SRC tabs with Delete rows for the ticked rows (OUT rows can
 *         be deleted, not added); the sheets' own INDEX / POS INDEX column is not shown (the row numbers are the index);
 *         OUT_MERGED_DATA's toolbar is the grid's own (search, rows, Delete, Undo on one row) — the row status / price
 *         status / brand dropdowns are gone (the column menus do that). Supplier sheet: a plain search bar (the type-a-row
 *         Add is gone), "Clean up empty rows", a tick box on every row with Delete rows for the ticked rows. Engine-host
 *         v1.7.2: SUP DISCOUNT PRICE (N) is a discount percentage off the WSP, never a dollar price.
 * v1.16.1 (16 Oct 2026): engine-host v1.7.3 — the description clean-up runs on OUT_MERGED_DATA itself: no ZZZZ marker inside
 *         a description, no repeated leading phrase, no abbreviation next to its word, no size written twice. */
(function () {
  'use strict';

  var TOOL_VERSION = 'v1.16.7';    // the review workbook's stamp (it was left at v1.7.2 in v1.8.0 / v1.9.0)
  // v1.3.0 Staff Hub Library: input id + Library kind loaded on open. ✕ / Remove on a Library file stops it loading
  // here until a newer copy is saved; Ongoing Discounts is one shared file, so removing it deletes the saved copy.
  // v1.3.1: the supplier imports are NOT loaded on open (a merge covers only the brands in Supplier Updates, so a
  // full CH2 / Unique catalogue would widen every merge to all its brands) — LIB_SUP lists them for the Add buttons.
  var LIB = window.PHFLibrary || null, LIB_TOOL = 'pos-supplier-merge';
  var LIB_LOAD = [{ id: 'pos', kind: 'lib:pos-db' }, { id: 'disc', kind: 'lib:ref-discounts' }];
  var LIB_SUP = ['lib:ch2-db', 'lib:uhp-db'];
  var LIB_SHARED = { disc: 'lib:ref-discounts' };
  var M = window.PHFMergeMap;
  var $ = function (s) { return document.querySelector(s); };
  var SHEETS = {
    TMP: 'TMP_MERGED_POS_DATA', SUP: 'IN_SUPPLIER_/_PRODUCT_UPDATES', OUT: 'OUT_MERGED_DATA',
    INS: 'OUT_POS_INSERT', UPD: 'OUT_POS_UPDATE'
  };
  var GROUPS = ['POS data', 'Supplier updates', 'Reference data'];
  var STAGES = [
    { id: 'highlight', n: 1, title: 'Highlight New Products + Best Buy', steps: ['highlight'],
      desc: 'Sets the supplier STATUS (new, matched, best buy, not used) exactly as the Google Sheet menu item does.' },
    { id: 'build', n: 2, title: 'Build OUT_MERGED_DATA', steps: ['build'],
      desc: 'Matches supplier rows to POS products and builds OUT_MERGED_DATA: matched, new, review and discontinued rows.' },
    { id: 'export', n: 3, title: 'Generate Insert + Update & Export', steps: ['generate', 'export'],
      desc: 'Builds OUT_POS_INSERT / OUT_POS_UPDATE and the two POS import TXT files.' }
  ];

  var state = {
    inputs: {},            // id -> { files:[{name,size,tab,data,report}], savedAt }
    rev: 0,                // bumps whenever inputs change
    engine: null, engineInfo: null, loadedRev: -1,
    stage: {},             // id -> { status, msg }
    results: {},           // in-memory engine sheets
    outputs: new Map(),
    bulk: [],
    busy: false,
    review: { rows: [], head: [], idx: {}, filtered: [], page: 0 },
    storage: 'indexeddb',
    // v1.5.0 sheet edits: engine sheets (OUT / OUT_POS_*) — cells changed here (marks), undo depth kept by the engine,
    // OUT edited after stage 3, OUT_POS_* edited after the last export, UPDATED SUPPLIER changes waiting for Refresh.
    edits: { marks: {}, undo: {}, outAfter3: false, pos: {}, busy: false, optsAfter3: false, ticks: false },   // v1.13.0 ticks: Upload ticks changed since the last export
    pendingSup: 0,
    // v1.6.0: POS update options (keep[group] = POS keeps its value for matched products), the SUP BRAND scope the engine
    // was loaded with, and the scope the results were made with.
    opts: { keep: {}, discontinue: true },   // v1.14.6: every pair starts on NEW — SUP BRAND is the master, OLD BRAND shows what POS had (tick CURRENT to keep POS's)
    loadedScope: '', resultScope: null
  };
  // v1.6.0 — "Update in POS" ticks on the supplier sheet headings. col = IN_SUPPLIER column (0-based); upd = OUT_POS_UPDATE
  // columns the tick decides; out = OUT_MERGED_DATA columns greyed for matched products when POS keeps its value.
  var PR = ['pr 1 pc', 'pr 2 pc', 'pr 3 pc', 'pr 4 pc', 'pr 5 pc', 'pr 6 pc', 'pr 7 pc', 'pr 8 pc', 'pr 9 pc'];
  var KEEP_GROUPS = [
    // v1.14.0: `cur` / `new` = the CURRENT / NEW pair on OUT_MERGED_DATA that carries this group's tick there (tick NEW = the
    // merge's value goes to POS, tick CURRENT = POS keeps its own); groups without a pair have their tick on the supplier
    // sheet only. col -1 = no supplier-sheet tick (`last`, `size`).
    { id: 'supplier', col: 1, cols: [1, 2], what: 'supplier', upd: ['supplier'], out: ['supplier', 'UPDATED SUPPLIER'], cur: 'POS SUPPLIER', new: 'UPDATED SUPPLIER' },   // v1.15.5: G greys too when POS keeps its supplier
    { id: 'brand', col: 4, what: 'brand', upd: ['brand'], out: ['brand', 'POS BRAND', 'OLD BRAND'], cur: 'OLD BRAND', new: 'POS BRAND' },   // v1.14.10: POS BRAND is the updated brand (the engine writes it there), OLD BRAND what POS had
    { id: 'sub', col: 5, what: 'Sub ID', upd: ['sub id'], out: ['sub id', 'POS SUB ID'] },   // v1.15.5: N greys too when POS keeps its Sub ID
    { id: 'product', col: 6, what: 'description (descr / pos desc) and packaging', upd: ['descr', 'pos desc', 'packaging'], out: ['POS DESCR', 'descr', 'pos desc', 'packaging'], cur: 'ORIGINAL POS DESCR', new: 'POS DESCR' },   // v1.12.0 packaging
    { id: 'units', col: 7, what: 'units', upd: ['units'], out: ['units'] },
    { id: 'minorder', col: 8, what: 'min order qty (box lot)', upd: ['min order qty'], out: ['min order qty'] },
    { id: 'ws', col: 9, what: 'wholesale price', tip: 'Update in POS — ticked: the WSP and the last price are updated from the merge (J covers both; NEW LAST PRICE on OUT_MERGED_DATA can be set on its own). Unticked: POS keeps its current WSP and last price for matched products.', upd: ['wsp excgst'], out: ['NEW WSP EXGST', 'WSP CHANGE %', 'WSP CHANGE $', 'wsp excgst'], cur: 'CURRENT WSP EXGST', new: 'NEW WSP EXGST' },
    { id: 'last', col: -1, what: 'last price', upd: ['last price'], out: ['NEW LAST PRICE', 'CHANGE LAST PRICE %', 'CHANGE LAST PRICE $', 'last price'], cur: 'CURRENT LAST PRICE', new: 'NEW LAST PRICE' },   // v1.14.0 its own tick
    { id: 'size', col: -1, what: 'item size', upd: ['itemsize'], out: ['itemsize'], single: 'SIZE',
      tip: 'Item size — ticked: SIZE (AL) goes to POS as the item size, as written (1KG, 300G, 60C), for new and matched products. Unticked: matched products keep POS’s item size and new products get none.' },   // v1.14.0
    // v1.11.0 — O (POS MEMBER): price levels 1–5 alone. It is listed before SUP RRP INC GST so OUT_MERGED_DATA's pr 1–5
    // headings carry its tick; unticking SUP RRP INC GST still keeps every price level (RRP and levels exactly as POS has
    // them, so no new labels), as before.
    { id: 'member', col: 14, what: 'price levels 1–5 (member pricing)', upd: PR.slice(0, 5), out: PR.slice(0, 5),
      tip: 'POS MEMBER — ticked: price levels 1–5 follow the merge (PL1 90% for member products, else 100%; PL2 90%; PL3 85%; PL4 80%; PL5 the staff formula). Member = this cell (TRUE / FALSE), else the brand’s flag in Product Prefixes / Ongoing Discounts, else POS: the product’s own PL1, or for a new product most of the brand’s POS products. Unticked: POS keeps its current price levels 1–5 for matched products. (SUP RRP INC GST unticked keeps every price level anyway.)' },
    { id: 'rrp', col: 10, what: 'RRP, price levels 1–9 and ret price', upd: ['rrp incgst'].concat(PR, ['ret price']),
      out: ['NEW RRP', 'WSP TO RRP MARKUP %', 'WSP TO RRP MARKUP +6.5%', 'RRP / MARKUP OVERRIDE', 'FINAL SHELF RRP', 'rrp incgst'].concat(PR, ['ret price']), cur: 'CURRENT RRP', new: 'NEW RRP' },
    { id: 'gst', col: 11, what: 'GST', upd: ['gst tax pc'], out: ['gst tax pc'] },
    // v1.11.0 — M, N: `use` ticks decide whether the column is used at all (unticked = not used), not what POS keeps.
    { id: 'stock', col: 12, use: true, what: 'stock in', upd: [], out: [],
      tip: 'Stock in — ticked: a number here becomes a NEW product’s stock on hand in POS (pos soh in the INSERT file), for a buy-in with stock. Matched products keep POS’s stock (it comes in through receiving). Empty = nothing. Unticked: no stock goes to POS.' },
    { id: 'disc', col: 13, use: true, what: 'discount %', upd: [], out: [],
      tip: 'Discount % — ticked: a percentage here (15 = 15 % off the WSP) is a one-off extra discount: the last price becomes WSP less that percentage. Empty = the last price is the WSP less the ongoing discount. Unticked: the column is not used (the merge runs again).' }   // v1.16.0: a percentage, never a dollar price
  ];
  function keptGroups(ids) { return KEEP_GROUPS.filter(function (g) { return ids ? ids.indexOf(g.id) >= 0 : state.opts.keep[g.id]; }); }
  function keptNames(list, ids) { var m = {}; keptGroups(ids).forEach(function (g) { g[list].forEach(function (h) { m[h] = 1; }); }); return m; }
  function keptText() { return keptGroups().map(function (g) { return g.use ? 'not using ' + g.what : g.what; }).join(', '); }
  // v1.6.1 — what POS keeps is what OUT_MERGED_DATA shows. For matched products the columns of an unticked heading show
  // POS's current value from the POS Database (as engine-host v1.2.0 puts it in the POS UPDATE file), and the columns
  // worked out from them follow: the WSP / last price change shows 0 and FINAL SHELF RRP is worked out from POS's RRP as
  // the Sheet's formula does. Only the view changes (page, totals, review workbook) — the engine's sheet keeps the merge's
  // values, so ticking the heading again shows them. [OUT_MERGED_DATA heading, POS Database heading, POS blank → the
  // merge's value stays (POS cannot take blank there)]
  var KEEP_SHOW = {
    supplier: [['supplier', 'POS SUPPLIER'], ['UPDATED SUPPLIER', '=POS SUPPLIER']],   // v1.15.5: G shows the row's POS SUPPLIER (F) — NAME (NO)
    brand: [['POS BRAND', 'POS BRAND'], ['brand', 'POS BRAND']],
    sub: [['sub id', 'POS SUB ID'], ['POS SUB ID', 'POS SUB ID']],   // v1.15.5: N shows POS's Sub ID too
    product: [['POS DESCR', 'POS DESCR'], ['descr', 'POS DESCR'], ['pos desc', 'POS POS DESC'], ['packaging', 'POS PACKAGING']],
    units: [['units', 'POS UNITS', 1]],
    minorder: [['min order qty', 'POS MIN ORDER QTY', 1]],
    ws: [['wsp excgst', 'POS WSP EXCGST']],                                               // v1.15.4: NEW WSP EXGST keeps the merge's price (greyed)
    last: [['last price', 'POS LAST PRICE']],                                               // v1.14.0; v1.15.4 NEW LAST PRICE keeps the merge's
    size: [['itemsize', 'POS ITEMSIZE']],
    rrp: [['rrp incgst', 'POS RRP INCGST', 1]].concat(PR.map(function (h) { return [h, 'POS ' + h.toUpperCase(), 1]; }), [['ret price', 'POS RET PRICE', 1]]),
    gst: [['gst tax pc', 'POS GST TAX PC']],
    member: PR.slice(0, 5).map(function (h) { return [h, 'POS ' + h.toUpperCase(), 1]; })   // v1.11.0
  };
  var KEEP_ZERO = {}, KEEP_BLANK = { brand: ['OLD BRAND'] };   // v1.15.4: the change columns always show the merge's change
  // ROW STATUS → matched, as the merge reads it (m13OutStatusKey_: NEW wins over MATCHED).
  function isMatched(v) { var s = String(v == null ? '' : v).toUpperCase(); return s.indexOf('NEW') < 0 && s.indexOf('MATCHED') >= 0; }
  var posMapCache = null;
  function posMap() {
    if (posMapCache && posMapCache.rev === state.rev) return posMapCache;
    var col = {};
    ((M.SCHEMAS[SHEETS.TMP] || {}).headers || []).forEach(function (h, i) { h = String(h == null ? '' : h).trim().toUpperCase(); if (h && col[h] === undefined) col[h] = i; });
    var plu = col['POS PLU'], map = {};
    if (plu !== undefined) rowsOf('pos').forEach(function (r) { var k = String(r[plu] == null ? '' : r[plu]).trim(); if (k && !map[k]) map[k] = r; });
    return (posMapCache = { rev: state.rev, map: map, col: col });
  }
  // Money columns show POS's number as the merge shows its own ($45.85); price levels, ret price and the rest as POS has
  // them (90, 85.5, 10).
  var KEEP_MONEY = { 'NEW WSP EXGST': 1, 'wsp excgst': 1, 'NEW LAST PRICE': 1, 'last price': 1, 'NEW RRP': 1, 'rrp incgst': 1 };
  function moneyText(v) {
    var s = String(v == null ? '' : v).trim(), n = Number(s.replace(/[$,\s]/g, ''));
    if (s === '' || !isFinite(n)) return s;
    return (n < 0 ? '-$' : '$') + Math.abs(n).toFixed(2);
  }
  function zeroLike(old) { var o = String(old == null ? '' : old).trim(); return o === '' ? '' : /%$/.test(o) ? '0.00%' : /\$/.test(o) ? '$0.00' : '0'; }
  // FINAL SHELF RRP as the Sheet's formula shows it (1.3 Merge m13ShelfRrpFormula_, from BE rrp incgst, S NEW WSP EXGST,
  // W NEW LAST PRICE and AB HAS GST).
  function shelfText(rrpCell, wspCell, lastCell, hasGst) {
    var num = window.PHFSheetLook.num;
    if (String(rrpCell == null ? '' : rrpCell).trim() === '') return '';
    var rrp = num(rrpCell), wsp = num(wspCell), last = num(lastCell), ex = rrp / (hasGst ? 1.1 : 1);
    if (!(wsp > 0)) return '$' + rrp.toFixed(2);
    return (ex / wsp * 100).toFixed(2) + '% | $' + rrp.toFixed(2) + '\n' + (last > 0 ? 'GP NGST ' + ((ex - last) / ex * 100).toFixed(2) + '% | $' + (ex - last).toFixed(2) : '');
  }
  // OUT_MERGED_DATA rows as POS will have them (a copy; rows with nothing kept are the engine's own arrays).
  function keptRows(rows) {
    var groups = keptGroups(); if (!rows || rows.length < 3 || !groups.length) return rows;
    var head = rows[1] || [], H = {};
    head.forEach(function (h, i) { if (H[h] === undefined) H[h] = i; });
    var st = H['ROW STATUS'], plu = H['POS PLU']; if (st === undefined || plu === undefined) return rows;
    var pos = posMap(), sets = [], zero = [], blank = [], shelf = false, gstKept = false;
    groups.forEach(function (g) {
      (KEEP_SHOW[g.id] || []).forEach(function (k) {
        if (k[1].charAt(0) === '=') { if (H[k[0]] !== undefined && H[k[1].slice(1)] !== undefined) sets.push({ c: H[k[0]], from: H[k[1].slice(1)] }); return; }   // v1.15.5: from another OUT column
        if (H[k[0]] !== undefined && pos.col[k[1]] !== undefined) sets.push({ c: H[k[0]], p: pos.col[k[1]], need: !!k[2], money: !!KEEP_MONEY[k[0]] });
      });
      (KEEP_ZERO[g.id] || []).forEach(function (h) { if (H[h] !== undefined) zero.push(H[h]); });
      (KEEP_BLANK[g.id] || []).forEach(function (h) { if (H[h] !== undefined) blank.push(H[h]); });
      if (g.id === 'ws' || g.id === 'last' || g.id === 'rrp' || g.id === 'gst') shelf = true;
      if (g.id === 'gst') gstKept = true;
    });
    var AO = H['FINAL SHELF RRP'], BE = H['rrp incgst'], S_ = H['wsp excgst'], W_ = H['last price'], AB = H['HAS GST'], GT = H['gst tax pc'];   // v1.15.4: from the POS block (what POS will have)
    var out = rows.slice(0, 2);
    for (var i = 2; i < rows.length; i++) {
      var r = rows[i], p = r && isMatched(r[st]) ? pos.map[String(r[plu] == null ? '' : r[plu]).trim()] : null;
      if (!p) { out.push(r); continue; }
      var o = r.slice();
      sets.forEach(function (k) {
        if (k.from !== undefined) { o[k.c] = r[k.from] == null ? '' : r[k.from]; return; }
        var v = p[k.p] == null ? '' : p[k.p];
        if (String(v).trim() === '' && k.need) return;
        o[k.c] = k.money ? moneyText(v) : String(v);
      });
      zero.forEach(function (c) { o[c] = zeroLike(r[c]); });
      blank.forEach(function (c) { o[c] = ''; });
      if (shelf && AO !== undefined && BE !== undefined) {
        var gst = gstKept && GT !== undefined ? window.PHFSheetLook.num(o[GT]) > 0 : String(AB !== undefined ? o[AB] : '').trim().toUpperCase() === 'YES';
        o[AO] = shelfText(o[BE], S_ !== undefined ? o[S_] : '', W_ !== undefined ? o[W_] : '', gst);
      }
      out.push(o);
    }
    return out;
  }

  // ---------------------------------------------------------------- utils
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pretty(b) { if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(1) + ' MB'; }
  function fmtN(n) { return Number(n || 0).toLocaleString('en-AU'); }
  function melb(parts) {
    var p = {}; new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Melbourne', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return parts === 'iso' ? p.year + '-' + p.month + '-' + p.day : p.day + '/' + p.month + '/' + p.year + ' ' + p.hour + ':' + p.minute;
  }
  function inputDef(id) { return M.inputDef(id); }
  function loaded(id) { var x = state.inputs[id]; return !!(x && x.files && x.files.length); }
  function rowsOf(id) { var x = state.inputs[id]; var out = []; (x && x.files || []).forEach(function (f) { out = out.concat(f.data); }); return out; }
  function setGlobal(t, type) {
    var e = $('#globalStatus'); e.className = 'status ' + (type || 'info'); e.textContent = t;
    var r = $('#wbRunStatus'); if (r) { r.textContent = t; r.title = t; r.className = 'wb-runbar-status is-' + (type || 'info'); }   // v1.7.1 run bar
  }
  function gpct(v) { var p = $('#globalProgress'), b = $('#globalProgressBar'); p.classList.toggle('hidden', v <= 0); b.style.width = Math.max(0, Math.min(100, v)) + '%'; }
  function cleanTitle(s) { return String(s || '').replace(/^[^A-Za-z0-9(]+/, '').trim(); }

  // ------------------------------------------------- saved reference (IndexedDB)
  var DB_NAME = 'phf-pos-supplier-merge', DB_STORE = 'reference', memStore = {};
  function dbOpen() {
    return new Promise(function (res, rej) {
      if (!window.indexedDB) { rej(new Error('IndexedDB not available')); return; }
      var rq = indexedDB.open(DB_NAME, 1);
      rq.onupgradeneeded = function () { rq.result.createObjectStore(DB_STORE, { keyPath: 'id' }); };
      rq.onsuccess = function () { res(rq.result); };
      rq.onerror = function () { rej(rq.error || new Error('IndexedDB open failed')); };
    });
  }
  function dbTx(mode, fn) {
    return dbOpen().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction(DB_STORE, mode), st = tx.objectStore(DB_STORE), out = fn(st);
        tx.oncomplete = function () { res(out && out.result !== undefined ? out.result : out); db.close(); };
        tx.onerror = function () { rej(tx.error); db.close(); };
        // v1.6.2: a write the browser refuses (storage full) ends in abort, not error — reject so the page can say so.
        tx.onabort = function () { rej(tx.error || new Error('The browser stopped saving (storage may be full)')); try { db.close(); } catch (e) {} };
      });
    });
  }
  function refSave(id) {
    var rec = { id: id, files: state.inputs[id].files, savedAt: state.inputs[id].savedAt };
    if (state.storage !== 'indexeddb') { memStore[id] = rec; return Promise.resolve(); }
    return dbTx('readwrite', function (st) { st.put(rec); }).catch(function (e) { state.storage = 'memory'; memStore[id] = rec; console.warn(e); });
  }
  function refDelete(id) {
    delete memStore[id];
    if (state.storage !== 'indexeddb') return Promise.resolve();
    return dbTx('readwrite', function (st) { st.delete(id); }).catch(function () {});
  }
  function refLoadAll() {
    return dbTx('readonly', function (st) { return st.getAll(); }).then(function (list) {
      (list || []).forEach(function (rec) { if (rec && rec.id && inputDef(rec.id)) state.inputs[rec.id] = { files: rec.files || [], savedAt: rec.savedAt }; });
    }).catch(function (e) { state.storage = 'memory'; console.warn('Saved reference unavailable:', e); });
  }

  // ---------------------------------------------------------------- engine
  function createEngine(onProgress) {
    var seq = 0, pending = new Map(), worker = null, frame = null, info = null, kind = '';
    var readyRes, readyRej, ready = new Promise(function (res, rej) { readyRes = res; readyRej = rej; });
    var timer = setTimeout(function () { if (!info) readyRej(new Error('The merge engine did not start within 60 seconds.')); }, 60000);
    function onMsg(d) {
      if (!d || !d.type) return;
      if (d.type === 'ready') { if (!info) { info = d.versions || {}; info.kind = kind; clearTimeout(timer); readyRes(info); } return; }
      if (d.type === 'progress') { if (onProgress) onProgress(d); return; }
      var p = pending.get(d.id); if (!p) return; pending.delete(d.id);
      if (d.type === 'error') { var e = new Error(d.message || 'Engine error'); e.detail = d; p.reject(e); } else p.resolve(d);
    }
    function frameListener(ev) { if (frame && ev.source === frame.contentWindow && ev.data && ev.data.__phfMergeEngine) onMsg(ev.data); }
    function startFrame() {
      kind = 'in-page';
      frame = document.createElement('iframe');
      frame.hidden = true; frame.title = 'POS New Product Check Clean engine';
      frame.src = './engine-frame.html?v=1.7.4';
      window.addEventListener('message', frameListener);
      document.body.appendChild(frame);
    }
    try {
      worker = new Worker('./js/engine-worker.js?v=1.7.4');
      kind = 'worker';
      worker.onmessage = function (ev) { onMsg(ev.data); };
      worker.onerror = function (ev) {
        if (!info) { if (ev && ev.preventDefault) ev.preventDefault(); try { worker.terminate(); } catch (e) {} worker = null; startFrame(); return; }
        pending.forEach(function (p) { p.reject(new Error('Engine error: ' + (ev && ev.message ? ev.message : 'unknown'))); }); pending.clear();
      };
    } catch (e) { worker = null; startFrame(); }
    return {
      ready: ready,
      info: function () { return info; },
      send: function (msg) {
        return ready.then(function () {
          return new Promise(function (res, rej) {
            var id = ++seq, m = Object.assign({}, msg, { id: id });
            pending.set(id, { resolve: res, reject: rej });
            if (worker) worker.postMessage(m);
            else frame.contentWindow.postMessage(Object.assign(m, { __phfMergeCmd: true }), '*');
          });
        });
      },
      terminate: function () {
        clearTimeout(timer);
        try { if (worker) worker.terminate(); } catch (e) {}
        if (frame) { frame.remove(); window.removeEventListener('message', frameListener); }
        pending.forEach(function (p) { p.reject(new Error('Engine restarted')); }); pending.clear();
      }
    };
  }
  function engineProgress(d) {
    var running = STAGES.filter(function (s) { return (state.stage[s.id] || {}).status === 'running'; })[0];
    var text = cleanTitle(d.title) + (d.msg ? ' — ' + String(d.msg).split('\n')[0] : '');
    if (running) stageMsg(running.id, text, 'running');
  }
  function startEngine() {
    if (state.engine) state.engine.terminate();
    state.engine = createEngine(engineProgress);
    state.loadedRev = -1;
    renderEngineState('starting');
    return state.engine.ready.then(function (info) { state.engineInfo = info; renderEngineState('ready'); return info; })
      .catch(function (e) { renderEngineState('error', e.message); throw e; });
  }
  function renderEngineState(kind, msg) {
    var el = $('#engineState'); if (!el) return;
    var i = state.engineInfo || {};
    var v = String(i.merge || '').match(/v\d+\.\d+\.\d+/), sv = String(i.setup || '').match(/v\d+\.\d+\.\d+/);
    if (v && $('#engineVersion')) $('#engineVersion').textContent = v[0];
    if (kind === 'ready') el.innerHTML = '<span class="phf-pill is-green">Engine ready</span><small>Merge ' + esc(v ? v[0] : '') + ' · Setup ' + esc(sv ? sv[0] : '') + ' · ' + (i.kind === 'worker' ? 'background worker' : 'in-page') + '</small>';
    else if (kind === 'error') el.innerHTML = '<span class="phf-pill is-red">Engine not started</span><small>' + esc(msg || '') + '</small>';
    else el.innerHTML = '<span class="phf-pill is-blue">Engine starting…</span>';
  }

  // ---------------------------------------------------------- file reading
  function readWorkbook(file) {
    if (typeof XLSX === 'undefined') return Promise.reject(new Error('The spreadsheet reader (SheetJS) did not load. Check the internet connection and reload the page.'));
    var ext = (file.name.split('.').pop() || '').toLowerCase();
    var p = (ext === 'csv' || ext === 'txt')
      ? file.text().then(function (t) { return XLSX.read(t, { type: 'string', raw: true }); })
      : file.arrayBuffer().then(function (b) { return XLSX.read(b, { type: 'array', raw: true, cellDates: false }); });
    return p.then(function (wb) {
      return wb.SheetNames.map(function (name) {
        var rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '', raw: true, blankrows: false });
        // v1.14.1: the Combined Master's Full_Data has the POS block and the CH2 / Unique blocks side by side — it is
        // neither input, so it is named rather than mistaken for a full CH2 set.
        if (isCombinedMaster(rows)) return { name: name, rows: rows, master: true };
        // v1.7.0: a full CH2 / Unique set (clean_ch2_data / clean_uhp_data) → the supplier rows A–P, as its _pos_db file.
        var full = window.PHFSupplierLayout ? window.PHFSupplierLayout.fromFullSheet(rows) : null;
        return full ? { name: name, rows: full.rows, from: full.label } : { name: name, rows: rows };
      });
    });
  }
  function isCombinedMaster(rows) {
    for (var i = 0; i < Math.min(8, (rows || []).length); i++) {
      var h = (rows[i] || []).map(function (x) { return String(x == null ? '' : x).trim().toUpperCase(); });
      if (h.indexOf('POS_PLU') >= 0 && h.indexOf('MATCH_STATUS') >= 0 && (h.indexOf('CH2_MASTER_BARCODE') >= 0 || h.indexOf('UHP_MASTER_BARCODE') >= 0)) return true;
    }
    return false;
  }
  var MASTER_MSG = 'this is the Combined Master from Build POS Master Databases (Full_Data — POS, CH2 and Unique side by side), not an input here. ' +
    'POS Database is the full POS set clean_merged_pos_data_… (saved in the Library by Build POS Master Databases and loaded here automatically); ' +
    'Supplier Updates is a full CH2 / Unique set (clean_ch2_data_… / clean_uhp_data_…) or a _pos_db file.';
  // Best tab of a workbook for one input: a tab recognised as that input, else
  // the tab whose headings map best. Returns { tab, mapped } or throws.
  function mapForInput(id, sheets) {
    var def = inputDef(id), errs = [], best = null;
    if ((id === 'pos' || id === 'sup') && sheets.some(function (s) { return s.master; })) throw new Error(MASTER_MSG);   // v1.14.1
    sheets = sheets.filter(function (s) { return !s.master; });
    var order = sheets.filter(function (s) { return M.identifyRows(s.rows).indexOf(id) >= 0; }).concat(sheets);
    for (var i = 0; i < order.length; i++) {
      try {
        var mp = M.mapTable(order[i].rows, def.sheet, id);
        if (order[i].from) mp.report.from = order[i].from;
        if (!best || mp.report.found > best.mapped.report.found) best = { tab: order[i].name, mapped: mp };
        if (i === 0 && M.identifyRows(order[i].rows).indexOf(id) >= 0) break;
      } catch (e) { errs.push(order[i].name + ': ' + e.message); }
    }
    if (!best) throw new Error(errs.length ? errs[0] : 'No usable rows were found.');
    if (!best.mapped.data.length) throw new Error('The file has the right headings but no data rows.');
    return best;
  }
  function fileEntry(file, tab, mapped) {
    return { name: file.name, size: file.size, tab: tab, data: mapped.data, report: mapped.report, loadedAt: melb(), loadedIso: new Date().toISOString() };
  }
  function addToInput(id, entry) {
    var def = inputDef(id), cur = state.inputs[id] || { files: [] };
    if (def.multi) {
      var files = cur.files.filter(function (f) { return !(f.name === entry.name && f.tab === entry.tab); });
      files.push(entry); cur.files = files;
    } else cur.files = [entry];
    cur.savedAt = melb();
    state.inputs[id] = cur;
    state.rev++;
    if (id === 'sup') supView.undo = [];
    if (def.stored) refSave(id);
    invalidateResults('Inputs changed — run the stages again.');
  }
  // The shared Ongoing Discounts file goes to the Library as that table alone (v1.5.1): from a workbook with more tabs
  // (the Google Sheet download) its SRC_POS_ONGOING_DISCOUNTS tab becomes its own .xlsx, so Build POS Master Databases
  // and Reconcile CH2 Order can read it too.
  function shareToLib(id, file, sheets, tab, entry) {
    if (!LIB || !LIB_SHARED[id]) return;
    var out = file;
    if (sheets.length > 1) {
      var sh = sheets.filter(function (x) { return x.name === tab; })[0];
      if (!sh) return;
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sh.rows), 'SRC_POS_ONGOING_DISCOUNTS');
      out = new File([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], 'SRC_POS_ONGOING_DISCOUNTS (from ' + file.name.replace(/\.(xlsx|xlsm|xls)$/i, '') + ').xlsx',
        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', lastModified: file.lastModified || Date.now() });
    }
    LIB.put(LIB_SHARED[id], out, { name: out.name, source: 'POS New Product Check Clean', meta: out === file ? '' : 'From ' + file.name }).then(function (r) {
      entry.libKind = LIB_SHARED[id]; entry.libSavedAt = r.savedAt; entry.libWhen = LIB.when(r);
      if (inputDef(id).stored) refSave(id); renderAll(); if (state.activeInput === id) showInput(id);
    }).catch(function (e) { console.warn('Library save failed', e); });
  }
  // v1.6.2: files cannot be added, replaced or removed while a stage runs or the last session is coming back — the run (or
  // the restore) would otherwise finish with the old files and still say Complete.
  function inputsLocked() {
    if (!state.busy && !sessRestoring) return false;
    setGlobal(state.busy ? 'A stage is running — add, replace or remove files when it finishes.' : 'Your last session is still loading — add, replace or remove files in a moment.', 'missing');
    return true;
  }
  function acceptFile(id, file) {
    if (inputsLocked()) return Promise.resolve(false);
    var def = inputDef(id);
    setGlobal('Reading ' + file.name + '…', 'running');
    return readWorkbook(file).then(function (sheets) {
      var best = mapForInput(id, sheets);
      var entry = fileEntry(file, best.tab, best.mapped);
      addToInput(id, entry);
      shareToLib(id, file, sheets, best.tab, entry);
      setGlobal(def.title + ': ' + file.name + ' loaded — ' + fmtN(best.mapped.report.rows) + ' rows.', 'success');
      renderAll(); showInput(id);
      return true;
    }).catch(function (e) {
      setGlobal(def.title + ': ' + e.message, 'error');
      showInput(id, e.message); flashInvalid(id);
      return false;
    });
  }
  function removeFile(id, idx) {
    if (inputsLocked()) return;
    var cur = state.inputs[id]; if (!cur) return;
    libForget(id, cur.files.slice(idx, idx + 1));
    cur.files.splice(idx, 1);
    if (id === 'sup') supView.undo = [];
    if (!cur.files.length) { delete state.inputs[id]; if (inputDef(id).stored) refDelete(id); }
    else if (inputDef(id).stored) refSave(id);
    state.rev++;
    invalidateResults('Inputs changed — run the stages again.');
    renderAll(); showInput(id);
  }
  function flashInvalid(id) { var b = document.querySelector('[data-input="' + id + '"]'); if (b) { b.classList.add('invalid'); setTimeout(function () { b.classList.remove('invalid'); }, 2500); } }

  // ------------------------------------------------------------ bulk drop
  function bulkAccept(list) {
    if (inputsLocked()) return Promise.resolve();
    var files = Array.prototype.slice.call(list || []).filter(function (f) { return f && f.size !== undefined; });
    if (!files.length) return;
    setGlobal('Identifying ' + files.length + ' file' + (files.length === 1 ? '' : 's') + '… (nothing will run)', 'running');
    var jobs = files.map(function (file) {
      var rec = { file: file, status: 'reading', assigned: [], ids: [], msg: 'Reading…' };
      state.bulk.unshift(rec); renderBulk();
      return readWorkbook(file).then(function (sheets) {
        var recognised = 0, notes = [];
        sheets.forEach(function (sh) {
          if (sh.master) { notes.push(sh.name + ': ' + MASTER_MSG); return; }   // v1.14.1
          var ids = M.identifyRows(sh.rows);
          if (ids.length !== 1) { if (ids.length > 1) notes.push(sh.name + ': could be ' + ids.map(function (i) { return inputDef(i).title; }).join(' or ')); return; }
          var id = ids[0];
          try {
            var mp = M.mapTable(sh.rows, inputDef(id).sheet, id);
            if (sh.from) mp.report.from = sh.from;
            if (!mp.data.length) { notes.push(sh.name + ': no data rows'); return; }
            var entry = fileEntry(file, sh.name, mp);
            addToInput(id, entry);
            shareToLib(id, file, sheets, sh.name, entry);
            rec.assigned.push(inputDef(id).title + (sheets.length > 1 ? ' (tab ' + sh.name + ')' : '') + ' · ' + fmtN(mp.data.length) + ' rows');
            rec.ids.push(id);
            recognised++;
          } catch (e) { notes.push(sh.name + ': ' + e.message); }
        });
        rec.status = recognised ? 'assigned' : (notes.length ? 'review' : 'unrecognised');
        rec.msg = recognised ? rec.assigned.join(' · ') : (notes.join(' · ') || 'Not recognised from its headings — choose the input it belongs to.');
      }).catch(function (e) { rec.status = 'unreadable'; rec.msg = 'Could not read this file (' + e.message + ').'; })
        .then(function () { renderBulk(); renderAll(); });
    });
    Promise.all(jobs).then(function () {
      var ok = state.bulk.filter(function (r) { return r.status === 'assigned'; }).length;
      setGlobal(ok ? 'Files assigned. ' + readinessText() : 'No file was recognised — choose the input for each file below.', ok ? 'success' : 'missing');
      updateRunButtons();
    });
  }
  function renderBulk() {
    var host = $('#bulkResults'), badge = $('#bulkCount'), list = state.bulk;
    var a = list.filter(function (r) { return r.status === 'assigned'; }).length, rv = list.length - a;
    badge.textContent = list.length ? a + ' ASSIGNED' + (rv ? ' · ' + rv + ' TO REVIEW' : '') : '0 FILES';
    badge.className = 'result-badge' + (list.length ? (rv ? ' warn' : ' ok') : '');
    if (!list.length) { host.innerHTML = ''; return; }
    host.innerHTML = list.map(function (r, i) {
      var cls = r.status === 'assigned' ? 'ok' : r.status === 'reading' ? 'reading' : (r.status === 'unreadable' || r.status === 'unrecognised') ? 'bad' : 'review';
      var st = r.status === 'assigned' ? 'ASSIGNED' : r.status === 'reading' ? 'CHECKING' : r.status === 'review' ? 'REVIEW' : 'NOT RECOGNISED';
      var pick = r.status === 'assigned' || r.status === 'reading' ? '' :
        '<select data-bulk-select="' + i + '" aria-label="Input for ' + esc(r.file.name) + '"><option value="">Choose input…</option>' +
        M.INPUTS.map(function (d) { return '<option value="' + d.id + '">' + esc(d.title) + '</option>'; }).join('') +
        '</select><button type="button" class="btn" data-bulk-assign="' + i + '">Assign</button>';
      return '<div class="bulk-row ' + cls + '"><div class="bulk-file"><strong>' + esc(r.file.name) + '</strong><span>' + pretty(r.file.size) + ' · ' + esc(r.msg) + '</span></div><span class="bulk-state">' + st + '</span><div class="bulk-assign">' + pick + '</div></div>';
    }).join('');
    host.querySelectorAll('[data-bulk-assign]').forEach(function (b) {
      b.onclick = function () {
        var i = +b.dataset.bulkAssign, r = state.bulk[i], sel = host.querySelector('[data-bulk-select="' + i + '"]'), id = sel && sel.value;
        if (!r || !id) return;
        acceptFile(id, r.file).then(function (ok) { if (ok) { r.status = 'assigned'; r.msg = 'Assigned to ' + inputDef(id).title; r.assigned = [r.msg]; r.ids = [id]; } renderBulk(); });
      };
    });
  }
  function wireBulkDrop() {
    var d = $('#bulkDrop'), i = $('#bulkInput');
    d.onclick = function () { i.click(); };
    d.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); i.click(); } };
    i.onchange = function () { var f = Array.prototype.slice.call(i.files); i.value = ''; bulkAccept(f); };
    d.ondragover = function (e) { e.preventDefault(); d.classList.add('drag'); };
    d.ondragleave = function () { d.classList.remove('drag'); };
    d.ondrop = function (e) { e.preventDefault(); d.classList.remove('drag'); bulkAccept(e.dataTransfer && e.dataTransfer.files); };
  }

  // ------------------------------------------------------------ rail + cards
  function libStaleFiles(id) { var x = state.inputs[id]; return ((x && x.files) || []).filter(function (f) { return f.libSavedAt && !LIB_SHARED[id] && LIB && LIB.isStale({ savedAt: f.libSavedAt }); }); }
  function railState(def) {
    var f = loaded(def.id);
    if (f && libStaleFiles(def.id).length) return { cls: 'loaded lib-stale', dot: '!', text: 'CHECK DATE' };
    if (f) return { cls: 'loaded', dot: '✓', text: def.stored ? 'SAVED' : 'LOADED' };
    if (def.required) return { cls: 'missing required', dot: '!', text: 'REQUIRED' };
    if (def.recommended) return { cls: 'missing recommended', dot: '!', text: 'RECOMMENDED' };
    return { cls: 'missing', dot: '○', text: 'OPTIONAL' };
  }
  function railSub(def) {
    var x = state.inputs[def.id];
    if (!x || !x.files.length) return def.required ? 'Required · drop here' : def.recommended ? 'Recommended · drop here' : 'Optional · drop here';
    var rows = x.files.reduce(function (a, f) { return a + f.data.length; }, 0);
    var lib = x.files.some(function (f) { return f.libKind; });
    return (x.files.length > 1 ? x.files.length + ' files · ' : x.files[0].name + ' · ') + fmtN(rows) + ' rows' + (lib ? ' · Library' : '');
  }
  function renderInputNav() {
    var host = $('#inputNav');
    host.innerHTML = GROUPS.map(function (g) {
      var items = M.INPUTS.filter(function (d) { return d.group === g; });
      var title = g === 'Reference data' ? 'Reference data · saved in this browser' : g;
      return '<div class="input-group"><div class="input-group-title">' + esc(title) + '</div>' + items.map(function (d) {
        var s = railState(d);
        return '<div class="input-nav-wrap' + (loaded(d.id) ? ' has-del' : '') + '"><button type="button" class="input-nav-item ' + s.cls + '" data-input="' + d.id + '" title="Click to open, or drop the ' + esc(d.title) + ' file here"><span class="input-dot">' + s.dot + '</span><span><strong>' + esc(d.title) + '</strong><small>' + esc(railSub(d)) + '</small></span><span class="input-state">' + s.text + '</span></button>' +
          (loaded(d.id) ? '<button type="button" class="input-nav-del" data-del="' + d.id + '" title="Remove ' + esc(d.title) + (d.stored ? ' from this browser' : '') + '" aria-label="Remove ' + esc(d.title) + '">✕</button>' : '') + '</div>';
      }).join('') + '</div>';
    }).join('');
    host.querySelectorAll('[data-input]').forEach(function (b) {
      var id = b.dataset.input;
      b.onclick = function () { showInput(id); if (id === 'sup') scrollToSupSheet(); };
      b.ondragover = b.ondragenter = function (e) { e.preventDefault(); e.stopPropagation(); b.classList.add('drag-target'); };
      b.ondragleave = function (e) { e.preventDefault(); e.stopPropagation(); b.classList.remove('drag-target'); };
      b.ondrop = function (e) {
        e.preventDefault(); e.stopPropagation(); b.classList.remove('drag-target');
        var files = e.dataTransfer && e.dataTransfer.files; if (!files || !files.length) return;
        var list = inputDef(id).multi ? Array.prototype.slice.call(files) : [files[0]];
        list.reduce(function (p, f) { return p.then(function () { return acceptFile(id, f); }); }, Promise.resolve());
      };
    });
    host.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); removeInputs([b.dataset.del]); }; });
    if (state.activeInput) { var a = host.querySelector('[data-input="' + state.activeInput + '"]'); if (a) a.classList.add('active'); }
  }
  // v1.2.0: remove inputs straight away — the ✕ beside a rail row, or the two clear buttons. A saved reference table
  // is deleted from this browser too. Drop-list rows that only filled those inputs go as well.
  function removeInputs(ids, message) {
    if (inputsLocked()) return;
    var gone = ids.filter(function (id) { return state.inputs[id]; });
    gone.forEach(function (id) { libForget(id, state.inputs[id].files); delete state.inputs[id]; if (inputDef(id).stored) refDelete(id); });
    if (ids.indexOf('sup') >= 0) { supView.undo = []; supView.sel = null; supView.note = ''; supView.brands = null; }   // v1.6.2: the SUP BRAND filter goes too
    state.bulk = state.bulk.filter(function (rec) {
      if (!rec.ids || !rec.ids.length) return true;
      var keep = []; rec.ids.forEach(function (id, i) { if (ids.indexOf(id) < 0) keep.push(i); });
      rec.assigned = keep.map(function (i) { return rec.assigned[i]; }); rec.ids = keep.map(function (i) { return rec.ids[i]; });
      rec.msg = rec.assigned.join(' · ');
      return rec.ids.length > 0;
    });
    renderBulk();
    state.rev++;
    invalidateResults('Inputs changed — run the stages again.');
    renderAll();
    if (state.activeInput) showInput(state.activeInput);
    var names = gone.map(function (id) { return inputDef(id).title; });
    setGlobal(message || ((names.length ? names.join(', ') + ' removed. ' : 'Nothing to remove. ') + readinessText()), requiredReady() ? 'ready' : 'missing');
  }
  function scrollToSupSheet() { wbShow('sup'); var el = $('#workbook'); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  function showInput(id, problem) {
    var def = inputDef(id); if (!def) return;
    state.activeInput = id;
    var x = state.inputs[id], has = loaded(id), s = railState(def);
    var badgeCls = has ? 'done' : def.required ? 'required' : 'wait';
    var files = has ? x.files.map(function (f, i) {
      var rep = f.report || {};
      return '<div class="file-row"><span><strong>' + esc(f.name) + '</strong>' + (f.tab ? ' · tab ' + esc(f.tab) : '') + ' · ' + fmtN(f.data.length) + ' rows · ' + (rep.found || 0) + ' / ' + (rep.total || 0) + ' columns' + (rep.missing && rep.missing.length ? ' <em class="miss-cols">not in file: ' + esc(rep.missing.join(', ')) + '</em>' : '') + (rep.from ? ' · supplier rows made from the ' + esc(rep.from) : '') + libNote(id, f) + '</span><button type="button" data-remove="' + i + '">Remove</button></div>';
    }).join('') : '';
    var status = problem ? problem : has ? (def.stored ? 'Saved in this browser ' + esc(x.savedAt || '') : 'Loaded ' + esc(x.files[x.files.length - 1].loadedAt || '')) : 'Not loaded';
    $('#inputWorkspace').innerHTML =
      '<section class="panel input-workspace-card ' + (has ? 'is-loaded' : def.required ? 'is-required' : 'is-optional') + '" data-acc data-acc-id="merge-input-detail">' +
      '<div class="input-workspace-head acc-custom-head"><div><div class="nav-separator" style="margin:0 0 6px">' + esc(def.group) + '</div><h2>' + esc(def.title) + (def.required ? ' <span style="color:#b33">*</span>' : '') + '</h2><p>' + esc(def.desc) + '</p></div><span class="small-badge ' + badgeCls + '">' + s.text + '</span></div>' +
      '<div class="dropzone" tabindex="0"><div><strong>' + (def.multi && has ? 'Add another supplier file' : has ? 'Replace file' : 'Drop file here') + '</strong><small>or click to choose · .XLSX / .XLS / .CSV' + (def.multi ? ' · several files are combined' : '') + '</small></div></div>' +
      '<input class="hidden" type="file" accept=".xlsx,.xls,.xlsm,.csv,.txt"' + (def.multi ? ' multiple' : '') + '>' +
      '<div class="file-list">' + files + '</div>' +
      '<div class="input-meta"><div><strong>Google Sheet tab</strong>' + esc(def.sheet) + '</div><div><strong>Storage</strong>' + (def.stored ? (state.storage === 'indexeddb' ? 'Saved in this browser until replaced or removed' : 'This session only — the browser blocked saving') : 'Browser memory only (this session)') + '</div><div><strong>Status</strong>' + status + '</div></div></section>';
    var host = $('#inputWorkspace'), d = host.querySelector('.dropzone'), inp = host.querySelector('input');
    var take = function (fl) { var list = Array.prototype.slice.call(fl || []); if (!def.multi) list = list.slice(0, 1); list.reduce(function (p, f) { return p.then(function () { return acceptFile(id, f); }); }, Promise.resolve()); };
    d.onclick = function () { inp.click(); };
    d.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } };
    inp.onchange = function () { var fl = inp.files; take(fl); inp.value = ''; };
    d.ondragover = function (e) { e.preventDefault(); d.classList.add('drag'); };
    d.ondragleave = function () { d.classList.remove('drag'); };
    d.ondrop = function (e) { e.preventDefault(); d.classList.remove('drag'); take(e.dataTransfer && e.dataTransfer.files); };
    host.querySelectorAll('[data-remove]').forEach(function (b) { b.onclick = function () { removeFile(id, +b.dataset.remove); }; });
    document.querySelectorAll('[data-input]').forEach(function (b) { b.classList.toggle('active', b.dataset.input === id); });
    if (id === 'sup') {
      host.querySelector('.input-workspace-card').insertAdjacentHTML('beforeend', '<div class="sup-card-link"><button type="button" class="btn small" id="supJump">Open the IN_SUPPLIER sheet ↓</button><span>Edit, paste and check every supplier row in the sheet under the stages.</span></div><div class="sup-scope-lib sup-card-lib" data-lib-sup-host hidden></div>');
      host.querySelector('#supJump').onclick = scrollToSupSheet;
      drawLibSup();
    }
    if (window.PHFAccordion) window.PHFAccordion.refresh(host);
  }
  function readinessText() {
    var miss = M.INPUTS.filter(function (d) { return d.required && !loaded(d.id); }).map(function (d) { return d.title; });
    var rec = M.INPUTS.filter(function (d) { return d.recommended && !loaded(d.id); }).map(function (d) { return d.title; });
    if (miss.length) return 'Missing: ' + miss.join(', ') + '.';
    return 'Ready to run.' + (rec.length ? ' Reference not loaded: ' + rec.join(', ') + ' — the merge runs without it, but results may differ from the Google Sheet.' : '');
  }
  function renderInputSummary() {
    var host = $('#inputSummary');
    host.innerHTML = GROUPS.map(function (g) {
      var fs = M.INPUTS.filter(function (d) { return d.group === g; });
      var n = fs.filter(function (d) { return loaded(d.id); }).length;
      var reqMiss = fs.filter(function (d) { return d.required && !loaded(d.id); }).length;
      var recMiss = fs.filter(function (d) { return d.recommended && !loaded(d.id); }).length;
      var cls = reqMiss ? 'miss' : recMiss ? 'warn' : n ? 'ok' : 'opt';
      var txt = n + '/' + fs.length + ' loaded' + (reqMiss ? ' · required missing' : recMiss ? ' · ' + recMiss + ' recommended missing' : n ? ' · ready' : ' · optional');
      return '<div class="summary-chip ' + cls + '"><strong>' + esc(g) + '</strong><span>' + txt + '</span></div>';
    }).join('');
    var req = M.INPUTS.filter(function (d) { return d.required; }), ok = req.filter(function (d) { return loaded(d.id); }).length;
    var rc = $('#readyCount'); rc.textContent = ok + ' / ' + req.length + ' REQUIRED'; rc.className = 'result-badge ' + (ok === req.length ? 'ok' : ok ? 'ready' : '');
  }
  function requiredReady() { return M.INPUTS.every(function (d) { return !d.required || loaded(d.id); }); }

  // ------------------------------------------------------------- stages
  function renderStages() {
    STAGES.forEach(function (s) {
      $('#stage-' + s.id).innerHTML = '<section class="panel stage-panel stage-view-card ready" data-acc data-acc-id="stage-' + s.id + '"><div class="stage-head"><div class="stage-title"><span class="stepnum">' + s.n + '</span><div><h2>' + esc(s.title) + '</h2></div></div><span class="small-badge wait">WAITING</span></div><p class="stage-description">' + esc(s.desc) + '</p><div class="status info stage-status">Waiting for input files.</div><div class="stage-scope" data-stage-scope="' + s.id + '" hidden></div><div class="stage-actions"><button class="btn primary stage-run" data-stage="' + s.id + '" disabled>Run stage ' + s.n + '</button></div><div class="stage-output-inline" data-stage-output="' + s.id + '"></div></section>';
    });
    document.querySelectorAll('.stage-run').forEach(function (b) { b.onclick = function () { runTo(b.dataset.stage); }; });
    renderScopes();
    if (window.PHFAccordion) window.PHFAccordion.refresh();
  }
  function stageSet(id, status, msg) {
    state.stage[id] = { status: status, msg: msg };
    var card = $('#stage-' + id + ' .stage-panel'); if (!card) return;
    card.classList.remove('ready', 'running', 'done', 'error');
    card.classList.add(status === 'waiting' ? 'ready' : status);
    var b = card.querySelector('.small-badge');
    b.className = 'small-badge ' + ({ waiting: 'wait', ready: 'ready', running: 'running', done: 'done', error: 'error' }[status] || 'wait');
    b.textContent = { waiting: 'WAITING', ready: 'READY', running: 'RUNNING', done: 'DONE', error: 'ERROR' }[status] || 'WAITING';
    var rb = document.querySelector('.wb-run[data-run="' + id + '"]');                 // v1.7.1 run bar
    if (rb) { rb.classList.remove('is-ready', 'is-running', 'is-done', 'is-error'); rb.classList.add('is-' + (status === 'waiting' ? 'waiting' : status)); rb.querySelector('i').textContent = b.textContent; }
    if (status === 'done' && window.PHFAccordion) window.PHFAccordion.autoClose(card);   // v1.16.1: a finished stage tidies itself away
    stageMsg(id, msg, status);
  }
  function stageMsg(id, msg, status) {
    var st = $('#stage-' + id + ' .stage-status'); if (!st) return;
    st.textContent = msg || '';
    st.className = 'status stage-status ' + ({ running: 'running', done: 'ok', error: 'error', ready: 'ready', waiting: 'missing' }[status] || 'info');
  }
  function updateRunButtons() {
    var ready = requiredReady() && !!state.engineInfo;
    STAGES.forEach(function (s) {
      var cur = state.stage[s.id] || {};
      var b = document.querySelector('.stage-run[data-stage="' + s.id + '"]');
      if (b) b.disabled = !ready || state.busy;
      var rb = document.querySelector('.wb-run[data-run="' + s.id + '"]'); if (rb) rb.disabled = !ready || state.busy;   // v1.7.1
      if (cur.status === 'running' || cur.status === 'done' || cur.status === 'error') return;
      if (ready) stageSet(s.id, 'ready', s.n === 1 ? 'Inputs are ready. This stage can run now.' : 'Ready — earlier stages run first automatically if needed.');
      else stageSet(s.id, 'waiting', state.engineInfo ? readinessText() : 'Waiting for the merge engine to start…');
    });
    $('#runAllBtn').disabled = !ready || state.busy;
    // v1.5.0: the sheets cannot be edited while a stage runs.
    var gb = state.busy || state.edits.busy;
    if (wb.outGrid) wb.outGrid.busy(gb);
    if (wb.grid) wb.grid.busy(gb);
    renderOutActions();
  }
  function invalidateResults(msg) {
    state.results = {};
    state.edits = { marks: {}, undo: {}, outAfter3: false, pos: {}, busy: false, optsAfter3: false };
    state.pendingSup = 0; state.resultScope = null;
    state.outputs.forEach(function (o) { if (o.url) URL.revokeObjectURL(o.url); });
    state.outputs.clear();
    STAGES.forEach(function (s) { state.stage[s.id] = { status: 'waiting', msg: msg || '' }; });
    renderOutputs(); hideReview(); refreshSupSheet(); renderScopes();
    saveSessionSoon(true);
  }

  // v1.6.0: with a SUP BRAND filter on the supplier sheet, the engine gets only the supplier rows of those brands — the
  // merge then matches, updates and discontinues only them, exactly as though the other rows were not uploaded.
  // Brands are compared in capitals, so BioCeuticals and BIOCEUTICALS are one brand (as POS keeps them).
  function supBrandOf(row) { return String(row[4] == null ? '' : row[4]).trim().toUpperCase(); }
  function supScopeKey() { return supView.brands ? JSON.stringify(supView.brands.slice().sort()) : ''; }
  function supRowsInScope(brands) {
    if (brands === undefined) brands = supView.brands;
    var rows = rowsOf('sup'); if (!brands) return rows;
    var m = {}; brands.forEach(function (b) { m[b] = 1; });
    return rows.filter(function (r) { return m[supBrandOf(r)]; });
  }
  function buildSheetsPayload(brands) {
    var out = {}, noDisc = !!state.opts.keep.disc;
    M.INPUTS.forEach(function (d) {
      var rows = d.id === 'sup' ? supRowsInScope(brands) : rowsOf(d.id);
      if (d.id === 'sup' && noDisc) rows = rows.map(function (r) { r = r.slice(); r[13] = ''; return r; });   // v1.11.0: N unticked
      out[d.sheet] = M.sheetRows(d.sheet, rows);
    });
    return out;
  }
  function ensureLoaded() {
    if (state.engine && state.loadedRev === state.rev && state.loadedScope === supScopeKey() && state.engineInfo) return Promise.resolve();
    var needRestart = state.loadedRev !== -1 || !state.engine;
    var p = needRestart ? startEngine() : state.engine.ready;
    return p.then(function () {
      setGlobal('Loading ' + fmtN(rowsOf('pos').length) + ' POS rows and ' + fmtN(rowsOf('sup').length) + ' supplier rows into the merge engine…', 'running');
      var rev = state.rev, scope = supScopeKey();
      return state.engine.send({ cmd: 'load', sheets: buildSheetsPayload() }).then(function () { state.loadedRev = rev; state.loadedScope = scope; STAGES.forEach(function (s) { if ((state.stage[s.id] || {}).status === 'done') state.stage[s.id] = { status: 'ready' }; }); });
    });
  }
  function alertsText(res) {
    return (res.alerts || []).map(function (a) { return cleanTitle(a.title) + (a.msg ? ': ' + a.msg : ''); }).join(' · ');
  }
  function alertFailed(res) {
    return (res.alerts || []).some(function (a) { return /❌|failed/i.test(a.title || ''); });
  }
  function runStep(step, extra) {
    return state.engine.send(Object.assign({ cmd: 'run', step: step }, extra || {})).then(function (res) {
      if (alertFailed(res)) { var e = new Error(alertsText(res)); e.detail = res; throw e; }
      if (step === 'highlight') state.resultScope = state.loadedScope ? JSON.parse(state.loadedScope) : null;
      if (step === 'generate') { state.results.info_generate = res.info || null; state.results.keep_generate = (extra && extra.keep) || []; state.results.scope_generate = (extra && extra.visible) ? { rows: extra.visible.length, of: (state.results[SHEETS.OUT] || []).length - 2 } : null; state.edits.optsAfter3 = false; setUploadDefaults(res.info && res.info.checks); }   // v1.13.0
      if (step === 'export') state.edits.ticks = false;
      Object.keys(res.sheets || {}).forEach(function (n) { state.results[n] = res.sheets[n]; delete state.edits.marks[n]; });
      if (step === 'export') state.results.files = res.files || [];
      state.pendingSup = res.pending || 0;
      state.edits.undo = {};                                        // the engine starts a new undo history after a run
      if (step === 'build') state.edits.outAfter3 = false;
      if (step === 'generate') { state.edits.outAfter3 = false; state.edits.pos = {}; }
      if (step === 'export') state.edits.pos = {};
      state.results['alerts_' + step] = res.alerts || [];
      state.results['ms_' + step] = res.ms;
      return res;
    });
  }
  function stageSummary(id) {
    if (id === 'highlight') {
      var sup = state.results[SHEETS.SUP] || [], counts = {};
      for (var i = 2; i < sup.length; i++) { var s = String(sup[i][15] || '').replace(/[^A-Za-z /+-]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase() || 'BLANK'; counts[s] = (counts[s] || 0) + 1; }
      var parts = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 6).map(function (k) { return k + ' ' + fmtN(counts[k]); });
      return 'Complete — ' + fmtN(Math.max(0, sup.length - 2)) + ' supplier rows: ' + parts.join(' · ') + '.';
    }
    if (id === 'build') {
      var a = (state.results.alerts_build || [])[0];
      var line = a ? String(a.msg || '').split('\n')[0] : '';
      return 'Complete — ' + (line || fmtN(Math.max(0, (state.results[SHEETS.OUT] || []).length - 2)) + ' rows') + '.';
    }
    var g = (state.results.alerts_generate || [])[0], files = state.results.files || [];
    var left = stillPending(), inf = state.results.info_generate, sc = state.results.scope_generate, extra = '';
    if (inf && inf.stock) extra += ' ' + fmtN(inf.stock) + ' new product' + (inf.stock === 1 ? ' gets its' : 's get their') + ' stock on hand from SUP STOCK IN.';   // v1.11.0
    if (inf && inf.minOrder) extra += ' ' + fmtN(inf.minOrder) + ' min order qty that ' + (inf.minOrder === 1 ? 'is' : 'are') + ' not a number (e.g. N/A) went to POS as 1 (new) / POS’s own (matched).';   // v1.11.0
    if (inf && (inf.kept || inf.same)) extra += ' POS kept its ' + keptGroups(state.results.keep_generate || []).filter(function (g) { return !g.use; }).map(function (g) { return g.what; }).join(', ') + ' for ' + fmtN(inf.kept) + ' matched product' + (inf.kept === 1 ? '' : 's') + (inf.same ? '; ' + fmtN(inf.same) + ' left out (same as POS)' : '') + '.';
    if (inf && inf.disc) extra += ' ' + fmtN(inf.disc) + ' discontinued product' + (inf.disc === 1 ? '' : 's') + ' left out (Discontinue is off).';
    if (sc) extra += ' Made from the ' + fmtN(sc.rows) + ' OUT_MERGED_DATA rows shown (filtered, of ' + fmtN(sc.of) + ').';
    extra += uploadSummaryText();   // v1.13.0
    return 'Complete — ' + (g ? String(g.msg || '').split('\n')[0] : '') + ' · ' + files.length + ' TXT file' + (files.length === 1 ? '' : 's') + ' ready.' + extra +
      (left ? ' ' + fmtN(left) + ' OUT row' + (left === 1 ? ' is' : 's are') + ' still SUP OVERRIDE PENDING (supplier in G not found).' : '');
  }
  function runTo(target) {
    if (state.busy) return Promise.resolve();
    if (sessRestoring) { setGlobal('Your last session is still loading — run again in a moment.', 'missing'); return Promise.resolve(); }
    if (!requiredReady()) { setGlobal(readinessText(), 'missing'); return Promise.resolve(); }
    var tIdx = STAGES.map(function (s) { return s.id; }).indexOf(target);
    if ((state.stage.highlight || {}).status !== 'done' || tIdx === 0) fillSupNames();   // v1.9.0
    state.busy = true;
    // Re-running a stage makes the later stages out of date.
    STAGES.slice(tIdx + 1).forEach(function (s) { if ((state.stage[s.id] || {}).status === 'done' || (state.stage[s.id] || {}).status === 'error') state.stage[s.id] = { status: 'ready' }; });
    updateRunButtons();
    var t0 = Date.now(), current = null;
    gpct(4);
    return ensureLoaded().then(function () {
      var chain = Promise.resolve();
      STAGES.slice(0, tIdx + 1).forEach(function (s, i) {
        chain = chain.then(function () {
          if ((state.stage[s.id] || {}).status === 'done' && i < tIdx) return;
          current = s.id;
          stageSet(s.id, 'running', 'Running…');
          setGlobal('Stage ' + s.n + ' of 3 — ' + s.title + '…', 'running');
          var steps = Promise.resolve();
          // v1.5.0: UPDATED SUPPLIER changes still waiting are refreshed first, so stage 3 uses them.
          var list = s.id === 'export' && state.pendingSup > 0 ? ['refresh'].concat(s.steps) : s.steps;
          list.forEach(function (step) { steps = steps.then(function () { return runStep(step, step === 'generate' ? generateOptions() : step === 'export' ? exportOptions(null) : null); }); });   // v1.13.0 exportOptions
          return steps.then(function () {
            stageSet(s.id, 'done', stageSummary(s.id));
            gpct(Math.round(((i + 1) / (tIdx + 1)) * 100));
            return afterStage(s.id);
          });
        });
      });
      return chain;
    }).then(function () {
      setGlobal('Complete in ' + ((Date.now() - t0) / 1000).toFixed(1) + 's — ' + state.outputs.size + ' output file' + (state.outputs.size === 1 ? '' : 's') + ' ready below.', 'success');
      setTimeout(function () { gpct(0); }, 800);
    }).catch(function (e) {
      console.error(e);
      if (current) stageSet(current, 'error', 'Error: ' + e.message);
      setGlobal((current ? 'Stage stopped: ' : 'Could not start: ') + e.message, 'error');
      gpct(0);
    }).then(function () {
      state.busy = false;
      // v1.6.2: results made from inputs that changed during the run are not kept.
      if (state.loadedRev !== state.rev && Object.keys(state.results).length) { invalidateResults('Inputs changed while the stages ran — run the stages again.'); setGlobal('Inputs changed while the stages ran, so those results were not kept — run the stages again.', 'missing'); }
      updateRunButtons(); refreshSupSheet(); renderScopes(); saveSessionSoon();
    });
  }
  // v1.9.0 — before stage 1 runs: an empty POS SUPPLIER NAME (B) is filled from its POS SUPPLIER NUMBER (C) with POS Suppliers
  // (SRC_POS_SUPPLIERS: POS ACCNO → POS ACNAME), so the sheet, its SUPPLIER NAMES total and the review workbook show the
  // names. A name already there (typed, pasted or from the file) is never changed; the cell is not marked as changed here.
  function fillSupNames() {
    var map = {}, n = 0;
    rowsOf('suppliers').forEach(function (r) { var k = String(r[1] == null ? '' : r[1]).trim().replace(/\.0+$/, ''), v = String(r[2] == null ? '' : r[2]).trim(); if (k && v && !map[k]) map[k] = v; });
    if (!Object.keys(map).length) return 0;
    supEntries().forEach(function (e) {
      e.data.forEach(function (row) {
        if (String(row[1] == null ? '' : row[1]).trim() !== '') return;
        var num = String(row[2] == null ? '' : row[2]).trim().replace(/\.0+$/, '');
        if (num && map[num]) { row[1] = map[num]; n++; }
      });
    });
    if (n) { state.rev++; supView.note = 'POS SUPPLIER NAME filled in for ' + fmtN(n) + ' row' + (n === 1 ? '' : 's') + ' from POS Suppliers (by POS SUPPLIER NUMBER).'; supView.noteType = 'success'; saveSessionSoon(true); }
    return n;
  }
  // v1.6.0: what stage 3 sends with 'generate' — the OUT_MERGED_DATA rows shown when a filter / search hides some, the
  // columns POS keeps for matched products, and the Discontinue switch.
  function generateOptions() {
    var o = {}, v = outView();
    if (v && v.filtered) o.visible = v.rows;
    var k = keptGroups().map(function (g) { return g.id; });
    if (k.length) o.keep = k;
    if (!state.opts.discontinue) o.discontinue = false;
    if (!state.opts.keep.stock) o.stock = true;        // v1.11.0: M → a new product's pos soh (engine-host)
    return o;
  }
  // The OUT_MERGED_DATA rows on screen (Sheet rows): the review search / selects, plus the Sheet view's own filters.
  function outView() {
    var R = state.review; if (!R || !state.results[SHEETS.OUT] || !R.fidx) return null;
    var rows = R.fidx.slice();
    if (wb.outView === 'sheet' && wb.outGrid && wb.outGrid.filtered()) rows = wb.outGrid.visible().map(function (i) { return R.fidx[i]; });
    return { filtered: rows.length < R.rows.length, rows: rows, total: R.rows.length };
  }
  // The rows on screen in the OUT_POS_INSERT / UPDATE tab (Sheet rows), when a filter / search hides some.
  function posTabView() {
    var t = wbTab(wb.active);
    if (!t.engine || !wb.grid || !wb.grid.filtered()) return null;
    return { sheet: t.sheet, rows: wb.grid.visible().map(function (i) { return i + 3; }), total: Math.max(0, (state.results[t.sheet] || []).length - 2) };
  }
  // ------------------------------------------------- v1.13.0 upload checks (hold / check / fixed) and Upload ticks
  /* Stage 3 (engine-host v1.5.0 uploadChecks) sends back info.checks = { OUT_POS_INSERT: { sheetRow: { level, notes, fix } },
     OUT_POS_UPDATE: {…} }. state.results.checks_generate keeps it; state.results.upload[sheet][sheetRow] = false is an
     unticked row (held rows start unticked). Both come back with the session. The TXT files are made from the ticked rows
     only (exportOptions → the engine's `only`, through withOnlyRows), on stage 3 and on Export TXT again. */
  var LEVEL_NAME = { hold: 'Held', check: 'Check', fixed: 'Fixed', '': 'Unticked' };
  function checksFor(sheet) { var c = state.results.checks_generate; return c && c[sheet] ? c[sheet] : {}; }
  function uploadOff(sheet) { var u = state.results.upload; return u && u[sheet] ? u[sheet] : {}; }
  function setUploadDefaults(checks) {
    state.results.checks_generate = checks || null;
    var u = {};
    [SHEETS.INS, SHEETS.UPD].forEach(function (n) { u[n] = {}; var c = (checks && checks[n]) || {}; Object.keys(c).forEach(function (r) { if (c[r].level === 'hold') u[n][r] = false; }); });
    state.results.upload = u; state.edits.ticks = false; wb.uploadView = null;
  }
  function uploadCounts(sheet) {
    var c = checksFor(sheet), off = uploadOff(sheet), n = { hold: 0, holdOn: 0, check: 0, fixed: 0, off: 0, rows: Math.max(0, (state.results[sheet] || []).length - 2) };
    Object.keys(c).forEach(function (r) { if (n[c[r].level] !== undefined) n[c[r].level]++; if (c[r].level === 'hold' && off[r] !== false) n.holdOn++; });
    Object.keys(off).forEach(function (r) { if (off[r] === false) n.off++; });
    return n;
  }
  function noteText(ch) { return (ch.notes || []).map(function (x) { return x.t; }).join(' · '); }
  function rowFlagsFor(sheet) {
    var c = checksFor(sheet), off = uploadOff(sheet), f = {};
    Object.keys(c).forEach(function (r) { var ch = c[r], i = Number(r) - 3; f[i] = { level: ch.level, changed: (off[r] === false) !== (ch.level === 'hold'), title: LEVEL_NAME[ch.level].toUpperCase() + ' — ' + noteText(ch) + (off[r] === false ? ' · Unticked: not in the POS TXT until ticked.' : '') + ((off[r] === false) !== (ch.level === 'hold') ? ' · Your change (the checks had it the other way).' : ''), on: off[r] !== false, cells: ch.fix || null }; });
    Object.keys(off).forEach(function (r) { var i = Number(r) - 3; if (off[r] === false && !f[i]) f[i] = { level: '', changed: true, title: 'Unticked by you — this row stays out of the POS TXT file until it is ticked.', on: false }; });
    return f;
  }
  function uploadRowFilter(sheet, level) {
    var c = checksFor(sheet), off = uploadOff(sheet);
    if (!level) return null;
    if (level === 'off') return function (i) { return off[i + 3] === false; };
    return function (i) { var ch = c[i + 3]; return !!ch && ch.level === level; };
  }
  function afterTickChange(t, redraw) {
    if ((state.stage.export || {}).status === 'done') { state.edits.ticks = true; stageMsg('export', 'Upload ticks changed — use Export TXT again (on the tab) to make the POS files from the ticked rows.', 'ready'); }
    if (redraw) wbShow(wb.active, true); else { wbBadge(); renderWbActions(t); renderUploadPanel(t); }
    renderOutputs(); saveSessionSoon();
  }
  function setUploadTick(sheet, row, on) {
    var u = state.results.upload || (state.results.upload = {}); u[sheet] = u[sheet] || {};
    if (on) delete u[sheet][row]; else u[sheet][row] = false;
    afterTickChange(wbTab(wb.active), false);
  }
  function setUploadAll(sheet, level, on) {
    var c = checksFor(sheet), u = state.results.upload || (state.results.upload = {}); u[sheet] = u[sheet] || {};
    Object.keys(c).forEach(function (r) { if (level && c[r].level !== level) return; if (on) delete u[sheet][r]; else u[sheet][r] = false; });
    if (on && !level) u[sheet] = {};
    afterTickChange(wbTab(wb.active), true);
  }
  // The ticked rows of a POS sheet as Sheet rows, or null when every row is ticked.
  function uploadOnly(sheet) {
    var off = uploadOff(sheet), n = Math.max(0, (state.results[sheet] || []).length - 2), any = false, rows = [];
    for (var r = 3; r < n + 3; r++) { if (off[r] === false) any = true; else rows.push(r); }
    return any ? rows : null;
  }
  // What 'export' gets: the ticked rows, narrowed to the filtered view of the tab on screen (pv) when there is one.
  function exportOptions(pv) {
    var only = {}, any = false;
    [SHEETS.INS, SHEETS.UPD].forEach(function (n) {
      var t = uploadOnly(n), v = pv && pv.sheet === n ? pv.rows : null;
      if (!t && !v) return;
      if (t && v) { var m = {}; t.forEach(function (r) { m[r] = 1; }); t = v.filter(function (r) { return m[r]; }); }
      only[n] = t || v; any = true;
    });
    return any ? { only: only } : null;
  }
  function uploadSummaryText() {
    var parts = [];
    [SHEETS.INS, SHEETS.UPD].forEach(function (n) {
      if (!state.results[n]) return;
      var c = uploadCounts(n); if (!(c.hold || c.check || c.fixed || c.off)) return;
      parts.push(n.replace('OUT_POS_', 'POS ') + ': ' + [c.off ? fmtN(c.off) + ' held (unticked, not in the TXT)' : '', c.check ? fmtN(c.check) + ' to check' : '', c.fixed ? fmtN(c.fixed) + ' fixed' : ''].filter(Boolean).join(', '));
    });
    var err = state.results.info_generate && state.results.info_generate.checksError;
    return (parts.length ? ' Upload checks — ' + parts.join('; ') + '. See the OUT_POS_INSERT / UPDATE tabs.' : '') + (err ? ' Upload checks did not run: ' + err : '');
  }
  function levelOrder(l) { return l === 'hold' ? 0 : l === 'check' ? 1 : l === 'fixed' ? 2 : 3; }
  // The rows for the review workbook's OUT_UPLOAD_CHECKS sheet (row 1 totals, row 2 headings, then the flagged rows).
  function uploadChecksRows() {
    var head = ['SHEET', 'ROW', 'UPLOAD', 'LEVEL', 'BARCODE / PLU', 'SUB ID', 'BRAND', 'DESCR', 'WSP EXCGST', 'LAST PRICE', 'RRP INCGST', 'WHY'], data = [], tot = { hold: 0, check: 0, fixed: 0, off: 0 };
    [SHEETS.INS, SHEETS.UPD].forEach(function (n) {
      var c = checksFor(n), off = uploadOff(n), rows = state.results[n] || [];
      var keys = Object.keys(c); Object.keys(off).forEach(function (r) { if (off[r] === false && !c[r]) keys.push(r); });
      keys.map(Number).sort(function (a, b) { var la = c[a] ? c[a].level : '', lb = c[b] ? c[b].level : ''; return levelOrder(la) - levelOrder(lb) || a - b; }).forEach(function (r) {
        var row = rows[r - 1] || [], ch = c[r], lv = ch ? ch.level : '';
        if (tot[lv] !== undefined) tot[lv]++; if (off[r] === false) tot.off++;
        data.push([n, r, off[r] === false ? 'NO' : 'YES', LEVEL_NAME[lv].toUpperCase(), row[1] || '', row[2] || '', row[3] || '', row[4] || '', row[12] || '', row[13] || '', row[15] || '', ch ? noteText(ch) : '']);
      });
    });
    if (!data.length) return null;
    var t = new Array(head.length).fill(''); t[0] = fmtN(data.length) + ' ROWS'; t[2] = fmtN(tot.off) + ' UNTICKED'; t[3] = 'HELD ' + fmtN(tot.hold) + ' · CHECK ' + fmtN(tot.check) + ' · FIXED ' + fmtN(tot.fixed);
    return [t, head].concat(data);
  }
  // The "Upload checks" list above an OUT_POS_INSERT / UPDATE tab: counts, Show buttons (a view of the tab, never the export),
  // Tick / Untick all held, and every flagged row with its reason and its own Upload tick.
  var UP_LIST_MAX = 400;
  function renderUploadPanel(t) {
    var host = $('#uploadPanel'); if (!host) return;
    if (!t || !t.engine || !state.results[t.sheet]) { host.hidden = true; host.innerHTML = ''; return; }
    var sheet = t.sheet, c = checksFor(sheet), off = uploadOff(sheet), n = uploadCounts(sheet), rows = state.results[sheet] || [];
    var view = wb.uploadView && wb.uploadView.sheet === sheet ? wb.uploadView.level : '';
    var keys = Object.keys(c); Object.keys(off).forEach(function (r) { if (off[r] === false && !c[r]) keys.push(r); });
    keys = keys.map(Number).sort(function (a, b) { var la = c[a] ? c[a].level : '', lb = c[b] ? c[b].level : ''; return levelOrder(la) - levelOrder(lb) || a - b; });
    var busy = state.busy || state.edits.busy, file = t.id === 'upd' ? 'POS UPDATE' : 'POS INSERT';
    var btn = function (lv, label, count) { return '<button type="button" class="btn small' + (view === lv ? ' is-on' : '') + '" data-upview="' + lv + '"' + (lv && !count ? ' disabled' : '') + '>' + label + (lv ? ' (' + fmtN(count) + ')' : '') + '</button>'; };
    host.hidden = false;
    host.innerHTML =
      '<div class="up-head"><div class="up-title"><strong>Upload checks</strong><span class="up-sub">' + (keys.length ? fmtN(keys.length) + ' of ' + fmtN(n.rows) + ' rows flagged · ' + (n.off ? '<b class="up-held">' + fmtN(n.off) + ' held</b> (unticked — not in the ' + file + ' TXT until ticked)' : 'nothing held') + ' · ' + fmtN(n.check) + ' to check · ' + fmtN(n.fixed) + ' fixed' : 'Nothing flagged — every row is ticked for the ' + file + ' TXT.') + '</span></div>' +
      '<div class="up-tools" role="group" aria-label="Show rows">' + btn('off', 'Show held', n.off) + btn('check', 'To check', n.check) + btn('fixed', 'Fixed', n.fixed) + btn('', 'All rows', 0) +
      (n.hold ? '<span class="up-gap"></span><button type="button" class="btn small" data-upall="on"' + (busy || n.holdOn >= n.hold ? ' disabled' : '') + ' title="Tick every held row — they go into the TXT">Tick all held</button><button type="button" class="btn small" data-upall="off"' + (busy || !n.holdOn ? ' disabled' : '') + ' title="Untick every held row again">Untick all held</button>' : '') + '</div></div>' +
      (keys.length ? '<div class="up-list-wrap"><table class="up-list"><thead><tr><th>Upload</th><th>Row</th><th>What</th><th>' + (t.id === 'upd' ? 'PLU' : 'Barcode') + '</th><th>Brand</th><th>Descr</th><th>Why</th></tr></thead><tbody>' +
        keys.slice(0, UP_LIST_MAX).map(function (r) {
          var row = rows[r - 1] || [], ch = c[r], lv = ch ? ch.level : '', on = off[r] !== false;
          return '<tr class="up-' + (lv || 'off') + (on ? '' : ' is-off') + '" data-uprow="' + r + '"><td class="up-tick"><input type="checkbox" data-uptick="' + r + '"' + (on ? ' checked' : '') + (busy ? ' disabled' : '') + ' aria-label="Upload row ' + r + '"></td>' +
            '<td><button type="button" class="up-go" data-upgo="' + r + '" title="Show this row on the sheet">' + r + '</button></td><td><span class="up-chip up-chip-' + (lv || 'off') + '">' + esc(LEVEL_NAME[lv]) + '</span></td>' +
            '<td class="up-key">' + esc(row[1] == null ? '' : row[1]) + '</td><td>' + esc(row[3] == null ? '' : row[3]) + '</td><td class="up-descr">' + esc(row[4] == null ? '' : row[4]) + '</td><td class="up-why">' + (ch ? ch.notes.map(function (x) { return '<span class="up-note up-note-' + x.k + '">' + esc(x.t) + '</span>'; }).join('') : '<span class="up-note">Unticked by you</span>') + '</td></tr>';
        }).join('') + '</tbody></table>' + (keys.length > UP_LIST_MAX ? '<div class="up-more">' + fmtN(keys.length - UP_LIST_MAX) + ' more flagged rows — use the Show buttons to see them on the sheet.</div>' : '') + '</div>' : '');
    host.querySelectorAll('[data-upview]').forEach(function (b) { b.onclick = function () { var lv = b.dataset.upview; wb.uploadView = lv ? { sheet: sheet, level: lv } : null; if (wb.grid) wb.grid.rowFilter(uploadRowFilter(sheet, lv)); renderUploadPanel(t); wbBadge(); }; });
    host.querySelectorAll('[data-upall]').forEach(function (b) { b.onclick = function () { if (state.busy || state.edits.busy) return; setUploadAll(sheet, 'hold', b.dataset.upall === 'on'); }; });
    host.querySelectorAll('[data-upgo]').forEach(function (b) { b.onclick = function () { var r = Number(b.dataset.upgo); wb.uploadView = null; if (wb.grid) { wb.grid.rowFilter(null); wb.grid.select(r - 3, 4); } renderUploadPanel(t); wbBadge(); var g = $('#wbGrid'); if (g) g.scrollIntoView({ block: 'nearest' }); }; });
    host.querySelectorAll('input[data-uptick]').forEach(function (cb) { cb.onchange = function () { if (state.busy || state.edits.busy) { cb.checked = !cb.checked; return; } var u = state.results.upload || (state.results.upload = {}); u[sheet] = u[sheet] || {}; if (cb.checked) delete u[sheet][Number(cb.dataset.uptick)]; else u[sheet][Number(cb.dataset.uptick)] = false; afterTickChange(t, true); }; });
  }
  // Notes on the stage cards: what the next run will cover.
  function renderScopes() {
    var set = function (id, html) { var el = document.querySelector('[data-stage-scope="' + id + '"]'); if (!el) return; el.innerHTML = html; el.hidden = !html; };
    var b = supView.brands, all = supBrandList();
    var bText = b ? '<b>Brand filter on:</b> merges ' + fmtN(b.length) + ' of ' + fmtN(all.length) + ' brands — ' + esc(b.slice(0, 4).join(', ') + (b.length > 4 ? ' +' + (b.length - 4) : '')) + '.' : '';
    set('highlight', bText); set('build', bText);
    var parts = [], v = outView(), k = keptText();
    if (v && v.filtered) parts.push('<b>Filtered:</b> uses the ' + fmtN(v.rows.length) + ' of ' + fmtN(v.total) + ' OUT_MERGED_DATA rows shown.');
    if (k) parts.push('<b>POS keeps</b> its ' + esc(k) + ' for matched products.');
    if (!state.opts.discontinue) parts.push('<b>Discontinue is off</b> — no discontinued products in the POS UPDATE file.');
    set('export', parts.join(' '));
  }
  function addTxtOutputs() {
    ['txt-0', 'txt-1'].forEach(function (k) { var o = state.outputs.get(k); if (o && o.url) URL.revokeObjectURL(o.url); state.outputs.delete(k); });
    (state.results.files || []).forEach(function (f, i) {
      var bin = atob(f.base64), bytes = new Uint8Array(bin.length);
      for (var k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
      addOutput('export', 'txt-' + i, f.filename, new Blob([bytes], { type: 'text/plain;charset=utf-8' }), fmtN(f.rowCount) + ' rows · ' + (f.label || 'POS file') + ' · tab-separated TXT for POSActive');
    });
  }
  function afterStage(id) {
    if (id === 'highlight') refreshSupSheet();
    if (id === 'build') { renderReview(); wbShow('out'); return addWorkbookOutput(); }
    if (id === 'export') {
      addTxtOutputs();
      if (state.results[SHEETS.OUT]) renderReview(true);   // stage 3 may have refreshed supplier changes first
      renderReviewKpis(); renderTabs();
      if (wb.active === 'ins' || wb.active === 'upd') wbShow(wb.active, true);
      return addWorkbookOutput();
    }
    return Promise.resolve();
  }

  // -------------------------------------------------------------- outputs
  function addOutput(stage, key, name, blob, meta, warn) {
    var old = state.outputs.get(key); if (old && old.url) URL.revokeObjectURL(old.url);
    state.outputs.set(key, { stage: stage, key: key, name: name, blob: blob, meta: meta, warn: warn || '', url: URL.createObjectURL(blob) });
    renderOutputs();
  }
  function outputRows(arr) {
    if (!arr.length) return '<div class="empty-output">No output files yet.</div>';
    return arr.map(function (o) {
      return '<div class="output-row' + (o.warn ? ' has-warning' : '') + '"><div><code>' + esc(o.name) + '</code><span>' + esc(o.meta) + '</span>' + (o.warn ? '<span class="output-warning">⚠ ' + esc(o.warn) + '</span>' : '') + '</div><div class="output-actions"><a class="download-link" href="' + o.url + '" download="' + esc(o.name) + '">Download</a></div></div>';
    }).join('');
  }
  function renderOutputs() {
    var order = ['txt-0', 'txt-1', 'xlsx-review'];
    var arr = Array.from(state.outputs.values()).sort(function (a, b) { return order.indexOf(a.key) - order.indexOf(b.key); });
    // v1.5.0: the TXT files say so when the sheets were edited after they were made.
    var posEd = Object.keys(state.edits.pos).filter(function (n) { return state.edits.pos[n]; });
    arr.forEach(function (o) {
      if (!/^txt-/.test(o.key)) return;
      o.warn = state.edits.outAfter3 ? 'Made before your OUT_MERGED_DATA edits — run stage 3 again to include them.'
        : state.edits.optsAfter3 ? 'Made before the Update in POS / Discontinue options changed — run stage 3 again.'
        : posEd.length ? 'Made before your ' + posEd.join(' / ') + ' edits — use Export TXT again on that tab.'
        : state.edits.ticks ? 'Made before your Upload tick changes — use Export TXT again on the OUT_POS_INSERT / UPDATE tab.' : '';   // v1.13.0
    });
    var c = $('#outputCount'); c.textContent = arr.length + ' OUTPUT' + (arr.length === 1 ? '' : 'S'); c.className = 'result-badge' + (arr.length ? ' ok' : '');
    $('#allOutputs').innerHTML = arr.length ? outputRows(arr) : '<div class="empty-output">Run a stage to create its download files.</div>';
    STAGES.forEach(function (s) { var el = document.querySelector('[data-stage-output="' + s.id + '"]'); if (el) el.innerHTML = outputRows(arr.filter(function (o) { return o.stage === s.id; })).replace('<div class="empty-output">No output files yet.</div>', ''); });
  }

  // ------------------------------------------------------ review workbook
  var COL = {
    ODD: 'F5F5F5', EVEN: 'E9F0F5', TITLE_BG: '1E3A5F', TITLE_FG: 'FFD966', HDR_BG: 'E9F0F5', HDR_FG: '2C3E50', INK: '1C2833',
    UP: ['FCE8E6', 'D93025'], DOWN: ['E8F0FE', '1A73E8'], WARN: ['FEF3E2', 'E37400'], NEW: ['E6F4EA', '0F9D58'], REVIEW: ['F3E8FD', '9334E6'], MATCH: [null, '1565C0'], FLAT: [null, '9E9E9E']
  };
  var TEXT_HEAD = /(MAIN ID|\bPLU\b|SUB ID|BARCODE|^INDEX$|^POS INDEX$|ACCNO|SUPPLIER NUMBER|^BC$)/i;
  // v1.5.0: the review workbook takes the Google Sheet's colours and row-1 totals from js/sheet-look.js.
  function supAccent(head, v) {
    if (head !== 'STATUS') return null;
    var s = String(v || '').toUpperCase(); if (!s) return null;
    return /UNMATCHABLE/.test(s) ? ['FFF3CD', '856404'] : /NOT USED/.test(s) ? [null, '9AA0A6'] : /MATCHED/.test(s) ? ['E8F0FE', '1565C0'] : /NEW/.test(s) ? ['E6F4EA', '137333'] : null;
  }
  function typed(v, head) {
    var s = String(v == null ? '' : v);
    if (s === '' || TEXT_HEAD.test(head)) return { v: s };
    if (/^-?\$[\d,]*\.?\d+$/.test(s)) return { v: Number(s.replace(/[$,]/g, '')), f: '$#,##0.00' };
    if (/^-?[\d,]*\.?\d+%$/.test(s)) return { v: Number(s.replace(/[,%]/g, '')) / 100, f: '0.00%' };
    if (/^-?\d+(\.\d+)?$/.test(s) && s.length < 15 && !/^-?0\d/.test(s)) return { v: Number(s) };
    return { v: s };
  }
  function widthFor(h) {
    var u = String(h).toUpperCase();
    if (/DESCR|PRODUCT|NOTES|POS DESC/.test(u)) return /NOTES/.test(u) ? 48 : 36;
    if (/WSP TO RRP|FINAL SHELF|CURRENT WSP TO/.test(u)) return 24;
    if (/BRAND|SUPPLIER|STATUS|MAIN ID|BARCODE/.test(u)) return 18;
    if (/^(BC|SUB ID|BRAND|WSP)$/.test(u)) return 7;
    return 12;
  }
  function sheetSummary(name, rows) {
    var n = Math.max(0, rows.length - 2);
    if (name === SHEETS.OUT) { var k = reviewCounts(rows); return 'OUT_MERGED_DATA · ' + fmtN(n) + ' ROWS · MATCHED ' + fmtN(k.matched) + ' · NEW ' + fmtN(k.newp) + ' · REVIEW ' + fmtN(k.review) + ' · DISCONTINUED ' + fmtN(k.disc); }
    return name + ' · ' + fmtN(n) + ' ROWS';
  }
  function buildXlsxSheet(st, styles, name, rows) {
    var head = (rows[1] || []).slice();
    var drop = head.indexOf('__EXPORT_VISIBLE__');
    var width = head.length;
    if (drop >= 0) width = drop;
    head = head.slice(0, width);
    var X = window.XlsxLite, last = X.colLetter(width), n = Math.max(0, rows.length - 2), data = rows.slice(2);
    var look = window.PHFSheetLook ? window.PHFSheetLook.forSheet(name, head) : null;
    if (look && name === SHEETS.OUT) look = keptLook(look, head, 'out', head.indexOf('ROW STATUS'));   // v1.6.1: kept grey
    var tot = look ? look.totals(data, data) : {};
    var summary = sheetSummary(name, rows) + ' · POS New Product Check Clean ' + TOOL_VERSION + ' (engine ' + (String((state.engineInfo || {}).merge || '').match(/v\d+\.\d+\.\d+/) || [''])[0] + ') · ' + melb();
    return {
      name: name.replace(/[\\/?*\[\]:]/g, '_').replace(/_+/g, '_').slice(0, 31), columnCount: width, freeze: 'A3',
      autoFilter: 'A2:' + last + (n + 2), dimension: 'A1:' + last + (n + 2),
      widths: head.map(widthFor), defaultRowHeight: 15,
      rows: function* () {
        // Row 1 = the Sheet's totals band (as the merge left the rows); the tool line goes in the last empty cell.
        var t = new Array(width).fill(''), k;
        for (k = 0; k < width; k++) t[k] = tot[k] || '';
        if (name === SHEETS.SUP) t[15] = String((rows[0] || [])[15] || '');
        for (k = width - 1; k >= 0 && t[k]; k--);
        if (k >= 0) t[k] = summary;
        yield { cells: t, styles: styles.title, height: 30 };
        yield { cells: head, styles: styles.head, height: 30 };
        for (var r = 2; r < rows.length; r++) {
          var band = r % 2 === 0 ? 'ODD' : 'EVEN', src = rows[r], cells = new Array(width), sts = new Array(width);
          for (var c = 0; c < width; c++) {
            var shown = look && look.display ? look.display(src[c], c) : src[c];
            var tv = typed(shown, head[c]);
            cells[c] = tv.v;
            var a = look && look.style && String(shown == null ? '' : shown) !== '' ? look.style(src, c) : null;
            var acc = a ? [a.bg ? a.bg.toUpperCase() : null, a.fg ? a.fg.toUpperCase() : null, !!a.b] : (name === SHEETS.SUP ? supAccent(head[c], src[c]) : null);
            sts[c] = styles.cell(band, tv.f || (TEXT_HEAD.test(head[c]) ? '@' : ''), acc, !!(look && look.centre[c]), /\n/.test(String(shown || '')));
          }
          yield { cells: cells, styles: sts };
        }
      }
    };
  }
  function buildReviewWorkbook() {
    var X = window.XlsxLite;
    if (!X) return Promise.reject(new Error('Workbook writer not loaded'));
    var st = new X.StyleSheet(), cache = {};
    var styles = {
      title: st.style({ font: { bold: true, color: COL.TITLE_FG, size: 9 }, fill: COL.TITLE_BG, align: { h: 'center', v: 'center', wrap: true } }),
      head: st.style({ font: { bold: true, color: COL.HDR_FG, size: 9 }, fill: COL.HDR_BG, align: { h: 'center', v: 'center', wrap: true } }),
      cell: function (band, fmt, acc, centre, wrap) {
        var key = band + '|' + fmt + '|' + (acc ? acc.join(',') : '') + '|' + (centre ? 'c' : '') + (wrap ? 'w' : '');
        if (cache[key] !== undefined) return cache[key];
        var spec = { fill: (acc && acc[0]) || COL[band], font: { size: 9, color: (acc && acc[1]) || COL.INK, bold: !!(acc && (acc.length > 2 ? acc[2] : acc[0])) }, align: { v: 'center' } };
        if (centre) spec.align.h = 'center';
        if (wrap) spec.align.wrap = true;
        if (fmt) spec.numFmt = fmt;
        return (cache[key] = st.style(spec));
      }
    };
    var names = [SHEETS.OUT, SHEETS.INS, SHEETS.UPD, SHEETS.SUP, 'SRC_POS_BRAND_NAME_CHANGES', 'SRC_POS_PRODUCT_PREFIX', 'SRC_POS_SUPPLIERS', 'SRC_POS_ONGOING_DISCOUNTS', 'SRC_POS_FIND_REPLACE'];
    var sheets = names.filter(function (n) { return state.results[n] && state.results[n].length >= 2; }).map(function (n) { return buildXlsxSheet(st, styles, n, n === SHEETS.OUT ? keptRows(state.results[n]) : state.results[n]); });
    var chk = uploadChecksRows();                                                   // v1.13.0: OUT_UPLOAD_CHECKS after the POS sheets
    if (chk) sheets.splice(Math.min(3, sheets.length), 0, buildXlsxSheet(st, styles, 'OUT_UPLOAD_CHECKS', chk));
    return X.writeWorkbook(sheets, st, {});
  }
  function brandSummary() {
    var out = state.results[SHEETS.OUT] || [], h = out[1] || [], bi = h.indexOf('POS BRAND'), si = h.indexOf('ROW STATUS'), c = {};
    for (var i = 2; i < out.length; i++) { if (/DISCONTINUED/i.test(out[i][si])) continue; var b = String(out[i][bi] || '').replace(/^Z{3,}\s*/i, '').trim(); if (b) c[b] = (c[b] || 0) + 1; }
    var keys = Object.keys(c).sort(function (a, b) { return c[b] - c[a] || (a < b ? -1 : 1); });
    return keys.slice(0, 3).join(', ') + (keys.length > 3 ? ' +' + (keys.length - 3) : '');
  }
  function addWorkbookOutput() {
    var name = ('POS SUPPLIER MERGE ' + melb('iso') + ' ' + brandSummary()).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150) + '.xlsx';
    return buildReviewWorkbook().then(function (blob) {
      var parts = [SHEETS.OUT, SHEETS.INS, SHEETS.UPD].filter(function (n) { return state.results[n]; }).map(function (n) { return n + ' ' + fmtN(Math.max(0, state.results[n].length - 2)); });
      addOutput('build', 'xlsx-review', name, blob, 'Review workbook · ' + parts.join(' · ') + ' · supplier STATUS and reference tabs');
    }).catch(function (e) { console.error(e); setGlobal('Review workbook could not be written: ' + e.message, 'error'); });
  }

  // --------------------------------------------------------------- review
  var REVIEW_COLS = [
    { h: 'INDEX', label: '#', cls: 'rv-num' },
    { h: 'ROW STATUS', chip: 1 }, { h: 'PRICE STATUS', chip: 1 },
    { h: 'POS BRAND', cls: 'rv-brand' }, { h: 'SUP BRAND', cls: 'rv-brand' }, { h: 'OLD BRAND', cls: 'rv-brand warnable' },
    { h: 'POS MAIN ID', label: 'Barcode', extra: 'BARCODE UPDATE', extraLabel: 'update' },
    { h: 'POS PLU', label: 'PLU / Sub ID', extra: 'POS SUB ID' },
    { h: 'ORIGINAL POS DESCR', cls: 'rv-descr' }, { h: 'POS DESCR', cls: 'rv-descr rv-strong' }, { h: 'SUP PRODUCT', cls: 'rv-descr' },
    { h: 'CURRENT WSP EXGST', label: 'WSP', extra: 'NEW WSP EXGST', arrow: 1, cls: 'rv-money' },
    { h: 'CURRENT LAST PRICE', label: 'Last price', extra: 'NEW LAST PRICE', arrow: 1, cls: 'rv-money' },
    { h: 'CURRENT RRP', label: 'RRP', extra: 'NEW RRP', arrow: 1, cls: 'rv-money' },
    { h: 'FINAL SHELF RRP', label: 'Final shelf RRP', cls: 'rv-money' },
    { h: 'BC', audit: 1 }, { h: 'SUB ID', audit: 1 }, { h: 'BRAND', audit: 1 }, { h: 'WSP', audit: 1 }, { h: 'TEXT %', label: 'Text', cls: 'rv-num' },
    { h: 'NOTES', cls: 'rv-notes' }
  ];
  var PAGE = 200;
  function reviewCounts(rows) {
    var h = rows[1] || [], si = h.indexOf('ROW STATUS'), pi = h.indexOf('PRICE STATUS'), ji = h.indexOf('OLD BRAND'), li = h.indexOf('BARCODE UPDATE');
    var k = { matched: 0, newp: 0, review: 0, disc: 0, up: 0, down: 0, barcode: 0, brand: 0 };
    for (var i = 2; i < rows.length; i++) {
      var s = String(rows[i][si] || '').toUpperCase(), p = String(rows[i][pi] || '').toUpperCase();
      if (/NEW/.test(s)) k.newp++; else if (/DISCONTINUED/.test(s)) k.disc++; else if (/REVIEW/.test(s)) k.review++; else if (/MATCHED/.test(s)) k.matched++;
      if (/INCREASE/.test(p)) k.up++; if (/DECREASE/.test(p)) k.down++;
      if (li >= 0 && String(rows[i][li] || '').trim()) k.barcode++;
      if (ji >= 0 && String(rows[i][ji] || '').trim()) k.brand++;
    }
    return k;
  }
  function chipClass(v) {
    var s = String(v || '').toUpperCase();
    if (/PENDING/.test(s)) return 'warn'; if (/ACCEPTED/.test(s)) return 'new'; if (/REJECTED/.test(s)) return 'up';
    if (/INCREASE/.test(s)) return 'up'; if (/DECREASE/.test(s)) return 'down'; if (/NEW/.test(s)) return 'new';
    if (/DISCONTINUED/.test(s)) return 'warn'; if (/REVIEW/.test(s)) return 'review'; if (/MATCHED/.test(s)) return 'match'; if (/NO CHANGE/.test(s)) return 'flat';
    return '';
  }
  function hideReview() { if ($('#wbTabs')) { renderTabs(); wbShow(wb.active, true); } }
  // keep = redraw with the rows the engine has now (after an edit / refresh) and leave the search and filters as they are.
  function renderReview(keep) {
    var rows = keptRows(state.results[SHEETS.OUT] || []);          // v1.6.1: kept columns show POS's values
    var head = rows[1] || [], idx = {};
    head.forEach(function (h, i) { if (idx[h] === undefined) idx[h] = i; });
    var data = rows.slice(2);
    var prev = keep ? { q: $('#reviewSearch').value, page: state.review.page } : null;   // v1.16.0: no dropdown filters (the column menus sort / filter)
    state.review = { rows: data, head: head, idx: idx, filtered: data, page: 0, hay: data.map(function (r) { return r.join(' ').toUpperCase(); }) };
    $('#reviewSearch').value = prev ? prev.q : '';
    $('#reviewTable thead').innerHTML = '<tr>' + REVIEW_COLS.filter(function (c) { return idx[c.h] !== undefined; }).map(function (c) { return '<th class="' + (c.cls || '') + (c.audit ? ' rv-audit-col' : '') + '">' + esc(c.label || c.h) + '</th>'; }).join('') + '</tr>';
    renderReviewKpis();
    applyReviewFilter(!!prev, prev && prev.page);
    renderTabs();
  }
  function renderReviewKpis() {
    var rows = keptRows(state.results[SHEETS.OUT] || []); if (!rows.length) return;
    var k = reviewCounts(rows), ins = state.results[SHEETS.INS], upd = state.results[SHEETS.UPD];
    var chips = [['Rows', rows.length - 2, ''], ['Matched', k.matched, 'match'], ['New', k.newp, 'new'], ['Review', k.review, 'review'], ['Discontinued', k.disc, 'warn'], ['Price up', k.up, 'up'], ['Price down', k.down, 'down'], ['Barcode updates', k.barcode, 'warn'], ['Brand changes', k.brand, 'warn']];
    if (ins) chips.push(['Insert rows', Math.max(0, ins.length - 2), 'new']);
    if (upd) chips.push(['Update rows', Math.max(0, upd.length - 2), 'match']);
    $('#reviewKpis').innerHTML = chips.map(function (c) { return '<div class="review-kpi ' + c[2] + '"><strong>' + fmtN(c[1]) + '</strong><span>' + esc(c[0]) + '</span></div>'; }).join('');
    renderOutActions();
  }
  function applyReviewFilter(keep, page) {
    var R = state.review, q = wb.outView === 'sheet' ? '' : $('#reviewSearch').value.trim().toUpperCase();   // v1.16.0: the Sheet view searches in the grid
    R.filtered = []; R.fidx = [];
    for (var i = 0; i < R.rows.length; i++) {
      var r = R.rows[i];
      if (q && R.hay[i].indexOf(q) < 0) continue;
      R.filtered.push(r); R.fidx.push(i + 3);
    }
    R.page = keep ? (page || 0) : 0;
    renderReviewPage(keep);
    renderScopes(); renderOutActions();
  }
  function cellHtml(c, r, idx) {
    var v = r[idx[c.h]], s = String(v == null ? '' : v);
    if (c.chip) return s ? '<span class="rv-chip ' + chipClass(s) + '">' + esc(cleanTitle(s) || s) + '</span>' : '';
    if (c.h === 'NOTES' && s) return '<div class="rv-clamp" title="Click to show all of the note">' + esc(s).replace(/\n/g, '<br>') + '</div>';
    if (c.audit) { var a = s.charAt(0); return '<span class="rv-audit ' + (a === '☑' ? 'ok' : a === '☒' ? 'bad' : 'unk') + '">' + esc(s) + '</span>'; }
    if (c.arrow) { var nv = String(r[idx[c.extra]] == null ? '' : r[idx[c.extra]]); if (!nv || nv === s) return esc(s); return esc(s || '—') + ' <span class="rv-arrow">→</span> <strong>' + esc(nv) + '</strong>'; }
    if (c.extra) { var ev = String(r[idx[c.extra]] == null ? '' : r[idx[c.extra]]); return esc(s) + (ev ? '<small class="rv-extra' + (c.extraLabel ? ' warn' : '') + '">' + (c.extraLabel ? esc(c.extraLabel) + ': ' : '') + esc(ev) + '</small>' : ''); }
    return esc(s).replace(/\n/g, '<br>');
  }
  // v1.5.0: the All columns (Sheet) view is the Google Sheet tab — editable, with its totals band and colours.
  function renderReviewPage(keep) {
    var R = state.review, cols = REVIEW_COLS.filter(function (c) { return R.idx[c.h] !== undefined; });
    var sheetView = wb.outView === 'sheet';
    $('#reviewTableWrap').hidden = sheetView; $('#reviewPager').hidden = sheetView; $('#reviewGrid').hidden = !sheetView;
    $('#reviewKpis').hidden = sheetView;      // v1.8.0: the Sheet view has the same totals in row 1, above the columns
    $('#reviewSearch').hidden = sheetView;    // v1.16.0: the Sheet view has the grid's own search, on the row with Delete / Undo
    document.querySelectorAll('[data-out-view]').forEach(function (x) { x.classList.toggle('is-on', x.dataset.outView === wb.outView); });
    outBadge();
    if (sheetView) { drawOutGrid(keep); return; }
    var pages = Math.max(1, Math.ceil(R.filtered.length / PAGE));
    R.page = Math.max(0, Math.min(R.page, pages - 1));
    var slice = R.filtered.slice(R.page * PAGE, (R.page + 1) * PAGE);
    $('#reviewTable tbody').innerHTML = slice.length ? slice.map(function (r) {
      return '<tr>' + cols.map(function (c) { var s = String(r[R.idx[c.h]] || ''); return '<td class="' + (c.cls || '') + (c.audit ? ' rv-audit-col' : '') + (c.cls && c.cls.indexOf('warnable') >= 0 && s ? ' warn-cell' : '') + '">' + cellHtml(c, r, R.idx) + '</td>'; }).join('') + '</tr>';
    }).join('') : '<tr><td colspan="' + cols.length + '" class="rv-empty">No rows match the current search / filters.</td></tr>';
    $('#reviewPage').textContent = 'Page ' + (R.page + 1) + ' of ' + pages + ' · ' + PAGE + ' rows per page';
    $('#reviewPrev').disabled = R.page <= 0; $('#reviewNext').disabled = R.page >= pages - 1;
  }
  // v1.9.0: the rows badge counts what the column filters leave too (Sheet view), not only the search / dropdowns above.
  function outBadge() {
    var R = state.review, badge = $('#reviewCount'); if (!R || !badge) return;
    var shown = wb.outView === 'sheet' && wb.outGrid ? wb.outGrid.count() : R.filtered.length;
    badge.textContent = fmtN(shown) + ' OF ' + fmtN(R.rows.length) + ' ROWS'; badge.className = 'result-badge ok';
  }
  function drawOutGrid(keep) {
    var R = state.review;
    var cols = R.head.map(function (h, i) { return h === '__EXPORT_VISIBLE__' || isIndexHead(h) ? -1 : i; }).filter(function (i) { return i >= 0; });   // v1.16.0: no INDEX column
    if (!wb.outGrid) wb.outGrid = window.PHFSheetGrid.create($('#reviewGrid'), { search: true, pick: true, onView: function () { renderScopes(); renderOutActions(); outBadge(); },   // v1.16.0: the grid's own search and tick boxes
      onTick: function (id, on) {                                                        // v1.15.1: the price pairs' ticks
        var cur = id.indexOf('cur:') === 0, g = cur ? id.slice(4) : id, keep = cur ? on : !on;
        (g === 'ws' || g === 'last' ? ['ws', 'last'] : [g]).forEach(function (x) { setKeep(x, keep); });   // v1.15.3: WSP and last price move together
      } });
    var look = keptLook(window.PHFSheetLook.forSheet(SHEETS.OUT, R.head), R.head, 'out', R.idx['ROW STATUS']);
    look = Object.assign({}, look, { readOnly: outReadOnly(R.head, look.readOnly) });                                         // v1.15.0
    var marks = state.edits.marks[SHEETS.OUT] || {}, mk = {};
    R.fidx.forEach(function (sheetRow, i) { if (marks[sheetRow]) mk[i] = marks[sheetRow]; });
    wb.outGrid.set({
      head: R.head, rows: R.filtered, cols: cols, rowNumbers: R.fidx, look: look, marks: mk, keepView: !!keep, ticks: priceTicks(R.head),
      totals: function (vis) { return look.totals(R.rows, vis); },
      edit: {
        readOnly: look.readOnly, cellLock: keptLock(R.head, 'out', R.idx['ROW STATUS']), rows: 'delete', canUndo: (state.edits.undo[SHEETS.OUT] || 0) > 0,   // v1.16.0: rows can be deleted
        onChange: function (ch) { engineSheetEdit(SHEETS.OUT, ch, function (i) { return R.fidx[i]; }); },
        onUndo: function () { engineSheetUndo(SHEETS.OUT); }
      }
    });
    wb.outGrid.busy(state.busy || state.edits.busy);
  }
  // v1.15.0: OUT_MERGED_DATA has no heading ticks. The updated column of every pair is what goes to POS and is edited to
  // override it; the "what POS has now" column is read-only (the reason shows on the heading and when the cell is clicked).
  var OUT_CURRENT = {
    'POS SUPPLIER': 'the supplier POS has now (read-only). Change UPDATED SUPPLIER (G) instead — it is checked against POS Suppliers',
    'OLD BRAND': 'the brand POS has now (read-only). Change POS BRAND instead',
    'ORIGINAL POS DESCR': 'the description POS has now (read-only). Change POS DESCR instead'
  };   // v1.15.2: the CURRENT price columns are editable (their pair's tick decides which price goes to POS)
  // v1.15.1: the price pairs keep their CURRENT / NEW ticks (v1.14.0 rules): one of the two is ticked — NEW = the merge's
  // price goes to POS, CURRENT = matched products keep POS's own (grey). The same setting as the supplier sheet's J / K.
  var PRICE_TICKS = { ws: 1, last: 1, rrp: 1 };
  function priceTicks(head) {
    var t = null;
    head.forEach(function (h, i) {
      KEEP_GROUPS.forEach(function (g) {
        if (!PRICE_TICKS[g.id]) return;
        var keep = !!state.opts.keep[g.id];
        if (g.new === h) { t = t || {}; t[i] = { id: g.id, on: !keep, title: 'NEW ' + g.what + ' — ticked: the merge’s ' + g.what + ' goes to POS. Tick CURRENT instead to keep POS’s own for matched products.' + (g.col >= 0 ? ' Same tick as the supplier sheet heading.' : '') }; }
        else if (g.cur === h) { t = t || {}; t[i] = { id: 'cur:' + g.id, on: keep, title: 'CURRENT ' + g.what + ' — ticked: matched products keep POS’s current ' + g.what + '. Tick NEW instead to update it from the merge.' }; }
      });
    });
    return t;
  }
  function isIndexHead(h) { var t = String(h == null ? '' : h).trim().toUpperCase(); return t === 'INDEX' || t === 'POS INDEX'; }   // v1.16.0: the row numbers are the index
  function outReadOnly(head, ro) {
    var o = Object.assign({}, ro || {});
    head.forEach(function (h, i) { if (OUT_CURRENT[h] && !o[i]) o[i] = OUT_CURRENT[h]; });
    return o;
  }
  // v1.6.0: columns whose value POS keeps (unticked on the supplier sheet) — greyed for matched products, KEPT in the heading
  // (v1.8.0: OUT_POS_UPDATE only; OUT_MERGED_DATA has the ticks).
  function keptFlags(head, list, ids) {
    var names = keptNames(list, ids), f = null;
    head.forEach(function (h, i) { if (names[h]) { f = f || {}; f[i] = 'KEPT — POS keeps its current value for matched products (Update in POS is off for this column)'; } });
    return f;
  }
  // v1.6.1: kept cells take the Sheet's "no change" grey text (#9E9E9E, on the row's own band), as CHANGE LAST PRICE does.
  var KEEP_COLOUR = { 'WSP CHANGE %': 1, 'WSP CHANGE $': 1, 'CHANGE LAST PRICE %': 1, 'CHANGE LAST PRICE $': 1 };   // v1.15.4: the change columns keep their colour with CURRENT ticked
  function keptLook(look, head, list, statusCol) {
    var names = keptNames(list), cols = {}, any = false;
    head.forEach(function (h, i) { if (names[h] && !KEEP_COLOUR[h]) { cols[i] = 1; any = true; } });
    if (!any || !look) return look;
    var base = look.style;
    return Object.assign({}, look, { style: function (row, c) {
      if (cols[c] && (statusCol === undefined || isMatched(row[statusCol]))) return { fg: '9E9E9E' };
      return base ? base(row, c) : null;
    } });
  }
  // v1.6.1: a kept cell of a matched product cannot be edited (it shows POS's value, and POS keeps it).
  function keptLock(head, list, statusCol) {
    var names = keptNames(list), cols = {}, any = false;
    head.forEach(function (h, i) { if (names[h]) { cols[i] = 1; any = true; } });
    if (!any || statusCol === undefined) return null;
    return function (row, c) {
      if (!cols[c] || !isMatched(row[statusCol])) return '';
      var g = keptGroups().filter(function (x) { return x[list].indexOf(head[c]) >= 0; })[0];
      return 'KEPT — POS keeps its current ' + (g ? g.what : 'value') + ' for matched products, so ' + head[c] + ' shows POS\'s value and is not edited here. Tick Update in POS on the supplier sheet heading to change it.';
    };
  }
  // Buttons above OUT_MERGED_DATA: Refresh supplier changes (UPDATED SUPPLIER edits waiting) and Run stage 3 again.
  function renderOutActions() {
    var host = $('#outActions'); if (!host) return;
    var built = !!state.results[SHEETS.OUT], n = state.pendingSup || 0, busy = state.busy || state.edits.busy;
    if (!built) { host.innerHTML = ''; host.hidden = true; return; }
    host.hidden = false;
    var after3 = state.edits.outAfter3, done3 = (state.stage.export || {}).status === 'done';
    host.innerHTML =
      (n ? '<button type="button" class="btn small primary" data-act="refresh"' + (busy ? ' disabled' : '') + ' title="Check the UPDATED SUPPLIER (G) changes against the supplier upload — the Sheet menu REFRESH SUPPLIER CHANGES">Refresh supplier changes (' + fmtN(n) + ')</button>' : '') +
      '<button type="button" class="btn small' + (after3 || !done3 ? ' primary' : '') + '" data-act="stage3"' + (busy ? ' disabled' : '') + ' title="Generate OUT_POS_INSERT / OUT_POS_UPDATE from this OUT_MERGED_DATA and export the TXT files (supplier changes are refreshed first)">' + (done3 ? 'Run stage 3 again' : 'Run stage 3') + '</button>' +
      '<span class="out-actions-note">' + esc(n ? fmtN(n) + ' UPDATED SUPPLIER change' + (n === 1 ? '' : 's') + ' waiting — refresh to check ' + (n === 1 ? 'it' : 'them') + ' (stage 3 refreshes first).' : after3 ? 'OUT_MERGED_DATA was edited after stage 3 — run stage 3 again to put the edits in the POS files.' : state.edits.optsAfter3 ? 'Update in POS / Discontinue options changed — run stage 3 again to use them.' : 'Click a cell to edit it, as in the Google Sheet. FINAL SHELF RRP follows RRP / MARKUP OVERRIDE.') + '</span>' +
      (function () { var v = outView(); return v && v.filtered ? '<span class="out-actions-filter">Filtered — stage 3 uses only the ' + fmtN(v.rows.length) + ' of ' + fmtN(v.total) + ' rows shown.</span>' : ''; })();
    host.querySelectorAll('[data-act]').forEach(function (b) {
      b.onclick = function () {
        if (b.dataset.act === 'refresh') runExtra(['refresh'], 'Refresh supplier changes');
        if (b.dataset.act === 'stage3') runTo('export');
      };
    });
  }
  function wireReview() {
    var t; $('#reviewSearch').oninput = function () { clearTimeout(t); t = setTimeout(function () { applyReviewFilter(); }, 200); };
    $('#reviewPrev').onclick = function () { state.review.page--; renderReviewPage(); };
    $('#reviewNext').onclick = function () { state.review.page++; renderReviewPage(); };
    $('#reviewTable').addEventListener('click', function (e) { var c = e.target.closest('.rv-clamp'); if (c) c.classList.toggle('is-open'); });
    document.querySelectorAll('[data-out-view]').forEach(function (b) {
      b.onclick = function () {
        wb.outView = b.dataset.outView;
        if (state.review) applyReviewFilter(true, state.review.page);   // v1.16.0: the search applies to the view shown
      };
    });
  }

  // ------------------------------------------------------ workbook tabs (v1.4.0)
  /* The Google Sheet's tabs along the bottom of the workbook, in the Sheet's order and colours: IN_SUPPLIER (editable),
     OUT_MERGED_DATA (review or every column), OUT_POS_INSERT / OUT_POS_UPDATE (stage 3), the SRC_ reference tabs (as
     loaded, or with SRC STATUS once stage 2 has run) and TMP_MERGED_POS_DATA (the POS Database). One tab shows at a time.
     v1.5.0: every tab but TMP_MERGED_POS_DATA is editable, and each looks like the Sheet (js/sheet-look.js). */
  var WB_TABS = [
    { id: 'sup', sheet: SHEETS.SUP, color: 'ed4141' },
    { id: 'out', sheet: SHEETS.OUT, color: '81d25c', by: 'stage 2 (Build OUT_MERGED_DATA)' },
    { id: 'ins', sheet: SHEETS.INS, color: 'ff9900', by: 'stage 3 (Generate Insert + Update & Export)', engine: true },
    { id: 'upd', sheet: SHEETS.UPD, color: 'ff9900', by: 'stage 3 (Generate Insert + Update & Export)', engine: true },
    { id: 'fr', sheet: 'SRC_POS_FIND_REPLACE', color: '6d9eeb', input: 'fr' },
    { id: 'disc', sheet: 'SRC_POS_ONGOING_DISCOUNTS', color: '6d9eeb', input: 'disc' },
    { id: 'brands', sheet: 'SRC_POS_BRAND_NAME_CHANGES', color: '6d9eeb', input: 'brands' },
    { id: 'prefix', sheet: 'SRC_POS_PRODUCT_PREFIX', color: '6d9eeb', input: 'prefix' },
    { id: 'suppliers', sheet: 'SRC_POS_SUPPLIERS', color: '6d9eeb', input: 'suppliers' },
    { id: 'tmp', sheet: 'TMP_MERGED_POS_DATA', color: '', input: 'pos', readOnly: true }
  ];
  var wb = { active: 'sup', grid: null, outGrid: null, outView: 'sheet', uploadView: null };   // v1.13.0 uploadView: { sheet, level } = Show held / to check / fixed on that tab
  function wbTab(id) { return WB_TABS.filter(function (t) { return t.id === id; })[0] || WB_TABS[0]; }
  function wbCount(t) {
    if (t.id === 'sup') return rowsOf('sup').length;
    if (t.input) { var x = state.inputs[t.input]; return x && x.files ? x.files.reduce(function (a, f) { return a + f.data.length; }, 0) : 0; }
    var r = state.results[t.sheet]; return r && r.length >= 2 ? r.length - 2 : -1;
  }
  function wbRows(t) {
    if (t.input && !loaded(t.input)) return null;                            // not loaded: say so, even after a run
    var res = state.results[t.sheet];
    if (res && res.length >= 2 && (!t.input || res.length - 2 === rowsOf(t.input).length)) return res;   // as the merge left it (SRC STATUS filled in)
    if (t.input && loaded(t.input)) return M.sheetRows(t.sheet, rowsOf(t.input));
    return null;
  }
  function renderTabs() {
    var host = $('#wbTabs'); if (!host) return;
    host.innerHTML = '<span class="wb-tabs-lead" aria-hidden="true">☰</span>' + WB_TABS.map(function (t) {
      var n = wbCount(t), empty = n < 0 || (n === 0 && t.id !== 'sup');
      return '<button type="button" class="wb-tab' + (t.id === wb.active ? ' is-active' : '') + (empty ? ' is-empty' : '') + '" data-wb-tab="' + t.id + '" style="--tab:' + (t.color ? '#' + t.color : 'transparent') + '" title="' + esc(t.sheet + (n >= 0 ? ' · ' + fmtN(n) + ' rows' : ' · made by ' + t.by) + (t.readOnly ? ' · read-only' : ' · editable')) + '"><span>' + esc(t.sheet) + '</span>' + (n > 0 ? '<small>' + fmtN(n) + '</small>' : '') + '</button>';
    }).join('');
    host.querySelectorAll('[data-wb-tab]').forEach(function (b) { b.onclick = function () { wbShow(b.dataset.wbTab); }; });
  }
  function wbShow(id, quiet) {
    var t = wbTab(id), prev = wb.active;
    wb.active = t.id;
    var outReady = !!(state.review && state.results[SHEETS.OUT]);
    $('#supPanel').hidden = t.id !== 'sup';
    $('#reviewPanel').hidden = !(t.id === 'out' && outReady);
    var sheetPanel = $('#wbSheetPanel'); sheetPanel.hidden = t.id === 'sup' || (t.id === 'out' && outReady);
    document.querySelectorAll('[data-wb-tab]').forEach(function (b) { b.classList.toggle('is-active', b.dataset.wbTab === t.id); });
    var strip = $('#wbTabs'), on = strip && strip.querySelector('.wb-tab.is-active');
    if (on) { var l = on.offsetLeft, r = l + on.offsetWidth; if (l < strip.scrollLeft) strip.scrollLeft = l - 30; else if (r > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = r - strip.clientWidth + 30; }
    if (t.id === 'sup') refreshSupSheet();
    else if (t.id === 'out' && outReady) { if (wb.outView === 'sheet' && wb.outGrid) wb.outGrid.refresh(); }
    else drawSheetTab(t, quiet && prev === t.id);
    if (!quiet && prev !== t.id) {
      var wbEl = $('#workbook'), top = wbEl ? wbEl.getBoundingClientRect().top : 0;
      if (top < 0) wbEl.scrollIntoView({ block: 'start' });
    }
  }
  // One sheet tab (not IN_SUPPLIER / OUT_MERGED_DATA review): the Sheet's look, editable unless it is TMP_MERGED_POS_DATA.
  function drawSheetTab(t, keep) {
    var sheetPanel = $('#wbSheetPanel'), rows = wbRows(t);
    var empty = $('#wbSheetEmpty'), grid = $('#wbGrid'), badge = $('#wbSheetCount'), actions = $('#wbActions');
    $('#wbSheetTitle').textContent = t.sheet;
    sheetPanel.style.setProperty('--tab', t.color ? '#' + t.color : 'transparent');
    var canStart = t.input && !t.readOnly;                                   // an SRC tab can be started by typing / pasting
    if (!rows && !canStart) {
      empty.hidden = false; grid.hidden = true; wb.gridFor = '';
      empty.innerHTML = t.input ? '<strong>' + esc(inputDef(t.input).title) + ' is not loaded.</strong> Drop the ' + esc(t.sheet) + ' file (or a download of the Google Sheet) in Drop All, or on its row in the Input files list.'
        : '<strong>' + esc(t.sheet) + ' is made by ' + esc(t.by) + '.</strong> Run that stage, or Run All, to fill this tab.';
      $('#wbSheetSub').textContent = t.input ? 'Input · ' + inputDef(t.input).title : 'Output sheet';
      badge.textContent = '0 ROWS'; badge.className = 'result-badge';
      actions.innerHTML = '';
      renderUploadPanel(null);
      return;
    }
    if (!rows) rows = M.sheetRows(t.sheet, []);
    empty.hidden = !!(rows.length > 2) || !canStart;
    if (!empty.hidden) empty.innerHTML = '<strong>' + esc(inputDef(t.input).title) + ' is not loaded.</strong> Drop the ' + esc(t.sheet) + ' file in Drop All, or click a cell below and type or paste (Ctrl+V) rows to start the table — it is saved in this browser.';
    grid.hidden = false;
    if (!wb.grid) wb.grid = window.PHFSheetGrid.create(grid, { search: true, pick: true, onView: function () { var tt = wbTab(wb.active); if (tt.engine) renderWbActions(tt); wbBadge(); },   // v1.16.0 pick
      onRowTick: function (i, on) { var tt = wbTab(wb.active); if (tt.engine) setUploadTick(tt.sheet, i + 3, on); } });   // v1.13.0
    var head = rows[1] || [], data = rows.slice(2), look = window.PHFSheetLook.forSheet(t.sheet, head);
    var edit = null, marks = null;
    if (t.input && !t.readOnly) {
      edit = { readOnly: look.readOnly, rows: true, canUndo: (srcUndo[t.input] || []).length > 0, onChange: function (ch) { srcEdit(t, ch); }, onUndo: function () { srcUndoLast(t); } };
      marks = {}; srcItems(t.input).forEach(function (it, i) { if (it.row.__ed) marks[i] = it.row.__ed; });
    } else if (t.engine) {
      edit = { readOnly: look.readOnly, rows: true, canUndo: (state.edits.undo[t.sheet] || 0) > 0, onChange: function (ch) { engineSheetEdit(t.sheet, ch, function (i) { return i + 3; }, data.length); }, onUndo: function () { engineSheetUndo(t.sheet); } };
      var m = state.edits.marks[t.sheet] || {}; marks = {}; Object.keys(m).forEach(function (r) { marks[Number(r) - 3] = m[r]; });
    }
    var key = t.id + ':' + state.rev + ':' + (state.results[t.sheet] ? 'r' : 'i');
    var rf = t.engine && state.results[t.sheet] ? rowFlagsFor(t.sheet) : null;   // v1.13.0
    wb.grid.set({ head: head, rows: data, look: look, marks: marks, edit: edit, keepView: !!(keep && wb.gridFor === key) || !!keep,
      cols: head.map(function (h, i) { return isIndexHead(h) ? -1 : i; }).filter(function (i) { return i >= 0; }),   // v1.16.0: no INDEX / POS INDEX column
      flags: t.id === 'upd' && state.results[t.sheet] && state.results.keep_generate && state.results.keep_generate.length ? keptFlags(head, 'upd', state.results.keep_generate) : null,
      rowFlags: rf, rowFilter: rf && wb.uploadView && wb.uploadView.sheet === t.sheet ? uploadRowFilter(t.sheet, wb.uploadView.level) : null,
      totals: function (vis) { return look.totals(data, vis); } });
    renderUploadPanel(t);
    wb.grid.busy(state.busy || state.edits.busy);
    wb.gridFor = key; wb.gridRows = data.length;
    var sub = t.readOnly ? 'The POS Database · read-only (it comes from Build POS Master Databases)'
      : t.engine ? 'Made by ' + t.by + ' · editable — Export TXT again puts your edits in the POS file'
      : (state.results[t.sheet] ? 'As the merge left it (SRC STATUS filled in by stage 2) · ' : 'Input · ' + inputDef(t.input).title + ' · ') + 'editable — saved in this browser; run the stages again to use changes';
    $('#wbSheetSub').textContent = sub;
    wbBadge();
    renderWbActions(t);
  }
  // v1.9.0: N OF M ROWS while a search or column filter is on.
  function wbBadge() {
    var badge = $('#wbSheetCount'); if (!badge || !wb.grid) return;
    var all = wb.gridRows || 0, shown = wb.grid.filtered() || (wb.uploadView && wb.uploadView.level) ? wb.grid.count() : all;
    var t = wbTab(wb.active), held = t.engine ? uploadCounts(t.sheet).off : 0;   // v1.13.0
    badge.textContent = (shown !== all ? fmtN(shown) + ' OF ' : '') + fmtN(all) + ' ROWS' + (held ? ' · ' + fmtN(held) + ' HELD' : ''); badge.className = 'result-badge' + (all ? (held ? ' warn' : ' ok') : '');
  }
  function renderWbActions(t) {
    var host = $('#wbActions'); if (!host) return;
    var busy = state.busy || state.edits.busy, html = '';
    if (t.engine && state.results[t.sheet]) {
      var edited = !!state.edits.pos[t.sheet];
      var pv = posTabView();
      html = '<button type="button" class="btn small' + (edited || pv ? ' primary' : '') + '" data-act="reexport"' + (busy || !state.results.files ? ' disabled' : '') + ' title="Make the two POS TXT files again from OUT_POS_INSERT / OUT_POS_UPDATE as they are now (stage 3 export only — the sheets are not generated again)">Export TXT again</button>' +
        '<span class="out-actions-note">' + esc(edited ? t.sheet + ' was edited — Export TXT again to put the edits in the POS file. (Running stage 3 again makes this sheet again from OUT_MERGED_DATA.)' : 'Edits here go into the POS file with Export TXT again.') + '</span>' +
        (pv ? '<span class="out-actions-filter">Filtered — the ' + esc(t.id === 'upd' ? 'POS UPDATE' : 'POS INSERT') + ' TXT will have only the ' + fmtN(pv.rows.length) + ' of ' + fmtN(pv.total) + ' rows shown.</span>' : '') +
        (function () { var c = uploadCounts(t.sheet); return c.off ? '<span class="out-actions-filter">' + fmtN(c.off) + ' row' + (c.off === 1 ? ' is' : 's are') + ' unticked (held) — not in the TXT until ticked.</span>' : ''; })();   // v1.13.0
    } else if (t.input && !t.readOnly && loaded(t.input)) {
      html = '<button type="button" class="btn small" data-act="rerun"' + (busy || !requiredReady() ? ' disabled' : '') + ' title="Run stages 1 → 3 with this table as it is now">Run all stages</button><span class="out-actions-note">Changes here are saved in this browser straight away. Run the stages again to use them.</span>';
    }
    host.innerHTML = html;
    host.querySelectorAll('[data-act]').forEach(function (b) {
      b.onclick = function () {
        if (b.dataset.act === 'reexport') runExtra(['export'], 'Export TXT again');
        if (b.dataset.act === 'rerun') runTo('export');
      };
    });
  }

  // ------------------------------------------- engine sheet edits (v1.5.0: OUT_MERGED_DATA, OUT_POS_INSERT / UPDATE)
  /* The edit goes into the engine's copy of the Sheet and the script's onEdit runs on it, as typing in the Google Sheet
     does. The changed rows come back as the Sheet shows them. One edit (a cell, a paste, a row) = one undo step. */
  function gridFor(sheet) { return sheet === SHEETS.OUT ? wb.outGrid : wb.grid; }
  function colName(sheet, c) { var r = state.results[sheet]; return (r && r[1] && r[1][c]) || ''; }
  // v1.14.5: a supplier typed into UPDATED SUPPLIER (OUT_MERGED_DATA) or POS SUPPLIER NAME / NUMBER (the supplier sheet) must
  // be in POS Suppliers (SRC_POS_SUPPLIERS): a number or a name (or "NAME (NUMBER)") becomes "NAME (NUMBER)" — approved; anything
  // else is refused and the cell goes back to what it was.
  function supplierLookup() {
    var byNo = {}, byName = {};
    rowsOf('suppliers').forEach(function (r) { var k = String(r[1] == null ? '' : r[1]).trim().replace(/\.0+$/, ''), v = String(r[2] == null ? '' : r[2]).trim(); if (k && v) { if (!byNo[k]) byNo[k] = v; byName[v.toUpperCase()] = k; } });
    return { byNo: byNo, byName: byName, any: Object.keys(byNo).length > 0 };
  }
  function approveSupplier(v, L) {   // → { name, no } or null
    var t = String(v == null ? '' : v).trim(); if (!t) return null;
    var m = t.match(/^(.*?)\s*\((\d+)\)\s*$/), no = m ? m[2] : (/^\d+$/.test(t) ? t : ''), name = m ? m[1].trim().toUpperCase() : t.toUpperCase();
    if (no && L.byNo[no]) return { name: L.byNo[no], no: no };
    if (!no && L.byName[name]) return { name: L.byNo[L.byName[name]], no: L.byName[name] };
    return null;
  }
  function checkSupplierCells(sheet, ch, g) {
    if (!ch.cells || !ch.cells.length) return ch;
    var head = state.results[sheet] && state.results[sheet][1] || [], cols = {};
    head.forEach(function (h, c) { if (h === 'UPDATED SUPPLIER') cols[c] = 'full'; });
    var touched = ch.cells.filter(function (cell) { return cols[cell.c]; }); if (!touched.length) return ch;
    var L = supplierLookup(); if (!L.any) { if (g) g.note('POS Suppliers is not loaded — the supplier cannot be checked; load it under Reference data.', 'warn'); return ch; }
    var ok = [], bad = [];
    ch.cells = ch.cells.filter(function (cell) {
      if (!cols[cell.c]) return true;
      var a = approveSupplier(cell.v, L);
      if (!a) { bad.push(String(cell.v)); return false; }
      cell.v = a.name + ' (' + a.no + ')';
      ok.push(cell.v); return true;
    });
    if (bad.length && g) { g.note('Not approved — "' + bad.join('", "') + '" is not in POS Suppliers (account number or name); the cell is back as it was.' + (ok.length ? ' Approved: ' + ok.join(', ') + '.' : ''), 'error'); if (!ch.cells.length) drawOutGrid(!!wb.outView); }
    if (ok.length) ch.approved = ok;
    return ch;
  }
  function engineSheetEdit(sheet, ch, sheetRowOf, nRows) {
    var g = gridFor(sheet);
    if (state.busy || state.edits.busy) { if (g) g.note('A stage is running — edit again when it finishes.', 'warn'); return; }
    if (sheet === SHEETS.OUT && ch.type !== 'deleteRows') { ch = checkSupplierCells(sheet, ch, g); if (ch.cells && !ch.cells.length) return; }
    var msg = null, newVals = [];
    if (ch.type === 'deleteRows') {
      msg = { cmd: 'edit', sheet: sheet, op: 'deleteRows', rows: ch.rows.map(sheetRowOf) };
    } else {
      var byRow = {}, rows = [];
      ch.cells.forEach(function (cell) {
        if (nRows !== undefined && cell.i >= nRows) { var k = cell.i - nRows; (newVals[k] = newVals[k] || [])[cell.c] = cell.v; return; }
        var r = sheetRowOf(cell.i); if (!r) return;
        if (!byRow[r]) { byRow[r] = {}; rows.push(r); }
        byRow[r][cell.c] = cell.v;
      });
      rows.sort(function (a, b) { return a - b; });
      var blocks = [];
      rows.forEach(function (r) {
        var cs = Object.keys(byRow[r]).map(Number), c1 = Math.min.apply(null, cs), c2 = Math.max.apply(null, cs);
        var vals = []; for (var c = c1; c <= c2; c++) vals.push(byRow[r][c] === undefined ? null : byRow[r][c]);
        var last = blocks[blocks.length - 1];
        if (last && last.r1 + last.values.length === r && last.c1 === c1 + 1 && last.values[0].length === vals.length) { last.values.push(vals); return; }
        blocks.push({ r1: r, c1: c1 + 1, values: [vals] });
      });
      newVals = newVals.filter(Boolean).map(function (row) { var o = []; for (var c = 0; c < row.length; c++) o.push(row[c] === undefined ? '' : row[c]); return o; });
      if (blocks.length) msg = { cmd: 'edit', sheet: sheet, op: 'cells', blocks: blocks };
      else if (newVals.length) msg = { cmd: 'edit', sheet: sheet, op: 'appendRows', values: newVals };
      if (blocks.length && newVals.length) { if (g) g.note('Edit the existing rows and the new rows separately.', 'warn'); return; }
    }
    if (!msg) return;
    var cells = ch.cells || [], one = cells.length === 1 ? cells[0] : null;
    var what = ch.type === 'deleteRows' ? fmtN(ch.rows.length) + ' row' + (ch.rows.length === 1 ? '' : 's') + ' deleted'
      : msg.op === 'appendRows' ? fmtN(newVals.length) + ' row' + (newVals.length === 1 ? '' : 's') + ' added'
      : one && !ch.fill ? 'Changed ' + ch.where + ' (' + colName(sheet, one.c) + ')' : (ch.paste ? 'Pasted at ' + ch.where + ': ' : ch.fill ? 'Filled ' + ch.where + ' from ' + ch.fill + ': ' : '') + fmtN(cells.length) + ' cell' + (cells.length === 1 ? '' : 's') + ' changed' + (ch.skipped ? ' (' + fmtN(ch.skipped) + ' read-only cells left as they were)' : '');
    if (ch.approved) what += ' — supplier approved: ' + ch.approved.join(', ') + ' (in POS Suppliers)';   // v1.14.5
    engineSend(sheet, msg, cells, sheetRowOf, what);
  }
  function engineSheetUndo(sheet) {
    if (state.busy || state.edits.busy) return;
    engineSend(sheet, { cmd: 'undo', sheet: sheet }, null, null, 'Undone');
  }
  function engineSend(sheet, msg, cells, sheetRowOf, what) {
    var g = gridFor(sheet);
    state.edits.busy = true; if (g) { g.busy(true); g.note('Updating ' + sheet + '…', 'running'); }
    renderOutActions();
    return state.engine.send(msg).then(function (res) {
      var rows = state.results[sheet];
      if (res.display) state.results[sheet] = res.display;
      else Object.keys(res.rows || {}).forEach(function (r) {
        var at = Number(r) - 1, v = res.rows[r];
        if (!rows[at]) { rows[at] = v.slice(); return; }
        rows[at].length = 0; Array.prototype.push.apply(rows[at], v);       // same array: the review rows follow
      });
      var marks = state.edits.marks[sheet] || (state.edits.marks[sheet] = {});
      if (msg.cmd === 'undo' || res.display) { if (msg.cmd === 'undo') Object.keys(res.rows || {}).forEach(function (r) { delete marks[r]; }); if (res.display) state.edits.marks[sheet] = {}; }
      else (cells || []).forEach(function (c) { var r = sheetRowOf(c.i); if (r) (marks[r] = marks[r] || {})[c.c] = 1; });
      state.edits.undo[sheet] = res.undo || 0;
      state.pendingSup = res.pending || 0;
      if (sheet === SHEETS.OUT) { if ((state.stage.export || {}).status === 'done') state.edits.outAfter3 = true; }
      else state.edits.pos[sheet] = true;
      afterSheetEdit(sheet);
      var gg = gridFor(sheet), extra = '';
      if (sheet === SHEETS.OUT) extra = state.pendingSup ? ' · ' + fmtN(state.pendingSup) + ' UPDATED SUPPLIER change' + (state.pendingSup === 1 ? '' : 's') + ' waiting — Refresh supplier changes (stage 3 refreshes first).' : state.edits.outAfter3 ? ' · Run stage 3 again to put it in the POS files.' : '';
      else extra = ' · Export TXT again to put it in the POS file.';
      if (gg) gg.note(what + '.' + extra, 'success');
      setGlobal(sheet + ': ' + what + '.' + extra, 'success');
      saveSessionSoon();
    }).catch(function (e) {
      var gg = gridFor(sheet); if (gg) gg.note('Not changed: ' + e.message, 'error');
      setGlobal(sheet + ': ' + e.message, 'error');
    }).then(function () {
      state.edits.busy = false;
      var gg = gridFor(sheet); if (gg) gg.busy(state.busy);
      renderOutActions(); if (wb.active !== 'out' && wb.active !== 'sup') renderWbActions(wbTab(wb.active));
    });
  }
  function afterSheetEdit(sheet) {
    if (sheet === SHEETS.OUT) {
      renderReview(true);
      var ex = state.stage.export || {};
      if (ex.status === 'done' && state.edits.outAfter3) stageMsg('export', 'OUT_MERGED_DATA was edited after this stage — run stage 3 again for insert / update files with the edits.', 'ready');
    } else {
      renderReviewKpis(); renderTabs(); wbShow(wb.active, true);
      if ((state.stage.export || {}).status === 'done') stageMsg('export', sheet + ' was edited — use Export TXT again (on the tab) to put the edits in the POS file.', 'ready');
    }
    renderOutputs();
    scheduleWorkbook();
  }
  // OUT rows whose PRICE STATUS still says SUP OVERRIDE PENDING after a refresh (the supplier in G was not recognised).
  function stillPending() {
    var o = state.results[SHEETS.OUT] || [], ci = (o[1] || []).indexOf('PRICE STATUS'), n = 0;
    for (var i = 2; i < o.length; i++) if (/SUP OVERRIDE PENDING/i.test(String(o[i][ci] || ''))) n++;
    return n;
  }
  var wbTimer = 0;
  // The review workbook is made again after an edit; a very large merge (5,000+ rows) waits for the next stage instead
  // (writing it takes a few seconds) and its download says it is from before the edits.
  function scheduleWorkbook() {
    clearTimeout(wbTimer);
    var out = state.results[SHEETS.OUT], wbo = state.outputs.get('xlsx-review');
    if (out && out.length > 5002) { if (wbo) { wbo.warn = 'Made before your sheet edits — it is made again when stage 3 runs.'; renderOutputs(); } return; }
    wbTimer = setTimeout(function () { if (state.results[SHEETS.OUT] && !state.busy) addWorkbookOutput(); }, 900);
  }
  // Refresh supplier changes / Export TXT again: engine steps outside the three stages.
  function runExtra(steps, label) {
    if (state.busy || state.edits.busy) return Promise.resolve();
    state.busy = true; updateRunButtons(); renderOutActions();
    setGlobal(label + '…', 'running');
    var t0 = Date.now(), chain = Promise.resolve();
    var pv = steps.indexOf('export') >= 0 ? posTabView() : null;
    steps.forEach(function (st) { chain = chain.then(function () { return runStep(st, st === 'export' ? exportOptions(pv) : null); }); });   // v1.13.0: ticked rows only (∩ the filtered view)
    return chain.then(function () {
      if (steps.indexOf('refresh') >= 0) {
        renderReview(true);
        var a = (state.results.alerts_refresh || [])[0], left = stillPending();
        setGlobal(label + ' — ' + (a ? cleanTitle(a.title) + (a.msg ? ': ' + String(a.msg).split('\n')[0] : '') : 'done') + ' (' + ((Date.now() - t0) / 1000).toFixed(1) + 's).' +
          (left ? ' ' + fmtN(left) + ' row' + (left === 1 ? ' is' : 's are') + ' still SUP OVERRIDE PENDING — the supplier typed in UPDATED SUPPLIER (G) was not found; type it as NAME (account number), e.g. BIOCEUTICALS (20).' : ''), left ? 'missing' : 'success');
      }
      if (steps.indexOf('export') >= 0) {
        addTxtOutputs();
        stageSet('export', 'done', 'Exported again ' + melb() + ' — ' + (state.results.files || []).length + ' TXT files with the OUT_POS_INSERT / UPDATE edits.' + (pv ? ' The ' + pv.sheet + ' TXT has only the ' + fmtN(pv.rows.length) + ' of ' + fmtN(pv.total) + ' rows shown (filtered).' : '') + uploadSummaryText());
        setGlobal('Export TXT again — ' + (state.results.files || []).length + ' TXT files ready below (' + ((Date.now() - t0) / 1000).toFixed(1) + 's).', 'success');
      }
      return addWorkbookOutput();
    }).catch(function (e) { console.error(e); setGlobal(label + ' stopped: ' + e.message, 'error'); })
      .then(function () { state.busy = false; updateRunButtons(); renderOutActions(); renderOutputs(); renderTabs(); if (wb.active !== 'sup' && wb.active !== 'out') wbShow(wb.active, true); saveSessionSoon(); });
  }

  // ------------------------------------------------- SRC_ tab edits (v1.5.0, saved reference tables)
  /* An SRC_ tab is the reference table loaded for it (one or more files). A change edits those rows (rows typed below the
     last row go into the last file, or a "Typed here" table when nothing is loaded), saves the table in this browser
     straight away and resets the stages — the next run uses it. Undo goes back one change at a time. */
  var srcUndo = {};
  function srcItems(id) { var out = [], x = state.inputs[id]; ((x && x.files) || []).forEach(function (e) { e.data.forEach(function (row) { out.push({ e: e, row: row }); }); }); return out; }
  function srcSnapshot(id) { var x = state.inputs[id]; return x ? x.files.map(function (e) { return { e: e, data: e.data.map(function (r) { var a = r.slice(); if (r.__ed) a.__ed = Object.assign({}, r.__ed); return a; }) }; }) : null; }
  function srcRestore(id, snap) {
    if (!snap || !snap.length) { delete state.inputs[id]; return; }
    snap.forEach(function (s) { s.e.data = s.data; });
    state.inputs[id] = state.inputs[id] || { files: [], savedAt: melb() };
    state.inputs[id].files = snap.map(function (s) { return s.e; });
  }
  // What a typed value becomes in a reference table: SRC_POS_ONGOING_DISCOUNTS POS DISCOUNT% 7.5 / 7.5% / 0.075 → 0.075
  // (1.0 Setup setupNormaliseSrcDiscountPercentEdit_), POS MARKUP% a number, everything else trimmed text.
  function srcValue(sheet, c, v) {
    var s = String(v == null ? '' : v).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim();
    if (sheet === 'SRC_POS_ONGOING_DISCOUNTS' && (c === 7 || c === 8) && s !== '') {
      var n = Number(s.replace(/[%,\s]/g, ''));
      if (isFinite(n)) { if (c === 7) { if (n > 1) n = n / 100; if (n < 0) n = 0; } else if (/%/.test(s) || n > 1) n = n / 100; return n; }
    }
    return s;
  }
  function srcEdit(t, ch) {
    var id = t.input, def = inputDef(id), g = wb.grid;
    if (state.busy) { if (g) g.note('A stage is running — edit again when it finishes.', 'warn'); return; }
    var snap = srcSnapshot(id), items = srcItems(id), width = M.SCHEMAS[t.sheet].headers.length, msg = '';
    if (ch.type === 'deleteRows') {
      ch.rows.forEach(function (i) { var it = items[i]; if (!it) return; var k = it.e.data.indexOf(it.row); if (k >= 0) it.e.data.splice(k, 1); });
      msg = fmtN(ch.rows.length) + ' row' + (ch.rows.length === 1 ? '' : 's') + ' deleted';
    } else {
      var x = state.inputs[id], target = null, added = 0, changed = 0;
      var newRow = function () {
        if (!x) x = state.inputs[id] = { files: [], savedAt: melb() };
        target = target || x.files[x.files.length - 1];
        if (!target) { target = { name: 'Typed here', size: 0, tab: '', added: true, data: [], loadedAt: melb(), report: { headerRow: 2, found: width, total: width, missing: [], rows: 0 } }; x.files.push(target); }
        var r = new Array(width); for (var c = 0; c < width; c++) r[c] = ''; target.data.push(r); added++;
        return { e: target, row: r };
      };
      ch.cells.forEach(function (cell) {
        while (cell.i >= items.length) items.push(newRow());
        var it = items[cell.i], v = srcValue(t.sheet, cell.c, cell.v);
        if (String(it.row[cell.c] == null ? '' : it.row[cell.c]) === String(v)) return;
        it.row[cell.c] = v; (it.row.__ed = it.row.__ed || {})[cell.c] = 1; it.e.edited = true; changed++;
      });
      if (!changed && !added) return;
      msg = ch.cells.length === 1 ? 'Changed ' + ch.where + ' (' + M.SCHEMAS[t.sheet].headers[ch.cells[0].c] + ')' : (ch.paste ? 'Pasted at ' + ch.where + ': ' : '') + fmtN(changed) + ' cell' + (changed === 1 ? '' : 's') + ' changed';
      if (added) msg += ', ' + fmtN(added) + ' row' + (added === 1 ? '' : 's') + ' added';
    }
    var x2 = state.inputs[id];
    if (x2) { x2.files = x2.files.filter(function (e) { return e.data.length; }); x2.savedAt = melb(); if (!x2.files.length) delete state.inputs[id]; }
    (srcUndo[id] = srcUndo[id] || []).push(snap); if (srcUndo[id].length > 40) srcUndo[id].shift();
    srcCommit(t, msg + '. Saved in this browser — run the stages again to use it.', 'success');
  }
  function srcUndoLast(t) {
    var id = t.input, list = srcUndo[id] || [];
    if (state.busy || !list.length) return;
    srcRestore(id, list.pop());
    srcCommit(t, 'Undone. Saved in this browser.', 'info');
  }
  function srcCommit(t, note, type) {
    var id = t.input, def = inputDef(id);
    if (state.inputs[id]) refSave(id); else refDelete(id);
    state.rev++;
    invalidateResults(def.title + ' changed — run the stages again to use it.');
    renderAll();
    if (state.activeInput === id) showInput(id);
    wbShow(t.id, true);
    if (wb.grid) wb.grid.note(note, type);
    setGlobal(def.title + ': ' + note + ' ' + readinessText(), requiredReady() ? 'ready' : 'missing');
  }

  // ------------------------------------- Supplier Updates sheet (v1.2.0, editable)
  /* The IN_SUPPLIER_/_PRODUCT_UPDATES tab as a small spreadsheet, full width under the stages. Row 1 is the Sheet's
     totals bar (worked out here over the rows the search leaves visible, like the Sheet's SUBTOTAL formulas), then the
     16 headings and every supplier row from all loaded files. Click a cell to select it, type to change it, Ctrl+V
     pastes from that cell. INDEX is numbered automatically and STATUS is written by the merge, so those two columns are
     read-only. Rows typed or pasted below the last row go into an "Added rows" supplier entry. Every change updates the
     supplier input for this session and resets the stages; Undo goes back one change at a time. */
  var SUP_HEADS = M.SCHEMAS[SHEETS.SUP].headers;
  var SUP_NUM = { 7: 1, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1, 13: 1 };   // H–N: numbers when they look like numbers
  var SUP_TEXT = { 1: 1, 2: 1, 3: 1, 5: 1 };                       // B C D F stay text (codes keep leading zeros)
  // v1.4.0: every row is in the sheet (no pages). Only the rows near the scroll position are drawn, with gap rows above /
  // below standing in for the rest, so a large list scrolls as quickly as a short one.
  var SUP_BUF = 40, ADDED = 'Added rows', SUP_UNDO_MAX = 40;
  var supView = { q: '', undo: [], note: '', noteType: 'info', sel: null, vis: [], editing: null, rowH: 27, win: { start: 0, end: 0 }, raf: 0, brands: null, picked: [] };   // v1.16.0 picked rows

  function parseTsv(text) {
    var s = String(text || '').replace(/\r\n?/g, '\n'), rows = [], row = [], f = '', q = false, i = 0, n = s.length;
    while (i < n) {
      var ch = s.charAt(i);
      if (q) {
        if (ch === '"') {
          if (s.charAt(i + 1) === '"') { f += '"'; i += 2; continue; }
          var nx = s.charAt(i + 1);
          if (nx === '\t' || nx === '\n' || nx === '') { q = false; i++; continue; }
          f = '"' + f + '"'; q = false; i++; continue;        // "Organic" Oats — the quotes were part of the text
        }
        f += ch; i++; continue;
      }
      if (ch === '"' && f === '') { q = true; i++; continue; }
      if (ch === '\t') { row.push(f); f = ''; i++; continue; }
      if (ch === '\n') { row.push(f); rows.push(row); row = []; f = ''; i++; continue; }
      f += ch; i++;
    }
    if (q) f = '"' + f;
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    while (rows.length && !rows[rows.length - 1].some(function (c) { return String(c).trim() !== ''; })) rows.pop();
    return rows;
  }
  function supValue(c, v) {
    if (v === undefined || v === null) return '';
    if (typeof v !== 'string') return SUP_TEXT[c] ? String(v) : v;
    v = v.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim();
    if (SUP_NUM[c] && /^-?\$?\s?(\d{1,3}(,\d{3})+|\d+)?(\.\d+)?$/.test(v) && /\d/.test(v)) { var num = Number(v.replace(/[$,\s]/g, '')); if (isFinite(num)) return num; }
    return v;
  }
  function coerceSupRow(o) {
    for (var c = 0; c < 16; c++) o[c] = supValue(c, o[c]);
    o[0] = ''; o[15] = '';                                       // INDEX is renumbered, STATUS is written by the merge
    o.length = 16;
    return o;
  }
  function blankSupRow() { var o = new Array(16); for (var c = 0; c < 16; c++) o[c] = ''; return o; }
  // Do the pasted columns look like supplier rows? D = barcode, J / K = prices.
  function supRowsLookRight(rows) {
    if (!rows.length) return false;
    var bc = 0, ws = 0;
    rows.forEach(function (o) {
      var d = String(o[3] == null ? '' : o[3]).replace(/\s+/g, ''), j = o[9];
      if (!d || /^\d{6,14}$/.test(d)) bc++;
      if (j === '' || typeof j === 'number' || /^n\/?a$/i.test(String(j))) ws++;
    });
    return bc >= rows.length * 0.8 && ws >= rows.length * 0.8;
  }
  // v1.11.1 — the block column holding the barcodes: the leftmost whose filled cells are mostly 8–14 digits (or 9.3E+12),
  // filled in at least half the rows. -1 when there is none. Used to line a pasted block up so its barcodes land in D.
  function barcodeCol(rows) {
    var width = Math.max.apply(null, rows.map(function (r) { return r.length; }));
    for (var k = 0; k < Math.min(width, 16); k++) {
      var filled = 0, bc = 0;
      rows.forEach(function (r) {
        var v = String(r[k] == null ? '' : r[k]).replace(/\s+/g, ''); if (!v) return;
        filled++; if (/^\d{8,14}$/.test(v) || /^\d(\.\d+)?e\+1[0-3]$/i.test(v)) bc++;
      });
      if (filled && filled >= rows.length * 0.5 && bc >= filled * 0.8) return k;
    }
    return -1;
  }
  // A pasted block with no cell selected: headings (any order, row 1–8) are used when found; otherwise columns are
  // read by position: 16 columns = A–P, 14 or 15 = from B (POS SUPPLIER NAME), anything else from A when column 1 looks
  // like INDEX. The result is checked against the data (barcodes in D, prices in J).
  function mapPasted(rows) {
    var hr = M.findHeaderRow(rows, SUP_HEADS), out = { data: [], how: '', warn: [] };
    if (hr.row >= 0 && hr.score >= 3) {
      var mp = M.mapTable(rows, SHEETS.SUP);
      out.data = mp.data.map(function (r) { return coerceSupRow(r.slice()); });
      out.how = 'by heading (row ' + mp.report.headerRow + ')';
      var miss = inputDef('sup').need.filter(function (h) { return mp.report.missing.indexOf(h) >= 0; });
      if (miss.length) out.warn.push('no ' + miss.join(', ') + ' column — the merge needs ' + (miss.length === 1 ? 'it' : 'them'));
    } else {
      var width = Math.max.apply(null, rows.map(function (r) { return r.length; }));
      var idxLike = rows.filter(function (r) { return /^\d{1,6}$/.test(String(r[0]).trim()); }).length >= rows.length * 0.8;
      var start = width >= 16 ? 0 : (width === 14 || width === 15) ? 1 : (idxLike ? 0 : 1);
      var bk = barcodeCol(rows);                                 // v1.11.1: the barcodes go in D, whatever the width
      if (bk >= 0 && bk <= 3 && 3 - bk !== start) start = 3 - bk;
      out.data = rows.map(function (r) {
        var o = blankSupRow();
        for (var c = 0; c + start < 16 && c < r.length; c++) o[c + start] = r[c];
        return coerceSupRow(o);
      }).filter(function (o) { return o.slice(1, 15).some(function (v) { return String(v).trim() !== ''; }); });
      out.how = 'as columns ' + window.XlsxLite.colLetter(start + 1) + '–' + window.XlsxLite.colLetter(Math.min(16, start + width));
      if (!supRowsLookRight(out.data)) out.warn.push('column D does not look like barcodes or column J like W/S prices — click the first cell they belong in (e.g. B' + (supView.vis.length + 3) + ') and paste again, or Undo');
    }
    if (out.data.some(function (o) { return /e\+/i.test(String(o[3])); })) out.warn.push('some barcodes look like 9.3E+12 — format the barcode column as Number (0 decimals) or Text before copying');
    return out;
  }

  // ---- data: every supplier row in input order, with the file entry it belongs to
  function supEntries() { var x = state.inputs.sup; return (x && x.files) || []; }
  function addedEntry(create) {
    var list = supEntries();
    for (var i = 0; i < list.length; i++) if (list[i].added) return list[i];
    if (!create) return null;
    var e = { name: ADDED, size: 0, tab: '', added: true, data: [], loadedAt: melb(), report: { headerRow: 0, found: SUP_HEADS.length, total: SUP_HEADS.length, missing: [], rows: 0 } };
    if (!state.inputs.sup) state.inputs.sup = { files: [], savedAt: melb() };
    state.inputs.sup.files.push(e);
    return e;
  }
  // v1.6.0: after a run with a brand filter, the merge's IN_SUPPLIER rows are only the rows of those brands (in order);
  // the other rows show without a STATUS and greyed (out = not in that merge).
  function supModel() {
    var refs = [];
    supEntries().forEach(function (e) { e.data.forEach(function (row) { refs.push({ e: e, row: row }); }); });
    var res = state.results[SHEETS.SUP], scope = null;
    if (state.resultScope) { scope = {}; state.resultScope.forEach(function (b) { scope[b] = 1; }); }
    var nIn = scope ? refs.filter(function (ref) { return scope[supBrandOf(ref.row)]; }).length : refs.length;
    var run = !!(res && res.length > 2 && res.length - 2 === nIn), k = 0;
    var items = refs.map(function (ref, i) {
      var inS = !scope || !!scope[supBrandOf(ref.row)];
      return { ref: ref, n: i + 1, shown: run && inS ? res[(k++) + 2] : ref.row, out: run && !inS };
    });
    return { items: items, run: run, summary: run ? String((res[0] || [])[15] || '').trim() : '' };
  }
  function supBrandList() {
    var c = {}, list = [];
    supEntries().forEach(function (e) { e.data.forEach(function (row) { var b = supBrandOf(row); if (!(b in c)) { c[b] = 0; list.push(b); } c[b]++; }); });
    list.sort();
    return list.map(function (b) { return { v: b, n: c[b] }; });
  }
  function supShown(it, c) {
    if (c === 0) return String(it.n);
    if (c === 15) return it.shown === it.ref.row ? '' : String(it.shown[15] == null ? '' : it.shown[15]);
    var v = it.shown[c];
    if (v === null || v === undefined) return '';
    return typeof v === 'number' && (c === 8 || c === 9 || c === 10 || c === 13) ? String(Math.round(v * 10000) / 10000) : String(v);
  }

  // ---- changes: one undo snapshot per change, then the input / stages / rail / sheet refresh together
  function supSnapshot() {
    var x = state.inputs.sup;
    if (!x) return null;
    return x.files.map(function (e) {
      return { e: e, data: e.data.map(function (row) { var a = row.slice(); if (row.__ed) a.__ed = Object.assign({}, row.__ed); return a; }) };
    });
  }
  function supRestore(snap) {
    if (!snap || !snap.length) { delete state.inputs.sup; return; }
    snap.forEach(function (s) { s.e.data = s.data; });
    state.inputs.sup = state.inputs.sup || { files: [], savedAt: melb() };
    state.inputs.sup.files = snap.map(function (s) { return s.e; });
  }
  function supCommit(msg, type) {
    var x = state.inputs.sup;
    if (x) { x.files = x.files.filter(function (e) { return e.data.length; }); if (!x.files.length) delete state.inputs.sup; else x.savedAt = melb(); }
    state.rev++;
    invalidateResults('Supplier rows changed — run the stages again.');
    renderAll();
    if (state.activeInput === 'sup') showInput('sup');
    if (msg !== undefined) { supView.note = msg; supView.noteType = type || 'info'; }
    drawSup();
  }
  function supMutate(fn) {
    if (state.busy) { supSay('A stage is running — try again when it finishes.', 'warn'); return false; }
    var snap = supSnapshot(), res = fn();
    if (!res) return false;
    supView.undo.push(snap); if (supView.undo.length > SUP_UNDO_MAX) supView.undo.shift();
    supCommit(res.msg, res.type);
    return true;
  }
  // v1.8.0: added = the row was pasted or typed on this page. Filling an empty cell of such a row is how it arrives, so it
  // is not marked; a value changed after it arrived is (2 = marked by v1.8.0 — older marks on added rows are not shown).
  function setSupCell(row, c, raw, added) {
    if (c <= 0 || c >= 15) return false;
    var v = supValue(c, raw), was = String(row[c] == null ? '' : row[c]);
    if (was === String(v)) return false;
    row[c] = v;
    if (!(added && was === '')) { row.__ed = row.__ed || {}; row.__ed[c] = 2; }
    return true;
  }

  // ---- paste: at the selected cell (like Google Sheets), or by heading / position when nothing is selected
  function pasteToSupplier(text) {
    if (state.busy) { supSay('A stage is running — paste again when it finishes.', 'warn'); return; }
    var rows = parseTsv(text);
    if (!rows.length || !rows.some(function (r) { return r.some(function (c) { return String(c).trim() !== ''; }); })) { supSay('Nothing to paste — copy the cells in Excel or Google Sheets first.', 'warn'); return; }
    var hr = M.findHeaderRow(rows, SUP_HEADS), sel = supView.sel;
    if (sel && !(hr.row >= 0 && hr.score >= 3)) { pasteAtCell(rows, sel); return; }
    var m;
    try { m = mapPasted(rows); } catch (e) { supSay('Could not read the pasted rows: ' + e.message, 'error'); return; }
    if (!m.data.length) { supSay('The pasted block has no supplier rows (only headings or blank rows).', 'warn'); return; }
    var startRow = supModel().items.length;
    supMutate(function () {
      var e = addedEntry(true);
      m.data.forEach(function (o) { e.data.push(o); });
      return { msg: fmtN(m.data.length) + ' row' + (m.data.length === 1 ? '' : 's') + ' added ' + m.how + '.' + (m.warn.length ? ' Check: ' + m.warn.join(' · ') + '.' : ''), type: m.warn.length ? 'warn' : 'success' };
    });
    supGoTo(startRow, 1);
    setGlobal('Supplier Updates: ' + fmtN(m.data.length) + ' row' + (m.data.length === 1 ? '' : 's') + ' added — ' + fmtN(rowsOf('sup').length) + ' supplier rows in total. ' + readinessText(), m.warn.length ? 'missing' : 'success');
  }
  function pasteAtCell(rows, sel) {
    var r0 = Math.min(sel.r, sel.r2), c0 = Math.max(1, Math.min(sel.c, sel.c2)), vis = supView.vis;
    // A 16-column block (A–P, INDEX first) pasted at column A or B keeps its columns: INDEX is skipped.
    var width = Math.max.apply(null, rows.map(function (r) { return r.length; }));
    var skipFirst = width >= 16 && c0 <= 1;
    // v1.11.1: a row-shaped block (6+ columns) pasted at B, C or D is lined up so its barcodes land in D — a block copied
    // from POS SUPPLIER NUMBER onwards and pasted at B3 used to go one column to the left (nothing could match).
    var moved = '', noBc = false;
    if (width >= 6 && c0 <= 3) {
      var bk = barcodeCol(skipFirst ? rows.map(function (r) { return r.slice(1); }) : rows);
      if (bk >= 0 && bk <= 2 && 3 - bk !== c0) { moved = window.XlsxLite.colLetter(c0 + 1); c0 = 3 - bk; }
      else if (bk === 3 && !skipFirst) { moved = window.XlsxLite.colLetter(c0 + 1); skipFirst = true; c0 = 1; }   // INDEX first
      else if (bk < 0 && rows.length >= 3) noBc = true;
    }
    supMutate(function () {
      var added = 0, changed = 0, cut = 0;
      for (var i = 0; i < rows.length; i++) {
        var cells = skipFirst ? rows[i].slice(1) : rows[i];
        if (!cells.some(function (v) { return String(v).trim() !== ''; }) && !vis[r0 + i]) continue;
        var target = vis[r0 + i] ? vis[r0 + i].ref.row : null, here = !!(vis[r0 + i] && vis[r0 + i].ref.e.added);
        if (!target) { target = blankSupRow(); addedEntry(true).data.push(target); added++; here = true; }
        for (var j = 0; j < cells.length; j++) {
          var c = c0 + j;
          if (c >= 15) { if (String(cells[j]).trim() !== '' && c > 15) cut++; continue; }
          if (setSupCell(target, c, cells[j], here)) changed++;
        }
      }
      if (!changed && !added) return null;
      var where = SUP_HEADS[c0] ? window.XlsxLite.colLetter(c0 + 1) + (r0 + 3) : '';
      return { msg: 'Pasted at ' + where + (moved ? ' (not ' + moved + (r0 + 3) + ' — lined up so the barcodes are in D)' : '') + ': ' + fmtN(changed) + ' cell' + (changed === 1 ? '' : 's') + ' changed' + (added ? ', ' + fmtN(added) + ' row' + (added === 1 ? '' : 's') + ' added' : '') + '.' + (cut ? ' ' + fmtN(cut) + ' value(s) past column O were left out (STATUS is written by the merge).' : '') +
        (noBc ? ' Check: no column of barcodes was found — D must hold the barcodes or nothing can match (Undo, then paste from the right cell).' : ''), type: cut || noBc || moved ? 'warn' : 'success' };
    });
    supView.sel = { r: r0, c: c0, r2: r0 + rows.length - 1, c2: Math.min(14, c0 + Math.max.apply(null, rows.map(function (r) { return r.length; })) - 1 - (skipFirst ? 1 : 0)) };
    paintSel();
  }

  function supSay(msg, type) {
    supView.note = msg || ''; supView.noteType = type || 'info';
    // v1.8.0: one line in the title band (wraps to a second line when long; the full text is on hover).
    var el = $('#supNote'); if (!el) return;
    el.className = 'sup-msg is-' + supView.noteType; el.textContent = supView.note; el.title = supView.note; el.hidden = !supView.note;
  }
  function supStatusClass(v) {
    var s = String(v || '').toUpperCase();
    return !s ? '' : /UNMATCHABLE/.test(s) ? 'st-unm' : /NOT USED/.test(s) ? 'st-notused' : /MATCHED/.test(s) ? 'st-match' : /NEW/.test(s) ? 'st-new' : '';
  }
  function supTotals(items) {
    var st = function (it) { return supShown(it, 15).toUpperCase(); };
    var cnt = function (re) { var n = 0; items.forEach(function (it) { if (re.test(st(it))) n++; }); return n; };
    var uniq = function (c) { var s = {}, n = 0; items.forEach(function (it) { var v = supShown(it, c).trim(); if (v && !s[v]) { s[v] = 1; n++; } }); return n; };
    var sum = function (c) { return items.reduce(function (a, it) { var v = Number(supShown(it, c).replace(/[$,\s]/g, '')); return a + (isFinite(v) && v > 0 ? v : 0); }, 0); };
    return { total: items.length, matched: cnt(/BEST BUY.*MATCHED|^MATCHED$/), newp: cnt(/BEST BUY.*NEW|^NEW/), notUsed: cnt(/NOT USED/), unm: cnt(/UNMATCHABLE/),
      names: uniq(1), suppliers: uniq(2), barcodes: uniq(3), brands: uniq(4), ws: sum(9), rrp: sum(10) };
  }
  function money(n) { return '$' + Number(n || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  // v1.8.0 — row 1 of the supplier sheet, column by column as the Google Sheet has it: { l: label, v: value, tip } or, in
  // P (STATUS), { st: true, lines: [...] }; null = an empty cell.
  function supTotCells(t, model, stat) {
    var cells = SUP_HEADS.map(function () { return null; });
    var c = function (i, l, v, tip) { cells[i] = { l: l, v: v, tip: tip || '' }; };
    c(0, 'TOTAL', fmtN(t.total), 'Supplier rows' + (model.run ? ' — ⭐ matched ' + fmtN(t.matched) + ' · 🟢 new ' + fmtN(t.newp) + ' · 🚫 not used ' + fmtN(t.notUsed) + ' · ⚠️ unmatchable ' + fmtN(t.unm) : ''));
    c(1, 'SUPPLIER NAMES', fmtN(t.names));
    c(2, 'POS SUPPLIERS', fmtN(t.suppliers), 'Total POS suppliers');
    c(3, 'BARCODES', fmtN(t.barcodes), 'Unique barcodes in column D (SUP BARCODE). In the Google Sheet this cell may be labelled UNIQUE BRANDS from an older layout — it counts barcodes.');
    c(4, 'BRANDS', fmtN(t.brands), 'Unique brands');
    c(9, 'TOTAL WS', money(t.ws));
    c(10, 'TOTAL RRP', money(t.rrp));
    var blank = Math.max(0, t.total - t.matched - t.newp - t.notUsed - t.unm);
    cells[15] = { st: true, tip: stat, lines: model.run
      ? ['Matched ' + fmtN(t.matched) + ' · New ' + fmtN(t.newp), 'Not used ' + fmtN(t.notUsed) + ' · Unmatchable ' + fmtN(t.unm) + (blank ? ' · Blank ' + fmtN(blank) : '')]
      : [model.items.length ? 'STATUS — set by stage 1' : 'No supplier rows yet'] };
    return cells;
  }
  // v1.8.0 — prices (J SUP WS EXGST, K SUP RRP INC GST, N SUP DISCOUNT PRICE) show 2 decimals; the cell keeps its value.
  var SUP_DP2 = { 9: 1, 10: 1, 13: 1 };
  function supCellText(it, c) {
    var s = supShown(it, c);
    if (!SUP_DP2[c] || s === '') return s;
    var t = s.trim(), n = Number(t.replace(/[$,\s]/g, ''));
    return /^\$?\s*-?[\d,]*\.?\d+$/.test(t) && isFinite(n) ? n.toFixed(2) : s;
  }
  // v1.3.1 — the brands this merge covers (SUP BRAND, column E, of every supplier row). Stage 2 matches, updates and
  // discontinues POS products of these brands only, so this is the check before running.
  function supScopeHtml(model) {
    var counts = {}, list = [], added = 0, sel = null;
    if (supView.brands) { sel = {}; supView.brands.forEach(function (b) { sel[b] = 1; }); }
    model.items.forEach(function (it) {
      var raw = supBrandOf(it.ref.row);
      if (sel && !sel[raw]) return;
      var b = raw || '(NO BRAND)';
      if (!counts[b]) { counts[b] = 0; list.push(b); }
      counts[b]++;
      if (it.ref.e.added) added++;
    });
    if (!model.items.length) return '<span class="sup-scope-label">Brands in this merge: 0</span><span class="sup-scope-note">Paste or drop the supplier rows for the brands you are updating — the merge matches, updates and discontinues only those brands.</span>';
    list.sort();
    var chip = function (b) { return '<span class="sup-brand">' + esc(b) + ' <b>' + fmtN(counts[b]) + '</b></span>'; };
    var SHOW = 10, inRows = list.reduce(function (a, b) { return a + counts[b]; }, 0), files = inRows - added, allB = supBrandList().length;
    var rows = fmtN(inRows) + ' row' + (inRows === 1 ? '' : 's') + (added && files ? ' (' + fmtN(added) + ' added here · ' + fmtN(files) + ' from files)' : added ? ' added here' : ' from files');
    return '<span class="sup-scope-label">Brands in this merge: ' + fmtN(list.length) + (sel ? ' of ' + fmtN(allB) : '') + '</span>' +
      (sel ? '<span class="sup-scope-filter">SUP BRAND filter on — only these brands are merged <button type="button" class="btn small" data-sup-unfilter>Clear filter</button></span>' : '') +
      '<span class="sup-scope-rows">' + rows + '</span>' +
      '<span class="sup-brand-list">' + list.slice(0, SHOW).map(chip).join('') + '</span>' +   // v1.7.2: one line, fades out
      (list.length > SHOW ? '<details class="sup-scope-more"><summary>+' + fmtN(list.length - SHOW) + ' more</summary><div>' + list.slice(SHOW).map(chip).join('') + '</div></details>' : '');
  }
  // v1.6.0 — the Update in POS ticks and the Discontinue switch (under the supplier sheet's brand line).
  function supOptsHtml() {
    var off = keptGroups();
    // v1.7.2: one short line in the toolbar; the full explanation is on hover.
    var tip = 'Every ticked column heading is updated in POS. Untick one (e.g. SUP RRP INC GST) and POS keeps its current value for matched products — RRP and price levels exactly as they are, so no new labels.';
    return '<span class="sup-opts-main" title="' + esc(tip) + '"><span class="sup-scope-label">Update in POS</span>' +
      (off.length ? '<span class="sup-opts-kept">' + optsKeptText(off) + '</span> <button type="button" class="btn small" data-keep-all>Update everything</button>'
        : '<span class="sup-scope-note">every ticked heading</span>') +
      '</span><label class="sup-disc' + (state.opts.discontinue ? '' : ' is-off') + '" title="Discontinue POS products of these brands that are not in the supplier rows"><input type="checkbox" id="supDiscontinue"' + (state.opts.discontinue ? ' checked' : '') + '> Discontinue missing products</label>';
  }
  // v1.11.0: "keeping POS’s RRP …" for the keep ticks, "not using discount price" for M / N.
  function optsKeptText(off) {
    var k = off.filter(function (g) { return !g.use; }), u = off.filter(function (g) { return g.use; });
    return (k.length ? 'keeping POS’s <b>' + esc(k.map(function (g) { return g.what; }).join(', ')) + '</b>' : '') +
      (u.length ? (k.length ? ' · ' : '') + 'not using <b>' + esc(u.map(function (g) { return g.what; }).join(', ')) + '</b>' : '');
  }
  function setKeep(id, keep) {
    if (state.busy) return;
    var was = !!state.opts.keep[id];
    if (keep) state.opts.keep[id] = true; else delete state.opts.keep[id];
    // v1.11.0: N (discount price) changes what the merge itself works out, so the stages run again with it on / off.
    if (id === 'disc' && was !== !!keep) { state.rev++; invalidateResults('SUP DISCOUNT PRICE (N) turned ' + (keep ? 'off' : 'on') + ' — run the stages again.'); renderAll(); }
    optsChanged();
  }
  function optsChanged() {
    if ((state.stage.export || {}).status === 'done') { state.edits.optsAfter3 = true; stageMsg('export', 'Update in POS / Discontinue options changed — run stage 3 again to use them.', 'ready'); }
    drawSup(); renderScopes(); renderOutputs(); renderOutActions();
    // v1.6.1: OUT_MERGED_DATA shows POS's values in the kept columns, so it is drawn again (and the review workbook made again).
    if (state.review && state.results[SHEETS.OUT]) { renderReview(true); scheduleWorkbook(); }
    saveSessionSoon();
  }
  function setSupBrands(list) {
    if (state.busy) return;
    supView.brands = list && list.length ? list : null;
    supView.sel = null;
    var w = $('#supWrap'); if (w) w.scrollTop = 0;
    drawSup(); renderScopes();
    saveSessionSoon(true);
    var stale = STAGES.some(function (s2) { return (state.stage[s2.id] || {}).status === 'done'; }) && supScopeKey() !== state.loadedScope;
    setGlobal(supView.brands ? 'SUP BRAND filter: ' + fmtN(supView.brands.length) + ' brand' + (supView.brands.length === 1 ? '' : 's') + ' — the next run merges only ' + (supView.brands.length === 1 ? 'it' : 'them') + (stale ? ' (run the stages again)' : '') + '.' : 'SUP BRAND filter cleared — the next run merges every brand in Supplier Updates' + (stale ? ' (run the stages again)' : '') + '.', 'info');
  }

  // v1.3.1 — CH2 / Unique supplier imports saved by Build Master Databases are added only when asked (buttons on the
  // sheet and on the Supplier Updates card): a whole catalogue widens the merge to every brand in it.
  var libSupRecs = {};
  function libSupRefresh() {
    if (!LIB) return Promise.resolve();
    return LIB.list().then(function (all) {
      libSupRecs = {};
      (all || []).forEach(function (r) { if (LIB_SUP.indexOf(r.kind) >= 0) libSupRecs[r.kind] = r; });
      drawLibSup();
    }).catch(function (e) { console.warn('Library list failed', e); });
  }
  function libSupAdded(kind) { var r = libSupRecs[kind]; return supEntries().some(function (f) { return f.libKind === kind && (!r || f.libSavedAt === r.savedAt); }); }
  function libSupButtonsHtml() {
    var ks = LIB ? LIB_SUP.filter(function (k) { return libSupRecs[k]; }) : [];
    if (!ks.length) return '';
    return '<span class="sup-lib-label">From the Library</span>' + ks.map(function (k) {
      var r = libSupRecs[k], on = libSupAdded(k), stale = LIB.isStale(r), rows = String(r.meta || '').split(' · ')[0];
      return '<button type="button" class="btn small sup-lib-add' + (on ? ' is-added' : '') + (stale ? ' is-stale' : '') + '" data-lib-add="' + k + '"' + (on ? ' disabled' : '') +
        ' title="' + esc(r.name + (r.meta ? ' · ' + r.meta : '') + ' — adds every brand in this file to the merge') + '">' + (on ? '✓ ' : '+ Add ') + esc(LIB.info(k).label) + (on ? ' added' : '') +
        '<small>' + esc((/rows/.test(rows) ? rows + ' · ' : '') + 'built ' + LIB.when(r) + ' (' + LIB.ago(r) + ')' + (stale ? ' — check it is the latest' : '')) + '</small></button>';
    }).join('');
  }
  function drawLibSup() {
    var html = libSupButtonsHtml();
    document.querySelectorAll('[data-lib-sup-host]').forEach(function (h) { h.innerHTML = html; h.hidden = !html; });
    document.querySelectorAll('[data-lib-add]').forEach(function (b) { b.onclick = function () { libSupAdd(b.dataset.libAdd); }; });
  }
  function libSupAdd(kind) {
    if (!LIB || state.busy) return Promise.resolve(false);
    var label = LIB.info(kind).label;
    setGlobal('Adding the ' + label + ' from the Library…', 'running');
    return LIB.get(kind).then(function (rec) {
      if (!rec || !rec.blob) throw new Error('it is no longer in the Library.');
      var file = LIB.toFile(rec);
      return readWorkbook(file).then(function (sheets) {
        var best = mapForInput('sup', sheets), entry = fileEntry(file, best.tab, best.mapped);
        entry.libKind = kind; entry.libSavedAt = rec.savedAt; entry.libWhen = LIB.when(rec);
        addToInput('sup', entry);
        renderAll(); if (state.activeInput === 'sup') showInput('sup');
        setGlobal(label + ' added from the Library — ' + fmtN(entry.data.length) + ' rows. ' + readinessText(), requiredReady() ? 'ready' : 'missing');
        return true;
      });
    }).catch(function (e) { setGlobal('The ' + label + ' could not be added: ' + e.message, 'error'); return false; });
  }

  // v1.7.0 / v1.7.1 — the sheet fits the page width (no sideways scroll) and every column is as wide as what it holds:
  // supFit() measures the headings (longest word, the Update in POS tick) and the rows on show (a sample of up to ~900,
  // INDEX with its + tag, STATUS in its bold italic), gives each column its content width, and shares any room left in
  // proportion. When the content is wider than the window, the text steps down a size; then SUP PRODUCT, STATUS, POS
  // SUPPLIER NAME and SUP BRAND give way first (down to a floor) — numbers, barcodes and IDs keep their full width.
  var SUP_SIZES = [[11.5, 10, 6], [10.5, 9, 5], [10, 8.5, 4], [9.5, 8, 3], [9, 7.5, 2]];   // [cell px, heading px, side padding px]
  var SUP_GIVE = { 6: 26, 15: 12, 1: 10, 4: 9 };        // columns that give way → their floor in characters
  // the order they give way in, [column, down to characters]: SUP PRODUCT to 34, the names, SUP PRODUCT to its floor,
  // STATUS, SUP BRAND to its floor
  var SUP_GIVE_ORDER = [[6, 34], [1, 10], [4, 14], [6, 26], [15, 12], [4, 9]];
  var SUP_CAP = { 6: 760 };                               // widest a column grows for its content (px); others 320
  var SUP_SPARE = { 6: 0.8, 15: 0.08, 1: 0.06, 4: 0.06 }; // v1.7.2: who gets the room left over
  var supCanvas = null, supFitFor = '';
  function supColsHtml() { return '<colgroup>' + SUP_HEADS.map(function () { return '<col>'; }).join('') + '</colgroup>'; }
  function supTextW(font, t) { if (!supCanvas) supCanvas = document.createElement('canvas').getContext('2d'); if (supCanvas.font !== font) supCanvas.font = font; return supCanvas.measureText(t).width; }
  function supSample(vis) {
    if (vis.length <= 900) return vis;
    var out = vis.slice(0, 300), step = (vis.length - 300) / 600;
    for (var k = 0; k < 600; k++) out.push(vis[300 + Math.floor(k * step)]);
    return out;
  }
  function supClip() { var bl = document.querySelector('#supScope .sup-brand-list'); if (bl) bl.classList.toggle('is-clipped', bl.scrollWidth > bl.clientWidth + 1); }
  function supFit() {
    supClip();                                                                     // v1.7.2: the brand line fades only when cut
    var wrap = $('#supWrap'), tbl = $('#supTable'); if (!wrap || !tbl) return;
    var W = wrap.clientWidth; if (W < 200) return;                               // hidden — fitted when it is shown
    var vis = supView.vis || [], fam = getComputedStyle(tbl).fontFamily || 'sans-serif';
    var tot = supView.tot || [];
    var key = [W, fam, vis.length, vis.length ? vis[0].n + ':' + vis[vis.length - 1].n : '', state.rev, supView.undo.length, (vis[0] && vis[0].shown !== vis[0].ref.row) ? 1 : 0,
      tot.map(function (x) { return x ? (x.st ? x.lines.join('/') : x.v) : ''; }).join('|')].join('|');
    if (key === supFitFor) return;
    // the longest text of each column on show (as characters, measured per font below)
    // The text each column has to show: INDEX the highest number on show; numbers, barcodes and IDs every value that
    // looks like one (so a $144.66 among $35s is never cut); everything else the length almost every row fits in (98.5% of
    // the sample, all rows when there are under 100) — a stray long value (CH2's "Log in to ParagonCare Direct to view
    // pricing" in the price columns) ends in … with the full text on hover instead of widening the column.
    var rows = supSample(vis), longest = SUP_HEADS.map(function () { return []; }), maxN = 0;
    vis.forEach(function (it) { if (it.n > maxN) maxN = it.n; });
    var texts = SUP_HEADS.map(function () { return []; }), exact = SUP_HEADS.map(function () { return []; });
    var NUMLIKE = /^[\s$-]*[\d.,]+%?$/, CODE = { 3: 1, 5: 1 };
    rows.forEach(function (it) {
      for (var c = 1; c < SUP_HEADS.length; c++) {
        var t = supCellText(it, c); if (!t) continue;
        texts[c].push(t);
        if (NUMLIKE.test(t) || (CODE[c] && t.length <= 16)) exact[c].push(t);
      }
    });
    var top = function (arr, n) { var by = arr.slice().sort(function (x, y) { return y.length - x.length; }); return by.slice(0, n); };
    for (var c0 = 1; c0 < SUP_HEADS.length; c0++) {
      var tx = texts[c0]; if (!tx.length) continue;
      var lens = tx.map(function (t) { return t.length; }).sort(function (x, y) { return y - x; });
      var L = rows.length < 100 ? lens[0] : lens[Math.floor(lens.length * 0.015)];
      longest[c0] = tx.filter(function (t) { return t.length <= L && t.length >= L - 2; }).slice(0, 40).concat(top(exact[c0], 12));
    }
    if (maxN) longest[0] = [String(maxN).replace(/\d/g, '8')];
    var pick = null;
    // v1.7.2: headings take 2 lines; when the content does not fit, empty columns take 3, then (smaller text) every column.
    var tries = [];
    SUP_SIZES.forEach(function (sz, k) { tries.push([k, 'two']); tries.push([k, 'empty3']); if (k >= 2) tries.push([k, 'all3']); });
    var headMin = function (hf, hfs, words, lines) {
      var lw = function (ws) { var t = ws.join(' '); return supTextW(hf, t) + t.length * hfs * 0.04; }, best = lw(words);
      for (var i = 1; i < words.length; i++) {
        best = Math.min(best, Math.max(lw(words.slice(0, i)), lw(words.slice(i))));
        if (lines > 2) for (var j = i + 1; j < words.length; j++) best = Math.min(best, Math.max(lw(words.slice(0, i)), lw(words.slice(i, j)), lw(words.slice(j))));
      }
      return best;
    };
    var results = [];
    for (var tr = 0; tr < tries.length; tr++) {
      var k = tries[tr][0], mode = tries[tr][1];
      var fs = SUP_SIZES[k][0], hfs = SUP_SIZES[k][1], pad = SUP_SIZES[k][2], cell = fs + 'px ' + fam;
      var ct = supTextW(cell, 'METAGENICS OBORNE CH2 BEST BUY') / 30;
      var mins = [], wants = [], floors = [];
      for (var c = 0; c < SUP_HEADS.length; c++) {
        var lines = mode === 'all3' || (mode === 'empty3' && !longest[c].length) ? 3 : 2;
        var hw = headMin('800 ' + hfs + 'px ' + fam, hfs, String(SUP_HEADS[c]).split(/\s+/), lines);
        if (KEEP_GROUPS.some(function (g) { return g.col === c || (g.cols || []).indexOf(c) >= 0; })) hw = Math.max(hw, 16);      // the tick
        var cw = 0;
        // H–O show tabular figures (every digit as wide as 0), so their digits are measured as 0s; 3px to spare.
        longest[c].forEach(function (t) { cw = Math.max(cw, supTextW((c === 15 ? 'italic 700 ' : '') + cell, c >= 7 && c <= 14 ? t.replace(/\d/g, '0') : t) + 3); });
        if (c === 0) cw += 20;                                                                   // v1.16.0: the row tick box
        // v1.8.0: row 1 (totals) — the value on one line must fit (its digits as 0s); the label may wrap at a word.
        var x = tot[c], tmin = 0, twant = 0;
        if (x && x.st) x.lines.forEach(function (l) { twant = Math.max(twant, supTextW('700 ' + (hfs + 0.5) + 'px ' + fam, l) + 3); });
        else if (x) {
          var lab = function (s) { return supTextW('800 ' + (hfs - 1) + 'px ' + fam, s) + s.length * (hfs - 1) * 0.05; };
          var vw = supTextW('700 ' + (fs + 0.5) + 'px ' + fam, x.v.replace(/\d/g, '0')) + 3;
          tmin = Math.max(vw, Math.max.apply(null, x.l.split(/\s+/).map(lab)));
          twant = Math.max(vw, lab(x.l));
        }
        var min = Math.ceil(Math.max(hw, tmin) + 2 * pad + 2), want = Math.ceil(Math.max(hw, twant, Math.min(cw, SUP_CAP[c] || 320)) + 2 * pad + 2);
        mins.push(min); wants.push(want);
        floors.push(SUP_GIVE[c] ? Math.min(want, Math.max(min, Math.ceil(SUP_GIVE[c] * ct + 2 * pad + 2))) : want);
      }
      var sumW = wants.reduce(function (a, b) { return a + b; }, 0), sumF = floors.reduce(function (a, b) { return a + b; }, 0);
      // comfortable = SUP PRODUCT keeps 40 characters (more if it has room) and every other column its content
      var sumC = sumW - wants[6] + Math.min(wants[6], Math.ceil(40 * ct + 2 * pad + 2));
      results.push({ k: k, mode: mode, fs: fs, hfs: hfs, pad: pad, ct: ct, wants: wants, floors: floors, sumW: sumW, sumF: sumF, sumC: sumC });
    }
    // the full size or one step down when that keeps SUP PRODUCT comfortable; otherwise the largest text that fits once
    // text columns give way (3-line headings on empty columns first); otherwise the smallest, scaled down
    var find = function (fn) { for (var i = 0; i < results.length; i++) if (fn(results[i])) return results[i]; return null; };
    pick = find(function (r) { return r.k <= 1 && r.mode !== 'all3' && r.sumC <= W; }) ||
      find(function (r) { return r.k === 0 && r.mode === 'empty3' && r.sumF <= W; }) ||
      find(function (r) { return r.sumF <= W; }) || results[results.length - 1];
    var widths, tight = false;
    if (pick.sumW <= W) {                                                          // v1.7.2: room to spare → SUP PRODUCT
      var spareW = W - pick.sumW, shareTot = 0;                                    // mostly, a little to STATUS / names
      Object.keys(SUP_SPARE).forEach(function (k) { shareTot += SUP_SPARE[k]; });
      widths = pick.wants.map(function (w, i) { return Math.floor(w + spareW * (SUP_SPARE[i] || 0) / shareTot); });
    } else if (pick.sumF <= W) {                                                   // text columns give way toward their floors,
      var give = pick.sumW - W;                                                    // SUP PRODUCT first, then the names, STATUS last
      widths = pick.wants.slice();
      SUP_GIVE_ORDER.forEach(function (st) {
        var c = st[0], to = Math.max(pick.floors[c], Math.ceil(st[1] * pick.ct + 2 * pick.pad + 2)), g = Math.max(0, Math.min(give, widths[c] - to));
        widths[c] -= g; give -= g;
      });
      widths = widths.map(Math.floor);
    } else {                                                                       // narrower than every floor: scale down
      tight = true;
      widths = pick.floors.map(function (w) { return Math.floor(w * W / pick.sumF); });
    }
    widths[6] += W - widths.reduce(function (a, b) { return a + b; }, 0);         // rounding → SUP PRODUCT
    tbl.style.setProperty('--sup-fs', pick.fs + 'px'); tbl.style.setProperty('--sup-hfs', pick.hfs + 'px'); tbl.style.setProperty('--sup-pad', pick.pad + 'px');
    tbl.classList.toggle('is-tight', tight);
    var cols = tbl.querySelectorAll('col');
    for (var i = 0; i < cols.length; i++) cols[i].style.width = widths[i] + 'px';
    // headings: every label centred in one band as tall as the tallest label, the ticks on one line under it
    tbl.style.setProperty('--sup-hlh', '0px');
    var hh = 0; tbl.querySelectorAll('thead .sup-hl').forEach(function (el) { hh = Math.max(hh, el.offsetHeight); });
    tbl.style.setProperty('--sup-hlh', hh + 'px');
    supFitFor = key;
  }
  function supSheetHtml() {
    return '<div class="sup-sheet" id="supSheet" tabindex="0" aria-label="IN_SUPPLIER_/_PRODUCT_UPDATES sheet">' +
      // v1.8.0: the title band (title · the latest message on one line · rows), one scope line (brands · Library), one
      // toolbar (search · edit buttons · Update in POS · Discontinue), then the sheet with its totals in row 1.
      '<div class="sup-head"><div class="sup-title"><h3>IN_SUPPLIER_/_PRODUCT_UPDATES <span class="sup-info" tabindex="0" title="The Supplier Updates tab as the Google Sheet shows it. Click a cell and type to change it · Ctrl+V (⌘V) pastes from the selected cell · click an INDEX number to select rows · Ctrl+Z undoes. The tick in a heading = that column updates POS for matched products." aria-label="About this sheet">i</span></h3></div>' +
      '<div class="sup-msg" id="supNote" role="status" hidden></div><span class="result-badge" id="supCount">0 ROWS</span></div>' +
      '<div class="sup-scope"><div class="sup-scope-brands" id="supScope"></div><div class="sup-scope-lib" data-lib-sup-host hidden></div></div>' +
      // v1.11.0: one wide search / add bar, started with the supplier (name | number | ) — type over it; Add 5 rows,
      // Clear empty rows.
      '<div class="sup-tools"><div class="sup-find"><span class="sup-find-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input type="text" id="supSearch" spellcheck="false" autocomplete="off" placeholder="Search this sheet…" aria-label="Search this sheet"><button type="button" class="sup-find-clear" id="supSearchClear" aria-label="Clear" hidden>✕</button></span>' +
      '</div>' +   // v1.16.0: a plain search bar (the type-a-row Add is gone)
      // v1.17.0: Paste first, Undo straight after; the rest keep their order; Clear added rows renamed Clear Sheet.
      '<button type="button" class="btn small primary" id="supPasteBtn" title="Paste the clipboard at the selected cell (or add the rows at the end when no cell is selected)">Paste</button>' +
      '<button type="button" class="btn small" id="supUndo" title="Undo the last change (Ctrl+Z)">Undo</button>' +
      '<button type="button" class="btn small" id="supAdd5" title="Add 5 empty rows at the end — type in them, paste, or fill down (drag the corner of a cell, or Ctrl+D)">Add 5 rows</button>' +
      '<button type="button" class="btn small" id="supClearEmpty" title="Remove every row with nothing from D (barcode) to O — the supplier name / number alone does not count">Clean up empty rows</button>' +
      '<button type="button" class="btn small" id="supDelRows" title="Delete the ticked rows (or the selected rows: click an INDEX number, Shift+click another to select several)">Delete rows</button>' +
      '<button type="button" class="btn small" id="supClearAdded" title="Clear every row typed or pasted into this sheet (dropped supplier files and saved library files stay). You will be asked to confirm.">Clear Sheet</button>' +
      '<button type="button" class="btn small" id="supCopyHeads" title="Copy the 16 headings, ready to paste into Excel or Google Sheets as a template">Copy headings</button>' +
      '<div class="sup-opts" id="supOpts"></div></div>' +
      // v1.7.2: heading rows like the other workbook tabs — the column letters (grey, with the SUP BRAND filter), v1.8.0 the
      // totals (row 1 of the Google Sheet, navy), then each heading centred on up to two lines with its Update in POS tick.
      '<div class="sup-table-wrap" id="supWrap"><table class="sup-table" id="supTable">' + supColsHtml() + '<thead><tr class="sup-letters">' + SUP_HEADS.map(function (h, i) {
        return '<th class="sup-l' + i + '">' + window.XlsxLite.colLetter(i + 1) +
          (i === 4 ? '<button type="button" class="sup-filt" id="supBrandFilt" title="Filter SUP BRAND — the merge then covers only the brands you keep ticked" aria-label="Filter SUP BRAND"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 5h18l-7 8v5l-4 2v-7z"/></svg></button>' : '') + '</th>';
      }).join('') + '</tr><tr class="sup-tot" id="supTot">' + SUP_HEADS.map(function (h, i) { return '<th class="sup-t' + i + '"></th>'; }).join('') +
      '</tr><tr class="sup-heads">' + SUP_HEADS.map(function (h, i) {
        var g = KEEP_GROUPS.filter(function (x) { return x.col === i || (x.cols || []).indexOf(i) >= 0; })[0];   // v1.15.0: B and C share the supplier tick
        return '<th class="sup-c' + i + (i === 0 || i === 15 ? ' sup-ro' : '') + '"><span class="sup-hl">' + esc(h) + '</span><span class="sup-tick">' +
          (i === 0 ? '<label class="sup-pick sup-pick-all" title="Tick every row shown (untick to clear)"><input type="checkbox" data-pick-all aria-label="Tick every row shown"></label>' : '') +
          (g ? '<label class="sup-keep" title="' + esc(g.tip || ('Update in POS — ticked: POS ' + g.what + ' is updated from this column. Unticked: POS keeps its current ' + g.what + ' for matched products.')) + '"><input type="checkbox" data-keep="' + g.id + '" aria-label="Update in POS: ' + esc(h) + '"></label>' : '') + '</span></th>';
      }).join('') + '</tr></thead><tbody id="supBody"></tbody></table></div>' +
      '<div class="review-pager sup-foot"><span class="sup-sel-info" id="supSelInfo"></span><span id="supPage"></span></div></div>';
  }
  function drawSup() {
    var host = $('#supSheet'); if (!host) return;
    var finp = $('#supSearch');                                        // v1.11.0: the bar starts with the supplier
    var fclr = $('#supSearchClear');                                   // v1.14.4: the × as on the other search bars
    if (fclr && finp) { fclr.onclick = function () { finp.value = ''; finp.dispatchEvent(new Event('input', { bubbles: true })); finp.focus(); }; finp.addEventListener('input', function () { fclr.hidden = !finp.value; }); fclr.hidden = !finp.value; }

    var model = supModel(), bsel = null, spec = supFindSpec(supView.q);
    if (supView.brands) { bsel = {}; supView.brands.forEach(function (b) { bsel[b] = 1; }); }
    var vis = bsel ? model.items.filter(function (it) { return bsel[supBrandOf(it.ref.row)]; }) : model.items;
    if (spec) vis = supFindRows(vis, spec);                                  // v1.11.0: the search / add bar
    supView.find = spec; supView.vis = vis;
    var q = !!spec;
    supFindHint();
    var t = supTotals(vis);
    var stat = model.run ? (model.summary || 'Stage 1 finished — no summary returned') : (model.items.length ? 'STATUS is set when stage 1 runs (Highlight New Products + Best Buy)' : 'No supplier rows yet — drop supplier files above, or click B3 and paste rows here');
    // v1.8.0: the totals are row 1 of the sheet, each above its column as in the Google Sheet (for the rows shown).
    supView.tot = supTotCells(t, model, stat);
    var totRow = $('#supTot');
    totRow.innerHTML = supView.tot.map(function (x, i) {
      if (!x) return '<th class="sup-t' + i + '"></th>';
      return '<th class="sup-t' + i + (x.st ? ' sup-t-st' + (model.run ? '' : ' is-wait') : '') + '"' + (x.tip ? ' title="' + esc(x.tip) + '"' : '') + '>' +
        (x.st ? x.lines.map(function (l) { return '<span>' + esc(l) + '</span>'; }).join('') : '<span class="sup-tl">' + esc(x.l) + '</span><b>' + esc(x.v) + '</b>') + '</th>';
    }).join('');
    totRow.classList.toggle('is-filtered', !!(q || bsel));
    totRow.title = q || bsel ? 'Totals for the ' + fmtN(vis.length) + ' rows shown (search / SUP BRAND filter)' : '';
    $('#supScope').innerHTML = supScopeHtml(model);
    $('#supOpts').innerHTML = supOptsHtml();
    var tbl = $('#supTable');
    KEEP_GROUPS.forEach(function (g) {
      tbl.classList.toggle('keep-c' + g.col, !!state.opts.keep[g.id]);
      tbl.querySelectorAll('[data-keep="' + g.id + '"]').forEach(function (cb) { cb.checked = !state.opts.keep[g.id]; cb.disabled = state.busy; });   // v1.15.0: B and C
    });
    var bf = $('#supBrandFilt'); if (bf) bf.classList.toggle('is-on', !!supView.brands);
    drawLibSup();
    supFit();
    drawSupRows();
    var added = addedEntry(false), an = added ? added.data.length : 0;
    var badge = $('#supCount'); badge.textContent = (q || bsel ? fmtN(vis.length) + ' OF ' : '') + fmtN(model.items.length) + ' ROWS' + (an ? ' · ' + fmtN(an) + ' ADDED' : ''); badge.className = 'result-badge' + (model.items.length ? ' ok' : '');
    $('#supPage').textContent = q || bsel ? fmtN(vis.length) + ' of ' + fmtN(model.items.length) + ' rows ' + (q && bsel ? 'match the search and the SUP BRAND filter' : q ? 'match the search' : 'in the SUP BRAND filter') : 'All ' + fmtN(model.items.length) + ' row' + (model.items.length === 1 ? '' : 's') + ' · scroll the sheet to see every row';
    $('#supUndo').disabled = !supView.undo.length || state.busy;
    $('#supClearAdded').disabled = !an || state.busy;
    ['#supPasteBtn', '#supAdd5'].forEach(function (s) { $(s).disabled = state.busy; });
    $('#supClearEmpty').disabled = state.busy || !model.items.some(function (it) { return supRowEmpty(it.ref.row); });
    supSay(supView.note, supView.noteType);
    paintSel();
  }

  // ---- rows: the window of rows around the scroll position (r = position in the search-filtered list; the empty row
  // under the last row is r = vis.length). Banding comes from the row number, so it never flickers while scrolling.
  function supTotalRows() { return supView.vis.length + (supView.find || supView.brands ? 0 : 1); }
  function supHeadH() { var th = document.querySelector('#supWrap thead'); return th ? th.offsetHeight : 40; }
  function supWindow() {
    var wrap = $('#supWrap'), rh = supView.rowH || 27, total = supTotalRows();
    var top = wrap ? Math.max(0, wrap.scrollTop - supHeadH()) : 0, h = wrap && wrap.clientHeight ? wrap.clientHeight : 640;
    var first = Math.floor(top / rh), last = first + Math.ceil(h / rh);
    return { first: first, last: last, start: Math.max(0, Math.min(first, total) - SUP_BUF), end: Math.min(total, last + SUP_BUF) };
  }
  function supRowHtml(r) {
    var vis = supView.vis, it = vis[r], band = ' sup-b' + (r % 2);
    if (!it) {
      var blank = '';
      for (var c2 = 0; c2 < 16; c2++) blank += '<td class="sup-c' + c2 + (c2 === 0 || c2 === 15 ? ' sup-ro' : '') + '" data-r="' + r + '" data-c="' + c2 + '">' + (c2 === 0 ? '<span class="sup-new-mark">' + (r + 1) + '</span>' : '') + '</td>';
      return '<tr class="sup-new-row">' + blank + '</tr>';
    }
    var ed = it.ref.row.__ed || {}, added = !!it.ref.e.added, cells = '';
    for (var c = 0; c < 16; c++) {
      var s = supCellText(it, c), mark = added ? ed[c] === 2 : !!ed[c];      // v1.8.0: see setSupCell
      var cls = 'sup-c' + c + (c === 0 || c === 15 ? ' sup-ro' : '') + (c === 15 ? ' sup-status ' + supStatusClass(s) : '') + (mark ? ' is-edited' : '');
      var picked = c === 0 && supView.picked.indexOf(it.ref.row) >= 0;   // v1.16.0: a tick box in the INDEX cell
      cells += '<td class="' + cls + '" data-r="' + r + '" data-c="' + c + '"' + ((c === 6 || c === 15) && s ? ' title="' + esc(s) + '"' : c === 0 && added ? ' title="Added on this page"' : '') + '>' +
        (c === 0 ? '<label class="sup-pick" title="Tick rows, then Delete rows"><input type="checkbox" data-pick="' + r + '"' + (picked ? ' checked' : '') + (state.busy ? ' disabled' : '') + ' aria-label="Tick row ' + (r + 3) + '"></label>' : '') + esc(s) + '</td>';
    }
    return '<tr class="' + (added ? 'is-added' : '') + (it.out ? ' is-out' : '') + (supView.picked.indexOf(it.ref.row) >= 0 ? ' is-picked' : '') + band + '"' + (it.out ? ' title="Not in the last merge (the SUP BRAND filter left this brand out)"' : '') + '>' + cells + '</tr>';
  }
  function supGap(px) { return px > 0 ? '<tr class="sup-gap" aria-hidden="true"><td colspan="16" style="height:' + Math.round(px) + 'px"></td></tr>' : ''; }
  function drawSupRows() {
    var body = $('#supBody'); if (!body) return;
    var vis = supView.vis, q = !!supView.find, total = supTotalRows(), rh = supView.rowH || 27;
    var w = supWindow(), html = [supGap(w.start * rh)];
    for (var r = w.start; r < w.end; r++) html.push(supRowHtml(r));
    html.push(supGap((total - w.end) * rh));
    if (!vis.length && (q || supView.brands)) html = ['<tr><td colspan="16" class="sup-empty">No rows match the search / SUP BRAND filter.</td></tr>'];
    body.innerHTML = html.join('');
    supView.win = { start: w.start, end: w.end };
    // Keep the gap rows true to the real row height (it depends on the browser's font size).
    var first = body.querySelector('tr.sup-b0, tr.sup-b1');
    if (first) { var h = first.getBoundingClientRect().height; if (h > 10 && Math.abs(h - rh) > 0.5) { supView.rowH = h; if (!supView._remeasured) { supView._remeasured = true; drawSupRows(); return; } } }
    supView._remeasured = false;
    paintSel();
  }
  function supOnScroll() {
    if (supView.raf) return;
    supView.raf = requestAnimationFrame(function () {
      supView.raf = 0;
      if (supView.editing) return;                    // keep the cell being typed in where it is
      var w = supWindow();
      if (w.first < supView.win.start || Math.min(w.last, supTotalRows()) > supView.win.end) drawSupRows();
    });
  }
  // Scroll the sheet so row r is in view (drawing it if it is outside the drawn window).
  function supShowRow(r) {
    var wrap = $('#supWrap'); if (!wrap) return;
    var rh = supView.rowH || 27, head = supHeadH(), top = head + r * rh;
    if (top - head < wrap.scrollTop) wrap.scrollTop = Math.max(0, top - head);
    else if (top + rh > wrap.scrollTop + wrap.clientHeight) wrap.scrollTop = top + rh - wrap.clientHeight;
    if (r < supView.win.start || r >= supView.win.end) drawSupRows();
  }

  // ---- selection (anchor r,c → r2,c2; r = position in the search-filtered list)
  function selBox() { var s = supView.sel; return s ? { r1: Math.min(s.r, s.r2), r2: Math.max(s.r, s.r2), c1: Math.min(s.c, s.c2), c2: Math.max(s.c, s.c2) } : null; }
  function paintSel() {
    var body = $('#supBody'); if (!body) return;
    var b = selBox(), s = supView.sel;
    body.querySelectorAll('td.is-sel,td.is-anchor').forEach(function (td) { td.classList.remove('is-sel', 'is-anchor'); });
    var info = $('#supSelInfo');
    var np = supView.picked.length, delBtn = $('#supDelRows');
    delBtn.textContent = np ? 'Delete ' + fmtN(np) + ' ticked row' + (np === 1 ? '' : 's') : 'Delete rows';
    if (!b) { if (info) info.textContent = ''; delBtn.disabled = state.busy || !np; return; }
    body.querySelectorAll('td[data-r]').forEach(function (td) {
      var r = +td.dataset.r, c = +td.dataset.c;
      if (r >= b.r1 && r <= b.r2 && c >= b.c1 && c <= b.c2) td.classList.add('is-sel');
      if (r === s.r2 && c === s.c2) td.classList.add('is-anchor');
    });
    var rowsSel = Math.min(b.r2, supView.vis.length - 1) - b.r1 + 1;
    $('#supDelRows').disabled = state.busy || (!np && (rowsSel < 1 || b.r1 >= supView.vis.length));
    // v1.11.0: the fill handle (drag down to fill) on the selection's bottom-right cell, B–O.
    body.querySelectorAll('.sup-fill').forEach(function (x) { x.remove(); });
    var corner = !state.busy && b.c2 >= 1 && b.c1 <= 14 && b.r2 < supView.vis.length ? supCellEl(b.r2, Math.min(14, b.c2)) : null;
    if (corner && !supView.editing) { var fh = document.createElement('span'); fh.className = 'sup-fill'; fh.title = 'Drag down to fill (Ctrl+D fills a selection down)'; corner.appendChild(fh); }
    if (info) info.textContent = window.XlsxLite.colLetter(b.c1 + 1) + (b.r1 + 3) + (b.r2 !== b.r1 || b.c2 !== b.c1 ? ':' + window.XlsxLite.colLetter(b.c2 + 1) + (b.r2 + 3) : '') + (rowsSel > 1 ? ' · ' + fmtN(rowsSel) + ' rows' : '');
  }
  function supCellEl(r, c) { return document.querySelector('#supBody td[data-r="' + r + '"][data-c="' + c + '"]'); }
  function supGoTo(r, c, extend) {
    var max = supView.vis.length;               // the empty row under the last row is max
    r = Math.max(0, Math.min(r, max)); c = Math.max(0, Math.min(15, c));
    if (extend && supView.sel) { supView.sel.r2 = r; supView.sel.c2 = c; }
    else supView.sel = { r: r, c: c, r2: r, c2: c };
    supShowRow(r);
    paintSel();
    var el = supCellEl(r, c); if (el) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  // ---- editing one cell
  function startEdit(initial) {
    var s = supView.sel; if (!s || state.busy) return;
    var r = s.r2, c = s.c2;
    if (c === 0 || c === 15) { supSay(c === 0 ? 'INDEX is numbered automatically.' : 'STATUS is written by the merge (stage 1).', 'info'); return; }
    var td = supCellEl(r, c); if (!td) return;
    var it = supView.vis[r], cur = it ? (it.ref.row[c] == null ? '' : String(it.ref.row[c])) : '';
    var inp = document.createElement('input');
    inp.type = 'text'; inp.className = 'sup-edit'; inp.value = initial !== undefined ? initial : cur;
    td.classList.add('is-editing'); td.appendChild(inp);
    supView.editing = { r: r, c: c, input: inp, typed: initial !== undefined };
    inp.focus(); if (initial === undefined) inp.select(); else inp.setSelectionRange(inp.value.length, inp.value.length);
    inp.addEventListener('keydown', function (e) {
      var ed = supView.editing; if (!ed) return;
      if (e.key === 'Enter') { e.preventDefault(); commitEdit(); supGoTo(ed.r + (e.shiftKey ? -1 : 1), ed.c); $('#supSheet').focus(); }
      else if (e.key === 'Tab') { e.preventDefault(); commitEdit(); supGoTo(ed.r, ed.c + (e.shiftKey ? -1 : 1)); $('#supSheet').focus(); }
      else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); $('#supSheet').focus(); }
      else if (ed.typed && /^Arrow/.test(e.key)) { e.preventDefault(); commitEdit(); var d = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key]; supGoTo(ed.r + d[0], ed.c + d[1]); $('#supSheet').focus(); }
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C') && inp.selectionStart === inp.selectionEnd) { var cp = inp.selectionStart; inp.select(); setTimeout(function () { try { inp.setSelectionRange(cp, cp); } catch (x) {} }, 0); }   // v1.11.0: nothing highlighted = the whole cell (the browser copies it)
      e.stopPropagation();
    });
    inp.addEventListener('paste', function (e) {
      var txt = e.clipboardData && e.clipboardData.getData('text/plain');
      if (txt && /[\t\n]/.test(txt.replace(/\r?\n$/, ''))) { e.preventDefault(); e.stopPropagation(); cancelEdit(); pasteToSupplier(txt); }
    });
    inp.addEventListener('blur', function () { if (supView.editing && supView.editing.input === inp) commitEdit(); });
  }
  function cancelEdit() {
    var ed = supView.editing; if (!ed) return;
    supView.editing = null;
    if (ed.input.parentNode) { ed.input.parentNode.classList.remove('is-editing'); ed.input.parentNode.removeChild(ed.input); }
  }
  function commitEdit() {
    var ed = supView.editing; if (!ed) return;
    var val = ed.input.value;
    cancelEdit();
    var it = supView.vis[ed.r];
    if (!it && String(val).trim() === '') return;
    supMutate(function () {
      var row = it ? it.ref.row : null;
      if (!row) { row = blankSupRow(); addedEntry(true).data.push(row); }
      var changed = setSupCell(row, ed.c, val, !it || !!it.ref.e.added);
      if (!changed && it) return null;
      return { msg: it ? 'Changed ' + window.XlsxLite.colLetter(ed.c + 1) + (ed.r + 3) + ' (' + SUP_HEADS[ed.c] + ').' : 'Row ' + (ed.r + 3) + ' added.', type: 'success' };
    });
  }
  function clearSelectedCells() {
    var b = selBox(); if (!b) return;
    supMutate(function () {
      var n = 0;
      for (var r = b.r1; r <= b.r2; r++) { var it = supView.vis[r]; if (!it) continue; for (var c = Math.max(1, b.c1); c <= Math.min(14, b.c2); c++) if (setSupCell(it.ref.row, c, '', !!it.ref.e.added)) n++; }
      return n ? { msg: fmtN(n) + ' cell' + (n === 1 ? '' : 's') + ' cleared.', type: 'success' } : null;
    });
  }
  function deleteSelectedRows() {
    var targets = [];
    if (supView.picked.length) {                                                            // v1.16.0: the ticked rows first
      supModel().items.forEach(function (it) { if (supView.picked.indexOf(it.ref.row) >= 0) targets.push(it.ref); });
    } else {
      var b = selBox(); if (!b) return;
      for (var r = b.r1; r <= b.r2; r++) if (supView.vis[r]) targets.push(supView.vis[r].ref);
    }
    if (!targets.length) return;
    supView.picked = [];
    supMutate(function () {
      targets.forEach(function (ref) { var i = ref.e.data.indexOf(ref.row); if (i >= 0) ref.e.data.splice(i, 1); });
      return { msg: fmtN(targets.length) + ' row' + (targets.length === 1 ? '' : 's') + ' deleted.', type: 'success' };
    });
    supView.sel = null; paintSel();
  }
  function supUndo() {
    if (state.busy || !supView.undo.length) return;
    cancelEdit();
    supRestore(supView.undo.pop());
    supCommit('Undone.', 'info');
  }
  function supCopy() {
    var b = selBox(); if (!b) return '';
    var lines = [];
    for (var r = b.r1; r <= Math.min(b.r2, supView.vis.length - 1); r++) { var row = []; for (var c = b.c1; c <= b.c2; c++) row.push(supShown(supView.vis[r], c).replace(/[\t\n]/g, ' ')); lines.push(row.join('\t')); }
    return lines.join('\n');
  }

  // ---- v1.11.0: the search / add bar. Plain text searches every column. With "|" it is a row in the column order B–O
  // (POS SUPPLIER NAME | POS SUPPLIER NUMBER | SUP BARCODE | SUP BRAND | SUP SUB ID | SUP PRODUCT | …): the barcode is
  // looked for first; when it is not on the sheet (or empty) brand / Sub ID / product / WS are the backup check. The
  // supplier slots never filter. Add puts the row in (not when the barcode is already on the sheet).
  function supDigits(v) { return String(v == null ? '' : v).replace(/\D/g, ''); }
  function supBcKey(v) { return supDigits(v).replace(/^0+/, ''); }
  function supUp(v) { return String(v == null ? '' : v).trim().toUpperCase(); }
  function supFindSpec(raw) {
    var s = String(raw == null ? '' : raw);
    { var t = s.trim().toUpperCase(); return t ? { text: t } : null; }   // v1.16.0: a plain search (the type-a-row form is gone)
    var p = s.split('|').map(function (x) { return x.trim(); });
    var ws = p[8] ? Number(p[8].replace(/[$,\s]/g, '')) : NaN;
    var spec = { slots: p, bc: supDigits(p[2]), br: supUp(p[3]), sub: supUp(p[4]), prod: supUp(p[5]), ws: isFinite(ws) && ws > 0 ? ws : 0 };
    return spec.bc || spec.br || spec.sub || spec.prod || spec.ws ? spec : null;
  }
  function supFindRows(items, spec) {
    if (spec.text) return items.filter(function (it) { var t = ''; for (var c = 0; c < 16; c++) t += supShown(it, c) + ' '; return t.toUpperCase().indexOf(spec.text) >= 0; });
    var hits = [];
    spec.how = '';
    if (spec.bc) { hits = items.filter(function (it) { return supDigits(it.ref.row[3]).indexOf(spec.bc) >= 0; }); if (hits.length) spec.how = 'barcode'; }
    if (!hits.length && (spec.br || spec.sub || spec.prod || spec.ws)) {
      hits = items.filter(function (it) {
        var r = it.ref.row;
        return (!spec.br || supUp(r[4]).indexOf(spec.br) >= 0) && (!spec.sub || supUp(r[5]).indexOf(spec.sub) >= 0) &&
          (!spec.prod || supUp(r[6]).indexOf(spec.prod) >= 0) && (!spec.ws || Math.abs(Number(r[9]) - spec.ws) < 0.005);
      });
      if (hits.length) spec.how = 'backup';
    }
    return hits;
  }
  // Under the bar: the column the cursor is in, and what the search found.
  function supFindHint() {
    var el = $('#supFindHint'), inp = $('#supSearch'); if (!el || !inp) return;   // v1.16.0: nothing to show (the element is gone)
    var v = inp.value, at = inp.selectionStart == null ? v.length : inp.selectionStart, spec = supView.find, txt = '';
    if (v.indexOf('|') >= 0) {
      var k = v.slice(0, at).split('|').length;                   // slot 1 = B
      txt = k <= 14 ? window.XlsxLite.colLetter(k + 1) + ' ' + SUP_HEADS[k] : 'past O — the extra text is not used';
      if (spec && spec.slots) {
        var n = supView.vis.length;
        txt += ' · ' + (spec.how === 'barcode' ? fmtN(n) + ' row' + (n === 1 ? '' : 's') + ' with this barcode'
          : spec.how === 'backup' ? (spec.bc ? 'barcode not on the sheet — ' : '') + fmtN(n) + ' row' + (n === 1 ? ' matches' : 's match') + ' brand / Sub ID / product / WS'
          : 'not on the sheet — Add puts it in');
      }
    }
    el.textContent = txt; el.hidden = !txt;
  }
  // The supplier most rows have, as the bar's start: "OBORNE / CH2 | 134 | ".
  var supPrefillCache = null;
  function supPrefill() {
    if (supPrefillCache && supPrefillCache.rev === state.rev) return supPrefillCache.v;
    var c = {}, best = '', bn = 0;
    supEntries().forEach(function (e) {
      e.data.forEach(function (row) {
        var a = String(row[1] == null ? '' : row[1]).trim(), b = String(row[2] == null ? '' : row[2]).trim().replace(/\.0+$/, '');
        if (!a && !b) return;
        var k = a + ' | ' + b; c[k] = (c[k] || 0) + 1; if (c[k] > bn) { bn = c[k]; best = k; }
      });
    });
    supPrefillCache = { rev: state.rev, v: best ? best + ' | ' : '' };
    return supPrefillCache.v;
  }
  function supFindReset() {
    var inp = $('#supSearch'); if (!inp) return;
    inp.value = ''; supView.q = ''; supView.sel = null;   // v1.16.0: no prefill
  }
  function supRowEmpty(row) { for (var c = 3; c <= 14; c++) if (String(row[c] == null ? '' : row[c]).trim() !== '') return false; return true; }
  function supFindAdd() {
    if (state.busy) { supSay('A stage is running — add the row when it finishes.', 'warn'); return; }
    var inp = $('#supSearch'), raw = inp.value;
    if (raw.indexOf('|') < 0) { supSay('To add a row, type it in the bar as ' + SUP_HEADS.slice(1, 7).join(' | ') + ' | … (the supplier is filled in for you), then Add.', 'info'); if (!raw.trim()) { supFindReset(); drawSup(); } inp.focus(); return; }
    var p = raw.split('|').map(function (x) { return x.trim(); });
    if (!p.slice(2, 14).some(function (x) { return x; })) { supSay('Type the barcode, brand, product… after the supplier, then Add.', 'warn'); inp.focus(); return; }
    var items = supModel().items, bc = supBcKey(p[2]);
    var dup = bc ? items.filter(function (it) { return supBcKey(it.ref.row[3]) === bc; })[0] : null;
    if (dup) {
      supFindReset(); if (supView.brands && !supView.brands.some(function (b) { return b === supBrandOf(dup.ref.row); })) setSupBrands(null);
      drawSup();
      var at = supView.vis.indexOf(supView.vis.filter(function (it) { return it.ref.row === dup.ref.row; })[0]);
      if (at >= 0) supGoTo(at, 3);
      supSay('Already on row ' + (dup.n + 2) + ' (barcode ' + p[2] + ') — not added again.', 'warn');
      return;
    }
    var row = blankSupRow(), br = supUp(p[3]), sub = supUp(p[4]), ws = p[8] ? Number(String(p[8]).replace(/[$,\s]/g, '')) : 0;
    var near = items.filter(function (it) {
      var r = it.ref.row; if (!br || supUp(r[4]) !== br) return false;
      return (sub && supUp(r[5]) === sub) || (ws > 0 && Math.abs(Number(r[9]) - ws) < 0.005);
    })[0];
    var ok = supMutate(function () {
      addedEntry(true).data.push(row);
      for (var i = 0; i < 14; i++) if (p[i]) setSupCell(row, i + 1, p[i], true);
      return near ? { msg: 'Row added — check row ' + (near.n + 2) + ': same brand and ' + (sub && supUp(near.ref.row[5]) === sub ? 'Sub ID' : 'WS') + ' (' + String(near.ref.row[6] || '').slice(0, 40) + ').', type: 'warn' }
        : { msg: 'Row added' + (p[2] ? ' (barcode ' + p[2] + ')' : '') + '.', type: 'success' };
    });
    if (!ok) return;
    if (supView.brands && !supView.brands.some(function (b) { return b === supBrandOf(row); })) setSupBrands(null);
    supFindReset(); drawSup();
    var idx = supView.vis.indexOf(supView.vis.filter(function (it) { return it.ref.row === row; })[0]);
    if (idx >= 0) supGoTo(idx, 3);
    inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); supFindHint();
  }
  function supAddFive() {
    var rows = [];
    var ok = supMutate(function () {
      var e = addedEntry(true);
      for (var i = 0; i < 5; i++) { var r = blankSupRow(); e.data.push(r); rows.push(r); }
      return { msg: '5 empty rows added at the end — type in them, paste, or fill down (drag the small square at the corner of a cell, or Ctrl+D).', type: 'success' };
    });
    if (!ok) return;
    supFindReset(); if (supView.brands) setSupBrands(null);
    drawSup();
    var idx = supView.vis.indexOf(supView.vis.filter(function (it) { return it.ref.row === rows[0]; })[0]);
    if (idx >= 0) supGoTo(idx, 1);
    $('#supSheet').focus({ preventScroll: true });
  }
  function supClearEmpty() {
    supMutate(function () {
      var n = 0;
      supEntries().forEach(function (e) { var keep = e.data.filter(function (r) { return !supRowEmpty(r); }); n += e.data.length - keep.length; e.data = keep; });
      return n ? { msg: fmtN(n) + ' empty row' + (n === 1 ? '' : 's') + ' removed.', type: 'success' } : null;
    });
    supView.sel = null; paintSel();
  }
  // ---- v1.11.0: fill down, as in Excel / Google Sheets. The selected block repeats into the rows dragged over (or, with
  // Ctrl+D, its first row fills the rest of the selection; one row selected = the row above fills it). B–O only.
  function supFill(b, toRow) {
    var c1 = Math.max(1, b.c1), c2 = Math.min(14, b.c2); if (c1 > c2) return;
    var h = b.r2 - b.r1 + 1;
    supMutate(function () {
      var n = 0, made = 0;
      for (var t = b.r2 + 1; t <= toRow; t++) {
        var src = supView.vis[b.r1 + ((t - b.r2 - 1) % h)]; if (!src) continue;
        var it = supView.vis[t], row = it ? it.ref.row : null, added = !it || !!it.ref.e.added;
        if (!row) { row = blankSupRow(); addedEntry(true).data.push(row); made++; }
        for (var c = c1; c <= c2; c++) if (setSupCell(row, c, src.ref.row[c] == null ? '' : src.ref.row[c], added)) n++;
      }
      return n ? { msg: 'Filled ' + fmtN(n) + ' cell' + (n === 1 ? '' : 's') + ' down' + (made ? ' (' + made + ' new row' + (made === 1 ? '' : 's') + ')' : '') + '.', type: 'success' } : null;
    });
  }
  function supFillDown() {
    var b = selBox(); if (!b) return;
    if (b.r1 === b.r2) { if (b.r1 === 0) return; supFill({ r1: b.r1 - 1, r2: b.r1 - 1, c1: b.c1, c2: b.c2 }, b.r1); }
    else supFill({ r1: b.r1, r2: b.r1, c1: b.c1, c2: b.c2 }, b.r2);
    paintSel();
  }
  // ---- v1.11.0: Ctrl+C / ⌘C writes the clipboard itself (some browsers send no copy event when no text is selected).
  function copyText(txt) {
    // v1.14.9: the clipboard API first (it is what Chrome trusts in a key press on https); the hidden-text-box trick only
    // when the API is missing or refuses. An empty selection copies an empty string rather than nothing.
    var legacy = function () {
      var ta = document.createElement('textarea'), prev = document.activeElement, ok = false;
      ta.value = txt; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      if (prev && prev.focus) prev.focus({ preventScroll: true });
      return ok;
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).catch(legacy); else legacy();
    return true;
  }

  function wireSupSheet() {
    var host = $('#supSheet'); if (!host) return;
    var t, find = $('#supSearch');
    if (!supView.q) supFindReset(); else find.value = supView.q;
    find.oninput = function () { clearTimeout(t); t = setTimeout(function () { supView.q = find.value; supView.sel = null; $('#supWrap').scrollTop = 0; drawSup(); }, 200); };
    find.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); clearTimeout(t); supView.q = find.value; drawSup(); }
      else if (e.key === 'Escape') { e.preventDefault(); clearTimeout(t); supFindReset(); drawSup(); }
    });
    $('#supAdd5').onclick = supAddFive;
    $('#supClearEmpty').onclick = supClearEmpty;
    $('#supWrap').addEventListener('scroll', supOnScroll, { passive: true });
    // v1.7.0: fitted again when the sheet's width changes (window resized, tab shown).
    if (window.ResizeObserver) { var supRaf = 0; new ResizeObserver(function () { if (supRaf) return; supRaf = requestAnimationFrame(function () { supRaf = 0; supFit(); }); }).observe($('#supWrap')); }
    else window.addEventListener('resize', supFit);
    // v1.7.0: a cell cut short with … shows its full text on hover.
    $('#supWrap').addEventListener('mouseover', function (e) {
      var td = e.target && e.target.closest ? e.target.closest('#supBody td') : null;
      if (!td || td.classList.contains('is-editing')) return;
      if (td.scrollWidth > td.clientWidth + 1) { if (td.title !== td.textContent) td.title = td.textContent; }
      else if (td.title && !td.classList.contains('sup-c6') && !td.classList.contains('sup-c15')) td.removeAttribute('title');
    });
    $('#supUndo').onclick = supUndo;
    $('#supDelRows').onclick = deleteSelectedRows;
    // v1.6.0: Update in POS ticks, the Discontinue switch and the SUP BRAND filter.
    host.addEventListener('change', function (e) {
      var pk = e.target.closest('input[data-pick]');                                        // v1.16.0: row tick boxes
      if (pk) { var it = supView.vis[+pk.dataset.pick]; if (it) { var ix = supView.picked.indexOf(it.ref.row); if (pk.checked && ix < 0) supView.picked.push(it.ref.row); if (!pk.checked && ix >= 0) supView.picked.splice(ix, 1); var ptr = pk.closest('tr'); if (ptr) ptr.classList.toggle('is-picked', pk.checked); } paintSel(); return; }
      var pa = e.target.closest('input[data-pick-all]');
      if (pa) { supView.picked = pa.checked ? supView.vis.map(function (it) { return it.ref.row; }) : []; drawSupRows(); return; }
      var k = e.target.closest('[data-keep]'); if (k) { setKeep(k.dataset.keep, !k.checked); if (k.dataset.keep === 'ws') setKeep('last', !k.checked); return; }   // v1.15.2 / v1.15.3: J = WSP + last price, both pairs
      if (e.target.id === 'supDiscontinue') { state.opts.discontinue = e.target.checked; optsChanged(); }
    });
    host.addEventListener('click', function (e) {
      if (e.target.closest('[data-keep-all]')) { var nOff = !!state.opts.keep.disc; state.opts.keep = {}; if (nOff) { state.rev++; invalidateResults('SUP DISCOUNT PRICE (N) turned on — run the stages again.'); renderAll(); } optsChanged(); return; }   // v1.11.0: N back on → run again
      if (e.target.closest('[data-sup-unfilter]')) { setSupBrands(null); return; }
      var bf = e.target.closest('#supBrandFilt');
      if (bf) {
        e.preventDefault(); e.stopPropagation();
        if (state.busy) return;
        window.PHFSheetGrid.picker({ anchor: bf, title: 'SUP BRAND', values: supBrandList().map(function (x) { return { v: x.v, n: x.n }; }), selected: supView.brands, onApply: setSupBrands });
      }
    });
    $('#supTable').querySelector('thead').addEventListener('mousedown', function (e) {
      if (e.target.closest('.sup-filt')) { e.stopPropagation(); return; }
      var hc = e.target.closest('tr.sup-heads th');                    // v1.17.0: whole heading cell toggles its Update in POS / pick-all tick
      if (hc) {
        var box = hc.querySelector('input[data-keep], input[data-pick-all]');
        if (box) { e.preventDefault(); e.stopPropagation(); if (box.disabled) return; if (e.target.tagName !== 'INPUT') { box.checked = !box.checked; box.dispatchEvent(new Event('change', { bubbles: true })); } return; }
      }
      if (e.target.closest('.sup-keep,.sup-pick')) e.stopPropagation();
    });
    $('#supClearAdded').onclick = function () {      // v1.17.0: Clear Sheet — confirm before clearing typed / pasted rows
      var e = addedEntry(false); if (!e) return;
      var n = e.data.length;
      if (!window.confirm('Clear the sheet?\n\nThis removes the ' + fmtN(n) + ' row' + (n === 1 ? '' : 's') + ' you typed or pasted here. Dropped supplier files and saved library files are not touched. You can undo this.')) return;
      supMutate(function () { e.data = []; return { msg: fmtN(n) + ' added row' + (n === 1 ? '' : 's') + ' cleared.', type: 'info' }; });
    };
    $('#supCopyHeads').onclick = function () {
      var txt = SUP_HEADS.join('\t');
      var done = function () { supSay('The 16 headings are on the clipboard — paste them into row 1 of a sheet, add the rows, then copy everything and paste it here.', 'success'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { supSay('The browser blocked the clipboard. Headings: ' + SUP_HEADS.join(' · '), 'warn'); });
      else supSay('Headings: ' + SUP_HEADS.join(' · '), 'info');
    };
    $('#supPasteBtn').onclick = function () {
      if (!navigator.clipboard || !navigator.clipboard.readText) { host.focus(); supSay('This browser does not let pages read the clipboard from a button — click a cell and press Ctrl+V (⌘V on Mac).', 'warn'); return; }
      navigator.clipboard.readText().then(pasteToSupplier, function () { host.focus(); supSay('The browser blocked reading the clipboard — click a cell and press Ctrl+V (⌘V on Mac).', 'warn'); });
    };
    var body = $('#supBody'), dragging = false;
    body.addEventListener('mousedown', function (e) {
      var pkCell = e.target.closest('td[data-c="0"]');                 // v1.17.0: whole INDEX cell toggles its row tick box
      if (pkCell) {
        var pkBox = pkCell.querySelector('input[data-pick]');
        if (pkBox) { e.preventDefault(); e.stopPropagation(); if (pkBox.disabled) return; if (e.target.tagName !== 'INPUT') { pkBox.checked = !pkBox.checked; pkBox.dispatchEvent(new Event('change', { bubbles: true })); } return; }
      }
      if (e.target.closest('.sup-pick')) return;                       // v1.16.0: the row tick box
      if (e.target.classList.contains('sup-fill')) {                 // v1.11.0: start a fill-down drag
        var fb = selBox(); if (!fb || state.busy) return;
        if (supView.editing) commitEdit();
        supView.filling = { b: fb, to: fb.r2 }; e.preventDefault(); e.stopPropagation(); return;
      }
      var td = e.target.closest('td[data-r]'); if (!td || e.target.classList.contains('sup-edit')) return;
      if (supView.editing) commitEdit();
      var r = +td.dataset.r, c = +td.dataset.c;
      if (c === 0) {                                    // INDEX click = select whole rows
        if (e.shiftKey && supView.sel) { supView.sel.r2 = r; supView.sel.c = 1; supView.sel.c2 = 14; }
        else supView.sel = { r: r, c: 1, r2: r, c2: 14 };
        paintSel();
      } else supGoTo(r, c, e.shiftKey);
      dragging = c !== 0 ? true : 'rows';
      host.focus({ preventScroll: true });
      e.preventDefault();
    });
    body.addEventListener('mouseover', function (e) {
      var fl = supView.filling;
      if (fl) {                                                      // v1.11.0: rows dragged over light up
        var ftd = e.target.closest('td[data-r]'); if (!ftd) return;
        fl.to = Math.max(fl.b.r2, Math.min(+ftd.dataset.r, supView.vis.length));
        body.querySelectorAll('td.is-fill').forEach(function (x) { x.classList.remove('is-fill'); });
        for (var fr = fl.b.r2 + 1; fr <= fl.to; fr++) for (var fc = Math.max(1, fl.b.c1); fc <= Math.min(14, fl.b.c2); fc++) { var fx = supCellEl(fr, fc); if (fx) fx.classList.add('is-fill'); }
        return;
      }
      if (!dragging || !supView.sel) return;
      var td = e.target.closest('td[data-r]'); if (!td) return;
      supView.sel.r2 = +td.dataset.r; if (dragging !== 'rows') supView.sel.c2 = +td.dataset.c;
      paintSel();
    });
    document.addEventListener('mouseup', function () {
      dragging = false;
      var fl = supView.filling; if (!fl) return;
      supView.filling = null;
      body.querySelectorAll('td.is-fill').forEach(function (x) { x.classList.remove('is-fill'); });
      if (fl.to > fl.b.r2) { supFill(fl.b, fl.to); supView.sel = { r: fl.b.r1, c: fl.b.c1, r2: fl.to, c2: fl.b.c2 }; paintSel(); }
    });
    body.addEventListener('dblclick', function (e) { var td = e.target.closest('td[data-r]'); if (!td) return; supGoTo(+td.dataset.r, +td.dataset.c); startEdit(); });
    host.addEventListener('keydown', function (e) {
      var tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'BUTTON' || tg.tagName === 'SELECT')) return;
      var s = supView.sel, mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); supUndo(); return; }
      if (!s) return;
      if (mod && (e.key === 'c' || e.key === 'C')) { var ct = supCopy(); e.preventDefault(); copyText(ct); supSay('Copied ' + ($('#supSelInfo').textContent || 'the selection') + (ct ? '' : ' (empty)') + '.', 'info'); return; }   // v1.11.0 · v1.14.9 empties too
      if (mod && (e.key === 'd' || e.key === 'D')) { e.preventDefault(); supFillDown(); return; }                     // v1.11.0 fill down
      var moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
      if (moves[e.key]) {
        e.preventDefault();
        if (mod) { var j = window.PHFSheetGrid.jump(function (r, c) { var it = supView.vis[r]; return it ? supShown(it, c).trim() : ''; }, s.r2, s.c2, moves[e.key][0], moves[e.key][1], supView.vis.length - 1, 15); supGoTo(j[0], j[1], e.shiftKey); return; }   // v1.14.0 Ctrl + arrow
        supGoTo(s.r2 + moves[e.key][0], s.c2 + moves[e.key][1], e.shiftKey); return;
      }
      if (e.key === 'Tab') { e.preventDefault(); supGoTo(s.r2, s.c2 + (e.shiftKey ? -1 : 1)); return; }
      if (e.key === 'Enter' || e.key === 'F2') { e.preventDefault(); startEdit(); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); clearSelectedCells(); return; }
      if (e.key === 'Escape') { supView.sel = null; paintSel(); return; }
      if (!mod && !e.altKey && e.key.length === 1) { e.preventDefault(); startEdit(e.key); }
    });
    host.addEventListener('copy', function (e) {
      var tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA')) return;
      var txt = supCopy(); if (!txt) return;
      e.clipboardData.setData('text/plain', txt); e.preventDefault();
      supSay('Copied ' + ($('#supSelInfo').textContent || 'the selection') + '.', 'info');
    });
    host.addEventListener('paste', function (e) {
      var tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA')) return;
      var txt = e.clipboardData && e.clipboardData.getData('text/plain'); if (!txt) return;
      e.preventDefault(); e.stopPropagation(); pasteToSupplier(txt);
    });
    drawSup();
  }
  function refreshSupSheet() { if ($('#supSheet')) drawSup(); }

  // ------------------------------------------------- Staff Hub Library (v1.3.0)
  function libNote(id, f) {
    if (!f.libSavedAt || !LIB) return '';
    var rec = { savedAt: f.libSavedAt }, stale = !LIB_SHARED[id] && LIB.isStale(rec);
    return '<em class="lib-from' + (stale ? ' stale' : '') + '">' + (LIB_SHARED[id] ? 'Saved in the Library ' : 'From the Library · built ') + esc(LIB.when(rec)) + ' (' + esc(LIB.ago(rec)) + ')' + (stale ? ' — over a day old: check it is the latest build' : '') + '</em>';
  }
  // Inputs removed from this page: a Library file is not loaded here again until a newer copy is saved; the shared
  // Ongoing Discounts file is one saved copy for every tool, so removing it deletes it from the Library.
  function libForget(id, files) {
    if (!LIB) return;
    (files || []).forEach(function (f) {
      if (!f || !f.libKind) return;
      if (LIB_SHARED[id]) LIB.remove(f.libKind).catch(function () {});
      else LIB.dismiss(LIB_TOOL, { kind: f.libKind, savedAt: f.libSavedAt });
    });
  }
  function libLoad() {
    if (!LIB) return Promise.resolve([]);
    var got = [];
    return LIB_LOAD.reduce(function (p, j) {
      return p.then(function () {
        return LIB.get(j.kind).then(function (rec) {
          if (!rec || !rec.blob) return;
          var cur = state.inputs[j.id], files = (cur && cur.files) || [];
          if (LIB_SHARED[j.id]) { if (files.length && files[0].libSavedAt === rec.savedAt) return; }
          else {
            if (LIB.isDismissed(LIB_TOOL, rec)) return;
            // v1.14.2: a POS Database already here wins only while it is as new as the Library's — a file dropped this
            // session, or the same Library copy. One brought back from last session is replaced by a newer build
            // (it used to win every time, so a new Build never reached this page without Clear session files).
            var replace = false;
            if (j.id === 'pos' && files.length) {
              var f0 = files[0];
              if (f0.libKind === j.kind) replace = f0.libSavedAt !== rec.savedAt;
              else replace = sessRestoring && (!f0.loadedIso || f0.loadedIso < rec.savedAt);
              if (!replace) return;
            }
            if (!replace && files.some(function (f) { return f.libKind === j.kind || f.name === rec.name; })) return;
          }
          var file = LIB.toFile(rec);
          return readWorkbook(file).then(function (sheets) {
            var best = mapForInput(j.id, sheets), entry = fileEntry(file, best.tab, best.mapped);
            entry.libKind = j.kind; entry.libSavedAt = rec.savedAt; entry.libWhen = LIB.when(rec);
            if ((LIB_SHARED[j.id] || replace) && state.inputs[j.id]) state.inputs[j.id].files = [];
            addToInput(j.id, entry);
            got.push(LIB.info(j.kind).label + ' (' + LIB.when(rec) + ')' + (replace ? ' — newer than the one from last session, which it replaces' : ''));
          });
        }).catch(function (e) { console.warn('Library load failed', j.kind, e); setGlobal(LIB.info(j.kind).label + ' from the Library could not be used: ' + e.message + ' Drop the right file on its row, or run Build POS Master Databases again.', 'error'); });
      });
    }, Promise.resolve()).then(function () { return got; });
  }

  // ------------------------------------------------ v1.6.0 session kept in this browser
  /* Two records in this tool's IndexedDB store: the session inputs (POS Database, Supplier Updates with their edits, the
     SUP BRAND filter) and the session state (stage results, edits, TXT files, options and the engine's sheets — engine
     dump). On open they come back after the saved reference tables and the Library files; the results are put back only
     when the inputs are the same as when they were saved. Clear results / Clear session files / a new run replace them. */
  var SESSION_IN = '__session_inputs', SESSION_POS = '__session_pos', SESSION_ST = '__session_state';
  var sessTimer = 0, sessInputsDirty = false, sessRestoring = true, savedPosSig = null, sessPending = false, sessQueued = false;
  // Closing the page while the session is being saved would lose the latest results, so the browser asks first.
  window.addEventListener('beforeunload', function (e) { if (sessPending && !sessRestoring) { e.preventDefault(); e.returnValue = ''; } });
  function posSig() { var x = state.inputs.pos; return x ? JSON.stringify([x.savedAt || '', x.files.map(function (f) { return [f.name, f.size, f.data.length, f.libSavedAt || '']; })]) : ''; }
  function inputsSig() {
    var o = {};
    M.INPUTS.forEach(function (d) { var x = state.inputs[d.id]; o[d.id] = x ? [x.savedAt || '', x.files.map(function (f) { return [f.name, f.data.length, f.libSavedAt || '']; })] : null; });
    return JSON.stringify(o);
  }
  function saveSessionSoon(inputsToo) {
    if (inputsToo) sessInputsDirty = true;
    if (sessRestoring) return;
    sessPending = true; sessQueued = true;
    clearTimeout(sessTimer);
    sessTimer = setTimeout(saveSession, 1200);
  }
  function saveSession() {
    if (state.storage !== 'indexeddb') { sessPending = false; return Promise.resolve(); }
    if (state.busy || state.edits.busy || sessRestoring) { clearTimeout(sessTimer); sessTimer = setTimeout(saveSession, 1500); return Promise.resolve(); }
    sessQueued = false;
    var jobs = [];
    if (sessInputsDirty) {
      sessInputsDirty = false;
      var ps = posSig(), rin = { id: SESSION_IN, savedAt: melb(), sup: state.inputs.sup || null, brands: supView.brands, pos: ps };
      jobs.push(dbTx('readwrite', function (st) { st.put(rin); }));
      // The POS Database (tens of thousands of rows) is written only when it changes.
      if (ps !== savedPosSig) { var rp = { id: SESSION_POS, pos: state.inputs.pos || null }; jobs.push(dbTx('readwrite', function (st) { st.put(rp); }).then(function () { savedPosSig = ps; })); }
    }
    var has = STAGES.some(function (x) { return (state.stage[x.id] || {}).status === 'done'; }) && !!state.engine && state.loadedRev === state.rev;
    var sig = inputsSig();
    // The sheets themselves are in the engine dump; the results keep everything else (alerts, TXT files, counts).
    var res = {}, sheetKeys = [];
    Object.keys(state.results).forEach(function (k) { var v = state.results[k]; if (Array.isArray(v) && v.length && Array.isArray(v[0])) sheetKeys.push(k); else res[k] = v; });
    jobs.push((has ? state.engine.send({ cmd: 'dump' }).then(function (r) { return r.dump; }).catch(function (e) { console.warn('Engine dump failed', e); return null; }) : Promise.resolve(null)).then(function (dump) {
      var keep = has && dump;
      var rst = { id: SESSION_ST, savedAt: melb(), opts: state.opts, outView: wb.outView, sig: sig,
        stage: keep ? state.stage : null, results: keep ? res : null, sheetKeys: keep ? sheetKeys : null, dump: keep ? dump : null,
        edits: keep ? { marks: state.edits.marks, outAfter3: state.edits.outAfter3, pos: state.edits.pos, optsAfter3: state.edits.optsAfter3, ticks: state.edits.ticks } : null,
        pendingSup: keep ? state.pendingSup : 0, resultScope: keep ? state.resultScope : null, loadedScope: keep ? state.loadedScope : '' };
      return dbTx('readwrite', function (st) { st.put(rst); });
    }));
    return Promise.all(jobs).catch(function (e) {
      console.warn('Session not saved', e);
      sessInputsDirty = true;                                       // try again with the next save
      setGlobal('This browser did not save the session (' + (e && e.message || 'storage may be full') + '). Everything is still on the page — download the TXT files before closing it.', 'missing');
    }).then(function () { if (!sessQueued) sessPending = false; });
  }
  function restoreInputs() {
    var rin = null, rpos = null;
    return dbTx('readonly', function (st) { return st.get(SESSION_IN); }).then(function (rec) { rin = rec; return rec ? dbTx('readonly', function (st) { return st.get(SESSION_POS); }) : null; }).then(function (rec) {
      rpos = rec;
      if (!rin) return false;
      var any = false;
      if (rin.sup && rin.sup.files && rin.sup.files.length) { state.inputs.sup = rin.sup; any = true; }
      if (rpos && rpos.pos && rpos.pos.files && rpos.pos.files.length) { state.inputs.pos = rpos.pos; any = true; savedPosSig = posSig(); }
      else savedPosSig = '';
      supView.brands = rin.brands && rin.brands.length ? rin.brands : null;
      state.rev++;
      return any;
    }).catch(function (e) { console.warn('Saved session inputs unavailable', e); return false; });
  }
  function restoreState() {
    return dbTx('readonly', function (st) { return st.get(SESSION_ST); }).then(function (rec) {
      if (!rec) return null;
      if (rec.opts) { state.opts = { keep: rec.opts.keep || {}, discontinue: rec.opts.discontinue !== false }; delete state.opts.keep.size; if (state.opts.keep.ws) state.opts.keep.last = true; else delete state.opts.keep.last; }   // v1.15.0: SIZE has no tick; v1.15.3: last price follows the WSP
      if (rec.outView) wb.outView = rec.outView;
      refreshSupSheet(); renderScopes();
      if (!rec.dump || !rec.results || !rec.stage || !requiredReady()) return null;
      if (rec.sig !== inputsSig()) return { changed: true, at: rec.savedAt };
      setGlobal('Putting your last session back (saved ' + rec.savedAt + ')…', 'running');
      // The engine is loaded with the brand scope the results were made with; a different SUP BRAND filter now makes the
      // next run load it again (ensureLoaded compares loadedScope).
      var scope = rec.loadedScope || '';
      return state.engine.ready.then(function () {
        return state.engine.send({ cmd: 'load', sheets: buildSheetsPayload(scope ? JSON.parse(scope) : null) });
      }).then(function () {
        return state.engine.send({ cmd: 'restore', dump: rec.dump, sheets: rec.sheetKeys || [] });
      }).then(function (res) {
        state.loadedRev = state.rev; state.loadedScope = scope;
        state.results = rec.results; state.stage = rec.stage;
        Object.keys((res && res.sheets) || {}).forEach(function (n) { state.results[n] = res.sheets[n]; });
        STAGES.forEach(function (x) { var st = state.stage[x.id]; if (!st || st.status === 'running') state.stage[x.id] = { status: 'ready' }; });
        state.edits = Object.assign({ marks: {}, undo: {}, outAfter3: false, pos: {}, busy: false, optsAfter3: false, ticks: false }, rec.edits || {});
        state.edits.undo = {}; state.edits.busy = false;
        state.pendingSup = res && res.pending !== undefined ? res.pending : (rec.pendingSup || 0);
        state.resultScope = rec.resultScope || null;
        STAGES.forEach(function (x) { var st = state.stage[x.id]; stageSet(x.id, st.status, st.msg); });
        addTxtOutputs();
        if (state.results[SHEETS.OUT]) { renderReview(); }
        renderTabs(); refreshSupSheet(); renderScopes(); updateRunButtons(); renderOutputs();
        if (state.results[SHEETS.OUT]) wbShow('out', true);
        return addWorkbookOutput().then(function () { return { at: rec.savedAt }; });
      });
    }).catch(function (e) { console.warn('Session results not restored', e); return { failed: e.message }; });
  }
  // A session keeps the POS Database it used; say so when the Library has a newer one.
  window.PHFMergeSession = { pending: function () { return sessPending || sessRestoring; } };
  function newerPosNote() {
    var f = state.inputs.pos && state.inputs.pos.files[0];
    if (!LIB || !f || !f.libKind) return Promise.resolve('');
    return LIB.get(f.libKind).then(function (rec) {
      return rec && rec.savedAt !== f.libSavedAt ? ' A newer POS Database is in the Library (built ' + LIB.when(rec) + ') — this session keeps the one it used; remove the POS Database (✕ on its row) and reload the page to use the newer one.' : '';
    }).catch(function () { return ''; });
  }

  // ----------------------------------------------------------------- boot
  function renderAll() { renderInputNav(); renderInputSummary(); updateRunButtons(); renderTabs(); if (wb.active !== 'sup' && wb.active !== 'out') wbShow(wb.active, true); }
  function boot() {
    renderStages(); renderOutputs(); wireBulkDrop(); wireReview();
    $('#supPanel').innerHTML = supSheetHtml(); wireSupSheet();
    renderTabs(); wbShow('sup', true);
    $('#runAllBtn').onclick = function () { runTo('export'); };
    document.querySelectorAll('.wb-run').forEach(function (b) { b.onclick = function () { runTo(b.dataset.run); }; });   // v1.7.1 run bar
    $('#clearAllBtn').onclick = function () { if (state.busy) return; invalidateResults('Results cleared.'); startEngine().then(updateRunButtons); setGlobal('Results cleared. Input files are kept (and stay saved in this browser).', 'info'); };
    $('#railClearSession').onclick = function () {
      removeInputs(M.INPUTS.filter(function (d) { return !d.stored; }).map(function (d) { return d.id; }), 'POS database and supplier rows removed (including rows added in the sheet). Saved reference data is kept.');
    };
    $('#railClearReference').onclick = function () {
      removeInputs(M.INPUTS.filter(function (d) { return d.stored; }).map(function (d) { return d.id; }), 'Saved reference data removed from this browser.');
    };
    renderAll();
    // v1.14.7: say whether the browser protects this site's storage (saved reference tables, the session, the Library)
    if (LIB && LIB.persisted) LIB.persisted().then(function (p) {
      var el = $('#storageNote'); if (!el || p === null) return; el.hidden = false;
      el.innerHTML = p ? '<strong>Storage protected</strong><span>The browser will not clear this site\'s saved files by itself.</span>'
        : '<strong>Storage not protected</strong><span>The browser may clear this site\'s saved files (reference tables, the Library, the session) when disk space is short. To protect them, install the Staff Hub as an app (Chrome menu ⋮ → Cast, save and share → Install page as app) or bookmark it, then reload.</span>';
      el.className = 'sidebar-footer' + (p ? ' is-ok' : ' is-warn');
    });
    var hadInputs = false;
    refLoadAll().then(restoreInputs).then(function (had) { hadInputs = had; renderAll(); return libLoad(); }).then(function (got) {
      renderAll();
      var saved = M.INPUTS.filter(function (d) { return d.stored && loaded(d.id); }).length;
      setGlobal((got && got.length ? 'From the Library: ' + got.join(' · ') + '. ' : '') + (hadInputs ? (got && got.some(function (g) { return g.indexOf('replaces') >= 0; }) ? 'Your Supplier Updates from last time are back. ' : 'Your POS Database and Supplier Updates from last time are back. ') : '') + (saved ? saved + ' saved reference table' + (saved === 1 ? '' : 's') + ' loaded from this browser. ' : '') + readinessText(), requiredReady() ? 'ready' : 'missing');
      if (state.activeInput) showInput(state.activeInput);
      return restoreState();
    }).then(function (r) {
      sessRestoring = false;
      return newerPosNote().then(function (note) {
        if (r && r.at && !r.changed) setGlobal('Your last session is back (saved ' + r.at + ') — results, edits and TXT files. It stays until Clear results, Clear session files or a new run.' + note, 'success');
        else if (r && r.changed) setGlobal('Your input files are back, but they changed since the results were saved (' + r.at + ') — run the stages again.' + note, 'missing');
        else if (r && r.failed) setGlobal('Your input files are back; the saved results could not be put back (' + r.failed + ') — run the stages again.' + note, 'missing');
        else if (note) setGlobal(readinessText() + note, 'info');
        saveSessionSoon(true);
      });
    });
    libSupRefresh();
    if (LIB) LIB.onChange(function (msg) {
      if (msg.action === 'clear' || LIB_SUP.indexOf(msg.kind) >= 0) { libSupRefresh(); return; }
      var use = LIB_LOAD.filter(function (j) { return j.kind === msg.kind; })[0];
      if (msg.action !== 'put' || !use || LIB_SHARED[use.id]) return;
      // v1.14.8: a POS Database saved to the Library while this page is open (Build finished) is loaded straight away when
      // the slot is empty or holds an older Library copy — no reload. A file dropped this session is left alone.
      var cur = state.inputs[use.id], files = (cur && cur.files) || [], f0 = files[0];
      var take = !files.length || (f0.libKind === use.kind && f0.libSavedAt !== (msg.record && msg.record.savedAt));
      if (!take || state.busy || state.edits.busy) { setGlobal('A newer ' + LIB.info(msg.kind).label + ' was saved to the Library (' + LIB.when(msg.record) + '). Reload this page to use it, or keep working with the files loaded now.', 'info'); return; }
      if (files.length) invalidateResults(LIB.info(msg.kind).label + ' replaced by the newer Library copy — run the stages again.');
      libLoad().then(function (got) { renderAll(); if (got && got.length) setGlobal('From the Library: ' + got.join(' · ') + '. ' + readinessText(), 'success'); });
    });
    startEngine().then(function () { updateRunButtons(); }).catch(function (e) { setGlobal('The merge engine could not start: ' + e.message, 'error'); });
  }
  // v1.5.0: when this tool has a password (assets/js/phf-lock-config.js), nothing starts until it is typed.
  function start() {
    var L = window.PHFLock;
    if (!L) { boot(); return; }
    L.guard(LIB_TOOL, { label: 'POS New Product Check Clean', ctl: $('#phfLockCtl') }).then(boot);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
