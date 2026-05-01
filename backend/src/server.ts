import { createServer } from "node:http";

import { env } from "./config/env";
import { createApp } from "./app";
import { registerCronJobs } from "./modules/cron-system/cron";
import { attachWebSocketServer } from "./modules/websocket-system/websocket.service";
import { logger } from "./shared/logger";

const app = createApp();
const server = createServer(app);
attachWebSocketServer(server);
registerCronJobs();

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "ProCast backend listening");
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down");
  server.close(() => process.exit(0));
});
