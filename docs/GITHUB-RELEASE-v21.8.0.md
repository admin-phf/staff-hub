# Staff Hub v21.8.0 — Combined Master v2.4.0 + POS Supplier Merge v1.1.0

Released 10 Oct 2026 11:30 AEDT. Based on v21.7.0.

## Commit notes

**Summary:** v21.8.0 — master file in Reconcile CH2 style with match checks + audit tabs; paste rows into POS Supplier Merge

**Description:**
- Build Master Databases (Master v2.4.0): `merged_alligned_pos_supplier_uhp_full` now uses the Reconcile CH2 look:
  navy / gold header, banded rows, ↑ red / ↓ blue / — grey price moves, navy totals row. Values unchanged.
- Each POS → CH2 / Unique link is checked on BC · SUB ID · BRAND · W/S · TEXT · SIZE (☑ / ☒ / ☐) with a score and a
  HIGH / MEDIUM / LOW confidence: 16 new `CHK_` columns after MATCH_BASIS. The matching itself is unchanged.
- The full file has two new tabs: Match_Audit (counts and what each check means) and Links_To_Check (every LOW / MEDIUM
  link, with the reason and the POS vs supplier details side by side).
- POS Supplier Merge v1.1.0: the Supplier Updates input shows the IN_SUPPLIER sheet on the page — the Sheet's totals bar,
  the 16 headings and all supplier rows — and rows copied from Excel / Google Sheets can be pasted straight in (Ctrl+V).
- Selected / To-Order master files, Reconcile CH2 and Update Specials unchanged.

## Testing done
- Real inputs (34,252 POS · 9,682 CH2 · 4,847 Unique), Build All in the browser: 38,284 master rows, 173 columns, no
  double-check warnings; match checks HIGH 9,894 · MEDIUM 346 · LOW 223. Full file opens in Excel / LibreOffice / openpyxl.
- Reconcile CH2 reads the new full file from Full_Data as before (9,682 CH2 codes).
- POS Supplier Merge: pasting the 623 CH2 supplier rows (with headings) gives TXT files byte-identical to dropping the
  same file, and the same totals bar (Matched 488 · New 121 · Not Used 6 · Unmatchable 8). Positional paste (B–O),
  quoted multi-line cells, $ / comma values, undo, clear and search all checked; no page errors.
