# Staff Hub v21.44.2 — Reconcile's ✕ works every time, Reconcile stays fast after the other tools open, and no false UPDATED rows (25 Oct 2026 02:05 AEDT)

**Summary:** v21.44.2 — Reliability and speed fixes found by a full test with the shop folder's real files.
- **Reconcile CH2 Order's ✕ on the INPUT FILES rows works every time.** The page redrew its rail, step rows and RUN rows about 60 times a second, even with nothing happening. A click could land on a button that was replaced before the mouse button came back up, so nothing happened. It now redraws only when something changes.
- **Reconcile's first run after opening Build POS Master Databases or POS New Product Check Clean takes seconds again,** not half a minute or more. Opening either tool saved the shop folder's Ongoing Discounts again, as the same file. That threw away Reconcile's ready-to-use copy of the POS master, so the next run read the whole 24 MB master again.
- **Build POS Master Databases no longer shows Brand Abbreviation, Weight & Dimensions and Ongoing Discounts as UPDATED (blue)** every time it opens with the shop folder, when they are the same as the saved copies.

Exports are unchanged.

## What was wrong (your report: "the clear X in some input sections aren't working")
- **Only Reconcile CH2 Order was affected.**
  - Its page wrote the "Run all" label and the "2 of 3 run" note on every redraw.
  - The page also watches those two for changes, so each redraw caused another one, for as long as the page was open.
  - The INPUT FILES rail, the three step rows, the step 3 file rows and both RUN rows were rebuilt about 60 times a second.
  - A button that is rebuilt between pressing and releasing the mouse never receives the click. In the test, the ✕ on Supplier invoices was replaced 11 times in 4 seconds and the click never landed.
  - The same affected the Download buttons in the step 3 rows, and it kept the computer busy the whole time.
- **Build POS Master Databases and POS New Product Check Clean:** every ✕ worked in the test.
  - A file that is in the shop folder ("1, database-build" or "2, pos-supplier-merge") loads again the next time the page opens. That is by design.
  - To stop a file loading, take it out of the folder.

## Changes
- **Reconcile CH2 Order v2.26.2** (ui/workspace.js): the Run all label and the done note are written only when they change. With nothing happening, the page now redraws 0 times a second (it was about 60).
- **Saved files (phf-library.js v1.2.1):**
  - Saving a file that is already saved, with the same name and the same bytes, now keeps the saved copy as it is: its date, and Reconcile's parsed copy of it.
  - A changed file is saved as before.
- **Build POS Master Databases v21.26.2:** a reference file from the shop folder that matches the loaded saved copy byte for byte is not an update, so it gets no blue row and no stages are marked to rebuild.
- **POS New Product Check Clean v1.28.2:** version only (it loads the new phf-library.js).

## Versions
- Hub v21.44.2; Reconcile CH2 Order v2.26.2; Build POS Master Databases v21.26.2; POS New Product Check Clean v1.28.2.
- phf-library.js 1.2.1.

## Files
- Changed:
  - index.html
  - assets/js/phf-library.js
  - tools/reconcile-ch2/index.html, js/ui/workspace.js
  - tools/database-build/index.html, js/pipeline.js
  - tools/pos-supplier-merge/index.html, js/app.js (version)
  - docs/ARCHITECTURE.md
- New: docs/GITHUB-RELEASE-v21.44.2.md.

## Tests run (25 Oct, headless Chromium, the shop folder's real files linked as the shop folder)
- **✕ on every loaded INPUT FILES row, with a real mouse click:**
  - Reconcile: 4 of 4 removed, while scrolled down into the results. Before the fix, the Supplier invoices ✕ never received the click.
  - Build POS Master Databases: 9 of 9 removed. POS New Product Check Clean: 5 of 5 removed.
  - Ongoing Discounts asks first in those two tools, as before.
- **Redraws with nothing happening:** Reconcile 60 a second → 0 (empty page, files loaded, results shown). The other two tools were already 0.
- **Speed** (this test machine; a shop PC may differ):
  - Reconcile run: 2–3 s.
  - Reconcile run after opening Build POS Master Databases and POS New Product Check Clean: 3.2 s. On v21.44.1 it took 36 s, because the whole master was read again.
  - Build POS Master Databases: the shop folder loads in about 37 s; Build All takes 140–150 s.
  - POS New Product Check Clean: opens in 8 s; Run all stages takes 207 s.
- **Exports:**
  - Reconcile: both orders' TXT, CSVs and .xlsx are identical to v21.35.3 (xlsx apart from the creation time). Widths 1,759 / 1,750 px.
  - Build All: all 8 saved outputs are cell-for-cell identical to the build made before the change. The master (38,291 rows) is also identical to the 15 Oct master.
  - POS New Product Check Clean: Run all stages gives the same files as v21.44.1 (the review workbook apart from its version stamp).
- **Accuracy:** for both orders, the summary's invoice totals and GST match the PDFs to the cent. With every line ticked, the TXT total matches the invoice total, less the billed lines that are not on the POS order.
- **Saved files:** after Build POS Master Databases and POS New Product Check Clean opened with the shop folder, the saved reference files kept their dates (on v21.44.1, each open re-saved three of them).
- Zero page errors.

## Not run
- Real Chrome on Windows with Google Drive for desktop.
