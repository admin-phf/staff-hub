# Staff Hub v21.23.0 — POS New Product Check Clean v1.13.0: upload checks before the POS files (hold / check / fixed, Upload ticks)

Released 14 Oct 2026 07:30 AEDT. Based on v21.22.0 (commit 8748119).

## Commit notes

**Summary:** v21.23.0 — upload checks before the POS files: held rows stay out until ticked, check and fixed rows marked, ZZZZ made consistent

**Description:**
- **Upload checks on every OUT_POS_INSERT / OUT_POS_UPDATE row** after stage 3, before the TXT files:
  - **Held** (starts unticked, not in the TXT until ticked): RRP below the WSP; last price under half or more than double
    the WSP (the PRANA 15.00 paste); a barcode that fails its check digit; a new product POS already has by barcode or by
    Sub ID for that supplier; a box / display price that cannot be resolved.
  - **Check** (stays in, amber): WSP or RRP moves more than 40 %; the brand differs from POS's (outside Brand Name Changes
    and the same brand family); no size or pack count in common with POS's description; a discontinued product that
    still has stock on hand, or whose discontinue row changes a price.
  - **Fixed** (stays in, green, the change shown): a box / display WSP divided by the pack count (MEL VIT C 125G 8:
    105.52 → 13.19, POS has 13.13); SELL text and repeated words taken out of descr / pos desc (ANIPAL STICKS 210GM 210G
    210G → ANIPAL STICKS 210GM; PRANA SPORT PRANA 500G … → PRANA SPORT 500G …); ZZZZ brand / descr made consistent
    (ZZZZ EN JOINT → ZZZZ ZEN JOINT, ZZZZ ZZEAGLE → ZZZZ EAGLE, ZZZZ PRANA SPORT ZZZZPRANA 400G → ZZZZ PRANA SPORT 400G).
- **Upload tick on every row** of the two POS tabs (in the row number): unticked = left out of the TXT. Stage 3 and
  Export TXT again write the ticked rows only.
- **Upload checks list** above each POS tab: every flagged row with its reason, Show held / To check / Fixed / All rows,
  Tick all held / Untick all held, a row number that jumps to the row on the sheet.
- The ticks are kept with the session (they come back after a reload) and the review workbook has a new
  OUT_UPLOAD_CHECKS sheet.
- Column ticks (Update in POS) never apply to INSERT rows (a new product has no POS value to keep); the Upload tick
  covers both files.
- Discontinued products already ZZZZ in POS stay in the UPDATE file (their brand / descr are made consistent there).

## Files
- Changed: index.html, docs/ARCHITECTURE.md, tools/pos-supplier-merge/{index.html, engine-frame.html, README.md,
  css/merge.css, js/app.js, js/engine-host.js, js/engine-worker.js, js/sheet-grid.js}
- New: docs/GITHUB-RELEASE-v21.23.0.md
- Delete by hand (still in the repo): tools/database-build/js/size-worker.js

## Testing done (14 Oct, Kenneth's 14 Oct files: POS Database 13.10.26 + the 00:02 review workbook, 3,269 supplier rows)

The same merge was run headless on commit 8748119 and on this change, Discontinue on and off. The 8748119 run reproduces
Kenneth's three TXT files byte for byte (INSERT 193, UPDATE 1,918 off / 3,100 on), so the comparison below is against
exactly what he had.

**POS INSERT (193 rows → 158 in the TXT):** 35 held, 0 added, 4 changed, every other field byte-identical.

| Held | Rows | Example |
|---|---|---|
| RRP below WSP + last price 15.00 under half the WSP | 21 | PRANA PLANT BANANA SPLIT 1.1KG — WSP 45.43, RRP 41.30, last 15.00 |
| Barcode fails its check digit | 11 | 0933789017029 BIOC CLIN IM REPAIR PEAR PWD 300G; the 5 Melrose displays (9312628019947 …) |
| POS already has the Sub ID for that supplier | 4 | BIOL COCO VEGGIE CRM 100G ORG37 → PLU 919735; ENER-C VAR PK MPECM30 → PLU 991530; ETH NUTS LYSINE LCD60 → PLU 979391; WELEDA HND CRM SENS 2629988 → PLU 990409 |

Fixed (still in): the 5 Melrose display WSPs divided (12.00 ÷ 12 = 1.00, RRP 1.90; 38.20 ÷ 20 = 1.91, RRP 3.50) — held
anyway for their barcodes; ANIPAL STICKS 210GM 210G 210G, ANIPAL TREATS DOGS 130GM 130G 130G, EAGLE CLIN B PRO+60T
2965931 SELL, NUTRA ORG SMOOTH SELL 500G 2946027 cleaned.

**POS UPDATE, Discontinue on (3,100 → 2,991):** 109 held, 0 added, 42 changed (descr / pos desc / brand / wsp / last
price only).

| Held | Rows |
|---|---|
| Last price 15.00 under half the WSP (PRANA, PRANA SPORT, PRANA FOOD) | 88 |
| Last price 15.00 more than double the WSP (PRANA bars, sachets, shaker) | 20 |
| RRP 25.85 below WSP 105.52 and WSP up 704 % — MEL BIOFLAVONOIDS FLAVOURED 100G (PLU 900049) | 1 |

Check (in the TXT, amber): 94 discontinued products with stock on hand; 49 brand changes (MARTIN & PLEASANCE → AINSWORTHS
BACH, RESTQ / ZEN / VITAL GREENS → MARTIN & PLEASANCE, MARTIN & PLEASANCE → HE / KI, BIOCEUTICALS → BLACKMORES
PROFESSIONAL); 15 WSP and 7 RRP moves over 40 % (CABOT GLUTAMINE 50G 28.45 → 5.72, CABOT KELP PWD 13.50 → 29.95).

Fixed: MEL VIT C ASCORBIC / CALCIUM / SODIUM ASCORBATE 125G 8 — WSP 105.52 ÷ 8 = 13.19 (POS 13.13), last 84.42 → 10.55;
22 descriptions (BIOC ULTRABIOTIC IBS SELL 30C, CABOT DR CABOT CLEANSE, NL MAG GLYC+CREAT CREAT 300G 300G, 14 × PRANA
SPORT PRANA …, VITAL PROTEIN 500GM 500G 500G, WELEDA NAIL CRM SELL); 16 ZZZZ rows (ZZZZ EN JOINT → ZZZZ ZEN JOINT, ZZZZ
ZZEAGLE → ZZZZ EAGLE, ZZZZ ZZWELEDA → ZZZZ WELEDA, 13 × ZZZZ PRANA SPORT ZZZZPRANA …). Every ZZZZ row in the file is now
`ZZZZ ` + the name once, in brand, descr and pos desc. PAW PAW, MP T T … are left alone.

**Discontinue off (1,918 → 1,809):** the same 109 held, 39 changed, nothing else differs from 8748119.

**Ticks:** Tick all held on OUT_POS_INSERT + Export TXT again → 193 rows back in the INSERT TXT (the 4 cleaned + 5 divided
differ from 8748119, nothing else). A row unticked on the sheet, a held row ticked in the list, reload the page → both
as left (the session keeps them). "Upload ticks changed — use Export TXT again" on the stage card and the TXT downloads.

**Unchanged:** stages 1–2 (OUT_MERGED_DATA identical), the Apps Script files, the TXT layout (30 fields), the min order,
stock, member and keep-tick behaviour, the OUT_MERGED_DATA review, the SRC tabs.
