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
3. Type the summary (e.g. `v38 – balanced classic layouts + brand letters`), click **Commit to main**, then **Push origin**.
4. After 1–2 minutes, open the tool and press **Ctrl+Shift+R**. The top right shows the new version.
   Screens already open show *"Version x is now live… Refresh"* within about 20 minutes.
5. **Need an old version back?** On GitHub, open `tools/update-specials/index.html` → **History**,
   click the version you want → **⋯ → View file** → **Raw**, save it as `index.html`,
   and commit it the same way.

(The tool still supports a separate `-beta` folder for testing if you ever want one again.
It isn't needed day to day.)

---

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
