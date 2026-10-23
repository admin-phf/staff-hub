# Google Drive for the Staff Hub — setup (Staff Hub v21.40.0, 23 Oct 2026)

Once this is set up, every tool gets:
- **From Google Drive** under "Drop all input files here". It opens Google's own file picker, and the files you choose are checked exactly as if you had dropped them.
- **Google Drive** in the Saved files (Library) panel, on the hub and in each tool:
  - **Save to Google Drive** copies the saved files (master database, Ongoing Discounts and so on) into a folder called **PHF Staff Hub** in your Drive. There is one copy per file, replaced each time.
  - **Get from Google Drive** copies any newer ones into this browser, so another PC gets the same files.
  - **Sign out**.

Until the three settings below are filled in, none of this shows, and the tools work exactly as before.

**Status:** set up on 23 Oct 2026 (Staff Hub v21.40.1).
- Google Cloud project `phf-staff-hub` (number 876421157517), with the audience set to **Internal**. Only the shop's Google Workspace accounts can sign in.
- The settings are in `assets/js/phf-drive-config.js`. The client secret is not used and must never go in the repo.

## Is it safe?
- **Sign-in is Google's own window.** The Staff Hub never sees a Google password.
- **It asks for the smallest Drive permission (`drive.file`).** The page can only open the files you pick in Google's picker and the files it saved itself, in the PHF Staff Hub folder. It cannot list or read anything else in your Drive.
- **The sign-in lasts about an hour and is kept only in the open page.** It is never saved. Closing the tab or **Sign out** ends it.
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
5. Go to **Data Access → Add or remove scopes**, tick `.../auth/drive.file` ("See, edit, create and delete only the specific Google Drive files you use with this app"), then **Update → Save**. This is a non-sensitive permission, so Google needs no security review for it.
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

## Step 8 — Test it
1. **Allow pop-ups** for `admin-phf.github.io` in Chrome. Sign-in opens a small Google window, and if it is blocked, Chrome shows a blocked-pop-up icon in the address bar.
2. **On the PC that has the files:** open the hub, then **Saved files → Save to Google Drive**.
   - Sign in, and allow "See, edit, create and delete only the specific Google Drive files you use with this app".
   - The message should read "Saved N files to Google Drive › PHF Staff Hub". A **PHF Staff Hub** folder now appears in your Drive.
3. **On another PC or browser:** open the hub, then **Saved files → Get from Google Drive**. It should say "Got N newer files…".
4. **In Reconcile CH2 Order:** under "Drop all input files here", click **From Google Drive**. Pick the order XLS and the invoice PDF from Drive (hold Ctrl to pick several). They are assigned as if dropped. A Google Sheet comes in as an .xlsx.

## Good to know
- **Use the same Google account on every PC.** Save and Get work with the PHF Staff Hub folder of the account you sign in with. A different account gets its own folder.
- **Save replaces the Drive copy each time.** Drive keeps the earlier versions for about 30 days: right-click the file, then **File information → Manage versions**.
- **Get only takes a Drive copy that is newer** than the one in this browser, so it never overwrites newer local files with older ones.
- **To switch it off,** empty the three values again and commit. The buttons disappear, and the files in Drive stay where they are.

## If something goes wrong
| Message | Fix |
|---|---|
| "The API developer key is invalid" (in the picker) | Step 5: add `https://docs.google.com/*` to the key's websites, and make sure the Google Picker API is ticked. Then wait a few minutes. |
| "Error 400: origin_mismatch" / "redirect_uri_mismatch" | Step 4: the origin must be exactly `https://admin-phf.github.io`. |
| "Access blocked: … has not completed the Google verification process" | Step 3.6: add that Google account as a test user (External), or use a shop account (Internal). |
| "Error 403: access_denied" | Same as above, or the permission was declined. Click the button again and allow it. |
| Nothing happens when you click | A pop-up was blocked. Allow pop-ups for the site (Step 8.1) and click again. |
| "Google Drive API has not been used in project … or it is disabled" | Step 2: enable the Google Drive API in this project. |
| A file you pick is refused | It is checked like a dropped file. Pick the right type (order .XLS, invoice .PDF, master .xlsx…). |
