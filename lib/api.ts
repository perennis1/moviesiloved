import { getBaseUrl } from "./get-base-url";
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

export async function getGlobalSettings(key: string): Promise<string | null> {
  const response = await fetch(`${getBaseUrl()}/api/settings?key=${key}`, { cache: "no-store" });
  if (!response.ok) return null;
  const data = await response.json();
  return data.value;
}

export async function getFeaturedMovies() {
  const response = await fetch(`${getBaseUrl()}/api/movies/featured`, { cache: "no-store" });
  if (!response.ok) return [];
  const data = await response.json();
  return data.movies as Movie[];
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
    const params = new URLSearchParams({
      skip: skip.toString(),
      take: pageSize.toString()
    });
    if (filters?.genre) params.append("genre", filters.genre);
    if (filters?.year) params.append("year", filters.year);
    if (filters?.language) params.append("language", filters.language);
    if (filters?.type) params.append("type", filters.type);
    if (filters?.audio) params.append("audio", filters.audio);
    if (filters?.quality) params.append("quality", filters.quality);
    if (filters?.sort) params.append("sort", filters.sort);
    if (filters?.query) params.append("q", filters.query);

    const url = `${getBaseUrl()}/api/movies?${params.toString()}`;
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      return {
        movies: [],
        total: 0
      };
    }

    const data = (await response.json()) as { movies: Movie[]; total?: number };

    // total may not exist yet on old API - fall back to movies.length
    return {
      movies: data.movies,
      total: data.total ?? data.movies.length
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
    const response = await fetch(`${getBaseUrl()}/api/movies/facets`, { cache: "no-store" });

    if (!response.ok) {
      return EMPTY_HOMEPAGE_FACET_STATS;
    }

    return response.json() as Promise<HomepageFacetStats>;
  } catch {
    return EMPTY_HOMEPAGE_FACET_STATS;
  }
}

/** Fetch all movies without pagination - used for carousel etc. */
export async function getAllMovies() {
  try {
    const response = await fetch(`${getBaseUrl()}/api/movies`, { cache: "no-store" });
    if (!response.ok) return [];
    const data = (await response.json()) as { movies: Movie[] };
    return data.movies;
  } catch {
    return [];
  }
}

export async function getMovie(slug: string) {
  const response = await fetch(`${getBaseUrl()}/api/movies/${slug}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Failed to load movie.");
  }

  return response.json() as Promise<{
    movie: MovieDetail;
  }>;
}
