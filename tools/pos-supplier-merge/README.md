# POS New Product Check Clean v1.15.4 (Staff Hub v21.25.6)

Updated 16 Oct 2026 12:15 AEDT. (Named POS Supplier New Product Check and Clean Merge in v1.4.0 – v1.5.0 and POS Supplier
Merge up to v1.3.1; the folder and web address are unchanged.)

v1.15.4 — **The pricing columns always show the new price and its change.** NEW WSP EXGST, WSP CHANGE % / $, NEW
LAST PRICE, CHANGE LAST PRICE % / $ and NEW RRP show the merge's price and the coloured change whether NEW or CURRENT is
ticked — with CURRENT ticked the NEW price is greyed, the change keeps its colour. Only the POS block (wsp excgst, last
price, rrp incgst, price levels, ret price) and FINAL SHELF RRP show what POS will have.

v1.15.3 — **WSP and last price move together; edited cells look the same everywhere.** On OUT_MERGED_DATA, tick
CURRENT WSP EXGST and CURRENT LAST PRICE ticks with it; tick NEW WSP EXGST and NEW LAST PRICE follows (either pair's tick
sets both, as the supplier sheet's J does). A cell you change has one look on every sheet — the SUP OVERRIDE PENDING look:
bold orange text on a light orange band, no edge or corner (before, the two sheets differed and a grey "no change"
colour could show through on the workbook sheets).

v1.15.2 — **J covers the WSP and the last price again; CURRENT price columns editable.** The supplier sheet's SUP WS EXGST
tick (J) sets both the WSP and the last price, as it did before v1.14.0 — untick it and both OUT pairs go to CURRENT. (v1.15.3: the
OUT last-price tick moves with the WSP tick too.)
CURRENT WSP EXGST, CURRENT LAST PRICE and CURRENT RRP can be edited again (v1.15.0 had locked them).

v1.15.1 — **The price ticks are back on OUT_MERGED_DATA.** CURRENT / NEW WSP EXGST, CURRENT / NEW LAST PRICE and CURRENT /
NEW RRP have their tick pairs again, with the v1.14.0 rules: one of the two is ticked — **NEW** = the merge's price goes
to POS, **CURRENT** = matched products keep POS's price (the NEW column greys). The same setting as the supplier sheet's
J / K ticks. Supplier, brand, description and SIZE stay as v1.15.0 (no ticks; edit the cell to override).

v1.15.0 — **No ticks on OUT_MERGED_DATA (price pairs back in v1.15.1); the updated columns are what goes to POS; fill down on every sheet.**
- **OUT_MERGED_DATA has no heading ticks any more.** The updated column of each pair — UPDATED SUPPLIER (G), POS BRAND (H),
  POS DESCR (P), NEW WSP EXGST (S), NEW LAST PRICE (W), NEW RRP (AA) — and SIZE (AL) are what the merge writes to POS. To
  override one, edit that cell: it turns orange, and UPDATED SUPPLIER is checked against POS Suppliers as before (an
  account number or name becomes `NAME (NUMBER)`; anything else is refused and the cell goes back).
- **The "what POS has now" columns are read-only** — POS SUPPLIER (F), OLD BRAND (J), ORIGINAL POS DESCR (O), CURRENT WSP
  EXGST, CURRENT LAST PRICE, CURRENT RRP. Clicking one says which column to change instead.
- **Update in POS ticks stay on the supplier sheet** — every heading except INDEX, SUP BARCODE and STATUS. Ticked = that
  column goes into the merge and the POS files; unticked = matched products keep what POS has for it (swapping suppliers
  and only updating the Sub ID: tick C / F, untick the rest). The supplier tick shows under both **POS SUPPLIER NAME (B)**
  and **POS SUPPLIER NUMBER (C)** — one setting.
- **Sell-through** (engine-host v1.7.0): the note on SUP PRODUCT in any form — `*SELL THRU*`, `*SELL THROUGH, NEW SKU
  2959733*`, a bare `SELL THROUGH` — is read off before matching and the description is built (no `SELL` or SKU number
  leaks into POS DESCR, as `WELEDA NAIL CRM 50ML 2893931` did). The row's **POS DESCR ends with `*`** (the sell-through
  marker staff look for; it goes to POS in descr / pos desc), SUP PRODUCT shows the note, and **NOTES (AF)** says
  `SELL THROUGH — new SKU 2959733`. Matched by the supplier barcode, so a replacement SKU with the same name is not marked.
- **Forms written one way** (engine-host v1.7.0): litres are **LTR** in SIZE / itemsize and POS DESCR (`1L`, `1LT`,
  `1 LITRE` → `1LTR`; when LTR does not fit in 35 characters, LT, then L). A **POWDER** product's POS DESCR carries
  **PWD** — `ORAL` becomes `PWD`, else PWD goes in before the size when it fits; the 13 that cannot fit are listed by the
  upload checks ("Powder without PWD in the description").
- **No doubled word after a possessive**: `BIOC WOMEN'S ESS WOMEN 120C`, `EA CAT'S CLAW ECHINE CAT 60T` — the script's
  must-keep pass could not see WOMEN behind WOMEN'S and added it again; it no longer does (OUT_MERGED_DATA and the TXT).
- **Fill down on the workbook sheets** (OUT_MERGED_DATA, OUT_POS_INSERT / UPDATE and the SRC tabs), as on the supplier
  sheet: drag the small blue square at the corner of the selection down, or Ctrl+D (⌘D) fills a selection down from its
  first row (one cell selected: from the cell above). Read-only cells are skipped and counted in the note; Undo takes the
  fill back.

v1.14.0 — **Ticks only where there is a choice; item size; Ctrl + arrow.** (OUT ticks removed again in v1.15.0.)
- **OUT_MERGED_DATA ticks on the CURRENT / NEW pairs only** — supplier (F / G), brand (H / I), description (O / P), WSP
  (R / S), last price (V / W) and RRP (Z / AA). One of the two is ticked: **NEW** = the merge's value goes to POS, **CURRENT**
  = POS keeps its own for matched products. The internal columns (CHANGE %, CHANGE $, WSP TO RRP MARKUP %, +6.5 %, CURRENT
  WSP TO RRP, RRP / MARKUP OVERRIDE, FINAL SHELF RRP) and the final POS block have no ticks. The supplier-sheet ticks are
  the same settings; Sub ID, units, box lot, GST and member have no pair in OUT, so their ticks are on the supplier sheet
  only.
- **Last price has its own tick** (V / W). It used to follow the WSP tick (J). J now covers the WSP alone.
- **Item size goes to POS** from SIZE (AL), as written — `1KG`, `300G`, `60C`, `20X5G` — for new and matched products,
  with a tick on the SIZE heading. Unticked: matched products keep POS's item size, new products get none. Discontinued
  products keep POS's. POS's 143 existing item sizes are plain numbers, so if POSActive refuses the text form, untick SIZE
  and say so — a number-only form is a one-line change.
- **SIZE gaps filled** (400 blank rows → 192 on the 14 Oct files): from SUP PRODUCT first, then POS DESCR. Count × size
  (`20 X 5G`, `4.5G X 30 PACK`, `30 X SACH`) → `20X5G`, `30X4.5G`, `30XSACHET`; weights and volumes (`G`, `GM`, `ML`, `MLS`,
  `KG`, `L`, `LT`, `OZ`, `LB`); counts (`60S`, `60TB`, `60CHEW`, `50 GUMMIES`, `90 VEGIECAPS`, `30CA`, `3PK`, `1PC`, `SACH`);
  doses (`MG`, `MCG`, `IU`) last — `COQ10 150MG 60C` is `60C`. A SIZE that is not a size (`1000MG VITAMIN C`, `CONTAINS:
  …`) is blanked. The rows still blank have no size (books, kits, packs, sprays) or a discontinued name POS cut off.
- **Ctrl + arrow** (⌘ + arrow) on every sheet jumps to the edge of the filled cells, as in Excel; Ctrl + Shift + arrow
  extends the selection.

v1.13.0 — **Upload checks before the POS files.**
- After stage 3, every row of OUT_POS_INSERT and OUT_POS_UPDATE is checked before it goes into the TXT files. There are
  three kinds of flag:
  - **Held** — the row would damage POS, so it starts **unticked** and stays out of the TXT until you tick it: the RRP is
    below the WSP; the last price is under half, or more than double, the WSP (the PRANA 15.00 paste); the barcode fails
    its check digit; POS already has the new product (same barcode, or the same Sub ID for that supplier); a box /
    display price that cannot be worked out.
  - **Check** — stays in the TXT, amber, worth a look: the WSP or RRP moves more than 40 %; the brand is not the one POS
    has (a Brand Name Changes pair, or MELROSE ORGANIC → MELROSE, is not flagged); the size or pack count in the
    description has nothing in common with POS's; a product being discontinued still has stock on hand, or its
    discontinue row changes a price.
  - **Fixed** — stays in, green, and the change is shown: a box / display WSP divided by the pack count (MEL VIT C 125G
    8: 105.52 ÷ 8 = 13.19, POS has 13.13; MEL BALL 35G 12: 12.00 ÷ 12 = 1.00, RRP 1.90) — divided when that lands near
    POS's own WSP or gives a sensible margin, kept when POS sells the box, held otherwise; SELL text and repeated words
    taken out of descr / pos desc (ANIPAL STICKS 210GM 210G 210G → ANIPAL STICKS 210GM, CABOT DR CABOT CLEANSE → CABOT
    DR CLEANSE, PRANA SPORT PRANA 500G … → PRANA SPORT 500G …; PAW PAW and MP T T are left alone); ZZZZ brands and
    descriptions made consistent — always `ZZZZ ` and the name once (ZZZZ EN JOINT → ZZZZ ZEN JOINT, ZZZZ ZZEAGLE →
    ZZZZ EAGLE, ZZZZ PRANA SPORT ZZZZPRANA 400G → ZZZZ PRANA SPORT 400G), for discontinued products and for matched
    products POS already holds as ZZZZ.
- **Upload tick on every row** of the two POS tabs, in the row number. Ticked = in the TXT, unticked = left out. Held rows
  start unticked (red edge, grey text); check rows have an amber edge, fixed rows a green one; hover the row number for
  the reason; a cell the checks changed has a green corner. The badge says `193 ROWS · 35 HELD`.
- **Upload checks list** above each POS tab: every flagged row with its reason and its own tick; **Show held / To check /
  Fixed / All rows** (a view of the sheet — it never changes what is exported); **Tick all held / Untick all held**; the
  row number jumps to the row on the sheet.
- Stage 3 and **Export TXT again** write the ticked rows only, and say so: "POS INSERT: 35 held (unticked, not in the
  TXT), 4 fixed". Changing a tick after an export marks the TXT downloads "Made before your Upload tick changes" — use
  Export TXT again. The ticks come back with the session, and the review workbook has an **OUT_UPLOAD_CHECKS** sheet.
- The Update in POS column ticks never apply to INSERT rows (a new product has no POS value to keep); the Upload tick
  covers both files. Sub ID changes on matched products are not flagged — POS holds old in-house codes and the suppliers
  now use CH2 codes, so nearly every row would be.
- Discontinued products that are already ZZZZ in POS stay in the UPDATE file; their brand / descr are made consistent.
- 14 Oct test on Kenneth's files (details in docs/GITHUB-RELEASE-v21.23.0.md): INSERT 193 → 158 in the TXT (21 PRANA, 11
  barcodes, 4 duplicates held), UPDATE 3,100 → 2,991 (109 PRANA 15.00 rows and one Melrose held); nothing else in either
  file changed except the fixed rows.

v1.12.0 — **TYPE is the packaging POS gets.**
- OUT_MERGED_DATA's packaging (BS) is its TYPE (AM) — CAPSULES, TABLETS, OIL, TOPICAL, LIQUID, POWDER, TEA, SACHETS,
  LOZENGES, SOFTGELS — and goes to POS in the INSERT / UPDATE packaging field (new and matched products). Where no TYPE
  is found, BS stays as before (POS's own packaging for a matched product, blank for a new one). A TYPE you type in AM goes
  to BS as well. SUP PRODUCT's Update in POS tick covers packaging: unticked, POS keeps its packaging.
- TYPE review (13 Oct full CH2 set, 15,224 OUT rows: 207 TYPEs changed, nothing else in OUT changed):
  - **Sachets that were missed** (42): SACH / SACHS / SACHE abbreviations (AMAZONIA PROT ISO SACH 30G, LOCAKO … SACH12G
    X 8 PACK — not SACHA INCHI) and single-serve packs in SUP PRODUCT, 15 g or less (BEFORE YOU SPEAK … COFFEE 4.5G X
    30 PACK). A refill satchel (90G) is not a sachet.
  - **STICK alone is no longer SACHETS** (45 were): deodorant / zinc / sunscreen / lip / balm / skin sticks are TOPICAL
    (34), smudge / dental / palo santo sticks and a whiz-stick mixer have no type (11). STICK PACK is still SACHETS.
  - **TEA only when it is tea** (120 were wrong): TEA TREE / TTREE and TEA LIGHT are not tea (tea tree oils → OIL,
    creams / gels / balms → TOPICAL, shampoos / soaps → no type), and an ingredient tea gives way to the product's form
    (SOAP LIQUID … GREEN TEA → LIQUID, GREEN TEA 30T → TABLETS, LIP BALM GREEN TEA → TOPICAL).
  - LIQUID from ML / LT is unchanged.

v1.11.1 — **pasted rows line up by their barcodes.** A block copied from POS SUPPLIER NUMBER onwards (no name column) and
pasted at B3 used to go one column to the left — supplier number in B, barcode in C — so nothing could match (every row
UNMATCHABLE / IDENTITY REVIEW). Now a pasted block of 6+ columns finds its barcode column and goes where the barcodes land
in D, whether you click B3, C3 or D3 or use the Paste button; the message says so ("Pasted at C3 (not B3 — lined up so
the barcodes are in D)"). A row-shaped block with no barcode column is flagged straight away. Smaller pastes (a few
prices, one column) go exactly where you click. POS SUPPLIER NAME is filled from the number when stage 1 runs (v1.9.0).

v1.11.0 —
- **Search / add bar** (the supplier sheet's search box, now the toolbar's whole first line). It starts with the supplier
  most rows have — `OBORNE / CH2 | 134 | ` — and you type over it:
  - plain text (no `|`) searches every column, as before;
  - with `|` it is a row in the column order B–O: `POS SUPPLIER NAME | POS SUPPLIER NUMBER | SUP BARCODE | SUP BRAND |
    SUP SUB ID | SUP PRODUCT | SUP UNITS IN PACK | SUP MIN ORDER WS | SUP WS EXGST | SUP RRP INC GST | SUP GST |
    SUP STOCK IN | SUP DISCOUNT PRICE | POS MEMBER`. The sheet shows the rows with that barcode; when the barcode is not
    on the sheet (or empty) it falls back to brand / Sub ID / product / WS. The supplier slots never filter. Next to the
    bar: the column the cursor is in and what was found ("not on the sheet — Add puts it in");
  - **Add** (or Enter) adds the row. A barcode already on the sheet is not added again (that row is shown); the same
    brand with the same Sub ID or WS is added with a warning naming the other row. Esc puts the bar back to the supplier.
- **Add 5 rows** (was Add row) and **Clear empty rows** (rows with nothing from D to O).
- **Fill down**, as in Excel / Google Sheets: drag the small blue square at the corner of the selected cell(s) down — the
  selection repeats into the rows dragged over (new rows are made at the end). Ctrl+D (⌘D) fills a selection down from
  its first row (one row selected: from the row above). B–O only.
- **Ctrl+C / ⌘C** copies the selected cells on every sheet by writing the clipboard itself (some browsers sent no copy
  when no text was highlighted). While typing in a cell with nothing highlighted, Ctrl+C copies the whole cell.
- **New Update in POS ticks on M, N and O:**
  - **M SUP STOCK IN** — ticked: a number there becomes a NEW product's stock on hand (pos soh, the last INSERT field) for
    a buy-in with stock. Matched products keep POS's stock (it comes in through receiving). Empty = nothing.
  - **N SUP DISCOUNT PRICE** — ticked: a price there is a one-off extra discount (it becomes the last price; empty = WSP
    less the ongoing discount, as before). Unticked: the column is not used — the stages run again.
  - **O POS MEMBER** — price levels 1–5. Ticked: worked out by the merge (PL1 90% for members, else 100%; PL2 90%; PL3
    85%; PL4 80%; PL5 the staff formula). Member = the O cell (TRUE / FALSE wins), else the brand's flag in Product
    Prefixes (D) / Ongoing Discounts (J), else POS: a matched or discontinued product's own price level 1 (about 90% =
    member, 100% = not), a new product's brand when most of its live POS products are on 90%. Unticked: POS keeps its
    price levels 1–5. SUP RRP INC GST unticked still keeps every price level (no new labels).
  - Before this, a discontinued product of a member brand could come out at PL1 100% although POS has 90% (27 METAGENICS
    products in the 13 Oct test) — it now keeps POS's 90%.
- **OUT_MERGED_DATA's Update in POS ticks are back** (as v1.8.0); pr 1–5 carry the O tick, pr 6–9 / ret price the K tick.
- **\*SELL THRU\***: a CH2 line whose Description 2 says SELL THROUGH / SELL THRU (930 lines on 13 Oct) ends SUP PRODUCT
  (G) in ` *SELL THRU*` (supplier-layout v1.1.0, also in Build's `_pos_db` file). The merge reads G without it, so
  matching and descr / pos desc are exactly as before; OUT_MERGED_DATA's SUP PRODUCT (Q) shows it.
- **Min order "N/A"** (1,250 CH2 lines) stays on the supplier sheet and OUT_MERGED_DATA; OUT_POS_INSERT / OUT_POS_UPDATE
  (and the TXT) get 1 for a new product and POS's own min order for a matched one. Any other text there ("8 X 1.1KG")
  goes the same way.
- No lines between the supplier sheet's title band, brands line and toolbar.

v1.10.0 —
- **No inner lines in the heading block of any sheet** (IN_SUPPLIER and every workbook tab): the row-1 totals and the
  headings read as one band, with no vertical lines between the columns and no line between row 1 and the headings. The
  grey letters row (A, B, C…), the row numbers and the data rows keep their grid lines; column widths are unchanged.
- **The Update in POS ticks are on the supplier sheet only again** (C, E, F, G, H, I, J, K, L — the same columns since v1.6.0).
  OUT_MERGED_DATA has no ticks; it still recalculates from the supplier sheet's ticks, and the headings of the columns POS
  keeps have grey text (hover says why). No KEPT label.
- The review workbook's stamp gives the tool's own version (it still said v1.7.2).

v1.9.0 —
- **Row-1 totals follow the filters** on every tab (OUT_MERGED_DATA, OUT_POS_INSERT, OUT_POS_UPDATE, the SRC_ tabs and
  TMP_MERGED_POS_DATA), as the supplier sheet already did. Each total keeps its own kind: POS BRANDS is the number of
  different brands shown (1 when you filter POS BRAND to one brand), TOTAL ROWS the rows shown, the $ totals the sum of the
  rows shown. TMP_MERGED_POS_DATA's price × SOH totals are now labelled **STOCK VALUE @ WSP** and **STOCK VALUE @ LAST
  PRICE**. The downloaded review workbook still has the totals for the whole sheet.
- **The rows badge counts the column filters too** ("55 OF 604 ROWS"), not only the search and drop-downs.
- **POS SUPPLIER NAME is filled in when stage 1 runs**: any supplier row with B blank and a POS SUPPLIER NUMBER in C gets
  the name from POS Suppliers (SRC_POS_SUPPLIERS: 134 → OBORNE / CH2). Rows that already have a name are not changed. The
  title band says how many were filled.
- **Brand Name Changes, Product Prefixes, POS Suppliers and Ongoing Discounts are required** (they were "recommended"):
  the stages wait until they are loaded. They stay saved in this browser, so this is once per browser. Find & Replace is
  still optional.
- Hovering a selected (navy) button keeps white text on a darker navy; white buttons keep navy text.

v1.8.0: the supplier sheet looks like its Google Sheet tab —
- **Totals in row 1, above their columns** (navy with gold, as in the Sheet): A total rows · B supplier names · C POS
  suppliers · D barcodes · E brands · J total WS · K total RRP · P the STATUS counts (matched · new · not used ·
  unmatchable). With a search or the SUP BRAND filter on they are for the rows shown (lighter gold, hover says so). The
  separate strip above the sheet is gone.
- **Headings navy with gold text.** Untick Update in POS and that heading's text turns grey — the navy stays; tick it and
  it is gold again. The column's cells stay light grey and the column stays on the sheet.
- **Prices show 2 decimals** (J SUP WS EXGST, K SUP RRP INC GST, N SUP DISCOUNT PRICE: 87.00, 37.50). Display only —
  the cell, the copy (Ctrl+C) and the merge keep the value as it is.
- **The latest message is one line in the title band** ("✓ Pasted at B3: …"), next to the title — no green box between
  the toolbar and the sheet. A long one wraps to a second line; the full text is on hover.
- **Toolbar**: every button 32 px, Paste blue and the rest white, the same as OUT_MERGED_DATA; the Update in POS box is
  white.
- **Rows pasted or typed here are not amber.** The gold edge on INDEX marks them. Amber now means a value changed after it
  arrived: on a row from a file any change, on a row added here a value you change (not the first time a cell is filled).

OUT_MERGED_DATA —
- **The Update in POS tick is under every heading POS can keep** (units, min order qty, the WSP / last price columns, NEW
  RRP, the markups, FINAL SHELF RRP, price levels 1–9, ret price, GST, brand, Sub ID, description, supplier). It is the
  same setting as the supplier sheet's ticks (the ticks of one group move together) and OUT recalculates straight away.
  Unticked = the heading's text turns grey and matched products show POS's value in grey, as before. No KEPT label.
- The coloured tiles show only with **Review columns**; the Sheet view has the same totals in row 1 above the columns.
- Toolbar buttons and boxes 32 px.

Run bar: a long message (e.g. "A newer POS Database … was saved to the Library …") wraps onto two lines instead of being
cut off; the full text is on hover.

v1.7.2: supplier sheet clean-up —
- One navy strip: the title (ⓘ = how the sheet works), the STATUS summary and the totals, with the row count on the right.
  One cream line: the brands in the merge on one line (+N more) and the Library buttons. The toolbar holds search, the edit
  buttons, **Update in POS** (what POS keeps · Update everything; the full explanation on hover) and **Discontinue
  missing products**.
- Headings in two rows like the other tabs: the grey letters row (SUP BRAND filter in E), then each heading centred on up
  to two lines with its Update in POS tick on one line under it (the tick's hover says what it does). Empty columns take
  three lines only when the window is short of room. Same font and lines as the sheet grid.
- The sheet fills the window under the run bar (at 1880 × 1000: 30 rows instead of 19; the first row 253 px under the run
  bar instead of 445). Room left over goes to SUP PRODUCT (and a little to STATUS / names), not to every column.
- Pasted rows keep the gold edge on INDEX ("Added on this page" on hover) — no + badge on every row.

v1.7.1: the supplier sheet and a run bar —
- Every column is as wide as what it holds: the page measures the headings and the rows on show (INDEX with its + tag,
  every price, barcode and ID in full) and shares the room left; empty columns stay narrow. On a narrow window the text
  steps down a size, then SUP PRODUCT, POS SUPPLIER NAME, SUP BRAND and STATUS give way (in that order) before any number.
  A stray long value (CH2's "Log in to ParagonCare Direct to view pricing") ends in … with the full text on hover.
- The headings line up: column letters on one line, every heading centred in one band, the Update in POS ticks on one line.
- **Run bar** right above the workbook, kept at the top of the window while you scroll: **1 Highlight + Best Buy**,
  **2 Build OUT_MERGED_DATA**, **3 Insert + Update & Export** — the same runs as the stage cards (earlier stages run first
  when needed), each with its state, and the run status on the right. It shows on every workbook tab.

v1.7.0: the full sets —
- The Library now keeps the full sets from Build POS Master Databases v21.14.0: `clean_merged_pos_data` (POS Database),
  `clean_ch2_data` (CH2 full set) and `clean_uhp_data` (Unique full set).
- **+ Add CH2 full set / + Add Unique full set** turns the full file into the supplier rows A–P with the Build's own rules
  (`../database-build/js/supplier-layout.js`): exactly the rows of its `_pos_db` file, so the merge is the same. A full
  `clean_ch2_data` / `clean_uhp_data` dropped here works the same way ("supplier rows made from the full CH2 set" on its
  row). `_pos_db` files, the Google Sheet tab and the copies already in the Library load as before.
- The POS Database's POS MAIN ID is its 13-digit POS MASTER BARCODE when the file has both (the full POS set also has the
  raw POS_MAIN_ID) — what the merge has always used.
- The supplier sheet fits the page: no sideways scroll at any window width. Each column gets what its content needs (the
  13-digit barcode, prices, Sub IDs, the words of its heading), the room left goes mostly to SUP PRODUCT, headings wrap
  onto two lines and on a narrow window the text steps down a size. A cell cut short ends in … and shows its full text on
  hover.

v1.6.2: safety fixes —
- Files can't be added, replaced or removed while a stage runs or your last session is loading (the page says to wait);
  results made from files that changed during a run are not kept.
- A TAB inside a cell becomes a space before the merge, so it can't shift the columns of the POS TXT files.
- Number formats are never dropped any more (after very heavy editing, dropping them changed price levels in the TXT).
- If the browser refuses to save the session (storage full) the page says so instead of hanging on "Leave site?".
- Clear session files / removing Supplier Updates also clears the SUP BRAND filter.
- Price levels kept by an unticked SUP RRP INC GST are now POS's exact values (90.08, not 90): rebuild the POS Database in
  Build POS Master Databases v21.12.0 once.

v1.6.1: what POS keeps is what OUT_MERGED_DATA shows — with a column unticked, matched products show POS's current values
there (RRP, price levels 1–9, ret price, FINAL SHELF RRP, …), on the page and in the review workbook, in the Sheet's
"no change" grey; those cells cannot be edited. The POS UPDATE file was already right and is unchanged — see below.

v1.6.0: the session is kept in this browser; filters decide what each stage processes; **Update in POS** ticks keep POS's
own values (e.g. RRP and price levels) for matched products, and discontinuing can be turned off — see below.

v1.5.1: renamed; with a password set the page opens behind a **Still under development** prompt (below) and the hub tile
says In development. Ongoing Discounts is one shared file with Build POS Master Databases and Reconcile CH2 Order.

Import, Update, Discontinue and Clean Products and/or Supplier information against current POS Database.
The POS DB & SUPPLIER MERGE Google Sheet, run in the browser. It uses the **same script files** as the
Google Sheet (engine v6.3.89), so the matching, discontinued products, ZZZZ / DISC / SPEC ORD Sub IDs, pricing, OUT_MERGED_DATA
and the POS INSERT / UPDATE TXT files are the same. Nothing is uploaded: files stay in this browser.

## Your session is kept (v1.6.0)

Everything on the page stays in this browser until you clear it: the POS Database and Supplier Updates (with your sheet
edits and the SUP BRAND filter), the three stages' results, your edits on OUT_MERGED_DATA / OUT_POS_INSERT / OUT_POS_UPDATE,
the TXT files and review workbook, and the Update in POS / Discontinue options. Close the page and open it again (even the
next day) and it is all back, ready for Run stage 3 again or Export TXT again.

- **Clear results** removes the results (the input files stay); **Clear session files** removes the POS Database and
  supplier rows too; running a stage replaces the results.
- The results come back only when the inputs are the same as when they were saved. If a reference table changed in the
  meantime (e.g. a new Ongoing Discounts saved in the Library), the inputs come back and the page asks you to run again.
- The session keeps the POS Database it used. When the Library has a newer one, the page says so — remove the POS
  Database (✕) and reload the page to use the newer one.
- Saved in this tool's IndexedDB store (`phf-pos-supplier-merge`, records `__session_inputs`, `__session_pos`,
  `__session_state`); the engine's sheets are saved with it (engine-host `dump` / `restore`).

## Filters decide what is processed (v1.6.0)

- **Supplier Updates:** the filter button on **SUP BRAND** (column E) picks the brands to merge. Stages 1 and 2 then use
  only the supplier rows of those brands — the merge matches, updates and discontinues only them, exactly as though the
  other rows were not uploaded (the Google Sheet's BUILD OUT_MERGED_DATA — FILTERED BRANDS). Brands are compared in
  capitals (BioCeuticals = BIOCEUTICALS). The search box only finds rows; it does not change the merge. When a brand is
  in the supplier rows under two names (e.g. BLACKMORES PROF and BLACKMORES PROFESSIONAL), tick both — otherwise the POS
  products matched by the other name can come out as discontinued.
- **OUT_MERGED_DATA:** when a column filter, the search or the status / price / brand selects hide rows, stage 3 makes
  OUT_POS_INSERT / UPDATE from the rows shown only (the Sheet's GENERATE INSERT + UPDATE — FROM FILTERED DATA).
- **OUT_POS_INSERT / OUT_POS_UPDATE:** when that tab is filtered, Export TXT again puts only its rows shown in that TXT.
- Column filters now work like the Google Sheet's: tick the values to show (several at once), OK applies.
- Each stage card says when a filter is on and how many rows / brands the next run covers.

## Update in POS ticks and Discontinue (v1.6.0)

Each supplier column that feeds the POS UPDATE file has an **Update in POS** tick under its heading:

| Untick | POS keeps (matched products) |
|---|---|
| POS SUPPLIER NUMBER | supplier |
| SUP BRAND | brand |
| SUP SUB ID | Sub ID |
| SUP PRODUCT | descr and pos desc |
| SUP UNITS IN PACK | units |
| SUP MIN ORDER WS | min order qty (box lot) |
| SUP WS EXGST | wsp excgst and last price |
| SUP RRP INC GST | rrp incgst, pr 1–9 pc and ret price — exactly as in POS, nothing recalculated or rounded |
| SUP GST | gst tax pc |
| SUP STOCK IN (v1.11.0) | no stock goes to POS (ticked: a number = a new product's pos soh) |
| SUP DISCOUNT PRICE (v1.11.0) | the discount price is not used (the stages run again) |
| POS MEMBER (v1.11.0) | pr 1–5 pc |

- The merge still uses every column for matching; the ticks decide what goes to POS. They act when stage 3 builds the
  POS files, so after changing one, **Run stage 3 again** (stages 1–2 do not need to run again).
- With any column unticked, a matched product that ends up the same as POS is left out of the POS UPDATE file — so a Sub
  ID / box-lot run touches only the products whose Sub ID or box lot changed, and keeping RRP means no new labels.
- New products (INSERT) always get the full supplier data. POS values come from TMP_MERGED_POS_DATA as they are; units,
  min order qty, RRP and price levels keep the merge's value only where POS has none (POS cannot take them blank).
- **Discontinue POS products of these brands that are not in the supplier rows** (ticked by default): untick it and the
  discontinued (ZZZZ) rows are left out of the POS UPDATE file. They still show in OUT_MERGED_DATA.
- OUT_MERGED_DATA shows POS's current values in the kept columns of matched products (v1.6.1), so what you see is what
  POS gets: on the page, in its row-1 totals and in the review workbook. Tick the heading again and the merge's values
  come back (the merge's own sheet is not changed). What each untick shows:
  - SUP RRP INC GST: NEW RRP, rrp incgst, pr 1–9 pc and ret price = POS's; FINAL SHELF RRP worked out from POS's RRP with
    the Sheet's formula. WSP TO RRP MARKUP % / +6.5% and RRP / MARKUP OVERRIDE stay as the merge worked them out (they
    are the supplier's figures and are not used for matched products).
  - SUP WS EXGST: NEW WSP EXGST / NEW LAST PRICE and wsp excgst / last price = POS's, WSP CHANGE and CHANGE LAST PRICE 0.
  - SUP BRAND: POS BRAND and brand = POS's, OLD BRAND empty. SUP PRODUCT: POS DESCR, descr and pos desc = POS's. The other
    ticks: their final-block column (sub id, units, min order qty, gst tax pc, supplier) = POS's.
- Kept cells of matched products are in the Sheet's "no change" grey text (#9E9E9E) on the row colours, and cannot be
  edited (clicking one says why); their headings have grey text (v1.10.0; KEPT up to v1.7.2, ticks in v1.8.0 – v1.9.0). The unticked supplier columns are in the same grey.
  OUT_POS_UPDATE marks the kept columns. Stage 3 says how many products kept POS values and how many were left out.
- The ticks are this tool's own (the Google Sheet does not have them); the script files are unchanged — engine-host
  v1.2.0 applies them around `m13BuildPosOutputRowsFromOut_`.

## Inputs (left rail)

| Rail row | Google Sheet tab | Where it comes from | Kept |
|---|---|---|---|
| POS Database (required) | TMP_MERGED_POS_DATA | Build POS Master Databases → full POS set `clean_merged_pos_data_….xlsx` (the Library copy) | Kept with the session (v1.6.0) |
| Supplier Updates (required, several files allowed) | IN_SUPPLIER_/_PRODUCT_UPDATES | Build POS Master Databases → full set `clean_ch2_data_….xlsx` / `clean_uhp_data_….xlsx` (made into the supplier rows here, v1.7.0) or the `_pos_db` file in the A–P layout | Kept with the session (v1.6.0) |
| Brand Name Changes (required, v1.9.0) | SRC_POS_BRAND_NAME_CHANGES | Google Sheet tab | Saved in this browser |
| Product Prefixes (required, v1.9.0) | SRC_POS_PRODUCT_PREFIX | Google Sheet tab | Saved in this browser |
| POS Suppliers (required, v1.9.0) | SRC_POS_SUPPLIERS | Google Sheet tab | Saved in this browser |
| Ongoing Discounts (required, v1.9.0) | SRC_POS_ONGOING_DISCOUNTS | One shared file with Build POS Master Databases and Reconcile CH2 Order — drop it in any of them | Saved in this browser (Library) |
| Find & Replace (optional) | SRC_POS_FIND_REPLACE | Google Sheet tab | Saved in this browser |

Files are recognised from their headings (the heading row can be row 1 or row 2). A downloaded copy of the
Google Sheet (File → Download → Microsoft Excel) can be dropped as one file: every recognised tab fills its
input. Columns are matched by heading, `POS_MASTER_BARCODE` fills POS MAIN ID, and INDEX is renumbered
1, 2, 3… the same way the Sheet's paste tidy does. STATUS columns are cleared because the merge writes them.

## Editing the sheets (v1.5.0)

Every workbook tab except TMP_MERGED_POS_DATA can be edited like the Google Sheet: click a cell and type (or Enter / F2 /
double-click to change it), Ctrl+V (⌘V) pastes from the selected cell, Delete clears, Ctrl+C copies, click row numbers to
select rows, **Add row** / **Delete rows** / **Undo** (Ctrl+Z). A small orange corner marks a cell changed on this page.
Columns the merge works out itself (INDEX, SRC STATUS / POS MATCH, FINAL SHELF RRP, rrp incgst) stay read-only.

| Tab | What an edit does | Then |
|---|---|---|
| SRC_POS_FIND_REPLACE · ONGOING_DISCOUNTS · BRAND_NAME_CHANGES · PRODUCT_PREFIX · SUPPLIERS | Changes the reference table, **saved in this browser straight away** (rows typed under the last row are added; an empty tab can be started by typing or pasting). POS DISCOUNT% takes 7.5, 7.5% or 0.075 as 7.50%, like the Sheet. | The stages reset — **Run all stages** (button on the tab) uses the change. The Library copy of Ongoing Discounts (shared with Build POS Master Databases) is not changed. |
| OUT_MERGED_DATA | Goes into the engine's copy of the Sheet and runs the script's own **onEdit**: ROW STATUS → NEW writes the fake barcode (K / AP) when there is no real one, UPDATED SUPPLIER (G) shows SUP OVERRIDE PENDING and is queued, RRP / MARKUP OVERRIDE (AN) makes FINAL SHELF RRP / rrp incgst work out again, row-1 totals follow. | **Refresh supplier changes** (= REFRESH SUPPLIER CHANGES) checks G edits against the supplier upload; **Run stage 3 again** makes OUT_POS_INSERT / UPDATE and the TXT files from the edited sheet (it refreshes waiting supplier changes first). |
| OUT_POS_INSERT · OUT_POS_UPDATE | Changes the rows, adds or deletes rows. | **Export TXT again** writes the two TXT files from these sheets as they are (stage 3 again would make them again from OUT_MERGED_DATA). |
| IN_SUPPLIER_/_PRODUCT_UPDATES | As before (below). | Run the stages again. |

Edits on OUT_MERGED_DATA / OUT_POS_* are for this session; running stage 2 again builds OUT_MERGED_DATA afresh. The TXT
downloads say when they were made before your edits.

## The Google Sheet look (v1.5.0)

The tabs look like the POS DB & SUPPLIER MERGE Sheet (js/sheet-look.js, taken from 1.0 Setup): column letters, the navy
**row-1 totals band** with gold text (the SCHEMA totals formulas — CURRENT WSP, NEW WSP, CURRENT / NEW LAST PRICE, CURRENT /
NEW RRP, OVERRIDES, FINAL SHELF RRP, BRAND CHANGES … — SUBTOTAL totals count the rows a filter shows, SUM / COUNTIF totals
count every row, as in the Sheet), the light blue-grey row-2 headings with a **filter button** on each (show only one
value), the frozen-row line, F5F5F5 / E9F0F5 bands and the OUT_MERGED_DATA conditional colours: price increases red on pink,
decreases blue, no change grey, the higher RRP green, ☑ green / ☒ red / ☐ grey checks, FINAL SHELF RRP on two lines (red
up / blue down / grey same), NEW markup under 35% GP orange, OLD BRAND / BARCODE UPDATE / RRP OVERRIDE amber, supplier
overrides orange. Columns the Sheet centres are centred. The review workbook (.xlsx) uses the same colours and totals.

## Password lock (v1.5.0, prompt v1.5.1)

**Set password** (top right) makes `phf-lock-config.js`; put it in `assets/js/` and commit — from then on the tool opens
behind a **Still under development** message with a password box, once per browser (Lock asks again), and its Staff Hub
tile says In development. The Lock / Password buttons show only once the tool is open. The file holds a salted
PBKDF2-SHA-256 hash, never the password. Password / Remove the password makes a new file the same way. This is a
static GitHub Pages site, so the lock keeps staff out but is not real security (someone who can read the page code can get
round it); for that, put the site behind a sign-in such as Cloudflare Access.

## Workbook tabs (v1.4.0)

Under the stages the page shows the workbook the way the Google Sheet does, with its tabs along the bottom (they stay at
the bottom of the window while the workbook is on screen), in the Sheet's order and colours:

| Tab | Colour | What it shows |
|---|---|---|
| IN_SUPPLIER_/_PRODUCT_UPDATES | red | The editable supplier sheet (below). Every row, no pages. |
| OUT_MERGED_DATA | green | After stage 2: KPIs, search, status / price / brand filters, and **Sheet (all columns, editable)** (v1.5.0 default) or **Review columns**. Long NOTES show 4 lines in the review columns; click a note to open the rest. |
| OUT_POS_INSERT · OUT_POS_UPDATE | orange | After stage 3: the rows written to the two TXT files. |
| SRC_POS_FIND_REPLACE · SRC_POS_ONGOING_DISCOUNTS · SRC_POS_BRAND_NAME_CHANGES · SRC_POS_PRODUCT_PREFIX · SRC_POS_SUPPLIERS | blue | The reference tables as loaded, or with SRC STATUS filled in once stage 2 has run. |
| TMP_MERGED_POS_DATA | — | The POS Database. |

v1.5.0: every tab but TMP_MERGED_POS_DATA is editable (above). Each has its own search box. Only the rows near
the scroll position are drawn (js/sheet-grid.js), so a 34,000-row POS Database scrolls as quickly as a short list.
Stage 2 opens OUT_MERGED_DATA, as the Sheet's menu does.

## Brands in this merge (v1.3.1)

A merge only covers the brands in **Supplier Updates**: stage 2 matches, updates and discontinues (ZZZZ) the POS
products of those brands and returns them in full, and leaves every other POS brand out. Supplier Updates therefore
**starts empty** — paste or drop the supplier list / catalogue of the brand or distributor you are updating. The line
above the sheet shows **Brands in this merge: N** with the rows per brand, so the scope can be checked
before running.

The CH2 and Unique full sets saved by Build POS Master Databases are **never loaded on their own**. To merge a
whole catalogue, press **+ Add CH2 full set** or **+ Add Unique full set** (on the sheet, or on the Supplier Updates
card) — the full file becomes the supplier rows A–P (v1.7.0). ✕ / Remove takes it out again.

## Staff Hub Library (v1.3.0)

When the page opens, files saved in this browser's Staff Hub Library (see the home page) fill empty inputs:
the **POS Database** from the last Build POS Master Databases build and the shared **Ongoing Discounts** file
(v1.3.0 also loaded the CH2 / Unique supplier files; from v1.3.1 they are added with their buttons; from v1.7.0 they are the full sets). Each shows "From the Library · built …"; a build over a day old turns the row amber
(CHECK DATE). A file dropped on the page always wins. ✕ / Remove on a Library file stops it loading here again until
a newer build is saved; Ongoing Discounts is one shared file, so removing it here deletes the saved copy. An Ongoing
Discounts file dropped here is saved to the Library for Build POS Master Databases too.

## Supplier Updates sheet (v1.2.0 — editable; v1.4.0 — every row, no pages)

The IN_SUPPLIER_/_PRODUCT_UPDATES tab is the first workbook tab, full width under the stages. Every row is in one
scrolling sheet with the headings fixed at the top (v1.4.0 — no pages; only the rows near the scroll position are drawn,
so a long list stays quick). It works like a small Google Sheet:

- **Totals** (Sheet row 1, v1.8.0 above their columns): A TOTAL (hover: ⭐ matched · 🟢 new · 🚫 not used · ⚠️
  unmatchable), B SUPPLIER NAMES, C TOTAL POS SUPPLIERS, D UNIQUE BARCODES (older copies of the Sheet label this cell UNIQUE
  BRANDS), E UNIQUE BRANDS, J TOTAL WS, K TOTAL RRP and P the STATUS counts (hover: the stage-1 summary). Like the Sheet's
  SUBTOTAL formulas, the totals count only the rows the search / SUP BRAND filter shows.
- **Edit**: click a cell and type (or double-click / Enter / F2 to change it). Enter, Tab and the arrow keys move;
  Shift + click or drag selects a range; Delete clears it; Ctrl+C copies it. Changed cells turn amber (v1.8.0: on rows
  pasted or typed here, only a value changed after it arrived).
- **Paste**: click a cell and press Ctrl+V (⌘V) — the copied block fills from that cell, adding rows past the last one
  (click B in the empty row under the last row to add rows). A block with the heading row is matched by heading.
  Nothing selected: columns are read by position (16 = A–P, 14 = B–O, 15 = B–P) and checked against the data.
- **Rows**: Add row; click INDEX numbers (Shift + click for several) and Delete rows; Undo (Ctrl+Z) steps back one change.
  Typed or pasted rows are kept as an "Added rows" supplier entry (gold edge on INDEX); Clear added rows removes them.
- INDEX is numbered automatically and STATUS is written by the merge, so A and P are read-only.
- Every change updates the supplier input for this session and resets the stages, so the next run uses it.

## Removing inputs

Each loaded input in the rail has its own ✕: it removes that input straight away (a saved reference table is deleted
from this browser). Clear session files removes the POS Database and every supplier row (including sheet edits);
Clear saved reference removes every saved reference table. Drop-list rows that only filled removed inputs go too.

## Stages

1. **Highlight New Products + Best Buy** — `runHighlightNewProductsBestBuy`
2. **Build OUT_MERGED_DATA** — `buildOutMergedDataFromSupplierStatus`
3. **Generate Insert + Update & Export** — `generateInsertUpdateSheets` + `exportPosFiles`

Running a later stage runs the earlier ones first when needed. Changing any input clears the results and
restarts the engine, so every run starts from a clean workbook.

## Outputs

- `POS INSERT yyyy-MM-dd BRANDS.txt` and `POS UPDATE yyyy-MM-dd BRANDS.txt` — what EXPORT POS FILES makes, from the
  rows whose Upload tick is on (v1.13.0: held rows start unticked).
- `POS SUPPLIER MERGE yyyy-MM-dd BRANDS.xlsx` — review workbook: OUT_MERGED_DATA, OUT_POS_INSERT,
  OUT_POS_UPDATE, OUT_UPLOAD_CHECKS (v1.13.0), the supplier STATUS and the reference tabs, with the Sheet's banding and
  status colours.
- The OUT_MERGED_DATA review table on the page (search, row / price status and brand filters).

## How it runs

```
index.html ── js/app.js (rail, drag and drop, stages, outputs, review)
   │            js/merge-map.js (input definitions, recognition, column mapping)
   │            js/xlsx-writer.js (review workbook)
   │            js/sheet-grid.js (workbook tabs: every row, drawn around the scroll position; editable — v1.1.0)
   │            js/sheet-look.js (the Google Sheet's totals band, colours and centred columns — v1.0.0)
   │            ../../assets/js/phf-lock.js + phf-lock-config.js (optional password lock — v1.0.0)
   └─ Web Worker js/engine-worker.js
        ├─ js/sheets-formula.js + js/sheets-shim.js (in-memory stand-in for Google Sheets)
        ├─ engine/1.0-setup.js … engine/1.3-merge.js (the Apps Script files, unchanged)
        └─ js/engine-host.js (messages between the page and the engine; v1.1.0 sheet edits → the script's onEdit, undo)
```

When the page is opened straight from a file (no web server) browsers block Web Workers, so the same
engine runs in a hidden frame (`engine-frame.html`) instead. Results are the same.

**Same results as the Google Sheet.** On the 11 Oct 2026 Google Sheet run (371 supplier rows — Bioceuticals,
Bioceuticals Clinical, Blackmores Professional from Bioceuticals and Oborne / CH2 — against 34,280 POS rows and the Sheet's
SRC tabs) the page gives the same supplier STATUS, OUT_MERGED_DATA (347 rows, every column), OUT_POS_INSERT (6) and
OUT_POS_UPDATE (327). sheets-formula / sheets-shim v1.0.1: `TO_TEXT(cell)` reads the cell as displayed (e.g. `$15.02`),
as Google Sheets does, so FINAL SHELF RRP's GP NGST line matches to the cent.

**Merge v6.3.89 (1.3 Merge only — the other three files are unchanged).** Two additions, on the same 11 Oct run:
- **Shortened brand names (BE1).** A SUP BRAND cut to the 20-character POS brand field, or with its last word cut
  (BLACKMORES PROF = BLACKMORES PROFESSIONAL), takes the one listed full brand (SRC_POS_BRAND_NAME_CHANGES / Ongoing
  Discounts brands). The 25 Blackmores Professional rows keep their brand, get its 22.5% discount (last price $7.30, not
  $9.42) and the BM PROF prefix, and no longer show OLD BRAND / BRAND CHANGED / BRAND ☒. A matched POS
  brand that is the same brand shortened keeps its POS name. A real rename (BLACKMORES → BLACKMORES PROFESSIONAL) still
  shows. POS brand translation is unchanged.
- **POS size and form for a bare count (SZ1).** SUP PRODUCT "BIOCEUTICALS CLINICAL METHYL BIOACTIVE (60)" + ORIGINAL POS
  DESCR "BIOC CLIN METHYL BIOACTIVE 60T" → SIZE 60T, TYPE TABLETS, POS DESCR "BIOC CLIN METHYL BIOACTIVE 60T" (was
  "BIOC CLIN METHYL 60", SIZE 60, TYPE blank). Only when the counts are the same and the supplier gives no other form;
  a word the marketing purge removed (BIOACTIVE, EVERYDAY…) comes back only when the POS description has it too.
  135 Bioceuticals rows on that run; nothing else in OUT_MERGED_DATA, OUT_POS_INSERT or OUT_POS_UPDATE changed.

## Updating the engine

When the Google Sheet script changes, copy the four files from Apps Script into `engine/` with these names
(contents unchanged): `1.0-setup.js`, `1.1-format-clear-popup.js`, `1.2-highlight-new-products-best-buy.js`,
`1.3-merge.js`. Then bump the `?v=` numbers in `js/engine-worker.js` and `engine-frame.html` so browsers fetch
the new files. If the SCHEMA headings of an input tab change, update the matching entry in `js/merge-map.js`.

## Not in this version

The Filtered Brands build (BUILD OUT_MERGED_DATA — FILTERED BRANDS) and GENERATE FROM FILTERED DATA. A merge here covers
the brands in Supplier Updates, which does the same job. (Sheet editing with Refresh Supplier Changes and RRP / markup
overrides arrived in v1.5.0.)
