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
npm install
NEXT_PUBLIC_API_URL=http://localhost:8080 npm run dev   # http://localhost:3000
```

## Admin dashboard

The admin panel lives at `/admin`. Visit `/admin/login` to sign in with your admin credentials.

### Default credentials

| Field    | Value                |
| -------- | -------------------- |
| Email    | `admin@joviejoy.com` |
| Password | `changeme123`        |

**Change the password before going to production.** Update `Admin__Email` and `Admin__Password` in `apps/api/.env` (or environment variables on the server). The API seeds the admin user on startup — if the user already exists the seed is skipped, so you must update the hash in the database directly after first deploy, or set the vars before first run.

### Admin sections

- **Analytics** — revenue stats, 30-day chart, top products
- **Products** — create/edit products, upload PDFs
- **Orders** — paginated order list with status filter and line-item drill-down
- **Content** — edit home page text, about page text, and upload photos

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

Deploys via a **GitHub Actions self-hosted runner** on the VM at `192.168.4.106`. Pushes to `main` trigger the workflow; the runner runs `docker compose -f docker-compose.prod.yml up -d --build` in the repo checkout directory.

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
Admin__Email=admin@joviejoy.com
Admin__Password=changeme123
```

## License

Private.
