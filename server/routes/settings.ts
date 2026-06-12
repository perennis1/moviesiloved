import { Router } from "express";
import { prisma } from "../lib/prisma";
import { resolveAdminActor } from "../lib/auth";
import { recordAuditLog } from "../lib/audit";
import multer from "multer";
import {
  allowedUploadMimeTypes,
  maxUploadBytes,
} from "../lib/uploads";
import { isAdSettingKey, isMonetizationConfigKey, validateAdMarkup, validateMonetizationConfig } from "../lib/ad-policy";
import { storeMediaAsset } from "../lib/media-storage";

const BOOLEAN_SETTING_KEYS = new Set([
  "maintenance_mode_enabled",
  "homepage_featured_enabled",
  "homepage_feed_enabled"
]);

const FOOTER_LINKS_KEY = "site_footer_links_json";
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxUploadBytes },
  fileFilter: (_req, file, cb) => {
    if (!allowedUploadMimeTypes.has(file.mimetype)) {
      cb(new Error("Only JPG, PNG, SVG, and WebP images are allowed."));
      return;
    }

    cb(null, true);
  }
});

const router = Router();

function validateSitewideSettingValue(key: string, value: string) {
  if (BOOLEAN_SETTING_KEYS.has(key)) {
    const normalized = value.trim().toLowerCase();
    if (normalized !== "true" && normalized !== "false") {
      return "Boolean settings must be 'true' or 'false'.";
    }
  }

  if (key === FOOTER_LINKS_KEY) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (!Array.isArray(parsed)) {
        return "Footer links must be a JSON array.";
      }

      for (const entry of parsed) {
        if (!entry || typeof entry !== "object") {
          return "Each footer link must include a label and href.";
        }

        const candidate = entry as { label?: unknown; href?: unknown };
        if (typeof candidate.label !== "string" || typeof candidate.href !== "string") {
          return "Each footer link must include a label and href.";
        }

        const label = candidate.label.trim();
        const href = candidate.href.trim();
        if (!label || !href) {
          return "Footer link labels and hrefs cannot be empty.";
        }

        if (!href.startsWith("/") && !href.startsWith("http://") && !href.startsWith("https://") && !href.startsWith("mailto:")) {
          return "Footer link hrefs must be internal paths or valid external URLs.";
        }
      }
    } catch {
      return "Footer links must be valid JSON.";
    }
  }

  if (isMonetizationConfigKey(key)) {
    const validation = validateMonetizationConfig(value);
    if (!validation.ok) {
      return validation.error;
    }
  }

  return null;
}

router.get("/", async (request, response, next) => {
  try {
    const key = request.query.key as string;
    if (!key) {
      return response.status(400).json({ error: "Key is required" });
    }

    const setting = await prisma.globalSettings.findUnique({
      where: { key }
    });

    response.json({ value: setting?.value ?? null });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (request, response, next) => {
  try {
    const actor = await resolveAdminActor(request);
    const { key, value } = request.body;

    if (!key || typeof value !== "string") {
      return response.status(400).json({ error: "Key and value are required" });
    }

    if (isAdSettingKey(key)) {
      const validation = validateAdMarkup(value);
      if (!validation.ok) {
        return response.status(400).json({ error: validation.error });
      }
    }

    const siteValidationError = validateSitewideSettingValue(key, value);
    if (siteValidationError) {
      return response.status(400).json({ error: siteValidationError });
    }

    const setting = await prisma.$transaction(async (tx) => {
      const before = await tx.globalSettings.findUnique({ where: { key } });
      const updated = await tx.globalSettings.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      });

      await recordAuditLog(tx, {
        actorUserId: actor.user.id,
        actorClerkUserId: actor.clerkUserId,
        action: "settings.update",
        entityType: "GlobalSettings",
        entityId: key,
        before: before ? { key: before.key, value: before.value } : null,
        after: { key, value }
      });

      return updated;
    });

    response.status(200).json(setting);
  } catch (error) {
    next(error);
  }
});

router.post("/logo", async (request, response, next) => {
  try {
    const actor = await resolveAdminActor(request);

    await new Promise<void>((resolve, reject) => {
      upload.single("logo")(request, response, async (uploadError) => {
        if (uploadError) {
          reject(uploadError);
          return;
        }

        try {
          if (!request.file) {
            response.status(400).json({ error: "No image file provided" });
            resolve();
            return;
          }

          const stored = await storeMediaAsset({
            file: {
              buffer: request.file.buffer,
              originalname: request.file.originalname,
              mimetype: request.file.mimetype,
              size: request.file.size,
            },
            folder: "logos",
            prefix: "logo",
          });

          const setting = await prisma.$transaction(async (tx) => {
            const before = await tx.globalSettings.findUnique({ where: { key: "site_logo_url" } });
            const updated = await tx.globalSettings.upsert({
              where: { key: "site_logo_url" },
              update: { value: stored.url },
              create: { key: "site_logo_url", value: stored.url }
            });

            await recordAuditLog(tx, {
              actorUserId: actor.user.id,
              actorClerkUserId: actor.clerkUserId,
              action: "settings.logo_upload",
              entityType: "GlobalSettings",
              entityId: "site_logo_url",
              before: before ? { key: before.key, value: before.value } : null,
              after: { key: "site_logo_url", value: stored.url, storageMode: stored.storageMode }
            });

            return updated;
          });

          response.json({ url: stored.url, setting });
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  } catch (error) {
    next(error);
  }
});

export default router;
