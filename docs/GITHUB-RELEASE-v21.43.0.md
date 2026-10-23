# Staff Hub v21.43.0 — one shared shop folder, two ways in (linked folder with no sign-in, or a browser sign-in that renews itself), and a Google Drive card on the home page (24 Oct 2026 00:10 AEDT)

**Summary:** v21.43.0 — Google Drive now works from one shared shop folder.
- **What loads from it:** "1, database-build" and "2, pos-supplier-merge" load by themselves in their tools.
- **Saved files:** the tools' saved files (POS master, Ongoing Discounts, sets) are kept in step through its "Staff Hub saved files" folder, on every PC and for every shop account.
- **Connecting a PC** is done once, on a new **Google Drive · shop folder** card on the home page:
  - **Linked folder** (Google Drive for desktop): no sign-in, and it never runs out.
  - **Browser sign-in**: renews itself before the hour is up, or on your next click if Chrome blocks it.
- **In the tools,** only the Drive button is centred under the drop box. The lines are left-aligned.

Exports are unchanged.

## The shop folder
- Use your folder (for example "GitHub Input Excel Data and Sheets 23.10.26"), shared with the shop's accounts as Editor, or kept in a Shared drive.
- The tools find **"1, database-build"** and **"2, pos-supplier-merge"** by name. There's nothing to choose in each tool.
- **"Staff Hub saved files"** is made inside it when first needed. It holds one file per saved file, named `[kind] name`.
  - When a tool saves a file, it goes there straight away.
  - When a page opens, the newer copies it uses come in.
  - Unchanged files are never written or read again.
  - A file you delete in one browser is not brought back by itself.

## Two ways for a PC to connect (home page card)
- **1 · Linked folder: no sign-in, never runs out.** On a PC with Google Drive for desktop:
  - Click **Link the shop folder on this PC**, pick it (for example `G:\My Drive\…`), and choose **Allow on every visit** when Chrome asks.
  - From then on, the tools read and save straight there, and Drive for desktop syncs it to everyone.
  - If Chrome ever asks again: **Reconnect the shop folder** (one click, no Google window).
- **2 · Browser sign-in: any PC.**
  - Click **Sign in to Google Drive**, then **Choose the shop folder** once.
  - The sign-in is shared by every tab and renews by itself 5 minutes before the hour is up, using your account so no chooser appears. If Chrome blocks that window, it renews on your next click anywhere.
  - **Sign out** on the card revokes it.
- The card shows how this PC is connected (LINKED FOLDER / SIGNED IN / NOT CONNECTED) and what loads by itself.

## In the tools
- **Under the drop box:**
  - A centred button appears only when something needs doing: Reconnect the shop folder, Choose the shop folder, or Sign in to Google Drive. **From Google Drive** shows when signed in.
  - The lines under it are left-aligned like the rest of the panel: how it's connected, what loads (with a "change" link to the home card), what came in or went out.
  - With a linked folder there's no button at all.
- **POS New Product Check Clean** loads its folder once its last session has come back. Before, files fed while it was restoring were refused.
- The **Saved files** panel shows the connection, plus Save to / Get from "Staff Hub saved files". In a tool that isn't connected, it shows **Connect Google Drive**, which takes you to the home card.

## No longer used
- The "PHF Staff Hub" folder in admin@'s My Drive (v21.40–v21.42) and the per-tool "Loads every time" folder choice. You can delete the old folder in Drive.

## Versions
- Hub v21.43.0; Reconcile CH2 Order v2.25.0, Build POS Master Databases v21.26.0, POS New Product Check Clean v1.28.0 (version only).
- phf-drive.js 2.0.0, hub-library.js 2.5.0, library.css 2.4.0.

## Files
- Changed:
  - index.html (the Google Drive card)
  - assets/js/phf-drive.js, assets/js/hub-library.js, assets/css/library.css
  - tools/reconcile-ch2/index.html, js/app.js; tools/database-build/index.html, js/pipeline.js; tools/pos-supplier-merge/index.html, js/app.js
  - docs/GOOGLE-DRIVE-SETUP.md (rewritten), docs/ARCHITECTURE.md
- New: docs/GITHUB-RELEASE-v21.43.0.md.

## Tests run (23–24 Oct, headless Chromium, real files)
- **Linked folder** (Chromium's own folder storage standing in for Google Drive for desktop):
  - The home card went from NOT CONNECTED to LINKED FOLDER.
  - **Build POS Master Databases** loaded "1, database-build" by itself: 9 of 9 assigned. Its three reference files were written to "Staff Hub saved files".
  - **Build All** wrote all 11 saved files there, for example `[posMaster] merged_alligned_pos_supplier_uhp_full_23.10.26.xlsx`.
  - **Reload:** the folder loaded again, and nothing was rewritten ("up to date").
  - **A browser with an empty Library** (a "new PC") opening Reconcile received the POS master and Ongoing Discounts by itself, then reconciled invoice 74154567 (18 of 18).
  - **Chrome asking again:** "Reconnect the shop folder", centred. One click reconnected it, with no Google window.
  - **POS New Product Check Clean:** the POS Database and four supplier sets came in, and after its session settled (about 12 seconds) "2, pos-supplier-merge" loaded. All 5 files were assigned.
- **Browser sign-in** (Google simulated, a browser that can't link folders):
  - **On the card:** Sign in showed admin@prahranhealthfoods.com.au. Choose the shop folder → SIGNED IN.
  - **Build:** "1, database-build" loaded. "Staff Hub saved files" was made in the shop folder, and the three reference files were saved there.
  - **A second tab:** already signed in, with no click.
  - **Renewal:** with 5 minutes 8 seconds left, it renewed by itself with the account hint and no click.
  - **Expiry with the window blocked:** "reconnects on your next click". One click anywhere signed it back in.
  - **Sign out:** revoked the sign-in and cleared it.
- **Layout:** in every state the button is centred on the drop box (0 px off), and the lines are left-aligned.
- **Exports:** invoice 74154567's TXT, CSVs and .xlsx are identical to v21.35.3 (xlsx apart from the creation time). The width is 1,759 px.
- **Pages:** the hub and the three tools load with Google unreachable. Zero page errors in every run.

## Not run
- Real Google Drive for desktop on Windows, Chrome's "Allow on every visit" prompt, and a real Google sign-in. Please try both ways on a shop PC.
