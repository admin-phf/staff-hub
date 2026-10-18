# Staff Hub v21.25.19 — Reconcile reference fix, chevron arrow fills the circle, simpler auto-close (19 Oct 2026 01:00 AEDT)

**Summary:** v21.25.19 — fixes the Reconcile "Could not find a CH2 product-code column" error by requiring the merged master again (the POS full set has no CH2 columns), makes the chevron arrow big enough to fill its circle like the number badge, and simplifies the auto open/close to just one rule: a stage closes itself only when it finishes

## Commit notes
- Fix (regression from v21.25.18): Reconcile CH2 Order needs the merged master (merged_aligned_pos_supplier_uhp_full),
  which carries the CH2 product-code / link columns. v21.25.18 wrongly fell back to the plain POS Database full set, which
  has no CH2 columns — it showed a false "Ready" and then failed at run with "Could not find a CH2 product-code column".
  Reconcile now auto-loads the merged master from the browser Library when a Combined Master build has saved one, and
  otherwise says "Admin setup required" (no false ready).
- The collapse chevron's arrow is now a CSS-drawn triangle that fills the gold circle like the numbered stage badge, up
  when open and down when closed, instead of the small glyph it was. On hover the circle inverts to navy with a gold arrow.
- Auto open/close is now one predictable rule: a stage card tidies itself away only when it finishes running. The input,
  readiness, Build/Run All, output and saved-files panels never open or close on their own — they move only when you click.
- Chevron coverage checked across all three dashboard tools: every panel has one (only the plain intro line and the
  privacy footnote, which have no heading, are left without).

## Files
- Changed: index.html (v21.25.19), assets/js/phf-accordion.js (v1.2.2), assets/css/theme.css (v20.4.2),
  tools/database-build/{index.html, js/pipeline.js v21.16.3}, tools/pos-supplier-merge/{index.html, js/app.js v1.16.7},
  tools/reconcile-ch2/{index.html, js/reference/reference-data.js v2.12.1, js/ui/workspace.js v2.12.1}, docs/ARCHITECTURE.md.
- New: docs/GITHUB-RELEASE-v21.25.19.md.

## Testing done (19 Oct, headless Chromium)
- Reconcile reference: with the merged master seeded in the Library it reads "Ready · merged_aligned_pos_supplier_uhp_full.xlsx";
  with only the POS full set it correctly reads "Admin setup required" (no false ready, so the CH2-column error can't occur).
- Chevron: a close-up shows the triangle filling the gold circle the same way the "1"/"2" fills the number badge — up when
  open, down when collapsed. Present on every panel including the selected-input editor panel.
- Auto-close: the Drop-all-files panel no longer closes on its own; only a finished stage card auto-collapses. The other
  panels move only on click.
- Coverage audit: every visible panel on Build POS Master Databases, POS New Product Check Clean and Reconcile CH2 Order
  has data-acc + a chevron. All five pages load with no console errors.
