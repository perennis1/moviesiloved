import { env } from "./env";
import { z } from "zod";
import {
  MONETIZATION_CONFIG_KEY,
  isMonetizationDeviceTarget,
  isMonetizationFallbackMode,
  isMonetizationPageGroup,
  isMonetizationProviderType,
  isMonetizationSlotKey,
  normalizeMonetizationConfig,
  type MonetizationConfig
} from "@/lib/monetization";

const DEFAULT_ALLOWED_AD_HOSTS = [
  "adsterra.com",
  "monetag.com",
  "exoclick.com",
  "googlesyndication.com",
  "doubleclick.net",
  "googleads.g.doubleclick.net",
];

export const adSettingKeys = new Set([
  "ad_script_verify_banner",
  "ad_script_movie_sidebar",
  "ad_script_homepage_feed",
  "video_ad_script",
]);

export const monetizationConfigKey = MONETIZATION_CONFIG_KEY;

function normalizeHostname(hostname: string) {
  return hostname.trim().toLowerCase().replace(/^www\./, "");
}

function getAllowedHosts() {
  const configured = env.AD_ALLOWED_HOSTS.split(",")
    .map((value) => normalizeHostname(value))
    .filter(Boolean);

  return configured.length > 0 ? configured : DEFAULT_ALLOWED_AD_HOSTS;
}

function isAllowedHostname(hostname: string, allowedHosts: string[]) {
  const normalized = normalizeHostname(hostname);
  return allowedHosts.some((allowedHost) => normalized === allowedHost || normalized.endsWith(`.${allowedHost}`));
}

function extractEmbedUrls(markup: string) {
  const urls: string[] = [];
  const attributePattern = /\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;

  let match: RegExpExecArray | null = attributePattern.exec(markup);
  while (match) {
    urls.push(match[1]);
    match = attributePattern.exec(markup);
  }

  return urls;
}

export function isAdSettingKey(key: string) {
  return adSettingKeys.has(key);
}

export function isMonetizationConfigKey(key: string) {
  return key === MONETIZATION_CONFIG_KEY;
}

const monetizationConfigSchema = z.object({
  generatedAt: z.string().optional(),
  slots: z.array(
    z.object({
      slotKey: z.string(),
      displayName: z.string().optional(),
      pageGroup: z.string().optional(),
      placement: z.string().optional(),
      providerName: z.string().optional(),
      providerType: z.string().optional(),
      approvedHosts: z.array(z.string()).optional(),
      enabled: z.boolean().optional(),
      deviceTarget: z.string().optional(),
      stickyAllowed: z.boolean().optional(),
      refreshAllowed: z.boolean().optional(),
      fallbackMode: z.string().optional(),
      snippet: z.string().optional(),
      notes: z.string().optional(),
      priority: z.number().optional(),
      minContentHeight: z.number().optional(),
      maxInstancesPerPage: z.number().optional(),
      highRisk: z.boolean().optional()
    })
  )
});

export function validateMonetizationConfig(value: string) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    return { ok: false as const, error: "Monetization config must be valid JSON." };
  }

  const validation = monetizationConfigSchema.safeParse(parsed);
  if (!validation.success) {
    return { ok: false as const, error: "Monetization config is missing required slot data." };
  }

  const config = normalizeMonetizationConfig(parsed);
  const seen = new Set<string>();

  for (const slot of config.slots) {
    if (!isMonetizationSlotKey(slot.slotKey)) {
      return { ok: false as const, error: `Unknown monetization slot "${slot.slotKey}".` };
    }

    if (seen.has(slot.slotKey)) {
      return { ok: false as const, error: `Duplicate monetization slot "${slot.slotKey}".` };
    }
    seen.add(slot.slotKey);

    if (!isMonetizationPageGroup(slot.pageGroup)) {
      return { ok: false as const, error: `Invalid page group for "${slot.slotKey}".` };
    }

    if (!isMonetizationProviderType(slot.providerType)) {
      return { ok: false as const, error: `Invalid provider type for "${slot.slotKey}".` };
    }

    if (!isMonetizationDeviceTarget(slot.deviceTarget)) {
      return { ok: false as const, error: `Invalid device target for "${slot.slotKey}".` };
    }

    if (!isMonetizationFallbackMode(slot.fallbackMode)) {
      return { ok: false as const, error: `Invalid fallback mode for "${slot.slotKey}".` };
    }

    if (slot.snippet.trim() !== "") {
      const markupValidation = validateAdMarkup(slot.snippet);
      if (!markupValidation.ok) {
        return {
          ok: false as const,
          error: `Slot "${slot.displayName}" is not valid: ${markupValidation.error}`
        };
      }
    }
  }

  return { ok: true as const, config: config as MonetizationConfig };
}

export function validateAdMarkup(markup: string) {
  const trimmed = markup.trim();
  if (trimmed === "") {
    return { ok: true as const };
  }

  if (trimmed.length > 20000) {
    return { ok: false as const, error: "Ad markup is too large. Keep each snippet under 20 KB." };
  }

  if (/javascript:/i.test(trimmed)) {
    return { ok: false as const, error: "Javascript URLs are not allowed in ad markup." };
  }

  if (/\son\w+\s*=/i.test(trimmed)) {
    return { ok: false as const, error: "Inline event handlers are not allowed in ad markup." };
  }

  const urls = extractEmbedUrls(trimmed);
  if (urls.length === 0) {
    return { ok: false as const, error: "Ad markup must include at least one hosted script, iframe, or embed URL." };
  }

  const allowedHosts = getAllowedHosts();
  for (const value of urls) {
    try {
      const parsed = value.startsWith("//") ? new URL(`https:${value}`) : new URL(value, env.APP_URL);
      if (!isAllowedHostname(parsed.hostname, allowedHosts)) {
        return {
          ok: false as const,
          error: `Ad markup host "${parsed.hostname}" is not allowed. Update AD_ALLOWED_HOSTS if this provider is trusted.`,
        };
      }
    } catch {
      return { ok: false as const, error: "Ad markup contains an invalid embed URL." };
    }
  }

  return { ok: true as const };
}
