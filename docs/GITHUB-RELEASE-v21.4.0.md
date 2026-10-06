# v21.4.0 — Preserve production master schema; exclude non-POS suppliers

Commit title: Preserve master workflow and schema with POS-only output v21.4.0
Release timestamp: 06 Oct 2026 20:19 AEDT (request timestamp).
Master engine/component v2.2.0. Other component versions unchanged.
Base: original attached staff-hub_v21.0.0_CombinedMaster.zip, replacing the
v21.3.0 generic implementation entirely with the original production files.

## Changes

- Removed only the CH2-only and UHP-only append blocks from the original master
  engine. Every POS source row remains; supplier enrichment, matching rules,
  dynamic full column list, 98 selected columns, pricing, discounts, SOH,
  availability, order calculations, sorting and workbook styling remain.
- Added excluded supplier counters without introducing a new export or queue.
- Retained the existing full XLSX auto-download in the one-screen pipeline,
  moving it after all generated master outputs pass verification.
- Added automatic download of the existing verified 98-column XLSX on the
  separate master.html page; its manual download remains available.
- Linked ../reconcile-ch2/css/workspace.css in master.html as requested.
  That stylesheet is scoped to body.phf-page-reconcile and does not independently
  restyle this page. Both tools already load the shared assets/css/theme.css;
  no CSS, markup classes or table structure was changed.
- Updated release/component labels and cache tokens in affected navigation.

## Verification

All three changed JavaScript files pass syntax checks. Both matching modes were
compared with the original engine using fixtures: full and selected headers
remain identical; enriched POS records are identical; unmatched CH2/UHP rows
are excluded; duplicate and identifier-free POS source rows remain present.
Legacy merge retains all 98 selected columns. ZIP integrity passes, all original
paths are retained, and every original entry outside six changed files is
byte-for-byte unchanged. No live-browser or real-catalogue test was performed.

## Installation

Extract the complete ZIP over the existing staff-hub folder. Use
staff-hub/tools/database-build/index.html for the preserved one-screen workflow,
or master.html for the separate existing 98-column builder. Workbook formats
and filenames retain the existing XLSX conventions. No GitHub publish performed.
