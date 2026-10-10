# Staff Hub v21.9.0 — POS Supplier Merge v1.2.0 (editable supplier sheet)

Released 10 Oct 2026 19:10 AEDT. Based on v21.8.0 (includes v21.8.1).

## Commit notes

**Summary:** v21.9.0 — editable supplier sheet, full-width layout and per-file delete in POS Supplier Merge (+ merge v6.3.88)

**Description:**
- POS Supplier Merge v1.2.0: the IN_SUPPLIER sheet works like a Google Sheet — click a cell and type, paste from the
  selected cell, add / delete rows, Undo (Ctrl+Z); changed cells turn amber and the stages reset.
- The sheet is always shown, full width under Input readiness and the three stages (same width as the OUT_MERGED_DATA
  review).
- Each input in the left rail has its own ✕ to remove it straight away (saved reference deleted from the browser);
  the clear buttons also clear the drop list and the sheet.
- Paste check now looks at the data (barcodes, prices) and only warns when something looks wrong.
- Includes v21.8.1: merge engine v6.3.88 discontinues unmatched POS products under every POS name of an uploaded brand.

## Testing done
- Typing, Enter / Tab / arrows, Escape, Delete, copy, drag / Shift selection, INDEX row selection, Add row, Delete rows,
  Undo — all checked in Chrome; no page errors.
- Pasting 44 rows (B–L) at the empty row adds them in the right columns with no warning.
- Pasting the 623-row supplier list at A3 gives POS INSERT / UPDATE files byte-identical to dropping the file.
