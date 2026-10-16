# Staff Hub v21.25.6 — merge price ticks back on OUT_MERGED_DATA (16 Oct 2026 14:15 AEDT)

**Summary:** v21.25.6 — POS New Product Check Clean v1.15.5: the CURRENT / NEW price tick pairs (WSP + last price together, RRP) are back on OUT_MERGED_DATA with their v1.14.0 rules; CURRENT price columns editable; the pricing columns always show the new price and its coloured change; edited cells one look on every sheet; engine-host v1.7.1 no doubled words, marketing words POS keeps, TYPE inferred

## Commit notes
- OUT_MERGED_DATA shows the tick pair on CURRENT WSP EXGST / NEW WSP EXGST, CURRENT LAST PRICE / NEW LAST PRICE and
  CURRENT RRP / NEW RRP again. NEW ticked (default) = the merge's price goes to POS; CURRENT ticked = matched products keep
  POS's price, the NEW column greys and its cells are not edited. The same setting as the supplier sheet's J / K ticks.
- Supplier, brand, description and SIZE stay as v1.15.0: no ticks, the updated column goes to POS, edit the cell to override.
- A restored session keeps its `last` setting again (v1.15.0 dropped it with the tick).
- v1.15.2: the supplier sheet's J tick (SUP WS EXGST) sets both the WSP and the last price, as before v1.14.0; the OUT NEW /
  CURRENT LAST PRICE tick can still split them for a run. CURRENT WSP EXGST / LAST PRICE / RRP are editable again.
- v1.15.3: the WSP and last price pairs move together on OUT_MERGED_DATA as well — CURRENT WSP EXGST ticks CURRENT LAST
  PRICE, NEW WSP EXGST ticks NEW LAST PRICE (either pair's tick sets both); a restored session aligns them. merge.css
  v1.13.6: an edited cell takes the SUP OVERRIDE PENDING look (#E37400 bold on #FEF3E2, no edge or corner) on the supplier
  sheet and the workbook sheets alike (`!important` on both, so a status or "no change" colour never shows through).
- v1.15.4: with CURRENT ticked, NEW WSP EXGST / NEW LAST PRICE / NEW RRP still show the merge's price (greyed) and the
  CHANGE % / $ columns keep their value and colour; only the POS block and FINAL SHELF RRP show what POS will have
  (`KEEP_SHOW` without the NEW columns, `KEEP_ZERO` empty, `KEEP_COLOUR` left out of the grey).
- v1.15.5: an unticked supplier column shows POS's existing data in OUT_MERGED_DATA, greyed — `KEEP_SHOW.sub` adds POS SUB
  ID (N) and `KEEP_SHOW.supplier` adds UPDATED SUPPLIER (G, copied from the row's POS SUPPLIER as NAME (NO)); `sub.out` /
  `supplier.out` grey and lock them as POS BRAND / POS DESCR already were. Prices keep the v1.15.4 rule (new price and
  change always shown). The POS files were already right: with F unticked every matched UPDATE row carries POS's Sub ID.
  New products always carry the supplier's values.
- engine-host v1.7.1 (Apps Script files unchanged):
  - `m13DP5EnsureMustKeepFromQ_` wrapper: a re-added word already inside another token (WOMEN'S, NIGHT+L, L-THN,
    QUERCETIN+NETTLES) is dropped — no `BIOC ULTRA MUSCLEZE NIGHT+L THN L 60T`.
  - `m13SZ1RestorePurgedPosWords_` wrapper → `restoreMarketing()`: a marketing phrase in both the supplier text and the
    matched POS description goes back in front of the size when it fits (BIOC UBIQ BIOACTIVE 150MG 30C); skipped when an
    abbreviation of it is already there (BIOACT).
  - `inferType()` at the end of `refineType` when the script found no form: VC / SG → CAPSULES, LOZ → LOZENGES, topical
    words → TOPICAL, ML / LTR → LIQUID, KG → POWDER (no food word), G → POWDER (powder word, no food word; a flavour CREAM
    does not make it topical). 15 Oct run: TYPE blank 896 → 362 of 1,984 live rows (+414 POWDER, +268 LIQUID, +158
    TOPICAL, 1 CAPSULES); POWDER rows get PWD in POS DESCR as v1.7.0 does.

## Files
- Changed: index.html (v21.25.6), tools/pos-supplier-merge/{index.html, README.md, js/app.js v1.15.5, js/engine-host.js v1.7.1, js/engine-worker.js, engine-frame.html, css/merge.css v1.13.6}, docs/ARCHITECTURE.md.
- New: docs/GITHUB-RELEASE-v21.25.6.md.

## Testing done (16 Oct, headless Chromium)
- After a run: six ticks on OUT (CURRENT off / NEW on for WSP, last price, RRP). Ticking CURRENT WSP: NEW WSP unticked and
  grey, matched cells grey, supplier sheet J unticked, options note "keeping POS's wholesale price". No page errors.
- v1.15.2: unticking J turns both OUT pairs to CURRENT ("keeping POS's wholesale price, last price"); ticking NEW LAST PRICE
  alone puts last price back to NEW with WSP still CURRENT and J unticked; CURRENT RRP opens an editor.
- v1.15.3: CURRENT WSP on OUT → CURRENT LAST PRICE ticks too (J unticked); NEW LAST PRICE → both NEW, J ticked. Edited
  NEW RRP / CURRENT RRP / NEW WSP / POS DESCR cells and a supplier-sheet SUP BRAND cell all compute to rgb(227,116,0) bold on
  rgb(254,243,226).
