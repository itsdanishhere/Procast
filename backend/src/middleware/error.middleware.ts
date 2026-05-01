import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { AppError } from "../shared/errors/app-error";
import { logger } from "../shared/logger";

export function notFoundMiddleware(request: Request, response: Response) {
  response.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: `Route ${request.method} ${request.path} does not exist.`
    }
  });
}

export function errorMiddleware(error: unknown, _request: Request, response: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    response.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Please check the submitted fields.",
        details: error.flatten()
      }
    });
    return;
  }

  if (error instanceof AppError) {
    if (error.statusCode === 401) {
      logger.warn({ path: _request.path, message: error.message }, "Unauthorized access attempt");
    }
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
    return;
  }

  logger.error({ error }, "Unhandled backend error");
  response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong."
    }
  });
}
