/* PHF Staff Hub — tool password locks (assets/js/phf-lock-config.js).
 * Made by a tool's Set password button (12/10/2026 18:24). Each entry is a PBKDF2-SHA-256 hash with a random salt —
 * the password itself is not stored. Commit this file to lock / unlock the tools listed. An empty list = no locks. */
window.PHF_LOCK_CONFIG = {
  "version": 1,
  "tools": {
    "pos-supplier-merge": {
      "label": "POS New Product Check Clean",
      "salt": "d6b949391efcda283e09ddc6c74c3612",
      "hash": "a5112164b1fa99eea896bf8ec07d754d687413370e5920d3ec3ada013b8f40a3",
      "iter": 150000,
      "setAt": "12/10/2026 18:24"
    }
  }
};
