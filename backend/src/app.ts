import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";

import { env, isProduction } from "./config/env";
import { errorMiddleware, notFoundMiddleware } from "./middleware/error.middleware";
import { requestContextMiddleware } from "./middleware/request-context.middleware";
import { logger } from "./shared/logger";
import { routes } from "./routes";

const configuredFrontendOrigins = env.FRONTEND_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean);

function isAllowedOrigin(origin?: string) {
  if (!origin) return true;
  if (configuredFrontendOrigins.includes(origin)) return true;

  if (!isProduction) {
    try {
      const url = new URL(origin);
      return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname);
    } catch {
      return false;
    }
  }

  return false;
}

export function createApp() {
  const app = express();
  app.use(cookieParser());
  app.set("trust proxy", 1);
  app.use(requestContextMiddleware);
  app.use(pinoHttp({ logger }));
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
          callback(null, origin || true);
          return;
        }
        callback(new Error("Origin is not allowed by ProCast CORS policy."));
      },
      credentials: true
    })
  );
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use("/v1", routes);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
}
