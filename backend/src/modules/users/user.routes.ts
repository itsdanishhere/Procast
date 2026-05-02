import { Router } from "express";
import { z } from "zod";

import { authMiddleware } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../shared/http/async-handler";
import { validateBody } from "../../shared/http/validate";
import { prisma } from "../../shared/prisma/client";
import { notFound } from "../../shared/errors/app-error";
import { findArchetypeByKey, pickRandomArchetype, type UserArchetype } from "./user-archetypes";

export const userRoutes = Router();
userRoutes.use(authMiddleware);

const settingsSchema = z.object({
  dailyFocusGoal: z.number().int().min(1).max(12).optional(),
  deepFocusMinutes: z.number().int().min(30).max(120).optional(),
  remindersEnabled: z.boolean().optional(),
  focusSoundsEnabled: z.boolean().optional(),
  lockBackEnabled: z.boolean().optional(),
  notificationHour: z.number().int().min(0).max(23).optional(),
  preferredAmbientSound: z.string().min(1).max(40).optional(),
  fullName: z.string().trim().min(2).max(80).optional(),
  timezone: z.string().trim().min(2).max(80).optional(),
  roleTitle: z.string().trim().min(0).max(80).optional(),
  country: z.string().trim().min(0).max(80).optional(),
  city: z.string().trim().min(0).max(80).optional(),
  phone: z.string().trim().min(0).max(40).optional(),
  website: z.string().trim().min(0).max(180).optional(),
  focusMission: z.string().trim().min(0).max(240).optional(),
  bio: z.string().trim().min(0).max(600).optional()
});

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

async function ensureArchetypeProfile(userId: string): Promise<{ profile: { fullName: string; onboardingProgress: Record<string, unknown> | null } | null; archetype: UserArchetype }> {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { fullName: true, onboardingProgress: true }
  });

  const onboarding = asObject(profile?.onboardingProgress);
  const existing = findArchetypeByKey(typeof onboarding.archetypeKey === "string" ? onboarding.archetypeKey : null);
  if (existing) {
    return { profile: profile ? { fullName: profile.fullName, onboardingProgress: onboarding } : null, archetype: existing };
  }

  const assigned = pickRandomArchetype();
  const mergedOnboarding = {
    ...onboarding,
    archetypeKey: assigned.key,
    archetypeName: assigned.name,
    archetypeImageUrl: assigned.imageUrl
  };

  const updated = await prisma.userProfile.upsert({
    where: { userId },
    update: { onboardingProgress: mergedOnboarding },
    create: {
      userId,
      fullName: profile?.fullName ?? "ProCast User",
      onboardingProgress: mergedOnboarding
    },
    select: { fullName: true, onboardingProgress: true }
  });

  return {
    profile: { fullName: updated.fullName, onboardingProgress: asObject(updated.onboardingProgress) },
    archetype: assigned
  };
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
    const ensured = await ensureArchetypeProfile(request.auth!.userId);
    const user = await prisma.user.findFirst({
      where: { id: request.auth!.userId, deletedAt: null },
      include: { profile: true, settings: true, progress: true, streak: true }
    });
    if (!user) throw notFound("User not found.");
    const profileOnboarding = asObject(user.profile?.onboardingProgress);
    const archetype = findArchetypeByKey(typeof profileOnboarding.archetypeKey === "string" ? profileOnboarding.archetypeKey : null) ?? ensured.archetype;
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
      },
      archetype: {
        key: archetype.key,
        name: archetype.name,
        imageUrl: archetype.imageUrl
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
    const currentProductivityPreferences = asObject(user.profile?.productivityPreferences);
    const currentProfileDetails = asObject(currentProductivityPreferences.profileDetails);
    const fallbackArchetype = pickRandomArchetype();

    const mergedProfileDetails = {
      ...currentProfileDetails,
      roleTitle: request.body.roleTitle ?? currentProfileDetails.roleTitle ?? "",
      country: request.body.country ?? currentProfileDetails.country ?? "",
      city: request.body.city ?? currentProfileDetails.city ?? "",
      phone: request.body.phone ?? currentProfileDetails.phone ?? "",
      website: request.body.website ?? currentProfileDetails.website ?? "",
      focusMission: request.body.focusMission ?? currentProfileDetails.focusMission ?? "",
      bio: request.body.bio ?? currentProfileDetails.bio ?? ""
    };

    const [profile, settings] = await prisma.$transaction([
      prisma.userProfile.upsert({
        where: { userId: user.id },
        update: {
          fullName: request.body.fullName ?? undefined,
          timezone: request.body.timezone ?? undefined,
          currentFocusGoal: request.body.dailyFocusGoal ?? undefined,
          productivityPreferences: {
            ...currentProductivityPreferences,
            profileDetails: mergedProfileDetails
          }
        },
        create: {
          userId: user.id,
          fullName: request.body.fullName ?? user.profile?.fullName ?? user.username,
          timezone: request.body.timezone ?? user.profile?.timezone ?? "UTC",
          onboardingProgress: {
            archetypeKey: fallbackArchetype.key,
            archetypeName: fallbackArchetype.name,
            archetypeImageUrl: fallbackArchetype.imageUrl
          },
          productivityPreferences: {
            profileDetails: mergedProfileDetails
          },
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
