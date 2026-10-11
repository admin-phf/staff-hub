/* PHF Staff Hub — tool password locks (assets/js/phf-lock-config.js).
 * Replace this file with the one a tool's "Set password" button downloads, then commit. Each entry is a
 * PBKDF2-SHA-256 hash with a random salt — the password itself is never stored. An empty list = no locks. */
window.PHF_LOCK_CONFIG = {
  "version": 1,
  "tools": {}
};
