# Staff Hub v21.36.0 — the Reconcile checklist sorts, filters and edits like the merge sheets, and your price and quantity changes go into the POSActive TXT; the merge's RUN row above the tabs is the top strip (22 Oct 2026 13:35 AEDT)

**Summary:** v21.36.0 — Reconcile CH2 Order's checklist now works like the sheets in POS New Product Check Clean. Every heading has the same sort and filter menu, cells select and copy like a sheet, and Adj WSPrc, Adj CatPrc / Adj DPrc and Adj Qty can be changed by typing, pasting or dragging. A changed cell turns orange, and the change goes into the POSActive TXT, the row total and the balance. The toolbar and headings now stay under the RUN strip when you scroll; before, the toolbar slid behind it. In POS New Product Check Clean, the RUN row above the sheet tabs is now the top strip shown again, and the duplicate buttons and notes are gone. With nothing changed, every export is byte for byte the same as before.

## Reconcile CH2 Order v2.18.0
- **Sort and filter menu on every heading.** This is the same menu as the merge sheets (≡ beside the heading):
  - A to Z / Z to A, or Highest to lowest / Lowest to highest for numbers, and Sort off.
  - "Show": the column's values with how many lines have each, Search values…, Select all / Clear, "n of N", then Cancel / OK.
  - Filters show as chips beside the search (e.g. "POS Brand: METAGENICS ✕"), and ✕ removes one. The count in the search box shows "5 of 19".
  - Clicking a heading's name still sorts it (again to reverse). ▲ / ▼ shows which column is sorted, and the ≡ turns gold when that column is sorted or filtered.
  - ALL and Add Qty have no menu.
- **Cells work like a sheet.**
  - Click a cell, then Shift + click or drag to select more, and Ctrl + C copies them for Excel. The arrow keys and Tab move the selection.
  - **Adj WSPrc, Adj CatPrc, Adj DPrc and Adj Qty can be changed.** Type, or use Enter / F2 / double-click. Ctrl + V pastes a value or a block from Excel. Ctrl + D or the small corner square fills down.
  - A changed cell is orange, as in the merge sheets. Delete puts the original value back, and Ctrl + Z or **Undo** undoes the last change. **Clear changes** puts every change back.
  - The toolbar shows "N rows changed". Hovering a changed cell shows what it was and what POSActive gets.
- **What POSActive gets** (your answer: "goes into the TXT"):
  - Adj WSPrc → **Normal WS**.
  - Adj CatPrc and Adj DPrc are one price → **Unit Price ex GST**. Changing one changes both, and Disc % is worked out from Unit Price and Normal WS.
  - Extended, GST and Total are recalculated at the changed unit price. Changing only Adj WSPrc keeps the invoice's unit price and amounts, and only Normal WS and Disc % change.
  - Adj Qty → **the imported quantity**. It is the same number as Found: changing Adj Qty sets Found (and the row's tick), and putting it back restores Found.
  - Adj RRPrc is not in the POSActive import, so it stays read-only, and typing in it says so.
  - A not-invoiced row that you receive (Adj Qty or Found above 0) uses your changed prices too.
- **The balance shows the difference.** The POSActive balance says, for example, "4 lines in the TXT carry prices changed in the checklist (orange): −$245.39 inc GST against the invoice prices for the same quantities". The row's Total inc GST and the Adjusted total follow your changes.
- **Review notes.** A PRICE EDITED note lists each changed line: Normal WS, Unit Price and Disc % before → after, and the $ effect. A Unit Price above Normal WS (a negative Disc %) gets a review note to check in POSActive. Changed lines are no longer reported as "differs from the invoice".
- The Full Reconciliation workbook and CSV keep the invoice prices, as before.
- **Sticky toolbar.** The toolbar (Accounted · Remove not supplied · search · View) now sits just under the RUN strip when the page scrolls, and the column headings sit under the toolbar. Before, it stuck at the top of the window behind the strip.
- Changes are kept while the page is open (like Found). Leaving or reloading the page asks first, and a new run starts clean.

## POS New Product Check Clean v1.24.0 — the RUN row and duplicates (your choice: "RUN row + duplicates")
- **The RUN row above the sheet tabs is the top strip shown again.** It has the home button, RUN, the three stage pills, the done note ("3 of 3 run"), Run all stages, the two TXT downloads, **CLEAR RESULTS**, and the status line with its progress bar while a stage runs. Before, it had no CLEAR RESULTS, done note or status line.
- **Removed duplicates:**
  - **Run stage 3** above OUT_MERGED_DATA. Pill 3 in the RUN row does it, and the note still says when stage 3 needs to run again.
  - **Run all stages** above the SRC_ tabs. The RUN row has it.
  - The old hidden status line under the RUN row. It could still show through.
  - The "Click a cell to edit it, as in the Google Sheet" note. The OUT_MERGED_DATA heading says it, and the note keeps "FINAL SHELF RRP follows RRP / MARKUP OVERRIDE."
  - The second **+ Add CH2 / Unique set** buttons on the Supplier Updates input card. The sheet's scope line keeps them.
- No merge change: same stages, sheets and TXT files.

## Files
- Changed:
  - index.html (hub v21.36.0)
  - tools/reconcile-ch2/index.html, js/app.js, js/export/pos-import.js, css/workspace.css (v2.18.0)
  - tools/pos-supplier-merge/index.html, js/app.js, css/merge.css (v1.24.0)
  - docs/ARCHITECTURE.md; docs/GITHUB-RELEASE-v21.36.0.md (new)
- Unchanged: the reconcile engine, matching, linked-pos and report modules; the merge engine, merge-map.js, engine-host and the Apps Script files; Build POS Master Databases.

## Tests run (22 Oct, headless Chromium, real files)
- **No changes = the same files.** Invoices 74154567 (19 lines, 1,860 px) and 74147128 (109 lines, 1,440 px) were run on v21.35.4 and v21.36.0, then ALL was ticked:
  - POSActive TXT, Full Reconciliation.csv and POS key review.csv: identical.
  - Both .xlsx: identical apart from the creation time.
  - The checklist width is unchanged: 1,759 px fits at 1,860, and 1,750 px scrolls at 1,440 as before.
- **Changes into the TXT** (invoice 74154567, ALL ticked). Each column reads Qty · Normal WS · Unit Price · Extended · GST · Total · Disc %:
  - Line 18, Adj CatPrc typed 9.99. Adj DPrc became 9.99 too. TXT: 5 · 46.41 · 9.9900 · 49.95 · 5.00 · 54.95 · 78.47 (was 42.6972 · 213.49 · 21.35 · 234.84 · 8.00). Row total 54.95.
  - Line 19, Adj WSPrc changed to 20.50 (double-click). TXT: Normal WS 20.50 with the invoice's 24.2420 / 72.73 / 7.27 / 80.00, Disc % −18.25, plus the review note.
  - Lines 17 and 16, Adj DPrc pasted as a 2-row block (7.50, 8.25). TXT unit 7.5000 / 8.2500, amounts recalculated.
  - Line 15, Adj Qty typed 5. Found became 5 and the TXT quantity 5.
  - Not-invoiced NATUROBEST, Adj Qty 2, Adj CatPrc 10, Adj WSPrc 12.50. New TXT line 20: 2 · 12.50 · 10.0000 · 20.00 · 2.00 · 22.00 · 20.00.
  - The balance caution and the PRICE EDITED notes showed the effect. There were no "differs from the invoice" notes for changed lines.
- **Editing controls.** These all worked:
  - Delete restored 42.70 (both prices back to normal colour), and Ctrl + Z brought 9.99 back.
  - Ctrl + D copied 20.50 into the two rows below, and dragging the corner square filled 9.99 down two rows.
  - Ctrl + C copied "46.41 ⇥ 9.99 ⇥ 9.99 / 20.50 ⇥ 24.24 ⇥ 24.24".
  - Typing into Adj RRPrc opened nothing and gave the read-only message.
  - **Clear changes** made the TXT identical to the unchanged one again, and Found went back to 1.
- **Menus.**
  - The POS Brand menu listed 14 brands with counts. METAGENICS alone left "5 of 19" with the chip, and ✕ brought back 19.
  - Adj CatPrc "Highest to lowest" sorted it ▼, and Sort off went back to POS Index order. Clicking the POS PLU heading still sorted it.
- **Sticky.** Scrolled 400 px into the table: RUN strip bottom 89 px, toolbar 95–145 px, headings from 146 px.
- **POS New Product Check Clean.** A full run (POS Database + CH2 set, all three stages, 99 s) was started from the RUN row above the tabs:
  - The row matched the top strip item for item and height for height (34 px) before, during (status line and done note "0 of 3 complete") and after the run (both TXT downloads).
  - Its CLEAR RESULTS cleared the results like the strip's.
  - OUT_MERGED_DATA has no Run stage 3, the SRC_ tabs have no Run all stages, and the old status line is gone.
  - The input card has no Add-set buttons, and the sheet's scope line still has "+ Add Unique set".
- Zero page errors in every run.

## Not run
- Chrome on his PC (headless Chromium only); copying into a real Excel window (the clipboard text was checked); widths below 1,200 px.
