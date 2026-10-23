# Staff Hub v21.42.0 — drop files anywhere on the page, and one centred "Sign in to Google Drive", the same on every tool (23 Oct 2026 23:00 AEDT)

**Summary:** v21.42.0 — In all three tools:
- **Drops are forgiving.** One file or several, dropped anywhere on the page, go to "Drop files here", and each is put on its own row. While you drag, the box lights up and a note says where the files go. A drop on a row still goes to that row. Before, a file let go outside the boxes made the browser open or download it.
- **The Google Drive block under the drop box is centred and the same on every tool.** Signed out, it shows one button, **Sign in to Google Drive**, and a line saying what then loads by itself. **From Google Drive** and the folder link appear once you're signed in.
- **The hub's Saved files panel matches.**

Exports are unchanged.

## All three tools
- **Drop anywhere.** One file or several can be let go anywhere on the page: the header, the RUN strip, the main area or the panel. They go to the tool's own Drop all, so each is recognised and put on its row, exactly as before.
  - A drop on a particular row, card or box still goes only there.
  - While files are dragged over the page, the drop box turns blue, and a note at the bottom reads "Let go anywhere — one file or several; each goes to its own row".
  - In POS New Product Check Clean, drops are taken after the password.
- **The drop box wording is the same on every tool:**
  - "Drop files here · one or several · or click to choose · XLS / XLSX / CSV". Reconcile also lists PDF.
  - Above it: "Drop one file or several, anywhere on this page — each goes to its own row."
- **Google Drive under the drop box** (your question "which do I select"):
  - **Signed out:** only **Sign in to Google Drive**, centred under the box, with what then happens:
    - Build POS Master Databases and POS New Product Check Clean: "Then choose the Drive folder to load every time.", or "Then "1, database-build" loads by itself, every time this page opens." once chosen.
    - Reconcile: "Then the newest POS master and Ongoing Discounts load by themselves."
  - **Signed in:** **From Google Drive** (to pick particular files) and, on the two folder tools, "Choose a Drive folder to load every time", or "Loads every time: … · Load again · Change · ✕".
- **Saved files panel** (hub and tools): signed out, only **Sign in to Google Drive**. Save to / Get from Google Drive and Sign out appear once signed in.

## Versions
- Hub v21.42.0; Reconcile CH2 Order v2.24.0; Build POS Master Databases v21.25.0; POS New Product Check Clean v1.27.0. The tools change only in version and wording.
- phf-drive.js 1.2.0, phf-drop.js 1.0.0 (new), hub-library.js 2.4.0, library.css 2.3.0.
- Build POS Master Databases now loads pipeline.js with `?v=21.25.0`. It had been left at 21.22.0, so a browser could keep an older copy.

## Files
- Changed:
  - index.html
  - assets/js/phf-drive.js, assets/js/hub-library.js, assets/css/library.css
  - tools/reconcile-ch2/index.html, js/app.js (header)
  - tools/database-build/index.html, js/pipeline.js (version)
  - tools/pos-supplier-merge/index.html, js/app.js (version)
  - docs/GOOGLE-DRIVE-SETUP.md, docs/ARCHITECTURE.md
- New: assets/js/phf-drop.js, docs/GITHUB-RELEASE-v21.42.0.md.

## Tests run (23 Oct, headless Chromium, Google simulated)
- **Signed out** on Reconcile, Build POS Master Databases and POS New Product Check Clean: only "Sign in to Google Drive" with its line, both centred on the drop box (0 px off). No From Google Drive and no folder link. The hub and tool Saved files panels show only "Sign in to Google Drive".
- **Signed in on the hub, then in the same tab:**
  - The panel shows Save to / Get from Google Drive and Sign out.
  - Reconcile shows From Google Drive.
  - Build POS Master Databases shows From Google Drive and "Choose a Drive folder to load every time", centred.
- **Drop anywhere:**
  - One invoice PDF dropped on Reconcile's main area: "1 of 1 dropped file assigned", as Supplier invoices.
  - The master and the order XLS dropped together on the page header: "2 of 2 dropped files assigned automatically".
  - Brand Abbreviation dropped on Build POS Master Databases' main area: "1 of 1 dropped file assigned automatically".
  - A file dropped on a row stayed with that row and did not also go to Drop all (0 Drop all events).
  - While dragging, the box lit and the note showed. Both cleared when the drag ended.
- **Exports:** invoice 74154567's POSActive TXT, CSVs and .xlsx are identical to v21.35.3 (xlsx apart from the creation time). The width is 1,759 px.
- Zero page errors.

## Not run
- Real Google sign-in (test it with the shop account).
- Dragging from Windows Explorer into Chrome. The test used the browser's own drop events with real files.
