# Google Drive for the Staff Hub — setup (Staff Hub v21.41.0, 23 Oct 2026)

Once this is set up and you **sign in once** (one click; that browser tab stays signed in for up to an hour), the files load by themselves:
- **Build POS Master Databases** and **POS New Product Check Clean** each remember one Drive folder (**Loads every time**, picked once per browser). Every file in it loads when the page opens, exactly as if dropped. A file dropped on top replaces the loaded one.
- **Saved files stay in step with Drive.** The tools' saved files (POS master, Ongoing Discounts, the POS Database and supplier sets and so on) are kept in a Drive folder called **PHF Staff Hub**:
  - When a tool saves a file (after a build, say), it goes to Drive straight away.
  - When a page opens, newer copies from Drive come in. **Reconcile CH2 Order** takes the POS master and Ongoing Discounts, and **POS New Product Check Clean** takes the POS Database and supplier sets. The **hub** takes everything.
  - Unchanged files are never copied again.
- **From Google Drive** under "Drop all input files here" picks any files by hand (for example the order and invoice in Reconcile).
- The **Saved files** panel has **Sign in**, **Save to Google Drive** and **Get from Google Drive** (by hand, when wanted), and **Sign out**.

Until the three settings below are filled in, none of this shows, and the tools work exactly as before.

**Status:** set up on 23 Oct 2026 (Staff Hub v21.40.1). Loading by itself since v21.41.0.
- Google Cloud project `phf-staff-hub` (number 876421157517), with the audience set to **Internal**. Only the shop's Google Workspace accounts can sign in.
- The settings are in `assets/js/phf-drive-config.js`. The client secret is not used and must never go in the repo.
- **v21.41.0 needs one more permission in Google Cloud:** Step 3.5, `drive.readonly`.

## Is it safe?
- **Sign-in is Google's own window.** The Staff Hub never sees a Google password.
- **Two Drive permissions:**
  - **`drive.readonly`** (read only) lists and reads the folder you choose for a tool. It cannot change, move or delete anything in Drive.
  - **`drive.file`** lets it write only the files it made itself, in the PHF Staff Hub folder.
  - Because the audience is Internal, only the shop's accounts can sign in, and Google needs no review.
- **The sign-in lasts about an hour.** It is kept in that browser tab only (session storage) so each tool can load by itself, and it is gone when the tab closes, the hour is up or you press **Sign out**.
- **Files travel straight between Google Drive and your browser.** No other server is involved, and nothing goes into the GitHub repo.
- **The three settings are not passwords.** They are meant to sit in a public web page, because Google locks them to `https://admin-phf.github.io` and to the APIs below. Your data stays private, because every file still needs a staff member's own Google sign-in.

## What you need
- A Google account that will own the setup (the shop's account is best).
- About 15 minutes.
- To find each item: use the ☰ menu (top left) on https://console.cloud.google.com, or type the item's name in the search bar at the top.

## Step 1 — Create a project
1. Open https://console.cloud.google.com and sign in.
2. Click the project picker at the top, then **New project**.
3. Name it `PHF Staff Hub`, then click **Create**.
4. Make sure the new project is selected in the project picker before going on.

## Step 2 — Turn on the two Google APIs
1. Go to **APIs & Services → Library**.
2. Search **Google Drive API**, open it, and click **Enable**.
3. Go back to the Library, search **Google Picker API**, open it, and click **Enable**.

## Step 3 — Set up the sign-in screen (Google Auth Platform)
1. Go to **Google Auth Platform → Branding**. If it says "Google Auth platform not configured yet", click **Get started**.
2. **App name:** `PHF Staff Hub`. **User support email:** your email. Click **Next**.
3. **Audience:**
   - If the shop uses Google Workspace (staff have @yourshop addresses), choose **Internal**. Only your shop's accounts can sign in, and Google needs no review.
   - Otherwise (Gmail accounts), choose **External**.
4. **Contact information:** your email. Click **Next**, tick the **Google API Services: User Data Policy** box, click **Continue**, then **Create**.
5. Go to **Data Access → Add or remove scopes**. Tick both of these, then **Update → Save**:
   - `.../auth/drive.file`: "See, edit, create and delete only the specific Google Drive files you use with this app".
   - `.../auth/drive.readonly`: "See and download all your Google Drive files".
   
   If one isn't listed, paste its full address into **Manually add scopes**: `https://www.googleapis.com/auth/drive.readonly`.
6. **External only:** go to **Audience → Test users → Add users**. Add each Google account that will use the Staff Hub, including yours, then **Save**. While the app stays in "Testing", only these accounts can sign in.

## Step 4 — Create the sign-in ID (OAuth client ID)
1. Go to **Google Auth Platform → Clients → Create client**.
2. **Application type:** **Web application**. **Name:** `Staff Hub (GitHub Pages)`.
3. Under **Authorised JavaScript origins**, click **Add URI** and enter exactly `https://admin-phf.github.io`. Use no path and no slash at the end.
4. Leave **Authorised redirect URIs** empty, then click **Create**.
5. Copy the **Client ID**. It ends in `.apps.googleusercontent.com`. A web client has no secret to keep.

## Step 5 — Create the picker key (API key)
1. Go to **APIs & Services → Credentials → Create credentials → API key**, then copy the key.
2. Click the key's name (or **Edit API key**) to restrict it:
   - **Application restrictions:** **Websites**. Add both of these lines:
     - `https://admin-phf.github.io/*`
     - `https://docs.google.com/*`. Google's picker runs from there, and without it the picker says "The API developer key is invalid".
   - **API restrictions:** **Restrict key**, then tick only **Google Picker API**.
3. Click **Save**. It can take a few minutes to take effect.

## Step 6 — Copy the project number
- Go to the ☰ menu, then **Cloud overview → Dashboard**. The **Project info** card shows **Project number** (digits only).
- You can also find it under **IAM & Admin → Settings**.
- The project **number** is not the project ID (the ID is a name such as `phf-staff-hub-123456`).

## Step 7 — Put the three values in the Staff Hub
Open `assets/js/phf-drive-config.js` in the repo and fill in the quotes:

```js
window.PHF_DRIVE_CONFIG = {
  clientId: '1234567890-abc123.apps.googleusercontent.com',  // Step 4
  apiKey: 'AIza…',                                           // Step 5
  appId: '1234567890'                                        // Step 6 (project number)
};
```

Commit and push with GitHub Desktop as usual. GitHub Pages updates in a minute or two. Then reload the tools with **Ctrl + Shift + R** so the browser gets the new file.

## Step 8 — Use it
1. **Allow pop-ups** for `admin-phf.github.io` in Chrome. Sign-in opens a small Google window, and if it is blocked, Chrome shows a blocked-pop-up icon in the address bar.
2. **Sign in once.** Use the hub's **Saved files → Sign in**, or **Sign in** under Drop all in any tool, with the shop account. Allow both Drive permissions.
   - The tab stays signed in for up to an hour, so each tool you open in it loads by itself.
   - A PHF Staff Hub folder appears in Drive the first time.
3. **Build POS Master Databases:** under Drop all, click **Choose a Drive folder to load every time** and pick, for example, "GitHub Input Excel Data and Sheets 23.10.26 › 1, database-build". All its files load now and every time the page opens. After **Build All**, the outputs go to Drive by themselves.
4. **POS New Product Check Clean:** the same, with its folder ("2, pos-supplier-merge"). The newest POS Database and supplier sets come in from Drive by themselves.
5. **Reconcile CH2 Order:** the newest POS master and Ongoing Discounts come in from Drive by themselves. Drag in (or use **From Google Drive** for) the order XLS and invoice PDF as usual.

## Good to know
- **Use the same Google account on every PC.** The PHF Staff Hub folder belongs to the account you sign in with, and a different account gets its own.
- **The chosen tool folder is remembered per browser.** On another PC, choose it once there too. **Change** picks another folder, **Load again** reloads it, and **✕** stops loading a folder.
- **The folder is loaded as it is.** Keep only the current files in a tool's folder, because older copies alongside them would be loaded too. Subfolders, Google Docs and Slides files are skipped, and Google Sheets come in as .xlsx.
- **Drive keeps earlier versions** of each saved file for about 30 days: right-click the file, then **File information → Manage versions**.
- **Deleting a saved file in a browser keeps it out of that browser.** Drive keeps its copy, which comes back only when a newer one is saved, or when you press **Get from Google Drive**. To remove it everywhere, delete it in Drive's PHF Staff Hub folder too.
- **The hub takes every newer saved file** (all the masters and sets), so the first open after a build can take a minute on a slow connection.
- **To switch it off,** empty the three values again and commit. The buttons disappear, and the files in Drive stay where they are.

## If something goes wrong
| Message | Fix |
|---|---|
| "The API developer key is invalid" (in the picker) | Step 5: add `https://docs.google.com/*` to the key's websites, and make sure the Google Picker API is ticked. Then wait a few minutes. |
| "Error 400: origin_mismatch" / "redirect_uri_mismatch" | Step 4: the origin must be exactly `https://admin-phf.github.io`. |
| "Access blocked: … has not completed the Google verification process" | Step 3.6: add that Google account as a test user (External), or use a shop account (Internal). |
| "Error 403: access_denied" | Same as above, or the permission was declined. Click the button again and allow it. |
| "Google Drive read access was not allowed…" | The read permission was unticked at sign-in. Sign out (Saved files), sign in again, and allow both. |
| "The Drive folder … could not be opened — choose it again" | The folder was deleted or moved out of reach. Use **Change** to pick it again. |
| Nothing happens when you click | A pop-up was blocked. Allow pop-ups for the site (Step 8.1) and click again. |
| "Google Drive API has not been used in project … or it is disabled" | Step 2: enable the Google Drive API in this project. |
| A file is refused | It is checked like a dropped file. Use the right type (order .XLS, invoice .PDF, master .xlsx…). |
