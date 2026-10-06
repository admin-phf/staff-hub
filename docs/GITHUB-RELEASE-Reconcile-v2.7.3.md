# Reconcile CH2 v2.7.3 — Preserve included invoice figures and explain shared-key application

GitHub summary: Validate each invoice line and preserve product-level quantities and prices
Released 07 Oct 2026 08:02 AEDT (request timestamp). Based on v2.7.2.

SPECIAL ORDER remains unchanged and is never treated as a missing product ID.
The existing CH2 code / merged master / barcode / PLU reconciliation already
identifies Tea Tonic and Cabot separately. No matching or TXT field order changed.

Included billed lines now preserve the invoice supplied quantity even if a
positive Found adjustment differs. Found=0 still omits a line; manual receiving
for products absent from invoices remains an explicitly marked separate case.
Added source checks for each included line: unique invoice number/line/product
code plus quantities, unit price, wholesale, discount, extended, GST and total.
Incorrect generated values fail validation. Missing printed fields retain the
existing documented fallback. Shared Sub ID warnings now list each product,
CH2 code, barcode, PLU and invoice quantity; exports remain available. Added
invoice-versus-POS GST setting warnings. Updated page/script cache version.

## Tea Tonic diagnosis and complete variance

The actual TXT already sends Tea Tonic 10 units and Cabot 2 units. The resulting
POS XLS gives Tea Tonic 2 units at Cabot's 10.80 discounted cost, and Cabot zero.
These are downstream application differences, not a 2-unit export by our tool.
Both retain SPECIAL ORDER. The existing 15-column POSActive contract has no
barcode/PLU field; changing labels or silently inserting fields cannot prove
which order row POSActive will choose. This update does not claim to repair the
POSActive application's receiving algorithm.

Actual XLS arithmetic reproduces 7073.439 -> 7073.44 exactly, compared with
invoice 7141.35. Displayed variance breakdown:
- Tea Tonic: 21.60 versus 71.48 = -49.88.
- Cabot: 0 versus 23.76 = -23.76.
- Two AussieZinc products: POS applies 10% GST; invoice prints zero = +5.52.
- Other unit-price/GST rounding combined = +0.21.
Total = -67.91. Full 101-line actual-result audit CSV is included in docs.

## Validation and limits

Syntax checks; all 101 invoice lines tested with linked order rows; exact
7141.35 output total; shared-key fixtures; changed Found quantity fixture;
deliberate per-line corruption check; original regression and ZIP integrity.
Default invoice TXT values remain unchanged. Full live-browser/POSActive import
not tested. Matching invoice totals does not certify the subsequent POS result.
All original archive paths retained; unrelated contents unchanged.
