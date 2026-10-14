/* PHF Staff Hub — Staff Noticeboard · noticeboard.js v1.0.0 (14 Oct 2026)
 * Reads, filters and (with the passphrase) edits the notices that assets/js/phf-notices.js keeps. Every notice is either
 * PUBLISHED (in data/notices.enc.json on GitHub, seen by all staff) or a DRAFT (saved in this browser only, shown with an
 * amber Draft label) until it is published: "Download notices file" → commit data/notices.enc.json with GitHub Desktop,
 * or "Publish to GitHub" with a fine-grained token kept in this browser. Nothing here touches the other tools.
 */
(function () {
  'use strict';
  var N = window.PHFNotices, $ = function (s, r) { return (r || document).querySelector(s); }, esc = N.esc;
  var view = { q: '', cat: '', pri: '', show: 'active', sort: 'recent', open: {}, editing: null, msg: '' };

  function boot() {
    wireTools();
    N.load('../../').then(function (res) { reconcileDrafts(); render(res); }).catch(function (e) { gate('<strong>The notices could not be loaded.</strong> ' + esc(e.message)); });
  }
  // A draft identical to what is now published (the file was committed) is no longer a draft.
  function reconcileDrafts() {
    if (N.state() !== 'open') return;
    var pub = {}; N.published().forEach(function (n) { pub[n.id] = JSON.stringify(sorted(n)); });
    var d = N.drafts();
    Object.keys(d.items).forEach(function (id) { if (pub[id] && pub[id] === JSON.stringify(sorted(d.items[id]))) N.restoreDraft(id); });
    (d.removed || []).forEach(function (id) { if (!pub[id]) N.restoreDraft(id); });
  }
  function sorted(o) { var out = {}; Object.keys(o).filter(function (k) { return k.charAt(0) !== '_'; }).sort().forEach(function (k) { out[k] = o[k]; }); return out; }

  // ------------------------------------------------------------- gate (passphrase) and status strip
  function gate(html) { var g = $('#ntcGate'); g.hidden = false; g.innerHTML = '<div class="ntc-card">' + html + '</div>'; }
  function askPassphrase(res) {
    gate('<div class="ntc-gate-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></div><h2>Staff noticeboard — private to staff</h2>' +
      '<p>The notices are published encrypted, so only a browser with the staff passphrase can read them. Enter it once; this browser remembers it until you choose Forget.</p>' +
      '<form class="ntc-pw"><label>Passphrase<input type="password" name="pw" autocomplete="current-password" required></label><div class="ntc-err" role="alert"></div><div class="ntc-actions"><button type="submit" class="btn primary">Open the noticeboard</button><a class="btn" href="../../index.html">Back to Staff Hub</a></div></form>' +
      (res.file ? '<p class="ntc-fine">Published file: ' + res.file.count + ' notice' + (res.file.count === 1 ? '' : 's') + ', updated ' + esc(res.file.updatedAt) + '.</p>' : ''));
    var form = $('#ntcGate form'), err = $('#ntcGate .ntc-err');
    form.onsubmit = function (e) {
      e.preventDefault(); err.textContent = 'Checking…';
      N.unlock(form.pw.value).then(function (ok) { if (!ok) { err.textContent = 'That passphrase is not right.'; form.pw.select(); return; } $('#ntcGate').hidden = true; reconcileDrafts(); render({ state: 'open', notices: N.all() }); });
    };
    setTimeout(function () { form.pw.focus(); }, 30);
  }
  function renderStatus() {
    var s = $('#ntcStatus'), f = N.fileInfo(), drafts = N.draftCount(), tok = !!N.token();
    s.hidden = false;
    s.innerHTML = '<div class="ntc-pub"><span class="phf-pill is-green">Published</span><span>' + (f ? f.count + ' notice' + (f.count === 1 ? '' : 's') + ' on GitHub · file updated ' + esc(f.updatedAt) : 'nothing published yet') + ' — what every staff member with the passphrase sees.</span></div>' +
      '<div class="ntc-drafts' + (drafts ? ' has-drafts' : '') + '"><span class="phf-pill is-amber">Drafts</span><span>' + (drafts ? drafts + ' change' + (drafts === 1 ? '' : 's') + ' saved in <strong>this browser only</strong> — nobody else sees them until published.' : 'none — this browser matches what is published.') + '</span>' +
      (drafts ? '<span class="ntc-btns"><button type="button" class="btn small primary" id="ntcDownload" title="Make the encrypted notices file with these changes, to commit to data/ with GitHub Desktop">Download notices file</button><button type="button" class="btn small" id="ntcPublish" title="' + (tok ? 'Write data/notices.enc.json to GitHub now with the token saved in this browser' : 'Set a GitHub token first (Token button)') + '">Publish to GitHub</button><button type="button" class="btn small danger" id="ntcDiscard" title="Throw away every draft in this browser">Discard drafts</button></span>' : '') + '</div>' +
      '<div class="ntc-keys"><button type="button" class="btn small" id="ntcPass" title="Change the staff passphrase (re-encrypts every notice; publish afterwards and tell staff the new one)">Passphrase…</button><button type="button" class="btn small" id="ntcForget" title="Forget the passphrase in this browser — it will be asked for again">Forget on this browser</button><button type="button" class="btn small" id="ntcToken">' + (tok ? 'GitHub token ✓' : 'GitHub token…') + '</button></div>' +
      (view.msg ? '<div class="status ' + (view.msgType || 'info') + '">' + view.msg + '</div>' : '');
    var dl = $('#ntcDownload'); if (dl) dl.onclick = downloadFile;
    var pb = $('#ntcPublish'); if (pb) pb.onclick = publishNow;
    var dc = $('#ntcDiscard'); if (dc) dc.onclick = function () { N.discardDrafts(); say('Drafts discarded — this browser shows the published notices again.', 'info'); redraw(); };
    $('#ntcPass').onclick = changePassphrase;
    $('#ntcForget').onclick = function () { N.forgetKey(); location.reload(); };
    $('#ntcToken').onclick = tokenDialog;
  }
  function say(m, type) { view.msg = m; view.msgType = type || 'info'; }

  // ------------------------------------------------------------- publishing
  function downloadFile() {
    N.exportFile().then(function (o) {
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([o.text], { type: 'application/json' })); a.download = o.name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      N.afterDownload();
      say('<strong>notices.enc.json downloaded</strong> (' + o.file.count + ' notice' + (o.file.count === 1 ? '' : 's') + ', encrypted with the current passphrase). To publish: open the Staff Hub repository in GitHub Desktop, replace <code>data/notices.enc.json</code> with this file, commit and push. Once GitHub Pages has published it, reload this page — the drafts clear by themselves when they match the published file. Until then they stay marked Draft in this browser.', 'ok');
      redraw();
    }).catch(function (e) { say('Could not make the file: ' + esc(e.message), 'error'); redraw(); });
  }
  function publishNow() {
    if (!N.token()) { tokenDialog(); return; }
    say('Publishing to GitHub…', 'running'); redraw();
    N.publish().then(function (r) { say('<strong>Published to GitHub</strong> — data/notices.enc.json committed' + (r.url ? ' (<a href="' + esc(r.url) + '" target="_blank" rel="noopener">view on GitHub</a>)' : '') + '. GitHub Pages shows it to everyone within a minute or two; the drafts in this browser are now the published notices.', 'ok'); redraw(); })
      .catch(function (e) { say('<strong>Publish failed:</strong> ' + esc(e.message) + ' — the drafts are still in this browser. Check the token (contents: read and write on admin-phf/staff-hub) or use Download notices file instead.', 'error'); redraw(); });
  }
  function tokenDialog() {
    var cur = N.token();
    openDialog('<h2>GitHub token for one-click publishing</h2>' +
      '<p>Publish to GitHub writes <code>data/notices.enc.json</code> straight to the repository, so staff see new notices without anyone touching the code. It needs a <strong>fine-grained personal access token</strong> from GitHub (Settings → Developer settings → Fine-grained tokens): repository <code>admin-phf/staff-hub</code> only, permission <strong>Contents: Read and write</strong>, an expiry you are comfortable with.</p>' +
      '<p>The token is kept in <strong>this browser only</strong> (its local storage) — it is never written to the repository or sent anywhere but api.github.com. Treat it like a password: use Forget token on a shared computer.</p>' +
      '<form><label>Token<input type="password" name="t" autocomplete="off" value="' + esc(cur) + '" placeholder="github_pat_…"></label><div class="ntc-err" role="alert"></div>' +
      '<div class="ntc-actions">' + (cur ? '<button type="button" class="btn danger" data-x="forget">Forget token</button>' : '') + '<button type="button" class="btn" data-x="cancel">Cancel</button><button type="submit" class="btn primary">Save in this browser</button></div></form>',
      function (dlg, close) {
        var f = $('form', dlg);
        f.onsubmit = function (e) { e.preventDefault(); var t = f.t.value.trim(); if (!t) { $('.ntc-err', dlg).textContent = 'Paste the token first.'; return; } N.token(t); close(); say('GitHub token saved in this browser.', 'ok'); redraw(); };
        var fg = $('[data-x="forget"]', dlg); if (fg) fg.onclick = function () { N.token(''); close(); say('GitHub token forgotten on this browser.', 'info'); redraw(); };
      });
  }
  function changePassphrase() {
    openDialog('<h2>Change the staff passphrase</h2><p>Every notice is re-encrypted with the new passphrase. Publish the new file afterwards (Download notices file or Publish to GitHub) and give staff the new passphrase — the old one stops working as soon as the new file is on GitHub. Use a phrase of a few words.</p>' +
      '<form><label>New passphrase<input type="password" name="a" autocomplete="new-password" required></label><label>Type it again<input type="password" name="b" autocomplete="new-password" required></label><div class="ntc-err" role="alert"></div>' +
      '<div class="ntc-actions"><button type="button" class="btn" data-x="cancel">Cancel</button><button type="submit" class="btn primary">Re-encrypt and download</button></div></form>',
      function (dlg, close) {
        var f = $('form', dlg), err = $('.ntc-err', dlg);
        f.onsubmit = function (e) {
          e.preventDefault();
          if (f.a.value.length < 8) { err.textContent = 'Use at least 8 characters.'; return; }
          if (f.a.value !== f.b.value) { err.textContent = 'The two passphrases are not the same.'; return; }
          err.textContent = 'Re-encrypting…';
          N.setPassphrase(f.a.value).then(function (o) {
            var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([o.text], { type: 'application/json' })); a.download = o.name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
            close(); say('<strong>Re-encrypted with the new passphrase and downloaded.</strong> Commit <code>data/notices.enc.json</code> (or Publish to GitHub) — until then the published file still uses the old passphrase. This browser already uses the new one.', 'ok'); redraw();
          }).catch(function (x) { err.textContent = x.message; });
        };
      });
  }
  function openDialog(html, wire) {
    var o = document.createElement('div'); o.className = 'ntc-overlay'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true');
    o.innerHTML = '<div class="ntc-card ntc-dialog">' + html + '</div>'; document.body.appendChild(o);
    var close = function () { o.remove(); };
    o.querySelectorAll('[data-x="cancel"]').forEach(function (b) { b.onclick = close; });
    o.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    var f = o.querySelector('input'); if (f) setTimeout(function () { f.focus(); }, 30);
    if (wire) wire(o, close);
  }

  // ------------------------------------------------------------- list
  function wireTools() {
    var t = 0;
    $('#ntcSearch').oninput = function () { clearTimeout(t); t = setTimeout(function () { view.q = $('#ntcSearch').value.trim().toLowerCase(); renderList(); }, 150); };
    $('#ntcCategory').onchange = function () { view.cat = this.value; renderList(); };
    $('#ntcPriority').onchange = function () { view.pri = this.value; renderList(); };
    $('#ntcSort').onchange = function () { view.sort = this.value; renderList(); };
    document.querySelectorAll('#ntcTools [data-show]').forEach(function (b) { b.onclick = function () { view.show = b.dataset.show; document.querySelectorAll('#ntcTools [data-show]').forEach(function (x) { x.classList.toggle('is-on', x === b); }); renderList(); }; });
    $('#ntcAdd').onclick = function () { edit(null); };
    $('#ntcPriority').innerHTML = '<option value="">All priorities</option>' + N.PRIORITIES.map(function (p) { return '<option value="' + p.id + '">' + esc(p.label) + '</option>'; }).join('');
  }
  function render(res) {
    if (res.state === 'locked') { askPassphrase(res); return; }
    if (res.state === 'error') { gate('<strong>The notices could not be loaded.</strong> ' + esc(res.error)); return; }
    if (res.state === 'empty') { gate('<h2>No notices have been published yet</h2><p>The published file <code>data/notices.enc.json</code> is not in the repository. Set a passphrase, add the first notice and publish it.</p><p><button type="button" class="btn primary" id="ntcFirst">Set a passphrase and start</button></p>'); $('#ntcFirst').onclick = changePassphrase; return; }
    $('#ntcGate').hidden = true; $('#ntcTools').hidden = false;
    redraw();
    if (location.hash) { var id = location.hash.slice(1); view.open[id] = true; renderList(); var el = document.getElementById('ntc-' + id); if (el) el.scrollIntoView({ block: 'start' }); }
  }
  function redraw() { renderStatus(); fillCategories(); renderList(); }
  function fillCategories() {
    var cats = {}; N.CATEGORIES.forEach(function (c) { cats[c] = 1; }); N.all().forEach(function (n) { if (n.category) cats[n.category] = 1; });
    var sel = $('#ntcCategory'), cur = sel.value;
    sel.innerHTML = '<option value="">All categories</option>' + Object.keys(cats).map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join('');
    sel.value = cur;
  }
  var ORDER = { urgent: 0, important: 1, pending: 2, info: 3 };
  function filtered() {
    return N.all().filter(function (n) {
      if (view.show === 'active' && (n.archived || n._draft === 'removed')) return false;
      if (view.show === 'archived' && !n.archived) return false;
      if (view.cat && n.category !== view.cat) return false;
      if (view.pri && n.priority !== view.pri) return false;
      if (view.q && N.searchText(n).indexOf(view.q) < 0) return false;
      return true;
    }).sort(function (a, b) {
      if (view.sort === 'title') return String(a.title).localeCompare(String(b.title));
      if (view.sort === 'priority') return (ORDER[a.priority] - ORDER[b.priority]) || String(b.updated || b.date).localeCompare(String(a.updated || a.date));
      return String(b.updated || b.date).localeCompare(String(a.updated || a.date));
    });
  }
  function renderList() {
    var list = filtered(), host = $('#ntcList'), canEdit = N.hasKey();
    host.innerHTML = list.length ? list.map(function (n) {
      var p = N.priority(n.priority), open = !!view.open[n.id];
      return '<article class="ntc-item ntc-' + n.priority + (n.archived ? ' is-archived' : '') + (n._draft ? ' is-draft' : '') + (n._draft === 'removed' ? ' is-removed' : '') + '" id="ntc-' + esc(n.id) + '">' +
        '<button type="button" class="ntc-head" aria-expanded="' + open + '" data-toggle="' + esc(n.id) + '">' +
        '<span class="ntc-meta"><span class="phf-pill ' + p.cls + '">' + esc(p.label) + '</span><span class="ntc-cat">' + esc(n.category) + '</span>' + (n.archived ? '<span class="phf-pill is-grey">Archived</span>' : '') +
        (n._draft ? '<span class="phf-pill is-amber" title="Saved in this browser only — not published">Draft' + (n._draft === 'new' ? ' · new' : n._draft === 'removed' ? ' · removed' : ' · edited') + '</span>' : '') +
        '<span class="ntc-date">' + (n.updated && n.updated !== n.date ? 'Updated ' + esc(N.fmtDate(n.updated)) + ' · posted ' + esc(N.fmtDate(n.date)) : 'Posted ' + esc(N.fmtDate(n.date))) + '</span></span>' +
        '<span class="ntc-title">' + esc(n.title) + '</span>' + (n.summary ? '<span class="ntc-sum">' + esc(n.summary) + '</span>' : '') +
        '<span class="ntc-chev" aria-hidden="true">' + (open ? 'Hide' : 'Show') + '</span></button>' +
        (open ? '<div class="ntc-full">' + N.render(n) + (canEdit ? '<div class="ntc-edit-btns"><button type="button" class="btn small" data-edit="' + esc(n.id) + '">Edit</button>' + (n._draft === 'removed' ? '<button type="button" class="btn small" data-restore="' + esc(n.id) + '">Restore</button>' : '<button type="button" class="btn small" data-archive="' + esc(n.id) + '">' + (n.archived ? 'Unarchive' : 'Archive') + '</button><button type="button" class="btn small danger" data-remove="' + esc(n.id) + '">Remove</button>') + (n._draft && n._draft !== 'removed' && N.published().some(function (x) { return x.id === n.id; }) ? '<button type="button" class="btn small" data-restore="' + esc(n.id) + '">Discard this draft</button>' : '') + '</div>' : '') + '</div>' : '') +
        '</article>';
    }).join('') : '<div class="ntc-empty">' + (view.q || view.cat || view.pri ? 'No notices match the search / filters.' : view.show === 'archived' ? 'No archived notices.' : 'No active notices.') + '</div>';
    host.querySelectorAll('[data-toggle]').forEach(function (b) { b.onclick = function () { view.open[b.dataset.toggle] = !view.open[b.dataset.toggle]; renderList(); }; });
    host.querySelectorAll('[data-edit]').forEach(function (b) { b.onclick = function () { edit(N.all().filter(function (n) { return n.id === b.dataset.edit; })[0]); }; });
    host.querySelectorAll('[data-archive]').forEach(function (b) { b.onclick = function () { var n = N.all().filter(function (x) { return x.id === b.dataset.archive; })[0]; n.archived = !n.archived; N.saveDraft(n); say((n.archived ? 'Archived' : 'Unarchived') + ' as a draft in this browser — publish to share it.', 'info'); redraw(); }; });
    host.querySelectorAll('[data-remove]').forEach(function (b) { b.onclick = function () { N.removeDraft(b.dataset.remove); say('Removed as a draft in this browser — publish to share it.', 'info'); redraw(); }; });
    host.querySelectorAll('[data-restore]').forEach(function (b) { b.onclick = function () { N.restoreDraft(b.dataset.restore); say('Back to the published version.', 'info'); redraw(); }; });
  }

  // ------------------------------------------------------------- editor
  function edit(n) {
    if (!N.hasKey()) { say('Enter the passphrase before adding or editing notices.', 'warn'); redraw(); return; }
    var isNew = !n; n = n || { title: '', category: N.CATEGORIES[0], priority: 'info', date: N.today(), summary: '', body: '', action: '', links: [], archived: false };
    var ed = $('#ntcEditor'); ed.hidden = false;
    ed.innerHTML = '<div class="ntc-card"><h2>' + (isNew ? 'New notice' : 'Edit notice') + '</h2><p class="ntc-fine">Saving keeps the notice as a <strong>draft in this browser</strong>. Nobody else sees it until you publish (Download notices file, or Publish to GitHub).</p>' +
      '<form class="ntc-form"><div class="ntc-row"><label>Title<input name="title" required value="' + esc(n.title) + '"></label><label>Date posted<input type="date" name="date" value="' + esc(n.date) + '"></label></div>' +
      '<div class="ntc-row"><label>Category<select name="category">' + N.CATEGORIES.concat(N.CATEGORIES.indexOf(n.category) < 0 && n.category ? [n.category] : []).map(function (c) { return '<option' + (c === n.category ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '<option value="__new">Other (type below)…</option></select></label>' +
      '<label class="ntc-newcat" hidden>New category<input name="newcat"></label><label>Priority<select name="priority">' + N.PRIORITIES.map(function (p) { return '<option value="' + p.id + '"' + (p.id === n.priority ? ' selected' : '') + '>' + esc(p.label) + '</option>'; }).join('') + '</select></label></div>' +
      '<label>Short summary<textarea name="summary" rows="2">' + esc(n.summary) + '</textarea></label>' +
      '<label>Full content <small>## Heading · ### Sub-heading · - list item · 1. step · **bold** · [link text](https://…) · blank line between paragraphs</small><textarea name="body" rows="16">' + esc(n.body) + '</textarea></label>' +
      '<label>Action required <small>(optional — shown in its own box)</small><textarea name="action" rows="2">' + esc(n.action || '') + '</textarea></label>' +
      '<label>Links, documents or attachments <small>(optional — one per line: Label | https://…)</small><textarea name="links" rows="2">' + esc((n.links || []).map(function (l) { return (l.label || '') + ' | ' + l.url; }).join('\n')) + '</textarea></label>' +
      '<label class="ntc-check"><input type="checkbox" name="archived"' + (n.archived ? ' checked' : '') + '> Archived (kept, but out of the active list)</label>' +
      '<div class="ntc-err" role="alert"></div><div class="ntc-actions"><button type="button" class="btn" data-x="cancel">Cancel</button><button type="submit" class="btn primary">Save draft in this browser</button></div></form></div>';
    ed.scrollIntoView({ block: 'start' });
    var f = $('form', ed), err = $('.ntc-err', ed);
    f.category.onchange = function () { $('.ntc-newcat', ed).hidden = f.category.value !== '__new'; };
    $('[data-x="cancel"]', ed).onclick = function () { ed.hidden = true; ed.innerHTML = ''; };
    f.onsubmit = function (e) {
      e.preventDefault();
      var cat = f.category.value === '__new' ? f.newcat.value.trim() : f.category.value;
      if (!f.title.value.trim()) { err.textContent = 'Give the notice a title.'; return; }
      if (!cat) { err.textContent = 'Type the new category.'; return; }
      var links = f.links.value.split('\n').map(function (l) { var m = l.split('|'); var url = (m.length > 1 ? m[1] : m[0]).trim(); return url ? { label: (m.length > 1 ? m[0] : '').trim() || url, url: url } : null; }).filter(Boolean);
      var saved = N.saveDraft({ id: n.id, title: f.title.value.trim(), category: cat, priority: f.priority.value, date: f.date.value || N.today(), summary: f.summary.value.trim(), body: f.body.value.replace(/\r\n?/g, '\n'), action: f.action.value.trim(), links: links, archived: f.archived.checked });
      ed.hidden = true; ed.innerHTML = ''; view.open[saved.id] = true;
      say('<strong>Saved as a draft in this browser.</strong> It is not published yet — use Download notices file or Publish to GitHub when it is ready.', 'ok'); redraw();
      var el = document.getElementById('ntc-' + saved.id); if (el) el.scrollIntoView({ block: 'start' });
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
