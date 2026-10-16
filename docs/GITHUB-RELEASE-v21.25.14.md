# Staff Hub v21.25.14 — one consolidated outputs panel for Build POS Master Databases (17 Oct 2026 06:40 AEDT)

**Summary:** v21.25.14 — Build POS Master Databases stops listing the same files in four places: the stage cards show a status badge and a "View in outputs" jump link, and every generated file lives once in a grouped outputs panel (Final master pinned on top, intermediate files below) with persisted / temporary chips and collapsible warnings

## Commit notes
- Single source of truth for downloads. The stage cards no longer embed download blocks or the per-stage output drop-down
  (v21.25.13). A finished stage shows a `✓ 34,285 ROWS` badge and a "View in outputs ↓" link that scrolls to and briefly
  highlights that stage's files in the outputs panel.
- The "All generated output files" panel is now grouped: "Final — Combined Master" (the three Combined Master files)
  pinned at the top with the full merged master's Download as the primary action, then "POS Database", "Oborne / CH2" and
  "Unique / UHP" intermediate groups below. Each row carries an In Library / Temporary chip (persisted vs this-session) and
  shows schema / audit warnings in a collapsible disclosure rather than repeating the text on every card.
- Build All shows high-level metrics — master records, stages built and duration, warning count — and one "Download final
  master" button; it no longer re-lists the intermediate files.
- All processing, parsing, warnings, audit counts, drag-and-drop staging and Library persistence are unchanged; this is a
  presentation refactor of where outputs are shown. Diagnostic detail is kept, shown once, behind a disclosure.

## Files
- Changed: index.html (v21.25.14), assets/css/compact-layout.css (v1.2.0), tools/database-build/{index.html, js/pipeline.js
  v21.18.0}, tools/pos-supplier-merge/index.html, tools/reconcile-ch2/index.html (compact-layout cache-buster only),
  docs/ARCHITECTURE.md.
- New: docs/GITHUB-RELEASE-v21.25.14.md.

## Testing done (17 Oct, headless Chromium)
- The grouped outputs panel rendered with the real render functions and sample data: Final — Combined Master pinned on top
  (full master = primary green Download, the other two secondary), POS / CH2 / Unique intermediate groups below, In Library
  / Temporary chips per row, and a "⚠ N notes" disclosure that expands to the full warning text. Build All shows the three
  metric tiles and the single primary action.
- Build POS Master Databases page: 4 stage cards, none with embedded downloads or whole-panel collapse; 4 "View in outputs"
  jump links present and hidden until a build produces files; the Build All widget hidden until a build. The input,
  readiness, output and saved-files panels keep their collapse behaviour. No console errors; the merge tool still loads
  cleanly (the new styles are scoped to the database page).

## Note
- A full 4-stage build end-to-end was not run here (it needs the raw POSActive exports and the ExcelJS CDN, both
  unavailable in the test sandbox). The render path and page wiring are verified; worth a quick look at a real Build All
  after deploy.
