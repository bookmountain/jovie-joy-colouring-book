# Handoff — Zoe&Book overhaul, Phase 1 BE complete

This phase replaced the Jovie Joy BE schema (12 products + key-value `SiteContent`)
with the richer Zoe&Book domain. Phases 2 (FE adoption) and 3 (admin UI) are
documented in `docs/superpowers/plans/`.

## What changed

- New EF migration `OverhaulInitial` drops `products`, `site_content`, `order_items`,
  `orders` and recreates the rich schema (19 new entities, listed in the design spec).
- Orders **were wiped** in this DB swap. Confirmed acceptable in the spec.
- Public read endpoints serve all FE content domains (see README).
- Admin endpoints cover Products, Collections, ContentBlocks, Orders, Analytics,
  Uploads. Other content domains (blogs, comics, gallery, navigation, FAQs, etc.)
  are seeded via `Data/Seed/*` and edited in code until Phase 3 layers admin UI.
- `Wishlist`, `NotifyMeRequest`, `NewsletterSubscriber` added.

## What's next

- Phase 2 (`docs/superpowers/plans/2026-05-19-zoe-book-overhaul-phase-2-fe.md`) —
  delete `apps/web/{app,components,lib}`, drop in the reference repo's `src/`, wire
  cart/wishlist/auth to this API.
- Phase 3 (`docs/superpowers/plans/2026-05-19-zoe-book-overhaul-phase-3-admin.md`) —
  cocoa-themed admin pages backed by the admin endpoints above.

## Pre-deploy reminders

- Re-run `dotnet ef migrations script` against staging before applying to prod —
  the migration drops tables and is non-reversible.
- Confirm `Stripe__WebhookSecret`, `Jwt__Secret`, `Google__ClientId/Secret`,
  `Admin__Email/Password` are set in `apps/api/.env`.
- Smoke checks (after deploy): `/health`, `/api/products`, `/api/collections`,
  `/api/content`, `/auth/me` (with admin token).
