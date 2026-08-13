# jovie-joy-colouring-book

Printable colouring books for tiny hands. Monorepo with Next.js frontend + ASP.NET Core backend + Postgres.

## Stack

| Layer    | Tech                                                                 |
| -------- | -------------------------------------------------------------------- |
| Frontend | Next.js 15 (App Router), TypeScript                                  |
| Backend  | ASP.NET Core 9, Entity Framework Core                                |
| Database | PostgreSQL 17                                                        |
| Auth     | Google OIDC (id_token via JWKS) + admin email/password, JWT sessions |
| Payments | Stripe Checkout (one-time, digital PDF downloads)                    |
| Deploy   | GitHub Actions → self-hosted runner on VM                            |

## Repo layout

```
.
├── apps/
│   ├── web/                Next.js frontend
│   └── api/                ASP.NET Core backend
│       └── uploads/        PDF and image uploads (git-ignored)
├── .github/workflows/      CI + deploy pipelines
├── docker-compose.yml      Local dev
├── docker-compose.prod.yml Production
└── README.md
```

## Local development

### Prerequisites

- Node 20+
- .NET 9 SDK
- Docker (for Postgres)

### First-time setup

```bash
# 1. Start Postgres
docker compose up -d db

# 2. Backend
cd apps/api
cp .env.example .env               # fill in Google + Stripe keys
dotnet restore
dotnet ef database update          # apply migrations (seeds admin user too)
dotnet run                         # http://localhost:8080

# 3. Frontend (new terminal)
cd apps/web
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8080
npm install
npm run dev                         # http://localhost:3000
npm run typecheck                   # tsc --noEmit
npm test                            # vitest unit tests
npx playwright test                 # e2e (needs BE running)
```

The frontend is the Zoe&Book storefront (cocoa palette, Nunito font,
rounded-coco design tokens). All content — products, collections, blogs,
comics, gallery, about, FAQs, navigation, footer groups, announcement bar
— is served by the Phase 1 BE. Cart + wishlist persist client-side
(localStorage) with BE sync when signed in via Google OIDC.

## Admin dashboard

After Phase 3, the admin panel is the Zoe&Book FE itself at `/admin`. Sign in at `/admin/login` with your admin credentials.

### Admin bootstrap

A fresh database has no default admin credentials. Before the first API startup,
set `Admin__Email` and `Admin__Password` in `apps/api/.env`; generate a unique
password with `openssl rand -base64 32`. The API refuses to start if no admin
exists and either value is missing, the email is invalid, or the password is
shorter than 16 characters or resembles a common/default password.

After an admin exists, bootstrap values are optional and no account is recreated
from defaults. Treat these values as secrets and never commit them.

### Admin sections

- **Dashboard** — revenue summary + last-30-days table + top products
- **Products** — rich CRUD with multi-image upload, PDF upload, collection tagging
- **Collections** — CRUD with hero image upload + curated product order
- **Content** — typed editors for `HomeHero`, `Announcement`, `HomeVideo`, `HeroArtwork`; raw-JSON fallback editor for other block types
- **Orders** — paginated table with status filter + line-item drill-down

All image uploads land under the BE's `/uploads/` static-files folder and are returned as relative URLs (`/uploads/products/...`, `/uploads/collections/...`, `/uploads/content/...`, `/uploads/general/...`). The FE renders them by prepending `NEXT_PUBLIC_API_URL`.

#### Editable pages (Phase 4a)

The admin can edit the home page, footer chrome, header chrome, announcement bar, newsletter copy, and any static page:

- `/admin/pages/home` — hero, "Hi Friend!" panel, Cozy Moments heading, home video, footer artwork
- `/admin/pages/footer` — contact emails, footer link groups, social links, search trending terms
- `/admin/pages/header` — brand name, search placeholder
- `/admin/pages/announcement` — announcement bar enable/text/href
- `/admin/pages/newsletter` — heading, CTA label, success message
- `/admin/static-pages` — list + create + edit static pages (About, FAQ, etc.)

Storefront components fall back to the original hardcoded strings when a ContentBlock is missing, so partial deploys don't blank out the site.

### Public endpoints serving the storefront

`/api/products`, `/api/products/{slug}`,
`/api/collections`, `/api/collections/{slug}`,
`/api/content`, `/api/blogs`, `/api/blogs/{slug}`, `/api/blogs/{slug}/articles/{articleSlug}`,
`/api/comics`, `/api/about`, `/api/gallery`, `/api/pages/{slug}`, `/api/faqs`,
`/api/newsletter` (POST), `/api/notify-me` (POST), `/api/wishlist` (auth).

## Google OAuth setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Add authorised redirect URI: `http://localhost:8080/auth/google/callback` (and your prod URL)
4. Copy Client ID and Client Secret into `apps/api/.env`:

```
Google__ClientId=YOUR_CLIENT_ID
Google__ClientSecret=YOUR_CLIENT_SECRET
```

## Deployment

Deploys via a **GitHub Actions self-hosted runner** on the VM at `192.168.4.106`. Pushes to `main` trigger the workflow; the runner uses `apps/api/.env` for Compose interpolation and rebuilds/restarts the stack from the repo checkout directory.

One-time server setup:

- Install the self-hosted runner as a systemd service
- Create DB and user in the shared `shared-postgres` container
- Clone the repo to `/work/jovie-joy`
- Populate `apps/api/.env` with production secrets (see below)

### Backend env vars (`apps/api/.env`)

```
POSTGRES_USER=jovie
POSTGRES_PASSWORD=...
POSTGRES_DB=jovie_joy
POSTGRES_HOST=shared-postgres
POSTGRES_PORT=5432
ConnectionStrings__Default=Host=shared-postgres;Port=5432;Database=jovie_joy;Username=jovie;Password=...
Google__ClientId=...
Google__ClientSecret=...
Jwt__Secret=<32+ random chars>
Jwt__Issuer=jovie-joy-api
Jwt__Audience=jovie-joy-web
Stripe__SecretKey=sk_live_...
Stripe__WebhookSecret=whsec_...
Stripe__SuccessUrl=https://yourdomain.com/success
Stripe__CancelUrl=https://yourdomain.com/cart
WebAppUrl=https://yourdomain.com
# Required on first boot only; choose your own email and generated secret.
Admin__Email=you@yourdomain.com
# Set this to the output of: openssl rand -base64 32
Admin__Password=
# Shared private API→Next cache-invalidation secret. Generate with:
# openssl rand -hex 32
CACHE_REVALIDATION_SECRET=
```

The deployment workflow generates this private secret when it is absent or
blank; you can also generate and set it ahead of time with the command above.

### Storefront cache freshness

The public storefront uses two complementary cache mechanisms:

1. Anonymous pages and their API reads are cached for fast navigation, with a
   60-second time-based revalidation interval.
2. After a successful CMS mutation, the API sends a signed, internal POST to
   Next.js. Next expires only the affected data tag and page routes (catalog,
   content, gallery, FAQs, and so on), so the next server request reads the saved
   data instead of waiting for the interval.

The signed notification is deliberately best-effort. A temporary Next.js outage
does not turn an already-committed CMS save into a false failure; time-based ISR
remains the normal recovery path. Revalidation marks cache entries stale rather
than rebuilding every route immediately, so the first request for an affected
route may perform regeneration. An already-open browser tab also cannot be
remotely replaced: use **View storefront** (which opens a new tab) or hard-refresh
an existing preview after saving. Client-side static route reuse is limited to 60
seconds instead of Next.js's five-minute default.

## License

Private.
