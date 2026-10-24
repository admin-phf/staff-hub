# Staff Hub v21.44.0 — Reconcile: a "Fix in POSActive before uploading" list with every column, plain checklist lines with only the cell to fix in red, and % Sub IDs no longer flagged (24 Oct 2026 11:40 AEDT)

**Summary:** v21.44.0 — In Reconcile CH2 Order:
- **A new list straight under the summary, "Fix in POSActive before uploading",** shows each line to fix in full, with every column of the checklist. That means you can find it in POSActive by PLU, barcode or Sub ID. The cell to fix is red. Under each line is what was found, what to change, the $ effect and **Show in checklist**.
- **In the checklist, a line to fix is no longer orange.** Only the cell to fix is red, for example GST "0 / INV 10".
- **A Sub ID with % in it (ORA's "3 PER SKU 25%") is no longer flagged.** It is the order's own Sub ID and imports as it is.
- **The GST differences box is gone,** because its lines are in the list. "Not on POS order" is in Details.

Exports are unchanged.

## Reconcile CH2 Order v2.26.0
- **Fix in POSActive before uploading** (between the summary and Details):
  - **Heading:** the count and the total effect, for example "−$0.69 GST · $5.28 not applied".
  - **Each line:**
    - It is shown exactly as in the checklist, with the same columns, widths and header. It is read-only, because receiving is still done in the checklist.
    - The cell to fix is red: GST "0 / INV 10", or Sub ID "(blank)".
    - Under it, for example: "**GST DIFFERS** · Found: CH2 charged 10% GST ($1.36); POSActive has this product at 0% → Change: if it should carry GST: set GST 10% on PLU 922583 in POSActive — if it is GST-free, ask CH2 for a $1.36 credit · −$1.36 · Show in checklist ↓".
  - **What it flags:**
    - GST different from POSActive.
    - No Sub ID on the POS order. It suggests the CH2 code and shows the $ not applied.
    - A Sub ID shared by several invoiced products.
    - A LOW-confidence match.
  - **Foot:** what to raise with CH2 instead, which is not a POSActive fix: Price high, Discount low, Not invoiced and Not on POS order.
  - **When nothing needs fixing:** one green line, "✓ Nothing to fix in POSActive before uploading".
  - **Show in checklist** (or a click on the line) jumps to the line and flashes it. On a narrow window the list scrolls sideways with the Total column pinned, like the checklist.
- **Checklist:** no orange tint and no warning line above a line to fix. Only the cell is red, with the explanation on hover. The "Fix in POSActive" chip still filters the checklist to those lines.
- **% $ " in a Sub ID** (your note: existing POS Sub IDs import as they are):
  - No more "POSACTIVE CAN'T IMPORT", "POSACTIVE CANNOT MATCH" review note or "POSActive will flag" message.
  - The POSActive match check counts such a line as matched.
  - This rule was added on 9 Oct (v21.6.0) from a POSActive "1 invoice item does not match" on order 105-0008845. If POSActive ever reports a mismatch again, the balancing check shows which line.
- **Balancing check:** the GST differences box is gone (its lines are in the list), and Not on POS order is at the top of Details: "Details — Not on POS order (2), review notes (6), …".

## Files
- Changed:
  - index.html (hub v21.44.0)
  - tools/reconcile-ch2/index.html, js/app.js, js/export/pos-import.js, css/workspace.css (v2.26.0)
  - docs/ARCHITECTURE.md
- New: docs/GITHUB-RELEASE-v21.44.0.md.
- Unchanged: the other tools, Google Drive and the Library.

## Tests run (24 Oct, headless Chromium, real files)
- **Invoice 74147128** (1,860 and 1,440 px):
  - **List:** 3 lines.
    - MAHARISHI TOOTHPASTE 75ML: GST, −$1.36.
    - JJ FINGER BRUSH: no Sub ID, change to 2635641, $5.28 not applied.
    - PUKKA THREE MINT TB 20: GST, +$0.67.
  - **Display:**
    - Column widths are identical to the checklist (1,759 / 1,750 px).
    - The red cells are on the right cells.
    - The foot reads "Price high · 3 · +$9.43 · Not invoiced · 3 · Not on POS order · 2".
  - **Checklist:** no orange rows and no note lines, with the three cells red.
  - **Show in checklist:** jumped to MAHARISHI and flashed it.
  - **ALL:** still ticks (the list keeps its 3 lines).
  - **Details:** shows Not on POS order. The balancing check has no GST box.
- **Invoice 74154567:** "✓ Nothing to fix in POSActive before uploading". ORA HORMONAL BAL 150G is not flagged, and there are no % notes. The RUN status reads "Complete: 18/18 invoice lines matched. 5 POS line exceptions. Integrity PASS."
- **Exports:** for both invoices the TXT, CSVs and .xlsx are identical to v21.35.3 (xlsx apart from the creation time).
- The receiving test (not-invoiced tick, ALL, Add Qty 0, live footer) gives the same results as before.
- Zero page errors.
