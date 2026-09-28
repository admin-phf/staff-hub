# PHF Staff Hub structure

## Principle
The Staff Hub is the menu. Each tool is an independent mini-application.

```
staff-hub/
├── index.html                     # Staff Hub home only
├── assets/                        # Shared hub-only assets
│   └── css/hub.css
├── tools/
│   ├── update-specials/           # Existing working project
│   │   └── index.html
│   └── reconcile-ch2/             # New project
│       ├── index.html
│       ├── css/app.css
│       └── js/
│           ├── app.js
│           ├── parsers/
│           │   ├── pos-order.js
│           │   └── supplier-invoice.js
│           ├── core/reconcile.js
│           └── export/report.js
├── docs/
│   └── ARCHITECTURE.md
├── .gitignore
└── .nojekyll
```

## Change isolation
A change to Update Specials should normally touch only `tools/update-specials/`.
A change to CH2 Reconciliation should normally touch only `tools/reconcile-ch2/`.
Change the root `index.html` only when adding/removing a Staff Hub tile.

## Git workflow
- `main` is the live site.
- Create a short branch for each change, e.g. `update-specials/new-layout` or `reconcile-ch2/pdf-parser`.
- Test the branch before merging to `main`.
- Use small commits with clear messages.
- Tag stable releases (`v1.0.0`, `v1.1.0`) so they are easy to restore.

## Data / security
Never commit invoices, POS exports, customer data, passwords, API keys or account information.
Browser-side processing is preferred for reconciliation documents so the input files never become site content.
