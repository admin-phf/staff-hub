/* PHF Staff Hub — Google Drive settings (v1.0.1, 23 Oct 2026 — filled in for Google Cloud project "phf-staff-hub").
 * See docs/GOOGLE-DRIVE-SETUP.md. They are not secrets: Google only accepts them from https://admin-phf.github.io, and every file
 * still needs a staff member's own Google sign-in. Empty them and the "Google Drive" buttons are hidden; drag and drop works as before.
 *   clientId — Credentials → OAuth 2.0 Client ID (Web application), ends in .apps.googleusercontent.com
 *   apiKey   — Credentials → API key, restricted to the websites https://admin-phf.github.io/* and https://docs.google.com/*
 *              (Google's picker needs the second) and to the Google Picker API
 *   appId    — the project NUMBER (Cloud overview / project settings), digits only — the start of the Client ID
 * Never put the client secret here (the Staff Hub does not use it).
 */
window.PHF_DRIVE_CONFIG = {
  clientId: '876421157517-52ckqj35oc37gv0nj9jb1e2n0prmmd9a.apps.googleusercontent.com',
  apiKey: 'AIzaSyAO1qbSx-JHjxzqcHTReOF2t3-zW-CcN9o',
  appId: '876421157517'
};
