# Staff Hub v21.12.0 — editable merge sheets, Google Sheet look, password lock

Released 11 Oct 2026 15:50 AEDT. Based on v21.11.0.

## Commit notes

**Summary:** v21.12.0 — editable merge sheets, Google Sheet look and password lock; merge v6.3.89 brand + size fixes

**Description:**
- POS Supplier New Product Check and Clean Merge v1.5.0: every workbook tab except TMP_MERGED_POS_DATA is editable like
  the Google Sheet (type, paste, add / delete rows, undo).
  - SRC_ tabs (Find & Replace, Ongoing Discounts, Brand Name Changes, Product Prefixes, Suppliers) save to this browser
    straight away; run the stages again to use them.
  - OUT_MERGED_DATA edits run the Sheet's own onEdit (fake barcode for NEW, UPDATED SUPPLIER queued, FINAL SHELF RRP
    follows RRP / MARKUP OVERRIDE); Refresh supplier changes and Run stage 3 again buttons.
  - OUT_POS_INSERT / UPDATE edits go into the TXT files with Export TXT again.
- The tabs and the review workbook look like the Google Sheet: navy row-1 totals band with gold text, column letters,
  headings with filter buttons, banded rows and OUT_MERGED_DATA's colours (price up red, down blue, higher RRP green,
  ☑ / ☒ checks, FINAL SHELF RRP two lines, low-GP markup orange, OLD BRAND amber).
- Optional password lock: Set password on the merge tool makes assets/js/phf-lock-config.js to commit (stores a salted
  hash only); the tool then asks for the password once per browser and its hub tile shows LOCKED.
- Merge engine 1.3 Merge v6.3.89:
  - A brand shortened for the 20-character POS field (BLACKMORES PROF = BLACKMORES PROFESSIONAL) is the same brand:
    no brand change, its discount and prefix apply.
  - A bare supplier count like "(60)" takes the POS form for the same count: 60T / TABLETS, BIOC CLIN METHYL BIOACTIVE 60T.
- Fix: the engine's Sheet stand-in now tells a sheet from an onEdit event, so UPDATED SUPPLIER edits show SUP OVERRIDE PENDING.

## Files
- Changed: index.html, docs/ARCHITECTURE.md, docs/THEME.md, tools/pos-supplier-merge/{index.html, README.md, engine-frame.html,
  css/merge.css, engine/1.3-merge.js, js/app.js, js/engine-host.js, js/engine-worker.js, js/sheet-grid.js, js/sheets-shim.js}
- New: assets/js/phf-lock.js, assets/js/phf-lock-config.js, tools/pos-supplier-merge/js/sheet-look.js,
  docs/GITHUB-RELEASE-v21.12.0.md
- Apps Script: replace the 1.3 - Merge file with the delivered `1.3 - Merge.gs` (v6.3.89). The other three files stay.

## Testing done
- Engine on the 11 Oct Google Sheet export (371 supplier rows, 34,280 POS rows): v6.3.88 still matches the Sheet
  exactly; v6.3.89 changes only the 25 Blackmores Professional rows (brand kept, 22.5% discount, BM PROF prefix) and
  135 Bioceuticals size / form / description rows; OUT_POS_INSERT unchanged.
- Second run with a 14,506-row supplier list: only shortened-brand rows (NATURAL VANILLA COMP, SACRED EARTH MED, …) and
  bare-count rows changed; no price-level changes.
- Browser: edits on every tab, undo, paste, add / delete rows, column filters, totals with filters, Refresh supplier
  changes, Run stage 3 again, Export TXT again (edits in the TXT), TMP read-only, SRC edits saved and reset the stages,
  typing into an empty SRC tab, review workbook row 1 totals; password set / wrong / right / remembered / Lock and the hub
  badge. No page errors.
