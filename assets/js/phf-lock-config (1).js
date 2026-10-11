/* PHF Staff Hub — tool password locks (assets/js/phf-lock-config.js).
 * Made by a tool's Set password button (12/10/2026 08:48). Each entry is a PBKDF2-SHA-256 hash with a random salt —
 * the password itself is not stored. Commit this file to lock / unlock the tools listed. An empty list = no locks. */
window.PHF_LOCK_CONFIG = {
  "version": 1,
  "tools": {
    "pos-supplier-merge": {
      "label": "POS New Product Check Clean",
      "salt": "7fada57a4a36046164d466bea24217c2",
      "hash": "9a71b09209f22d1a3c2844fca0d6b6685eb76cd5443bfbcbf4bb41d38f7a323f",
      "iter": 150000,
      "setAt": "12/10/2026 08:48"
    }
  }
};
