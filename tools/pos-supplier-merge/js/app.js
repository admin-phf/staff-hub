/* PHF Staff Hub — POS Supplier Merge v1.1.0 (10 Oct 2026)
 * Page controller: input rail + drag and drop, saved reference data, the
 * engine (Web Worker running the unchanged Apps Script v6.3.88 files), the
 * three merge stages, downloads and the OUT_MERGED_DATA review table.
 * v1.1.0: Supplier Updates sheet on the page (totals bar, 16 headings, paste rows).
 * v1.2.0: the sheet is editable (cells, paste at a cell, add / delete rows, undo), full width under the stages and
 *         always shown; every input in the rail has its own ✕ to remove it.
 */
(function () {
  'use strict';

  var TOOL_VERSION = 'v1.2.0';
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
    storage: 'indexeddb'
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
      frame.hidden = true; frame.title = 'POS Supplier Merge engine';
      frame.src = './engine-frame.html?v=1.0.0';
      window.addEventListener('message', frameListener);
      document.body.appendChild(frame);
    }
    try {
      worker = new Worker('./js/engine-worker.js?v=1.0.0');
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
      addToInput(id, fileEntry(file, best.tab, best.mapped));
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
  function railState(def) {
    var f = loaded(def.id);
    if (f) return { cls: 'loaded', dot: '✓', text: def.stored ? 'SAVED' : 'LOADED' };
    if (def.required) return { cls: 'missing required', dot: '!', text: 'REQUIRED' };
    if (def.recommended) return { cls: 'missing recommended', dot: '!', text: 'RECOMMENDED' };
    return { cls: 'missing', dot: '○', text: 'OPTIONAL' };
  }
  function railSub(def) {
    var x = state.inputs[def.id];
    if (!x || !x.files.length) return def.required ? 'Required · drop here' : def.recommended ? 'Recommended · drop here' : 'Optional · drop here';
    var rows = x.files.reduce(function (a, f) { return a + f.data.length; }, 0);
    return (x.files.length > 1 ? x.files.length + ' files · ' : x.files[0].name + ' · ') + fmtN(rows) + ' rows';
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
    gone.forEach(function (id) { delete state.inputs[id]; if (inputDef(id).stored) refDelete(id); });
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
  function scrollToSupSheet() { var el = $('#supPanel'); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  function showInput(id, problem) {
    var def = inputDef(id); if (!def) return;
    state.activeInput = id;
    var x = state.inputs[id], has = loaded(id), s = railState(def);
    var badgeCls = has ? 'done' : def.required ? 'required' : 'wait';
    var files = has ? x.files.map(function (f, i) {
      var rep = f.report || {};
      return '<div class="file-row"><span><strong>' + esc(f.name) + '</strong>' + (f.tab ? ' · tab ' + esc(f.tab) : '') + ' · ' + fmtN(f.data.length) + ' rows · ' + (rep.found || 0) + ' / ' + (rep.total || 0) + ' columns' + (rep.missing && rep.missing.length ? ' <em class="miss-cols">not in file: ' + esc(rep.missing.join(', ')) + '</em>' : '') + '</span><button type="button" data-remove="' + i + '">Remove</button></div>';
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
      host.querySelector('.input-workspace-card').insertAdjacentHTML('beforeend', '<div class="sup-card-link"><button type="button" class="btn small" id="supJump">Open the IN_SUPPLIER sheet ↓</button><span>Edit, paste and check every supplier row in the sheet under the stages.</span></div>');
      host.querySelector('#supJump').onclick = scrollToSupSheet;
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
  }
  function invalidateResults(msg) {
    state.results = {};
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
      Object.keys(res.sheets || {}).forEach(function (n) { state.results[n] = res.sheets[n]; });
      if (step === 'export') state.results.files = res.files || [];
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
    return 'Complete — ' + (g ? String(g.msg || '').split('\n')[0] : '') + ' · ' + files.length + ' TXT file' + (files.length === 1 ? '' : 's') + ' ready.';
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
          s.steps.forEach(function (step) { steps = steps.then(function () { return runStep(step); }); });
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
    if (id === 'build') { renderReview(); return addWorkbookOutput(); }
    if (id === 'export') {
      (state.results.files || []).forEach(function (f, i) {
        var bin = atob(f.base64), bytes = new Uint8Array(bin.length);
        for (var k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
        addOutput('export', 'txt-' + i, f.filename, new Blob([bytes], { type: 'text/plain;charset=utf-8' }), fmtN(f.rowCount) + ' rows · ' + (f.label || 'POS file') + ' · tab-separated TXT for POSActive');
      });
      renderReviewKpis();
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
  function accentFor(sheet, head, v) {
    var s = String(v || '').toUpperCase(); if (!s) return null;
    if (sheet === SHEETS.OUT) {
      if (head === 'ROW STATUS') return /NEW/.test(s) ? COL.NEW : /DISCONTINUED/.test(s) ? COL.WARN : /REVIEW/.test(s) ? COL.REVIEW : /MATCHED/.test(s) ? COL.MATCH : null;
      if (head === 'PRICE STATUS') return /PENDING/.test(s) ? COL.WARN : /ACCEPTED/.test(s) ? COL.NEW : /REJECTED/.test(s) ? COL.UP : /INCREASE/.test(s) ? COL.UP : /DECREASE/.test(s) ? COL.DOWN : /NEW/.test(s) ? COL.NEW : /DISCONTINUED/.test(s) ? COL.WARN : /REVIEW/.test(s) ? COL.REVIEW : /NO CHANGE/.test(s) ? COL.FLAT : null;
      if (head === 'OLD BRAND' || head === 'BARCODE UPDATE' || head === 'RRP / MARKUP OVERRIDE') return COL.WARN;
      if (['BC', 'SUB ID', 'BRAND', 'WSP'].indexOf(head) >= 0) return s.charAt(0) === '☑' ? COL.NEW : s.charAt(0) === '☒' ? COL.UP : COL.FLAT;
    }
    if (head === 'STATUS' || head === 'SRC STATUS' || head === 'POS MATCH') return /NEW/.test(s) ? COL.NEW : /MATCH|APPLIED|USED BY|OK/.test(s) && !/NOT/.test(s) ? COL.MATCH : /NOT USED|UNUSED/.test(s) ? COL.FLAT : COL.WARN;
    return null;
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
    var X = window.XlsxLite, last = X.colLetter(width), n = Math.max(0, rows.length - 2);
    var summary = sheetSummary(name, rows) + ' · POS Supplier Merge ' + TOOL_VERSION + ' (engine ' + (String((state.engineInfo || {}).merge || '').match(/v\d+\.\d+\.\d+/) || [''])[0] + ') · ' + melb();
    return {
      name: name.replace(/[\\/?*\[\]:]/g, '_').replace(/_+/g, '_').slice(0, 31), columnCount: width, freeze: 'A3',
      autoFilter: 'A2:' + last + (n + 2), dimension: 'A1:' + last + (n + 2),
      widths: head.map(widthFor), defaultRowHeight: 15,
      rows: function* () {
        var t = new Array(width).fill(''); t[0] = summary;
        yield { cells: t, styles: styles.title, height: 22 };
        yield { cells: head, styles: styles.head, height: 30 };
        for (var r = 2; r < rows.length; r++) {
          var band = r % 2 === 0 ? 'ODD' : 'EVEN', src = rows[r], cells = new Array(width), sts = new Array(width);
          for (var c = 0; c < width; c++) {
            var tv = typed(src[c], head[c]);
            cells[c] = tv.v;
            var acc = accentFor(name, head[c], src[c]);
            sts[c] = styles.cell(band, tv.f || (TEXT_HEAD.test(head[c]) ? '@' : ''), acc);
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
      title: st.style({ font: { bold: true, color: COL.TITLE_FG, size: 10 }, fill: COL.TITLE_BG, align: { v: 'center' } }),
      head: st.style({ font: { bold: true, color: COL.HDR_FG, size: 9 }, fill: COL.HDR_BG, align: { h: 'center', v: 'center', wrap: true } }),
      cell: function (band, fmt, acc) {
        var key = band + '|' + fmt + '|' + (acc ? acc.join(',') : '');
        if (cache[key] !== undefined) return cache[key];
        var spec = { fill: (acc && acc[0]) || COL[band], font: { size: 9, color: (acc && acc[1]) || COL.INK, bold: !!(acc && acc[0]) }, align: { v: 'center' } };
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
  function hideReview() { var p = $('#reviewPanel'); if (p) p.hidden = true; }
  function renderReview() {
    var rows = state.results[SHEETS.OUT] || [];
    var head = rows[1] || [], idx = {};
    head.forEach(function (h, i) { if (idx[h] === undefined) idx[h] = i; });
    var data = rows.slice(2);
    state.review = { rows: data, head: head, idx: idx, filtered: data, page: 0, hay: data.map(function (r) { return r.join(' ').toUpperCase(); }) };
    var opts = function (h) { var set = {}; data.forEach(function (r) { var v = String(r[idx[h]] || '').trim(); if (v) set[v] = (set[v] || 0) + 1; }); return Object.keys(set).sort().map(function (v) { return '<option value="' + esc(v) + '">' + esc(cleanTitle(v) || v) + ' (' + fmtN(set[v]) + ')</option>'; }).join(''); };
    $('#reviewStatus').innerHTML = '<option value="">All row statuses</option>' + opts('ROW STATUS');
    $('#reviewPrice').innerHTML = '<option value="">All price statuses</option>' + opts('PRICE STATUS');
    $('#reviewBrand').innerHTML = '<option value="">All brands</option>' + opts('POS BRAND');
    $('#reviewSearch').value = '';
    $('#reviewTable thead').innerHTML = '<tr>' + REVIEW_COLS.filter(function (c) { return idx[c.h] !== undefined; }).map(function (c) { return '<th class="' + (c.cls || '') + (c.audit ? ' rv-audit-col' : '') + '">' + esc(c.label || c.h) + '</th>'; }).join('') + '</tr>';
    $('#reviewPanel').hidden = false;
    renderReviewKpis();
    applyReviewFilter();
  }
  function renderReviewKpis() {
    var rows = state.results[SHEETS.OUT] || []; if (!rows.length) return;
    var k = reviewCounts(rows), ins = state.results[SHEETS.INS], upd = state.results[SHEETS.UPD];
    var chips = [['Rows', rows.length - 2, ''], ['Matched', k.matched, 'match'], ['New', k.newp, 'new'], ['Review', k.review, 'review'], ['Discontinued', k.disc, 'warn'], ['Price up', k.up, 'up'], ['Price down', k.down, 'down'], ['Barcode updates', k.barcode, 'warn'], ['Brand changes', k.brand, 'warn']];
    if (ins) chips.push(['Insert rows', Math.max(0, ins.length - 2), 'new']);
    if (upd) chips.push(['Update rows', Math.max(0, upd.length - 2), 'match']);
    $('#reviewKpis').innerHTML = chips.map(function (c) { return '<div class="review-kpi ' + c[2] + '"><strong>' + fmtN(c[1]) + '</strong><span>' + esc(c[0]) + '</span></div>'; }).join('');
  }
  function applyReviewFilter() {
    var R = state.review, q = $('#reviewSearch').value.trim().toUpperCase(), st = $('#reviewStatus').value, pr = $('#reviewPrice').value, br = $('#reviewBrand').value;
    var si = R.idx['ROW STATUS'], pi = R.idx['PRICE STATUS'], bi = R.idx['POS BRAND'];
    R.filtered = [];
    for (var i = 0; i < R.rows.length; i++) {
      var r = R.rows[i];
      if (st && String(r[si]).trim() !== st) continue;
      if (pr && String(r[pi]).trim() !== pr) continue;
      if (br && String(r[bi]).trim() !== br) continue;
      if (q && R.hay[i].indexOf(q) < 0) continue;
      R.filtered.push(r);
    }
    R.page = 0;
    renderReviewPage();
  }
  function cellHtml(c, r, idx) {
    var v = r[idx[c.h]], s = String(v == null ? '' : v);
    if (c.chip) return s ? '<span class="rv-chip ' + chipClass(s) + '">' + esc(cleanTitle(s) || s) + '</span>' : '';
    if (c.audit) { var a = s.charAt(0); return '<span class="rv-audit ' + (a === '☑' ? 'ok' : a === '☒' ? 'bad' : 'unk') + '">' + esc(s) + '</span>'; }
    if (c.arrow) { var nv = String(r[idx[c.extra]] == null ? '' : r[idx[c.extra]]); if (!nv || nv === s) return esc(s); return esc(s || '—') + ' <span class="rv-arrow">→</span> <strong>' + esc(nv) + '</strong>'; }
    if (c.extra) { var ev = String(r[idx[c.extra]] == null ? '' : r[idx[c.extra]]); return esc(s) + (ev ? '<small class="rv-extra' + (c.extraLabel ? ' warn' : '') + '">' + (c.extraLabel ? esc(c.extraLabel) + ': ' : '') + esc(ev) + '</small>' : ''); }
    return esc(s).replace(/\n/g, '<br>');
  }
  function renderReviewPage() {
    var R = state.review, cols = REVIEW_COLS.filter(function (c) { return R.idx[c.h] !== undefined; });
    var pages = Math.max(1, Math.ceil(R.filtered.length / PAGE));
    R.page = Math.max(0, Math.min(R.page, pages - 1));
    var slice = R.filtered.slice(R.page * PAGE, (R.page + 1) * PAGE);
    $('#reviewTable tbody').innerHTML = slice.length ? slice.map(function (r) {
      return '<tr>' + cols.map(function (c) { var s = String(r[R.idx[c.h]] || ''); return '<td class="' + (c.cls || '') + (c.audit ? ' rv-audit-col' : '') + (c.cls && c.cls.indexOf('warnable') >= 0 && s ? ' warn-cell' : '') + '">' + cellHtml(c, r, R.idx) + '</td>'; }).join('') + '</tr>';
    }).join('') : '<tr><td colspan="' + cols.length + '" class="rv-empty">No rows match the current search / filters.</td></tr>';
    var badge = $('#reviewCount'); badge.textContent = fmtN(R.filtered.length) + ' OF ' + fmtN(R.rows.length) + ' ROWS'; badge.className = 'result-badge ok';
    $('#reviewPage').textContent = 'Page ' + (R.page + 1) + ' of ' + pages + ' · ' + PAGE + ' rows per page';
    $('#reviewPrev').disabled = R.page <= 0; $('#reviewNext').disabled = R.page >= pages - 1;
  }
  function wireReview() {
    var t; $('#reviewSearch').oninput = function () { clearTimeout(t); t = setTimeout(applyReviewFilter, 200); };
    ['#reviewStatus', '#reviewPrice', '#reviewBrand'].forEach(function (s) { $(s).onchange = applyReviewFilter; });
    $('#reviewReset').onclick = function () { $('#reviewSearch').value = ''; $('#reviewStatus').value = ''; $('#reviewPrice').value = ''; $('#reviewBrand').value = ''; applyReviewFilter(); };
    $('#reviewPrev').onclick = function () { state.review.page--; renderReviewPage(); };
    $('#reviewNext').onclick = function () { state.review.page++; renderReviewPage(); };
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
  var SUP_PAGE = 100, ADDED = 'Added rows', SUP_UNDO_MAX = 40;
  var supView = { q: '', page: 0, undo: [], note: '', noteType: 'info', sel: null, vis: [], editing: null };

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

  function supSheetHtml() {
    return '<div class="sup-sheet" id="supSheet" tabindex="0" aria-label="IN_SUPPLIER_/_PRODUCT_UPDATES sheet">' +
      '<div class="sup-head"><div><h3>IN_SUPPLIER_/_PRODUCT_UPDATES</h3><p>The Supplier Updates tab as the Google Sheet shows it. Click a cell and type to change it · Ctrl+V (⌘V) pastes from the selected cell · click an INDEX number to select rows · Ctrl+Z undoes.</p></div><span class="result-badge" id="supCount">0 ROWS</span></div>' +
      '<div class="sup-bar" id="supBar"></div>' +
      '<div class="sup-tools"><input type="search" id="supSearch" placeholder="Search barcode, brand, Sub ID, product or status…" aria-label="Search supplier rows">' +
      '<button type="button" class="btn small primary" id="supPasteBtn" title="Paste the clipboard at the selected cell (or add the rows at the end when no cell is selected)">Paste</button>' +
      '<button type="button" class="btn small" id="supAddRow" title="Add an empty row at the end and start typing in it">Add row</button>' +
      '<button type="button" class="btn small" id="supDelRows" title="Delete the selected rows (click an INDEX number, Shift+click another to select several)">Delete rows</button>' +
      '<button type="button" class="btn small" id="supUndo" title="Undo the last change (Ctrl+Z)">Undo</button>' +
      '<button type="button" class="btn small" id="supClearAdded" title="Remove every row typed or pasted here (dropped supplier files stay)">Clear added rows</button>' +
      '<button type="button" class="btn small" id="supCopyHeads" title="Copy the 16 headings, ready to paste into Excel or Google Sheets as a template">Copy headings</button></div>' +
      '<div class="status sup-note" id="supNote" hidden></div>' +
      '<div class="sup-table-wrap" id="supWrap"><table class="sup-table"><thead><tr>' + SUP_HEADS.map(function (h, i) { return '<th class="sup-c' + i + (i === 0 || i === 15 ? ' sup-ro' : '') + '"><span class="sup-col">' + window.XlsxLite.colLetter(i + 1) + '</span>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody id="supBody"></tbody></table></div>' +
      '<div class="review-pager"><span class="sup-sel-info" id="supSelInfo"></span><button type="button" class="btn small" id="supPrev">‹ Previous</button><span id="supPage">Page 1</span><button type="button" class="btn small" id="supNext">Next ›</button></div></div>';
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
    var pages = Math.max(1, Math.ceil((vis.length + (q ? 0 : 1)) / SUP_PAGE));
    supView.page = Math.max(0, Math.min(supView.page, pages - 1));
    var start = supView.page * SUP_PAGE, end = Math.min(vis.length, start + SUP_PAGE), html = [];
    for (var r = start; r < end; r++) {
      var it = vis[r], ed = it.ref.row.__ed || {}, added = !!it.ref.e.added;
      var cells = '';
      for (var c = 0; c < 16; c++) {
        var s = supShown(it, c);
        var cls = 'sup-c' + c + (c === 0 || c === 15 ? ' sup-ro' : '') + (c === 15 ? ' sup-status ' + supStatusClass(s) : '') + (ed[c] ? ' is-edited' : '');
        cells += '<td class="' + cls + '" data-r="' + r + '" data-c="' + c + '"' + ((c === 6 || c === 15) && s ? ' title="' + esc(s) + '"' : '') + '>' + (c === 0 && added ? '<span class="sup-added-tag" title="Added on this page">+</span>' : '') + esc(s) + '</td>';
      }
      html.push('<tr' + (added ? ' class="is-added"' : '') + '>' + cells + '</tr>');
    }
    // The empty row under the last row: type or paste into it to add rows (like the blank rows of a sheet).
    if (end === vis.length && !q) {
      var blank = '';
      for (var c2 = 0; c2 < 16; c2++) blank += '<td class="sup-c' + c2 + (c2 === 0 || c2 === 15 ? ' sup-ro' : '') + '" data-r="' + vis.length + '" data-c="' + c2 + '">' + (c2 === 0 ? '<span class="sup-new-mark">' + (vis.length + 1) + '</span>' : '') + '</td>';
      html.push('<tr class="sup-new-row">' + blank + '</tr>');
    }
    if (!vis.length && q) html.push('<tr><td colspan="16" class="sup-empty">No rows match the search.</td></tr>');
    $('#supBody').innerHTML = html.join('');
    var added = addedEntry(false), an = added ? added.data.length : 0;
    var badge = $('#supCount'); badge.textContent = (q ? fmtN(vis.length) + ' OF ' : '') + fmtN(model.items.length) + ' ROWS' + (an ? ' · ' + fmtN(an) + ' ADDED' : ''); badge.className = 'result-badge' + (model.items.length ? ' ok' : '');
    $('#supPage').textContent = 'Page ' + (supView.page + 1) + ' of ' + pages + ' · ' + SUP_PAGE + ' rows per page';
    $('#supPrev').disabled = supView.page <= 0; $('#supNext').disabled = supView.page >= pages - 1;
    $('#supUndo').disabled = !supView.undo.length || state.busy;
    $('#supClearAdded').disabled = !an || state.busy;
    ['#supPasteBtn', '#supAddRow'].forEach(function (s) { $(s).disabled = state.busy; });
    supSay(supView.note, supView.noteType);
    paintSel();
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
    var page = Math.floor(r / SUP_PAGE);
    if (page !== supView.page) { supView.page = page; drawSup(); } else paintSel();
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
    $('#supSearch').oninput = function () { clearTimeout(t); t = setTimeout(function () { supView.q = $('#supSearch').value; supView.page = 0; supView.sel = null; drawSup(); }, 200); };
    $('#supPrev').onclick = function () { supView.page--; drawSup(); };
    $('#supNext').onclick = function () { supView.page++; drawSup(); };
    $('#supUndo').onclick = supUndo;
    $('#supDelRows').onclick = deleteSelectedRows;
    $('#supAddRow').onclick = function () { supView.q = ''; $('#supSearch').value = ''; supView.page = 0; drawSup(); supGoTo(supView.vis.length, 1); host.focus(); startEdit(''); };
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

  // ----------------------------------------------------------------- boot
  function renderAll() { renderInputNav(); renderInputSummary(); updateRunButtons(); }
  function boot() {
    renderStages(); renderOutputs(); wireBulkDrop(); wireReview();
    $('#supPanel').innerHTML = supSheetHtml(); wireSupSheet();
    $('#runAllBtn').onclick = function () { runTo('export'); };
    $('#clearAllBtn').onclick = function () { if (state.busy) return; invalidateResults('Results cleared.'); startEngine().then(updateRunButtons); setGlobal('Results cleared. Input files are kept.', 'info'); };
    $('#railClearSession').onclick = function () {
      removeInputs(M.INPUTS.filter(function (d) { return !d.stored; }).map(function (d) { return d.id; }), 'POS database and supplier rows removed (including rows added in the sheet). Saved reference data is kept.');
    };
    $('#railClearReference').onclick = function () {
      removeInputs(M.INPUTS.filter(function (d) { return d.stored; }).map(function (d) { return d.id; }), 'Saved reference data removed from this browser.');
    };
    renderAll();
    refLoadAll().then(function () {
      renderAll();
      var saved = M.INPUTS.filter(function (d) { return d.stored && loaded(d.id); }).length;
      setGlobal((saved ? saved + ' saved reference table' + (saved === 1 ? '' : 's') + ' loaded from this browser. ' : '') + readinessText(), requiredReady() ? 'ready' : 'missing');
    });
    startEngine().then(function () { updateRunButtons(); }).catch(function (e) { setGlobal('The merge engine could not start: ' + e.message, 'error'); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
