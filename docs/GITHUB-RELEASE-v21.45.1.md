# Staff Hub v21.45.1 — Google Drive's picker shows your folders, big saved files go up, and one failed file no longer stops the rest (25 Oct 2026 15:10 AEDT)

**Summary:** v21.45.1 — Fixes for the browser sign-in way of reaching the shop folder.
- **Choose the shop folder and From Google Drive now list your folders.** Google's window showed only Shared drives, so a My Drive account saw "No folders" and could not choose the shop folder. The first tab now lists every folder the account can open. **Shared with me** and **Shared drives** are the other tabs.
- **Saved files over 4 MB go to Google Drive** as Google's resumable upload. That covers the POS master (about 24 MB), the selected master, the POS Database and Weight & Dimensions. Google takes at most 5 MB in one request.
- **One file that fails to go up no longer stops the files after it.**
  - Each file is tried.
  - The line under the drop box says which did not make it, for example "not saved yet: POS Database (full set) — … (tried again next time)", and stays until it goes up.

Exports are unchanged. The linked-folder way (Google Drive for desktop) is unchanged.

## What was wrong (your screenshot: the picker showed "Folders" and "No folders")
- **The picker:** it set its only view to `setEnableDrives(true)`. Google's reference says: "If true, only shared drives are included in the view." The shop folder is in admin@'s My Drive, so nothing was listed.
- **Uploads:** saved files were sent in one request (`uploadType=multipart`). Google documents that for files of 5 MB or less, so the big saved files could not rely on it.
- **One failure:** saving stopped at the first file that failed.
- **In Drive:** "Staff Hub saved files" held only `[lib-contacts] Supplier_Contacts.xlsx`.

## Changes (assets/js/phf-drive.js 2.0.2)
- **Picker:**
  - Three views: everything the account can open, then Shared with me (`setOwnedByMe(false)`), then Shared drives (`setEnableDrives(true)`).
  - The same for Choose the shop folder (folders only) and From Google Drive (files).
- **Uploads:** a saved file over 4 MB goes up as a resumable upload. The first request sends the details and gets an upload address; the second sends the file to it. Smaller files go up in one request, as before.
- **Sync:**
  - Each file that comes in or goes out is tried on its own. A file that did not go up is named on the line under the drop box (red) until it does, and is tried again when the next page opens.
  - **Save to** / **Get from** on the Saved files panel say so too.

## Versions
- Hub v21.45.1; Reconcile CH2 Order v2.26.3, Build POS Master Databases v21.27.1, POS New Product Check Clean v1.28.3 (version only); phf-drive.js 2.0.2.

## Files
- Changed:
  - index.html, assets/js/phf-drive.js
  - tools/reconcile-ch2/index.html
  - tools/database-build/index.html, js/pipeline.js
  - tools/pos-supplier-merge/index.html, js/app.js
  - docs/GOOGLE-DRIVE-SETUP.md, docs/ARCHITECTURE.md
- New: docs/GITHUB-RELEASE-v21.45.1.md.

## Tests run (25 Oct, headless Chromium, real files, Google simulated)
- **Picker:** Choose the shop folder opens with three views: all folders, Shared with me, Shared drives. Only the third is limited to shared drives.
- **Browser sign-in:**
  - Build POS Master Databases opened with the shop folder in 9.9 s, then Build All ran.
  - All 11 saved files reached "Staff Hub saved files". Weight & Dimensions (6.3 MB), POS Database (5.4 MB), POS master (24.8 MB) and selected master (14.7 MB) went up as resumable uploads, each complete to the byte.
- **A second, empty browser** signed in and opened Reconcile. It received all 11 files, including the 24 MB master, and reconciled invoice 74147128 (104 of 106).
- **One file refused by Google:**
  - The other 10 still went up.
  - The line read "not saved yet: POS Database (full set) — Google Drive said: … (tried again next time)".
  - The second browser still reconciled.
- **Linked folder** (Drive for desktop stand-in):
  - Build wrote 11 saved files, and a reload rewrote nothing.
  - A fresh browser received the master and reconciled invoice 74154567 (18 of 18).
  - Reconnect and POS New Product Check Clean worked.
- Zero page errors.

## Not run
- Real Google: the real picker and real uploads. Please choose the shop folder once more on the home page card.
