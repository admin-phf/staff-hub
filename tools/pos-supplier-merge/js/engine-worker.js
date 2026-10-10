/* PHF Staff Hub — POS Supplier New Product Check and Clean Merge · engine-worker v1.0.1 (loads sheets-formula / sheets-shim v1.0.1)
 * engine-worker.js — loads the Sheets stand-in, then the four unchanged
 * POS Supplier Merge Apps Script files (v6.3.88), then the message host.
 * Running in a worker keeps the page responsive during large merges.
 */
importScripts('./sheets-formula.js?v=1.0.1', './sheets-shim.js?v=1.0.1');
self.PHFSheetsShim.create({}).install(self);
importScripts(
  '../engine/1.0-setup.js?v=6.3.87',
  '../engine/1.1-format-clear-popup.js?v=6.3.87',
  '../engine/1.2-highlight-new-products-best-buy.js?v=6.3.87',
  '../engine/1.3-merge.js?v=6.3.88'
);
importScripts('./engine-host.js?v=1.0.0');
