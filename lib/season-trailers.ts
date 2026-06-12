export type SeasonTrailerCard = {
  id: string;
  seasonLabel: string;
  title: string | null;
  url: string;
  sortOrder: number;
  isActive: boolean;
};

export function formatSeasonTrailerTitle(seasonLabel: string, title?: string | null): string {
  const cleanedTitle = title?.trim();
  if (cleanedTitle) {
    return cleanedTitle;
  }

  const cleanedSeasonLabel = seasonLabel.trim();
  return cleanedSeasonLabel ? `Trailer ${cleanedSeasonLabel}` : "Trailer";
}

export function parseSeasonNumbers(value: string): number[] {
  const normalized = value.replace(/[&/]/g, ",").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }

  const result = new Set<number>();

  for (const chunk of normalized.split(",").map((part) => part.trim()).filter(Boolean)) {
    const rangeMatch = chunk.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (Number.isFinite(start) && Number.isFinite(end)) {
        const lower = Math.min(start, end);
        const upper = Math.max(start, end);
        for (let season = lower; season <= upper; season += 1) {
          result.add(season);
        }
      }
      continue;
    }

    const directMatch = chunk.match(/\d+/);
    if (directMatch) {
      const seasonNumber = Number(directMatch[0]);
      if (Number.isFinite(seasonNumber)) {
        result.add(seasonNumber);
      }
    }
  }

  return Array.from(result.values()).sort((left, right) => left - right);
}

export function expandSeasonLabels(value: string): string[] {
  return parseSeasonNumbers(value).map((season) => `Season ${season}`);
}
