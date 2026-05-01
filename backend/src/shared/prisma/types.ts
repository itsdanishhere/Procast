import type { Prisma, PrismaClient } from "../../../generated/prisma/client";

export type DbClient = PrismaClient | Prisma.TransactionClient;

export function jsonInput(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
