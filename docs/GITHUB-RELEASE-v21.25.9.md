# Staff Hub v21.25.9 — more merge description clean-up (16 Oct 2026 21:15 AEDT)

**Summary:** v21.25.9 — POS New Product Check Clean v1.16.2 / engine-host v1.7.4: ZZ glued to a word, a prefix word repeated after the prefix block, a phrase repeated with one word between and the brand repeated last are cleaned out of POS DESCR

## Commit notes
- engine-host v1.7.4 (Apps Script files unchanged): `cleanDescr` strips a `ZZ` glued to a word in a ZZZZ description
  (`ZZZZ ZZSHARK CARTILAGE 100C` → `ZZZZ SHARK CARTILAGE 100C`); drops a prefix word repeated straight after the prefix
  block (`NOW FOODS NOW VIT D3`, `ETH NUTS ETH GLUC`, `CATHAY HERBAL PRACT HERBAL AGA`, `BYRON BAY TALLOW BAY`, `CHIEF BAR
  BEEF BAR`) but not after a connecting word (`SOW N SOW`), not a real doubled word (`KIN KIN`, `GO GO`) and not
  `PROT SUPP PEA PROT ISO`; the repeated-phrase search allows one word between (`PROTO WHEY FF PROTO WHEY 1LB CHOC` →
  `PROTO WHEY FF 1LB CHOC`); the first word repeated as the last word goes (`ESSENZZA EAR CANDLES 1PAIR ESSENZZA`).
- app.js v1.16.2 (`TOOL_VERSION`, loaders at ?v=1.7.4); engine-worker / engine-frame load engine-host ?v=1.7.4.

## Files
- Changed: index.html (v21.25.9), tools/pos-supplier-merge/{index.html, README.md, engine-frame.html, js/app.js v1.16.2,
  js/engine-host.js v1.7.4, js/engine-worker.js}, docs/ARCHITECTURE.md.
- New: docs/GITHUB-RELEASE-v21.25.9.md.

## Testing done (16 Oct, headless Chromium)
- 16 Oct POS set + the second review's 516 supplier rows: 507 matched, 0 new, no errors; 47 descriptions change against
  v21.25.8, all repeats (`CHIEF BAR COLL BAR CHOC PISTC` → `CHIEF BAR COLL CHOC PISTC`, `ETCH SPARKLING SPARK HNY 275ML` →
  `ETCH SPARKLING HNY 275ML`, `MARCO POLOS TREASUR POLOS` → `MARCO POLOS TREASUR`, `OMEGA NUT SPORT NUT PROT 600G` →
  `OMEGA NUT SPORT PROT 600G`, the seven `PROTO WHEY FF WHEY …` rows); no `ZZ` glued marker left in any row.
- 13 Oct POS DB + 15 Oct review: counts unchanged (1,754 matched / 195 new / 35 review, 192 insert / 1,754 update);
  8 descriptions change — the six `PROT SUPP PEA …` rows keep their product `PROT`, two Sandra Cabot book titles lose the
  trailing `CABOT`.
- Node check of `cleanDescr` on the samples above plus `SOW N SOW GIFT OF SEEDS`, `KIN KIN LEM MINT 25TB`, `GO GO BARS`
  (unchanged).
