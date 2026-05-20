# Phase 4 design — Full CMS admin (form-based per-page)

**Date:** 2026-05-20
**Status:** Approved, pending implementation plan
**Predecessor:** Phase 3 admin (`docs/superpowers/plans/2026-05-19-zoe-book-overhaul-phase-3-admin.md`)

## Goal

Make every page, every image, and every text on the storefront editable by
an admin user. Phase 3 covered Products, Collections, Orders, Analytics, and 4
typed ContentBlocks. Phase 4 covers everything else.

## Non-goals (deferred to Phase 5)

- Click-to-edit visual editor on the storefront (the admin clicks a heading or
  image in a rendered storefront page and inline-edits it).
- Rich-text editor for article body. Multi-paragraph textarea is fine for now.
- Image cropping or responsive variant generation.
- Draft / published versioning.

## Approach

Extend the existing `ContentBlock` infrastructure with new typed records for
hardcoded chrome strings, and add admin CRUDs for the existing domain tables
that don't have one yet. **No schema changes** beyond enum extensions.

The admin gains two kinds of new routes:

1. **`/admin/pages/[pageKey]`** — composed per-page editors. Each fetches the
   ContentBlocks AND domain-table rows that belong to a storefront page and
   presents them in one form. Saves dispatch to the right endpoint per field.
2. **`/admin/{domain}`** — standard list/detail CRUDs mirroring the existing
   `/admin/products` and `/admin/collections` pages, for the tables that don't
   have admin coverage yet.

## Backend changes

### New `ContentBlockType` enum values

Final names decided during implementation; current draft:

| Type | Stores | Used by |
|---|---|---|
| `HomeIntro` | `{ title, body }` | `app/(public)/page.tsx` Hi-Friend panel |
| `HomeCozyMomentsHeader` | `{ heading }` | `app/(public)/page.tsx` Cozy Moments section |
| `FooterContact` | `{ customerCareLabel, customerCareEmail, licensingLabel, licensingEmail }` | `components/layout/footer.tsx` |
| `HeaderBrand` | `{ name, tagline? }` | `components/layout/header.tsx` |
| `NewsletterCopy` | `{ heading, ctaLabel, successMessage }` | `components/content/newsletter-form.tsx` |

### Seeds

`SeedContentBlocks.cs` extended with default values for each new type so fresh
DBs render correctly without admin intervention.

### New admin controllers

Each follows the established pattern: `[ApiController]`,
`[Route("api/admin/{domain}")]`, `[Authorize(Policy = "AdminOnly")]`, REST
verbs (GET list, GET single, POST, PUT, DELETE), image upload helpers where
applicable.

| Controller | Backing table | Image fields |
|---|---|---|
| `AdminAboutController` | `about_sections` | `image` |
| `AdminFaqsController` | `faqs` | — |
| `AdminGalleryController` | `gallery_images` | `src` |
| `AdminFeaturedOnController` | `featured_on_links` | `image` |
| `AdminBlogsController` | `blog_categories` + `articles` (nested) | `image` (both) |
| `AdminComicsController` | `comic_worlds` + `comics` (nested) | `images[]` per comic |
| `AdminNavigationController` | `nav_links` (tree with `parent_id`); reorder via `PUT /api/admin/navigation/reorder` taking the full ordered slug list | — |
| `AdminFooterLinksController` | `footer_links` | — |
| `AdminSocialLinksController` | `social_links` | — |
| `AdminTrendingTermsController` | `trending_terms` | — |
| `AdminStaticPagesController` | `static_pages` | — |

All write endpoints return the saved entity for optimistic UI updates.

### Existing endpoints reused

- `POST /api/admin/uploads` for general image uploads.
- `PUT /api/admin/content/{key}` for ContentBlock upserts (already exists).

## Frontend changes

### New composed page editors

| Route | Composes |
|---|---|
| `/admin/pages/home` | `HomeHero`, `HomeIntro`, `HomeCozyMomentsHeader`, `HomeVideo`, `HeroArtwork` ContentBlocks; links to `/admin/gallery` for the Cozy Moments grid |
| `/admin/pages/footer` | `FooterContact` ContentBlock + footer-links + social-links + trending-terms inline editors |
| `/admin/pages/header` | `HeaderBrand` ContentBlock + link to `/admin/navigation` |
| `/admin/pages/announcement` | `Announcement` ContentBlock (already exists; this just gives it a friendly route) |

Static pages are multi-row so they use the standard CRUD pattern instead:
`/admin/static-pages` lists them, `/admin/static-pages/[slug]` edits one.

### New CRUD pages

`/admin/about`, `/admin/faqs`, `/admin/gallery`, `/admin/featured-on`,
`/admin/blogs` (categories list → category edit with articles inline),
`/admin/comics` (worlds list → world edit with comics inline),
`/admin/navigation` (tree editor), `/admin/static-pages`.

### New typed ContentBlock editors

Add to `components/admin/blocks/`:

- `AboutSectionBlock.tsx` (replaces JSON fallback)
- `FaqEntryBlock.tsx` (replaces JSON fallback)
- `FooterGroupBlock.tsx` (replaces JSON fallback)
- `FeaturedOnBlock.tsx` (replaces JSON fallback)
- `HomeIntroBlock.tsx`, `HomeCozyMomentsHeaderBlock.tsx`,
  `FooterContactBlock.tsx`, `HeaderBrandBlock.tsx`, `NewsletterCopyBlock.tsx`

### Sidebar (`AdminShell.tsx`)

Grouped nav:

- **Dashboard**
- **Pages** — Home, Footer, Header, Announcement, Static pages
- **Catalog** — Products, Collections
- **Content** — About, FAQs, Gallery, Featured-on, Blogs, Comics, Navigation
- **Orders**

### Storefront wiring

Components that currently render hardcoded strings get replaced with
ContentBlock lookups via the existing `apiGetContent()` bundle:

- `app/(public)/page.tsx` — Hi-Friend panel + Cozy Moments heading become
  ContentBlock lookups.
- `components/layout/footer.tsx` — Customer Care + Licensing emails become
  `FooterContact` lookup.
- `components/layout/header.tsx` — Brand text becomes `HeaderBrand` lookup.
- `components/content/newsletter-form.tsx` — Heading + button label become
  `NewsletterCopy` lookup.

Each lookup falls back to the current hardcoded value when the ContentBlock
is missing, so the storefront keeps rendering during a partial deploy or if
the admin deletes a block.

## Phasing

| Phase | Scope | Estimated effort |
|---|---|---|
| **4a** | Home, Footer, Header, Announcement, Static pages + their typed editors + storefront wiring | ~1 week |
| **4b** | About, FAQs, Gallery, Featured-on CRUDs + replacement typed editors | ~1 week |
| **4c** | Blogs (categories + articles), Comics (worlds + comics), Navigation tree | ~1 week |

Each sub-phase is its own branch, its own merge to main, its own deploy.
4b and 4c can be reordered or descoped without breaking 4a.

## Testing

- **Vitest unit tests** for each new typed ContentBlock editor (renders +
  emits onChange + saves).
- **Playwright e2e** per sub-phase (mocked API, same pattern as Phase 3
  `admin-flow.spec.ts`). Each test logs in, navigates to one of the new admin
  areas, edits a field, asserts the PUT was dispatched with the right body.
- **BE integration tests** for the new admin controllers: admin auth required
  (401 when missing), write → read roundtrip on each domain.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Composed page editors get complex and tangled | Each section in the composed view is its own component with its own save action; composed view is just layout |
| Navigation tree editor is hard to get right | Defer to 4c; reuse an existing tree library (e.g., `@dnd-kit/sortable` for drag-and-drop) or fall back to up/down buttons like Collection product order |
| Storefront breaks during partial deploy if a ContentBlock is missing | Every lookup has a hardcoded fallback string in the component |
| Admin user accidentally deletes a critical ContentBlock | Soft-confirm dialog on delete; eventual versioning lands in Phase 5 |

## Acceptance criteria (Phase 4 complete)

- All storefront pages have an admin counterpart that lets the admin edit
  every visible string and replace every image.
- `npx tsc --noEmit` passes on the FE.
- `npm test` passes including new vitest tests.
- `npx playwright test` passes including new admin e2e tests.
- `dotnet test` passes including new BE admin endpoint tests.
- README admin section updated with the new pages.
