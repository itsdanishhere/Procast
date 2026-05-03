# ProCast Deployment Guide

This project is deployment-ready as a containerized full-stack website:

- `frontend`: Next.js website
- `backend`: Express API and WebSocket server
- `worker`: BullMQ background worker
- `postgres`: production database
- `redis`: queue, recovery, and realtime infrastructure

## 1. Prepare Environment

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

## 2. Build and Start

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up --build -d
```

The one-shot `migrate` container runs Prisma migrations and a backend preflight check before the API starts. The worker starts only after the backend is healthy.

## 3. Verify Health

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

## 4. Production Checklist

- Put TLS in front of both frontend and API.
- Set `FRONTEND_ORIGIN` to the exact website origin.
- Set `NEXT_PUBLIC_API_URL` to the public API `/v1` URL before building the frontend image.
- Use managed Postgres/Redis for serious production, or back up the Docker volumes regularly.
- Keep `worker` running; notifications, analytics aggregation, backups, and recovery jobs depend on it.
- Monitor `/v1/health/ready`, container restarts, and backend logs.

## 5. One-Server Reverse Proxy Shape

Recommended routing:

- `https://your-domain.com` -> frontend container port `3000`
- `https://api.your-domain.com` -> backend container port `4000`
- WebSockets are served by the backend and must support connection upgrade.

## 6. Updating Production

```bash
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml up --build -d
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

Migrations run automatically during backend startup.
