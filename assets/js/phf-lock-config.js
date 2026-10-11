/* PHF Staff Hub — tool password locks (assets/js/phf-lock-config.js).
 * Made by a tool's Set password button (12/10/2026 08:52). Each entry is a PBKDF2-SHA-256 hash with a random salt —
 * the password itself is not stored. Commit this file to lock / unlock the tools listed. An empty list = no locks. */
window.PHF_LOCK_CONFIG = {
  "version": 1,
  "tools": {
    "pos-supplier-merge": {
      "label": "POS Supplier New Product Check and Clean Merge",
      "salt": "309c179d4faa93b518a9e6e0f418617d",
      "hash": "9166e8129bd4424aedf769af5a81bb76c64a2992c11143a97f1cefc15e60fdbc",
      "iter": 150000,
      "setAt": "12/10/2026 08:52"
    }
  }
};
