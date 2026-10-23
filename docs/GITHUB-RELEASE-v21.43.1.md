# Staff Hub v21.43.1 — the shop folder is checked when you link or choose it (24 Oct 2026 00:15 AEDT)

**Summary:** v21.43.1 — Linking a folder inside the shop folder (for example "2, pos-supplier-merge") is now refused, with what to pick instead. A PC already linked to the wrong folder says **WRONG FOLDER LINKED** on the home card, and the tools show **Link the shop folder** to fix it. Before, it linked and then loaded nothing, which is what happened in Build POS Master Databases.

## What changed (phf-drive.js v2.0.1)
- **Linking (home card or tool):** the folder you pick must hold "1, database-build" and/or "2, pos-supplier-merge". If it doesn't, nothing is linked, and the card says why and what to pick:
  - For a folder inside it: ""2, pos-supplier-merge" is one of the folders inside the shop folder. Pick the folder one level up. In the window, open the folder that holds "1, database-build", "2, pos-supplier-merge" and "3, Orders" so you can see them, click an empty space (nothing highlighted), then Select Folder."
  - For any other folder: it says it has no "1, …" or "2, …" folder inside.
- **Choose the shop folder** (browser sign-in) is checked the same way.
- **A PC already linked to a folder inside the shop folder:**
  - The home card chip reads **WRONG FOLDER LINKED**, with **Link the shop folder** and Unlink.
  - Under each tool's drop box: **Link the shop folder** (centred) and what to pick. One click there opens the folder window, and once the right folder is picked the tool's files load straight away.
  - Nothing is loaded from or saved to the wrong folder.
- If the shop folder has only one of the two tool folders, the card says which is missing. A tool whose folder is missing says what its name should start with ("1," or "2,").

## Versions
- Hub v21.43.1; Reconcile CH2 Order v2.25.1, Build POS Master Databases v21.26.1, POS New Product Check Clean v1.28.1 (version only).
- phf-drive.js 2.0.1, library.css 2.4.1.

## Files
- Changed:
  - index.html
  - assets/js/phf-drive.js, assets/css/library.css
  - the three tools' index.html and their app.js / pipeline.js (version)
  - docs/ARCHITECTURE.md
- New: docs/GITHUB-RELEASE-v21.43.1.md.

## Tests run (24 Oct, headless Chromium, real files)
- **Picking "2, pos-supplier-merge" on the home card:** refused with the message above. Nothing linked (NOT CONNECTED).
- **A PC already linked to "2, pos-supplier-merge"** (as in your screenshot):
  - The home card showed WRONG FOLDER LINKED with Link the shop folder.
  - Build POS Master Databases showed "Link the shop folder" and loaded nothing.
  - Clicking it and picking the shop folder loaded "1, database-build": 9 of 9 assigned. The home card then read LINKED FOLDER.
- **The full v21.43.0 tests, run again and all as before:**
  - **Linked folder:** build, then 11 saved files. A fresh browser received the master and discounts and reconciled 18 of 18. Reconnect took one click. The merge folder loaded after its session settled, with no rewrites on reload.
  - **Browser sign-in:** renewed by itself, reconnected on the next click, and signed out.
- Zero page errors.
