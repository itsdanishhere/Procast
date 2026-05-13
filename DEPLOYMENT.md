# ProCast Deployment Guide

This project is deployment-ready as a Render Blueprint or as a containerized full-stack website:

- `frontend`: Next.js website
- `backend`: Express API and WebSocket server
- `worker`: BullMQ background worker
- `postgres`: production database
- `redis`: queue, recovery, and realtime infrastructure

## 1. Render Deployment

Use `render.yaml` when deploying this repository on Render. The Blueprint creates:

- `procast-web`: Next.js frontend web service
- `procast-api`: Express API web service
- `procast-worker`: BullMQ background worker
- `procast-db`: managed PostgreSQL
- `procast-redis`: Render Key Value

The frontend calls `/v1/...` on its own origin. `frontend/app/v1/[...path]/route.ts` forwards those requests to `procast-api` over Render's private network by using the `PROCAST_API_HOSTPORT` value injected from the Blueprint.

Render setup:

1. Push this repo to GitHub or GitLab.
2. In Render, choose **New > Blueprint** and select this repo.
3. Review `render.yaml` before the first deploy. Change `region` before deploying if Oregon is not the right region for your users.
4. Deploy the Blueprint.
5. If Render changes the service subdomains, update these env vars and redeploy:
   - `NEXT_PUBLIC_APP_URL` on `procast-web`
   - `API_BASE_URL` and `FRONTEND_ORIGIN` in the `procast-runtime` env group

The Blueprint pins Node with `.node-version` and `NODE_VERSION=22.22.0` so Render does not silently use a newer major Node version.

Health checks after deploy:

```bash
curl https://procast-web.onrender.com/api/health
curl https://procast-web.onrender.com/v1/health/live
curl https://procast-web.onrender.com/v1/health/ready
```

Notes:

- The committed Blueprint uses paid starter/basic Render plans because this app has a worker, Postgres, Redis-compatible queues, and durable backup manifests.
- If you need a lower-cost hobby deployment, you can downgrade the web services, database, and Key Value plan, but Render background workers are not available on the free plan.
- Keep `COOKIE_DOMAIN` empty for `onrender.com` deployments. Set it only when using your own shared parent domain, for example `.procast.example.com`.

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
- On Render, keep `NEXT_PUBLIC_API_URL=/v1` so the frontend uses the private-network proxy.
- For Docker or separate public API hosting, set `NEXT_PUBLIC_API_URL` to the public API `/v1` URL before building the frontend image.
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
