# Staff Hub v21.27.0 — POS New Product Check Clean: same single-screen layout as Build POS Master (20 Oct 2026 11:00 AEDT)

**Summary:** v21.27.0 — gives POS New Product Check Clean the same layout as Build POS Master Databases: the two run bars (the "Run all" panel and the separate stepper above the sheet) merge into one run strip at the top, and the stage cards plus the separate "Generated output files" panel become one "Stages & generated files" panel with navy heads and a collapsible group per stage. The whole editable workbook — the IN_SUPPLIER and OUT_MERGED_DATA sheets, the SRC_ tabs, the toolbar and every sheet option — is kept exactly as it was; only the run-strip buttons take the shared gold-pill style. No change to the merge engine, the Apps Script files, or any build / output.

## Commit notes
- Layout only — the merge runs exactly as before (engine v6.3.89, the unchanged Apps Script files). No change to matching,
  columns, STATUS, OUT_MERGED_DATA, the POS INSERT / UPDATE TXT files or any sheet behaviour.
- The TWO run bars are merged into ONE run strip at the top: three step pills (① Highlight + Best Buy · ② Build
  OUT_MERGED_DATA · ③ Insert + Update & Export) showing WAITING / READY / RUNNING / DONE / ERROR; "Run all stages"; one gold
  "POS UPDATE" download button (the main POSActive hand-off, shown once stage 3 has run); "Clear results"; and a progress bar
  + a live status line. The old sticky stepper above the sheet (wb-runbar) is removed — its run controls now live in the strip.
- The three stage cards and the separate "Generated output files" panel become one "Stages & generated files" panel: a
  collapsible group per stage — stage 1 (Highlight + Best Buy) is status-only (it produces no file), stage 2 (Build
  OUT_MERGED_DATA) holds the review workbook, stage 3 (Insert + Update & Export) holds the POS TXT files — each with a
  "Run / update" button, a chevron, and its files beneath in the saved-files row style (name · filename · saved to Library ·
  size · Download).
- The "Drop All" zone moved to the top of the left input rail (the rail's look and its three groups — POS data, Supplier
  updates, Reference data — are unchanged). Input readiness and each group collapse with the shared chevron; the panel heads
  are navy bands with gold uppercase titles, matching Build POS Master.
- The editable workbook is untouched: the IN_SUPPLIER sheet, the OUT_MERGED_DATA review table (search, Sheet / Review view,
  pager), the SRC_ tabs, the toolbar (Paste, Add 5 rows, Clean up empty rows, Delete rows, Undo, Clear Sheet, Copy headings),
  the UPDATE IN POS / Discontinue options and the totals band all stay as they were. Only the run-strip buttons took the
  shared gold-pill style; the in-sheet toolbar buttons are unchanged.

## Files
- Changed: index.html (hub badge v21.27.0, stamp), tools/pos-supplier-merge/index.html (tool badge v1.17.0, merge.css?v=1.17.0,
  app.js?v=1.17.0, stamp), tools/pos-supplier-merge/js/app.js (TOOL_VERSION v1.17.0; render / wiring reworked — setGlobal, gpct,
  stageSet, renderStages, renderOutputs, updateRunButtons, plus setRunPill / updateDoneNote / fileRow / bindPosUpdate),
  tools/pos-supplier-merge/css/merge.css (v1.17.0 — the run strip, gold pill, stage groups, file rows and navy panel heads,
  copied from Build POS Master's app.css v21.17.0 + v21.17.1), docs/ARCHITECTURE.md, docs/GITHUB-RELEASE-v21.27.0.md (new).
- Unchanged: the merge engine / Web Worker, every Apps Script file, runTo / afterStage / bulk logic, and the entire workbook
  and sheet code.

## Testing done (20 Oct, headless Chromium)
- Page loads with zero console errors. One run strip with three step pills; the old sticky stepper above the sheet is gone.
- The POS UPDATE download button exists and is correctly hidden until stage 3 has produced it.
- "Stages & generated files" renders three groups (highlight status-only · build · export); Input readiness renders its three
  chips; all collapse with the chevron.
- Panel heads compute as navy (#1E3A5F) with gold (#E6CD74) uppercase titles.
- The workbook, its tabs and the OUT_MERGED_DATA / IN_SUPPLIER sheets still render with the full toolbar and options.
- A full end-to-end merge was not run in the sandbox (the engine Web Worker / CDN assets are blocked there); the engine and
  merge logic are unchanged from the predecessor, and only the layout / render code was touched.
