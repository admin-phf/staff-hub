/* PHF Staff Hub — Supplier Contacts v1.0.0 (12 Oct 2026)
 * One list of supplier and utility contacts: search every field, add / edit / delete, download (.xlsx / .csv).
 * The list lives in this browser's Staff Hub Library (assets/js/phf-library.js, kind "lib:contacts") — never in GitHub.
 * Drop the contacts file once on each computer; every change is saved in the browser straight away; Download shares it.
 *
 * File layout (read and written): header row with Supplier, Code / Product Group, Index, Account # / Notes,
 * Phone Numbers, Fax Number, Email, Accts Email, 100% GST, Min Order, Section (Supplier / Utility). The header can sit in
 * any of the first 15 rows and the columns can be in any order; *ContactName (Monday Orders) is read as Supplier.
 * A file without a Section column takes the rows after "Totally Workwear Moorabbin" as the utilities.
 * Other columns in a loaded file are kept (shown after Min Order) so nothing is lost.
 */
(function () {
  'use strict';

  var VERSION = 'v1.0.0', KIND = 'lib:contacts', TOOL = 'Supplier Contacts', SAVE_NAME = 'Supplier_Contacts.xlsx';
  var L = window.PHFLibrary || null;
  var FIELDS = [
    { key: 'Supplier', alias: ['supplier', 'contactname', 'contact', 'name', 'suppliername'], w: 215, xw: 34 },
    { key: 'Code / Product Group', alias: ['codeproductgroup', 'code', 'productgroup'], w: 110, xw: 16 },
    { key: 'Index', alias: ['index'], w: 62, xw: 8, centre: true },
    { key: 'Account # / Notes', alias: ['accountnotes', 'accountno', 'account', 'notes'], w: 210, xw: 34, multi: true },
    { key: 'Phone Numbers', alias: ['phonenumbers', 'phonenumber', 'phones', 'phone'], w: 205, xw: 30, multi: true },
    { key: 'Fax Number', alias: ['faxnumber', 'fax'], w: 105, xw: 15 },
    { key: 'Email', alias: ['email', 'emails', 'emailaddress'], w: 230, xw: 36, multi: true, mail: true },
    { key: 'Accts Email', alias: ['acctsemail', 'accountsemail', 'accountemail', 'accountsemails'], w: 210, xw: 32, multi: true, mail: true },
    { key: '100% GST', alias: ['100gst', 'gst'], w: 62, xw: 9, centre: true },
    { key: 'Min Order', alias: ['minorder', 'minimumorder'], w: 80, xw: 12, centre: true }
  ];
  var SECTION = { key: 'Section', alias: ['section', 'type', 'group'] };
  var LAST_SUPPLIER = 'totallyworkwearmoorabbin';
  var BANDS = { sup: ['E9F0F5', 'F5F5F5'], util: ['FDEADA', 'FCD5B4'] };

  var $ = function (s) { return document.querySelector(s); };
  var state = { heads: FIELDS.map(function (f) { return f.key; }), extras: [], rows: [], query: '', undo: [], saved: null, dirty: false, saving: false, nextId: 1, editing: null, rev: 0 };

  // ---------- helpers ----------
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, ''); }
  function clean(v) {
    if (v == null) return '';
    var s = String(v).replace(/\r\n?/g, '\n').replace(/ /g, ' ');
    return s.split('\n').map(function (l) { return l.replace(/\s+$/, ''); }).join('\n').replace(/^\s*\n+|\n+\s*$/g, '').trim();
  }
  function field(key) { for (var i = 0; i < FIELDS.length; i++) if (FIELDS[i].key === key) return FIELDS[i]; return { key: key, alias: [], w: 160, xw: 20, multi: true }; }
  function isUtil(v) { return /^util/i.test(String(v || '').trim()); }
  function melbParts() {
    var p = {};
    new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Melbourne', year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return p;
  }
  function stamp() { var p = melbParts(); return p.day + '.' + p.month + '.' + p.year + '_' + p.hour + p.minute; }
  function clone(rows) { return rows.map(function (r) { return { id: r.id, util: r.util, f: Object.assign({}, r.f) }; }); }
  function newRow(f, util) { var r = { id: state.nextId++, util: !!util, f: {} }; state.heads.forEach(function (h) { r.f[h] = clean(f[h]); }); return r; }
  function supCount() { var n = 0; state.rows.forEach(function (r) { if (!r.util) n++; }); return n; }
  function counts() { var s = supCount(); return { all: state.rows.length, sup: s, util: state.rows.length - s }; }
  function plural(n, w) { return n.toLocaleString() + ' ' + w + (n === 1 ? '' : 's'); }

  // ---------- search ----------
  function hay(r) {
    if (r._hay && r._hayFor === r._ver) return r._hay;
    var vals = state.heads.map(function (h) { return r.f[h] || ''; });
    var low = vals.join(' ¦ ').toLowerCase();
    var dig = vals.join('\n').split('\n').map(function (l) { return l.replace(/\D+/g, ''); }).filter(Boolean).join(' ');
    r._hay = { low: low, dig: dig }; r._hayFor = r._ver;
    return r._hay;
  }
  function tokens(q) { return String(q || '').toLowerCase().split(/\s+/).filter(Boolean); }
  function matches(r, toks) {
    if (!toks.length) return true;
    var h = hay(r);
    return toks.every(function (t) {
      if (h.low.indexOf(t) >= 0) return true;
      var d = t.replace(/[\s()+-]/g, '');
      return /^\d{3,}$/.test(d) && h.dig.indexOf(d) >= 0;
    });
  }
  function markRe(toks) {
    if (!toks.length) return null;
    return new RegExp('(' + toks.map(function (t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).sort(function (a, b) { return b.length - a.length; }).join('|') + ')', 'gi');
  }
  function marked(text, re) {
    if (!re || !text) return esc(text);
    var out = '', last = 0, m; re.lastIndex = 0;
    while ((m = re.exec(text))) { if (!m[0]) { re.lastIndex++; continue; } out += esc(text.slice(last, m.index)) + '<mark>' + esc(m[0]) + '</mark>'; last = m.index + m[0].length; }
    return out + esc(text.slice(last));
  }
  function mailCell(text, re) {
    var out = '', last = 0, m, rx = /[\w.+'-]+@[\w-]+(?:\.[\w-]+)+/g;
    while ((m = rx.exec(text))) {
      out += marked(text.slice(last, m.index), re) + '<a href="mailto:' + esc(m[0]) + '" title="Email ' + esc(m[0]) + '">' + marked(m[0], re) + '</a>';
      last = m.index + m[0].length;
    }
    return out + marked(text.slice(last), re);
  }

  // ---------- table ----------
  var EDIT_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
  var DEL_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  function renderHead() {
    var cols = '<col class="sc-col-act">' + state.heads.map(function (h) { return '<col style="width:' + field(h).w + 'px">'; }).join('');
    $('#scCols').innerHTML = cols;
    $('#scHead').innerHTML = '<tr><th class="sc-act" scope="col"><span class="sc-sr">Edit or delete</span></th>' + state.heads.map(function (h, i) {
      return '<th scope="col" class="' + (i === 0 ? 'sc-name' : '') + (field(h).centre ? ' sc-c' : '') + '">' + esc(h) + '</th>';
    }).join('') + '</tr>';
  }
  function rowHtml(r, k, re) {
    var band = (r.util ? BANDS.util : BANDS.sup), cls = 'sc-row' + (r.util ? ' is-util' : '') + (k % 2 ? ' is-b' : ' is-a');
    var name = r.f.Supplier || '(no name)';
    var cells = state.heads.map(function (h, i) {
      var f = field(h), v = r.f[h] || '';
      var html = f.mail ? mailCell(v, re) : marked(v, re);
      return '<td class="' + (i === 0 ? 'sc-name' : '') + (f.centre ? ' sc-c' : '') + '">' + html + '</td>';
    }).join('');
    return '<tr class="' + cls + '" data-id="' + r.id + '" style="--sc-bg:#' + band[k % 2] + '"><td class="sc-act"><button type="button" class="sc-ibtn" data-act="edit" title="Edit ' + esc(name) + '" aria-label="Edit ' + esc(name) + '">' + EDIT_SVG + '</button><button type="button" class="sc-ibtn del" data-act="del" title="Delete ' + esc(name) + ' (Undo brings it back)" aria-label="Delete ' + esc(name) + '">' + DEL_SVG + '</button></td>' + cells + '</tr>';
  }
  function render() {
    var c = counts(), toks = tokens(state.query), re = markRe(toks);
    var has = c.all > 0;
    $('#scEmpty').hidden = has; $('#scTableWrap').hidden = !has;
    $('#scCount').textContent = has ? plural(c.all, 'contact') + ' · ' + plural(c.sup, 'supplier') + ' · ' + c.util.toLocaleString() + ' utilit' + (c.util === 1 ? 'y' : 'ies') : 'No contacts loaded';
    ['#scDownXlsx', '#scDownCsv', '#scSearch'].forEach(function (s) { $(s).disabled = !has; });
    $('#scUndo').disabled = !state.undo.length;
    $('#scUndo').title = state.undo.length ? 'Undo: ' + state.undo[state.undo.length - 1].msg : 'Nothing to undo';
    $('#scLoadBtn').textContent = has ? 'Replace from file…' : 'Load contacts file…';
    if (!has) { $('#scShown').textContent = ''; $('#scBody').innerHTML = ''; return; }
    var sup = [], ut = [];
    state.rows.forEach(function (r) { if (matches(r, toks)) (r.util ? ut : sup).push(r); });
    var n = state.heads.length + 1, html = [];
    sup.forEach(function (r, k) { html.push(rowHtml(r, k, re)); });
    if (ut.length) {
      html.push('<tr class="sc-div"><td colspan="' + n + '"><div><span>Utilities</span> ' + (toks.length ? ut.length.toLocaleString() + ' of ' + c.util.toLocaleString() : c.util.toLocaleString()) + '</div></td></tr>');
      ut.forEach(function (r, k) { html.push(rowHtml(r, sup.length + k, re)); });
    }
    if (!sup.length && !ut.length) html.push('<tr class="sc-none"><td colspan="' + n + '">No contact matches “' + esc(state.query.trim()) + '”. Try fewer words, or part of a name, phone number or email.</td></tr>');
    $('#scBody').innerHTML = html.join('');
    var shown = sup.length + ut.length;
    $('#scShown').textContent = toks.length ? 'Showing ' + shown.toLocaleString() + ' of ' + c.all.toLocaleString() : '';
  }
  var searchTimer = 0;
  function onSearch() { clearTimeout(searchTimer); searchTimer = setTimeout(function () { state.query = $('#scSearch').value; $('#scClear').hidden = !state.query; render(); }, 70); }

  // ---------- messages / saved state ----------
  function msg(text, kind, undo) {
    var el = $('#scMsg');
    el.className = 'sc-msg' + (kind ? ' is-' + kind : '');
    el.innerHTML = esc(text) + (undo ? ' <button type="button" class="sc-link" data-undo>Undo</button>' : '');
    var b = el.querySelector('[data-undo]'); if (b) b.onclick = doUndo;
  }
  function savedPill() {
    var p = $('#scSaved');
    if (state.saving) { p.className = 'phf-pill is-blue'; p.textContent = 'Saving…'; return; }
    if (!state.rows.length && !state.saved) { p.className = 'phf-pill'; p.textContent = 'Nothing saved yet'; return; }
    if (state.dirty) { p.className = 'phf-pill is-red'; p.textContent = 'Not saved'; return; }
    p.className = 'phf-pill is-green'; p.textContent = 'Saved in this browser' + (state.saved && L ? ' · ' + L.when(state.saved) : '');
  }

  // ---------- changes, undo and saving ----------
  function setHeads(extras) {
    state.extras = extras.slice();
    state.heads = FIELDS.map(function (f) { return f.key; }).concat(state.extras);
  }
  function change(fn, text) {
    var before = { rows: clone(state.rows), extras: state.extras.slice(), msg: text };
    fn();
    state.undo.push(before); if (state.undo.length > 50) state.undo.shift();
    state.rows.forEach(function (r) { r._ver = (r._ver || 0) + 1; });
    state.rev++; state.dirty = true; scheduleSave(); render(); msg(text + '.', 'ok', true);
  }
  function doUndo() {
    var u = state.undo.pop(); if (!u) return;
    state.rows = u.rows; setHeads(u.extras); renderHead();
    state.rev++; state.dirty = true; scheduleSave(); render(); msg('Undone: ' + u.msg + '.', 'info');
  }
  var saveTimer = 0;
  function scheduleSave() { clearTimeout(saveTimer); savedPill(); saveTimer = setTimeout(save, 300); }
  function save() {
    if (!L) { msg('This browser has no Staff Hub Library, so changes are not kept — use Download.', 'warn'); return Promise.resolve(); }
    state.saving = true; savedPill();
    var rev = state.rev, rows = state.rows;
    var p = rows.length ? buildXlsx().catch(function (e) { console.warn('xlsx build failed, saving CSV', e); return null; }).then(function (buf) {
      var file = buf ? new File([buf], SAVE_NAME, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        : new File([csvText()], SAVE_NAME.replace(/\.xlsx$/, '.csv'), { type: 'text/csv' });
      var c = counts();
      return L.put(KIND, file, { name: file.name, source: TOOL, meta: c.all + ' contacts · ' + c.sup + ' suppliers · ' + c.util + ' utilities' });
    }) : L.remove(KIND).then(function () { return null; });
    return p.then(function (rec) {
      state.saving = false; state.saved = rec;
      if (rev === state.rev) state.dirty = false; else scheduleSave();
      savedPill();
    }).catch(function (e) {
      state.saving = false; state.dirty = true; savedPill();
      msg('Could not save in this browser (' + (e && e.message ? e.message : e) + '). Download the list so the changes are not lost.', 'error');
    });
  }

  // ---------- reading a contacts file ----------
  function readFile(file) {
    var X = window.XLSX;
    if (!X) return Promise.reject(new Error('The spreadsheet reader did not load — check the internet connection and refresh the page.'));
    var csv = /\.(csv|txt)$/i.test(file.name || '') || /csv/.test(file.type || '');
    var read = csv ? file.text().then(function (t) { return X.read(t.replace(/^﻿/, ''), { type: 'string', raw: true }); })
      : file.arrayBuffer().then(function (b) { return X.read(b, { type: 'array' }); });
    return read.then(function (wb) {
      for (var s = 0; s < wb.SheetNames.length; s++) {
        var m = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[s]], { header: 1, defval: '', raw: false, blankrows: false });
        var t = fromMatrix(m);
        if (t) return t;
      }
      throw new Error('No Supplier (or ContactName) heading was found in ' + (file.name || 'the file') + '.');
    });
  }
  function fromMatrix(m) {
    var hr = -1;
    for (var r = 0; r < Math.min(15, m.length) && hr < 0; r++) {
      if ((m[r] || []).some(function (v) { return FIELDS[0].alias.indexOf(norm(v)) >= 0; })) hr = r;
    }
    if (hr < 0) return null;
    var head = m[hr].map(function (v) { return clean(v).replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').replace(/^\*/, ''); });
    var map = {}, used = {}, sec = -1, extras = [];
    head.forEach(function (h, c) {
      var n = norm(h); if (!n) return;
      if (sec < 0 && SECTION.alias.indexOf(n) >= 0) { sec = c; return; }
      for (var i = 0; i < FIELDS.length; i++) {
        if (!used[FIELDS[i].key] && FIELDS[i].alias.indexOf(n) >= 0) { map[c] = FIELDS[i].key; used[FIELDS[i].key] = true; return; }
      }
      var name = h, k = 2;
      while (used[name] || name === SECTION.key || FIELDS.some(function (f) { return f.key === name; })) name = h + ' (' + (k++) + ')';
      used[name] = true; map[c] = name; extras.push(name);
    });
    var rows = [], afterLast = false;
    for (var r2 = hr + 1; r2 < m.length; r2++) {
      var row = m[r2] || [], f = {}, any = false;
      Object.keys(map).forEach(function (c) { var v = clean(row[c]); f[map[c]] = v; if (v) any = true; });
      if (!any) continue;
      var util = sec >= 0 ? isUtil(row[sec]) : afterLast;
      rows.push({ f: f, util: util });
      if (sec < 0 && norm(f.Supplier) === LAST_SUPPLIER) afterLast = true;
    }
    return { extras: extras, rows: rows };
  }
  function loadTable(t, label, keepUndo) {
    var apply = function () {
      setHeads(t.extras);
      var sup = [], ut = [];
      t.rows.forEach(function (x) { (x.util ? ut : sup).push(newRow(x.f, x.util)); });
      state.rows = sup.concat(ut);
    };
    if (keepUndo) change(apply, label); else { apply(); render(); }
    renderHead(); render();
  }
  function loadFile(file) {
    if (!file) return;
    if (!/\.(xlsx|xlsm|xls|csv|txt)$/i.test(file.name || '')) { msg(file.name + ' is not a spreadsheet — choose the contacts .xlsx, .xlsm or .csv file.', 'error'); return; }
    msg('Reading ' + file.name + '…', 'info');
    readFile(file).then(function (t) {
      if (!t.rows.length) throw new Error('No contacts were found under the headings in ' + file.name + '.');
      var u = t.rows.filter(function (x) { return x.util; }).length;
      loadTable(t, 'Loaded ' + file.name + ' — ' + plural(t.rows.length, 'contact') + ' (' + u + ' utilit' + (u === 1 ? 'y' : 'ies') + ')' + (state.rows.length ? ', replacing the list that was here' : ''), true);
    }).catch(function (e) { console.error(e); msg('Not loaded — ' + (e && e.message ? e.message : e), 'error'); });
  }

  // ---------- writing ----------
  function displayRows() { return state.rows.filter(function (r) { return !r.util; }).concat(state.rows.filter(function (r) { return r.util; })); }
  function outHeads() { return state.heads.concat([SECTION.key]); }
  function outValue(h, r) { return h === SECTION.key ? (r.util ? 'Utility' : 'Supplier') : (r.f[h] || ''); }
  function colLetter(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
  function buildXlsx() {
    var E = window.ExcelJS;
    if (!E) return Promise.reject(new Error('Excel writer did not load'));
    var wb = new E.Workbook(); wb.creator = 'PHF Staff Hub — ' + TOOL + ' ' + VERSION;
    var ws = wb.addWorksheet('Supplier Contacts', { views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }] });
    var heads = outHeads(), rows = displayRows();
    ws.columns = heads.map(function (h) { return { header: h, key: h, width: h === SECTION.key ? 10 : field(h).xw }; });
    rows.forEach(function (r) {
      ws.addRow(heads.map(function (h) { var v = outValue(h, r); return (h === 'Index' || h === 'Min Order') && /^\d{1,9}$/.test(v) ? Number(v) : v; }));
    });
    var head = ws.getRow(1); head.height = 30;
    head.eachCell(function (c) {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
      c.font = { name: 'Arial', bold: true, size: 10, color: { argb: 'FFE6CD74' } };
      c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });
    var ci = {}; heads.forEach(function (h, i) { ci[h] = i + 1; });
    for (var r = 2; r <= rows.length + 1; r++) {
      ws.getRow(r).eachCell({ includeEmpty: true }, function (c, col) {
        var h = heads[col - 1];
        c.font = { name: 'Arial', size: 10, bold: col === 1, color: { argb: 'FF1F2937' } };
        c.alignment = { vertical: 'top', wrapText: true, horizontal: (field(h).centre || h === SECTION.key) ? 'center' : 'left' };
        c.border = { bottom: { style: 'thin', color: { argb: 'FFD6DEE6' } } };
      });
    }
    var last = colLetter(heads.length), end = rows.length + 1, sec = colLetter(ci[SECTION.key]);
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: end, column: heads.length } };
    var fill = function (hex) { return { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FF' + hex } } }; };
    if (rows.length) ws.addConditionalFormatting({ ref: 'A2:' + last + end, rules: [
      { type: 'expression', priority: 1, formulae: ['AND($' + sec + '2="Utility",MOD(ROW(),2)=0)'], style: fill(BANDS.util[0]) },
      { type: 'expression', priority: 2, formulae: ['$' + sec + '2="Utility"'], style: fill(BANDS.util[1]) },
      { type: 'expression', priority: 3, formulae: ['MOD(ROW(),2)=0'], style: fill(BANDS.sup[0]) },
      { type: 'expression', priority: 4, formulae: ['MOD(ROW(),2)=1'], style: fill(BANDS.sup[1]) }
    ] });
    return wb.xlsx.writeBuffer();
  }
  function csvText() {
    var q = function (v) { v = String(v == null ? '' : v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var heads = outHeads();
    return '﻿' + [heads.map(q).join(',')].concat(displayRows().map(function (r) { return heads.map(function (h) { return q(outValue(h, r)); }).join(','); })).join('\r\n') + '\r\n';
  }
  function download(blob, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function downXlsx() {
    msg('Making the Excel file…', 'info');
    buildXlsx().then(function (buf) {
      var n = 'Supplier_Contacts_' + stamp() + '.xlsx';
      download(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), n);
      msg('Downloaded ' + n + ' — ' + plural(state.rows.length, 'contact') + '. Drop it into Supplier Contacts on another computer to share the list.', 'ok');
    }).catch(function (e) { msg('Could not make the Excel file (' + e.message + '). Download .csv instead.', 'error'); });
  }
  function downCsv() {
    var n = 'Supplier_Contacts_' + stamp() + '.csv';
    download(new Blob([csvText()], { type: 'text/csv;charset=utf-8' }), n);
    msg('Downloaded ' + n + ' — ' + plural(state.rows.length, 'contact') + '.', 'ok');
  }

  // ---------- add / edit dialog ----------
  function rowById(id) { for (var i = 0; i < state.rows.length; i++) if (state.rows[i].id === id) return state.rows[i]; return null; }
  function nextIndex() { var m = 0; state.rows.forEach(function (r) { var n = parseInt(r.f.Index, 10); if (/^\d+$/.test(r.f.Index || '') && n > m) m = n; }); return m ? String(m + 1) : ''; }
  function openDialog(id) {
    var r = id ? rowById(id) : null, d = $('#scDialog');
    state.editing = r ? r.id : null;
    $('#scDlgTitle').textContent = r ? 'Edit contact' : 'Add contact';
    $('#scDlgDel').hidden = !r;
    $('#scDlgErr').textContent = '';
    var f = r ? r.f : { Index: nextIndex() };
    var one = '<label class="sc-f sc-f-wide"><span>Supplier <b aria-hidden="true">*</b></span><input name="Supplier" required autocomplete="off" value="' + esc(f.Supplier || '') + '"></label>' +
      '<label class="sc-f"><span>Section</span><select name="__section"><option value="Supplier">Supplier</option><option value="Utility"' + (r && r.util ? ' selected' : '') + '>Utility</option></select></label>';
    var many = '';
    state.heads.slice(1).forEach(function (h) {
      var fd = field(h), v = f[h] || '', big = fd.multi || state.extras.indexOf(h) >= 0;
      if (big) many += '<label class="sc-f"><span>' + esc(h) + '</span><textarea name="' + esc(h) + '" rows="' + Math.min(9, Math.max(4, v.split('\n').length + 1)) + '">' + esc(v) + '</textarea></label>';
      else one += '<label class="sc-f"><span>' + esc(h) + '</span><input name="' + esc(h) + '" autocomplete="off" value="' + esc(v) + '"></label>';
    });
    $('#scDlgFields').innerHTML = '<div class="sc-dlg-grid">' + one + '</div><div class="sc-dlg-grid sc-dlg-multi">' + many + '</div>';
    $('#scDlgNote').textContent = r ? 'Changes are saved in this browser when you press Save.' : 'A new contact goes at the end of its section (suppliers above, utilities below).';
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    setTimeout(function () { var i = d.querySelector('[name="Supplier"]'); if (i) { i.focus(); if (r) i.select(); } }, 20);
  }
  function closeDialog() { var d = $('#scDialog'); if (d.close) d.close(); else d.removeAttribute('open'); state.editing = null; }
  function submitDialog(e) {
    e.preventDefault();
    var form = $('#scDlgForm'), f = {}, err = $('#scDlgErr');
    state.heads.forEach(function (h) { var el = form.elements[h]; f[h] = clean(el ? el.value : ''); });
    var util = form.elements.__section.value === 'Utility';
    if (!f.Supplier) { err.textContent = 'Type the supplier (contact) name.'; form.elements.Supplier.focus(); return; }
    var same = state.rows.filter(function (x) { return x.id !== state.editing && norm(x.f.Supplier) === norm(f.Supplier); })[0];
    if (same) {
      err.innerHTML = '“' + esc(same.f.Supplier) + '” is already in the list — <button type="button" class="sc-link" data-open="' + same.id + '">open it</button> to add these details there.';
      err.querySelector('[data-open]').onclick = function () { closeDialog(); openDialog(same.id); };
      return;
    }
    var id = state.editing, r = id ? rowById(id) : null;
    if (r) {
      change(function () {
        var moved = r.util !== util;
        state.heads.forEach(function (h) { r.f[h] = f[h]; });
        if (moved) { state.rows.splice(state.rows.indexOf(r), 1); r.util = util; place(r); }
      }, 'Saved ' + f.Supplier + (util ? ' (utility)' : ''));
    } else {
      r = newRow(f, util);
      change(function () { place(r); }, 'Added ' + f.Supplier + (util ? ' to the utilities' : ' to the suppliers'));
    }
    closeDialog();
    if (state.query && !matches(r, tokens(state.query))) msg((id ? 'Saved ' : 'Added ') + f.Supplier + ' — the search is hiding it; clear the search to see it.', 'ok', true);
    else flash(r.id);
  }
  function flash(id) {
    var tr = document.querySelector('#scBody tr[data-id="' + id + '"]'); if (!tr) return;
    tr.classList.add('is-flash'); tr.scrollIntoView({ block: 'nearest' });
    setTimeout(function () { tr.classList.remove('is-flash'); }, 1600);
  }
  function place(r) { // end of its section
    if (r.util) { state.rows.push(r); return; }
    var i = 0; while (i < state.rows.length && !state.rows[i].util) i++;
    state.rows.splice(i, 0, r);
  }
  function del(id) {
    var r = rowById(id); if (!r) return;
    change(function () { state.rows.splice(state.rows.indexOf(r), 1); }, 'Deleted ' + (r.f.Supplier || 'a contact'));
  }

  // ---------- page wiring ----------
  function wire() {
    $('#scSearch').addEventListener('input', onSearch);
    $('#scSearch').addEventListener('keydown', function (e) { if (e.key === 'Escape') { $('#scSearch').value = ''; onSearch(); } });
    $('#scClear').onclick = function () { $('#scSearch').value = ''; onSearch(); $('#scSearch').focus(); };
    $('#scAdd').onclick = function () { openDialog(null); };
    $('#scUndo').onclick = doUndo;
    $('#scDownXlsx').onclick = downXlsx;
    $('#scDownCsv').onclick = downCsv;
    $('#scLoadBtn').onclick = function () { $('#scFile').click(); };
    $('#scEmptyDrop').onclick = function () { $('#scFile').click(); };
    $('#scEmptyDrop').onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#scFile').click(); } };
    $('#scFile').onchange = function () { var f = this.files && this.files[0]; this.value = ''; loadFile(f); };
    $('#scBody').addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var id = +b.closest('tr').dataset.id;
      if (b.dataset.act === 'edit') openDialog(id); else del(id);
    });
    $('#scBody').addEventListener('dblclick', function (e) {
      if (e.target.closest('a,button')) return;
      var tr = e.target.closest('tr.sc-row'); if (tr) openDialog(+tr.dataset.id);
    });
    $('#scDlgForm').addEventListener('submit', submitDialog);
    $('#scDlgCancel').onclick = closeDialog;
    $('#scDlgDel').onclick = function () { var id = state.editing; closeDialog(); del(id); };
    $('#scDialog').addEventListener('cancel', function () { state.editing = null; });
    // drop a contacts file anywhere on the page
    var card = $('#scCard'), depth = 0;
    document.addEventListener('dragenter', function (e) { if (!hasFiles(e)) return; e.preventDefault(); depth++; card.classList.add('is-drag'); });
    document.addEventListener('dragover', function (e) { if (!hasFiles(e)) return; e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; });
    document.addEventListener('dragleave', function (e) { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (!depth) card.classList.remove('is-drag'); });
    document.addEventListener('drop', function (e) {
      if (!hasFiles(e)) return; e.preventDefault(); depth = 0; card.classList.remove('is-drag');
      if ($('#scDialog').open) return;
      var f = e.dataTransfer.files[0]; if (f) loadFile(f);
    });
    window.addEventListener('beforeunload', function (e) { if (state.dirty || state.saving) { e.preventDefault(); e.returnValue = ''; } });
    if (L) L.onChange(function (m) {
      if (!m || m.kind !== KIND) return; // Library "Delete all" keeps the contacts list
      if (m.action === 'put' && m.record && state.saved && m.record.savedAt === state.saved.savedAt) return;
      if (m.action === 'put' && m.record && m.record.source === TOOL && state.saving) return;
      if (m.action === 'put') {
        if (state.dirty) { msg('Supplier Contacts was changed in another tab. This tab keeps its own changes — refresh to see the other one.', 'warn'); return; }
        loadSaved('Updated from another tab.');
      } else {
        state.saved = null; savedPill();
        if (state.rows.length) msg('The saved copy was deleted from the Library. The list is still on this page — make a change or Download to keep it.', 'warn');
      }
    });
  }
  function hasFiles(e) { var t = e.dataTransfer && e.dataTransfer.types; return !!t && Array.prototype.indexOf.call(t, 'Files') >= 0; }
  function loadSaved(note) {
    if (!L) { savedPill(); msg('This browser has no Staff Hub Library — load the contacts file each time, and Download to keep changes.', 'warn'); return Promise.resolve(); }
    return L.get(KIND).then(function (rec) {
      if (!rec || !rec.blob) { state.saved = null; savedPill(); render(); msg('Load the Supplier Contacts file once on this computer — it is then kept in this browser.', 'info'); return; }
      return readFile(L.toFile(rec)).then(function (t) {
        state.saved = rec; state.dirty = false; state.undo = [];
        loadTable(t, '', false); savedPill();
        var c = counts();
        msg((note ? note + ' ' : '') + plural(c.all, 'contact') + ' from this browser’s Library (saved ' + L.when(rec) + ').', 'info');
      });
    }).catch(function (e) { console.error(e); savedPill(); render(); msg('Could not open the saved list (' + (e && e.message ? e.message : e) + '). Load the contacts file again.', 'error'); });
  }

  wire(); renderHead(); render(); savedPill(); loadSaved();
  window.PHFContacts = { VERSION: VERSION, state: state, readFile: readFile, fromMatrix: fromMatrix, buildXlsx: buildXlsx, csvText: csvText };
})();
