# Staff Hub v21.10.0 — Staff Hub Library (files shared between tools in this browser)

Released 10 Oct 2026 19:40 AEDT. Based on v21.9.0.

## Commit notes

**Summary:** v21.10.0 — Staff Hub Library: tools save and reuse each other's files in this browser

**Description:**
- New Staff Hub Library (assets/js/phf-library.js): files saved in this browser and shared by the tools, so they
  don't need dragging in again. Nothing is uploaded; each browser / PC has its own Library.
- Build Master Databases v21.10.0: saves the POS Database, CH2 / Unique supplier imports, full and selected masters
  and the To-Order file when a build finishes; Brand Abbreviation, Weight & Dimensions and Ongoing Discounts are
  saved once and reload when the page opens.
- POS Supplier Merge v1.3.0: the POS Database, supplier imports and Ongoing Discounts fill in on open
  ("From the Library · built …", amber when over a day old). ✕ stops a file loading until the next build.
- Reconcile CH2 Order v2.9.2: uses the full merged master from the Library automatically; clearing its reference
  files no longer clears the rest of the Library.
- Home page: Library panel listing every saved file with Download, ✕ and Delete all.

## Testing done
- Build All in Build Master Databases (real 10 Oct inputs): 6 outputs + 3 reference files saved (49 MB); reopening
  the page reloads the 3 reference files.
- POS Supplier Merge opened afterwards: POS Database (34,252 rows), CH2 + Unique imports (14,529 rows) and Ongoing
  Discounts loaded with no dropping; ✕ on Supplier Updates + reload keeps them out, POS Database still loads.
- Reconcile CH2 reads the saved full master (23.4 MB). Home page panel: Download, ✕ and Delete all work.
- No page errors in any tool.
