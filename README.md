# ProCast Platform

ProCast is now organized as a production-style monorepo:

- `frontend/` - Next.js UI that calls the backend through `NEXT_PUBLIC_API_URL`.
- `backend/` - Express.js + TypeScript backend with PostgreSQL, Prisma, Redis, BullMQ, cron jobs, workers, WebSockets, JWT auth, audit logs, self-healing, analytics aggregation, and backup manifests.

The old static HTML/CSS files were removed because the Next frontend replaced them.

## Local Infrastructure

```bash
docker compose up -d
```

This starts:

- PostgreSQL on `127.0.0.1:5432`
- Redis on `127.0.0.1:6379`

## Install

```bash
npm install
```

## Database

```bash
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

Demo login:

- Username: `user1`
- Password: `123456789`

## Development

Backend API:

```bash
npm run dev:backend
```

Frontend:

```bash
npm run dev:frontend
```

Workers:

```bash
npm run worker --workspace backend
```

## Production Checks

```bash
npm run lint
npm run typecheck
npm run build
npm audit --audit-level=moderate
```

## Backend Capabilities

- Enterprise auth: signup, login, access/refresh tokens, refresh rotation, lockouts, password reset, email verification-ready tokens, session records.
- Timer authority: start, active session restore, pause, resume, heartbeat, completion validation, early exit, anti-cheat drift flags.
- XP engine: idempotent XP ledger, atomic progress updates, no duplicate rewards.
- World progression: Empty Land through Kingdom, unlock history, lock-back support.
- Streak engine: timezone-aware daily/weekly streak events and recovery hooks.
- Tasks: priorities, due dates, tags, recurring-ready fields, separate avoidance prompt history.
- Reflections: structured post-session psychology data and pattern tracking.
- Analytics: precomputed daily snapshots and dashboard summaries.
- Notifications: durable records, queued delivery, retry-ready worker path.
- Self-healing: stuck timer detection, recovery queue, recovery logs, progress repair.
- Observability: audit logs, security events, health records, cron run history, queue job audits.
- Recovery: backup manifest jobs, migration deployment path, Docker-ready Postgres/Redis.

## Main API Routes

- `POST /v1/auth/signup`
- `POST /v1/auth/login`
- `POST /v1/auth/refresh`
- `POST /v1/auth/logout`
- `GET /v1/users/me`
- `POST /v1/tasks`
- `PATCH /v1/tasks/:taskId`
- `POST /v1/timer/sessions`
- `GET /v1/timer/active`
- `POST /v1/timer/sessions/:sessionId/pause`
- `POST /v1/timer/sessions/:sessionId/resume`
- `POST /v1/timer/sessions/:sessionId/heartbeat`
- `POST /v1/timer/sessions/:sessionId/complete`
- `POST /v1/timer/sessions/:sessionId/abandon`
- `GET /v1/analytics/dashboard`
- `GET /v1/health/ready`
- WebSocket: `/ws?token=<access-token>`
