# Staff Hub v21.25.15 — consolidated outputs on the merge tool, and the 21-sheet workbook tucks away (17 Oct 2026 07:45 AEDT)

**Summary:** v21.25.15 — POS New Product Check Clean gets the same single outputs panel as the database tool (stage status badges + jump links, grouped files, metrics-only Run All), both tools fold their saved-files library into one "Outputs & Storage" drawer, and the merge tool's big workbook becomes a collapsible region that opens itself after a run

## Commit notes
- POS New Product Check Clean, outputs consolidated (matching v21.25.14): stage cards show a `✓ N rows` / `✓ N TXT` badge
  and a "View in outputs ↓" link (the per-stage download drop-downs are gone); one grouped outputs panel — "POS import
  files — upload to POSActive" pinned on top with the primary Download, "Review workbook" below — with a Session chip per
  row and warnings in a collapsible note; Run all shows metric tiles (OUT rows, POS import files, duration, warnings) and
  one "Download POS import files" button.
- Outputs & Storage drawer on both tools: the outputs panel is renamed "Outputs & Storage" and the per-tool saved-files
  library is folded into it as a collapsed "Saved in this browser · N files" sub-section (no separate panel). One place,
  no duplication; reference files stay one click away without going back to the home page.
- The merge tool's 21-sheet workbook is now a collapsible region with a sticky "Review & Edit Sheets (N)" bar: collapsed
  while you stage and run, it opens itself and scrolls into view when a run finishes, and you can collapse it to get back
  to the pipeline controls without scrolling past every sheet.
- Tighter spacing between staging, stage cards and outputs on both tools. All processing, parsing, warnings, audit counts,
  grid editing, export and Library persistence are unchanged — this is a layout refactor.

## Files
- Changed: index.html (v21.25.15), assets/js/hub-library.js (v2.1.0), assets/css/library.css (v2.1.0),
  assets/css/compact-layout.css (v1.3.0), tools/pos-supplier-merge/{index.html, README.md, js/app.js v1.17.0,
  css/merge.css v1.16.0}, tools/database-build/index.html, tools/reconcile-ch2/index.html (asset cache-busters),
  docs/ARCHITECTURE.md.
- New: docs/GITHUB-RELEASE-v21.25.15.md.

## Testing done (17 Oct, headless Chromium)
- Merge tool end-to-end (real 13 Oct + 15 Oct data): before a run the workbook is collapsed, stage jump-links hidden, the
  library drop-down present inside the outputs drawer. After Run All: the workbook auto-opens showing "(10)" sheets; stage
  badges read ✓ 3,125 ROWS / ✓ 3,174 ROWS / ✓ 2 TXT; the outputs panel groups "POS import files" (primary + secondary
  Downloads) and "Review workbook" with Session chips; Run all shows the three metric tiles and the Download POS import
  files button; the workbook toggle collapses it again; the export jump link flashes its rows; the OUT grid still shows its
  6 ticks. No console errors.
- Build POS Master Databases: the outputs panel reads "Outputs & Storage" with the library folded into a "Saved in this
  browser · N files" drop-down (2 rows), no standalone library panel, no errors.
- All five pages load with no console errors.
