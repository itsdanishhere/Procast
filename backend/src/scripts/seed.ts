import bcrypt from "bcryptjs";

import { env } from "../config/env";
import { achievementDefinitions } from "../modules/achievements/achievement.definitions";
import { normalizeEmail } from "../modules/security-system/security.service";
import { prisma } from "../shared/prisma/client";
import { logger } from "../shared/logger";

async function main() {
  for (const achievement of achievementDefinitions) {
    await prisma.achievement.upsert({
      where: { code: achievement.code },
      update: {
        title: achievement.title,
        description: achievement.description,
        xpReward: achievement.xpReward,
        rule: { code: achievement.code },
        active: true
      },
      create: {
        ...achievement,
        rule: { code: achievement.code },
        active: true
      }
    });
  }

  const username = "user1";
  const email = "user1@procast.local";
  const passwordHash = await bcrypt.hash("123456789", env.BCRYPT_ROUNDS);

  await prisma.user.upsert({
    where: { username },
    update: {
      passwordHash,
      accountStatus: "ACTIVE",
      emailVerifiedAt: new Date(),
      failedLoginCount: 0,
      lockedUntil: null
    },
    create: {
      username,
      email,
      normalizedEmail: normalizeEmail(email),
      passwordHash,
      accountStatus: "ACTIVE",
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          fullName: "Demo User",
          timezone: "Asia/Calcutta",
          onboardingProgress: { completed: true },
          productivityPreferences: { primaryGoal: "stop_procrastinating" },
          currentFocusGoal: 3
        }
      },
      settings: {
        create: {
          notificationPreferences: { streakWarnings: true, weeklyReports: true },
          reminderPreferences: { enabled: true, hour: 19 },
          streakForgivenessEnabled: false,
          timerPreferences: { pomodoro: 25, shortBreak: 5, longBreak: 15, deepFocus: 45 },
          focusModePreferences: { floatingTimer: true, antiCheat: true },
          uiPreferences: { theme: "dark" }
        }
      },
      progress: { create: {} },
      streak: { create: { timezone: "Asia/Calcutta" } },
      worldUnlocks: {
        create: {
          stage: "EMPTY_LAND",
          unlockedAt: new Date(),
          reason: "Demo account initialized"
        }
      }
    }
  });

  logger.info("Seed complete. Demo login: user1 / 123456789");
}

main()
  .catch((error) => {
    logger.error({ error }, "Seed failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
