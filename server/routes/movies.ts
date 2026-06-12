import type { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import { ensureLocalUserForClerkId, requireClerkUserId } from "../lib/auth";
import { recordAuditLog } from "../lib/audit";
import { AppError } from "../lib/errors";
import {
  audioFilters,
  genreFilters,
  languageFilters,
  qualityFilters,
  type HomepageFacetStats,
  typeFilters,
  yearFilters
} from "../../lib/home-facets";
import { prisma } from "../lib/prisma";

const router = Router();

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  text: z.string().trim().max(2000).optional().or(z.literal(""))
});

function normalizeFilterValue(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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

function buildContainsFilter(field: string, value: string): Prisma.MovieWhereInput {
  return {
    [field]: {
      contains: value,
      mode: "insensitive"
    }
  } as Prisma.MovieWhereInput;
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

    for (const genre of genreFilters) {
      if (exactGenreMatch(genreNames.map(normalizeFacetText), normalizeFacetText(genre))) {
        genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
      }
    }

    for (const language of languageFilters) {
      if (includesAny(texts, normalizeFacetText(language))) {
        languageCounts.set(language, (languageCounts.get(language) ?? 0) + 1);
      }
    }

    for (const year of yearFilters) {
      if (normalizeFacetText(movie.releaseYear) === normalizeFacetText(year)) {
        yearCounts.set(year, (yearCounts.get(year) ?? 0) + 1);
      }
    }

    for (const type of typeFilters) {
      const typeValue = normalizeTypeFilter(type);
      if (typeValue && normalizeFacetText(movie.contentType) === normalizeFacetText(typeValue)) {
        typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
      }
    }

    for (const audio of audioFilters) {
      if (includesAny(texts, normalizeFacetText(audio))) {
        audioCounts.set(audio, (audioCounts.get(audio) ?? 0) + 1);
      }
    }

    for (const quality of qualityFilters) {
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

router.get("/", async (request, response, next) => {
  try {
    const take = request.query.take ? parseInt(String(request.query.take), 10) : undefined;
    const skip = request.query.skip ? parseInt(String(request.query.skip), 10) : undefined;
    const genre = normalizeFilterValue(request.query.genre);
    const year = normalizeFilterValue(request.query.year);
    const language = normalizeFilterValue(request.query.language);
    const type = normalizeTypeFilter(normalizeFilterValue(request.query.type));
    const audio = normalizeFilterValue(request.query.audio);
    const quality = normalizeFilterValue(request.query.quality);
    const sort = normalizeFilterValue(request.query.sort);
    const query = normalizeFilterValue(request.query.q);

    const filters: Prisma.MovieWhereInput[] = [];

    if (genre) {
      filters.push({
        genres: { some: { genre: { name: { equals: genre, mode: "insensitive" } } } }
      });
    }

    if (year) {
      filters.push({ releaseYear: year });
    }

    if (type) {
      filters.push({ contentType: type });
    }

    if (language) {
      filters.push({
        OR: [
          { watchLinks: { some: { language: { contains: language, mode: "insensitive" } } } },
          { releasePackages: { some: { audioLabel: { contains: language, mode: "insensitive" } } } },
          { releasePackages: { some: { title: { contains: language, mode: "insensitive" } } } }
        ]
      });
    }

    if (audio) {
      filters.push({
        OR: [
          { releasePackages: { some: { audioLabel: { contains: audio, mode: "insensitive" } } } },
          { watchLinks: { some: { language: { contains: audio, mode: "insensitive" } } } },
          { releasePackages: { some: { title: { contains: audio, mode: "insensitive" } } } }
        ]
      });
    }

    if (quality) {
      filters.push({
        OR: [
          { releasePackages: { some: { qualityLabel: { contains: quality, mode: "insensitive" } } } },
          { watchLinks: { some: { quality: { contains: quality, mode: "insensitive" } } } },
          { releasePackages: { some: { title: { contains: quality, mode: "insensitive" } } } }
        ]
      });
    }

    if (query) {
      filters.push(buildTextSearchFilters(query));
    }

    const where: Prisma.MovieWhereInput = {
      deletedAt: null,
      status: "PUBLISHED",
      AND: filters
    };

    const [movies, total] = await Promise.all([
      prisma.movie.findMany({
        where,
        orderBy: getMovieOrderBy(sort),
        take,
        skip,
        include: {
          genres: { include: { genre: true } },
          reviews: { select: { rating: true } }
        }
      }),
      prisma.movie.count({ where })
    ]);

    response.json({ movies: movies.map(serializeMovieListItem), total });
  } catch (error) {
    next(error);
  }
});

router.get("/featured", async (request, response, next) => {
  try {
    const where = { deletedAt: null, status: "PUBLISHED" as const };
    
    // 1. Fetch explicitly featured movies (up to 10)
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

    // 2. If we have less than 10, fetch newest updated movies to fill the slots
    if (results.length < 10) {
      const needed = 10 - results.length;
      const featuredIds = results.map(m => m.id);
      
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

    response.json({ movies: results.map(serializeMovieListItem) });
  } catch (error) {
    next(error);
  }
});

router.get("/facets", async (request, response, next) => {
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

    response.json(buildHomepageFacetStats(movies));
  } catch (error) {
    next(error);
  }
});

router.get("/:slug", async (request, response, next) => {
  try {
    const movie = await prisma.movie.findFirst({
      where: { slug: request.params.slug, status: "PUBLISHED", deletedAt: null },
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
      throw new AppError("Movie not found.", 404);
    }

    response.json({ movie });
  } catch (error) {
    next(error);
  }
});

async function addMovieBookmark(clerkUserId: string, userId: string, movieId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.movieFavorite.upsert({
      where: {
        userId_movieId: {
          userId,
          movieId
        }
      },
      update: {},
      create: {
        userId,
        movieId
      }
    });

    await recordAuditLog(tx, {
      actorUserId: userId,
      actorClerkUserId: clerkUserId,
      action: "movie.bookmark_add",
      entityType: "Movie",
      entityId: movieId
    });

    return { ok: true };
  });
}

async function removeMovieBookmark(clerkUserId: string, userId: string, movieId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.movieFavorite.deleteMany({
      where: {
        userId,
        movieId
      }
    });

    await recordAuditLog(tx, {
      actorUserId: userId,
      actorClerkUserId: clerkUserId,
      action: "movie.bookmark_remove",
      entityType: "Movie",
      entityId: movieId
    });

    return { ok: true };
  });
}

async function addMovieWishlist(clerkUserId: string, userId: string, movieId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.movieWishlist.upsert({
      where: {
        userId_movieId: {
          userId,
          movieId
        }
      },
      update: {},
      create: {
        userId,
        movieId
      }
    });

    await recordAuditLog(tx, {
      actorUserId: userId,
      actorClerkUserId: clerkUserId,
      action: "movie.wishlist_add",
      entityType: "Movie",
      entityId: movieId
    });

    return { ok: true };
  });
}

async function removeMovieWishlist(clerkUserId: string, userId: string, movieId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.movieWishlist.deleteMany({
      where: {
        userId,
        movieId
      }
    });

    await recordAuditLog(tx, {
      actorUserId: userId,
      actorClerkUserId: clerkUserId,
      action: "movie.wishlist_remove",
      entityType: "Movie",
      entityId: movieId
    });

    return { ok: true };
  });
}

router.post("/:movieId/favorite", async (request, response, next) => {
  try {
    const clerkUserId = requireClerkUserId(request);
    const user = await ensureLocalUserForClerkId(clerkUserId);
    const movieId = request.params.movieId;

    await addMovieBookmark(clerkUserId, user.id, movieId);

    response.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.post("/:movieId/bookmark", async (request, response, next) => {
  try {
    const clerkUserId = requireClerkUserId(request);
    const user = await ensureLocalUserForClerkId(clerkUserId);
    const movieId = request.params.movieId;

    await addMovieBookmark(clerkUserId, user.id, movieId);

    response.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.delete("/:movieId/favorite", async (request, response, next) => {
  try {
    const clerkUserId = requireClerkUserId(request);
    const user = await ensureLocalUserForClerkId(clerkUserId);

    await removeMovieBookmark(clerkUserId, user.id, request.params.movieId);

    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.delete("/:movieId/bookmark", async (request, response, next) => {
  try {
    const clerkUserId = requireClerkUserId(request);
    const user = await ensureLocalUserForClerkId(clerkUserId);

    await removeMovieBookmark(clerkUserId, user.id, request.params.movieId);

    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post("/:movieId/wishlist", async (request, response, next) => {
  try {
    const clerkUserId = requireClerkUserId(request);
    const user = await ensureLocalUserForClerkId(clerkUserId);
    const movieId = request.params.movieId;

    await addMovieWishlist(clerkUserId, user.id, movieId);

    response.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.delete("/:movieId/wishlist", async (request, response, next) => {
  try {
    const clerkUserId = requireClerkUserId(request);
    const user = await ensureLocalUserForClerkId(clerkUserId);

    await removeMovieWishlist(clerkUserId, user.id, request.params.movieId);

    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post("/:movieId/reviews", async (request, response, next) => {
  try {
    const clerkUserId = requireClerkUserId(request);
    const user = await ensureLocalUserForClerkId(clerkUserId);
    const movieId = request.params.movieId;
    const parsed = reviewSchema.parse(request.body);

    const review = await prisma.review.upsert({
      where: {
        userId_movieId: {
          userId: user.id,
          movieId
        }
      },
      update: {
        rating: parsed.rating,
        text: parsed.text || null
      },
      create: {
        userId: user.id,
        movieId,
        rating: parsed.rating,
        text: parsed.text || null
      }
    });

    response.status(201).json({ review });
  } catch (error) {
    next(error);
  }
});

export default router;
