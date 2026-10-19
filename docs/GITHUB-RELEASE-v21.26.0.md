# Staff Hub v21.26.0 — Build POS Master Databases: new single-screen layout (run strip + one Databases & generated files panel) (20 Oct 2026 10:30 AEDT)

**Summary:** v21.26.0 — rebuilds the Build POS Master Databases screen so each piece of information has one home and the wasted / duplicated space is gone: a compact run strip at the top (four step pills, Build all, Full merged master + AV to Order download buttons, Clear session, and a progress bar with a live "what it's doing" line), the Drop All zone moved to the top of the input rail, and one collapsible "Databases & generated files" panel — a group per database with its own Build / update button and its output files beneath, replacing the four stage cards and the separate output list. No change to any build, column, sort, total or output file.

## Commit notes
- Layout only — the four databases are built exactly as before (POS v5.3.0, CH2 v1.3.0, Unique v1.3.0, Combined Master v2.6.0,
  Python Steps 1 / 2 / 2.5 / 3 V30.15). No build, validation, matching, column, sort, total or output-file change.
- New RUN STRIP at the top of the workspace: four step pills (① POS · ② CH2 · ③ Unique · ④ Master) showing WAITING / READY /
  RUNNING / DONE / ERROR; the "Build all databases" button; two gold download buttons — "Full merged master" and "AV to Order"
  — shown only once those files have been built; "Clear session"; and a progress bar + a single live status line ("what it's
  doing · ~ETA") while a build runs. The two top download buttons, the Build-all button and both download buttons are one
  identical gold pill (same height, padding and font).
- The "Drop All Input Files" zone moved to the top of the left input rail (the rail's look, rows, pills and Clear-input-files
  are unchanged). Files that do not meet a required layout are listed as not loaded, with the reason, instead of being assigned
  to a database — so you can see what still needs the right file.
- "Input readiness" kept, now collapsible from its chevron.
- One "Databases & generated files" panel replaces the four stage cards, the separate "All generated output files" panel and the
  old "Build all" output box. It is collapsible, and holds one group per database: a header with the stage number, name, status,
  row count, a "Build / update <database>" button and its own chevron; beneath it, that database's output files in the saved-files
  row style (friendly name · filename · saved to Library · used by · size · Download). Combined Master keeps its "How Combined
  Master works" note and the POS / CH2 / Unique readiness chips, and the match-check summary.
- Every panel and database group collapses with the shared gold-circle chevron (assets/js/phf-accordion.js), the same control
  used across the hub.

## Files
- Changed: index.html (hub badge v21.26.0, stamp), tools/database-build/index.html (tool badge v21.17.0, app.css?v=21.17.0,
  pipeline.js?v=21.17.0, stamp), tools/database-build/js/pipeline.js (VERSION v21.17.0 — render / wiring functions rewritten:
  setGlobal, gpct, stageSet, renderStages, renderOutputs, refreshStageReadiness, plus new run-strip / group / file-row / top-
  download helpers), tools/database-build/css/app.css (new run-strip, gold-pill, database-group and file-row styles),
  docs/ARCHITECTURE.md, docs/GITHUB-RELEASE-v21.26.0.md (new).
- Unchanged: master-core.js, all .gs / engine files, and the build pipeline — buildPos / buildCh2 / buildUhp / buildMaster,
  validateSheets and verifyMasterWorkbook are untouched.

## Testing done (20 Oct, headless Chromium)
- Page loads with zero console errors. Run strip renders its four step pills; both top download buttons exist and are correctly
  hidden until their master output is built; "Build all databases" present.
- "Databases & generated files" renders its four groups (POS / CH2 / Unique / Master), each with a Build / update button; the
  group and panel chevrons toggle; "Input readiness" renders its five chips and collapses.
- Left input rail renders its nine input rows with the Drop All zone on top; required-missing files show the red state; bulk
  drop still wires.
- The three gold pills (Build all + the two downloads) measured at the same 34px height.
- A full end-to-end build was not run in the sandbox (the POS / CH2 / Unique stages load ExcelJS from a CDN the test sandbox
  blocks); the build pipeline itself is unchanged from v21.17.0's predecessor, and only the layout / render code was touched.
