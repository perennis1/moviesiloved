import fs from "fs";
import path from "path";

import { env } from "./env";

const defaultUploadsDir = path.join(process.cwd(), "public", "uploads");

function resolveUploadsDir(rawDir: string) {
  return path.isAbsolute(rawDir) ? rawDir : path.resolve(process.cwd(), rawDir);
}

export const uploadsDir = resolveUploadsDir(env.UPLOADS_DIR);
export const uploadsPublicUrl = normalizePublicUrl(env.UPLOADS_PUBLIC_URL);
export const maxUploadBytes = Number.parseInt(env.MAX_UPLOAD_BYTES, 10);
export const allowedUploadMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/webp",
]);

export function ensureUploadsDir() {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
}

export function isUsingDefaultPublicUploadsDir() {
  return path.normalize(uploadsDir) === path.normalize(defaultUploadsDir);
}

function normalizePublicUrl(value: string) {
  const normalized = value.trim();

  if (!normalized.startsWith("/")) {
    throw new Error("UPLOADS_PUBLIC_URL must start with '/'.");
  }

  return normalized.replace(/\/+$/, "") || "/uploads";
}
