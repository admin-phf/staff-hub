# Staff Hub v21.6.0 — Reconcile CH2 v2.9.0

Released 09 Oct 2026 00:26 AEDT. Based on v21.5.0.

## Commit notes

**Summary:** v21.6.0 — POSActive total prediction, GST differences, Sub ID % check, compact POS Layout, clear input files

**Description:**
- Reconcile CH2 v2.9.0: predicts POSActive's Current / Adjusted Total after the import and explains the gap to the invoice
  (lines POSActive cannot match, GST settings, cent rounding); GST differences panel, review note and INV-rate chip on the
  GST % cell; Sub IDs containing % $ " flagged because POSActive's import drops those characters and cannot match them.
- POS Layout fits wider: narrower POS Index / CH2 Line / GST % / Units / Qty / Adj Qty and price columns, wider POS Brand,
  Total and Current / Adjusted totals pinned to the right when a narrow window still scrolls.
- Clear order files / Clear all input files in the Reconcile rail; Clear input files in the Database Builder rail.
- Tool titles (Build Master Databases, Reconcile CH2 Order, Update Specials and the other tool pages) link back to the Staff
  Hub like the logo.

## What the sample orders showed
- **105-0008845 / invoice 74154567:** POSActive's "1 invoice item does not match" is ORA Hormonal Balance, Sub ID
  `3 PER SKU 25%`. POSActive's import drops the `%`, reads `3 PER SKU 25` and cannot find it on the order, so $64.77 is not
  applied. The new prediction gives Current $1,239.38 / Adjusted $1,231.53 — exactly the POSActive screen
  ($1,296.21 − $64.77 + $0.09 cent rounding).
- **105-0008807 / invoice 74112188:** the same `3 PER SKU 25%` Sub ID (line 20, $191.27).
- **GST settings:** 105-0008673 has 10 products where CH2's GST differs from POSActive (six AussieZinc SPF50s, Kolorex
  Horopito, MyDetoxify PHGG and Nutraviva Collagen billed GST-free but set to 10% in POSActive; Untamed Radish Red Rambo billed
  10% but set to 0%) → POSActive's total is $47.48 above the invoice. 105-0008788: 3 products (+$3.08); 105-0008737: Natures
  Shield Black Sesame Oil (−$2.21).
- **Blank Sub IDs:** 105-0008788.XLS (internal order 103-0021639) has 9 invoiced rows with no Sub ID, TEST ORDER.XLS 17 and
  105-0008737 one; POSActive cannot match those lines (already listed by the match check).
- **Cent differences:** POSActive recalculates each cost as Extended ÷ Qty rounded to the cent and W/S from that (e.g.
  Teelixir Ashwagandha 36.07 → 36.08). The prediction includes this rounding.

## POSActive model used (checked against the real 105-0008845 import)
- Only TXT lines whose Sub ID POSActive matches on the order are applied.
- New AdjDPrc = Extended ex GST ÷ Qty rounded to the cent; AdjWSPrc = AdjDPrc ÷ (1 − Disc %).
- Current Total = Σ old AdjDPrc × order Qty × (1 + product GST %) for applied rows.
- Adjusted Total = Σ new AdjDPrc × imported Qty × (1 + product GST %).

## Checks run
- `node --check` on every script; POSActive TXT scenario tests (as invoiced, under, over, zero, split, back order, duplicate
  and split invoices, missing order number).
- All sample orders and invoices (real PDFs) reconciled headlessly; predictions above.
- Chromium at 1870, 1600 and 1440 px: the table fits at 1870 px with POS Brand wider; at narrower widths the Total and
  Current / Adjusted totals stay pinned on the right.
- Rail clear buttons (Reconcile: order files, then all incl. saved reference data; Database Builder: inputs cleared, outputs
  kept) and title home links on both tools.
