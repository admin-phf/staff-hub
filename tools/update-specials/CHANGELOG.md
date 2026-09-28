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
3. Type the summary (e.g. `v30 – clean 6-Up`), click **Commit to main**, then **Push origin**.
4. After 1–2 minutes, open the tool and press **Ctrl+Shift+R**. The top right shows the new version.
   Screens already open show *"Version x is now live… Refresh"* within about 20 minutes.
5. **Need an old version back?** On GitHub, open `tools/update-specials/index.html` → **History**,
   click the version you want → **⋯ → View file** → **Raw**, save it as `index.html`,
   and commit it the same way.

(The tool still supports a separate `-beta` folder for testing if you ever want one again.
It isn't needed day to day.)

---

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
