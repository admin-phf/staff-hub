# Staff Hub v21.35.3 — POS New Product Check Clean: the POS check is information only, and the Update in POS ticks decide what changes (22 Oct 2026 12:15 AEDT)

**Summary:** v21.35.3 — the same merge is used for different jobs: a clean-up (discontinued, Sub IDs, PLUs), a check of what you stock, or a buy-better comparison. The Update in POS ticks and the Discontinue switch choose what changes. POS New Product Check Clean v1.23.3 no longer stops when the supplier rows match the POS: no CHOOSE and no button to press. The steps are READY as before 20 Oct. The check still shows on the row (POS MATCH), in the status line and in the Supplier Updates panel, together with what this run will change in POS. Loading the same rows twice is still refused, and the status line no longer says "Missing" after a paste.

## Changes — POS New Product Check Clean v1.23.3
- **Never stops a run.** Supplier rows matching POS products (90%+ by barcode + description, or the POS's own file by name) no longer make the page "not ready". The CHOOSE state and the "Run as a POS clean-up" / "Not a clean-up" buttons are gone, and no choice is saved with the session.
- **Information kept.** The Supplier Updates row reads POS MATCH (blue). The status line and the Supplier Updates panel say, for example: "The Supplier Updates match the POS — 34,283 of 34,285 supplier rows (100%) match POS products by barcode and description … Fine for a clean-up, a check of what you stock or a buy-better comparison — Update in POS: keeping POS's wholesale price, last price, price levels 1–5 (member pricing), RRP, price levels 1–9 and ret price · Discontinue missing products: on." The line changes as you tick or untick headings, so you can confirm what goes into POS before running. The panel keeps a "Remove these rows" button.
- **Still refused:** a second copy of the same rows.
- **The status line follows the sheet.** After a paste or edit that changes whether the page can run, e.g. pasting rows into an empty sheet, the status line is refreshed. Before, it kept saying "Supplier Updates sheet cleared … Missing: Supplier Updates".

## Files
- Changed: index.html (hub v21.35.3); tools/pos-supplier-merge/index.html, js/app.js (v1.23.3); docs/ARCHITECTURE.md; docs/GITHUB-RELEASE-v21.35.3.md (new).
- Unchanged: merge.css (the blue note style from v1.23.2 is reused), the merge engine, merge-map.js, the Apps Script files, every merge and export routine, the other tools.

## Tests run (22 Oct, headless Chromium, real files)
- **Drop All.** POS Database from the Library + reference tables + clean_merged_pos_data_pos_db_15.10.26 (1).xlsx → READY straight away, Run all on. The status line gave the match (34,283 of 34,285) and "Update in POS: every ticked heading — nothing kept · Discontinue missing products: on."
- **Same rows under another name** → refused as a second copy.
- **Unticking SUP WS EXGST, SUP RRP INC GST and POS MEMBER.** The status line and panel then read "keeping POS's wholesale price, last price, price levels 1–5 (member pricing), RRP, price levels 1–9 and ret price".
- **Reload** → still READY with the same note.
- **Remove these rows** → removed, Supplier Updates missing.
- **Add 5 rows into the empty sheet.** The status line changed from "Missing: Supplier Updates" to "Ready to run." A paste of 60 rows at a cell landed ("Pasted at C3 … 55 rows added").
- Zero page errors.

## Not run
- Chrome on his PC; checking the run's UPDATE file against POSActive.
