# Staff Noticeboard v1.0.0 (Staff Hub v21.25.0)

Updated 14 Oct 2026 13:00 AEDT.

Recalls, supplier updates, store operations and announcements for staff. Each notice has a title, date posted / updated,
category, priority (Urgent / Action required · Important · Information · Pending confirmation), a short summary, the full
content, an optional Action required box and optional links. Search by title, summary or content; filter by category and
priority; Active, Archived or All; sort by date, priority or title. The landing page shows the most urgent / recent four.

## Private to staff
The notices are published as one encrypted file, `data/notices.enc.json`, in the repository. GitHub Pages serves it to
anyone, but it can only be read in a browser that has the **staff passphrase** (entered once; Forget on this browser
clears it). Change the passphrase with **Passphrase…** — every notice is re-encrypted, the new file is downloaded, and it
must be committed (or published) before the old passphrase stops working.

## Published vs drafts — nothing is shared until it is published
- **Published** = what is in `data/notices.enc.json` on GitHub. Everyone with the passphrase sees it.
- **Draft** = a notice added, edited, archived or removed in *this browser*. It shows an amber **Draft** label and a count
  in the status strip. Nobody else sees it.
- To publish: **Download notices file** → replace `data/notices.enc.json` in the repository with GitHub Desktop, commit and
  push (like the password configuration file); or **Publish to GitHub**, which commits the file from the browser with a
  fine-grained GitHub token (repository admin-phf/staff-hub, Contents: read and write) kept only in that browser
  (**GitHub token…**, Forget token). GitHub Pages updates within a minute or two; drafts clear by themselves once the
  published file matches them.

## Writing a notice
Headings `## ` and `### `, lists `- `, steps `1. `, `**bold**`, links `[text](https://…)`, a blank line between
paragraphs. The words are kept exactly as typed. Links / attachments: one per line as `Label | https://…`.
