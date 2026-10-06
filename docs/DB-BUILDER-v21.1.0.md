# Database Builder v21.1.0 — 06 Oct 2026

- Combined Master is now POS-anchored: CH2-only and Unique/UHP-only source rows are excluded from the merged output until the product exists in POS. Counts are retained as diagnostics.
- `merged_alligned_pos_supplier_uhp_full_*.xlsx` automatically downloads immediately after the Combined Master passes its integrity verification.
- Full, selected and To-Order master workbooks now use the approved Reconciled CH2 Order visual contract: navy/yellow summary row, pale blue header, alternating white/grey rows, thin blue-grey borders and Google Sans metadata.
- Master workbook verification was updated for the summary + header + data + totals layout.
- Standalone Combined Master download behaviour and naming were aligned with the integrated builder.
