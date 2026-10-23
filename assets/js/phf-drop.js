/* PHF Staff Hub — forgiving file drops v1.0.0 (23 Oct 2026, Staff Hub v21.42.0)
 * One file or several, dropped anywhere on a tool page, go to that tool's "Drop files here" box (#bulkInput → the tool's own
 * handler, which recognises each file and puts it on its row). A drop on a row, a card or any other place that takes files is
 * left to that place. While files are dragged over the page the drop box lights up and a short note says where they go.
 * Before this, a file let go outside the boxes made the browser open or download it instead.
 */
(function (g) {
  'use strict';
  var timer = null;
  function hasFiles(e) { var t = e.dataTransfer && e.dataTransfer.types; return !!t && Array.prototype.indexOf.call(t, 'Files') >= 0; }
  function lit(on) {
    var z = document.querySelector('#bulkDrop');
    document.body.classList.toggle('phf-file-drag', on);
    if (z) z.classList.toggle('drag', on);
  }
  document.addEventListener('dragover', function (e) {
    if (!hasFiles(e) || !document.querySelector('#bulkInput')) return;
    if (!e.defaultPrevented) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }
    lit(true); clearTimeout(timer); timer = setTimeout(function () { lit(false); }, 250);
  });
  document.addEventListener('drop', function (e) {
    clearTimeout(timer); lit(false);
    var input = document.querySelector('#bulkInput');
    if (!hasFiles(e) || !input || e.defaultPrevented) return;   // a row or box took it
    e.preventDefault();
    var files = e.dataTransfer.files; if (!files || !files.length) return;
    if (typeof input.onchange !== 'function') return;          // the tool has not started yet (its password)
    var dt = new DataTransfer(); Array.prototype.forEach.call(files, function (f) { dt.items.add(f); });
    input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  g.PHFDrop = { VERSION: 'v1.0.0' };
})(window);
