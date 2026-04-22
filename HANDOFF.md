# Handoff — status as of this bundle

This is a partial scaffold. Backend is ~60% complete; frontend and deploy pipeline are not started.

## What exists

### Root
- `README.md`, `.gitignore`
- `docker-compose.yml` (local dev Postgres on port 5432)
- `docker-compose.prod.yml` (prod — API/web only; joins the existing `shared-services` network and uses `shared-postgres`)
- `docs/SERVER-SETUP.md` (one-time VM setup: self-hosted runner, shared database, env files, Google + Stripe)

### Backend (`apps/api/`)
.NET 9 Web API with EF Core + Npgsql + Stripe.net + manual Google OAuth + JWT.

- `JovieJoy.Api.csproj` — all packages pinned
- `Program.cs` — bootstrap, JWT auth, CORS, migrations-on-startup, DI
- `.env.example` — every required env var documented
- `Data/AppDbContext.cs` + 4 entities (`User`, `Product`, `Order`, `OrderItem`)
- `Data/DbSeeder.cs` — all 12 products from the design with cents-based prices
- `Contracts/Dtos.cs` — request/response records
- `Services/TokenService.cs` — issues JWTs
- `Services/GoogleAuthService.cs` — manual OAuth2 (authorization URL → code exchange → upsert user)
- `Services/StripeService.cs` — creates Checkout Sessions
- `Services/OrderService.cs` — server-trusted price lookup, idempotent `MarkPaidAsync`
- `Controllers/ProductsController.cs` — `GET /api/products`, `GET /api/products/{id}`
- `Controllers/AuthController.cs` — `GET /auth/google`, `GET /auth/google/callback`, `GET /auth/me`
- `Controllers/CheckoutController.cs` — `POST /api/checkout`

### Design reference
- The original design handoff bundle (HTML/CSS/JSX prototypes) should be re-attached for whoever builds the frontend. The 12 products in `DbSeeder.cs` match `shared.jsx` in that bundle exactly, so the DB-side contract is already locked.

## What's missing — in priority order

1. **`Controllers/WebhooksController.cs`** — Stripe webhook handler. Verifies signature with `Stripe__WebhookSecret`, calls `IOrderService.MarkPaidAsync`. Without this the backend is not production-usable. ~40 lines.

2. **EF Core initial migration** — run once locally:
   ```bash
   cd apps/api
   dotnet ef migrations add Initial
   ```
   Migrations apply automatically on API startup; you just need to generate the first one.

3. **Entire Next.js frontend (`apps/web/`)** — 0 of 6 pages built.
   - Stack chosen: Next.js 15 App Router, Tailwind, shadcn/ui, TypeScript
   - Pages to build: home, shop, product detail, checkout, freebie, about
   - Match the design in the handoff bundle — the visual language is very specific (Sniglet/DM Sans/Caveat fonts, `2.5px solid var(--ink)` borders, `4px 4px 0 0` hard shadows, warm cream/tomato/sun palette, wiggle/bob animations, star stickers, squiggly SVG dividers, hand-drawn SVG product covers)
   - Cart state: localStorage (the prototype already uses this — keep compatibility)
   - Auth flow: `/auth/callback?token=...` page stores the JWT and redirects; `Authorization: Bearer ...` header on API calls

4. **Dockerfiles**:
   - `apps/api/Dockerfile` — multi-stage .NET build, runtime is `mcr.microsoft.com/dotnet/aspnet:9.0-alpine`, expose 8080
   - `apps/web/Dockerfile` — multi-stage Node build, runtime `node:20-alpine`, `next start` on 3000

5. **`.github/workflows/deploy.yml`** — self-hosted runner workflow:
   ```yaml
   on:
     push:
       branches: [main]
   jobs:
     deploy:
       runs-on: self-hosted
       steps:
         - uses: actions/checkout@v4
         - name: Build & restart
           run: |
             cd /work/jovie-joy
             git pull
             docker compose -f docker-compose.prod.yml build
             docker compose -f docker-compose.prod.yml up -d --remove-orphans
   ```
   Keep it minimal. The runner is already on the VM so there's no SSH/image-push ceremony.

6. **Minor cleanups**:
   - The `api/.env.example` currently points at `localhost:5432` to match the local `docker-compose.yml`. Production uses `shared-postgres:5432`.
   - `WebhooksController` must be registered for raw request body reading (Stripe signature verification needs the exact bytes).

## Known caveats

- **Stripe webhooks need a public URL.** `192.168.4.106` is private; plan for a tunnel or reverse proxy. Documented in `docs/SERVER-SETUP.md` §9.
- **The `CheckoutController.Create` flow** calls Stripe *before* saving the session ID to the DB. If Stripe returns a session but the DB save fails, you get an orphaned Stripe session. Low risk for this scale; worth knowing. Fix: wrap in a transaction or save a pending order first, patch the session ID after.
- **Promo codes are hardcoded** in `OrderService` (`FIRST10` → 10% off). Add a `Promos` table when you need more than that.
- **No rate limiting** on `/auth/google` or `/api/checkout`. Add before going public.
- **JWTs are stored however the frontend decides** — I'd recommend an httpOnly cookie set by an API endpoint rather than the current `?token=...` redirect + client storage, but that's a refactor for when the frontend exists.

## Security notes to carry forward

- The SSH password `Book1995*` was pasted in chat turn 1. Should be rotated already; if not, do it before deploying anything.
- The runner registration token from turn 4 is likely expired; generate fresh ones when actually installing the runner.
- `Jwt__Secret` and `Stripe__WebhookSecret` should be unique per environment and never committed.
