/* PHF Staff Hub · hub-nav.js v1.0.0 (14 Oct 2026)
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
  var GROUPS = [
    { id: 'pos', title: 'POS & Database', blurb: 'Build the POS files and check new products', items: [
      { tool: 'database-build', name: 'Build POS Master Databases', href: './tools/database-build/index.html', status: 'build', desc: 'Clean and merge the POS export with the CH2 and Unique supplier files; saves the POS Database to the Library.', version: 'v21.14.3' },
      { tool: 'pos-supplier-merge', name: 'POS New Product Check Clean', href: './tools/pos-supplier-merge/index.html', status: 'dev', desc: 'Import, update, discontinue and clean products against the POS Database; makes the POSActive INSERT / UPDATE files. (Was POS Supplier Merge.)', version: 'v1.14.0' }
    ] },
    { id: 'orders', title: 'Orders & Reconciliation', blurb: 'Supplier orders and invoices', items: [
      { tool: 'reconcile-ch2', name: 'Reconcile CH2 Order', href: './tools/reconcile-ch2/index.html', status: 'build', desc: 'Match CH2 invoices to the POS back-end order, check prices and discounts, export the POSActive import and the exception report.', version: 'v2.11.2' },
      { tool: 'special-orders', name: 'Customer Special Orders', status: 'soon', desc: 'Track and look up customer special orders.' }
    ] },
    { id: 'suppliers', title: 'Suppliers & Pricing', blurb: 'Contacts, specials and promotions', items: [
      { tool: 'supplier-contacts', name: 'Supplier Contacts', href: './tools/supplier-contacts/index.html', status: 'build', desc: 'Reps, phone numbers, emails and account numbers for every supplier and utility — search, add and edit.', version: 'v1.1.0' },
      { tool: 'update-specials', name: 'Update Specials', href: './tools/update-specials/index.html', status: 'live', desc: 'Build checkout, email and website promotional artwork.' },
      { tool: 'new-products', name: 'New Products', status: 'soon', desc: 'What has landed recently and what is coming in.' }
    ] },
    { id: 'resources', title: 'Resources & Information', blurb: 'Notices, shared files and references', items: [
      { tool: 'noticeboard', name: 'Staff Noticeboard', href: './tools/noticeboard/index.html', status: 'live', desc: 'Recalls, supplier updates, store operations and announcements — read, search and (with the passphrase) add notices.', version: 'v1.0.0' },
      { tool: 'library', name: 'Shared File Library', href: '#libraryPanel', status: 'live', desc: 'Files the tools save for each other in this browser: the POS Database, supplier imports, Ongoing Discounts.' },
      { tool: 'resources', name: 'Resources', status: 'soon', desc: 'Store procedures, guides and reference documents.' }
    ] }
  ];
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
      '<ul class="hn-list" id="hubNavList" role="menubar" aria-label="Staff Hub tools">' + GROUPS.map(function (g) {
        return '<li class="hn-group" data-group="' + g.id + '"><button type="button" class="hn-head" aria-haspopup="true" aria-expanded="false" aria-controls="hn-dd-' + g.id + '" role="menuitem">' + esc(g.title) + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>' +
          '<div class="hn-dd" id="hn-dd-' + g.id + '" role="menu" aria-label="' + esc(g.title) + '" hidden><div class="hn-dd-blurb">' + esc(g.blurb) + '</div>' + g.items.map(function (t) { return itemHtml(t, 'hn-item'); }).join('') + '</div></li>';
      }).join('') + '</ul>' +
      '<div class="hn-search" role="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
      '<input type="search" id="hubSearch" placeholder="Search Staff Hub tools, resources and notices…" aria-label="Search Staff Hub" autocomplete="off" aria-controls="hubResults" aria-expanded="false">' +
      '<button type="button" class="hn-clear" id="hubSearchClear" aria-label="Clear search" hidden>✕</button><div class="hn-results" id="hubResults" role="listbox" hidden></div></div>';
    var heads = Array.prototype.slice.call(host.querySelectorAll('.hn-head'));
    function closeAll(except) { heads.forEach(function (h) { if (h !== except) { h.setAttribute('aria-expanded', 'false'); h.parentNode.classList.remove('is-open'); $('.hn-dd', h.parentNode).hidden = true; } }); }
    function toggle(h) { var on = h.getAttribute('aria-expanded') === 'true'; closeAll(h); h.setAttribute('aria-expanded', on ? 'false' : 'true'); h.parentNode.classList.toggle('is-open', !on); $('.hn-dd', h.parentNode).hidden = on; if (!on) { var f = $('.hn-item', h.parentNode); } }
    heads.forEach(function (h, i) {
      h.addEventListener('click', function () { toggle(h); });
      h.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); var n = heads[(i + (e.key === 'ArrowRight' ? 1 : heads.length - 1)) % heads.length]; n.focus(); if (h.getAttribute('aria-expanded') === 'true') toggle(n); }
        if (e.key === 'ArrowDown') { e.preventDefault(); if (h.getAttribute('aria-expanded') !== 'true') toggle(h); var f = $('.hn-item', h.parentNode); if (f) f.focus(); }
        if (e.key === 'Escape') { closeAll(); h.focus(); }
      });
      $('.hn-dd', h.parentNode).addEventListener('keydown', function (e) {
        var items = Array.prototype.slice.call(this.querySelectorAll('.hn-item')), k = items.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') { e.preventDefault(); (items[k + 1] || items[0]).focus(); }
        if (e.key === 'ArrowUp') { e.preventDefault(); (items[k - 1] || h).focus(); }
        if (e.key === 'Escape') { e.preventDefault(); closeAll(); h.focus(); }
      });
    });
    document.addEventListener('click', function (e) { if (!host.contains(e.target)) { closeAll(); hideResults(); } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeAll(); hideResults(); } });
    var mb = $('#hubMenuBtn'); mb.onclick = function () { var on = mb.getAttribute('aria-expanded') === 'true'; mb.setAttribute('aria-expanded', on ? 'false' : 'true'); host.classList.toggle('is-menu-open', !on); if (on) closeAll(); };
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
    var list = res.notices.filter(function (n) { return !n.archived && n._draft !== 'removed'; }).sort(function (a, b) { return (order[a.priority] - order[b.priority]) || String(b.updated || b.date).localeCompare(String(a.updated || a.date)); }).slice(0, 4);
    var drafts = N.draftCount();
    host.innerHTML = (list.length ? list.map(function (n) {
      var p = N.priority(n.priority);
      return '<a class="np-item np-' + n.priority + '" href="./tools/noticeboard/index.html#' + esc(n.id) + '"><span class="np-top"><span class="phf-pill ' + p.cls + '">' + esc(p.short) + '</span><span class="np-cat">' + esc(n.category) + '</span><span class="np-date">' + esc(N.fmtDate(n.updated || n.date)) + '</span>' + (n._draft ? '<span class="phf-pill is-amber" title="Saved in this browser only — not published">Draft</span>' : '') + '</span>' +
        '<span class="np-title">' + esc(n.title) + '</span><span class="np-sum">' + esc(n.summary || '') + '</span></a>';
    }).join('') : '<div class="np-empty">No active notices.</div>') +
      '<div class="np-foot">' + link + (drafts ? '<span class="np-drafts">' + drafts + ' draft' + (drafts === 1 ? '' : 's') + ' in this browser, not yet published</span>' : '') + '</div>';
  }

  // ---------------------------------------------------------------- search
  var index = null, notices = [];
  function buildIndex() {
    index = [];
    GROUPS.forEach(function (g) {
      index.push({ kind: 'group', title: g.title, where: 'Navigation', text: (g.title + ' ' + g.blurb).toLowerCase(), group: g.id });
      g.items.forEach(function (t) { index.push({ kind: 'tool', title: t.name, where: g.title, status: statusOf(t), text: (t.name + ' ' + t.desc + ' ' + (t.version || '') + ' ' + (STATUS[statusOf(t)] || [''])[0]).toLowerCase(), href: t.href, tool: t.tool, soon: t.status === 'soon' }); });
    });
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
      res.querySelectorAll('[data-open-group]').forEach(function (d) { d.onclick = function () { var h = $('.hn-group[data-group="' + d.dataset.openGroup + '"] .hn-head'); hideResults(); if (h) h.click(); }; });
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
  G.PHFHubNav = { VERSION: 'v1.0.0', GROUPS: GROUPS, refresh: refresh, setNotices: setNotices };
})(window);
