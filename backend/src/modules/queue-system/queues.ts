import { Queue } from "bullmq";

import { redis } from "../../shared/redis/client";

export const notificationQueue = new Queue("notifications", {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 500,
    removeOnFail: 1000
  }
});

export const analyticsQueue = new Queue("analytics", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 10000 },
    removeOnComplete: 500,
    removeOnFail: 1000
  }
});

export const recoveryQueue = new Queue("recovery", {
  connection: redis,
  defaultJobOptions: {
    attempts: 10,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: 1000,
    removeOnFail: 2000
  }
});

export const backupQueue = new Queue("backups", {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "fixed", delay: 30000 },
    removeOnComplete: 100,
    removeOnFail: 500
  }
});
