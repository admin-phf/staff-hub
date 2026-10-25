# Google Drive for the Staff Hub — setup (Staff Hub v21.45.1, 25 Oct 2026)

## How it works
**One shop folder in Google Drive, shared with the shop's accounts.** For example "GitHub Input Excel Data and Sheets 23.10.26", owned by admin@ and shared with each @prahranhealthfoods.com.au account as **Editor**, or kept in a Shared drive. Inside it:

| Folder | What happens |
|---|---|
| `1, database-build` | Every file in it loads by itself when **Build POS Master Databases** opens. |
| `2, pos-supplier-merge` | Every file in it loads by itself when **POS New Product Check Clean** opens. |
| `3, Orders` | For you to drag (or pick) the order and invoice into Reconcile. Nothing loads from it by itself. |
| `Staff Hub saved files` | Made by the Staff Hub when first needed. The tools' saved files go here: the POS master, Ongoing Discounts, the POS Database and supplier sets, and so on. Every PC keeps in step with it: **Reconcile** takes the newest POS master and Ongoing Discounts, **POS New Product Check Clean** the POS Database and sets, and the **hub** everything. Each file is named `[kind] original name`, so don't rename them. |

The tools find `1, …` and `2, …` by their names: a name starting with "1," or containing "database-build", and starting with "2," or containing "supplier-merge". A file dropped on top still replaces a loaded one.

**Each PC connects once,** on the home page's **Google Drive · shop folder** card, in one of two ways. The linked folder is used whenever it is there:

1. **Linked folder (best on the shop PCs). No sign-in, and it never runs out.**
   - Install **Google Drive for desktop** and sign in with a shop account. The shop folder then appears as a normal folder, for example `G:\My Drive\…` or `G:\Shared drives\…`.
   - On the home page, click **Link the shop folder on this PC** and pick that folder. When Chrome asks, choose **Allow on every visit**.
   - From then on, the tools read and save straight to that folder, and Drive for desktop syncs it with everyone.
   - If Chrome ever asks again, it's one click on **Reconnect**, with no Google window.
2. **Browser sign-in (any PC, nothing to install).**
   - On the home page, click **Sign in to Google Drive**, then **Choose the shop folder** (once on that PC).
   - In Google's window, the first tab lists every folder the account can open (type part of the name to find it quickly). **Shared with me** and **Shared drives** are the other tabs.
   - The sign-in is kept in that browser until Google's hour is up, and **renews by itself** five minutes before.
   - If Chrome blocks Google's little window, it renews on **your next click anywhere** instead.
   - **Sign out** on the card ends it.

## Is it safe?
- **Linked folder:**
  - Chrome lets the Staff Hub reach only the one folder you picked, and only on admin-phf.github.io.
  - Google Drive for desktop does the syncing under your Google account's own sharing.
  - No Google password or sign-in is involved in the Staff Hub.
- **Browser sign-in:**
  - It is Google's own window, and the Staff Hub never sees a password.
  - **`drive.readonly`** reads the shop folder, and cannot change or delete anything. **`drive.file`** writes only the files the Staff Hub makes itself, in "Staff Hub saved files".
  - The sign-in (an access token) lasts at most an hour, and **Sign out** revokes it.
  - Because the audience is Internal, only @prahranhealthfoods.com.au accounts can sign in.
- **Data:**
  - Files travel only between the shop folder and the browser. No other server is involved, and nothing goes into the GitHub repo.
  - The three settings in `assets/js/phf-drive-config.js` are not passwords. Google accepts them only from https://admin-phf.github.io. The client secret is never used and must never go in the repo.

## One-time Google Cloud setup (done 23 Oct 2026)
Project `phf-staff-hub` (number 876421157517), audience **Internal**. The steps, if they ever need redoing:
1. **Create the project:** https://console.cloud.google.com → project picker → **New project**.
2. **Turn on the APIs:** **APIs & Services → Library**, then enable **Google Drive API** and **Google Picker API**.
3. **Set up sign-in:**
   - **Google Auth Platform → Branding → Get started**: app name, support email, audience **Internal**, contact email, then **Create**.
   - **Data Access → Add or remove scopes**: tick `.../auth/drive.file` and `.../auth/drive.readonly`, then **Update → Save**.
4. **Create the sign-in ID:** **Google Auth Platform → Clients → Create client** → **Web application**. Under **Authorised JavaScript origins**, enter `https://admin-phf.github.io`, then copy the Client ID.
5. **Create the picker key:** **APIs & Services → Credentials → Create credentials → API key**. Restrict it:
   - **Websites:** `https://admin-phf.github.io/*` and `https://docs.google.com/*`.
   - **API:** **Google Picker API** only.
6. **Copy the project number:** **Cloud overview → Dashboard → Project info**.
7. **Fill in the settings:** put the three values in `assets/js/phf-drive-config.js`, then commit.

## Setting up the shop folder
1. In Drive, as admin@, rename "GitHub Input Excel Data and Sheets 23.10.26" if you like. The name doesn't matter.
2. **Share** it with each staff account as **Editor**, or move it into a **Shared drive** that the staff are members of. A Shared drive belongs to the shop rather than to one person.
3. Keep **only the current files** in `1, database-build` and `2, pos-supplier-merge`, because everything in them loads. Subfolders, Google Docs and Slides files are skipped, and Google Sheets come in as .xlsx.
4. The folder **"PHF Staff Hub"** in admin@'s My Drive (made by v21.40–v21.42) is no longer used, so you can delete it.

## Setting up each PC
- **Shop PCs:** install Google Drive for desktop (https://www.google.com/drive/download/) and sign in with the shop account. Then open the Staff Hub home page and click **Link the shop folder on this PC**, pick the folder, and choose **Allow on every visit**.
- **Any other PC:** open the home page, click **Sign in to Google Drive**, then **Choose the shop folder**. Allow pop-ups for admin-phf.github.io so the hourly renewal can happen without a click.

## If something goes wrong
| What you see | Fix |
|---|---|
| "Reconnect the shop folder" under the drop box | Click it. When Chrome asks, choose **Allow on every visit**. |
| "No "1, database-build" folder inside …" | The linked or chosen folder is the wrong one. Link (or choose) the folder that holds `1, …` and `2, …`. |
| "Google Drive reconnects on your next click" | The hour ran out while Chrome blocked the renewal. Click anywhere, or allow pop-ups for the site. |
| "This browser can read the shop folder but not save into "Staff Hub saved files"" | That account has view-only access, or it is a browser sign-in on a folder another account made. Give the account Editor access, or save from a PC with the linked folder. |
| Big saved files (POS master, selected master) do not appear in "Staff Hub saved files" | From v21.45.1 they go up as Google's resumable upload. The line under the drop box names any file that did not go up; it is tried again the next time a page opens. |
| "The API developer key is invalid" (in the picker) | Step 5: the key's websites must include `https://docs.google.com/*`. |
| "Access blocked" / "Error 403: access_denied" | Sign in with an @prahranhealthfoods.com.au account and allow both Drive permissions. |
