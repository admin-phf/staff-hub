/* PHF Staff Hub — POS Supplier Merge v1.0.0 (10 Oct 2026)
 * Page controller: input rail + drag and drop, saved reference data, the
 * engine (Web Worker running the unchanged Apps Script v6.3.87 files), the
 * three merge stages, downloads and the OUT_MERGED_DATA review table.
 */
(function () {
  'use strict';

  var TOOL_VERSION = 'v1.0.0';
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
      var rec = { file: file, status: 'reading', assigned: [], msg: 'Reading…' };
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
        acceptFile(id, r.file).then(function (ok) { if (ok) { r.status = 'assigned'; r.msg = 'Assigned to ' + inputDef(id).title; } renderBulk(); });
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
        return '<button type="button" class="input-nav-item ' + s.cls + '" data-input="' + d.id + '" title="Click to open, or drop the ' + esc(d.title) + ' file here"><span class="input-dot">' + s.dot + '</span><span><strong>' + esc(d.title) + '</strong><small>' + esc(railSub(d)) + '</small></span><span class="input-state">' + s.text + '</span></button>';
      }).join('') + '</div>';
    }).join('');
    host.querySelectorAll('[data-input]').forEach(function (b) {
      var id = b.dataset.input;
      b.onclick = function () { showInput(id); };
      b.ondragover = b.ondragenter = function (e) { e.preventDefault(); e.stopPropagation(); b.classList.add('drag-target'); };
      b.ondragleave = function (e) { e.preventDefault(); e.stopPropagation(); b.classList.remove('drag-target'); };
      b.ondrop = function (e) {
        e.preventDefault(); e.stopPropagation(); b.classList.remove('drag-target');
        var files = e.dataTransfer && e.dataTransfer.files; if (!files || !files.length) return;
        var list = inputDef(id).multi ? Array.prototype.slice.call(files) : [files[0]];
        list.reduce(function (p, f) { return p.then(function () { return acceptFile(id, f); }); }, Promise.resolve());
      };
    });
    if (state.activeInput) { var a = host.querySelector('[data-input="' + state.activeInput + '"]'); if (a) a.classList.add('active'); }
  }
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
    renderOutputs(); hideReview();
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
    }).then(function () { state.busy = false; updateRunButtons(); });
  }
  function afterStage(id) {
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

  // ----------------------------------------------------------------- boot
  function renderAll() { renderInputNav(); renderInputSummary(); updateRunButtons(); }
  function boot() {
    renderStages(); renderOutputs(); wireBulkDrop(); wireReview();
    $('#runAllBtn').onclick = function () { runTo('export'); };
    $('#clearAllBtn').onclick = function () { if (state.busy) return; invalidateResults('Results cleared.'); startEngine().then(updateRunButtons); setGlobal('Results cleared. Input files are kept.', 'info'); };
    $('#railClearSession').onclick = function () {
      if (state.busy) return;
      ['pos', 'sup'].forEach(function (id) { delete state.inputs[id]; });
      state.rev++; state.bulk = []; renderBulk(); invalidateResults('Session files cleared.'); renderAll();
      setGlobal('POS database and supplier files removed. Saved reference data is kept.', 'info');
      if (state.activeInput) showInput(state.activeInput);
    };
    $('#railClearReference').onclick = function () {
      if (state.busy) return;
      if (!window.confirm('Remove every reference table saved in this browser?')) return;
      M.INPUTS.filter(function (d) { return d.stored; }).forEach(function (d) { delete state.inputs[d.id]; refDelete(d.id); });
      state.rev++; invalidateResults('Reference data cleared.'); renderAll();
      setGlobal('Saved reference data removed from this browser.', 'info');
      if (state.activeInput) showInput(state.activeInput);
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
