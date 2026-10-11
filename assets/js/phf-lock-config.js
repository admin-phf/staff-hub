/* PHF Staff Hub — tool password locks (assets/js/phf-lock-config.js).
 * Made by a tool's Set password button (12/10/2026 07:49). Each entry is a PBKDF2-SHA-256 hash with a random salt —
 * the password itself is not stored. Commit this file to lock / unlock the tools listed. An empty list = no locks. */
window.PHF_LOCK_CONFIG = {
  "version": 1,
  "tools": {
    "pos-supplier-merge": {
      "label": "POS New Product Check Clean",
      "salt": "c2180a6846ae95672be92d4db1066469",
      "hash": "5e7b1942bd695ee36f1ec9b271e5bfcc0332a60b8ef975e532b66d1ef4e5b2a1",
      "iter": 150000,
      "setAt": "12/10/2026 07:49"
    }
  }
};
