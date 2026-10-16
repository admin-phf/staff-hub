# Staff Hub v21.25.8 — merge descriptions cleaned on the sheet (16 Oct 2026 18:30 AEDT)

**Summary:** v21.25.8 — POS New Product Check Clean v1.16.1 / engine-host v1.7.3: the description clean-up runs on OUT_MERGED_DATA itself — no ZZZZ marker inside a description, no repeated leading phrase, no abbreviation beside its word, no size written twice

## Commit notes
- engine-host v1.7.3 (Apps Script files unchanged): `cleanDescr` is applied to every OUT_MERGED_DATA row in `refineForms`
  (matched and ZZZZ rows; the POS rows still get it in the upload checks) with new rules: inner ZZZ… markers removed
  (glued or alone; a leading `ZZZZ ` kept; a lone `Z` dropped); a repeated leading phrase of 1–3 words, optionally with THE
  between (`3 BEES THE 3 BEES`); an abbreviation adjacent to its full word in the first three tokens, either order
  (`FRONTIER FRONT`, `BIOL BIOLOGIKA`), 5+ letters for the short form; a size token repeating an earlier one with the same
  number in another spelling (`SIZE_ALIAS`: GM / CAPS / TABS / PACK …). `DOUBLED` gains KIN, CAMU, LUM, MULLA, PERI,
  GUMBI, KAVA, MIRROR.
- Found on the 16 Oct review workbook (34,283 rows): 2,106 descriptions carried a ZZZZ marker inside (`ZZZZ 3 BEES
  ZZZZTHE WILD GRASS 40 NATIVE`), 1,860 a repeated word, many a size twice (`500GM 500G 500G`, `28CAPS 28C`).

## Files
- Changed: index.html (v21.25.8), tools/pos-supplier-merge/{index.html, README.md, engine-frame.html, js/app.js v1.16.1,
  js/engine-host.js v1.7.3, js/engine-worker.js}, docs/ARCHITECTURE.md.
- New: docs/GITHUB-RELEASE-v21.25.8.md.

## Testing done (16 Oct, headless Chromium)
- 397 problem rows from the 16 Oct workbook against the 16 Oct POS set: markers inside / stray Z 0 (was 2,106 across the
  workbook), ZZZZ lead kept on every ZZZZ product; `ATERONON TOMATO PILL 28CAPS` (not `… 28CAPS 28C`), `BARLEANS GREENS
  BAR 480GM`, `ZZZZ BIOL COND VAN 1LT`, `ZZZZ BOOMERS CREATINE`, `ZZZZ CO YO CHOC 400G`; KIN KIN rows untouched.
- 15 Oct rows: 16 descriptions change, all duplicates (`VITAL PROTEIN PWD 500GM 500G 500G` → `… 500GM`, `HARMONY FM
  HARMONY FEMININE` → `HARMONY FM FEMININE`, `HARMONY MENOPAUSE 90TABLETS 90T` → `… 90TABLETS`); counts unchanged.
