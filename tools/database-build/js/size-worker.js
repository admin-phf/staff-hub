/* PHF Staff Hub — Build POS Master Databases · size-worker v1.0.0 (12 Oct 2026)
 * SUP SIZE / SUP TYPE for the _pos_db files, worked out with POS New Product Check Clean's own rules
 * (m13ExtractSizeAndType_ in the unchanged merge script, the SIZE / TYPE columns of OUT_MERGED_DATA). The script runs in
 * this worker on the Sheets stand-in, so none of its functions reach the page.
 *   postMessage({ id, texts: ['BIOMEDICA … 60C', …] }) → { id, out: [['60C', 'CAPSULES'], …] }
 */
importScripts('../../pos-supplier-merge/js/sheets-formula.js?v=1.0.1', '../../pos-supplier-merge/js/sheets-shim.js?v=1.0.3');
self.PHFSheetsShim.create({}).install(self);
importScripts('../../pos-supplier-merge/engine/1.0-setup.js?v=6.3.87', '../../pos-supplier-merge/engine/1.3-merge.js?v=6.3.89');
self.onmessage = function (e) {
  var d = e.data || {}, t = d.texts || [], out = new Array(t.length);
  for (var i = 0; i < t.length; i++) {
    var x = null;
    try { x = self.m13ExtractSizeAndType_(String(t[i] == null ? '' : t[i])); } catch (err) { x = null; }
    out[i] = [x && x.size ? String(x.size) : '', x && x.type ? String(x.type) : ''];
  }
  self.postMessage({ id: d.id, out: out });
};
