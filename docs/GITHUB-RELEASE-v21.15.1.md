# Staff Hub v21.15.1 — Build POS Master Databases v21.12.1

Released 12 Oct 2026 12:30 AEDT. Based on v21.15.0.

## Commit notes

**Summary:** v21.15.1 — Build POS Master Databases v21.12.1: dropped files kept in memory, so Build All can't lose them

**Description:**
- Every file dropped in Build POS Master Databases is copied into the page's memory straight away. Moving, renaming,
  deleting or re-exporting it on the computer afterwards (e.g. POSActive writing BROWSESTOCKITEMS1.XLS again, a Downloads
  clean-up) no longer stops Build All with "A requested file or directory could not be found at the time an operation was
  processed".
- If a file can't be read when it is dropped, the message names it and says to drop it again.
- When Build All stops, the stage that failed shows Error on its card (it stayed on "Reading…").
- Outputs are unchanged.

## Files
- Changed: index.html, docs/ARCHITECTURE.md, tools/database-build/{index.html, js/pipeline.js}
- New: docs/GITHUB-RELEASE-v21.15.1.md

## Testing done
- Real 12 Oct files dropped, then BROWSESTOCKITEMS1 changed on disk and the Unique export deleted before Build All:
  v21.12.0 stopped ("…could not be read…"); v21.12.1 builds all 9 outputs, identical to the normal build.
- A template without WSP / RRP in Build All → the POS card shows Error with the message.
