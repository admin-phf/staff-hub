# Staff Hub v21.39.0 — Reconcile CH2 Order: lines to fix stay in the list and are flagged above it in the same columns, the four totals sit in the sticky footer, and over counts are a stronger green (22 Oct 2026 23:20 AEDT)

**Summary:** v21.39.0 — in Reconcile CH2 Order, lines that need fixing in POSActive are back in the main list (Remaining → Completed), so the list balances against the POS order and the invoice as before. The **Fix in POSActive** flag at the top of the checklist shows a copy of each one in exactly the same columns (red cell to fix; click it to go to the line). The footer shows **Current · Adjusted · Not invoiced · Combined**, kept up to date and in view at the bottom of the window while you scroll. More-than-billed counts are a stronger green. Matching and every export are unchanged.

## Changes — Reconcile CH2 Order v2.21.0
- **Lines to fix stay in the list.** A line with a Sub ID POSActive can't import, a blank / shared Sub ID, a LOW match or a GST difference is counted and ticked in its normal place (Remaining → Completed, or Invoiced · not on POS order).
- **The flag above uses the table's columns.** The Fix in POSActive bar at the top of the checklist is followed by a copy of each of those lines: same columns and widths, the cell to fix in red with what to change on hover, and the tick and Found as they stand. Click a copy to jump to its line. The copies hide while you search or filter, and the red Fix in POSActive chip still shows only the real lines.
- **Totals in the footer (inc GST), bottom right:**
  - **Current**: the POS order at current prices.
  - **Adjusted**: the POSActive TXT as it stands. Underneath: the invoice total while nothing is ticked, then "matches invoice ✓" or the difference (e.g. "−$43.15 vs invoice" while two billed lines not on the order are unticked). Hover: ex GST + GST.
  - **Not invoiced**: ordered but not billed and not counted, at the ordered value, with the line count.
  - **Combined**: Adjusted + Not invoiced, with the difference to Current underneath (e.g. "+$7.42 vs current"). Hover: the breakdown, including billed-not-on-the-order lines ticked or not.

  The footer stays at the bottom of the window while the checklist scrolls, and the totals update as you count, tick and change prices. On a narrow window they stay pinned at the right.
- **Less repetition.** The summary line no longer shows the TXT figure (it's the footer's Adjusted), and the money card is gone from Details (its figures are in the chips and the footer). The full POSActive balancing check stays in Details.
- **Stronger green.** A Found count above the billed quantity, and an Adj Qty changed above it, now has a deeper green fill, a darker green number and a 2 px green border.

## Files
- Changed: index.html (hub v21.39.0); tools/reconcile-ch2/index.html, js/app.js, css/workspace.css (v2.21.0); docs/ARCHITECTURE.md; docs/GITHUB-RELEASE-v21.39.0.md (new).
- Unchanged: the reconcile engine, pos-import (the TXT), report and the other modules; the other tools.

## Tests run (22 Oct, headless Chromium, real files)
- **Exports unchanged.** Invoices 74154567 (1,860 px) and 74147128 (1,440 px), with ALL ticked:
  - POSActive TXT, Full Reconciliation.csv and POS key review.csv: identical to v21.35.4.
  - The .xlsx files: identical apart from the creation time.
  - Checklist widths unchanged.
- **Invoice 74154567.**
  - The Fix flag shows a copy of ORA HORMONAL BAL (Sub ID red), and the line itself is in Remaining with its red Sub ID.
  - Footer before ticking: Current $1,346.56 · Adjusted $0.00 (invoice $1,296.21) · Not invoiced $57.77 (1 line) · Combined $57.77.
  - After ALL: Adjusted $1,296.21 "matches invoice ✓" · Combined $1,353.98 "+$7.42 vs current".
  - Found 2 above billed: the deeper green and border, and the totals updated (+$93.93 vs invoice).
  - Clicking the copy went to the line.
  - The Fix chip showed only the real line, with the copies hidden.
- **Invoice 74147128 (1,440 px).**
  - Fix flag with 3 copies: MAHARISHI (GST), JJ FINGER BRUSH (blank Sub ID) and PUKKA (GST). The lines themselves sit in Remaining and in Invoiced · not on POS order.
  - After ALL: Adjusted $6,761.33 "−$43.15 vs invoice" (the two unticked INV lines) · Not invoiced $549.46 (3 lines) · Combined $7,310.79 "+$10.46 vs current".
  - The totals stay pinned at the right while the table scrolls sideways.
- Zero page errors.

## Not run
- Chrome on his PC; widths below 1,200 px.
