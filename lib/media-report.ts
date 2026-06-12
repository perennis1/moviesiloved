export type MediaAuditEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string | Date;
  actor: null | {
    email: string;
    clerkUserId: string | null;
    role: "ADMIN" | "EDITOR" | "MODERATOR" | "USER";
  };
  after: unknown;
};

export type MediaMovie = {
  id: string;
  title: string;
  slug: string;
  releaseYear: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  isFeatured?: boolean;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isArchived?: boolean;
  updatedAt?: string | Date;
};

export type MediaLogoSetting = {
  value: string | null;
  updatedAt: string | Date | null;
};

export type MediaQueueItem = {
  id: string;
  title: string;
  slug: string;
  releaseYear: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  missingPoster: boolean;
  missingBackdrop: boolean;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isArchived?: boolean;
};

export type MediaReport = {
  generatedAt: string;
  logo: {
    url: string | null;
    updatedAt: string | null;
  };
  totals: {
    movieCount: number;
    featuredCount: number;
    withPosterCount: number;
    withBackdropCount: number;
    missingPosterCount: number;
    missingBackdropCount: number;
    completeArtworkCount: number;
  };
  missingPosterQueue: MediaQueueItem[];
  missingBackdropQueue: MediaQueueItem[];
  recentActivity: MediaAuditEntry[];
};

export function buildMediaReport({
  movies,
  logoSetting,
  recentAuditLogs
}: {
  movies: MediaMovie[];
  logoSetting: MediaLogoSetting | null;
  recentAuditLogs: MediaAuditEntry[];
}): MediaReport {
  const missingPosterQueue = movies
    .filter((movie) => !movie.posterUrl)
    .map((movie) => ({
      id: movie.id,
      title: movie.title,
      slug: movie.slug,
      releaseYear: movie.releaseYear,
      posterUrl: movie.posterUrl,
      backdropUrl: movie.backdropUrl,
      missingPoster: true,
      missingBackdrop: !movie.backdropUrl,
      status: movie.status,
      isArchived: movie.isArchived
    }))
    .sort((left, right) => Number(Boolean(left.isArchived)) - Number(Boolean(right.isArchived)) || left.title.localeCompare(right.title))
    .slice(0, 12);

  const missingBackdropQueue = movies
    .filter((movie) => !movie.backdropUrl)
    .map((movie) => ({
      id: movie.id,
      title: movie.title,
      slug: movie.slug,
      releaseYear: movie.releaseYear,
      posterUrl: movie.posterUrl,
      backdropUrl: movie.backdropUrl,
      missingPoster: !movie.posterUrl,
      missingBackdrop: true,
      status: movie.status,
      isArchived: movie.isArchived
    }))
    .sort((left, right) => Number(Boolean(left.isArchived)) - Number(Boolean(right.isArchived)) || left.title.localeCompare(right.title))
    .slice(0, 12);

  const mediaActivity = recentAuditLogs
    .filter((entry) => entry.entityType === "Movie" || (entry.entityType === "GlobalSettings" && entry.entityId === "site_logo_url"))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 10);

  return {
    generatedAt: new Date().toISOString(),
    logo: {
      url: logoSetting?.value ?? null,
      updatedAt: logoSetting?.updatedAt ? new Date(logoSetting.updatedAt).toISOString() : null
    },
    totals: {
      movieCount: movies.length,
      featuredCount: movies.filter((movie) => movie.isFeatured && !movie.isArchived).length,
      withPosterCount: movies.filter((movie) => Boolean(movie.posterUrl)).length,
      withBackdropCount: movies.filter((movie) => Boolean(movie.backdropUrl)).length,
      missingPosterCount: movies.filter((movie) => !movie.posterUrl).length,
      missingBackdropCount: movies.filter((movie) => !movie.backdropUrl).length,
      completeArtworkCount: movies.filter((movie) => movie.posterUrl && movie.backdropUrl).length
    },
    missingPosterQueue,
    missingBackdropQueue,
    recentActivity: mediaActivity
  };
}
