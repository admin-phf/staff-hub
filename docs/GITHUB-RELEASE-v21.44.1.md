# Staff Hub v21.44.1 — Reconcile: a new run never carries the last one, and every invoice is checked against the order (24 Oct 2026 12:05 AEDT)

**Summary:** v21.44.1 — Reconcile CH2 Order no longer carries a previous order's invoice into the next run.
- **Loading a new POS order releases the supplier invoices of the previous order,** and a note says which. Before, both invoices were reconciled against the new order: the old one's lines showed as "Not on POS order", and any that matched a product on the new order were counted on its lines.
- **After every run, each invoice is checked against the order.** One whose lines are mostly not on the order gets a red **Check the invoice** line at the top of the results, with **Remove it and run again**.
- **The Fix list's PLU and wording come from this run only.** It had shown the previous run's PLU (1000153 instead of 922583).
- **The summary names the invoice(s)** each run used.

Exports are unchanged.

## What was wrong (your report: "it didn't release previous data … returning 2 lots of billed products")
- One POS order can have several CH2 invoices, so an invoice dropped in is *added* to those already loaded. But loading a *new* order kept the old invoices too.
- **Run order A + invoice A, then drop order B + invoice B:** both invoices were reconciled against order B.
- **Test (74154567, then 74147128):** "108 of 124 invoice lines matched", invoice total $8,100.69, and 16 billed products not on the POS order instead of 2.
- 4 of invoice A's lines matched products on order B, so they would have gone into order B's TXT when ticked.
- **The Fix list** looked products up in the checklist's list of lines before it was rebuilt for the new run, so its text showed the previous run's PLU.

## Reconcile CH2 Order v2.26.1
- **Each invoice remembers the order it was loaded with.**
  - **Loading a different POS order** (drop box, its row, or Google Drive) releases the invoices that belong to the previous order. The status starts "New POS order …: the supplier invoice of the previous order was released (Invoice_74154567.pdf)."
  - **Invoices loaded before any order, or with the same order,** stay. So dropping the invoice first and the order afterwards works, and so does adding a second invoice for the same order.
- **Invoice check after every run:** an invoice that matched fewer than half its lines to the POS order gets, at the top of the results:
  - A red line, for example: "**CHECK THE INVOICE** Invoice_74147128.pdf (invoice 74147128, Customer PO 28.09.2026-MELB-SID) matched only **5 of its 106 lines** to POS order 105-0008845 — it looks like it belongs to another order. Those 5 lines are counted on this order's lines (and go into the TXT when ticked); its other 101 lines show as "Not on POS order". Remove it unless it really is for this order."
  - **Remove it and run again**, which removes that file and runs again in one click.
  - The summary shows "Check the invoice — see below" instead of "Checks passed", and the RUN status starts with the same warning.
- **Nothing from the last run:** a run clears the last run's lines, Fix list and lookups before it starts.
- **Summary:** "Invoice 74147128 $6,804.48", or "2 invoices (74154567, 74147128) $8,100.69", so you can see which files the result came from.

## Files
- Changed:
  - index.html (hub v21.44.1)
  - tools/reconcile-ch2/index.html, js/app.js, js/ui/workspace.js, css/workspace.css (v2.26.1)
  - docs/ARCHITECTURE.md
- New: docs/GITHUB-RELEASE-v21.44.1.md.

## Tests run (24 Oct, headless Chromium, real files). Each sequence was compared with a clean run, including the POSActive TXT with ALL ticked
- **Order A + invoice A run, then order B + invoice B dropped on top:** invoice A was released with the note. The result is identical to a clean B run (104 of 106, 2 not on POS order, the same 3 Fix lines with PLU 922583). **TXT identical.**
- **B, then A dropped on top:** identical to a clean A run. **TXT identical.**
- **Invoice dropped first, its order afterwards:** the invoice stayed. Identical to clean. **TXT identical.**
- **Order A + invoice A, then only invoice B dropped (the wrong one):**
  - The run showed "2 invoices (74154567, 74147128)", "Check the invoice — see below" and the red line: "matched only 5 of its 106 lines".
  - **Remove it and run again** gave a result identical to a clean A run. **TXT identical.**
- **Single runs:** invoices 74154567 and 74147128 give TXT, CSVs and .xlsx identical to v21.35.3 (xlsx apart from the creation time). Widths 1,759 / 1,750 px.
- Zero page errors.
