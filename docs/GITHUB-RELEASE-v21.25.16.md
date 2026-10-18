# Staff Hub v21.25.16 — one simple collapsible panel everywhere, output refactors rolled back (18 Oct 2026 13:30 AEDT)

**Summary:** v21.25.16 — rolls back the output drop-downs, grouped panels, jump links and collapsible workbook from v21.25.13–15, and gives every panel one consistent chevron accordion: ▾ down when closed, ▴ up when open, click anywhere in the heading to toggle, and stages / the input panel close themselves once they are done or loaded

## Commit notes
- Back to the clean v21.25.12 layout: the per-stage output drop-downs (v21.25.13), the grouped Final/Intermediate outputs
  panel with jump links and Build All metric tiles (v21.25.14), and the merge-tool consolidation / collapsible workbook /
  folded library (v21.25.15) are removed. The outputs panel and the per-tool Saved-files library are back to their simple
  form on both tools.
- Every panel — the numbered stage cards, the input panels, readiness and the outputs panel — now uses one consistent
  accordion: a chevron on the right of the heading pointing ▾ down when closed and ▴ up when open, as a round button that
  inverts navy↔gold on hover like the top-nav icons. Click anywhere in the heading, or the chevron, to open or close.
- Stages tidy themselves away: a stage card closes when it finishes, and the "Drop all input files" panel closes once all
  the required files are loaded. Click any panel to open it again — once you have, your choice is kept and nothing
  auto-closes it after that.
- No processing, parsing, warnings, grid editing, export or Library behaviour changed — this is layout only.

## Files
- Changed: index.html (v21.25.16), assets/js/phf-accordion.js (v1.1.0), assets/css/theme.css (v20.3.0),
  tools/database-build/{index.html, js/pipeline.js v21.16.1}, tools/pos-supplier-merge/{index.html, README.md, js/app.js
  v1.16.5}, tools/reconcile-ch2/index.html (theme cache-buster), docs/ARCHITECTURE.md. (pipeline.js, app.js, both index.html,
  theme.css, compact-layout.css, merge.css, library.css and hub-library.js were first restored to their v21.25.12 state.)
- New: docs/GITHUB-RELEASE-v21.25.16.md.

## Testing done (18 Oct, headless Chromium)
- POS New Product Check Clean (fresh storage, real 13/15 Oct data): the chevron reads ▴ when open and ▾ when closed;
  clicking a heading collapses the panel and flips the chevron; the chevron reopens it. The Drop-all-files panel
  auto-closes once the required inputs are loaded; all three stage cards auto-close when the run finishes (badges stay
  visible); clicking a collapsed stage expands it with its Run button intact. No console errors.
- Build POS Master Databases: 4 stage cards each with a right-aligned round chevron (▴ open), plus chevrons on the input,
  readiness, outputs and library panels; clicking a stage heading collapses it and flips the chevron to ▾. No errors.
- All five pages load with no console errors.
