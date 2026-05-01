import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      auth?: {
        userId: string;
        sessionId?: string;
        jti?: string;
      };
    }
  }
}

export function requestContextMiddleware(request: Request, response: Response, next: NextFunction) {
  request.requestId = request.header("x-request-id") || randomUUID();
  response.setHeader("x-request-id", request.requestId);
  next();
}
