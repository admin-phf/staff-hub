# Update Specials — changelog

**Version format:** `MAJOR.MINOR`
- **MAJOR** (e.g. 43): the exported artwork changes (new layouts, restyled slides, structural updates).
- **MINOR** (e.g. 42.1 → 42.2): fixes or tooling only; exported slides look the same.

The running version is shown at the top right of the tool (e.g. `v43 · 29 Sep 2026`).
It is set in one place: `APP_VERSION` / `APP_DATE` at the top of the script in `index.html`.

## Release steps (one folder, one branch)
Everything lives on the **`main`** branch in **`tools/update-specials/`**.

1. In GitHub Desktop, check that **Current branch** says **main**, then click **Fetch origin** / **Pull origin**.
2. Copy the new `index.html` and `CHANGELOG.md` into `tools/update-specials/`, replacing the old ones.
3. Type the summary (`v43 – full visual cohesion, baseline synchronization & auto-balance overhaul`), click **Commit to main**, then **Push origin**.
4. After 1–2 minutes, open the tool and press **Ctrl+Shift+R**. The top right shows `v43`.

---

## v43 — 29 Sep 2026
Production release consolidating visual cohesion, baseline synchronization, and card geometry across all channels and templates:
- **Synchronized Row Baselines:** Enforced deterministic line-clamps and anchor heights across multi-product grids (4-Up, 2×2 Feature, 6-Grid, etc.), eliminating staggered price pills and baseline stepping.
- **Unified 4-Tier Offer Anatomy:** Standardized card structure into Offer Pill -> Display Anchor -> Fixed Dividing Rule -> Reference Line. Separator rules no longer collapse or drift on cards without reference pricing.
- **Decoupled SAVE Badge Anchoring:** Red circular savings badges are positioned relative to container margins with dedicated clearance padding, preventing collisions with tall bottles, droppers, and caps.
- **Pack-Shot Optical Mass Balancing:** Refined aspect-ratio auto-scaling curves so narrow bottles and squat tubs maintain equivalent visual presence without dominating or under-filling cards.
- **Trailing Orphan Card Centering:** Partial final pages on 4-Up grids (e.g. a single product on Page 10) are now centered dynamically in the canvas rather than stranded in the top-left quadrant.
- **Data Normalization:** Ingest filters automatically correct supplier brand typos (e.g., `Nutrition Care`), deduplicate repeating brand names in product titles, and format bulk tier mechanics clearly (`BUY 4+ FOR $60 EA`).

## v42 — 29 Sep 2026
Visual hierarchy, baseline synchronization, and layout cohesion overhaul across all product cards and templates (upgraded from v41).

## v41 — 29 Sep 2026
Cleaner sheet data, and pills, prices and green lines that sit level on every multi-product slide.