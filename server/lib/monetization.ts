import { prisma } from "./prisma";
import { isPrismaMissingTableError } from "./prisma-errors";
import {
  createDefaultMonetizationConfig,
  getSlotFromConfig,
  LEGACY_MONETIZATION_SNIPPET_KEYS,
  MONETIZATION_CONFIG_KEY,
  type LegacyMonetizationSettingKey,
  type MonetizationConfig,
  type MonetizationSlotKey,
  normalizeMonetizationConfig
} from "@/lib/monetization";

function buildLegacySnippets(rows: Array<{ key: string; value: string }>) {
  const byKey = new Map(rows.map((row) => [row.key, row.value]));

  return {
    homepage_feed: byKey.get("ad_script_homepage_feed")?.trim() || "",
    movie_sidebar_desktop: byKey.get("ad_script_movie_sidebar")?.trim() || "",
    verify_top: byKey.get("ad_script_verify_banner")?.trim() || "",
    verify_bottom: byKey.get("ad_script_verify_banner")?.trim() || "",
    video_ad: byKey.get("video_ad_script")?.trim() || ""
  } satisfies Partial<Record<MonetizationSlotKey, string>>;
}

export async function getMonetizationConfig(): Promise<MonetizationConfig> {
  try {
    const rows = await prisma.globalSettings.findMany({
      where: {
        key: {
          in: [MONETIZATION_CONFIG_KEY, ...LEGACY_MONETIZATION_SNIPPET_KEYS]
        }
      }
    });

    const configRow = rows.find((row) => row.key === MONETIZATION_CONFIG_KEY);
    const legacySnippets = buildLegacySnippets(rows);

    if (!configRow?.value?.trim()) {
      return createDefaultMonetizationConfig(legacySnippets);
    }

    return normalizeMonetizationConfig(configRow.value, legacySnippets);
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      console.warn("GlobalSettings table is missing. Falling back to default monetization config until migrations are applied.");
      return createDefaultMonetizationConfig();
    }

    throw error;
  }
}

export function getMonetizationSlot(config: MonetizationConfig, slotKey: MonetizationSlotKey) {
  return getSlotFromConfig(config, slotKey) ?? getSlotFromConfig(createDefaultMonetizationConfig(), slotKey)!;
}

export function getMonetizationLegacySnippetKeys() {
  return LEGACY_MONETIZATION_SNIPPET_KEYS.slice() as LegacyMonetizationSettingKey[];
}
