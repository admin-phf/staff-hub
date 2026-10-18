# Staff Hub v21.25.17 — bigger, clearer chevron and a chevron on every panel (18 Oct 2026 14:05 AEDT)

**Summary:** v21.25.17 — the collapse chevron is now a gold circle the same size as the stage-number badge with a bold arrow (it was almost invisible before), and every status / list panel has one, so the accordion is consistent across the whole screen

## Commit notes
- The chevron is a filled gold circle (26px, matching the numbered stage badge) with a bold arrow inside — ▾ down when a
  panel is closed, ▴ up when open — that inverts navy↔gold on hover like the top-nav icons. It reads clearly as a button
  now, instead of the faint little glyph it was.
- Every status / list panel is collapsible for consistency: Build All (Build POS Master Databases) and Run All (POS New
  Product Check Clean) now carry the chevron too; they stay open by default. The input, readiness, stage, output and
  saved-files panels already had it. The selected-input editor panel (where you load / replace one file) and the top intro
  line are left non-collapsible on purpose — that panel is the active editing surface, not a status card.
- Behaviour is unchanged otherwise: click anywhere in a heading or the chevron to toggle; a stage card closes itself when
  it finishes and the Drop-all-files panel closes once all required inputs are loaded; your manual choice is remembered.

## Files
- Changed: index.html (v21.25.17), assets/js/phf-accordion.js (v1.2.0), assets/css/theme.css (v20.4.0),
  tools/database-build/index.html, tools/pos-supplier-merge/index.html, tools/reconcile-ch2/index.html (asset
  cache-busters), docs/ARCHITECTURE.md.
- New: docs/GITHUB-RELEASE-v21.25.17.md.

## Testing done (18 Oct, headless Chromium)
- The chevron measures 26×26px with a 15px arrow — the same size as the stage-number badge (26×26). Build POS Master
  Databases shows 9 chevrons (Drop-all-files, Input readiness, Build All, four stage cards, All generated output files,
  Saved files); POS New Product Check Clean shows 8 (its three stages). Clicking a panel heading collapses it and flips
  the chevron; clicking the chevron reopens it. Run All collapses and reopens correctly. No console errors on any of the
  five pages.
