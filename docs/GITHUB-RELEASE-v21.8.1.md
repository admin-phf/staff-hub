# Staff Hub v21.8.1 — POS Supplier Merge engine v6.3.88 (discontinued brand scope)

Released 10 Oct 2026 14:45 AEDT. Based on v21.8.0.

## Commit notes

**Summary:** v21.8.1 — discontinue unmatched POS products under every POS name of an uploaded brand (merge v6.3.88)

**Description:**
- POS Supplier Merge engine 1.3 Merge v6.3.88 (the same file as the Google Sheet): when a supplier list or
  catalogue is merged, POS products of those brands that aren't in it are discontinued (ZZZZ) even when POS names
  the brand differently — the 20-character POS brand (BIOCEUTICALS CLINICA), or a POS brand the upload's barcodes
  match (AUSTRALIAN BUSH FLOW for BUSH FLOWER, MELROSE ORGANIC for MELROSE).
- Placeholder POS brands (DISCONTINUED, UNKNOWN, BOOK…) are never linked; SPECIAL ORDER / NO REORDER products stay
  protected. Linked rows say why in NOTES; the build message counts them. Filtered-brand build included.
- POS Supplier Merge v1.1.1 runs the new engine. No other tool changed.

## Testing done
- 34,252 POS rows + full CH2 list (9,682 rows): all v6.3.87 OUT rows unchanged; 440 more discontinued rows from
  48 linked POS brand names (e.g. AUSTRALIAN BUSH FLOW 95, BIOCEUTICALS CLINICA 9); all reach the POS UPDATE file.
- Bioceuticals + Bioceuticals Clinical + Bush Flower upload: every POS row of those brands is now matched or
  discontinued (only SPECIAL ORDER rows kept). Filtered-brand build gives the same result as the full build.
- Standard test data: POS INSERT / UPDATE TXT files byte-identical to v6.3.87.
