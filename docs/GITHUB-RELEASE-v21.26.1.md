# Staff Hub v21.26.1 — Build POS Master Databases: panel heads restored to the approved design, rail fix (20 Oct 2026 10:45 AEDT)

**Summary:** v21.26.1 — a styling fix on the v21.26.0 Build POS Master Databases layout. The "Input readiness", "Databases & generated files" and "Saved files" panel headings now show as navy bands with gold uppercase titles (as in the approved mockup) instead of plain dark text; the readiness chips are styled to match; the "From the Library: …" info line no longer draws a border box; and the input rail no longer collapses to one letter per line on a narrow window. CSS only — no change to any build, structure or behaviour.

## Commit notes
- The v21.26.0 rollout shipped the new layout but styled the three right-hand panel heads with the tool's old plain-panel CSS
  instead of the navy-band / gold-uppercase heads shown in the approved mockup. v21.26.1 adds that head styling (scoped to
  body.phf-page-db) for Input readiness, Databases & generated files and Saved files: navy background, gold UPPERCASE heading,
  light sub-line, white badge (green when ready).
- Readiness chips restyled to match the mockup — green when a group is ready, soft when optional, red when a required file is
  missing (the .ok / .miss / .opt classes the renderer already sets).
- The "From the Library: …" reuse note is an info line, not a boxed status, so its border / background is removed.
- Input rail hardened: `.input-nav-item strong` stays `white-space:nowrap` with ellipsis and the sidebar keeps a minimum width,
  so input names always read on one line instead of wrapping one character per line when the window is narrow.
- CSS only (tools/database-build/css/app.css). No HTML structure, no JavaScript, no build / validation / output change.

## Files
- Changed: index.html (hub badge v21.26.1, stamp), tools/database-build/index.html (tool badge v21.17.1, app.css?v=21.17.1,
  stamp), tools/database-build/css/app.css (v21.17.1 corrective block), docs/ARCHITECTURE.md, docs/GITHUB-RELEASE-v21.26.1.md (new).
- Unchanged: pipeline.js and every build / engine / .gs file.

## Testing done (20 Oct, headless Chromium)
- Page loads with zero console errors; run strip (4 steps), 4 database groups, 7 chevrons (toggle works), 9 input rows and 5
  readiness chips all render.
- The three panel heads render as navy bands with gold uppercase titles; chips show the ready / optional / missing colours.
- At a narrow viewport the input-row name stays on one line (white-space nowrap, single-line height) instead of stacking one
  letter per line.
