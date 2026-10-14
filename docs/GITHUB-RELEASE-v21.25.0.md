# Staff Hub v21.25.0 — site icon, development wording, navigation band, global search, Staff Noticeboard, Supplier Contacts v1.2.0, Reconcile v2.11.3

Released 14 Oct 2026 13:00 AEDT. Based on v21.24.0 (commit 4b1e7ef). The tools themselves are untouched apart from the
icon tags in their `<head>`.

## Commit notes

**Summary:** v21.25.0 — site icon, navigation band with search, Staff Noticeboard, Supplier Contacts archive + column filters, Reconcile search

**Description:**
- **Site icon:** the apple from the PHF logo as favicon (16 / 32 / 48), apple-touch-icon 180 and 192 / 512 app icons with a
  web manifest, on the hub and every tool page — tabs, bookmarks, phone and desktop shortcuts.
- **Password wording:** "Tool under development" prompt (being developed, tested and debugged; password access for
  testing); "Lock configuration file downloaded" with the commit-and-publish steps; set / reset / remove messages say the
  change takes effect once the file is published to GitHub. Hashing, per-tool locks and Lock are unchanged.
- **Compact landing page:** a navy navigation band under the page header — ten equal-width tabs (the tool's board icon
  over its name) in Kenneth's order: Customer Special Orders, Bread Orders (new placeholder), Supplier Contacts, New
  Products, Resources, Staff Noticeboard, Reconcile CH2 Order, Build POS Master Databases, Update Specials, POS New
  Product Check Clean. A tab is a link: click opens the tool straight away (a locked tool still asks for its password on
  its own page); hovering or tabbing to it shows a panel with the description, status and version. "Coming soon" tabs are
  dimmed and do nothing. The tile board is gone. Below: the noticeboard preview (up to six notices, three across on wide
  screens), two placeholder cards (New products, Upcoming events) and the Library as a compact table with its explanation
  behind "What is this?". Stacks into a Menu button on phones.
- **Global search** on its own row under the tabs: tools, descriptions, statuses, Library file names and the noticeboard
  (titles, summaries, content once the passphrase is in). Runs in the browser only; protected tools still ask for their
  password.
- **Staff Noticeboard** (`tools/noticeboard/`): title, dates, category, priority (Urgent / Important / Information /
  Pending), summary, full content, action required, links; search, category / priority filters, active / archived, sort.
  Notices live in ONE encrypted file, `data/notices.enc.json` (AES-GCM, key from a staff passphrase) — readable only in a
  browser that has the passphrase. **Published** (on GitHub, seen by all) and **drafts** (this browser only) are always
  told apart; publishing is Download notices file → commit, or Publish to GitHub with a fine-grained token kept only in
  that browser. First notice: Andrographis – Product Withdrawals & Recalls, word for word.

## What was done under each section of the brief
1. **Password protection** — 1.1 prompt wording; 1.2 "In development" status on the navigation items, tool list and search
   results (`PHFLock.mark`, `data-tool`), with the supporting description on hover; 1.3 / 1.4 download message and the five
   steps; 1.5 nothing functional changed (phf-lock.js v1.2.0).
2. **Landing page** — 2.1 the board is replaced by the navigation band (one tab per tool, as Kenneth asked — not the
   four category groups first suggested; equal-width tabs after the two-row and scrolling versions looked unbalanced), the noticeboard preview, the placeholders, the Library and the privacy note; 2.2 click opens the tool, the panel shows on
   hover / focus (`role=tooltip`), Left / Right move between tabs, Escape drops focus; 2.3 every existing tool and the three "Soon" placeholders are headings (POS Supplier Merge is the former name of POS New Product Check Clean, not a separate tool);
   2.4 name, status, description, version, Open; 2.5 theme tokens only (navy band, gold icons); 2.6 Menu button under 760 px.
3. **Search** — 3.1 its own row under the tabs; 3.2 groups, tools, descriptions, status, versions, Library rows, notices;
   3.3 results as you type, Enter / arrows, clear button, "No matching results", index rebuilt when the Library or the
   notices change; 3.4 local only, nothing uploaded, no tool runs; 3.5 protected tools show In development and go through
   the password prompt.
4. **Noticeboard** — 4.1 layout and fields; 4.2 the five categories plus "Other" when adding; 4.3 the four priorities,
   restrained colours; 4.4 structured data (`data/notices.enc.json`), editor for authorised staff (passphrase), drafts vs
   published, download / publish; 4.5 search, filters, sort, archived; 4.6 the landing-page preview (urgent first).
5. **Andrographis notice** — all four supplier sections, the six batch numbers, dates, statuses and the general
   instructions as supplied; "Herbs of Gold" stays "not confirmed".
6. **Integration** — no tool code changed; `hub-nav.js`, `phf-notices.js`, `tools/noticeboard/` are separate from the
   processing engines; the Library panel and lock behaviour are as before.

## Supplier Contacts v1.2.0 — archive instead of delete, column filters
- Nothing is deleted any more. The row button (and the Archive button in the edit dialog) archives the contact: it is
  struck through, grey, and moves to an **Archived** section at the bottom of the list, which stays visible whatever the
  search or column filters say. **Restore** (row button or dialog) brings it back to its section; **Undo** reverses either.
- The downloaded .xlsx / .csv gains a **Status** column (`Active` / `Archived`); archived rows sit last, struck through and
  grey in Excel, so another computer loads the same list. A file without a Status column loads with everything active.
- A filter box under every column heading narrows that column — words all match, digits match phone numbers
  (`0400000002` finds 0400 000 002) — together with the search box. The ✕ at the left of the filter row clears them all.
  The heading and filter rows both stay in view when the list scrolls.
- Files: tools/supplier-contacts/{index.html, js/contacts.js v1.2.0, css/contacts.css v1.1.0, README.md}.

## Reconcile CH2 Order v2.11.3 — search box over the result table
- A search box beside the View buttons hides the rows that do not contain every word typed, in POS layout, Exceptions
  and All lines. Section headings and the totals row stay; counts, ticks, Found quantities and every download are
  unchanged — it only changes what is on screen. Esc clears it; it is re-applied after each redraw.
- Files: tools/reconcile-ch2/{index.html, js/app.js v2.11.3, css/app.css, README.md}. Nothing in the reconciliation
  itself changed (same run: 104/106 matched, Integrity PASS on the 74147128 test order).

## Navigation
- The **In development** badge no longer sits on a tab (it took a whole extra line); the hover panel and the search
  results still show it (hub-nav.js v1.1.1, hub.css v21.25.6).

## Files
- Changed: index.html, assets/css/hub.css, assets/css/library.css, tools/supplier-contacts/{index.html, js/contacts.js, css/contacts.css, README.md}, tools/reconcile-ch2/{index.html, js/app.js, css/app.css, README.md}, assets/js/phf-lock.js, docs/ARCHITECTURE.md, tools/{database-build,
  pos-supplier-merge, reconcile-ch2, supplier-contacts, update-specials}/index.html (icon tags only)
- New: site.webmanifest, assets/icons/*, assets/js/hub-nav.js, assets/js/phf-notices.js, data/notices.enc.json,
  tools/noticeboard/{index.html, README.md, js/noticeboard.js, css/noticeboard.css}, docs/GITHUB-RELEASE-v21.25.0.md
- Delete by hand (still in the repo): tools/database-build/js/size-worker.js

## Testing done (14 Oct, headless Chromium against a local copy of the repo)
- Supplier Contacts (made-up 4-row file): archive → row struck through under the Archived divider, count "1 archived";
  Supplier filter "gam" shows Gamma only with the archived row still at the bottom ("Showing 1 of 3"); Phone filter
  "0390000001" finds "03 9000 0001"; clear-filters ✕; .csv and .xlsx downloads carry Status (Archived last); reload from
  the Library keeps the archive; dialog button reads Restore and restores; Undo re-archives.
- Reconcile (real 74147128 order + invoice, master and Ongoing Discounts): run unchanged (104/106 matched, Integrity
  PASS, 6 exceptions); search "pukka" → "1 of 109" rows with the section rows kept; Exceptions view "0 of 8"; Esc clears.
- Hub: title and favicon tags resolve; ten tabs in one row at 1920 / 1440 / 1366 px, search row beneath; hovering a tab
  shows its panel, moving away hides it; clicking Supplier Contacts opens the tool, clicking Bread Orders stays on the hub;
  the Library renders three seeded files as table rows; search "bread" → Bread Orders (Soon); search "reconcile" →
  Reconcile CH2 Order; search "armaforce" → "No matching results" while the notices
  are locked, the Andrographis notice once the passphrase is in; In development on both POS New Product Check Clean
  entries; no horizontal overflow at 400 px; Menu button stacks the groups.
- Noticeboard: wrong passphrase → "That passphrase is not right."; right one opens; status strip shows Published 1 /
  Drafts none; the notice expands with every batch number, DO NOT SELL, "not confirmed" and the Customer Response Form
  lines present; Add notice → saved as "Draft · new", strip shows 1 change in this browser only; Download notices file →
  notices.enc.json with count 2; headings, lists, steps and bold render.
- Password prompt on the merge tool reads "Tool under development …"; the merge, Build, Reconcile, Supplier Contacts and
  Update Specials pages load as before (the only console failures are the CDN scripts the sandbox cannot reach and the
  Update Specials image probes, both pre-existing).

## Limitations and things to do on first use
- **Starter passphrase:** the seed file is encrypted with `PHF-notices-2026`. Change it from Passphrase… on the
  noticeboard before telling staff, then commit (or publish) the new file.
- **Publish to GitHub** needs a fine-grained token (admin-phf/staff-hub, Contents: read and write) saved in that browser;
  it was not exercised against GitHub here (no token in the sandbox) — the download route was.
- The repository is public, so the encrypted file is visible; its contents are not. GitHub Pages takes a minute or two
  after a commit; drafts clear by themselves when the published file matches them.
- Attachments are links (a URL per line); files themselves are not stored in the repo.
- The brief listed "POS Supplier Merge" as a separate tool — it is the earlier name of POS New Product Check Clean.
