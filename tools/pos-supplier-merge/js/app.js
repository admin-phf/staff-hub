/* PHF Staff Hub — POS Supplier New Product Check and Clean Merge v1.4.0 (11 Oct 2026; was POS Supplier Merge)
 * Page controller: input rail + drag and drop, saved reference data, the
 * engine (Web Worker running the unchanged Apps Script v6.3.88 files), the
 * three merge stages, downloads and the OUT_MERGED_DATA review table.
 * v1.1.0: Supplier Updates sheet on the page (totals bar, 16 headings, paste rows).
 * v1.2.0: the sheet is editable (cells, paste at a cell, add / delete rows, undo), full width under the stages and
 *         always shown; every input in the rail has its own ✕ to remove it.
 * v1.3.0: Staff Hub Library — the POS Database and supplier files from Build Master Databases and the shared Ongoing
 *         Discounts file load on open (assets/js/phf-library.js); files dropped here for Ongoing Discounts are saved to it.
 * v1.3.1: Supplier Updates starts empty — a merge only covers the brands pasted or dropped. The CH2 / Unique supplier
 *         imports in the Library are added only with their "Add … from the Library" buttons. "Brands in this merge"
 *         line above the sheet. Compact card layout (rows of cards side by side).
 * v1.4.0 (11 Oct 2026): renamed POS Supplier New Product Check and Clean Merge. Workbook with the Google Sheet's tabs
 *         along the bottom (IN_SUPPLIER, OUT_MERGED_DATA review / all columns, OUT_POS_INSERT / UPDATE, SRC_ tabs,
 *         TMP_MERGED_POS_DATA — read-only sheets in js/sheet-grid.js). The supplier sheet shows every row (no pages).
 *         Engine formulas: TO_TEXT reads the displayed cell (sheets-formula / sheets-shim v1.0.1).
 * v1.5.0 (11 Oct 2026): every workbook tab except TMP_MERGED_POS_DATA is editable (js/sheet-grid.js v1.1.0):
 *         the SRC_ tabs change the saved reference tables (run the stages again to use them); OUT_MERGED_DATA edits run
 *         the Sheet's own onEdit in the engine (fake barcode for NEW, UPDATED SUPPLIER queued for Refresh supplier
 *         changes, FINAL SHELF RRP worked out again) and stage 3 can run again; OUT_POS_INSERT / UPDATE edits go into
 *         the TXT files with Export TXT again. The tabs look like the Google Sheet (js/sheet-look.js: row-1 totals band,
 *         conditional colours, centred columns). Optional password lock (assets/js/phf-lock.js). Merge v6.3.89.
 */
(function () {
  'use strict';

  var TOOL_VERSION = 'v1.5.0';
  // v1.3.0 Staff Hub Library: input id + Library kind loaded on open. ✕ / Remove on a Library file stops it loading
  // here until a newer copy is saved; Ongoing Discounts is one shared file, so removing it deletes the saved copy.
  // v1.3.1: the supplier imports are NOT loaded on open (a merge covers only the brands in Supplier Updates, so a
  // full CH2 / Unique catalogue would widen every merge to all its brands) — LIB_SUP lists them for the Add buttons.
  var LIB = window.PHFLibrary || null, LIB_TOOL = 'pos-supplier-merge';
  var LIB_LOAD = [{ id: 'pos', kind: 'lib:pos-db' }, { id: 'disc', kind: 'lib:ref-discounts' }];
  var LIB_SUP = ['lib:ch2-db', 'lib:uhp-db'];
  var LIB_SHARED = { disc: 'lib:ref-discounts' };
  var M = window.PHFMergeMap;
  var $ = function (s) { return document.querySelector(s); };
  var SHEETS = {
    TMP: 'TMP_MERGED_POS_DATA', SUP: 'IN_SUPPLIER_/_PRODUCT_UPDATES', OUT: 'OUT_MERGED_DATA',
    INS: 'OUT_POS_INSERT', UPD: 'OUT_POS_UPDATE'
  };
  var GROUPS = ['POS data', 'Supplier updates', 'Reference data'];
  var STAGES = [
    { id: 'highlight', n: 1, title: 'Highlight New Products + Best Buy', steps: ['highlight'],
      desc: 'Sets the supplier STATUS (new, matched, best buy, not used) exactly as the Google Sheet menu item does.' },
    { id: 'build', n: 2, title: 'Build OUT_MERGED_DATA', steps: ['build'],
      desc: 'Matches supplier rows to POS products and builds OUT_MERGED_DATA: matched, new, review and discontinued rows.' },
    { id: 'export', n: 3, title: 'Generate Insert + Update & Export', steps: ['generate', 'export'],
      desc: 'Builds OUT_POS_INSERT / OUT_POS_UPDATE and the two POS import TXT files.' }
  ];

  var state = {
    inputs: {},            // id -> { files:[{name,size,tab,data,report}], savedAt }
    rev: 0,                // bumps whenever inputs change
    engine: null, engineInfo: null, loadedRev: -1,
    stage: {},             // id -> { status, msg }
    results: {},           // in-memory engine sheets
    outputs: new Map(),
    bulk: [],
    busy: false,
    review: { rows: [], head: [], idx: {}, filtered: [], page: 0 },
    storage: 'indexeddb',
    // v1.5.0 sheet edits: engine sheets (OUT / OUT_POS_*) — cells changed here (marks), undo depth kept by the engine,
    // OUT edited after stage 3, OUT_POS_* edited after the last export, UPDATED SUPPLIER changes waiting for Refresh.
    edits: { marks: {}, undo: {}, outAfter3: false, pos: {}, busy: false },
    pendingSup: 0
  };

  // ---------------------------------------------------------------- utils
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pretty(b) { if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(1) + ' MB'; }
  function fmtN(n) { return Number(n || 0).toLocaleString('en-AU'); }
  function melb(parts) {
    var p = {}; new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Melbourne', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return parts === 'iso' ? p.year + '-' + p.month + '-' + p.day : p.day + '/' + p.month + '/' + p.year + ' ' + p.hour + ':' + p.minute;
  }
  function inputDef(id) { return M.inputDef(id); }
  function loaded(id) { var x = state.inputs[id]; return !!(x && x.files && x.files.length); }
  function rowsOf(id) { var x = state.inputs[id]; var out = []; (x && x.files || []).forEach(function (f) { out = out.concat(f.data); }); return out; }
  function setGlobal(t, type) { var e = $('#globalStatus'); e.className = 'status ' + (type || 'info'); e.textContent = t; }
  function gpct(v) { var p = $('#globalProgress'), b = $('#globalProgressBar'); p.classList.toggle('hidden', v <= 0); b.style.width = Math.max(0, Math.min(100, v)) + '%'; }
  function cleanTitle(s) { return String(s || '').replace(/^[^A-Za-z0-9(]+/, '').trim(); }

  // ------------------------------------------------- saved reference (IndexedDB)
  var DB_NAME = 'phf-pos-supplier-merge', DB_STORE = 'reference', memStore = {};
  function dbOpen() {
    return new Promise(function (res, rej) {
      if (!window.indexedDB) { rej(new Error('IndexedDB not available')); return; }
      var rq = indexedDB.open(DB_NAME, 1);
      rq.onupgradeneeded = function () { rq.result.createObjectStore(DB_STORE, { keyPath: 'id' }); };
      rq.onsuccess = function () { res(rq.result); };
      rq.onerror = function () { rej(rq.error || new Error('IndexedDB open failed')); };
    });
  }
  function dbTx(mode, fn) {
    return dbOpen().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction(DB_STORE, mode), st = tx.objectStore(DB_STORE), out = fn(st);
        tx.oncomplete = function () { res(out && out.result !== undefined ? out.result : out); db.close(); };
        tx.onerror = function () { rej(tx.error); db.close(); };
      });
    });
  }
  function refSave(id) {
    var rec = { id: id, files: state.inputs[id].files, savedAt: state.inputs[id].savedAt };
    if (state.storage !== 'indexeddb') { memStore[id] = rec; return Promise.resolve(); }
    return dbTx('readwrite', function (st) { st.put(rec); }).catch(function (e) { state.storage = 'memory'; memStore[id] = rec; console.warn(e); });
  }
  function refDelete(id) {
    delete memStore[id];
    if (state.storage !== 'indexeddb') return Promise.resolve();
    return dbTx('readwrite', function (st) { st.delete(id); }).catch(function () {});
  }
  function refLoadAll() {
    return dbTx('readonly', function (st) { return st.getAll(); }).then(function (list) {
      (list || []).forEach(function (rec) { if (rec && rec.id && inputDef(rec.id)) state.inputs[rec.id] = { files: rec.files || [], savedAt: rec.savedAt }; });
    }).catch(function (e) { state.storage = 'memory'; console.warn('Saved reference unavailable:', e); });
  }

  // ---------------------------------------------------------------- engine
  function createEngine(onProgress) {
    var seq = 0, pending = new Map(), worker = null, frame = null, info = null, kind = '';
    var readyRes, readyRej, ready = new Promise(function (res, rej) { readyRes = res; readyRej = rej; });
    var timer = setTimeout(function () { if (!info) readyRej(new Error('The merge engine did not start within 60 seconds.')); }, 60000);
    function onMsg(d) {
      if (!d || !d.type) return;
      if (d.type === 'ready') { if (!info) { info = d.versions || {}; info.kind = kind; clearTimeout(timer); readyRes(info); } return; }
      if (d.type === 'progress') { if (onProgress) onProgress(d); return; }
      var p = pending.get(d.id); if (!p) return; pending.delete(d.id);
      if (d.type === 'error') { var e = new Error(d.message || 'Engine error'); e.detail = d; p.reject(e); } else p.resolve(d);
    }
    function frameListener(ev) { if (frame && ev.source === frame.contentWindow && ev.data && ev.data.__phfMergeEngine) onMsg(ev.data); }
    function startFrame() {
      kind = 'in-page';
      frame = document.createElement('iframe');
      frame.hidden = true; frame.title = 'POS Supplier New Product Check and Clean Merge engine';
      frame.src = './engine-frame.html?v=1.1.0';
      window.addEventListener('message', frameListener);
      document.body.appendChild(frame);
    }
    try {
      worker = new Worker('./js/engine-worker.js?v=1.1.0');
      kind = 'worker';
      worker.onmessage = function (ev) { onMsg(ev.data); };
      worker.onerror = function (ev) {
        if (!info) { if (ev && ev.preventDefault) ev.preventDefault(); try { worker.terminate(); } catch (e) {} worker = null; startFrame(); return; }
        pending.forEach(function (p) { p.reject(new Error('Engine error: ' + (ev && ev.message ? ev.message : 'unknown'))); }); pending.clear();
      };
    } catch (e) { worker = null; startFrame(); }
    return {
      ready: ready,
      info: function () { return info; },
      send: function (msg) {
        return ready.then(function () {
          return new Promise(function (res, rej) {
            var id = ++seq, m = Object.assign({}, msg, { id: id });
            pending.set(id, { resolve: res, reject: rej });
            if (worker) worker.postMessage(m);
            else frame.contentWindow.postMessage(Object.assign(m, { __phfMergeCmd: true }), '*');
          });
        });
      },
      terminate: function () {
        clearTimeout(timer);
        try { if (worker) worker.terminate(); } catch (e) {}
        if (frame) { frame.remove(); window.removeEventListener('message', frameListener); }
        pending.forEach(function (p) { p.reject(new Error('Engine restarted')); }); pending.clear();
      }
    };
  }
  function engineProgress(d) {
    var running = STAGES.filter(function (s) { return (state.stage[s.id] || {}).status === 'running'; })[0];
    var text = cleanTitle(d.title) + (d.msg ? ' — ' + String(d.msg).split('\n')[0] : '');
    if (running) stageMsg(running.id, text, 'running');
  }
  function startEngine() {
    if (state.engine) state.engine.terminate();
    state.engine = createEngine(engineProgress);
    state.loadedRev = -1;
    renderEngineState('starting');
    return state.engine.ready.then(function (info) { state.engineInfo = info; renderEngineState('ready'); return info; })
      .catch(function (e) { renderEngineState('error', e.message); throw e; });
  }
  function renderEngineState(kind, msg) {
    var el = $('#engineState'); if (!el) return;
    var i = state.engineInfo || {};
    var v = String(i.merge || '').match(/v\d+\.\d+\.\d+/), sv = String(i.setup || '').match(/v\d+\.\d+\.\d+/);
    if (v && $('#engineVersion')) $('#engineVersion').textContent = v[0];
    if (kind === 'ready') el.innerHTML = '<span class="phf-pill is-green">Engine ready</span><small>Merge ' + esc(v ? v[0] : '') + ' · Setup ' + esc(sv ? sv[0] : '') + ' · ' + (i.kind === 'worker' ? 'background worker' : 'in-page') + '</small>';
    else if (kind === 'error') el.innerHTML = '<span class="phf-pill is-red">Engine not started</span><small>' + esc(msg || '') + '</small>';
    else el.innerHTML = '<span class="phf-pill is-blue">Engine starting…</span>';
  }

  // ---------------------------------------------------------- file reading
  function readWorkbook(file) {
    if (typeof XLSX === 'undefined') return Promise.reject(new Error('The spreadsheet reader (SheetJS) did not load. Check the internet connection and reload the page.'));
    var ext = (file.name.split('.').pop() || '').toLowerCase();
    var p = (ext === 'csv' || ext === 'txt')
      ? file.text().then(function (t) { return XLSX.read(t, { type: 'string', raw: true }); })
      : file.arrayBuffer().then(function (b) { return XLSX.read(b, { type: 'array', raw: true, cellDates: false }); });
    return p.then(function (wb) {
      return wb.SheetNames.map(function (name) {
        return { name: name, rows: XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '', raw: true, blankrows: false }) };
      });
    });
  }
  // Best tab of a workbook for one input: a tab recognised as that input, else
  // the tab whose headings map best. Returns { tab, mapped } or throws.
  function mapForInput(id, sheets) {
    var def = inputDef(id), errs = [], best = null;
    var order = sheets.filter(function (s) { return M.identifyRows(s.rows).indexOf(id) >= 0; }).concat(sheets);
    for (var i = 0; i < order.length; i++) {
      try {
        var mp = M.mapTable(order[i].rows, def.sheet, id);
        if (!best || mp.report.found > best.mapped.report.found) best = { tab: order[i].name, mapped: mp };
        if (i === 0 && M.identifyRows(order[i].rows).indexOf(id) >= 0) break;
      } catch (e) { errs.push(order[i].name + ': ' + e.message); }
    }
    if (!best) throw new Error(errs.length ? errs[0] : 'No usable rows were found.');
    if (!best.mapped.data.length) throw new Error('The file has the right headings but no data rows.');
    return best;
  }
  function fileEntry(file, tab, mapped) {
    return { name: file.name, size: file.size, tab: tab, data: mapped.data, report: mapped.report, loadedAt: melb() };
  }
  function addToInput(id, entry) {
    var def = inputDef(id), cur = state.inputs[id] || { files: [] };
    if (def.multi) {
      var files = cur.files.filter(function (f) { return !(f.name === entry.name && f.tab === entry.tab); });
      files.push(entry); cur.files = files;
    } else cur.files = [entry];
    cur.savedAt = melb();
    state.inputs[id] = cur;
    state.rev++;
    if (id === 'sup') supView.undo = [];
    if (def.stored) refSave(id);
    invalidateResults('Inputs changed — run the stages again.');
  }
  function acceptFile(id, file) {
    var def = inputDef(id);
    setGlobal('Reading ' + file.name + '…', 'running');
    return readWorkbook(file).then(function (sheets) {
      var best = mapForInput(id, sheets);
      var entry = fileEntry(file, best.tab, best.mapped);
      addToInput(id, entry);
      if (LIB && LIB_SHARED[id]) LIB.put(LIB_SHARED[id], file, { name: file.name, source: 'POS Supplier New Product Check and Clean Merge' }).then(function (r) { entry.libKind = LIB_SHARED[id]; entry.libSavedAt = r.savedAt; entry.libWhen = LIB.when(r); if (inputDef(id).stored) refSave(id); renderAll(); if (state.activeInput === id) showInput(id); }).catch(function (e) { console.warn('Library save failed', e); });
      setGlobal(def.title + ': ' + file.name + ' loaded — ' + fmtN(best.mapped.report.rows) + ' rows.', 'success');
      renderAll(); showInput(id);
      return true;
    }).catch(function (e) {
      setGlobal(def.title + ': ' + e.message, 'error');
      showInput(id, e.message); flashInvalid(id);
      return false;
    });
  }
  function removeFile(id, idx) {
    var cur = state.inputs[id]; if (!cur) return;
    libForget(id, cur.files.slice(idx, idx + 1));
    cur.files.splice(idx, 1);
    if (id === 'sup') supView.undo = [];
    if (!cur.files.length) { delete state.inputs[id]; if (inputDef(id).stored) refDelete(id); }
    else if (inputDef(id).stored) refSave(id);
    state.rev++;
    invalidateResults('Inputs changed — run the stages again.');
    renderAll(); showInput(id);
  }
  function flashInvalid(id) { var b = document.querySelector('[data-input="' + id + '"]'); if (b) { b.classList.add('invalid'); setTimeout(function () { b.classList.remove('invalid'); }, 2500); } }

  // ------------------------------------------------------------ bulk drop
  function bulkAccept(list) {
    var files = Array.prototype.slice.call(list || []).filter(function (f) { return f && f.size !== undefined; });
    if (!files.length) return;
    setGlobal('Identifying ' + files.length + ' file' + (files.length === 1 ? '' : 's') + '… (nothing will run)', 'running');
    var jobs = files.map(function (file) {
      var rec = { file: file, status: 'reading', assigned: [], ids: [], msg: 'Reading…' };
      state.bulk.unshift(rec); renderBulk();
      return readWorkbook(file).then(function (sheets) {
        var recognised = 0, notes = [];
        sheets.forEach(function (sh) {
          var ids = M.identifyRows(sh.rows);
          if (ids.length !== 1) { if (ids.length > 1) notes.push(sh.name + ': could be ' + ids.map(function (i) { return inputDef(i).title; }).join(' or ')); return; }
          var id = ids[0];
          try {
            var mp = M.mapTable(sh.rows, inputDef(id).sheet, id);
            if (!mp.data.length) { notes.push(sh.name + ': no data rows'); return; }
            addToInput(id, fileEntry(file, sh.name, mp));
            rec.assigned.push(inputDef(id).title + (sheets.length > 1 ? ' (tab ' + sh.name + ')' : '') + ' · ' + fmtN(mp.data.length) + ' rows');
            rec.ids.push(id);
            recognised++;
          } catch (e) { notes.push(sh.name + ': ' + e.message); }
        });
        rec.status = recognised ? 'assigned' : (notes.length ? 'review' : 'unrecognised');
        rec.msg = recognised ? rec.assigned.join(' · ') : (notes.join(' · ') || 'Not recognised from its headings — choose the input it belongs to.');
      }).catch(function (e) { rec.status = 'unreadable'; rec.msg = 'Could not read this file (' + e.message + ').'; })
        .then(function () { renderBulk(); renderAll(); });
    });
    Promise.all(jobs).then(function () {
      var ok = state.bulk.filter(function (r) { return r.status === 'assigned'; }).length;
      setGlobal(ok ? 'Files assigned. ' + readinessText() : 'No file was recognised — choose the input for each file below.', ok ? 'success' : 'missing');
      updateRunButtons();
    });
  }
  function renderBulk() {
    var host = $('#bulkResults'), badge = $('#bulkCount'), list = state.bulk;
    var a = list.filter(function (r) { return r.status === 'assigned'; }).length, rv = list.length - a;
    badge.textContent = list.length ? a + ' ASSIGNED' + (rv ? ' · ' + rv + ' TO REVIEW' : '') : '0 FILES';
    badge.className = 'result-badge' + (list.length ? (rv ? ' warn' : ' ok') : '');
    if (!list.length) { host.innerHTML = ''; return; }
    host.innerHTML = list.map(function (r, i) {
      var cls = r.status === 'assigned' ? 'ok' : r.status === 'reading' ? 'reading' : (r.status === 'unreadable' || r.status === 'unrecognised') ? 'bad' : 'review';
      var st = r.status === 'assigned' ? 'ASSIGNED' : r.status === 'reading' ? 'CHECKING' : r.status === 'review' ? 'REVIEW' : 'NOT RECOGNISED';
      var pick = r.status === 'assigned' || r.status === 'reading' ? '' :
        '<select data-bulk-select="' + i + '" aria-label="Input for ' + esc(r.file.name) + '"><option value="">Choose input…</option>' +
        M.INPUTS.map(function (d) { return '<option value="' + d.id + '">' + esc(d.title) + '</option>'; }).join('') +
        '</select><button type="button" class="btn" data-bulk-assign="' + i + '">Assign</button>';
      return '<div class="bulk-row ' + cls + '"><div class="bulk-file"><strong>' + esc(r.file.name) + '</strong><span>' + pretty(r.file.size) + ' · ' + esc(r.msg) + '</span></div><span class="bulk-state">' + st + '</span><div class="bulk-assign">' + pick + '</div></div>';
    }).join('');
    host.querySelectorAll('[data-bulk-assign]').forEach(function (b) {
      b.onclick = function () {
        var i = +b.dataset.bulkAssign, r = state.bulk[i], sel = host.querySelector('[data-bulk-select="' + i + '"]'), id = sel && sel.value;
        if (!r || !id) return;
        acceptFile(id, r.file).then(function (ok) { if (ok) { r.status = 'assigned'; r.msg = 'Assigned to ' + inputDef(id).title; r.assigned = [r.msg]; r.ids = [id]; } renderBulk(); });
      };
    });
  }
  function wireBulkDrop() {
    var d = $('#bulkDrop'), i = $('#bulkInput');
    d.onclick = function () { i.click(); };
    d.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); i.click(); } };
    i.onchange = function () { var f = Array.prototype.slice.call(i.files); i.value = ''; bulkAccept(f); };
    d.ondragover = function (e) { e.preventDefault(); d.classList.add('drag'); };
    d.ondragleave = function () { d.classList.remove('drag'); };
    d.ondrop = function (e) { e.preventDefault(); d.classList.remove('drag'); bulkAccept(e.dataTransfer && e.dataTransfer.files); };
  }

  // ------------------------------------------------------------ rail + cards
  function libStaleFiles(id) { var x = state.inputs[id]; return ((x && x.files) || []).filter(function (f) { return f.libSavedAt && !LIB_SHARED[id] && LIB && LIB.isStale({ savedAt: f.libSavedAt }); }); }
  function railState(def) {
    var f = loaded(def.id);
    if (f && libStaleFiles(def.id).length) return { cls: 'loaded lib-stale', dot: '!', text: 'CHECK DATE' };
    if (f) return { cls: 'loaded', dot: '✓', text: def.stored ? 'SAVED' : 'LOADED' };
    if (def.required) return { cls: 'missing required', dot: '!', text: 'REQUIRED' };
    if (def.recommended) return { cls: 'missing recommended', dot: '!', text: 'RECOMMENDED' };
    return { cls: 'missing', dot: '○', text: 'OPTIONAL' };
  }
  function railSub(def) {
    var x = state.inputs[def.id];
    if (!x || !x.files.length) return def.required ? 'Required · drop here' : def.recommended ? 'Recommended · drop here' : 'Optional · drop here';
    var rows = x.files.reduce(function (a, f) { return a + f.data.length; }, 0);
    var lib = x.files.some(function (f) { return f.libKind; });
    return (x.files.length > 1 ? x.files.length + ' files · ' : x.files[0].name + ' · ') + fmtN(rows) + ' rows' + (lib ? ' · Library' : '');
  }
  function renderInputNav() {
    var host = $('#inputNav');
    host.innerHTML = GROUPS.map(function (g) {
      var items = M.INPUTS.filter(function (d) { return d.group === g; });
      var title = g === 'Reference data' ? 'Reference data · saved in this browser' : g;
      return '<div class="input-group"><div class="input-group-title">' + esc(title) + '</div>' + items.map(function (d) {
        var s = railState(d);
        return '<div class="input-nav-wrap' + (loaded(d.id) ? ' has-del' : '') + '"><button type="button" class="input-nav-item ' + s.cls + '" data-input="' + d.id + '" title="Click to open, or drop the ' + esc(d.title) + ' file here"><span class="input-dot">' + s.dot + '</span><span><strong>' + esc(d.title) + '</strong><small>' + esc(railSub(d)) + '</small></span><span class="input-state">' + s.text + '</span></button>' +
          (loaded(d.id) ? '<button type="button" class="input-nav-del" data-del="' + d.id + '" title="Remove ' + esc(d.title) + (d.stored ? ' from this browser' : '') + '" aria-label="Remove ' + esc(d.title) + '">✕</button>' : '') + '</div>';
      }).join('') + '</div>';
    }).join('');
    host.querySelectorAll('[data-input]').forEach(function (b) {
      var id = b.dataset.input;
      b.onclick = function () { showInput(id); if (id === 'sup') scrollToSupSheet(); };
      b.ondragover = b.ondragenter = function (e) { e.preventDefault(); e.stopPropagation(); b.classList.add('drag-target'); };
      b.ondragleave = function (e) { e.preventDefault(); e.stopPropagation(); b.classList.remove('drag-target'); };
      b.ondrop = function (e) {
        e.preventDefault(); e.stopPropagation(); b.classList.remove('drag-target');
        var files = e.dataTransfer && e.dataTransfer.files; if (!files || !files.length) return;
        var list = inputDef(id).multi ? Array.prototype.slice.call(files) : [files[0]];
        list.reduce(function (p, f) { return p.then(function () { return acceptFile(id, f); }); }, Promise.resolve());
      };
    });
    host.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); removeInputs([b.dataset.del]); }; });
    if (state.activeInput) { var a = host.querySelector('[data-input="' + state.activeInput + '"]'); if (a) a.classList.add('active'); }
  }
  // v1.2.0: remove inputs straight away — the ✕ beside a rail row, or the two clear buttons. A saved reference table
  // is deleted from this browser too. Drop-list rows that only filled those inputs go as well.
  function removeInputs(ids, message) {
    if (state.busy) { setGlobal('A stage is running — remove files when it finishes.', 'missing'); return; }
    var gone = ids.filter(function (id) { return state.inputs[id]; });
    gone.forEach(function (id) { libForget(id, state.inputs[id].files); delete state.inputs[id]; if (inputDef(id).stored) refDelete(id); });
    if (ids.indexOf('sup') >= 0) { supView.undo = []; supView.sel = null; supView.note = ''; }
    state.bulk = state.bulk.filter(function (rec) {
      if (!rec.ids || !rec.ids.length) return true;
      var keep = []; rec.ids.forEach(function (id, i) { if (ids.indexOf(id) < 0) keep.push(i); });
      rec.assigned = keep.map(function (i) { return rec.assigned[i]; }); rec.ids = keep.map(function (i) { return rec.ids[i]; });
      rec.msg = rec.assigned.join(' · ');
      return rec.ids.length > 0;
    });
    renderBulk();
    state.rev++;
    invalidateResults('Inputs changed — run the stages again.');
    renderAll();
    if (state.activeInput) showInput(state.activeInput);
    var names = gone.map(function (id) { return inputDef(id).title; });
    setGlobal(message || ((names.length ? names.join(', ') + ' removed. ' : 'Nothing to remove. ') + readinessText()), requiredReady() ? 'ready' : 'missing');
  }
  function scrollToSupSheet() { wbShow('sup'); var el = $('#workbook'); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  function showInput(id, problem) {
    var def = inputDef(id); if (!def) return;
    state.activeInput = id;
    var x = state.inputs[id], has = loaded(id), s = railState(def);
    var badgeCls = has ? 'done' : def.required ? 'required' : 'wait';
    var files = has ? x.files.map(function (f, i) {
      var rep = f.report || {};
      return '<div class="file-row"><span><strong>' + esc(f.name) + '</strong>' + (f.tab ? ' · tab ' + esc(f.tab) : '') + ' · ' + fmtN(f.data.length) + ' rows · ' + (rep.found || 0) + ' / ' + (rep.total || 0) + ' columns' + (rep.missing && rep.missing.length ? ' <em class="miss-cols">not in file: ' + esc(rep.missing.join(', ')) + '</em>' : '') + libNote(id, f) + '</span><button type="button" data-remove="' + i + '">Remove</button></div>';
    }).join('') : '';
    var status = problem ? problem : has ? (def.stored ? 'Saved in this browser ' + esc(x.savedAt || '') : 'Loaded ' + esc(x.files[x.files.length - 1].loadedAt || '')) : 'Not loaded';
    $('#inputWorkspace').innerHTML =
      '<section class="panel input-workspace-card ' + (has ? 'is-loaded' : def.required ? 'is-required' : 'is-optional') + '">' +
      '<div class="input-workspace-head"><div><div class="nav-separator" style="margin:0 0 6px">' + esc(def.group) + '</div><h2>' + esc(def.title) + (def.required ? ' <span style="color:#b33">*</span>' : '') + '</h2><p>' + esc(def.desc) + '</p></div><span class="small-badge ' + badgeCls + '">' + s.text + '</span></div>' +
      '<div class="dropzone" tabindex="0"><div><strong>' + (def.multi && has ? 'Add another supplier file' : has ? 'Replace file' : 'Drop file here') + '</strong><small>or click to choose · .XLSX / .XLS / .CSV' + (def.multi ? ' · several files are combined' : '') + '</small></div></div>' +
      '<input class="hidden" type="file" accept=".xlsx,.xls,.xlsm,.csv,.txt"' + (def.multi ? ' multiple' : '') + '>' +
      '<div class="file-list">' + files + '</div>' +
      '<div class="input-meta"><div><strong>Google Sheet tab</strong>' + esc(def.sheet) + '</div><div><strong>Storage</strong>' + (def.stored ? (state.storage === 'indexeddb' ? 'Saved in this browser until replaced or removed' : 'This session only — the browser blocked saving') : 'Browser memory only (this session)') + '</div><div><strong>Status</strong>' + status + '</div></div></section>';
    var host = $('#inputWorkspace'), d = host.querySelector('.dropzone'), inp = host.querySelector('input');
    var take = function (fl) { var list = Array.prototype.slice.call(fl || []); if (!def.multi) list = list.slice(0, 1); list.reduce(function (p, f) { return p.then(function () { return acceptFile(id, f); }); }, Promise.resolve()); };
    d.onclick = function () { inp.click(); };
    d.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } };
    inp.onchange = function () { var fl = inp.files; take(fl); inp.value = ''; };
    d.ondragover = function (e) { e.preventDefault(); d.classList.add('drag'); };
    d.ondragleave = function () { d.classList.remove('drag'); };
    d.ondrop = function (e) { e.preventDefault(); d.classList.remove('drag'); take(e.dataTransfer && e.dataTransfer.files); };
    host.querySelectorAll('[data-remove]').forEach(function (b) { b.onclick = function () { removeFile(id, +b.dataset.remove); }; });
    document.querySelectorAll('[data-input]').forEach(function (b) { b.classList.toggle('active', b.dataset.input === id); });
    if (id === 'sup') {
      host.querySelector('.input-workspace-card').insertAdjacentHTML('beforeend', '<div class="sup-card-link"><button type="button" class="btn small" id="supJump">Open the IN_SUPPLIER sheet ↓</button><span>Edit, paste and check every supplier row in the sheet under the stages.</span></div><div class="sup-scope-lib sup-card-lib" data-lib-sup-host hidden></div>');
      host.querySelector('#supJump').onclick = scrollToSupSheet;
      drawLibSup();
    }
  }
  function readinessText() {
    var miss = M.INPUTS.filter(function (d) { return d.required && !loaded(d.id); }).map(function (d) { return d.title; });
    var rec = M.INPUTS.filter(function (d) { return d.recommended && !loaded(d.id); }).map(function (d) { return d.title; });
    if (miss.length) return 'Missing: ' + miss.join(', ') + '.';
    return 'Ready to run.' + (rec.length ? ' Reference not loaded: ' + rec.join(', ') + ' — the merge runs without it, but results may differ from the Google Sheet.' : '');
  }
  function renderInputSummary() {
    var host = $('#inputSummary');
    host.innerHTML = GROUPS.map(function (g) {
      var fs = M.INPUTS.filter(function (d) { return d.group === g; });
      var n = fs.filter(function (d) { return loaded(d.id); }).length;
      var reqMiss = fs.filter(function (d) { return d.required && !loaded(d.id); }).length;
      var recMiss = fs.filter(function (d) { return d.recommended && !loaded(d.id); }).length;
      var cls = reqMiss ? 'miss' : recMiss ? 'warn' : n ? 'ok' : 'opt';
      var txt = n + '/' + fs.length + ' loaded' + (reqMiss ? ' · required missing' : recMiss ? ' · ' + recMiss + ' recommended missing' : n ? ' · ready' : ' · optional');
      return '<div class="summary-chip ' + cls + '"><strong>' + esc(g) + '</strong><span>' + txt + '</span></div>';
    }).join('');
    var req = M.INPUTS.filter(function (d) { return d.required; }), ok = req.filter(function (d) { return loaded(d.id); }).length;
    var rc = $('#readyCount'); rc.textContent = ok + ' / ' + req.length + ' REQUIRED'; rc.className = 'result-badge ' + (ok === req.length ? 'ok' : ok ? 'ready' : '');
  }
  function requiredReady() { return M.INPUTS.every(function (d) { return !d.required || loaded(d.id); }); }

  // ------------------------------------------------------------- stages
  function renderStages() {
    STAGES.forEach(function (s) {
      $('#stage-' + s.id).innerHTML = '<section class="panel stage-panel stage-view-card ready"><div class="stage-head"><div class="stage-title"><span class="stepnum">' + s.n + '</span><div><h2>' + esc(s.title) + '</h2></div></div><span class="small-badge wait">WAITING</span></div><p class="stage-description">' + esc(s.desc) + '</p><div class="status info stage-status">Waiting for input files.</div><div class="stage-actions"><button class="btn primary stage-run" data-stage="' + s.id + '" disabled>Run stage ' + s.n + '</button></div><div class="stage-output-inline" data-stage-output="' + s.id + '"></div></section>';
    });
    document.querySelectorAll('.stage-run').forEach(function (b) { b.onclick = function () { runTo(b.dataset.stage); }; });
  }
  function stageSet(id, status, msg) {
    state.stage[id] = { status: status, msg: msg };
    var card = $('#stage-' + id + ' .stage-panel'); if (!card) return;
    card.classList.remove('ready', 'running', 'done', 'error');
    card.classList.add(status === 'waiting' ? 'ready' : status);
    var b = card.querySelector('.small-badge');
    b.className = 'small-badge ' + ({ waiting: 'wait', ready: 'ready', running: 'running', done: 'done', error: 'error' }[status] || 'wait');
    b.textContent = { waiting: 'WAITING', ready: 'READY', running: 'RUNNING', done: 'DONE', error: 'ERROR' }[status] || 'WAITING';
    stageMsg(id, msg, status);
  }
  function stageMsg(id, msg, status) {
    var st = $('#stage-' + id + ' .stage-status'); if (!st) return;
    st.textContent = msg || '';
    st.className = 'status stage-status ' + ({ running: 'running', done: 'ok', error: 'error', ready: 'ready', waiting: 'missing' }[status] || 'info');
  }
  function updateRunButtons() {
    var ready = requiredReady() && !!state.engineInfo;
    STAGES.forEach(function (s) {
      var cur = state.stage[s.id] || {};
      var b = document.querySelector('.stage-run[data-stage="' + s.id + '"]');
      if (b) b.disabled = !ready || state.busy;
      if (cur.status === 'running' || cur.status === 'done' || cur.status === 'error') return;
      if (ready) stageSet(s.id, 'ready', s.n === 1 ? 'Inputs are ready. This stage can run now.' : 'Ready — earlier stages run first automatically if needed.');
      else stageSet(s.id, 'waiting', state.engineInfo ? readinessText() : 'Waiting for the merge engine to start…');
    });
    $('#runAllBtn').disabled = !ready || state.busy;
    // v1.5.0: the sheets cannot be edited while a stage runs.
    var gb = state.busy || state.edits.busy;
    if (wb.outGrid) wb.outGrid.busy(gb);
    if (wb.grid) wb.grid.busy(gb);
    renderOutActions();
  }
  function invalidateResults(msg) {
    state.results = {};
    state.edits = { marks: {}, undo: {}, outAfter3: false, pos: {}, busy: false };
    state.pendingSup = 0;
    state.outputs.forEach(function (o) { if (o.url) URL.revokeObjectURL(o.url); });
    state.outputs.clear();
    STAGES.forEach(function (s) { state.stage[s.id] = { status: 'waiting', msg: msg || '' }; });
    renderOutputs(); hideReview(); refreshSupSheet();
  }

  function buildSheetsPayload() {
    var out = {};
    M.INPUTS.forEach(function (d) { out[d.sheet] = M.sheetRows(d.sheet, rowsOf(d.id)); });
    return out;
  }
  function ensureLoaded() {
    if (state.engine && state.loadedRev === state.rev && state.engineInfo) return Promise.resolve();
    var needRestart = state.loadedRev !== -1 || !state.engine;
    var p = needRestart ? startEngine() : state.engine.ready;
    return p.then(function () {
      setGlobal('Loading ' + fmtN(rowsOf('pos').length) + ' POS rows and ' + fmtN(rowsOf('sup').length) + ' supplier rows into the merge engine…', 'running');
      var rev = state.rev;
      return state.engine.send({ cmd: 'load', sheets: buildSheetsPayload() }).then(function () { state.loadedRev = rev; STAGES.forEach(function (s) { if ((state.stage[s.id] || {}).status === 'done') state.stage[s.id] = { status: 'ready' }; }); });
    });
  }
  function alertsText(res) {
    return (res.alerts || []).map(function (a) { return cleanTitle(a.title) + (a.msg ? ': ' + a.msg : ''); }).join(' · ');
  }
  function alertFailed(res) {
    return (res.alerts || []).some(function (a) { return /❌|failed/i.test(a.title || ''); });
  }
  function runStep(step) {
    return state.engine.send({ cmd: 'run', step: step }).then(function (res) {
      if (alertFailed(res)) { var e = new Error(alertsText(res)); e.detail = res; throw e; }
      Object.keys(res.sheets || {}).forEach(function (n) { state.results[n] = res.sheets[n]; delete state.edits.marks[n]; });
      if (step === 'export') state.results.files = res.files || [];
      state.pendingSup = res.pending || 0;
      state.edits.undo = {};                                        // the engine starts a new undo history after a run
      if (step === 'build') state.edits.outAfter3 = false;
      if (step === 'generate') { state.edits.outAfter3 = false; state.edits.pos = {}; }
      if (step === 'export') state.edits.pos = {};
      state.results['alerts_' + step] = res.alerts || [];
      state.results['ms_' + step] = res.ms;
      return res;
    });
  }
  function stageSummary(id) {
    if (id === 'highlight') {
      var sup = state.results[SHEETS.SUP] || [], counts = {};
      for (var i = 2; i < sup.length; i++) { var s = String(sup[i][15] || '').replace(/[^A-Za-z /+-]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase() || 'BLANK'; counts[s] = (counts[s] || 0) + 1; }
      var parts = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 6).map(function (k) { return k + ' ' + fmtN(counts[k]); });
      return 'Complete — ' + fmtN(Math.max(0, sup.length - 2)) + ' supplier rows: ' + parts.join(' · ') + '.';
    }
    if (id === 'build') {
      var a = (state.results.alerts_build || [])[0];
      var line = a ? String(a.msg || '').split('\n')[0] : '';
      return 'Complete — ' + (line || fmtN(Math.max(0, (state.results[SHEETS.OUT] || []).length - 2)) + ' rows') + '.';
    }
    var g = (state.results.alerts_generate || [])[0], files = state.results.files || [];
    var left = stillPending();
    return 'Complete — ' + (g ? String(g.msg || '').split('\n')[0] : '') + ' · ' + files.length + ' TXT file' + (files.length === 1 ? '' : 's') + ' ready.' +
      (left ? ' ' + fmtN(left) + ' OUT row' + (left === 1 ? ' is' : 's are') + ' still SUP OVERRIDE PENDING (supplier in G not found).' : '');
  }
  function runTo(target) {
    if (state.busy) return Promise.resolve();
    if (!requiredReady()) { setGlobal(readinessText(), 'missing'); return Promise.resolve(); }
    var tIdx = STAGES.map(function (s) { return s.id; }).indexOf(target);
    state.busy = true;
    // Re-running a stage makes the later stages out of date.
    STAGES.slice(tIdx + 1).forEach(function (s) { if ((state.stage[s.id] || {}).status === 'done' || (state.stage[s.id] || {}).status === 'error') state.stage[s.id] = { status: 'ready' }; });
    updateRunButtons();
    var t0 = Date.now(), current = null;
    gpct(4);
    return ensureLoaded().then(function () {
      var chain = Promise.resolve();
      STAGES.slice(0, tIdx + 1).forEach(function (s, i) {
        chain = chain.then(function () {
          if ((state.stage[s.id] || {}).status === 'done' && i < tIdx) return;
          current = s.id;
          stageSet(s.id, 'running', 'Running…');
          setGlobal('Stage ' + s.n + ' of 3 — ' + s.title + '…', 'running');
          var steps = Promise.resolve();
          // v1.5.0: UPDATED SUPPLIER changes still waiting are refreshed first, so stage 3 uses them.
          var list = s.id === 'export' && state.pendingSup > 0 ? ['refresh'].concat(s.steps) : s.steps;
          list.forEach(function (step) { steps = steps.then(function () { return runStep(step); }); });
          return steps.then(function () {
            stageSet(s.id, 'done', stageSummary(s.id));
            gpct(Math.round(((i + 1) / (tIdx + 1)) * 100));
            return afterStage(s.id);
          });
        });
      });
      return chain;
    }).then(function () {
      setGlobal('Complete in ' + ((Date.now() - t0) / 1000).toFixed(1) + 's — ' + state.outputs.size + ' output file' + (state.outputs.size === 1 ? '' : 's') + ' ready below.', 'success');
      setTimeout(function () { gpct(0); }, 800);
    }).catch(function (e) {
      console.error(e);
      if (current) stageSet(current, 'error', 'Error: ' + e.message);
      setGlobal((current ? 'Stage stopped: ' : 'Could not start: ') + e.message, 'error');
      gpct(0);
    }).then(function () { state.busy = false; updateRunButtons(); refreshSupSheet(); });
  }
  function afterStage(id) {
    if (id === 'highlight') refreshSupSheet();
    if (id === 'build') { renderReview(); wbShow('out'); return addWorkbookOutput(); }
    if (id === 'export') {
      (state.results.files || []).forEach(function (f, i) {
        var bin = atob(f.base64), bytes = new Uint8Array(bin.length);
        for (var k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
        addOutput('export', 'txt-' + i, f.filename, new Blob([bytes], { type: 'text/plain;charset=utf-8' }), fmtN(f.rowCount) + ' rows · ' + (f.label || 'POS file') + ' · tab-separated TXT for POSActive');
      });
      if (state.results[SHEETS.OUT]) renderReview(true);   // stage 3 may have refreshed supplier changes first
      renderReviewKpis(); renderTabs();
      if (wb.active === 'ins' || wb.active === 'upd') wbShow(wb.active, true);
      return addWorkbookOutput();
    }
    return Promise.resolve();
  }

  // -------------------------------------------------------------- outputs
  function addOutput(stage, key, name, blob, meta, warn) {
    var old = state.outputs.get(key); if (old && old.url) URL.revokeObjectURL(old.url);
    state.outputs.set(key, { stage: stage, key: key, name: name, blob: blob, meta: meta, warn: warn || '', url: URL.createObjectURL(blob) });
    renderOutputs();
  }
  function outputRows(arr) {
    if (!arr.length) return '<div class="empty-output">No output files yet.</div>';
    return arr.map(function (o) {
      return '<div class="output-row' + (o.warn ? ' has-warning' : '') + '"><div><code>' + esc(o.name) + '</code><span>' + esc(o.meta) + '</span>' + (o.warn ? '<span class="output-warning">⚠ ' + esc(o.warn) + '</span>' : '') + '</div><div class="output-actions"><a class="download-link" href="' + o.url + '" download="' + esc(o.name) + '">Download</a></div></div>';
    }).join('');
  }
  function renderOutputs() {
    var order = ['txt-0', 'txt-1', 'xlsx-review'];
    var arr = Array.from(state.outputs.values()).sort(function (a, b) { return order.indexOf(a.key) - order.indexOf(b.key); });
    // v1.5.0: the TXT files say so when the sheets were edited after they were made.
    var posEd = Object.keys(state.edits.pos).filter(function (n) { return state.edits.pos[n]; });
    arr.forEach(function (o) {
      if (!/^txt-/.test(o.key)) return;
      o.warn = state.edits.outAfter3 ? 'Made before your OUT_MERGED_DATA edits — run stage 3 again to include them.'
        : posEd.length ? 'Made before your ' + posEd.join(' / ') + ' edits — use Export TXT again on that tab.' : '';
    });
    var c = $('#outputCount'); c.textContent = arr.length + ' OUTPUT' + (arr.length === 1 ? '' : 'S'); c.className = 'result-badge' + (arr.length ? ' ok' : '');
    $('#allOutputs').innerHTML = arr.length ? outputRows(arr) : '<div class="empty-output">Run a stage to create its download files.</div>';
    STAGES.forEach(function (s) { var el = document.querySelector('[data-stage-output="' + s.id + '"]'); if (el) el.innerHTML = outputRows(arr.filter(function (o) { return o.stage === s.id; })).replace('<div class="empty-output">No output files yet.</div>', ''); });
  }

  // ------------------------------------------------------ review workbook
  var COL = {
    ODD: 'F5F5F5', EVEN: 'E9F0F5', TITLE_BG: '1E3A5F', TITLE_FG: 'FFD966', HDR_BG: 'E9F0F5', HDR_FG: '2C3E50', INK: '1C2833',
    UP: ['FCE8E6', 'D93025'], DOWN: ['E8F0FE', '1A73E8'], WARN: ['FEF3E2', 'E37400'], NEW: ['E6F4EA', '0F9D58'], REVIEW: ['F3E8FD', '9334E6'], MATCH: [null, '1565C0'], FLAT: [null, '9E9E9E']
  };
  var TEXT_HEAD = /(MAIN ID|\bPLU\b|SUB ID|BARCODE|^INDEX$|^POS INDEX$|ACCNO|SUPPLIER NUMBER|^BC$)/i;
  // v1.5.0: the review workbook takes the Google Sheet's colours and row-1 totals from js/sheet-look.js.
  function supAccent(head, v) {
    if (head !== 'STATUS') return null;
    var s = String(v || '').toUpperCase(); if (!s) return null;
    return /UNMATCHABLE/.test(s) ? ['FFF3CD', '856404'] : /NOT USED/.test(s) ? [null, '9AA0A6'] : /MATCHED/.test(s) ? ['E8F0FE', '1565C0'] : /NEW/.test(s) ? ['E6F4EA', '137333'] : null;
  }
  function typed(v, head) {
    var s = String(v == null ? '' : v);
    if (s === '' || TEXT_HEAD.test(head)) return { v: s };
    if (/^-?\$[\d,]*\.?\d+$/.test(s)) return { v: Number(s.replace(/[$,]/g, '')), f: '$#,##0.00' };
    if (/^-?[\d,]*\.?\d+%$/.test(s)) return { v: Number(s.replace(/[,%]/g, '')) / 100, f: '0.00%' };
    if (/^-?\d+(\.\d+)?$/.test(s) && s.length < 15 && !/^-?0\d/.test(s)) return { v: Number(s) };
    return { v: s };
  }
  function widthFor(h) {
    var u = String(h).toUpperCase();
    if (/DESCR|PRODUCT|NOTES|POS DESC/.test(u)) return /NOTES/.test(u) ? 48 : 36;
    if (/WSP TO RRP|FINAL SHELF|CURRENT WSP TO/.test(u)) return 24;
    if (/BRAND|SUPPLIER|STATUS|MAIN ID|BARCODE/.test(u)) return 18;
    if (/^(BC|SUB ID|BRAND|WSP)$/.test(u)) return 7;
    return 12;
  }
  function sheetSummary(name, rows) {
    var n = Math.max(0, rows.length - 2);
    if (name === SHEETS.OUT) { var k = reviewCounts(rows); return 'OUT_MERGED_DATA · ' + fmtN(n) + ' ROWS · MATCHED ' + fmtN(k.matched) + ' · NEW ' + fmtN(k.newp) + ' · REVIEW ' + fmtN(k.review) + ' · DISCONTINUED ' + fmtN(k.disc); }
    return name + ' · ' + fmtN(n) + ' ROWS';
  }
  function buildXlsxSheet(st, styles, name, rows) {
    var head = (rows[1] || []).slice();
    var drop = head.indexOf('__EXPORT_VISIBLE__');
    var width = head.length;
    if (drop >= 0) width = drop;
    head = head.slice(0, width);
    var X = window.XlsxLite, last = X.colLetter(width), n = Math.max(0, rows.length - 2), data = rows.slice(2);
    var look = window.PHFSheetLook ? window.PHFSheetLook.forSheet(name, head) : null, tot = look ? look.totals(data, data) : {};
    var summary = sheetSummary(name, rows) + ' · POS Supplier New Product Check and Clean Merge ' + TOOL_VERSION + ' (engine ' + (String((state.engineInfo || {}).merge || '').match(/v\d+\.\d+\.\d+/) || [''])[0] + ') · ' + melb();
    return {
      name: name.replace(/[\\/?*\[\]:]/g, '_').replace(/_+/g, '_').slice(0, 31), columnCount: width, freeze: 'A3',
      autoFilter: 'A2:' + last + (n + 2), dimension: 'A1:' + last + (n + 2),
      widths: head.map(widthFor), defaultRowHeight: 15,
      rows: function* () {
        // Row 1 = the Sheet's totals band (as the merge left the rows); the tool line goes in the last empty cell.
        var t = new Array(width).fill(''), k;
        for (k = 0; k < width; k++) t[k] = tot[k] || '';
        if (name === SHEETS.SUP) t[15] = String((rows[0] || [])[15] || '');
        for (k = width - 1; k >= 0 && t[k]; k--);
        if (k >= 0) t[k] = summary;
        yield { cells: t, styles: styles.title, height: 30 };
        yield { cells: head, styles: styles.head, height: 30 };
        for (var r = 2; r < rows.length; r++) {
          var band = r % 2 === 0 ? 'ODD' : 'EVEN', src = rows[r], cells = new Array(width), sts = new Array(width);
          for (var c = 0; c < width; c++) {
            var shown = look && look.display ? look.display(src[c], c) : src[c];
            var tv = typed(shown, head[c]);
            cells[c] = tv.v;
            var a = look && look.style && String(shown == null ? '' : shown) !== '' ? look.style(src, c) : null;
            var acc = a ? [a.bg ? a.bg.toUpperCase() : null, a.fg ? a.fg.toUpperCase() : null, !!a.b] : (name === SHEETS.SUP ? supAccent(head[c], src[c]) : null);
            sts[c] = styles.cell(band, tv.f || (TEXT_HEAD.test(head[c]) ? '@' : ''), acc, !!(look && look.centre[c]), /\n/.test(String(shown || '')));
          }
          yield { cells: cells, styles: sts };
        }
      }
    };
  }
  function buildReviewWorkbook() {
    var X = window.XlsxLite;
    if (!X) return Promise.reject(new Error('Workbook writer not loaded'));
    var st = new X.StyleSheet(), cache = {};
    var styles = {
      title: st.style({ font: { bold: true, color: COL.TITLE_FG, size: 9 }, fill: COL.TITLE_BG, align: { h: 'center', v: 'center', wrap: true } }),
      head: st.style({ font: { bold: true, color: COL.HDR_FG, size: 9 }, fill: COL.HDR_BG, align: { h: 'center', v: 'center', wrap: true } }),
      cell: function (band, fmt, acc, centre, wrap) {
        var key = band + '|' + fmt + '|' + (acc ? acc.join(',') : '') + '|' + (centre ? 'c' : '') + (wrap ? 'w' : '');
        if (cache[key] !== undefined) return cache[key];
        var spec = { fill: (acc && acc[0]) || COL[band], font: { size: 9, color: (acc && acc[1]) || COL.INK, bold: !!(acc && (acc.length > 2 ? acc[2] : acc[0])) }, align: { v: 'center' } };
        if (centre) spec.align.h = 'center';
        if (wrap) spec.align.wrap = true;
        if (fmt) spec.numFmt = fmt;
        return (cache[key] = st.style(spec));
      }
    };
    var names = [SHEETS.OUT, SHEETS.INS, SHEETS.UPD, SHEETS.SUP, 'SRC_POS_BRAND_NAME_CHANGES', 'SRC_POS_PRODUCT_PREFIX', 'SRC_POS_SUPPLIERS', 'SRC_POS_ONGOING_DISCOUNTS', 'SRC_POS_FIND_REPLACE'];
    var sheets = names.filter(function (n) { return state.results[n] && state.results[n].length >= 2; }).map(function (n) { return buildXlsxSheet(st, styles, n, state.results[n]); });
    return X.writeWorkbook(sheets, st, {});
  }
  function brandSummary() {
    var out = state.results[SHEETS.OUT] || [], h = out[1] || [], bi = h.indexOf('POS BRAND'), si = h.indexOf('ROW STATUS'), c = {};
    for (var i = 2; i < out.length; i++) { if (/DISCONTINUED/i.test(out[i][si])) continue; var b = String(out[i][bi] || '').replace(/^Z{3,}\s*/i, '').trim(); if (b) c[b] = (c[b] || 0) + 1; }
    var keys = Object.keys(c).sort(function (a, b) { return c[b] - c[a] || (a < b ? -1 : 1); });
    return keys.slice(0, 3).join(', ') + (keys.length > 3 ? ' +' + (keys.length - 3) : '');
  }
  function addWorkbookOutput() {
    var name = ('POS SUPPLIER MERGE ' + melb('iso') + ' ' + brandSummary()).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150) + '.xlsx';
    return buildReviewWorkbook().then(function (blob) {
      var parts = [SHEETS.OUT, SHEETS.INS, SHEETS.UPD].filter(function (n) { return state.results[n]; }).map(function (n) { return n + ' ' + fmtN(Math.max(0, state.results[n].length - 2)); });
      addOutput('build', 'xlsx-review', name, blob, 'Review workbook · ' + parts.join(' · ') + ' · supplier STATUS and reference tabs');
    }).catch(function (e) { console.error(e); setGlobal('Review workbook could not be written: ' + e.message, 'error'); });
  }

  // --------------------------------------------------------------- review
  var REVIEW_COLS = [
    { h: 'INDEX', label: '#', cls: 'rv-num' },
    { h: 'ROW STATUS', chip: 1 }, { h: 'PRICE STATUS', chip: 1 },
    { h: 'POS BRAND', cls: 'rv-brand' }, { h: 'SUP BRAND', cls: 'rv-brand' }, { h: 'OLD BRAND', cls: 'rv-brand warnable' },
    { h: 'POS MAIN ID', label: 'Barcode', extra: 'BARCODE UPDATE', extraLabel: 'update' },
    { h: 'POS PLU', label: 'PLU / Sub ID', extra: 'POS SUB ID' },
    { h: 'ORIGINAL POS DESCR', cls: 'rv-descr' }, { h: 'POS DESCR', cls: 'rv-descr rv-strong' }, { h: 'SUP PRODUCT', cls: 'rv-descr' },
    { h: 'CURRENT WSP EXGST', label: 'WSP', extra: 'NEW WSP EXGST', arrow: 1, cls: 'rv-money' },
    { h: 'CURRENT LAST PRICE', label: 'Last price', extra: 'NEW LAST PRICE', arrow: 1, cls: 'rv-money' },
    { h: 'CURRENT RRP', label: 'RRP', extra: 'NEW RRP', arrow: 1, cls: 'rv-money' },
    { h: 'FINAL SHELF RRP', label: 'Final shelf RRP', cls: 'rv-money' },
    { h: 'BC', audit: 1 }, { h: 'SUB ID', audit: 1 }, { h: 'BRAND', audit: 1 }, { h: 'WSP', audit: 1 }, { h: 'TEXT %', label: 'Text', cls: 'rv-num' },
    { h: 'NOTES', cls: 'rv-notes' }
  ];
  var PAGE = 200;
  function reviewCounts(rows) {
    var h = rows[1] || [], si = h.indexOf('ROW STATUS'), pi = h.indexOf('PRICE STATUS'), ji = h.indexOf('OLD BRAND'), li = h.indexOf('BARCODE UPDATE');
    var k = { matched: 0, newp: 0, review: 0, disc: 0, up: 0, down: 0, barcode: 0, brand: 0 };
    for (var i = 2; i < rows.length; i++) {
      var s = String(rows[i][si] || '').toUpperCase(), p = String(rows[i][pi] || '').toUpperCase();
      if (/NEW/.test(s)) k.newp++; else if (/DISCONTINUED/.test(s)) k.disc++; else if (/REVIEW/.test(s)) k.review++; else if (/MATCHED/.test(s)) k.matched++;
      if (/INCREASE/.test(p)) k.up++; if (/DECREASE/.test(p)) k.down++;
      if (li >= 0 && String(rows[i][li] || '').trim()) k.barcode++;
      if (ji >= 0 && String(rows[i][ji] || '').trim()) k.brand++;
    }
    return k;
  }
  function chipClass(v) {
    var s = String(v || '').toUpperCase();
    if (/PENDING/.test(s)) return 'warn'; if (/ACCEPTED/.test(s)) return 'new'; if (/REJECTED/.test(s)) return 'up';
    if (/INCREASE/.test(s)) return 'up'; if (/DECREASE/.test(s)) return 'down'; if (/NEW/.test(s)) return 'new';
    if (/DISCONTINUED/.test(s)) return 'warn'; if (/REVIEW/.test(s)) return 'review'; if (/MATCHED/.test(s)) return 'match'; if (/NO CHANGE/.test(s)) return 'flat';
    return '';
  }
  function hideReview() { if ($('#wbTabs')) { renderTabs(); wbShow(wb.active, true); } }
  // keep = redraw with the rows the engine has now (after an edit / refresh) and leave the search and filters as they are.
  function renderReview(keep) {
    var rows = state.results[SHEETS.OUT] || [];
    var head = rows[1] || [], idx = {};
    head.forEach(function (h, i) { if (idx[h] === undefined) idx[h] = i; });
    var data = rows.slice(2);
    var prev = keep ? { q: $('#reviewSearch').value, st: $('#reviewStatus').value, pr: $('#reviewPrice').value, br: $('#reviewBrand').value, page: state.review.page } : null;
    state.review = { rows: data, head: head, idx: idx, filtered: data, page: 0, hay: data.map(function (r) { return r.join(' ').toUpperCase(); }) };
    var opts = function (h) { var set = {}; data.forEach(function (r) { var v = String(r[idx[h]] || '').trim(); if (v) set[v] = (set[v] || 0) + 1; }); return Object.keys(set).sort().map(function (v) { return '<option value="' + esc(v) + '">' + esc(cleanTitle(v) || v) + ' (' + fmtN(set[v]) + ')</option>'; }).join(''); };
    $('#reviewStatus').innerHTML = '<option value="">All row statuses</option>' + opts('ROW STATUS');
    $('#reviewPrice').innerHTML = '<option value="">All price statuses</option>' + opts('PRICE STATUS');
    $('#reviewBrand').innerHTML = '<option value="">All brands</option>' + opts('POS BRAND');
    $('#reviewSearch').value = prev ? prev.q : '';
    if (prev) { ['#reviewStatus', '#reviewPrice', '#reviewBrand'].forEach(function (sel, k) { var v = [prev.st, prev.pr, prev.br][k], el = $(sel); el.value = v; if (el.value !== v) el.value = ''; }); }
    $('#reviewTable thead').innerHTML = '<tr>' + REVIEW_COLS.filter(function (c) { return idx[c.h] !== undefined; }).map(function (c) { return '<th class="' + (c.cls || '') + (c.audit ? ' rv-audit-col' : '') + '">' + esc(c.label || c.h) + '</th>'; }).join('') + '</tr>';
    renderReviewKpis();
    applyReviewFilter(!!prev, prev && prev.page);
    renderTabs();
  }
  function renderReviewKpis() {
    var rows = state.results[SHEETS.OUT] || []; if (!rows.length) return;
    var k = reviewCounts(rows), ins = state.results[SHEETS.INS], upd = state.results[SHEETS.UPD];
    var chips = [['Rows', rows.length - 2, ''], ['Matched', k.matched, 'match'], ['New', k.newp, 'new'], ['Review', k.review, 'review'], ['Discontinued', k.disc, 'warn'], ['Price up', k.up, 'up'], ['Price down', k.down, 'down'], ['Barcode updates', k.barcode, 'warn'], ['Brand changes', k.brand, 'warn']];
    if (ins) chips.push(['Insert rows', Math.max(0, ins.length - 2), 'new']);
    if (upd) chips.push(['Update rows', Math.max(0, upd.length - 2), 'match']);
    $('#reviewKpis').innerHTML = chips.map(function (c) { return '<div class="review-kpi ' + c[2] + '"><strong>' + fmtN(c[1]) + '</strong><span>' + esc(c[0]) + '</span></div>'; }).join('');
    renderOutActions();
  }
  function applyReviewFilter(keep, page) {
    var R = state.review, q = $('#reviewSearch').value.trim().toUpperCase(), st = $('#reviewStatus').value, pr = $('#reviewPrice').value, br = $('#reviewBrand').value;
    var si = R.idx['ROW STATUS'], pi = R.idx['PRICE STATUS'], bi = R.idx['POS BRAND'];
    R.filtered = []; R.fidx = [];
    for (var i = 0; i < R.rows.length; i++) {
      var r = R.rows[i];
      if (st && String(r[si]).trim() !== st) continue;
      if (pr && String(r[pi]).trim() !== pr) continue;
      if (br && String(r[bi]).trim() !== br) continue;
      if (q && R.hay[i].indexOf(q) < 0) continue;
      R.filtered.push(r); R.fidx.push(i + 3);
    }
    R.page = keep ? (page || 0) : 0;
    renderReviewPage(keep);
  }
  function cellHtml(c, r, idx) {
    var v = r[idx[c.h]], s = String(v == null ? '' : v);
    if (c.chip) return s ? '<span class="rv-chip ' + chipClass(s) + '">' + esc(cleanTitle(s) || s) + '</span>' : '';
    if (c.h === 'NOTES' && s) return '<div class="rv-clamp" title="Click to show all of the note">' + esc(s).replace(/\n/g, '<br>') + '</div>';
    if (c.audit) { var a = s.charAt(0); return '<span class="rv-audit ' + (a === '☑' ? 'ok' : a === '☒' ? 'bad' : 'unk') + '">' + esc(s) + '</span>'; }
    if (c.arrow) { var nv = String(r[idx[c.extra]] == null ? '' : r[idx[c.extra]]); if (!nv || nv === s) return esc(s); return esc(s || '—') + ' <span class="rv-arrow">→</span> <strong>' + esc(nv) + '</strong>'; }
    if (c.extra) { var ev = String(r[idx[c.extra]] == null ? '' : r[idx[c.extra]]); return esc(s) + (ev ? '<small class="rv-extra' + (c.extraLabel ? ' warn' : '') + '">' + (c.extraLabel ? esc(c.extraLabel) + ': ' : '') + esc(ev) + '</small>' : ''); }
    return esc(s).replace(/\n/g, '<br>');
  }
  // v1.5.0: the All columns (Sheet) view is the Google Sheet tab — editable, with its totals band and colours.
  function renderReviewPage(keep) {
    var R = state.review, cols = REVIEW_COLS.filter(function (c) { return R.idx[c.h] !== undefined; });
    var sheetView = wb.outView === 'sheet';
    $('#reviewTableWrap').hidden = sheetView; $('#reviewPager').hidden = sheetView; $('#reviewGrid').hidden = !sheetView;
    document.querySelectorAll('[data-out-view]').forEach(function (x) { x.classList.toggle('is-on', x.dataset.outView === wb.outView); });
    var badge = $('#reviewCount'); badge.textContent = fmtN(R.filtered.length) + ' OF ' + fmtN(R.rows.length) + ' ROWS'; badge.className = 'result-badge ok';
    if (sheetView) { drawOutGrid(keep); return; }
    var pages = Math.max(1, Math.ceil(R.filtered.length / PAGE));
    R.page = Math.max(0, Math.min(R.page, pages - 1));
    var slice = R.filtered.slice(R.page * PAGE, (R.page + 1) * PAGE);
    $('#reviewTable tbody').innerHTML = slice.length ? slice.map(function (r) {
      return '<tr>' + cols.map(function (c) { var s = String(r[R.idx[c.h]] || ''); return '<td class="' + (c.cls || '') + (c.audit ? ' rv-audit-col' : '') + (c.cls && c.cls.indexOf('warnable') >= 0 && s ? ' warn-cell' : '') + '">' + cellHtml(c, r, R.idx) + '</td>'; }).join('') + '</tr>';
    }).join('') : '<tr><td colspan="' + cols.length + '" class="rv-empty">No rows match the current search / filters.</td></tr>';
    $('#reviewPage').textContent = 'Page ' + (R.page + 1) + ' of ' + pages + ' · ' + PAGE + ' rows per page';
    $('#reviewPrev').disabled = R.page <= 0; $('#reviewNext').disabled = R.page >= pages - 1;
  }
  function drawOutGrid(keep) {
    var R = state.review;
    var cols = R.head.map(function (h, i) { return h === '__EXPORT_VISIBLE__' ? -1 : i; }).filter(function (i) { return i >= 0; });
    if (!wb.outGrid) wb.outGrid = window.PHFSheetGrid.create($('#reviewGrid'), { search: false });
    var look = window.PHFSheetLook.forSheet(SHEETS.OUT, R.head);
    var marks = state.edits.marks[SHEETS.OUT] || {}, mk = {};
    R.fidx.forEach(function (sheetRow, i) { if (marks[sheetRow]) mk[i] = marks[sheetRow]; });
    wb.outGrid.set({
      head: R.head, rows: R.filtered, cols: cols, rowNumbers: R.fidx, look: look, marks: mk, keepView: !!keep,
      totals: function (vis) { return look.totals(R.rows, vis); },
      edit: {
        readOnly: look.readOnly, rows: false, canUndo: (state.edits.undo[SHEETS.OUT] || 0) > 0,
        onChange: function (ch) { engineSheetEdit(SHEETS.OUT, ch, function (i) { return R.fidx[i]; }); },
        onUndo: function () { engineSheetUndo(SHEETS.OUT); }
      }
    });
    wb.outGrid.busy(state.busy || state.edits.busy);
  }
  // Buttons above OUT_MERGED_DATA: Refresh supplier changes (UPDATED SUPPLIER edits waiting) and Run stage 3 again.
  function renderOutActions() {
    var host = $('#outActions'); if (!host) return;
    var built = !!state.results[SHEETS.OUT], n = state.pendingSup || 0, busy = state.busy || state.edits.busy;
    if (!built) { host.innerHTML = ''; host.hidden = true; return; }
    host.hidden = false;
    var after3 = state.edits.outAfter3, done3 = (state.stage.export || {}).status === 'done';
    host.innerHTML =
      (n ? '<button type="button" class="btn small primary" data-act="refresh"' + (busy ? ' disabled' : '') + ' title="Check the UPDATED SUPPLIER (G) changes against the supplier upload — the Sheet menu REFRESH SUPPLIER CHANGES">Refresh supplier changes (' + fmtN(n) + ')</button>' : '') +
      '<button type="button" class="btn small' + (after3 || !done3 ? ' primary' : '') + '" data-act="stage3"' + (busy ? ' disabled' : '') + ' title="Generate OUT_POS_INSERT / OUT_POS_UPDATE from this OUT_MERGED_DATA and export the TXT files (supplier changes are refreshed first)">' + (done3 ? 'Run stage 3 again' : 'Run stage 3') + '</button>' +
      '<span class="out-actions-note">' + esc(n ? fmtN(n) + ' UPDATED SUPPLIER change' + (n === 1 ? '' : 's') + ' waiting — refresh to check ' + (n === 1 ? 'it' : 'them') + ' (stage 3 refreshes first).' : after3 ? 'OUT_MERGED_DATA was edited after stage 3 — run stage 3 again to put the edits in the POS files.' : 'Click a cell to edit it, as in the Google Sheet. FINAL SHELF RRP follows RRP / MARKUP OVERRIDE.') + '</span>';
    host.querySelectorAll('[data-act]').forEach(function (b) {
      b.onclick = function () {
        if (b.dataset.act === 'refresh') runExtra(['refresh'], 'Refresh supplier changes');
        if (b.dataset.act === 'stage3') runTo('export');
      };
    });
  }
  function wireReview() {
    var t; $('#reviewSearch').oninput = function () { clearTimeout(t); t = setTimeout(function () { applyReviewFilter(); }, 200); };
    ['#reviewStatus', '#reviewPrice', '#reviewBrand'].forEach(function (s) { $(s).onchange = function () { applyReviewFilter(); }; });
    $('#reviewReset').onclick = function () { $('#reviewSearch').value = ''; $('#reviewStatus').value = ''; $('#reviewPrice').value = ''; $('#reviewBrand').value = ''; applyReviewFilter(); };
    $('#reviewPrev').onclick = function () { state.review.page--; renderReviewPage(); };
    $('#reviewNext').onclick = function () { state.review.page++; renderReviewPage(); };
    $('#reviewTable').addEventListener('click', function (e) { var c = e.target.closest('.rv-clamp'); if (c) c.classList.toggle('is-open'); });
    document.querySelectorAll('[data-out-view]').forEach(function (b) {
      b.onclick = function () {
        wb.outView = b.dataset.outView;
        if (state.review) renderReviewPage();
      };
    });
  }

  // ------------------------------------------------------ workbook tabs (v1.4.0)
  /* The Google Sheet's tabs along the bottom of the workbook, in the Sheet's order and colours: IN_SUPPLIER (editable),
     OUT_MERGED_DATA (review or every column), OUT_POS_INSERT / OUT_POS_UPDATE (stage 3), the SRC_ reference tabs (as
     loaded, or with SRC STATUS once stage 2 has run) and TMP_MERGED_POS_DATA (the POS Database). One tab shows at a time.
     v1.5.0: every tab but TMP_MERGED_POS_DATA is editable, and each looks like the Sheet (js/sheet-look.js). */
  var WB_TABS = [
    { id: 'sup', sheet: SHEETS.SUP, color: 'ed4141' },
    { id: 'out', sheet: SHEETS.OUT, color: '81d25c', by: 'stage 2 (Build OUT_MERGED_DATA)' },
    { id: 'ins', sheet: SHEETS.INS, color: 'ff9900', by: 'stage 3 (Generate Insert + Update & Export)', engine: true },
    { id: 'upd', sheet: SHEETS.UPD, color: 'ff9900', by: 'stage 3 (Generate Insert + Update & Export)', engine: true },
    { id: 'fr', sheet: 'SRC_POS_FIND_REPLACE', color: '6d9eeb', input: 'fr' },
    { id: 'disc', sheet: 'SRC_POS_ONGOING_DISCOUNTS', color: '6d9eeb', input: 'disc' },
    { id: 'brands', sheet: 'SRC_POS_BRAND_NAME_CHANGES', color: '6d9eeb', input: 'brands' },
    { id: 'prefix', sheet: 'SRC_POS_PRODUCT_PREFIX', color: '6d9eeb', input: 'prefix' },
    { id: 'suppliers', sheet: 'SRC_POS_SUPPLIERS', color: '6d9eeb', input: 'suppliers' },
    { id: 'tmp', sheet: 'TMP_MERGED_POS_DATA', color: '', input: 'pos', readOnly: true }
  ];
  var wb = { active: 'sup', grid: null, outGrid: null, outView: 'sheet' };
  function wbTab(id) { return WB_TABS.filter(function (t) { return t.id === id; })[0] || WB_TABS[0]; }
  function wbCount(t) {
    if (t.id === 'sup') return rowsOf('sup').length;
    if (t.input) { var x = state.inputs[t.input]; return x && x.files ? x.files.reduce(function (a, f) { return a + f.data.length; }, 0) : 0; }
    var r = state.results[t.sheet]; return r && r.length >= 2 ? r.length - 2 : -1;
  }
  function wbRows(t) {
    if (t.input && !loaded(t.input)) return null;                            // not loaded: say so, even after a run
    var res = state.results[t.sheet];
    if (res && res.length >= 2 && (!t.input || res.length - 2 === rowsOf(t.input).length)) return res;   // as the merge left it (SRC STATUS filled in)
    if (t.input && loaded(t.input)) return M.sheetRows(t.sheet, rowsOf(t.input));
    return null;
  }
  function renderTabs() {
    var host = $('#wbTabs'); if (!host) return;
    host.innerHTML = '<span class="wb-tabs-lead" aria-hidden="true">☰</span>' + WB_TABS.map(function (t) {
      var n = wbCount(t), empty = n < 0 || (n === 0 && t.id !== 'sup');
      return '<button type="button" class="wb-tab' + (t.id === wb.active ? ' is-active' : '') + (empty ? ' is-empty' : '') + '" data-wb-tab="' + t.id + '" style="--tab:' + (t.color ? '#' + t.color : 'transparent') + '" title="' + esc(t.sheet + (n >= 0 ? ' · ' + fmtN(n) + ' rows' : ' · made by ' + t.by) + (t.readOnly ? ' · read-only' : ' · editable')) + '"><span>' + esc(t.sheet) + '</span>' + (n > 0 ? '<small>' + fmtN(n) + '</small>' : '') + '</button>';
    }).join('');
    host.querySelectorAll('[data-wb-tab]').forEach(function (b) { b.onclick = function () { wbShow(b.dataset.wbTab); }; });
  }
  function wbShow(id, quiet) {
    var t = wbTab(id), prev = wb.active;
    wb.active = t.id;
    var outReady = !!(state.review && state.results[SHEETS.OUT]);
    $('#supPanel').hidden = t.id !== 'sup';
    $('#reviewPanel').hidden = !(t.id === 'out' && outReady);
    var sheetPanel = $('#wbSheetPanel'); sheetPanel.hidden = t.id === 'sup' || (t.id === 'out' && outReady);
    document.querySelectorAll('[data-wb-tab]').forEach(function (b) { b.classList.toggle('is-active', b.dataset.wbTab === t.id); });
    var strip = $('#wbTabs'), on = strip && strip.querySelector('.wb-tab.is-active');
    if (on) { var l = on.offsetLeft, r = l + on.offsetWidth; if (l < strip.scrollLeft) strip.scrollLeft = l - 30; else if (r > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = r - strip.clientWidth + 30; }
    if (t.id === 'sup') refreshSupSheet();
    else if (t.id === 'out' && outReady) { if (wb.outView === 'sheet' && wb.outGrid) wb.outGrid.refresh(); }
    else drawSheetTab(t, quiet && prev === t.id);
    if (!quiet && prev !== t.id) {
      var wbEl = $('#workbook'), top = wbEl ? wbEl.getBoundingClientRect().top : 0;
      if (top < 0) wbEl.scrollIntoView({ block: 'start' });
    }
  }
  // One sheet tab (not IN_SUPPLIER / OUT_MERGED_DATA review): the Sheet's look, editable unless it is TMP_MERGED_POS_DATA.
  function drawSheetTab(t, keep) {
    var sheetPanel = $('#wbSheetPanel'), rows = wbRows(t);
    var empty = $('#wbSheetEmpty'), grid = $('#wbGrid'), badge = $('#wbSheetCount'), actions = $('#wbActions');
    $('#wbSheetTitle').textContent = t.sheet;
    sheetPanel.style.setProperty('--tab', t.color ? '#' + t.color : 'transparent');
    var canStart = t.input && !t.readOnly;                                   // an SRC tab can be started by typing / pasting
    if (!rows && !canStart) {
      empty.hidden = false; grid.hidden = true; wb.gridFor = '';
      empty.innerHTML = t.input ? '<strong>' + esc(inputDef(t.input).title) + ' is not loaded.</strong> Drop the ' + esc(t.sheet) + ' file (or a download of the Google Sheet) in Drop All, or on its row in the Input files list.'
        : '<strong>' + esc(t.sheet) + ' is made by ' + esc(t.by) + '.</strong> Run that stage, or Run All, to fill this tab.';
      $('#wbSheetSub').textContent = t.input ? 'Input · ' + inputDef(t.input).title : 'Output sheet';
      badge.textContent = '0 ROWS'; badge.className = 'result-badge';
      actions.innerHTML = '';
      return;
    }
    if (!rows) rows = M.sheetRows(t.sheet, []);
    empty.hidden = !!(rows.length > 2) || !canStart;
    if (!empty.hidden) empty.innerHTML = '<strong>' + esc(inputDef(t.input).title) + ' is not loaded.</strong> Drop the ' + esc(t.sheet) + ' file in Drop All, or click a cell below and type or paste (Ctrl+V) rows to start the table — it is saved in this browser.';
    grid.hidden = false;
    if (!wb.grid) wb.grid = window.PHFSheetGrid.create(grid, { search: true });
    var head = rows[1] || [], data = rows.slice(2), look = window.PHFSheetLook.forSheet(t.sheet, head);
    var edit = null, marks = null;
    if (t.input && !t.readOnly) {
      edit = { readOnly: look.readOnly, rows: true, canUndo: (srcUndo[t.input] || []).length > 0, onChange: function (ch) { srcEdit(t, ch); }, onUndo: function () { srcUndoLast(t); } };
      marks = {}; srcItems(t.input).forEach(function (it, i) { if (it.row.__ed) marks[i] = it.row.__ed; });
    } else if (t.engine) {
      edit = { readOnly: look.readOnly, rows: true, canUndo: (state.edits.undo[t.sheet] || 0) > 0, onChange: function (ch) { engineSheetEdit(t.sheet, ch, function (i) { return i + 3; }, data.length); }, onUndo: function () { engineSheetUndo(t.sheet); } };
      var m = state.edits.marks[t.sheet] || {}; marks = {}; Object.keys(m).forEach(function (r) { marks[Number(r) - 3] = m[r]; });
    }
    var key = t.id + ':' + state.rev + ':' + (state.results[t.sheet] ? 'r' : 'i');
    wb.grid.set({ head: head, rows: data, look: look, marks: marks, edit: edit, keepView: !!(keep && wb.gridFor === key) || !!keep,
      totals: function (vis) { return look.totals(data, vis); } });
    wb.grid.busy(state.busy || state.edits.busy);
    wb.gridFor = key; wb.gridRows = data.length;
    var sub = t.readOnly ? 'The POS Database · read-only (it comes from Build POS Master Databases)'
      : t.engine ? 'Made by ' + t.by + ' · editable — Export TXT again puts your edits in the POS file'
      : (state.results[t.sheet] ? 'As the merge left it (SRC STATUS filled in by stage 2) · ' : 'Input · ' + inputDef(t.input).title + ' · ') + 'editable — saved in this browser; run the stages again to use changes';
    $('#wbSheetSub').textContent = sub;
    badge.textContent = fmtN(data.length) + ' ROWS'; badge.className = 'result-badge' + (data.length ? ' ok' : '');
    renderWbActions(t);
  }
  function renderWbActions(t) {
    var host = $('#wbActions'); if (!host) return;
    var busy = state.busy || state.edits.busy, html = '';
    if (t.engine && state.results[t.sheet]) {
      var edited = !!state.edits.pos[t.sheet];
      html = '<button type="button" class="btn small' + (edited ? ' primary' : '') + '" data-act="reexport"' + (busy || !state.results.files ? ' disabled' : '') + ' title="Make the two POS TXT files again from OUT_POS_INSERT / OUT_POS_UPDATE as they are now (stage 3 export only — the sheets are not generated again)">Export TXT again</button>' +
        '<span class="out-actions-note">' + esc(edited ? t.sheet + ' was edited — Export TXT again to put the edits in the POS file. (Running stage 3 again makes this sheet again from OUT_MERGED_DATA.)' : 'Edits here go into the POS file with Export TXT again.') + '</span>';
    } else if (t.input && !t.readOnly && loaded(t.input)) {
      html = '<button type="button" class="btn small" data-act="rerun"' + (busy || !requiredReady() ? ' disabled' : '') + ' title="Run stages 1 → 3 with this table as it is now">Run All Stages</button><span class="out-actions-note">Changes here are saved in this browser straight away. Run the stages again to use them.</span>';
    }
    host.innerHTML = html;
    host.querySelectorAll('[data-act]').forEach(function (b) {
      b.onclick = function () {
        if (b.dataset.act === 'reexport') runExtra(['export'], 'Export TXT again');
        if (b.dataset.act === 'rerun') runTo('export');
      };
    });
  }

  // ------------------------------------------- engine sheet edits (v1.5.0: OUT_MERGED_DATA, OUT_POS_INSERT / UPDATE)
  /* The edit goes into the engine's copy of the Sheet and the script's onEdit runs on it, as typing in the Google Sheet
     does. The changed rows come back as the Sheet shows them. One edit (a cell, a paste, a row) = one undo step. */
  function gridFor(sheet) { return sheet === SHEETS.OUT ? wb.outGrid : wb.grid; }
  function colName(sheet, c) { var r = state.results[sheet]; return (r && r[1] && r[1][c]) || ''; }
  function engineSheetEdit(sheet, ch, sheetRowOf, nRows) {
    var g = gridFor(sheet);
    if (state.busy || state.edits.busy) { if (g) g.note('A stage is running — edit again when it finishes.', 'warn'); return; }
    var msg = null, newVals = [];
    if (ch.type === 'deleteRows') {
      msg = { cmd: 'edit', sheet: sheet, op: 'deleteRows', rows: ch.rows.map(sheetRowOf) };
    } else {
      var byRow = {}, rows = [];
      ch.cells.forEach(function (cell) {
        if (nRows !== undefined && cell.i >= nRows) { var k = cell.i - nRows; (newVals[k] = newVals[k] || [])[cell.c] = cell.v; return; }
        var r = sheetRowOf(cell.i); if (!r) return;
        if (!byRow[r]) { byRow[r] = {}; rows.push(r); }
        byRow[r][cell.c] = cell.v;
      });
      rows.sort(function (a, b) { return a - b; });
      var blocks = [];
      rows.forEach(function (r) {
        var cs = Object.keys(byRow[r]).map(Number), c1 = Math.min.apply(null, cs), c2 = Math.max.apply(null, cs);
        var vals = []; for (var c = c1; c <= c2; c++) vals.push(byRow[r][c] === undefined ? null : byRow[r][c]);
        var last = blocks[blocks.length - 1];
        if (last && last.r1 + last.values.length === r && last.c1 === c1 + 1 && last.values[0].length === vals.length) { last.values.push(vals); return; }
        blocks.push({ r1: r, c1: c1 + 1, values: [vals] });
      });
      newVals = newVals.filter(Boolean).map(function (row) { var o = []; for (var c = 0; c < row.length; c++) o.push(row[c] === undefined ? '' : row[c]); return o; });
      if (blocks.length) msg = { cmd: 'edit', sheet: sheet, op: 'cells', blocks: blocks };
      else if (newVals.length) msg = { cmd: 'edit', sheet: sheet, op: 'appendRows', values: newVals };
      if (blocks.length && newVals.length) { if (g) g.note('Edit the existing rows and the new rows separately.', 'warn'); return; }
    }
    if (!msg) return;
    var cells = ch.cells || [], one = cells.length === 1 ? cells[0] : null;
    var what = ch.type === 'deleteRows' ? fmtN(ch.rows.length) + ' row' + (ch.rows.length === 1 ? '' : 's') + ' deleted'
      : msg.op === 'appendRows' ? fmtN(newVals.length) + ' row' + (newVals.length === 1 ? '' : 's') + ' added'
      : one ? 'Changed ' + ch.where + ' (' + colName(sheet, one.c) + ')' : (ch.paste ? 'Pasted at ' + ch.where + ': ' : '') + fmtN(cells.length) + ' cells changed' + (ch.skipped ? ' (' + fmtN(ch.skipped) + ' read-only cells left as they were)' : '');
    engineSend(sheet, msg, cells, sheetRowOf, what);
  }
  function engineSheetUndo(sheet) {
    if (state.busy || state.edits.busy) return;
    engineSend(sheet, { cmd: 'undo', sheet: sheet }, null, null, 'Undone');
  }
  function engineSend(sheet, msg, cells, sheetRowOf, what) {
    var g = gridFor(sheet);
    state.edits.busy = true; if (g) { g.busy(true); g.note('Updating ' + sheet + '…', 'running'); }
    renderOutActions();
    return state.engine.send(msg).then(function (res) {
      var rows = state.results[sheet];
      if (res.display) state.results[sheet] = res.display;
      else Object.keys(res.rows || {}).forEach(function (r) {
        var at = Number(r) - 1, v = res.rows[r];
        if (!rows[at]) { rows[at] = v.slice(); return; }
        rows[at].length = 0; Array.prototype.push.apply(rows[at], v);       // same array: the review rows follow
      });
      var marks = state.edits.marks[sheet] || (state.edits.marks[sheet] = {});
      if (msg.cmd === 'undo' || res.display) { if (msg.cmd === 'undo') Object.keys(res.rows || {}).forEach(function (r) { delete marks[r]; }); if (res.display) state.edits.marks[sheet] = {}; }
      else (cells || []).forEach(function (c) { var r = sheetRowOf(c.i); if (r) (marks[r] = marks[r] || {})[c.c] = 1; });
      state.edits.undo[sheet] = res.undo || 0;
      state.pendingSup = res.pending || 0;
      if (sheet === SHEETS.OUT) { if ((state.stage.export || {}).status === 'done') state.edits.outAfter3 = true; }
      else state.edits.pos[sheet] = true;
      afterSheetEdit(sheet);
      var gg = gridFor(sheet), extra = '';
      if (sheet === SHEETS.OUT) extra = state.pendingSup ? ' · ' + fmtN(state.pendingSup) + ' UPDATED SUPPLIER change' + (state.pendingSup === 1 ? '' : 's') + ' waiting — Refresh supplier changes (stage 3 refreshes first).' : state.edits.outAfter3 ? ' · Run stage 3 again to put it in the POS files.' : '';
      else extra = ' · Export TXT again to put it in the POS file.';
      if (gg) gg.note(what + '.' + extra, 'success');
      setGlobal(sheet + ': ' + what + '.' + extra, 'success');
    }).catch(function (e) {
      var gg = gridFor(sheet); if (gg) gg.note('Not changed: ' + e.message, 'error');
      setGlobal(sheet + ': ' + e.message, 'error');
    }).then(function () {
      state.edits.busy = false;
      var gg = gridFor(sheet); if (gg) gg.busy(state.busy);
      renderOutActions(); if (wb.active !== 'out' && wb.active !== 'sup') renderWbActions(wbTab(wb.active));
    });
  }
  function afterSheetEdit(sheet) {
    if (sheet === SHEETS.OUT) {
      renderReview(true);
      var ex = state.stage.export || {};
      if (ex.status === 'done' && state.edits.outAfter3) stageMsg('export', 'OUT_MERGED_DATA was edited after this stage — run stage 3 again for insert / update files with the edits.', 'ready');
    } else {
      renderReviewKpis(); renderTabs(); wbShow(wb.active, true);
      if ((state.stage.export || {}).status === 'done') stageMsg('export', sheet + ' was edited — use Export TXT again (on the tab) to put the edits in the POS file.', 'ready');
    }
    renderOutputs();
    scheduleWorkbook();
  }
  // OUT rows whose PRICE STATUS still says SUP OVERRIDE PENDING after a refresh (the supplier in G was not recognised).
  function stillPending() {
    var o = state.results[SHEETS.OUT] || [], ci = (o[1] || []).indexOf('PRICE STATUS'), n = 0;
    for (var i = 2; i < o.length; i++) if (/SUP OVERRIDE PENDING/i.test(String(o[i][ci] || ''))) n++;
    return n;
  }
  var wbTimer = 0;
  // The review workbook is made again after an edit; a very large merge (5,000+ rows) waits for the next stage instead
  // (writing it takes a few seconds) and its download says it is from before the edits.
  function scheduleWorkbook() {
    clearTimeout(wbTimer);
    var out = state.results[SHEETS.OUT], wbo = state.outputs.get('xlsx-review');
    if (out && out.length > 5002) { if (wbo) { wbo.warn = 'Made before your sheet edits — it is made again when stage 3 runs.'; renderOutputs(); } return; }
    wbTimer = setTimeout(function () { if (state.results[SHEETS.OUT] && !state.busy) addWorkbookOutput(); }, 900);
  }
  // Refresh supplier changes / Export TXT again: engine steps outside the three stages.
  function runExtra(steps, label) {
    if (state.busy || state.edits.busy) return Promise.resolve();
    state.busy = true; updateRunButtons(); renderOutActions();
    setGlobal(label + '…', 'running');
    var t0 = Date.now(), chain = Promise.resolve();
    steps.forEach(function (st) { chain = chain.then(function () { return runStep(st); }); });
    return chain.then(function () {
      if (steps.indexOf('refresh') >= 0) {
        renderReview(true);
        var a = (state.results.alerts_refresh || [])[0], left = stillPending();
        setGlobal(label + ' — ' + (a ? cleanTitle(a.title) + (a.msg ? ': ' + String(a.msg).split('\n')[0] : '') : 'done') + ' (' + ((Date.now() - t0) / 1000).toFixed(1) + 's).' +
          (left ? ' ' + fmtN(left) + ' row' + (left === 1 ? ' is' : 's are') + ' still SUP OVERRIDE PENDING — the supplier typed in UPDATED SUPPLIER (G) was not found; type it as NAME (account number), e.g. BIOCEUTICALS (20).' : ''), left ? 'missing' : 'success');
      }
      if (steps.indexOf('export') >= 0) {
        (state.results.files || []).forEach(function (f, i) {
          var bin = atob(f.base64), bytes = new Uint8Array(bin.length);
          for (var k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
          addOutput('export', 'txt-' + i, f.filename, new Blob([bytes], { type: 'text/plain;charset=utf-8' }), fmtN(f.rowCount) + ' rows · ' + (f.label || 'POS file') + ' · tab-separated TXT for POSActive');
        });
        stageSet('export', 'done', 'Exported again ' + melb() + ' — ' + (state.results.files || []).length + ' TXT files with the OUT_POS_INSERT / UPDATE edits.');
        setGlobal('Export TXT again — ' + (state.results.files || []).length + ' TXT files ready below (' + ((Date.now() - t0) / 1000).toFixed(1) + 's).', 'success');
      }
      return addWorkbookOutput();
    }).catch(function (e) { console.error(e); setGlobal(label + ' stopped: ' + e.message, 'error'); })
      .then(function () { state.busy = false; updateRunButtons(); renderOutActions(); renderOutputs(); renderTabs(); if (wb.active !== 'sup' && wb.active !== 'out') wbShow(wb.active, true); });
  }

  // ------------------------------------------------- SRC_ tab edits (v1.5.0, saved reference tables)
  /* An SRC_ tab is the reference table loaded for it (one or more files). A change edits those rows (rows typed below the
     last row go into the last file, or a "Typed here" table when nothing is loaded), saves the table in this browser
     straight away and resets the stages — the next run uses it. Undo goes back one change at a time. */
  var srcUndo = {};
  function srcItems(id) { var out = [], x = state.inputs[id]; ((x && x.files) || []).forEach(function (e) { e.data.forEach(function (row) { out.push({ e: e, row: row }); }); }); return out; }
  function srcSnapshot(id) { var x = state.inputs[id]; return x ? x.files.map(function (e) { return { e: e, data: e.data.map(function (r) { var a = r.slice(); if (r.__ed) a.__ed = Object.assign({}, r.__ed); return a; }) }; }) : null; }
  function srcRestore(id, snap) {
    if (!snap || !snap.length) { delete state.inputs[id]; return; }
    snap.forEach(function (s) { s.e.data = s.data; });
    state.inputs[id] = state.inputs[id] || { files: [], savedAt: melb() };
    state.inputs[id].files = snap.map(function (s) { return s.e; });
  }
  // What a typed value becomes in a reference table: SRC_POS_ONGOING_DISCOUNTS POS DISCOUNT% 7.5 / 7.5% / 0.075 → 0.075
  // (1.0 Setup setupNormaliseSrcDiscountPercentEdit_), POS MARKUP% a number, everything else trimmed text.
  function srcValue(sheet, c, v) {
    var s = String(v == null ? '' : v).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim();
    if (sheet === 'SRC_POS_ONGOING_DISCOUNTS' && (c === 7 || c === 8) && s !== '') {
      var n = Number(s.replace(/[%,\s]/g, ''));
      if (isFinite(n)) { if (c === 7) { if (n > 1) n = n / 100; if (n < 0) n = 0; } else if (/%/.test(s) || n > 1) n = n / 100; return n; }
    }
    return s;
  }
  function srcEdit(t, ch) {
    var id = t.input, def = inputDef(id), g = wb.grid;
    if (state.busy) { if (g) g.note('A stage is running — edit again when it finishes.', 'warn'); return; }
    var snap = srcSnapshot(id), items = srcItems(id), width = M.SCHEMAS[t.sheet].headers.length, msg = '';
    if (ch.type === 'deleteRows') {
      ch.rows.forEach(function (i) { var it = items[i]; if (!it) return; var k = it.e.data.indexOf(it.row); if (k >= 0) it.e.data.splice(k, 1); });
      msg = fmtN(ch.rows.length) + ' row' + (ch.rows.length === 1 ? '' : 's') + ' deleted';
    } else {
      var x = state.inputs[id], target = null, added = 0, changed = 0;
      var newRow = function () {
        if (!x) x = state.inputs[id] = { files: [], savedAt: melb() };
        target = target || x.files[x.files.length - 1];
        if (!target) { target = { name: 'Typed here', size: 0, tab: '', added: true, data: [], loadedAt: melb(), report: { headerRow: 2, found: width, total: width, missing: [], rows: 0 } }; x.files.push(target); }
        var r = new Array(width); for (var c = 0; c < width; c++) r[c] = ''; target.data.push(r); added++;
        return { e: target, row: r };
      };
      ch.cells.forEach(function (cell) {
        while (cell.i >= items.length) items.push(newRow());
        var it = items[cell.i], v = srcValue(t.sheet, cell.c, cell.v);
        if (String(it.row[cell.c] == null ? '' : it.row[cell.c]) === String(v)) return;
        it.row[cell.c] = v; (it.row.__ed = it.row.__ed || {})[cell.c] = 1; it.e.edited = true; changed++;
      });
      if (!changed && !added) return;
      msg = ch.cells.length === 1 ? 'Changed ' + ch.where + ' (' + M.SCHEMAS[t.sheet].headers[ch.cells[0].c] + ')' : (ch.paste ? 'Pasted at ' + ch.where + ': ' : '') + fmtN(changed) + ' cell' + (changed === 1 ? '' : 's') + ' changed';
      if (added) msg += ', ' + fmtN(added) + ' row' + (added === 1 ? '' : 's') + ' added';
    }
    var x2 = state.inputs[id];
    if (x2) { x2.files = x2.files.filter(function (e) { return e.data.length; }); x2.savedAt = melb(); if (!x2.files.length) delete state.inputs[id]; }
    (srcUndo[id] = srcUndo[id] || []).push(snap); if (srcUndo[id].length > 40) srcUndo[id].shift();
    srcCommit(t, msg + '. Saved in this browser — run the stages again to use it.', 'success');
  }
  function srcUndoLast(t) {
    var id = t.input, list = srcUndo[id] || [];
    if (state.busy || !list.length) return;
    srcRestore(id, list.pop());
    srcCommit(t, 'Undone. Saved in this browser.', 'info');
  }
  function srcCommit(t, note, type) {
    var id = t.input, def = inputDef(id);
    if (state.inputs[id]) refSave(id); else refDelete(id);
    state.rev++;
    invalidateResults(def.title + ' changed — run the stages again to use it.');
    renderAll();
    if (state.activeInput === id) showInput(id);
    wbShow(t.id, true);
    if (wb.grid) wb.grid.note(note, type);
    setGlobal(def.title + ': ' + note + ' ' + readinessText(), requiredReady() ? 'ready' : 'missing');
  }

  // ------------------------------------- Supplier Updates sheet (v1.2.0, editable)
  /* The IN_SUPPLIER_/_PRODUCT_UPDATES tab as a small spreadsheet, full width under the stages. Row 1 is the Sheet's
     totals bar (worked out here over the rows the search leaves visible, like the Sheet's SUBTOTAL formulas), then the
     16 headings and every supplier row from all loaded files. Click a cell to select it, type to change it, Ctrl+V
     pastes from that cell. INDEX is numbered automatically and STATUS is written by the merge, so those two columns are
     read-only. Rows typed or pasted below the last row go into an "Added rows" supplier entry. Every change updates the
     supplier input for this session and resets the stages; Undo goes back one change at a time. */
  var SUP_HEADS = M.SCHEMAS[SHEETS.SUP].headers;
  var SUP_NUM = { 7: 1, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1, 13: 1 };   // H–N: numbers when they look like numbers
  var SUP_TEXT = { 1: 1, 2: 1, 3: 1, 5: 1 };                       // B C D F stay text (codes keep leading zeros)
  // v1.4.0: every row is in the sheet (no pages). Only the rows near the scroll position are drawn, with gap rows above /
  // below standing in for the rest, so a large list scrolls as quickly as a short one.
  var SUP_BUF = 40, ADDED = 'Added rows', SUP_UNDO_MAX = 40;
  var supView = { q: '', undo: [], note: '', noteType: 'info', sel: null, vis: [], editing: null, rowH: 27, win: { start: 0, end: 0 }, raf: 0 };

  function parseTsv(text) {
    var s = String(text || '').replace(/\r\n?/g, '\n'), rows = [], row = [], f = '', q = false, i = 0, n = s.length;
    while (i < n) {
      var ch = s.charAt(i);
      if (q) {
        if (ch === '"') {
          if (s.charAt(i + 1) === '"') { f += '"'; i += 2; continue; }
          var nx = s.charAt(i + 1);
          if (nx === '\t' || nx === '\n' || nx === '') { q = false; i++; continue; }
          f = '"' + f + '"'; q = false; i++; continue;        // "Organic" Oats — the quotes were part of the text
        }
        f += ch; i++; continue;
      }
      if (ch === '"' && f === '') { q = true; i++; continue; }
      if (ch === '\t') { row.push(f); f = ''; i++; continue; }
      if (ch === '\n') { row.push(f); rows.push(row); row = []; f = ''; i++; continue; }
      f += ch; i++;
    }
    if (q) f = '"' + f;
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    while (rows.length && !rows[rows.length - 1].some(function (c) { return String(c).trim() !== ''; })) rows.pop();
    return rows;
  }
  function supValue(c, v) {
    if (v === undefined || v === null) return '';
    if (typeof v !== 'string') return SUP_TEXT[c] ? String(v) : v;
    v = v.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim();
    if (SUP_NUM[c] && /^-?\$?\s?(\d{1,3}(,\d{3})+|\d+)?(\.\d+)?$/.test(v) && /\d/.test(v)) { var num = Number(v.replace(/[$,\s]/g, '')); if (isFinite(num)) return num; }
    return v;
  }
  function coerceSupRow(o) {
    for (var c = 0; c < 16; c++) o[c] = supValue(c, o[c]);
    o[0] = ''; o[15] = '';                                       // INDEX is renumbered, STATUS is written by the merge
    o.length = 16;
    return o;
  }
  function blankSupRow() { var o = new Array(16); for (var c = 0; c < 16; c++) o[c] = ''; return o; }
  // Do the pasted columns look like supplier rows? D = barcode, J / K = prices.
  function supRowsLookRight(rows) {
    if (!rows.length) return false;
    var bc = 0, ws = 0;
    rows.forEach(function (o) {
      var d = String(o[3] == null ? '' : o[3]).replace(/\s+/g, ''), j = o[9];
      if (!d || /^\d{6,14}$/.test(d)) bc++;
      if (j === '' || typeof j === 'number' || /^n\/?a$/i.test(String(j))) ws++;
    });
    return bc >= rows.length * 0.8 && ws >= rows.length * 0.8;
  }
  // A pasted block with no cell selected: headings (any order, row 1–8) are used when found; otherwise columns are
  // read by position: 16 columns = A–P, 14 or 15 = from B (POS SUPPLIER NAME), anything else from A when column 1 looks
  // like INDEX. The result is checked against the data (barcodes in D, prices in J).
  function mapPasted(rows) {
    var hr = M.findHeaderRow(rows, SUP_HEADS), out = { data: [], how: '', warn: [] };
    if (hr.row >= 0 && hr.score >= 3) {
      var mp = M.mapTable(rows, SHEETS.SUP);
      out.data = mp.data.map(function (r) { return coerceSupRow(r.slice()); });
      out.how = 'by heading (row ' + mp.report.headerRow + ')';
      var miss = inputDef('sup').need.filter(function (h) { return mp.report.missing.indexOf(h) >= 0; });
      if (miss.length) out.warn.push('no ' + miss.join(', ') + ' column — the merge needs ' + (miss.length === 1 ? 'it' : 'them'));
    } else {
      var width = Math.max.apply(null, rows.map(function (r) { return r.length; }));
      var idxLike = rows.filter(function (r) { return /^\d{1,6}$/.test(String(r[0]).trim()); }).length >= rows.length * 0.8;
      var start = width >= 16 ? 0 : (width === 14 || width === 15) ? 1 : (idxLike ? 0 : 1);
      out.data = rows.map(function (r) {
        var o = blankSupRow();
        for (var c = 0; c + start < 16 && c < r.length; c++) o[c + start] = r[c];
        return coerceSupRow(o);
      }).filter(function (o) { return o.slice(1, 15).some(function (v) { return String(v).trim() !== ''; }); });
      out.how = 'as columns ' + window.XlsxLite.colLetter(start + 1) + '–' + window.XlsxLite.colLetter(Math.min(16, start + width));
      if (!supRowsLookRight(out.data)) out.warn.push('column D does not look like barcodes or column J like W/S prices — click the first cell they belong in (e.g. B' + (supView.vis.length + 3) + ') and paste again, or Undo');
    }
    if (out.data.some(function (o) { return /e\+/i.test(String(o[3])); })) out.warn.push('some barcodes look like 9.3E+12 — format the barcode column as Number (0 decimals) or Text before copying');
    return out;
  }

  // ---- data: every supplier row in input order, with the file entry it belongs to
  function supEntries() { var x = state.inputs.sup; return (x && x.files) || []; }
  function addedEntry(create) {
    var list = supEntries();
    for (var i = 0; i < list.length; i++) if (list[i].added) return list[i];
    if (!create) return null;
    var e = { name: ADDED, size: 0, tab: '', added: true, data: [], loadedAt: melb(), report: { headerRow: 0, found: SUP_HEADS.length, total: SUP_HEADS.length, missing: [], rows: 0 } };
    if (!state.inputs.sup) state.inputs.sup = { files: [], savedAt: melb() };
    state.inputs.sup.files.push(e);
    return e;
  }
  function supModel() {
    var refs = [];
    supEntries().forEach(function (e) { e.data.forEach(function (row) { refs.push({ e: e, row: row }); }); });
    var res = state.results[SHEETS.SUP], run = !!(res && res.length > 2 && res.length - 2 === refs.length);
    var items = refs.map(function (ref, i) { return { ref: ref, n: i + 1, shown: run ? res[i + 2] : ref.row }; });
    return { items: items, run: run, summary: run ? String((res[0] || [])[15] || '').trim() : '' };
  }
  function supShown(it, c) {
    if (c === 0) return String(it.n);
    if (c === 15) return it.shown === it.ref.row ? '' : String(it.shown[15] == null ? '' : it.shown[15]);
    var v = it.shown[c];
    if (v === null || v === undefined) return '';
    return typeof v === 'number' && (c === 8 || c === 9 || c === 10 || c === 13) ? String(Math.round(v * 10000) / 10000) : String(v);
  }

  // ---- changes: one undo snapshot per change, then the input / stages / rail / sheet refresh together
  function supSnapshot() {
    var x = state.inputs.sup;
    if (!x) return null;
    return x.files.map(function (e) {
      return { e: e, data: e.data.map(function (row) { var a = row.slice(); if (row.__ed) a.__ed = Object.assign({}, row.__ed); return a; }) };
    });
  }
  function supRestore(snap) {
    if (!snap || !snap.length) { delete state.inputs.sup; return; }
    snap.forEach(function (s) { s.e.data = s.data; });
    state.inputs.sup = state.inputs.sup || { files: [], savedAt: melb() };
    state.inputs.sup.files = snap.map(function (s) { return s.e; });
  }
  function supCommit(msg, type) {
    var x = state.inputs.sup;
    if (x) { x.files = x.files.filter(function (e) { return e.data.length; }); if (!x.files.length) delete state.inputs.sup; else x.savedAt = melb(); }
    state.rev++;
    invalidateResults('Supplier rows changed — run the stages again.');
    renderAll();
    if (state.activeInput === 'sup') showInput('sup');
    if (msg !== undefined) { supView.note = msg; supView.noteType = type || 'info'; }
    drawSup();
  }
  function supMutate(fn) {
    if (state.busy) { supSay('A stage is running — try again when it finishes.', 'warn'); return false; }
    var snap = supSnapshot(), res = fn();
    if (!res) return false;
    supView.undo.push(snap); if (supView.undo.length > SUP_UNDO_MAX) supView.undo.shift();
    supCommit(res.msg, res.type);
    return true;
  }
  function setSupCell(row, c, raw) {
    if (c <= 0 || c >= 15) return false;
    var v = supValue(c, raw);
    if (String(row[c] == null ? '' : row[c]) === String(v)) return false;
    row[c] = v;
    row.__ed = row.__ed || {}; row.__ed[c] = true;
    return true;
  }

  // ---- paste: at the selected cell (like Google Sheets), or by heading / position when nothing is selected
  function pasteToSupplier(text) {
    if (state.busy) { supSay('A stage is running — paste again when it finishes.', 'warn'); return; }
    var rows = parseTsv(text);
    if (!rows.length || !rows.some(function (r) { return r.some(function (c) { return String(c).trim() !== ''; }); })) { supSay('Nothing to paste — copy the cells in Excel or Google Sheets first.', 'warn'); return; }
    var hr = M.findHeaderRow(rows, SUP_HEADS), sel = supView.sel;
    if (sel && !(hr.row >= 0 && hr.score >= 3)) { pasteAtCell(rows, sel); return; }
    var m;
    try { m = mapPasted(rows); } catch (e) { supSay('Could not read the pasted rows: ' + e.message, 'error'); return; }
    if (!m.data.length) { supSay('The pasted block has no supplier rows (only headings or blank rows).', 'warn'); return; }
    var startRow = supModel().items.length;
    supMutate(function () {
      var e = addedEntry(true);
      m.data.forEach(function (o) { e.data.push(o); });
      return { msg: fmtN(m.data.length) + ' row' + (m.data.length === 1 ? '' : 's') + ' added ' + m.how + '.' + (m.warn.length ? ' Check: ' + m.warn.join(' · ') + '.' : ''), type: m.warn.length ? 'warn' : 'success' };
    });
    supGoTo(startRow, 1);
    setGlobal('Supplier Updates: ' + fmtN(m.data.length) + ' row' + (m.data.length === 1 ? '' : 's') + ' added — ' + fmtN(rowsOf('sup').length) + ' supplier rows in total. ' + readinessText(), m.warn.length ? 'missing' : 'success');
  }
  function pasteAtCell(rows, sel) {
    var r0 = Math.min(sel.r, sel.r2), c0 = Math.max(1, Math.min(sel.c, sel.c2)), vis = supView.vis;
    // A 16-column block (A–P, INDEX first) pasted at column A or B keeps its columns: INDEX is skipped.
    var width = Math.max.apply(null, rows.map(function (r) { return r.length; }));
    var skipFirst = width >= 16 && c0 <= 1;
    supMutate(function () {
      var added = 0, changed = 0, cut = 0;
      for (var i = 0; i < rows.length; i++) {
        var cells = skipFirst ? rows[i].slice(1) : rows[i];
        if (!cells.some(function (v) { return String(v).trim() !== ''; }) && !vis[r0 + i]) continue;
        var target = vis[r0 + i] ? vis[r0 + i].ref.row : null;
        if (!target) { target = blankSupRow(); addedEntry(true).data.push(target); added++; }
        for (var j = 0; j < cells.length; j++) {
          var c = c0 + j;
          if (c >= 15) { if (String(cells[j]).trim() !== '' && c > 15) cut++; continue; }
          if (setSupCell(target, c, cells[j])) changed++;
        }
      }
      if (!changed && !added) return null;
      var where = SUP_HEADS[c0] ? window.XlsxLite.colLetter(c0 + 1) + (r0 + 3) : '';
      return { msg: 'Pasted at ' + where + ': ' + fmtN(changed) + ' cell' + (changed === 1 ? '' : 's') + ' changed' + (added ? ', ' + fmtN(added) + ' row' + (added === 1 ? '' : 's') + ' added' : '') + '.' + (cut ? ' ' + fmtN(cut) + ' value(s) past column O were left out (STATUS is written by the merge).' : ''), type: cut ? 'warn' : 'success' };
    });
    supView.sel = { r: r0, c: c0, r2: r0 + rows.length - 1, c2: Math.min(14, c0 + Math.max.apply(null, rows.map(function (r) { return r.length; })) - 1 - (skipFirst ? 1 : 0)) };
    paintSel();
  }

  function supSay(msg, type) {
    supView.note = msg || ''; supView.noteType = type || 'info';
    var el = $('#supNote'); if (!el) return;
    el.className = 'status sup-note ' + supView.noteType; el.textContent = supView.note; el.hidden = !supView.note;
  }
  function supStatusClass(v) {
    var s = String(v || '').toUpperCase();
    return !s ? '' : /UNMATCHABLE/.test(s) ? 'st-unm' : /NOT USED/.test(s) ? 'st-notused' : /MATCHED/.test(s) ? 'st-match' : /NEW/.test(s) ? 'st-new' : '';
  }
  function supTotals(items) {
    var st = function (it) { return supShown(it, 15).toUpperCase(); };
    var cnt = function (re) { var n = 0; items.forEach(function (it) { if (re.test(st(it))) n++; }); return n; };
    var uniq = function (c) { var s = {}, n = 0; items.forEach(function (it) { var v = supShown(it, c).trim(); if (v && !s[v]) { s[v] = 1; n++; } }); return n; };
    var sum = function (c) { return items.reduce(function (a, it) { var v = Number(supShown(it, c).replace(/[$,\s]/g, '')); return a + (isFinite(v) && v > 0 ? v : 0); }, 0); };
    return { total: items.length, matched: cnt(/BEST BUY.*MATCHED|^MATCHED$/), newp: cnt(/BEST BUY.*NEW|^NEW/), notUsed: cnt(/NOT USED/), unm: cnt(/UNMATCHABLE/),
      names: uniq(1), suppliers: uniq(2), barcodes: uniq(3), brands: uniq(4), ws: sum(9), rrp: sum(10) };
  }
  function money(n) { return '$' + Number(n || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  // v1.3.1 — the brands this merge covers (SUP BRAND, column E, of every supplier row). Stage 2 matches, updates and
  // discontinues POS products of these brands only, so this is the check before running.
  function supScopeHtml(model) {
    var counts = {}, list = [], added = 0;
    model.items.forEach(function (it) {
      var b = String(it.ref.row[4] == null ? '' : it.ref.row[4]).trim().toUpperCase() || '(NO BRAND)';
      if (!counts[b]) { counts[b] = 0; list.push(b); }
      counts[b]++;
      if (it.ref.e.added) added++;
    });
    if (!model.items.length) return '<span class="sup-scope-label">Brands in this merge: 0</span><span class="sup-scope-note">Paste or drop the supplier rows for the brands you are updating — the merge matches, updates and discontinues only those brands.</span>';
    list.sort();
    var chip = function (b) { return '<span class="sup-brand">' + esc(b) + ' <b>' + fmtN(counts[b]) + '</b></span>'; };
    var SHOW = 10, files = model.items.length - added;
    var rows = fmtN(model.items.length) + ' row' + (model.items.length === 1 ? '' : 's') + (added && files ? ' (' + fmtN(added) + ' added here · ' + fmtN(files) + ' from files)' : added ? ' added here' : ' from files');
    return '<span class="sup-scope-label">Brands in this merge: ' + fmtN(list.length) + '</span><span class="sup-scope-rows">' + rows + '</span>' +
      list.slice(0, SHOW).map(chip).join('') +
      (list.length > SHOW ? '<details class="sup-scope-more"><summary>+' + fmtN(list.length - SHOW) + ' more</summary><div>' + list.slice(SHOW).map(chip).join('') + '</div></details>' : '');
  }

  // v1.3.1 — CH2 / Unique supplier imports saved by Build Master Databases are added only when asked (buttons on the
  // sheet and on the Supplier Updates card): a whole catalogue widens the merge to every brand in it.
  var libSupRecs = {};
  function libSupRefresh() {
    if (!LIB) return Promise.resolve();
    return LIB.list().then(function (all) {
      libSupRecs = {};
      (all || []).forEach(function (r) { if (LIB_SUP.indexOf(r.kind) >= 0) libSupRecs[r.kind] = r; });
      drawLibSup();
    }).catch(function (e) { console.warn('Library list failed', e); });
  }
  function libSupAdded(kind) { var r = libSupRecs[kind]; return supEntries().some(function (f) { return f.libKind === kind && (!r || f.libSavedAt === r.savedAt); }); }
  function libSupButtonsHtml() {
    var ks = LIB ? LIB_SUP.filter(function (k) { return libSupRecs[k]; }) : [];
    if (!ks.length) return '';
    return '<span class="sup-lib-label">From the Library</span>' + ks.map(function (k) {
      var r = libSupRecs[k], on = libSupAdded(k), stale = LIB.isStale(r), rows = String(r.meta || '').split(' · ')[0];
      return '<button type="button" class="btn small sup-lib-add' + (on ? ' is-added' : '') + (stale ? ' is-stale' : '') + '" data-lib-add="' + k + '"' + (on ? ' disabled' : '') +
        ' title="' + esc(r.name + (r.meta ? ' · ' + r.meta : '') + ' — adds every brand in this file to the merge') + '">' + (on ? '✓ ' : '+ Add ') + esc(LIB.info(k).label) + (on ? ' added' : '') +
        '<small>' + esc((/rows/.test(rows) ? rows + ' · ' : '') + 'built ' + LIB.when(r) + ' (' + LIB.ago(r) + ')' + (stale ? ' — check it is the latest' : '')) + '</small></button>';
    }).join('');
  }
  function drawLibSup() {
    var html = libSupButtonsHtml();
    document.querySelectorAll('[data-lib-sup-host]').forEach(function (h) { h.innerHTML = html; h.hidden = !html; });
    document.querySelectorAll('[data-lib-add]').forEach(function (b) { b.onclick = function () { libSupAdd(b.dataset.libAdd); }; });
  }
  function libSupAdd(kind) {
    if (!LIB || state.busy) return Promise.resolve(false);
    var label = LIB.info(kind).label;
    setGlobal('Adding the ' + label + ' from the Library…', 'running');
    return LIB.get(kind).then(function (rec) {
      if (!rec || !rec.blob) throw new Error('it is no longer in the Library.');
      var file = LIB.toFile(rec);
      return readWorkbook(file).then(function (sheets) {
        var best = mapForInput('sup', sheets), entry = fileEntry(file, best.tab, best.mapped);
        entry.libKind = kind; entry.libSavedAt = rec.savedAt; entry.libWhen = LIB.when(rec);
        addToInput('sup', entry);
        renderAll(); if (state.activeInput === 'sup') showInput('sup');
        setGlobal(label + ' added from the Library — ' + fmtN(entry.data.length) + ' rows. ' + readinessText(), requiredReady() ? 'ready' : 'missing');
        return true;
      });
    }).catch(function (e) { setGlobal('The ' + label + ' could not be added: ' + e.message, 'error'); return false; });
  }

  function supSheetHtml() {
    return '<div class="sup-sheet" id="supSheet" tabindex="0" aria-label="IN_SUPPLIER_/_PRODUCT_UPDATES sheet">' +
      '<div class="sup-head"><div><h3>IN_SUPPLIER_/_PRODUCT_UPDATES</h3><p>The Supplier Updates tab as the Google Sheet shows it. Click a cell and type to change it · Ctrl+V (⌘V) pastes from the selected cell · click an INDEX number to select rows · Ctrl+Z undoes.</p></div><span class="result-badge" id="supCount">0 ROWS</span></div>' +
      '<div class="sup-bar" id="supBar"></div>' +
      '<div class="sup-scope"><div class="sup-scope-brands" id="supScope"></div><div class="sup-scope-lib" data-lib-sup-host hidden></div></div>' +
      '<div class="sup-tools"><input type="search" id="supSearch" placeholder="Search barcode, brand, Sub ID, product or status…" aria-label="Search supplier rows">' +
      '<button type="button" class="btn small primary" id="supPasteBtn" title="Paste the clipboard at the selected cell (or add the rows at the end when no cell is selected)">Paste</button>' +
      '<button type="button" class="btn small" id="supAddRow" title="Add an empty row at the end and start typing in it">Add row</button>' +
      '<button type="button" class="btn small" id="supDelRows" title="Delete the selected rows (click an INDEX number, Shift+click another to select several)">Delete rows</button>' +
      '<button type="button" class="btn small" id="supUndo" title="Undo the last change (Ctrl+Z)">Undo</button>' +
      '<button type="button" class="btn small" id="supClearAdded" title="Remove every row typed or pasted here (dropped supplier files stay)">Clear added rows</button>' +
      '<button type="button" class="btn small" id="supCopyHeads" title="Copy the 16 headings, ready to paste into Excel or Google Sheets as a template">Copy headings</button></div>' +
      '<div class="status sup-note" id="supNote" hidden></div>' +
      '<div class="sup-table-wrap" id="supWrap"><table class="sup-table"><thead><tr>' + SUP_HEADS.map(function (h, i) { return '<th class="sup-c' + i + (i === 0 || i === 15 ? ' sup-ro' : '') + '"><span class="sup-col">' + window.XlsxLite.colLetter(i + 1) + '</span>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody id="supBody"></tbody></table></div>' +
      '<div class="review-pager sup-foot"><span class="sup-sel-info" id="supSelInfo"></span><span id="supPage"></span></div></div>';
  }
  function drawSup() {
    var host = $('#supSheet'); if (!host) return;
    var model = supModel(), q = supView.q.trim().toUpperCase();
    var vis = q ? model.items.filter(function (it) { var s = ''; for (var c = 0; c < 16; c++) s += supShown(it, c) + ' '; return s.toUpperCase().indexOf(q) >= 0; }) : model.items;
    supView.vis = vis;
    var t = supTotals(vis);
    var stat = model.run ? (model.summary || 'Stage 1 finished — no summary returned') : (model.items.length ? 'STATUS is set when stage 1 runs (Highlight New Products + Best Buy)' : 'No supplier rows yet — drop supplier files above, or click B3 and paste rows here');
    var bc = function (label, val, cls, tip) { return '<div class="sup-bar-cell' + (cls ? ' ' + cls : '') + '"' + (tip ? ' title="' + esc(tip) + '"' : '') + '><span>' + label + '</span><strong>' + val + '</strong></div>'; };
    $('#supBar').innerHTML =
      '<div class="sup-bar-group">' + bc('TOTAL', fmtN(t.total)) + bc('⭐ MATCHED', fmtN(t.matched), 'is-match') + bc('🟢 NEW', fmtN(t.newp), 'is-new') + bc('🚫 NOT USED', fmtN(t.notUsed), 'is-muted') + bc('⚠️ UNMATCHABLE', fmtN(t.unm), 'is-warn') + '</div>' +
      '<div class="sup-bar-group">' + bc('SUPPLIER NAMES', fmtN(t.names)) + bc('TOTAL POS SUPPLIERS', fmtN(t.suppliers)) + bc('UNIQUE BARCODES', fmtN(t.barcodes), '', 'Column D (SUP BARCODE). In the Google Sheet this cell may be labelled UNIQUE BRANDS from an older layout — it counts barcodes.') + bc('UNIQUE BRANDS', fmtN(t.brands)) + bc('TOTAL WS', money(t.ws)) + bc('TOTAL RRP', money(t.rrp)) + '</div>' +
      '<div class="sup-bar-status' + (model.run ? ' is-run' : '') + '"><span>STATUS</span>' + esc(stat) + (q ? ' <em>· totals are for the ' + fmtN(vis.length) + ' rows matching the search</em>' : '') + '</div>';
    $('#supScope').innerHTML = supScopeHtml(model);
    drawLibSup();
    drawSupRows();
    var added = addedEntry(false), an = added ? added.data.length : 0;
    var badge = $('#supCount'); badge.textContent = (q ? fmtN(vis.length) + ' OF ' : '') + fmtN(model.items.length) + ' ROWS' + (an ? ' · ' + fmtN(an) + ' ADDED' : ''); badge.className = 'result-badge' + (model.items.length ? ' ok' : '');
    $('#supPage').textContent = q ? fmtN(vis.length) + ' of ' + fmtN(model.items.length) + ' rows match the search' : 'All ' + fmtN(model.items.length) + ' row' + (model.items.length === 1 ? '' : 's') + ' · scroll the sheet to see every row';
    $('#supUndo').disabled = !supView.undo.length || state.busy;
    $('#supClearAdded').disabled = !an || state.busy;
    ['#supPasteBtn', '#supAddRow'].forEach(function (s) { $(s).disabled = state.busy; });
    supSay(supView.note, supView.noteType);
    paintSel();
  }

  // ---- rows: the window of rows around the scroll position (r = position in the search-filtered list; the empty row
  // under the last row is r = vis.length). Banding comes from the row number, so it never flickers while scrolling.
  function supTotalRows() { return supView.vis.length + (supView.q.trim() ? 0 : 1); }
  function supHeadH() { var th = document.querySelector('#supWrap thead'); return th ? th.offsetHeight : 40; }
  function supWindow() {
    var wrap = $('#supWrap'), rh = supView.rowH || 27, total = supTotalRows();
    var top = wrap ? Math.max(0, wrap.scrollTop - supHeadH()) : 0, h = wrap && wrap.clientHeight ? wrap.clientHeight : 640;
    var first = Math.floor(top / rh), last = first + Math.ceil(h / rh);
    return { first: first, last: last, start: Math.max(0, Math.min(first, total) - SUP_BUF), end: Math.min(total, last + SUP_BUF) };
  }
  function supRowHtml(r) {
    var vis = supView.vis, it = vis[r], band = ' sup-b' + (r % 2);
    if (!it) {
      var blank = '';
      for (var c2 = 0; c2 < 16; c2++) blank += '<td class="sup-c' + c2 + (c2 === 0 || c2 === 15 ? ' sup-ro' : '') + '" data-r="' + r + '" data-c="' + c2 + '">' + (c2 === 0 ? '<span class="sup-new-mark">' + (r + 1) + '</span>' : '') + '</td>';
      return '<tr class="sup-new-row">' + blank + '</tr>';
    }
    var ed = it.ref.row.__ed || {}, added = !!it.ref.e.added, cells = '';
    for (var c = 0; c < 16; c++) {
      var s = supShown(it, c);
      var cls = 'sup-c' + c + (c === 0 || c === 15 ? ' sup-ro' : '') + (c === 15 ? ' sup-status ' + supStatusClass(s) : '') + (ed[c] ? ' is-edited' : '');
      cells += '<td class="' + cls + '" data-r="' + r + '" data-c="' + c + '"' + ((c === 6 || c === 15) && s ? ' title="' + esc(s) + '"' : '') + '>' + (c === 0 && added ? '<span class="sup-added-tag" title="Added on this page">+</span>' : '') + esc(s) + '</td>';
    }
    return '<tr class="' + (added ? 'is-added' : '') + band + '">' + cells + '</tr>';
  }
  function supGap(px) { return px > 0 ? '<tr class="sup-gap" aria-hidden="true"><td colspan="16" style="height:' + Math.round(px) + 'px"></td></tr>' : ''; }
  function drawSupRows() {
    var body = $('#supBody'); if (!body) return;
    var vis = supView.vis, q = supView.q.trim(), total = supTotalRows(), rh = supView.rowH || 27;
    var w = supWindow(), html = [supGap(w.start * rh)];
    for (var r = w.start; r < w.end; r++) html.push(supRowHtml(r));
    html.push(supGap((total - w.end) * rh));
    if (!vis.length && q) html = ['<tr><td colspan="16" class="sup-empty">No rows match the search.</td></tr>'];
    body.innerHTML = html.join('');
    supView.win = { start: w.start, end: w.end };
    // Keep the gap rows true to the real row height (it depends on the browser's font size).
    var first = body.querySelector('tr.sup-b0, tr.sup-b1');
    if (first) { var h = first.getBoundingClientRect().height; if (h > 10 && Math.abs(h - rh) > 0.5) { supView.rowH = h; if (!supView._remeasured) { supView._remeasured = true; drawSupRows(); return; } } }
    supView._remeasured = false;
    paintSel();
  }
  function supOnScroll() {
    if (supView.raf) return;
    supView.raf = requestAnimationFrame(function () {
      supView.raf = 0;
      if (supView.editing) return;                    // keep the cell being typed in where it is
      var w = supWindow();
      if (w.first < supView.win.start || Math.min(w.last, supTotalRows()) > supView.win.end) drawSupRows();
    });
  }
  // Scroll the sheet so row r is in view (drawing it if it is outside the drawn window).
  function supShowRow(r) {
    var wrap = $('#supWrap'); if (!wrap) return;
    var rh = supView.rowH || 27, head = supHeadH(), top = head + r * rh;
    if (top - head < wrap.scrollTop) wrap.scrollTop = Math.max(0, top - head);
    else if (top + rh > wrap.scrollTop + wrap.clientHeight) wrap.scrollTop = top + rh - wrap.clientHeight;
    if (r < supView.win.start || r >= supView.win.end) drawSupRows();
  }

  // ---- selection (anchor r,c → r2,c2; r = position in the search-filtered list)
  function selBox() { var s = supView.sel; return s ? { r1: Math.min(s.r, s.r2), r2: Math.max(s.r, s.r2), c1: Math.min(s.c, s.c2), c2: Math.max(s.c, s.c2) } : null; }
  function paintSel() {
    var body = $('#supBody'); if (!body) return;
    var b = selBox(), s = supView.sel;
    body.querySelectorAll('td.is-sel,td.is-anchor').forEach(function (td) { td.classList.remove('is-sel', 'is-anchor'); });
    var info = $('#supSelInfo');
    if (!b) { if (info) info.textContent = ''; $('#supDelRows').disabled = true; return; }
    body.querySelectorAll('td[data-r]').forEach(function (td) {
      var r = +td.dataset.r, c = +td.dataset.c;
      if (r >= b.r1 && r <= b.r2 && c >= b.c1 && c <= b.c2) td.classList.add('is-sel');
      if (r === s.r2 && c === s.c2) td.classList.add('is-anchor');
    });
    var rowsSel = Math.min(b.r2, supView.vis.length - 1) - b.r1 + 1;
    $('#supDelRows').disabled = state.busy || rowsSel < 1 || b.r1 >= supView.vis.length;
    if (info) info.textContent = window.XlsxLite.colLetter(b.c1 + 1) + (b.r1 + 3) + (b.r2 !== b.r1 || b.c2 !== b.c1 ? ':' + window.XlsxLite.colLetter(b.c2 + 1) + (b.r2 + 3) : '') + (rowsSel > 1 ? ' · ' + fmtN(rowsSel) + ' rows' : '');
  }
  function supCellEl(r, c) { return document.querySelector('#supBody td[data-r="' + r + '"][data-c="' + c + '"]'); }
  function supGoTo(r, c, extend) {
    var max = supView.vis.length;               // the empty row under the last row is max
    r = Math.max(0, Math.min(r, max)); c = Math.max(0, Math.min(15, c));
    if (extend && supView.sel) { supView.sel.r2 = r; supView.sel.c2 = c; }
    else supView.sel = { r: r, c: c, r2: r, c2: c };
    supShowRow(r);
    paintSel();
    var el = supCellEl(r, c); if (el) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  // ---- editing one cell
  function startEdit(initial) {
    var s = supView.sel; if (!s || state.busy) return;
    var r = s.r2, c = s.c2;
    if (c === 0 || c === 15) { supSay(c === 0 ? 'INDEX is numbered automatically.' : 'STATUS is written by the merge (stage 1).', 'info'); return; }
    var td = supCellEl(r, c); if (!td) return;
    var it = supView.vis[r], cur = it ? (it.ref.row[c] == null ? '' : String(it.ref.row[c])) : '';
    var inp = document.createElement('input');
    inp.type = 'text'; inp.className = 'sup-edit'; inp.value = initial !== undefined ? initial : cur;
    td.classList.add('is-editing'); td.appendChild(inp);
    supView.editing = { r: r, c: c, input: inp, typed: initial !== undefined };
    inp.focus(); if (initial === undefined) inp.select(); else inp.setSelectionRange(inp.value.length, inp.value.length);
    inp.addEventListener('keydown', function (e) {
      var ed = supView.editing; if (!ed) return;
      if (e.key === 'Enter') { e.preventDefault(); commitEdit(); supGoTo(ed.r + (e.shiftKey ? -1 : 1), ed.c); $('#supSheet').focus(); }
      else if (e.key === 'Tab') { e.preventDefault(); commitEdit(); supGoTo(ed.r, ed.c + (e.shiftKey ? -1 : 1)); $('#supSheet').focus(); }
      else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); $('#supSheet').focus(); }
      else if (ed.typed && /^Arrow/.test(e.key)) { e.preventDefault(); commitEdit(); var d = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key]; supGoTo(ed.r + d[0], ed.c + d[1]); $('#supSheet').focus(); }
      e.stopPropagation();
    });
    inp.addEventListener('paste', function (e) {
      var txt = e.clipboardData && e.clipboardData.getData('text/plain');
      if (txt && /[\t\n]/.test(txt.replace(/\r?\n$/, ''))) { e.preventDefault(); e.stopPropagation(); cancelEdit(); pasteToSupplier(txt); }
    });
    inp.addEventListener('blur', function () { if (supView.editing && supView.editing.input === inp) commitEdit(); });
  }
  function cancelEdit() {
    var ed = supView.editing; if (!ed) return;
    supView.editing = null;
    if (ed.input.parentNode) { ed.input.parentNode.classList.remove('is-editing'); ed.input.parentNode.removeChild(ed.input); }
  }
  function commitEdit() {
    var ed = supView.editing; if (!ed) return;
    var val = ed.input.value;
    cancelEdit();
    var it = supView.vis[ed.r];
    if (!it && String(val).trim() === '') return;
    supMutate(function () {
      var row = it ? it.ref.row : null;
      if (!row) { row = blankSupRow(); addedEntry(true).data.push(row); }
      var changed = setSupCell(row, ed.c, val);
      if (!changed && it) return null;
      return { msg: it ? 'Changed ' + window.XlsxLite.colLetter(ed.c + 1) + (ed.r + 3) + ' (' + SUP_HEADS[ed.c] + ').' : 'Row ' + (ed.r + 3) + ' added.', type: 'success' };
    });
  }
  function clearSelectedCells() {
    var b = selBox(); if (!b) return;
    supMutate(function () {
      var n = 0;
      for (var r = b.r1; r <= b.r2; r++) { var it = supView.vis[r]; if (!it) continue; for (var c = Math.max(1, b.c1); c <= Math.min(14, b.c2); c++) if (setSupCell(it.ref.row, c, '')) n++; }
      return n ? { msg: fmtN(n) + ' cell' + (n === 1 ? '' : 's') + ' cleared.', type: 'success' } : null;
    });
  }
  function deleteSelectedRows() {
    var b = selBox(); if (!b) return;
    var targets = [];
    for (var r = b.r1; r <= b.r2; r++) if (supView.vis[r]) targets.push(supView.vis[r].ref);
    if (!targets.length) return;
    supMutate(function () {
      targets.forEach(function (ref) { var i = ref.e.data.indexOf(ref.row); if (i >= 0) ref.e.data.splice(i, 1); });
      return { msg: fmtN(targets.length) + ' row' + (targets.length === 1 ? '' : 's') + ' deleted.', type: 'success' };
    });
    supView.sel = null; paintSel();
  }
  function supUndo() {
    if (state.busy || !supView.undo.length) return;
    cancelEdit();
    supRestore(supView.undo.pop());
    supCommit('Undone.', 'info');
  }
  function supCopy() {
    var b = selBox(); if (!b) return '';
    var lines = [];
    for (var r = b.r1; r <= Math.min(b.r2, supView.vis.length - 1); r++) { var row = []; for (var c = b.c1; c <= b.c2; c++) row.push(supShown(supView.vis[r], c).replace(/[\t\n]/g, ' ')); lines.push(row.join('\t')); }
    return lines.join('\n');
  }

  function wireSupSheet() {
    var host = $('#supSheet'); if (!host) return;
    var t; $('#supSearch').value = supView.q;
    $('#supSearch').oninput = function () { clearTimeout(t); t = setTimeout(function () { supView.q = $('#supSearch').value; supView.sel = null; $('#supWrap').scrollTop = 0; drawSup(); }, 200); };
    $('#supWrap').addEventListener('scroll', supOnScroll, { passive: true });
    $('#supUndo').onclick = supUndo;
    $('#supDelRows').onclick = deleteSelectedRows;
    $('#supAddRow').onclick = function () { supView.q = ''; $('#supSearch').value = ''; drawSup(); supGoTo(supView.vis.length, 1); host.focus(); startEdit(''); };
    $('#supClearAdded').onclick = function () {
      var e = addedEntry(false); if (!e) return;
      var n = e.data.length;
      supMutate(function () { e.data = []; return { msg: fmtN(n) + ' added row' + (n === 1 ? '' : 's') + ' removed.', type: 'info' }; });
    };
    $('#supCopyHeads').onclick = function () {
      var txt = SUP_HEADS.join('\t');
      var done = function () { supSay('The 16 headings are on the clipboard — paste them into row 1 of a sheet, add the rows, then copy everything and paste it here.', 'success'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { supSay('The browser blocked the clipboard. Headings: ' + SUP_HEADS.join(' · '), 'warn'); });
      else supSay('Headings: ' + SUP_HEADS.join(' · '), 'info');
    };
    $('#supPasteBtn').onclick = function () {
      if (!navigator.clipboard || !navigator.clipboard.readText) { host.focus(); supSay('This browser does not let pages read the clipboard from a button — click a cell and press Ctrl+V (⌘V on Mac).', 'warn'); return; }
      navigator.clipboard.readText().then(pasteToSupplier, function () { host.focus(); supSay('The browser blocked reading the clipboard — click a cell and press Ctrl+V (⌘V on Mac).', 'warn'); });
    };
    var body = $('#supBody'), dragging = false;
    body.addEventListener('mousedown', function (e) {
      var td = e.target.closest('td[data-r]'); if (!td || e.target.classList.contains('sup-edit')) return;
      if (supView.editing) commitEdit();
      var r = +td.dataset.r, c = +td.dataset.c;
      if (c === 0) {                                    // INDEX click = select whole rows
        if (e.shiftKey && supView.sel) { supView.sel.r2 = r; supView.sel.c = 1; supView.sel.c2 = 14; }
        else supView.sel = { r: r, c: 1, r2: r, c2: 14 };
        paintSel();
      } else supGoTo(r, c, e.shiftKey);
      dragging = c !== 0 ? true : 'rows';
      host.focus({ preventScroll: true });
      e.preventDefault();
    });
    body.addEventListener('mouseover', function (e) {
      if (!dragging || !supView.sel) return;
      var td = e.target.closest('td[data-r]'); if (!td) return;
      supView.sel.r2 = +td.dataset.r; if (dragging !== 'rows') supView.sel.c2 = +td.dataset.c;
      paintSel();
    });
    document.addEventListener('mouseup', function () { dragging = false; });
    body.addEventListener('dblclick', function (e) { var td = e.target.closest('td[data-r]'); if (!td) return; supGoTo(+td.dataset.r, +td.dataset.c); startEdit(); });
    host.addEventListener('keydown', function (e) {
      var tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'BUTTON' || tg.tagName === 'SELECT')) return;
      var s = supView.sel, mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); supUndo(); return; }
      if (!s) return;
      var moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
      if (moves[e.key]) { e.preventDefault(); supGoTo(s.r2 + moves[e.key][0], s.c2 + moves[e.key][1], e.shiftKey); return; }
      if (e.key === 'Tab') { e.preventDefault(); supGoTo(s.r2, s.c2 + (e.shiftKey ? -1 : 1)); return; }
      if (e.key === 'Enter' || e.key === 'F2') { e.preventDefault(); startEdit(); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); clearSelectedCells(); return; }
      if (e.key === 'Escape') { supView.sel = null; paintSel(); return; }
      if (!mod && !e.altKey && e.key.length === 1) { e.preventDefault(); startEdit(e.key); }
    });
    host.addEventListener('copy', function (e) {
      var tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA')) return;
      var txt = supCopy(); if (!txt) return;
      e.clipboardData.setData('text/plain', txt); e.preventDefault();
      supSay('Copied ' + ($('#supSelInfo').textContent || 'the selection') + '.', 'info');
    });
    host.addEventListener('paste', function (e) {
      var tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA')) return;
      var txt = e.clipboardData && e.clipboardData.getData('text/plain'); if (!txt) return;
      e.preventDefault(); e.stopPropagation(); pasteToSupplier(txt);
    });
    drawSup();
  }
  function refreshSupSheet() { if ($('#supSheet')) drawSup(); }

  // ------------------------------------------------- Staff Hub Library (v1.3.0)
  function libNote(id, f) {
    if (!f.libSavedAt || !LIB) return '';
    var rec = { savedAt: f.libSavedAt }, stale = !LIB_SHARED[id] && LIB.isStale(rec);
    return '<em class="lib-from' + (stale ? ' stale' : '') + '">' + (LIB_SHARED[id] ? 'Saved in the Library ' : 'From the Library · built ') + esc(LIB.when(rec)) + ' (' + esc(LIB.ago(rec)) + ')' + (stale ? ' — over a day old: check it is the latest build' : '') + '</em>';
  }
  // Inputs removed from this page: a Library file is not loaded here again until a newer copy is saved; the shared
  // Ongoing Discounts file is one saved copy for every tool, so removing it deletes it from the Library.
  function libForget(id, files) {
    if (!LIB) return;
    (files || []).forEach(function (f) {
      if (!f || !f.libKind) return;
      if (LIB_SHARED[id]) LIB.remove(f.libKind).catch(function () {});
      else LIB.dismiss(LIB_TOOL, { kind: f.libKind, savedAt: f.libSavedAt });
    });
  }
  function libLoad() {
    if (!LIB) return Promise.resolve([]);
    var got = [];
    return LIB_LOAD.reduce(function (p, j) {
      return p.then(function () {
        return LIB.get(j.kind).then(function (rec) {
          if (!rec || !rec.blob) return;
          var cur = state.inputs[j.id], files = (cur && cur.files) || [];
          if (LIB_SHARED[j.id]) { if (files.length && files[0].libSavedAt === rec.savedAt) return; }
          else {
            if (LIB.isDismissed(LIB_TOOL, rec)) return;
            if (j.id === 'pos' && files.length) return;                                  // a file dropped here wins
            if (files.some(function (f) { return f.libKind === j.kind || f.name === rec.name; })) return;
          }
          var file = LIB.toFile(rec);
          return readWorkbook(file).then(function (sheets) {
            var best = mapForInput(j.id, sheets), entry = fileEntry(file, best.tab, best.mapped);
            entry.libKind = j.kind; entry.libSavedAt = rec.savedAt; entry.libWhen = LIB.when(rec);
            if (LIB_SHARED[j.id] && state.inputs[j.id]) state.inputs[j.id].files = [];
            addToInput(j.id, entry);
            got.push(LIB.info(j.kind).label + ' (' + LIB.when(rec) + ')');
          });
        }).catch(function (e) { console.warn('Library load failed', j.kind, e); });
      });
    }, Promise.resolve()).then(function () { return got; });
  }

  // ----------------------------------------------------------------- boot
  function renderAll() { renderInputNav(); renderInputSummary(); updateRunButtons(); renderTabs(); if (wb.active !== 'sup' && wb.active !== 'out') wbShow(wb.active, true); }
  function boot() {
    renderStages(); renderOutputs(); wireBulkDrop(); wireReview();
    $('#supPanel').innerHTML = supSheetHtml(); wireSupSheet();
    renderTabs(); wbShow('sup', true);
    $('#runAllBtn').onclick = function () { runTo('export'); };
    $('#clearAllBtn').onclick = function () { if (state.busy) return; invalidateResults('Results cleared.'); startEngine().then(updateRunButtons); setGlobal('Results cleared. Input files are kept.', 'info'); };
    $('#railClearSession').onclick = function () {
      removeInputs(M.INPUTS.filter(function (d) { return !d.stored; }).map(function (d) { return d.id; }), 'POS database and supplier rows removed (including rows added in the sheet). Saved reference data is kept.');
    };
    $('#railClearReference').onclick = function () {
      removeInputs(M.INPUTS.filter(function (d) { return d.stored; }).map(function (d) { return d.id; }), 'Saved reference data removed from this browser.');
    };
    renderAll();
    refLoadAll().then(function () { renderAll(); return libLoad(); }).then(function (got) {
      renderAll();
      var saved = M.INPUTS.filter(function (d) { return d.stored && loaded(d.id); }).length;
      setGlobal((got && got.length ? 'From the Library: ' + got.join(' · ') + '. ' : '') + (saved ? saved + ' saved reference table' + (saved === 1 ? '' : 's') + ' loaded from this browser. ' : '') + readinessText(), requiredReady() ? 'ready' : 'missing');
      if (state.activeInput) showInput(state.activeInput);
    });
    libSupRefresh();
    if (LIB) LIB.onChange(function (msg) {
      if (msg.action === 'clear' || LIB_SUP.indexOf(msg.kind) >= 0) { libSupRefresh(); return; }
      var use = LIB_LOAD.filter(function (j) { return j.kind === msg.kind; })[0];
      if (msg.action === 'put' && use && !LIB_SHARED[use.id]) setGlobal('A newer ' + LIB.info(msg.kind).label + ' was saved to the Library (' + LIB.when(msg.record) + '). Reload this page to use it, or keep working with the files loaded now.', 'info');
    });
    startEngine().then(function () { updateRunButtons(); }).catch(function (e) { setGlobal('The merge engine could not start: ' + e.message, 'error'); });
  }
  // v1.5.0: when this tool has a password (assets/js/phf-lock-config.js), nothing starts until it is typed.
  function start() {
    var L = window.PHFLock;
    if (!L) { boot(); return; }
    L.guard(LIB_TOOL, { label: 'POS Supplier New Product Check and Clean Merge', ctl: $('#phfLockCtl') }).then(boot);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
