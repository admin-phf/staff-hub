# Staff Hub v21.29.0 — rail rows carry the file state (green / blue / yellow / red), CLEAR buttons, home link on the sticky strip, Reconcile CH2 Order on the shared layout with three clickable steps (20 Oct 2026 13:15 AEDT)

**Summary:** v21.29.0 — the input rail now shows each file's state on its own row in every tool (green loaded, blue UPDATED when a valid file was replaced, bright-yellow INCOMPATIBLE with the file name and reason when a drop fails for that input, red required), so the Drop-All list no longer pushes the rail down; the CLEAR buttons are in caps with the red REQUIRED-pill style; an apple home link sits on the left of every sticky run strip; Brand Name Changes is hidden from the POS New Product Check Clean rail (its functions are unchanged); and Reconcile CH2 Order gets the shared layout with three clickable steps — Check inputs · Reconcile · Export files — over its existing code. No change to any build, merge, reconciliation, output file, download, storage or Library behaviour.

## Commit notes
- Rail file states (all three tools): a recognised, valid file turns its input row LOADED (green) and is no longer repeated in a
  list under the drop zone. A valid file replaced by a newer one shows UPDATED (blue) until the next change. A file that fails
  validation for a known input shows INCOMPATIBLE on THAT input's row in a bright yellow (new --phf-yellow-* tokens), with a
  one-line "file — reason" (full text on hover); an earlier valid file for that input stays loaded. Required-and-missing stays
  red; optional stays neutral. Only files that need a choice (not identifiable, or two candidates for one input) remain as a
  single yellow REVIEW line under the drop zone with the Choose input / Assign controls. Recognition, validation, manual
  assignment, replacement and removal are unchanged.
- CLEAR buttons: CLEAR SESSION / CLEAR INPUT FILES (Build POS Master), CLEAR RESULTS / CLEAR SESSION FILES / CLEAR SAVED
  REFERENCE (POS New Product Check Clean), CLEAR FILES / CLEAR ORDER FILES / CLEAR ALL INPUT FILES (Reconcile) — one shared
  destructive style matching the red REQUIRED pill. Every handler is kept (Build POS Master's Clear session still confirms).
- Home link: a round apple (assets/icons/icon-32.png) at the far left of the sticky run strip in all three tools, linking back
  to the Staff Hub, so the home screen is one click away however far the page is scrolled.
- POS New Product Check Clean — Brand Name Changes hidden visually only: no rail row, not counted in readiness, never named in
  "Missing: …". The input definition, Library load, Drop-All recognition (a dropped Brand Name Changes file is still accepted),
  the SRC_POS_BRAND_NAME_CHANGES workbook tab and the engine's use of it are unchanged. Because it is no longer shown it also no
  longer blocks the run: when a saved or dropped table exists the engine applies it; when none exists the merge runs without
  brand renames (the engine's brand map defaults to empty). Readiness now reads out of 6.
- Reconcile CH2 Order v2.13.0 — the shared layout: full-width sticky run strip (home link · ① Check inputs · ② Reconcile ·
  ③ Export files pills · Run all · POSActive import download · CLEAR FILES · progress + status), Drop All at the top of the rail,
  navy-head collapsible Input readiness, and one "Steps & generated files" panel with a group per step, each header carrying a
  "Run step N" pill (clicking it never folds the group). Step 1 = the existing reference / order readiness gate, step 2 = the
  existing run() (receiving checklist on screen, unchanged), step 3 = the existing download buttons; Run all = run then export.
  The reconciliation maths, parsers, checklist table, three outputs and their filenames are unchanged. The old single stage card,
  the separate output list and the "Saved vs session" footer are removed. Reference admin unchanged.
- Shared CSS: assets/css/phf-ui.css v1.1.0 adds the yellow / blue row states, the home link, the destructive pill and the
  Reconcile pieces. Five border-colour overrides needed !important because theme.css sets the loaded / missing row borders with
  !important; noted inline. Duplicates were not re-added to the tool stylesheets.

## Files
- Changed: index.html (hub v21.29.0, stamp); assets/css/phf-ui.css (v1.1.0); tools/database-build/index.html (v21.19.0,
  busters), tools/database-build/js/pipeline.js (VERSION v21.19.0); tools/pos-supplier-merge/index.html (v1.19.0, busters),
  tools/pos-supplier-merge/js/app.js (TOOL_VERSION v1.19.0); tools/reconcile-ch2/index.html (v2.13.0, layout, busters),
  tools/reconcile-ch2/js/app.js (v2.13.0 — run() exposed, status class kept), tools/reconcile-ch2/js/ui/workspace.js
  (v2.13.0 — strip, groups, rail states); docs/ARCHITECTURE.md; docs/GITHUB-RELEASE-v21.29.0.md (new).
- Unchanged: master-core.js, the merge engine and every Apps Script file, reconcile core / parsers / export, phf-library.js,
  hub-library.js, the merge workbook and sheet code.

## Tests run (20 Oct, headless Chromium, empty lock config, stubbed xlsx / ExcelJS / pdf.js / JSZip)
- All three tools: zero console or page errors on load; the strip is a direct child of <main> above the two columns, computed
  sticky with top 0 after a 700 px scroll; the home link is present with its image and points to ../../index.html; strip and
  header pills are <button>s (disabled at load); the CLEAR buttons render in caps with the destructive style; phf-ui.css loads.
- Build POS Master, real file: dropping uhp_products_export.xlsx via Drop All → the Unique row turns green and nothing is
  listed under the drop zone; dropping a renamed copy on the row → UPDATED (blue); dropping a junk .csv on the row →
  INCOMPATIBLE (yellow) with "junk.csv — Could not validate file …", the earlier file still loaded; dropping an unidentifiable
  .csv via Drop All → one yellow REVIEW line with Choose input / Assign.
- POS New Product Check Clean: no Brand Name Changes row; readiness "0 / 6 REQUIRED"; "Missing: …" never names it; the Choose
  input list omits it; the SRC_POS_BRAND_NAME_CHANGES tab is still present; an unidentifiable drop → one REVIEW line.
- Reconcile: a bad file on the POS / master row → INCOMPATIBLE (yellow) with the reason and step 1 shows ERROR; the old stage
  card is gone and the checklist container is present; a header pill click does not fold its group.

## Not verified (sandbox limits — please check on first use)
- Real builds, merge stages and a real reconciliation run, and the RUNNING → DONE pill changes during them; actual downloads and
  the POSActive top button after a run; UPDATED on the merge and Reconcile order files (only Build POS Master was exercised with a
  real replacement); Library persistence across reload; the Build POS Master Clear session confirm in a real browser.
