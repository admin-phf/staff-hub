/* PHF Staff Hub · hub-nav.js v1.1.2 (14 Oct 2026)
 * v1.1.2: a notice on the home page opens in place (full content, action, links) and closes again — no page change.
 * v1.1.1: no In development badge on the tabs (the hover panel still shows it); Supplier Contacts v1.2.0, Reconcile v2.11.3.
 * v1.1.0: tabs are links — click opens the tool straight away, the description panel shows on hover / focus; Kenneth's
 *         order (Customer Special Orders … POS New Product Check Clean) with Bread Orders as a placeholder; search on its own
 *         row under the tabs at every size; preview shows six notices.
 * v1.0.4: the bar is a navy band under the page header — eight equal tabs (icon + name) with the search at its right end.
 * v1.0.3: the search box moved into the page header beside the title (undone in v1.0.4: it crowded the title and the date).
 * v1.0.2: one dense row — each heading is the tool's board icon + name; the row scrolls sideways instead of wrapping.
 * v1.0.1: one heading per tool — the eight from the Staff tools board plus the Staff Noticeboard — instead of four groups.
 * The hub's navigation, search and compact landing page (Staff Hub v21.25.0).
 *  - TOOLS below is the one list of everything the hub offers: group, name, folder, description, status. The horizontal
 *    navigation (one dropdown per group), the compact tool list on the landing page and the search all come from it.
 *    A tool that assets/js/phf-lock-config.js protects shows "In development" (PHFLock.locked), wherever it appears.
 *  - Dropdowns: click a heading to open, click again to close, another heading swaps, click outside or Escape closes,
 *    arrow keys move between headings and items, Tab leaves. Under 760px the headings stack in one Menu button.
 *  - Search (#hubSearch) runs in this browser only, over the groups, tools, descriptions, the Library's file names and the
 *    noticeboard (titles, summaries and content, once the passphrase has been entered). Results open the tool, the
 *    Library or the notice; a protected tool still goes through its password prompt.
 *  - Landing page: the noticeboard preview (#noticePreview: the most urgent / recent published notices) and the compact
 *    tool list (#hubQuick).
 */
(function (G) {
  'use strict';
  // One heading per tool — the eight from the Staff tools board (plus the Staff Noticeboard). Each opens a small panel with
  // the description, status, version and Open. Order = the board's order.
  var TOOLS = [
    { tool: 'special-orders', name: 'Customer Special Orders', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/></svg>', status: 'soon', desc: 'Track and look up customer special orders.' },
    { tool: 'bread-orders', name: 'Bread Orders', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4 3 3 0 0 0-2 3v6H6v-6a3 3 0 0 0-2-3Z"/><path d="M9 12v4M15 12v4"/></svg>', status: 'soon', desc: 'Daily bread orders — what is on order and what has come in.' },
    { tool: 'supplier-contacts', name: 'Supplier Contacts', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M8 17c.8-1.8 2.2-2.6 4-2.6s3.2.8 4 2.6"/></svg>', href: './tools/supplier-contacts/index.html', status: 'build', desc: 'Reps, phone numbers, emails and account numbers for every supplier and utility — search, add and edit.', version: 'Tool v1.2.0' },
    { tool: 'new-products', name: 'New Products', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>', status: 'soon', desc: 'What has landed recently and what is coming in.' },
    { tool: 'resources', name: 'Resources', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 0 2 2h14"/></svg>', status: 'soon', desc: 'Store procedures, guides and reference documents.' },
    { tool: 'noticeboard', name: 'Staff Noticeboard', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/></svg>', href: './tools/noticeboard/index.html', status: 'live', desc: 'Recalls, supplier updates, store operations and announcements — read, search and (with the passphrase) add notices.', version: 'v1.0.0' },
    { tool: 'reconcile-ch2', name: 'Reconcile CH2 Order', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M3 21v-5h5"/></svg>', href: './tools/reconcile-ch2/index.html', status: 'build', desc: 'Drop in the POS back-end order and supplier invoices, reconcile the order and export an exception report.', version: 'v2.11.3' },
    { tool: 'database-build', name: 'Build POS Master Databases', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>', href: './tools/database-build/index.html', status: 'build', desc: 'Cleaning and Merging and Appending CH2 and Unique DB to POS.', version: 'POS v5.2.0 · CH2 v1.2.0 · Unique v1.2.0 · Master v2.4.0' },
    { tool: 'update-specials', name: 'Update Specials', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>', href: './tools/update-specials/index.html', status: 'live', desc: 'Build checkout, email and website promotional artwork. This is now isolated from every other Staff Hub tool.' },
    { tool: 'pos-supplier-merge', name: 'POS New Product Check Clean', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>', href: './tools/pos-supplier-merge/index.html', status: 'dev', desc: 'Import, Update, Discontinue and Clean Products and/or Supplier information against current POS Database.', version: 'Tool v1.14.0 · Engine v6.3.89' },
  ];
  var LIBRARY = { tool: 'library', name: 'Shared File Library', href: '#libraryPanel', status: 'live', desc: 'Files the tools save for each other in this browser: the POS Database, supplier imports, Ongoing Discounts.' };
  var GROUPS = TOOLS.map(function (t) { return { id: t.tool, title: t.name, blurb: '', items: [t], single: true }; });
  var STATUS = { live: ['Live', 'live'], build: ['Build', 'build'], dev: ['In development', 'dev'], soon: ['Soon', 'soon'] };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function locked(t) { return !!(G.PHFLock && t.tool && G.PHFLock.locked(t.tool)); }
  function statusOf(t) { return locked(t) ? 'dev' : t.status; }
  function badge(t) { var s = STATUS[statusOf(t)] || STATUS.build; return '<span class="badge ' + s[1] + '"' + (statusOf(t) === 'dev' && G.PHFLock ? ' title="' + esc(G.PHFLock.devNote) + '"' : '') + '>' + esc(s[0]) + '</span>'; }
  function itemHtml(t, cls) {
    var open = t.href && t.status !== 'soon';
    return (open ? '<a class="' + cls + '" href="' + esc(t.href) + '" data-tool="' + esc(t.tool) + '" role="menuitem">' : '<div class="' + cls + ' is-soon" data-tool="' + esc(t.tool) + '" role="menuitem" aria-disabled="true">') +
      '<span class="hn-item-head"><span class="hn-item-name">' + esc(t.name) + '</span>' + badge(t) + (t.version ? '<span class="hn-ver">' + esc(t.version) + '</span>' : '') + '</span>' +
      '<span class="hn-item-desc">' + esc(t.desc) + '</span>' + (open ? '<span class="hn-item-go">Open</span>' : '<span class="hn-item-go">Coming soon</span>') +
      (open ? '</a>' : '</div>');
  }

  // ---------------------------------------------------------------- navigation
  function renderNav(host) {
    host.innerHTML = '<button type="button" class="hn-menu" id="hubMenuBtn" aria-expanded="false" aria-controls="hubNavList">Menu</button>' +
      '<ul class="hn-list" id="hubNavList" aria-label="Staff Hub tools">' + GROUPS.map(function (g) {
        var t = g.items[0], open = t.href && t.status !== 'soon';
        var inner = (t.icon ? '<span class="hn-ico" aria-hidden="true">' + t.icon + '</span>' : '') + '<span class="hn-lbl"><span>' + esc(g.title) + '</span></span>';
        return '<li class="hn-group' + (open ? '' : ' is-soon') + '" data-group="' + g.id + '">' +
          (open ? '<a class="hn-head" href="' + esc(t.href) + '" data-tool="' + esc(t.tool) + '" aria-describedby="hn-dd-' + g.id + '">' + inner + '</a>'
                : '<span class="hn-head" tabindex="0" data-tool="' + esc(t.tool) + '" aria-describedby="hn-dd-' + g.id + '">' + inner + '</span>') +
          '<div class="hn-dd" id="hn-dd-' + g.id + '" role="tooltip">' + (g.blurb ? '<div class="hn-dd-blurb">' + esc(g.blurb) + '</div>' : '') + g.items.map(function (t) { return itemHtml(t, 'hn-item'); }).join('') + '</div></li>';
      }).join('') + '</ul>';
    // v1.1.0: the search box is its own row under the tabs (hub.css).
    var sh = document.createElement('div'); sh.className = 'hn-search'; sh.setAttribute('role', 'search');
    sh.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
      '<input type="search" id="hubSearch" placeholder="Search Staff Hub tools, resources and notices…" aria-label="Search Staff Hub" autocomplete="off" aria-controls="hubResults" aria-expanded="false">' +
      '<button type="button" class="hn-clear" id="hubSearchClear" aria-label="Clear search" hidden>✕</button><div class="hn-results" id="hubResults" role="listbox" hidden></div>';
    host.appendChild(sh);
    var heads = Array.prototype.slice.call(host.querySelectorAll('.hn-head'));
    heads.forEach(function (h, i) {   // Left / Right move along the tabs; the panel follows focus through CSS (:focus-within)
      h.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); heads[(i + (e.key === 'ArrowRight' ? 1 : heads.length - 1)) % heads.length].focus(); }
        if (e.key === 'Escape') h.blur();
      });
    });
    function closeAll() { host.classList.remove('is-menu-open'); var mb = $('#hubMenuBtn'); if (mb) mb.setAttribute('aria-expanded', 'false'); }
    document.addEventListener('click', function (e) { if (!host.contains(e.target) && !sh.contains(e.target)) hideResults(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideResults(); });
    var mb = $('#hubMenuBtn'); mb.onclick = function () { var on = mb.getAttribute('aria-expanded') === 'true'; if (on) closeAll(); else { mb.setAttribute('aria-expanded', 'true'); host.classList.add('is-menu-open'); } };
    wireSearch();
    if (G.PHFLock && G.PHFLock.mark) G.PHFLock.mark();
  }

  // ---------------------------------------------------------------- landing page
  function renderQuick(host) {
    host.innerHTML = GROUPS.map(function (g) {
      return '<section class="hq-group" aria-labelledby="hq-' + g.id + '"><h3 id="hq-' + g.id + '">' + esc(g.title) + '</h3>' + g.items.map(function (t) { return itemHtml(t, 'hq-item'); }).join('') + '</section>';
    }).join('');
    if (G.PHFLock && G.PHFLock.mark) G.PHFLock.mark();
  }
  function renderNoticePreview(host, res) {
    var N = G.PHFNotices; if (!host || !N) return;
    var link = '<a class="btn small primary" href="./tools/noticeboard/index.html">Open the noticeboard</a>';
    if (res.state === 'locked') { host.innerHTML = '<div class="np-empty">The noticeboard is kept private to staff. ' + link.replace('Open the noticeboard', 'Open it and enter the passphrase') + '</div>'; return; }
    if (res.state === 'empty') { host.innerHTML = '<div class="np-empty">No notices have been published yet. ' + link + '</div>'; return; }
    if (res.state === 'error') { host.innerHTML = '<div class="np-empty">The notices could not be loaded (' + esc(res.error) + '). ' + link + '</div>'; return; }
    var order = { urgent: 0, important: 1, pending: 2, info: 3 };
    var list = res.notices.filter(function (n) { return !n.archived && n._draft !== 'removed'; }).sort(function (a, b) { return (order[a.priority] - order[b.priority]) || String(b.updated || b.date).localeCompare(String(a.updated || a.date)); }).slice(0, 6);
    var drafts = N.draftCount();
    host.innerHTML = (list.length ? list.map(function (n) {
      var p = N.priority(n.priority);
      // v1.1.2: a notice opens in place (click again to close) — the page link is for editing and the full board
      return '<article class="np-item np-' + n.priority + '" data-id="' + esc(n.id) + '"><button type="button" class="np-toggle" aria-expanded="false" aria-controls="np-full-' + esc(n.id) + '">' +
        '<span class="np-top"><span class="phf-pill ' + p.cls + '">' + esc(p.short) + '</span><span class="np-cat">' + esc(n.category) + '</span><span class="np-date">' + esc(N.fmtDate(n.updated || n.date)) + '</span></span>' +
        '<span class="np-title">' + esc(n.title) + '</span><span class="np-sum">' + esc(n.summary || '') + '</span><span class="np-more">Show</span></button>' +
        '<div class="np-full" id="np-full-' + esc(n.id) + '" hidden>' + N.render(n) + '<div class="np-full-foot"><a class="btn small" href="./tools/noticeboard/index.html#' + esc(n.id) + '">Open on the noticeboard</a><button type="button" class="btn small np-close">Close</button></div></div></article>';
    }).join('') : '<div class="np-empty">No active notices.</div>') +
      '<div class="np-foot">' + link + (drafts ? '<span class="np-drafts">' + drafts + ' draft' + (drafts === 1 ? '' : 's') + ' in this browser, not yet published</span>' : '') + '</div>';
    function setOpen(item, on) {
      item.classList.toggle('is-open', on); var b = item.querySelector('.np-toggle'); b.setAttribute('aria-expanded', on ? 'true' : 'false');
      item.querySelector('.np-full').hidden = !on; item.querySelector('.np-more').textContent = on ? 'Hide' : 'Show';
      if (on) item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    host.querySelectorAll('.np-item').forEach(function (item) {
      item.querySelector('.np-toggle').onclick = function () { setOpen(item, !item.classList.contains('is-open')); };
      item.querySelector('.np-close').onclick = function () { setOpen(item, false); item.querySelector('.np-toggle').focus(); };
    });
  }

  // ---------------------------------------------------------------- search
  var index = null, notices = [];
  function buildIndex() {
    index = [];
    GROUPS.forEach(function (g) {
      if (!g.single) index.push({ kind: 'group', title: g.title, where: 'Navigation', text: (g.title + ' ' + g.blurb).toLowerCase(), group: g.id });
      g.items.forEach(function (t) { index.push({ kind: 'tool', title: t.name, where: g.single ? 'Tool' : g.title, status: statusOf(t), text: (t.name + ' ' + t.desc + ' ' + (t.version || '') + ' ' + (STATUS[statusOf(t)] || [''])[0]).toLowerCase(), href: t.href, tool: t.tool, soon: t.status === 'soon' }); });
    });
    index.push({ kind: 'tool', title: LIBRARY.name, where: 'This page', status: 'live', text: (LIBRARY.name + ' ' + LIBRARY.desc).toLowerCase(), href: LIBRARY.href, tool: LIBRARY.tool });
    var N = G.PHFNotices;
    notices.forEach(function (n) { if (n._draft === 'removed') return; index.push({ kind: 'notice', title: n.title, where: 'Staff Noticeboard · ' + n.category + (n.archived ? ' · archived' : ''), text: N.searchText(n), href: './tools/noticeboard/index.html#' + n.id, pri: n.priority, draft: !!n._draft }); });
    document.querySelectorAll('#libList .phf-lib-row .phf-lib-what').forEach(function (el) { var t = (el.textContent || '').trim().replace(/\s+/g, ' '); if (t) index.push({ kind: 'library', title: t.slice(0, 90), where: 'Shared File Library', text: t.toLowerCase(), href: '#libraryPanel' }); });
  }
  function hideResults() { var r = $('#hubResults'), i = $('#hubSearch'); if (r) r.hidden = true; if (i) i.setAttribute('aria-expanded', 'false'); }
  function wireSearch() {
    var inp = $('#hubSearch'), res = $('#hubResults'), clr = $('#hubSearchClear'); if (!inp) return;
    var t = 0, sel = -1;
    function run() {
      var q = inp.value.trim().toLowerCase(); clr.hidden = !q;
      if (!q) { hideResults(); return; }
      if (!index) buildIndex();
      var words = q.split(/\s+/), hits = index.filter(function (e) { return words.every(function (w) { return e.text.indexOf(w) >= 0; }); });
      hits.sort(function (a, b) { var ta = a.title.toLowerCase().indexOf(q) >= 0 ? 0 : 1, tb = b.title.toLowerCase().indexOf(q) >= 0 ? 0 : 1; return ta - tb; });
      hits = hits.slice(0, 12); sel = -1;
      res.innerHTML = hits.length ? hits.map(function (h, i) {
        var tag = h.kind === 'tool' ? (STATUS[h.status] ? '<span class="badge ' + STATUS[h.status][1] + '">' + esc(STATUS[h.status][0]) + '</span>' : '') : h.kind === 'notice' ? '<span class="phf-pill ' + G.PHFNotices.priority(h.pri).cls + '">' + esc(G.PHFNotices.priority(h.pri).short) + '</span>' + (h.draft ? '<span class="phf-pill is-amber">Draft</span>' : '') : '';
        return (h.href && !h.soon ? '<a class="hn-res" role="option" id="hubRes' + i + '" href="' + esc(h.href) + '"' + (h.tool ? ' data-tool="' + esc(h.tool) + '"' : '') + '>' : '<div class="hn-res is-soon" role="option" id="hubRes' + i + '"' + (h.group ? ' data-open-group="' + h.group + '"' : '') + '>') +
          '<span class="hn-res-title">' + esc(h.title) + '</span>' + tag + '<span class="hn-res-where">' + esc(h.where) + '</span>' + (h.href && !h.soon ? '</a>' : '</div>');
      }).join('') : '<div class="hn-res-none">No matching results.</div>';
      res.hidden = false; inp.setAttribute('aria-expanded', 'true');
      if (G.PHFLock && G.PHFLock.mark) G.PHFLock.mark();
      res.querySelectorAll('[data-open-group]').forEach(function (d) { d.onclick = function () { var h = $('.hn-group[data-group="' + d.dataset.openGroup + '"] .hn-head'); hideResults(); if (h) h.focus(); }; });
    }
    inp.addEventListener('input', function () { clearTimeout(t); t = setTimeout(run, 120); });
    inp.addEventListener('focus', function () { if (inp.value.trim()) run(); });
    inp.addEventListener('keydown', function (e) {
      var opts = Array.prototype.slice.call(res.querySelectorAll('.hn-res'));
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { if (res.hidden) run(); e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % (opts.length || 1); opts.forEach(function (o, i) { o.classList.toggle('is-sel', i === sel); }); if (opts[sel]) inp.setAttribute('aria-activedescendant', opts[sel].id); }
      if (e.key === 'Enter' && opts[sel]) { e.preventDefault(); opts[sel].click(); }
      if (e.key === 'Escape') { inp.value = ''; clr.hidden = true; hideResults(); }
    });
    clr.onclick = function () { inp.value = ''; clr.hidden = true; hideResults(); inp.focus(); };
  }
  function setNotices(list) { notices = list || []; index = null; }
  function refresh() { index = null; }

  // ---------------------------------------------------------------- boot
  function boot() {
    var nav = $('#hubNav'); if (nav) renderNav(nav);
    var quick = $('#hubQuick'); if (quick) renderQuick(quick);
    var prev = $('#noticePreview');
    if (G.PHFNotices) {
      G.PHFNotices.load('./').then(function (res) { setNotices(res.notices); if (prev) renderNoticePreview(prev, res); }).catch(function (e) { if (prev) prev.innerHTML = '<div class="np-empty">' + esc(e.message) + '</div>'; });
    }
    var lib = $('#libList'); if (lib && G.MutationObserver) new MutationObserver(refresh).observe(lib, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  G.PHFHubNav = { VERSION: 'v1.1.2', TOOLS: TOOLS, GROUPS: GROUPS, refresh: refresh, setNotices: setNotices };
})(window);
