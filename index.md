# Why images aren't pulling in — and the fix

## What was wrong (3 things)

1. **Filenames were in the image columns, not Drive links.**
   Rows had `Bragg_-_Apple_Cider_Vinegar_-_946ml.png` in `image_url`. That's a filename,
   not a web address — the tool can't load it, so it shows the placeholder.

2. **The one real link was the wrong Drive format.**
   Diasporal had `drive.google.com/file/d/…/view` — that's the *viewer page*, not the image.
   The tool needs `drive.google.com/thumbnail?id=…&sz=w1000`.

3. **The files aren't shared publicly.**
   I tested the Diasporal link — Google returned "403 Forbidden", meaning that file is still
   private to your account. Even with a perfect URL, a private file won't show on the slides.

## The fix — do these in order

### Step 1 (once): make the Pictures folder public
In Drive, right-click your **Pictures** folder → Share → **Anyone with the link → Viewer**.
Every image inside becomes loadable. This alone fixes the 403.

### Step 2: put the cleaned images IN that folder
Upload the cutouts (the ones I cleaned + your originals) into that shared Pictures folder.

### Step 3: for each product, get its file ID and paste it in `image_id`
1. Right-click the image in Drive → **Share → Copy link**
2. The link looks like: `https://drive.google.com/file/d/`**`1ABC...XYZ`**`/view?usp=...`
3. Copy the **bold middle part** (the file ID)
4. Paste it into that product's **`image_id`** cell

The `image_url` cell fills itself in — it's a formula. **You only ever paste the short ID.**

> The Diasporal ID is already done as an example: `1fTlApL71EmQiQfld8Dc_l-850-I4sIpz`
> (but that file still needs Step 1 — sharing — before it'll show.)

### Step 4: refresh the tool
Open the hub → Update Specials → **Refresh**. Images now load.

---

## Important: the formula

Use **PHF_Specials_FIXED.csv** (attached). Its `image_url` column is a formula:
`=IF(G2="","","https://drive.google.com/thumbnail?id="&G2&"&sz=w1000")`

If after importing you see that text literally instead of a link, Google imported the formula
as plain text. Fix: click the `image_url` column → **Format → Number → Automatic**, or retype
the formula in the first image_url cell and drag down.

---

## Quick test before doing all 37

1. Do Step 1 (share folder).
2. Put ONE cleaned image in it (say Bragg).
3. Copy its ID → paste in Bragg's `image_id`.
4. Refresh the tool, open 2×2 Feature.
5. If Bragg's photo shows → the pipeline works, do the rest.
   If not → the folder sharing didn't take; re-check Step 1.

Test one before you do twenty. That's the fastest way to catch a sharing problem.

---

## Layout issues in the templates

Separate from the image pipeline — these are problems in how the slides render.

### Fixed in the new 6.5 grid layout
The 6.5 grid (`phf_grid_6_5.html`) reworks each card to image-left / price-right, and
that change resolves four of the five issues below:

1. **Price clipping — fixed.** In the old six-up and grid layouts the big price number
   was cut off at the card's bottom edge (`$59.95` → `$5⬛.95`) because the font was
   taller than the space. Moving the price beside the image gives it room; it no longer
   overflows.
2. **`$0.00` — fixed.** Advance Co-Q10 and both Bio-Practica products showed `NOW $0.00`
   in the old grids even though the deal data existed. The 6.5 card shows the offer text
   (`BUY 2, GET 1 FREE`, etc.) in place of a numeric price, so a zero never reaches the
   slide.
3. **Empty card slots — fixed.** Partial-fill pages used to print one product plus five
   empty placeholder boxes. Empty slots now collapse to nothing visible.
4. **SAVE badge overlap — fixed.** The red `SAVE $X` badge now sits in its own corner of
   the image, clear of the price zone.

### Still to do
5. **Consistency clean-ups** (data-side, not layout):
   - Product name is spelled `PlusE` in one place and `PluSe` in another — pick one.
   - `WAS` prices show inconsistent decimals: `$115.6`, `$45.9`, `$133.8` should be
     `$115.60`, `$45.90`, `$133.80`. Always two decimal places on money.

One note beyond layout: the same few products (Fiber Boost, Eagle, Designs for Health)
repeat across several sheets. If these print together, the duplication dilutes each
sheet — worth deduping if that's the case.

### What's already working — leave alone
- The single-product hero layout (clean hierarchy, unambiguous price).
- The hero + sidebar layout with the `PERFECT PAIRING` framing.

### Branding changes applied to 6.5
- Removed the `Current Specials` heading from below the masthead.
- Replaced `Real Foods. Real Health.` (top-right tagline and footer) with
  `Your local Vitamin, Supplement and Health Food store`.
