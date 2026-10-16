# Staff Hub v21.25.12 — function-specific file libraries, tidier home page (17 Oct 2026 01:40 AEDT)

**Summary:** v21.25.12 — each tool shows its own "Saved files" panel (the library files it makes or uses) from one shared store, and the home page becomes a file-count summary with a "View all files" expander instead of listing every file

## Commit notes
- hub-library.js is now a shared mountable panel (`PHFLibraryPanel.mount`). It renders the same saved-files list, but can
  be scoped to a tool — showing only the files that tool makes or uses — or shown as a home-page summary. The underlying
  store is unchanged: a file shared by several tools is the same copy, shown in each tool's view by reference (no
  duplication). Download / delete per file work as before.
- Each function shows a collapsible "Saved files" panel with its relevant files: Build POS Master Databases, POS New
  Product Check Clean and Reconcile CH2 Order. A "Show all saved files" tick reveals the rest (off-scope files are dimmed
  and labelled). Supplier Contacts keeps showing its one file in its own card, so it was left as-is to avoid duplication.
- Home page: the Library section now shows just the file count and storage line, with the full list, storage note and
  Delete all tucked into a "View all files" expander — cleaner and less cluttered, with full detail one click away.

This is phase 3 of 4 (final) of the Staff Hub UI / Excel / file-library work. Phases 1–2 (checkboxes + toolbar, accordions
+ Excel formatting) shipped in v21.25.10 and v21.25.11.

## Files
- Changed: index.html (v21.25.12), assets/js/hub-library.js (v2.0.0), assets/css/library.css (v2.0.0),
  tools/database-build/index.html, tools/pos-supplier-merge/{index.html, README.md}, tools/reconcile-ch2/index.html,
  docs/ARCHITECTURE.md.
- New: docs/GITHUB-RELEASE-v21.25.12.md.

## Testing done (17 Oct, headless Chromium)
- Home page: with three seeded files the badge reads "3 files · 6.9 KB"; the list (3 rows, downloads, Delete all) sits
  inside a "View all files" expander. No page errors.
- Build POS Master Databases: scoped panel shows its 3 relevant files (POS Database, CH2 full set, Brand Abbreviation);
  "Show all" reveals the 4th (Supplier Contacts) marked off-scope; panel is collapsible.
- POS New Product Check Clean: shows its 2 relevant files; deleting one from the tool view removes it from the shared
  store (the other tools see the change).
- Reconcile CH2 Order: shows its 2 relevant files (Full merged master, Ongoing Discounts), not the POS full set it does
  not use; panel is collapsible.
