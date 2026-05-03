FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci

FROM deps AS builder
WORKDIR /app
COPY backend backend
ENV NODE_ENV=production
ENV DATABASE_URL=postgresql://procast:procast@postgres:5432/procast?schema=public
ENV REDIS_URL=redis://redis:6379
ENV JWT_ACCESS_SECRET=build-time-access-secret-change-at-runtime-123456
ENV JWT_REFRESH_SECRET=build-time-refresh-secret-change-at-runtime-123456
RUN npm run build --workspace backend

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --omit=dev --workspace backend --include-workspace-root && npm cache clean --force
COPY --from=builder /app/backend/dist backend/dist
COPY --from=builder /app/backend/generated backend/generated
COPY --from=builder /app/backend/prisma backend/prisma
COPY --from=builder /app/backend/prisma.config.ts backend/prisma.config.ts
USER node
EXPOSE 4000
CMD ["npm", "run", "start", "--workspace", "backend"]
