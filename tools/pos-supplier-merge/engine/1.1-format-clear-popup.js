// =============================================================================
//  POS DB & SUPPLIER MERGE — 1.1 FormatClearPopup.gs
//  Version: v6.3.84-schema-aware-edit-style-retention-v1
//  v6.3.47 TMP_FORMAT_CLEAR_FIX: enable Clear for TMP_MERGED_POS_DATA.
//  v6.3.77: expose the early-scoped filtered-brand OUT build in the existing workflow queue.
//  v6.3.78: keep the same queue action; implementation uses isolated m13FB2 scope-v2 helpers.
//  v6.3.79: same queue/menu behaviour; filtered TMP selection now uses isolated m13FB3 direct-scope helpers.
//  v6.3.80: same queue/menu behaviour; filtered output cleanup is restored through isolated m13FB4 hand-off.
//  v6.3.82: workflow queue behaviour is unchanged; NEW PRODUCT brand price-level inheritance is isolated under m13PL1 in Merge.
//  v6.3.83: workflow queue behaviour is unchanged; NEW PRODUCT RRP-independent PR tier correction is isolated under m13PL2 in Merge.
//  v6.3.84: version alignment only; schema-aware onEdit style retention is isolated in 1.0 Setup. Popup/queue behaviour is unchanged.
// =============================================================================


function popupCfg_() {
  if (typeof CFG !== 'undefined' && CFG && CFG.SH) return CFG;
  return {
    SH: {
      IN_SUP: 'IN_SUPPLIER_/_PRODUCT_UPDATES',
      TMP_MERGED: 'TMP_MERGED_POS_DATA',
      OUT_MERGED: 'OUT_MERGED_DATA',
      OUT_INSERT: 'OUT_POS_INSERT',
      OUT_UPDATE: 'OUT_POS_UPDATE'
    },
    CLEAR_EXCLUDE_PREFIXES: ['SRC_', 'TMP_']
  };
}

function popupSchema_() {
  return (typeof SCHEMA !== 'undefined' && SCHEMA) ? SCHEMA : {};
}

function popupVersion_() {
  return (typeof SCRIPT_VERSION !== 'undefined' && SCRIPT_VERSION) ? SCRIPT_VERSION : 'setup-not-loaded';
}

function popupCss_() {
  var L = (typeof LEGEND !== 'undefined' && LEGEND) ? LEGEND : {};
  var C = (typeof CSS_ !== 'undefined' && CSS_) ? CSS_ : {};
  return {
    LEGEND: {
      HDR_BG: L.HDR_BG || '#e9f0f5',
      HDR_FG: L.HDR_FG || '#2c3e50',
      NEW_AUDIT: L.NEW_AUDIT || '#daeee3',
      DN_AUDIT: L.DN_AUDIT || '#e4f1f9',
      DISC_AUDIT: L.DISC_AUDIT || '#fef8e8'
    },
    CSS: {
      NAV: C.NAV || '#1e3a5f',
      GOLD: C.GOLD || '#ffd966',
      BU: C.BU || '#1565c0',
      GI: C.GI || '#2e7d32',
      OR: C.OR || '#ef6c00',
      REVIVE_BG: C.REVIVE_BG || '#e8daef',
      REVIVE_FG: C.REVIVE_FG || '#6c3483'
    }
  };
}

function isClearExcluded_(name) {
  name = String(name || '');
  // TMP_MERGED_POS_DATA is a controlled exception: it is normally treated as
  // formula/read-only visual data, but the user sometimes needs to clear and
  // repopulate it. Keep SRC_ sheets protected from Clear.
  var cfg = popupCfg_();
  if (cfg.SH && name === cfg.SH.TMP_MERGED) return false;
  var prefixes = cfg.CLEAR_EXCLUDE_PREFIXES || ['SRC_', 'TMP_'];
  for (var i = 0; i < prefixes.length; i++) if (name.indexOf(prefixes[i]) === 0) return true;
  return false;
}


function isFormatPopupHiddenSheet_(name) {
  name = String(name || '');
  // Internal workflow/queue sheets should stay available to the script but hidden
  // from the end-user Format / Clear popup.
  if (name === '_M13_SUPPLIER_QUEUE') return true;
  if (name.indexOf('_M13_') === 0) return true;
  return false;
}

function showWorkbookPopup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cfg = popupCfg_();
  var schema = popupSchema_();
  if (typeof m13EnsureSupplierQueueHidden_ === 'function') {
    try { m13EnsureSupplierQueueHidden_(); } catch (_qHide) {}
  }
  var sheets = ss.getSheets().filter(function(sh) {
    return !isFormatPopupHiddenSheet_(sh.getName());
  }).map(function(sh) {
    var name = sh.getName();
    return {
      name: name,
      rows: sh.getLastRow(),
      cols: sh.getLastColumn(),
      dataRows: Math.max(0, sh.getLastRow() - 2),
      clearOk: !isClearExcluded_(name),
      known: !!schema[name],
      tmp: name === cfg.SH.TMP_MERGED,
      out: name === cfg.SH.OUT_MERGED || name === cfg.SH.OUT_INSERT || name === cfg.SH.OUT_UPDATE,
      supplier: name === cfg.SH.IN_SUP
    };
  });
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(buildPopupHtml_(sheets)).setWidth(1060).setHeight(780),
    '📐 Format / Clear — VLOOKUP 2.0 ' + popupVersion_()
  );
}

function runPopupAction(action, names) {
  // Compatibility entry point. The popup itself now queues tasks client-side so
  // the user can click Format/Clear on different sheets while the first task is
  // still running. This server helper remains available for older popup HTML.
  var results = [];
  names = names || [];
  for (var i = 0; i < names.length; i++) results.push(runPopupActionOne_(action, names[i]));
  try { SpreadsheetApp.flush(); } catch(eFlush) {}
  return { results: results };
}

function runPopupActionOne(action, name) {
  // Public entry point used by each queued popup task. No document lock here;
  // the browser-side queue sends one task at a time but still lets users add
  // more Format/Clear jobs while the queue is processing.
  var res = runPopupActionOne_(action, name);
  try { SpreadsheetApp.flush(); } catch(eFlush) {}
  return res;
}

function runPopupActionOne_(action, name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cfg = popupCfg_();
  var sh = ss.getSheetByName(name);
  var t0 = Date.now();
  if (!sh) return { name: name, ok: false, msg: 'Sheet not found', ms: 0 };

  try {
    if (action === 'format') {
      if (name === cfg.SH.IN_SUP && typeof ensureSupplierSheetSchema_ === 'function') ensureSupplierSheetSchema_(sh);
      applyFormat_(ss, sh);
      return { name: name, ok: true, msg: fmt_(Math.max(0, sh.getLastRow() - 2)) + ' rows formatted', ms: Date.now() - t0 };
    }
    if (action === 'clear') {
      if (isClearExcluded_(name)) return { name: name, ok: true, msg: 'Excluded from clear', ms: 0 };
      if (name === cfg.SH.IN_SUP && typeof ensureSupplierSheetSchema_ === 'function') ensureSupplierSheetSchema_(sh);
      if (name === cfg.SH.TMP_MERGED && typeof setupInvalidateSupplierStatusFingerprint_ === 'function') {
        try { setupInvalidateSupplierStatusFingerprint_('popup-clear:' + name); } catch (_statusFpClear) {}
      }
      var rows = Math.max(0, sh.getLastRow() - 2);
      clearRows_(sh);
      if (name === cfg.SH.IN_SUP && typeof clearStatusColumn_ === 'function') clearStatusColumn_(sh);
      // TMP needs a real post-clear format pass so row 2 headers/filter are
      // restored and column A INDEX is ready to be rebuilt after repopulating.
      if (name === cfg.SH.TMP_MERGED) applyFormat_(ss, sh);
      else applyFormat_(ss, sh, { skipTmpBody: true });
      return { name: name, ok: true, msg: fmt_(rows) + ' rows cleared', ms: Date.now() - t0 };
    }
  } catch (e) {
    log_('[POPUP] ' + action + ' failed on ' + name + ': ' + e.message);
    return { name: name, ok: false, msg: e.message, ms: Date.now() - t0 };
  }
  return { name: name, ok: false, msg: 'Unknown action', ms: Date.now() - t0 };
}


function popupWorkflowActions_() {
  return [
    { id: 'highlight', label: '🔍 HIGHLIGHT NEW PRODUCTS + BEST BUY', fn: 'runHighlightNewProductsBestBuy' },
    { id: 'buildFilteredBrands', label: '🎯 BUILD OUT_MERGED_DATA — FILTERED BRANDS (COL E)', fn: 'buildOutMergedDataFromFilteredBrands' },
    { id: 'buildOut', label: '📐 BUILD OUT_MERGED_DATA', fn: 'buildOutMergedDataFromSupplierStatus' },
    { id: 'refreshSupplierChanges', label: '🔁 REFRESH SUPPLIER CHANGES', fn: 'refreshSupplierChanges' },
    { id: 'generatePosSheets', label: '📤 GENERATE INSERT + UPDATE SHEETS', fn: 'generateInsertUpdateSheets' },
    { id: 'generateFilteredPosSheets', label: '🔎 GENERATE INSERT + UPDATE FROM FILTERED DATA', fn: 'generateInsertUpdateSheetsFromFilteredData' },
    { id: 'exportPosFiles', label: '📄 EXPORT POS FILES', fn: 'exportPosFiles' }
  ];
}

function popupFindWorkflowAction_(id) {
  var actions = popupWorkflowActions_();
  id = String(id || '');
  for (var i = 0; i < actions.length; i++) {
    if (actions[i].id === id) return actions[i];
  }
  return null;
}

function popupResolveWorkflowFunction_(fnName) {
  fnName = String(fnName || '');
  var fn = null;
  try {
    if (typeof globalThis !== 'undefined' && typeof globalThis[fnName] === 'function') {
      fn = globalThis[fnName];
    }
  } catch (_globalErr) {}
  if (!fn) {
    try {
      var maybe = eval(fnName);
      if (typeof maybe === 'function') fn = maybe;
    } catch (_evalErr) {}
  }
  return fn;
}

function runPopupWorkflowAction(actionId) {
  var t0 = Date.now();
  var action = popupFindWorkflowAction_(actionId);
  if (!action) {
    return { name: String(actionId || ''), ok: false, msg: 'Unknown workflow action', ms: 0 };
  }

  try {
    var fn = popupResolveWorkflowFunction_(action.fn);
    if (typeof fn !== 'function') {
      return { name: action.label, ok: false, msg: 'Function not found: ' + action.fn, ms: Date.now() - t0 };
    }

    try { SpreadsheetApp.getActiveSpreadsheet().toast(action.label, '📐 Workflow Queue', 8); } catch (_toastErr) {}
    var result = fn();
    try { SpreadsheetApp.flush(); } catch (_flushErr) {}

    var msg = 'Complete';
    if (typeof result === 'string' && result) msg = result;
    else if (result && typeof result.message === 'string' && result.message) msg = result.message;
    else if (result && typeof result.msg === 'string' && result.msg) msg = result.msg;

    return { name: action.label, ok: true, msg: msg, ms: Date.now() - t0 };
  } catch (e) {
    try { log_('[POPUP WORKFLOW] ' + action.label + ' failed: ' + e.message); } catch (_logErr) {}
    return { name: action.label, ok: false, msg: e && e.message ? e.message : String(e), ms: Date.now() - t0 };
  }
}

function showOutReviewLens() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cfg = popupCfg_();
  var sh = ss.getSheetByName(cfg.SH.OUT_MERGED || 'OUT_MERGED_DATA');
  if (!sh) {
    SpreadsheetApp.getUi().alert('OUT Review Lens', 'OUT_MERGED_DATA was not found.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  SpreadsheetApp.getUi().showModelessDialog(
    HtmlService.createHtmlOutput(buildOutReviewLensHtml_(sh)).setWidth(1200).setHeight(760),
    '👁 OUT Review Lens — sticky O / P / Q review'
  );
}

function outReviewPick_(headers, names) {
  var map = {};
  for (var i = 0; i < headers.length; i++) map[String(headers[i] || '').toUpperCase().trim()] = i;
  for (var n = 0; n < names.length; n++) {
    var key = String(names[n] || '').toUpperCase().trim();
    if (map[key] != null) return map[key];
  }
  return -1;
}

function outReviewShort_(s, max) {
  s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  max = max || 160;
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function buildOutReviewLensHtml_(sh) {
  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  var headers = lastCol ? sh.getRange(2, 1, 1, lastCol).getDisplayValues()[0] : [];
  var n = Math.max(0, lastRow - 2);
  var data = n ? sh.getRange(3, 1, n, lastCol).getDisplayValues() : [];

  function c(names) { return outReviewPick_(headers, names); }
  var idx = {
    index: c(['INDEX']), rowStatus: c(['ROW STATUS']), priceStatus: c(['PRICE STATUS']), match: c(['MATCH METHOD']), conf: c(['CONF %']),
    posBrand: c(['POS BRAND']), supBrand: c(['SUP BRAND']), barcode: c(['POS MAIN ID', 'MAIN ID']), plu: c(['POS PLU', 'PLU']), subId: c(['POS SUB ID', 'SUB ID']),
    original: c(['ORIGINAL POS DESCR']), posDescr: c(['POS DESCR']), supProduct: c(['SUP PRODUCT']), notes: c(['NOTES']),
    bc: c(['BC']), sub: c(['SUB ID']), brand: c(['BRAND']), wsp: c(['WSP']), text: c(['TEXT %']), size: c(['SIZE']), type: c(['TYPE']),
    shelfOverride: c(['RRP / MARKUP OVERRIDE']), finalShelf: c(['FINAL SHELF RRP'])
  };

  var rows = [];
  for (var r = 0; r < data.length; r++) {
    var row = data[r];
    if (!row || row.join('').trim() === '') continue;
    rows.push({
      sheetRow: r + 3,
      index: idx.index >= 0 ? row[idx.index] : String(r + 1),
      rowStatus: idx.rowStatus >= 0 ? row[idx.rowStatus] : '',
      priceStatus: idx.priceStatus >= 0 ? row[idx.priceStatus] : '',
      match: idx.match >= 0 ? row[idx.match] : '',
      conf: idx.conf >= 0 ? row[idx.conf] : '',
      posBrand: idx.posBrand >= 0 ? row[idx.posBrand] : '',
      supBrand: idx.supBrand >= 0 ? row[idx.supBrand] : '',
      barcode: idx.barcode >= 0 ? row[idx.barcode] : '',
      plu: idx.plu >= 0 ? row[idx.plu] : '',
      subId: idx.subId >= 0 ? row[idx.subId] : '',
      original: idx.original >= 0 ? outReviewShort_(row[idx.original], 220) : '',
      posDescr: idx.posDescr >= 0 ? outReviewShort_(row[idx.posDescr], 220) : '',
      supProduct: idx.supProduct >= 0 ? outReviewShort_(row[idx.supProduct], 240) : '',
      bc: idx.bc >= 0 ? row[idx.bc] : '',
      sub: idx.sub >= 0 ? row[idx.sub] : '',
      brand: idx.brand >= 0 ? row[idx.brand] : '',
      wsp: idx.wsp >= 0 ? row[idx.wsp] : '',
      text: idx.text >= 0 ? row[idx.text] : '',
      size: idx.size >= 0 ? row[idx.size] : '',
      type: idx.type >= 0 ? row[idx.type] : '',
      override: idx.shelfOverride >= 0 ? row[idx.shelfOverride] : '',
      finalShelf: idx.finalShelf >= 0 ? row[idx.finalShelf] : '',
      notes: idx.notes >= 0 ? outReviewShort_(row[idx.notes], 260) : ''
    });
  }

  var statuses = {};
  var prices = {};
  rows.forEach(function(r) { if (r.rowStatus) statuses[r.rowStatus] = true; if (r.priceStatus) prices[r.priceStatus] = true; });
  var statusOptions = Object.keys(statuses).sort().map(function(s){ return '<option value="'+escHtml_(s)+'">'+escHtml_(s)+'</option>'; }).join('');
  var priceOptions = Object.keys(prices).sort().map(function(s){ return '<option value="'+escHtml_(s)+'">'+escHtml_(s)+'</option>'; }).join('');

  var payload = JSON.stringify(rows).replace(/</g, '\\u003c');
  return '<!doctype html><html><head><base target="_top"><style>'+ 
    'html,body{height:100%;margin:0;overflow:hidden;font-family:Google Sans,Arial,sans-serif;background:#f8fafd;color:#1c2833;font-size:12px}'+
    '.app{height:100vh;display:grid;grid-template-rows:auto auto 1fr auto;min-width:0}'+
    '.top{background:#1e3a5f;color:white;padding:10px 14px}.top b{color:#ffd966}.top .sub{font-size:11px;opacity:.95;margin-top:2px}'+
    '.controls{background:white;border-bottom:1px solid #dde3ea;padding:8px 12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}'+
    'input,select{border:1px solid #cfd8dc;border-radius:7px;padding:6px 8px;font-family:inherit;font-size:12px;background:white}'+
    '#q{min-width:290px}.meta{margin-left:auto;color:#5f6368;font-weight:700;white-space:nowrap}'+
    'button{border:0;border-radius:7px;padding:6px 10px;background:#1565c0;color:white;font-weight:700;cursor:pointer;font-size:12px;white-space:nowrap}.secondary{background:#5f6368}'+
    '.wrap{overflow:auto;min-height:0;padding:0 0 8px 0;background:#f8fafd}'+
    'table{border-collapse:separate;border-spacing:0;min-width:2050px;width:max-content;background:white}'+
    'th,td{border-right:1px solid #e7edf3;border-bottom:1px solid #e7edf3;padding:5px 7px;text-align:left;vertical-align:top;white-space:normal;overflow-wrap:anywhere;line-height:1.25}'+
    'th{position:sticky;top:0;background:#e9f0f5;color:#2c3e50;z-index:3;font-weight:800}'+
    'td{height:28px}.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}'+
    '.sticky1{position:sticky;left:0;z-index:2;background:#fff;min-width:58px;max-width:58px}.sticky2{position:sticky;left:72px;z-index:2;background:#fff;min-width:145px;max-width:145px}.sticky3{position:sticky;left:232px;z-index:2;background:#fff;min-width:270px;max-width:270px}'+
    'th.sticky1,th.sticky2,th.sticky3{z-index:5;background:#dde8f3}.descr{min-width:310px;max-width:360px}.audit{min-width:70px;max-width:90px;text-align:center}.wide{min-width:230px;max-width:280px}.small{min-width:80px;max-width:110px}'+
    '.statusNew{background:#e6f4ea;color:#137333}.statusReview{background:#f3e8fd;color:#6c3483}.statusDisc{background:#fef3e2;color:#6e2c00}.statusMatch{background:#e8f0fe;color:#1565c0}'+
    '.foot{background:white;border-top:1px solid #dde3ea;padding:8px 12px;text-align:right;box-shadow:0 -2px 8px rgba(60,64,67,.08)}'+
    '</style></head><body><div class="app">'+
    '<div class="top"><b>OUT Review Lens</b><div class="sub">Sticky review table for O / P / Q and AG:AM. This does not hide, format, or change the real sheet.</div></div>'+
    '<div class="controls"><input id="q" placeholder="Search brand, product, barcode, PLU, notes…" oninput="render()"><select id="rowStatus" onchange="render()"><option value="">All row statuses</option>'+statusOptions+'</select><select id="priceStatus" onchange="render()"><option value="">All price statuses</option>'+priceOptions+'</select><button onclick="render()">Refresh filter</button><button class="secondary" onclick="resetFilters()">Reset</button><span id="meta" class="meta"></span></div>'+
    '<div class="wrap"><table id="tbl"><thead><tr><th class="sticky1">Row</th><th>Status</th><th>Price</th><th class="sticky2">Brand</th><th class="small">Sup Brand</th><th class="small">Barcode</th><th class="small">PLU/Sub</th><th class="descr">O Original POS</th><th class="sticky3">P POS DESCR</th><th class="descr">Q SUP PRODUCT</th><th class="audit">BC</th><th class="audit">SUB</th><th class="audit">BRAND</th><th class="audit">WSP</th><th class="audit">TEXT %</th><th class="audit">SIZE</th><th class="audit">TYPE</th><th class="wide">AO Final Shelf</th><th class="wide">Notes</th><th class="small">Jump</th></tr></thead><tbody id="body"></tbody></table></div>'+
    '<div class="foot"><button class="secondary" onclick="google.script.host.close()">Close</button></div></div>'+
    '<script>var rows='+payload+';function esc(s){return String(s==null?"":s).replace(/[&<>\"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]||c})}function cls(s){s=String(s||"").toUpperCase();if(s.indexOf("NEW")>=0)return "statusNew";if(s.indexOf("REVIEW")>=0)return "statusReview";if(s.indexOf("DISCONT")>=0)return "statusDisc";if(s.indexOf("MATCH")>=0)return "statusMatch";return ""}function match(r,q,rs,ps){if(rs&&r.rowStatus!==rs)return false;if(ps&&r.priceStatus!==ps)return false;if(!q)return true;var hay=[r.index,r.rowStatus,r.priceStatus,r.posBrand,r.supBrand,r.barcode,r.plu,r.subId,r.original,r.posDescr,r.supProduct,r.notes].join(" ").toUpperCase();return hay.indexOf(q)>=0}function td(v,c){return "<td"+(c?" class=\\\""+c+"\\\"":"")+">"+esc(v)+"</td>"}function render(){var b=document.getElementById("body");if(!rows.length){b.innerHTML="<tr><td class=\\\"sticky1 num\\\">—</td><td colspan=\\\"19\\\" style=\\\"padding:18px;color:#5f6368;font-weight:700;background:#fff;\\\">OUT_MERGED_DATA currently has no data rows. Run BUILD OUT_MERGED_DATA, then reopen OUT Review Lens.</td></tr>";document.getElementById("meta").textContent="0 rows in OUT_MERGED_DATA";return}var q=document.getElementById("q").value.toUpperCase().trim();var rs=document.getElementById("rowStatus").value;var ps=document.getElementById("priceStatus").value;var out=[];var shown=0;for(var i=0;i<rows.length;i++){var r=rows[i];if(!match(r,q,rs,ps))continue;shown++;if(out.length<800){out.push("<tr>"+td(r.sheetRow,"sticky1 num")+td(r.rowStatus,cls(r.rowStatus))+td(r.priceStatus)+td(r.posBrand,"sticky2")+td(r.supBrand,"small")+td(r.barcode,"small")+td((r.plu||"")+" / "+(r.subId||""),"small")+td(r.original,"descr")+td(r.posDescr,"sticky3")+td(r.supProduct,"descr")+td(r.bc,"audit")+td(r.sub,"audit")+td(r.brand,"audit")+td(r.wsp,"audit")+td(r.text,"audit")+td(r.size,"audit")+td(r.type,"audit")+td(r.finalShelf,"wide")+td(r.notes,"wide")+"<td class=\\\"small\\\"><button onclick=\\\"jump("+r.sheetRow+")\\\">Go</button></td></tr>")}}if(!out.length){document.getElementById("body").innerHTML="<tr><td class=\\\"sticky1 num\\\">—</td><td colspan=\\\"19\\\" style=\\\"padding:18px;color:#5f6368;font-weight:700;background:#fff;\\\">No rows match the current search/filter. Try Reset, or check the spelling/status filter.</td></tr>"}else{document.getElementById("body").innerHTML=out.join("")}document.getElementById("meta").textContent="Showing "+Math.min(shown,800)+" of "+shown+" matched / "+rows.length+" total"}function resetFilters(){document.getElementById("q").value="";document.getElementById("rowStatus").value="";document.getElementById("priceStatus").value="";render()}function jump(row){google.script.run.outReviewJumpToRow(row)}render();</script></body></html>';
}

function outReviewJumpToRow(rowNum) {
  rowNum = Math.max(3, Number(rowNum) || 3);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cfg = popupCfg_();
  var sh = ss.getSheetByName(cfg.SH.OUT_MERGED || 'OUT_MERGED_DATA');
  if (!sh) return false;
  ss.setActiveSheet(sh);
  sh.setActiveRange(sh.getRange(rowNum, 1, 1, Math.min(1, sh.getLastColumn())));
  try { ss.toast('Selected OUT_MERGED_DATA row ' + rowNum, '👁 OUT Review Lens', 4); } catch (_toastErr) {}
  return true;
}

function buildPopupHtml_(sheetData) {
  var pc = popupCss_();
  var LEG = pc.LEGEND;
  var CSC = pc.CSS;
  function esc(s) { return escHtml_(s); }
  function typeOf(s) {
    if (s.tmp) return ['TMP', CSC.REVIVE_BG, CSC.REVIVE_FG];
    if (s.out) return ['OUT', LEG.NEW_AUDIT, CSC.GI];
    if (s.supplier) return ['SUPPLIER', LEG.DN_AUDIT, CSC.BU];
    if (String(s.name).indexOf('SRC_') === 0) return ['SRC', LEG.DISC_AUDIT, CSC.OR];
    if (String(s.name).indexOf('IN_') === 0) return ['IN', LEG.DN_AUDIT, CSC.BU];
    return ['OTHER', '#f1f3f4', '#5f6368'];
  }

  var workflowActions = popupWorkflowActions_();
  var workflowButtons = workflowActions.map(function(a) {
    return '<button class="workflowBtn" data-wfid="'+esc(a.id)+'" onclick="workflow(\''+esc(a.id)+'\')">'+esc(a.label)+'</button>';
  }).join('');
  var presetButtons = [
    ['standardMerge','▶ Standard Merge','highlight,buildOut'],
    ['fullExport','▶ Full Export','highlight,buildOut,generatePosSheets,exportPosFiles'],
    ['filteredExport','▶ Filtered Export','refreshSupplierChanges,generateFilteredPosSheets,exportPosFiles']
  ].map(function(p){ return '<button class="presetBtn" onclick="preset(\''+p[2]+'\')">'+esc(p[1])+'</button>'; }).join('');

  var rows = sheetData.map(function(s, i) {
    var t = typeOf(s);
    var clearDisabled = !s.clearOk ? 'disabled' : '';
    return '<tr>'+ 
      '<td class="selectCell"><input type="checkbox" class="chk" value="'+esc(s.name)+'" checked></td>'+ 
      '<td class="sheetCell"><span class="pill" style="background:'+t[1]+';color:'+t[2]+'">'+t[0]+'</span><span class="sheetName">'+esc(s.name)+'</span></td>'+ 
      '<td class="num">'+fmt_(s.dataRows)+'</td>'+ 
      '<td class="num">'+fmt_(s.cols)+'</td>'+ 
      '<td class="actionCell"><div class="actionBtns"><button onclick="one(\'format\','+i+')">Format</button><button '+clearDisabled+' onclick="one(\'clear\','+i+')">Clear</button></div></td>'+ 
      '<td id="r'+i+'" class="result">—</td>'+ 
    '</tr>';
  }).join('');

  return '<!doctype html><html><head><base target="_top"><style>'+ 
    ':root{--nav:'+CSC.NAV+';--gold:'+CSC.GOLD+';--blue:'+CSC.BU+';--danger:#b3261e;--grey:#5f6368;--line:#e7edf3;--head:'+LEG.HDR_BG+';--headText:'+LEG.HDR_FG+';--green:#137333;--orange:#e37400}'+
    'html,body{width:100%;height:100%;margin:0;overflow:hidden}body{font-family:Google Sans,Arial,sans-serif;background:#f8fafd;color:#1c2833;font-size:12px}'+
    '.app{height:100vh;width:100%;display:grid;grid-template-rows:auto auto auto auto 1fr auto;overflow:hidden;min-width:0}'+
    '.top{background:var(--nav);color:white;padding:10px 18px;line-height:1.2;min-width:0}.top b{color:var(--gold);letter-spacing:.2px}.top .sub{font-size:12px;opacity:.95;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
    '.workflow{padding:9px 18px;background:#ffffff;border-bottom:1px solid #dde3ea;display:grid;grid-template-columns:118px 1fr 310px;gap:10px;align-items:start;min-width:0}.wfTitle{font-weight:800;color:#2c3e50;white-space:nowrap;padding-top:4px}.wfBtns,.presetBtns{display:flex;gap:6px;flex-wrap:wrap;min-width:0}.workflowBtn{background:#2d5a8e;padding:6px 8px;font-size:11px}.presetBtn{background:#0f9d58;padding:6px 9px;font-size:11px}.utilityBtn{background:#9334e6;padding:6px 9px;font-size:11px}.workflowBtn.running,.presetBtn.running{background:#e37400}.workflowBtn.done{background:#137333}.workflowBtn.fail{background:#b3261e}'+
    '.activity{background:#f8fafd;border:1px solid #e1e6ed;border-radius:10px;padding:7px 9px;min-width:0}.activity b{display:block;color:#2c3e50;font-size:11px;margin-bottom:3px}.activityLine{color:#5f6368;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.meter{height:5px;background:#e7edf3;border-radius:99px;overflow:hidden;margin-top:6px}.meter>span{display:block;height:100%;width:0;background:#1565c0;transition:width .35s}'+
    '.presets{padding:7px 18px;background:#fbfdff;border-bottom:1px solid #dde3ea;display:flex;gap:8px;align-items:center;min-width:0}.presets .label{font-weight:800;color:#2c3e50}.presets .hint{margin-left:auto;color:#5f6368;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
    '.bar{padding:8px 18px;background:white;border-bottom:1px solid #dde3ea;display:flex;gap:7px;align-items:center;min-width:0}#status{margin-left:auto;color:var(--grey);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:430px;text-align:right}'+
    'button{border:0;border-radius:7px;padding:6px 10px;background:var(--blue);color:white;font-weight:700;cursor:pointer;font-size:12px;line-height:1.1;white-space:nowrap}button[disabled]{background:#c9cdd2;cursor:not-allowed}.secondary{background:#5f6368}.danger{background:var(--danger)}'+
    '.wrap{min-height:0;overflow:auto;padding:0 14px 8px;background:#f8fafd}table{width:100%;table-layout:fixed;border-collapse:collapse;background:white}col.c0{width:36px}col.c1{width:330px}col.c2{width:74px}col.c3{width:58px}col.c4{width:148px}col.c5{width:auto}th,td{border-bottom:1px solid var(--line);padding:5px 8px;text-align:left;vertical-align:middle;overflow:hidden}th{position:sticky;top:0;z-index:2;background:var(--head);color:var(--headText);font-weight:800;height:25px}td{height:31px}.selectCell{text-align:center}.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.sheetCell{white-space:normal;overflow-wrap:anywhere;word-break:break-word}.sheetName{vertical-align:middle}.pill{display:inline-block;border-radius:999px;padding:1px 6px;font-size:9px;font-weight:800;margin-right:6px;line-height:1.25;vertical-align:middle}.actionCell{white-space:nowrap}.actionBtns{display:flex;gap:6px;align-items:center;justify-content:flex-start}.actionBtns button{min-width:60px;padding-left:8px;padding-right:8px}.result{color:var(--grey);white-space:normal;overflow-wrap:anywhere;word-break:break-word;line-height:1.25;font-size:12px}'+
    '.foot{padding:8px 18px 10px;background:white;border-top:1px solid #dde3ea;display:flex;gap:8px;justify-content:flex-end;box-shadow:0 -2px 8px rgba(60,64,67,.08);z-index:3}.closebtn{background:var(--blue);min-width:92px}'+
    '@media(max-width:920px){.workflow{grid-template-columns:1fr}.activity{max-width:none}.presets{flex-wrap:wrap}.presets .hint{margin-left:0}.top .sub{white-space:normal}#status{max-width:260px}.wrap{padding-left:10px;padding-right:10px}}'+
    '</style></head><body><div class="app">'+
    '<div class="top"><b>VLOOKUP 2.0</b><div class="sub">Fast workflow queue and Format/Clear tools. Queue runs one task at a time in clicked order.</div></div>'+ 
    '<div class="workflow"><div class="wfTitle">Workflow queue</div><div class="wfBtns">'+workflowButtons+'</div><div class="activity"><b>Current activity</b><div id="activityLine" class="activityLine">Ready</div><div id="activityMeta" class="activityLine">No active task</div><div class="meter"><span id="meter"></span></div></div></div>'+ 
    '<div class="presets"><span class="label">Presets</span><div class="presetBtns">'+presetButtons+'</div><span class="hint">Standard Merge = Highlight → Build. Full Export queues through export.</span></div>'+ 
    '<div class="bar"><button onclick="bulk(\'format\')">Format selected</button><button class="danger" onclick="bulk(\'clear\')">Clear selected</button><button class="secondary" onclick="selectAll(true)">All</button><button class="secondary" onclick="selectAll(false)">None</button><button class="secondary" onclick="clearLog()">Clear log</button><button class="secondary" onclick="copyLog()">Copy log</button><span id="status"></span></div>'+ 
    '<div class="wrap"><table><colgroup><col class="c0"><col class="c1"><col class="c2"><col class="c3"><col class="c4"><col class="c5"></colgroup><thead><tr><th></th><th>Sheet</th><th>Rows</th><th>Cols</th><th>Action</th><th>Result / Log</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+ 
    '<div class="foot"><button class="closebtn" onclick="google.script.host.close()">Close</button></div>'+ 
    '</div><script>'+ 
    'var sheets='+JSON.stringify(sheetData.map(function(s){return s.name;}))+';var workflowActions='+JSON.stringify(workflowActions)+';var queue=[];var running=false;var jobId=0;var log=[];var current=null;var timer=null;function now(){return new Date().toLocaleTimeString()}function selectAll(v){document.querySelectorAll(".chk").forEach(function(c){c.checked=v})}function chosen(){return Array.from(document.querySelectorAll(".chk:checked")).map(function(c){return c.value})}function setStatus(t){document.getElementById("status").textContent=t||""}function setActivity(a,b,p){document.getElementById("activityLine").textContent=a||"Ready";document.getElementById("activityMeta").textContent=b||"";document.getElementById("meter").style.width=(p||0)+"%"}function addLog(t){log.push("["+now()+"] "+t);if(log.length>80)log.shift()}function clearLog(){log=[];document.querySelectorAll(".result").forEach(function(e){e.textContent="—"});setStatus("Log cleared")}function copyLog(){var s=log.join("\\n");if(navigator.clipboard){navigator.clipboard.writeText(s);setStatus("Log copied")}else{setStatus("Copy not available")}}function setResult(i,txt){var el=document.getElementById("r"+i);if(el)el.textContent=txt;addLog((i>=0?sheets[i]+": ":"")+txt)}function statusText(){if(running)setStatus("Running 1 of "+(queue.length+1)+" | Queued: "+queue.length);else setStatus(queue.length?queue.length+" queued":"Done")}function pretty(task){if(task.kind==="workflow")return task.label||"Workflow";return task.action==="clear"?"Clear "+task.name:"Format "+task.name}function btnFor(id){return document.querySelector("[data-wfid=\\\""+id+"\\\"]")}function markButton(id,cls){var b=btnFor(id);if(!b)return;b.classList.remove("running","done","fail");if(cls)b.classList.add(cls)}function enqueueSheet(a,name,i){if(!name)return;var t={id:++jobId,kind:"sheet",action:a,name:name,idx:i,label:(a==="clear"?"Clear ":"Format ")+name};queue.push(t);if(i>=0)setResult(i,"Queued #"+t.id);statusText();processQueue()}function enqueueWorkflow(id,label){var t={id:++jobId,kind:"workflow",workflowId:id,label:label||id,idx:-1};queue.push(t);addLog("Queued #"+t.id+": "+t.label);statusText();processQueue()}function one(a,i){enqueueSheet(a,sheets[i],i)}function workflow(id){var a=(workflowActions||[]).filter(function(x){return x.id===id})[0]||{id:id,label:id};enqueueWorkflow(a.id,a.label)}function preset(list){String(list||"").split(",").forEach(function(id){id=id.trim();if(id)workflow(id)})}function bulk(a){var list=chosen();if(!list.length){setStatus("Nothing selected");return}list.forEach(function(name){enqueueSheet(a,name,sheets.indexOf(name))})}function showResult(task,res){var ok=res&&res.ok;var txt=(ok?"✅ ":"❌ ")+(task.label||res.name||"Task")+": "+(res&&res.msg?res.msg:"No response")+" ("+(((res&&res.ms)||0)/1000).toFixed(1)+"s)";if(task.kind==="workflow"){addLog(txt);markButton(task.workflowId,ok?"done":"fail");setStatus(txt);return}var idx=task.idx;if(idx<0&&res&&res.name)idx=sheets.indexOf(res.name);if(idx>=0)setResult(idx,txt)}function showError(task,err){var msg=err&&err.message?err.message:err;var txt="❌ "+(task.label||"Task")+": "+msg;if(task.kind==="workflow"){markButton(task.workflowId,"fail");addLog(txt);setStatus(txt);return}var idx=task.idx;if(idx>=0)setResult(idx,txt)}function startTimer(task){var started=Date.now();current=task;if(timer)clearInterval(timer);timer=setInterval(function(){var s=Math.floor((Date.now()-started)/1000);setActivity("Running: "+pretty(task),"Elapsed "+Math.floor(s/60)+":"+("0"+(s%60)).slice(-2)+" | queued "+queue.length,Math.min(95,8+(s%60)*1.3))},1000);setActivity("Running: "+pretty(task),"Elapsed 0:00 | queued "+queue.length,10)}function stopTimer(){if(timer)clearInterval(timer);timer=null;setActivity(queue.length?"Next task queued":"Ready",queue.length?queue.length+" waiting":"No active task",queue.length?8:0)}function processQueue(){if(running)return;if(!queue.length){statusText();stopTimer();return}var task=queue.shift();running=true;startTimer(task);setStatus(pretty(task)+" running… "+queue.length+" queued");if(task.kind==="workflow"){markButton(task.workflowId,"running");google.script.run.withSuccessHandler(function(res){showResult(task,res);running=false;stopTimer();processQueue()}).withFailureHandler(function(err){showError(task,err);running=false;stopTimer();processQueue()}).runPopupWorkflowAction(task.workflowId);return}if(task.idx>=0)setResult(task.idx,"Running…");google.script.run.withSuccessHandler(function(res){showResult(task,res);running=false;stopTimer();processQueue()}).withFailureHandler(function(err){showError(task,err);running=false;stopTimer();processQueue()}).runPopupActionOne(task.action,task.name)}</script></body></html>';
}

function escHtml_(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
