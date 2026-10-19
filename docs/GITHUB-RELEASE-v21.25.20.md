# Staff Hub v21.25.20 — Combined Master saves to the Library again; the "header row differs" warning now names the column (19 Oct 2026 14:30 AEDT)

**Summary:** v21.25.20 — fixes the Combined Master full / selected files showing "header row differs from the required layout · not saved to the Library" and therefore not reaching the browser Library (which is why Reconcile CH2 Order could not find the master). The re-open double-check now compares against the same spaced headings the file actually shows, and when something really is wrong the warning names the exact column it found versus the one it expected.

## Commit notes
- Fix (regression from v21.16.0 / v21.25.11): the Combined Master full and selected files show spaced headings in row 2
  (MASTER_BARCODE is shown as "MASTER BARCODE") for easy reading, while the data stays keyed to the underscore identifiers.
  The safety check that re-opens each written file (verifyMasterWorkbook) was still comparing those spaced headings against
  the underscore identifiers, so it always decided the header row was wrong. That false warning then blocked the save to the
  Library — so the merged master never became the saved posMaster copy, and Reconcile CH2 Order reported the POS / master as
  missing. The check now spaces the expected headings the same way the file does before comparing (the To-Order sheet already
  receives its own display names, so it is compared as-is). The underlying data checks (barcode and index sample rows, row
  count, totals band) are unchanged.
- The warning message, when a header genuinely does not match, now names the exact column: "Full_Data: column 1 heading is
  "MASTER BRAND", should be "MASTER_BRAND"", or, if the count is off, "the file has N heading columns but the layout needs M".
  Previously it only said "header row differs from the required layout" with no detail.

## Files
- Changed: index.html (hub badge v21.25.20), tools/database-build/index.html (tool badge v21.16.4, pipeline.js?v=21.16.4),
  tools/database-build/js/pipeline.js (VERSION v21.16.4), docs/ARCHITECTURE.md, README.md.
- New: docs/GITHUB-RELEASE-v21.25.20.md.
- Unchanged: all Apps Script (.gs) and engine files; master-core.js (already v2.6.0 — it is what writes the spaced headings,
  and that behaviour is correct and kept).

## Testing done (19 Oct)
- Reproduced the header transform with the shared style profile (assets/js/phf-xlsx-style.js): MASTER_BARCODE → "MASTER
  BARCODE", MASTER_BRAND → "MASTER BRAND", POS_INDEX → "POS INDEX", etc. — exactly what master-core.js writes to row 2.
- Confirmed the OLD check failed at column 1 ("MASTER BRAND" vs "MASTER_BRAND") for the full and selected sheets, which is
  the exact warning on the output; the NEW check reports no mismatch for the full, selected and To-Order sheets, so the
  master now passes verification and is saved to the Library as posMaster.
- Full headless end-to-end was not re-run here because the POS / CH2 / UHP stages load ExcelJS from a CDN that the test
  sandbox blocks; the fix is isolated to the header comparison in verifyMasterWorkbook and was validated against the real
  header transform used by master-core.js.

## Note for Kenneth — why the Library survives closing the browser
The saved files live in **IndexedDB**, a proper database built into the browser, not in the page itself and not in
temporary (session) storage. IndexedDB is kept on disk and stays there after you close the tab, close the browser, or shut
down and come back the next day — the tools read it again on load, which is why POS New Product Check Clean and the others
keep working after a restart. The Hub also asks the browser to mark that storage as persistent ("STORAGE PROTECTED" on the
Library panel), so the browser will not quietly clear it to reclaim space. The reason the master looked like it "wasn't
there" this time was not the storage — it was this bug: the file was never written to the Library in the first place
because the false header warning blocked the save. With this fix the master is written, so it will now persist like the rest.
