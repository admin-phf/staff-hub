# Staff Hub v21.15.0 — integrity fixes (Build POS Master Databases v21.12.0, Reconcile CH2 Order v2.11.0, POS New Product Check Clean v1.6.2)

Released 12 Oct 2026 12:05 AEDT. Based on v21.14.1.

## Commit notes

**Summary:** v21.15.0 — integrity fixes: exact POS price levels, safer imports, split CH2 lines, REVIEW status

**Description:**
- Build POS Master Databases v21.12.0:
  - The POS Database keeps price levels 1–9, ret price and SOH exactly (90.08 stayed 90 before — 20,430 products).
  - The POS files are read from the heading row the check finds, headings matched by name, each column in its own place.
    The build stops with a message if a required column is missing.
  - CH2 / Unique columns are found by name; a missing column or blank cell stays blank (a blank Unique Size was written
    as "NONE" in 233 descriptions).
  - The page is locked while a build runs. An output that fails its re-open check isn't saved to the Library. Ongoing
    Discounts is checked and built from the same sheet, with a warning if no rules are read.
- POS New Product Check Clean v1.6.2:
  - Files can't change while a stage runs or the session is loading.
  - A TAB inside a cell can't shift the TXT columns.
  - Number formats are never dropped after heavy editing.
  - A refused browser save is reported.
  - Clearing Supplier Updates clears the SUP BRAND filter.
- Reconcile CH2 Order v2.11.0:
  - One product billed on several CH2 lines at the same price is one TXT line, so POSActive receives all of it; at
    different prices a SPLIT LINES note says to check it.
  - Integrity shows REVIEW (amber) when the invoice total or line arithmetic doesn't check out.
  - No match on wholesale price alone.
  - The browser asks before leaving the page while receiving counts are entered.
- Supplier Contacts README and the v21.13.1 notes: real contact / account examples replaced with dummies.
- Apps Script files unchanged.

## Files
- Changed: index.html, docs/ARCHITECTURE.md, docs/GITHUB-RELEASE-v21.13.1.md,
  tools/database-build/{index.html, js/pipeline.js, js/ch2-core.js, js/uhp-core.js},
  tools/pos-supplier-merge/{index.html, README.md, engine-frame.html, js/app.js, js/engine-host.js, js/engine-worker.js,
  js/merge-map.js, js/sheets-shim.js},
  tools/reconcile-ch2/{index.html, README.md, css/app.css, js/app.js, js/core/integrity.js, js/core/reconcile.js,
  js/export/pos-import.js},
  tools/supplier-contacts/{README.md, js/contacts.js (comment only)}
- New: docs/GITHUB-RELEASE-v21.15.0.md

## Testing done
- Build POS Master Databases on the 12 Oct real files (9 inputs): every output identical to before except POS price
  levels / ret price / SOH / item size (now with decimals) and the 233 Unique descriptions without "NONE". Variant files:
  title row + "Main ID" headings + blank heading column read correctly; a template without WSP / RRP stops with a message;
  Ongoing Discounts on a second tab recognised. A drop / Clear during Build All waits; Build All still completes.
- Library → POS New Product Check Clean (METAGENICS) and Reconcile CH2 Order run from the rebuilt Library.
- Reconcile CH2 Order: orders 105-0008845 and 105-0008843 give byte-identical POSActive TXT files to the ones already
  imported. A line split 2 + 2 at the same price → the same TXT as unsplit; at different prices → two lines + SPLIT LINES
  note; a failed footer → REVIEW (amber); leaving the page with ticks → browser prompt.
- POS New Product Check Clean: 11 Oct Google Sheet download unchanged (OUT 347 / INSERT 6 / UPDATE 327; keep RRP 260;
  every test from v1.6.0 / v1.6.1). A drop during Run All waits; a TAB in a cell → 30 fields; 5,000 extra number formats
  → TXT unchanged; a refused save is reported and "Leave site?" clears.
