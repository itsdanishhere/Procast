import { randomBytes, randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { env, isProduction } from "../../config/env";
import { badRequest, conflict, forbidden, unauthorized } from "../../shared/errors/app-error";
import { prisma } from "../../shared/prisma/client";
import { auditService } from "../audit-system/audit.service";
import { normalizeEmail, securityService, sha256 } from "../security-system/security.service";
import type { LoginInput, SignupInput } from "./auth.validation";

const accessCookieName = "procast_access";
const refreshCookieName = "procast_refresh";
const maxFailedLogins = 5;
const lockMinutes = 15;

type RequestMeta = {
  ipAddress?: string;
  userAgent?: string;
};

type TokenPair = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresAt: Date;
};

function signAccessToken(input: { userId: string; sessionId: string }) {
  const jti = randomUUID();
  const token = jwt.sign(
    {
      sub: input.userId,
      sid: input.sessionId,
      jti,
      typ: "access"
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
      issuer: "procast-api",
      audience: "procast-web"
    }
  );
  return { token, jti };
}

function signRefreshToken(input: { userId: string; sessionId: string; tokenId: string }) {
  return jwt.sign(
    {
      sub: input.userId,
      sid: input.sessionId,
      jti: input.tokenId,
      typ: "refresh"
    },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d`,
      issuer: "procast-api",
      audience: "procast-web"
    }
  );
}

export function cookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction,
    domain: env.COOKIE_DOMAIN || undefined,
    path: "/",
    maxAge: maxAgeMs
  };
}

export class AuthService {
  async signup(input: SignupInput, meta: RequestMeta) {
    const normalizedEmail = normalizeEmail(input.email);
    const username = input.username.trim().toLowerCase();

    if (!securityService.isPasswordStrong(input.password)) {
      throw badRequest("Password does not meet production strength requirements.");
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ normalizedEmail }, { username }] },
      select: { id: true, normalizedEmail: true, username: true }
    });
    if (existing?.normalizedEmail === normalizedEmail) throw conflict("Email is already registered.");
    if (existing?.username === username) throw conflict("Username is already taken.");

    const verificationToken = randomBytes(32).toString("hex");
    const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          username,
          email: input.email.trim(),
          normalizedEmail,
          passwordHash,
          accountStatus: "PENDING_VERIFICATION",
          profile: {
            create: {
              fullName: input.fullName.trim(),
              timezone: input.timezone,
              onboardingProgress: { currentStep: "baseline", completed: false },
              productivityPreferences: { primaryGoal: "stop_procrastinating" }
            }
          },
          settings: {
            create: {
              notificationPreferences: { streakWarnings: true, weeklyReports: true },
              reminderPreferences: { enabled: true, hour: 19 },
              timerPreferences: { pomodoro: 25, shortBreak: 5, longBreak: 15, deepFocus: 45 },
              focusModePreferences: { floatingTimer: true, antiCheat: true },
              uiPreferences: { theme: "dark" }
            }
          },
          progress: { create: {} },
          streak: { create: { timezone: input.timezone } },
          worldUnlocks: {
            create: {
              stage: "EMPTY_LAND",
              unlockedAt: new Date(),
              reason: "Account initialized"
            }
          },
          emailTokens: {
            create: {
              tokenHash: sha256(verificationToken),
              expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
            }
          }
        },
        include: { profile: true, settings: true, progress: true }
      });

      await tx.auditLog.create({
        data: {
          userId: created.id,
          action: "auth.signup",
          resourceType: "user",
          resourceId: created.id,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          metadata: { emailVerificationReady: true }
        }
      });

      return created;
    });

    const tokens = await this.createLoginSession(user.id, meta);
    return {
      user: this.toPublicUser(user),
      tokens,
      verification: {
        devVerificationToken: verificationToken
      }
    };
  }

  async login(input: LoginInput, meta: RequestMeta) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { normalizedEmail: normalizeEmail(input.identifier) },
          { username: input.identifier.trim().toLowerCase() }
        ],
        deletedAt: null
      },
      include: { profile: true, settings: true, progress: true }
    });

    if (!user) {
      await securityService.recordEvent({
        eventType: "auth.login.unknown_identity",
        severity: "WARNING",
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { identifier: input.identifier }
      });
      throw unauthorized("Invalid credentials.");
    }

    if (user.accountStatus === "SUSPENDED" || user.accountStatus === "DELETED") {
      throw forbidden("Account is not allowed to sign in.");
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw forbidden("Account is temporarily locked because of repeated failed logins.");
    }

    const passwordOk = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordOk) {
      const failedLoginCount = user.failedLoginCount + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount,
          lockedUntil:
            failedLoginCount >= maxFailedLogins
              ? new Date(Date.now() + lockMinutes * 60 * 1000)
              : null
        }
      });
      await securityService.recordEvent({
        userId: user.id,
        eventType: "auth.login.failed_password",
        severity: failedLoginCount >= maxFailedLogins ? "CRITICAL" : "WARNING",
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { failedLoginCount }
      });
      throw unauthorized("Invalid credentials.");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: meta.ipAddress,
        accountStatus: user.accountStatus === "PENDING_VERIFICATION" ? "ACTIVE" : user.accountStatus
      }
    });

    const tokens = await this.createLoginSession(user.id, meta, input.deviceId);
    await auditService.record({
      userId: user.id,
      action: "auth.login",
      resourceType: "login_session",
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return {
      user: this.toPublicUser(user),
      tokens
    };
  }

  async refresh(refreshToken: string | undefined, meta: RequestMeta) {
    if (!refreshToken) throw unauthorized("Missing refresh token.");

    let decoded: jwt.JwtPayload;
    try {
      decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET, {
        issuer: "procast-api",
        audience: "procast-web"
      }) as jwt.JwtPayload;
    } catch {
      throw unauthorized("Invalid refresh token.");
    }

    if (decoded.typ !== "refresh" || !decoded.sub || !decoded.sid || !decoded.jti) {
      throw unauthorized("Invalid refresh token.");
    }

    const tokenHash = sha256(refreshToken);
    const existing = await prisma.loginSession.findFirst({
      where: {
        id: String(decoded.sid),
        userId: String(decoded.sub),
        refreshTokenHash: tokenHash,
        status: "ACTIVE",
        expiresAt: { gt: new Date() }
      }
    });

    if (!existing) {
      await securityService.recordEvent({
        userId: String(decoded.sub),
        eventType: "auth.refresh.reuse_or_invalid",
        severity: "CRITICAL",
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
      });
      throw unauthorized("Refresh token is invalid or expired.");
    }

    await prisma.loginSession.update({
      where: { id: existing.id },
      data: { status: "ROTATED", lastUsedAt: new Date() }
    });

    return this.createLoginSession(existing.userId, meta, existing.deviceId, existing.id);
  }

  async logout(sessionId: string | undefined) {
    if (!sessionId) return;
    await prisma.loginSession.updateMany({
      where: { id: sessionId, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: new Date() }
    });
  }

  async forgotPassword(email: string, meta: RequestMeta) {
    const user = await prisma.user.findFirst({
      where: { normalizedEmail: normalizeEmail(email), deletedAt: null }
    });
    if (!user) return { ok: true };

    const token = randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(token),
        requestedIp: meta.ipAddress,
        requestedAgent: meta.userAgent,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      }
    });

    await auditService.record({
      userId: user.id,
      action: "auth.password_reset.requested",
      resourceType: "password_reset_token",
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return {
      ok: true,
      devResetUrl: `${env.FRONTEND_ORIGIN}/reset-password?token=${token}`
    };
  }

  async resetPassword(token: string, password: string, meta: RequestMeta) {
    const tokenHash = sha256(token);
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() }
      }
    });
    if (!resetToken) throw badRequest("Reset token is invalid or expired.");

    const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash,
          failedLoginCount: 0,
          lockedUntil: null
        }
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() }
      }),
      prisma.loginSession.updateMany({
        where: { userId: resetToken.userId, status: "ACTIVE" },
        data: { status: "REVOKED", revokedAt: new Date() }
      })
    ]);

    await auditService.record({
      userId: resetToken.userId,
      action: "auth.password_reset.completed",
      resourceType: "user",
      resourceId: resetToken.userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });
  }

  async verifyEmail(token: string) {
    const tokenHash = sha256(token);
    const emailToken = await prisma.emailVerificationToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } }
    });
    if (!emailToken) throw badRequest("Verification token is invalid or expired.");

    await prisma.$transaction([
      prisma.emailVerificationToken.update({
        where: { id: emailToken.id },
        data: { usedAt: new Date() }
      }),
      prisma.user.update({
        where: { id: emailToken.userId },
        data: { emailVerifiedAt: new Date(), accountStatus: "ACTIVE" }
      })
    ]);
  }

  verifyAccessToken(token: string) {
    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
        issuer: "procast-api",
        audience: "procast-web"
      }) as jwt.JwtPayload;
      if (decoded.typ !== "access" || !decoded.sub) return null;
      return {
        userId: String(decoded.sub),
        sessionId: decoded.sid ? String(decoded.sid) : undefined,
        jti: decoded.jti ? String(decoded.jti) : undefined
      };
    } catch {
      return null;
    }
  }

  private async createLoginSession(
    userId: string,
    meta: RequestMeta,
    deviceId?: string | null,
    rotatedFromId?: string
  ): Promise<TokenPair> {
    const refreshTokenId = randomUUID();
    const placeholderHash = sha256(`${userId}:${refreshTokenId}:${Date.now()}`);
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    const session = await prisma.loginSession.create({
      data: {
        userId,
        refreshTokenHash: placeholderHash,
        deviceId: deviceId ?? null,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        expiresAt,
        rotatedFromId
      }
    });

    const { token: accessToken, jti } = signAccessToken({ userId, sessionId: session.id });
    const refreshToken = signRefreshToken({ userId, sessionId: session.id, tokenId: refreshTokenId });

    await prisma.loginSession.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: sha256(refreshToken),
        accessTokenJti: jti
      }
    });

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
      refreshTokenExpiresAt: expiresAt
    };
  }

  toPublicUser(user: {
    id: string;
    username: string;
    email: string;
    accountStatus: string;
    emailVerifiedAt: Date | null;
    profile?: { fullName: string; timezone: string } | null;
    progress?: { totalXp: number; currentLevel: number; currentWorldStage: string; lockedWorldStage: string } | null;
  }) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      accountStatus: user.accountStatus,
      emailVerified: Boolean(user.emailVerifiedAt),
      profile: user.profile,
      progress: user.progress
    };
  }
}

export const authService = new AuthService();
export const authCookies = {
  accessCookieName,
  refreshCookieName
};
