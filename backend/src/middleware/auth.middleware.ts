import type { NextFunction, Request, Response } from "express";

import { unauthorized } from "../shared/errors/app-error";
import { authCookies, authService } from "../modules/auth/auth.service";

export function authMiddleware(request: Request, _response: Response, next: NextFunction) {
  const header = request.header("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
  const cookieToken = request.cookies?.[authCookies.accessCookieName];
  const token = bearer || cookieToken;

  if (!token) {
    next(unauthorized());
    return;
  }

  const payload = authService.verifyAccessToken(token);
  if (!payload) {
    next(unauthorized("Access token is invalid or expired."));
    return;
  }

  request.auth = payload;
  next();
}
