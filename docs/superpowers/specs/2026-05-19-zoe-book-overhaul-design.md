# Zoe&Book Overhaul — Design Spec

**Date:** 2026-05-19
**Branch:** `overhaul/zoe-book`
**Status:** Approved for plan-writing

## Goal

Aggressively replace the current Jovie Joy frontend (scrapbook style, 12 simple
products, Sniglet/DM Sans, hard offset shadows) with the carved reference repo
at `C:\Users\bookm\Documents\Coco Wyo` (cocoa look, Nunito, `rounded-coco`
panels, rich storefront with collections, blogs, comics, gallery, wishlist).
Extend the ASP.NET Core API to serve the reference's content domains end-to-end.

Reference is the single source of truth. The current `apps/web` is deleted
wholesale. Jovie Joy as a brand is deprecated; the site becomes Zoe&Book.

## Non-goals

- Incremental visual coexistence of old and new pages
- i18n, multi-currency, SEO meta beyond the reference's baseline
- Reviews submission, third-party newsletter integration, server-side search
- Day-1 admin CRUD for blogs, articles, comics, gallery, navigation,
  static pages (those stay seed-managed; future spec when editorial demand exists)

## Architecture

### Repo layout (after overhaul)

```
jovie-joy-colouring-book/
├── apps/
│   ├── web/                                Next 15 + React 19, single Tailwind app
│   │   ├── src/
│   │   │   ├── app/                        from reference 1:1 + new /admin/* + /auth/callback
│   │   │   ├── components/                 from reference (commerce/content/layout/overlays/providers) + admin/
│   │   │   ├── data/                       BE-backed loaders (was static fixtures)
│   │   │   ├── lib/                        catalog.ts, format.ts, newsletter.ts + api.ts
│   │   │   ├── state/                      site-store.tsx wired to real cart/wishlist/auth
│   │   │   └── test/                       vitest setup
│   │   ├── public/placeholders/            footer characters PNGs
│   │   ├── tailwind.config.ts              from reference (cocoa palette, rounded-coco)
│   │   ├── package.json                    react 19 / clsx / tailwind-merge / lucide-react / vitest / playwright
│   │   └── (next.config.ts, tsconfig.json, eslint.config.mjs, playwright.config.ts, vitest.config.ts)
│   └── api/                                ASP.NET Core 9 — same project, new domain
├── docs/superpowers/specs/                 this spec + future specs
└── (docker-compose.yml, .github/workflows/, README.md, HANDOFF.md updated)
```

`apps/web/{app,components,lib,public}` (current Jovie Joy FE) is deleted in the
first commit of the overhaul branch. No partial coexistence.

### Frontend deltas from the reference

**Kept 1:1 from reference** (cocoa look, Nunito, `rounded-coco`):

- `app/{layout.tsx, page.tsx, not-found.tsx, globals.css}`
- `app/{collections, collections/[slug], collections/[slug]/products/[productSlug], products/[slug], blogs/[slug], blogs/[slug]/[articleSlug], pages/[slug], search, wishlist}`
- All `components/{commerce, content, layout, overlays, providers}/*.tsx`
- All `data/*.ts` file shapes — bodies become async loaders (`getProducts()`,
  `getCollections()`, …) that fetch BE on the server and return the same
  TypeScript types the components already consume. Component code stays untouched.

**New, additive to the reference**:

- `app/admin/` — `login/`, `(dashboard)/page.tsx`, `products/`, `collections/`,
  `content/`, `orders/`. Cocoa styling (rounded-coco panels, Nunito). Uses
  existing `AdminAuth` JWT flow.
- `app/auth/callback/page.tsx` — receives `?token=...` from Google OIDC,
  stores it, dispatches store action to refresh `me` + merge wishlist (kept from current).
- `app/checkout/` + `app/checkout/success/` — kept, restyled to cocoa.
- `lib/api.ts` — REST client (BE base URL, JWT header, Wishlist/Cart/Checkout calls).
- `state/site-store.tsx` (from reference) extended: cart actions call
  `POST /api/checkout`; wishlist syncs to `/api/wishlist` when logged in
  (localStorage shim when guest); login modal kicks off Google OIDC.
- `components/admin/AdminShell.tsx` — cocoa sidebar + top bar + breadcrumbs.

**Reference UI components touched (minimal wiring only)**:

- `overlays/login-modal.tsx` — wire "Continue with Google" to `/auth/google` redirect.
- `commerce/cart-drawer.tsx` — "Checkout" button → `createCheckoutSession()` → Stripe URL.
- `commerce/wishlist-button.tsx` — calls store action that hits BE when authed.
- `layout/header.tsx` — show user avatar + sign-out when authed; admin link if `role=admin`.

### Backend domain model

**Commerce + content tables** (live in EF Core):

```
Product
  id (Guid PK), slug (unique), title, excerpt, descriptionJson (jsonb: string[]),
  priceCents (int), compareAtPriceCents (int?), available (bool),
  productType (enum: Physical|Digital|Sticker|Freebie),
  imagesJson (jsonb: string[]),
  optionsJson (jsonb: [{name, values:[]}]),
  sourceLinksJson (jsonb: [{label, href, image?, alt?}]?),
  reviewImagesJson (jsonb: string[]?),
  inspirationImagesJson (jsonb: string[]?),
  tagsJson (jsonb: string[]),
  publishedAt (timestamptz), createdAt, updatedAt,
  pdfPath (text?)

ProductCollection
  productId (FK), collectionId (FK), PK(productId, collectionId)

Collection
  id (Guid PK), slug (unique), title, excerpt, heroImage (text?),
  defaultSort (enum: Featured|Relevance|BestSelling|TitleAsc|TitleDesc|PriceAsc|PriceDesc|CreatedAsc|CreatedDesc),
  homepageSlot (enum: NewRelease|BestSeller|Digital|Tile, nullable),
  productOrderJson (jsonb: string[] of product slugs — preserves curated order),
  sortIndex (int)

ContentBlock
  key (text PK, e.g. "home.hero", "about.section.1", "faq.q.shipping",
                       "footer.group.info", "featured-on.penguin",
                       "home.video", "announcement.bar"),
  type (enum: HomeHero|AboutSection|FaqEntry|FooterGroup|FeaturedOn|HomeVideo|Announcement|HeroArtwork),
  dataJson (jsonb),
  sortIndex (int), updatedAt

User                                  (unchanged from current)
Order, OrderItem                      (unchanged)

Wishlist
  userId (FK), productSlug (text), addedAt, PK(userId, productSlug)

NotifyMeRequest
  id (Guid PK), email, productSlug, createdAt

NewsletterSubscriber
  email (text PK), createdAt
```

**Seeded read-only tables** (no admin v1, edited via EF migrations):

```
BlogCategory(slug PK, title, excerpt, image, sortIndex)
Article(slug PK, blogSlug FK, title, excerpt, image, bodyJson)
ComicWorld(id PK, title, sortIndex)
Comic(id PK, worldId FK, title, description, hasDownload, imagesJson, sortIndex)
AboutSection(id PK, title, bodyJson, image, alt, background, sortIndex)
GalleryImage(id PK, src, alt, sortIndex)
StaticPage(slug PK, title, intro, blocksJson)
NavLink(id PK, parentId FK?, label, href, sortIndex)
FooterLink(groupKey, label, href, sortIndex)
SocialLink(label PK, href, sortIndex)
FeaturedOnLink(slug PK, label, href, image, alt, sortIndex)
TrendingTerm(term PK, sortIndex)
Faq(slug PK, question, answer, sortIndex, group?)
```

Everything beyond Products / Collections / ContentBlocks / Wishlist lives in
seeders today and migrates to admin in a future spec when there's editorial demand.

### API surface

```
Public (anon)
  GET  /api/products                              full catalog (or ?collection=slug&sort=)
  GET  /api/products/{slug}
  GET  /api/collections                           list
  GET  /api/collections/{slug}                    with products in curated order
  GET  /api/content                               bundled response: hero, about, FAQs,
                                                    featured-on, video, footer, announcement,
                                                    navigation tree, footer groups, social,
                                                    trending terms, footer artwork
  GET  /api/blogs                                 all categories
  GET  /api/blogs/{slug}                          category + its articles
  GET  /api/blogs/{slug}/articles/{articleSlug}
  GET  /api/comics                                all worlds + comics
  GET  /api/about                                 about sections in order
  GET  /api/gallery                               gallery images
  GET  /api/pages/{slug}                          static page
  GET  /api/faqs

Auth
  GET  /auth/google                               unchanged
  GET  /auth/google/callback                      unchanged
  POST /auth/admin/login                          unchanged
  GET  /auth/me                                   unchanged

Commerce
  POST /api/checkout                              unchanged contract
  POST /api/webhooks/stripe                       new — completes HANDOFF #1
  POST /api/newsletter                            anonymous; stores email
  POST /api/notify-me                             anonymous; stores email + product slug

Wishlist (Bearer JWT required)
  GET    /api/wishlist
  PUT    /api/wishlist/{productSlug}
  DELETE /api/wishlist/{productSlug}
  POST   /api/wishlist/merge                      uploads guest list on first sign-in

Admin (Bearer JWT + role=admin)
  GET/POST/PUT/DELETE /api/admin/products         rich fields; PDF upload retained
  GET/POST/PUT/DELETE /api/admin/collections
  GET/PUT             /api/admin/content/{key}    typed by ContentBlock.type
  GET/POST            /api/admin/content          list / create new block
  GET                 /api/admin/orders           pagination, status filter
  GET                 /api/admin/analytics        unchanged
  POST                /api/admin/uploads          image upload (returns /uploads/... URL)
```

`GET /api/content` is one fat bundled call so the FE's `SiteProviders` boots
with one fetch instead of ten. Page-scoped resources (collections, blogs,
comics) are separate.

### Commerce + auth wiring

- **Cart drawer** (`components/commerce/cart-drawer.tsx`): line items in
  `state/site-store.tsx` (already there). "Checkout" button collects
  `{ productSlug, quantity }[]` + customer email + optional promo, calls
  `POST /api/checkout`, redirects to the returned Stripe URL. Cart persists
  in `localStorage` keyed `cocowyo:cart`.
- **Wishlist**: store extended with `wishlist: Set<string>`. Guests use
  localStorage; on login, `POST /api/wishlist/merge` uploads the guest set.
  Subsequent changes fire PUT/DELETE optimistically.
- **Login modal**: "Continue with Google" → `window.location =
  ${API}/auth/google?return=${currentPath}`. Backend redirects to
  `/auth/callback?token=...`; the callback page stores `jovie_token` and
  refreshes `me` + merges wishlist. Email/password "admin sign in" link sends
  to `/admin/login`. No email-signup flow (BE has none).
- **Stripe webhook**: `Controllers/WebhooksController.cs` with raw-body
  reading, `Stripe__WebhookSecret` signature verify, `IOrderService.MarkPaidAsync`.
- **Search**: client-side over fetched catalog. No BE search endpoint v1.
- **SSR vs CSR fetch**: collections, product detail, blogs, comics, about,
  pages, gallery → server components fetching with
  `next: { revalidate: 60 }`. Cart/wishlist/login → client store, hydrated on mount.
  Home page is server-rendered with bundled `/api/content` + collection slices.

### Admin pages (cocoa-themed, inside the new `src/app/admin/`)

```
/admin/login                  existing email+password, restyled (rounded-coco card on cream bg)
/admin                        dashboard: revenue (30d chart), orders count, top products
/admin/products               list, create, edit (rich fields), PDF upload, image multi-upload
/admin/collections            list, create, edit (slug, hero, sort, homepageSlot,
                                drag-to-reorder products)
/admin/content                grouped list of typed ContentBlocks:
                                - Home hero           (single)
                                - About sections      (ordered list of AboutSection)
                                - FAQs                (ordered list of FaqEntry)
                                - Featured on         (ordered list of FeaturedOnLink)
                                - Home video          (single)
                                - Footer groups       (ordered list of FooterGroup)
                                - Announcement bar    (single, on/off + text + link)
                                - Hero artwork        (desktop + mobile image upload)
/admin/orders                 pagination + status filter, restyled
```

Shared admin chrome: `components/admin/AdminShell.tsx` (cocoa sidebar, top bar
with sign-out, breadcrumbs). Uses the same `coco-panel`, `coco-button-primary`,
`rounded-coco` tokens — admin and storefront share one design system.

## Cutover plan

1. Branch off `main` to `overhaul/zoe-book` (recommend a git worktree to keep
   `main` clean for hot-fixes).
2. **DB**: single new EF migration `OverhaulInitial`. Strategy:
   - Local dev: drop and recreate the `jovie_joy` DB.
   - Prod: cutover migration. Run a backup, drop tables (`Product`,
     `OrderItem`, `Order`, `SiteContent`), recreate from new schema, reseed.
   - **Orders are wiped in prod**. Acceptable per HANDOFF context (no real
     revenue yet); reconfirm at implementation time.
3. `apps/web` wipe → re-init: first commit deletes
   `apps/web/{app,components,lib,public}`; second commit lays down the
   reference's `src/`, configs, deps; third commit adds the admin pages;
   fourth commit adds the BE-bridge data layer + cart/wishlist/login wiring.
4. `apps/api`: in parallel, land the new EF migration + entities + controllers
   + DbSeeder with all reference content baked in. Webhook controller goes in
   this PR too.
5. Deploy: single push to `main` triggers the self-hosted runner. Rolling
   restart of both containers. Stripe webhook URL re-pointed if needed.
6. Smoke check post-deploy: home, every collection page, product detail, cart
   add, Stripe checkout completion + webhook firing, admin login, every admin
   page loads (`/admin`, `/admin/products`, `/admin/collections`,
   `/admin/content`, `/admin/orders`).

## Testing strategy

- **Unit (vitest)**: store actions (cart math, wishlist add/remove/merge),
  format helpers, catalog filters & sorts, content normalisers.
- **Component (vitest + @testing-library/react)**: header navigation, cart
  drawer open/close, product card sale price rendering, faq accordion.
- **E2E (playwright)**: home → collection → product → add to cart → checkout
  (mocked Stripe redirect); guest wishlist → login → wishlist merge; admin
  login → create product → edit collection → publish content block.
- **API integration (xUnit in apps/api)**: Products/Collections/Content
  controllers round-trip, Wishlist merge idempotency, webhook signature verification.
- **Visual parity**: local diff against the reference repo's running dev
  server. Not automated; manual checklist in implementation plan.

## Risks & deferred decisions

1. **Order wipe in prod**: confirmed acceptable. Reconfirm at implementation time.
2. **Migration size**: DbSeeder will be large (~25 products + 16 collections +
   5 blog categories + 3 articles + 3 comic worlds with ~15 comics + 4 about
   sections + many nav links + FAQs). Lives in `Data/Seed/` split per domain
   (`SeedProducts.cs`, `SeedCollections.cs`, …) for readability.
3. **Auth modal scope**: reference's LoginModal shows "Sign up". BE has no
   email signup flow — only Google OIDC and admin email+password. Login modal
   will only show Google + admin link.
4. **Search**: client-side only; if catalog grows past ~200 products, add a
   real `/api/search` endpoint.
5. **Reviews / back-in-stock**: reference has `BackInStockModal` and
   `reviewImages`. UI ships; reviews stay as static admin-uploadable images
   per product. Back-in-stock modal collects email → `/api/notify-me` →
   `NotifyMeRequest` table (added now to avoid follow-up work).
6. **Newsletter**: reference has `NewsletterForm`. POST `/api/newsletter` →
   `NewsletterSubscriber` table; no third-party integration v1.
7. **Image hosting (placeholders)**: the cocowyo.com URLs in the reference's
   fixtures are placeholders the user will replace via admin uploads
   (products/collections) and direct seed edits (blogs, comics, about,
   gallery). `cocowyo.com` is added to `next.config.ts` `images.remotePatterns`
   so the placeholders load during development; can be removed once swapped.
8. **i18n / SEO**: out of scope. Hardcoded English copy and baseline metadata only.
9. **Dependency upgrades**: React 18 → 19, lucide-react `^1.8.0` →
   `^0.468.0` (different major; import names change). All other deps move to
   the reference's `package.json` versions.
10. **Brand rename**: the codebase keeps the `jovie-joy-*` project / package
    names for now. Renaming repo, .NET project namespace, Docker images, and
    DB name is a separate cleanup PR after the overhaul lands.

## Out-of-scope (post-overhaul backlog)

- Admin CRUD for blogs, articles, comic worlds, comics, gallery, navigation tree,
  footer groups, social links, static pages, FAQs, featured-on
- Server-side search
- Customer reviews submission
- Newsletter delivery (Mailchimp/Resend etc.)
- i18n, multi-currency
- Project/repo rename to drop "jovie-joy"
