# Server setup (one-time)

Run these on the VM at `192.168.4.106` yourself. Do not paste passwords or tokens into chat with an LLM.

## 1. Rotate credentials

If you haven't already, rotate any shared SSH password:

```bash
passwd
```

## 2. Install the GitHub Actions self-hosted runner

In GitHub, go to the repo → Settings → Actions → Runners → **New self-hosted runner**, choose Linux x64, and copy the fresh registration token. (Tokens are short-lived — generate a new one each time.)

On the VM, as the `book` user:

```bash
cd /work
mkdir -p actions-runner && cd actions-runner

curl -o actions-runner-linux-x64.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.333.1/actions-runner-linux-x64-2.333.1.tar.gz
tar xzf actions-runner-linux-x64.tar.gz

./config.sh --url https://github.com/bookmountain/jovie-joy-colouring-book --token YOUR_FRESH_TOKEN

# Install as a systemd service so it survives reboots
sudo ./svc.sh install book
sudo ./svc.sh start
sudo ./svc.sh status
```

Verify the runner shows as idle in the repo's Settings → Actions → Runners page.

## 3. Clone the repo

The deploy workflow does `git pull` inside `/work/jovie-joy`, so it must be a real git checkout:

```bash
cd /work
git clone https://github.com/bookmountain/jovie-joy-colouring-book.git jovie-joy
cd jovie-joy
```

## 4. Create the production env file

`apps/api/.env` (gitignored — safe to live in the checkout):

```env
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://0.0.0.0:8080

# "db" is the service name in docker-compose.prod.yml
ConnectionStrings__Default=Host=db;Port=5432;Database=jovie_joy;Username=postgres;Password=postgres

# openssl rand -base64 48
Jwt__Secret=REPLACE_WITH_32_BYTES_OF_RANDOM
Jwt__Issuer=jovie-joy-api
Jwt__Audience=jovie-joy-web
Jwt__ExpiryMinutes=60

Google__ClientId=REPLACE_ME.apps.googleusercontent.com
Google__ClientSecret=REPLACE_ME
Google__RedirectUri=http://192.168.4.106:5080/auth/google/callback

WebAppUrl=http://192.168.4.106:3080

Stripe__SecretKey=sk_test_REPLACE_ME
Stripe__WebhookSecret=whsec_REPLACE_ME
Stripe__SuccessUrl=http://192.168.4.106:3080/checkout/success?session_id={CHECKOUT_SESSION_ID}
Stripe__CancelUrl=http://192.168.4.106:3080/checkout

Admin__Email=admin@joviejoy.com
Admin__Password=changeme123
```

Lock it down:

```bash
chmod 600 /work/jovie-joy/apps/api/.env
```

## 5. First boot

Push to `main` (or click "Run workflow" in the Actions tab). The deploy workflow runs on the self-hosted runner and:

1. Verifies `/work/jovie-joy` is a git checkout and the `.env` exists (fails fast otherwise)
2. `git fetch && git reset --hard origin/main` inside `/work/jovie-joy` (leaves the gitignored `.env` alone)
3. `docker compose -f docker-compose.prod.yml build && up -d`
4. Polls `http://localhost:5080/health` for up to 60s
5. Prunes old images

This starts three containers: `jovie-joy-db` (Postgres), `jovie-joy-api`, and `jovie-joy-web`. EF Core migrations apply automatically on API startup, seeding the admin user.

To smoke-test manually:

```bash
cd /work/jovie-joy
docker compose -f docker-compose.prod.yml up -d
```

## 6. Google OAuth configuration

Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID → Web application.

Authorized redirect URIs:
- `http://localhost:8080/auth/google/callback` (dev)
- `http://192.168.4.106:5080/auth/google/callback` (prod — or your domain if you have one)

Copy the client ID and secret into `apps/api/.env`.

## 7. Stripe configuration

Stripe Dashboard:

1. Grab the test secret key → `Stripe__SecretKey`.
2. Webhooks → Add endpoint.
   - URL: `https://your-public-domain/webhooks/stripe`.
   - **Important:** Stripe can only reach public URLs. `192.168.4.106` is a private IP, so webhooks will not fire directly. Options:
     - Put a reverse proxy with a public DNS record in front of the VM.
     - Use a tunnel (Cloudflare Tunnel, ngrok) to expose `/webhooks/stripe` publicly.
     - For local development, use `stripe listen --forward-to localhost:8080/webhooks/stripe` from the Stripe CLI.
   - Events to subscribe to: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`.
3. Copy the signing secret → `Stripe__WebhookSecret`.

## 8. Common ops

All commands run from `/work/jovie-joy`.

```bash
# Tail logs
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f web

# Connect to the app DB
docker exec -it jovie-joy-db psql -U postgres -d jovie_joy

# Runner status
sudo /work/actions-runner/svc.sh status
```
