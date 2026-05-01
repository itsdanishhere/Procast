import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

export function validateBody<T>(schema: ZodSchema<T>) {
  return (request: Request, _response: Response, next: NextFunction) => {
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      next(parsed.error);
      return;
    }
    request.body = parsed.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (request: Request, _response: Response, next: NextFunction) => {
    const parsed = schema.safeParse(request.query);
    if (!parsed.success) {
      next(parsed.error);
      return;
    }
    request.query = parsed.data as Request["query"];
    next();
  };
}
