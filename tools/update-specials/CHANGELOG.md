# Update Specials — changelog

**Version format:** `MAJOR.MINOR`
- **MAJOR** (e.g. 26): the exported artwork changes (new layouts, restyled slides).
- **MINOR** (e.g. 25.1 → 25.2): fixes or tooling only; exported slides look the same.

The running version is shown at the top right of the tool (e.g. `v25.1 · 28 Sep 2026`).
It is set in one place: `APP_VERSION` / `APP_DATE` at the top of the script in `index.html`.

## Release steps (one folder, one branch)
Everything lives on the **`main`** branch in **`tools/update-specials/`**. There are no copies
for old versions: GitHub's History keeps every version automatically.

Keep in this folder: `index.html`, `CHANGELOG.md`, and the product photo folders `images/` and
`Pictures/`. Nothing else is needed.

1. In GitHub Desktop, check that **Current branch** says **main**, then click **Fetch origin** / **Pull origin**.
2. Copy the new `index.html` and `CHANGELOG.md` into `tools/update-specials/`, replacing the old ones.
3. Type the summary (e.g. `v40 – fine-tune slider with auto-balance + tighter WAS line`), click **Commit to main**, then **Push origin**.
4. After 1–2 minutes, open the tool and press **Ctrl+Shift+R**. The top right shows the new version.
   Screens already open show *"Version x is now live… Refresh"* within about 20 minutes.
5. **Need an old version back?** On GitHub, open `tools/update-specials/index.html` → **History**,
   click the version you want → **⋯ → View file** → **Raw**, save it as `index.html`,
   and commit it the same way.

(The tool still supports a separate `-beta` folder for testing if you ever want one again.
It isn't needed day to day.)

---

## v44 — 29 Sep 2026
Refinements from the v43 design review. Classic layouts are unchanged apart from the 6-Grid fix.
- **Brand and product lines sit level across every row of cards** (4-Up grid, 4 Across, 6-Up, 4-Up 7:5,
  4-Up Square, Portrait TV rows, Web banner, Hero + 2 side cards). Pills, prices and green lines were already
  level; the brand line on a card with less text was pushed down to match them. The spare space now goes
  just above the pill, so the tops line up too.
- **Long deal wording fits its card.** `SINGLE $4.95 / BOX 12 $53.45` ran off the card and made every card on
  the slide use the smallest text size. It now shrinks, then wraps to two lines when that gives larger type,
  and the other cards' price rows grow to keep the green lines level.
- **Text keeps clear of the card edge.** Text now stays at least 3% of the card height (6px minimum) inside
  the top and bottom of its card, so the WAS line no longer sits on the border (Hero + 2 side cards).
- **Classic 6-Grid: pack shots no longer cover the brand and name.** The photo area was 166px tall inside a
  space squeezed to about 132px; it now fits its space.

## v43 — 29 Sep 2026
Card text tick boxes for every sheet column, and the sheet's separate Product and Size columns.
With every box ticked, all 25 layouts are pixel-identical to v42.1 except for the new Ingredients / Benefits gap.
- **Card text** now has one tick box per sheet column: **Brand · Product · Size · Product form · Now price ·
  Discount style · Discount value · Feature heading · Key ingredients · Key benefits**. Every layout,
  remembered on each device. Unticked values stay in each product's fields, marked **hidden**, so you can still edit them.
  - **Discount style** = the NOW / SPECIAL pill. A deal's own pill (BUY 2 FOR) belongs to the discount value.
  - **Discount value** = WAS price, SAVE line and red SAVE circle, deal wording, and Promo display
    (replaces v42.2's separate Promo display box).
  - **Now price** = the big price.
  - Untick Brand, or both Product and Size, and the name block closes up instead of leaving a gap.
  - Untick Now price and Discount value and the card becomes information only: no pill, price or green line.
  - Copy text and the email text follow the boxes too. The advertising record keeps every value.
- **Product and Size columns.** Sheets with `product` and `size` columns load directly: the name is built as
  `Product, Size`, so photo files and records still match. Older sheets with one `name` column still work,
  split at the first comma. In each product card, **Product name** is now **Product** and **Size**.
- **Sheet headers** match with spaces or underscores (`now price` = `now_price`, `image url` = `image_url`).
  An `image id` column (a Google Drive file ID) is used when `image url` is blank.
- **A little space between Ingredients and Benefits** on the clean cards. The two-tone label / text styling is unchanged.
- **Pack shots unchanged:** they still size to the card's text block, as in v42.
- Classic cards with nothing left to show under the name drop the pill, price and rule, as clean cards do.

## v42.2 — 29 Sep 2026
Card text tick boxes and new slide file names. With every box ticked, slides look the same as v42.1.
- **Card text** (new row under Card options, remembered on each device): tick which optional columns show
  on the slides, on every layout: **Product form · Feature heading · Ingredients · Benefits · Promo display**.
  - Unticked columns are left off the slides (an unticked Promo display is also left out of Copy text,
    the email text and the record), but stay in each product's fields, so you can still edit them. Those
    fields show "not shown · unticked in Card text".
  - Product form, Feature heading, Ingredients and Benefits show on clean cards. Promo display replaces
    the deal wording on every layout; untick it to use the sheet's normal deal wording.
- **Slide file names** are now `{number}-{layout}_{products}-{seconds}.png`, e.g.
  `003-phf_pos_4-up-grid_BioCeuticalsUltraCleanEPADHAPlus_LiposomalC_TheracurminTriple_UltraMusclezeNight-010.png`
  - **File names** row: **Start at** (default 3; 001 and 002 are kept for fixed slides) and **Seconds** on
    screen (default 10 → `-010`). Remembered on each device. The name of the slide on screen shows underneath.
  - Products in slide order. The brand is added only when it changes. A Short name wins over the product name.
  - A product that appears more than once in the specials gets its size added:
    `NutritionCarePolybac8_75g` / `NutritionCarePolybac8_30c`.
  - Punctuation is removed, so the only hyphens are the two separators and any inside the layout name:
    split on the first and last hyphen to read the number and seconds. Names are capped at 150 characters.
  - Download this slide and Download all use the same numbers.
  - The date, page number and end date are no longer in slide names. End dates are still in the
    `…_record.csv`, and the ZIP, email text and record keep their dated names.

## v42.1 — 29 Sep 2026
Optional product metadata support, with existing products and layouts unchanged when the new fields are blank.
- **New spreadsheet / feed columns:** `product_form`, `feature_heading`, `key_ingredients`, `key_benefits`, and `promo_display`.
  Common space-separated and shorthand fallbacks are also accepted (for example `product form`, `ingredients`, `benefits`, `promo`).
- **All ingestion routes updated:** published CSV, local CSV, Google Visualization, and the PHF Apps Script matrix feed map the five fields into each normalized product row.
- **Staff editor support:** the five metadata values can be reviewed or overridden directly in each product card in the left-hand workspace.
- **Clean-card callouts:** Product Form, Feature Heading, Ingredients, and Benefits render conditionally between the product title and the offer stack; cards with no metadata retain the v42 structure.
- **Promo display override:** `promo_display` takes priority for the displayed promotion/deal wording while leaving the underlying discount value intact for WAS / SAVE calculations.
- **Version:** `APP_VERSION` is now `42.1`; release date remains `2026-09-29`.

## v42 — 29 Sep 2026
Visual hierarchy, baseline synchronization, and layout cohesion overhaul across all product cards and templates (upgraded from v41).
- **Synchronized Row Baselines:** Enforced deterministic brand and product title heights (`min-height` / line-clamp locks) across multi-product grids (4-Up, 2×2 Feature, 6-Grid, etc.), eliminating staggered price pills and baseline stepping across rows.
- **Unified 4-Tier Offer Anatomy:** Standardized card structure into Offer Pill -> Display Anchor -> Fixed Dividing Rule -> Reference Line. Percentage deals (e.g. 30% OFF RRP) now feature display-scale typography with sub-labels, and separator rules no longer collapse or float on cards lacking reference pricing.
- **Decoupled SAVE Badge Anchoring:** Positioned circular savings stamps relative to the card container corners with dedicated image clearance, eliminating collisions with bottle caps, seals, and droppers.
- **Pack-Shot Optical Mass Balancing:** Refined aspect-ratio auto-scaling curves so narrow bottles and squat tubs maintain equivalent visual presence without dominating or under-filling cards.
- **Trailing Orphan Card Centering:** Partial final pages on 4-Up grids (e.g. a single product on Page 10) are now centered dynamically in the canvas rather than marooned in the top-left quadrant.
- **Data Normalization:** Ingest filters automatically correct supplier typos (e.g. Nutrition Care), deduplicate repeating brand names in product titles (Vital All-In-One), and format bulk tier mechanics clearly ("BUY 4+ FOR $60 EA").

## v41 — 29 Sep 2026
Cleaner sheet data, and pills, prices and green lines that sit level on every multi-product slide.
- **Brand typos are fixed as the sheet loads.** `Nutition Care` in any spelling or capitals shows as
  **Nutrition Care** (or **NUTRITION CARE** when typed in capitals). Stray punctuation and double spaces
  at the end of a brand are removed too: `Nutition Care,` → `Nutrition Care`.
  - Works for the published sheet, the Apps Script feed, a Google Sheet link, a local CSV backup and the
    last-good copy saved on each device.
  - Photos are still found: `images/Nutrition_Care_….png` is tried first, then the sheet's own spelling
    `images/Nutition_Care_….png`.
  - To fix another brand, add a line to `BRAND_FIXES` near the top of the script.
- **Product names no longer repeat the brand.** When a name starts with the brand, or with its last
  words, those words are left off the slide: `Tru Niagen` + `Tru Niagen 30 caps` → **30 caps**.
  - If only a size and pack format is left, the product wording from `NAME_DESCRIPTORS` goes in front:
    Vital All-In-One + `All-in-One, 1.1kg Bag` → **Daily Greens Powder, 1.1kg Bag**, and
    `All-in-One, 1kg Tub` → **Daily Greens Powder, 1kg Tub**.
  - When a name has to be shortened, the pack format stays with the size (`… 1.1kg Bag`, not `… 1.1kg`),
    so a bag and a tub of the same product never read the same.
  - Used in Copy text and the email text too. A Short name still wins, and the Short name box now shows
    the cleaned name as its hint. The sheet and the ZIP record keep the name exactly as typed.
- **Multi-buys priced per item read clearly.** `4 FOR $60 EACH` (also `BUY 4 FOR $60 EA`,
  `4 OR MORE FOR $60 EACH`) becomes **BUY 4+ FOR $60 EA**. On the cards: pill **BUY 4+ FOR**, then
  **$60.00** in the big price style with a small **EA**. Totals such as `BUY 2 FOR $145.00` are unchanged.
- **Title and pill rows lock level** on 4-Product, Grid Cards, 2×2 Feature and 6-Grid Split:
  - The brand is always one line. A long brand is made up to 20% smaller (its row keeps its height),
    then ends with "…".
  - The product name always takes two lines, so a one-line name no longer lifts its pill and price
    above the cards next to it.
  - A card without a WAS / RRP line keeps that line's space, so every card has the same text height and
    the pack shots on 2×2 Feature match.
- **Green line anchored on clean cards** (4-Up grid, 4 Across, 6-Up, Portrait TV rows and the rest):
  - The name block is a fixed height and every card keeps room for one WAS / RRP line.
  - On a deal card the green line now sits at the same height as on a price card (it was slightly lower).
  - A final check lines up the pill and the green line across each row of cards, whatever each card
    shows underneath.
- **SAVE circle clear of caps and droppers.** On tall bottles and dropper bottles (the top of the
  product narrower than its body, e.g. BioCeuticals Liposomal D3, Bragg Apple Cider Vinegar) the circle
  moves to a top corner of the card's photo area, inset a little, right corner first. Where the photo
  area is so narrow that a corner would still touch the cap, it sits just below the cap instead.
  Boxes, tubs and bags keep the circle on the product's shoulder as before.
- **Last page centred on 4-up grids.** A last page with 1, 2 or 3 products is centred on the slide at
  the normal card size instead of sitting in the top-left corner (37 specials → page 10 has one card).
  Applies to 4-Product, Grid Cards, 2×2 Feature, 4-Up grid, 4 Across, 4-Up 7:5 and 4-Up Square.

## v40 — 29 Sep 2026
- **Pack-shot spacing is back to v38.** v39's extra gap between the pack shot and the text is removed.
  The classic layouts are pixel-for-pixel the same as v38.
- **Kept from v39:** the WAS / RRP line sits closer to the green line.
- **Image fine-tune now works in both directions with auto-balance on, on every layout.**
  - 130% makes that pack shot 30% bigger than its automatic size, and 70% makes it 30% smaller.
  - Before, on layouts where the pack shot already filled its space (4 Across, 4-Product, 6-Grid, Grid
    Cards, Specials banner and others), the slider could only make it smaller.
  - Pushed past its space, a pack shot is cropped at the edge of the photo area.
  - 100% is the automatic size, exactly as before.

## v39 — 29 Sep 2026
Fine spacing on the side-by-side cards (clean cards and 2×2 Feature). Structure, alignment and
pack-shot heights are unchanged.
- **A little more space between the pack shot and the text.** Pack shots keep a small gap on the text
  side (4.5% of the photo column, at least 6px).
  - Wide products that fill the column (double boxes, bags, groups of bottles) now sit about 9px further
    from the text on POS: 23px instead of 14px. The card's left margin is unchanged.
  - Tall products keep their size and move over by only a few pixels.
- **The WAS / RRP line sits a little closer to the green line:** about 6px instead of 10px on POS, with
  less space around the line itself.

## v38 — 29 Sep 2026
The classic white layouts now get the same balance as the clean cards. Their look is kept: capitals
brand, grey name, small green pill, big price with raised cents.
- **Brand letters** (Card options, remembered on each device): Standard · Title Case · CAPITALS · As typed.
  - Applies to every layout.
  - Standard keeps what you had: clean cards in Title Case, classic layouts in CAPITALS.
  - A Brand on slide is shown exactly as typed in Standard and As typed. It now shows on the classic
    layouts too.
- **Green line under the price: 2.5px** on POS, scaled up on larger layouts.
- **Classic layouts**
  - **Deals read like prices.** The offer goes in the pill and the big line is the price or the reward:
    - `BUY 2 FOR $145.00` → pill **BUY 2 FOR** and **$145.00** in the big price style.
    - `BUY 2, GET 1 FREE` → pill **BUY 2** and **GET 1 FREE**.
    - Other wording, such as `30% OFF RRP` or `SINGLE $4.95 / BOX 12 $53.45`, keeps the SPECIAL pill.
      The wording is made as large as fits, on up to two lines.
  - The red circle is kept for savings only. Deal wording no longer repeats in it.
  - **RRP shows** under the price when there's no WAS (`RRP $x`, or `RRP $x EACH` on a multi-buy).
    It follows Show RRP.
  - **Text rows sit level.** Cards of the same size share the same height for the brand, the name, the
    pill, the price and the WAS / RRP line, so every row lines up across the slide. In very tight
    cells (6-Grid) a row is left as it was rather than squeezing the pack shot.
  - **2×2 Feature: each pack shot is the height of its text**, like the clean cards.
  - Single, 2-Product, Hero + pick and 6-Grid Split keep their big pack shots, filling the space. Their
    text is much shorter than the photo area, so matching it would make the products small.
  - The SAVE circle sits on the product's top-right shoulder, and the side-by-side layouts no longer
    reserve empty space for it.
  - Pack shots use the better background detection and can be enlarged further when a photo has lots
    of empty space.
  - Grid Cards: the pill sits above the price, as on every other layout.
- **Pop pack shots** now applies to every layout (it's in the same tick box).
- **Show RRP** now applies to every layout.

## v37 — 28 Sep 2026
Clean cards only. Classic white layouts are unchanged.
- **The green line under the price is a little thicker:** 2px on POS (was 1.5px), scaling up on TV.
- **Brand on slide** (optional): a new field under **Brand** in each product card. Whatever you type
  is shown on the card exactly as typed, e.g. `BioCeuticals`, `PRANA ON`, `Herbs of Gold`. Leave it
  blank to use the sheet brand; brands typed in ALL CAPS are still shown in title case.
  - Sheet column: `brand_on_slide` (`slide_brand`, `display_brand` and `brand_display` also work).
    If you use the Apps Script feed, add the column to what it publishes.
  - The placeholder in the field shows what the card will say if you leave it blank.
  - The sheet **Brand** still finds the photo file (`images/BRAND_Product.png`), so changing how the
    brand looks never breaks a photo.
  - It's also used in Copy text and the email text.

## v36 — 28 Sep 2026
Pack shot = height of the promotional text. Classic white layouts are unchanged (checked pixel-for-pixel
against v35), and so are the cards with the pack shot above the text (POS 4 Across, Portrait TV Hero).
- **On every side-by-side clean card, the product is exactly as tall as the text block**, from the
  brand line down to the WAS / RRP line, and centred on it. Bottles, tubs, bags and double boxes all
  line up the same way. The measurement uses the product itself, not the photo's empty space.
  Cards of the same size have the same text height, so their pack shots match too.
- The photo column is a little wider (+4% of the card) so wide products (bags, tubs, double boxes)
  can reach the text height. Prices shrink slightly where they need the room: about 5% on POS 4-Up,
  up to 10% on the widest prices in TV 3 Rows.
- The red SAVE circle no longer reserves space in the photo column. It sits on the product's top-right
  shoulder.
- **Image fine-tune** still works on top: 110% makes that product 10% taller than its text.
- A very wide product that can't reach the text height even in the wider column is centred on the text.

## v35 — 28 Sep 2026
Balanced clean cards. Classic white layouts are unchanged (checked pixel-for-pixel against v34.1).
- **Deals read like prices.** The offer goes in the green pill and the amount or reward is the big line,
  so every card has the same four rows: pill · big line · green rule · WAS / RRP.
  | Deal wording in the sheet | Pill | Big line |
  |---|---|---|
  | `BUY 2 FOR $145.00` | BUY 2 FOR | $145.00 (same size as a NOW price) |
  | `BUY 2, GET 1 FREE` | BUY 2 | GET 1 FREE |
  | `BUY ANY 3 SAVE 20%` | BUY ANY 3 | SAVE 20% |
  | anything else (`HALF PRICE`, `BUY 3 FOR $50 MIX & MATCH`) | SPECIAL | the wording, as large as fits (up to two lines) |
- **RRP on a multi-buy says EACH:** `RRP $103.10 EACH`. It shows when the deal row has an `rrp` value,
  so add RRPs to deal rows to give those cards their fourth line.
- **Pack shots line up with the text.** The photo area runs from the brand line to the WAS / RRP
  line (never less than 80% of the card), so products and prices share one top and bottom edge.
  The red SAVE circle takes less room from the pack shot.
- **Pop pack shots** now also turns pale grey or off-white photo backgrounds white, so they don't show
  as a faint box on the card. Darker grey backdrops are left alone, so white caps keep their shape.
- **Canvas: White / Charcoal** (Clean-card options, remembered on each device). Charcoal puts the white
  cards on a dark background with a soft glow, which stands out on screens. Default is White.
- Brands typed in capitals keep a capital on the last word (Prana On, not Prana on).

## v34.1 — 28 Sep 2026
Fix: changing a product's image link now changes the photo. Applies to every layout.
- **The image_url you set now comes first**, whether it's in the sheet's `image_url` column or the
  editor's **Image URL** field. Before, a saved copy in `images/` or `Pictures/` named after the
  product (e.g. `images/HERBS_OF_GOLD_Quercetin_Complex_60c.png`) always won, so a new link was ignored.
- The saved copy is now the backup. It's used when:
  - `image_url` is blank.
  - the link doesn't load. Warning: "image_url didn't load, so a backup photo is shown — check the link…"
  - the link's website would block the PNG export. Warning: "…the saved copy images/… is shown —
    replace that file to change the photo".
- The line under each product card says which photo is showing and why.
- To force the saved copy, put its file name in `image_url` (e.g. `Quercetin.png`). A file name
  always wins, as before.

## v34 — 28 Sep 2026
Pack shots on clean cards. Classic white layouts are unchanged (checked pixel-for-pixel against v33.1).
- **Auto-size reaches further.** A photo with a lot of empty space around the product can now be
  enlarged up to 6× (was 2.35×), so it fills its space like the others. The limit is set by the
  photo's own resolution, so an enlarged pack shot never looks soft in the PNG.
- **Better background detection** for photos on grey or vignetted studio backdrops. The product's
  own outline stops the search, so a white bottle is no longer mistaken for background.
  Transparent cut-out photos use their transparency only.
- **Optical balance:** cards of the same size are compared by how big each product actually looks.
  A product that looks clearly bigger than its neighbours (e.g. a tall bottle next to a flat box) is
  eased back by up to 12%. Photos with an Image fine-tune setting are left exactly as set.
- The red SAVE circle follows the enlarged product, so it no longer floats in empty space.
- **Pop pack shots** (Clean-card options, on by default, remembered on each device): a gentle lift
  of colour, contrast and crispness. It's built into the image itself, so the PNG export and the
  design review PDF match the preview. Black and white stay put, and transparent photos stay transparent.
- **New warnings:**
  - "pack shot looks small": the photo is too small, or has too much empty space, to fill its space.
    Use a bigger or tighter-cropped photo, or Image fine-tune.
  - "its website blocks the photo, so the pack shot can't be auto-sized": save the photo in `images/`.
  - "pack shot couldn't be auto-sized": the photo's background is busy or dark. Use Image fine-tune,
    or a photo on plain white.

## v33.1 — 28 Sep 2026
Tooling only. Exported slides are unchanged.
- **Design review (PDF)** button (next to Copy text): one PDF for sign-off, built from page 1 of
  every layout with the specials currently loaded (25 layouts, about 10 seconds).
  - Page 1: numbered thumbnails of every layout, grouped by channel.
  - Then one page per layout: channel, name, size, what it's for, and an
    "Approved [ ]  Changes needed [ ]  Notes" line.
  - Saved as `phf_design-review_v33.1_<date>.pdf`. The tool returns to the layout you were on.
  - If the PDF maker can't load (no internet), you get a ZIP of the same images instead.

## v33 — 28 Sep 2026
Lighter clean cards. Classic white layouts are unchanged.
- The green line under the price is half as thick.
- The vertical grey line between the pack shot and the text is removed. The card border and the
  spacing already separate them, and the text gets a little more width, so names and deals wrap
  less and prices can sit slightly larger in narrow cards.

## v32 — 28 Sep 2026
Consistent product names on clean cards. Classic white layouts are unchanged.
- **Fixed structure on every card:**
  - **Row 1 — Brand**, always one line (Nutra-Life, Bio-Practica, Herbs of Gold). A very long brand
    is made slightly smaller, then ends with "…".
  - **Row 2 — Product + size**, always the same space on every card.
- **Name boundary:** Clean-card options → **Product name: 1 line / 2 lines** (default 2, remembered
  on each device). If a name doesn't fit, the tool tries in order:
  1. common abbreviations: capsules → caps, tablets → tabs, vegetable capsules → vcaps, and → &
  2. shortening the product words while keeping the size, e.g. `Manuka Honey UMF 10+ Premium… 500g`
- **Short name** (optional) for full control: a `short_name` column in the sheet (`display_name`,
  `pos_name` and `slide_name` also work), or the new **Short name on slide** field in each product card.
  If you use the Apps Script feed, add `short_name` to the columns it publishes.
- Staff are warned when a name had to be shortened: "Product 5: name shortened on the slide —
  add a Short name to choose the wording".
- Fixed brand casing after apostrophes (Nature's Way, not Nature'S Way).

## v31 — 28 Sep 2026
Even clean cards. Classic white layouts are unchanged.
- Cards of the same size (all four in 4 Across, all four in the 4-Up grid, all six in 6-Up, the two
  side cards of Hero + 2, the rows on Portrait TV …) now share the same spaces for the product name,
  the price or deal, and the WAS / RRP line.
  - The NOW / SPECIAL pills and the green rules sit level from card to card.
  - Every pack shot gets the same size area, so pack shots look consistent.
  - Names sit directly on their pill; spare space goes above a shorter name.
- A hero card is never matched to the smaller cards next to it.

## v30.1 — 28 Sep 2026
Editor only. Exported slides are unchanged.
- Product cards: the **Image fine-tune** slider now sits underneath **Photo file**, full width,
  instead of beside it where it got cut off in narrow cards.

## v30 — 28 Sep 2026
Two classic layouts brought across to clean cards. The classic versions are unchanged.
- **Email → Clean cards → 6-Up** (new): six clean cards in a 3×2 grid, pack shot left and price right.
  It's the clean-card version of 6-Grid Split, and every price on the slide is the same size.
  1000×625, PNG 2000×1250.
- **Email → Clean cards → Hero + 2**: the clean-card version of Hero + pick. Same layout as
  POS → Hero + 2, now also listed under Email.

## v29 — 28 Sep 2026
- **Classic white layouts fully restored to the original file**, footer included (original
  "*Not valid with existing specials…" wording, no added lines). Checked against the original
  upload: identical apart from the pack-shot auto-balance's normal run-to-run variation, which
  the original file shows too.
- All v25–v28 changes stay on the clean-card templates only (the former Retail and Botanical
  layouts): white background, no CURRENT SPECIALS header, clean cards, red SAVE circle,
  offer-end dates on cards, footer options.
- The footer options are now labelled "Clean-card footer & pricing".
- Still applies to every layout, because it's about the data rather than the design: expired
  specials drop off by date, the extra price warnings, email text and the ZIP record.

## v28 — 28 Sep 2026
Advertising safeguards.
- **Offer dates** (optional sheet columns `start_date` and `end_date`; `start` / `end` / `valid_from` /
  `valid_to` also work). Accepts 12/10/2026, 12/10/26, 2026-10-12, 12 Oct 2026, 12 Oct and Google date values.
  - Ended specials drop off automatically. Specials that haven't started yet are hidden unless
    **Include upcoming** is ticked. Screens left open re-check after midnight.
  - Clean cards show "Offer ends Mon 12 Oct" under the price. Classic layouts show it in the footer
    when every product on the slide ends on the same day.
  - File names add the earliest end date on the slide: `…_p01_ends-2026-10-12.png`.
  - The preview line shows how many specials are hidden by date.
- **Footer & pricing options** (remembered on each device):
  - **Label statement:** "Always read the label and follow the directions for use." (on by default).
  - **Show RRP:** switches RRP lines off everywhere (on by default).
  - **Prices apply:** Not stated / In-store only / In-store & online.
  - Stray leading asterisk removed from the terms.
- **Email text:** "Copy text" copies the current slide's alt text and product lines for Mailchimp.
  "Download all" now also includes `…_email-text.txt` for every page.
- **Advertising record:** "Download all" includes `…_record.csv`, with every product and price on every
  slide, the file name, dates, the export time and version.
- **More checks:** SAVE % over 60%, WAS more than double NOW, SAVE $ more than the price,
  SAVE $ bigger than RRP − NOW, RRP equal to NOW, unreadable dates, end before start, ends today.
- Removed an old "V18" reference from the image safety text.
- If you use the Apps Script feed, add `start_date` and `end_date` to the columns it publishes.
  The published-sheet CSV picks them up automatically.

## v27 — 28 Sep 2026
Clean-card template only. Classic white layouts are unchanged (checked pixel-for-pixel).
- **Cards only:** the header (PHF logo · CURRENT SPECIALS · SELECTED PRODUCTS ON SALE) is no longer
  drawn, so the cards use the full height. Footer (terms · website) stays.
- **Red SAVE circle is back** on the pack shot: SAVE $ and SAVE % offers, and WAS offers
  (saving worked out as WAS − NOW). It sits over the top-right corner of the visible product,
  not the empty corner of the image area. Deal wording (BUY 2 …) does not get a circle.
- The green line under the price now shows only WAS / RRP (or the deal line). The SAVE amount is
  in the circle, so it isn't shown twice.
- The Title field now only affects the classic white layouts.

## v26 — 28 Sep 2026
- **Channel first, then layout.** New tabs: POS screen (1000×625) · Portrait TV (1080×1920) ·
  Email (Mailchimp) · Social (square / 4:5) · Web banner. Each shows only its own layouts.
- **New clean-card layouts**
  - POS screen: Hero (1), 2-Up (2), 4 Across (4 in one row, pack shot above price).
  - Portrait TV: Hero (1, large pack shot above a very large price), 2 Rows, 3 Rows.
- Existing layouts are sorted into channels under "Clean cards" and "Classic white". Their artwork
  is unchanged (checked pixel-for-pixel against v25.1). Hero + pick and 2×2 Feature appear under
  POS and Email; Specials banner appears under Email and Web banner.
- "4-Up Square 1:1" removed from the picker. It was identical to Social → 4-Up Square.
- Each device remembers the last channel and the last layout used in each channel.
- File names now say where the artwork is for:
  `phf_<channel>_<layout>[_<title>]_<date>_p01.png`, e.g. `phf_pos_4-across_2026-09-28_p01.png`.
  ZIP: `…_all-pages.zip`.

## v25.1 — 28 Sep 2026
Tooling only — exported slides are identical to v25 (checked across all 19 layouts).
- Version number and date shown in the header and the Pricing sheet panel.
- Beta mode: the same file in a folder ending `-beta` shows a BETA badge, prefixes the tab title,
  and loads product photos from the live folder's `images/` and `Pictures/`.
- Update notice: an open screen checks every 20 minutes (and when the tab regains focus) and offers
  a refresh when a different version is live. Nothing reloads by itself.
- Added this changelog.

## v25 — 28 Sep 2026
- The 10 layouts that had the cream/botanical background (Retail ×6, Botanical ×4) now use one
  clean structure on white: header (PHF logo · CURRENT SPECIALS · SELECTED PRODUCTS ON SALE; POS
  layouts omit the logo), product cards (pack shot left │ Brand, name · NOW · large price · green
  rule · WAS / RRP / SAVE), standard footer.
- Portrait TV now stacks four horizontal cards (was 2×2).
- Removed from those layouts: red SAVE stamps, "Real Foods. Real Health." tagline, botanical copy line.
- Botanical buttons renamed: Hero Portrait 4:5, 2-Up Landscape 7:5, 4-Up Landscape 7:5, 4-Up Square 1:1
  (group "Social / campaign"). Layout keys and file names unchanged.
- Fixed the "CURRENT SPECIALS" heading clipping in the square Retail layouts.
- White layouts (Single hero, 2-Product, Hero + pick, 2×2 Feature, 4-Product, Grid Cards,
  Specials banner, 6-Grid, 6-Grid Split) unchanged — pixel-identical to v24.

## v24 — 27 Sep 2026
- Studio workspace: controls scroll on the left, live slide pinned on the right and scaled to fit.
- Fit / 100% zoom, full-screen preview, page chips (dot = page needs attention), ← / → page keys.
- Data source options folded away behind the status line; layout buttons grouped by use.

## v18 – v23
- Earlier versions: see the GitHub file history for `index.html`.
