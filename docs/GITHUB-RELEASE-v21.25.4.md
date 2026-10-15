# Staff Hub v21.25.4 — merge brand ticks on OLD BRAND / POS BRAND (16 Oct 2026 08:00 AEDT)

**Summary:** v21.25.4 — POS New Product Check Clean v1.14.10: the brand tick pair is OLD BRAND (current) / POS BRAND (new)

## Commit notes
- OUT_MERGED_DATA's POS BRAND column is the updated brand (the engine writes the supplier's brand there after Brand Name
  Changes) and OLD BRAND is what POS had; SUP BRAND is the supplier's raw word. The v1.14.0 tick pair sat on POS BRAND /
  SUP BRAND, so "CURRENT" pointed at the updated column. It is now OLD BRAND (CURRENT) / POS BRAND (NEW), NEW ticked by
  default: POS BRAND is the checked, main column; tick OLD BRAND to keep POS's brands. The keep logic itself (POS keeps
  its brand on matched products when CURRENT is ticked) is unchanged.
- Not a fault: SWITCH NUTRITION products arrive from Unique with brand `SWITCH` (the product names say SWITCH NUTRITION);
  Brand Name Changes maps SWITCH → SWITCH NUTRITION, so POS BRAND = SWITCH NUTRITION with no change and SUP BRAND shows
  the supplier's `SWITCH`.

## Files
- Changed: index.html (v21.25.4), tools/pos-supplier-merge/{index.html, js/app.js v1.14.10}, docs/ARCHITECTURE.md.
- New: docs/GITHUB-RELEASE-v21.25.4.md.

## Testing done (16 Oct)
- Merge run on the 15 Oct supplier rows: OUT heading ticks on OLD BRAND (off) / POS BRAND (on); TXT unchanged from v1.14.9.
