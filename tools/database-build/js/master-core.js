/* MasterCore v2.2.0 — Combined Master (browser port of MASTER Step 3 V30.15, no pandas / no database).
   Everything runs in the browser at the time the page is used.

   Same as Python V30.15:
     - POS value cleaning (POS_MAIN_ID padded to 13, integer / float columns typed)
     - raw CR666a SOH account mapping overlaid onto every CH2 row (Sydney / Hobart / Townsville / 4PL reset to 0)
     - discount matrix (OD_* or POS_* layout, summary row, supplier-restricted rules, brand prefixes, GREATEST discount)
     - availability lookup, warehouse fulfilment priority and shortfall
     - pricing (cheapest CH2 / UHP W/S, RRP from same source, GST UHP > CH2 > POS)
     - output columns, sort (MASTER_BRAND, MASTER_BARCODE), number formats, highlight / red fonts and SUBTOTAL totals row
   Improvements:
     - multi-point matching for every supplier: BARCODE (cleaned + unified to the POS 13-digit form), SUB ID, BRAND and
       W/S (within 40% or $0.50 of POS W/S or last price; UHP unit W/S also checked). A supplier row is accepted only with at
       least 2 points, one of them BARCODE or SUB ID (SUB ID + W/S alone also needs a shared description word); the
       best-scoring candidate wins when several supplier rows share a barcode or code.
     - brand agreement also checks brand abbreviations, discount brand prefixes, discontinued ZZZ prefixes,
       initials (M&P = MARTIN & PLEASANCE) and the brand appearing in the description.
     - primary output contains one row per POS source row; unmatched suppliers are excluded.
     - MATCH_BASIS column (full file only) shows the points behind every link and any rejected barcode link. */
(function (g) {
  'use strict';
  const VERSION = '2.2.0';

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
      member: ['POS MEMBER', 'POS_MEMBER'], match: ['POS MATCH', 'POS_MATCH']
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
    for (const row of data) {
      const disc = parsePercentFraction(get(row, 'discount_pct'), null);
      if (disc === null) continue;
      let mark = kc.markup_pct ? parsePercentFraction(get(row, 'markup_pct'), null) : null;
      if (mark === null) mark = 1.0 - disc;
      if (disc < 0 || disc > 1 || mark < 0 || mark > 1) continue;
      const rule = [1.0 - disc, mark];
      const sup = safeInt(get(row, 'supplier_discount'));
      const brand = cleanBrand(get(row, 'brand'));
      const prefix = cleanBrand(get(row, 'brand_prefix'));
      const plu = cleanLookupIdentifier(get(row, 'plu'));
      const bc = cleanBarcode(get(row, 'barcode'));
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
    const out = { lookup: new Map(), meta: new Map(), supplier: new Map(), keys: {}, rows: 0 };
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
    for (const row of data) {
      const plu = pyStr(row[kc.plu]).trim();
      if (!plu || plu === 'nan') continue;
      const qty = safeInt(row[kc.quantity] ?? 0, 0);
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
    if (cands.length) {
      let best = cands[0];
      for (const c of cands) if (c[1][0] < best[1][0]) best = c;
      type = best[0]; mult = best[1][0]; markup = best[1][1];
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
      DISCOUNT_TYPE: type, DISCOUNT_PCT: display, CURRENT_RRP: posRrp, NEW_RRP: newRrp, HAS_GST: finalGst
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
    const av = input.availabilityRows ? buildAvailability(input.availabilityRows, posRecords, pk) : { lookup: new Map(), meta: new Map(), supplier: new Map(), keys: {}, rows: 0 };

    let outHeaders = ['MASTER_BRAND', 'MASTER_BARCODE', 'MASTER_POS_PLU', 'MATCH_STATUS', 'POS_INDEX', 'CH2_INDEX', 'UHP_INDEX', 'AV_INDEX',
      ...pos.headers, ...ch2.headers, ...(uhp ? uhp.headers : []), ...SOH_COLUMNS, ...PRICING_HEADERS, ...AV_COLUMNS, ...OF_COLUMNS];
    outHeaders = uniq(outHeaders.map(h => String(h)));
    outHeaders.push(MATCH_BASIS);

    const stats = {
      barcode_ch2: 0, brand_subid_ch2: 0, code_ch2: 0, subid_ws_ch2: 0, barcode_uhp: 0, brand_subid_uhp: 0, code_uhp: 0, subid_ws_uhp: 0,
      rejected_ch2: 0, rejected_uhp: 0, pos_only: 0, ch2_only: 0, ch2_only_uhp: 0, uhp_only: 0, soh_match: 0, av_match: 0,
      supplier_discount: 0, supplier_via_brand: 0, brand_discount: 0, plu_discount: 0, barcode_discount: 0, no_discount: 0,
      brand_mismatch_accepted: 0
    };
    const usedCh2 = new Set(), usedUhp = new Set(), usedUhpBarcodes = new Set();
    const pythonMode = input.matchMode === 'python';
    const all = [];
    const strip = r => { const o = {}; for (const k in r) if (k.slice(0, 2) !== '__') o[k] = r[k]; return o; };
    const label = (src, sup, m) => {
      const b = m.basis;
      if (b.includes('BARCODE')) return `Barcode Match (${sup})`;
      if (b.includes('BRAND')) return (m.exactBrand ? 'Brand+SubID Match' : 'Code Match') + ` (${sup})`;
      return `SubID+W/S Match (${sup})`;
    };
    const countMatch = (sup, m) => {
      const k = sup.toLowerCase();
      if (m.basis.includes('BARCODE')) { stats['barcode_' + k]++; if (!m.basis.includes('BRAND')) stats.brand_mismatch_accepted++; }
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

    posRecords.forEach((row, i) => {
      const src = {
        bc: cleanBarcode(row[pk.barcode] ?? ''),
        subId: cleanCode(row[pk.sub_id] ?? ''),
        brands: [row[pk.brand] ?? '', row.POS_BRAND ?? ''].filter(v => pyStr(v).trim()),
        desc: pyStr(row[pk.description] ?? ''),
        ws: [safeFloat(row[pk.wsp] ?? ''), safeFloat(row[pk.last_price] ?? '')]
      };
      const posBrand = cleanBrand(row[pk.brand] ?? ''), posPlu = pyStr(row[pk.plu] ?? '').trim();
      let status = 'POS Only';
      const basis = [];
      let supRow = null, uhpRow = null;
      if (pythonMode) {
        const c = pythonMatch(src, posBrand, ch2Index);
        if (c.row) {
          supRow = c.row; usedCh2.add(supRow.CH2_INDEX); status = `${c.kind} (CH2)`;
          stats[{ 'Barcode Match': 'barcode_ch2', 'Brand+SubID Match': 'brand_subid_ch2', 'Code Match': 'code_ch2' }[c.kind]]++;
          basis.push(`CH2: ${c.kind} (Python V30.15 rules)`);
        } else if (c.rejected) stats.rejected_ch2++;
        if (uhp) {
          const u = pythonMatch(src, posBrand, uhpIndex);
          if (u.row) {
            uhpRow = u.row; usedUhp.add(uhpRow.UHP_INDEX); if (u.kind === 'Barcode Match') usedUhpBarcodes.add(src.bc);
            stats[{ 'Barcode Match': 'barcode_uhp', 'Brand+SubID Match': 'brand_subid_uhp', 'Code Match': 'code_uhp' }[u.kind]]++;
            status = status === 'POS Only' ? `${u.kind} (UHP)` : status + ' + UHP';
            basis.push(`UHP: ${u.kind} (Python V30.15 rules)`);
          } else if (u.rejected) stats.rejected_uhp++;
        }
      } else {
        const c = bestMatch(src, ch2Index, aliases, 4);
        if (c.best) {
          c.best.exactBrand = posBrand && cleanBrand(c.best.row[sk.brand] ?? '') === posBrand;
          supRow = c.best.row; usedCh2.add(supRow.CH2_INDEX); status = label(src, 'CH2', c.best); countMatch('CH2', c.best);
          basis.push(basisText('CH2', c.best));
        } else if (c.rejected && c.rejected.basis.includes('BARCODE')) {
          stats.rejected_ch2++; basis.push(`CH2 REJECTED ${c.rejected.points}/4: ${c.rejected.basis.join(' + ')} only · item ${c.rejected.row[sk.code] ?? ''}`);
        }
        if (uhp) {
          const u = bestMatch(src, uhpIndex, aliases, 4);
          if (u.best) {
            u.best.exactBrand = posBrand && cleanBrand(u.best.row[uk.brand] ?? '') === posBrand;
            uhpRow = u.best.row; usedUhp.add(uhpRow.UHP_INDEX); countMatch('UHP', u.best);
            status = status === 'POS Only' ? label(src, 'UHP', u.best) : status + ' + UHP';
            basis.push(basisText('UHP', u.best));
          } else if (u.rejected && u.rejected.basis.includes('BARCODE')) {
            stats.rejected_uhp++; basis.push(`UHP REJECTED ${u.rejected.points}/4: ${u.rejected.basis.join(' + ')} only · item ${u.rejected.row[uk.code] ?? ''}`);
          }
        }
      }
      const m = Object.assign({}, row, supRow ? strip(supRow) : {}, uhpRow ? strip(uhpRow) : {});
      m.POS_INDEX = i + 2;
      m.CH2_INDEX = supRow ? supRow.CH2_INDEX : '';
      m.UHP_INDEX = uhpRow ? uhpRow.UHP_INDEX : '';
      m.MATCH_STATUS = status;
      m.MASTER_BRAND = posBrand;
      m.MASTER_BARCODE = src.bc;
      m.MASTER_POS_PLU = posPlu;
      m.AV_INDEX = '';
      m[MATCH_BASIS] = basis.join(' · ');
      if (supRow && safeInt(m.SOH_TOTAL, 0) > 0) stats.soh_match++;
      const pricing = calculatePricing(m, pk, sk, uk, disc);
      Object.assign(m, pricing);
      tallyDiscount(pricing.DISCOUNT_TYPE);
      if (posPlu && av.lookup.has(posPlu)) {
        stats.av_match++;
        const qty = av.lookup.get(posPlu), meta = av.meta.get(posPlu) || {};
        m.AV_INDEX = safeInt(meta.AV_INDEX ?? '', '');
        m.AV_BRAND = meta.AV_BRAND ?? '';
        m.AV_BARCODE = meta.AV_BARCODE ?? '';
        m.AV_PLU_SKU = posPlu;
        m.AV_QTY_UNITS = qty;
        m.AV_SUPPLIER_NUMBER = av.supplier.get(posPlu) ?? '';
        const itemSoh = {};
        for (const col of SOH_COLUMNS) itemSoh[col] = safeInt(m[col] ?? 0, 0);
        const f = calculateOrderFulfillment(qty, itemSoh);
        for (const col of OF_COLUMNS) if (col in f) m[col] = f[col];
      }
      if (status === 'POS Only') stats.pos_only++;
      all.push(m);
    });

    // Primary master is a POS left join: unmatched supplier rows are excluded.
    stats.excluded_ch2 = ch2Records.filter(r => !usedCh2.has(r.CH2_INDEX)).length;
    stats.excluded_uhp = uhpRecords.filter(r => pythonMode
      ? !usedUhp.has(r.UHP_INDEX) && !usedUhpBarcodes.has(r.__bc)
      : !usedUhp.has(r.UHP_INDEX)).length;

    // Sort alphabetically by MASTER_BRAND, then MASTER_BARCODE (stable, like Python list.sort).
    const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
    all.sort((x, y) => cmp(x.MASTER_BRAND || '', y.MASTER_BRAND || '') || cmp(x.MASTER_BARCODE || '', y.MASTER_BARCODE || ''));

    const validation = validateOrderFulfillment(all, av.lookup);
    const orderRecords = all.filter(r => r.AV_INDEX !== '' && r.AV_INDEX !== null && r.AV_INDEX !== undefined && r.AV_INDEX !== 0);
    const orderInternal = CUSTOM_COLUMNS.filter(c => outHeaders.includes(c));
    return {
      version: VERSION, matchMode: pythonMode ? 'python' : 'points', records: all, outHeaders, selectedHeaders: SELECTED_OUTPUT_COLUMNS.slice(),
      order: { internal: orderInternal, display: ['ORDERED', ...orderInternal.map(c => CUSTOM_COLUMN_RENAMES[c] || c)], records: orderRecords },
      stats, soh: soh.stats, sohOverlaid, discounts: { headerRow: disc.headerRow, rules: disc.rules, keys: disc.keys },
      availability: { rows: av.rows, uniquePlus: av.lookup.size, keys: av.keys }, validation, keys: { pk, sk, uk }, ms: Date.now() - t0
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
    if (CURRENCY_COLS.includes(internal)) return CURRENCY_FMT;
    if (PERCENTAGE_COLS.includes(internal)) return '0.00%';
    if (RATES_AS_NUMBERS.includes(internal)) return '0.00';
    if (SPECIFIC_INT_SET.has(internal)) return /(_BARCODE|MASTER_BARCODE)$/.test(internal) ? '@' : '0';
    const other = (isOrder ? OTHER_INTEGER_BASE : ['AV_QTY_UNITS', ...OTHER_INTEGER_BASE]).concat(SOH_COLUMNS, OF_COLUMNS);
    if (other.includes(internal) && !SPECIFIC_INT_SET.has(internal)) return /(_WEIGHT|_KG|_BU1_WEIGHT|_MM)$/.test(internal) ? '0.00' : '#,##0';
    return null;
  }
  function columnWidth(h) {
    if (['POS_DESCR', 'POS_POS_DESC', 'CH2_LONG_DESCRIPTION_ENHANCED', 'CH2_LONG_DESCRIPTION', 'UHP_DESCRIPTION', MATCH_BASIS].includes(h)) return 36;
    return Math.min(30, Math.max(10, String(h).length + 2));
  }
  /* kind: 'full' | 'selected' | 'order'. Returns a Blob. */
  async function writeMasterWorkbook(kind, result, opts) {
    const X = g.XlsxLite;
    if (!X) throw new Error('xlsx-writer.js is not loaded.');
    const isOrder = kind === 'order';
    const internal = kind === 'full' ? result.outHeaders : kind === 'selected' ? result.selectedHeaders : ['ORDERED', ...result.order.internal];
    const display = isOrder ? result.order.display : internal;
    const records = isOrder ? result.order.records : result.records;
    const sheetName = kind === 'full' ? 'Full_Data' : kind === 'selected' ? 'Selected_Data' : 'To_Order';
    const st = new X.StyleSheet();
    const cols = internal.length, n = records.length;
    const highlight = new Set();
    if (isOrder) { internal.forEach((h, i) => { if (OF_COLUMNS.includes(h) || h === 'AV_QTY_UNITS') highlight.add(i); }); }
    else internal.forEach((h, i) => { if (HIGHLIGHT_COLUMNS.includes(h)) highlight.add(i); });
    const red = new Set(isOrder ? [] : internal.map((h, i) => RED_COLS.includes(h) ? i : -1).filter(i => i >= 0));
    const fmts = internal.map(h => h === 'ORDERED' ? null : columnFormat(h, isOrder));
    const headerStyle = st.style({ font: { bold: true, color: 'FFFFFF' }, fill: '5B9BD5', align: { wrap: true, v: 'top', h: 'center' } });
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
    const bandStyles = [0, 1].map(b => internal.map((h, i) => cellStyle(b, i, false)));
    const border = { top: { style: 'medium', color: '000000' } };
    const totalsBlank = st.style({ fill: 'D9EAD3', border });
    const totalsLabel = st.style({ fill: 'D9EAD3', border, font: { bold: true, size: 12 }, align: { h: 'left', v: 'center', indent: 1 } });
    const totalsFmt = {};
    const totalsStyle = fmt => totalsFmt[fmt] !== undefined ? totalsFmt[fmt] : (totalsFmt[fmt] = st.style({ fill: 'D9EAD3', border, numFmt: fmt, font: { bold: true, size: 11, color: '000000' }, align: { h: 'right', v: 'center' } }));
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
    let freeze = 'H2';
    if (!isOrder) { const ai = internal.indexOf('AV_INDEX'); freeze = ai >= 0 ? `${L(ai + 2)}2` : 'H2'; }
    else { const pi = display.indexOf('PLU / SKU'); freeze = pi >= 0 ? `${L(pi + 2)}2` : 'E2'; }
    const sheet = {
      name: sheetName, columnCount: cols, freeze, autoFilter: `A1:${last}${n + 1}`, dimension: `A1:${last}${n + 2}`,
      widths: internal.map(h => h === 'ORDERED' ? 11 : columnWidth(h)),
      conditional: isOrder && n ? [{ ref: `A2:${last}${n + 1}`, formula: 'AND($A2<>"☐",$A2<>"")', dxf: st.dxf({ font: { color: '808080' }, fill: 'D3D3D3' }) }] : [],
      rows: function* () {
        yield { cells: display, styles: headerStyle, height: 45 };
        for (let r = 0; r < n; r++) {
          const rec = records[r], band = r % 2 === 0 ? 0 : 1, cells = new Array(cols);
          let styles = bandStyles[band];
          let copied = false;
          for (let i = 0; i < cols; i++) {
            const h = internal[i];
            let v = h === 'ORDERED' ? '☐' : rec[h];
            if (v === undefined || v === null) v = '';
            if (fmts[i] === '0') v = numericIfPlainInteger(v);
            cells[i] = v;
            if (red.has(i) && typeof v === 'number' && v > 0) {
              if (!copied) { styles = styles.slice(); copied = true; }
              styles[i] = cellStyle(band, i, true);
            }
          }
          yield { cells, styles };
        }
        yield { cells: totals.map(t => t[0]), styles: totals.map(t => t[1]), height: 25 };
      }
    };
    return X.writeWorkbook([sheet], st, opts || {});
  }

  // ---------------------------------------------------------------- legacy API (master.html v1)
  function merge(posRows, posHeaders, ch2Rows, ch2Headers, uhpRows, uhpHeaders) {
    const res = buildMaster({ pos: { headers: posHeaders, rows: posRows }, ch2: { headers: ch2Headers, rows: ch2Rows }, uhp: { headers: uhpHeaders, rows: uhpRows } });
    return { rows: res.records, headers: res.selectedHeaders, keys: res.keys, result: res };
  }

  g.MasterCore = {
    VERSION, COLUMN_MAPPINGS, SELECTED: SELECTED_OUTPUT_COLUMNS, SELECTED_OUTPUT_COLUMNS, SOH: SOH_COLUMNS, SOH_COLUMNS, ACTIVE_RAW_SOH_COLUMNS,
    PRICING_HEADERS, AV_COLUMNS, OF_COLUMNS, CUSTOM_COLUMNS, MATCH_BASIS,
    findColumns, findCols: findColumns, cleanBarcode, cleanCode, cleanBrand, cleanLookup: cleanLookupIdentifier, cleanLookupIdentifier,
    brandsMatch: brandsMatchFuzzy, brandsMatchFuzzy, safeFloat, safeInt, parsePercentFraction, cleanPosColumnValue,
    detectSohLayout, readRawSohLookup, overlayRawSoh, detectDiscountHeaderRow, loadDiscounts, parseCsvText, buildAvailability,
    calculateOrderFulfillment, calculatePricing, brandAgrees, wsClose, buildMaster, validateOrderFulfillment, writeMasterWorkbook,
    detectDiscountRows(rows) { const hr = detectDiscountHeaderRow(rows); const headers = headerList(rows[hr - 1]); const kc = findColumns(headers, 'discounts'); return { headerRow: hr - 1, headers, map: kc.discount_pct ? { discount: headers.indexOf(kc.discount_pct) } : {}, data: rows.slice(hr) }; },
    merge
  };
})(typeof window !== 'undefined' ? window : globalThis);
