# Staff Hub v21.34.0 — Reconcile CH2 Order shows the result at a glance, checks every checklist line (including invoice-only lines against the database), and the RUN row above the checklist matches the top strip (21 Oct 2026 20:05 AEDT)

**Summary:** v21.34.0 — Reconcile CH2 Order v2.17.0 replaces the number strip and the long review-notes box with a picture of every checklist line, filter chips, a money panel, a "Needs a look" list (where, what, why and how much) and one line of checks. The full notes move into a "More detail" fold. The checklist gets a Check column. Lines billed but not on the POS order (INV) are checked the same way as the order lines, against the database: CH2 normal W/S less the Ongoing Discounts rule. They stay in their own section, show the invoiced quantity as Adj Qty, and ALL still leaves them unticked. The RUN row above the checklist is now the top strip again: same buttons, same 34 px height and the same status line. Export files only turns DONE when a file is actually made. Matching, the order-line arithmetic and every export are unchanged; the exports were checked byte for byte.

## Changes — Reconcile CH2 Order v2.17.0
- **Result at a glance.** Each checklist line is a square in POS order, with INV lines last. Its colour is the line's Check and it shows the $ effect: +$13.96, −$0.38, "0 of 4", W/S or OK. Click a square to go to its line. The chips (OK · 10, Price high · 3, Not on POS order · 3 …) show only those lines in the checklist; "Show all" clears them. The money panel shows:
  - supplier invoice
  - POS order at current prices
  - charged above expected
  - better price
  - not invoiced, at the ordered value
  - billed but not on the POS order.
- **Needs a look.** Every line that is not OK or a better price is listed, plus every INV line, every POSActive Sub ID problem and every LOW-confidence match (a MEDIUM match is tagged on its row). The biggest $ effect comes first. Each row shows:
  - the POS # and CH2 line
  - the product
  - the checks
  - expected → invoiced price (each)
  - qty and $ effect
  - "Show line".
  The fix for a Sub ID problem or a not-invoiced line sits under its row. Better-price lines are summed on one line.
- **One line of checks.** Integrity, Order link (it is linked automatically, as before) and Import keys sit on one line, with "More detail · N review notes" beside them. The fold holds the full review notes, the order-link panel, the import-key summary and the checklist how-to. It opens by itself when integrity needs a review or import keys need a look.
- **Check column** in POS layout, after CH2 Line: OK, BETTER PRICE, PRICE HIGH, DISCOUNT LOW, WHOLESALE, SHORT, OVER, NOT INVOICED or NO CHECK. Order lines use the reconciliation's own statuses. Hover a chip for expected vs invoiced and the $ effect. The column sorts, and the search box also matches it.
- **INV lines (billed, not on the POS order).** They are checked against the database: CH2 normal W/S less the matched Ongoing Discounts rule, which is the Adj CatPrc the row already showed. That gives PRICE HIGH (with DISCOUNT LOW when the discount is short), BETTER PRICE, OK or NO CHECK. They have the same columns as other lines, and Adj Qty now shows the invoiced quantity. They stay in the "Invoiced · not on POS order" section at the top. ALL ticks every POS line but not these: tick an INV line yourself to put it in the TXT, as before. A line whose product is on the order file is in the POS file, so ALL includes it, as before. In Exceptions / All lines they read "NOT ON POS ORDER · <check>".
- **RUN rows.** The row above the checklist is the top strip shown again: RUN, the three steps, Run all, the four downloads and CLEAR FILES, with the done note and the status line. The top strip has the same four downloads once results are on the page. Every control on both rows is 34 px.
- **Export files status.** It turns DONE, and step 3 lists POSActive Import.txt as made, only when the TXT was actually built. A refused export (nothing ticked) used to mark it DONE. An Exceptions .xlsx no longer marks the POSActive import as made either.
- **The yellow box is gone.** The "POSActive import file could not be created" message shows in the status line on both rows. Once a line is ticked it changes to "N lines in the POSActive import — POSActive Import.txt can now be downloaded."
- **Checklist toolbar.** The Tick all and CLEAR QTY buttons are removed: the ALL box and Clear qty in the table header do the same. The toolbar is one row: counter, Remove not supplied, search and view.
- **Totals row.** It reads "inc GST · CURRENT $… · ADJUSTED $…". Each total names itself and nothing is cut off. Before, "Current / Adjusted Total inc GST" and the current total were cut short. Adj DPrc is never narrower than 66 px (it was 56), so its price and its ↑ ↓ — mark are never cut.
- **POSActive balance** reads NOTHING TICKED (grey) until a line is in the TXT, instead of a green FILE BALANCES at $0.00.

## Shared (phf-ui.css v1.5.0) — all three tools
- Every control on the RUN strip is 34 px: the home apple, the step pills, Run / Build all, the downloads and the CLEAR button. Before, they were 30, 32 and about 22 px.
- A badge in a panel header is centred on its own line, not on the text baseline.
- A folded panel closes up to its header (theme.css padded it 16 px).
- Build POS Master v21.21.2 and POS New Product Check Clean v1.22.1 change only to load phf-ui v1.5.0. No build or merge change.

## Width
- At 1,860 px the checklist still fits without scrolling (1,759 px). The Check column is 104 px. It takes the spare room POS Sub ID, POS PLU, POS Brand and the price columns had, so those sit at their usual minimum and a long Sub ID or brand ends in "…" (the full text is on hover).
- At 1,600 and 1,440 px the table already scrolled (1,637 px). It now scrolls to 1,750 px. Total inc GST and the totals stay pinned at the right, as before.

## Files
- Changed: index.html (hub v21.34.0); assets/css/phf-ui.css (v1.5.0); tools/reconcile-ch2/index.html, js/app.js, js/ui/workspace.js, css/workspace.css (v2.17.0); tools/database-build/index.html, js/pipeline.js (v21.21.2, version only); tools/pos-supplier-merge/index.html, js/app.js (v1.22.1, version only); docs/ARCHITECTURE.md; docs/GITHUB-RELEASE-v21.34.0.md (new).
- Unchanged: the reconcile engine and the matching, pos-import, linked-pos and report / export modules; merge-map.js, the merge engine and the Apps Script files; every build, merge and export routine.

## Tests run (21 Oct, headless Chromium, real files)
- **Invoice 74154567 with its order (19 lines).**
  - Squares: OK 10, Better price 4 (−$10.99), Price high 3 (+$17.97), Wholesale only 1, Not invoiced 1 ($57.77).
  - Needs a look, in this order: ORA +$13.96 (with the POSActive Sub ID fix), CELL LOGIC +$2.77, HANAMI +$1.24, NATUROBEST not billed, MICRONUTRITION $0.00.
  - The Price high chip leaves lines 3, 14 and 16 in the checklist; Show line and the squares go to the right line.
- **Same invoice, exports compared byte for byte.** Downloaded before ticking (refused), then after ALL, on v2.16.0 and on v2.17.0:
  - POSActive TXT, full CSV and key review CSV: identical.
  - Full and Exceptions .xlsx: identical except the creation time.
  - The top-strip copies download the same files.
- **Refused export.** No file, the message is in the status line, and Export stays READY. After ALL it changes to "18 lines in the POSActive import". After the TXT, Export is DONE and step 3 shows the time it was made.
- **The same order with 3 products removed (3 INV lines).** TEELIXIR $33.18 → $33.18, NIOX $60.64 → $60.64 and MET ADRENOTONE $52.96 → $52.96, all OK against the database. Adj Qty 2 / 1 / 1, totals $73.00 / $66.70 / $58.26. ALL ticked the 16 POS lines and left the 3 INV lines unticked.
- **Invoice 74147128 (109 lines, 2 INV) at 1,440 px.**
  - Exports identical to v2.16.0.
  - Needs a look 8: HAB SHIFA ×2 PRICE HIGH + DISCOUNT LOW, JJ FINGER BRUSH with BLANK SUB ID, 3 not invoiced, PUKKA and ORA MAG3 INV.
  - More detail opened by itself for the 1 import key to review.
- **Other actions.** Run all, Exceptions .xlsx and CLEAR FILES from the row above the checklist work like the top strip. A folded Steps panel is 48 px for a 46 px header.
- **Every page.** Hub, Build POS Master and POS New Product Check Clean load with 34 px strips. Zero page errors in every run.

## Not run
- Dragging files by hand (the file inputs were used); Chrome on his PC (headless Chromium only); widths below 1,200 px.
