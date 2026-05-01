import { Router } from "express";
import { z } from "zod";

import { authMiddleware } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../shared/http/async-handler";
import { validateBody } from "../../shared/http/validate";
import { prisma } from "../../shared/prisma/client";
import { notFound } from "../../shared/errors/app-error";

export const userRoutes = Router();
userRoutes.use(authMiddleware);

const settingsSchema = z.object({
  dailyFocusGoal: z.number().int().min(1).max(12).optional(),
  deepFocusMinutes: z.number().int().min(30).max(120).optional(),
  remindersEnabled: z.boolean().optional(),
  focusSoundsEnabled: z.boolean().optional(),
  lockBackEnabled: z.boolean().optional(),
  notificationHour: z.number().int().min(0).max(23).optional(),
  preferredAmbientSound: z.string().min(1).max(40).optional()
});

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function settingsDto(
  settings: {
    notificationPreferences?: unknown;
    reminderPreferences?: unknown;
    timerPreferences?: unknown;
    focusModePreferences?: unknown;
  } | null,
  profile: { currentFocusGoal?: number | null } | null
) {
  const reminderPreferences = asObject(settings?.reminderPreferences);
  const timerPreferences = asObject(settings?.timerPreferences);
  const focusModePreferences = asObject(settings?.focusModePreferences);

  return {
    dailyFocusGoal: profile?.currentFocusGoal ?? 3,
    deepFocusMinutes: Number(timerPreferences.deepFocus ?? 45),
    remindersEnabled: Boolean(reminderPreferences.enabled ?? true),
    focusSoundsEnabled: Boolean(focusModePreferences.focusSoundsEnabled ?? true),
    lockBackEnabled: Boolean(focusModePreferences.lockBackEnabled ?? true),
    notificationHour: Number(reminderPreferences.hour ?? 19),
    preferredAmbientSound: String(focusModePreferences.preferredAmbientSound ?? "rain")
  };
}

userRoutes.get(
  "/me",
  asyncHandler(async (request, response) => {
    const user = await prisma.user.findFirst({
      where: { id: request.auth!.userId, deletedAt: null },
      include: { profile: true, settings: true, progress: true, streak: true }
    });
    if (!user) throw notFound("User not found.");
    response.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        accountStatus: user.accountStatus,
        emailVerified: Boolean(user.emailVerifiedAt),
        profile: user.profile,
        settings: user.settings,
        settingsDto: settingsDto(user.settings, user.profile),
        progress: user.progress,
        streak: user.streak
      }
    });
  })
);

userRoutes.patch(
  "/me",
  validateBody(settingsSchema),
  asyncHandler(async (request, response) => {
    const user = await prisma.user.findFirst({
      where: { id: request.auth!.userId, deletedAt: null },
      include: { profile: true, settings: true }
    });
    if (!user) throw notFound("User not found.");

    const currentNotificationPreferences = asObject(user.settings?.notificationPreferences);
    const currentReminderPreferences = asObject(user.settings?.reminderPreferences);
    const currentTimerPreferences = asObject(user.settings?.timerPreferences);
    const currentFocusModePreferences = asObject(user.settings?.focusModePreferences);

    const [profile, settings] = await prisma.$transaction([
      prisma.userProfile.upsert({
        where: { userId: user.id },
        update: {
          currentFocusGoal: request.body.dailyFocusGoal ?? undefined
        },
        create: {
          userId: user.id,
          fullName: user.profile?.fullName ?? user.username,
          currentFocusGoal: request.body.dailyFocusGoal ?? 3
        }
      }),
      prisma.userSettings.upsert({
        where: { userId: user.id },
        update: {
          notificationPreferences: {
            ...currentNotificationPreferences,
            remindersEnabled: request.body.remindersEnabled ?? currentNotificationPreferences.remindersEnabled
          },
          reminderPreferences: {
            ...currentReminderPreferences,
            enabled: request.body.remindersEnabled ?? currentReminderPreferences.enabled ?? true,
            hour: request.body.notificationHour ?? currentReminderPreferences.hour ?? 19
          },
          timerPreferences: {
            ...currentTimerPreferences,
            deepFocus: request.body.deepFocusMinutes ?? currentTimerPreferences.deepFocus ?? 45
          },
          focusModePreferences: {
            ...currentFocusModePreferences,
            focusSoundsEnabled: request.body.focusSoundsEnabled ?? currentFocusModePreferences.focusSoundsEnabled ?? true,
            lockBackEnabled: request.body.lockBackEnabled ?? currentFocusModePreferences.lockBackEnabled ?? true,
            preferredAmbientSound: request.body.preferredAmbientSound ?? currentFocusModePreferences.preferredAmbientSound ?? "rain"
          }
        },
        create: {
          userId: user.id,
          notificationPreferences: { remindersEnabled: request.body.remindersEnabled ?? true },
          reminderPreferences: { enabled: request.body.remindersEnabled ?? true, hour: request.body.notificationHour ?? 19 },
          timerPreferences: { deepFocus: request.body.deepFocusMinutes ?? 45 },
          focusModePreferences: {
            focusSoundsEnabled: request.body.focusSoundsEnabled ?? true,
            lockBackEnabled: request.body.lockBackEnabled ?? true,
            preferredAmbientSound: request.body.preferredAmbientSound ?? "rain"
          },
          uiPreferences: { theme: "dark" }
        }
      })
    ]);

    response.json({ settings: settingsDto(settings, profile) });
  })
);
