# Staff Hub v21.13.0 — Supplier Contacts, one Ongoing Discounts file, POS New Product Check Clean

Released 12 Oct 2026 04:40 AEDT. Based on v21.12.0. Stage 1 of 2 (stage 2: headings without underscores and the
row-2 totals in the generated files).

## Commit notes

**Summary:** v21.13.0 — Supplier Contacts tool, one shared Ongoing Discounts file, hub order, POS New Product Check Clean in development

**Description:**
- New tool **Supplier Contacts** v1.0.0: the Monday Orders supplier list and the V8 Supplier Contacts sheet in one
  list (805 contacts, no duplicates). Search in every field, yellow row hover, add / edit / delete with every field, Undo,
  Download .xlsx / .csv. Suppliers in the Monday Orders order with the E9F0F5 / F5F5F5 rows; the utilities (after Totally
  Workwear Moorabbin) at the bottom in their order with light orange rows. The list is kept in the browser's Library —
  not in GitHub: load the file once on each computer.
- **Ongoing Discounts is one file** for Build POS Master Databases, Reconcile CH2 Order and POS New Product Check Clean:
  Reconcile's "Supplier + discount rules" row is now Ongoing Discounts and loads the shared Library copy; dropping it in
  any of the three fills the others. The POS DB & SUPPLIER MERGE workbook is still accepted (its discount tab is shared,
  the workbook is kept for Reconcile's supplier names). Reconcile CH2 Order v2.10.0.
- Hub order: Build POS Master Databases · Reconcile CH2 Order · Supplier Contacts · Update Specials · Customer Special
  Orders · Resources · New Products · POS New Product Check Clean.
- **POS New Product Check Clean** (was POS Supplier New Product Check and Clean Merge) v1.5.1: once a password is set it
  opens behind a "Still under development" message with a password box, its tile says In development, and the Lock /
  Password buttons show only after it is open.
- Library v1.1.0: Delete all keeps the Supplier Contacts list (it has its own ✕).

## Files
- New: tools/supplier-contacts/{index.html, README.md, css/contacts.css, js/contacts.js}, docs/GITHUB-RELEASE-v21.13.0.md
- Changed: index.html, assets/css/hub.css, assets/js/{phf-library.js, phf-lock.js, hub-library.js},
  docs/{ARCHITECTURE.md, THEME.md}, tools/database-build/index.html (Library script version only),
  tools/pos-supplier-merge/{index.html, README.md, js/app.js, js/merge-map.js},
  tools/reconcile-ch2/{index.html, reference-admin.html, README.md, js/app.js, js/ui/workspace.js,
  js/reference/reference-data.js, js/reference/reference-admin.js}
- Not in the repository: `Supplier_Contacts.xlsx` (the merged contact list) — drop it into Supplier Contacts on each PC.
- No Apps Script changes.

## Testing done
- Contacts merge: every V8 contact accounted for (exact name, or renamed and joined by email / phone + a name word),
  no duplicate names, 660 suppliers + 145 utilities; the file, the page download (.xlsx and .csv) and the merge output
  match cell for cell; Excel colours checked in LibreOffice.
- Supplier Contacts in Chromium: load, search (names, phone digits, emails), duplicate check, add, edit to a utility,
  delete, Undo, downloads, reload from the Library, hub Delete all keeps the list. No page errors.
- Ongoing Discounts: saved by Build POS Master Databases → loaded in Reconcile; POS DB & SUPPLIER MERGE dropped in
  Reconcile → shared file read by Build POS Master Databases and POS New Product Check Clean, Reconcile reads 118 rules,
  702 suppliers, 371 CH2 links, 173 brand changes (as before); Drop All of the Google Sheet download in POS New Product
  Check Clean → shared file read by the other two; a pre-v21.13 Reconcile workbook is shared on open; Clear all removes both.
- POS New Product Check Clean: the 11 Oct Google Sheet download runs as before (OUT_MERGED_DATA 347 rows, OUT_POS_UPDATE 327 rows);
  development prompt (wrong / right password), buttons only after opening, Lock, hub badge — with a test password only.
