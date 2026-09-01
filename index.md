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
