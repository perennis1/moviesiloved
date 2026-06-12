const MIN_INDEXABLE_TITLES = 3;

export type CastFilmographyEntry = {
  title: string;
  releaseYear: string;
  role: string | null;
  contentType: string;
  isFeatured: boolean;
};

export function slugifyName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildCastSummary(name: string, entries: CastFilmographyEntry[]) {
  const titles = entries.map((entry) => `${entry.title} (${entry.releaseYear})`);
  const featuredTitles = titles.slice(0, 3);
  const count = titles.length;

  if (count === 0) {
    return `${name} is credited in the Movies I Loved catalog. Their title page will expand as more releases are added.`;
  }

  const titleText =
    featuredTitles.length === 1
      ? featuredTitles[0]
      : featuredTitles.length === 2
        ? `${featuredTitles[0]} and ${featuredTitles[1]}`
        : `${featuredTitles[0]}, ${featuredTitles[1]}, and ${featuredTitles[2]}`;

  const totalText = count === 1 ? "1 title" : `${count} titles`;

  return `${name} appears in ${totalText} on Movies I Loved, including ${titleText}. This page tracks their catalog filmography, credited roles, and related titles from our public library.`;
}

export function shouldIndexCastPage(params: {
  hasManualBio: boolean;
  entries: CastFilmographyEntry[];
  isTopBilled: boolean;
}) {
  return params.isTopBilled && params.entries.length >= MIN_INDEXABLE_TITLES;
}

export function getCastPageMode(params: {
  hasManualBio: boolean;
  entries: CastFilmographyEntry[];
  isTopBilled: boolean;
}) {
  return shouldIndexCastPage(params) ? "index" : "noindex";
}
