# Update Specials — working notes (current: v49)

Working notes agreed with Kenneth before code changes. Measurements are from the 2000×1250 POS export
(POS screen → 4-Up grid, page with Advance / Diasporal / Basica / Ultra Muscleze, Text fit = Impact).

## 1. Remove card borders from all templates
- Clean cards: remove the 1.5px border and the soft drop shadow.
- Consequence: spacing alone now groups each product with its own text.
  Rule to keep: **gap between products ≥ 2× the gap between a pack shot and its own text.**
  In the borderless mock, wide packs (Diasporal) end up about as close to the neighbouring card's text as
  to their own, so the gutter between cards needs to grow (e.g. 14px → ~28px on the 1000px canvas).
- Open: remove the thin dividers on classic 6-Grid too? Keep the white card panels (no edge line or glow) on
  the Charcoal canvas?

## 2. BioCeuticals card — "almost perfect, slightly unbalanced"
What's right (keep):
- Pack height 477px vs text height 471px (brand top → WAS bottom): matched.
- Pack centred vertically in the card: 39px above, 39px below.

What unbalances it:
- a. **SAVE circle crowds the brand line.** Its right edge is flush with the pack's right edge, 47px from
  "BioCeuticals" and at the same height. The heaviest colour sits right next to the heaviest type.
- b. **Loose text column.** Two empty bands: 59px after the one-line product name (the reserved second
  name line) and 57px above NOW (matching CoQ10's two-line heading). The text reads as three floating
  pieces beside a solid pack, so the card leans left.
- c. **Inner gap (47px) is narrower than the outer margin (55px).**

Proposed fixes (mocked):
- a. SAVE circle **option C**: stays top-right on the lid, 88% size, pulled inside the pack edge so it is
  clearly clear of the text. Rejected: A (outer shoulder, covers the BioCeuticals logo), B (lower inner
  shoulder, covers "Ultra Muscleze"), D (outer top corner: hangs into the neighbouring card once borders go).
- b. Name block reserves only as many lines as the longest name on that slide needs (all one-line → 1 line).
  Spare space then sits in one place, above the pill: product info as one group at the top, offer as one
  group at the bottom. Side effect in Impact mode: the freed room brings Benefits back on all four cards
  with prices unchanged.
- c. Inner gap = outer margin (~24px on the 1000px canvas).

## 3. Zone layout for clean cards (Kenneth's idea)
Replace "text flows, then gets levelled" with **fixed zones per layout**: each field gets its own box at a
fixed share of the text-block height, and the content adapts to the box — never the other way round.
- Every card on a slide uses the same zone map, so brand, name, pill, price, rule and WAS line up by
  construction (no after-the-fact levelling, no stepped brands, no loose gaps).
- The image zone is the same height as the text block, so the pack shot always matches.
- Each zone has its own rules: max lines, largest and smallest font size, then what happens if it still
  doesn't fit.
- Font size per zone is the same on every card of the slide (as prices already are), so one long brand name
  shrinks every brand name on that slide a little rather than just its own.
- The price is never cut: its zone's font is the largest size that fits the widest price.
- A zone blank on every card of the slide collapses and gives its space to Ingredients / Benefits. A zone
  blank on only some cards stays as empty space, so rows still line up.
- One zone table per layout in one place in the code, so a tweak is one number.
- Editor toggle "Show zones" draws the boxes over the preview, for tuning and for staff to see why text
  was shortened.
- Starting map for 4-Up (share of text-block height), from the BioCeuticals card that already looks right:
  Brand 8% · Product + size 14% · Form 5% · Feature heading 10% · Ingredients/Benefits 17% · gap 4% ·
  Pill 8% · Price 20% · Rule 2% · WAS 7% · bottom 5%. (Diagram: zone_map.png)
- Scope: clean-card layouts only. Classic white layouts stay as they are. Pilot on POS 4-Up grid first,
  then roll out layout by layout.
- This replaces most of the v41–v45 levelling code for clean cards. Text fit Impact / All info becomes the
  rule set for the Ingredients / Benefits zone.

## Decisions
- Start basic: zone engine on **POS Hero, POS 4-Up grid, POS 4 Across** only (v46). Other layouts follow by
  canvas size / orientation once these are right.
- Card borders off on every clean-card layout (v46). Charcoal canvas keeps its white panels (unchanged).
- SAVE circle: option C, on the pack's top-right corner; beside the shoulder on narrow bottles; at most 42% of
  the pack's width (v46).
- Gutter between cards: 4-Up grid 22px, 4 Across 18px (v46). Other layouts keep theirs until they move to zones.
- Tick boxes in Card text are how the layout is simplified: unticked or empty zones collapse, the rest grow.
- v47: **ticked = always shown** on zone cards. Impact never leaves a ticked column off; it sets the extra
  information smaller and shortens long ingredients / benefits with "…". Prices get smaller if still needed;
  untick for larger prices. (Fixes: Benefits shown on 4-Up page 1 but missing on page 2.)
- v47: new POS **3 Across**: brand, product + size and form above the pack shot; everything else below.
  Pack shot at least 42% of the card.
- v47: Email clean cards on zones: Hero + 2 (also POS), 2-Up 7:5 (pack above text, at least 52% of the card),
  4-Up 7:5, 6-Up.

- v48: Kenneth won't use Product form, but likes its small green letter-spaced look. The **green accent**
  option: Feature heading (default: heading set like the form line, form turns grey) or Ingredients & Benefits
  labels (heading grey like the product name). Either way the heading no longer competes with the brand.
- v48: **pack-above cards centred** by default (Centre / Top centred / Left option).
- v48: **Portrait TV** Hero, 2, 3 and 4 Rows on zones, with every tick box.

- v49: **Soft cards** from Kenneth's design spec (mock images + written rules): warm off-white cards
  (#F5F4F0, 14px corners) on white; brand #62686E on its own row; product + size #4F5861 together; feature
  heading in sentence case, charcoal; price #19212B strongest. Thin green line under the product name and
  under the price, each fitted to the text actually drawn. WAS smaller and grey, strike on the amount only.
  Two-price offers split at " / " into rows. White photo backgrounds toned to the card colour (baked into
  pixels, because the PNG export can't do blend modes). **Clean white** keeps v48 exactly.
  For the agreed look, untick Product form, Key ingredients, Key benefits.

## Zone layouts (v49)
POS: Hero · Hero + 2 · 4-Up grid · 3 Across · 4 Across. Email: Hero + 2 · 2-Up 7:5 · 4-Up 7:5 · 6-Up.
Portrait TV: Hero · 2 Rows · 3 Rows · 4 Rows.
Not yet: POS 2-Up · Social (Hero 4:5, Hero Square, 4-Up Square) · Web banner.
These still use the v45 fitting, where Impact can leave extra information off.

## Open (for Kenneth, after reviewing v49)
- Soft cards: "Box 12" is shown as typed in the sheet (the spec example says "Box of 12"); change the wording
  in the sheet or the Promo Display Override if wanted.
- Feature headings are sentence-cased on Soft cards; proper nouns typed in Title Case (e.g. a place name)
  become lower case unless they're in capitals or quotes. Edit the heading if one reads wrong.
- Soft cards on the Charcoal canvas keep the white panels (no off-white, no photo toning).

- Classic white Email layouts (Hero + pick, 2×2 Feature, Grid Cards, 6-Grid, 6-Grid Split, Specials banner)
  only follow Brand / Product / Size / Now price / Discount tick boxes; they never show form, heading,
  ingredients or benefits. Each already has a zone-card counterpart under Email → Clean cards (Hero + 2,
  4-Up 7:5, 6-Up …). Options: leave as is, hide the classic ones from the Email tab, or convert them.
  (Earlier decision: classic white layouts stay untouched.)
- Classic 6-Grid thin dividers: keep or remove?
- Next layouts to bring onto zones (suggested order): POS 2-Up, then Portrait TV rows (a 4 Across / 4-Up card
  on a portrait canvas), then Social and Web banner.
