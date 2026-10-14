# Staff Hub v21.25.1 — storage protection shown, Find & Replace required, brand pair starts on NEW, merge picks up a Build while open (15 Oct 2026 10:50 AEDT)

**Summary:** v21.25.1 — storage protected / not protected shown, Find & Replace required, merge brand pair starts on NEW, merge loads a POS Database saved while it is open

## Commit notes
- From this release every change bumps the Staff Hub version (v21.25.1, v21.25.2 …), however small, so the badge on the
  home page always says which build is live.
- **Why saved files vanished (15 Oct morning):** Reconcile lost Ongoing Discounts and POS New Product Check Clean lost all
  five saved reference tables and its session between 09:04 and 09:25, while what Build wrote at 09:18 (POS set, master)
  was there — the pattern of the browser clearing the site's storage (Chrome does this when disk space is short, or on
  "clear browsing data"), not of the tools deleting anything. The Library already asks Chrome for persistent storage on
  every save; Chrome only grants it once the site is installed as an app, bookmarked or used a lot. Now the hub Library
  panel and the merge rail say **Storage protected** or **Storage not protected** with what to do (phf-library v1.1.2
  `persisted()`, hub-library v1.0.3, merge v1.14.7). Installing the Staff Hub as an app (the site has a manifest) is the
  reliable way.
- **A Build while the merge is open** (v1.14.8): the POS Database that Build saves to the Library is loaded straight
  away when the merge's POS Database slot is empty or holds an older Library copy — the page used to say "reload this
  page to use it" and, if the slot had been ✕-ed, stayed REQUIRED until a reload. A file dropped this session is left
  alone (the note still says reload). Tested: empty slot → save from another tab → loaded in ~2 s, no reload.
- **Find & Replace is required** in POS New Product Check Clean (merge-map v1.2.1) — the rail shows REQUIRED and the run
  waits for it, like the other reference tables.
- **Brand pair starts on NEW** (merge v1.14.6): the supplier's brand after Brand Name Changes is the master, OLD BRAND
  shows what POS had; tick CURRENT or change the cell to keep POS's. (v1.14.5 had it on CURRENT for a few hours.)

## Files
- Changed: index.html (v21.25.1), assets/js/phf-library.js v1.1.2, assets/js/hub-library.js v1.0.3,
  tools/pos-supplier-merge/{index.html, js/app.js v1.14.8, js/merge-map.js v1.2.1, js/engine-host.js v1.6.3,
  css/merge.css v1.13.3}, phf-library cache-busters in tools/{reconcile-ch2, database-build, supplier-contacts}/index.html
  and reconcile-ch2/reference-admin.html, docs/ARCHITECTURE.md, docs/GITHUB-RELEASE-v21.25.0.md.
- New: docs/GITHUB-RELEASE-v21.25.1.md.

## Testing done (15 Oct, headless Chromium)
- Hub: badge v21.25.1; Library panel shows the usage line and "Storage not protected" (headless Chromium never grants it);
  no errors; full hub regression passes.
- Merge: rail shows the storage note; Find & Replace REQUIRED; readiness lists it among the missing tables; engine starts.
- Merge v1.14.6 brand default verified on the 15 Oct rows (OUT ticks: SUP BRAND on).
