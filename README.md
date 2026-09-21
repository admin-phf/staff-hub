# Prahran Health Foods — Staff Hub

A simple static Staff Hub designed for GitHub Pages. Each staff tool is isolated in its own folder.

## Current tools
- `tools/update-specials/` — existing Update Specials application, copied from the current working page and isolated as its own project.
- `tools/reconcile-ch2/` — new reconciliation application shell with separate UI, parsers, reconciliation engine and report-export modules.

## Publish on GitHub Pages
1. Create (or use) a repository named `staff-hub`.
2. Upload the *contents* of this folder to the repository root.
3. Commit to `main`.
4. In GitHub: **Settings → Pages**.
5. Set **Source** to **Deploy from a branch**.
6. Choose **main** and **/(root)**, then Save.
7. Wait for the Pages deployment and open the provided site URL.

## Recommended working method
Treat `main` as live/production. Make changes on a branch named for the tool and change, then merge only after testing.

Examples:
- `update-specials/final-days-stamp`
- `update-specials/new-pos-layout`
- `reconcile-ch2/pos-xls-parser`
- `reconcile-ch2/ch2-pdf-parser`

## Important privacy note
GitHub Pages is static hosting. Do not place private business documents or secrets in the repository. Reconciliation input files should be selected by the user at runtime and processed locally in the browser.

See `docs/ARCHITECTURE.md` for the folder rules.
