# jovie-joy-colouring-book

Printable colouring books for tiny hands. Monorepo with Next.js frontend + ASP.NET Core backend + Postgres.

## Stack

- **Frontend** — Next.js 15 (App Router), Tailwind CSS, shadcn/ui, TypeScript
- **Backend** — ASP.NET Core 9 Web API, EF Core, Npgsql
- **Database** — PostgreSQL 17 (shared container with `bookcv-db` in prod)
- **Auth** — Google OAuth via ASP.NET, JWT-issued sessions
- **Payments** — Stripe Checkout (one-time, digital PDF downloads)
- **Deploy** — GitHub Actions → self-hosted VM via SSH

## Repo layout

```
.
├── apps/
│   ├── web/          Next.js frontend
│   └── api/          ASP.NET Core backend
├── .github/workflows/ CI + deploy pipelines
├── docker-compose.yml Local dev (+ prod reference)
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
dotnet ef database update          # apply migrations
dotnet run                         # http://localhost:5080

# 3. Frontend (new terminal)
cd apps/web
cp .env.local.example .env.local   # fill in NEXT_PUBLIC_API_URL etc.
npm install
npm run dev                        # http://localhost:3000
```

## Deployment

Deploys via a **GitHub Actions self-hosted runner** installed on the VM at `192.168.4.106`. Pushes to `main` trigger the workflow; because the runner is already on the VM, deployment is just `docker compose up -d` in the repo's working directory — no SSH keys needed.

One-time server setup (run yourself — see `docs/SERVER-SETUP.md`):
- Install the self-hosted runner as a systemd service
- Create DB + user in the existing `bookcv-db` container
- Clone repo to `/work/jovie-joy`
- Populate `apps/api/.env` and `apps/web/.env.local` with production secrets

## Secrets you'll need

Frontend (`apps/web/.env.local`):
- `NEXT_PUBLIC_API_URL` — e.g. `http://localhost:5080` locally

Backend (`apps/api/.env`):
- `ConnectionStrings__Default` — Postgres connection string
- `Google__ClientId`, `Google__ClientSecret` — from Google Cloud Console
- `Jwt__Secret` — 32+ byte random string, different per environment
- `Jwt__Issuer`, `Jwt__Audience`
- `Stripe__SecretKey`, `Stripe__WebhookSecret` — from Stripe Dashboard
- `Stripe__SuccessUrl`, `Stripe__CancelUrl`

GitHub Actions:
- Secrets are **not required** for deploy — the self-hosted runner already has filesystem access to the repo checkout on the VM.
- If you later add image publishing to GHCR, you'll need `GITHUB_TOKEN` (auto-provided) or a PAT.

## License

Private.
