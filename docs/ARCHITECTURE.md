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

## Staff Hub v21.17.2 — POS New Product Check Clean v1.7.2: supplier sheet clean-up (12 Oct 2026 20:15 AEDT)
- `supSheetHtml`: `.sup-head` = `.sup-title` (h3 + `.sup-info` title tooltip, `#supStatus`) · `#supBar` (11 flat
  `.sup-bar-cell`s, `flex: 1 0 auto`) · `#supCount`; `.sup-scope` (one line; chips in `.sup-brand-list`, faded via
  `.is-clipped` from `supClip()` only when cut; `:has(.sup-scope-more[open])` wraps); `.sup-tools` ends with `#supOpts`
  (`supOptsHtml` short form, explanation in `title`). Below 1500 px the title takes its own line.
- thead: `tr.sup-letters` (`th.sup-lN`, filter button in E) + `tr.sup-heads` (`th.sup-cN` with `.sup-hl` and `.sup-tick`
  holding only the checkbox); `thead` is the sticky element. Cells use the grid font ("Google Sans", "Product Sans",
  --phf-font), 4px padding, #E1E3E6 lines; the wrap is `max-height: max(320px, calc(100vh - 150px))`.
- `supFit`: `headMin(font, words, lines)` = the narrowest width splitting a heading into 2 (or 3) lines; tries per
  `SUP_SIZES` step: 'two', 'empty3' (3 lines for columns with nothing on show), 'all3' (steps ≥ 2). Pick: the first try at
  step ≤ 1 where SUP PRODUCT keeps 40 characters (`sumC`), else step 0 'empty3' when the floors fit, else the first try
  whose floors fit, else the last (scaled). Spare room by `SUP_SPARE` {G .8, P .08, B .06, E .06}. No + tag width.

## Staff Hub v21.18.0 — POS New Product Check Clean v1.8.0: sheets like the Google Sheet tabs, one look across the tools (13 Oct 2026 09:30 AEDT)
- `supSheetHtml`: `.sup-head` = `.sup-title` (h3 + `.sup-info`) · `#supNote.sup-msg` (the latest `supSay` message, one line,
  `-webkit-line-clamp: 2`, class `is-<type>` → icon) · `#supCount`. `#supBar`, `#supStatus` and the `.status.sup-note`
  box are gone. thead = `tr.sup-letters` · `tr.sup-tot#supTot` (`th.sup-tN`) · `tr.sup-heads`.
- `supTotCells(t, model, stat)` → 16 cells for row 1: `{ l, v, tip }` in A, B, C, D, E, J, K, `{ st, lines, tip }` in P
  (counts from `supTotals(vis)`, tip = the stage-1 summary); kept in `supView.tot`. `supFit` adds row 1 to each column:
  min = the value on one line (digits as 0s, `fs + .5` px bold) or the longest label word (`hfs - 1` px, 800); want also
  the whole label; P only wants its two lines (it may wrap). The fit key includes the row-1 values.
- `supCellText(it, c)` = `supShown` with J, K, N (`SUP_DP2`) as 2 decimals when the cell is a number; used for the rows
  and `supFit`. Copy, search, editing and the merge use the value.
- `setSupCell(row, c, raw, added)`: on a row added here, filling an empty cell is not marked; otherwise `__ed[c] = 2`.
  `supRowHtml` shows `is-edited` for `__ed[c] === 2` on added rows (older `true` marks on them are ignored) and for any
  mark on file rows. Callers: `pasteAtCell` (new rows and rows of the added entry → added), `commitEdit`, `clearSelectedCells`.
- CSS: `tr.sup-tot th` navy / gold (`.sup-tl` label, `b` value), `.sup-t-st` lines, `.is-filtered` lighter values;
  `tr.sup-heads th` navy / gold with a gold bottom line; `.keep-cN th.sup-cN` navy with #8B9DB5 text; `.sup-tools` white,
  buttons and search 32 px, `.sup-opts` white.
- OUT_MERGED_DATA: `drawOutGrid` passes `ticks: keepTicks(head)` (every column in a `KEEP_GROUPS[].out` list → `{ id, on,
  title }`) instead of `flags`; the grid's `onTick(id, on)` → `setKeep(id, !on)` → `optsChanged()` (same path as the
  supplier sheet). `keptFlags` stays for OUT_POS_UPDATE. `renderReviewPage` hides `#reviewKpis` in the Sheet view.
- sheet-grid v1.3.0: `set({ ticks })` → `<label class="wbg-tick"><input data-tick>` in the heading, `th.wbg-off` when
  unticked, `tr.wbg-has-ticks` (50 px heading row); a `change` listener on the table calls `opts.onTick`; `busy()`
  disables the ticks.
- `.wb-runbar-status` wraps to two lines (`-webkit-line-clamp: 2`), title = full text.
- theme.css v20.1.0 (Build, Reconcile, merge — `body.phf-page-db` / `.phf-page-reconcile`): stage and Build all buttons
  `text-transform: none`, 13 px, 32 px; `.download-link` 32 px; `.status.success|.ok` = one line with a ✓ (no box);
  Reconcile `.results .kpis` = one navy strip (`.kpi` column-reverse: label over number; good / bad / warn colours).
  Build v21.14.1: `STAGES[].btn` labels ("Build POS database"), "Build all databases" / "Clear session". Merge: "Run all
  stages" / "Clear results".

## Staff Hub v21.19.0 — POS New Product Check Clean v1.9.0: totals follow the filters, required reference tables, ✕ on every rail (13 Oct 2026 16:00 AEDT)
- sheet-look v1.1.0: every `TOTALS[sheet](all, vis)` counts / sums `vis` (the rows the grid shows after the search and
  column filters), so row 1 matches the filtered sheet on every tab; each total keeps its kind (`uniq` = different values,
  `nonBlank` / `vis.length` = rows, `sum` = $, TMP `val` = price × SOH, labelled `STOCK VALUE @ WSP` / `@ LAST PRICE`). The
  review workbook calls `look.totals(data, data)`, so the download is unchanged.
- app.js v1.9.0: `outBadge()` (OUT grid `onView` and the review render) = `wb.outGrid.count()` in the Sheet view, else
  `R.filtered.length`, "N OF M ROWS"; `wbBadge()` (the other tabs' `onView`) = "N OF M ROWS" when a filter is on, else
  "M ROWS".
- `fillSupNames()` runs in `runTo` before stage 1 (when stage 1 is not done, or the target is stage 1): a map POS ACCNO →
  POS ACNAME from `rowsOf('suppliers')`; every supplier row (`supEntries()`) with B blank and C in the map gets the name;
  `state.rev++`, a title-band note and a session save when any were filled. Rows with a name are left as they are.
- merge-map v1.2.0: brands, prefix, suppliers and disc are `required: true` (were `recommended`), so `ready()` and the
  run bar wait for them; Find & Replace stays optional.
- theme.css v20.1.1: `.btn:not(.primary):not(.is-on):not(.active):hover` = white with a navy edge; `.btn.is-on:hover` =
  `--phf-navy-hover` with white text (a selected toggle no longer turns white text on white). Shared rail ✕ for
  `body.phf-page-db` / `.phf-page-reconcile`: `.input-nav-wrap` (relative), `.has-del > .input-nav-item` 32 px right
  padding, `.input-nav-del` an 18 px red circle at the right edge.
- Build v21.14.2 (pipeline.js): `renderInputNav` wraps each row in `.input-nav-wrap` with `button.input-nav-del[data-del]`
  when loaded; `removeInput(id)` (busy check, deletes `state.files[id]`, the Library copy for `LIB_REF` inputs,
  `invalidate`, re-renders and keeps the open panel). The panel's Remove button uses it too.
- Reconcile v2.11.2 (ui/workspace.js): the same ✕; `removeInput(id)` clicks the order list's own Remove buttons for order
  files, or `PHF.referenceStore.clear(refKind)` for a reference (Ongoing Discounts is the shared Library copy; the ✕ title
  says so), then `loadReferenceStatus()` and `PHFReconcileApp.refreshReferenceStatus()`.

## Staff Hub v21.20.0 — POS New Product Check Clean v1.10.0: heading blocks without inner lines, ticks on the supplier sheet only (13 Oct 2026 18:30 AEDT)
- merge.css v1.10.0 (end of file): `.sup-table tr.sup-tot th`, `tr.sup-heads th` and `.wbg-table tr.wbg-tot th`,
  `tr.wbg-headrow th` (not `.wbg-rn`) have `border-right-color: transparent`; `tr.sup-tot th` and `tr.wbg-tot th` (not
  `.wbg-rn`) `border-bottom-color: transparent`. The borders stay 1 px (painted in the cell colour), so `supFit` and the
  grid widths are unchanged. Letters row, row numbers, data cells, the gold line under `sup-heads` and the 3 px line under
  `wbg-headrow` are unchanged.
- sheet-grid v1.4.0: `set({ dim: { col: title } })` → `th.wbg-off` (grey heading text) without a checkbox; the title is
  added to the heading's hover. `ticks` (v1.3.0) stays available.
- app.js v1.10.0: `drawOutGrid` passes `dim: keptDim(R.head)` instead of `ticks: keepTicks(R.head)`; `keptDim` = every
  column in the `out` list of a group POS keeps (`state.opts.keep[g.id]`). The supplier sheet's `data-keep` ticks and
  `optsChanged()` are unchanged, so OUT still recalculates when one changes. `TOOL_VERSION` = 'v1.10.0' (the review
  workbook stamp; it was left at v1.7.2).

## Staff Hub v21.21.0 — POS New Product Check Clean v1.11.0: search / add bar, fill down, M / N / O ticks, SELL THRU, N/A min order (13 Oct 2026 21:00 AEDT)
- app.js v1.11.0 — supplier sheet:
  - `#supSearch` is the search / add bar (`.sup-find`, first toolbar line, `#supFindHint`, `#supAddBtn`).
    `supFindSpec(raw)` → null | `{ text }` (no `|`) | `{ slots, bc, br, sub, prod, ws }` (slots = B–O). `supFindRows`:
    barcode digits contained in D first (`how: 'barcode'`), else brand / Sub ID / product contained and WS equal
    (`how: 'backup'`). `drawSup` keeps `supView.find`; `supFiltered` logic uses it instead of `supView.q`.
  - `supPrefill()` = the most common B | C (cached by `state.rev`); an empty, unfocused bar is refilled in `drawSup`.
  - `supFindAdd()`: exact barcode (leading zeros dropped) already on the sheet → that row is selected, nothing added;
    else a row in the added entry via `setSupCell(…, added = true)`; same brand + Sub ID / WS → warning.
  - `supAddFive()` (Add 5 rows), `supClearEmpty()` (`supRowEmpty`: D–O blank).
  - Fill down: `paintSel` puts `span.sup-fill` in the selection's bottom-right cell; mousedown on it →
    `supView.filling = { b, to }`, rows dragged over get `td.is-fill`, mouseup → `supFill(b, to)` (the block repeats,
    rows past the end are made). Ctrl+D → `supFillDown()`.
  - Ctrl+C: the sheet's keydown writes `supCopy()` with `copyText()` (hidden textarea + execCommand, else the Clipboard
    API); in a cell editor with no text highlighted the whole value is selected so the browser copies it. Same in
    sheet-grid v1.5.0.
- KEEP_GROUPS: `member` (col 14, pr 1–5, listed before `rrp` so OUT's pr 1–5 headings carry its tick), `stock` (col 12)
  and `disc` (col 13) with `use: true` (`optsKeptText`: "not using …"; `g.tip` = the heading tick's hover). `setKeep('disc')`
  bumps `state.rev` and `invalidateResults` (N changes what the merge works out); `buildSheetsPayload` blanks N when it
  is unticked. `generateOptions` sends `stock: true` while M is ticked. `drawOutGrid` passes `ticks: keepTicks(head)`
  again (v1.10.0's `keptDim` removed). CSS keep-c12–14.
- engine-host v1.3.0 (engine-worker v1.3.0, engine-frame):
  - `KEEP_COLS.member` = OUT_POS_UPDATE 16–20; the generate hook filters `keep` to groups with columns, sets an INSERT
    row's pos soh (30) from IN_SUPPLIER M by barcode (`supColByBarcode(12, true)`) when `runOpts.stock`, and runs
    `fixMinOrder` (not a number → INSERT '1', UPDATE POS MIN ORDER QTY from TMP, else '1') on every generate; `runInfo`
    gains `stock` and `minOrder`.
  - Member: `m13IsMemberBrand_` wrapped — O from the context's barcode (`supMemberFlag`), FALSE / NO / N / 0 → false,
    then the script's checks, then `posMember()` (TMP: per PLU PR1 89–91 → true, ≥ 99.5 → false, DISSNO 33 / 29 / 8 / 13
    skipped; per brand, more 90% than 100% live products). Context (`memCtx = { plu, bc }`) set by wrapping
    `m13BuildOneOutRow_`, `m13BuildDiscontinuedOutRow_`, `m13ApplySupplierOverrideToOutRow_` and
    `m13ResolvedShelfPricingForOutput_`.
  - SELL THRU: `m13ColVal_` / `hbbColVal_` return SUP PRODUCT without ` *SELL THRU*` (candidates[0] === 'SUP PRODUCT');
    `m13PolishColumnPDescription_` gets descr / Q without it; after 'build' and 'refresh' `noteSellThru()` adds it back
    to OUT_MERGED_DATA Q where the stripped text matches a noted IN_SUPPLIER G.
- supplier-layout v1.1.0 (Build and the merge): CH2 rows whose CH2_DESCRIPTION_2 matches /SELL\s*-?\s*TH(ROUGH|RU)/ get
  ` *SELL THRU*` on G; SUP MIN ORDER WS via `numOrText` (N/A kept). Build v21.14.3 loads it (no other change).
- merge.css v1.11.0: `.sup-scope` / `.sup-tools` bottom borders transparent; `.sup-find*`, `.sup-fill`, `td.is-fill`.

## Staff Hub v21.21.1 — POS New Product Check Clean v1.11.1: pasted rows line up by their barcodes (13 Oct 2026 21:30 AEDT)
- app.js `barcodeCol(rows)`: the leftmost block column whose filled cells (≥ half the rows) are ≥ 80% 8–14 digits or
  9.3E+12. `pasteAtCell`: a block of 6+ columns pasted at B–D moves so that column lands in D (`c0 = 3 - k`; k = 3 →
  INDEX first: skip it, start at B); no barcode column in 3+ rows → a warning in the message. `mapPasted` (Paste with no
  cell selected): `start = 3 - k` when it differs from the width rule.

## Staff Hub v21.22.0 — POS New Product Check Clean v1.12.0: TYPE → packaging, TYPE review (13 Oct 2026 22:30 AEDT)
- engine-host v1.4.0 (engine-worker v1.4.0, engine-frame): `refineTypes()` after 'build' / 'refresh' (after
  `noteSellThru`) walks OUT_MERGED_DATA (only when headings 39 / 71 are TYPE / PACKAGING): `refineType(row)` from Q (else
  O + P) and AL — STICK-only sachets re-typed (`strictType` on the text without STICK; deodorant / zinc / lip … →
  TOPICAL), TEA re-typed when the tea is TEA TREE / TTREE / TEA LIGHT or GREEN / WHITE / BLACK / ICED / PEACH TEA with
  another form, then blank → SACHETS for `\bSACH(ETS?|S|E)?(?![A-Z])` or a Q single-serve pack (≤ 15 g, not DISPLAY).
  Writes AM and sets BS (index 70) = AM when AM is filled. OUT edits: `refineTypes(rows, syncOnly)` copies AM to BS for
  the edited rows. `KEEP_COLS.product` adds [29, 'POS PACKAGING'].
- app.js v1.12.0: KEEP_GROUPS.product `upd` / `out` + 'packaging', KEEP_SHOW.product + ['packaging', 'POS PACKAGING'].
  The script files are unchanged (m13StrictTypeFromText_ still decides first).

## Staff Hub v21.23.0 — POS New Product Check Clean v1.13.0: upload checks before the POS files (14 Oct 2026 07:30 AEDT)
- engine-host v1.5.0 (engine-worker v1.5.0, engine-frame): `uploadChecks(built, posByPlu(), runOpts)` runs inside the
  `m13BuildPosOutputRowsFromOut_` wrapper after the keep / discontinue filter and before the rows are re-indexed (the
  rows' `__status` is still there), on every generate — `runOpts` is now set for every generate (`checks: false` turns
  the checks off). Result: `info.checks = { OUT_POS_INSERT: { sheetRow: { level: 'hold'|'check'|'fixed', notes:
  [{ k, t }], fix: { col: oldValue } | null } }, OUT_POS_UPDATE: {…}, n: { hold, check, fixed, rows } }`, sheetRow =
  position + 3. Row fields are the built POS row (0 index, 1 barcode / PLU, 2 sub id, 3 brand, 4 descr, 5 pos desc,
  8 supplier, 12 wsp, 13 last, 15 rrp, 30 soh). `posIndex(pos)` reads TMP_MERGED_POS_DATA once per generate: barcode →
  PLU (POS MASTER BARCODE and POS MAIN ID, `bcKey`), supplier|sub id → PLU, the live brand names, the prefix words
  (SRC_POS_PRODUCT_PREFIX B) and the Brand Name Changes pairs (SRC_POS_BRAND_NAME_CHANGES B ↔ C, `renamed`).
  - hold: `rrp < wsp`; `last < wsp / 2` or `last > 2 × wsp`; INSERT barcode not a number / `gs1Ok` (EAN-8 / UPC-A /
    EAN-13 / GTIN-14 check digit) fails / already in POS / twice in the INSERT; INSERT `supplier|sub id` already in POS;
    a box / display price that does not resolve (`packCount`: "7G X 20 DISPLAY", "12 X 35G", "X 20 PK", "20 DISPLAY",
    "35G 12" → divide when `wsp / n` is within 25 % of POS's WSP, or for a new product gives 25–85 % of the RRP; keep
    when the WSP itself is within 25 % of POS's; otherwise hold). Other barcode lengths are a check only.
  - check: matched WSP / RRP moved > 40 % against POS (skipped when that column is kept); brand differs on the first 20
    characters (POS's width), not a `renamed` pair and not `sameFamily` (same first word or one contains the other);
    `sizeKey` (nnG / ML / KG / L / MG, `%` removed) or `countKey` (the number before T / C / VC / S / SG / SACH / PK …)
    with no value in common; DISCONTINUED with POS SOH > 0; DISCONTINUED wsp / last / rrp ≠ POS (`sameVal`); PLU not in
    POS. Sub ID changes are not flagged (POS holds old in-house codes; suppliers now use CH2 codes).
  - fixed: `cleanDescr` — SELL / SELL THROUGH / SELL THRU out; a token repeated straight after itself (210G 210G, K2 K2,
    CREAT CREAT; 210GM ≡ 210G; 1-letter tokens and `DOUBLED` words such as PAW PAW left alone); the first word (5+
    letters) repeated at position 2–3 (CABOT DR CABOT, PRANA SPORT PRANA — not PROT SUPP … PROT). pos desc is remade
    with the script's `m13PosDesc_`. Not applied when SUP PRODUCT is kept (the descr is POS's).
  - ZZZZ (`zRow`: a DISCONTINUED row, or a matched row whose brand / descr starts with Z{3,} — POS already holds it as
    ZZZZ): `zzzzBrand` strips Z{3,} runs and a ZZ glued to a known brand / prefix word (ZZEAGLE); `zzzzDescr` mends the
    script's `m13DiscontinuedDescr_` (it strips every leading Z: ZEN → EN) by rebuilding the start from POS DESCR and
    keeping the script's own suffix (60TABS 60T); then Z{3,} runs inside the descr go (ZZZZ PRANA SPORT ZZZZPRANA 40G)
    and `cleanDescr` runs on the rest. `fix` lists the columns changed (3, 4, 5, 12, 13) with the old values.
  - Only `uploadChecks` touches the rows; the script files are unchanged. A thrown error is reported as
    `info.checksError` and the run goes on.
- sheet-grid v1.6.0: `set({ rowFlags: { sourceRow: { level, title, on, cells } }, rowFilter })` and `opts.onRowTick(sourceRow,
  on)`: with `rowFlags` every row-number cell (70 px) gets `<input data-rtick>`; `tr.wbg-row-hold / -check / -fixed`,
  `tr.wbg-skip` (unticked), `td.wbg-rn.wbg-rf-*` with the reason as its title, `td.is-fixed` from `cells`. `rowFilter`
  hides rows on screen only: `st.visAll` (search + column filters) feeds `visible()` / `filtered()`, `st.vis` (with the
  row filter) the drawing and `count()`; `g.rowFilter(fn)` redraws. A mousedown on the tick never selects the row.
- app.js v1.13.0: `state.results.checks_generate` (the engine's `info.checks`) and `state.results.upload[sheet][sheetRow]
  = false` (unticked rows; `setUploadDefaults` unticks every `hold` row after generate) — both are non-array results, so
  the session keeps them. `rowFlagsFor(sheet)` → the grid's `rowFlags` (title = LEVEL — notes), `uploadRowFilter(sheet,
  level)` for the Show buttons (`wb.uploadView = { sheet, level }`), `setUploadTick` / `setUploadAll` → `afterTickChange`
  (`state.edits.ticks`, the stage-3 "Upload ticks changed" message, the TXT download warning, save). `uploadOnly(sheet)`
  = the ticked Sheet rows (null when all are ticked); `exportOptions(pv)` = `{ only: { sheet: rows } }` for the engine's
  `withOnlyRows` — stage 3's export step (`runTo`) and Export TXT again (`runExtra`, ∩ the filtered view) both use it.
  `uploadSummaryText()` joins the stage-3 / export messages; `uploadCounts(sheet)` the badge (N ROWS · M HELD, `warn`)
  and the "N rows are unticked" pill in `renderWbActions`. `renderUploadPanel(t)` fills `#uploadPanel` (index.html, inside
  the sheet panel after `#wbActions`): counts, Show held / To check / Fixed / All rows, Tick all held / Untick all held
  (hold rows only; `holdOn` decides the buttons), the list (hold, check, fixed, then unticked-by-you; `UP_LIST_MAX` 400)
  with its own ticks and a row-number link (`wb.grid.select(r - 3, 4)` after clearing the row filter).
  `uploadChecksRows()` → the review workbook's OUT_UPLOAD_CHECKS sheet (after OUT_POS_UPDATE: SHEET, ROW, UPLOAD,
  LEVEL, BARCODE / PLU, SUB ID, BRAND, DESCR, WSP, LAST, RRP, WHY). Column ticks still apply to OUT_POS_UPDATE only.
- merge.css v1.13.0: `.wbg-rtick`, the row edges / `.wbg-skip` / `td.is-fixed`, `.result-badge.warn`, `.upload-panel`
  (`.up-head`, `.up-tools`, `.up-list`, `.up-chip-*`, `.up-note-*`).
- Testing (14 Oct files, headless Chromium on 8748119 and on this change): the 8748119 run reproduces Kenneth's INSERT
  (193) and UPDATE (1,918 / 3,100) TXT byte for byte; with the change INSERT 158 (35 held, 4 descr fixed), UPDATE 2,991
  (109 held, 42 changed: descr / pos desc / brand / wsp / last price only), every other field identical; Discontinue off
  1,809; Tick all held + Export TXT again puts the 193 back; ticks survive a reload. Details in GITHUB-RELEASE-v21.23.0.md.

## Staff Hub v21.24.0 — POS New Product Check Clean v1.14.0: CURRENT / NEW ticks, item size, SIZE gaps, Ctrl + arrow (14 Oct 2026 10:30 AEDT)
- app.js v1.14.0: KEEP_GROUPS gain `cur` / `new` (the OUT_MERGED_DATA pair that carries the tick: supplier F/G, brand H/I,
  product O/P, ws R/S, last V/W, rrp Z/AA) and `single` (size → AL SIZE). `keepTicks(head)` puts a tick on those headings
  only: NEW `{ id, on: !keep }`, CURRENT `{ id: 'cur:' + id, on: keep }`; `onTick` with a `cur:` id calls `setKeep(id, on)`,
  otherwise `setKeep(id, !on)` — one setting, two ticks. New groups: `last` (col −1: no supplier-sheet tick; upd 'last
  price'; KEEP_SHOW / KEEP_ZERO split from `ws`; `keptRows` recomputes FINAL SHELF RRP for it too) and `size` (col −1;
  upd / out 'itemsize'; KEEP_SHOW itemsize ← POS ITEMSIZE). The supplier sheet ignores groups with col < 0. The POS block
  and the internal columns carry no ticks; kept cells still go grey (`keptLook`, `keptLock`).
- engine-host v1.6.0: KEEP_COLS `ws` [[12]], `last` [[13, 'POS LAST PRICE']], `size` [[28, 'POS ITEMSIZE']]; a generate
  with `size` in `keep` writes '0' into every INSERT row's field 28. `refineSizes(rowsOnly, syncOnly)` after build /
  refresh (and after an OUT edit with syncOnly): for every OUT row whose AL fails `SZ_OK`, `sizeFrom(Q) || sizeFrom(P) ||
  sizeFrom(O)` — count × size first (`20 X 5G`, `4.5G X 30`, `30 X SACH` → 20X5G, 30X4.5G, 30XSACHET), then the first
  weight / volume (SZ_UNIT: G GM ML MLS KG L LT OZ LB), else the first count (CT_UNIT: C CA CAPS VC VEGIECAPS T TABS TB S
  SG CHEW GUMMIES LOZ PK PACK PC PCS SACH BAG TEABAG SERVE PADS), else the first dose (MG MCG IU); `n%` and brackets are
  removed first. Then BR (69) = AL for every row that is not DISCONTINUED.
- sheet-grid v1.7.0: `PHFSheetGrid.jump(get, r, c, dr, dc, rMax, cMax)` — Excel's rule (end of the run when the next cell is
  filled, else the next filled cell, else the edge); the grid's keydown uses it on Ctrl/⌘ + arrow (Shift extends), and
  the supplier sheet's keydown calls it with `supShown`.
- Testing: see GITHUB-RELEASE-v21.24.0.md (item size the only TXT difference against v21.23.0; CURRENT last price and
  SIZE-off runs change only their own field).

## Staff Hub v21.25.0 — site icon, development wording, navigation + search, Staff Noticeboard (14 Oct 2026 18:30 AEDT)
- Icons: `assets/icons/` (favicon.ico 16/32/48, icon-16…512, icon-180 opaque for iOS, icon-192/512-maskable with 50 %
  padding) cut from the apple in `assets/img/phf-logo.png`; `site.webmanifest` at the root with relative `start_url` /
  icon paths (works under the `/staff-hub/` Pages prefix); the `<link rel=icon|apple-touch-icon|manifest>` + theme-color
  tags on the hub and every tool page.
- phf-lock.js v1.2.0: wording only (ask / setDialog / finish / remove), `markTiles` also marks `[data-tool]` elements
  (navigation items, tool list, search results) and is exposed as `PHFLock.mark`, with `devLabel` / `devNote`.
- hub-nav.js v1.1.0: `TOOLS` is the single registry (tool id, name, href, status, desc, version, icon) in the landing-page
  order — Customer Special Orders, Bread Orders (soon), Supplier Contacts, New Products, Resources, Staff Noticeboard,
  Reconcile CH2 Order, Build POS Master Databases, Update Specials, POS New Product Check Clean; `GROUPS` = one
  single-item group per tool (`single: true`). `renderNav` builds the band: `.hn-group{flex:1 1 0;position:relative}`
  equal-width tabs, each `.hn-head` an `<a href data-tool>` (or a `<span>` for soon tools, `.is-soon`) = `.hn-ico` (board
  icon, 34 px, stroke 2.4) over `.hn-lbl`; the `.hn-dd` panel (`role=tooltip`, `aria-describedby`) is shown by CSS on
  `:hover` / `:focus-within`, left-aligned to the tab and right-aligned for the last three; the search box is appended last
  as its own full-width row (`order:9`, results right-aligned); Left / Right move focus between tabs; `#hubMenuBtn` +
  stacked rows (no panels) under 760 px (hub.css v21.25.5). `PHFLock.mark` puts the In development badge under the tab
  label. Landing page: `renderNoticePreview` shows six notices (3 / 2 / 1 columns), index.html carries two placeholder
  cards (`.hub-two`) and the Library (`library.css` v1.1.0: table rows, intro behind a `<details>` "What is this?"),
  `renderQuick` the compact list, `renderNoticePreview` the top four active notices by priority then date. Search: a
  lazily built `index` of groups, tools, Library rows (`#libList .phf-lib-what`, rebuilt on a MutationObserver) and notices
  (`PHFNotices.searchText`), all-words match, title hits first, 12 results, keyboard selection; `PHFHubNav.refresh()`.
- phf-notices.js v1.0.0: `data/notices.enc.json` = `{ version, kdf: PBKDF2-SHA256, iter 150000, salt, cipher: AES-GCM, iv,
  data (base64), updatedAt, count }` around `{ notices: [...] }`. The derived key (hex) is kept in localStorage
  `phf-notices:key`; drafts in `phf-notices:drafts` as `{ items: { id: notice }, removed: [id] }`; the GitHub token in
  `phf-notices:token`. `all()` = published overlaid with drafts (`_draft: new | edited | removed`); `exportFile()` encrypts
  the merged list with the current key and salt; `publish(token)` GETs the file's sha then PUTs `data/notices.enc.json`
  on `main` through api.github.com and clears the drafts; `setPassphrase(pw)` derives a new key with a new salt and
  re-encrypts. `render(n)` is the light-markdown renderer (## / ### / - / 1. / **bold** / [text](url)), plus the
  action box and links. Notice fields: id, title, category, priority (urgent | important | info | pending), date,
  updated, summary, body, action, links [{label,url}], archived.
- tools/noticeboard (v1.0.0): `noticeboard.js` — passphrase gate (`unlock`), status strip (published / drafts / keys),
  filters (search, category, priority, active / archived / all, sort), the expandable list, the editor (saves drafts),
  Download / Publish / Discard, Passphrase… (re-encrypt + download), Forget on this browser, GitHub token dialog.
  `reconcileDrafts()` drops a draft that now equals the published notice (the file was committed). Deep link
  `#<id>` opens that notice. `noticeboard.css` uses the theme tokens.
- index.html: `#hubNav`, the noticeboard preview (`#noticePreview`, two columns), the Library panel and privacy note; the
  tile board is gone (its CSS stays in hub.css for the lock script's legacy `a.tile` path; `renderQuick` / `#hubQuick`
  stay available but are not on the page).
- Supplier Contacts v1.2.0 (`tools/supplier-contacts/js/contacts.js`): rows carry `arch`; `counts()` returns
  sup / util / arch; `render()` lists suppliers, utilities (both narrowed by `matches()` + `colMatch()`), then every
  archived row under a `.sc-div.is-arch` divider; `archive(id, on)` replaces `del()` and `place()` keeps the order
  suppliers → utilities → archived; `state.colq[column] = { text, vals }` (menu search words, ticked values or null)
  and `state.sort = { col, dir }` drive `colMatch()` / `sorted()` — view only, `state.rows` keeps the file order;
  `renderHead()` puts a `.sc-thbtn` on each heading and `openMenu()` builds the `#scMenu` popover (sort, search,
  tick-list from `colValues()`); the file has a `Status` column (`STATUS` alias status / archived / state) read in `fromMatrix()`
  and written by `outHeads()` / `outValue()` with a strike font and a conditional fill for Archived.
- Reconcile CH2 v2.11.3 (`tools/reconcile-ch2/js/app.js`): `applyTableSearch()` runs after `renderPreview()` and on
  `#tableSearch` input; it toggles `is-searching` on `#resultTable` and `search-miss` on data rows (section / total /
  colspan rows are skipped), using the row text plus input values and titles. Pure display — no state change.
- hub-nav.js v1.1.2 `renderNoticePreview`: each notice is an `article.np-item` with a `.np-toggle` button (summary) and
  a `.np-full` block (`PHFNotices.render(n)`), opened / closed in place (`is-open` spans the grid). noticeboard.css v1.0.1
  sets border-box on the page.
- POS New Product Check Clean v1.14.1 (`js/app.js`): `isCombinedMaster(rows)` (POS_PLU + MATCH_STATUS + CH2_/UHP_MASTER_
  BARCODE) marks a sheet `master` in `readWorkbook` before supplier-layout's `fromFullSheet` can convert it; `mapForInput`
  throws `MASTER_MSG` for pos / sup, `bulkAccept` notes it; Library load errors call `setGlobal(..., 'error')`. v1.14.2 `libLoad`: for `pos`, a file already
  present is kept only if it is this Library copy (`libSavedAt === rec.savedAt`) or was dropped this session (`loadedIso`
  ≥ `rec.savedAt`, or not `sessRestoring`); otherwise the Library copy replaces it (`fileEntry` now records `loadedIso`).
- engine-host v1.6.1 `uploadChecks`: after the per-row pass, rows are grouped by brand + last price (live rows with WSP and
  last price > 0); a group of ≥ 3 whose WSP max ≥ 1.5 × min is held (level upgraded, counts adjusted, one shared note).
- engine-host v1.6.3: the brand note is back to a `check` behind `!keep.brand`; app.js v1.14.6 `state.opts.keep` starts empty
  again (every pair NEW; v1.14.5 had brand CURRENT). app.js v1.14.5 `checkSupplierCells` runs in `engineSheetEdit` for
  OUT_MERGED_DATA: cells in UPDATED SUPPLIER go through `approveSupplier` (POS Suppliers rows: number, name or
  "NAME (NUMBER)") → "NAME (NUMBER)", refused cells are dropped and the grid redrawn. `rowFlagsFor` sets `changed` when
  the Upload tick differs from the checks' default (hold = off); sheet-grid v1.7.1 renders `wbg-row-changed` and keeps
  it live on a tick click. merge.css v1.13.2: `td.is-edited` orange band + text, `tr.wbg-row-changed td.wbg-rn` orange.
  hub.css v21.25.8: `.np-full` max-height min(60vh, 520px), overflow auto.

## Staff Hub v21.25.1 — storage protection shown, Find & Replace required (15 Oct 2026 10:30 AEDT)
- phf-library v1.1.2 `persisted()` wraps `navigator.storage.persisted()` (null when unsupported); `askPersist()` on every
  put is unchanged. hub-library v1.0.3 `usageLine()` (both the empty and the listed branch) prints the usage and a green
  "Storage protected" / amber "Storage not protected" pill with the install-as-app advice. Merge app.js v1.14.7 fills
  `#storageNote` in the rail the same way at boot (`.sidebar-footer.is-ok / .is-warn`, merge.css v1.13.3).
- merge-map v1.2.1: `fr` (SRC_POS_FIND_REPLACE) is `required: true`.
- Rule from here: every release bumps the hub badge (`index.html` `.phf-shell-version`) and gets its own
  docs/GITHUB-RELEASE-vX.Y.Z.md.
- Merge app.js v1.14.8 `LIB.onChange`: a `put` of a `LIB_LOAD` kind (POS Database) with the slot empty, or holding a
  Library copy with a different `savedAt`, invalidates results (if any) and calls `libLoad()`; otherwise the reload note.

## Staff Hub v21.25.2 — Delete all clears the merge's own store (15 Oct 2026 11:00 AEDT)
- hub-library v1.0.4: `OTHER_STORES = ['phf-pos-supplier-merge']`; Delete all = `L.clearAll()` then `deleteDatabase` of each
  (blocked / error resolve too). The merge's `dbTx` closes the connection per transaction, so no `onblocked` wait.

## Staff Hub v21.25.3 — Build workbooks in the merge look (15 Oct 2026 13:30 AEDT)
- pipeline.js v21.15.0 `addBasic`: row 1 totals (`TOTAL ROWS` formula with cached text; `UNIQUE: n` for `isBrandHead`;
  `TOTAL:` SUBTOTAL(109) for `isMoneyHead` / `isStockHead`), row 2 headings (navy / gold), banded data rows, `colWidth`
  by heading, autoFilter + freeze from row 2, `fullCalcOnLoad`. `verifyBasic` / `verifyMasterWorkbook` read headings from
  row 2 and expect `rows + 2`.
- master-core v2.5.0 `writeMasterWorkbook`: `themed` for all kinds (kit header / totals / bands; the selected master's red
  rise font via `themedCell(…, { color })`), totals yielded first with refs `3:n+2` and cached results from `colStats`,
  `isBrandCol` → `UNIQUE: n` (column A: row count + unique), freeze row 3, autoFilter from row 2. xlsx-writer v1.2.0:
  `{ formula, result: '<text>' }` → `t="str"` cell.
- merge app.js v1.14.9 / sheet-grid v1.7.2 `copyText`: `navigator.clipboard.writeText` first, legacy execCommand fallback.

## Staff Hub v21.25.4 (16 Oct 2026 08:00 AEDT)
- merge app.js v1.14.10 `KEEP_GROUPS.brand`: `cur: 'OLD BRAND', new: 'POS BRAND'` (was POS BRAND / SUP BRAND).

## Staff Hub v21.25.5 (16 Oct 2026 09:30 AEDT)
- merge app.js v1.15.0: `drawOutGrid` passes no `ticks` and no `onTick` (`keepTicks` removed); `OUT_CURRENT` → `outReadOnly(head,
  look.readOnly)` adds the reason text per "what POS has now" column. `engineSheetEdit` message for `ch.fill`. Session
  restore deletes `opts.keep.size` / `.last`. `KEEP_GROUPS.supplier.col = 1` (POS SUPPLIER NAME).
- sheet-grid v1.8.0: `.wbg-fill` handle appended in `paintSel` (editable, cell selection, not busy / editing); mousedown on
  it starts `filling = { b, to }`, mouseover paints `td.is-fill`, document mouseup → `fillDown(b, to)` → one `cells` change
  with `fill` / `skipped` / `newRows`; Ctrl+D → `fillShortcut()`. `roWhy(c)` reads a string `edit.readOnly[c]`.
- merge.css v1.13.4: `.wbg-fill`, `td.is-fill`; `.keep-c1` greys `sup-c1` and `sup-c2`.
- engine-host v1.7.0: `SELL_THRU` matches every note form; `sellNote()` / `sellText()`; `noteSellThru()` keyed by `bcKey`
  (then text when unambiguous) sets Q, P (`markStar`, ≤ 35), AP / AQ and NOTES (31); `refineForms()` (after `refineSizes`,
  before `noteSellThru`): `litres()` → LTR with LT / L fallback at 35, `addPwd()` for TYPE POWDER; `SZ_UNIT` litres → LTR,
  `SZ_OK` / `SIZE_RE` accept LTR; upload check "Powder without PWD"; `m13DP5EnsureMustKeepFromQ_` wrapper drops a
  re-added word already present as a possessive. engine-worker / engine-frame / app.js load engine-host ?v=1.7.0.
- app.js `KEEP_GROUPS.supplier.cols = [1, 2]`: the tick renders on both headings; `drawSup` sets every `[data-keep]`.

## Staff Hub v21.25.6 (16 Oct 2026 14:15 AEDT)
- merge app.js v1.15.1: `PRICE_TICKS = { ws, last, rrp }`; `priceTicks(head)` (the v1.14.0 `keepTicks` limited to those
  groups) → `set({ ticks })`; `onTick` back on the OUT grid; session restore drops only `keep.size`.
- v1.15.2: the supplier sheet's `[data-keep="ws"]` change handler also calls `setKeep('last', …)`; `OUT_CURRENT` lists only
  POS SUPPLIER / OLD BRAND / ORIGINAL POS DESCR (the CURRENT price columns are editable).
- v1.15.3: the OUT grid `onTick` maps `ws` / `last` (and `cur:` forms) to both ids; restore sets `keep.last = keep.ws`.
  merge.css v1.13.6: `.sup-table td.is-edited` and `.wbg-table td.is-edited` share one rule — sheet-look's `warn` colours
  (#FEF3E2 / #E37400, bold) with `!important`; the v1.13.2 corner triangle is gone.
- v1.15.4: `KEEP_SHOW.ws / last / rrp` cover the POS block only; `KEEP_ZERO = {}`; `keptRows` shelf from `wsp excgst` /
  `last price`; `KEEP_COLOUR` (the four CHANGE columns) skipped by `keptLook`.
- v1.15.5: `KEEP_SHOW` entries whose POS heading starts with `=` copy another OUT column (`['UPDATED SUPPLIER', '=POS
  SUPPLIER']`); `keptRows` handles them as `{ c, from }`. `KEEP_SHOW.sub` includes `POS SUB ID`.
- engine-host v1.7.1: must-keep wrapper checks sub-tokens (`split(/[^A-Z0-9]+/)`); `restoreMarketing(descr, o, q)` after
  `m13SZ1RestorePurgedPosWords_` (phrases from `m13MarketingPhrases_`, inserted before the first size token, ≤ 35, skipped
  when a ≥ 4-char prefix of the word is already a token); `inferType(src, size)` with `I_TOPICAL` / `I_CREAM` / `I_CLEANER` /
  `I_FOOD` / `I_POWDER`, called from `refineType` only when `t` is empty. Loaders at ?v=1.7.1.

## Staff Hub v21.25.7 (16 Oct 2026 17:30 AEDT)
- sheet-grid v1.9.0: `st.sort = { c, dir }` applied in `filter()` (blanks last, numeric compare when `colNumeric(c)`, else
  `localeCompare` numeric); `picker({ sort: { numeric, dir }, onSort })` renders `.wbg-psort` links; `st.picked` by source
  row, `pickOn()` = `opts.pick && st.edit && !st.rowFlags`; `deleteSel()` uses `pickedList()` first; `rows: 'delete'`;
  new `picked()` / `search(q)` methods.
- app.js v1.16.0: `isIndexHead(h)` filters `cols` for the OUT grid and the wb grid; OUT grid `search: true, pick: true,
  rows: 'delete'`; `applyReviewFilter` ignores the app search in the Sheet view (`#reviewSearch` hidden there); the
  dropdown filters are gone. Supplier sheet: `supView.picked` (row objects), `[data-pick]` / `[data-pick-all]` handlers,
  `deleteSelectedRows` picks first; `supFindSpec` text-only; `supPrefill` unused.
- engine-host v1.7.2: `discountToPrice()` in the ColVal hook (`SUP DISCOUNT PRICE` → price from the row's WSP).

## Staff Hub v21.25.8 (16 Oct 2026 18:30 AEDT)
- engine-host v1.7.3: `cleanDescr` — `lead` (ZZZZ) split off, inner `Z{3,}` removed, repeated leading phrase (k = 3..1,
  optional THE), `sizeNorm` / `SIZE_ALIAS` / `SIZE_UNITS` for duplicate sizes, adjacent abbreviation rules (i ≤ 2), lone
  `Z` dropped; called from `refineForms` for every row (discontinued rows excluded as before). Loaders at ?v=1.7.3.

## Staff Hub v21.25.9 (16 Oct 2026 21:15 AEDT)
- engine-host v1.7.4: `cleanDescr` — in a ZZZZ description a `ZZ` glued to a 3+ letter word is stripped; the repeated
  leading-phrase search (k = 3..1) also tries one word between (`j = k` and `k + 1`); a prefix word repeated at i = 2
  (= w[0]) or i = 3 (= w[1]) is dropped unless in `DOUBLED` or after a `CONNECT` word (N, &, AND, TO, BY, OF, ON, THE, X,
  +, 2); the first word repeated as the last word (5+ letters) is dropped. `DOUBLED` gains GO. The `__phfOut` harness
  export was removed; `G.__phfCleanDescr` stays. Loaders at ?v=1.7.4; app.js v1.16.2 (`TOOL_VERSION`).

## Staff Hub v21.25.10 (16 Oct 2026 22:30 AEDT)
- sheet-grid v1.10.0: the table `mousedown` handler, before the cell-selection logic, checks whether the pointer is in a
  checkbox cell (`td.wbg-rn`, `th.wbg-rn`, or a `th[data-hc]` heading cell that holds a `.wbg-tick`) and, if so, toggles
  the contained `input[data-rtick|data-pick|data-pick-all|data-tick]` and fires its `change` (unless the input itself was
  clicked, which toggles natively). The `.wbg-filt` sort/filter button is excluded. merge.css v1.15.0 shows the pointer
  cursor across these cells and sets `pointer-events:none` on the inner `.wbg-tick` / `.sup-keep` / `.sup-pick-all` labels.
- app.js v1.16.3: the same full-cell toggle on the supplier sheet — the `#supBody` `mousedown` toggles the INDEX cell's
  `input[data-pick]`, and the `.sup-heads` thead `mousedown` toggles a heading cell's `input[data-keep]` / `input[data-pick-all]`.
  Supplier toolbar order is now Paste, Undo, Add 5 rows, Clean up empty rows, Delete rows, Clear Sheet, Copy headings;
  `#supClearAdded` relabelled "Clear Sheet" with a `window.confirm` before clearing the typed / pasted rows (Undo still reverses it).

## Staff Hub v21.25.11 (17 Oct 2026 00:20 AEDT)
- New shared `assets/js/phf-accordion.js` (v1.0.0) + accordion CSS in theme.css (v20.2.0): any `.panel` / `.stage-panel`
  marked `data-acc` collapses to its heading row (the `.results-head` / `.stage-head` becomes the toggle; the badge /
  status stays visible as the summary). State is remembered per panel in localStorage; `PHFAccordion.refresh()` enhances
  panels injected after load. Applied to Build POS Master Databases and POS New Product Check (input, readiness, stage and
  output panels). No data, control or processing is affected.
- New shared `assets/js/phf-xlsx-style.js` (v1.0.0): one style profile taken from the POS SUPPLIER review workbook — navy
  row-1 band / gold text, light row-2 header (E9F0F5) / dark text (2C3E50), Calibri 9, banded rows (F5F5F5 / E9F0F5),
  column widths by heading (7 / 11 / 12 / 18 / 24 / 36 / 48), freeze top two rows, filter from row 2, heights 30 / 30 / 15.
  Also `headerDisplay(h, spaced)` — spaces underscores for display, `widthFor`, `numFmtFor`, `isTextHead`.
- pipeline.js v21.16.0: `addBasic` takes the shared profile (light header / Calibri / banded) and an optional `disp`
  (display headers for row 2). `makeBasic` / `verifyBasic` take `spaced` — the POS / CH2 / Unique full sets (Clean_Merged_POS_Data,
  Supplier_Data, UHP_Data) now show spaced headings (MASTER_BRAND → MASTER BRAND); the IN_SUPPLIER_UPDATE supplier-layout
  sheets keep their exact identifiers. Data, columns and formulas are unchanged; `state.models.*` keep underscore headers.
- master-core.js v2.6.0: `RC` palette → light header (E9F0F5 / 2C3E50) / Calibri 9 / gold-on-navy totals, header row height
  30, totals row 30; the full / selected master's row-2 headings are spaced for display (data keyed to `internal`); the order
  sheet keeps its custom display names; Match_Audit / Links_To_Check inherit the light header. Every consumer (the merge
  tool's `normHead`, Reconcile's alias lists) collapses underscores to spaces, so spaced display headers read identically.

## Staff Hub v21.25.12 (17 Oct 2026 01:40 AEDT)
- hub-library.js rewritten as a shared mountable panel, `window.PHFLibraryPanel.mount({ root, scope, summaryOnly, heading })`
  (v2.0.0). `scope` = a tool's display name; a record is shown when that name is in its KIND's `made` / `used` or the
  record's `source` (`relevant()`), with a "Show all saved files" toggle that also marks off-scope rows. The store itself
  (phf-library.js / IndexedDB) is unchanged — shared files appear in each tool's view by reference, never duplicated.
  Download / ✕ per file as before; Delete all stays on the home page only.
- Home page: mounted with `summaryOnly:true` — the badge shows the file count + size, and the list + usage + Delete all
  move into a "View all files" `<details>` (`wrapSummary()`), so the home page is a summary with details on demand. The old
  `#libraryPanel` / `#libList` markup is reused (back-compat auto-mount).
- Each tool mounts a scoped, collapsible (`data-acc`) `#toolLibrary` panel: Build POS Master Databases
  (scope "Build POS Master Databases"), POS New Product Check Clean ("POS New Product Check Clean"), Reconcile CH2 Order
  ("Reconcile CH2 Order"). library.css (v2.0.0) is loaded on those tool pages; it gains `.phf-lib-head`, `.phf-lib-allchk`,
  `.phf-lib-viewall`, `.phf-lib-row.off-scope`. Supplier Contacts is left as-is — its one library file (the contacts list)
  is already shown in its own card, so a separate panel would duplicate it.

## Staff Hub v21.25.16 (18 Oct 2026 13:30 AEDT)
- Rolled the Build / merge output UI back to the v21.25.12 state: the v21.25.13 per-stage output drop-downs, the v21.25.14
  grouped Final/Intermediate outputs panel + "View in outputs" jump links + Build All metric tiles, and the v21.25.15 merge
  consolidation + collapsible workbook + folded library are all removed. The outputs panel and the scoped Saved-files
  library are back to their simple v21.25.12 form on both tools.
- phf-accordion.js v1.1.0: the chevron now points DOWN (▾) when a panel is closed and UP (▴) when open, and sits at the
  right of the heading as a round button that inverts (navy↔gold) on hover, like the nav icons. Click anywhere in the
  heading, or the chevron, toggles. New `PHFAccordion.autoClose(panel)` collapses a panel only if the user has not already
  made a choice for it (tracked per panel in localStorage under `phf-acc-touched:`), so auto-close never fights a manual
  open. theme.css v20.3.0 restyles the caret (right-aligned round button, hover invert; gold on navy stage heads).
- Auto-close wiring: a stage card auto-closes when its stage is set to `done` (pipeline.js stageSet / merge app.js
  stageSet); the Drop-all-input-files panel auto-closes once all required inputs are loaded (pipeline.js updateBuildAll /
  merge app.js renderInputSummary). The outputs and library panels stay as the user leaves them. pipeline.js ?v=21.16.1,
  app.js v1.16.5.

## Staff Hub v21.25.17 (18 Oct 2026 14:05 AEDT)
- phf-accordion.js v1.2.0 / theme.css v20.4.0: the chevron is now a filled gold circle the size of the stage-number badge
  (26px) with a bold 15px arrow, inverting on hover (navy↔gold) — clearly a button, where before it was a faint 11px glyph.
  `headOf` also recognises `.phf-band` and `.acc-custom-head` heads. Every status / list panel is now collapsible for
  consistency: data-acc added to Build All (run-panel) on Build POS Master Databases and Run All on POS New Product Check
  Clean (both stay open by default; no auto-close). The selected-input workspace panel (the Brand / input editor) and the
  dashboard intro are intentionally left non-collapsible — the workspace is the active editing surface, not a status panel.

## Staff Hub v21.25.18 (19 Oct 2026 00:30 AEDT)
- Reconcile CH2 Order auto-loads its POS reference from the browser Library even without a Combined Master build:
  reference-data.js v2.12.0 `status()` falls back to `lib:pos-db` (the POS Database full set) when `posMaster` is absent —
  both carry the POS columns, and `parsePosMaster`'s alias lists already accept the plain POS_* headers. workspace.js
  v2.12.0 adds `lib:pos-db` to REF_KINDS so the rail / readiness refresh when a POS build finishes. Fixes the
  "Reference data is not ready … POS / master required missing" state when the POS full set was already saved.
- The accordion is now applied to Reconcile CH2 (data-acc on Drop-all, Input readiness, the Reconcile stage card and
  Generated output files) and to the selected-input editor panel on both dashboard tools (phf-accordion v1.2.1: headOf
  recognises `.acc-custom-head`; the injected `.input-workspace-card` carries data-acc and is re-enhanced after showInput,
  so every panel on every page has the gold chevron). theme.css v20.4.1 centres the arrow in the circle (line-height 26px,
  13px glyph).
- Supplier toolbar (merge.css v1.16.0): the search box is a fixed 280px (was full-width, which pushed the buttons onto a
  second row), so Paste / Undo / Add 5 rows / Clean up empty rows / Delete rows / Clear Sheet / Copy headings sit on one
  row; it drops to full-width only below 720px.
- Responsive reflow confirmed: no page-level horizontal overflow at 1920 / 1440 / 1280 / 1024 on all three dashboard
  tools (CSS grid / flex with minmax(0,1fr); the sheet grids scroll inside their own frame, not the page).

## Staff Hub v21.25.19 (19 Oct 2026 01:00 AEDT)
- Reverted the v21.25.18 Reconcile fallback: reference-data.js v2.12.1 `status()` requires the merged master (posMaster)
  again — the POS Database full set (lib:pos-db) has no CH2 product-code / link columns, so auto-loading it produced a
  false "Ready" and then "Could not find a CH2 product-code column" at run. Reconcile now auto-loads posMaster from the
  Library when a Combined Master build has saved one, and shows "Admin setup required" otherwise. lib:pos-db removed from
  REF_KINDS (workspace.js v2.12.1).
- phf-accordion.js v1.2.2 / theme.css v20.4.2: the chevron arrow is now a CSS-drawn triangle (border triangle, 14px wide /
  9px tall) that fills the gold circle like the stage-number badge, instead of a small glyph. It points up when the panel
  is open, down when collapsed, drawn purely from the panel's `.acc-collapsed` state; on hover the circle goes navy and the
  triangle flips to gold. The `.acc-caret` glyph text is no longer set.
- Auto open/close simplified to one rule: a stage card auto-closes only when it reaches `done`. The Drop-all-input-files
  auto-close (pipeline.js updateBuildAll / merge app.js renderInputSummary) is removed, so the input, readiness, Build/Run
  All, output and library panels never move on their own — only when clicked. pipeline.js v21.16.3, app.js v1.16.7.
- Chevron coverage audited: every visible .panel on all three dashboard tools has data-acc + a chevron; only the one-line
  intro blurb and the Reconcile privacy footnote (both plain prose, no heading) are left without one.

## Staff Hub v21.25.20 (19 Oct 2026 14:30 AEDT)
- Fixed the Combined Master full / selected files failing verification and not being saved to the Library. Since v21.16.0 /
  v21.25.11 the full and selected master show spaced display headings in row 2 (MASTER_BARCODE → "MASTER BARCODE"), written
  by master-core.js v2.6.0 (`display = internal.map(h => PX.headerDisplay(h, true))`), while the data stays keyed to the
  underscore identifiers. `verifyMasterWorkbook` (pipeline.js) was still comparing the re-opened row-2 headings against the
  underscore `res.outHeaders` / `res.selectedHeaders`, so it always returned "header row differs from the required layout".
  `addOutput` treats any warn on a LIB_OUT key as a reason not to save, so the master (master-full → posMaster) was never
  written to the Library — which is the root cause of Reconcile CH2 Order reporting the POS / master as missing.
- Fix (pipeline.js v21.16.4): `verifyMasterWorkbook` now computes `show = headers.map(h => PHFXlsxStyle.headerDisplay(h, true))`
  for the full / selected sheets (the To-Order sheet already receives `res.order.display`, so `show = headers` verbatim for
  `kind==='order'`) and compares the re-opened row-2 headings against `show`. This mirrors `verifyBasic`'s existing
  `dispHeads(headers, spaced)` approach. The MASTER_BARCODE / POS_INDEX sample-row checks still use the underscore `headers`
  for `indexOf` and read `a[r+2]` positionally, so they are unaffected by the display spacing.
- The header-mismatch warning is now specific: it names the first differing column and what it found versus expected
  ("Full_Data: column 1 heading is "MASTER BRAND", should be "MASTER_BRAND""), or reports a column-count difference,
  instead of the generic "header row differs from the required layout".
- No change to master-core.js (v2.6.0, correct), the .gs/engine files, or any other tool. Only pipeline.js, the two index.html
  version badges/stamps and docs changed.

## Staff Hub v21.26.0 (20 Oct 2026 10:30 AEDT)
- Build POS Master Databases page layout rebuilt to remove duplicated output information and reclaim space. Driven by Kenneth's
  references (one home per piece of information, built from the pieces he liked in the live tool). No change to any build,
  validation, matching, column, sort, total or output file — only the HTML body, the render / wiring functions in pipeline.js
  and new CSS. pipeline.js v21.17.0, app.css v21.17.0, tool badge v21.17.0.
- New RUN STRIP (`#dbRunStrip`) at the top of `.builder-workspace`, replacing the old `dash-row-top` Build-all card: four step
  pills (POS / CH2 / Unique / Master) with `data-run-step`, `#buildAllBtn`, two gold download buttons `#dlFull` (Full merged
  master → `master-full` output) and `#dlOrder` (AV to Order → `master-order` output) shown only when their output exists,
  `#clearAllBtn`, and the reused `#globalProgress` / `#globalProgressBar` + `#globalStatus` as a progress bar + live status line.
  One shared `.db-pill` gold style (34px) for Build-all and both downloads.
- Drop All zone moved to the top of the input rail (`.rail-drop`); `#bulkDrop` / `#bulkInput` / `#bulkResults` and
  bulkAccept / renderBulk / wireBulkDrop unchanged in logic — incompatible files remain unassigned and are now shown compactly
  as not-loaded under the drop zone (reject-don't-assign surfaced).
- The four stage cards (`#stage-pos`..`#stage-master`), the `outputs-panel` ("All generated output files") and the `#autoDownload`
  box are replaced by ONE `#dbGroups` "Databases & generated files" panel: a collapsible `.dbgroup` per database (`#dbgroup-pos`,
  `-ch2`, `-uhp`, `-master`), each with number badge, name, status pill, row-count meta, a `.db-build` "Build / update" button
  (→ buildStage) and its own chevron; its output files render beneath via `renderOutputs` in the saved-files row style. Master
  group keeps `masterExtra()` (How-it-works + readiness chips) and the match summary.
- Functions rewritten for the new layout, build pipeline untouched: setGlobal, gpct (→ run-strip status + progress bar),
  stageSet (+ new setRunPill / updateDoneNote → step pills + group headers), renderStages (→ 4 collapsible groups),
  renderOutputs (+ fileRow / groupRows / bindTopDownload / OUT_META → grouped file rows + top-download wiring),
  refreshStageReadiness (→ run-strip pills + groups; `.stage-build` → `.db-build`). buildPos / buildCh2 / buildUhp / buildMaster,
  validateSheets, verifyMasterWorkbook unchanged.
- Collapse uses the shared chevron (assets/js/phf-accordion.js); Input readiness and each database group carry data-acc, with
  `PHFAccordion.refresh()` called after the groups render.
- Headless check (20 Oct): zero console errors; 4 run-strip steps; both top downloads present and hidden until built; 4 db
  groups; 7 chevrons toggle; 9 input rows; 5 readiness chips; gold pills all 34px.

## Staff Hub v21.26.1 (20 Oct 2026 10:45 AEDT)
- Styling fix on the v21.26.0 Build POS Master Databases layout (CSS only, tools/database-build/css/app.css v21.17.1; no HTML,
  JS or build change). The rollout had styled the Input readiness / Databases & generated files / Saved files panel heads with
  the tool's old plain `.results-head` (dark text on white) rather than the approved mockup's navy band + gold uppercase head.
- Added navy-band heads (scoped body.phf-page-db): `.dashboard-summary>.results-head`, `.db-files-panel>.results-head` and the
  library panel head get navy background, gold UPPERCASE h2, light sub-line and a white/green result badge; panel body padding
  restored since the head is now full-bleed.
- Readiness `.summary-chip` restyled to the mockup: `.ok` green, `.miss` red, base/`.opt` soft. The "From the Library: …" idle
  status line (`#dbStatLine` / `#globalStatusIdle`) has its border removed (it is an info note, not a boxed status).
- Rail hardened against narrow-width collapse: `.input-nav-item strong` forced `white-space:nowrap` + ellipsis and
  `.builder-sidebar` given a min-width, so input names no longer wrap one character per line.
- Headless check: zero console errors; heads render as navy/gold; narrow-viewport input name stays single-line.

## Staff Hub v21.27.0 (20 Oct 2026 11:00 AEDT)
- POS New Product Check Clean (tools/pos-supplier-merge/) given the same v3 layout as Build POS Master Databases. Layout and
  render code only — merge engine (v6.3.89 Web Worker + Apps Script files), matching, STATUS, OUT_MERGED_DATA, the POS
  INSERT / UPDATE TXT outputs and the whole sheet/workbook are unchanged. app.js TOOL_VERSION v1.17.0, merge.css v1.17.0,
  tool badge v1.17.0.
- The two run bars merged into one: the old "Run all" panel AND the sticky stepper above the sheet (.wb-runbar / #wbRunBar with
  its .wb-run buttons) are replaced by one #dbRunStrip-style run strip — 3 step pills (highlight / build / export) with
  data-run-step, #runAllBtn, #dlPosUpdate (POS UPDATE download, shown when the export txt output exists), #clearAllBtn ghost
  pill, and #globalProgress / #globalStatus as a progress bar + live status line. The .wb-runbar markup is removed (a hidden
  #wbRunStatus is kept for any code that referenced it).
- The three stage cards (#stage-highlight/#stage-build/#stage-export) and the "Generated output files" panel (#allOutputs)
  become one collapsible navy-head "Stages & generated files" panel (#mergeGroups): a group per stage (#mgroup-highlight,
  -build, -export) with number, name, status pill, a .db-build "Run / update" button and a chevron. Stage 1 is status-only
  (no file); stage 2 shows the review workbook (addOutput 'build' / xlsx-review); stage 3 shows the POS TXT files (addOutput
  'export' / txt-*). renderOutputs rewritten to group by stage.
- Functions reworked, pipeline untouched: setGlobal / gpct (→ run strip + progress), stageSet / stageMsg (+ setRunPill /
  updateDoneNote → pills + group headers), updateRunButtons (→ .db-build; .wb-run dropped), renderStages (→ 3 groups),
  renderOutputs (+ fileRow / bindPosUpdate / OUT_FRIENDLY). runTo, afterStage, the bulk logic and all sheet/workbook code are
  unchanged.
- CSS: merge.css gains a copy of Build POS Master's app.css v21.17.0 + v21.17.1 blocks (run strip, .db-pill, .dbgroup/.dbhdr/
  .frow, navy .results-head heads, styled .summary-chip, borderless status note, rail min-width) plus merge-specific rules
  (.db-group-nofile, .db-group-status.ready). The body already carries phf-page-db so body.phf-page-db selectors match.
- Only the run-strip buttons took the shared gold .db-pill style; the in-sheet toolbar buttons (Paste / Add rows / etc.) were
  left as they were, per the request to keep all sheet options as is.
- Headless check: zero console errors; one run strip (no .wb-runbar); 3 step pills; POS UPDATE download hidden until built;
  3 stage groups; 3 readiness chips; workbook + tabs intact; .dashboard-summary>.results-head background computed #1E3A5F.

## Staff Hub v21.28.0 (20 Oct 2026 12:30 AEDT) — UI/UX refinement package (Tasks 1–11)
- New shared component stylesheet assets/css/phf-ui.css v1.0.0 (scoped body.phf-page-db, built on theme.css --phf-* tokens):
  run strip + .phf-step pills + .db-pill actions (ghost / .db-danger), .phf-badge system (green success only / amber review /
  red error / neutral waiting + counts), navy .results-head panel heads, .dbgroup/.dbhdr group headers, one-line .frow file
  rows, rail .bulk-row assignment rows, focus-visible rings. The duplicated v21.17.0/v21.17.1 blocks were REMOVED from
  tools/database-build/css/app.css and the copied block from tools/pos-supplier-merge/css/merge.css; both index.html files link
  ../../assets/css/phf-ui.css?v=1.0.0 after theme.css. One authoritative source for shared presentation.
- Build POS Master Databases v21.18.0 (pipeline.js, app.css, index.html): #dbRunStrip relocated to a direct child of <main>
  above .builder-shell, full width, position:sticky top:0 z-index:40; main/shell overflow visible so sticky works; panels get
  scroll-margin-top. Stage pills are <button type=button data-run-step> → buildStage(id); setRunPill sets disabled/aria-disabled
  from readiness/busy; lockRunControls() disables pills + .db-build during buildStage/buildAll; buildStage refuses when
  prerequisites are missing. Actions grouped right in .db-actions; #clearAllBtn now confirm()s before reload. renderBulk status
  words READY / UPDATED / REVIEW / INCOMPATIBLE (classes drive .phf-badge colours); READY rows no longer render the disabled
  select. addOutput records `at` (whenText) for the one-line .frow (tick · name · filename · meta · made-at · size · Download).
  Group status line hidden when DONE for pos/ch2/uhp (kept for master = match summary, and for running/error/missing).
  #autoDownload box removed from HTML + autoDownloadFull/deleteStageOutputs; the automatic download itself unchanged.
  #outputCount = "n FILES · m IN LIBRARY", neutral unless all stages DONE. Root cause of the one-letter wrapping documented:
  the old .bulk-row grid (minmax(0,1fr) auto auto + overflow-wrap:anywhere) inside the 300px rail.
- POS New Product Check Clean v1.18.0 (app.js, merge.css, index.html): same strip relocation + sticky; strip pills are buttons →
  runTo(stage) with setRunPill disabled handling; each .dbhdr .db-act gets a compact .phf-step.db-build numbered pill
  ("① Run stage 1") → runTo, e.stopPropagation() so it never toggles the accordion; the big "Run / update stage N" buttons are
  gone. #storageNote and the "Saved vs session" .sidebar-footer removed from HTML (LIB.persisted() callback already null-guarded).
  renderBulk status words + one-line .frow as above. Workbook / sheet code untouched.
- Hub badge v21.28.0. Tests and unverified items are listed in docs/GITHUB-RELEASE-v21.28.0.md.

## Staff Hub v21.29.0 (20 Oct 2026 13:15 AEDT)
- Rail rows carry the file state in all three tools. Per-input flags (pipeline.js `state.updated` / `state.reject`; merge app.js
  `railFlags`; reconcile workspace.js `flags`) are set in the accept paths (acceptInputFile / acceptFile+addToInput /
  saveReference+acceptFiles) and cleared on remove / clear. Rail classes `.input-nav-item.updated` (blue, --phf-blue-*) and
  `.input-nav-item.incompatible` (bright yellow, new --phf-yellow-bg/line/ink at the top of phf-ui.css) + `.input-nav-note`
  one-line "file — reason" (ellipsis, title). `.bulk-results` now renders ONLY entries that need a choice (unrecognised /
  unreadable / duplicate / review) as a single yellow REVIEW row with select + Assign; assigned and per-input-rejected files no
  longer appear there. bulkAccept / bulkAssign logic unchanged.
- One destructive style `.db-danger` (REQUIRED-pill look) for every CLEAR … button in all three tools (text in caps); ids and
  handlers kept; db-build Clear session keeps its confirm().
- `.db-home` apple link (assets/icons/icon-32.png → ../../index.html) at the far left of #dbRunStrip in all three tools.
- Merge: `HIDDEN_INPUTS = {brands}` + `visibleInputs()` filter the rail, readiness chips/count, readinessText() ("Missing: …"),
  requiredReady() and the Drop-All select. Input definition, Library load, Drop-All recognition, buildSheetsPayload (the
  SRC_POS_BRAND_NAME_CHANGES table is still sent to the engine), the workbook tab and persistence are untouched. Consequence:
  brands no longer gates the run (engine's brand map defaults to {} when absent).
- Reconcile CH2 Order v2.13.0 on the shared layout: body.phf-page-db + phf-ui.css; `#dbRunStrip` (home, 3 step pills, #runBtn
  "Run all", #dlPosImport, #clearBtn CLEAR FILES, #progress/#status) as a direct child of <main> above .builder-shell;
  `.rail-drop` Drop All at the top of the rail; navy Input readiness; `#stepGroups` with a `.dbgroup` per step and a
  `.phf-step.db-build` "Run step N" header pill (stopPropagation). Step mapping over the unchanged engine: 1 Check inputs =
  refreshReferenceStatus() + the existing #runBtn gate; 2 Reconcile = app.js run() (exposed on PHFReconcileApp; DONE when
  #results is shown); 3 Export files = the existing #downloadBtn and sibling downloads (runs step 2 first if needed); Run all =
  run() then step 3. Old #stage-reconcile card, #allOutputs panel and the "Saved vs session" footer removed; #results untouched.
- phf-ui.css v1.1.0: !important 10 → 15 (five border-colour overrides because theme.css sets .input-nav-item.loaded/.missing
  border-color with !important; noted inline). Tool stylesheets untouched (no duplicates re-added).
- Versions: hub v21.29.0; Build POS Master v21.19.0 (app.css/pipeline.js ?v=21.19.0); merge v1.19.0 (merge.css/app.js ?v=1.19.0);
  reconcile v2.13.0 (app.js/workspace.js ?v=2.13.0); phf-ui.css ?v=1.1.0 in all three. Tests / unverified in the release note.

## Staff Hub v21.30.0 (20 Oct 2026 14:20 AEDT)
- phf-ui.css v1.2.0: `.db-home` transparent (no disc, gold ring on hover/focus-visible); `.db-danger` = REQUIRED badge look
  (--phf-red-bg fill, red ink/line, pill, 10px/800 caps, auto width); `.sidebar-actions` flex row (pills flex:1 1 0, wrap
  ≤820px); `.db-outline` secondary pill (active = navy fill); `.rail-drag` gold inset ring + tag on the sidebar during a drag.
- Generated-file rows now emit the Library row markup (`.phf-lib-row` › `.phf-lib-dot/-what/-when/-size/-flow/-btns`,
  `.phf-lib-btn.download`) via `libRow` (pipeline.js, merge app.js) / `renderOutputs` (reconcile workspace.js); hosts get
  `.phf-lib-list`. `.output-warning` stays a full-width line. No per-file ✕ (outputs have no delete).
- `wireRailDrop()` in all three tools: `.builder-sidebar` dragenter/over (Files only) → `.rail-drag`; drop → bulkAccept /
  tool equivalent; row and zone handlers preventDefault+stopPropagation first and the sidebar handler skips defaultPrevented.
- Reconcile v2.14.0: step 3 group lists the four exports as rows whose Download runs the same code as the toolbar button;
  `madeAt`/`noteMade` record build time; `#resultSteps` row of `.phf-step` pills above `.result-actions`; `setRunPill` updates
  every `[data-run-step]`; toolbar downloads `.db-pill` (CSS ↓ prefix so textContent updates survive), secondaries
  `.db-outline`, Clear qty `.db-danger`. Export sizes unknown until built (builders download as they build) — extension shown
  until then.
- Versions: hub v21.30.0; Build POS Master v21.20.0; merge v1.20.0; reconcile v2.14.0; phf-ui.css ?v=1.2.0 in all three.

## Staff Hub v21.30.1 (20 Oct 2026 14:45 AEDT)
- Progress row: db-build / merge `stageSet` now toggle `#globalProgress` (+ `.db-bar.indet` animation, `#globalStatus` live
  message, `#dbStatLine` idle line) from "any stage running", not only from `gpct()` (which only Build All / the merge loop
  call). `gpct(v>0)` clears `.indet`.
- Rail: phf-ui.css v1.2.1 `body.phf-page-db .builder-shell .builder-sidebar{position:sticky;top:calc(var(--db-strip-h)+10px);
  height:auto;max-height:calc(100vh - var(--db-strip-h) - 22px)}` overrides the tool stylesheets' fixed height/top. Each
  index.html inline script sets `--db-strip-h` from `#dbRunStrip` via ResizeObserver.
- Versions: hub v21.30.1; db-build v21.20.1; merge v1.20.1; reconcile v2.14.1; phf-ui ?v=1.2.1.

## Staff Hub v21.31.0 (20 Oct 2026 20:30 AEDT) — Reconcile CH2 Order Tasks 12–16
- Reconcile v2.15.0. index.html: #downloadBtn / #fullDownloadBtn / #fullCsvDownloadBtn / #keyReviewBtn moved into
  `#resultSteps .result-downloads` (ids, handlers and disabled/hidden logic unchanged; visible labels without "Download",
  aria-labels keep it — app.js label strings updated accordingly); `#exportNotice` (.phf-notice) between the step row and
  `.result-actions`; input cards gain data-acc + `.acc-custom-head`, meta boxes folded in `details.input-meta-fold`.
- app.js: `showExportNotice(message)` renders the export-guard message (first line bold, bullets as a list, dismiss ✕) and
  replaces `globalThis.alert` in the POS-view export catch (alert kept as fallback if the element is missing; console.warn kept).
  The guard rule itself (validatePayload / no supplied rows) is untouched.
- workspace.js: STEPS gain needs / produces / output / how (each claim checked against core/reconcile.js, export/pos-import.js,
  app.js); `previewHtml('export')` lists PHF.posImport.CONTRACT.headers (15) and PHF.schema.HEADERS (43) at runtime;
  `renderVersions()` writes the page badge + PHF.schema.BUILD into `#stepsVersion`; header Run pills no longer contain a `.st`
  status (setRunPill already null-guards it; the `.db-mini` badge carries the status).
- CSS: app.css `.table-search` max-width 460px → none; workspace.css compact drop zone / meta / intro. phf-ui.css v1.3.0 adds
  `.result-steps .result-downloads`, `.result-actions` toolbar (search flex:1), `.phf-notice`, `.db-step-facts`, `.master-how`
  body, `.db-cols`, `.steps-version`, `.input-meta-fold`, one right-edge cluster for `.results-head/.dbhdr/.input-workspace-head`,
  shared `.dbhdr` order (db-act 1 → db-mini 2 → acc-caret 3) for all three tools, and `.builder-workspace>#toolLibrary`
  padding override (the only new !important, against theme.css's existing `padding:16px !important`).
- Regression: real reconciliations of invoices 74147128 and 74154567 on v21.31.0 and the committed v21.30.1 produced
  byte-identical POSActive TXT, full CSV and POS key review CSV; full .xlsx identical except docProps/core.xml timestamps.
- Versions: hub v21.31.0; reconcile v2.15.0; Build POS Master v21.20.2; POS New Product Check Clean v1.20.2; phf-ui ?v=1.3.0.

## Staff Hub v21.32.0 (20 Oct 2026 21:30 AEDT) — Library Add buttons (A–P files), merge sheet steps row, previous-build files, UPDATED → LOADED
- phf-library.js v1.1.3: KINDS `lib:ch2-posdb` / `lib:uhp-posdb` ("CH2 / Unique supplier layout (A–P)", made by Build POS
  Master, used by the merge Add buttons). `lib:ch2-db` / `lib:uhp-db` (full sets) stay, now described as the Add fallback.
- Build POS Master v21.21.0 (pipeline.js): `LIB_OUT` maps output keys `ch2-db` / `uhp-db` (the clean_…_pos_db A–P files) to
  the new kinds. `invalidate()` calls `markStale(stage)` instead of `deleteStageOutputs` — rows keep their blob URL, get
  `o.stale=true`, render with `.is-stale` + "Previous build · inputs updated" (libRow) and a `.db-stale-note` above the
  groups; `bindTopDownload` outlines stale strip buttons. `stageSet(id,'done')` → `stageRebuilt(id)` drops that stage's
  stale rows and removes `id` from every `state.updated[input]` pending Set (filled from `INPUT_STAGES` when a valid file
  replaces another), deleting the flag when the Set empties. deleteStageOutputs is kept (no callers now).
- supplier-layout.js v1.1.1: `fromFullSheet` normalises headings with `.replace(/\s+/g,'_')` (the full sets have spaced
  headings since `PHFXlsxStyle.headerDisplay`, so the fallback Add found no columns). Merge app.js `isCombinedMaster` same.
- POS New Product Check Clean v1.21.0 (app.js): `LIB_SUP_SRC` = CH2 [lib:ch2-posdb, lib:ch2-db], Unique [lib:uhp-posdb,
  lib:uhp-db] — first saved kind wins; `libSupButtonsHtml` always renders (missing → disabled `.is-missing`).
  Card markup `.sup-card-actions` (link left, `[data-lib-sup-host]` right). `#wbSteps` above the workbook tabs repeats
  the strip's `[data-run-step][data-stage][data-run-pill]` buttons + `[data-run-all]` + `#wbDlPosUpdate` / `#wbDlPosTxt2`;
  `setRunPill` updates every copy, boot wires every `[data-run-step][data-stage]` / `[data-run-all]`, `updateRunButtons`
  syncs `[data-run-all]`. `bindPosUpdate` sorts `txt-*` outputs (UPDATE first) and labels each button from the filename
  (`txtKind`). `stageSet(…,'done')` clears `railFlags.updated`. Stage header button `.db-build` "Run / update stage N".
- Reconcile v2.16.0 (workspace.js): STEPS text restored from v2.14.1; `previewHtml` / `renderVersions` / `#stepsVersion`
  removed. `renderEngine()` fills `#engineVersion` from `PHF.schema.BUILD` and `#engineState` (green when XLSX, pdfjsLib,
  ExcelJS, JSZip, PHF.schema and PHF.posImport exist). `noteRunFinished()` (start of `render()`) clears `flags.updated` on
  the results hidden → shown transition. Header button `.db-build` "Run / update step N".
- phf-ui.css v1.4.0: removed `.db-step-facts`, `.master-how*`, `.db-cols`, `.steps-version` and the shared `.dbhdr` order
  rules (headers follow DOM order: badge → button → chevron); added `.dashboard-intro .engine-state`, `.phf-lib-row.is-stale`,
  `.stale-tag`, `.db-stale-note`, `.db-pill.is-stale`, `.wb-steps`. merge.css: `.sup-card-actions` row (wraps ≤1180px),
  `.sup-lib-add.is-missing`; its `.engine-state` rules moved to phf-ui.css.
- Versions: hub v21.32.0; Build POS Master v21.21.0; POS New Product Check Clean v1.21.0; reconcile v2.16.0;
  phf-ui ?v=1.4.0; phf-library ?v=1.1.3; supplier-layout ?v=1.1.1.
