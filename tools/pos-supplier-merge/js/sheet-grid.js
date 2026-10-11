/* PHF Staff Hub — POS Supplier New Product Check and Clean Merge · sheet-grid.js v1.1.0 (11 Oct 2026)
 * A sheet for the workbook tabs (OUT_MERGED_DATA, OUT_POS_INSERT / UPDATE, the SRC_ tabs, TMP_MERGED_POS_DATA) that
 * looks like the Google Sheet: column letters, the navy / gold row-1 totals band, the row-2 headings with a filter
 * button on each, frozen-row line, banded rows, the Sheet's conditional colours (js/sheet-look.js) and row numbers.
 * Only the rows near the scroll position are drawn (gap rows stand in for the rest), so 34,000 rows scroll smoothly.
 * v1.1.0: editable sheets — click a cell, type (or Enter / F2) to change it, Ctrl+V pastes from the selected cell,
 * Delete clears, click a row number to select rows, Add row / Delete rows / Undo. The grid only reports changes; the
 * page applies them (and redraws) — see opts.edit.onChange.
 *
 *   var g = PHFSheetGrid.create(host, { search: true });
 *   g.set({ head, rows, cols (source columns to show, default all), rowNumbers, firstRow, look (PHFSheetLook),
 *           totals: function (visibleRows) → { col: text }, keepView: true (keep scroll / search / filters / selection),
 *           edit: null | { readOnly: { col: 1 }, rows: true (add / delete rows), onChange(change), onUndo(), canUndo } });
 *   change = { type: 'cells', cells: [{ i: sourceRow (≥ rows.length = new row), c: sourceCol, v: 'text' }], where: 'C5' }
 *          | { type: 'deleteRows', rows: [sourceRow, …] }
 *   g.busy(bool), g.note(text, type), g.refresh(), g.count()
 */
(function (G) {
  'use strict';
  var BUF = 40;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function colLetter(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
  function oneLine(v) { return v == null ? '' : String(v).replace(/\r?\n/g, ' · '); }
  var FILTER_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4h12M4.5 8h7M7 12h2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';

  function parseTsv(text) {
    var s = String(text || '').replace(/\r\n?/g, '\n'), rows = [], row = [], f = '', q = false, i = 0, n = s.length;
    while (i < n) {
      var ch = s.charAt(i);
      if (q) {
        if (ch === '"') {
          if (s.charAt(i + 1) === '"') { f += '"'; i += 2; continue; }
          var nx = s.charAt(i + 1);
          if (nx === '\t' || nx === '\n' || nx === '') { q = false; i++; continue; }
          f = '"' + f + '"'; q = false; i++; continue;
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

  function create(host, opts) {
    opts = opts || {};
    host.classList.add('wbg');
    host.innerHTML =
      '<div class="wbg-tools">' + (opts.search === false ? '' : '<input type="search" class="wbg-search" placeholder="Search this sheet…" aria-label="Search this sheet">') +
      '<span class="wbg-count"></span><span class="wbg-filters" hidden></span>' +
      '<span class="wbg-edit-tools" hidden><span class="wbg-sel"></span>' +
      '<button type="button" class="btn small" data-g="add" title="Add an empty row at the end and start typing in it">Add row</button>' +
      '<button type="button" class="btn small" data-g="del" title="Delete the selected rows (click a row number, Shift+click another to select several)" disabled>Delete rows</button>' +
      '<button type="button" class="btn small" data-g="undo" title="Undo the last change (Ctrl+Z)" disabled>Undo</button></span></div>' +
      '<div class="status wbg-note" hidden></div>' +
      '<div class="wbg-wrap" tabindex="0"><table class="wbg-table"><colgroup></colgroup><thead></thead><tbody></tbody></table><div class="wbg-pop" hidden></div></div>';
    var wrap = host.querySelector('.wbg-wrap'), table = host.querySelector('.wbg-table'), search = host.querySelector('.wbg-search');
    var count = host.querySelector('.wbg-count'), tools = host.querySelector('.wbg-edit-tools'), noteEl = host.querySelector('.wbg-note');
    var pop = host.querySelector('.wbg-pop'), filtInfo = host.querySelector('.wbg-filters'), selInfo = host.querySelector('.wbg-sel');
    var st = { head: [], rows: [], cols: [], vis: [], q: '', hay: null, look: null, totals: null, firstRow: 3, nums: null, rowH: 25, win: { start: 0, end: 0 },
      raf: 0, edit: null, sel: null, editing: null, busy: false, filters: {}, marks: null };

    // ------------------------------------------------------------------ layout
    function widths() {
      var w = [], sample = Math.min(st.rows.length, 300);
      for (var k = 0; k < st.cols.length; k++) {
        var c = st.cols[k], len = String(st.head[c] || '').length * 0.75 + 3;
        for (var r = 0; r < sample; r++) {
          var raw = st.rows[r][c]; if (raw == null || raw === '') continue;
          var parts = String(raw).split(/\r?\n/);
          for (var p = 0; p < parts.length; p++) if (parts[p].length > len) len = parts[p].length;
        }
        w.push(Math.max(58, Math.min(330, Math.round(len * 6.6 + 18))));
      }
      return w;
    }
    function cellDisplay(v, c) { if (st.look && st.look.display) v = st.look.display(v, c); return v; }
    function totalsHtml() {
      var t = st.totals ? st.totals(st.vis.map(function (e) { return e.r; })) : {};
      return '<tr class="wbg-tot"><th class="wbg-rn">1</th>' + st.cols.map(function (c) { var s = t[c] || ''; return '<th>' + (s ? '<div>' + esc(s) + '</div>' : '') + '</th>'; }).join('') + '</tr>';
    }
    function drawHead() {
      var w = widths(), total = 46;
      table.querySelector('colgroup').innerHTML = '<col style="width:46px">' + w.map(function (x) { total += x; return '<col style="width:' + x + 'px">'; }).join('');
      table.style.width = total + 'px';
      var ro = st.edit ? st.edit.readOnly || {} : {};
      table.querySelector('thead').innerHTML =
        '<tr class="wbg-letters"><th class="wbg-rn wbg-corner"></th>' + st.cols.map(function (c) { return '<th>' + colLetter(c + 1) + '</th>'; }).join('') + '</tr>' +
        totalsHtml() +
        '<tr class="wbg-headrow"><th class="wbg-rn">' + (st.firstRow - 1) + '</th>' + st.cols.map(function (c, k) {
          return '<th data-hc="' + k + '"' + (st.edit && ro[c] ? ' class="wbg-ro-head" title="' + esc(st.head[c]) + ' — worked out by the merge (read-only here)"' : ' title="' + esc(st.head[c]) + '"') + '>' + esc(st.head[c]) +
            '<button type="button" class="wbg-filt' + (st.filters[c] !== undefined ? ' is-on' : '') + '" data-fc="' + c + '" aria-label="Filter ' + esc(st.head[c]) + '">' + FILTER_SVG + '</button></th>';
        }).join('') + '</tr>';
    }
    function drawTotals() { var tr = table.querySelector('thead tr.wbg-tot'); if (tr) tr.outerHTML = totalsHtml(); }
    function headH() { var th = table.querySelector('thead'); return th ? th.offsetHeight : 90; }
    function totalRows() { return st.vis.length + (newRowOn() ? 1 : 0); }
    function newRowOn() { return !!(st.edit && st.edit.rows !== false && !st.q.trim() && !Object.keys(st.filters).length); }
    function windowOf() {
      var total = totalRows(), rh = st.rowH, top = Math.max(0, wrap.scrollTop - headH()), h = wrap.clientHeight || 640;
      var first = Math.floor(top / rh), last = first + Math.ceil(h / rh);
      return { first: first, last: last, start: Math.max(0, Math.min(first, total) - BUF), end: Math.min(total, last + BUF) };
    }
    function gap(px) { return px > 0 ? '<tr class="wbg-gap" aria-hidden="true"><td colspan="' + (st.cols.length + 1) + '" style="height:' + Math.round(px) + 'px"></td></tr>' : ''; }
    function rowHtml(i) {
      var e = st.vis[i];
      if (!e) {
        var blank = '<td class="wbg-rn wbg-newmark" data-r="' + i + '" data-c="-1">+</td>';
        for (var k2 = 0; k2 < st.cols.length; k2++) blank += '<td data-r="' + i + '" data-c="' + k2 + '"></td>';
        return '<tr class="wbg-new">' + blank + '</tr>';
      }
      var r = e.r, look = st.look, ro = st.edit ? st.edit.readOnly || {} : {}, marks = st.marks && st.marks[e.n];
      var cells = '<td class="wbg-rn" data-r="' + i + '" data-c="-1">' + (st.nums ? st.nums[e.n] : e.n + st.firstRow) + '</td>';
      for (var k = 0; k < st.cols.length; k++) {
        var c = st.cols[k], raw = r[c], shown = cellDisplay(raw, c), s = String(shown == null ? '' : shown);
        var a = look && look.style && s !== '' ? look.style(r, c) : null;
        var cls = [];
        if (look && look.centre[c]) cls.push('wbg-c');
        if (st.edit && ro[c]) cls.push('wbg-ro');
        if (marks && marks[c]) cls.push('is-edited');
        if (/\n/.test(s)) cls.push('wbg-2l');
        var style = a ? ' style="' + (a.bg ? 'background-color:#' + a.bg + ';' : '') + (a.fg ? 'color:#' + a.fg + ';' : '') + (a.b ? 'font-weight:700' : '') + '"' : '';
        cells += '<td data-r="' + i + '" data-c="' + k + '"' + (cls.length ? ' class="' + cls.join(' ') + '"' : '') + style + (s.length > 16 ? ' title="' + esc(s) + '"' : '') + '>' + esc(s) + '</td>';
      }
      return '<tr class="wbg-b' + (e.n % 2) + '">' + cells + '</tr>';
    }
    function drawRows() {
      var body = table.querySelector('tbody'), w = windowOf(), html = [gap(w.start * st.rowH)];
      for (var i = w.start; i < w.end; i++) html.push(rowHtml(i));
      html.push(gap((totalRows() - w.end) * st.rowH));
      if (!st.vis.length && !newRowOn()) html = ['<tr><td class="wbg-empty" colspan="' + (st.cols.length + 1) + '">' + (st.q || Object.keys(st.filters).length ? 'No rows match the search / filter.' : 'No rows.') + '</td></tr>'];
      body.innerHTML = html.join('');
      st.win = { start: w.start, end: w.end };
      var tr = body.querySelector('tr.wbg-b0, tr.wbg-b1');
      if (tr) { var h = tr.getBoundingClientRect().height; if (h > 10 && Math.abs(h - st.rowH) > 0.5) { st.rowH = h; drawRows(); return; } }
      paintSel();
    }
    function filter() {
      var q = st.q.trim().toUpperCase(), fk = Object.keys(st.filters);
      if (q && !st.hay) st.hay = st.rows.map(function (r) { return st.cols.map(function (c) { return oneLine(cellDisplay(r[c], c)); }).join(' ').toUpperCase(); });
      st.vis = [];
      for (var i = 0; i < st.rows.length; i++) {
        if (q && st.hay[i].indexOf(q) < 0) continue;
        var ok = true;
        for (var f = 0; f < fk.length; f++) { var c = +fk[f]; if (oneLine(cellDisplay(st.rows[i][c], c)).trim() !== st.filters[c]) { ok = false; break; } }
        if (ok) st.vis.push({ r: st.rows[i], n: i });
      }
      if (count) count.textContent = (q || fk.length ? st.vis.length.toLocaleString('en-AU') + ' of ' : '') + st.rows.length.toLocaleString('en-AU') + ' rows';
      if (filtInfo) {
        filtInfo.hidden = !fk.length;
        filtInfo.innerHTML = fk.map(function (c) { return '<button type="button" class="wbg-fchip" data-fx="' + c + '" title="Clear this filter">' + esc(st.head[c]) + ' = ' + esc(st.filters[c] || '(blank)') + ' ✕</button>'; }).join('');
      }
    }
    function redraw() { filter(); drawHead(); drawRows(); updateTools(); }

    // --------------------------------------------------------------- selection
    function selBox() { var s = st.sel; return s ? { r1: Math.min(s.r, s.r2), r2: Math.max(s.r, s.r2), c1: Math.min(s.c, s.c2), c2: Math.max(s.c, s.c2), rows: s.rows } : null; }
    function paintSel() {
      var body = table.querySelector('tbody'); if (!body) return;
      body.querySelectorAll('td.is-sel,td.is-anchor').forEach(function (td) { td.classList.remove('is-sel', 'is-anchor'); });
      var b = selBox(), s = st.sel;
      if (selInfo) selInfo.textContent = '';
      if (!b) { updateTools(); return; }
      body.querySelectorAll('td[data-r]').forEach(function (td) {
        var r = +td.dataset.r, c = +td.dataset.c;
        if (r >= b.r1 && r <= b.r2 && (b.rows ? true : (c >= b.c1 && c <= b.c2)) && c >= 0) td.classList.add('is-sel');
        if (!b.rows && r === s.r2 && c === s.c2) td.classList.add('is-anchor');
      });
      if (selInfo && st.edit) {
        var n = Math.min(b.r2, st.vis.length - 1) - b.r1 + 1;
        selInfo.textContent = b.rows ? (n > 0 ? n.toLocaleString('en-AU') + ' row' + (n === 1 ? '' : 's') + ' selected' : '')
          : (st.cols[b.c1] !== undefined ? colLetter(st.cols[b.c1] + 1) + rowNum(b.r1) + (b.r2 !== b.r1 || b.c2 !== b.c1 ? ':' + colLetter(st.cols[b.c2] + 1) + rowNum(b.r2) : '') : '');
      }
      updateTools();
    }
    function rowNum(r) { var e = st.vis[r]; return e ? (st.nums ? st.nums[e.n] : e.n + st.firstRow) : (st.rows.length + st.firstRow + (r - st.vis.length)); }
    function cellEl(r, k) { return table.querySelector('tbody td[data-r="' + r + '"][data-c="' + k + '"]'); }
    function showRow(r) {
      var rh = st.rowH, head = headH(), top = head + r * rh;
      if (top - head < wrap.scrollTop) wrap.scrollTop = Math.max(0, top - head);
      else if (top + rh > wrap.scrollTop + wrap.clientHeight) wrap.scrollTop = top + rh - wrap.clientHeight;
      if (r < st.win.start || r >= st.win.end) drawRows();
    }
    function goTo(r, k, extend) {
      r = Math.max(0, Math.min(r, totalRows() - 1)); k = Math.max(0, Math.min(st.cols.length - 1, k));
      if (extend && st.sel && !st.sel.rows) { st.sel.r2 = r; st.sel.c2 = k; } else st.sel = { r: r, c: k, r2: r, c2: k };
      showRow(r); paintSel();
      var el = cellEl(r, k); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    function updateTools() {
      if (!tools) return;
      tools.hidden = !st.edit;
      if (!st.edit) return;
      var b = selBox(), can = !st.busy;
      tools.querySelector('[data-g="add"]').hidden = st.edit.rows === false;
      var del = tools.querySelector('[data-g="del"]'); del.hidden = st.edit.rows === false;
      del.disabled = !can || !b || !b.rows || b.r1 >= st.vis.length;
      tools.querySelector('[data-g="add"]').disabled = !can;
      tools.querySelector('[data-g="undo"]').disabled = !can || !st.edit.canUndo;
    }
    function say(t, type) { if (!noteEl) return; noteEl.textContent = t || ''; noteEl.className = 'status wbg-note ' + (type || 'info'); noteEl.hidden = !t; }

    // ------------------------------------------------------------------ editing
    function editable(k) { return !!(st.edit && !st.busy && st.cols[k] !== undefined && !(st.edit.readOnly || {})[st.cols[k]]); }
    function emit(change) { if (st.edit && st.edit.onChange) st.edit.onChange(change); }
    function srcIndex(r) { var e = st.vis[r]; return e ? e.n : st.rows.length + (r - st.vis.length); }
    function startEdit(initial) {
      var s = st.sel; if (!s || s.rows || !st.edit) return;
      var r = s.r2, k = s.c2;
      if (st.busy) return;
      if (!editable(k)) { say(st.head[st.cols[k]] + ' is worked out by the merge, so it is read-only here.', 'info'); return; }
      var td = cellEl(r, k); if (!td) return;
      var e = st.vis[r], cur = e ? String(e.r[st.cols[k]] == null ? '' : e.r[st.cols[k]]) : '';
      var inp = document.createElement(/\n/.test(cur) ? 'textarea' : 'input');
      if (inp.tagName === 'INPUT') inp.type = 'text';
      inp.className = 'wbg-input'; inp.value = initial !== undefined ? initial : cur;
      td.classList.add('is-editing'); td.appendChild(inp);
      st.editing = { r: r, k: k, input: inp, typed: initial !== undefined, cur: cur };
      inp.focus(); if (initial === undefined) inp.select(); else inp.setSelectionRange(inp.value.length, inp.value.length);
      inp.addEventListener('keydown', function (ev) {
        var ed = st.editing; if (!ed) return;
        if (ev.key === 'Enter' && !(ev.altKey && inp.tagName === 'TEXTAREA')) { ev.preventDefault(); commitEdit(); goTo(ed.r + (ev.shiftKey ? -1 : 1), ed.k); wrap.focus({ preventScroll: true }); }
        else if (ev.key === 'Tab') { ev.preventDefault(); commitEdit(); goTo(ed.r, ed.k + (ev.shiftKey ? -1 : 1)); wrap.focus({ preventScroll: true }); }
        else if (ev.key === 'Escape') { ev.preventDefault(); cancelEdit(); wrap.focus({ preventScroll: true }); }
        else if (ed.typed && /^Arrow/.test(ev.key)) { ev.preventDefault(); commitEdit(); var d = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[ev.key]; goTo(ed.r + d[0], ed.k + d[1]); wrap.focus({ preventScroll: true }); }
        ev.stopPropagation();
      });
      inp.addEventListener('paste', function (ev) {
        var txt = ev.clipboardData && ev.clipboardData.getData('text/plain');
        if (txt && /[\t\n]/.test(txt.replace(/\r?\n$/, ''))) { ev.preventDefault(); ev.stopPropagation(); cancelEdit(); pasteText(txt); }
      });
      inp.addEventListener('blur', function () { if (st.editing && st.editing.input === inp) commitEdit(); });
    }
    function cancelEdit() {
      var ed = st.editing; if (!ed) return;
      st.editing = null;
      if (ed.input.parentNode) { ed.input.parentNode.classList.remove('is-editing'); ed.input.parentNode.removeChild(ed.input); }
    }
    function commitEdit() {
      var ed = st.editing; if (!ed) return;
      var val = ed.input.value;
      cancelEdit();
      var e = st.vis[ed.r];
      if (!e && String(val).trim() === '') return;
      if (e && String(val) === ed.cur) return;
      emit({ type: 'cells', cells: [{ i: srcIndex(ed.r), c: st.cols[ed.k], v: val }], where: colLetter(st.cols[ed.k] + 1) + rowNum(ed.r) });
    }
    function clearSel() {
      var b = selBox(); if (!b || !st.edit || st.busy) return;
      var cells = [];
      for (var r = b.r1; r <= b.r2; r++) {
        var e = st.vis[r]; if (!e) continue;
        for (var k = (b.rows ? 0 : b.c1); k <= (b.rows ? st.cols.length - 1 : b.c2); k++) if (editable(k) && String(e.r[st.cols[k]] == null ? '' : e.r[st.cols[k]]) !== '') cells.push({ i: e.n, c: st.cols[k], v: '' });
      }
      if (cells.length) emit({ type: 'cells', cells: cells, where: 'cleared' });
    }
    function pasteText(text) {
      if (!st.edit || st.busy) return;
      var rows = parseTsv(text);
      if (!rows.length) { say('Nothing to paste — copy the cells in Excel or Google Sheets first.', 'warn'); return; }
      var s = st.sel;
      if (!s) { say('Click the cell to paste into first (or the empty row at the bottom to add rows).', 'warn'); return; }
      var b = selBox(), r0 = b.r1, k0 = b.rows ? 0 : b.c1;
      if (r0 > st.vis.length) r0 = st.vis.length;
      var cells = [], skipped = 0, newRows = 0;
      for (var i = 0; i < rows.length; i++) {
        var r = r0 + i, e = st.vis[r];
        if (!e && !newRowOn()) break;
        if (!e) newRows++;
        for (var j = 0; j < rows[i].length; j++) {
          var k = k0 + j; if (k >= st.cols.length) { if (String(rows[i][j]).trim() !== '') skipped++; continue; }
          if (!editable(k)) { if (String(rows[i][j]).trim() !== '') skipped++; continue; }
          cells.push({ i: e ? e.n : st.rows.length + (r - st.vis.length), c: st.cols[k], v: rows[i][j] });
        }
      }
      if (!cells.length) { say('Nothing pasted — the cells there are read-only.', 'warn'); return; }
      st.sel = { r: r0, c: k0, r2: r0 + rows.length - 1, c2: Math.min(st.cols.length - 1, k0 + Math.max.apply(null, rows.map(function (x) { return x.length; })) - 1) };
      emit({ type: 'cells', cells: cells, where: colLetter(st.cols[k0] + 1) + rowNum(r0), paste: true, skipped: skipped, newRows: newRows });
    }
    function deleteSel() {
      var b = selBox(); if (!b || !b.rows || !st.edit || st.busy) return;
      var list = [];
      for (var r = b.r1; r <= b.r2; r++) if (st.vis[r]) list.push(st.vis[r].n);
      if (!list.length) return;
      st.sel = null;
      emit({ type: 'deleteRows', rows: list });
    }
    function copySel() {
      var b = selBox(); if (!b) return '';
      var lines = [];
      for (var r = b.r1; r <= Math.min(b.r2, st.vis.length - 1); r++) {
        var row = [];
        for (var k = (b.rows ? 0 : b.c1); k <= (b.rows ? st.cols.length - 1 : b.c2); k++) row.push(oneLine(cellDisplay(st.vis[r].r[st.cols[k]], st.cols[k])).replace(/\t/g, ' '));
        lines.push(row.join('\t'));
      }
      return lines.join('\n');
    }

    // ------------------------------------------------------------- column filter
    function openFilter(c, btn) {
      var counts = {}, order = [];
      st.rows.forEach(function (r) { var v = oneLine(cellDisplay(r[c], c)).trim(); if (!(v in counts)) { counts[v] = 0; order.push(v); } counts[v]++; });
      order.sort(function (a, b) { return counts[b] - counts[a] || (a < b ? -1 : 1); });
      var list = function (q) {
        q = String(q || '').toUpperCase();
        return order.filter(function (v) { return !q || v.toUpperCase().indexOf(q) >= 0; }).slice(0, 300).map(function (v) {
          return '<button type="button" class="wbg-pv' + (st.filters[c] === v ? ' is-on' : '') + '" data-pv="' + esc(v) + '"><span>' + esc(v || '(Blanks)') + '</span><b>' + counts[v].toLocaleString('en-AU') + '</b></button>';
        }).join('') || '<div class="wbg-pnone">No values match.</div>';
      };
      pop.innerHTML = '<div class="wbg-ptitle">' + esc(st.head[c]) + ' — show only</div><input type="search" class="wbg-psearch" placeholder="Search values…" aria-label="Search values"><div class="wbg-plist">' + list('') + '</div>' +
        '<div class="wbg-pfoot">' + (st.filters[c] !== undefined ? '<button type="button" class="btn small" data-pclear>Clear filter</button>' : '') + '<button type="button" class="btn small" data-pclose>Close</button></div>';
      pop.hidden = false; pop.dataset.col = c;
      var wr = wrap.getBoundingClientRect(), br = btn.getBoundingClientRect();
      pop.style.left = Math.max(4, Math.min(br.left - wr.left + wrap.scrollLeft - 200, wrap.scrollLeft + wrap.clientWidth - 290)) + 'px';
      pop.style.top = (br.bottom - wr.top + wrap.scrollTop + 4) + 'px';
      var ps = pop.querySelector('.wbg-psearch'); ps.focus();
      ps.oninput = function () { pop.querySelector('.wbg-plist').innerHTML = list(ps.value); };
    }
    function closeFilter() { pop.hidden = true; }
    pop.addEventListener('click', function (ev) {
      ev.stopPropagation();
      var c = +pop.dataset.col, pv = ev.target.closest('[data-pv]');
      if (pv) { st.filters[c] = pv.dataset.pv; closeFilter(); st.sel = null; wrap.scrollTop = 0; redraw(); return; }
      if (ev.target.closest('[data-pclear]')) { delete st.filters[c]; closeFilter(); redraw(); return; }
      if (ev.target.closest('[data-pclose]')) closeFilter();
    });
    pop.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { closeFilter(); wrap.focus({ preventScroll: true }); } ev.stopPropagation(); });
    pop.addEventListener('mousedown', function (ev) { ev.stopPropagation(); });
    if (filtInfo) filtInfo.addEventListener('click', function (ev) { var b = ev.target.closest('[data-fx]'); if (!b) return; delete st.filters[+b.dataset.fx]; redraw(); });
    document.addEventListener('mousedown', function (ev) { if (!pop.hidden && !pop.contains(ev.target)) closeFilter(); });

    // ------------------------------------------------------------------ events
    wrap.addEventListener('scroll', function () {
      if (st.raf) return;
      st.raf = requestAnimationFrame(function () {
        st.raf = 0;
        if (st.editing) return;
        var w = windowOf();
        if (w.first < st.win.start || Math.min(w.last, totalRows()) > st.win.end) drawRows();
      });
    }, { passive: true });
    if (search) { var t; search.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { st.q = search.value; st.sel = null; filter(); wrap.scrollTop = 0; drawTotals(); drawRows(); }, 200); }); }
    var dragging = false;
    table.addEventListener('mousedown', function (ev) {
      var fb = ev.target.closest('.wbg-filt');
      if (fb) { ev.preventDefault(); ev.stopPropagation(); if (!pop.hidden && pop.dataset.col === fb.dataset.fc) closeFilter(); else openFilter(+fb.dataset.fc, fb); return; }
      var td = ev.target.closest('tbody td[data-r]'); if (!td || ev.target.classList.contains('wbg-input')) return;
      if (st.editing) commitEdit();
      var r = +td.dataset.r, k = +td.dataset.c;
      if (k < 0) {
        if (ev.shiftKey && st.sel && st.sel.rows) st.sel.r2 = r; else st.sel = { r: r, c: 0, r2: r, c2: st.cols.length - 1, rows: true };
        paintSel(); dragging = 'rows';
      } else { goTo(r, k, ev.shiftKey); dragging = true; }
      wrap.focus({ preventScroll: true });
      ev.preventDefault();
    });
    table.addEventListener('mouseover', function (ev) {
      if (!dragging || !st.sel) return;
      var td = ev.target.closest('tbody td[data-r]'); if (!td) return;
      st.sel.r2 = +td.dataset.r; if (dragging !== 'rows' && +td.dataset.c >= 0) st.sel.c2 = +td.dataset.c;
      paintSel();
    });
    document.addEventListener('mouseup', function () { dragging = false; });
    table.addEventListener('dblclick', function (ev) { var td = ev.target.closest('tbody td[data-r]'); if (!td || +td.dataset.c < 0) return; goTo(+td.dataset.r, +td.dataset.c); startEdit(); });
    wrap.addEventListener('keydown', function (ev) {
      var tg = ev.target; if (tg && tg !== wrap && /^(INPUT|TEXTAREA|BUTTON|SELECT)$/.test(tg.tagName)) return;
      var s = st.sel, mod = ev.ctrlKey || ev.metaKey;
      if (mod && (ev.key === 'z' || ev.key === 'Z')) { if (st.edit && st.edit.onUndo && st.edit.canUndo && !st.busy) { ev.preventDefault(); st.edit.onUndo(); } return; }
      if (!s) return;
      var moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
      if (moves[ev.key]) { ev.preventDefault(); if (s.rows) st.sel = { r: s.r2, c: 0, r2: s.r2, c2: 0 }; goTo(st.sel.r2 + moves[ev.key][0], st.sel.c2 + moves[ev.key][1], ev.shiftKey); return; }
      if (ev.key === 'Escape') { st.sel = null; paintSel(); return; }
      if (!st.edit) return;
      if (ev.key === 'Tab') { ev.preventDefault(); goTo(s.r2, s.c2 + (ev.shiftKey ? -1 : 1)); return; }
      if (ev.key === 'Enter' || ev.key === 'F2') { ev.preventDefault(); startEdit(); return; }
      if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); clearSel(); return; }
      if (!mod && !ev.altKey && ev.key.length === 1 && !s.rows) { ev.preventDefault(); startEdit(ev.key); }
    });
    wrap.addEventListener('copy', function (ev) {
      var tg = ev.target; if (tg && /^(INPUT|TEXTAREA)$/.test(tg.tagName)) return;
      var txt = copySel(); if (!txt) return;
      ev.clipboardData.setData('text/plain', txt); ev.preventDefault();
      say('Copied ' + (selInfo && selInfo.textContent || 'the selection') + '.', 'info');
    });
    wrap.addEventListener('paste', function (ev) {
      var tg = ev.target; if (tg && /^(INPUT|TEXTAREA)$/.test(tg.tagName) && tg !== wrap) return;
      if (!st.edit) return;
      var txt = ev.clipboardData && ev.clipboardData.getData('text/plain'); if (!txt) return;
      ev.preventDefault(); ev.stopPropagation(); pasteText(txt);
    });
    tools.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-g]'); if (!b || b.disabled) return;
      var g = b.dataset.g;
      if (g === 'undo' && st.edit && st.edit.onUndo) st.edit.onUndo();
      if (g === 'del') deleteSel();
      if (g === 'add') {
        if (st.q || Object.keys(st.filters).length) { st.q = ''; if (search) search.value = ''; st.filters = {}; redraw(); }
        wrap.scrollTop = wrap.scrollHeight;
        var k = 0; while (k < st.cols.length && !editable(k)) k++;
        goTo(st.vis.length, k); wrap.focus({ preventScroll: true }); startEdit('');
      }
    });

    return {
      set: function (d) {
        var keep = d.keepView === true;
        st.head = (d.head || []).map(function (h) { return String(h == null ? '' : h); });
        st.rows = d.rows || []; st.hay = null; st.look = d.look || null; st.totals = d.totals || null;
        st.firstRow = d.firstRow || 3; st.nums = d.rowNumbers || null; st.edit = d.edit || null; st.marks = d.marks || null;
        st.cols = d.cols || st.head.map(function (h, i) { return i; });
        host.classList.toggle('wbg-two', !!(st.look && st.look.twoLine));
        host.classList.toggle('wbg-grey', !!(st.look && st.look.grey));
        host.classList.toggle('wbg-editable', !!st.edit);
        if (!keep) {
          if (search) { search.value = ''; st.q = ''; }
          st.filters = {}; st.sel = null; say('');
          closeFilter();
        } else {
          Object.keys(st.filters).forEach(function (c) { if (st.cols.indexOf(+c) < 0) delete st.filters[c]; });
        }
        var top = wrap.scrollTop, left = wrap.scrollLeft;
        cancelEdit();
        filter(); drawHead();
        if (keep) { wrap.scrollTop = top; wrap.scrollLeft = left; } else { wrap.scrollTop = 0; wrap.scrollLeft = 0; }
        drawRows(); updateTools();
      },
      refresh: function () { drawRows(); },
      count: function () { return st.vis.length; },
      busy: function (b) { st.busy = !!b; host.classList.toggle('is-busy', st.busy); updateTools(); },
      note: say,
      select: function (srcRow, srcCol) {
        var r = -1; for (var i = 0; i < st.vis.length; i++) if (st.vis[i].n === srcRow) { r = i; break; }
        var k = st.cols.indexOf(srcCol); if (r >= 0 && k >= 0) goTo(r, k);
      }
    };
  }
  G.PHFSheetGrid = { create: create, parseTsv: parseTsv, VERSION: 'v1.1.0' };
})(window);
