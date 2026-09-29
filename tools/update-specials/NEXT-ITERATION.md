# Update Specials — notes for the next iteration (after v45)

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

## Open (for Kenneth, after reviewing v46)
- 4 Across: Feature heading is limited to 2 lines, so long headings end with "…" in that narrow column.
  Allow 3 lines there, or keep it tight?
- Hero on Impact leaves Ingredients off to keep the price at ≥72% of its size. Right trade-off?
- Classic 6-Grid thin dividers: keep or remove?
- Next layouts to bring onto zones (suggested order): POS 2-Up, Hero + 2, then Portrait TV rows (a 4 Across /
  4-Up card on a portrait canvas), then Email / Social equivalents.
