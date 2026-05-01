import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../shared/prisma/client";
import { normalizeEmail } from "../security-system/security.service";

export class AuthRepository {
  findByIdentifier(identifier: string) {
    const normalized = normalizeEmail(identifier);
    return prisma.user.findFirst({
      where: {
        OR: [{ normalizedEmail: normalized }, { username: identifier.trim().toLowerCase() }],
        deletedAt: null
      },
      include: {
        profile: true,
        settings: true,
        progress: true
      }
    });
  }

  findById(userId: string) {
    return prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        profile: true,
        settings: true,
        progress: true
      }
    });
  }

  createUser(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data });
  }
}

export const authRepository = new AuthRepository();
