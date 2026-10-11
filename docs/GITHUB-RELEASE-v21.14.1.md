# Staff Hub v21.14.1 — POS New Product Check Clean v1.6.1

Released 12 Oct 2026 09:40 AEDT. Based on v21.14.0.

## Commit notes

**Summary:** v21.14.1 — POS New Product Check Clean v1.6.1: kept columns show POS's current values, theme grey

**Description:**
- With an Update in POS heading unticked, OUT_MERGED_DATA now shows POS's current values in the kept columns of matched
  products — on the page, in its row-1 totals and in the review workbook — so what you see is what POS gets. SUP RRP INC
  GST: NEW RRP, rrp incgst, price levels 1–9 and ret price are POS's, and FINAL SHELF RRP is worked out from POS's RRP
  (before, the screen and the workbook still showed the merge's recalculated levels, e.g. pr 5 51.97 where POS has 60).
  SUP WS EXGST: NEW WSP / NEW LAST PRICE are POS's, with no change. Sub ID, brand, description, units, box lot, GST and
  supplier likewise. Tick the heading again and the merge's values come back.
- Kept cells of matched products can't be edited; clicking one says why.
- Kept cells use the Sheet's "no change" grey text (#9E9E9E) on the normal row colours, on OUT_MERGED_DATA, the supplier
  sheet and in the review workbook (was a grey box / hatch). The amber KEPT headings stay.
- The POS UPDATE TXT was already right (POS's RRP and levels exactly) and is unchanged. Merge script v6.3.89 unchanged.

## Files
- Changed: index.html (hub version and tile), docs/ARCHITECTURE.md, tools/pos-supplier-merge/{index.html, README.md,
  css/merge.css, js/app.js, js/sheet-grid.js}
- New: docs/GITHUB-RELEASE-v21.14.1.md
- No Apps Script changes.

## Testing done
- 11 Oct Google Sheet download, SUP RRP INC GST unticked: all 184 matched rows show POS's RRP, pr 1–9 and ret price in
  OUT_MERGED_DATA and the review workbook (0 differences), other rows unchanged; FINAL SHELF RRP identical to the merge's
  own for the 170 rows where POS's RRP is the merge's RRP; 2,576 kept cells grey text on the row colour; e.g. PLU 980462
  BIOC ULTRACLEAN KRILL OIL 60: NEW RRP $94.00 (was $85.95), pr 5 60 (was 51.97).
- SUP WS EXGST unticked as well: NEW WSP / last price = POS, changes 0.00% / $0.00, FINAL SHELF RRP from POS's WSP and
  last price; stage 3 → UPDATE 252. Every heading unticked → every kept column = POS, OLD BRAND empty, UPDATE = the 143
  discontinued rows only. Ticking again → OUT identical to the first run (347 of 347).
- Kept cell: Enter / typing does not edit it and shows the KEPT note. Reload: the kept view comes back with the session.
- v1.6.0 and earlier tests still pass (UPDATE 327 / 260 / 117 / 91, filters, Export TXT again, session, sheet editing).
