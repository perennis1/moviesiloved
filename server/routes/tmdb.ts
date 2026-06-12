import { Router } from "express";
import { resolveEditorActor } from "../lib/auth";

const router = Router();

function extractTrailerUrl(data: any): string | null {
  const videos = data?.videos?.results;
  if (!Array.isArray(videos) || videos.length === 0) {
    return null;
  }

  const candidates = videos
    .filter((video: any) => video && typeof video === "object")
    .filter((video: any) => video.site === "YouTube")
    .sort((left: any, right: any) => {
      const score = (video: any) => {
        let total = 0;
        if (video.official) total += 6;
        if (String(video.type || "").toLowerCase() === "trailer") total += 4;
        if (String(video.type || "").toLowerCase() === "teaser") total += 2;
        if (String(video.name || "").toLowerCase().includes("official")) total += 1;
        if (String(video.name || "").toLowerCase().includes("trailer")) total += 1;
        return total;
      };

      return score(right) - score(left);
    });

  const selected = candidates[0];
  return selected?.key ? `https://www.youtube.com/watch?v=${selected.key}` : null;
}

async function fetchTmdbPersonDetails(apiKey: string, personId: string | number) {
  const response = await fetch(
    `https://api.themoviedb.org/3/person/${personId}?api_key=${apiKey}&language=en-US`
  );

  if (!response.ok) {
    return null;
  }

  return response.json();
}

router.get("/:id", async (request, response, next) => {
  try {
    await resolveEditorActor(request);
    const rawId = request.params.id;
    // Strip slug suffix: "76479-the-boys" → "76479"
    const id = rawId.replace(/^(\d+).*$/, "$1");

    if (!id || !/^\d+$/.test(id)) {
      return response.status(400).json({ error: "Invalid TMDB ID. Please enter only the numeric ID (e.g. 76479)." });
    }

    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      return response.status(400).json({ error: "TMDB_API_KEY is not set in the environment variables." });
    }

    // Use the contentType hint from the query string if provided.
    // ?type=tv → try TV first, ?type=movie → try Movie first, otherwise try Movie then TV.
    const typeHint = (request.query.type as string | undefined)?.toLowerCase();

    let data: any = null;
    let isTv = false;

    const fetchMovie = async () => {
      const r = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&language=en-US&append_to_response=images,credits,videos&include_image_language=en,null`);
      if (r.ok) { data = await r.json(); isTv = false; return true; }
      return false;
    };

    const fetchTv = async () => {
      const r = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${apiKey}&language=en-US&append_to_response=images,credits,videos&include_image_language=en,null`);
      if (r.ok) { data = await r.json(); isTv = true; return true; }
      return false;
    };

    if (typeHint === "tv" || typeHint === "series" || typeHint === "web_series" || typeHint === "anime") {
      // Try TV first, then fall back to movie
      const found = await fetchTv() || await fetchMovie();
      if (!found) {
        return response.status(404).json({ error: `No TMDB entry found for ID ${id}.` });
      }
    } else {
      // Default: try movie first, then TV
      const found = await fetchMovie() || await fetchTv();
      if (!found) {
        return response.status(404).json({ error: `No TMDB entry found for ID ${id}.` });
      }
    }

    const title = isTv ? data.name : data.title;
    const releaseDate = isTv ? data.first_air_date : data.release_date;
    const releaseYear = releaseDate ? new Date(releaseDate).getFullYear() : "";
    const synopsis = data.overview || "";
    const posterUrl = data.poster_path ? `https://image.tmdb.org/t/p/w780${data.poster_path}` : "";
    const backdropUrl = data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : "";
    const genreNames = data.genres ? data.genres.map((g: any) => g.name).join(", ") : "";
    const contentType = isTv
      ? typeHint === "anime"
        ? "ANIME"
        : typeHint === "web_series"
          ? "WEB_SERIES"
          : "SERIES"
      : "MOVIE";
    const tmdbRating = data.vote_average ? parseFloat(data.vote_average.toFixed(1)) : null;
    const tmdbRatingCount = typeof data.vote_count === "number" ? String(data.vote_count) : null;
    const trailerUrl = extractTrailerUrl(data);

    // Extract extra backdrops for screenshots (skip the primary one)
    let screenshots: string[] = [];
    if (data.images && data.images.backdrops && Array.isArray(data.images.backdrops)) {
      screenshots = data.images.backdrops
        .filter((img: any) => img.file_path !== data.backdrop_path)
        .slice(0, 6)
        .map((img: any) => `https://image.tmdb.org/t/p/w1280${img.file_path}`);
    }

    let director = "";
    let cast: Array<{
      name: string;
      character: string;
      profileUrl: string;
      bio: string;
      birthDate: string;
      birthPlace: string;
      sourceConfidence: number;
      isIndexable: boolean;
      tmdbId: string;
    }> = [];

    if (data.credits) {
      if (data.credits.crew) {
        const directors = data.credits.crew.filter((c: any) => c.job === "Director" || (isTv && c.job === "Executive Producer"));
        if (directors.length > 0) {
          director = directors.map((d: any) => d.name).join(", ");
        } else if (data.created_by && data.created_by.length > 0) {
           director = data.created_by.map((c: any) => c.name).join(", ");
        }
      }
      if (data.credits.cast) {
        const topCast = data.credits.cast.slice(0, 5);
        const enrichedCast = await Promise.all(
          topCast.map(async (c: any) => {
            const personId = c.id ? String(c.id) : "";
            const person = personId ? await fetchTmdbPersonDetails(apiKey, personId) : null;
            const profileConfidence = person?.biography ? 0.85 : c.profile_path ? 0.65 : 0.5;

            return {
              name: c.name,
              character: c.character || "",
              profileUrl: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : "",
              bio: typeof person?.biography === "string" ? person.biography : "",
              birthDate: typeof person?.birthday === "string" ? person.birthday : "",
              birthPlace: typeof person?.place_of_birth === "string" ? person.place_of_birth : "",
              sourceConfidence: profileConfidence,
              isIndexable: false,
              tmdbId: personId
            };
          })
        );

        cast = enrichedCast;
      }
    }

    response.json({
      title,
      releaseYear,
      synopsis,
      posterUrl,
      backdropUrl,
      screenshots,
      genreNames,
      contentType,
      tmdbRating,
      tmdbRatingCount,
      director,
      cast,
      trailerUrl,
      externalId: id // Always return the clean numeric ID
    });
  } catch (error) {
    next(error);
  }
});

export default router;
