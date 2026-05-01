import IORedis from "ioredis";

import { env } from "../../config/env";
import { logger } from "../logger";

const globalForRedis = globalThis as unknown as { redis?: IORedis };

export const redis =
  globalForRedis.redis ??
  new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    retryStrategy(times) {
      return Math.min(times * 200, 5000);
    }
  });

redis.on("error", (error) => {
  logger.error({ error }, "Redis connection error");
});

redis.on("connect", () => {
  logger.info("Redis connected");
});

if (env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
