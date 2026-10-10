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

