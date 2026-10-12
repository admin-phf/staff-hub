# PHF Staff Hub structure

## Principle
The Staff Hub is the menu. Each tool is an independent mini-application.

```
staff-hub/
├── index.html                     # Staff Hub home only
├── assets/                        # Shared hub-only assets
│   └── css/hub.css
├── tools/
│   ├── update-specials/           # Existing working project
│   │   └── index.html
│   └── reconcile-ch2/             # New project
│       ├── index.html
│       ├── css/app.css
│       └── js/
│           ├── app.js
│           ├── parsers/
│           │   ├── pos-order.js
│           │   └── supplier-invoice.js
│           ├── core/reconcile.js
│           └── export/report.js
├── docs/
│   └── ARCHITECTURE.md
├── .gitignore
└── .nojekyll
```

## Change isolation
A change to Update Specials should normally touch only `tools/update-specials/`.
A change to CH2 Reconciliation should normally touch only `tools/reconcile-ch2/`.
Change the root `index.html` only when adding/removing a Staff Hub tile.

## Git workflow
- `main` is the live site.
- Create a short branch for each change, e.g. `update-specials/new-layout` or `reconcile-ch2/pdf-parser`.
- Test the branch before merging to `main`.
- Use small commits with clear messages.
- Tag stable releases (`v1.0.0`, `v1.1.0`) so they are easy to restore.

## Data / security
Never commit invoices, POS exports, customer data, passwords, API keys or account information.
Browser-side processing is preferred for reconciliation documents so the input files never become site content.

## Build Master Databases
`tools/database-build/` is an independent browser-side database preparation tool.

Current implemented stages:
1. POS Database — browser port of `MASTER 2.0, Step 1 - Merging PosActive Files Integration & Brand Abbreviation` (POS Builder v5.0.0).
2. Oborne / CH2 — browser port of `MASTER 2.0, Step 2 - CH2 Pricelist Formatter + SOH + Weight & Dimensions Loader` (CH2 Builder v1.0.0).

3. Unique / UHP — browser port of `MASTER, Step 2.5 - UHP Pricelist Formatter, Brand Mapping & Index Generation` (Unique Builder v1.0.0).

All implemented stages keep source business files local to the browser and generate the two Excel workbooks defined by their supplied Python sources. CH2 optional inputs include Brand Abbreviation and Weight & Dimensions. Unique / UHP optionally accepts Brand Abbreviation.


## Database Builder v8.0.0 — Combined Master

- Stage 4: `tools/database-build/master.html`
- Required inputs are the full working outputs from POS, Oborne / CH2 and Unique / UHP.
- Reduced `*_pos_db` outputs are rejected.
- Generates the fixed 98-column selected master used by MASTER Step 3.
- Matching priority: barcode, then Brand + SUB ID, then code with brand validation.
- Primary workbook uses a dark navy/yellow dynamic summary row, pale blue header row, alternating body rows and blue/red price-change emphasis.
- Current v1.0.0 parity validation covers the three required full working files without additional discount / AV inputs.


## Database Builder v10.0.0 (2026-10-05 14:57 AEDT)
- Unified one-screen workflow at `tools/database-build/index.html`.
- Raw source files are uploaded once and retained in browser memory for all stages.
- Generated full POS, CH2 and UHP models feed Combined Master directly without download/re-upload.
- Output filenames follow the original Python scripts with Melbourne date-based names.
- Unique/UHP downloads use persistent browser download links rather than hidden programmatic button downloads.


### Database Builder v10.0.0 layout
- Full-width database-builder workspace.
- Persistent left navigation for Overview, POS, Oborne/CH2, Unique/UHP, Combined Master and All Outputs.
- Selected stage workspace and its generated files are displayed on the right.
- Combined Master reuses full Stage 1–3 in-memory models; no re-upload is required.


## Database Builder v11.0.0 (2026-10-05 14:57 AEDT)

- Adds `SRC_POS_ONGOING_DISCOUNTS` as an optional Universal / Shared input used by Combined Master pricing.
- Discount parser supports the current summary-row + row-2 POS_* heading layout and the Step 3 greatest-discount hierarchy.
- Full 38,386-row pricing comparison against the supplied Step 3 Python completed with zero pricing-field mismatches.
- Reorganises inputs into compact left-rail groups: POS Inputs, Universal / Shared, Oborne / CH2 Inputs, and Unique / UHP Inputs.
- Selecting an input opens only that input's upload/replacement workspace on the right; files remain held once in browser memory.
- Database outputs continue to appear on the right and pass between stages in memory without download/re-upload.


## Database Builder v12.0.0
- Balanced shared PHF header/breadcrumb styling.
- Staff Hub landing page uses full viewport width.
- Database input rail accepts direct drag-and-drop onto each input item.
- Four database build stage names standardised across navigation and workspaces.


## Database Builder v13.0.0
- Universal Staff Hub top shell across live tools.
- Full-width content workspaces.
- Content-aware input validation.
- Availability / To-Order input and Step 3 order output.
- Combined Master independently outputs full + 98-column selected master; order file when availability exists.


## v14.0.0 UI
- Universal compact PHF header across live tools.
- Database Builder uses a single operational dashboard: input rail left, all four build actions and outputs visible together on the right.

## v15.0.0 — Universal shell stability and database dashboard density
- Fixed Update Specials universal-header logo source and guarded the removed legacy topbar logo hook so the page opens directly into Update Specials instead of exposing its obsolete embedded Staff Hub home.
- Cache-busted the shared PHF logo/header assets.
- Standardised the shared header proportions across Staff Hub, Specials, Reconcile CH2 and Database Builder.
- Reworked the single-screen Database Builder stage area from four narrow vertical cards to a compact two-by-two action dashboard on desktop.
- Reduced empty card height and kept stage status, build control and outputs together.
- Tightened the input rail and readiness summary while preserving direct drag/drop and independent stage execution.

## v19.0.0 — Unified theme (05 Oct 2026 19:30 AEDT)
- New shared `assets/css/theme.css`, linked last on every page; colours from Reconcile CH2 → POS layout. See `docs/THEME.md`.
- Every panel heading is a navy band with gold capitals; step numbers are gold circles.
- One state language: red = required/missing, grey = optional/waiting, blue = ready/drag-over/running, green = loaded/built/download.
- Shared header: full-width card aligned with page content, navy title, gold version tag, inline SVG icons instead of emoji.
- Staff Hub home: tools grouped under one navy band; LIVE green, BUILD blue, SOON grey.
- Reconcile CH2: dropzone and step badges follow the loaded files (CSS only — reconcile JS unchanged). Reference Admin cards turn red/green by load state.
- Build Master Databases: rail rows show REQUIRED / OPTIONAL / LOADED, readiness chips red/green/grey, stage status lists the missing files, READY badges blue. Duplicate page title removed from the intro.
- Fix: `updateMasterReadiness()` was called but never defined in `pipeline.js`, which stopped page start-up before Build All and Clear Session were wired. It now fills the Combined Master readiness chips.
- Update Specials: editor chrome only (panels, tabs, layout buttons, tick boxes, preview bar). Slide artwork and exports unchanged.

## Reconcile CH2 v2.7.0 — Build Master Databases layout (06 Oct 2026 02:45 AEDT)
- Reconcile CH2 now uses the same screen layout as Build Master Databases: **Input files** rail on the left, workspace on the right.
- Rail groups: **Reference data** (POS / master, Supplier + discount rules: saved in this browser) and **Order files** (POS back-end order, Supplier invoices: session only). Each row is red REQUIRED until loaded, then green LOADED, and blue while a file is dragged over it.
- Files can be dropped straight onto a rail row. Reference files dropped there are validated and saved with the same checks as the Reference admin page.
- Clicking a row opens its detail card (dropzone, loaded files, Used by / Storage / Status).
- Workspace: Input readiness (x / 3 READY), the Reconcile stage card (Run / Clear, status, progress) and **Generated output files** (mirrors the four result downloads).
- The reconciliation result (KPIs, receiving checklist, POS layout table) stays full width below so the table keeps its width.
- New files: `tools/reconcile-ch2/js/ui/workspace.js`, `tools/reconcile-ch2/css/workspace.css`. The engine is unchanged apart from one hook that lets the rail refresh the reference status, plus wording of the "reference data not ready" message.
- `assets/css/theme.css` v20: the rail / readiness / stage / output rules are shared by both pages (`:is(body.phf-page-db, body.phf-page-reconcile)`), so they cannot drift apart. Other pages are pixel-identical to v19.

## Database Builder v21.0.0 — Combined Master v2.0.0 (06 Oct 2026 13:55 AEDT)
- `js/master-core.js` is now a readable, line-for-line browser port of MASTER Step 3 V30.15 (no pandas, no database; runs in the browser when used):
  POS value cleaning (POS_MAIN_ID padded to 13), raw CR666a SOH overlay by customer account / branch (only Melbourne, Newcastle,
  Adelaide, Brisbane and Perth feed SOH and fulfilment), discount matrix (OD_* or POS_* layout incl. `SRC_POS_ONGOING_DISCOUNTS`),
  pricing, availability + warehouse fulfilment, sort by MASTER_BRAND then MASTER_BARCODE, and the same output columns.
- `js/xlsx-writer.js` (new) writes the three master workbooks with Python's layout: blue header row, banded rows, AV/OF highlight,
  red price increases, number formats, freeze panes, autofilter, SUBTOTAL totals row, ORDERED ☐ + grey-out rule in the order file.
  It streams rows through the browser's CompressionStream, so the 38k-row masters are written in seconds.
- Verification: with `matchMode:'python'` the engine reproduces the Python V30.15 outputs cell for cell on the 05/06 Oct 2026 inputs
  (full, selected and order files; only stray control characters such as `_x0002_` are cleaned).
- Improved supplier matching (default): every CH2 / Unique row is scored on BARCODE (cleaned and unified to the POS 13-digit form),
  SUB ID, BRAND (incl. brand abbreviations, discount brand prefixes, ZZZ discontinued prefixes, initials, brand word in description)
  and W/S (within 40% or $0.50 of POS W/S or last price; Unique unit W/S also checked). A link needs at least 2 points including
  BARCODE or SUB ID (SUB ID + W/S alone also needs a shared description word); the best-scoring row wins where barcodes repeat.
  Single-point barcode links are held back and listed in the new `MATCH_BASIS` column (full file only), which shows the points behind
  every link. Every CH2 and Unique row now appears exactly once as matched or "Only".
- POS inputs stay as BIFF `.XLS`; every input accepts `.xls`. The output list is fixed in the order POS → CH2 → Unique → full → selected → order,
  and the full merged dataset downloads automatically when Combined Master finishes. The finish message no longer gets overwritten.

## Staff Hub v21.5.0 — Database Builder v21.5.0 / Combined Master v2.3.0 + Reconcile CH2 v2.8.0 (08 Oct 2026 17:20 AEDT)
- `tools/database-build/js/master-core.js` v2.3.0 (points mode): barcode first (a barcode match links on its own; barcode-only
  links are flagged), then SUB ID / brand / W/S with 2+ points, then brand + description (+ W/S) for rows still unlinked —
  `matchByDescription()` normalises descriptions (brand words and brand prefixes such as HG / BIOC removed, pack sizes unified,
  POS ".." truncation handled), requires compatible sizes, full coverage of the shorter description and mutual best choice.
  Links are one-to-one per supplier (`linkSupplier()` greedy by strength); CH2-only and Unique-only rows are kept again
  (CH2-only rows link one-to-one to free Unique rows); To-Order PLUs that are not in POS become "AV Only" rows.
  Python mode is unchanged and still matches V30.15 cell for cell.
- Full master = Python columns + `MATCH_BASIS` + `AV_SOURCE_ROWS` + `OD_*` discount-rule audit columns, plus
  `Ongoing_Discounts_Source` and `To_Order_Source` sheets. Selected (98) and order files unchanged.
- `pipeline.js`: `validateSheets()` (shared by individual controls and the new "Drop All Input Files Here" panel),
  `identifyFile()` / `bulkAccept()` / `renderBulk()`; verification returns warnings shown on the output row; the full master
  downloads when Combined Master finishes (`autoDownloadFull()` + fallback button in `#autoDownload`).
- Reconcile CH2 v2.8.0: `pos-import.js` imports Found quantities (overs / unders) with the CH2 invoice prices; every price /
  data / integrity check is a warning; only the 15-column / CRLF self-checks and "no supplied rows" stop the TXT. `app.js` no
  longer gates downloads on `runIntegrity.ok`; `report.js` returns Excel layout checks as notes. `workspace.js` adds the
  "Drop All Input Files Here" panel (identifies master / rules / POS order / invoices and routes them to the existing handlers).

## Staff Hub v21.6.0 — Reconcile CH2 v2.9.0 (09 Oct 2026 00:26 AEDT)
- `pos-import.js`: `posActivePrediction(records, matchCheck)` models POSActive after import (matched Sub IDs only; AdjDPrc =
  Extended ÷ Qty to the cent; totals with the product GST %), returned on each built file as `posActive`. `posActiveMatchCheck`
  flags Sub IDs containing % $ " (POSActive's import drops them). GST REVIEW / POSACTIVE CANNOT MATCH export notes.
- `app.js`: `gstReview()` (invoice GST vs POS GST per row, cached per result) feeds the GST differences panel, review note and
  the GST % cell chip; the balancing panel adds "POSActive after import (predicted)". POS Layout column plan is compact
  (narrow numeric columns with an 11px heading, zero-width wrap points in AdjRRPrc etc., 7px sort gutter) and pins the Total
  column and footer totals right (`table.pos-overflow`) when the window still scrolls.
- Rails: `#railClearOrder` / `#railClearAll` (workspace.js) and `#railClearInputs` (pipeline.js; outputs kept).
- Every tool page's title block is `a.phf-shell-title` linking to the Staff Hub (`assets/css/shell.css` v21.6.0).

## Staff Hub v21.7.0 — POS Supplier Merge v1.0.0 (10 Oct 2026 02:30 AEDT)
- New tool `tools/pos-supplier-merge/` and a Staff Hub tile. The POS Supplier Merge Google Sheet (Apps Script v6.3.87)
  now runs in the browser with the Build Master Databases layout: Input files rail, Drop All Input Files, input readiness,
  three stage cards, Run All, generated output files, and a full-width OUT_MERGED_DATA review table.
- Engine parity: the four Apps Script files are kept **unchanged** in `engine/` and run in a Web Worker on
  `js/sheets-shim.js`, an in-memory stand-in for SpreadsheetApp / Utilities / PropertiesService / LockService / HtmlService
  (values, formulas used by OUT_MERGED_DATA, notes, number formats for display values, filters, rows / columns).
  Formatting calls are accepted and ignored. Opened from a file, the engine runs in `engine-frame.html` instead.
- Inputs: POS Database (Stage 1 POS DB output of Build Master Databases = TMP_MERGED_POS_DATA), Supplier Updates
  (CH2 / UHP `_pos_db` outputs = IN_SUPPLIER, several files combined) for this session; SRC reference tables saved in
  this browser (IndexedDB `phf-pos-supplier-merge`). A downloaded copy of the Google Sheet fills every input from its tabs.
- Outputs: the POS INSERT / POS UPDATE TXT files from EXPORT POS FILES, and a review workbook (XlsxLite) with
  OUT_MERGED_DATA, OUT_POS_INSERT, OUT_POS_UPDATE, supplier STATUS and reference tabs.
- Verification: on the 09 Oct test data (1,149 POS + 623 supplier rows) both TXT files are byte-identical to the Apps
  Script run through the test harness; 31,149 POS + 2,523 supplier rows run in about 8 seconds.
- Theme: the page uses `database-builder-page phf-page-db phf-page-merge`, so it takes the Build Master Databases theme
  rules unchanged; tool-only rules (three stage columns, amber "recommended" rows, review table) are in
  `tools/pos-supplier-merge/css/merge.css`. `assets/css/theme.css` is unchanged.

## Staff Hub v21.8.0 — Combined Master v2.4.0 + POS Supplier Merge v1.1.0 (10 Oct 2026 11:30 AEDT)
- `tools/database-build/js/master-core.js` v2.4.0 — link checks. Every POS → CH2 / Unique link is re-checked on six points,
  the same idea as the POS Supplier Merge sheet's BC · SUB ID · BRAND · WSP · TEXT columns: BC (barcode), SUB ID, BRAND,
  W/S (40% / $0.50, the matching rule), TEXT (description similarity with brand words removed ≥ 50%) and SIZE (pack sizes in
  the two descriptions, 2% rounding allowed). `linkChecks()` → `applyChecks()` fills 16 columns after MATCH_BASIS:
  `CHK_CONFIDENCE`, `CHK_{CH2|UHP}_BC / _SUBID / _BRAND / _WS / _TEXT / _SIZE / _SCORE` and `CHK_FLAGS` (why a link is weak).
  HIGH = 4+ agree including the barcode or SUB ID · LOW = 2 or fewer or the pack sizes conflict · MEDIUM = between;
  CHK_CONFIDENCE is the weaker of the two links, NO LINK (POS only) or NOT IN POS. Matching itself is unchanged.
  Column names use a `CHK_` prefix so no new heading matches Reconcile CH2's product-code aliases.
- `buildAudit()` → `result.audit` (summary, totals, every LOW / MEDIUM link). `writeMasterWorkbook('full')` adds two tabs
  after Full_Data: **Match_Audit** (counts per supplier + what each check means) and **Links_To_Check** (one row per LOW /
  MEDIUM link: checks, why, POS vs supplier barcode / Sub ID / brand / description / W/S, and a link to the Full_Data row).
- Full file styling = Reconcile CH2 look (`RC`, `themeKit()`): navy / gold header, E9F0F5 / F5F5F5 bands, ↑ / ↓ / — price
  formats on NEW_WSP / NEW_LAST_PRICE / NEW_RRP and the change columns, coloured checks, navy / gold totals row; the
  Ongoing Discounts / To-Order source tabs take the same header and bands. Selected and To-Order files are unchanged.
  Row 1 = headings and the `📊 FILTERED TOTALS:` row stay, so `verifyMasterWorkbook` and Reconcile CH2 read it as before.
- `tools/database-build/js/xlsx-writer.js` XlsxLite v1.1.0: optional font name, `gridLines:false`, cached number result for
  formulas. Existing callers unchanged (Calibri when no name).
- `pipeline.js` v21.8.0: Combined Master message adds "match checks: HIGH · MEDIUM · LOW".
- `tools/pos-supplier-merge/` v1.1.0: Supplier Updates sheet under the Supplier Updates card (`supSheetHtml()`,
  `drawSup()`, `pasteToSupplier()` in `js/app.js`, `.sup-*` rules in `css/merge.css`). Shows the Sheet's row-1 totals bar
  (TOTAL · ⭐ MATCHED · 🟢 NEW · 🚫 NOT USED · ⚠️ UNMATCHABLE, supplier names, POS suppliers, unique barcodes, unique brands,
  total WS / RRP, the stage-1 STATUS summary — worked out on the page over the rows the search leaves visible), the 16
  headings and every supplier row (STATUS coloured after stage 1). Ctrl+V / ⌘V pastes rows from Excel or Google Sheets
  (headings in any order, or by position A–P / B–O / B–P) into a "Pasted rows" supplier entry; undo, clear pasted rows and
  copy headings. Pasted rows give byte-identical TXT files to dropping the same rows as a file.

## Staff Hub v21.8.1 — POS Supplier Merge v1.1.1 / engine v6.3.88 (10 Oct 2026 14:45 AEDT)
- `tools/pos-supplier-merge/engine/1.3-merge.js` v6.3.88 (same file as the Google Sheet's 1.3 Merge): discontinued scope
  DS1. A POS product with no supplier row is discontinued when its brand is in the upload — now including every POS
  name of an uploaded brand, not only a POS brand spelled exactly like SUP BRAND (or mapped in Brand Name Changes):
  T the 20-character POS brand form (BIOCEUTICALS CLINICA = BIOCEUTICALS CLINICAL); W a POS brand the upload's
  barcodes match, when the names share a distinctive word or one starts the other (AUSTRALIAN BUSH FLOW = BUSH
  FLOWER); M 2+ barcode matches covering half the POS brand's rows when the names differ (RESTQ = MARTIN & PLEASANCE).
  Placeholder POS brands (DISCONTINUED, UNKNOWN, BOOK…) are never linked; SPECIAL ORDER / NO REORDER stay protected.
  Linked rows carry "BRAND LINK: …" in NOTES and the build message counts them. The filtered-brand build re-reads TMP
  with the linked POS brand keys (`m13DS1ExtendFilteredScope_`). Only 1.3 Merge changed.
- Check on the 10 Oct data (34,252 POS, full 9,682-row CH2 list): every v6.3.87 OUT row unchanged, plus 440 discontinued
  rows from 48 linked POS brand names; standard test data unchanged (TXT files byte-identical).

## Staff Hub v21.9.0 — POS Supplier Merge v1.2.0 (10 Oct 2026 19:10 AEDT)
- Includes v21.8.1 (engine v6.3.88 discontinued brand scope), which was not committed separately.
- `tools/pos-supplier-merge/js/app.js` v1.2.0 — the IN_SUPPLIER sheet is editable and always shown in
  `section#supPanel` (full width between `.builder-shell` and `#reviewPanel`). `supModel()` lists every supplier row with
  its file entry; cell edits / paste / add / delete go through `supMutate()` (one undo snapshot per change, then
  `supCommit()`: input updated, `state.rev++`, stages reset). Paste at the selected cell (`pasteAtCell`), by heading, or
  by position with a data check (`supRowsLookRight`). Typed / pasted rows live in an `added` "Added rows" entry; edited
  cells carry `row.__ed` (dropped by `M.sheetRows`, so the engine payload is unchanged). INDEX / STATUS are read-only.
- Rail: `.input-nav-wrap` + `.input-nav-del` ✕ per loaded input → `removeInputs(ids)` (also used by both clear buttons;
  no confirmation; saved reference deleted from IndexedDB; drop-list rows for those inputs removed).
- Check: pasting the 623-row supplier list (A–P, no headings) at A3 gives TXT files byte-identical to dropping the file.

## Staff Hub v21.10.0 — Staff Hub Library (10 Oct 2026 19:40 AEDT)
- `assets/js/phf-library.js` (PHFLibrary v1.0.0): files saved in this browser and shared by every tool. IndexedDB
  `PHFStaffHub` / store `referenceFiles` (keyPath `kind`) — the store Reconcile CH2 already used, so its `posMaster`
  entry is the same file Build Master Databases saves. One record per kind (newest replaces older):
  `{kind, name, size, type, lastModified, savedAt, blob, source, meta}`. API: put / get / list / remove / clearAll,
  toFile, when / ago / isStale (> 24 h), info (KINDS: label, made, used), dismiss / isDismissed (per tool),
  onChange (BroadcastChannel `phf-library`), estimate. Asks `navigator.storage.persist()` on the first save.
- Kinds: `lib:pos-db`, `lib:ch2-db`, `lib:uhp-db`, `posMaster` (full master), `lib:master-selected`, `lib:to-order`
  (Build Master Databases outputs, `LIB_OUT` in pipeline.js); `lib:ref-brand`, `lib:ref-box`, `lib:ref-discounts`
  (reference inputs, `LIB_REF`, reloaded on open by `loadLibraryRefs()`; Remove deletes the saved copy);
  `supplierMerge` (Reconcile CH2 rules). `parsedReferenceCache` stays hidden (Reconcile's parsed copy).
- Build Master Databases v21.10.0: outputs saved by `addOutput()` (row shows "saved to Library").
- POS Supplier Merge v1.3.0: `libLoad()` after the saved reference; POS Database + supplier imports + Ongoing
  Discounts fill empty inputs; `libForget()` on ✕ / Remove (dismiss until a newer build; shared discounts deleted);
  stale (> 1 day) rows amber; a newer build saved in another tab shows a reload message.
- Reconcile CH2 v2.9.2: `referenceStore.clear()` without a kind now removes only its own kinds (posMaster,
  supplierMerge, parsedReferenceCache) instead of clearing the whole store.
- Home page: Library panel (`assets/js/hub-library.js`, `assets/css/library.css`) — list, Download, ✕, Delete all,
  storage used.

## Staff Hub v21.10.1 — compact card layout + POS Supplier Merge v1.3.1 supplier scope (10 Oct 2026 21:30 AEDT)
- `assets/css/compact-layout.css` (v1.0.0, linked after theme.css by Build Master Databases, POS Supplier Merge and
  Reconcile CH2): cards side by side, nothing removed. `.builder-workspace` is a size container (`phf-ws`) so rows
  react to the space beside the input rail. `.dash-row` = a row of panels (each its own height; a hidden panel takes
  no column; one column under 900 px of workspace). Band headings keep their badge on the right and wrap inside.
  - Build Master Databases v21.10.1 / POS Supplier Merge: `.dash-row-inputs` = selected input · Input readiness ·
    Build all / Run all; stage cards in one row (Build Master Databases 3 × 1fr + 1.45fr for Combined Master from
    1180 px of workspace, 2 × 2 from 900 px).
  - Reconcile CH2 v2.9.3: `.dash-row-inputs` (selected input · readiness) and `.dash-row-run` (stage · Generated
    output files). Results: `.result-pair` = Invoice → POS order link | POSActive import keys; `.pos-check-pair`
    (app.js, only when both exist) = Not on POS order | GST differences. One column under 1100 px.
  - Drop All results and generated output files: grid `repeat(auto-fill, minmax(520px, 1fr))` (two columns on a
    full-width panel); first-line rules clipped by the list.
- theme.css v20.0.1: the 7 `.builder-workspace>.panel` rules now read `:is(.builder-workspace,.dash-row)>.panel`.
- POS Supplier Merge v1.3.1: `LIB_LOAD` = POS Database + Ongoing Discounts only. `LIB_SUP` (`lib:ch2-db`,
  `lib:uhp-db`) are added only by the "+ Add … " buttons (`libSupAdd`, hosts `[data-lib-sup-host]` on the sheet and
  the Supplier Updates card), because a whole catalogue widens stage 2 to every brand in it. `supScopeHtml()` =
  "Brands in this merge: N" with row counts per SUP BRAND (column E) and added-here / from-files totals.
- PHFLibrary v1.0.1: the supplier imports are labelled "POS Supplier Merge (Add button)" on the home page.

## Staff Hub v21.11.0 — renamed tools, wireframe layout, workbook tabs (11 Oct 2026 10:55 AEDT)
- Names: **Build POS Master Databases** ("Cleaning and Merging and Appending CH2 and Unique DB to POS"; was Build Master
  Databases, v21.11.0) and **POS Supplier New Product Check and Clean Merge** ("Import, Update, Discontinue and Clean
  Products and/or Supplier information against current POS Database"; was POS Supplier Merge, v1.4.0). Folders and web
  addresses are unchanged. PHFLibrary v1.0.2 labels; `displayName()` shows the new name for records saved under the old.
- `assets/css/compact-layout.css` v1.1.0: `.dash-row-top` = Drop All · selected input · readiness (+ Build / Run all
  stacked in a `.dash-stack`). ≥ 1240 px of workspace: 1.6fr · 1.2fr · 1fr (1.6fr · 1fr until an input is picked);
  900–1239 px: Drop All · readiness with the selected input under them; below: one column. Merge tool: `.dash-row-stages`
  = 3 stages (3fr) + Generated output files (1fr). Build POS Master Databases: 4 equal stage cards; Combined Master's
  callouts in `<details class="master-how">` ("How Combined Master works"). theme.css v20.0.2 covers `.dash-stack>.panel`.
- POS Supplier New Product Check and Clean Merge v1.4.0:
  - Workbook (`#workbook`): `WB_TABS` in the Sheet's order / colours; `wbShow(id)` shows the IN sheet (`#supPanel`), the
    OUT review (`#reviewPanel`, Review columns or All columns via `#reviewGrid`) or a read-only sheet (`#wbSheetPanel`,
    `#wbGrid`). Data: `state.results[sheet]` (OUT / INS / UPD; SRC_ with SRC STATUS after stage 2) or the loaded input
    (`M.sheetRows`). Stage 2 opens OUT_MERGED_DATA. `js/sheet-grid.js` (PHFSheetGrid v1.0.0): virtual rows (gap rows above
    / below, re-drawn on scroll), row numbers, column letters, banding, `accentFor` status colours, search.
  - Supplier sheet: `SUP_PAGE` paging replaced by a drawn window (`supWindow`, `drawSupRows`, `supShowRow`, 40-row buffer,
    measured row height); banding by class (`sup-b0` / `sup-b1`).
  - Review NOTES clamp to 4 lines (`.rv-clamp`, click to open).
  - Engine fidelity: sheets-formula / sheets-shim v1.0.1 — `TO_TEXT(ref)` returns the displayed text (`ctx.text`).
    Verified against the user's 11 Oct Google Sheet export: IN STATUS, OUT_MERGED_DATA (73 columns), OUT_POS_INSERT and
    OUT_POS_UPDATE identical.
- Reconcile CH2 v2.9.4: `.dash-row-top` (Drop All · selected input · readiness); `#resultTable` row hover = translucent
  yellow `background-image` over each cell's own colour.


## Staff Hub v21.12.0 — editable merge sheets, Google Sheet look, password lock, merge v6.3.89 (11 Oct 2026 15:50 AEDT)
- POS Supplier New Product Check and Clean Merge v1.5.0:
  - `js/sheet-grid.js` PHFSheetGrid v1.1.0: thead = column letters (`tr.wbg-letters`) · row-1 totals (`tr.wbg-tot`, from
    `opts.totals(visibleRows)`) · row-2 headings (`tr.wbg-headrow th[data-hc]` + `.wbg-filt` column-value filter); body cells
    `td[data-r][data-c]` (r = position in the visible list, c = displayed column; `data-c="-1"` row numbers; the blank row
    under the last row adds rows). `cols` = source columns shown (OUT drops `__EXPORT_VISIBLE__`). Editing reports
    `{type:'cells', cells:[{i, c, v}]}` / `{type:'deleteRows', rows}` to `edit.onChange`; the page applies it and calls
    `set({…, keepView:true})`. `busy()`, `note()`, Undo through `edit.onUndo` / `edit.canUndo`.
  - `js/sheet-look.js` PHFSheetLook v1.0.0: per sheet — SCHEMA totals (SUBTOTAL ones over the visible rows, SUM / COUNTIF /
    UNIQUE over all rows), OUT_MERGED_DATA conditional formats (ensureOutMergedConditionalFormatting_ rules as
    `style(row, c) → {bg, fg, b}`), centreDataCols, read-only output columns, SRC_POS_ONGOING_DISCOUNTS H/I display.
    Used by the grid and by the review workbook (row 1 = totals, cells = the same colours).
  - Edits: SRC_ tabs → `srcEdit` (rows of `state.inputs[id].files`, `refSave`, `state.rev++`, `invalidateResults`,
    `srcUndo[id]` snapshots). OUT_MERGED_DATA / OUT_POS_* → `engineSheetEdit` → engine `{cmd:'edit', op:'cells', blocks}`
    (`deleteRows` / `appendRows`) → updated display rows; `state.edits` = marks, engine undo depth, `outAfter3`, `pos`.
    `#outActions` (Refresh supplier changes = step `refresh` / Run stage 3 again), `#wbActions` (Export TXT again = step
    `export`; Run All Stages on SRC_). Stage 3 adds `refresh` first while `state.pendingSup > 0`.
  - `js/engine-host.js` v1.1.0: `edit` sets the cells in the in-memory Sheet (text in '@' / SCHEMA textCols) and calls the
    script's `onEdit({range, source})` per block; touched rows (or the whole sheet after row deletes / adds) are snapshotted
    with the `_M13_SUPPLIER_QUEUE` sheet and document properties for `undo`. `run` clears the undo history; `build`
    clears the supplier-change queue first. Results carry `pending` (queued G rows).
  - `js/sheets-shim.js` v1.0.2: `range`, `source`, `value`, `oldValue`, `user`, `authMode`, `triggerUid`, `changeType` read
    as undefined on Sheet / Range objects (they were no-op proxies), so `applyOutMergedSupplierPendingStyleFromEdit_(sh)`
    no longer mistakes a sheet for an onEdit event. No change to merge results (11 Oct run identical).
  - Default OUT view = Sheet (all columns, editable); Review columns unchanged.
- Merge engine 1.3 Merge v6.3.89 (`M13.VERSION 'v6.3.89-brand-length-size-type-v1'`; 1.0 / 1.1 / 1.2 unchanged):
  - BE1: `m13BE1BrandsEquivalent_` (20-character cut, or same word count ≥ 2 with only the last word cut to ≥ 3 letters),
    `m13BE1TranslateSupplierBrand_` (an unlisted SUP BRAND → the one longer listed brand it is short for; names from the
    brand map rows + `m13BE1RegisterNames_` of the Ongoing Discounts POS MASTER BRANDs), used in `m13MakeSupplierObj_` and
    the filtered-build scope. `m13BuildOneOutRow_` keeps the POS brand when equivalent (no OLD BRAND);
    `m13BestDiscountForSupplier_` brand buckets also accept the equivalent matched POS brand; BRAND audit / score / P6
    relink use the same test. POS brand translation (`m13TranslateBrand_`) is unchanged.
  - SZ1: `m13SZ1PosSizeForBareCount_` in `m13ReconcileProductDescription_` (bare Q count, same count with a form in O →
    O's size / form; O added to the acronym evidence), `m13SZ1RestorePurgedPosWords_` (marketing-purge words in Q and O go
    back after the same word as in O, ≤ 35 characters). `m13MarketingPhrases_` / `m13MarketingPhraseRegex_` split out of
    `m13StripMarketingPhrases_` (same list and regex).
- `assets/js/phf-lock.js` v1.0.0 + `assets/js/phf-lock-config.js`: `PHFLock.guard(tool, {label, ctl})` resolves when the
  tool is open (no entry, remembered in localStorage `phf-lock:<tool>` = hash, or the right password — WebCrypto PBKDF2
  SHA-256, 150,000 rounds, 16-byte salt). Set password downloads a new config to commit. The hub marks locked tiles
  (`a.tile[href*="/tools/<tool>/"]` → `.badge.lock`). Styles are injected by the script. Merge tool: `start()` waits for it.

## Staff Hub v21.13.0 — Supplier Contacts, one Ongoing Discounts file, POS New Product Check Clean (12 Oct 2026 04:40 AEDT)
- Hub tile order: Build POS Master Databases · Reconcile CH2 Order · Supplier Contacts · Update Specials · Customer Special
  Orders · Resources · New Products (Soon) · POS New Product Check Clean (`.badge.dev` "In development", `assets/css/hub.css`).
- `tools/supplier-contacts/` v1.0.0 (new): `index.html`, `css/contacts.css`, `js/contacts.js`. One table of supplier and
  utility contacts. Search = every word in any field (digits also match phone numbers typed without spaces), `<mark>`
  highlights. Rows band E9F0F5 / F5F5F5, utilities (Section = Utility, always below the suppliers, after an orange
  "Utilities" divider) FDEADA / FCD5B4; Reconcile's yellow hover (`background-image` over the row colour). Actions column
  and Supplier column stay in view (sticky). Add / edit (`<dialog>`, all fields, duplicate-name check, new rows go to the
  end of their section), delete straight away, Undo (50 steps), Download .xlsx (ExcelJS: navy / gold header, frozen
  heading + Supplier, filter, conditional formats so the bands survive sorting) and .csv (UTF-8 BOM, CRLF).
  Storage: Library kind `lib:contacts` (the .xlsx itself, saved 0.3 s after each change; CSV if ExcelJS is unavailable).
  The data is never in the repository — each computer loads the file once. Reader (`fromMatrix`): heading row in the first
  15 rows (Supplier or *ContactName), columns by name in any order, unknown columns kept as extra fields, no Section column →
  rows after "Totally Workwear Moorabbin" are utilities (so the Monday Orders / V8 files load directly too).
- `assets/js/phf-library.js` v1.1.0: kind `lib:contacts` (`keep: true` — `clearAll()` / hub Delete all leaves it);
  `lib:ref-discounts` is also Reconcile's discount file and clears Reconcile's `parsedReferenceCache` (`PARSED` kinds);
  `supplierMerge` = "POS DB & Supplier Merge workbook" (Reconcile extras); RENAMED maps both old merge-tool names.
- Reconcile CH2 Order v2.10.0: the discount row is **Ongoing Discounts** (`refKind 'lib:ref-discounts'`).
  `reference-data.js` v2.10.0 — `saveDiscounts(file)`: a plain discount file (one sheet / CSV) → `lib:ref-discounts`; a
  workbook with more sheets (POS DB & SUPPLIER MERGE) → its SRC_POS_ONGOING_DISCOUNTS sheet (formulas dropped, values kept)
  as `SRC_POS_ONGOING_DISCOUNTS (from <name>).xlsx` in `lib:ref-discounts` + the whole workbook as `supplierMerge`.
  `status().supplier` = discounts || supplierMerge. `parseSupplierRefs`: discount rules from `lib:ref-discounts`; supplier
  names, CH2 supplier links and brand changes from `supplierMerge` when present. `shareLegacy()` (on open): a
  `supplierMerge` saved before v2.10.0 with no `lib:ref-discounts` → its discount sheet becomes the shared file.
  `clear('lib:ref-discounts')` removes both; `save()` goes through `PHFLibrary.put` (source "Reconcile CH2 Order") so other
  tabs update. The rail listens to `PHFLibrary.onChange`. Reconcile pages now load `assets/js/phf-library.js`.
- POS New Product Check Clean v1.5.1 (was POS Supplier New Product Check and Clean Merge; folder unchanged).
  `shareToLib(id, file, sheets, tab, entry)`: Ongoing Discounts from its row or from Drop All goes to `lib:ref-discounts`
  (before, Drop All did not save it); from a workbook with more tabs only that tab, as `SRC_POS_ONGOING_DISCOUNTS (from
  <name>).xlsx`, so Build POS Master Databases (which reads the first / active sheet) and Reconcile can use it.
  `assets/js/phf-lock.js` v1.1.0: the prompt is "Still under development" with a password box (light overlay, amber
  icon, Back to Staff Hub as the main button); `guard()` draws Lock / Password only after the tool opens and Lock clears
  them while the prompt shows; `markTiles()` turns a locked tool's tile badge into `.badge.dev` "In development".

## Staff Hub v21.13.1 — Supplier Contacts v1.1.0 (12 Oct 2026 07:45 AEDT)
- Columns: Supplier, Code / Product Group, Account # / Notes, Phone Numbers, Fax Number, Email, Accts Email (+ Section in
  the file). `DROPPED` headings (Index, 100% GST / GST, Min Order) are skipped by `fromMatrix` and reported in
  `t.dropped`; a Library copy that still has them is saved again on open.
- Text only: `textMatrix(ws)` / `cellText(c)` read each cell as stored (numbers as plain digits, `toFixed(0)` for integers;
  booleans TRUE / FALSE; a date-formatted number keeps its shown date via `XLSX.SSF.is_date`), read with `cellNF: true`;
  CSV stays text (`raw: true`). The .xlsx download writes strings only, with `numFmt '@'` on every cell and column.

## Staff Hub v21.14.0 — POS New Product Check Clean v1.6.0: session kept, filters at every step, Update in POS ticks (12 Oct 2026 10:30 AEDT)
- Session (js/app.js): records `__session_inputs` (Supplier Updates, SUP BRAND filter, POS signature), `__session_pos` (the
  POS Database, written only when it changes) and `__session_state` (stage states, `state.results` incl. TXT base64, edit
  marks, options, `resultScope` / `loadedScope`, input signature `inputsSig()` and the engine dump) in the tool's own
  IndexedDB store. `saveSessionSoon(inputsToo)` (1.2 s debounce, never while a stage / edit runs) after runs, edits, option
  and input changes; `boot` → refLoadAll → `restoreInputs` → libLoad → `restoreState` (engine `load` with the restored
  inputs, then `restore`; only when `inputsSig()` matches) → `newerPosNote`. `sessRestoring` blocks saves until then.
- engine-host v1.2.0: `dump` (every sheet but TMP_MERGED_POS_DATA: own fields except ss / _proxy / filter, plus document
  properties) / `restore`; run options — `generate` + `visible` (overrides `m13BuildVisibleRowSetFromHelper_` and runs
  `generateInsertUpdateSheetsFromFilteredData`), `generate` + `keep` / `discontinue:false` (wraps `m13BuildUpdateOutputRow_`
  to tag the row status and `m13BuildPosOutputRowsFromOut_` to put TMP values into the kept columns of MATCHED rows, drop
  rows the same as POS on `SAME_COLS`, drop DISCONTINUED rows, renumber POS INDEX; result `info` {kept, same, disc,
  notFound}); `export` + `only` (other rows emptied during the export, then put back). The Apps Script files are unchanged.
- Supplier sheet: `KEEP_GROUPS` (column → OUT_POS_UPDATE / OUT_MERGED_DATA columns), `state.opts {keep, discontinue}`,
  ticks in the headings (`data-keep`, table class `keep-c<col>`), `#supOpts`, SUP BRAND filter (`supView.brands`, upper
  case keys) feeding `supRowsInScope()` / `buildSheetsPayload()` / `ensureLoaded()` (`loadedScope`); `supModel()` maps the
  results to the in-scope rows (`resultScope`), others `is-out`.
- Stage 3: `generateOptions()` (`outView()` = review filters + Sheet-view grid filters), Export TXT again uses
  `posTabView()`. `renderScopes()` writes the `.stage-scope` notes. `keptFlags` / `keptLook` grey KEPT columns.
- sheet-grid v1.2.0: multi-value column filters (`st.filters[c]` = array) through `PHFSheetGrid.picker()` (fixed popover,
  tick values, OK applies), `visible()`, `filtered()`, `clearFilters()`, `opts.onView`, `set({flags})`.

## Staff Hub v21.14.1 — POS New Product Check Clean v1.6.1: kept columns show POS's values, theme grey (12 Oct 2026 09:40 AEDT)
- js/app.js: `keptRows(rows)` — a view of OUT_MERGED_DATA for the ticks unticked: MATCHED rows (`isMatched`, as
  `m13OutStatusKey_`) found in the POS Database by POS PLU (`posMap()`, from `rowsOf('pos')` with the TMP_MERGED_POS_DATA
  headings, cached per `state.rev`) get POS's value in the `KEEP_SHOW` columns (POS blank keeps the merge's value where
  engine-host's `NEED_VALUE` does; money columns `KEEP_MONEY` as $0.00), `KEEP_ZERO` changes as 0.00% / $0.00,
  `KEEP_BLANK` OLD BRAND, and FINAL SHELF RRP from `shelfText()` (the Sheet's `m13ShelfRrpFormula_`: BE / S / W / AB).
  Used by `renderReview` (Sheet view, review table, search, totals), `renderReviewKpis` and the review workbook
  (`buildReviewWorkbook`). `state.results[OUT]` and the engine's sheet keep the merge's values; `optsChanged()` draws
  the review again and schedules the workbook.
- `keptLook` returns the Sheet's flat style `{ fg: '9E9E9E' }` (band kept) for kept columns of MATCHED rows, in the grid
  and the workbook; `keptLock()` → sheet-grid `edit.cellLock`.
- sheet-grid v1.2.1: `edit.cellLock(row, col)` → message: typing / Enter shows it, Delete and paste skip the cell.
- css/merge.css: unticked supplier columns `color:#9E9E9E` on the row bands (was a hatch).
- The POS UPDATE file (engine-host v1.2.0) is unchanged.

## Staff Hub v21.15.0 — integrity fixes across Build POS Master Databases, Reconcile CH2 Order and POS New Product Check Clean (12 Oct 2026 12:05 AEDT)
- Build POS Master Databases v21.12.0 (`js/pipeline.js`; POS v5.0.2, CH2 v1.0.1, Unique v1.0.2):
  - `posVal` keeps decimals for every numeric POS column (it used `Math.trunc`, so PR_1–9_PC / RET_PRICE / SOH / ITEMSIZE
    lost their decimals — 20,430 of 34,251 products on the 12 Oct files). Whole numbers are unchanged.
  - `posRead(file, need)`: heading row = first of the first 80 rows with MAIN_ID and SUB_ID; headings normalised by
    `posHead` (`Main ID` = `MAIN_ID`); every column keeps its own position; throws when a `need` column is missing
    (stock: MAIN_ID, SUB_ID, PLU, BRAND, DESCR; template: MAIN_ID, SUB_ID, BRAND, DESCR, WSP_EXCGST, RRP_INCGST).
  - CH2: `buildCh2` stops without a Wholesale / RRP column (`resolveCh2Columns`); `ch2-core.buildSupplierImport` falls back
    to the resolved role column (`importRoleCols` / `getValOr`) when the usual heading is not there, and builds SUP PRODUCT
    from Description 1 + 2 when there is no Long Description.
  - Unique: `parseUhpRows` keeps each column's position (a blank heading cell no longer shifts the data); `pyStr(null)` is
    '' (a blank Size gave "… NONE" in 233 descriptions); a missing `UHP_` mapping column is ''; `buildUhp` stops without
    APN Barcode / W/S ex GST.
  - `state.busy` + `busyNote()`: one build at a time; drops, Assign, Remove, Clear input files and Clear Session wait.
  - `addOutput`: an output whose re-open check warned is not saved to the Library (the last good copy stays).
  - `discSheet(sheets)`: Ongoing Discounts is validated and built from the sheet with the discount headings; the master
    stage message warns when the file gave 0 rules (`res.discounts.rules`).
- POS New Product Check Clean v1.6.2: `inputsLocked()` guards `acceptFile` / `removeFile` / `bulkAccept` / `removeInputs`
  (busy or `sessRestoring`); `runTo` refuses while restoring and drops results when `loadedRev !== rev` at the end;
  `dbTx` rejects on `tx.onabort`, `saveSession` reports a refused save and retries the inputs next time; removing `sup`
  clears `supView.brands`. engine-host v1.2.1 `coerce` and merge-map v1.0.3 `mapTable` / `sheetRows` turn TABs into
  spaces. sheets-shim v1.0.3 `_addFormat`: a range (≤ 2,000 cells) already showing that format adds nothing; no entry is
  dropped (the 4,000 cap evicted the build's column formats and changed displayed / exported values).
- Reconcile CH2 Order v2.11.0: `reconcile.candidate` accepts `score >= 280` only with description ≥ 30; `integrity.validateRun`
  returns `review` (a failed warning-severity check: line arithmetic, footer total) → KPI / status / notes show REVIEW;
  `pos-import.buildInvoicePayload` merges records with the same Sub ID, POS source row, invoice and terms (`mergedFrom`,
  checked line by line in `validateInvoiceAccuracy`), else a SPLIT LINES warning; review notes list MERGED / SPLIT LINES from
  `result.detail[].invoiceRows`; `beforeunload` prompt while receiving counts / ticks exist.

## Staff Hub v21.15.1 — Build POS Master Databases v21.12.1: dropped files kept in memory (12 Oct 2026 12:30 AEDT)
- `memFile(file)` copies a dropped file into the page's memory (`new File([await f.arrayBuffer()], …)`, flagged `__mem`)
  in `acceptInputFile` (not for Library files) and before `identifyFile` in `bulkAccept`. A build no longer reads the
  computer's copy, so moving, renaming, deleting or re-exporting a file after the drop (Chrome: NotFoundError "A requested
  file or directory could not be found…" / NotReadableError) cannot stop it. `readErr` names the file when a read does fail.
- `buildAll` marks the stage that was running as Error when Build All stops.

## Staff Hub v21.16.0 — Build POS Master Databases v21.13.0: the same file pair for POS, CH2 and Unique (12 Oct 2026 16:55 AEDT)
- Each stage gives the complete set first and `_pos_db` = the shortened file in the supplier import layout
  (`SUP_LAYOUT` = IN_SUPPLIER headings A–P + `SUP SIZE`, `SUP TYPE`; sheet IN_SUPPLIER_UPDATE).
- POS v5.1.0: `pos-main` → `clean_merged_pos_data_DD.MM.YY.xlsx` = the sorted POS_DB layout (sheet POS_DB_Data, what
  `_pos_db` was) and is the Library POS Database (`LIB_OUT['pos-main'] = 'lib:pos-db'`); `pos-db` →
  `clean_merged_pos_data_pos_db_DD.MM.YY.xlsx` = POS products in `SUP_LAYOUT`, same A–Z order (B blank, C POS_SUPPLIER,
  D `bc13(POS_MASTER_BARCODE)`, E POS_BRAND, F POS_SUB_ID, G POS_DESCR, H POS_UNITS, I POS_MIN_ORDER_QTY, J POS_WSP_EXCGST,
  K POS_RRP_INCGST, L Y when POS_GST_TAX_PC > 0). The BrowseStockItems-order file with POS_INDEX / POS_MAIN_ID is no longer
  written; `state.models.pos` (POS_STD) for the Combined Master is unchanged.
- CH2 v1.1.0 / Unique v1.1.0 `_pos_db`: D `bc13` (digits; leading zeros dropped above 13, padded below — longer real codes
  stay); CH2 G `cleanCh2Product` (starred CH2 stock notes matching `CH2_NOTE` removed, other starred notes keep their words,
  spaces collapsed, capitals); CH2 I `numOrBlank` (N/A → blank). The complete files are unchanged.
- SUP SIZE / SUP TYPE: `js/size-worker.js` loads sheets-formula / sheets-shim and the merge script (1.0 Setup, 1.3 Merge) in
  a worker and answers `m13ExtractSizeAndType_` for each description; `withSizes(rows, 6)` appends them (blank if the
  worker cannot run).
- POS New Product Check Clean merge-map v1.0.4: the POS Database help text names `clean_merged_pos_data_….xlsx`.

## Staff Hub v21.17.0 — the full sets in the Library; _pos_db = supplier layout A–P only; supplier sheet fits the page (12 Oct 2026 18:05 AEDT)
- Build POS Master Databases v21.14.0: `LIB_OUT` = `pos-main` → `lib:pos-db`, `ch2-main` → `lib:ch2-db`, `uhp-main` →
  `lib:uhp-db` (the kind ids are unchanged; Library v1.1.1 labels them POS Database (full set) / CH2 full set / Unique
  full set). The `_pos_db` outputs are download only.
- POS v5.2.0: `clean_merged_pos_data` = `POS_STD` (POS_INDEX, POS_MASTER_BRAND, POS_MASTER_BARCODE, POS_MAIN_ID … POS_SOH),
  sheet Clean_Merged_POS_Data, rows in the A–Z order (master brand, brand, description, barcode); POS_INDEX keeps the
  BrowseStockItems row, as in `state.models.pos` and the Combined Master. `POS_DB` is gone. `clean_merged_pos_data_pos_db`
  = `C.SUPPLIER_IMPORT_HEADERS` (16 columns, sheet IN_SUPPLIER_UPDATE), same rows as before.
- CH2 v1.2.0 / Unique v1.2.0: `_pos_db` rows from `PHFSupplierLayout.ch2` / `.uhp` (`js/supplier-layout.js` v1.0.0:
  `buildSupplierImport` + `bc13`, `cleanCh2Product`, `numOrBlank` — moved there from pipeline.js unchanged). SUP SIZE /
  SUP TYPE and `js/size-worker.js` are removed; the merge works size / type out itself (OUT_MERGED_DATA AL SIZE / AM TYPE →
  BR itemsize / BS packaging).
- POS New Product Check Clean v1.7.0: loads `../database-build/js/ch2-core.js`, `uhp-core.js` and `supplier-layout.js`.
  `readWorkbook` passes each sheet through `PHFSupplierLayout.fromFullSheet(rows)` — a sheet whose heading row (first 8
  rows) has CH2_MASTER_BARCODE + CH2_WHOLESALE_EX_GST or UHP_MASTER_BARCODE + UHP_WS_EX_GST becomes `[HEADERS, …supplier
  rows]` with `from` = full CH2 / Unique set (shown on the file row as `report.from`); Library Add, drops and Drop All all
  go through it. merge-map v1.1.0: `ALIASES['POS MAIN ID']` = POS MASTER BARCODE first, then POS MAIN ID.
- Supplier sheet: `supColsHtml()` colgroup + `supFit()` (after `drawSup`, and on a ResizeObserver of #supWrap): canvas
  measures digit / text widths for `SUP_SIZES` steps (cell / heading px, padding) and each `SUP_FIT` column's minimum
  (characters × width, or the longest heading word / the Update in POS tick); the room left is shared by `SUP_FIT` weights
  (mostly SUP PRODUCT); below the minimum at the smallest step the widths scale down (`.is-tight`). CSS: table-layout
  fixed, `--sup-fs` / `--sup-hfs` / `--sup-pad`, headings wrap with the column letter pinned to the top, cells nowrap with
  ellipsis; a cut-short cell gets its full text as a title on mouseover.

## Staff Hub v21.17.1 — POS New Product Check Clean v1.7.1: content-sized supplier columns, aligned headings, run bar (12 Oct 2026 19:30 AEDT)
- `supFit()` now sizes columns from content: `supSample(vis)` (all rows up to 900, else the first 300 + 600 spread);
  INDEX = the highest `it.n` on show (+18 px when any row is added); numbers / barcodes / IDs (`NUMLIKE`, columns D / F ≤ 16
  characters) = the longest such value; other text = the 98.5th-percentile length (all rows under 100), measured with
  canvas (H–O digits as 0 for tabular figures, STATUS in italic 700) + 3 px. `want` = max(heading word / ⅓ of the heading /
  the Update in POS tick, content capped at 320 px, SUP PRODUCT 760 px). Per `SUP_SIZES` step: room to spare → widths in
  proportion to `want`; else `SUP_GIVE_ORDER` ([6,34],[1,10],[4,14],[6,26],[15,12],[4,9] — column, down to characters);
  else floors scaled (`.is-tight`). Cache key: width, font, rows on show, first / last row, `state.rev`, undo depth, run.
- Headings: `<span class="sup-col">` letter (16 px band), `<span class="sup-hl">` label (flex-centred, `min-height:
  var(--sup-hlh)` = the tallest label, measured in `supFit`), `<span class="sup-tick">` (30 px) holding the Update in POS
  label (column flex: tick over text) or nothing.
- Run bar `#wbRunBar` (index.html, first child of `#workbook`, `position: sticky; top: 0`): `.wb-run[data-run]` buttons call
  `runTo(id)`; `updateRunButtons` sets their disabled state, `stageSet` their `is-<status>` class and badge, `setGlobal`
  mirrors the status into `#wbRunStatus`.
