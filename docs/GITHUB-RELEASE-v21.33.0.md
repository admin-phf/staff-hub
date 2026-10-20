# Staff Hub v21.33.0 — POS New Product Check Clean refuses the POS's own files and duplicate supplier rows, checks for POS copies before a run, leaves the full merged master out of Drop All, and Clear Sheet clears the whole sheet (20 Oct 2026 23:00 AEDT)

**Summary:** v21.33.0 — a merge was run with the POS's own products as Supplier Updates (clean_merged_pos_data_pos_db — the POS Database in the A–P layout), loaded twice (68,570 rows), so the POS was compared with itself. POS New Product Check Clean v1.22.0 now refuses Build POS Master's POS files as Supplier Updates, refuses a second copy of rows already loaded (whatever the file is called), and asks before running when most supplier rows are exact copies of POS Database rows. Drop All no longer takes the Ongoing_Discounts_Source tab out of the full merged master. Clear Sheet now clears everything in the sheet — supplier files, Library sets and typed rows — with Undo, instead of being greyed out when every row came from a file. The "0 FILES" pill under Drop All shows only when a file needs a choice. Build POS Master labels that file "POS products in the A–P layout · not a supplier update".

## Changes
- **POS files refused as Supplier Updates.** A file named clean_merged_pos_data_… (the full POS set, or the POS products in the A–P layout) dropped on the Supplier Updates row, the card or Drop All is refused, with a note on the row: it is the POS itself, and Supplier Updates are the CH2 / Unique rows (+ Add CH2 set / + Add Unique set, clean_ch2_data_pos_db_… / clean_uhp_data_pos_db_…). Rows already loaded stay.
- **Second copies refused.** Supplier rows identical to a file already loaded — the same file renamed "… (1).xlsx", or a CH2 / Unique full set when its A–P file is already in (they give identical rows) — are refused with "these N rows are already loaded as …". Re-dropping the same file name still replaces it, as before.
- **POS-copy check before a run.** When 90 % or more of the supplier rows (and at least 50) have the same barcode and description as a POS Database row, Run asks first ("OK = run anyway · Cancel = stop and check"). This catches a renamed POS file or pasted POS rows. It asks once per set of inputs. Real CH2 + Unique sets don't trigger it.
- **Drop All and the full merged master.** A workbook holding the Combined Master is listed for review and nothing is taken from it. Before, its Ongoing_Discounts_Source tab replaced the shared Ongoing Discounts used by all three tools. Dropping the master on the Ongoing Discounts row itself still uses that tab, as before.
- **Clear Sheet.** It is enabled whenever the sheet has rows. It clears the supplier files, the Library sets and the typed / pasted rows. The confirm lists each file with its row count, and Undo (or Ctrl+Z) puts everything back. When the sheet has both files and typed rows, Cancel on the first question offers "Clear only the N rows you typed or pasted" (the previous behaviour). Any old refusal note on the row is cleared too.
- **Drop All messages.** The "0 FILES" pill is hidden unless a file needs a choice; its `hidden` setting was overridden by the badge style. After a Drop All, the status line names any file that was refused and why, instead of "No file was recognised".
- **Wording.** The Supplier Updates card text names the CH2 / Unique files and says not to use the POS files. Build POS Master v21.21.1 shows the POS _pos_db row as "POS products in the A–P layout · not a supplier update".

## What the screenshots showed
- Supplier Updates held clean_merged_pos_data_pos_db_20.10.26 twice (2 × 34,285 = 68,570 rows). That gave every row BEST BUY • MATCHED, "New 0", "Not used 34,729" (the second copy), and NEW 0 / UP 0 in OUT_MERGED_DATA, yet still 181 price downs. TXT files from that run should not be imported.
- Ongoing Discounts showed merged_alligned_pos_supplier_uhp_full_… because Drop All took its Ongoing_Discounts_Source tab (118 rows · 87 brands · 16 suppliers). That is the discount table the master was built with.
- POS Database INCOMPATIBLE for the master was correct. "Required" meant no POS Database was loaded at that moment.

## Files
- Changed: index.html (hub v21.33.0); tools/pos-supplier-merge/index.html, js/app.js, css/merge.css (v1.22.0); tools/database-build/index.html, js/pipeline.js (v21.21.1, label only); docs/ARCHITECTURE.md; docs/GITHUB-RELEASE-v21.33.0.md (new).
- Unchanged: merge-map.js (shared with the engine — the card text is set in app.js), the engine and Apps Script files, every build, merge and export routine.

## Tests run (20 Oct, headless Chromium, real files)
- References + clean_merged_pos_data_15.10.26 via Drop All → all loaded; the Drop All pill is hidden.
- Full merged master via Drop All → one REVIEW row, and Ongoing Discounts stays POS ONGOING DISCOUNTS.xlsx (118 rows). On v21.32.0 it was replaced by the master's tab.
- clean_merged_pos_data_pos_db_15.10.26 via Drop All, and its "(1)" copy on the card → both refused, with the note on the row and in the status line.
- + Add CH2 set / + Add Unique set → 2 files, 14,529 rows. The CH2 A–P file again as "(1)", and the CH2 full set → both refused as second copies.
- Add 5 rows, then Clear Sheet: Cancel, then "typed only" → 5 rows cleared and the files kept. Clear Sheet again → 0 rows, Add buttons back to "+ Add". Undo → 2 files, 14,529 rows.
- The POS A–P file renamed "my supplier rows.xlsx" → loaded (34,285 rows). Running asked: 34,283 of 34,285 rows (100 %) are copies. Cancel → not run, pills still READY.
- Real CH2 + Unique sets → Run all with no question. All three stages DONE in 208 s, POS UPDATE 2.8 MB and POS INSERT 492.8 KB.
- Zero page errors in every run.

## Not run
- Dragging files by hand (the file inputs were used); reloading a saved session that already holds a POS copy (the run-time check covers it); widths below 1,180 px.
