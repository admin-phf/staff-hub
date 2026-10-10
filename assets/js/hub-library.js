/* PHF Staff Hub — Library panel on the home page v1.0.0 (10 Oct 2026): lists the files the tools saved in this
   browser (assets/js/phf-library.js), with Download, ✕ (delete straight away) and Delete all. */
(function () {
  'use strict';
  var L = window.PHFLibrary, $ = function (s) { return document.querySelector(s); };
  if (!L || !$('#libList')) return;
  var urls = [];
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function size(b) { b = b || 0; if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(1) + ' MB'; }
  function render() {
    urls.forEach(function (u) { URL.revokeObjectURL(u); }); urls = [];
    return L.list().then(function (recs) {
      var total = recs.reduce(function (a, r) { return a + (r.size || 0); }, 0);
      $('#libSummary').textContent = recs.length ? recs.length + ' file' + (recs.length === 1 ? '' : 's') + ' · ' + size(total) : 'Empty';
      $('#libClearAll').disabled = !recs.length;
      if (!recs.length) {
        $('#libList').innerHTML = '<div class="phf-lib-empty">Nothing saved yet. Files appear here when Build Master Databases finishes a build, or when you load a reference file (Brand Abbreviation, Weight &amp; Dimensions, Ongoing Discounts, or Reconcile CH2’s reference files).</div>';
        return;
      }
      $('#libList').innerHTML = recs.map(function (r) {
        var info = L.info(r.kind), stale = info.generated && L.isStale(r);
        var url = r.blob ? URL.createObjectURL(r.blob) : ''; if (url) urls.push(url);
        return '<div class="phf-lib-row' + (stale ? ' stale' : '') + '"><span class="phf-lib-dot" aria-hidden="true">' + (stale ? '!' : '✓') + '</span>' +
          '<div class="phf-lib-what"><strong>' + esc(info.label) + '</strong><span>' + esc(r.name) + '</span></div>' +
          '<div class="phf-lib-when"><strong>' + esc(L.when(r)) + '</strong><span>' + esc(L.ago(r)) + (stale ? ' — over a day old' : '') + '</span></div>' +
          '<div class="phf-lib-size">' + size(r.size) + '</div>' +
          '<div class="phf-lib-flow"><strong>Used by</strong><span>' + esc(info.used || '') + '</span><span>' + esc(r.source ? 'Saved by ' + r.source : info.made || '') + '</span></div>' +
          '<div class="phf-lib-btns">' + (url ? '<a class="phf-lib-btn download" href="' + url + '" download="' + esc(r.name) + '">Download</a>' : '') +
          '<button type="button" class="phf-lib-btn del" data-del="' + esc(r.kind) + '" title="Delete ' + esc(info.label) + ' from this browser" aria-label="Delete ' + esc(info.label) + '">✕</button></div></div>';
      }).join('');
      document.querySelectorAll('#libList [data-del]').forEach(function (b) { b.onclick = function () { b.disabled = true; L.remove(b.dataset.del).then(render); }; });
      return L.estimate().then(function (est) {
        $('#libUsage').textContent = est && est.usage != null ? 'This site is using ' + size(est.usage) + (est.quota ? ' of ' + size(est.quota) + ' the browser allows' : '') + '.' : '';
      });
    }).catch(function (e) {
      $('#libSummary').textContent = 'Unavailable';
      $('#libList').innerHTML = '<div class="phf-lib-empty">The Library is not available in this browser (' + esc(e.message) + '). The tools still work with drag and drop.</div>';
    });
  }
  $('#libClearAll').onclick = function () { $('#libClearAll').disabled = true; L.clearAll().then(render); };
  L.onChange(function () { render(); });
  render();
})();
