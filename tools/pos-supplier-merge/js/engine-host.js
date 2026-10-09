/* PHF Staff Hub — POS Supplier Merge v1.0.0
 * engine-host.js — message handler around the unchanged Apps Script engine.
 * Runs inside the Web Worker (js/engine-worker.js) or, when workers are not
 * available (page opened from a file), inside engine-frame.html.
 *
 *   page → engine   { cmd:'load', id, sheets:{ name: rows[][] } }
 *                   { cmd:'run',  id, step:'highlight'|'build'|'generate'|'export' }
 *   engine → page   { type:'ready' | 'loaded' | 'progress' | 'result' | 'error', id, … }
 */
(function (G) {
  'use strict';

  var isWorker = typeof G.importScripts === 'function' && typeof G.document === 'undefined';
  function post(msg) {
    if (isWorker) G.postMessage(msg);
    else G.parent.postMessage(Object.assign({ __phfMergeEngine: true }, msg), '*');
  }

  var shim = null, currentId = null, alerts = [], dialogs = [], logs = [];
  function makeShim() {
    alerts = []; dialogs = []; logs = [];
    shim = G.PHFSheetsShim.create({
      onToast: function (title, msg) { post({ type: 'progress', id: currentId, title: title, msg: msg }); },
      onAlert: function (title, msg) { alerts.push({ title: title, msg: msg }); },
      onDialog: function (title) { dialogs.push({ title: title }); },
      onLog: function (m) { logs.push(m); if (logs.length > 300) logs.shift(); }
    });
    shim.install(G);
  }

  function versions() {
    return {
      setup: typeof G.SCRIPT_VERSION !== 'undefined' ? G.SCRIPT_VERSION : '',
      merge: (typeof G.M13 !== 'undefined' && G.M13 && G.M13.VERSION) ? G.M13.VERSION : '',
      worker: isWorker
    };
  }

  var STEP_FN = {
    highlight: 'runHighlightNewProductsBestBuy',
    build: 'buildOutMergedDataFromSupplierStatus',
    generate: 'generateInsertUpdateSheets',
    export: 'exportPosFiles'
  };

  function sheetsFor(step) {
    var SH = G.CFG.SH, out = {};
    var names = step === 'highlight' ? [SH.IN_SUP]
      : step === 'build' ? [SH.OUT_MERGED, SH.IN_SUP, SH.SRC_BRANDS, SH.SRC_PREFIX, SH.SRC_FR, SH.SRC_SUPP, SH.SRC_DISC]
      : step === 'generate' ? [SH.OUT_INSERT, SH.OUT_UPDATE]
      : [];
    names.forEach(function (n) { var d = shim.sheetDisplay(n); if (d) out[n] = d; });
    return out;
  }

  function handle(msg) {
    if (!msg || !msg.cmd) return;
    currentId = msg.id;
    var step = msg.step || '';
    try {
      if (msg.cmd === 'ping') { post({ type: 'ready', id: msg.id, versions: versions() }); return; }
      if (msg.cmd === 'load') {
        makeShim();
        Object.keys(msg.sheets || {}).forEach(function (name) { shim.addSheet(name, msg.sheets[name]); });
        post({ type: 'loaded', id: msg.id, versions: versions() });
        return;
      }
      if (msg.cmd === 'run') {
        if (!shim) throw new Error('No input files have been loaded into the engine yet.');
        var fnName = STEP_FN[step];
        if (!fnName || typeof G[fnName] !== 'function') throw new Error('Unknown step: ' + step);
        alerts = []; dialogs = [];
        var t0 = Date.now();
        var ret = G[fnName]();
        var files = [];
        if (step === 'export' && ret && ret.length) {
          files = ret.map(function (f) { return { label: f.label, filename: f.filename, rowCount: f.rowCount, base64: f.base64 }; });
        }
        post({ type: 'result', id: msg.id, step: step, ms: Date.now() - t0, alerts: alerts, dialogs: dialogs, logs: logs.slice(-40), sheets: sheetsFor(step), files: files });
        return;
      }
    } catch (e) {
      post({ type: 'error', id: msg.id, step: step, message: String(e && e.message ? e.message : e), stack: String(e && e.stack ? e.stack : ''), alerts: alerts, logs: logs.slice(-40) });
    }
  }

  if (isWorker) {
    G.onmessage = function (ev) { handle(ev.data); };
  } else {
    G.addEventListener('message', function (ev) { if (ev.data && ev.data.__phfMergeCmd) handle(ev.data); });
  }
  post({ type: 'ready', id: 0, versions: versions() });
})(typeof self !== 'undefined' ? self : this);
