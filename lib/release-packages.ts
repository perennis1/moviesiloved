export type ReleaseDestinationType = "EPISODE_LINKS" | "BATCH_ZIP" | "MIRROR" | "STREAM" | "OTHER";

export type LegacyWatchLink = {
  id: string;
  platform: string;
  url: string;
  type: "STREAM" | "RENT" | "BUY" | "FREE" | "DOWNLOAD";
  quality: string | null;
  language: string | null;
  price: string | null;
  seasonLabel: string | null;
  linkLabel: string | null;
  sortOrder: number;
};

export type ReleaseDestinationCard = {
  id: string;
  label: string;
  url: string;
  type: ReleaseDestinationType;
  sortOrder: number;
};

export type ReleasePackageCard = {
  id: string;
  title: string;
  seasonLabel: string | null;
  audioLabel: string | null;
  qualityLabel: string | null;
  subtitleLabel: string | null;
  sizeLabel: string | null;
  notes: string | null;
  sortOrder: number;
  isActive: boolean;
  destinations: ReleaseDestinationCard[];
  source: "package" | "legacy";
};

export type ReleasePackageForm = {
  title: string;
  seasonLabel: string;
  audioLabel: string;
  qualityLabel: string;
  subtitleLabel: string;
  sizeLabel: string;
  notes: string;
  sortOrder: number;
  isActive: boolean;
  destinations: Array<{
    label: string;
    url: string;
    type: ReleaseDestinationType;
    sortOrder: number;
  }>;
};

const SIZE_PATTERN = /^\d+(?:\.\d+)?\s?(?:KB|MB|GB|TB)$/i;

export function isSizeLabel(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  return SIZE_PATTERN.test(value.trim());
}

export function mapLegacyWatchLinkType(
  type: LegacyWatchLink["type"],
  label?: string | null
): ReleaseDestinationType {
  const normalizedLabel = (label || "").toLowerCase();

  if (type === "STREAM") {
    return "STREAM";
  }

  if (normalizedLabel.includes("batch") || normalizedLabel.includes("zip")) {
    return "BATCH_ZIP";
  }

  if (normalizedLabel.includes("mirror")) {
    return "MIRROR";
  }

  if (normalizedLabel.includes("episode")) {
    return "EPISODE_LINKS";
  }

  if (type === "DOWNLOAD") {
    return "EPISODE_LINKS";
  }

  return "OTHER";
}

export function formatReleasePackageTitle(input: {
  baseTitle: string;
  seasonLabel?: string | null;
  audioLabel?: string | null;
  qualityLabel?: string | null;
  subtitleLabel?: string | null;
  sizeLabel?: string | null;
}): string {
  const parts: string[] = [];
  const baseTitle = input.seasonLabel?.trim() || input.baseTitle.trim();

  if (baseTitle) {
    parts.push(baseTitle);
  }

  if (input.audioLabel?.trim()) {
    parts.push(`(${input.audioLabel.trim()})`);
  }

  if (input.qualityLabel?.trim()) {
    parts.push(input.qualityLabel.trim());
  }

  if (input.subtitleLabel?.trim()) {
    parts.push(input.subtitleLabel.trim());
  }

  const sizeLabel = input.sizeLabel?.trim();
  if (sizeLabel && isSizeLabel(sizeLabel)) {
    parts.push(`[${sizeLabel}]`);
  } else if (sizeLabel && !baseTitle) {
    parts.push(`[${sizeLabel}]`);
  } else if (sizeLabel && !isSizeLabel(sizeLabel)) {
    parts.push(`[${sizeLabel}]`);
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function normalizeReleasePackages(movieTitle: string, packages?: Array<Partial<ReleasePackageCard> & { destinations?: Array<Partial<ReleaseDestinationCard>> }>, legacyWatchLinks?: LegacyWatchLink[]): ReleasePackageCard[] {
  const normalizedPackages = (packages || [])
    .map((pkg, index) => {
      const destinations = (pkg.destinations || [])
        .map((destination, destinationIndex) => ({
          id: destination.id || `destination-${index}-${destinationIndex}`,
          label: (destination.label || "Open Link").trim(),
          url: (destination.url || "").trim(),
          type: (destination.type || "OTHER") as ReleaseDestinationType,
          sortOrder: Number(destination.sortOrder ?? destinationIndex) || 0
        }))
        .filter((destination) => destination.url.length > 0)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      return {
        id: pkg.id || `package-${index}`,
        title: (pkg.title || formatReleasePackageTitle({
          baseTitle: movieTitle,
          seasonLabel: pkg.seasonLabel ?? null,
          audioLabel: pkg.audioLabel ?? null,
          qualityLabel: pkg.qualityLabel ?? null,
          subtitleLabel: pkg.subtitleLabel ?? null,
          sizeLabel: pkg.sizeLabel ?? null
        })).trim(),
        seasonLabel: pkg.seasonLabel ?? null,
        audioLabel: pkg.audioLabel ?? null,
        qualityLabel: pkg.qualityLabel ?? null,
        subtitleLabel: pkg.subtitleLabel ?? null,
        sizeLabel: pkg.sizeLabel ?? null,
        notes: pkg.notes ?? null,
        sortOrder: Number(pkg.sortOrder ?? index) || 0,
        isActive: pkg.isActive ?? true,
        destinations,
        source: "package" as const
      } satisfies ReleasePackageCard;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (normalizedPackages.length > 0) {
    return normalizedPackages;
  }

  const legacyGroups = new Map<string, ReleasePackageCard>();

  for (const link of legacyWatchLinks || []) {
    const seasonLabel = link.seasonLabel?.trim() || "";
    const audioLabel = link.language?.trim() || "";
    const qualityLabel = link.quality?.trim() || "";
    const sizeLabel = isSizeLabel(link.price) ? link.price?.trim() || "" : "";
    const groupKey = [seasonLabel || movieTitle, audioLabel, qualityLabel, sizeLabel].join("::");
    const title = formatReleasePackageTitle({
      baseTitle: movieTitle,
      seasonLabel: seasonLabel || undefined,
      audioLabel: audioLabel || undefined,
      qualityLabel: qualityLabel || undefined,
      sizeLabel: sizeLabel || undefined
    });

    const current = legacyGroups.get(groupKey);
    const destination: ReleaseDestinationCard = {
      id: link.id,
      label: (link.linkLabel || (link.type === "DOWNLOAD" ? "Episode Links" : link.platform) || "Open Link").trim(),
      url: link.url,
      type: mapLegacyWatchLinkType(link.type, link.linkLabel || link.platform),
      sortOrder: link.sortOrder || 0
    };

    if (!current) {
      legacyGroups.set(groupKey, {
        id: link.id,
        title,
        seasonLabel: seasonLabel || null,
        audioLabel: audioLabel || null,
        qualityLabel: qualityLabel || null,
        subtitleLabel: null,
        sizeLabel: sizeLabel || null,
        notes: null,
        sortOrder: link.sortOrder || 0,
        isActive: true,
        destinations: [destination],
        source: "legacy"
      });
      continue;
    }

    current.destinations.push(destination);
    current.destinations.sort((a, b) => a.sortOrder - b.sortOrder);
    current.sortOrder = Math.min(current.sortOrder, link.sortOrder || 0);
  }

  return Array.from(legacyGroups.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}
