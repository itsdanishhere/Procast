import { Router } from "express";

import { asyncHandler } from "../../shared/http/async-handler";
import { prisma } from "../../shared/prisma/client";
import { redis } from "../../shared/redis/client";

export const healthRoutes = Router();

healthRoutes.get(
  "/live",
  asyncHandler(async (_request, response) => {
    response.json({ ok: true, service: "procast-backend" });
  })
);

healthRoutes.get(
  "/ready",
  asyncHandler(async (_request, response) => {
    const started = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - started;
    const redisStarted = Date.now();
    await redis.ping();
    const redisLatencyMs = Date.now() - redisStarted;
    await prisma.healthCheckRecord.create({
      data: {
        component: "api",
        status: "ready",
        latencyMs: dbLatencyMs + redisLatencyMs,
        details: { dbLatencyMs, redisLatencyMs }
      }
    });
    response.json({ ok: true, dbLatencyMs, redisLatencyMs });
  })
);
