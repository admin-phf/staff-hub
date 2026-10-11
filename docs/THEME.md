# Staff Hub theme v19.0.0

Updated 06 Oct 2026 02:45 AEDT (theme v20.0.0). One look across every Staff Hub page, with colours taken from Reconcile CH2 → POS layout.

## Files
- `assets/css/shell.css`: the shared page header (logo, centred title, breadcrumbs).
- `assets/css/theme.css`: colour tokens, panel bands, buttons, status lines, file inputs and badges. It is **linked last** on every page.
- `assets/css/hub.css`: Staff Hub home tiles only.
- `assets/css/compact-layout.css` (v1.1.0, 11 Oct 2026): rows of cards side by side on Build POS Master Databases, POS Supplier New Product Check and Clean Merge and Reconcile CH2 (`.dash-row-top` = Drop All · selected input · readiness / Build or Run all in a `.dash-stack`, stage cards in one row, file lists in columns, paired result notes). Linked straight after `theme.css`; nothing is hidden, it only places panels.

Each page's `<body>` has a scope class so the theme never leaks between tools:

| Page | Body class |
|---|---|
| Staff Hub home | `phf-page-hub` |
| Reconcile CH2 | `phf-page-reconcile` |
| CH2 Reference Admin | `phf-page-reconcile phf-page-admin` |
| Build POS Master Databases | `database-builder-page phf-page-db` |
| Legacy stage pages (ch2 / uhp / master) | `database-builder-page phf-page-db phf-page-db-legacy` |
| Update Specials | `phf-page-specials` |
| POS Supplier New Product Check and Clean Merge | `database-builder-page phf-page-db phf-page-merge` (Build POS Master Databases rules + `merge.css`) |

## Structure colours
| Token | Hex | Use |
|---|---|---|
| `--phf-navy` | #1E3A5F | Panel heading bands, table headers, selected tab / layout / view button |
| `--phf-navy-2` | #2A4B73 | Sub-section bands |
| `--phf-gold` | #E6CD74 | Heading text on navy (CAPITALS), step numbers, version tag |
| `--phf-ink` | #1F2937 | Body text (muted #5B6672) |
| `--phf-bg` | #EEF1F4 | Page background (one value for every tool) |
| `--phf-alt` | #E9F0F5 | Soft panels, table striping |

## State colours: same meaning everywhere
| State | Colour | Examples |
|---|---|---|
| Required + missing / error | Red #C5221F on #FCE8E6 | Empty required dropzone or input row, "Missing: …" status, failed check |
| Optional + empty / waiting / disabled | Grey #5F6368 on #EEF1F3 | Optional inputs, disabled main button, WAITING badge |
| Ready / drag-over / running | Blue #1967D2 on #E8F0FE | Main action once its inputs are in, file hovering over a drop target, READY / BUILD badges |
| Loaded / built / download / live | Green #2E7D32 on #E6F4EA | Uploaded file, BUILT badge, every Download button, LIVE badge |
| Caution | Amber #7A4F00 on #FFF7E0 | Cached data, needs-review notes |

Main action buttons follow the inputs: **grey** until required files are present → **blue** when ready to run → **green** download buttons once outputs exist.

## Adding a new tool
1. Copy the shared `<header class="phf-shell-header">` block from any tool page (icons are inline SVG, 20 px, `stroke="currentColor"`).
2. Link `shell.css` and then `theme.css` last in `<head>`, and give `<body>` a `phf-page-…` class.
3. Use `.phf-band` (with an `<h2>`) for panel headings, `.phf-pill.is-red|is-green|is-blue|is-amber` for badges, `.btn.primary` for the main action (blue / grey when `disabled`), and an `id` starting with `download` on download buttons so they turn green.

## Input rail layout
Build Master Databases and Reconcile CH2 share one layout: an **Input files** rail (`.builder-sidebar`, `.input-group`, `.input-nav-item` with `loaded` / `missing` / `required` / `active` / `drag-target` / `invalid`) beside a workspace (`.input-detail-panel`, `.dashboard-summary` + `.summary-chip.ok|.miss`, `.stage-dashboard`, `.outputs-panel`). Their colours are one set of rules in `theme.css`; a new tool with input files should reuse these class names and add its body class to those `:is(...)` selectors.

## Excel outputs (Reconcile CH2 look)
Reconcile CH2 Order and the Combined Master full file (`merged_alligned_pos_supplier_uhp_full_….xlsx`, Master v2.4.0) share one
workbook look: navy #1E3A5F header with gold #E6CD74 capitals, Google Sans, rows banded #E9F0F5 / #F5F5F5 with thin #D9E2F3
lines, no gridlines, and a navy / gold totals row. Price moves (new vs current, 3¢ tolerance): ↑ red #C5221F on #FCE8E6,
↓ blue #1967D2 on #E8F0FE, — grey #9AA0A6 (the current price is grey). Checks: ☑ green #0F6B36 on #E6F4EA, ☒ red on
#FCE8E6, ☐ grey; confidence HIGH green · MEDIUM amber #7A4F00 on #FFF7E0 · LOW red. Only display formats change — the
values stay plain numbers, so every reader of the file still works.

## Merge workbook sheets (Google Sheet look, v21.12.0)
The POS Supplier New Product Check and Clean Merge tabs copy the POS DB & SUPPLIER MERGE Google Sheet rather than the
theme: grey column letters (#F8F9FA), a navy #1E3A5F row-1 totals band with gold #FFD966 text, #E9F0F5 / #2C3E50 row-2
headings with a filter button each and a 3 px #C4C7C5 frozen-row line, rows #F5F5F5 / #E9F0F5, #E1E3E6 gridlines,
Google Sans 11 px, values left-aligned (centred where the Sheet centres them) and the Sheet's conditional colours from
`js/sheet-look.js` (up #D93025 on #FCE8E6, down #1A73E8 on #E8F0FE, OK #0F9D58 on #E6F4EA, warn #E37400 on #FEF3E2,
review #9334E6 on #F3E8FD, flat #9E9E9E). Selection is Google blue (#1A73E8 border, #D3E3FD fill); an orange corner marks an
edited cell. The password lock (`assets/js/phf-lock.js`) brings its own styles: navy card icon, white header buttons, a
navy / gold LOCKED badge on hub tiles.

Update Specials customer artwork (`.slide`, PNG/ZIP/PDF/Mailchimp exports) is deliberately untouched: the theme only styles the editor around it.
