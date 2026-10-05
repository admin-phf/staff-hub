# Database Build Corrections — 06 Oct 2026

## Matching
- Exact canonical 13-digit barcode remains first priority.
- 14-digit supplier GTINs are converted to the same 13-digit canonical form used by POS; shorter numeric barcodes are left-padded to 13 digits.
- When barcode is unavailable/unmatched, fallback requires at least 2 of 3 corroborating points:
  1. POS SUB ID = supplier item/stock code
  2. normalised exact brand
  3. wholesale price within $0.03
- Ambiguous fallback ties are rejected rather than guessed.
- UHP used-row tracking now uses UHP_INDEX for all match methods, not barcode only.
- UHP-only output iterates every UHP row, including rows without a usable barcode.

## Running
- Manual stage buttons continue to work independently with required files only.
- Manual Build All requires only required inputs; optional inputs are bypassed when absent.
- POS auto-runs as soon as BrowseStockItems1 + Product Insert Template are loaded; Brand Abbreviation remains optional.
- CH2 auto-runs as soon as pricelist + SOH are loaded; Weight & Dimensions and Brand Abbreviation remain optional.
- UHP auto-runs as soon as the UHP export is loaded; Brand Abbreviation remains optional.
- Adding or removing an optional file later invalidates and automatically rebuilds the affected stage.
- After an automatically completed POS or CH2 stage, the upload workspace advances to the next missing required raw input so the user can continue loading files.
- When every required and optional input is loaded, the complete POS → CH2 → UHP → Master chain auto-runs.
- The full master workbook automatically downloads after a successful master build.

## Output order
1. clean_merged_pos_data_DD.MM.YY.xlsx
2. clean_merged_pos_data_pos_db_DD.MM.YY.xlsx
3. clean_ch2_data_DD.MM.YY.xlsx
4. clean_ch2_data_pos_db_DD.MM.YY.xlsx
5. clean_uhp_data_DD.MM.YY.xlsx
6. clean_uhp_data_pos_db_DD.MM.YY.xlsx
7. merged_alligned_pos_supplier_uhp_full_DD.MM.YY.xlsx
8. merged_alligned_pos_supplier_uhp_selected_columns_DD.MM.YY.xlsx
9. to_order_with_av_supplier_codes_DD.MM.YY.xlsx (when Availability is supplied)

## Regression test using supplied files
- POS: 34,252 rows
- CH2: 9,682 rows
- UHP: 4,847 rows
- Combined master with revised fallback: 38,304 rows
- Selected master: 98 columns
- Full master: 147 columns
- Weight & Dimensions matches: 7,129
- Availability file: 133 unique PLU/SKU values match 133 POS rows

The previous 38,386 master row count is not hard-coded. Revised fallback consolidates additional supplier rows into existing POS rows, so the correctly calculated master row count changes with the matching rules and input data.
