# Staff Hub v21.7.0 — POS Supplier Merge v1.0.0

Released 10 Oct 2026 02:30 AEDT. Based on v21.6.1.

## Commit notes

**Summary:** v21.7.0 — add POS Supplier Merge tool (Google Sheet merge v6.3.87 running in the browser)

**Description:**
- New Staff Hub tool `tools/pos-supplier-merge/` + home tile. Same layout and theme as Build Master Databases:
  Input files rail with drag and drop, Drop All Input Files, input readiness, three stages, Run All, outputs.
- Runs the unchanged Apps Script files (1.0 Setup, 1.1 FormatClearPopup, 1.2 HighlightNewProductsBestBuy,
  1.3 Merge — v6.3.87) in a Web Worker on an in-memory Google Sheets stand-in; same results as the Google Sheet.
- Inputs: POS Database + Supplier Updates from Build Master Databases (session only); SRC reference tables saved
  in this browser. A downloaded copy of the Google Sheet fills every input from its tabs.
- Outputs: POS INSERT / POS UPDATE TXT files (same names and content as EXPORT POS FILES), review workbook,
  and an OUT_MERGED_DATA review table with search and filters.
- Other tools and `assets/css/theme.css` unchanged.

## Testing done
- Test data (1,149 POS + 623 supplier rows): both TXT files byte-identical to the Apps Script run; counts
  1,182 OUT rows (508 matched, 94 new, 15 review, 565 discontinued), 93 insert / 1,073 update rows.
- Same result through the background worker, from a file with workers allowed, and through the in-page fallback.
- 31,149 POS + 2,523 supplier rows: about 8 seconds for all three stages; reading the 4 MB POS file about 5 seconds.
- Saved reference survives a reload; inputs replaced / added / removed reset the stages; Clear session keeps saved reference.

## Phase 2 (next)
Review-table editing: UPDATED SUPPLIER overrides with Refresh Supplier Changes, RRP / markup overrides,
Filtered Brands build.
