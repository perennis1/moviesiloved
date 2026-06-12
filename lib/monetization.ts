export const MONETIZATION_CONFIG_KEY = "ad_inventory_config_json";

export const LEGACY_MONETIZATION_SNIPPET_KEYS = [
  "ad_script_verify_banner",
  "ad_script_movie_sidebar",
  "ad_script_homepage_feed",
  "video_ad_script"
] as const;

export type LegacyMonetizationSettingKey = (typeof LEGACY_MONETIZATION_SNIPPET_KEYS)[number];

export type MonetizationPageGroup =
  | "homepage"
  | "movie"
  | "archive"
  | "verify"
  | "sitewide";

export type MonetizationProviderType = "network" | "direct-sold" | "affiliate";
export type MonetizationDeviceTarget = "all" | "desktop" | "mobile";
export type MonetizationFallbackMode = "hide" | "collapse" | "placeholder";

export type MonetizationSlotKey =
  | "homepage_top"
  | "homepage_feed"
  | "homepage_mid_feed"
  | "movie_sidebar_desktop"
  | "movie_after_synopsis"
  | "movie_between_packages"
  | "archive_in_grid"
  | "archive_near_pagination"
  | "verify_top"
  | "verify_bottom"
  | "video_ad"
  | "sitewide_sponsor_strip";

export type MonetizationSlotConfig = {
  slotKey: MonetizationSlotKey;
  displayName: string;
  pageGroup: MonetizationPageGroup;
  placement: string;
  providerName: string;
  providerType: MonetizationProviderType;
  approvedHosts: string[];
  enabled: boolean;
  deviceTarget: MonetizationDeviceTarget;
  stickyAllowed: boolean;
  refreshAllowed: boolean;
  fallbackMode: MonetizationFallbackMode;
  snippet: string;
  notes: string;
  priority: number;
  minContentHeight: number;
  maxInstancesPerPage: number;
  highRisk: boolean;
};

export type MonetizationConfig = {
  generatedAt: string;
  slots: MonetizationSlotConfig[];
};

const MONETIZATION_SLOT_DEFINITIONS: Array<Omit<MonetizationSlotConfig, "snippet">> = [
  {
    slotKey: "homepage_top",
    displayName: "Homepage Top",
    pageGroup: "homepage",
    placement: "Below hero / featured area",
    providerName: "Network",
    providerType: "network",
    approvedHosts: [],
    enabled: false,
    deviceTarget: "all",
    stickyAllowed: false,
    refreshAllowed: false,
    fallbackMode: "hide",
    notes: "Premium hero-adjacent inventory.",
    priority: 10,
    minContentHeight: 250,
    maxInstancesPerPage: 1,
    highRisk: false
  },
  {
    slotKey: "homepage_feed",
    displayName: "Homepage Feed",
    pageGroup: "homepage",
    placement: "After the first visible content block",
    providerName: "Network",
    providerType: "network",
    approvedHosts: [],
    enabled: true,
    deviceTarget: "all",
    stickyAllowed: false,
    refreshAllowed: false,
    fallbackMode: "hide",
    notes: "Baseline homepage inventory.",
    priority: 20,
    minContentHeight: 120,
    maxInstancesPerPage: 1,
    highRisk: false
  },
  {
    slotKey: "homepage_mid_feed",
    displayName: "Homepage Mid-Feed",
    pageGroup: "homepage",
    placement: "Mid-scroll between content rows",
    providerName: "Network",
    providerType: "network",
    approvedHosts: [],
    enabled: false,
    deviceTarget: "all",
    stickyAllowed: false,
    refreshAllowed: false,
    fallbackMode: "hide",
    notes: "Enable only after homepage scroll depth is proven.",
    priority: 30,
    minContentHeight: 160,
    maxInstancesPerPage: 1,
    highRisk: false
  },
  {
    slotKey: "movie_sidebar_desktop",
    displayName: "Movie Sidebar Desktop",
    pageGroup: "movie",
    placement: "Right rail on title pages",
    providerName: "Network",
    providerType: "network",
    approvedHosts: [],
    enabled: true,
    deviceTarget: "desktop",
    stickyAllowed: true,
    refreshAllowed: false,
    fallbackMode: "hide",
    notes: "Highest-value desktop title-page inventory.",
    priority: 10,
    minContentHeight: 250,
    maxInstancesPerPage: 1,
    highRisk: false
  },
  {
    slotKey: "movie_after_synopsis",
    displayName: "Movie After Synopsis",
    pageGroup: "movie",
    placement: "After synopsis and metadata",
    providerName: "Network",
    providerType: "network",
    approvedHosts: [],
    enabled: false,
    deviceTarget: "all",
    stickyAllowed: false,
    refreshAllowed: false,
    fallbackMode: "hide",
    notes: "Contextual slot for longer title pages.",
    priority: 20,
    minContentHeight: 180,
    maxInstancesPerPage: 1,
    highRisk: false
  },
  {
    slotKey: "movie_between_packages",
    displayName: "Movie Between Packages",
    pageGroup: "movie",
    placement: "Between release package groups",
    providerName: "Network",
    providerType: "network",
    approvedHosts: [],
    enabled: false,
    deviceTarget: "all",
    stickyAllowed: false,
    refreshAllowed: false,
    fallbackMode: "hide",
    notes: "Only enable on long package lists.",
    priority: 30,
    minContentHeight: 180,
    maxInstancesPerPage: 2,
    highRisk: false
  },
  {
    slotKey: "archive_in_grid",
    displayName: "Archive In-Grid",
    pageGroup: "archive",
    placement: "After the first row of cards",
    providerName: "Network",
    providerType: "network",
    approvedHosts: [],
    enabled: false,
    deviceTarget: "all",
    stickyAllowed: false,
    refreshAllowed: false,
    fallbackMode: "hide",
    notes: "Use for category/search/archive inventory.",
    priority: 10,
    minContentHeight: 160,
    maxInstancesPerPage: 1,
    highRisk: false
  },
  {
    slotKey: "archive_near_pagination",
    displayName: "Archive Near Pagination",
    pageGroup: "archive",
    placement: "Above or beside pagination",
    providerName: "Network",
    providerType: "network",
    approvedHosts: [],
    enabled: false,
    deviceTarget: "all",
    stickyAllowed: false,
    refreshAllowed: false,
    fallbackMode: "hide",
    notes: "Late-scroll browse inventory.",
    priority: 20,
    minContentHeight: 120,
    maxInstancesPerPage: 1,
    highRisk: false
  },
  {
    slotKey: "verify_top",
    displayName: "Verify Top",
    pageGroup: "verify",
    placement: "Top banner above the handoff card",
    providerName: "Network",
    providerType: "network",
    approvedHosts: [],
    enabled: true,
    deviceTarget: "all",
    stickyAllowed: false,
    refreshAllowed: false,
    fallbackMode: "hide",
    notes: "Keep conservative to protect completion.",
    priority: 10,
    minContentHeight: 90,
    maxInstancesPerPage: 1,
    highRisk: true
  },
  {
    slotKey: "verify_bottom",
    displayName: "Verify Bottom",
    pageGroup: "verify",
    placement: "Bottom banner under the handoff card",
    providerName: "Network",
    providerType: "network",
    approvedHosts: [],
    enabled: true,
    deviceTarget: "all",
    stickyAllowed: false,
    refreshAllowed: false,
    fallbackMode: "hide",
    notes: "Second verify impression, also conservative.",
    priority: 20,
    minContentHeight: 250,
    maxInstancesPerPage: 1,
    highRisk: true
  },
  {
    slotKey: "video_ad",
    displayName: "Verify Video",
    pageGroup: "verify",
    placement: "Waiting-room video unit",
    providerName: "Network",
    providerType: "network",
    approvedHosts: [],
    enabled: false,
    deviceTarget: "all",
    stickyAllowed: false,
    refreshAllowed: false,
    fallbackMode: "hide",
    notes: "Opt-in only. Keep isolated from the final CTA and enable only when measurement is trusted.",
    priority: 30,
    minContentHeight: 150,
    maxInstancesPerPage: 1,
    highRisk: true
  },
  {
    slotKey: "sitewide_sponsor_strip",
    displayName: "Sitewide Sponsor Strip",
    pageGroup: "sitewide",
    placement: "Top announcement-style strip",
    providerName: "Direct-sold",
    providerType: "direct-sold",
    approvedHosts: [],
    enabled: false,
    deviceTarget: "all",
    stickyAllowed: false,
    refreshAllowed: false,
    fallbackMode: "collapse",
    notes: "Reserve for direct campaigns and sponsorships.",
    priority: 10,
    minContentHeight: 48,
    maxInstancesPerPage: 1,
    highRisk: false
  }
];

const MONETIZATION_SLOT_KEYS = new Set<MonetizationSlotKey>(
  MONETIZATION_SLOT_DEFINITIONS.map((definition) => definition.slotKey)
);

const DEFAULT_SLOT_MAP = new Map(
  MONETIZATION_SLOT_DEFINITIONS.map((definition) => [
    definition.slotKey,
    {
      ...definition,
      snippet: ""
    } satisfies MonetizationSlotConfig
  ])
);

export const LEGACY_SLOT_SETTING_KEY_MAP: Partial<Record<MonetizationSlotKey, LegacyMonetizationSettingKey>> = {
  homepage_feed: "ad_script_homepage_feed",
  movie_sidebar_desktop: "ad_script_movie_sidebar",
  verify_top: "ad_script_verify_banner",
  verify_bottom: "ad_script_verify_banner",
  video_ad: "video_ad_script"
};

export function isMonetizationSlotKey(value: string): value is MonetizationSlotKey {
  return MONETIZATION_SLOT_KEYS.has(value as MonetizationSlotKey);
}

export function isMonetizationPageGroup(value: string): value is MonetizationPageGroup {
  return value === "homepage" || value === "movie" || value === "archive" || value === "verify" || value === "sitewide";
}

export function isMonetizationProviderType(value: string): value is MonetizationProviderType {
  return value === "network" || value === "direct-sold" || value === "affiliate";
}

export function isMonetizationDeviceTarget(value: string): value is MonetizationDeviceTarget {
  return value === "all" || value === "desktop" || value === "mobile";
}

export function isMonetizationFallbackMode(value: string): value is MonetizationFallbackMode {
  return value === "hide" || value === "collapse" || value === "placeholder";
}

export function createDefaultMonetizationConfig(
  legacySnippets: Partial<Record<MonetizationSlotKey, string>> = {}
): MonetizationConfig {
  return {
    generatedAt: new Date().toISOString(),
    slots: MONETIZATION_SLOT_DEFINITIONS.map((definition) => ({
      ...definition,
      snippet: legacySnippets[definition.slotKey]?.trim() || ""
    }))
  };
}

function normalizeHosts(hosts: unknown): string[] {
  if (!Array.isArray(hosts)) {
    return [];
  }

  return hosts
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeSlot(
  slot: Partial<MonetizationSlotConfig>,
  fallback: MonetizationSlotConfig,
  legacySnippets: Partial<Record<MonetizationSlotKey, string>>
): MonetizationSlotConfig {
  const legacySnippet = legacySnippets[fallback.slotKey]?.trim() || "";
  const snippet = typeof slot.snippet === "string" && slot.snippet.trim() ? slot.snippet.trim() : legacySnippet;

  return {
    slotKey: fallback.slotKey,
    displayName: typeof slot.displayName === "string" && slot.displayName.trim() ? slot.displayName.trim() : fallback.displayName,
    pageGroup: typeof slot.pageGroup === "string" && isMonetizationPageGroup(slot.pageGroup) ? slot.pageGroup : fallback.pageGroup,
    placement: typeof slot.placement === "string" && slot.placement.trim() ? slot.placement.trim() : fallback.placement,
    providerName:
      typeof slot.providerName === "string" && slot.providerName.trim() ? slot.providerName.trim() : fallback.providerName,
    providerType:
      typeof slot.providerType === "string" && isMonetizationProviderType(slot.providerType) ? slot.providerType : fallback.providerType,
    approvedHosts: normalizeHosts(slot.approvedHosts),
    enabled: typeof slot.enabled === "boolean" ? slot.enabled : fallback.enabled,
    deviceTarget:
      typeof slot.deviceTarget === "string" && isMonetizationDeviceTarget(slot.deviceTarget) ? slot.deviceTarget : fallback.deviceTarget,
    stickyAllowed: typeof slot.stickyAllowed === "boolean" ? slot.stickyAllowed : fallback.stickyAllowed,
    refreshAllowed: typeof slot.refreshAllowed === "boolean" ? slot.refreshAllowed : fallback.refreshAllowed,
    fallbackMode:
      typeof slot.fallbackMode === "string" && isMonetizationFallbackMode(slot.fallbackMode) ? slot.fallbackMode : fallback.fallbackMode,
    snippet,
    notes: typeof slot.notes === "string" ? slot.notes.trim() : fallback.notes,
    priority: Number.isFinite(Number(slot.priority)) ? Number(slot.priority) : fallback.priority,
    minContentHeight: Number.isFinite(Number(slot.minContentHeight)) ? Number(slot.minContentHeight) : fallback.minContentHeight,
    maxInstancesPerPage: Number.isFinite(Number(slot.maxInstancesPerPage))
      ? Number(slot.maxInstancesPerPage)
      : fallback.maxInstancesPerPage,
    highRisk: typeof slot.highRisk === "boolean" ? slot.highRisk : fallback.highRisk
  };
}

export function normalizeMonetizationConfig(
  input: unknown,
  legacySnippets: Partial<Record<MonetizationSlotKey, string>> = {}
): MonetizationConfig {
  const parsed =
    typeof input === "string"
      ? (() => {
          try {
            return JSON.parse(input) as unknown;
          } catch {
            return null;
          }
        })()
      : input;

  if (!parsed || typeof parsed !== "object") {
    return createDefaultMonetizationConfig(legacySnippets);
  }

  const candidate = parsed as { generatedAt?: unknown; slots?: unknown };
  const slotsByKey = new Map<MonetizationSlotKey, Partial<MonetizationSlotConfig>>();

  if (Array.isArray(candidate.slots)) {
    for (const rawSlot of candidate.slots) {
      if (!rawSlot || typeof rawSlot !== "object") {
        continue;
      }

      const slot = rawSlot as Partial<MonetizationSlotConfig>;
      if (!slot.slotKey || typeof slot.slotKey !== "string" || !isMonetizationSlotKey(slot.slotKey)) {
        continue;
      }

      slotsByKey.set(slot.slotKey, slot);
    }
  }

  return {
    generatedAt: typeof candidate.generatedAt === "string" ? candidate.generatedAt : new Date().toISOString(),
    slots: MONETIZATION_SLOT_DEFINITIONS.map((definition) => {
      const override = slotsByKey.get(definition.slotKey);
      return normalizeSlot(override ?? {}, DEFAULT_SLOT_MAP.get(definition.slotKey)!, legacySnippets);
    })
  };
}

export function serializeMonetizationConfig(config: MonetizationConfig) {
  return JSON.stringify({
    generatedAt: config.generatedAt,
    slots: config.slots
  });
}

export function getSlotFromConfig(config: MonetizationConfig, slotKey: MonetizationSlotKey) {
  return config.slots.find((slot) => slot.slotKey === slotKey) ?? null;
}

export function getLegacySnippetKeyForSlot(slotKey: MonetizationSlotKey) {
  return LEGACY_SLOT_SETTING_KEY_MAP[slotKey] ?? null;
}
