# Staff Hub v21.13.1 — Supplier Contacts v1.1.0

Released 12 Oct 2026 07:45 AEDT. Based on v21.13.0.

## Commit notes

**Summary:** v21.13.1 — Supplier Contacts: no Index / 100% GST / Min Order columns, all values kept as text

**Description:**
- Supplier Contacts v1.1.0: the Index, 100% GST and Min Order columns are removed from the page, the add / edit form and
  the downloads. A saved list or file that still has them opens without them (the saved list is saved again).
- Everything is text: numbers are read exactly as stored (e.g. 12345, not $12,345.00; 98765432, not 98,765,432), and every
  column of the .xlsx download is formatted as Text so Excel does not reformat them.
- New Supplier_Contacts.xlsx (not committed): same 805 contacts, 8 columns, the two account numbers shown as money / with
  commas fixed.

## Files
- Changed: index.html (hub version and tile), tools/supplier-contacts/{index.html, README.md, js/contacts.js},
  docs/ARCHITECTURE.md
- New: docs/GITHUB-RELEASE-v21.13.1.md

## Testing done
- A list saved by v1.0.0 opens with 8 columns and is saved again without Index / 100% GST / Min Order.
- The new file loads 805 contacts; the account numbers show as plain digits and search finds them.
- A file with a currency-formatted, comma-formatted and date-formatted cell reads 12345, 98765432 and 1/08/2023.
- Downloads (.xlsx / .csv) match the file cell for cell; every .xlsx cell is Text. No page errors.
