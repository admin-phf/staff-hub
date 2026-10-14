# Staff Hub v21.25.2 — Delete all clears the merge's own store too (15 Oct 2026 11:00 AEDT)

**Summary:** v21.25.2 — Library "Delete all" also clears POS New Product Check Clean's saved reference tables and session

## Commit notes
- The hub Library held the shared files (POS set, master, Ongoing Discounts…); POS New Product Check Clean keeps its five
  reference tables and its session in its own browser store, so "Delete all" on the hub emptied the Library while the
  merge still showed everything saved (15 Oct, 51.9 MB left). Delete all now removes that store as well (hub-library
  v1.0.4 `clearOtherStores`: `indexedDB.deleteDatabase('phf-pos-supplier-merge')`; the merge closes its connection after
  every transaction, so this works with its tab open — reload it to see). Supplier Contacts stays, as before. The button
  title and the Library's "What is this?" say so.
- Carries v21.25.1 (storage protected / not protected, Find & Replace required, merge v1.14.8 live Library pickup) if not
  already committed.

## Files
- Changed: index.html (v21.25.2), assets/js/hub-library.js v1.0.4, docs/ARCHITECTURE.md.
- New: docs/GITHUB-RELEASE-v21.25.2.md.

## Testing done (15 Oct, headless Chromium)
- Merge page: POS Suppliers dropped (SAVED) → hub Delete all → merge reloaded: every reference table missing; no errors.
