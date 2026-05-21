# ProCast Deployment Guide

This project is deployment-ready as a Vercel-hosted frontend plus a separately hosted backend, or as a containerized full-stack website:

- `frontend`: Next.js website
- `backend`: Express API and WebSocket server
- `worker`: BullMQ background worker
- `postgres`: production database
- `redis`: queue, recovery, and realtime infrastructure

## 1. Vercel Frontend Deployment

Vercel should host only the Next.js frontend in this repository. The backend is a long-running Express API with WebSockets, BullMQ workers, Redis, and Postgres, so it needs a separate backend host.

Import setup:

1. Push this repo to GitHub.
2. In Vercel, choose **Add New > Project** and import the repo.
3. Set **Root Directory** to `frontend`.
4. Keep **Framework Preset** as `Next.js`.
5. Use these commands if Vercel asks:
   - Install Command: `npm install`
   - Build Command: `npm run build`
   - Output Directory: leave blank/default
6. Deploy after adding the environment variables below.

Required Vercel environment variables:

```env
NEXT_PUBLIC_API_URL=/v1
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
PROCAST_API_BASE_URL=https://api.your-domain.com
```

`PROCAST_API_BASE_URL` is the public origin of the backend service. Use the backend origin only, without `/v1`, unless your backend is intentionally mounted under another base path.

How API calls work on Vercel:

- The browser calls `/v1/...` on the Vercel frontend.
- `frontend/app/v1/[...path]/route.ts` forwards the request to `${PROCAST_API_BASE_URL}/v1/...`.
- This keeps auth cookies same-origin from the browser's point of view.

Health checks after deploy, assuming your Vercel app is `https://your-project.vercel.app`:

```bash
curl https://your-project.vercel.app/api/health
curl https://your-project.vercel.app/v1/health/live
curl https://your-project.vercel.app/v1/health/ready
```

Backend requirement:

- Host `backend/` somewhere that supports a persistent Node process, WebSockets, Redis, and Postgres.
- Run Prisma migrations before or during backend deployment with `npm run prisma:deploy --workspace backend`.
- Run the worker separately with `npm run start:worker --workspace backend`.
- Set backend `FRONTEND_ORIGIN` to your Vercel frontend URL.
- Keep `COOKIE_DOMAIN` empty for `*.vercel.app`. Set it only when using your own shared parent domain, for example `.procast.example.com`.

## 2. Docker Compose Deployment

### Prepare Environment

Copy the production template:

```bash
cp .env.production.example .env.production
```

Edit `.env.production` and replace every `replace-with...` value. Production will refuse weak JWT secrets.

For local production testing, you can temporarily use:

```env
FRONTEND_ORIGIN=http://localhost:3000
API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_API_URL=http://localhost:4000/v1
```

For a real domain, use:

```env
FRONTEND_ORIGIN=https://your-domain.com
API_BASE_URL=https://api.your-domain.com
NEXT_PUBLIC_API_URL=https://api.your-domain.com/v1
COOKIE_DOMAIN=.your-domain.com
```

## Vercel Frontend

If deploying the frontend on Vercel, set these environment variables in the Vercel project:

```env
NEXT_PUBLIC_API_URL=/v1
NEXT_PUBLIC_APP_URL=https://your-vercel-app.vercel.app
PROCAST_API_BASE_URL=https://your-backend-domain.com
```

`PROCAST_API_BASE_URL` must be the backend origin only, without `/v1`. The frontend API proxy route forwards `/v1/*` to `${PROCAST_API_BASE_URL}/v1/*`, so signup, login, refresh, and timer APIs do not accidentally call the Vercel frontend itself. Vercel builds now fail if `NEXT_PUBLIC_API_URL=/v1` is used without `PROCAST_API_BASE_URL`, because that would reproduce the signup 500 seen when the frontend calls its own domain.

### Build and Start

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up --build -d
```

The one-shot `migrate` container runs Prisma migrations and a backend preflight check before the API starts. The worker starts only after the backend is healthy.

### Verify Health

```bash
curl http://localhost:4000/v1/health/live
curl http://localhost:4000/v1/health/ready
curl http://localhost:3000/api/health
```

You can also run the backend preflight check:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec backend npm run preflight:prod --workspace backend
```

To validate the Compose file against the template without creating `.env.production`, set:

```bash
PROCAST_RUNTIME_ENV_FILE=.env.production.example docker compose --env-file .env.production.example -f docker-compose.prod.yml config
```

PowerShell:

```powershell
$env:PROCAST_RUNTIME_ENV_FILE=".env.production.example"
docker compose --env-file .env.production.example -f docker-compose.prod.yml config
```

## 3. Production Checklist

- Put TLS in front of both frontend and API.
- Set `FRONTEND_ORIGIN` to the exact website origin.
- On Vercel, keep `NEXT_PUBLIC_API_URL=/v1` so the frontend uses the same-origin proxy.
- For Docker or direct public API hosting, set `NEXT_PUBLIC_API_URL` to the public API `/v1` URL before building the frontend image.
- Use managed Postgres/Redis for serious production, or back up the Docker volumes regularly.
- Keep `worker` running; notifications, analytics aggregation, backups, and recovery jobs depend on it.
- Monitor `/v1/health/ready`, container restarts, and backend logs.

## 4. One-Server Reverse Proxy Shape

Recommended routing:

- `https://your-domain.com` -> frontend container port `3000`
- `https://api.your-domain.com` -> backend container port `4000`
- WebSockets are served by the backend and must support connection upgrade.

## 5. Updating Production

```bash
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml up --build -d
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

Migrations run automatically during backend startup.
