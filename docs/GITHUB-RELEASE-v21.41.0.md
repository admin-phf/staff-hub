# Staff Hub v21.41.0 — Google Drive loads by itself, and Reconcile's POSActive balancing check is always open (23 Oct 2026 12:20 AEDT)

**Summary:** v21.41.0 — Sign in to Google Drive once, and files load by themselves:
- That browser tab stays signed in for up to an hour.
- Build POS Master Databases and POS New Product Check Clean each remember one Drive folder, and load every file in it whenever the page opens.
- Files the tools save (a build's master and sets, the reference files) go to Drive by themselves.
- Newer copies come in by themselves: Reconcile takes the POS master and Ongoing Discounts, and the merge tool takes the POS Database and supplier sets.
- A file dropped on top still replaces the loaded one.

In Reconcile CH2 Order, the POSActive balancing check is always open, just above the RUN row and the checklist. It was inside Details.

Exports are unchanged. **You need to add one permission in Google Cloud first:** Data Access → `drive.readonly`.

## Before you test: one step in Google Cloud
- Go to **Google Auth Platform → Data Access → Add or remove scopes**, and tick **`.../auth/drive.readonly`** ("See and download all your Google Drive files") as well as `drive.file`. Then **Update → Save**.
- When you next sign in, Google asks you to allow it.
- It is read only: the Staff Hub can list and read the folder you choose, and it cannot change or delete anything in Drive. Because the audience is Internal, Google needs no review.

## Google Drive (phf-drive.js v1.1.0)
- **Sign in once.** Use **Sign in** under Drop all in any tool, or the hub's **Saved files → Sign in**.
  - The sign-in is kept in that browser tab until Google's hour is up. Every tool you open in that tab loads by itself, with no more clicks.
  - Closing the tab or **Sign out** ends it.
- **"Loads every time"** (Build POS Master Databases and POS New Product Check Clean):
  - Click **Choose a Drive folder to load every time** under Drop all, and pick the folder (for example "1, database-build").
  - Its files load now and every time the page opens, through the tool's own drop handler, so each file is recognised and checked exactly as if dropped.
  - The line shows "Loads every time: 1, database-build · Load again · Change · ✕".
  - The folder is remembered in this browser, so choose it once on each PC.
  - Subfolders, Google Docs and Slides files are skipped, and Google Sheets come in as .xlsx.
  - In POS New Product Check Clean, loading waits until the password has been typed.
- **Saved files stay in step with Drive's PHF Staff Hub folder.**
  - A file a tool saves goes to Drive straight away: after Build All, the POS Database, CH2 and Unique sets, both A–P layouts, the full merged master, the selected-columns master and the To-Order file.
  - When a page opens, the newer copies it uses come in. Reconcile takes the POS master and Ongoing Discounts. POS New Product Check Clean takes the POS Database and supplier sets, and Build POS Master Databases its three reference files. The hub takes everything.
  - Each copy carries a fingerprint, so an unchanged file is never copied again, either way.
  - A saved file you delete in a browser is not brought back there by itself. It returns only when a newer one is saved, or when you press **Get from Google Drive**.
- **Reconcile CH2 Order:** the order and invoice are still dragged in, or picked with **From Google Drive**, as you asked.
- **Saved files panel:** has **Sign in**, and shows what came in or went out (for example "newer Full merged master from Google Drive (11:58)"). **Save** and **Get** still work by hand, and Save skips unchanged files.

## Reconcile CH2 Order v2.23.0
- **The POSActive balancing check is always open,** straight under Details and just above the RUN row and the checklist, as in your screenshot. It shows:
  - Import total (TXT), CP inc GST off, GST in import, Same imported rows—old prices, Full current POS order and Supplier invoice total.
  - Its notes.
  
  It still updates the moment you tick or count.
- **Details** keeps the review notes, order link, import keys and how the checklist works. Its heading no longer mentions the balance.

## Build POS Master Databases v21.24.0 · POS New Product Check Clean v1.26.0
- Version only. The Drive folder loading and saving come from the shared phf-drive.js, and there is no change to building or merging.

## Files
- Changed:
  - index.html (hub v21.41.0)
  - assets/js/phf-drive.js (v1.1.0), assets/js/hub-library.js (v2.3.0), assets/css/library.css (v2.2.0)
  - tools/reconcile-ch2/index.html, js/app.js (v2.23.0)
  - tools/database-build/index.html, js/pipeline.js (v21.24.0)
  - tools/pos-supplier-merge/index.html, js/app.js (v1.26.0)
  - docs/GOOGLE-DRIVE-SETUP.md, docs/ARCHITECTURE.md
- New: docs/GITHUB-RELEASE-v21.41.0.md.
- Unchanged: phf-drive-config.js, phf-library.js, the reconcile engine and export modules, the merge engine, merge-map.js and the Apps Script files.

## Tests run (23 Oct, headless Chromium, real files, Google simulated, two separate browsers as two PCs)
- **PC A, hub:** Sign in. The session was kept for 60 minutes with both permissions, and the Client ID was 876421157517-52ckqj….
- **PC A, same tab → Build POS Master Databases:**
  - It was already signed in (no new sign-in).
  - Choose a Drive folder → "1, database-build" loaded all 9 files: "From Google Drive › 1, database-build: 9 files". All 9 were assigned (BrowseStockItems1, Product Insert Template, Brand Abbreviation, ParagonCare pricelist, CR666a, Weight & Dimensions, Unique export, Ongoing Discounts, To-Order). A subfolder and a Google Doc in the folder were skipped.
  - The three reference files went to Drive.
  - **Reload:** the folder loaded again with no clicks, and nothing was uploaded again (same fingerprints).
  - **Dropped on top:** uhp_products_export_v2.xlsx replaced the loaded Unique export.
  - **Build All:** completed, and its 8 saved outputs went to Drive by themselves.
- **PC B (another browser), Reconcile:**
  - **Sign in:** "newer Ongoing Discounts, Full merged master from Google Drive". The 23.6 MB master was in place, with no drop needed.
  - Dragging the order and invoice for 74154567 and running gave 18 of 18 matched.
  - The balancing check sits between Details (closed) and the RUN row. Ticking ALL showed $1,296.21 in it within 150 ms, and unticking showed NOTHING TICKED again.
- **PC B, same tab → POS New Product Check Clean:**
  - The newer POS Database and four supplier sets came in from Drive.
  - Choosing "2, pos-supplier-merge" loaded its 5 files (Product Prefixes, POS Suppliers, Ongoing Discounts, Find & Replace…).
  - A deleted Unique full set was not brought back on reload, and **Get from Google Drive** brought it back.
  - **Sign out** cleared the session and revoked the token. After reload: "Sign in to load "2, pos-supplier-merge" from Google Drive."
- 11 uploads in all, one per file and none repeated. Every Drive call carried the sign-in.
- **No changes = the same files.** Invoices 74154567 (1,860 px) and 74147128 (1,440 px):
  - POSActive TXT, CSVs and .xlsx: identical to v21.35.3 (xlsx apart from the creation time).
  - Widths 1,759 / 1,750 px.
- With Google unreachable, the hub and all three tools load with zero errors.
- Zero page errors in every run.

## Not run
- Real Google sign-in and Drive. Test them after adding `drive.readonly` in Data Access.
- POS New Product Check Clean behind its real password (the test lock config is empty). The folder waits for the tool's drop handler, which is wired after the password.
