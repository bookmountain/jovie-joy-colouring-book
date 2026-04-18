# Server setup (one-time)

Run these on the VM at `192.168.4.106` yourself. Do not paste passwords or tokens into chat with an LLM.

## 1. Rotate credentials

You shared an SSH password earlier. Rotate it now:

```bash
passwd
```

## 2. Install the GitHub Actions self-hosted runner

In GitHub, go to the repo → Settings → Actions → Runners → **New self-hosted runner**, choose Linux x64, and copy the fresh registration token. (Tokens are short-lived — don't reuse old ones.)

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

Verify in the repo's runner settings page that the runner shows as idle.

## 3. Create the database

The existing `bookcv-db` container runs Postgres 17. Add a new database and user alongside `bookcv`:

```bash
# Pick a strong password and save it — you'll put it in apps/api/.env below.
DB_PASS='replace-me-strong-password'

docker exec -i bookcv-db psql -U postgres <<SQL
CREATE USER jovie WITH ENCRYPTED PASSWORD '${DB_PASS}';
CREATE DATABASE jovie_joy OWNER jovie;
GRANT ALL PRIVILEGES ON DATABASE jovie_joy TO jovie;
SQL
```

Verify:

```bash
docker exec -it bookcv-db psql -U jovie -d jovie_joy -c "\l"
```

## 4. Clone the repo

```bash
cd /work
git clone https://github.com/bookmountain/jovie-joy-colouring-book.git jovie-joy
cd jovie-joy
```

## 5. Identify the docker network bookcv-db is on

```bash
docker inspect bookcv-db --format '{{range $n, $c := .NetworkSettings.Networks}}{{$n}}{{"\n"}}{{end}}'
```

Edit `docker-compose.prod.yml` and change the `bookcv` network name under `networks:` to match. From inside that network the API reaches Postgres at `bookcv-db:5432`.

## 6. Create production env files

```bash
mkdir -p apps/api apps/web
```

`apps/api/.env`:

```env
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://0.0.0.0:8080

ConnectionStrings__Default=Host=bookcv-db;Port=5432;Database=jovie_joy;Username=jovie;Password=REPLACE_ME

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
```

`apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://192.168.4.106:5080
NEXT_PUBLIC_APP_URL=http://192.168.4.106:3080
NODE_ENV=production
```

Lock them down:

```bash
chmod 600 apps/api/.env apps/web/.env.local
```

## 7. First boot

With the self-hosted runner approach, the GitHub Actions workflow builds the docker images on the VM itself and runs `docker compose up`. But for the very first deploy you can also do it manually to verify everything works:

```bash
cd /work/jovie-joy
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml logs -f
```

EF Core migrations apply automatically on API startup.

## 8. Google OAuth configuration

Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID → Web application.

Authorized redirect URIs:
- `http://localhost:5080/auth/google/callback` (dev)
- `http://192.168.4.106:5080/auth/google/callback` (prod — or your domain if you have one)

Copy the client ID and secret into `apps/api/.env`.

## 9. Stripe configuration

Stripe Dashboard:

1. Grab the test secret key → `Stripe__SecretKey`.
2. Webhooks → Add endpoint.
   - URL: `https://your-public-domain/webhooks/stripe`.
   - **Important:** Stripe can only reach public URLs. `192.168.4.106` is a private IP, so webhooks will not fire against your VM directly. Options:
     - Put a reverse proxy with a public DNS record in front of the VM.
     - Use a tunnel (Cloudflare Tunnel, ngrok) to expose `/webhooks/stripe` publicly.
     - For local development, use `stripe listen --forward-to localhost:5080/webhooks/stripe` from the Stripe CLI.
   - Events to subscribe to: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`.
3. Copy the signing secret → `Stripe__WebhookSecret`.

Without webhooks, the checkout → Stripe redirect → success page flow still works; it just won't persist the paid order to the database until the webhook hits. Not production-ready until this piece is connected.

## 10. Common ops

```bash
# Tail logs
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f web

# Manual redeploy (the GitHub Actions workflow does this automatically)
git pull
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# Connect to the app DB
docker exec -it bookcv-db psql -U jovie -d jovie_joy

# Runner status
sudo /work/actions-runner/svc.sh status
```
