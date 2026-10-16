# Staff Hub v21.25.13 — stage output drop-downs (17 Oct 2026 02:05 AEDT)

**Summary:** v21.25.13 — each build / merge stage card gets an "Output files" drop-down that opens when the stage finishes and reveals that stage's generated files, with the stage heading, status and Build / Run button always visible

## Commit notes
- The stage cards on Build POS Master Databases and POS New Product Check Clean no longer collapse as a whole (that hid
  the Build / Run button). Each stage card now has an "Output files · N files" drop-down beneath its button that reveals
  the files that stage generated, with their Download buttons. It opens by itself the moment a stage finishes and can be
  collapsed to tidy the card; the heading, status and Build / Run button stay visible at all times.
- A re-render (status update, another stage finishing) does not force a drop-down the user collapsed back open — it only
  auto-opens once, when a stage first produces files.
- The input, readiness, generated-output and saved-files panels keep their collapse-to-heading behaviour from v21.25.11 /
  v21.25.12. This release only changes how the stage cards reveal their outputs, in response to the clarified request.

## Files
- Changed: index.html (v21.25.13), assets/css/theme.css (v20.3.0), tools/database-build/{index.html, js/pipeline.js
  v21.17.0}, tools/pos-supplier-merge/{index.html, README.md, js/app.js v1.16.5}, docs/ARCHITECTURE.md.
- New: docs/GITHUB-RELEASE-v21.25.13.md.

## Testing done (17 Oct, headless Chromium)
- POS New Product Check Clean: before a run the stage cards are normal (not whole-panel accordions) with Run buttons
  visible and no drop-downs. After Run All, stage 2 shows "Output files · 1 file" and stage 3 "· 2 files", both open
  automatically, with the Download buttons inside; stage 1 (no file output) shows no drop-down. The Run buttons and status
  lines stay visible; collapsing a drop-down closes only that one and leaves the button in place.
- Build POS Master Databases: 4 stage cards, none are whole-panel accordions, 4 output drop-downs present and hidden until
  a build produces files; the input / readiness / output / saved-files panels remain whole-panel accordions.
- All five pages load with no console errors.
