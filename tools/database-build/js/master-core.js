/* MasterCore v2.4.0 — Combined Master (browser port of MASTER Step 3 V30.15, no pandas / no database).
   v2.4.0 (10 Oct 2026): full file only — CHK_* link checks after MATCH_BASIS (☑ / ☒ per CH2 and UHP link for BC, SUB ID,
   BRAND, W/S, TEXT and pack SIZE, a score and HIGH / MEDIUM / LOW confidence), a Match_Audit tab, and the Reconcile CH2
   look (navy header, banded rows, red ↑ / blue ↓ price moves). Matching, pricing, columns before MATCH_BASIS, the selected
   and order files are unchanged.
   Everything runs in the browser at the time the page is used.

   Same as Python V30.15:
     - POS value cleaning (POS_MAIN_ID padded to 13, integer / float columns typed)
     - raw CR666a SOH account mapping overlaid onto every CH2 row (Sydney / Hobart / Townsville / 4PL reset to 0)
     - discount matrix (OD_* or POS_* layout, summary row, supplier-restricted rules, brand prefixes, GREATEST discount)
     - availability lookup, warehouse fulfilment priority and shortfall
     - pricing (cheapest CH2 / UHP W/S, RRP from same source, GST UHP > CH2 > POS)
     - output columns, sort (MASTER_BRAND, MASTER_BARCODE), number formats, highlight / red fonts and SUBTOTAL totals row
   Matching (points mode, used by the Staff Hub):
     1. BARCODE first — cleaned and unified to the POS 13-digit form. A barcode match links on its own; brand and W/S add
        points, and a barcode-only link is flagged in MATCH_BASIS for checking.
     2. No barcode match: SUB ID / supplier code, BRAND and W/S (within 40% or $0.50 of POS W/S or last price; UHP unit W/S
        also checked) with at least 2 points including SUB ID (SUB ID + W/S alone also needs a shared description word).
     3. Still unlinked: BRAND + DESCRIPTION (+ W/S) — products bought elsewhere that CH2 / Unique also list, such as
        Herbs of Gold rows with no CH2 barcode. Pack sizes must agree and both rows must clearly pick each other.
     - one-to-one: a CH2 or Unique row is linked to at most one POS row (strongest link wins; the other POS row keeps a note).
     - every CH2 and Unique row appears in the master exactly once (linked, or "CH2 Only" / "UHP Only"), barcode-less rows included;
       To-Order PLUs that are not in POS appear as "AV Only" rows so the order file keeps every line.
     - MATCH_BASIS + source / audit columns (AV_SOURCE_ROWS, OD_* discount rule) in the full file only.
   matchMode 'python' reproduces V30.15 exactly and is used only to verify the port. */
(function (g) {
  'use strict';
  const VERSION = '2.4.0';

  // ---------------------------------------------------------------- constants (Python V30.15)
  const COLUMN_MAPPINGS = {
    pos: {
      brand: ['POS_MASTER_BRAND', 'POS_BRAND'], barcode: ['POS_MASTER_BARCODE', 'POS_BARCODE'],
      code: ['POS_SUB_ID', 'POS_PLU', 'POS_MAIN_ID'], plu: ['POS_PLU'], sub_id: ['POS_SUB_ID'],
      wsp: ['POS_WSP_EXCGST', 'POS_WSP'], last_price: ['POS_LAST_PRICE'], rrp: ['POS_RRP_INCGST', 'POS_RRP'],
      supplier_id: ['POS_SUPPLIER'], description: ['POS_DESCR', 'POS_DESCRIPTION'], gst: ['POS_GST_TAX_PC']
    },
    supplier: {
      brand: ['CH2_MASTER_BRAND', 'CH2_BRAND'], barcode: ['CH2_MASTER_BARCODE', 'CH2_BAR_CODE', 'CH2_BARCODE'],
      code: ['CH2_PGC_ITEM_CODE', 'CH2_ITEM_CODE'], wsp: ['CH2_WHOLESALE_EX_GST', 'CH2_WHOLESALE', 'CH2_WSP'],
      rrp: ['CH2_RRP_INC_GST', 'CH2_RRP'], gst: ['CH2_GST_YN', 'CH2_GST']
    },
    uhp: {
      brand: ['UHP_MASTER_BRAND', 'UHP_BRAND'], barcode: ['UHP_MASTER_BARCODE', 'UHP_APN_BARCODE', 'UHP_BARCODE'],
      code: ['UHP_STOCKCODE', 'UHP_CODE'], description: ['UHP_DESCRIPTION', 'UHP_DESCR'], size: ['UHP_SIZE'],
      wsp: ['UHP_WS_EX_GST', 'UHP_WSP'], rrp: ['UHP_RRP'], gst: ['UHP_GST']
    },
    discounts: {
      supplier_discount: ['POS SUPPLIER NUMBER', 'POS_SUPPLIER_NUMBER', 'OD_SUPPLIER_DISCOUNT', 'OD_SUPPLIER DISCOUNT'],
      brand: ['POS MASTER BRAND', 'POS_MASTER_BRAND', 'OD_MASTER_BRAND', 'OD_MASTER BRAND', 'OD_BRAND'],
      brand_prefix: ['POS BRAND PREFIX', 'POS_BRAND_PREFIX'],
      plu: ['POS PLU', 'POS_PLU', 'OD_POS_PLU', 'OD_POS PLU', 'OD_PLU'],
      barcode: ['POS MASTER BARCODE', 'POS_MASTER_BARCODE', 'OD_MASTER_BARCODE', 'OD_MASTER BARCODE', 'OD_BARCODE'],
      description: ['POS DESCR', 'POS_DESCR', 'POS DESCRIPTION', 'OD_POS_DESCR', 'OD_POS DESCR'],
      discount_pct: ['POS DISCOUNT%', 'POS DISCOUNT %', 'POS_DISCOUNT_PCT', 'OD_Discount %', 'OD_DISCOUNT %', 'OD_DISCOUNT_PCT'],
      markup_pct: ['POS MARKUP%', 'POS MARKUP %', 'POS_MARKUP_PCT', 'OD_Markup %', 'OD_MARKUP %', 'OD_MARKUP_PCT'],
      member: ['POS MEMBER', 'POS_MEMBER', 'OD_MEMBER'], match: ['POS MATCH', 'POS_MATCH', 'OD_MATCH'], index: ['INDEX', 'OD_INDEX']
    },
    availability: {
      plu: ['PLU / SKU', 'PLU', 'SKU', 'ITEM_CODE'], quantity: ['Qty / Units', 'QUANTITY', 'QTY', 'UNITS'],
      supplier: ['Supplier Number', 'SUPPLIER', 'SUPPLIER_ID']
    }
  };
  const BRANCH_MAPPINGS = {
    '310 - Melbourne': 'SOH_310_MELBOURNE', '315 - Hobart': 'SOH_315_HOBART', '330 - Sydney': 'SOH_330_SYDNEY',
    '335 - Newcastle': 'SOH_335_NEWCASTLE', '340 - Adelaide': 'SOH_340_ADELAIDE', '350 - Brisbane': 'SOH_350_BRISBANE',
    '353 - Brisbane 4PL': 'SOH_353_BRISBANE_4PL', '355 - Townsville': 'SOH_355_TOWNSVILLE', '370 - Perth': 'SOH_370_PERTH'
  };
  const SOH_ACCOUNT_TO_COLUMN = {
    '7386532': 'SOH_310_MELBOURNE', '9551313': 'SOH_335_NEWCASTLE', '9551315': 'SOH_350_BRISBANE',
    '9551312': 'SOH_340_ADELAIDE', '9551316': 'SOH_370_PERTH'
  };
  const SOH_EXCLUDED_ACCOUNTS = { '7386533': 'Unknown / review', '9523475': 'Returns, Brisbane, QLD' };
  const SOH_COLUMNS = Object.values(BRANCH_MAPPINGS);
  const ACTIVE_RAW_SOH_COLUMNS = [...new Set(Object.values(SOH_ACCOUNT_TO_COLUMN))];
  const KNOWN_ACCOUNTS = [...Object.keys(SOH_ACCOUNT_TO_COLUMN), ...Object.keys(SOH_EXCLUDED_ACCOUNTS)];
  const WAREHOUSE_PRIORITY = [
    ['SOH_310_MELBOURNE', 'OF_MELB'], ['SOH_335_NEWCASTLE', 'OF_NEWCASTLE'], ['SOH_340_ADELAIDE', 'OF_ADELAIDE'],
    ['SOH_330_SYDNEY', 'OF_SYDNEY'], ['SOH_350_BRISBANE', 'OF_BRISBANE'], ['SOH_370_PERTH', 'OF_PERTH']
  ];
  const OF_COLUMNS = ['OF_MELB', 'OF_NEWCASTLE', 'OF_ADELAIDE', 'OF_SYDNEY', 'OF_BRISBANE', 'OF_PERTH', 'OF_SHORTFALL'];
  const AV_COLUMNS = ['AV_BRAND', 'AV_BARCODE', 'AV_SUPPLIER_NUMBER', 'AV_PLU_SKU', 'AV_QTY_UNITS'];
  const HIGHLIGHT_COLUMNS = [...AV_COLUMNS, ...OF_COLUMNS];
  const CUSTOM_COLUMNS = [
    'MASTER_BRAND', 'POS_DESCR', 'CH2_PGC_ITEM_CODE', 'MASTER_BARCODE', 'AV_SUPPLIER_NUMBER', 'AV_PLU_SKU', 'AV_QTY_UNITS',
    'OF_MELB', 'OF_NEWCASTLE', 'OF_ADELAIDE', 'OF_SYDNEY', 'OF_BRISBANE', 'OF_PERTH', 'OF_SHORTFALL',
    'SOH_310_MELBOURNE', 'SOH_315_HOBART', 'SOH_330_SYDNEY', 'SOH_335_NEWCASTLE', 'SOH_340_ADELAIDE',
    'SOH_350_BRISBANE', 'SOH_353_BRISBANE_4PL', 'SOH_355_TOWNSVILLE', 'SOH_370_PERTH', 'SOH_TOTAL'
  ];
  const CUSTOM_COLUMN_RENAMES = { AV_SUPPLIER_NUMBER: 'Supplier Number', AV_PLU_SKU: 'PLU / SKU', AV_QTY_UNITS: 'Qty / Units' };
  const PRICING_HEADERS = [
    'CURRENT_WSP', 'NEW_WSP', 'WSP_CHANGE_PCT', 'WSP_CHANGE_$', 'CURRENT_LAST_PRICE', 'NEW_LAST_PRICE',
    'CHANGE_PCT_LAST_PRICE', 'WSP_CHANGE_$_LAST_PRICE', 'DISCOUNT_TYPE', 'DISCOUNT_PCT', 'CURRENT_RRP', 'NEW_RRP', 'HAS_GST'
  ];
  const SELECTED_OUTPUT_COLUMNS = [
    'MASTER_BRAND', 'MASTER_BARCODE', 'MASTER_POS_PLU', 'MATCH_STATUS', 'POS_INDEX', 'CH2_INDEX', 'UHP_INDEX', 'AV_INDEX',
    'POS_MASTER_BRAND', 'POS_MASTER_BARCODE', 'POS_MAIN_ID', 'POS_PLU', 'POS_SUB_ID', 'POS_BRAND', 'POS_DESCR', 'POS_POS_DESC',
    'POS_DISSNO', 'POS_PROD_GRP', 'POS_SUPPLIER', 'POS_LOYALTY_SCHEME', 'POS_UNITS', 'POS_MIN_ORDER_QTY', 'POS_WSP_EXCGST',
    'POS_LAST_PRICE', 'POS_GST_TAX_PC', 'POS_RRP_INCGST', 'POS_PR_1_PC', 'POS_PR_2_PC', 'POS_PR_3_PC', 'POS_PR_4_PC',
    'POS_PR_5_PC', 'POS_PR_6_PC', 'POS_PR_7_PC', 'POS_PR_8_PC', 'POS_PR_9_PC', 'POS_RET_PRICE', 'POS_PHARM_PROD', 'POS_SCALES',
    'POS_ITEMSIZE', 'POS_PACKAGING', 'POS_SOH', 'CH2_MASTER_BRAND', 'CH2_MASTER_BARCODE', 'CH2_VENDOR_NAME', 'CH2_BRAND',
    'CH2_PGC_ITEM_CODE', 'CH2_LONG_DESCRIPTION_ENHANCED', 'CH2_WHOLESALE_EX_GST', 'CH2_RRP_INC_GST', 'CH2_GST_YN', 'CH2_NOTES',
    'BOX_HOW_MANY_IN_A_CT', 'UHP_MASTER_BRAND', 'UHP_MASTER_BARCODE', 'UHP_STOCKCODE', 'UHP_BRAND', 'UHP_DESCRIPTION',
    'UHP_WS_EX_GST', 'UHP_GST', 'UHP_RRP', 'UHP_MOQ', 'UHP_UNIT_WS_EX_GST', 'UHP_CTN_QTY', 'UHP_CTN_BARCODE',
    'SOH_310_MELBOURNE', 'SOH_315_HOBART', 'SOH_330_SYDNEY', 'SOH_335_NEWCASTLE', 'SOH_340_ADELAIDE', 'SOH_350_BRISBANE',
    'SOH_353_BRISBANE_4PL', 'SOH_355_TOWNSVILLE', 'SOH_370_PERTH', ...PRICING_HEADERS, ...AV_COLUMNS, ...OF_COLUMNS
  ];
  const MATCH_BASIS = 'MATCH_BASIS';
  // Source / audit columns added after MATCH_BASIS in the full master only: the To-Order lines behind AV_QTY_UNITS and the
  // ongoing-discount rule that priced the row (OD_SOURCE_ROW = row in the discounts workbook).
  const AUDIT_COLUMNS = ['AV_SOURCE_ROWS', 'OD_SOURCE_ROW', 'OD_INDEX', 'OD_RULE', 'OD_DISCOUNT_PCT', 'OD_MARKUP_PCT', 'OD_MEMBER', 'OD_MATCH', 'OD_DESCR'];
  // v2.4.0 link checks (full file only, straight after MATCH_BASIS). Names start CHK_ so they never look like the CH2 code /
  // SUB ID columns other tools (Reconcile CH2) search for.
  const CHECK_COLUMNS = ['CHK_CONFIDENCE',
    'CHK_CH2_BC', 'CHK_CH2_SUBID', 'CHK_CH2_BRAND', 'CHK_CH2_WS', 'CHK_CH2_TEXT', 'CHK_CH2_SIZE', 'CHK_CH2_SCORE',
    'CHK_UHP_BC', 'CHK_UHP_SUBID', 'CHK_UHP_BRAND', 'CHK_UHP_WS', 'CHK_UHP_TEXT', 'CHK_UHP_SIZE', 'CHK_UHP_SCORE',
    'CHK_FLAGS'];

  // Excel formatting sets (Python V30.8 – V30.10)
  const COUNT_COLUMNS = new Set(['MASTER_BARCODE', 'MATCH_STATUS', 'POS_INDEX', 'CH2_INDEX', 'UHP_INDEX', 'AV_INDEX', 'AV_SUPPLIER_NUMBER']);
  const SUM_COLUMNS = new Set([
    'POS_WSP_EXCGST', 'POS_LAST_PRICE', 'POS_RRP_INCGST', 'POS_SOH', ...SOH_COLUMNS, 'SOH_TOTAL',
    'CURRENT_WSP', 'NEW_WSP', 'CURRENT_LAST_PRICE', 'NEW_LAST_PRICE', 'WSP_CHANGE_$', 'WSP_CHANGE_$_LAST_PRICE',
    'CURRENT_RRP', 'NEW_RRP', 'AV_QTY_UNITS', ...OF_COLUMNS
  ]);
  const AVG_COLUMNS = new Set(['WSP_CHANGE_PCT', 'CHANGE_PCT_LAST_PRICE']);
  const CURRENCY_COLS = [
    'CURRENT_WSP', 'NEW_WSP', 'WSP_CHANGE_$', 'CURRENT_LAST_PRICE', 'NEW_LAST_PRICE', 'WSP_CHANGE_$_LAST_PRICE', 'CURRENT_RRP',
    'NEW_RRP', 'POS_WSP_EXCGST', 'POS_LAST_PRICE', 'POS_RRP_INCGST', 'CH2_WHOLESALE_EX_GST', 'CH2_RRP_INC_GST',
    'UHP_WS_EX_GST', 'UHP_RRP', 'UHP_UNIT_WS_EX_GST'
  ];
  const PERCENTAGE_COLS = ['WSP_CHANGE_PCT', 'CHANGE_PCT_LAST_PRICE'];
  const RATES_AS_NUMBERS = ['POS_GST_TAX_PC'];
  const SPECIFIC_INTEGER_COLS = [
    'POS_INDEX', 'CH2_INDEX', 'UHP_INDEX', 'AV_INDEX', 'MASTER_POS_PLU', 'POS_PLU', 'CH2_PGC_ITEM_CODE', 'CH2_CLASS_TYPE',
    'BOX_INDEX', 'UHP_MOQ', 'UHP_UWIDTH_MM', 'UHP_UHEIGHT_MM', 'UHP_ULENGTH_MM', 'UHP_CTN_QTY', 'UHP_CTNWIDTH_MM',
    'UHP_CTNHEIGHT_MM', 'UHP_CTNLENGTH_MM', 'AV_SUPPLIER_NUMBER', 'AV_PLU_SKU'
  ];
  const OTHER_INTEGER_BASE = [
    'SOH_TOTAL', 'POS_SUPPLIER', 'POS_UNITS', 'POS_MIN_ORDER_QTY', 'POS_DISSNO', 'POS_PROD_GRP', 'POS_LOYALTY_SCHEME',
    'POS_PHARM_PROD', 'POS_SCALES', 'POS_ITEMSIZE', 'BOX_HOW_MANY_IN_A_CT', 'BOX_WIDTH', 'BOX_DEPTH', 'BOX_HEIGHT',
    'BOX_BU1_WEIGHT', 'BOX_INDEX'
  ];
  const RED_COLS = ['WSP_CHANGE_PCT', 'WSP_CHANGE_$', 'CHANGE_PCT_LAST_PRICE', 'WSP_CHANGE_$_LAST_PRICE'];
  const CURRENCY_FMT = '"$"#,##0.00_-';

  // ---------------------------------------------------------------- Python-equivalent helpers
  function findColumns(headers, type) {
    const up = headers.map(h => String(h ?? '').trim().toUpperCase().replace(/﻿/g, ''));
    const found = {};
    for (const [key, options] of Object.entries(COLUMN_MAPPINGS[type])) {
      for (const p of options) {
        const i = up.indexOf(p.toUpperCase());
        if (i >= 0) { found[key] = headers[i]; break; }
      }
    }
    return found;
  }
  const isBlank = v => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
  function pyStr(v) { return v === null || v === undefined ? '' : String(v); }
  function cleanBarcode(value) {
    if (value === null || value === undefined) return '';
    let digits = String(value).trim().replace(/['"]/g, '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length > 14) return '';
    if (digits.length === 14) digits = digits.slice(1);
    else if (digits.length < 13) digits = digits.padStart(13, '0');
    return digits.length === 13 ? digits : '';
  }
  function cleanCode(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }
  function cleanBrand(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim().toUpperCase();
  }
  function brandsMatchFuzzy(b1, b2) {
    if (!b1 || !b2) return false;
    b1 = cleanBrand(b1); b2 = cleanBrand(b2);
    if (b1 === b2 || b1.includes(b2) || b2.includes(b1)) return true;
    const c1 = b1.replace(/[^A-Z0-9]/g, ''), c2 = b2.replace(/[^A-Z0-9]/g, '');
    if (c1 === c2) return true;
    return c1.includes(c2) || c2.includes(c1);
  }
  function safeFloat(value, dflt = null) {
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return dflt;
    if (typeof value === 'boolean') return value ? 1 : 0;
    const n = typeof value === 'number' ? value : Number(String(value).trim());
    return Number.isNaN(n) ? dflt : n;
  }
  function safeInt(value, dflt = null) {
    const n = safeFloat(value, null);
    if (n === null || !Number.isFinite(n)) return dflt;
    return Math.trunc(n);
  }
  function parsePercentFraction(value, dflt = null) {
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return dflt;
    let n;
    if (typeof value === 'string') {
      const t = value.trim();
      if (t.includes('%')) { n = Number(t.replace(/%/g, '').trim()); return Number.isNaN(n) ? dflt : n / 100; }
      n = Number(t);
    } else {
      n = Number(value);
    }
    if (Number.isNaN(n)) return dflt;
    return Math.abs(n) <= 1 ? n : n / 100;
  }
  function cleanLookupIdentifier(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (typeof value === 'number' && Number.isInteger(value)) return String(value);
    const t = String(value).trim().replace(/['"]/g, '');
    if (/^[-+]?\d+\.0+$/.test(t)) return String(Math.trunc(Number(t)));
    return t;
  }
  function zfill(s, n) {
    if (s[0] === '-' || s[0] === '+') return s[0] + s.slice(1).padStart(n - 1, '0');
    return s.padStart(n, '0');
  }
  const POS_TEXT_COLS = new Set(['POS_SUB_ID', 'POS_MASTER_BRAND', 'POS_BRAND', 'POS_DESCR', 'POS_POS_DESC', 'POS_PACKAGING']);
  const POS_INT_COLS = new Set(['POS_DISSNO', 'POS_PROD_GRP', 'POS_SUPPLIER', 'POS_LOYALTY_SCHEME', 'POS_UNITS', 'POS_MIN_ORDER_QTY',
    'POS_GST_TAX_PC', 'POS_RET_PRICE', 'POS_PHARM_PROD', 'POS_SCALES', 'POS_ITEMSIZE']);
  const POS_FLOAT_COLS = new Set(['POS_WSP_EXCGST', 'POS_LAST_PRICE', 'POS_RRP_INCGST', 'POS_PR_1_PC', 'POS_PR_2_PC', 'POS_PR_3_PC',
    'POS_PR_4_PC', 'POS_PR_5_PC', 'POS_PR_6_PC', 'POS_PR_7_PC', 'POS_PR_8_PC', 'POS_PR_9_PC']);
  function cleanPosColumnValue(header, value) {
    if (header === 'POS_MAIN_ID') {
      if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return '';
      const n = safeInt(value);
      return n !== null ? zfill(String(n), 13) : String(value).trim();
    }
    if (POS_TEXT_COLS.has(header)) return value === null || value === undefined ? '' : String(value).trim();
    if (POS_INT_COLS.has(header)) return safeInt(value);
    if (POS_FLOAT_COLS.has(header)) return safeFloat(value);
    return value;
  }
  function rowsToDicts(headers, rows, transform) {
    const out = new Array(rows.length);
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r] || [], o = {};
      for (let i = 0; i < headers.length; i++) {
        let v = i < row.length ? row[i] : null;
        if (transform) v = transform(headers[i], v);
        o[headers[i]] = v === null || v === undefined ? '' : v;
      }
      out[r] = o;
    }
    return out;
  }
  const uniq = arr => { const seen = new Set(); return arr.filter(x => x && !seen.has(x) && seen.add(x)); };

  // ---------------------------------------------------------------- raw CR666a SOH (V30.15)
  const normaliseSohHeader = v => String(v ?? '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
  function normaliseSohAccount(value) {
    const digits = cleanLookupIdentifier(value).replace(/\D/g, '');
    const raw = pyStr(value);
    for (const acc of KNOWN_ACCOUNTS) if (digits.includes(acc) || raw.includes(acc)) return acc;
    return digits;
  }
  function parseSohQuantity(value) {
    if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return 0;
    if (typeof value === 'boolean') return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : 0;
    let s = String(value).trim().replace(/,/g, '');
    if (s.startsWith('(') && s.endsWith(')')) s = '-' + s.slice(1, -1);
    const n = Number(s);
    return Number.isFinite(n) && s !== '' ? Math.trunc(n) : 0;
  }
  function scoreSohHeader(header, aliases, reject) {
    const h = normaliseSohHeader(header);
    if (!h) return -1;
    if (reject && reject.some(t => h.includes(t))) return -1;
    let best = -1;
    for (const alias of aliases) {
      const a = normaliseSohHeader(alias);
      if (h === a) best = Math.max(best, 100 + a.length);
      else if (h.startsWith(a + ' ') || h.endsWith(' ' + a)) best = Math.max(best, 80 + a.length);
      else if (h.includes(a)) best = Math.max(best, 60 + a.length);
    }
    return best;
  }
  function findSohColumn(headers, aliases, reject) {
    let bestScore = -1, bestIdx = -1;
    (headers || []).forEach((h, i) => {
      const s = scoreSohHeader(h, aliases, reject);
      if (s > bestScore || (s === bestScore && i > bestIdx)) { bestScore = s; bestIdx = i; } // Python max((score, idx))
    });
    return bestScore >= 0 ? bestIdx : -1;
  }
  function extractKnownSohAccount(values) {
    const combined = values.map(v => pyStr(v)).join(' ');
    for (const acc of KNOWN_ACCOUNTS) if (combined.includes(acc)) return acc;
    return '';
  }
  function detectSohLayout(rows, sheetName) {
    const accountAliases = ['Customer Account', 'Customer Account Number', 'Customer Number', 'Account Number', 'Account No', 'Account', 'Branch', 'Warehouse'];
    const codeAliases = ['PGC Item Code', 'Item Code', 'Product Code', 'Stock Code', 'Item Number', 'Product Number', 'Code'];
    const qtyAliases = ['Quantity On Hand', 'Qty On Hand', 'Stock On Hand', 'Available Quantity', 'Available Qty', 'On Hand', 'SOH', 'Quantity', 'Qty'];
    const meta = [sheetName || ''];
    for (const row of rows.slice(0, 25)) meta.push(...(row || []));
    const defaultAccount = extractKnownSohAccount(meta);
    for (let i = 0; i < Math.min(80, rows.length); i++) {
      const headers = rows[i] || [];
      const code = findSohColumn(headers, codeAliases, ['ACCOUNT', 'CUSTOMER', 'BRANCH', 'WAREHOUSE']);
      const qty = findSohColumn(headers, qtyAliases);
      const account = findSohColumn(headers, accountAliases);
      if (code >= 0 && qty >= 0 && (account >= 0 || defaultAccount)) return { headerRow: i, codeIdx: code, qtyIdx: qty, accountIdx: account, defaultAccount };
    }
    return null;
  }
  // sheets: [{name, rows}] from the raw CR666a workbook
  function readRawSohLookup(sheets) {
    const lookup = new Map();
    const stats = { parsedRows: 0, uniqueItemCodes: 0, warehouseRows: {}, warehouseUnits: {}, excludedRows: {}, excludedUnits: {}, unmapped: {}, invalidCodeRows: 0, layouts: [] };
    for (const sh of sheets || []) {
      const rows = sh.rows || [];
      const layout = detectSohLayout(rows.slice(0, 80), sh.name);
      if (!layout) continue;
      stats.layouts.push(sh.name);
      for (const row of rows.slice(layout.headerRow + 1)) {
        if (!row || !row.some(v => pyStr(v).trim())) continue;
        const code = cleanCode(layout.codeIdx < row.length ? row[layout.codeIdx] : '');
        if (!code) { stats.invalidCodeRows++; continue; }
        const accountRaw = layout.accountIdx >= 0 && layout.accountIdx < row.length ? row[layout.accountIdx] : layout.defaultAccount;
        const account = normaliseSohAccount(isBlank(accountRaw) || accountRaw === 0 ? layout.defaultAccount : accountRaw);
        const qty = parseSohQuantity(layout.qtyIdx < row.length ? row[layout.qtyIdx] : 0);
        stats.parsedRows++;
        let col = SOH_ACCOUNT_TO_COLUMN[account];
        if (!col) {
          const branchText = pyStr(isBlank(accountRaw) ? '' : accountRaw).trim();
          col = BRANCH_MAPPINGS[branchText];
        }
        if (col) {
          if (!lookup.has(code)) lookup.set(code, {});
          const o = lookup.get(code);
          o[col] = (o[col] || 0) + qty;
          stats.warehouseRows[col] = (stats.warehouseRows[col] || 0) + 1;
          stats.warehouseUnits[col] = (stats.warehouseUnits[col] || 0) + qty;
        } else if (SOH_EXCLUDED_ACCOUNTS[account]) {
          stats.excludedRows[account] = (stats.excludedRows[account] || 0) + 1;
          stats.excludedUnits[account] = (stats.excludedUnits[account] || 0) + qty;
        } else {
          const k = account || '<blank>';
          stats.unmapped[k] = (stats.unmapped[k] || 0) + 1;
        }
      }
    }
    stats.uniqueItemCodes = lookup.size;
    return { lookup, stats };
  }
  function overlayRawSoh(row, itemCode, lookup) {
    if (!lookup || !lookup.size) return false;
    const stock = lookup.get(cleanCode(itemCode)) || null;
    for (const c of SOH_COLUMNS) row[c] = 0;
    let total = 0;
    for (const c of ACTIVE_RAW_SOH_COLUMNS) { row[c] = Math.trunc((stock && stock[c]) || 0); total += row[c]; }
    row.SOH_TOTAL = total;
    return !!stock;
  }

  // ---------------------------------------------------------------- discounts (V30.13 adapter, original GREATEST-discount logic)
  const normaliseHeaderForSelection = h => String(h ?? '').trim().toUpperCase().replace(/[^A-Z0-9_]+/g, '');
  function detectDiscountHeaderRow(rows, maxRows = 10) {
    const recognised = new Set(COLUMN_MAPPINGS.discounts.discount_pct.map(normaliseHeaderForSelection));
    for (let i = 0; i < Math.min(maxRows, rows.length); i++) {
      for (const v of rows[i] || []) {
        if (!pyStr(v).trim()) continue;
        if (recognised.has(normaliseHeaderForSelection(v))) return i + 1;
      }
    }
    return 1;
  }
  function headerList(row) { return (row || []).map((h, i) => (h === null || h === undefined) ? `COLUMN_${i + 1}` : String(h).trim()); }
  function loadDiscounts(rows, posRecords, posKeys) {
    const res = { supplier: new Map(), brand: new Map(), plu: new Map(), barcode: new Map(), supplierBrand: new Map(), headerRow: 1, rules: 0, keys: {} };
    if (!rows || !rows.length) return res;
    const headerRow = detectDiscountHeaderRow(rows);
    const width = Math.max(...rows.slice(0, headerRow).map(r => (r || []).length), 0);
    const hdrRow = (rows[headerRow - 1] || []).slice();
    while (hdrRow.length < width) hdrRow.push(null);
    const hdrs = headerList(hdrRow);
    const kc = findColumns(hdrs, 'discounts');
    res.headerRow = headerRow; res.keys = kc;
    if (!kc.discount_pct) return res;
    const posSupplierBrands = new Map();
    for (const row of posRecords) {
      const sid = safeInt(row[posKeys.supplier_id] ?? '');
      const br = cleanBrand(row[posKeys.brand] ?? '');
      if (sid && br) { if (!posSupplierBrands.has(sid)) posSupplierBrands.set(sid, new Set()); posSupplierBrands.get(sid).add(br); }
    }
    const keepBest = (map, key, value) => {
      const cur = map.has(key) ? map.get(key) : [1.0, 0.0];
      if (value[0] < cur[0]) map.set(key, value);
    };
    const data = rowsToDicts(hdrs, rows.slice(headerRow));
    const get = (row, key) => (kc[key] !== undefined ? row[kc[key]] : row['']) ?? '';
    for (let j = 0; j < data.length; j++) {
      const row = data[j];
      const disc = parsePercentFraction(get(row, 'discount_pct'), null);
      if (disc === null) continue;
      let mark = kc.markup_pct ? parsePercentFraction(get(row, 'markup_pct'), null) : null;
      if (mark === null) mark = 1.0 - disc;
      if (disc < 0 || disc > 1 || mark < 0 || mark > 1) continue;
      const sup = safeInt(get(row, 'supplier_discount'));
      const brand = cleanBrand(get(row, 'brand'));
      const prefix = cleanBrand(get(row, 'brand_prefix'));
      const plu = cleanLookupIdentifier(get(row, 'plu'));
      const bc = cleanBarcode(get(row, 'barcode'));
      // Third element = source / audit details of the rule (written to the OD_* columns of the full master).
      const scope = plu ? `PLU ${plu}` : bc ? `BARCODE ${bc}` : brand ? `BRAND ${brand}` : prefix ? `BRAND PREFIX ${prefix}` : sup ? `SUPPLIER ${sup}` : 'ALL';
      const rule = [1.0 - disc, mark, {
        row: headerRow + j + 1, index: pyStr(get(row, 'index')).trim(), discount: disc, markup: mark,
        member: pyStr(get(row, 'member')).trim(), match: pyStr(get(row, 'match')).trim(), description: pyStr(get(row, 'description')).trim(),
        rule: scope + (sup && scope.indexOf('SUPPLIER') !== 0 ? ` · supplier ${sup}` : '')
      }];
      res.rules++;
      if (sup && !brand && !prefix && !plu && !bc) {
        keepBest(res.supplier, sup, rule);
        if (posSupplierBrands.has(sup)) for (const b of posSupplierBrands.get(sup)) res.supplierBrand.set(b, sup);
      }
      if (brand) {
        keepBest(res.brand, sup ? `B|${brand}|${sup}` : `L|${brand}`, rule);
        if (sup) {
          const existing = res.supplierBrand.has(brand) ? res.supplierBrand.get(brand) : null;
          if (existing === null || existing === sup) res.supplierBrand.set(brand, sup);
        }
      }
      if (prefix) keepBest(res.brand, `P|${prefix}|${sup || ''}`, rule);
      if (plu) keepBest(res.plu, sup ? `${plu}|${sup}` : plu, rule);
      if (bc) keepBest(res.barcode, sup ? `${bc}|${sup}` : bc, rule);
    }
    return res;
  }
  // Brand ↔ prefix pairs from the discount matrix, used only as matching evidence.
  function discountBrandAliases(rows) {
    const out = [];
    if (!rows || !rows.length) return out;
    const headerRow = detectDiscountHeaderRow(rows);
    const hdrs = headerList(rows[headerRow - 1]);
    const kc = findColumns(hdrs, 'discounts');
    if (!kc.brand || !kc.brand_prefix) return out;
    for (const row of rowsToDicts(hdrs, rows.slice(headerRow))) {
      const b = cleanBrand(row[kc.brand]), p = cleanBrand(row[kc.brand_prefix]);
      if (b && p && b !== p) out.push([b, p]);
    }
    return out;
  }

  // ---------------------------------------------------------------- availability (to-order)
  function sniffDelimiter(text) {
    const sample = text.slice(0, 2048).split(/\r?\n/).slice(0, 5);
    let best = ',', bestScore = -1;
    for (const d of [',', '\t', ';', '|']) {
      const counts = sample.filter(Boolean).map(l => l.split(d).length - 1);
      if (!counts.length) continue;
      const consistent = counts.every(c => c === counts[0]) && counts[0] > 0;
      const score = (consistent ? 1000 : 0) + counts[0];
      if (score > bestScore) { bestScore = score; best = d; }
    }
    return best;
  }
  function parseCsvText(text) {
    text = String(text || '').replace(/^﻿/, '');
    const d = sniffDelimiter(text);
    const rows = [];
    let row = [], field = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
        else field += ch;
      } else if (ch === '"') q = true;
      else if (ch === d) { row.push(field); field = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field); rows.push(row); row = []; field = '';
      } else field += ch;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows.filter(r => r.some(v => v !== ''));
  }
  // rows: array of arrays (first row = headers). Values kept as given (CSV = text, like Python's csv module).
  function buildAvailability(rows, posRecords, posKeys) {
    const out = { lookup: new Map(), meta: new Map(), supplier: new Map(), lines: new Map(), keys: {}, rows: 0 };
    if (!rows || rows.length < 1) return out;
    const hdrs = (rows[0] || []).map((h, i) => (h === null || h === undefined || h === '') ? `COLUMN_${i + 1}` : String(h).trim().replace(/﻿/g, ''));
    const kc = findColumns(hdrs, 'availability');
    out.keys = kc;
    if (!kc.plu || !kc.quantity) return out;
    const data = rowsToDicts(hdrs, rows.slice(1));
    out.rows = data.length;
    const posMeta = new Map();
    for (const row of posRecords) {
      const plu = pyStr(row[posKeys.plu] ?? '').trim();
      if (plu) posMeta.set(plu, { brand: row[posKeys.brand] ?? '', barcode: row[posKeys.barcode] ?? '' }); // last POS row wins (Python)
    }
    let idx = 1;
    for (let j = 0; j < data.length; j++) {
      const row = data[j];
      const plu = pyStr(row[kc.plu]).trim();
      if (!plu || plu === 'nan') continue;
      const qty = safeInt(row[kc.quantity] ?? 0, 0);
      if (!out.lines.has(plu)) out.lines.set(plu, []);
      out.lines.get(plu).push(j + 2);
      if (!out.lookup.has(plu)) {
        const m = posMeta.get(plu) || {};
        out.meta.set(plu, { AV_INDEX: idx++, AV_BRAND: m.brand ?? '', AV_BARCODE: m.barcode ?? '' });
        out.lookup.set(plu, 0);
      }
      out.lookup.set(plu, out.lookup.get(plu) + qty);
    }
    if (kc.supplier) {
      for (const row of data) {
        const plu = pyStr(row[kc.plu]).trim(), sup = pyStr(row[kc.supplier]).trim();
        if (plu && sup) out.supplier.set(plu, sup);
      }
    }
    return out;
  }
  function calculateOrderFulfillment(qty, soh) {
    const f = {};
    if (qty <= 0) return f;
    let remaining = qty;
    for (const [sohCol, ofCol] of WAREHOUSE_PRIORITY) {
      if (remaining <= 0) break;
      const available = soh[sohCol] || 0;
      if (available > 0) { const take = Math.min(remaining, available); f[ofCol] = take; remaining -= take; }
    }
    if (remaining > 0) f.OF_SHORTFALL = remaining;
    return f;
  }

  // ---------------------------------------------------------------- pricing (V30)
  function calculatePricing(m, pk, sk, uk, disc) {
    const posWsp = safeFloat(m[pk.wsp] ?? ''), posLast = safeFloat(m[pk.last_price] ?? ''), posRrp = safeFloat(m[pk.rrp] ?? '');
    const posSupplier = safeInt(m[pk.supplier_id] ?? '');
    const gstCol = pk.gst;
    let posGst = gstCol && Object.prototype.hasOwnProperty.call(m, gstCol) ? safeInt(m[gstCol]) : null;
    if (posGst === null) posGst = gstCol && Object.prototype.hasOwnProperty.call(m, gstCol) ? safeFloat(m[gstCol]) : null;
    const ch2Present = (m.CH2_INDEX ?? '') !== '', uhpPresent = (m.UHP_INDEX ?? '') !== '';
    let ch2Wsp = null, ch2Rrp = null, ch2Gst = null;
    if (ch2Present) {
      ch2Wsp = safeFloat(m[sk.wsp || 'CH2_WHOLESALE_EX_GST'] ?? '');
      ch2Rrp = safeFloat(m[sk.rrp || 'CH2_RRP_INC_GST'] ?? '');
      ch2Gst = pyStr(m[sk.gst || 'CH2_GST_YN'] ?? '').trim().toUpperCase();
    }
    let uhpWsp = null, uhpRrp = null, uhpGst = null;
    if (uhpPresent) {
      if (uk.wsp && uk.wsp in m) uhpWsp = safeFloat(m[uk.wsp] ?? '');
      if (uk.rrp && uk.rrp in m) uhpRrp = safeFloat(m[uk.rrp] ?? '');
      if (uk.gst && uk.gst in m) uhpGst = pyStr(m[uk.gst] ?? '').trim().toUpperCase();
    }
    const options = [];
    if (ch2Wsp !== null && ch2Wsp > 0) options.push(['CH2', ch2Wsp]);
    if (uhpWsp !== null && uhpWsp > 0) options.push(['UHP', uhpWsp]);
    let baseWsp = null, baseSrc = null;
    if (options.length) {
      let best = options[0];
      for (const o of options) if (o[1] < best[1]) best = o;
      baseSrc = best[0]; baseWsp = best[1];
    }
    let newRrp = null;
    if (baseSrc === 'CH2' && ch2Rrp !== null) newRrp = ch2Rrp;
    else if (baseSrc === 'UHP' && uhpRrp !== null) newRrp = uhpRrp;
    else if (ch2Rrp !== null) newRrp = ch2Rrp;
    else if (uhpRrp !== null) newRrp = uhpRrp;
    let hasGst = null;
    if (uhpGst) hasGst = uhpGst;
    else if (ch2Gst) hasGst = ch2Gst;
    else if (posGst !== null) hasGst = posGst > 0 ? 'Y' : 'N';

    const brand = cleanBrand(m.MASTER_BRAND ?? ''), barcode = cleanBarcode(m.MASTER_BARCODE ?? ''), plu = pyStr(m.MASTER_POS_PLU ?? '').trim();
    let mult = 1.0, markup = 1.0, type = 'NO DISCOUNT';
    const cands = [];
    let eff = posSupplier, inferred = false;
    if (!eff && brand && disc.supplierBrand.has(brand)) { eff = disc.supplierBrand.get(brand); inferred = true; }
    if (eff && disc.supplier.has(eff)) cands.push([inferred ? 'SUPPLIER (Brand Match)' : 'SUPPLIER (POS)', disc.supplier.get(eff)]);
    if (brand) {
      if (eff && disc.brand.has(`B|${brand}|${eff}`)) cands.push(['BRAND', disc.brand.get(`B|${brand}|${eff}`)]);
      if (disc.brand.has(`L|${brand}`)) cands.push(['BRAND', disc.brand.get(`L|${brand}`)]);
      const desc = [m[pk.description] ?? '', m[sk.description] ?? '', m[uk.description] ?? '']
        .map(v => (v ? String(v) : '')).join(' ').trim().toUpperCase();
      for (const [key, val] of disc.brand) {
        if (key[0] !== 'P') continue;
        const parts = key.split('|'), prefix = parts[1], ruleSup = parts[2] ? Number(parts[2]) : null;
        if (ruleSup && ruleSup !== eff) continue;
        if (brand === prefix || brand.startsWith(prefix + ' ') || desc.startsWith(prefix + ' ')) cands.push(['BRAND', val]);
      }
    }
    if (plu) {
      if (eff && disc.plu.has(`${plu}|${eff}`)) cands.push(['PLU', disc.plu.get(`${plu}|${eff}`)]);
      if (disc.plu.has(plu)) cands.push(['PLU', disc.plu.get(plu)]);
    }
    if (barcode) {
      if (eff && disc.barcode.has(`${barcode}|${eff}`)) cands.push(['BARCODE', disc.barcode.get(`${barcode}|${eff}`)]);
      if (disc.barcode.has(barcode)) cands.push(['BARCODE', disc.barcode.get(barcode)]);
    }
    let rule = null;
    if (cands.length) {
      let best = cands[0];
      for (const c of cands) if (c[1][0] < best[1][0]) best = c;
      type = best[0]; mult = best[1][0]; markup = best[1][1]; rule = best[1][2] || null;
    }
    let newWsp = null, newLast = null;
    if (baseWsp !== null) { newWsp = baseWsp; newLast = mult < 1.0 ? baseWsp * mult : baseWsp; }
    let wspPct = null, wspDollar = null, lastPct = null, lastDollar = null;
    if (posWsp !== null && newWsp !== null && posWsp !== 0) { wspPct = (newWsp - posWsp) / posWsp; wspDollar = newWsp - posWsp; }
    if (posLast !== null && newLast !== null && posLast !== 0) { lastPct = (newLast - posLast) / posLast; lastDollar = newLast - posLast; }
    const display = mult < 1.0 ? `${((1.0 - mult) * 100).toFixed(2)}% / ${(markup * 100).toFixed(2)}%` : '';
    const finalGst = hasGst && ['Y', 'YES', 'TRUE', '1', '10%', '0.1'].includes(String(hasGst).trim().toUpperCase()) ? 'Yes' : 'No';
    return {
      CURRENT_WSP: posWsp, NEW_WSP: newWsp, WSP_CHANGE_PCT: wspPct, 'WSP_CHANGE_$': wspDollar,
      CURRENT_LAST_PRICE: posLast, NEW_LAST_PRICE: newLast, CHANGE_PCT_LAST_PRICE: lastPct, 'WSP_CHANGE_$_LAST_PRICE': lastDollar,
      DISCOUNT_TYPE: type, DISCOUNT_PCT: display, CURRENT_RRP: posRrp, NEW_RRP: newRrp, HAS_GST: finalGst,
      OD_SOURCE_ROW: rule && mult < 1.0 ? rule.row : '', OD_INDEX: rule && mult < 1.0 ? rule.index : '', OD_RULE: rule && mult < 1.0 ? rule.rule : '',
      OD_DISCOUNT_PCT: rule && mult < 1.0 ? rule.discount : '', OD_MARKUP_PCT: rule && mult < 1.0 ? rule.markup : '',
      OD_MEMBER: rule && mult < 1.0 ? rule.member : '', OD_MATCH: rule && mult < 1.0 ? rule.match : '', OD_DESCR: rule && mult < 1.0 ? rule.description : ''
    };
  }

  // ---------------------------------------------------------------- improved multi-point matching
  const BRAND_STOP = new Set(['THE', 'AND', 'FOR', 'WITH', 'CO', 'COMPANY', 'PRODUCTS', 'PRODUCT', 'INTERNATIONAL', 'AUSTRALIA', 'AUSTRALIAN',
    'AUS', 'NATURAL', 'NATURALS', 'NATURE', 'NATURES', 'ORGANIC', 'ORGANICS', 'PURE', 'LIFE', 'FOOD', 'FOODS', 'HEALTH', 'HEALTHY',
    'HERBS', 'HERBAL', 'NUTRITION', 'BEAUTY', 'BODY', 'CARE', 'SKIN', 'HOME', 'KIDS', 'BABY', 'PET', 'PETS', 'COFFEE', 'TEA', 'TEAS',
    'OIL', 'OILS', 'WELLNESS', 'LAB', 'LABS', 'SUPER', 'SUPERFOODS', 'PROTEIN', 'GREEN', 'PLANT', 'BIO', 'BOOK', 'BOOKS', 'UNKNOWN',
    'DISCONTINUED', 'SPECIAL', 'ORDER', 'IN', 'HOUSE', 'MISC', 'MISCELLANEOUS', 'CLINICAL', 'PROFESSIONAL', 'PRACTITIONER', 'RETAIL']);
  const stripZ = s => s.replace(/^Z{2,}\s*/, '');
  const compact = s => s.replace(/[^A-Z0-9]/g, '');
  function brandForms(value, aliases) {
    const b = cleanBrand(value);
    if (!b) return [];
    const forms = new Set([b]);
    const z = stripZ(b);
    if (z) forms.add(z);
    const noThe = z.replace(/^THE\s+/, '');
    if (noThe) forms.add(noThe);
    if (aliases) for (const f of [...forms]) { const a = aliases.get(compact(f)); if (a) for (const x of a) forms.add(x); }
    return [...forms].filter(Boolean);
  }
  function significantTokens(s) {
    return stripZ(cleanBrand(s)).replace(/['’`.]/g, '').split(/[^A-Z0-9]+/).filter(t => t.length >= 4 && !BRAND_STOP.has(t) && !/^\d+$/.test(t));
  }
  function initials(s) {
    const words = stripZ(cleanBrand(s)).replace(/['’`.]/g, '').split(/[^A-Z0-9]+/).filter(w => w && !['THE', 'AND', 'OF', 'CO'].includes(w));
    return words.length >= 2 ? words.map(w => w[0]).join('') : '';
  }
  function wordIn(token, text) {
    if (!token || !text) return false;
    const t = ' ' + stripZ(cleanBrand(text)).replace(/['’`.]/g, '').replace(/[^A-Z0-9]+/g, ' ') + ' ';
    return t.includes(' ' + token + ' ');
  }
  // Brand point: any POS brand form agrees with any supplier brand form, or a significant brand word appears in the other description.
  function brandAgrees(posBrands, posDesc, supBrands, supDesc, aliases) {
    const pf = [], sf = [];
    for (const b of posBrands) pf.push(...brandForms(b, aliases));
    for (const b of supBrands) sf.push(...brandForms(b, aliases));
    if (!pf.length || !sf.length) return { ok: false, how: '' };
    for (const a of pf) for (const b of sf) if (brandsMatchFuzzy(a, b)) return { ok: true, how: 'brand' };
    for (const a of pf) for (const b of sf) {
      const ia = initials(b), ib = initials(a), ca = compact(a), cb = compact(b);
      if ((ia.length >= 2 && ia === ca) || (ib.length >= 2 && ib === cb)) return { ok: true, how: 'initials' };
    }
    for (const b of supBrands) for (const t of significantTokens(b)) { if (pf.some(a => wordIn(t, a)) || wordIn(t, posDesc)) return { ok: true, how: 'word' }; }
    for (const a of posBrands) for (const t of significantTokens(a)) { if (wordIn(t, supDesc)) return { ok: true, how: 'word' }; }
    return { ok: false, how: '' };
  }
  const WS_TOLERANCE = 0.40, WS_MIN_GAP = 0.50;
  function wsClose(posPrices, supPrices) {
    for (const x of posPrices) {
      if (!(x > 0)) continue;
      for (const s of supPrices) {
        if (!(s > 0)) continue;
        if (Math.abs(s - x) <= Math.max(WS_TOLERANCE * x, WS_MIN_GAP)) return true;
      }
    }
    return false;
  }
  function makeSupplierIndex(label, records, keys, extra) {
    const byBarcode = new Map(), byCode = new Map();
    for (const r of records) {
      const bc = cleanBarcode(r[keys.barcode] ?? ''), code = cleanCode(r[keys.code] ?? '');
      r.__bc = bc; r.__code = code;
      r.__brands = [r[keys.brand] ?? '', ...(extra.brands || []).map(h => r[h] ?? '')].filter(v => pyStr(v).trim());
      r.__desc = pyStr(r[extra.desc] ?? '');
      r.__ws = (extra.ws || []).map(h => safeFloat(r[h] ?? ''));
      if (bc) { if (!byBarcode.has(bc)) byBarcode.set(bc, []); byBarcode.get(bc).push(r); }
      if (code) { if (!byCode.has(code)) byCode.set(code, []); byCode.get(code).push(r); }
    }
    return { label, records, keys, byBarcode, byCode };
  }
  // Shared product words between two descriptions (sizes, numbers and generic words ignored).
  function descriptionWords(s) {
    return new Set(stripZ(cleanBrand(s)).replace(/['’`.]/g, '').split(/[^A-Z0-9]+/)
      .filter(t => t.length >= 4 && !/\d/.test(t) && !BRAND_STOP.has(t)));
  }
  function descriptionsShareWord(a, b) {
    const A = descriptionWords(a);
    if (!A.size) return false;
    for (const t of descriptionWords(b)) if (A.has(t)) return true;
    return false;
  }
  function scoreCandidate(src, cand, aliases) {
    const pts = [];
    if (src.bc && cand.__bc === src.bc) pts.push('BARCODE');
    if (src.subId && cand.__code === src.subId) pts.push('SUB ID');
    const b = brandAgrees(src.brands, src.desc, cand.__brands, cand.__desc, aliases);
    if (b.ok) pts.push('BRAND');
    if (wsClose(src.ws, cand.__ws)) pts.push('W/S');
    const hasId = pts.includes('BARCODE') || pts.includes('SUB ID');
    // SUB ID + W/S alone is not enough: short codes repeat across brands (BC-01 = BC01), so the descriptions must also share a product word.
    let guard = true;
    if (!pts.includes('BARCODE') && !pts.includes('BRAND')) guard = descriptionsShareWord(src.desc, cand.__desc);
    return { points: pts.length, basis: pts, hasId: hasId && guard, brandHow: b.how };
  }
  function bestMatch(src, index, aliases, maxPoints) {
    const seen = new Set(), cands = [];
    if (src.bc && index.byBarcode.has(src.bc)) for (const r of index.byBarcode.get(src.bc)) if (!seen.has(r)) { seen.add(r); cands.push(r); }
    if (src.subId && index.byCode.has(src.subId)) for (const r of index.byCode.get(src.subId)) if (!seen.has(r)) { seen.add(r); cands.push(r); }
    let best = null, rejected = null;
    for (const r of cands) {
      const s = scoreCandidate(src, r, aliases);
      const ok = s.points >= 2 && s.hasId;
      const rank = s.points * 4 + (s.basis.includes('BARCODE') ? 2 : 0) + (s.basis.includes('SUB ID') ? 1 : 0);
      if (ok) { if (!best || rank > best.rank) best = { row: r, rank, ...s }; }
      else if (!rejected || rank > rejected.rank) rejected = { row: r, rank, ...s };
    }
    if (best) best.max = maxPoints;
    if (rejected) rejected.max = maxPoints;
    return { best, rejected, candidates: cands.length };
  }
  // Python V30.15 hierarchy, kept for verification: BARCODE (no brand check) → BRAND+SUB ID (exact) → SUB ID with fuzzy brand.
  function pythonMatch(src, posBrand, index) {
    const bkey = index.keys.brand;
    if (src.bc && index.byBarcode.has(src.bc)) return { row: index.byBarcode.get(src.bc)[0], kind: 'Barcode Match' };
    if (posBrand && src.subId && index.byCode.has(src.subId)) {
      const cand = index.byCode.get(src.subId).find(r => cleanBrand(r[bkey] ?? '') === posBrand);
      if (cand) return { row: cand, kind: 'Brand+SubID Match' };
    }
    if (src.subId && index.byCode.has(src.subId)) {
      const cand = index.byCode.get(src.subId)[0];
      const sb = cleanBrand(cand[bkey] ?? '');
      if (posBrand && sb && brandsMatchFuzzy(posBrand, sb)) return { row: cand, kind: 'Code Match' };
      return { row: null, rejected: true };
    }
    return { row: null };
  }
  function basisText(label, m) {
    return `${label} ${m.points}/${m.max}: ${m.basis.join(' + ')}`;
  }

  // ---------------------------------------------------------------- brand + description matching (v2.3.0)
  /* For supplier rows with no shared barcode or SUB ID — e.g. a POS product bought elsewhere that CH2 / Unique also list
     (Herbs of Gold rows on CH2 carry no barcode and POS keeps HoG's own code as SUB ID). Brands must agree, pack sizes must
     not conflict, the shorter description's words must all appear (abbreviations allowed: HG LTHEANINE 14C = Herbs of Gold
     L-Theanine 14c) and W/S must be close unless the descriptions are the same. Links are one-to-one and only made when
     both rows pick each other clearly; near-identical POS duplicates prefer the active (non-ZZZ) row with the closest W/S. */
  const DESC_UNIT_RE = /(\d+(?:\.\d+)?)\s*(VEGE?\s*CAPS?(?:ULES)?|VEG\s*CAPS?|V\s*CAPS?|VCAPS?|VC|CAPSULES?|CAPS?|SOFT\s*GELS?|SOFTGELS?|SG|TABLETS?|TABS?|TAB|TB|T|C|MLS?|LTR?S?|LITRES?|L|KGS?|GRAMS?|GMS?|GM|G|MCG|UG|MG|IU|SACHETS?|SACH|SACS?|PACK|PK|TEA\s*BAGS?|TBAGS?|TEABAGS?|BAGS?|LOZ(?:ENGES?)?|GUMMIES|CHEWS?|PAIRS?|S)(?![A-Z])/g;
  function descUnit(u) {
    u = u.replace(/\s+/g, '');
    if (/^(VEGE?CAPS?(ULES)?|VEGCAPS?|VCAPS?|VC|CAPSULES?|CAPS?|C|SOFTGELS?|SG)$/.test(u)) return 'C';
    if (/^(TABLETS?|TABS?|TAB|TB|T)$/.test(u)) return 'T';
    if (/^MLS?$/.test(u)) return 'ML';
    if (/^(LTR?S?|LITRES?|L)$/.test(u)) return 'L';
    if (/^KGS?$/.test(u)) return 'KG';
    if (/^(GRAMS?|GMS?|GM|G)$/.test(u)) return 'G';
    if (/^(MCG|UG)$/.test(u)) return 'MCG';
    if (/^(SACHETS?|SACH|SACS?|S)$/.test(u)) return 'S';
    if (/^(PACK|PK|PAIRS?)$/.test(u)) return 'PK';
    if (/^(TEABAGS?|TBAGS?|BAGS?)$/.test(u)) return 'BAG';
    if (/^LOZ/.test(u)) return 'LOZ';
    if (/^(GUMMIES|CHEWS?)$/.test(u)) return 'GUM';
    return u;
  }
  const PACK_CLASS = { C: 'count', T: 'count', S: 'count', PK: 'count', BAG: 'count', LOZ: 'count', GUM: 'count', G: 'weight', ML: 'volume' };
  function parseDescription(desc, dropWords) {
    let s = stripZ(cleanBrand(desc)).replace(/['’`]/g, '').replace(/\.\.+/g, ' … ').replace(/(\d),(\d{3})/g, '$1$2');
    s = s.replace(/(^|[^A-Z0-9])([A-Z])-(?=[A-Z]{3})/g, '$1$2');           // L-THEANINE = LTHEANINE, N-ACETYL = NACETYL
    s = s.replace(/(\d+)\s*X\s*(?=\d)/g, ' ');                       // 14X38G multipack → 38G
    const sizes = [], nums = [];
    s = s.replace(DESC_UNIT_RE, (m, n, u) => {
      let v = Number(n), unit = descUnit(u);
      if (unit === 'KG') { v *= 1000; unit = 'G'; } else if (unit === 'L') { v *= 1000; unit = 'ML'; }
      sizes.push([Math.round(v * 1000) / 1000, unit]); return ' ';
    });
    s = s.replace(/(^|[^A-Z0-9])(\d+(?:\.\d+)?)(?![A-Z0-9])/g, (m, pre, n) => { nums.push(Number(n)); return pre + ' '; });
    const words = s.split(/[^A-Z0-9…]+/).filter(w => w && w !== 'X' && !dropWords.has(w));
    return { words, sizes, nums, text: words.filter(w => w !== '…').join('') };
  }
  function sizesCompatible(a, b) {
    const byUnit = x => { const m = new Map(); for (const [v, u] of x.sizes) { if (!m.has(u)) m.set(u, new Set()); m.get(u).add(v); } return m; };
    const A = byUnit(a), B = byUnit(b);
    let shared = 0;
    for (const [u, vs] of A) if (B.has(u)) { shared++; if (![...vs].some(v => B.get(u).has(v))) return { ok: false }; }
    const counts = x => new Set(x.sizes.filter(s => s[1] === 'C' || s[1] === 'T').map(s => s[0]));
    const ca = counts(a), cb = counts(b);
    if (ca.size && cb.size && ![...ca].some(v => cb.has(v))) return { ok: false };
    const classes = x => new Set(x.sizes.map(s => PACK_CLASS[s[1]]).filter(Boolean));
    const ka = classes(a), kb = classes(b);
    if (ka.size && kb.size && ![...ka].some(k => kb.has(k))) return { ok: false };
    const allA = new Set([...a.nums, ...a.sizes.map(s => s[0])]), allB = new Set([...b.nums, ...b.sizes.map(s => s[0])]);
    for (const n of a.nums) if (allB.size && !allB.has(n)) return { ok: false };
    for (const n of b.nums) if (allA.size && !allA.has(n)) return { ok: false };
    return { ok: true, sameSize: shared > 0 };
  }
  function trigramCounts(s) { const m = new Map(), t = ' ' + s + ' '; for (let i = 0; i < t.length - 2; i++) { const k = t.slice(i, i + 3); m.set(k, (m.get(k) || 0) + 1); } return m; }
  function diceSimilarity(a, b) {
    if (!a.length || !b.length) return 0;
    const A = trigramCounts(a), B = trigramCounts(b); let inter = 0, na = 0, nb = 0;
    for (const v of A.values()) na += v;
    for (const v of B.values()) nb += v;
    for (const [k, v] of A) if (B.has(k)) inter += Math.min(v, B.get(k));
    return 2 * inter / (na + nb);
  }
  function abbreviates(w, full) {
    if (w === full) return true;
    if (w.length < 3 || w[0] !== full[0] || w.length > full.length) return false;
    if (full.startsWith(w)) return true;
    let j = 0; for (const ch of full) { if (ch === w[j]) j++; if (j === w.length) break; }
    return j === w.length;
  }
  function wordCoverage(aw, bw) {
    const B = bw.filter(w => w !== '…' && w.length >= 2), text = B.join(''), starts = [];
    let p = 0; for (const w of B) { starts.push(p); p += w.length; }
    const inText = w => { for (const st of starts) { if (text[st] !== w[0]) continue; let j = 0, i = st; for (; i < text.length && j < w.length; i++) if (text[i] === w[j]) j++; if (j === w.length && i - st <= w.length * 2.5) return true; } return false; };
    let hit = 0, n = 0;
    for (let i = 0; i < aw.length; i++) {
      const w = aw[i];
      if (w === '…' || w.length < 2) continue;
      n++;
      if (B.some(f => abbreviates(w, f))) hit++;
      else if (aw[i - 1] === '…' && B.some(f => f.endsWith(w))) hit++;         // POS "PAE..OUGH" — tail of a cut word
      else if (aw[i + 1] === '…' && B.some(f => f.startsWith(w))) hit++;       // head of a cut word
      else if (w.length >= 5 && (text.includes(w) || inText(w))) hit++;       // ULTRAMUSNIGHT = ULTRA MUSCLEZE NIGHT
    }
    return n ? hit / n : 0;
  }
  function descriptionSimilarity(a, b) {
    const d = diceSimilarity(a.text, b.text), ca = wordCoverage(a.words, b.words), cb = wordCoverage(b.words, a.words);
    const na = a.words.filter(w => w !== '…' && w.length >= 2).length, nb = b.words.filter(w => w !== '…' && w.length >= 2).length;
    const short = na < nb ? ca : nb < na ? cb : Math.max(ca, cb), long = na < nb ? cb : nb < na ? ca : Math.min(ca, cb);
    return { score: short * 0.5 + long * 0.2 + d * 0.3, dice: d, short, long };
  }
  function wsRelative(a, b) {
    let best = null;
    for (const x of a) { if (!(x > 0)) continue; for (const y of b) { if (!(y > 0)) continue; const r = Math.abs(x - y) / Math.max(x, y); if (best === null || r < best) best = r; } }
    return best;
  }
  // Brand names only (no description words): equal, alias / abbreviation file, whole-word containment (4+ letters) or initials.
  function brandNameInfo(b, aliases) {
    return brandForms(b, aliases).map(f => ({ c: compact(f), w: ' ' + f.replace(/[^A-Z0-9]+/g, ' ').trim() + ' ', i: initials(f) })).filter(x => x.c);
  }
  function brandInfoAgrees(A, B) {
    for (const x of A) for (const y of B) {
      if (x.c === y.c) return true;
      if (Math.min(x.c.length, y.c.length) >= 4 && (x.w.includes(y.w) || y.w.includes(x.w))) return true;
      if ((x.i.length >= 2 && x.i === y.c) || (y.i.length >= 2 && y.i === x.c)) return true;
    }
    return false;
  }
  // Common first word of descriptions per brand (HG for Herbs of Gold, BIOC for BioCeuticals) — removed before comparing.
  function descriptionPrefixes(items) {
    const counts = new Map();
    for (const it of items) {
      const b = cleanBrand(it.brands[0] || ''), w = stripZ(cleanBrand(it.desc)).split(/[^A-Z0-9]+/).filter(Boolean)[0];
      if (!b || !w) continue;
      if (!counts.has(b)) counts.set(b, new Map());
      const m = counts.get(b); m.set(w, (m.get(w) || 0) + 1);
    }
    const out = new Map();
    for (const [b, m] of counts) { let tot = 0; for (const v of m.values()) tot += v; const s = new Set(); for (const [w, v] of m) if (v >= 3 && v / tot >= 0.25) s.add(w); out.set(b, s); }
    return out;
  }
  function prepareDescriptionItems(items, aliases) {
    const prefixes = descriptionPrefixes(items);
    for (const it of items) {
      const drop = new Set();
      for (const b of it.brands) {
        for (const f of brandForms(b, aliases)) { for (const w of f.split(/[^A-Z0-9]+/)) if (w) drop.add(w); drop.add(compact(f)); const i = initials(f); if (i) drop.add(i); }
        const p = prefixes.get(cleanBrand(b)); if (p) for (const w of p) drop.add(w);
      }
      it.parsed = parseDescription(it.desc, drop);
    }
  }
  /* left / right: [{key, brands:[...], desc, ws:[...], zz}] (already filtered to unlinked rows).
     Returns Map(leftItem -> {item: rightItem, score, sim, wsr, sameSize}). */
  function matchByDescription(left, right, aliases) {
    const out = new Map();
    if (!left.length || !right.length) return out;
    prepareDescriptionItems(left, aliases); prepareDescriptionItems(right, aliases);
    const rightByBrand = new Map();
    for (const r of right) for (const b of new Set(r.brands.map(cleanBrand).filter(Boolean))) { if (!rightByBrand.has(b)) rightByBrand.set(b, []); rightByBrand.get(b).push(r); }
    const rightInfo = [...rightByBrand.keys()].map(rb => [rb, brandNameInfo(rb, aliases)]), agreeCache = new Map();
    const agreeing = b => {
      if (!agreeCache.has(b)) { const info = brandNameInfo(b, aliases); agreeCache.set(b, rightInfo.filter(([, ri]) => brandInfoAgrees(info, ri)).map(([rb]) => rb)); }
      return agreeCache.get(b);
    };
    const edges = [];
    for (const l of left) {
      if (!l.parsed.words.length) continue;
      const seen = new Set();
      for (const b of new Set(l.brands.map(cleanBrand).filter(Boolean))) for (const rb of agreeing(b)) for (const r of rightByBrand.get(rb)) {
        if (seen.has(r)) continue; seen.add(r);
        if (!r.parsed.words.length) continue;
        const sc = sizesCompatible(l.parsed, r.parsed);
        if (!sc.ok) continue;
        const sim = descriptionSimilarity(l.parsed, r.parsed);
        if (sim.short < 0.8 || sim.score < 0.5) continue;
        const wsr = wsRelative(l.ws, r.ws), wsOk = wsr !== null && wsr <= WS_TOLERANCE;
        if (wsr !== null && !wsOk && !(sim.short === 1 && sim.dice >= 0.9 && sc.sameSize)) continue;
        if (l.bc && r.bc && l.bc !== r.bc && !(wsOk && sc.sameSize && sim.score >= 0.85)) continue;   // two different real barcodes: near-certain only
        const score = sim.score + (wsOk ? 0.08 : 0) + (sc.sameSize ? 0.04 : 0) - (l.zz ? 0.03 : 0) - (r.zz ? 0.03 : 0);
        edges.push({ l, r, score, sim, wsr, wsOk, sameSize: sc.sameSize });
      }
    }
    // near-identical rows on the same side (POS duplicates) do not block each other; prefer active, then closest W/S.
    const dupCache = new Map();
    const isDup = (x, y) => {
      if (x === y) return true;
      const k = x.key < y.key ? x.key + '|' + y.key : y.key + '|' + x.key;
      if (!dupCache.has(k)) { const sc = sizesCompatible(x.parsed, y.parsed); dupCache.set(k, sc.ok && descriptionSimilarity(x.parsed, y.parsed).short >= 0.8); }
      return dupCache.get(k);
    };
    const better = (a, b) => (a.score - b.score > 0.02) || (Math.abs(a.score - b.score) <= 0.02 && ((a.l.zz + a.r.zz) < (b.l.zz + b.r.zz) || ((a.l.zz + a.r.zz) === (b.l.zz + b.r.zz) && (a.wsr ?? 9) < (b.wsr ?? 9))));
    const usedL = new Set(), usedR = new Set();
    for (let round = 0; round < 6; round++) {
      const byL = new Map(), byR = new Map();
      for (const e of edges) {
        if (usedL.has(e.l) || usedR.has(e.r)) continue;
        if (!byL.has(e.l)) byL.set(e.l, []); byL.get(e.l).push(e);
        if (!byR.has(e.r)) byR.set(e.r, []); byR.get(e.r).push(e);
      }
      const pick = (list, side) => {
        let best = list[0];
        for (const e of list) if (better(e, best)) best = e;
        const other = side === 'l' ? 'r' : 'l';
        let rival = -1;
        for (const e of list) if (e !== best && !isDup(e[other], best[other])) rival = Math.max(rival, e.score);
        return best.score - rival >= 0.05 ? best : null;
      };
      let added = 0;
      for (const [l, list] of byL) {
        const e = pick(list, 'l');
        if (!e || pick(byR.get(e.r), 'r') !== e) continue;
        out.set(l, { item: e.r, score: e.score, sim: e.sim, wsr: e.wsr, wsOk: e.wsOk, sameSize: e.sameSize });
        usedL.add(l); usedR.add(e.r); added++;
      }
      if (!added) break;
    }
    return out;
  }
  function descriptionBasis(label, m) {
    const pts = ['BRAND', 'DESCRIPTION'];
    if (m.wsOk) pts.push('W/S');
    let txt = `${label} ${pts.length}/4: ${pts.join(' + ')} (no shared barcode / SUB ID · description ${Math.round(Math.min(1, m.sim.score) * 100)}%`;
    if (m.wsr !== null && !m.wsOk) txt += ` · W/S differs ${Math.round(m.wsr * 100)}% — check`;
    return txt + ')';
  }

  // ---------------------------------------------------------------- link checks (v2.4.0)
  /* Every POS → CH2 / UHP link shows which evidence agrees, like the POS Supplier Merge sheet's BC · SUB ID · BRAND · WSP ·
     TEXT columns: ☑ agrees, ☒ differs, ☐ cannot be checked. BC / SUB ID / BRAND / W/S use the same tests as the matching;
     TEXT = description similarity (brand words removed) ≥ 50%, the bar the brand + description matching uses; SIZE = pack
     sizes in the two descriptions agree (☐ when either has none). Score = checks agreeing out of 6.
     HIGH = 4+ agree including the barcode or SUB ID · LOW = 2 or fewer, or the pack sizes conflict · MEDIUM = between. */
  const TEXT_OK = 0.5;
  const CONF_RANK = { LOW: 0, MEDIUM: 1, HIGH: 2 };
  function checkDropWords(brands, aliases) {
    const drop = new Set();
    for (const b of brands) for (const f of brandForms(b, aliases)) {
      for (const w of f.split(/[^A-Z0-9]+/)) if (w) drop.add(w);
      drop.add(compact(f)); const i = initials(f); if (i) drop.add(i);
    }
    return drop;
  }
  function sizeCheck(a, b) {
    if (!a.sizes.length || !b.sizes.length) return null;
    const by = x => { const m = new Map(); for (const [v, u] of x.sizes) { if (!m.has(u)) m.set(u, new Set()); m.get(u).add(v); } return m; };
    const A = by(a), B = by(b);
    let shared = 0;
    // Same unit: any size within 2% agrees (POS descriptions round, e.g. 3.6KG for 3.63kg).
    const near = (v, w) => v === w || Math.abs(v - w) <= 0.02 * Math.max(Math.abs(v), Math.abs(w));
    for (const [u, vs] of A) if (B.has(u)) { shared++; if (![...vs].some(v => [...B.get(u)].some(w => near(Number(v), Number(w))))) return false; }
    if (shared) return true;
    const ka = new Set(a.sizes.map(x => PACK_CLASS[x[1]]).filter(Boolean)), kb = new Set(b.sizes.map(x => PACK_CLASS[x[1]]).filter(Boolean));
    if (ka.size && kb.size && ![...ka].some(k => kb.has(k))) return false;
    return null;
  }
  const sizeLabel = p => (p.sizes || []).map(([v, u]) => v + u).join('/');
  function linkChecks(src, row, aliases) {
    const s = scoreCandidate(src, row, aliases);
    const drop = checkDropWords([...(src.brands || []), ...(row.__brands || [])], aliases);
    const a = parseDescription(src.desc || '', drop), b = parseDescription(row.__desc || '', drop);
    const text = a.words.length && b.words.length ? Math.max(0, Math.min(1, descriptionSimilarity(a, b).score || 0)) : 0;
    const c = {
      bc: s.basis.includes('BARCODE'), sub: s.basis.includes('SUB ID'), brand: s.basis.includes('BRAND'), ws: s.basis.includes('W/S'),
      text, txt: text >= TEXT_OK, size: sizeCheck(a, b), wsr: wsRelative(src.ws, row.__ws), sizes: [sizeLabel(a), sizeLabel(b)],
      hasBc: !!(src.bc && row.__bc), hasSub: !!(src.subId && row.__code)
    };
    c.n = [c.bc, c.sub, c.brand, c.ws, c.txt, c.size === true].filter(Boolean).length;
    c.level = (c.n <= 2 || c.size === false) ? 'LOW' : (c.n >= 4 && (c.bc || c.sub)) ? 'HIGH' : 'MEDIUM';
    return c;
  }
  function checkFlags(sup, c, tier) {
    const f = [];
    if (tier === 'desc') f.push(`${sup} found by brand + description (no shared barcode / SUB ID)`);
    else if (c.bc && c.n <= 2) f.push(`${sup} barcode only`);
    if (c.hasBc && !c.bc) f.push(`${sup} barcode differs`);
    if (!c.brand) f.push(`${sup} brand differs`);
    if (!c.ws && c.wsr !== null) f.push(`${sup} W/S differs ${Math.round(c.wsr * 100)}%`);
    if (c.size === false) f.push(`${sup} pack size differs (POS ${c.sizes[0] || '?'} / ${sup} ${c.sizes[1] || '?'})`);
    if (!c.txt) f.push(`${sup} description ${Math.round(c.text * 100)}%`);
    return f;
  }
  function applyChecks(m, sup, c) {
    const tick = v => v === true ? '☑' : v === false ? '☒' : '☐';
    m[`CHK_${sup}_BC`] = c.hasBc ? tick(c.bc) : (c.bc ? '☑' : '☐');
    m[`CHK_${sup}_SUBID`] = c.hasSub ? tick(c.sub) : (c.sub ? '☑' : '☐');
    m[`CHK_${sup}_BRAND`] = tick(c.brand);
    m[`CHK_${sup}_WS`] = c.wsr === null && !c.ws ? '☐' : tick(c.ws);
    m[`CHK_${sup}_TEXT`] = Math.round(c.text * 100) / 100;
    m[`CHK_${sup}_SIZE`] = tick(c.size);
    m[`CHK_${sup}_SCORE`] = `${c.n}/6 ${c.level}`;
  }

  // ---------------------------------------------------------------- merge (Step 3 STEP 2 – STEP 7)
  /* input = {
       pos:{headers, rows}, ch2:{headers, rows}, uhp:{headers, rows}|null,
       sohSheets:[{name, rows}]|null, discountRows:[[...]]|null, availabilityRows:[[...]]|null,
       brandMap: Map(original -> substitute)|null
     } */
  function buildMaster(input) {
    const t0 = Date.now();
    const pos = input.pos, ch2 = input.ch2, uhp = input.uhp && input.uhp.headers && input.uhp.headers.length ? input.uhp : null;
    if (!pos || !pos.headers || !pos.headers.length) throw new Error('Combined Master needs the full POS dataset.');
    if (!ch2 || !ch2.headers || !ch2.headers.length) throw new Error('Combined Master needs the full CH2 dataset.');
    const pk = findColumns(pos.headers, 'pos'), sk = findColumns(ch2.headers, 'supplier'), uk = uhp ? findColumns(uhp.headers, 'uhp') : {};
    const missingPos = ['barcode', 'brand', 'plu', 'sub_id'].filter(k => !pk[k]);
    if (missingPos.length) throw new Error('POS dataset is missing: ' + missingPos.join(', '));
    const missingCh2 = ['barcode', 'brand', 'code'].filter(k => !sk[k]);
    if (missingCh2.length) throw new Error('CH2 dataset is missing: ' + missingCh2.join(', '));

    const posRecords = rowsToDicts(pos.headers, pos.rows, (h, v) => h.startsWith('POS_') ? cleanPosColumnValue(h, v) : v);
    const ch2Records = rowsToDicts(ch2.headers, ch2.rows);
    const uhpRecords = uhp ? rowsToDicts(uhp.headers, uhp.rows) : [];

    // Raw SOH overlay (V30.15) — current CR666a is the source of truth for warehouse stock.
    const soh = input.sohSheets ? readRawSohLookup(input.sohSheets) : { lookup: new Map(), stats: null };
    let sohOverlaid = 0;
    ch2Records.forEach((r, i) => {
      if (soh.lookup.size) { if (overlayRawSoh(r, r[sk.code], soh.lookup)) sohOverlaid++; }
      r.CH2_INDEX = i + 2;
    });
    uhpRecords.forEach((r, i) => { r.UHP_INDEX = i + 2; });

    // Brand aliases for matching evidence: brand abbreviation file + discount brand prefixes.
    const aliases = new Map();
    const link = (a, b) => {
      a = cleanBrand(a); b = cleanBrand(b);
      if (!a || !b || a === b) return;
      for (const [x, y] of [[a, b], [b, a]]) { const k = compact(x); if (!aliases.has(k)) aliases.set(k, new Set()); aliases.get(k).add(y); }
    };
    if (input.brandMap) for (const [a, b] of input.brandMap) link(a, b);
    for (const [b, p] of discountBrandAliases(input.discountRows)) link(b, p);

    const ch2Index = makeSupplierIndex('CH2', ch2Records, sk, { brands: ['CH2_BRAND'], desc: 'CH2_LONG_DESCRIPTION_ENHANCED', ws: [sk.wsp || 'CH2_WHOLESALE_EX_GST'] });
    const uhpIndex = makeSupplierIndex('UHP', uhpRecords, uk, { brands: ['UHP_BRAND'], desc: uk.description || 'UHP_DESCRIPTION', ws: [uk.wsp || 'UHP_WS_EX_GST', 'UHP_UNIT_WS_EX_GST'] });

    const disc = input.discountRows ? loadDiscounts(input.discountRows, posRecords, pk)
      : { supplier: new Map(), brand: new Map(), plu: new Map(), barcode: new Map(), supplierBrand: new Map(), headerRow: 1, rules: 0, keys: {} };
    const av = input.availabilityRows ? buildAvailability(input.availabilityRows, posRecords, pk) : { lookup: new Map(), meta: new Map(), supplier: new Map(), lines: new Map(), keys: {}, rows: 0 };

    let outHeaders = ['MASTER_BRAND', 'MASTER_BARCODE', 'MASTER_POS_PLU', 'MATCH_STATUS', 'POS_INDEX', 'CH2_INDEX', 'UHP_INDEX', 'AV_INDEX',
      ...pos.headers, ...ch2.headers, ...(uhp ? uhp.headers : []), ...SOH_COLUMNS, ...PRICING_HEADERS, ...AV_COLUMNS, ...OF_COLUMNS];
    outHeaders = uniq(outHeaders.map(h => String(h)));
    outHeaders.push(MATCH_BASIS, ...CHECK_COLUMNS, ...AUDIT_COLUMNS);

    const stats = {
      barcode_ch2: 0, brand_subid_ch2: 0, code_ch2: 0, subid_ws_ch2: 0, barcode_uhp: 0, brand_subid_uhp: 0, code_uhp: 0, subid_ws_uhp: 0,
      rejected_ch2: 0, rejected_uhp: 0, pos_only: 0, ch2_only: 0, ch2_only_uhp: 0, uhp_only: 0, soh_match: 0, av_match: 0,
      supplier_discount: 0, supplier_via_brand: 0, brand_discount: 0, plu_discount: 0, barcode_discount: 0, no_discount: 0,
      brand_mismatch_accepted: 0, desc_ch2: 0, desc_uhp: 0, desc_ch2_uhp: 0, barcode_only_ch2: 0, barcode_only_uhp: 0,
      one_to_one_ch2: 0, one_to_one_uhp: 0, av_only: 0
    };
    const usedCh2 = new Set(), usedUhp = new Set(), usedUhpBarcodes = new Set();
    const auditLinks = [];
    const pythonMode = input.matchMode === 'python';
    const all = [];
    const strip = r => { const o = {}; for (const k in r) if (k.slice(0, 2) !== '__') o[k] = r[k]; return o; };
    const label = (sup, m) => {
      const b = m.basis;
      if (m.tier === 'desc') return `Brand+Description Match (${sup})`;
      if (b.includes('BARCODE')) return `Barcode Match (${sup})`;
      if (b.includes('BRAND')) return (m.exactBrand ? 'Brand+SubID Match' : 'Code Match') + ` (${sup})`;
      return `SubID+W/S Match (${sup})`;
    };
    const countMatch = (sup, m) => {
      const k = sup.toLowerCase();
      if (m.tier === 'desc') { stats['desc_' + k]++; return; }
      if (m.basis.includes('BARCODE')) { stats['barcode_' + k]++; if (!m.basis.includes('BRAND')) stats.brand_mismatch_accepted++; if (m.points === 1) stats['barcode_only_' + k]++; }
      else if (m.basis.includes('BRAND')) stats[(m.exactBrand ? 'brand_subid_' : 'code_') + k]++;
      else stats['subid_ws_' + k]++;
    };
    const tallyDiscount = t => {
      if (t.startsWith('SUPPLIER')) { stats.supplier_discount++; if (t.includes('Brand Match')) stats.supplier_via_brand++; }
      else if (t === 'BRAND') stats.brand_discount++;
      else if (t === 'PLU') stats.plu_discount++;
      else if (t === 'BARCODE') stats.barcode_discount++;
      else stats.no_discount++;
    };

    // ---- POS → supplier links. ch2Link[i] / uhpLink[i] = {row, status, basis, tier, ...} for POS row i.
    const ch2Link = new Array(posRecords.length).fill(null), uhpLink = new Array(posRecords.length).fill(null);
    const posNotes = posRecords.map(() => []);
    const posSrc = posRecords.map((row, i) => ({
      i, key: 'P' + i,
      bc: cleanBarcode(row[pk.barcode] ?? ''),
      subId: cleanCode(row[pk.sub_id] ?? ''),
      brands: [row[pk.brand] ?? '', row.POS_BRAND ?? ''].filter(v => pyStr(v).trim()),
      desc: pyStr(row[pk.description] ?? ''),
      ws: [safeFloat(row[pk.wsp] ?? ''), safeFloat(row[pk.last_price] ?? '')],
      posBrand: cleanBrand(row[pk.brand] ?? ''),
      zz: /^Z{2,}/.test(cleanBrand(row[pk.description] ?? '')) || /^Z{2,}/.test(cleanBrand(row.POS_BRAND ?? '')) ? 1 : 0
    }));
    if (pythonMode) {
      posSrc.forEach(src => {
        const c = pythonMatch(src, src.posBrand, ch2Index);
        if (c.row) {
          usedCh2.add(c.row.CH2_INDEX);
          stats[{ 'Barcode Match': 'barcode_ch2', 'Brand+SubID Match': 'brand_subid_ch2', 'Code Match': 'code_ch2' }[c.kind]]++;
          ch2Link[src.i] = { row: c.row, status: `${c.kind} (CH2)`, basis: `CH2: ${c.kind} (Python V30.15 rules)` };
        } else if (c.rejected) stats.rejected_ch2++;
        if (uhp) {
          const u = pythonMatch(src, src.posBrand, uhpIndex);
          if (u.row) {
            if (u.kind === 'Barcode Match') usedUhpBarcodes.add(src.bc);
            stats[{ 'Barcode Match': 'barcode_uhp', 'Brand+SubID Match': 'brand_subid_uhp', 'Code Match': 'code_uhp' }[u.kind]]++;
            uhpLink[src.i] = { row: u.row, kind: u.kind, basis: `UHP: ${u.kind} (Python V30.15 rules)` };
          } else if (u.rejected) stats.rejected_uhp++;
        }
      });
    } else {
      /* One-to-one: every candidate pair is scored, then the strongest pairs are linked first (barcode before SUB ID, more
         points first, closest W/S, active POS row before ZZZ, then file order). A supplier row is never reused, so a POS
         duplicate that loses keeps a note naming the POS row that holds the link. Rows still free are then compared on
         brand + description. */
      const linkSupplier = (sup, index, keys, links, used, idxKey) => {
        const edges = [];
        for (const src of posSrc) {
          const seen = new Set(), cands = [];
          if (src.bc && index.byBarcode.has(src.bc)) for (const r of index.byBarcode.get(src.bc)) if (!seen.has(r)) { seen.add(r); cands.push(r); }
          if (src.subId && index.byCode.has(src.subId)) for (const r of index.byCode.get(src.subId)) if (!seen.has(r)) { seen.add(r); cands.push(r); }
          let rejected = null;
          for (const r of cands) {
            const s = scoreCandidate(src, r, aliases);
            const hasBc = s.basis.includes('BARCODE');
            if (!(hasBc || (s.points >= 2 && s.hasId))) { if (!rejected || s.points > rejected.points) rejected = { row: r, ...s }; continue; }
            edges.push({ src, row: r, rank: (hasBc ? 100 : 0) + s.points * 4 + (s.basis.includes('SUB ID') ? 1 : 0), wsr: wsRelative(src.ws, r.__ws), ...s });
          }
          if (rejected) src['rejected' + sup] = rejected;
        }
        edges.sort((a, b) => b.rank - a.rank || a.src.zz - b.src.zz || (a.wsr ?? 9) - (b.wsr ?? 9) || a.src.i - b.src.i || a.row[idxKey] - b.row[idxKey]);
        const holder = new Map();
        for (const e of edges) {
          if (links[e.src.i] || holder.has(e.row)) continue;
          e.max = 4; e.exactBrand = e.src.posBrand && cleanBrand(e.row[keys.brand] ?? '') === e.src.posBrand;
          let basis = basisText(sup, e);
          if (e.points === 1) basis += ' (barcode only — brand and W/S differ, check)';
          links[e.src.i] = { row: e.row, m: e, basis, tier: 'id' };
          holder.set(e.row, e.src); used.add(e.row[idxKey]);
        }
        // Brand + description for POS rows and supplier rows that are both still free.
        const left = index.records.filter(r => !used.has(r[idxKey])).map(r => ({
          key: sup + r[idxKey], row: r, brands: r.__brands, desc: r.__desc, ws: r.__ws,
          zz: /^Z{2,}/.test(cleanBrand(r.__desc)) ? 1 : 0, bc: r.__bc
        }));
        const right = posSrc.filter(s => !links[s.i]);
        const found = matchByDescription(left, right, aliases);
        for (const [l, f] of found) {
          const src = f.item;
          const m = { tier: 'desc', basis: ['BRAND', 'DESCRIPTION'].concat(f.wsOk ? ['W/S'] : []), points: f.wsOk ? 3 : 2, max: 4, ...f };
          links[src.i] = { row: l.row, m, basis: descriptionBasis(sup, f), tier: 'desc' };
          used.add(l.row[idxKey]);
          if (src['rejected' + sup]) delete src['rejected' + sup];
        }
        // POS rows that lost their barcode / SUB ID candidate to another POS row (and found nothing else) keep a note.
        const noted = new Set();
        for (const e of edges) {
          if (links[e.src.i] || noted.has(e.src.i) || !holder.has(e.row)) continue;
          noted.add(e.src.i); stats['one_to_one_' + sup.toLowerCase()]++;
          posNotes[e.src.i].push(`${sup} item ${e.row[keys.code] ?? ''} (${e.basis.join(' + ')}) is linked to POS row ${holder.get(e.row).i + 2} — one supplier row per POS product`);
        }
      };
      linkSupplier('CH2', ch2Index, sk, ch2Link, usedCh2, 'CH2_INDEX');
      if (uhp) linkSupplier('UHP', uhpIndex, uk, uhpLink, usedUhp, 'UHP_INDEX');
      for (const src of posSrc) {
        for (const [sup, keys] of [['CH2', sk], ['UHP', uk]]) {
          const rj = src['rejected' + sup];
          if (!rj || (sup === 'CH2' ? ch2Link : uhpLink)[src.i]) continue;
          stats['rejected_' + sup.toLowerCase()]++;
          if (rj.points >= 2) posNotes[src.i].push(`${sup} not linked ${rj.points}/4: ${rj.basis.join(' + ') || 'SUB ID only'} · item ${rj.row[keys.code] ?? ''}`);
        }
      }
    }

    // ---- POS rows (one master row per POS row)
    const avMatched = new Set();
    const applyAvailability = (m, plu) => {
      stats.av_match++; avMatched.add(plu);
      const qty = av.lookup.get(plu), meta = av.meta.get(plu) || {};
      m.AV_INDEX = safeInt(meta.AV_INDEX ?? '', '');
      m.AV_BRAND = meta.AV_BRAND ?? '';
      m.AV_BARCODE = meta.AV_BARCODE ?? '';
      m.AV_PLU_SKU = plu;
      m.AV_QTY_UNITS = qty;
      m.AV_SUPPLIER_NUMBER = av.supplier.get(plu) ?? '';
      m.AV_SOURCE_ROWS = (av.lines.get(plu) || []).join(', ');
      const itemSoh = {};
      for (const col of SOH_COLUMNS) itemSoh[col] = safeInt(m[col] ?? 0, 0);
      const f = calculateOrderFulfillment(qty, itemSoh);
      for (const col of OF_COLUMNS) if (col in f) m[col] = f[col];
    };
    posRecords.forEach((row, i) => {
      const src = posSrc[i], cl = ch2Link[i], ul = uhpLink[i];
      const supRow = cl ? cl.row : null, uhpRow = ul ? ul.row : null;
      let status = 'POS Only';
      const basis = [];
      if (pythonMode) {
        if (cl) { status = cl.status; basis.push(cl.basis); }
        if (ul) { status = status === 'POS Only' ? `${ul.kind} (UHP)` : status + ' + UHP'; basis.push(ul.basis); }
      } else {
        if (cl) { status = label('CH2', cl.m); countMatch('CH2', cl.m); basis.push(cl.basis); }
        if (ul) { countMatch('UHP', ul.m); status = status === 'POS Only' ? label('UHP', ul.m) : status + ' + UHP'; basis.push(ul.basis); }
        basis.push(...posNotes[i]);
      }
      const m = Object.assign({}, row, supRow ? strip(supRow) : {}, uhpRow ? strip(uhpRow) : {});
      m.POS_INDEX = i + 2;
      m.CH2_INDEX = supRow ? supRow.CH2_INDEX : '';
      m.UHP_INDEX = uhpRow ? uhpRow.UHP_INDEX : '';
      m.MATCH_STATUS = status;
      m.MASTER_BRAND = src.posBrand;
      m.MASTER_BARCODE = src.bc;
      m.MASTER_POS_PLU = pyStr(row[pk.plu] ?? '').trim();
      m.AV_INDEX = '';
      m[MATCH_BASIS] = basis.join(' · ');
      // v2.4.0 link checks
      const flags = [], levels = [];
      for (const [sup, lk] of [['CH2', cl], ['UHP', ul]]) {
        if (!lk || !lk.row) continue;
        const c = linkChecks(src, lk.row, aliases);
        applyChecks(m, sup, c);
        flags.push(...checkFlags(sup, c, lk.tier));
        levels.push(c.level);
        auditLinks.push({ m, sup, c, tier: lk.tier || (pythonMode ? 'python' : 'id'), pos: row, row: lk.row });
      }
      m.CHK_CONFIDENCE = levels.length ? levels.reduce((a, b) => CONF_RANK[b] < CONF_RANK[a] ? b : a) : 'NO LINK';
      m.CHK_FLAGS = flags.join(' · ');
      if (supRow && safeInt(m.SOH_TOTAL, 0) > 0) stats.soh_match++;
      const pricing = calculatePricing(m, pk, sk, uk, disc);
      Object.assign(m, pricing);
      tallyDiscount(pricing.DISCOUNT_TYPE);
      if (m.MASTER_POS_PLU && av.lookup.has(m.MASTER_POS_PLU)) applyAvailability(m, m.MASTER_POS_PLU);
      if (status === 'POS Only') stats.pos_only++;
      all.push(m);
    });

    // ---- CH2 rows not linked to POS: every one is kept (CH2 data fully preserved), linked one-to-one to a free UHP row
    //      by barcode first, then by brand + description.
    const ch2Only = ch2Records.filter(r => !usedCh2.has(r.CH2_INDEX));
    const ch2OnlyUhp = new Map();
    if (uhp && pythonMode) {
      for (const r of ch2Only) if (r.__bc && uhpIndex.byBarcode.has(r.__bc)) { ch2OnlyUhp.set(r, { row: uhpIndex.byBarcode.get(r.__bc)[0], basis: 'UHP: Barcode Match (Python V30.15 rules)' }); usedUhpBarcodes.add(r.__bc); }
    } else if (uhp) {
      const edges = [];
      for (const r of ch2Only) {
        if (!r.__bc || !uhpIndex.byBarcode.has(r.__bc)) continue;
        const src = { bc: r.__bc, subId: '', brands: r.__brands, desc: r.__desc, ws: r.__ws };
        for (const u of uhpIndex.byBarcode.get(r.__bc)) {
          if (usedUhp.has(u.UHP_INDEX)) continue;
          const s = scoreCandidate(src, u, aliases);
          edges.push({ r, u, s, wsr: wsRelative(r.__ws, u.__ws) });
        }
      }
      edges.sort((a, b) => b.s.points - a.s.points || (a.wsr ?? 9) - (b.wsr ?? 9) || a.r.CH2_INDEX - b.r.CH2_INDEX || a.u.UHP_INDEX - b.u.UHP_INDEX);
      for (const e of edges) {
        if (ch2OnlyUhp.has(e.r) || usedUhp.has(e.u.UHP_INDEX)) continue;
        e.s.max = 3;
        ch2OnlyUhp.set(e.r, { row: e.u, basis: basisText('UHP', e.s) + (e.s.points === 1 ? ' (barcode only — check)' : '') });
        usedUhp.add(e.u.UHP_INDEX);
      }
      const left = ch2Only.filter(r => !ch2OnlyUhp.has(r)).map(r => ({ key: 'C' + r.CH2_INDEX, row: r, brands: r.__brands, desc: r.__desc, ws: r.__ws, zz: 0, bc: r.__bc }));
      const right = uhpRecords.filter(u => !usedUhp.has(u.UHP_INDEX)).map(u => ({ key: 'U' + u.UHP_INDEX, row: u, brands: u.__brands, desc: u.__desc, ws: u.__ws, zz: 0, bc: u.__bc }));
      for (const [l, f] of matchByDescription(left, right, aliases)) {
        ch2OnlyUhp.set(l.row, { row: f.item.row, basis: descriptionBasis('UHP', f), desc: true });
        usedUhp.add(f.item.row.UHP_INDEX);
      }
    }
    for (const r of ch2Only) {
      stats.ch2_only++;
      const link = ch2OnlyUhp.get(r) || null, uhpRow = link ? link.row : null;
      if (link) { stats.ch2_only_uhp++; if (link.desc) stats.desc_ch2_uhp++; }
      const m = Object.assign({}, strip(r), uhpRow ? strip(uhpRow) : {});
      m.POS_INDEX = '';
      m.CH2_INDEX = r.CH2_INDEX;
      m.UHP_INDEX = uhpRow ? uhpRow.UHP_INDEX : '';
      m.MATCH_STATUS = uhpRow ? 'CH2 Only + UHP' : 'CH2 Only';
      m.MASTER_BRAND = cleanBrand(r[sk.brand] ?? '');
      m.MASTER_BARCODE = r.__bc;
      m.MASTER_POS_PLU = '';
      m.AV_INDEX = ''; m.AV_BRAND = ''; m.AV_BARCODE = '';
      m[MATCH_BASIS] = link ? link.basis : (pythonMode ? '' : 'Not in POS — no POS row matched by barcode, SUB ID or brand + description');
      m.CHK_CONFIDENCE = 'NOT IN POS';
      if (safeInt(m.SOH_TOTAL, 0) > 0) stats.soh_match++;
      const pricing = calculatePricing(m, pk, sk, uk, disc);
      Object.assign(m, pricing);
      tallyDiscount(pricing.DISCOUNT_TYPE);
      all.push(m);
    }

    // ---- UHP rows not linked above: every one appears once (rows without a barcode included).
    const uhpOnly = pythonMode
      ? [...uhpIndex.byBarcode.entries()].filter(([bc]) => !usedUhpBarcodes.has(bc)).map(([, list]) => list[0])
      : uhpRecords.filter(r => !usedUhp.has(r.UHP_INDEX));
    for (const r of uhpOnly) {
      stats.uhp_only++;
      const m = strip(r);
      m.POS_INDEX = ''; m.CH2_INDEX = ''; m.UHP_INDEX = r.UHP_INDEX;
      m.MATCH_STATUS = 'UHP Only';
      m.MASTER_BRAND = cleanBrand(r[uk.brand] ?? '');
      m.MASTER_BARCODE = r.__bc;
      m.MASTER_POS_PLU = '';
      m.AV_INDEX = ''; m.AV_BRAND = ''; m.AV_BARCODE = '';
      m[MATCH_BASIS] = pythonMode ? '' : 'Not in POS or CH2' + (r.__bc ? '' : ' · no barcode on the Unique row');
      m.CHK_CONFIDENCE = 'NOT IN POS';
      const pricing = calculatePricing(m, pk, sk, uk, disc);
      Object.assign(m, pricing);
      tallyDiscount(pricing.DISCOUNT_TYPE);
      all.push(m);
    }

    // ---- To-Order lines whose PLU is not in POS: kept as AV Only rows so every ordered unit stays in both outputs.
    for (const [plu, qty] of (pythonMode ? new Map() : av.lookup)) {
      if (avMatched.has(plu)) continue;
      stats.av_only++;
      const meta = av.meta.get(plu) || {};
      const m = { POS_INDEX: '', CH2_INDEX: '', UHP_INDEX: '', MATCH_STATUS: 'AV Only', MASTER_BRAND: '', MASTER_BARCODE: '', MASTER_POS_PLU: plu };
      m.AV_INDEX = safeInt(meta.AV_INDEX ?? '', '');
      m.AV_BRAND = ''; m.AV_BARCODE = '';
      m.AV_PLU_SKU = plu; m.AV_QTY_UNITS = qty; m.AV_SUPPLIER_NUMBER = av.supplier.get(plu) ?? '';
      m.AV_SOURCE_ROWS = (av.lines.get(plu) || []).join(', ');
      for (const col of OF_COLUMNS) if (col !== 'OF_SHORTFALL') m[col] = '';
      if (qty > 0) m.OF_SHORTFALL = qty;
      m[MATCH_BASIS] = `To-Order PLU ${plu} is not in the POS stock file — kept so the order total stays complete`;
      m.CHK_CONFIDENCE = 'NOT IN POS';
      const pricing = calculatePricing(m, pk, sk, uk, disc);
      Object.assign(m, pricing);
      tallyDiscount(pricing.DISCOUNT_TYPE);
      all.push(m);
    }

    // Sort alphabetically by MASTER_BRAND, then MASTER_BARCODE (stable, like Python list.sort).
    const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
    all.sort((x, y) => cmp(x.MASTER_BRAND || '', y.MASTER_BRAND || '') || cmp(x.MASTER_BARCODE || '', y.MASTER_BARCODE || ''));

    const audit = buildAudit(all, auditLinks, stats, pk, sk, uk, !!uhp);
    const validation = validateOrderFulfillment(all, av.lookup);
    const orderRecords = all.filter(r => r.AV_INDEX !== '' && r.AV_INDEX !== null && r.AV_INDEX !== undefined && r.AV_INDEX !== 0);
    const orderInternal = CUSTOM_COLUMNS.filter(c => outHeaders.includes(c));
    return {
      version: VERSION, matchMode: pythonMode ? 'python' : 'points', records: all, outHeaders, selectedHeaders: SELECTED_OUTPUT_COLUMNS.slice(),
      order: { internal: orderInternal, display: ['ORDERED', ...orderInternal.map(c => CUSTOM_COLUMN_RENAMES[c] || c)], records: orderRecords },
      stats, soh: soh.stats, sohOverlaid, discounts: { headerRow: disc.headerRow, rules: disc.rules, keys: disc.keys },
      availability: { rows: av.rows, uniquePlus: av.lookup.size, keys: av.keys }, validation, keys: { pk, sk, uk }, ms: Date.now() - t0,
      sources: { discounts: input.discountRows || null, availability: input.availabilityRows || null }, audit
    };
  }

  // ---------------------------------------------------------------- match audit (v2.4.0, Match_Audit tab of the full file)
  function buildAudit(all, links, stats, pk, sk, uk, hasUhp) {
    const rowOf = new Map(); all.forEach((r, i) => rowOf.set(r, i + 2));
    const sups = hasUhp ? ['CH2', 'UHP'] : ['CH2'];
    const blank = () => ({ linked: 0, HIGH: 0, MEDIUM: 0, LOW: 0, bc: 0, sub: 0, brand: 0, ws: 0, txt: 0, sizeOk: 0, sizeBad: 0, bcOnly: 0, desc: 0, bcDiff: 0, wsFar: 0 });
    const t = { CH2: blank(), UHP: blank() };
    for (const l of links) {
      const x = t[l.sup], c = l.c;
      x.linked++; x[c.level]++;
      if (c.bc) x.bc++; if (c.sub) x.sub++; if (c.brand) x.brand++; if (c.ws) x.ws++; if (c.txt) x.txt++;
      if (c.size === true) x.sizeOk++; if (c.size === false) x.sizeBad++;
      if (l.tier === 'desc') x.desc++; else if (c.bc && c.n <= 2) x.bcOnly++;
      if (c.hasBc && !c.bc) x.bcDiff++;
      if (!c.ws && c.wsr !== null) x.wsFar++;
    }
    const posBc = new Map();
    for (const r of all) { if (r.POS_INDEX === '' || r.POS_INDEX === undefined) continue; const b = r.MASTER_BARCODE; if (b) posBc.set(b, (posBc.get(b) || 0) + 1); }
    const dupBc = [...posBc.values()].filter(v => v > 1).length;
    const count = st => all.filter(r => r.MATCH_STATUS === st || String(r.MATCH_STATUS).startsWith(st)).length;
    const pct = (a, b) => b ? Math.round(a / b * 1000) / 10 + '%' : '';
    const row = (label, f, note) => [label, ...sups.map(s => f(t[s])), note];
    const summary = [
      row('POS rows linked', x => x.linked, 'POS products with a CH2 / Unique row linked to them'),
      row('HIGH confidence', x => x.HIGH, '4+ of 6 checks agree, including the barcode or SUB ID'),
      row('MEDIUM confidence', x => x.MEDIUM, '3 checks agree, or 4+ without the barcode / SUB ID — worth a glance'),
      row('LOW confidence', x => x.LOW, '2 or fewer checks agree, or the pack sizes conflict — check these first'),
      row('BC ☑ barcode agrees', x => `${x.bc.toLocaleString('en-AU')} (${pct(x.bc, x.linked)})`, 'Cleaned to the POS 13-digit form'),
      row('SUB ID ☑ agrees', x => `${x.sub.toLocaleString('en-AU')} (${pct(x.sub, x.linked)})`, 'POS SUB ID = supplier item / stock code'),
      row('BRAND ☑ agrees', x => `${x.brand.toLocaleString('en-AU')} (${pct(x.brand, x.linked)})`, 'Brand names, abbreviations, initials or the brand word in the description'),
      row('W/S ☑ within 40% / $0.50', x => `${x.ws.toLocaleString('en-AU')} (${pct(x.ws, x.linked)})`, 'Supplier W/S against POS W/S or last price'),
      row('TEXT ☑ description ≥ 50%', x => `${x.txt.toLocaleString('en-AU')} (${pct(x.txt, x.linked)})`, 'Description similarity with brand words removed'),
      row('SIZE ☑ pack size agrees', x => x.sizeOk, '☐ when either description has no pack size'),
      row('SIZE ☒ pack size differs', x => x.sizeBad, 'Same barcode / code but a different pack — likely the wrong product or a changed barcode'),
      row('Barcode differs', x => x.bcDiff, 'Both rows have a barcode but they differ (linked on SUB ID / description)'),
      row('Barcode-only links', x => x.bcOnly, 'Linked on the barcode with little else agreeing'),
      row('Brand + description links', x => x.desc, 'No shared barcode or SUB ID — products bought elsewhere'),
      row('W/S differs more than 40%', x => x.wsFar, 'Linked, but the price is far from POS — check pack size / units'),
      row('POS rows left unlinked (one-to-one)', x => stats['one_to_one_' + (x === t.CH2 ? 'ch2' : 'uhp')] || 0, 'A supplier row wanted by two POS rows goes to the stronger one; the other keeps a MATCH_BASIS note'),
      row('Candidates rejected', x => stats['rejected_' + (x === t.CH2 ? 'ch2' : 'uhp')] || 0, 'Shared barcode / SUB ID but not enough agreeing evidence to link')
    ];
    const totals = [
      ['POS Only (no CH2 or Unique link)', count('POS Only')],
      ['CH2 Only (not in POS)', count('CH2 Only')],
      ['UHP Only (not in POS or CH2)', count('UHP Only')],
      ['POS barcodes used by more than one POS row', dupBc]
    ];
    const order = { LOW: 0, MEDIUM: 1, HIGH: 2 };
    const list = links.filter(l => l.c.level !== 'HIGH').sort((a, b) => order[a.c.level] - order[b.c.level] || String(a.m.MASTER_BRAND).localeCompare(String(b.m.MASTER_BRAND)) || rowOf.get(a.m) - rowOf.get(b.m)).map(l => {
      const k = l.sup === 'CH2' ? sk : uk, c = l.c, tick = v => v === true ? '☑' : v === false ? '☒' : '☐';
      const supWs = l.sup === 'CH2' ? (l.row[sk.wsp || 'CH2_WHOLESALE_EX_GST'] ?? '') : (l.row[uk.wsp || 'UHP_WS_EX_GST'] ?? '');
      return [c.level, l.sup, `${c.n}/6`, tick(c.bc), tick(c.sub), tick(c.brand), tick(c.ws), Math.round(c.text * 100) / 100, tick(c.size),
        checkFlags(l.sup, c, l.tier).join(' · '), rowOf.get(l.m),
        pyStr(l.pos[pk.plu] ?? ''), l.m.MASTER_BARCODE || '', pyStr(l.pos[pk.sub_id] ?? ''), pyStr(l.pos[pk.brand] ?? ''), pyStr(l.pos[pk.description] ?? ''), safeFloat(l.pos[pk.wsp] ?? ''),
        pyStr(l.row[k.code] ?? ''), l.row.__bc || '', pyStr(l.row[k.brand] ?? ''), pyStr(l.row.__desc || ''), safeFloat(supWs)];
    });
    return {
      sups, summary, totals, list, counts: { CH2: t.CH2, UHP: t.UHP },
      listHeaders: ['CONFIDENCE', 'SUPPLIER', 'SCORE', 'BC', 'SUB ID CHECK', 'BRAND CHECK', 'W/S CHECK', 'TEXT', 'SIZE', 'WHY',
        'FULL_DATA ROW', 'POS PLU', 'POS BARCODE', 'POS SUB ID', 'POS BRAND', 'POS DESCRIPTION', 'POS W/S',
        'SUPPLIER ITEM', 'SUPPLIER BARCODE', 'SUPPLIER BRAND', 'SUPPLIER DESCRIPTION', 'SUPPLIER W/S']
    };
  }

  function validateOrderFulfillment(all, avLookup) {
    const report = { errors: [], totalAv: 0, totalCalculated: 0, totalWarehouse: 0, totalShortfall: 0 };
    for (const row of all) {
      const q = safeInt(row.AV_QTY_UNITS ?? 0, 0);
      if (q > 0) {
        report.totalAv += q;
        let calc = 0;
        for (const c of OF_COLUMNS) {
          const v = safeInt(row[c] ?? 0, 0);
          calc += v;
          if (c === 'OF_SHORTFALL') report.totalShortfall += v; else report.totalWarehouse += v;
        }
        report.totalCalculated += calc;
        if (q !== calc) report.errors.push({ type: 'Fulfillment Mismatch (Row)', plu: row.MASTER_POS_PLU, expected: q, calculated: calc });
      }
    }
    if (report.totalAv !== report.totalCalculated) report.errors.push({ type: 'Total Availability Mismatch', discrepancy: report.totalAv - report.totalCalculated });
    if (report.totalWarehouse + report.totalShortfall !== report.totalCalculated) report.errors.push({ type: 'Fulfillment Logic Total Error' });
    report.integrity = avLookup && avLookup.size ? Math.max(0, 100 - report.errors.length * 15) : 100;
    return report;
  }

  // ---------------------------------------------------------------- workbooks (Python apply_excel_formatting + add_dynamic_totals_row)
  const SPECIFIC_INT_SET = new Set(SPECIFIC_INTEGER_COLS);
  function numericIfPlainInteger(v) {
    if (typeof v !== 'string') return v;
    const t = v.trim();
    if (/^(0|[1-9]\d{0,14})$/.test(t)) return Number(t);
    return v;
  }
  function columnFormat(internal, isOrder) {
    if (internal === 'OD_DISCOUNT_PCT' || internal === 'OD_MARKUP_PCT') return '0.00%';
    if (internal === 'OD_SOURCE_ROW') return '0';
    if (/^CHK_(CH2|UHP)_TEXT$/.test(internal)) return '0%';
    if (CURRENCY_COLS.includes(internal)) return CURRENCY_FMT;
    if (PERCENTAGE_COLS.includes(internal)) return '0.00%';
    if (RATES_AS_NUMBERS.includes(internal)) return '0.00';
    if (SPECIFIC_INT_SET.has(internal)) return /(_BARCODE|MASTER_BARCODE)$/.test(internal) ? '@' : '0';
    const other = (isOrder ? OTHER_INTEGER_BASE : ['AV_QTY_UNITS', ...OTHER_INTEGER_BASE]).concat(SOH_COLUMNS, OF_COLUMNS);
    if (other.includes(internal) && !SPECIFIC_INT_SET.has(internal)) return /(_WEIGHT|_KG|_BU1_WEIGHT|_MM)$/.test(internal) ? '0.00' : '#,##0';
    return null;
  }
  function columnWidth(h) {
    if (['POS_DESCR', 'POS_POS_DESC', 'CH2_LONG_DESCRIPTION_ENHANCED', 'CH2_LONG_DESCRIPTION', 'UHP_DESCRIPTION', MATCH_BASIS, 'OD_RULE', 'OD_DESCR'].includes(h)) return 36;
    if (h === 'CHK_FLAGS') return 48;
    if (h === 'CHK_CONFIDENCE') return 14;
    if (/^CHK_(CH2|UHP)_SCORE$/.test(h)) return 13;
    if (/^CHK_/.test(h)) return 8;
    return Math.min(30, Math.max(10, String(h).length + 2));
  }
  /* v2.4.0 — the full file uses the Reconcile CH2 look: navy header with gold capitals, E9F0F5 / F5F5F5 bands,
     price moves ↑ red on pink / ↓ blue on pale blue / — grey (current price in grey), ☑ green / ☒ red checks and a navy
     totals row. Values are unchanged (only cell styles and display formats differ), so every reader of the file still works. */
  const RC = {
    font: 'Google Sans', size: 9, navy: '1E3A5F', gold: 'E6CD74', ink: '1F2937', bands: ['E9F0F5', 'F5F5F5'], tol: 0.03,
    border: { left: { style: 'thin', color: 'D9E2F3' }, right: { style: 'thin', color: 'D9E2F3' }, top: { style: 'thin', color: 'D9E2F3' }, bottom: { style: 'thin', color: 'D9E2F3' } },
    variants: {
      up: { fill: 'FCE8E6', color: 'C5221F', bold: true }, down: { fill: 'E8F0FE', color: '1967D2', bold: true }, same: { color: '9AA0A6' },
      muted: { color: '9AA0A6' }, good: { fill: 'E6F4EA', color: '0F6B36', bold: true, center: true }, bad: { fill: 'FCE8E6', color: 'C5221F', bold: true, center: true },
      mid: { fill: 'FFF7E0', color: '7A4F00', bold: true, center: true }, na: { color: '9AA0A6', center: true }, none: { fill: 'EEF1F3', color: '5F6368', center: true },
      goodText: { color: '0F6B36', center: true }, badText: { color: 'C5221F', center: true }, link: { color: '1967D2', center: true }, center: { center: true }
    }
  };
  const PRICE_GROUPS = [
    { cur: 'CURRENT_WSP', neu: 'NEW_WSP', cells: ['NEW_WSP', 'WSP_CHANGE_PCT', 'WSP_CHANGE_$'] },
    { cur: 'CURRENT_LAST_PRICE', neu: 'NEW_LAST_PRICE', cells: ['NEW_LAST_PRICE', 'CHANGE_PCT_LAST_PRICE', 'WSP_CHANGE_$_LAST_PRICE'] },
    { cur: 'CURRENT_RRP', neu: 'NEW_RRP', cells: ['NEW_RRP'] }
  ];
  const priceDir = (cur, neu) => typeof cur !== 'number' || typeof neu !== 'number' ? '' : neu - cur > RC.tol ? 'up' : neu - cur < -RC.tol ? 'down' : 'same';
  function arrowFormat(h, dir) {
    const a = dir === 'up' ? '↑' : dir === 'down' ? '↓' : '—';
    const f = PERCENTAGE_COLS.includes(h) ? `"${a} "0.00%` : `"${a} $"#,##0.00`;
    return `${f};${f}`; // second section: falls show without a minus sign — the arrow gives the direction
  }
  const tickVariant = v => v === '☑' ? 'good' : v === '☒' ? 'bad' : v === '☐' ? 'na' : '';
  const levelVariant = v => { const s = String(v || ''); return /HIGH$/.test(s) ? 'good' : /MEDIUM$/.test(s) ? 'mid' : /LOW$/.test(s) ? 'bad' : s ? 'none' : ''; };
  function themeKit(st) {
    const font = (color, bold) => ({ name: RC.font, size: RC.size, color, bold: !!bold });
    const cache = {};
    return {
      header: st.style({ font: font(RC.gold, true), fill: RC.navy, align: { wrap: true, v: 'center', h: 'center' } }),
      title: st.style({ font: { name: RC.font, size: 12, color: RC.gold, bold: true }, fill: RC.navy, align: { v: 'center', h: 'left', indent: 1 } }),
      note: st.style({ font: { name: RC.font, size: RC.size, color: '53616D', italic: true }, align: { v: 'center', h: 'left', indent: 1 } }),
      totalsLabel: st.style({ fill: RC.navy, font: { name: RC.font, size: 10, color: RC.gold, bold: true }, align: { h: 'left', v: 'center', indent: 1 } }),
      totalsBlank: st.style({ fill: RC.navy }),
      totals: fmt => cache['t|' + fmt] !== undefined ? cache['t|' + fmt] : (cache['t|' + fmt] = st.style({ fill: RC.navy, numFmt: fmt, font: font(RC.gold, true), align: { h: 'right', v: 'center' } })),
      /* band 0 / 1, numFmt, variant, extra {fill, color, wrap, h} */
      cell(band, numFmt, variant, extra) {
        const key = `${band}|${numFmt || ''}|${variant || ''}|${extra ? JSON.stringify(extra) : ''}`;
        if (cache[key] !== undefined) return cache[key];
        const spec = { fill: (extra && extra.fill) || RC.bands[band], font: font((extra && extra.color) || RC.ink, extra && extra.bold), numFmt: numFmt || undefined, border: RC.border, align: { v: 'center' } };
        if (extra && extra.h) spec.align.h = extra.h;
        if (extra && extra.wrap) spec.align.wrap = true;
        const v = variant ? RC.variants[variant] : null;
        if (v) {
          if (v.fill) spec.fill = v.fill;
          spec.font = font(v.color || spec.font.color, v.bold);
          if (v.center) spec.align.h = 'center';
        }
        return (cache[key] = st.style(spec));
      }
    };
  }
  /* Match_Audit (counts) and Links_To_Check (every LOW / MEDIUM link) tabs of the full file, from buildAudit(). */
  function auditSheets(audit, kit, X) {
    if (!audit) return [];
    const sups = audit.sups, out = [];
    const sumHeader = ['CHECK', ...sups, 'WHAT IT MEANS'], w = sumHeader.length;
    const level = { 'HIGH confidence': 'good', 'MEDIUM confidence': 'mid', 'LOW confidence': 'bad', 'SIZE ☒ pack size differs': 'bad' };
    const rows = [];
    const pad = (cells, style) => { const c = cells.slice(); while (c.length < w) c.push(''); return { cells: c, styles: c.map((_, i) => typeof style === 'function' ? style(i) : style) }; };
    rows.push({ ...pad(['MATCH AUDIT — how each POS → CH2 / Unique link was checked'], kit.title), height: 26 });
    rows.push({ cells: ['☑ agrees · ☒ differs · ☐ cannot be checked (one side is blank). SCORE = checks agreeing out of 6: BC (barcode), SUB ID, BRAND, W/S, TEXT (description ≥ 50%) and SIZE (pack size).'], styles: [kit.note] });
    rows.push({ cells: ['HIGH = 4+ agree including the barcode or SUB ID · MEDIUM = 3, or 4+ without the barcode / SUB ID · LOW = 2 or fewer, or the pack sizes conflict. Matching is unchanged — these checks show the evidence behind each link.'], styles: [kit.note] });
    rows.push({ cells: ['Full_Data has the same checks per row (CHK_ columns after MATCH_BASIS). Links_To_Check lists every LOW and MEDIUM link, LOW first.'], styles: [kit.note] });
    rows.push({ cells: [], styles: [] });
    rows.push({ ...pad(sumHeader, kit.header), height: 24 });
    audit.summary.forEach((r, k) => {
      const band = k % 2, lv = level[r[0]] || '';
      rows.push({ cells: r.slice(), styles: r.map((v, i) => i === 0 ? kit.cell(band, null, '', { bold: true }) : i === r.length - 1 ? kit.cell(band, null, '', { color: '53616D' }) : kit.cell(band, typeof v === 'number' ? '#,##0' : null, lv && v ? lv : '', { h: 'right' })) });
    });
    rows.push({ cells: [], styles: [] });
    rows.push({ ...pad(['OTHER COUNTS', 'ROWS'], i => i < 2 ? kit.header : 0), height: 24 });
    audit.totals.forEach((r, k) => rows.push({ cells: r, styles: [kit.cell(k % 2, null, '', { bold: true }), kit.cell(k % 2, '#,##0', '', { h: 'right' })] }));
    const sumCols = Math.max(w, 2);
    out.push({
      name: 'Match_Audit', columnCount: sumCols, gridLines: false, dimension: `A1:${X.colLetter(sumCols)}${rows.length}`,
      widths: [44, ...sups.map(() => 18), 96].slice(0, sumCols),
      rows: function* () { for (const r of rows) { const c = r.cells.slice(), s = Array.isArray(r.styles) ? r.styles.slice() : r.styles; while (c.length < sumCols) { c.push(''); if (Array.isArray(s)) s.push(0); } yield { cells: c, styles: s, height: r.height }; } }
    });
    const H = audit.listHeaders, n = audit.list.length, idx = h => H.indexOf(h);
    const iConf = idx('CONFIDENCE'), iRow = idx('FULL_DATA ROW'), iText = idx('TEXT'), iWhy = idx('WHY'), iPosWs = idx('POS W/S'), iSupWs = idx('SUPPLIER W/S');
    const ticks = new Set(['BC', 'SUB ID CHECK', 'BRAND CHECK', 'W/S CHECK', 'SIZE'].map(idx));
    const fmtOf = i => i === iText ? '0%' : (i === iPosWs || i === iSupWs) ? CURRENCY_FMT : /BARCODE|PLU|SUB ID$|ITEM$/.test(H[i]) ? '@' : null;
    const centre = new Set([idx('SUPPLIER'), idx('SCORE')]);
    const widths = { CONFIDENCE: 13, SUPPLIER: 10, SCORE: 8, BC: 6, 'SUB ID CHECK': 8, 'BRAND CHECK': 8, 'W/S CHECK': 8, TEXT: 7, SIZE: 6, WHY: 62, 'FULL_DATA ROW': 10,
      'POS PLU': 10, 'POS BARCODE': 16, 'POS SUB ID': 12, 'POS BRAND': 20, 'POS DESCRIPTION': 42, 'POS W/S': 11, 'SUPPLIER ITEM': 12, 'SUPPLIER BARCODE': 16,
      'SUPPLIER BRAND': 20, 'SUPPLIER DESCRIPTION': 42, 'SUPPLIER W/S': 11 };
    const last = X.colLetter(H.length);
    out.push({
      name: 'Links_To_Check', columnCount: H.length, gridLines: false, freeze: 'D2', autoFilter: n ? `A1:${last}${n + 1}` : null,
      dimension: `A1:${last}${Math.max(2, n + 1)}`, widths: H.map(h => widths[h] || 12),
      rows: function* () {
        yield { cells: H, styles: kit.header, height: 30 };
        if (!n) { yield { cells: ['No LOW or MEDIUM links — every link has 4+ agreeing checks including the barcode or SUB ID.'], styles: [kit.note] }; return; }
        for (let r = 0; r < n; r++) {
          const src = audit.list[r], band = r % 2, cells = src.slice(), styles = new Array(H.length);
          for (let i = 0; i < H.length; i++) {
            const f = fmtOf(i);
            let variant = '';
            if (i === iConf) variant = levelVariant(cells[i]);
            else if (ticks.has(i)) variant = tickVariant(cells[i]);
            else if (i === iText && typeof cells[i] === 'number') variant = cells[i] >= TEXT_OK ? 'goodText' : 'badText';
            else if (i === iSupWs) variant = priceDir(cells[iPosWs], cells[i]);
            else if (i === iPosWs && typeof cells[i] === 'number') variant = 'muted';
            else if (i === iRow && cells[i]) { cells[i] = { formula: `HYPERLINK("#'Full_Data'!A${cells[i]}",${cells[i]})`, result: cells[i] }; variant = 'link'; }
            else if (centre.has(i)) variant = 'center';
            const fmt = (variant === 'up' || variant === 'down' || variant === 'same') ? arrowFormat('POS W/S', variant) : f;
            styles[i] = kit.cell(band, fmt, variant, i === iWhy && cells[i] ? { color: '7A4F00' } : null);
          }
          yield { cells, styles };
        }
      }
    });
    return out;
  }
  /* kind: 'full' | 'selected' | 'order'. Returns a Blob. */
  async function writeMasterWorkbook(kind, result, opts) {
    const X = g.XlsxLite;
    if (!X) throw new Error('xlsx-writer.js is not loaded.');
    const isOrder = kind === 'order', themed = kind === 'full';
    const internal = kind === 'full' ? result.outHeaders : kind === 'selected' ? result.selectedHeaders : ['ORDERED', ...result.order.internal];
    const display = isOrder ? result.order.display : internal;
    const records = isOrder ? result.order.records : result.records;
    const sheetName = kind === 'full' ? 'Full_Data' : kind === 'selected' ? 'Selected_Data' : 'To_Order';
    const st = new X.StyleSheet();
    const kit = themed ? themeKit(st) : null;
    const cols = internal.length, n = records.length;
    const highlight = new Set();
    if (isOrder) { internal.forEach((h, i) => { if (OF_COLUMNS.includes(h) || h === 'AV_QTY_UNITS') highlight.add(i); }); }
    else internal.forEach((h, i) => { if (HIGHLIGHT_COLUMNS.includes(h)) highlight.add(i); });
    const red = new Set(isOrder ? [] : internal.map((h, i) => RED_COLS.includes(h) ? i : -1).filter(i => i >= 0));
    const fmts = internal.map(h => h === 'ORDERED' ? null : columnFormat(h, isOrder));
    const headerStyle = themed ? kit.header : st.style({ font: { bold: true, color: 'FFFFFF' }, fill: '5B9BD5', align: { wrap: true, v: 'top', h: 'center' } });
    const bandFills = ['DDEBF7', 'FFFFFF'];
    const styleFor = {};
    const cellStyle = (band, i, isRed) => {
      const key = `${band}|${i}|${isRed ? 1 : 0}`;
      if (styleFor[key] !== undefined) return styleFor[key];
      const spec = { fill: highlight.has(i) ? 'FABF8F' : bandFills[band], numFmt: fmts[i] || undefined };
      if (isRed) spec.font = { color: 'FF0000' };
      if (isOrder && i === 0) spec.align = { h: 'center', v: 'center' };
      return (styleFor[key] = st.style(spec));
    };
    // Themed (full) cells: AV / OF order columns keep a highlight, in the theme's amber.
    const themedCell = (band, i, variant) => kit.cell(band, variant === 'up' || variant === 'down' || variant === 'same' ? arrowFormat(internal[i], variant) : fmts[i],
      variant, !variant && highlight.has(i) ? { fill: 'FFF7E0', color: '7A4F00' } : null);
    const bandStyles = [0, 1].map(b => internal.map((h, i) => themed ? themedCell(b, i, '') : cellStyle(b, i, false)));
    const border = { top: { style: 'medium', color: '000000' } };
    const totalsBlank = themed ? kit.totalsBlank : st.style({ fill: 'D9EAD3', border });
    const totalsLabel = themed ? kit.totalsLabel : st.style({ fill: 'D9EAD3', border, font: { bold: true, size: 12 }, align: { h: 'left', v: 'center', indent: 1 } });
    const totalsFmt = {};
    const totalsStyle = fmt => themed ? kit.totals(fmt) : totalsFmt[fmt] !== undefined ? totalsFmt[fmt] : (totalsFmt[fmt] = st.style({ fill: 'D9EAD3', border, numFmt: fmt, font: { bold: true, size: 11, color: '000000' }, align: { h: 'right', v: 'center' } }));
    const L = c => X.colLetter(c);
    const last = L(cols), dataEnd = n + 1;
    const totals = internal.map((h, i) => {
      if (isOrder && h === 'ORDERED') return [null, totalsBlank];
      if (i === 0) return ['📊 FILTERED TOTALS:', totalsLabel];
      const ref = `${L(i + 1)}2:${L(i + 1)}${dataEnd}`;
      if (COUNT_COLUMNS.has(h)) return [{ formula: `SUBTOTAL(103,${ref})` }, totalsStyle('#,##0')];
      if (SUM_COLUMNS.has(h)) return [{ formula: `SUBTOTAL(109,${ref})` }, totalsStyle(CURRENCY_COLS.includes(h) || h.endsWith('_$') ? CURRENCY_FMT : '#,##0')];
      if (AVG_COLUMNS.has(h)) return [{ formula: `SUBTOTAL(101,${ref})` }, totalsStyle(PERCENTAGE_COLS.includes(h) ? '0.00%' : '0.00')];
      return [null, totalsBlank];
    });
    // Themed per-row colours: price groups (current → new, ↑ ↓ —), ☑ / ☒ / ☐ checks, TEXT %, SCORE and CONFIDENCE levels.
    const at = h => internal.indexOf(h);
    const groups = themed ? PRICE_GROUPS.map(gp => ({ cur: at(gp.cur), neu: at(gp.neu), cells: gp.cells.map(at).filter(i => i >= 0) })).filter(gp => gp.cur >= 0 && gp.neu >= 0) : [];
    const tickCols = themed ? internal.map((h, i) => /^CHK_(CH2|UHP)_(BC|SUBID|BRAND|WS|SIZE)$/.test(h) ? i : -1).filter(i => i >= 0) : [];
    const textCols = themed ? internal.map((h, i) => /^CHK_(CH2|UHP)_TEXT$/.test(h) ? i : -1).filter(i => i >= 0) : [];
    const levelCols = themed ? internal.map((h, i) => h === 'CHK_CONFIDENCE' || /^CHK_(CH2|UHP)_SCORE$/.test(h) ? i : -1).filter(i => i >= 0) : [];
    let freeze = 'H2';
    if (!isOrder) { const ai = internal.indexOf('AV_INDEX'); freeze = ai >= 0 ? `${L(ai + 2)}2` : 'H2'; }
    else { const pi = display.indexOf('PLU / SKU'); freeze = pi >= 0 ? `${L(pi + 2)}2` : 'E2'; }
    const sheet = {
      name: sheetName, columnCount: cols, freeze, autoFilter: `A1:${last}${n + 1}`, dimension: `A1:${last}${n + 2}`, gridLines: themed ? false : undefined,
      widths: internal.map(h => h === 'ORDERED' ? 11 : columnWidth(h)),
      conditional: isOrder && n ? [{ ref: `A2:${last}${n + 1}`, formula: 'AND($A2<>"☐",$A2<>"")', dxf: st.dxf({ font: { color: '808080' }, fill: 'D3D3D3' }) }] : [],
      rows: function* () {
        yield { cells: display, styles: headerStyle, height: 45 };
        for (let r = 0; r < n; r++) {
          const rec = records[r], band = r % 2 === 0 ? 0 : 1, cells = new Array(cols);
          let styles = bandStyles[band];
          let copied = false;
          const set = (i, s) => { if (!copied) { styles = styles.slice(); copied = true; } styles[i] = s; };
          for (let i = 0; i < cols; i++) {
            const h = internal[i];
            let v = h === 'ORDERED' ? '☐' : rec[h];
            if (v === undefined || v === null) v = '';
            if (fmts[i] === '0') v = numericIfPlainInteger(v);
            cells[i] = v;
            if (!themed && red.has(i) && typeof v === 'number' && v > 0) set(i, cellStyle(band, i, true));
          }
          if (themed) {
            for (const gp of groups) {
              const dir = priceDir(cells[gp.cur], cells[gp.neu]);
              if (typeof cells[gp.cur] === 'number') set(gp.cur, themedCell(band, gp.cur, 'muted'));
              if (dir) for (const i of gp.cells) if (typeof cells[i] === 'number') set(i, themedCell(band, i, dir));
            }
            for (const i of tickCols) { const vt = tickVariant(cells[i]); if (vt) set(i, themedCell(band, i, vt)); }
            for (const i of textCols) if (typeof cells[i] === 'number') set(i, themedCell(band, i, cells[i] >= TEXT_OK ? 'goodText' : 'badText'));
            for (const i of levelCols) { const vl = levelVariant(cells[i]); if (vl) set(i, themedCell(band, i, vl)); }
          }
          yield themed ? { cells, styles, height: 18 } : { cells, styles };
        }
        yield { cells: totals.map(t => t[0]), styles: totals.map(t => t[1]), height: 25 };
      }
    };
    const sheets = [sheet];
    if (themed) sheets.push(...auditSheets(result.audit, kit, X));
    // Full file only: the Ongoing Discounts and To-Order files exactly as loaded, so the specials and order lines behind the
    // OD_* / AV_* columns stay visible in the master (sheet 1 is unchanged).
    if (kind === 'full' && result.sources) {
      const srcHeader = themed ? kit.header : st.style({ font: { bold: true }, fill: 'D9E1F2' });
      const srcBands = themed ? [kit.cell(0, null, '', null), kit.cell(1, null, '', null)] : [0, 0];
      const addSource = (name, rows, headerIndex) => {
        if (!rows || !rows.length) return;
        const width = Math.max(1, ...rows.map(r => (r || []).length));
        sheets.push({
          name, columnCount: width, freeze: `A${headerIndex + 2}`, dimension: `A1:${X.colLetter(width)}${rows.length}`, gridLines: themed ? false : undefined,
          widths: new Array(width).fill(16),
          rows: function* () {
            for (let r = 0; r < rows.length; r++) {
              const row = rows[r] || [], cells = new Array(width);
              for (let c = 0; c < width; c++) { const v = row[c]; cells[c] = v === null || v === undefined ? '' : v; }
              yield { cells, styles: r === headerIndex ? srcHeader : r < headerIndex ? 0 : srcBands[(r - headerIndex - 1) % 2] };
            }
          }
        });
      };
      if (result.sources.discounts) addSource('Ongoing_Discounts_Source', result.sources.discounts, Math.max(0, detectDiscountHeaderRow(result.sources.discounts) - 1));
      if (result.sources.availability) addSource('To_Order_Source', result.sources.availability, 0);
    }
    return X.writeWorkbook(sheets, st, opts || {});
  }

  // ---------------------------------------------------------------- legacy API (master.html v1)
  function merge(posRows, posHeaders, ch2Rows, ch2Headers, uhpRows, uhpHeaders) {
    const res = buildMaster({ pos: { headers: posHeaders, rows: posRows }, ch2: { headers: ch2Headers, rows: ch2Rows }, uhp: { headers: uhpHeaders, rows: uhpRows } });
    return { rows: res.records, headers: res.selectedHeaders, keys: res.keys, result: res };
  }

  g.MasterCore = {
    VERSION, COLUMN_MAPPINGS, SELECTED: SELECTED_OUTPUT_COLUMNS, SELECTED_OUTPUT_COLUMNS, SOH: SOH_COLUMNS, SOH_COLUMNS, ACTIVE_RAW_SOH_COLUMNS,
    PRICING_HEADERS, AV_COLUMNS, OF_COLUMNS, CUSTOM_COLUMNS, MATCH_BASIS, AUDIT_COLUMNS, CHECK_COLUMNS,
    findColumns, findCols: findColumns, cleanBarcode, cleanCode, cleanBrand, cleanLookup: cleanLookupIdentifier, cleanLookupIdentifier,
    brandsMatch: brandsMatchFuzzy, brandsMatchFuzzy, safeFloat, safeInt, parsePercentFraction, cleanPosColumnValue,
    detectSohLayout, readRawSohLookup, overlayRawSoh, detectDiscountHeaderRow, loadDiscounts, parseCsvText, buildAvailability,
    calculateOrderFulfillment, calculatePricing, brandAgrees, wsClose, parseDescription, sizesCompatible, descriptionSimilarity, matchByDescription, buildMaster, validateOrderFulfillment, writeMasterWorkbook,
    detectDiscountRows(rows) { const hr = detectDiscountHeaderRow(rows); const headers = headerList(rows[hr - 1]); const kc = findColumns(headers, 'discounts'); return { headerRow: hr - 1, headers, map: kc.discount_pct ? { discount: headers.indexOf(kc.discount_pct) } : {}, data: rows.slice(hr) }; },
    merge
  };
})(typeof window !== 'undefined' ? window : globalThis);
