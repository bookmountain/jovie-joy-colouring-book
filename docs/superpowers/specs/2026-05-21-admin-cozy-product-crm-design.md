# Admin Cozy + Product CRM — Design Spec

**Date:** 2026-05-21
**Branch:** `admin/cozy-product-crm`
**Status:** Ready for plan-writing
**Successor of:** `2026-05-20-zoe-book-phase-4-full-cms-design.md` (Phase 4a admin extensions)

## Goal

Replace the current admin's brand-storefront styling and bare-bones CRUD forms with a CRM-style admin foundation, then rebuild the product editor and list around it. After this spec ships the owner can fully manage the product catalog — every field that today is silently dropped (`reviewImages`, `inspirationImages`, `sourceLinks`, the format selector) becomes a first-class part of the editor. All other existing admin forms inherit the new visual system without structural redesign.

This unblocks two future specs (referenced below as Phase 4 and Phase 3) by establishing the design primitives they will reuse.

## Non-goals (explicitly out of scope; future specs)

- **Order / customer / fulfillment overhaul** — checkout shipping-address capture, fulfillment status, refunds, resend, customer view, email service, PDF delivery. Future spec; targeted before public launch.
- **Editorial content admin** — Blog+Articles, Comics+Worlds, Gallery (Cozy Moments), FAQ, Navigation, Featured-On. Sidebar shows them as muted "soon" entries. Future spec.
- **Collection editor structural redesign**, **ContentBlock editor redesign**, **Static-page editor redesign**, **block-editor redesign**. These are migrated to the new primitives for visual consistency but their structure stays as-is.
- **Inventory counts, SKUs, product variants, bundles, prints, gift cards.** Confirmed during brainstorming that the four formats (`physical`, `digital`, `sticker`, `freebie`) are complete and no variants are needed.
- **Import CSV** (shown in mockup as a future affordance) — placeholder button only, not wired.
- **Global search ⌘K** (shown in topbar mockup) — placeholder only.
- **Storefront changes** of any kind.

## Background

`apps/web/src/components/admin/ProductForm.tsx` silently passes `null` for `reviewImages`, `inspirationImages`, `sourceLinks` and a hardcoded default for `options` on every save. `productType` is a small dropdown squeezed next to "Compare-at (cents)". The shared `.coco-input` class in `apps/web/src/app/globals.css` applies `rounded-full` (the storefront brand pill) to every input and textarea in the admin, making text entry visually unusable. The admin sidebar in `apps/web/src/components/admin/AdminShell.tsx` lists only a subset of the eventual surface area.

The data model already supports everything the CRM editor needs — this spec is FE-heavy with one BE-side query extension and one bulk-action endpoint.

## Design system

### Cozy admin palette (locked during brainstorming)

CSS custom properties scoped under `.admin` and `body.admin-route`; **does not replace `.coco-*`**, which continues to drive the storefront.

| Token | Hex | Purpose |
| --- | --- | --- |
| `--admin-paper` | `#efe6d2` | App body background |
| `--admin-card` | `#fff8ec` | Panel / table background |
| `--admin-card-2` | `#fefaf0` | Nested panel, table header zebra |
| `--admin-card-3` | `#fdf5e0` | Sidebar nav-item hover, secondary surfaces |
| `--admin-line` | `#ead7b5` | Default border |
| `--admin-line-soft` | `#f0e0bf` | Inner dividers |
| `--admin-ink` | `#3d2718` | Primary text (softer than near-black `#2a1d14` rejected in review) |
| `--admin-ink-2` | `#5a3a1c` | Secondary text |
| `--admin-muted` | `#9a7e5c` | Tertiary text, hints |
| `--admin-muted-2` | `#bca78a` | Disabled / "soon" labels |
| `--admin-coral` | `#d35d3c` | Primary accent — save buttons, active states, bulk bar, focus rings |
| `--admin-coral-soft` | `#fde2d7` | Selected row, chip background |
| `--admin-coral-2` | `#b94a2d` | Active nav-item text |
| `--admin-honey` | `#e5a93b` | Draft status, section-tag accent |
| `--admin-honey-soft` | `#fbeac6` | Draft badge, tag chip |
| `--admin-leaf` | `#5b8a3a` | Published status |
| `--admin-leaf-soft` | `#dcecc8` | Published badge, freebie format pill |

### Typography

- Family: **Nunito** (matches storefront — already loaded).
- Page title 24 / 800; section title 14 / 800; body 13 / 600; hint 12 / 500; section-tag 10 / 800 uppercase / `letter-spacing: 0.12em`.

### Shape & spacing

- Border radius: 8px for inputs and small controls, 12px for badges/pills, 14px for panels, 999px **only** for primary buttons (pill) and chips. **No pill-shaped inputs or textareas.**
- Shadow: `0 4px 14px rgba(74, 42, 12, 0.06)` for panels; `0 4px 10px rgba(211, 93, 60, 0.25)` for primary buttons.
- Panel inner padding: 18px / 20px.
- Grid gap between panels: 14px.

## Component primitives

New module: `apps/web/src/components/admin/ui/`.

| Component | Notes |
| --- | --- |
| `AdminShell` | Two-column layout (sidebar + main), responsive collapse to icons-only sidebar at `< md`. Wraps the route children with `body.admin-route` class. |
| `AdminSidebar` | Brand block, grouped nav (`Overview`, `Catalog`, `Commerce`, `Site content`, `Editorial`), user card at bottom. `Editorial` group items render with `soon` modifier and `aria-disabled`. |
| `AdminTopbar` | Search input (placeholder), `View storefront ↗` external link, notification bell (placeholder), settings (placeholder). |
| `AdminPageHeader` | Crumb · `<h1>` · subtitle · right-aligned action slot. |
| `AdminPanel` | White card with section tag, optional hint, content. |
| `AdminPanelDanger`, `AdminPanelDashed` | Variants for danger zone and conditional sections. |
| `AdminToolbar` | Search + filter-chip slots + divider + sort. |
| `AdminFilterChip` | `on` / `off` states with optional count badge. |
| `AdminBulkBar` | Coral bar that appears with selection count, action slot, dismiss `×`. |
| `AdminTable` | Generic table with sortable header, selectable rows, hover state. Pagination footer. |
| `AdminPagination` | Prev / numbered / Next; emits page-change events. |
| `AdminInput`, `AdminTextarea`, `AdminSelect`, `AdminLabel`, `AdminField` | Form primitives — 8 / 10 / 14 px radii, focus ring uses coral-soft. |
| `AdminButton` | Variants: `primary` (coral, pill), `ghost` (border, pill), `dark` (ink, pill — rare), `danger` (ghost coral). Inline `size="sm"` for inline actions. |
| `AdminSwitch` | Pill toggle, leaf when on / muted when off. |
| `AdminCheckbox` | Coral when on, with check glyph. |
| `AdminBadge` | Variants: `pub`, `draft`, `scheduled`, `oos`. |
| `AdminChip` | Variants: `default` (coral-soft), `tag` (honey-soft), `add` (dashed muted, button role). |
| `AdminEmptyState` | Centered illustration slot + heading + sub + primary action. |
| **Product-specific composites:** | |
| `AdminFormatPicker` | 4-tile grid; props: `value`, `onChange`, `tiles` (built-in list of physical/digital/sticker/freebie with icon, label, sub-label). Selected tile uses coral background. |
| `AdminGalleryUploader` | Drag-to-reorder grid; multi-select upload; star-primary; remove-on-hover. Reused across all three product galleries. Props: `value`, `onChange`, `upload`, optional `primaryIndex` and `onPrimaryChange`. |
| `AdminSourceLinksEditor` | List of rows (label, url, image upload, alt). Add / remove / reorder. |

The existing `MultiImageUpload` is replaced by `AdminGalleryUploader`; `ImageUpload` is kept (single-image use cases) but restyled via the new primitives.

## Admin shell (route-level)

- All `apps/web/src/app/admin/**` routes wrapped in `<AdminShell>` via `apps/web/src/app/admin/layout.tsx`.
- Sidebar nav groups (locked during brainstorming visual):

| Group | Items |
| --- | --- |
| Overview | Dashboard |
| Catalog | Products, Collections |
| Commerce | Orders (unread badge), Customers, Notify me, Subscribers |
| Site content | Home page, Header & Footer, Announcement, Static pages |
| Editorial *(Phase 3 — muted)* | Blog, Comics, Gallery, FAQ, Featured On |

- Items under **Commerce** other than `Orders` (Customers, Notify me, Subscribers) render as live links to placeholder pages that show `AdminEmptyState` with copy "Coming in the orders & customers spec." This avoids dead nav entries.
- "Editorial" group items render disabled with a small `soon` badge.
- User card pulls email + role from existing `admin-auth` state; sign-out menu (⋯) reuses current sign-out flow.

## Product editor — sectioned layout

Route: `apps/web/src/app/admin/products/[slug]/page.tsx` (existing) and `apps/web/src/app/admin/products/page.tsx` (new-product flow).

### Top bar

- Crumb: `Catalog · Products`.
- Title row: product title + status badge (`Published` / `Draft` / `Out of stock`).
- Actions (right): `Preview` (opens storefront PDP in new tab), `Discard` (reverts local state), `Save changes` (primary).
- Unsaved-changes guard: `beforeunload` prompt when dirty.

### Main column

1. **Basics panel** — title (large input), slug (locked after create), excerpt, description (textarea, paragraphs split by blank lines, same convention as today).
2. **Media — Product gallery panel** — `AdminGalleryUploader`. Drag to reorder; star to set primary (which is just `images[0]`, so "set as primary" reorders).
3. **Media — Inspiration gallery panel** — `AdminGalleryUploader` for `inspirationImages`.
4. **Media — Customer photos panel** — `AdminGalleryUploader` for `reviewImages`.
5. **Source links panel** — `AdminSourceLinksEditor` for `sourceLinks`. Each row: label, href, image (via `adminUploadGeneral(..., 'products')`), alt.
6. **Digital fulfillment panel** *(conditional — only when format = `digital`)* — current PDF filename + size + upload date, with `Replace` action. Empty state if not uploaded: "No PDF uploaded yet" + `Upload PDF` button. Uses existing `POST /api/admin/products/{slug}/pdf`.
7. **Danger zone panel** — Delete product with confirm dialog.

### Sidebar

1. **Visibility** — `Published` switch + publish date input. Switch toggles `publishedAt` between `null` (draft) and the date input value. If switch is on but date is in the future, status renders as "Scheduled".
2. **Format** — `AdminFormatPicker`. Tiles include sub-labels:
   - Physical book — *Ships to address*
   - Digital PDF — *Delivered by email*
   - Sticker pack — *Ships to address*
   - Freebie — *Free download, skips checkout*
3. **Pricing** — price (cents → human input with `$` prefix), compare-at (optional). Validated `≥ 0`.
4. **Availability** — `Available` switch. Hint copy: "When off, the PDP shows a 'Notify me when back' form."
5. **Organization** — Collections (chip multi-select pulling from `adminListCollections()`), Tags (chip input with autocomplete from existing distinct tags).

### Form behavior contract

- Save sends the full `AdminProductWriteBody` including `images`, `reviewImages`, `inspirationImages`, `sourceLinks`. Server treats arrays as a replace.
- `options` is no longer sent from the FE. The BE's `AdminProductsController.PutAsync` is updated so that when `options` is null or empty in the request body, the existing value is preserved on update and the single-format default `[{Name:"Format", Values:["Default Title"]}]` is inserted on create (preserves storefront compatibility — the PDP `<select>` simply renders one entry).
- Format change does not clear `pdfPath` on the server. If a user switches Digital → Physical, the PDF is preserved (hidden); switching back exposes it again. To actually remove the PDF the user uses the `Replace` flow (which can also delete).
- Slug is set at create only; cannot be edited after.
- Required fields: title, slug (create only), format, price ≥ 0.

### Derived "status" concept

The BE has no `status` column. Status is derived per row in list responses and per record in detail responses:

```
status = !available             → "out_of_stock"
       : publishedAt == null    → "draft"
       : publishedAt > now      → "scheduled"
       : otherwise              → "published"
```

Editor sidebar `Visibility` controls `publishedAt`; `Availability` controls `available`. No new column.

## Product list — `/admin/products`

Route: `apps/web/src/app/admin/products/page.tsx`.

- Page header: `Products` title with subtitle counts ("23 products · 18 published · 3 drafts · 2 out of stock"), action row with `Import CSV` (disabled placeholder for now) and `+ New product` (primary).
- Toolbar (sticky on scroll): search input (live filter, no submit), filter chips for Format / Status / Collection / Tag, sort dropdown.
- Bulk action bar appears when ≥ 1 row selected: `Add to collection…`, `Set status…` (Publish / Unpublish), `Duplicate`, `Delete`. Coral background.
- Table columns: select, thumb (40px), title + slug, format badge, price (with compare-at strikethrough), status, collection chips, updated relative time.
- Click row → opens editor.
- Pagination: 25 / page; sortable by Product (title), Price, Updated.

### Empty / loading / error states

- Initial load: skeleton table (5 rows of placeholder).
- Empty (no products at all): `AdminEmptyState` with "+ Add your first product" CTA.
- Filtered empty: "No products match these filters. Clear filters."
- Network error: panel with "Couldn't load products. Retry."

## Backend changes (`apps/api`)

- Extend `AdminProductsController.GetAsync` to accept query parameters:
  - `q` — case-insensitive substring on title, slug, tag join.
  - `format` — `physical|digital|sticker|freebie` (comma-separated multi).
  - `status` — `published|draft|scheduled|out_of_stock` (multi).
  - `collection` — collection slug (multi).
  - `tag` — tag string (multi).
  - `sort` — `title_asc|title_desc|price_asc|price_desc|updated_asc|updated_desc`. Default: `updated_desc`.
  - `page` (1-based), `pageSize` (default 25, max 100).
  - Response shape: `{ items: Product[], total: number, page, pageSize }`. Status derived per item.
- New `POST /api/admin/products/{slug}/duplicate` — server-side clone. New slug = `{source}-copy`, with `-2`, `-3`, … appended for uniqueness. New product is created as draft (`publishedAt=null`) and removed from all collections. Returns the new product.
- New `POST /api/admin/products/bulk` — body `{ slugs: string[], action: "publish"|"unpublish"|"delete"|"add-to-collection"|"remove-from-collection", payload?: { collectionSlug?: string } }`. Returns `{ updated: number }`.
- The existing `PUT /api/admin/products/{slug}` already accepts `reviewImages`, `inspirationImages`, `sourceLinks` per `AdminProductWriteBody` — no schema change needed; only the FE was dropping them.
- Tag autocomplete: new `GET /api/admin/products/tags` → `string[]` of distinct tags.

## Migration / refactor sequence

This spec produces three increments that each leave the admin shippable.

1. **Foundation only** (no behavior change) — add tokens to `globals.css`, scaffold every primitive in `components/admin/ui/`, refactor `AdminShell` and sidebar. Migrate `ProductForm`, `CollectionForm`, `StaticPageForm`, `ContentBlockEditor`, every `blocks/*.tsx` to use new primitives **without restructuring**. Result: same admin, new look.
2. **Product editor restructure** — replace `ProductForm.tsx` with the sectioned layout described above. Surface the hidden fields. Add the conditional digital fulfillment panel. Add danger zone.
3. **Product list enhancements + backend** — extend `GET /api/admin/products`, add bulk + duplicate endpoints, build the new list page. Migrate `OrdersTable` toolbar to new primitives in passing (no functional change).

## Testing

- **Vitest unit:** primitives render variants correctly; `AdminGalleryUploader` reorder logic; `AdminFormatPicker` change handler; `AdminSourceLinksEditor` add/remove; product-form `status` derivation; bulk-selection state.
- **Playwright e2e:** create product with all fields populated end-to-end; switch format Physical ↔ Digital, confirm digital section appears/disappears, confirm PDF preserved; toggle Availability, confirm status badge changes; bulk publish; delete with confirm; list search/filter/sort/pagination.
- **Visual smoke:** screenshot `admin/products` (list, editor) — added to existing Playwright suite, not full visual-regression.

## Acceptance criteria

- No `rounded-full` on any admin input or textarea (`grep` audit).
- `apps/web/src/components/admin/ProductForm.tsx` no longer sends `null` for `reviewImages`, `inspirationImages`, `sourceLinks`; corresponding admin UI exists and round-trips.
- Format selector is the prominent sidebar control on the product editor; tiles match the four-format mockup.
- `/admin/products` shows search, four filter chips, sort, bulk bar, pagination — all functional against the new query API.
- Sidebar matches the locked structure with `Editorial` group shown as `soon`.
- `Customers` / `Notify me` / `Subscribers` routes exist and render `AdminEmptyState` pointing at the future spec.
- All other admin pages render via the new primitives with no visible regressions.

## Risks & mitigations

- **`.coco-input` is shared with the storefront.** Mitigation: introduce admin tokens under a different class scope (e.g., `body.admin-route .admin-input`), never modify `.coco-*`; verify storefront unchanged via existing Playwright run.
- **Pre-launch DB has rows from seed.** Mitigation: BE bulk endpoint guards against soft-deleting seed data only by slug; seed re-runs idempotently.
- **Status derivation could surprise users when toggling Availability.** Mitigation: subtitle copy on the Availability switch explains the storefront effect.
- **"Sticker pack" today is treated like "physical" in the BE.** Mitigation: this spec treats them identically (no fulfillment changes here). Phase 4 spec is where sticker-specific shipping logic, if any, gets reckoned with.
- **`options` becomes orphaned in the schema.** Acceptable: still serialized for storefront PDP compatibility (single placeholder). Future variants spec, if ever needed, will reactivate it.

## Reference brainstorming artifacts

- Editor mockup: `.superpowers/brainstorm/46349-1779324902/content/editor-cozy-full.html`
- List mockup: `.superpowers/brainstorm/46349-1779324902/content/list-cozy.html`
- Shell mockup: `.superpowers/brainstorm/46349-1779324902/content/shell-cozy.html`
- Style-direction selection: `.superpowers/brainstorm/46349-1779324902/content/editor-styles.html` (option A · Cozy)
