# Staff Hub v21.35.0 — a clear or remove deletes the file from this browser in every tool, so no tool keeps using a file you cleared (21 Oct 2026 21:50 AEDT)

**Summary:** v21.35.0 — clearing or removing a file in any tool now deletes it from this browser: from the page, the tool's saved session and the shared Library, so no tool brings it back. Before, Build POS Master's CLEAR SESSION kept every file it had saved to the Library. POS New Product Check Clean only hid a removed POS Database on its own page and kept its saved copy, so it could open READY with an old POS Database after you'd cleared Build POS Master. Deleting Ongoing Discounts in some places left the copy Reconcile rebuilds it from. Files deleted in one tab now also leave the other open tools. The stage 3 file rows in POS New Product Check Clean also named the two TXT files the wrong way round.

## Changes
- **POS New Product Check Clean v1.23.0**
  - ✕, Remove, CLEAR SESSION FILES and Clear Sheet delete the Library copy of what they remove: the POS Database and the CH2 / Unique sets. Before, a removed POS Database was only hidden on this page and the sets stayed.
  - Only the copy the page holds is deleted. A newer build saved since stays, and is what loads next time.
  - The saved session is written straight away after a clear or remove. Before, it waited 1.2 s, and closing the page in that time kept the old one.
  - **On open,** a file that came from the Library and has since been deleted there is dropped, and the status line says so: "Deleted from the Library since last time, so removed here too: …". After Build POS Master's CLEAR SESSION the page no longer opens READY with an old POS Database.
  - A POS Database removed (hidden) here before this release is deleted from the Library on the first open.
  - **While open,** a file deleted in another tab (any tool's ✕, the home page's ✕ or Delete all) goes from this page too, with a note. Delete all clears the page's files and saved reference tables.
  - **Clear Sheet** with a CH2 / Unique set from the Library deletes that Library copy; the confirm says so. Undo puts the rows back in the sheet as this page's own file, and they stay on the next open, but not in the Library. + Add needs a new build.
  - **Ongoing Discounts.** Removing it (✕, Remove or CLEAR SAVED REFERENCE) asks first, because all three tools use the same copy.
  - **TXT file names.** The stage 3 file rows name each TXT from its file. They said POS UPDATE beside the POS INSERT file and the other way round (since v1.17.0). The top-strip buttons were already right, and the files themselves were always right.
  - The opening line names only what actually came back, e.g. "Your Supplier Updates from last time is back".
- **Build POS Master Databases v21.22.0**
  - CLEAR SESSION deletes the files this tool saved to the Library: POS Database, CH2 / Unique sets, masters and To-Order file. It also deletes the reference files loaded on the page: Brand Abbreviation, Weight & Dimensions and Ongoing Discounts. The confirm lists them. Before, they were kept and the other tools went on loading them.
  - CLEAR INPUT FILES deletes the saved reference files too (before, they came back on the next open). The confirm names them. Generated files stay until CLEAR SESSION.
  - ✕ / Remove on Ongoing Discounts asks first.
  - A file deleted elsewhere goes from this page while it's open. An output row no longer says "saved to Library" after its Library copy is deleted.
- **Library v1.2.0 (shared) and the home page Library panel v2.1.0**
  - Deleting Ongoing Discounts also deletes the POS DB & Supplier Merge workbook it is made from. Reconcile used to rebuild the discounts from it, so they came back.
  - Deleting a file also clears any leftover "hidden on this page" marker.
  - Delete all now asks first. It used to delete everything on one click. Supplier Contacts stays, as before, because it holds your only copy of edits.
  - ✕ on Ongoing Discounts asks first and names the tools that lose it.
- **Reconcile CH2 Order v2.17.1.** CLEAR FILES also deletes the saved receiving ticks and Found quantities of every order in the tab, not only the current order's. Its other clears already deleted fully. No reconciliation or export change.

## Files
- Changed:
  - index.html (hub v21.35.0)
  - assets/js/phf-library.js (v1.2.0), assets/js/hub-library.js (v2.1.0)
  - tools/pos-supplier-merge/index.html, js/app.js (v1.23.0)
  - tools/database-build/index.html, js/pipeline.js (v21.22.0)
  - tools/reconcile-ch2/index.html, js/app.js (v2.17.1)
  - docs/ARCHITECTURE.md; docs/GITHUB-RELEASE-v21.35.0.md (new)
- Unchanged:
  - the merge engine, merge-map.js and the Apps Script files
  - every build, merge, reconciliation and export routine
  - Reconcile's reference admin page and Supplier Contacts. They keep loading Library v1.1.3 until the browser refreshes it; their own deletes behave the same.

## Tests run (21 Oct, headless Chromium, real files, one browser profile shared by all pages)
- **Opens READY from the Library.** With the POS Database, the CH2 A–P set and Ongoing Discounts saved by Build POS Master, plus Product Prefixes, POS Suppliers and Find & Replace, POS New Product Check Clean opened READY.
- **Build POS Master CLEAR SESSION.** The confirm listed POS Database, CH2 supplier layout, Brand Abbreviation and Ongoing Discounts, and the Library was empty afterwards (the linked workbook went too). POS New Product Check Clean then reopened with POS Database, Supplier Updates and Ongoing Discounts required, pills WAITING, and the "deleted from the Library since last time" note. This is the case from your screenshot.
- **✕ in another tab.** ✕ on the POS Database on the home page: the open merge page dropped it at once, with the note.
- **Merge ✕.** ✕ on Supplier Updates holding the CH2 set deleted it from the Library.
- **Clear Sheet.** It deleted the Library copy. Undo brought the 9,682 rows back, and they were still there after a reopen.
- **Old hidden marker.** An old marker on the POS Database: deleted from the Library on open, and the marker removed.
- **Home page ✕ on Ongoing Discounts.** Cancel kept both files; OK deleted it and the POS DB & Supplier Merge workbook.
- **Build POS Master CLEAR INPUT FILES.** The confirm named Brand Abbreviation and Weight & Dimensions, and both were deleted from the Library.
- **Delete all.** It asked first, and the open merge page cleared every input and saved reference table. After a reopen, everything showed as missing.
- **Reconcile CLEAR FILES.** It removed the receiving keys of three orders and left other keys alone.
- **Ongoing Discounts asks first** on the merge ✕, merge CLEAR SAVED REFERENCE and Build POS Master ✕. Cancel kept the file (and the other tables) every time; OK deleted it from the Library and from the other open page.
- **Full merge still runs.** POS Database + CH2 set: all three stages DONE in about 95 s. The rows now read "POS INSERT = POS INSERT 2026-10-21 …txt" and "POS UPDATE = POS UPDATE …txt"; on v21.33.0 they were crossed.
- **Zero page errors** in the clear tests and the merge runs, apart from the reopen issue under Not run.

## Not run
- Dragging files by hand (the file inputs were used); Chrome on his PC.
- **Found, not changed:** closing POS New Product Check Clean while it is still saving the session after a run (the test closes the page without the browser's "leave site?" question) can make the next open show no saved reference tables. Product Prefixes, POS Suppliers and Find & Replace then show as missing. It happens on v21.33.0 too (2 of 3 runs there, 1 of 3 on this version), so this release didn't cause it. Noted in ARCHITECTURE.md for a follow-up.
