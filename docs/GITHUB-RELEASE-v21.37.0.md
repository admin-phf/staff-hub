# Staff Hub v21.37.0 — Reconcile CH2 Order's result in a few lines, and not-invoiced lines in their own section of the checklist (22 Oct 2026 16:05 AEDT)

**Summary:** v21.37.0 — Reconcile CH2 Order's result is now one summary card, an "Action needed" list of only what must be fixed for POSActive, and one Details fold. The squares, the "Needs a look" price rows and the big balance panel are no longer in view; the checklist's Check column and filters already show every line. POS-order lines CH2 did not invoice now have their own **Not invoiced** section at the top of the checklist. They are laid out like every other row, with the CH2 code from the POS master and the Ongoing Discounts rule, and are no longer greyed and struck through. **Remove not supplied** is removed. Matching and every export are unchanged.

## Changes — Reconcile CH2 Order v2.19.0
- **Summary card** (replaces the navy "Reconciliation result" bar, the squares and the money panel):
  - One line: the order, invoice lines matched, Invoice, POS order and **POSActive TXT**. The TXT figure fills in as you tick (e.g. "$1,296.21 · 18 lines in the TXT").
  - On the right: **✓ Checks passed**. If a check needs you, a link says what (e.g. "1 import key to review — see Details").
  - On the line under it, the Check chips with the money in them: "Price high · 3 · +$17.97", "Better price · 4 · −$10.99", Wholesale only, Not invoiced, Not on POS order. A chip shows only those lines in the checklist, as before.
  - **Details ▸** opens the Details fold.
- **Action needed** (replaces "Needs a look"). It lists only what needs a fix for POSActive:
  - a Sub ID POSActive can't import (contains % $ "), a blank Sub ID or a shared Sub ID
  - a LOW-confidence match
  - a GST rate different from the product's POSActive setting.

  Each row has the POS #, CH2 line, product, the problem, the fix and **Show line**. The card isn't shown when there's nothing to fix. Price high / better price, short / over, not-invoiced and not-on-order lines are in the checklist (Check column and filters), so they're no longer repeated here.
- **The checks line** (Integrity · Order link · Import keys) shows only when one of them needs you.
- **Details** holds everything else, closed: the money (supplier invoice, POS order, charged above expected, better price, not invoiced, billed but not on the order), the POSActive balancing check and prediction, Not on POS order, GST differences, the match check, the review notes, the order link, the import keys and how the checklist works. It opens by itself only when integrity fails, and Details ▸ lands just under the RUN strip.
- **Not invoiced section.** POS-order lines CH2 didn't bill sit in their own section, under "Invoiced · not on POS order" and above Remaining. They stay there whether ticked or not.
  - They're laid out like every other line, no longer greyed or struck through.
  - CH2 Line "—"; **CH2 ITEM CODE** from the POS master (the code the TXT uses if you receive it); **Disc %** is the Ongoing Discounts rule.
  - The Check chip reads NOT INVOICED, and hovering it gives the expected price (e.g. "Expected $14.51 each (CH2 W/S $15.77 less 8.00%)").
  - The section bar gives the count, the ordered value and what to do: "if it arrived, count it in Found and it goes into the TXT; if not, set it to 0 or untick it in POSActive". It also shows how many are counted.
  - Counting one in Found still adds it to the TXT as a manual receiving line, as before.
- **Remove not supplied is removed.** Not-invoiced lines already sit in their own section, and ALL or a tick accounts for them (they import nothing, as before).
- **GST differences fixed.** A billed line that isn't on the POS order was counted twice in the GST list. On invoice 74147128 that showed 3 products and −$0.02, where the right figures are 2 products and −$0.69.

## Files
- Changed: index.html (hub v21.37.0); tools/reconcile-ch2/index.html, js/app.js, css/workspace.css (v2.19.0); docs/ARCHITECTURE.md; docs/GITHUB-RELEASE-v21.37.0.md (new).
- Unchanged: the reconcile engine, pos-import (the TXT), report and every other module; the other tools.

## Tests run (22 Oct, headless Chromium, real files)
- **Exports unchanged.** Invoices 74154567 (1,860 px) and 74147128 (1,440 px), run on v21.35.4 and on this version with ALL ticked:
  - POSActive TXT, Full Reconciliation.csv and POS key review.csv: identical.
  - The .xlsx files: identical apart from the creation time.
  - The checklist width is unchanged (1,759 px fits at 1,860; 1,750 px at 1,440).
- **Invoice 74154567.**
  - Summary: "Order 105-0008845 · 18 of 18 invoice lines matched · Invoice $1,296.21 · POS order $1,346.56 · POSActive TXT $0.00 fills in as you tick · Checks passed".
  - Action needed has one line: ORA HORMONAL BAL, Sub ID "3 PER SKU 25%". The checks line and Details stay closed.
  - Not invoiced section: NATUROBEST IRON BRAIN 30C · CH2 ITEM CODE 2627595 · Disc % 8.00 · Adj CatPrc / DPrc 14.51 · not greyed.
  - Ticking it kept it in its section. Found 2 put it in the TXT ($31.92, "1 line in the TXT"), and it stayed in place without going grey. After ALL, Accounted 19 / 19 and the TXT read $1,296.21.
- **Invoice 74147128.**
  - Summary chips: OK 102, Better price 1 −$0.84, Price high 3 +$9.43, Not invoiced 3, Not on POS order 2. The warning reads "1 import key to review — see Details".
  - Action needed has 3 lines: MAHARISHI TOOTHPASTE (GST differs), JJ FINGER BRUSH (blank Sub ID) and PUKKA THREE MINT (GST differs).
  - Sections run Invoiced · not on POS order (2), then Not invoiced (3, each with its CH2 code and Disc %), then Remaining (104). After ALL, the 3 not-invoiced lines stayed ticked in their section.
  - Details opened on click, with money, Not on POS order, GST differences (2 products, −$0.69), the balancing check and review notes.
- Zero page errors.

## Not run
- Chrome on his PC; widths below 1,200 px.
