# Staff Hub v21.35.2 — POS New Product Check Clean allows a POS clean-up run on purpose (22 Oct 2026 11:40 AEDT)

**Summary:** v21.35.2 — a merge with the POS's own products as the Supplier Updates is a deliberate POS clean-up run: the POS checked against itself, for discontinued products and unique PLUs. v21.33.0–v21.35.1 refused that file, removed it on open, or blocked it. POS New Product Check Clean v1.23.2 accepts the POS's own file again. When it is loaded, the Supplier Updates panel asks once, with no pop-up: **Run as a POS clean-up** or **Remove these rows**. The choice is kept with those rows, also after a reload, and the row and status line say "POS clean-up run". Loading the same rows twice is still refused.

## Changes — POS New Product Check Clean v1.23.2
- **The POS's own file can be the Supplier Updates again.** That's clean_merged_pos_data… / clean_merged_pos_data_pos_db…, whether dropped on the row, through Drop All, or brought back from the saved session. It's no longer refused (v1.22.0) or removed on open (v1.23.1).
- **One choice in the Supplier Updates panel.** It appears when the Supplier Updates are the POS's own products, by file name or with 90%+ of rows matching POS Database rows (barcode + description):
  - **Run as a POS clean-up** → the row reads CLEAN-UP (blue), the steps READY, and the status line "Ready to run — POS clean-up run: the Supplier Updates are the POS's own products". The panel keeps a blue "POS clean-up run" note with "Not a clean-up — ask again" and "Remove these rows".
  - **Remove these rows** removes the POS-copy files and keeps a real CH2 / Unique set loaded alongside.
  - Until you choose, the row reads CHOOSE (yellow, amber on the panel head), the steps stay WAITING and Run is off. The status line explains both options.
- **The choice is saved with the session.** It holds after a reload. It's asked again if the supplier rows or the POS Database change, e.g. a newer POS Database from the Library.
- **A second copy is still refused.** For example, the same file under another name; the 20 Oct run had it twice (68,570 rows).
- The Supplier Updates card text says how the POS file is used for a clean-up run.

## Files
- Changed: index.html (hub v21.35.2); tools/pos-supplier-merge/index.html, js/app.js, css/merge.css (v1.23.2); docs/ARCHITECTURE.md; docs/GITHUB-RELEASE-v21.35.2.md (new).
- Unchanged: the merge engine, merge-map.js, the Apps Script files, every merge and export routine, the other tools.

## Tests run (22 Oct, headless Chromium, real files)
- **Drop All.** POS Database from the Library + reference tables + clean_merged_pos_data_pos_db_15.10.26 (1).xlsx: accepted, row CHOOSE, steps WAITING, Run off. The status named the file and said 34,283 of 34,285 rows match. The panel showed both buttons.
- **Same rows again** (clean_merged_pos_data_pos_db_15.10.26.xlsx) → refused as a second copy.
- **Run as a POS clean-up** → CLEAN-UP, READY. After a reload: still CLEAN-UP / READY, "Ready to run — POS clean-up run".
- **"Not a clean-up — ask again"** → back to CHOOSE / WAITING.
- **Full clean-up run.** All three stages DONE in 281 s: a review workbook and a POS UPDATE file ("POS UPDATE 2026-10-22 DISCONTINUED, UNKNOWN, INIKA …").
- **Remove these rows** → removed, Supplier Updates missing, and still gone after a reload.
- Zero page errors.

## Not run
- Chrome on his PC; checking the clean-up run's UPDATE rows against POSActive (that is for him to review before importing).
