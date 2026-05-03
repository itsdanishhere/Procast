import type { Request, Response } from "express";

import { env } from "../../config/env";
import { asyncHandler } from "../../shared/http/async-handler";
import { getClientIp } from "../security-system/security.service";
import { authCookies, authService, cookieOptions } from "./auth.service";

function meta(request: Request) {
  return {
    ipAddress: getClientIp(request.headers, request.ip),
    userAgent: request.header("user-agent") ?? undefined
  };
}

function setTokenCookies(response: Response, tokens: { accessToken: string; refreshToken: string }) {
  response.cookie(
    authCookies.accessCookieName,
    tokens.accessToken,
    cookieOptions(env.ACCESS_TOKEN_TTL_SECONDS * 1000)
  );
  response.cookie(
    authCookies.refreshCookieName,
    tokens.refreshToken,
    cookieOptions(env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
  );
}

function clearTokenCookies(response: Response) {
  const options = {
    sameSite: "lax" as const,
    secure: env.NODE_ENV === "production",
    domain: env.COOKIE_DOMAIN || undefined,
    path: "/"
  };
  response.clearCookie(authCookies.accessCookieName, options);
  response.clearCookie(authCookies.refreshCookieName, options);
}

export class AuthController {
  signup = asyncHandler(async (request, response) => {
    const result = await authService.signup(request.body, meta(request));
    setTokenCookies(response, result.tokens);
    response.status(201).json(result);
  });

  login = asyncHandler(async (request, response) => {
    const result = await authService.login(request.body, meta(request));
    setTokenCookies(response, result.tokens);
    response.json(result);
  });

  refresh = asyncHandler(async (request, response) => {
    const refreshToken = request.body.refreshToken || request.cookies?.[authCookies.refreshCookieName];
    const tokens = await authService.refresh(refreshToken, meta(request));
    setTokenCookies(response, tokens);
    response.json({ tokens });
  });

  logout = asyncHandler(async (request, response) => {
    await authService.logout(request.auth?.sessionId);
    clearTokenCookies(response);
    response.status(204).send();
  });

  me = asyncHandler(async (request, response) => {
    response.json({ auth: request.auth });
  });

  forgotPassword = asyncHandler(async (request, response) => {
    const result = await authService.forgotPassword(request.body.email, meta(request));
    response.json(result);
  });

  resetPassword = asyncHandler(async (request, response) => {
    await authService.resetPassword(request.body.token, request.body.password, meta(request));
    response.status(204).send();
  });

  verifyEmail = asyncHandler(async (request, response) => {
    await authService.verifyEmail(request.body.token);
    response.status(204).send();
  });
}

export const authController = new AuthController();
