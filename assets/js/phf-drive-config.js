/* PHF Staff Hub — Google Drive settings (v1.0.0, 23 Oct 2026). Fill these in from Google Cloud (see docs/GOOGLE-DRIVE-SETUP.md).
 * They are not secrets: Google only accepts them from https://admin-phf.github.io, and every file still needs a staff member's
 * own Google sign-in. Leave them empty and the "Google Drive" buttons stay hidden; drag and drop works as before.
 *   clientId — Credentials → OAuth 2.0 Client ID (Web application), ends in .apps.googleusercontent.com
 *   apiKey   — Credentials → API key, restricted to the websites https://admin-phf.github.io/* and https://docs.google.com/*
 *              (Google's picker needs the second) and to the Google Picker API
 *   appId    — the project NUMBER (Cloud overview / project settings), digits only
 */
window.PHF_DRIVE_CONFIG = {
  clientId: '',
  apiKey: '',
  appId: ''
};
