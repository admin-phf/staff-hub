# Staff Hub Database Builder v19.0.1

Updated 06 Oct 2026 08:47 AEDT

## Changes in this revision

- Removed automatic execution of POS, CH2, Unique/UHP and Combined Master stages.
- Uploading, replacing or removing files never starts a build. Users can load all required and optional files before deliberately running a stage.
- Manual stage buttons remain independent. `Build All Databases` runs POS → CH2 → Unique/UHP → Combined Master only when pressed.
- Combined Master can still build any missing prerequisite stage from the already-loaded raw files when the user deliberately presses the Combined Master run button.
- Corrected supplier matching so CH2 and UHP source rows are consumed one-to-one and cannot be reused across multiple POS rows.
- Exact cleaned/canonical barcode remains the primary supplier match.
- Fallback supplier matching requires at least two corroborating points from SUB ID/item code, normalised brand and wholesale price (±$0.03).
- Ambiguous fallback matches are not guessed.
- Added hard integrity checks: every CH2 and UHP source index must occur exactly once in the merged master or the build stops with an explicit integrity error.
- The generated full and selected master workbooks now retain source audit tabs for POS, CH2 and UHP.
- When supplied, Ongoing Specials / Discounts are retained on `Ongoing_Discounts_Source` and are also used for discount calculations.
- When supplied, AV / Australian Vitamins availability is retained on `AV_Australian_Vitamins` and merged into AV fields in the master.
- AV fulfilment output remains `to_order_with_av_supplier_codes_DD.MM.YY.xlsx`.
- The full merged master still downloads automatically after a deliberately started successful Combined Master build.
- Legacy POS `.xls` input support is retained.

## Regression baseline using the supplied files

- POS source: 34,252 rows
- CH2 source: 9,682 rows
- Unique/UHP source: 4,847 rows
- Weight/Dimensions matches: 7,129
- AV / Australian Vitamins: 147 order rows, 133 unique PLU/SKU values; all 133 exist in the supplied POS source
- Selected master layout: 98 columns
- Full master layout: 147 columns
- Ongoing discount rules detected: 118

Master row count is intentionally not hard-coded; it changes according to valid one-to-one supplier consolidation.
