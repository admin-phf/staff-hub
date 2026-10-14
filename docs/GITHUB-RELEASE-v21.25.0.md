# Staff Hub v21.25.0 — site icon, development wording, horizontal navigation, global search, Staff Noticeboard

Released 14 Oct 2026 13:00 AEDT. Based on v21.24.0 (commit 4b1e7ef). The tools themselves are untouched apart from the
icon tags in their `<head>`.

## Commit notes

**Summary:** v21.25.0 — site icon, development wording, horizontal navigation with search, Staff Noticeboard (encrypted, drafts vs published)

**Description:**
- **Site icon:** the apple from the PHF logo as favicon (16 / 32 / 48), apple-touch-icon 180 and 192 / 512 app icons with a
  web manifest, on the hub and every tool page — tabs, bookmarks, phone and desktop shortcuts.
- **Password wording:** "Tool under development" prompt (being developed, tested and debugged; password access for
  testing); "Lock configuration file downloaded" with the commit-and-publish steps; set / reset / remove messages say the
  change takes effect once the file is published to GitHub. Hashing, per-tool locks and Lock are unchanged.
- **Compact landing page:** the tile board is replaced by a horizontal navigation bar (POS & Database · Orders &
  Reconciliation · Suppliers & Pricing · Resources & Information) with click-to-open dropdowns (name, status, one-line
  description, Open), a compact tool list, the noticeboard preview and the Library. Stacks into a Menu button on phones.
- **Global search** in the navigation bar: groups, tools, descriptions, statuses, Library file names and the noticeboard
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
2. **Landing page** — 2.1 the board is gone; the page is the navigation bar, noticeboard preview + tool list side by side,
   the Library and the privacy note; 2.2 dropdowns: click opens, click again closes, another heading swaps, outside click
   and Escape close, arrow keys move, `aria-expanded` / `role=menu`; 2.3 the four groups hold every existing tool and the
   three "Soon" placeholders (POS Supplier Merge is the former name of POS New Product Check Clean, not a separate tool);
   2.4 name, status, description, version, Open; 2.5 theme tokens only; 2.6 Menu button under 760 px.
3. **Search** — 3.1 in the navigation bar; 3.2 groups, tools, descriptions, status, versions, Library rows, notices;
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

## Files
- Changed: index.html, assets/css/hub.css, assets/js/phf-lock.js, docs/ARCHITECTURE.md, tools/{database-build,
  pos-supplier-merge, reconcile-ch2, supplier-contacts, update-specials}/index.html (icon tags only)
- New: site.webmanifest, assets/icons/*, assets/js/hub-nav.js, assets/js/phf-notices.js, data/notices.enc.json,
  tools/noticeboard/{index.html, README.md, js/noticeboard.js, css/noticeboard.css}, docs/GITHUB-RELEASE-v21.25.0.md
- Delete by hand (still in the repo): tools/database-build/js/size-worker.js

## Testing done (14 Oct, headless Chromium against a local copy of the repo)
- Hub: title and favicon tags resolve; four headings; dropdown opens, swaps, closes on outside click; search "reconcile"
  → Reconcile CH2 Order (Build · Orders & Reconciliation); search "armaforce" → "No matching results" while the notices
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
