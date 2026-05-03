FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci

FROM deps AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
COPY frontend frontend
RUN npm run build --workspace frontend

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/frontend/public frontend/public
COPY --from=builder /app/frontend/.next/static frontend/.next/static
COPY --from=builder /app/frontend/.next/standalone ./
USER node
EXPOSE 3000
CMD ["node", "frontend/server.js"]
