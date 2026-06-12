import { createHash, createHmac, randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

import { env } from "./env";
import { ensureUploadsDir, uploadsDir, uploadsPublicUrl } from "./uploads";

const mimeTypeToExtension: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/svg+xml": ".svg",
  "image/webp": ".webp",
};

export type UploadedMediaFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

export type MediaStorageMode = "local" | "s3";

export function isRemoteMediaStorageConfigured() {
  return Boolean(
    env.MEDIA_STORAGE_BUCKET.trim() &&
      env.MEDIA_STORAGE_ENDPOINT.trim() &&
      env.MEDIA_STORAGE_ACCESS_KEY_ID.trim() &&
      env.MEDIA_STORAGE_SECRET_ACCESS_KEY.trim() &&
      env.MEDIA_PUBLIC_BASE_URL.trim()
  );
}

export function getMediaStorageMode(): MediaStorageMode {
  if (isRemoteMediaStorageConfigured()) {
    return "s3";
  }

  return process.env.NODE_ENV === "production" ? "s3" : "local";
}

export function getMediaPublicBaseUrl() {
  if (getMediaStorageMode() === "s3") {
    return normalizeBaseUrl(env.MEDIA_PUBLIC_BASE_URL);
  }

  return uploadsPublicUrl;
}

export async function storeMediaAsset({
  file,
  folder,
  prefix,
}: {
  file: UploadedMediaFile;
  folder: string;
  prefix: string;
}) {
  const cleanFolder = normalizePathSegment(folder) || "media";
  const cleanPrefix = normalizePathSegment(prefix) || "asset";
  const extension = resolveFileExtension(file.originalname, file.mimetype);
  const key = buildMediaKey({
    folder: cleanFolder,
    prefix: cleanPrefix,
    extension,
  });

  if (getMediaStorageMode() === "s3") {
    await uploadToS3CompatibleStorage({
      key,
      body: file.buffer,
      contentType: file.mimetype,
    });

    return {
      key,
      url: joinPublicUrl(getMediaPublicBaseUrl(), key),
      storageMode: "s3" as const,
    };
  }

  await storeLocally({
    key,
    buffer: file.buffer,
  });

  return {
    key,
    url: joinPublicUrl(getMediaPublicBaseUrl(), key),
    storageMode: "local" as const,
  };
}

function buildMediaKey({
  folder,
  prefix,
  extension,
}: {
  folder: string;
  prefix: string;
  extension: string;
}) {
  const now = new Date();
  const datePath = now.toISOString().slice(0, 10).replace(/-/g, "/");
  return `${env.MEDIA_STORAGE_PREFIX.trim().replace(/^\/+|\/+$/g, "") || "media"}/${folder}/${datePath}/${prefix}-${randomUUID()}${extension}`;
}

async function storeLocally({
  key,
  buffer,
}: {
  key: string;
  buffer: Buffer;
}) {
  ensureUploadsDir();
  const filePath = path.join(uploadsDir, key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);
}

async function uploadToS3CompatibleStorage({
  key,
  body,
  contentType,
}: {
  key: string;
  body: Buffer;
  contentType: string;
}) {
  const endpoint = normalizeEndpoint(env.MEDIA_STORAGE_ENDPOINT);
  const bucket = env.MEDIA_STORAGE_BUCKET.trim();
  const region = env.MEDIA_STORAGE_REGION.trim() || "auto";
  const accessKeyId = env.MEDIA_STORAGE_ACCESS_KEY_ID.trim();
  const secretAccessKey = env.MEDIA_STORAGE_SECRET_ACCESS_KEY.trim();

  const requestUrl = new URL(joinPath(bucket, key), endpoint);
  const host = requestUrl.host;
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = createHash("sha256").update(body).digest("hex");

  const headers = {
    host,
    "content-type": contentType,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  } satisfies Record<string, string>;

  const canonicalHeaders = Object.entries(headers)
    .map(([name, value]) => `${name}:${value.trim()}\n`)
    .sort((left, right) => left.localeCompare(right))
    .join("");
  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalRequest = [
    "PUT",
    encodeCanonicalPath(requestUrl.pathname),
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");
  const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, "s3");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(requestUrl, {
    method: "PUT",
    headers: {
      ...headers,
      Authorization: authorization,
    },
    body: new Uint8Array(body),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Remote media upload failed (${response.status}): ${details || response.statusText}`);
  }
}

function normalizeEndpoint(value: string) {
  const normalized = value.trim().replace(/\/+$/, "");

  if (!normalized) {
    throw new Error("MEDIA_STORAGE_ENDPOINT is required for remote media storage.");
  }

  return normalized;
}

function normalizeBaseUrl(value: string) {
  const normalized = value.trim().replace(/\/+$/, "");

  if (!normalized) {
    throw new Error("MEDIA_PUBLIC_BASE_URL is required.");
  }

  return normalized;
}

function normalizePathSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveFileExtension(originalName: string, mimeType: string) {
  const fromOriginalName = path.extname(originalName).toLowerCase();
  if (fromOriginalName) {
    return fromOriginalName;
  }

  return mimeTypeToExtension[mimeType] ?? "";
}

function joinPublicUrl(baseUrl: string, key: string) {
  const normalizedKey = key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  if (baseUrl.startsWith("/")) {
    return `${baseUrl.replace(/\/+$/, "")}/${normalizedKey}`;
  }

  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(normalizedKey, normalizedBase).toString();
}

function joinPath(...segments: string[]) {
  return segments
    .map((segment) => segment.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
}

function encodeCanonicalPath(pathname: string) {
  return pathname
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function toAmzDate(date: Date) {
  const year = date.getUTCFullYear().toString();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  const seconds = date.getUTCSeconds().toString().padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function getSignatureKey(secretAccessKey: string, dateStamp: string, regionName: string, serviceName: string) {
  const kDate = createHmac("sha256", `AWS4${secretAccessKey}`).update(dateStamp).digest();
  const kRegion = createHmac("sha256", kDate).update(regionName).digest();
  const kService = createHmac("sha256", kRegion).update(serviceName).digest();
  return createHmac("sha256", kService).update("aws4_request").digest();
}
