/* PHF Staff Hub — POS Supplier New Product Check and Clean Merge · sheet-grid.js v1.0.0 (11 Oct 2026)
 * A read-only sheet for the workbook tabs (OUT_POS_INSERT, OUT_POS_UPDATE, the SRC_ tabs, TMP_MERGED_POS_DATA and
 * OUT_MERGED_DATA's all-columns view): row numbers, column letters, the Sheet's heading row, every data row, banded
 * rows and status colours. Only the rows near the scroll position are drawn (gap rows stand in for the rest), so
 * 34,000 POS rows scroll as smoothly as 30. Text can be selected and copied.
 *
 *   var g = PHFSheetGrid.create(hostElement, { search: true });
 *   g.set({ head: [...], rows: [[...], ...], firstRow: 3, rowNumbers: [3, 7, …] (optional, the Sheet row of each row),
 *           accent: function (head, value) { return ['FCE8E6', 'D93025'] | null } });
 *   g.refresh();   // after the host becomes visible
 */
(function (G) {
  'use strict';
  var BUF = 40;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function colLetter(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
  function cellText(v) { return v == null ? '' : String(v).replace(/\r?\n/g, ' · '); }
  var NUMLIKE = /^-?\$?[\d,]*\.?\d+%?$/;

  function create(host, opts) {
    opts = opts || {};
    host.innerHTML =
      (opts.search === false ? '' : '<div class="wbg-tools"><input type="search" class="wbg-search" placeholder="Search this sheet…" aria-label="Search this sheet"><span class="wbg-count"></span></div>') +
      '<div class="wbg-wrap" tabindex="0"><table class="wbg-table"><colgroup></colgroup><thead></thead><tbody></tbody></table></div>';
    var wrap = host.querySelector('.wbg-wrap'), table = host.querySelector('.wbg-table'), search = host.querySelector('.wbg-search'), count = host.querySelector('.wbg-count');
    var st = { head: [], rows: [], vis: [], q: '', hay: null, accent: null, firstRow: 3, nums: null, rowH: 25, win: { start: 0, end: 0 }, raf: 0, numCols: {} };

    function widths() {
      var n = st.head.length, w = [];
      for (var c = 0; c < n; c++) {
        var len = String(st.head[c] || '').length * 0.8 + 2, sample = Math.min(st.rows.length, 300);
        for (var r = 0; r < sample; r++) { var l = cellText(st.rows[r][c]).length; if (l > len) len = l; }
        w.push(Math.max(56, Math.min(320, Math.round(len * 7.2 + 18))));
      }
      return w;
    }
    function drawHead() {
      var w = widths(), total = 52;
      table.querySelector('colgroup').innerHTML = '<col style="width:52px">' + w.map(function (x) { total += x; return '<col style="width:' + x + 'px">'; }).join('');
      table.style.width = total + 'px';
      // Number-like columns (most values look like numbers) are right-aligned, like a sheet.
      st.numCols = {};
      for (var c = 0; c < st.head.length; c++) {
        var num = 0, seen = 0;
        for (var r = 0; r < Math.min(st.rows.length, 200); r++) { var s = cellText(st.rows[r][c]); if (!s) continue; seen++; if (NUMLIKE.test(s) && !/^0\d/.test(s)) num++; }
        if (seen && num / seen > 0.8 && !/BARCODE|MAIN ID|PLU|SUB ID|ACCNO|NUMBER|INDEX/i.test(st.head[c])) st.numCols[c] = 1;
      }
      table.querySelector('thead').innerHTML = '<tr><th class="wbg-rn"><span class="wbg-col">&nbsp;</span>' + (st.firstRow - 1) + '</th>' +
        st.head.map(function (h, c) { return '<th title="' + esc(h) + '"><span class="wbg-col">' + colLetter(c + 1) + '</span>' + esc(h) + '</th>'; }).join('') + '</tr>';
    }
    function headH() { var th = table.querySelector('thead'); return th ? th.offsetHeight : 52; }
    function windowOf() {
      var total = st.vis.length, rh = st.rowH, top = Math.max(0, wrap.scrollTop - headH()), h = wrap.clientHeight || 640;
      var first = Math.floor(top / rh), last = first + Math.ceil(h / rh);
      return { first: first, last: last, start: Math.max(0, Math.min(first, total) - BUF), end: Math.min(total, last + BUF) };
    }
    function gap(px) { return px > 0 ? '<tr class="wbg-gap" aria-hidden="true"><td colspan="' + (st.head.length + 1) + '" style="height:' + Math.round(px) + 'px"></td></tr>' : ''; }
    function rowHtml(i) {
      var e = st.vis[i], r = e.r, cells = '<td class="wbg-rn">' + (st.nums ? st.nums[e.n] : e.n + st.firstRow) + '</td>';
      for (var c = 0; c < st.head.length; c++) {
        var raw = r[c], s = cellText(raw), a = st.accent && s ? st.accent(st.head[c], raw) : null;
        var style = a ? ' style="' + (a[0] ? 'background:#' + a[0] + ';' : '') + (a[1] ? 'color:#' + a[1] + ';font-weight:700' : '') + '"' : '';
        cells += '<td' + (st.numCols[c] ? ' class="wbg-num"' : '') + style + (s.length > 14 ? ' title="' + esc(raw) + '"' : '') + '>' + esc(s) + '</td>';
      }
      return '<tr class="wbg-b' + (e.n % 2) + '">' + cells + '</tr>';
    }
    function drawRows() {
      var body = table.querySelector('tbody'), w = windowOf(), html = [gap(w.start * st.rowH)];
      for (var i = w.start; i < w.end; i++) html.push(rowHtml(i));
      html.push(gap((st.vis.length - w.end) * st.rowH));
      if (!st.vis.length) html = ['<tr><td class="wbg-empty" colspan="' + (st.head.length + 1) + '">' + (st.q ? 'No rows match the search.' : 'No rows.') + '</td></tr>'];
      body.innerHTML = html.join('');
      st.win = { start: w.start, end: w.end };
      var tr = body.querySelector('tr.wbg-b0, tr.wbg-b1');
      if (tr) { var h = tr.getBoundingClientRect().height; if (h > 10 && Math.abs(h - st.rowH) > 0.5) { st.rowH = h; drawRows(); } }
    }
    function filter() {
      var q = st.q.trim().toUpperCase();
      if (q && !st.hay) st.hay = st.rows.map(function (r) { return r.map(cellText).join(' ').toUpperCase(); });
      st.vis = [];
      for (var i = 0; i < st.rows.length; i++) if (!q || st.hay[i].indexOf(q) >= 0) st.vis.push({ r: st.rows[i], n: i });
      if (count) count.textContent = (q ? st.vis.length.toLocaleString('en-AU') + ' of ' : '') + st.rows.length.toLocaleString('en-AU') + ' rows';
    }
    wrap.addEventListener('scroll', function () {
      if (st.raf) return;
      st.raf = requestAnimationFrame(function () {
        st.raf = 0;
        var w = windowOf();
        if (w.first < st.win.start || Math.min(w.last, st.vis.length) > st.win.end) drawRows();
      });
    }, { passive: true });
    if (search) { var t; search.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { st.q = search.value; filter(); wrap.scrollTop = 0; drawRows(); }, 200); }); }

    return {
      set: function (d) {
        st.head = (d.head || []).map(function (h) { return String(h == null ? '' : h); });
        st.rows = d.rows || []; st.hay = null; st.accent = d.accent || null; st.firstRow = d.firstRow || 3; st.nums = d.rowNumbers || null;
        if (search && d.keepSearch !== true) { search.value = ''; st.q = ''; }
        filter(); drawHead(); wrap.scrollTop = 0; wrap.scrollLeft = 0; drawRows();
      },
      refresh: function () { drawRows(); },
      count: function () { return st.vis.length; }
    };
  }
  G.PHFSheetGrid = { create: create, VERSION: 'v1.0.0' };
})(window);
