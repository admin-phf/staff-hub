# Staff Hub v21.30.1 — progress bar back for single-stage builds; INPUT FILES rail no longer overlaps the sheet (20 Oct 2026 14:45 AEDT)

**Summary:** v21.30.1 — two fixes from Kenneth's review. The run strip's progress bar had only ever been driven by Build All, so a single "Build / update" showed no bar; it now shows for any running stage (animated until a percentage is known) with the stage's live message. The sticky INPUT FILES rail had a fixed height sized for the old page header, so under the sticky strip it started too low and, when the right column was short, spilled over the sheet / checklist below; it is now sized to the real strip height. No logic change.

## Commit notes
- Progress: Build POS Master `stageSet` and POS New Product Check Clean `stageSet` show the strip's progress row whenever any stage is RUNNING — an animated gold segment (`.db-bar.indet`) until Build All / the merge loop supplies a percentage — and write the running message ("Unique / UHP Database — Writing the Unique files…") into the strip's live line; the row hides and the idle line returns when nothing runs. Reconcile already toggles its own bar; unchanged.
- Rail: `body.phf-page-db .builder-shell .builder-sidebar` in phf-ui.css v1.2.1 sets `height:auto`, `top: var(--db-strip-h) + 10px` and `max-height: 100vh − strip − 22px`, overriding the tool stylesheets' fixed `height:calc(100vh - 92px); top:82px`. Each page writes `--db-strip-h` from the strip's real height (ResizeObserver, inline script), so it stays right when the strip wraps. Stacks normally below 900 px.

## Files
- Changed: index.html (hub v21.30.1), assets/css/phf-ui.css (v1.2.1), tools/database-build/index.html (v21.20.1, busters, observer), tools/database-build/js/pipeline.js (v21.20.1), tools/pos-supplier-merge/index.html (v1.20.1, busters, observer), tools/pos-supplier-merge/js/app.js (v1.20.1), tools/reconcile-ch2/index.html (v2.14.1, buster, observer), docs/ARCHITECTURE.md, docs/GITHUB-RELEASE-v21.30.1.md (new).

## Tests run (headless, stubbed writers)
- All three tools: zero console errors; `--db-strip-h` set (81–84 px); the rail starts 14 px under the strip; in POS New Product Check Clean, after scrolling, the rail ends at its own content and does not overlap the sheet.
- Build POS Master, real file: Build / update Unique → during the run the progress row is visible with the animated bar, the pill reads RUNNING and the strip line reads "Unique / UHP Database — Writing the Unique files…"; after it finishes the row hides and the pill reads DONE.

## Not verified
- A real multi-second build's bar in a real browser (the stubbed writer runs ~1.5 s); the merge's per-stage percentages during a real run.
