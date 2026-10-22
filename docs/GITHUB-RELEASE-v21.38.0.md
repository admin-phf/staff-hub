# Staff Hub v21.38.0 — Reconcile CH2 Order: lines to fix in POSActive sit in the checklist with the cell to fix in red, changed cells use the table's colours, over counts complete, and Check follows counts and changes (22 Oct 2026 22:15 AEDT)

**Summary:** v21.38.0 — Reconcile CH2 Order shows less above the table. The "Action needed" card is gone: lines that need fixing in POSActive are a **Fix in POSActive** section at the top of the checklist, laid out like every other line (barcode, PLU, brand, Sub ID), with the cell to fix in red and the detail on hover. A price you change shows blue ↓ when lower and red ↑ when higher. A changed Adj Qty is green when more than billed, red when less and grey when the same. Each changed cell has an orange corner, and the line's POS Index turns orange. A count at or above the billed quantity now ticks the line and moves it down, like an exact count. The Check column follows your counts and price changes, and so do the chips and their $ totals. Matching and every export are unchanged.

## Changes — Reconcile CH2 Order v2.20.0
- **Less above the table.**
  - The summary card is two lines: order · invoice lines matched · Invoice · POSActive TXT · checks / Details ▸, then the chips. POS order is in Details · money.
  - A red **Fix in POSActive · N** chip comes first and shows only those lines.
  - The "Action needed" card is removed, and the Integrity / Order link / Import keys line is now inside Details.
- **Fix in POSActive section.** These lines sit at the top of the checklist, ticked or not, laid out like every other line, so you can find each one in POSActive by barcode, PLU or brand:
  - Sub ID POSActive can't import (contains % $ "), blank or shared → the **POS Sub ID** cell is red.
  - GST different from the product's POSActive setting → the **GST %** cell is red (it already showed POSActive's rate and "INV" with the invoice's rate).
  - A LOW-confidence match → the **CH2 ITEM CODE** cell is red.

  Hovering the red cell says what to change. A billed line that isn't on the POS order keeps its own section, with its red cell.
- **Changed cells in the table's colours.**
  - A changed Adj WSPrc / Adj CatPrc / Adj DPrc is compared with its value before your change: lower is blue ↓, higher is red ↑.
  - A changed Adj Qty is compared with the billed quantity, like Found: more is green, less is red, the same is grey.
  - Each changed cell has a small orange corner, as in the merge sheets, and the line's POS Index is an orange pill.
  - "N rows changed" in the toolbar now shows only those lines; click it again to show all.
- **Over counts complete.** A Found / Adj Qty / Add Qty count at or above the billed quantity ticks the line, and it moves to Completed after the usual short pause. Only a short count stays in Remaining. The POSActive TXT still imports the counted quantity, as before.
- **Check is live.**
  - A count different from the billed quantity reads **SHORT** or **OVER**, e.g. "received 6 of 5 billed".
  - A changed Adj CatPrc / DPrc is checked against the expected price: **PRICE HIGH**, **BETTER PRICE** or **OK** ("your price $10.76 · expected $10.76").
  - The $ uses the received quantity.
  - The chips (Price high · N · +$, Better price · N · −$, Short, Over) follow at once.
  - The Exceptions / All lines views and the exports keep the run's own checks.

## Files
- Changed: index.html (hub v21.38.0); tools/reconcile-ch2/index.html, js/app.js, css/workspace.css (v2.20.0); docs/ARCHITECTURE.md; docs/GITHUB-RELEASE-v21.38.0.md (new).
- Unchanged: the reconcile engine, pos-import (the TXT), report and the other modules; the other tools.

## Tests run (22 Oct, headless Chromium, real files)
- **Exports unchanged.** Invoices 74154567 (1,860 px) and 74147128 (1,440 px), with ALL ticked:
  - POSActive TXT, Full Reconciliation.csv and POS key review.csv: identical to v21.35.4.
  - The .xlsx files: identical apart from the creation time.
  - Checklist widths unchanged.
- **Invoice 74147128.**
  - Fix in POSActive · 3: MAHARISHI TOOTHPASTE (GST % red, 0 in POSActive vs 10 invoiced) and JJ FINGER BRUSH (Sub ID "(blank)" red) in the Fix section. PUKKA THREE MINT's GST % is red in Invoiced · not on POS order.
  - No Action needed card, and the checks line is in Details.
- **Invoice 74154567.**
  - Fix in POSActive: ORA HORMONAL BAL, Sub ID red.
  - Found 6 on line 18 (billed 5): ticked at once, Check OVER "received 6 of 5 billed", moved to Completed.
  - Found 2 on line 19 (billed 3): stayed in Remaining, Check SHORT, $ on 2 units.
  - Line 17 PRICE HIGH, Adj CatPrc changed to the expected 10.76: blue ↓, Check OK. The Price high chip went from 3 · +$17.97 to 2 · +$16.73.
  - Line 15 Adj CatPrc 99: red ↑, PRICE HIGH.
  - Line 16 Adj Qty 7 (billed 6): green, Found 7, ticked and moved to Completed, Check OVER.
  - All three changed lines got the orange POS Index. "3 rows changed" showed only lines 17, 15 and 16, and clicking again showed all 19.
  - The Exceptions view kept the run's checks.
- Zero page errors.

## Not run
- Chrome on his PC; widths below 1,200 px.
