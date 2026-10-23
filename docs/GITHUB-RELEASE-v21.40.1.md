# Staff Hub v21.40.1 — Google Drive is set up (23 Oct 2026 11:00 AEDT)

**Summary:** v21.40.1 — Google Drive is switched on. The Google Cloud project `phf-staff-hub` has its three settings in `assets/js/phf-drive-config.js`. This adds:
- **From Google Drive** under "Drop all input files here" in all three tools.
- **Save to / Get from Google Drive** in the Saved files panels.

Sign-in is for the shop's Google accounts only (audience Internal). Nothing else changes.

## What changed
- `assets/js/phf-drive-config.js` (v1.0.1) now holds:
  - **Client ID:** 876421157517-52ckqj…apps.googleusercontent.com
  - **API key:** AIzaSyAO1q…
  - **Project number:** 876421157517
  
  These are public by design. Google accepts them only from https://admin-phf.github.io and only for the APIs the key allows. The client secret is not used and is not in the repo.
- `?v=1.0.1` is set on the hub and the three tools, so browsers fetch the filled-in settings instead of the empty ones.
- docs/GOOGLE-DRIVE-SETUP.md: a status line (project, Internal, where the settings are).
- Versions: hub v21.40.1; Reconcile CH2 Order v2.22.1, Build POS Master Databases v21.23.1, POS New Product Check Clean v1.25.1 (version only).

## Files
- Changed:
  - index.html
  - tools/reconcile-ch2/index.html, js/app.js (header)
  - tools/database-build/index.html, js/pipeline.js (version)
  - tools/pos-supplier-merge/index.html, js/app.js (version)
  - assets/js/phf-drive-config.js
  - docs/GOOGLE-DRIVE-SETUP.md, docs/ARCHITECTURE.md
- New: docs/GITHUB-RELEASE-v21.40.1.md.

## Tests run (23 Oct, headless Chromium, Google simulated)
- The hub and all three tools load `phf-drive-config.js?v=1.0.1`, and the Drive settings read as filled in. The three tools show From Google Drive under Drop all, and the Saved files panel shows Google Drive · not signed in.
- **Sign-in** was asked for the Client ID 876421157517-52ckqj… with only the `drive.file` permission.
- **Google's picker** got project number 876421157517, the API key and the sign-in, in list view.
- A file picked "from Drive" (Ongoing Discounts) was assigned as if dropped in all three tools.
- With Google unreachable, the pages still load with zero errors.

## Still to do on your side
- Restrict the API key (docs/GOOGLE-DRIVE-SETUP.md, step 5):
  - **Websites:** `https://admin-phf.github.io/*` and `https://docs.google.com/*`.
  - **API restriction:** Google Picker API only.
- Then test the real sign-in (step 8) with a shop Google account.
