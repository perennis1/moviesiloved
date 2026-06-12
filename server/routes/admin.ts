import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import { resolveAdminActor, resolveEditorActor } from "../lib/auth";
import { AppError } from "../lib/errors";
import { recordAuditLog } from "../lib/audit";
import { slugifyName } from "../../lib/cast";
import { normalizeReleasePackages } from "../../lib/release-packages";
import { prisma } from "../lib/prisma";
import multer from "multer";
import { allowedUploadMimeTypes, maxUploadBytes } from "../lib/uploads";
import { storeMediaAsset } from "../lib/media-storage";

const router = Router();
type DbClient = Prisma.TransactionClient;
const mediaUpload = multer({
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

const watchLinkSchema = z.object({
  platform: z.string().trim().min(1),
  url: z.string().trim().url(),
  type: z.enum(["STREAM", "RENT", "BUY", "FREE", "DOWNLOAD"]),
  quality: z.string().trim().optional().nullable(),
  language: z.string().trim().optional().nullable(),
  price: z.string().trim().optional().nullable(),
  seasonLabel: z.string().trim().optional().nullable(),
  linkLabel: z.string().trim().optional().nullable(),
  sortOrder: z.number().int().optional().default(0)
});

const releaseDestinationSchema = z.object({
  label: z.string().trim().min(1),
  url: z.string().trim().url(),
  type: z.enum(["EPISODE_LINKS", "BATCH_ZIP", "MIRROR", "STREAM", "OTHER"]).optional().default("OTHER"),
  sortOrder: z.number().int().optional().default(0)
});

const seasonTrailerSchema = z.object({
  seasonLabel: z.string().trim().min(1),
  title: z.string().trim().optional().nullable().or(z.literal("")),
  url: z.string().trim().url(),
  sortOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true)
});

const adminRoleSchema = z.enum(["USER", "MODERATOR", "EDITOR", "ADMIN"]);

const reviewModerationSchema = z.object({
  moderated: z.boolean()
});

const releasePackageSchema = z.object({
  title: z.string().trim().min(1),
  seasonLabel: z.string().trim().optional().nullable().or(z.literal("")),
  audioLabel: z.string().trim().optional().nullable().or(z.literal("")),
  qualityLabel: z.string().trim().optional().nullable().or(z.literal("")),
  subtitleLabel: z.string().trim().optional().nullable().or(z.literal("")),
  sizeLabel: z.string().trim().optional().nullable().or(z.literal("")),
  notes: z.string().trim().optional().nullable().or(z.literal("")),
  sortOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
  destinations: z.array(releaseDestinationSchema).optional().default([])
});

const castMemberSchema = z.object({
  name: z.string().trim().min(1),
  character: z.string().trim().optional().nullable(),
  profileUrl: z.string().trim().url().optional().nullable().or(z.literal("")),
  bio: z.string().trim().optional().nullable().or(z.literal("")),
  birthDate: z.string().trim().optional().nullable().or(z.literal("")),
  birthPlace: z.string().trim().optional().nullable().or(z.literal("")),
  sourceConfidence: z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }

    const numeric = typeof value === "string" ? Number(value) : value;
    return Number.isFinite(numeric) ? numeric : undefined;
  }, z.number().min(0).max(1).optional()).default(0.5),
  isIndexable: z.boolean().optional().default(false),
  tmdbId: z.string().trim().optional().nullable().or(z.literal(""))
});

const actorUpdateSchema = z.object({
  name: z.string().trim().min(1),
  bio: z.string().trim().optional().nullable().or(z.literal("")),
  knownFor: z.string().trim().optional().nullable().or(z.literal("")),
  birthDate: z.string().trim().optional().nullable().or(z.literal("")),
  birthPlace: z.string().trim().optional().nullable().or(z.literal("")),
  profileUrl: z.string().trim().url().optional().nullable().or(z.literal("")),
  sourceConfidence: z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }

    const numeric = typeof value === "string" ? Number(value) : value;
    return Number.isFinite(numeric) ? numeric : undefined;
  }, z.number().min(0).max(1).optional()).default(0.5),
  isIndexable: z.boolean().optional().default(false),
  tmdbId: z.string().trim().optional().nullable().or(z.literal(""))
});

const createMovieSchema = z.object({
  title: z.string().trim().min(1),
  releaseYear: z.string().trim().min(1),
  synopsis: z.string().trim().optional().or(z.literal("")),
  posterUrl: z.string().trim().url().optional().or(z.literal("")),
  backdropUrl: z.string().trim().url().optional().or(z.literal("")),
  trailerUrl: z.string().trim().url().optional().nullable().or(z.literal("")),
  externalId: z.string().trim().optional().or(z.literal("")),
  isFeatured: z.boolean().optional().default(false),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional().default("DRAFT"),
  contentType: z.enum(["MOVIE", "SERIES", "WEB_SERIES", "ANIME"]).optional().default("MOVIE"),
  genreNames: z.array(z.string()).optional().default([]),
  cast: z.array(castMemberSchema).optional().default([]),
  seasonTrailers: z.array(seasonTrailerSchema).optional().default([]),
  releasePackages: z.array(releasePackageSchema).optional().default([]),
  watchLinks: z.array(watchLinkSchema).optional().default([]),
  screenshots: z.array(z.string().trim().url()).optional().default([]),
  director: z.string().trim().optional().nullable(),
  tmdbRating: z.coerce.number().optional().nullable(),
  tmdbRatingCount: z.string().trim().optional().nullable(),
  imdbRating: z.string().trim().optional().nullable(),
  imdbRatingCount: z.string().trim().optional().nullable(),
  releaseQuality: z.string().trim().optional().default("1080p WEB-DL"),
  releaseFormat: z.string().trim().optional().default("Mkv"),
  // Series-specific
  seasons: z.string().trim().optional().nullable(),
  episodes: z.string().trim().optional().nullable(),
  language: z.string().trim().optional().nullable(),
  subtitles: z.string().trim().optional().nullable(),
  episodeSize: z.string().trim().optional().nullable()
});

function buildMovieAuditSnapshot(movie: {
  id: string;
  title: string;
  slug: string;
  releaseYear: string;
  status: string;
  contentType: string;
  isFeatured: boolean;
  deletedAt: Date | null;
  externalId: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  genres?: Array<{ genre: { name: string } }>;
  watchLinks?: Array<{ id: string; platform: string; type: string }>;
  seasonTrailers?: Array<{ id: string; seasonLabel: string; title: string | null; url: string }>;
  releasePackages?: Array<{ id: string; title: string; destinations?: Array<{ id: string }> }>;
}) {
  return {
    id: movie.id,
    title: movie.title,
    slug: movie.slug,
    releaseYear: movie.releaseYear,
    status: movie.status,
    contentType: movie.contentType,
    isFeatured: movie.isFeatured,
    isArchived: !!movie.deletedAt,
    deletedAt: movie.deletedAt ? movie.deletedAt.toISOString() : null,
    externalId: movie.externalId,
    posterUrl: movie.posterUrl,
    backdropUrl: movie.backdropUrl,
    genres: movie.genres?.map((entry) => entry.genre.name) ?? [],
    watchLinkCount: movie.watchLinks?.length ?? 0,
    seasonTrailerCount: movie.seasonTrailers?.length ?? 0,
    releasePackageCount: movie.releasePackages?.length ?? 0,
    releaseDestinationCount:
      movie.releasePackages?.reduce((total, pkg) => total + (pkg.destinations?.length ?? 0), 0) ?? 0
  };
}

function resolveReleasePackagesPayload(parsed: {
  title: string;
  releasePackages: Array<{
    title: string;
    seasonLabel?: string | null;
    audioLabel?: string | null;
    qualityLabel?: string | null;
    subtitleLabel?: string | null;
    sizeLabel?: string | null;
    notes?: string | null;
    sortOrder?: number;
    isActive?: boolean;
    destinations?: Array<{
      label: string;
      url: string;
      type?: "EPISODE_LINKS" | "BATCH_ZIP" | "MIRROR" | "STREAM" | "OTHER";
      sortOrder?: number;
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
}) {
  if (parsed.releasePackages.length > 0) {
    return parsed.releasePackages;
  }

  return normalizeReleasePackages(parsed.title, undefined, parsed.watchLinks).map((pkg) => ({
    title: pkg.title,
    seasonLabel: pkg.seasonLabel,
    audioLabel: pkg.audioLabel,
    qualityLabel: pkg.qualityLabel,
    subtitleLabel: pkg.subtitleLabel,
    sizeLabel: pkg.sizeLabel,
    notes: pkg.notes,
    sortOrder: pkg.sortOrder,
    isActive: pkg.isActive,
    destinations: pkg.destinations.map((destination) => ({
      label: destination.label,
      url: destination.url,
      type: destination.type,
      sortOrder: destination.sortOrder
    }))
  }));
}

function resolveSeasonTrailersPayload(parsed: {
  seasonTrailers: Array<{
    seasonLabel: string;
    title?: string | null;
    url: string;
    sortOrder?: number;
    isActive?: boolean;
  }>;
}) {
  return parsed.seasonTrailers.map((trailer, index) => ({
    seasonLabel: trailer.seasonLabel,
    title: trailer.title?.trim() || null,
    url: trailer.url,
    sortOrder: Number(trailer.sortOrder ?? index) || 0,
    isActive: trailer.isActive ?? true
  }));
}

function normalizeMediaFolder(value: unknown) {
  if (typeof value !== "string") {
    return "media";
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "") || "media";
}

router.post("/media/upload", async (request, response, next) => {
  try {
    await resolveEditorActor(request);

    await new Promise<void>((resolve, reject) => {
      mediaUpload.single("file")(request, response, async (uploadError) => {
        if (uploadError) {
          reject(uploadError);
          return;
        }

        try {
          if (!request.file) {
            response.status(400).json({ error: "No image file provided." });
            resolve();
            return;
          }

          const folder = normalizeMediaFolder(request.body?.folder);
          const prefix = normalizeMediaFolder(request.body?.prefix) || "asset";
          const stored = await storeMediaAsset({
            file: {
              buffer: request.file.buffer,
              originalname: request.file.originalname,
              mimetype: request.file.mimetype,
              size: request.file.size
            },
            folder,
            prefix
          });

          response.status(201).json({
            url: stored.url,
            key: stored.key,
            folder,
            storageMode: stored.storageMode
          });
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

router.post("/movies", async (request, response, next) => {
  try {
    const actor = await resolveEditorActor(request);
    const parsed = createMovieSchema.parse(request.body);

    const movie = await prisma.$transaction(async (tx) => {
      const genreRecords = await upsertGenres(tx, parsed.genreNames);
      const actorRecords = await upsertActors(tx, parsed.cast);
      const seasonTrailers = resolveSeasonTrailersPayload(parsed as any);
      const releasePackages = resolveReleasePackagesPayload(parsed as any);

      const createdMovie = await tx.movie.create({
        data: {
          title: parsed.title,
          slug: await generateUniqueSlug(tx, parsed.title, parsed.releaseYear),
          releaseYear: parsed.releaseYear,
          synopsis: parsed.synopsis || null,
          posterUrl: parsed.posterUrl || null,
          backdropUrl: parsed.backdropUrl || null,
          trailerUrl: parsed.trailerUrl || null,
          externalId: parsed.externalId || null,
          isFeatured: parsed.isFeatured,
          status: (parsed.status ?? "DRAFT") as "DRAFT" | "PUBLISHED" | "ARCHIVED",
          contentType: parsed.contentType ?? "MOVIE",
          screenshots: parsed.screenshots,
          director: parsed.director || null,
          tmdbRating: parsed.tmdbRating || null,
          tmdbRatingCount: parsed.tmdbRatingCount || null,
          imdbRating: parsed.imdbRating || null,
          imdbRatingCount: parsed.imdbRatingCount || null,
          releaseQuality: parsed.releaseQuality || "1080p WEB-DL",
          releaseFormat: parsed.releaseFormat || "Mkv",
          seasons: parsed.seasons || null,
          episodes: parsed.episodes || null,
          language: parsed.language || null,
          subtitles: parsed.subtitles || null,
          episodeSize: parsed.episodeSize || null,
          genres: {
            create: genreRecords.map((genre) => ({
              genreId: genre.id
            }))
          },
          castMembers: {
            create: actorRecords.map((actor) => ({
              actorId: actor.actorId,
              character: actor.character
            }))
          },
          seasonTrailers: {
            create: seasonTrailers.map((trailer) => ({
              seasonLabel: trailer.seasonLabel,
              title: trailer.title || null,
              url: trailer.url,
              sortOrder: trailer.sortOrder || 0,
              isActive: trailer.isActive ?? true
            }))
          },
          releasePackages: {
            create: releasePackages.map((pkg) => ({
              title: pkg.title,
              seasonLabel: pkg.seasonLabel || null,
              audioLabel: pkg.audioLabel || null,
              qualityLabel: pkg.qualityLabel || null,
              subtitleLabel: pkg.subtitleLabel || null,
              sizeLabel: pkg.sizeLabel || null,
              notes: pkg.notes || null,
              sortOrder: pkg.sortOrder || 0,
              isActive: pkg.isActive ?? true,
              destinations: {
                create: (pkg.destinations || []).map((destination) => ({
                  label: destination.label,
                  url: destination.url,
                  type: destination.type || "OTHER",
                  sortOrder: destination.sortOrder || 0
                }))
              }
            }))
          }
        },
        include: {
          genres: {
            include: {
              genre: true
            }
          },
          watchLinks: true,
          releasePackages: {
            include: {
              destinations: true
            }
          }
        }
      });

      await recordAuditLog(tx, {
        actorUserId: actor.user.id,
        actorClerkUserId: actor.clerkUserId,
        action: "movie.create",
        entityType: "Movie",
        entityId: createdMovie.id,
        after: buildMovieAuditSnapshot(createdMovie)
      });

      return createdMovie;
    });

    response.status(201).json({ movie });
  } catch (error) {
    next(error);
  }
});

router.get("/movies", async (request, response, next) => {
  try {
    await resolveEditorActor(request);
    
    const movies = await prisma.movie.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        genres: {
          include: { genre: true }
        },
        watchLinks: true,
        releasePackages: {
          include: { destinations: true }
        }
      }
    });
    
    response.json({ movies });
  } catch (error) {
    next(error);
  }
});

router.get("/movies/:id", async (request, response, next) => {
  try {
    await resolveEditorActor(request);
    const { id } = request.params;
    
    const movie = await prisma.movie.findUnique({
      where: { id },
      include: {
        genres: {
          include: { genre: true }
        },
        watchLinks: true,
        seasonTrailers: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
        },
        castMembers: { include: { actor: true } }
      }
    });
    
    if (!movie) {
      return response.status(404).json({ error: "Movie not found" });
    }
    
    response.json({ movie });
  } catch (error) {
    next(error);
  }
});

router.put("/movies/:id", async (request, response, next) => {
  try {
    const actor = await resolveEditorActor(request);
    const { id } = request.params;
    const parsed = createMovieSchema.parse(request.body);

    const movie = await prisma.$transaction(async (tx) => {
      const beforeMovie = await tx.movie.findUnique({
        where: { id },
        include: {
          genres: {
            include: { genre: true }
          },
          watchLinks: true,
          seasonTrailers: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
          },
          releasePackages: {
            include: { destinations: true }
          }
        }
      });

      const genreRecords = await upsertGenres(tx, parsed.genreNames);
      const actorRecords = await upsertActors(tx, parsed.cast);
      const seasonTrailers = resolveSeasonTrailersPayload(parsed as any);
      const releasePackages = resolveReleasePackagesPayload(parsed as any);

      await tx.movieGenre.deleteMany({
        where: { movieId: id }
      });

      await tx.releasePackage.deleteMany({
        where: { movieId: id }
      });

      await tx.watchLink.deleteMany({
        where: { movieId: id }
      });

      await tx.seasonTrailer.deleteMany({
        where: { movieId: id }
      });

      await tx.castMember.deleteMany({
        where: { movieId: id }
      });

      const updatedMovie = await tx.movie.update({
        where: { id },
        data: {
          title: parsed.title,
          releaseYear: parsed.releaseYear,
          synopsis: parsed.synopsis || null,
          posterUrl: parsed.posterUrl || null,
          backdropUrl: parsed.backdropUrl || null,
          trailerUrl: parsed.trailerUrl || null,
          externalId: parsed.externalId || null,
          isFeatured: parsed.isFeatured,
          status: (parsed.status ?? "DRAFT") as "DRAFT" | "PUBLISHED" | "ARCHIVED",
          contentType: parsed.contentType ?? "MOVIE",
          screenshots: parsed.screenshots,
          director: parsed.director || null,
          tmdbRating: parsed.tmdbRating || null,
          tmdbRatingCount: parsed.tmdbRatingCount || null,
          imdbRating: parsed.imdbRating || null,
          imdbRatingCount: parsed.imdbRatingCount || null,
          releaseQuality: parsed.releaseQuality || "1080p WEB-DL",
          releaseFormat: parsed.releaseFormat || "Mkv",
          seasons: parsed.seasons || null,
          episodes: parsed.episodes || null,
          language: parsed.language || null,
          subtitles: parsed.subtitles || null,
          episodeSize: parsed.episodeSize || null,
          genres: {
            create: genreRecords.map((genre) => ({
              genreId: genre.id
            }))
          },
          castMembers: {
            create: actorRecords.map((actor) => ({
              actorId: actor.actorId,
              character: actor.character
            }))
          },
          seasonTrailers: {
            create: seasonTrailers.map((trailer) => ({
              seasonLabel: trailer.seasonLabel,
              title: trailer.title || null,
              url: trailer.url,
              sortOrder: trailer.sortOrder || 0,
              isActive: trailer.isActive ?? true
            }))
          },
          releasePackages: {
            create: releasePackages.map((pkg) => ({
              title: pkg.title,
              seasonLabel: pkg.seasonLabel || null,
              audioLabel: pkg.audioLabel || null,
              qualityLabel: pkg.qualityLabel || null,
              subtitleLabel: pkg.subtitleLabel || null,
              sizeLabel: pkg.sizeLabel || null,
              notes: pkg.notes || null,
              sortOrder: pkg.sortOrder || 0,
              isActive: pkg.isActive ?? true,
              destinations: {
                create: (pkg.destinations || []).map((destination) => ({
                  label: destination.label,
                  url: destination.url,
                  type: destination.type || "OTHER",
                  sortOrder: destination.sortOrder || 0
                }))
              }
            }))
          }
        },
        include: {
          genres: { include: { genre: true } },
          watchLinks: true,
          seasonTrailers: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
          },
          releasePackages: {
            include: { destinations: true }
          }
        }
      });

      await recordAuditLog(tx, {
        actorUserId: actor.user.id,
        actorClerkUserId: actor.clerkUserId,
        action: "movie.update",
        entityType: "Movie",
        entityId: updatedMovie.id,
        before: beforeMovie ? buildMovieAuditSnapshot(beforeMovie as any) : null,
        after: buildMovieAuditSnapshot(updatedMovie)
      });

      return updatedMovie;
    });

    response.json({ movie });
  } catch (error) {
    next(error);
  }
});

// Soft-delete: marks deletedAt, hides from public listing (functions as archive)
router.delete("/movies/:id", async (request, response, next) => {
  try {
    const { id } = request.params;
    const hard = request.query.hard === "true";
    const actor = hard ? await resolveAdminActor(request) : await resolveEditorActor(request);

    if (hard) {
      await prisma.$transaction(async (tx) => {
        const beforeMovie = await tx.movie.findUnique({
          where: { id },
          include: {
            genres: { include: { genre: true } },
            watchLinks: true,
            releasePackages: { include: { destinations: true } }
          }
        });

        // Hard delete: permanently removes from DB with all related records
        await tx.movieGenre.deleteMany({ where: { movieId: id } });
        await tx.castMember.deleteMany({ where: { movieId: id } });
        await tx.watchLink.deleteMany({ where: { movieId: id } });
        await tx.movieFavorite.deleteMany({ where: { movieId: id } });
        await tx.review.deleteMany({ where: { movieId: id } });
        await tx.movie.delete({ where: { id } });

        await recordAuditLog(tx, {
          actorUserId: actor.user.id,
          actorClerkUserId: actor.clerkUserId,
          action: "movie.delete_hard",
          entityType: "Movie",
          entityId: id,
          before: beforeMovie ? buildMovieAuditSnapshot(beforeMovie as any) : null
        });
      });
      return response.status(204).end();
    }

    // Soft-delete: sets deletedAt so it disappears from public pages
    const softDeletedAt = new Date();
    await prisma.$transaction(async (tx) => {
      const beforeMovie = await tx.movie.findUnique({
        where: { id },
        include: {
          genres: { include: { genre: true } },
          watchLinks: true,
          releasePackages: { include: { destinations: true } }
        }
      });

      await tx.movie.update({
        where: { id },
        data: { deletedAt: softDeletedAt }
      });

      await recordAuditLog(tx, {
        actorUserId: actor.user.id,
        actorClerkUserId: actor.clerkUserId,
        action: "movie.archive",
        entityType: "Movie",
        entityId: id,
        before: beforeMovie ? buildMovieAuditSnapshot(beforeMovie as any) : null,
        after: beforeMovie
          ? {
              ...buildMovieAuditSnapshot(beforeMovie as any),
              isArchived: true,
              deletedAt: softDeletedAt.toISOString()
            }
          : { id, isArchived: true }
      });
    });

    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

// Restore a soft-deleted movie (admin only)
router.patch("/movies/:id/restore", async (request, response, next) => {
  try {
    const actor = await resolveEditorActor(request);
    const { id } = request.params;
    const movie = await prisma.$transaction(async (tx) => {
      const beforeMovie = await tx.movie.findUnique({
        where: { id },
        include: {
          genres: { include: { genre: true } },
          watchLinks: true,
          releasePackages: { include: { destinations: true } }
        }
      });

      const restored = await tx.movie.update({
        where: { id },
        data: { deletedAt: null }
      });

      await recordAuditLog(tx, {
        actorUserId: actor.user.id,
        actorClerkUserId: actor.clerkUserId,
        action: "movie.restore",
        entityType: "Movie",
        entityId: id,
        before: beforeMovie ? buildMovieAuditSnapshot(beforeMovie as any) : null,
        after: { ...buildMovieAuditSnapshot(beforeMovie as any), isArchived: false }
      });

      return restored;
    });
    response.json({ movie });
  } catch (error) {
    next(error);
  }
});

router.patch("/movies/:id/featured", async (request, response, next) => {
  try {
    const actor = await resolveEditorActor(request);
    const { id } = request.params;
    const { isFeatured } = request.body;

    if (typeof isFeatured !== "boolean") {
      return response.status(400).json({ error: "isFeatured must be a boolean" });
    }

    const movie = await prisma.$transaction(async (tx) => {
      const beforeMovie = await tx.movie.findUnique({
        where: { id },
        include: {
          genres: { include: { genre: true } },
          watchLinks: true,
          releasePackages: { include: { destinations: true } }
        }
      });

      const updated = await tx.movie.update({
        where: { id },
        data: { isFeatured }
      });

      await recordAuditLog(tx, {
        actorUserId: actor.user.id,
        actorClerkUserId: actor.clerkUserId,
        action: "movie.featured_toggle",
        entityType: "Movie",
        entityId: id,
        before: beforeMovie ? buildMovieAuditSnapshot(beforeMovie as any) : null,
        after: beforeMovie ? { ...buildMovieAuditSnapshot(beforeMovie as any), isFeatured } : { id, isFeatured }
      });

      return updated;
    });

    response.json({ movie });
  } catch (error) {
    next(error);
  }
});

router.patch("/movies/:id/status", async (request, response, next) => {
  try {
    const actor = await resolveEditorActor(request);
    const { id } = request.params;
    const { status } = request.body;

    if (!status || !["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)) {
      return response.status(400).json({ error: "Invalid status value. Must be DRAFT, PUBLISHED, or ARCHIVED." });
    }

    const movie = await prisma.$transaction(async (tx) => {
      const beforeMovie = await tx.movie.findUnique({
        where: { id },
        include: {
          genres: { include: { genre: true } },
          watchLinks: true,
          releasePackages: { include: { destinations: true } }
        }
      });

      const updated = await tx.movie.update({
        where: { id },
        data: { status: status as "DRAFT" | "PUBLISHED" | "ARCHIVED" }
      });

      await recordAuditLog(tx, {
        actorUserId: actor.user.id,
        actorClerkUserId: actor.clerkUserId,
        action: "movie.status_update",
        entityType: "Movie",
        entityId: id,
        before: beforeMovie ? buildMovieAuditSnapshot(beforeMovie as any) : null,
        after: beforeMovie ? { ...buildMovieAuditSnapshot(beforeMovie as any), status } : { id, status }
      });

      return updated;
    });

    response.json({ movie });
  } catch (error) {
    next(error);
  }
});

router.patch("/users/:id/role", async (request, response, next) => {
  try {
    const actor = await resolveEditorActor(request);
    const { id } = request.params;
    const parsed = adminRoleSchema.parse(request.body?.role);

    const user = await prisma.$transaction(async (tx) => {
      const targetUser = await tx.user.findUnique({
        where: { id }
      });

      if (!targetUser) {
        throw new AppError("User not found.", 404);
      }

      if (targetUser.role === "ADMIN" && parsed !== "ADMIN") {
        const adminCount = await tx.user.count({
          where: { role: "ADMIN" }
        });

        if (adminCount <= 1) {
          throw new AppError("At least one admin must remain assigned.", 409);
        }
      }

      const updatedUser = await tx.user.update({
        where: { id },
        data: { role: parsed }
      });

      await recordAuditLog(tx, {
        actorUserId: actor.user.id,
        actorClerkUserId: actor.clerkUserId,
        action: "user.role_update",
        entityType: "User",
        entityId: updatedUser.id,
        before: buildUserAuditSnapshot(targetUser),
        after: buildUserAuditSnapshot(updatedUser)
      });

      return updatedUser;
    });

    response.json({ user });
  } catch (error) {
    next(error);
  }
});

router.patch("/actors/:id", async (request, response, next) => {
  try {
    const actor = await resolveEditorActor(request);
    const id = request.params.id;
    const parsed = actorUpdateSchema.parse(request.body);

    const updatedActor = await prisma.$transaction(async (tx) => {
      const targetActor = await tx.actor.findUnique({
        where: { id }
      });

      if (!targetActor) {
        throw new AppError("Actor not found.", 404);
      }

      const nextName = parsed.name.trim();
      const nextTmdbId = parsed.tmdbId?.trim() || null;
      const nextProfileUrl = parsed.profileUrl?.trim() || null;
      const nextBio = parsed.bio?.trim() || null;
      const nextKnownFor = parsed.knownFor?.trim() || null;
      const nextBirthDate = parsed.birthDate?.trim() || null;
      const nextBirthPlace = parsed.birthPlace?.trim() || null;

      if (nextTmdbId && nextTmdbId !== targetActor.tmdbId) {
        const conflictingActor = await tx.actor.findFirst({
          where: {
            tmdbId: nextTmdbId,
            NOT: { id: targetActor.id }
          }
        });

        if (conflictingActor) {
          throw new AppError("Another actor already uses that TMDB ID.", 409);
        }
      }

      const nextSlug = targetActor.slug?.trim()
        ? await generateUniqueActorSlug(tx, nextName, targetActor.id)
        : await generateUniqueActorSlug(tx, nextName, targetActor.id);

      const before = buildActorAuditSnapshot(targetActor);

      const nextActor = await tx.actor.update({
        where: { id: targetActor.id },
        data: {
          name: nextName,
          slug: nextSlug,
          profileUrl: nextProfileUrl,
          bio: nextBio,
          knownFor: nextKnownFor,
          birthDate: nextBirthDate,
          birthPlace: nextBirthPlace,
          sourceConfidence: Number.isFinite(parsed.sourceConfidence) ? Number(parsed.sourceConfidence) : targetActor.sourceConfidence,
          isIndexable: parsed.isIndexable,
          tmdbId: nextTmdbId
        }
      });

      await recordAuditLog(tx, {
        actorUserId: actor.user.id,
        actorClerkUserId: actor.clerkUserId,
        action: "actor.update",
        entityType: "Actor",
        entityId: targetActor.id,
        before,
        after: buildActorAuditSnapshot(nextActor)
      });

      return nextActor;
    });

    response.json({ actor: updatedActor });
  } catch (error) {
    next(error);
  }
});

router.patch("/reviews/:id/moderation", async (request, response, next) => {
  try {
    const actor = await resolveAdminActor(request);
    const { id } = request.params;
    const parsed = reviewModerationSchema.parse(request.body);

    const review = await prisma.$transaction(async (tx) => {
      const targetReview = await tx.review.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              email: true
            }
          },
          movie: {
            select: {
              id: true,
              title: true,
              slug: true,
              releaseYear: true
            }
          }
        }
      });

      if (!targetReview) {
        throw new AppError("Review not found.", 404);
      }

      const updatedReview = await tx.review.update({
        where: { id },
        data: { moderated: parsed.moderated }
      });

      await recordAuditLog(tx, {
        actorUserId: actor.user.id,
        actorClerkUserId: actor.clerkUserId,
        action: "review.moderation_update",
        entityType: "Review",
        entityId: id,
        before: buildReviewAuditSnapshot(targetReview),
        after: {
          ...buildReviewAuditSnapshot(targetReview),
          moderated: parsed.moderated
        }
      });

      return updatedReview;
    });

    response.json({ review });
  } catch (error) {
    next(error);
  }
});

router.delete("/reviews/:id", async (request, response, next) => {
  try {
    const actor = await resolveAdminActor(request);
    const { id } = request.params;

    await prisma.$transaction(async (tx) => {
      const targetReview = await tx.review.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              email: true
            }
          },
          movie: {
            select: {
              id: true,
              title: true,
              slug: true,
              releaseYear: true
            }
          }
        }
      });

      if (!targetReview) {
        throw new AppError("Review not found.", 404);
      }

      await tx.review.delete({ where: { id } });

      await recordAuditLog(tx, {
        actorUserId: actor.user.id,
        actorClerkUserId: actor.clerkUserId,
        action: "review.delete",
        entityType: "Review",
        entityId: id,
        before: buildReviewAuditSnapshot(targetReview)
      });
    });

    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.get("/settings/:key", async (request, response, next) => {
  try {
    await resolveAdminActor(request);
    const { key } = request.params;
    const setting = await prisma.globalSettings.findUnique({ where: { key } });
    response.json({ value: setting?.value ?? null });
  } catch (error) {
    next(error);
  }
});

router.post("/settings", async (request, response, next) => {
  try {
    const actor = await resolveAdminActor(request);
    const { key, value } = request.body;

    if (!key || typeof value !== "string") {
      return response.status(400).json({ error: "key and value are required" });
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

    response.json(setting);
  } catch (error) {
    next(error);
  }
});

async function upsertGenres(tx: DbClient, genreNames: string[]) {
  return Promise.all(
    genreNames.map((name) =>
      tx.genre.upsert({
        where: { name },
        update: {},
        create: { name }
      })
    )
  );
}

async function upsertActors(
  tx: DbClient,
  cast: Array<z.infer<typeof castMemberSchema>>
) {
  return Promise.all(
    cast.map(async (member) => {
      const cleanTmdbId = member.tmdbId?.trim() || null;
      const cleanProfileUrl = member.profileUrl?.trim() || null;
      const cleanBio = member.bio?.trim() || null;
      const cleanBirthDate = member.birthDate?.trim() || null;
      const cleanBirthPlace = member.birthPlace?.trim() || null;
      const cleanSourceConfidence = Number.isFinite(member.sourceConfidence) ? Number(member.sourceConfidence) : 0.5;
      const existing = cleanTmdbId
        ? await tx.actor.findFirst({ where: { tmdbId: cleanTmdbId } })
        : await tx.actor.findFirst({ where: { name: member.name } });
      const slug = await generateUniqueActorSlug(tx, member.name, existing?.id ?? null);
      const nextData = {
        name: member.name,
        slug: existing?.slug || slug,
        profileUrl: cleanProfileUrl,
        bio: cleanBio,
        birthDate: cleanBirthDate,
        birthPlace: cleanBirthPlace,
        sourceConfidence: cleanSourceConfidence,
        isIndexable: Boolean(member.isIndexable),
        tmdbId: cleanTmdbId
      };

      if (existing) {
        const updates: Partial<typeof nextData> = {};

        if (!existing.slug) {
          updates.slug = slug;
        }
        if (cleanTmdbId && existing.tmdbId !== cleanTmdbId) {
          updates.tmdbId = cleanTmdbId;
        }
        if (cleanProfileUrl && cleanProfileUrl !== existing.profileUrl) {
          updates.profileUrl = cleanProfileUrl;
        }
        if (cleanBio && cleanBio !== existing.bio) {
          updates.bio = cleanBio;
        }
        if (cleanBirthDate && cleanBirthDate !== existing.birthDate) {
          updates.birthDate = cleanBirthDate;
        }
        if (cleanBirthPlace && cleanBirthPlace !== existing.birthPlace) {
          updates.birthPlace = cleanBirthPlace;
        }
        if (member.sourceConfidence > existing.sourceConfidence) {
          updates.sourceConfidence = cleanSourceConfidence;
        }
        if (member.isIndexable && !existing.isIndexable) {
          updates.isIndexable = true;
        }

        if (Object.keys(updates).length > 0) {
          await tx.actor.update({
            where: { id: existing.id },
            data: updates
          });
        }

        return { actorId: existing.id, character: member.character || null };
      }

      const created = await tx.actor.create({
        data: nextData
      });

      return { actorId: created.id, character: member.character || null };
    })
  );
}

function buildActorAuditSnapshot(actor: {
  id: string;
  name: string;
  slug: string | null;
  tmdbId: string | null;
  bio: string | null;
  knownFor: string | null;
  birthDate: string | null;
  birthPlace: string | null;
  profileUrl: string | null;
  sourceConfidence: number;
  isIndexable: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: actor.id,
    name: actor.name,
    slug: actor.slug,
    tmdbId: actor.tmdbId,
    bio: actor.bio,
    knownFor: actor.knownFor,
    birthDate: actor.birthDate,
    birthPlace: actor.birthPlace,
    profileUrl: actor.profileUrl,
    sourceConfidence: actor.sourceConfidence,
    isIndexable: actor.isIndexable,
    createdAt: actor.createdAt.toISOString(),
    updatedAt: actor.updatedAt.toISOString()
  };
}

function buildUserAuditSnapshot(user: {
  id: string;
  email: string;
  clerkUserId: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    clerkUserId: user.clerkUserId,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
}

function buildReviewAuditSnapshot(review: {
  id: string;
  rating: number;
  text: string | null;
  moderated: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: { email: string };
  movie: { id: string; title: string; slug: string; releaseYear: string };
}) {
  return {
    id: review.id,
    rating: review.rating,
    text: review.text,
    moderated: review.moderated,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
    authorEmail: review.user.email,
    movie: {
      id: review.movie.id,
      title: review.movie.title,
      slug: review.movie.slug,
      releaseYear: review.movie.releaseYear
    }
  };
}

async function generateUniqueSlug(tx: DbClient, title: string, releaseYear: string) {
  let baseSlug = `${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}-${releaseYear}`;
    
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const existing = await tx.movie.findUnique({ where: { slug } });
    if (!existing) return slug;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

async function generateUniqueActorSlug(tx: DbClient, name: string, actorId: string | null) {
  const baseSlug = slugifyName(name) || "cast-member";
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = actorId
      ? await tx.actor.findFirst({
          where: {
            slug,
            NOT: { id: actorId }
          }
        })
      : await tx.actor.findFirst({
          where: { slug }
        });

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

export default router;
