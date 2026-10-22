# Staff Hub v21.40.0 — fix lines stay in place with an orange warning, ticking a not-invoiced line receives it, the totals update at once, and Google Drive (optional) (23 Oct 2026 10:30 AEDT)

**Summary:** v21.40.0 — In Reconcile CH2 Order:
- A line to fix in POSActive now stays where it is in the checklist with the other invoiced lines. An orange warning row sits straight above it, saying what is wrong and what to change, and there are no copies at the top.
- Ticking a not-invoiced line now receives it. The ordered quantity goes into Found and into the POSActive TXT, and the totals move straight away. You no longer type the quantity yourself.
- The footer totals, Found total, progress, row total and Check update the moment you tick, count or change something.

New and optional: Google Drive. Once it is set up (docs/GOOGLE-DRIVE-SETUP.md):
- Each tool gets **From Google Drive** under "Drop all input files here".
- The Saved files panel gets **Save to / Get from Google Drive**, so every PC has the same master and discount files.

Google Drive stays hidden until it is set up. With nothing changed, every export is byte for byte the same as before.

## Reconcile CH2 Order v2.22.0
- **Lines to fix in POSActive stay in the main list** (your request: "this item is in the invoice so it should be in the main part").
  - The line stays in its normal place (Remaining, then Completed), tinted orange with an orange bar on the left. The cell to fix (for example POS Sub ID "3 PER SKU 25%") stays red.
  - Straight above it is an **orange warning row**: a chip (**POSACTIVE CAN'T IMPORT**, **BLANK SUB ID**, **SHARED SUB ID**, **MATCH LOW** or **GST DIFFERS**), then what to change. For example: "Change the Sub ID in POSActive (e.g. to CH2 code 2650314), re-export the order and reconcile again — or apply this line by hand."
  - The warning stays inside the visible width when the table scrolls sideways. It hides with its line when a search or filter hides the line, and it goes once the line is completed.
  - The copies at the top of the checklist (v21.39.0) are removed. The "Fix in POSActive" chip in the summary is orange too.
- **Ticking a not-invoiced line receives it, like other rows.**
  - Found fills with the ordered quantity at once (for example NATUROBEST IRON BRAIN 30C: 4).
  - It goes into the POSActive TXT as a manual receiving line at the expected price (4 × $14.51 = $63.84 inc GST).
  - The row total and the footer totals move straight away. The line stays in its Not invoiced section.
  - To change the count, type in Add Qty / Found as on any row. **Add Qty 0** marks it not supplied.
  - **ALL no longer ticks not-invoiced lines.** Each one is a deliberate decision, like INV (billed, not on the order) lines. The section bar says so.
  - Check reads "Received 4 — in the TXT as a manual line at that price", "Marked not supplied." or what to do.
- **Totals update at once** (your note: "this total information isn't updating"). Ticking, ALL, Add Qty, Found or Adj Qty update these immediately, instead of after the short re-sort:
  - The footer's Current · Adjusted · Not invoiced · Combined.
  - The Found total.
  - "Accounted N / N".
  - The row's Total inc GST, Check, the POSActive balance and the summary chips.

## Google Drive (optional — new)
Nothing shows until the three Google settings are in `assets/js/phf-drive-config.js`. **docs/GOOGLE-DRIVE-SETUP.md** walks through getting them (about 15 minutes in Google Cloud).
- **From Google Drive** under "Drop all input files here", in all three tools. It opens Google's own picker (hold Ctrl for several files), and the files are checked exactly as if they had been dropped. A Google Sheet comes in as .xlsx.
- **Saved files panel** (hub and tools): **Google Drive · signed in / not signed in**, then:
  - **Save to Google Drive:** the panel's files go into a "PHF Staff Hub" folder, one copy per file, replaced each time.
  - **Get from Google Drive:** copies newer copies into this browser, and never overwrites newer local files with older ones.
  - **Sign out.**
- **Security.** The sign-in is Google's own window, so the hub never sees a password.
  - It asks only for `drive.file`. The page can open only the files you pick and the ones it saved itself, and nothing else in Drive.
  - The sign-in lasts about an hour, is kept only in the open page and is never saved. Sign out revokes it.
  - Files go straight between Google Drive and the browser. No business data is in the repo.
  - The three settings are public by design and locked to `https://admin-phf.github.io`.

## Build POS Master Databases v21.23.0 · POS New Product Check Clean v1.25.0
- Version, plus the Google Drive scripts (hidden until set up). There is no other change.

## Files
- Changed:
  - index.html (hub v21.40.0)
  - assets/js/hub-library.js (v2.2.0), assets/css/library.css (v2.1.0)
  - tools/reconcile-ch2/index.html, js/app.js, css/workspace.css (v2.22.0)
  - tools/database-build/index.html, js/pipeline.js (v21.23.0)
  - tools/pos-supplier-merge/index.html, js/app.js (v1.25.0)
  - docs/ARCHITECTURE.md
- New:
  - assets/js/phf-drive.js, assets/js/phf-drive-config.js (empty settings)
  - docs/GOOGLE-DRIVE-SETUP.md, docs/GITHUB-RELEASE-v21.40.0.md
- Unchanged: the reconcile engine and export modules; the merge engine, merge-map.js and the Apps Script files; phf-library.js.

## Tests run (23 Oct, headless Chromium, real files)
- **No changes = the same files.** Invoices 74154567 (19 lines, 1,860 px) and 74147128 (109 lines, 1,440 px) were run, then ALL was ticked:
  - POSActive TXT, Full Reconciliation.csv and POS key review.csv: identical to v21.35.3.
  - The .xlsx files: identical apart from the creation time.
  - The checklist width is unchanged: 1,759 px fits; 1,750 px scrolls at 1,440.
- **Fix lines** (74154567):
  - ORA HORMONAL BAL 150G CHOCOLATE stays in Remaining, tinted orange, with the warning row above it and the red POS Sub ID. There are no copies.
  - Searching "META" hides the line and its warning together.
  - On 74147128 at 1,440 px, the warning text stays inside the visible width.
- **Not invoiced** (74154567):
  - Ticking NATUROBEST filled Found with 4 at once, and the row total became 63.84.
  - The footer went from "ADJUSTED $0.00 · NOT INVOICED $57.77" to "ADJUSTED $63.84 · NOT INVOICED $0.00".
  - The TXT has line 20: 4 · 15.77 · 14.5100 · 58.04 · 5.80 · 63.84 · 8.00.
  - ALL left it unticked ("Accounted 18 / 19"), and Add Qty 0 then gave "Accounted 19 / 19".
  - A changed Found moved the footer at once (ADJUSTED $1,343.17, +$46.96 vs invoice).
- **Google Drive** (with a stand-in for Google's sign-in, picker and Drive):
  - **Picker settings:** it got the project number, token and key, in list view.
  - **Reconcile:** the order XLS and invoice PDF picked "from Drive" were assigned and reconciled.
  - **Build POS Master Databases and POS New Product Check Clean:** Ongoing Discounts picked "from Drive" was recognised as if dropped.
  - **Save to Google Drive:** "Saved 2 files to Google Drive › PHF Staff Hub". Saving again replaced the same 2 files.
  - **Get from Google Drive** (hub): "Got 2 newer files from Google Drive (Full merged master, Ongoing Discounts)". Getting again said "Up to date…".
  - **Sign out** revoked the token. Every Drive call carried the sign-in.
- **With the settings empty** (as shipped), on the hub and all three tools:
  - No Google buttons.
  - No request to any Google address.
  - No missing files.
- Zero page errors in every run.

## Not run
- Real Google sign-in and Drive. That needs your Google Cloud settings, so test it with docs/GOOGLE-DRIVE-SETUP.md step 8.
- Chrome on your PC (headless Chromium only); widths below 1,200 px.
