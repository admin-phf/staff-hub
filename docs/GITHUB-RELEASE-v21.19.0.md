# Staff Hub v21.19.0 — POS New Product Check Clean v1.9.0: totals follow the filters, required reference tables, ✕ on every rail

Released 13 Oct 2026 16:00 AEDT. Based on v21.18.0.

## Commit notes

**Summary:** v21.19.0 — Merge totals follow the filters, supplier names filled at stage 1, required refs, ✕ on every rail

**Description:**
- POS New Product Check Clean v1.9.0: the row-1 totals on every tab now count only the rows shown after a search or column
  filter, and each keeps its own kind. For example, POS BRANDS is the number of different brands (1 when filtered to one
  brand), TOTAL ROWS is the rows shown and the $ totals are sums of the rows shown. On TMP_MERGED_POS_DATA, price × SOH is
  labelled STOCK VALUE @ WSP / @ LAST PRICE.
- The rows badge counts the column filters too ("55 OF 604 ROWS").
- Stage 1 fills in a blank POS SUPPLIER NAME (B) from POS Suppliers by the POS SUPPLIER NUMBER (C), e.g. 134 → OBORNE / CH2.
  Names already there are kept.
- Brand Name Changes, Product Prefixes, POS Suppliers and Ongoing Discounts are now required. Find & Replace stays optional.
- Hovering a selected (navy) button keeps white text on a darker navy.
- Build POS Master Databases v21.14.2 and Reconcile CH2 Order v2.11.2: each loaded input row in the left rail has its own
  ✕, as in the merge tool, and removes it straight away.
- Merge results unchanged.

## Files
- Changed: index.html, assets/css/theme.css, docs/ARCHITECTURE.md, tools/database-build/{index.html, js/pipeline.js},
  tools/reconcile-ch2/{index.html, README.md, js/ui/workspace.js}, tools/pos-supplier-merge/{index.html, README.md,
  js/app.js, js/merge-map.js, js/sheet-look.js}
- New: docs/GITHUB-RELEASE-v21.19.0.md
- Delete by hand: tools/database-build/js/size-worker.js (no longer used).

## Testing done (13 Oct, real files)
- **Required tables:** with only the POS Database loaded, the badge shows 1 / 6 REQUIRED and stage 1 and Run all stages are
  disabled. After the reference tables are dropped, the badge shows 6 / 6.
- **Supplier names:**
  - 347 CH2 rows were pasted with B blank, then Run all stages: all 347 now show OBORNE / CH2.
  - The title band says "POS SUPPLIER NAME filled in for 347 rows".
  - The SUPPLIER NAMES total went from 0 to 1.
- **OUT_MERGED_DATA, filtered to POS BRAND = BIOPRACTICA:**

  | Total | Before | After |
  |---|---|---|
  | Badge | 604 OF 604 | 55 OF 604 |
  | TOTAL ROWS | 604 | 55 |
  | POS BRANDS | 14 | 1 |
  | POS SUPPLIERS | 5 | 2 |
  | NEW WSP | $10,809.56 | $2,428.74 |
  | FINAL SHELF RRP | $27,927.95 | $4,017.55 |

- **OUT_POS_UPDATE, searched "BIOP":**

  | Total | Before | After |
  |---|---|---|
  | Badge | 542 ROWS | 76 OF 542 ROWS |
  | UNIQUE BRANDS | 13 | 2 |
  | TOTAL WS | $13,523.37 | $2,825.24 |

- **Hover:**
  - The selected Sheet button stays navy (#244670) with white text.
  - Every button on the hub, Build, merge (before and after a run, on each tab), Reconcile (after a run) and Supplier
    Contacts was hovered: none drops below 3:1 contrast. Empty workbook tabs stay grey on purpose.
- **Build:** 9 ✕ shown. ✕ on Weight & Dimensions sets it back to Optional, the open panel stays and the badge reads 4 / 4 READY.
- **Reconcile:**
  - 4 ✕ shown.
  - ✕ on Supplier invoices sets it to Required and disables Run.
  - ✕ on the order and on POS / master sets both to Required.
- **Merge results:** METAGENICS was run from the Library with RRP kept and the reference tables loaded. The POS INSERT and
  POS UPDATE TXT files are byte-identical to v21.18.0, and the review workbook matches apart from the run time.
- **Other checks:** every hub page loads without errors, and the Update in POS ticks and cell edit / Undo tests pass.
