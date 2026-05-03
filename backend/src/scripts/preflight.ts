import { env } from "../config/env";
import { prisma } from "../shared/prisma/client";
import { redis } from "../shared/redis/client";

async function main() {
  const startedAt = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  await redis.ping();

  const checks = {
    ok: true,
    nodeEnv: env.NODE_ENV,
    apiBaseUrl: env.API_BASE_URL,
    frontendOrigins: env.FRONTEND_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean),
    database: "reachable",
    redis: "reachable",
    latencyMs: Date.now() - startedAt
  };

  console.log(JSON.stringify(checks, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
  });
