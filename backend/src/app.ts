import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";

import { env } from "./config/env";
import { errorMiddleware, notFoundMiddleware } from "./middleware/error.middleware";
import { requestContextMiddleware } from "./middleware/request-context.middleware";
import { logger } from "./shared/logger";
import { routes } from "./routes";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(requestContextMiddleware);
  app.use(pinoHttp({ logger }));
  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN.split(",").map((origin) => origin.trim()),
      credentials: true
    })
  );
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use("/v1", routes);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
}
