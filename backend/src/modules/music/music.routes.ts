import express, { Router } from "express";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { authMiddleware } from "../../middleware/auth.middleware";
import { badRequest, forbidden, notFound } from "../../shared/errors/app-error";
import { asyncHandler } from "../../shared/http/async-handler";
import { prisma } from "../../shared/prisma/client";
import { jsonInput } from "../../shared/prisma/types";

type UploadedMusicTrack = {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

const maxUploadBytes = 30 * 1024 * 1024;
const maxTracksPerUser = 30;
const allowedMimeTypes = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
  "audio/aac",
  "audio/flac"
]);

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function getUploadRoot() {
  return path.join(process.cwd(), "uploads", "music");
}

function getUserMusicDirectory(userId: string) {
  return path.join(getUploadRoot(), userId);
}

function decodeHeader(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function cleanTitle(value: string) {
  const title = value.replace(/\s+/g, " ").trim();
  return title.slice(0, 80) || "Uploaded focus track";
}

function extensionForMime(mimeType: string) {
  switch (mimeType) {
    case "audio/mpeg":
    case "audio/mp3":
      return ".mp3";
    case "audio/wav":
    case "audio/x-wav":
      return ".wav";
    case "audio/ogg":
      return ".ogg";
    case "audio/webm":
      return ".webm";
    case "audio/mp4":
      return ".m4a";
    case "audio/aac":
      return ".aac";
    case "audio/flac":
      return ".flac";
    default:
      return ".audio";
  }
}

function normalizeTrack(value: unknown): UploadedMusicTrack | null {
  const candidate = asObject(value);
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.title !== "string" ||
    typeof candidate.fileName !== "string" ||
    typeof candidate.mimeType !== "string"
  ) {
    return null;
  }

  return {
    id: candidate.id,
    title: candidate.title,
    fileName: candidate.fileName,
    mimeType: candidate.mimeType,
    sizeBytes: Number(candidate.sizeBytes ?? 0),
    createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : new Date().toISOString()
  };
}

function musicLibraryFromSettings(settings: { uiPreferences: unknown } | null) {
  const uiPreferences = asObject(settings?.uiPreferences);
  const rawLibrary = Array.isArray(uiPreferences.musicLibrary) ? uiPreferences.musicLibrary : [];
  return rawLibrary.map(normalizeTrack).filter((track): track is UploadedMusicTrack => Boolean(track));
}

async function getOrCreateSettings(userId: string) {
  const existing = await prisma.userSettings.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.userSettings.create({
    data: {
      userId,
      uiPreferences: { theme: "dark", musicLibrary: [] }
    }
  });
}

async function saveMusicLibrary(userId: string, tracks: UploadedMusicTrack[], existingUiPreferences: unknown) {
  const uiPreferences = asObject(existingUiPreferences);
  return prisma.userSettings.update({
    where: { userId },
    data: {
      uiPreferences: jsonInput({
        ...uiPreferences,
        musicLibrary: tracks
      })
    }
  });
}

function resolveOwnedFile(userId: string, fileName: string) {
  const userDirectory = getUserMusicDirectory(userId);
  const filePath = path.resolve(userDirectory, fileName);
  const safeRoot = path.resolve(userDirectory) + path.sep;
  if (!filePath.startsWith(safeRoot)) {
    throw forbidden("Invalid music file path.");
  }
  return filePath;
}

export const musicRoutes = Router();
musicRoutes.use(authMiddleware);

musicRoutes.get(
  "/tracks",
  asyncHandler(async (request, response) => {
    const settings = await getOrCreateSettings(request.auth!.userId);
    response.json({ tracks: musicLibraryFromSettings(settings) });
  })
);

musicRoutes.post(
  "/tracks",
  express.raw({ type: "*/*", limit: maxUploadBytes }),
  asyncHandler(async (request, response) => {
    const userId = request.auth!.userId;
    const mimeType = String(request.header("content-type") ?? "").split(";")[0].trim().toLowerCase();
    const body = Buffer.isBuffer(request.body) ? request.body : null;

    if (!body?.length) {
      throw badRequest("Upload an audio file before saving it.");
    }
    if (body.length > maxUploadBytes) {
      throw badRequest("Audio file is too large. Maximum size is 30 MB.");
    }
    if (!allowedMimeTypes.has(mimeType)) {
      throw badRequest("Unsupported audio type. Upload MP3, WAV, OGG, WEBM, M4A, AAC, or FLAC.");
    }

    const settings = await getOrCreateSettings(userId);
    const currentTracks = musicLibraryFromSettings(settings);
    if (currentTracks.length >= maxTracksPerUser) {
      throw badRequest(`Music library limit reached. Keep ${maxTracksPerUser} uploaded tracks or fewer.`);
    }

    const title = cleanTitle(decodeHeader(request.header("x-track-title"), "Uploaded focus track"));
    const fileName = `${randomUUID()}${extensionForMime(mimeType)}`;
    const userDirectory = getUserMusicDirectory(userId);
    await fs.mkdir(userDirectory, { recursive: true });
    await fs.writeFile(path.join(userDirectory, fileName), body, { flag: "wx" });

    const track: UploadedMusicTrack = {
      id: randomUUID(),
      title,
      fileName,
      mimeType,
      sizeBytes: body.length,
      createdAt: new Date().toISOString()
    };
    const tracks = [track, ...currentTracks];
    await saveMusicLibrary(userId, tracks, settings.uiPreferences);

    response.status(201).json({ track, tracks });
  })
);

musicRoutes.get(
  "/tracks/:trackId/stream",
  asyncHandler(async (request, response) => {
    const userId = request.auth!.userId;
    const settings = await getOrCreateSettings(userId);
    const track = musicLibraryFromSettings(settings).find((item) => item.id === request.params.trackId);
    if (!track) throw notFound("Music track not found.");

    const filePath = resolveOwnedFile(userId, track.fileName);
    try {
      await fs.access(filePath);
    } catch {
      throw notFound("Music file is missing from storage.");
    }
    response.setHeader("Content-Type", track.mimeType);
    response.setHeader("Cache-Control", "private, max-age=3600");
    response.sendFile(filePath);
  })
);

musicRoutes.delete(
  "/tracks/:trackId",
  asyncHandler(async (request, response) => {
    const userId = request.auth!.userId;
    const settings = await getOrCreateSettings(userId);
    const currentTracks = musicLibraryFromSettings(settings);
    const track = currentTracks.find((item) => item.id === request.params.trackId);
    if (!track) throw notFound("Music track not found.");

    const tracks = currentTracks.filter((item) => item.id !== track.id);
    await saveMusicLibrary(userId, tracks, settings.uiPreferences);
    try {
      await fs.unlink(resolveOwnedFile(userId, track.fileName));
    } catch {
      // Metadata removal is still valid if the file was already missing.
    }

    response.status(204).send();
  })
);
