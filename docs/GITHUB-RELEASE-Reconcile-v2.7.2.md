# Reconcile CH2 v2.7.2 - Identify products in wholesale review warnings

GitHub summary: Add invoice number, CH2 product code and description to wholesale warnings

Released 07 Oct 2026 07:24 AEDT (request timestamp). Based on v2.7.1.
Wholesale/discount and predicted-POSActive-wholesale warnings now identify the
invoice number, invoice line, CH2 product code and product description.
Warnings remain non-blocking. Exported TXT values and download behaviour are
unchanged. Updated page version and script cache token. Other files unchanged.

Verified with invoice 74201074 line 80: CH2 2634955, HAB SHIFA ULTRA STRENGTH
BLACK SEED OIL 120C. Both warnings include the full product identity; export
remains available and its TXT contents are identical to v2.7.1. JavaScript
syntax and ZIP integrity checks pass. No live browser/POSActive import test.

Upload changed files to GitHub, refresh and confirm Reconcile CH2 v2.7.2.
