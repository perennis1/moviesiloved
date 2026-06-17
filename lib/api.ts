import { prisma } from "@/server/lib/prisma";
import type { Prisma } from "@prisma/client";

import {
  audioFilters,
  genreFilters,
  languageFilters,
  qualityFilters,
  typeFilters,
  yearFilters
} from "./home-facets";
import type { ReleaseDestinationType } from "./release-packages";
import type { HomepageFacetStats } from "./home-facets";

type Movie = {
  id: string;
  slug: string;
  title: string;
  synopsis: string | null;
  releaseYear: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  genreNames: string[];
  averageRating: number | null;
  isFeatured?: boolean;
  contentType?: string;
};

type MovieDetail = {
  id: string;
  slug: string;
  title: string;
  synopsis: string | null;
  releaseYear: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  trailerUrl: string | null;
  screenshots: string[];
  contentType: string;
  genres: Array<{ genre: { id: string; name: string } }>;
  director: string | null;
  tmdbRating: number | null;
  tmdbRatingCount: string | null;
  imdbRating: string | null;
  imdbRatingCount: string | null;
  releaseQuality: string | null;
  releaseFormat: string | null;
  seasons: string | null;
  episodes: string | null;
  language: string | null;
  subtitles: string | null;
  episodeSize: string | null;
  seasonTrailers: Array<{
    id: string;
    seasonLabel: string;
    title: string | null;
    url: string;
    sortOrder: number;
    isActive: boolean;
  }>;
  releasePackages: Array<{
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
    destinations: Array<{
      id: string;
      label: string;
      url: string;
      type: ReleaseDestinationType;
      sortOrder: number;
    }>;
  }>;
  watchLinks: Array<{
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
  }>;
  castMembers: Array<{ actor: { id: string; slug: string | null; name: string; profileUrl: string | null }; character: string | null }>;
  reviews: Array<{
    id: string;
    rating: number;
    text: string | null;
    createdAt: string;
    user: { id: string; email: string };
  }>;
};

const EMPTY_HOMEPAGE_FACET_STATS: HomepageFacetStats = {
  genres: [],
  languages: [],
  years: [],
  types: [],
  audio: [],
  quality: [],
  popularFilters: []
};

function normalizeFilterValue(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeTypeFilter(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.toLowerCase();

  if (normalized.includes("movie")) {
    return "MOVIE";
  }

  if (normalized.includes("web")) {
    return "WEB_SERIES";
  }

  if (normalized.includes("series")) {
    return "SERIES";
  }

  if (normalized.includes("anime")) {
    return "ANIME";
  }

  return undefined;
}

function buildTextSearchFilters(query: string): Prisma.MovieWhereInput {
  return {
    OR: [
      { title: { contains: query, mode: "insensitive" } },
      { synopsis: { contains: query, mode: "insensitive" } },
      { director: { contains: query, mode: "insensitive" } },
      { contentType: { contains: query, mode: "insensitive" } },
      { genres: { some: { genre: { name: { contains: query, mode: "insensitive" } } } } },
      { watchLinks: { some: { platform: { contains: query, mode: "insensitive" } } } },
      { watchLinks: { some: { language: { contains: query, mode: "insensitive" } } } },
      { watchLinks: { some: { quality: { contains: query, mode: "insensitive" } } } },
      { releasePackages: { some: { title: { contains: query, mode: "insensitive" } } } },
      { releasePackages: { some: { seasonLabel: { contains: query, mode: "insensitive" } } } },
      { releasePackages: { some: { audioLabel: { contains: query, mode: "insensitive" } } } },
      { releasePackages: { some: { qualityLabel: { contains: query, mode: "insensitive" } } } },
      { releasePackages: { some: { subtitleLabel: { contains: query, mode: "insensitive" } } } },
      { releasePackages: { some: { sizeLabel: { contains: query, mode: "insensitive" } } } },
      { releasePackages: { some: { notes: { contains: query, mode: "insensitive" } } } },
      { releasePackages: { some: { destinations: { some: { label: { contains: query, mode: "insensitive" } } } } } },
      { castMembers: { some: { actor: { name: { contains: query, mode: "insensitive" } } } } }
    ]
  };
}

function getMovieOrderBy(sort: string | undefined): Prisma.MovieOrderByWithRelationInput[] {
  switch (sort?.toLowerCase()) {
    case "featured":
      return [{ isFeatured: "desc" }, { updatedAt: "desc" }, { title: "asc" }];
    case "most viewed":
    case "most-viewed":
    case "views":
      return [{ views: "desc" }, { updatedAt: "desc" }, { title: "asc" }];
    case "top rated":
    case "top-rated":
    case "rating":
      return [{ reviews: { _count: "desc" } }, { updatedAt: "desc" }, { title: "asc" }];
    case "a-z":
    case "az":
      return [{ title: "asc" }, { updatedAt: "desc" }];
    case "newest":
    default:
      return [{ updatedAt: "desc" }, { title: "asc" }];
  }
}

function normalizeFacetText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function createFacetCounts(values: string[]) {
  return new Map(values.map((value) => [value, 0]));
}

function includesAny(haystacks: string[], needle: string) {
  return haystacks.some((haystack) => haystack.includes(needle));
}

function exactGenreMatch(haystacks: string[], needle: string) {
  return haystacks.some((haystack) => haystack === needle);
}

type HomepageFacetMovie = {
  id: string;
  releaseYear: string;
  contentType: string;
  language: string | null;
  releaseQuality: string | null;
  releaseFormat: string | null;
  genres: Array<{ genre: { name: string } }>;
  watchLinks: Array<{
    platform: string;
    quality: string | null;
    language: string | null;
    seasonLabel: string | null;
    linkLabel: string | null;
  }>;
  releasePackages: Array<{
    title: string;
    seasonLabel: string | null;
    audioLabel: string | null;
    qualityLabel: string | null;
    subtitleLabel: string | null;
    sizeLabel: string | null;
    notes: string | null;
  }>;
};

function collectFacetTexts(movie: HomepageFacetMovie) {
  return [
    movie.language,
    movie.releaseQuality,
    movie.releaseFormat,
    ...movie.watchLinks.flatMap((link) => [link.platform, link.language, link.quality, link.seasonLabel, link.linkLabel]),
    ...movie.releasePackages.flatMap((pkg) => [
      pkg.title,
      pkg.seasonLabel,
      pkg.audioLabel,
      pkg.qualityLabel,
      pkg.subtitleLabel,
      pkg.sizeLabel,
      pkg.notes
    ])
  ]
    .map(normalizeFacetText)
    .filter(Boolean) as string[];
}

function buildHomepageFacetStats(movies: HomepageFacetMovie[]): HomepageFacetStats {
  const genreCounts = createFacetCounts(genreFilters);
  const languageCounts = createFacetCounts(languageFilters);
  const yearCounts = createFacetCounts(yearFilters);
  const typeCounts = createFacetCounts(typeFilters);
  const audioCounts = createFacetCounts(audioFilters);
  const qualityCounts = createFacetCounts(qualityFilters);

  const popularFilters: HomepageFacetStats["popularFilters"] = [];

  for (const movie of movies) {
    const texts = collectFacetTexts(movie);
    const genreNames = movie.genres.map((item) => item.genre.name);

    for (const genre of genreCounts.keys()) {
      if (exactGenreMatch(genreNames.map(normalizeFacetText), normalizeFacetText(genre))) {
        genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
      }
    }

    for (const language of languageCounts.keys()) {
      if (includesAny(texts, normalizeFacetText(language))) {
        languageCounts.set(language, (languageCounts.get(language) ?? 0) + 1);
      }
    }

    for (const year of yearCounts.keys()) {
      if (normalizeFacetText(movie.releaseYear) === normalizeFacetText(year)) {
        yearCounts.set(year, (yearCounts.get(year) ?? 0) + 1);
      }
    }

    for (const type of typeCounts.keys()) {
      const typeValue = normalizeTypeFilter(type);
      if (typeValue && normalizeFacetText(movie.contentType) === normalizeFacetText(typeValue)) {
        typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
      }
    }

    for (const audio of audioCounts.keys()) {
      if (includesAny(texts, normalizeFacetText(audio))) {
        audioCounts.set(audio, (audioCounts.get(audio) ?? 0) + 1);
      }
    }

    for (const quality of qualityCounts.keys()) {
      if (includesAny(texts, normalizeFacetText(quality))) {
        qualityCounts.set(quality, (qualityCounts.get(quality) ?? 0) + 1);
      }
    }
  }

  const genres = Array.from(genreCounts.entries())
    .filter(([, count]) => count > 0)
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value));
  const languages = Array.from(languageCounts.entries())
    .filter(([, count]) => count > 0)
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value));
  const years = Array.from(yearCounts.entries())
    .filter(([, count]) => count > 0)
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value));
  const types = Array.from(typeCounts.entries())
    .filter(([, count]) => count > 0)
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value));
  const audio = Array.from(audioCounts.entries())
    .filter(([, count]) => count > 0)
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value));
  const quality = Array.from(qualityCounts.entries())
    .filter(([, count]) => count > 0)
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value));

  const topFilterOptions = [
    ...genres.slice(0, 3).map((item) => ({ facet: "genre" as const, ...item })),
    ...languages.slice(0, 2).map((item) => ({ facet: "language" as const, ...item })),
    ...years.slice(0, 1).map((item) => ({ facet: "year" as const, ...item })),
    ...types.slice(0, 1).map((item) => ({ facet: "type" as const, ...item })),
    ...audio.slice(0, 1).map((item) => ({ facet: "audio" as const, ...item })),
    ...quality.slice(0, 1).map((item) => ({ facet: "quality" as const, ...item }))
  ]
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value))
    .slice(0, 8);

  popularFilters.push(...topFilterOptions);

  return {
    genres,
    languages,
    years,
    types,
    audio,
    quality,
    popularFilters
  };
}

type MovieListItem = Prisma.MovieGetPayload<{
  include: {
    genres: {
      include: {
        genre: true;
      };
    };
    reviews: {
      select: {
        rating: true;
      };
    };
  };
}>;

function serializeMovieListItem(movie: MovieListItem) {
  return {
    id: movie.id,
    slug: movie.slug,
    title: movie.title,
    synopsis: movie.synopsis,
    releaseYear: movie.releaseYear,
    posterUrl: movie.posterUrl,
    backdropUrl: movie.backdropUrl,
    isFeatured: movie.isFeatured,
    genreNames: movie.genres.map((item) => item.genre.name),
    averageRating:
      movie.reviews.length > 0
        ? movie.reviews.reduce((total, review) => total + review.rating, 0) / movie.reviews.length
        : null
  };
}

export async function getGlobalSettings(key: string): Promise<string | null> {
  const setting = await prisma.globalSettings.findUnique({ where: { key } });
  return setting?.value ?? null;
}

export async function getFeaturedMovies() {
  const where = { deletedAt: null, status: "PUBLISHED" as const };

  const featured = await prisma.movie.findMany({
    where: { ...where, isFeatured: true },
    orderBy: { updatedAt: "desc" },
    take: 10,
    include: {
      genres: { include: { genre: true } },
      reviews: { select: { rating: true } }
    }
  });

  let results = [...featured];

  if (results.length < 10) {
    const needed = 10 - results.length;
    const featuredIds = results.map((movie) => movie.id);

    const fallback = await prisma.movie.findMany({
      where: { ...where, id: { notIn: featuredIds } },
      orderBy: { updatedAt: "desc" },
      take: needed,
      include: {
        genres: { include: { genre: true } },
        reviews: { select: { rating: true } }
      }
    });

    results = [...results, ...fallback];
  }

  return results.map(serializeMovieListItem);
}

export async function getMovies(
  page = 1,
  pageSize = 12,
  filters?: {
    genre?: string;
    year?: string;
    language?: string;
    type?: string;
    audio?: string;
    quality?: string;
    sort?: string;
    query?: string;
  }
) {
  try {
    const skip = (page - 1) * pageSize;
    const whereFilters: Prisma.MovieWhereInput[] = [];

    if (filters?.genre) {
      whereFilters.push({
        genres: { some: { genre: { name: { equals: filters.genre, mode: "insensitive" } } } }
      });
    }

    if (filters?.year) {
      whereFilters.push({ releaseYear: filters.year });
    }

    const normalizedType = normalizeTypeFilter(filters?.type);
    if (normalizedType) {
      whereFilters.push({ contentType: normalizedType });
    }

    if (filters?.language) {
      whereFilters.push({
        OR: [
          { watchLinks: { some: { language: { contains: filters.language, mode: "insensitive" } } } },
          { releasePackages: { some: { audioLabel: { contains: filters.language, mode: "insensitive" } } } },
          { releasePackages: { some: { title: { contains: filters.language, mode: "insensitive" } } } }
        ]
      });
    }

    if (filters?.audio) {
      whereFilters.push({
        OR: [
          { releasePackages: { some: { audioLabel: { contains: filters.audio, mode: "insensitive" } } } },
          { watchLinks: { some: { language: { contains: filters.audio, mode: "insensitive" } } } },
          { releasePackages: { some: { title: { contains: filters.audio, mode: "insensitive" } } } }
        ]
      });
    }

    if (filters?.quality) {
      whereFilters.push({
        OR: [
          { releasePackages: { some: { qualityLabel: { contains: filters.quality, mode: "insensitive" } } } },
          { watchLinks: { some: { quality: { contains: filters.quality, mode: "insensitive" } } } },
          { releasePackages: { some: { title: { contains: filters.quality, mode: "insensitive" } } } }
        ]
      });
    }

    if (filters?.query) {
      whereFilters.push(buildTextSearchFilters(filters.query));
    }

    const where: Prisma.MovieWhereInput = {
      deletedAt: null,
      status: "PUBLISHED",
      AND: whereFilters
    };

    const [movies, total] = await Promise.all([
      prisma.movie.findMany({
        where,
        orderBy: getMovieOrderBy(filters?.sort),
        take: pageSize,
        skip,
        include: {
          genres: { include: { genre: true } },
          reviews: { select: { rating: true } }
        }
      }),
      prisma.movie.count({ where })
    ]);

    return {
      movies: movies.map(serializeMovieListItem),
      total
    };
  } catch {
    return {
      movies: [],
      total: 0
    };
  }
}

export async function getMovieFacetStats() {
  try {
    const movies = await prisma.movie.findMany({
      where: {
        deletedAt: null,
        status: "PUBLISHED"
      },
      select: {
        id: true,
        releaseYear: true,
        contentType: true,
        language: true,
        releaseQuality: true,
        releaseFormat: true,
        genres: {
          select: {
            genre: {
              select: {
                name: true
              }
            }
          }
        },
        watchLinks: {
          select: {
            platform: true,
            quality: true,
            language: true,
            seasonLabel: true,
            linkLabel: true
          }
        },
        releasePackages: {
          where: {
            isActive: true
          },
          select: {
            title: true,
            seasonLabel: true,
            audioLabel: true,
            qualityLabel: true,
            subtitleLabel: true,
            sizeLabel: true,
            notes: true
          }
        }
      }
    });

    return buildHomepageFacetStats(movies);
  } catch {
    return EMPTY_HOMEPAGE_FACET_STATS;
  }
}

export async function getAllMovies() {
  try {
    const movies = await prisma.movie.findMany({
      where: {
        deletedAt: null,
        status: "PUBLISHED"
      },
      include: {
        genres: { include: { genre: true } },
        reviews: { select: { rating: true } }
      },
      orderBy: getMovieOrderBy("newest")
    });

    return movies.map(serializeMovieListItem);
  } catch {
    return [];
  }
}

export async function getMovie(slug: string) {
  const movie = await prisma.movie.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null },
    include: {
      genres: {
        include: {
          genre: true
        }
      },
      seasonTrailers: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      },
      watchLinks: true,
      releasePackages: {
        include: {
          destinations: true
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      },
      castMembers: {
        include: {
          actor: true
        }
      },
      reviews: {
        include: {
          user: {
            select: {
              id: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      }
    }
  });

  if (!movie) {
    throw new Error("Failed to load movie.");
  }

  return {
    movie: movie as unknown as MovieDetail
  };
}
