# Staff Hub v21.35.4 — OUT_MERGED_DATA keeps ORIGINAL POS DESCR and SUP PRODUCT exactly as they came; only POS DESCR changes (22 Oct 2026 12:45 AEDT)

**Summary:** v21.35.4 — across OUT_MERGED_DATA's O · P · Q you now see exactly what POS has (ORIGINAL POS DESCR), what goes to POS (POS DESCR, the one to edit) and what the supplier sent (SUP PRODUCT). SUP PRODUCT (Q) is read-only, like ORIGINAL POS DESCR already was. It also shows the supplier's text exactly as on the IN_SUPPLIER sheet: before, the merge wrote it in capitals with the ends trimmed, and sell-through rows had their note rewritten ("*SELL THRU*" became "*SELL THROUGH*"). The TXT files are unchanged.

## Changes — POS New Product Check Clean v1.23.4 (engine-host v1.7.5)
- **SUP PRODUCT (Q) is read-only on OUT_MERGED_DATA.** Hovering it says: "what the supplier sent (read-only). Change POS DESCR instead — to correct the supplier's text, edit SUP PRODUCT on the IN_SUPPLIER sheet and run stage 2 again." ORIGINAL POS DESCR (O) was already read-only, and POS DESCR (P) stays editable.
- **Q is the supplier's text exactly as uploaded.** After stage 2 / Refresh, Q gets the IN_SUPPLIER text back wherever the merge's copy is the same text apart from capitals and spaces. It never takes another row's text: if two rows spell the same text differently, Q is left as the merge wrote it.
- **Sell-through rows keep the supplier's note as written** (e.g. "*SELL THRU*", "Sell Through New SKU 2959733 …"). The sell-through marker still goes on POS DESCR (the "*") and in NOTES ("SELL THROUGH — new SKU 2959733").
- **ORIGINAL POS DESCR (O) was already exact.** In a full clean-up run, all 34,283 rows matched the POS Database's description character for character, and nothing here changes it.
- No change to matching, POS DESCR, prices, upload checks or the TXT files. Q is only read in capitals by the size / type / sell-through passes, so they see the same text as before.

## Files
- Changed: index.html (hub v21.35.4); tools/pos-supplier-merge/index.html, js/app.js (v1.23.4), js/engine-host.js (v1.7.5), js/engine-worker.js and engine-frame.html (load engine-host v1.7.5); docs/ARCHITECTURE.md; docs/GITHUB-RELEASE-v21.35.4.md (new).
- Unchanged: the Apps Script files (engine/*.js), merge-map.js, the other tools.

## Tests run (22 Oct, headless Chromium, real files)
- **Full POS clean-up run** (POS Database + the POS's own A–P file as Supplier Updates, 34,283 OUT rows, done before this change). Every ORIGINAL POS DESCR equalled the POS Database description, and SUP PRODUCT equalled the uploaded text.
- **Test supplier file, run on v21.35.3 and v21.35.4.** 135 CH2 rows from 5 brands, including the real "*SELL THRU*" rows plus one "Sell Through New SKU 2959733 …" and one lower-case row with spaces:
  - POS INSERT and POS UPDATE TXT files identical byte for byte.
  - In the review workbook, only OUT_MERGED_DATA column Q and the version stamps differ.
  - Q now reads "… *SELL THRU*", "Sell Through New SKU 2959733 Abode …" and "  abode bathroom cleaner … (Mixed Case)  " exactly as uploaded, where v21.35.3 had "*SELL THROUGH*" and capitals.
  - POS DESCR still ends in "*" on sell-through rows, and NOTES still says SELL THROUGH.
- The OUT_MERGED_DATA heading for SUP PRODUCT shows the read-only note.
- Zero page errors.

## Not run
- Chrome on his PC.
