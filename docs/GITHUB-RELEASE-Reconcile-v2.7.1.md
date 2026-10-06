# Reconcile CH2 v2.7.1 — Allow POS import download with wholesale review warnings

GitHub summary: Fix POS import download blocked by wholesale-price discrepancies

Release timestamp: 07 Oct 2026 07:21 AEDT (request timestamp).
Base: supplied staff-hub(6).zip. Database builder version unchanged.

The screenshot showed two blocking errors for invoice 74201074 line 80:
Normal W/S less discount differed from Unit Price; predicted POSActive WS
30.61 differed from the printed Normal W/S 33.13.

The PDF confirms line 80 prints quantity 12, unit price 28.1605, discount 8%,
Normal W/S 33.13, extended ex GST 337.93, GST 33.79 and total 371.72.
These printed commercial values are inconsistent with the wholesale/discount
formula. The exporter now reports both discrepancies as warnings and allows
TXT download. It preserves the existing printed values and calculations; it
does not silently change prices or discounts to force a match.

Only those two checks changed from errors to warnings. Other validation remains,
including the 15-column tab-delimited contract, CRLF, quantity and invoice-total
checks. The reconciliation page version and exporter cache token were updated.
All other original files and folders are byte-for-byte unchanged.

Validation: JavaScript syntax; regression fixture using the exact line-80 PDF
values (original fails with the two screenshot errors, updated exporter succeeds
with both warnings); malformed TSV still blocked; archive integrity and unchanged
entry comparison. No live browser, full-order end-to-end or POSActive import test.

Install: extract the complete ZIP over the existing staff-hub folder, commit and
publish the changes, then refresh the CH2 reconciliation page and confirm v2.7.1.
Re-upload the invoice and POS order, reconcile and download the POS import.
Review line 80 prices in POSActive before applying. No publishing performed here.
