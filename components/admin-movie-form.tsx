"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { formatReleasePackageTitle, normalizeReleasePackages, type ReleaseDestinationType, type ReleasePackageForm } from "@/lib/release-packages";
import { expandSeasonLabels, formatSeasonTrailerTitle } from "@/lib/season-trailers";
import { MediaUploadButton } from "@/components/media-upload-button";

type CastInput = {
  name: string;
  character: string;
  profileUrl: string;
  bio: string;
  birthDate: string;
  birthPlace: string;
  sourceConfidence: string;
  isIndexable: boolean;
  tmdbId: string;
};

type SeasonTrailerInput = {
  seasonLabel: string;
  title: string;
  url: string;
  sortOrder: number;
  isActive: boolean;
};

const initialState = {
  title: "",
  releaseYear: "",
  synopsis: "",
  posterUrl: "",
  backdropUrl: "",
  trailerUrl: "",
  externalId: "",
  genreNames: "",
  isFeatured: false,
  status: "DRAFT" as "DRAFT" | "PUBLISHED" | "ARCHIVED",
  contentType: "MOVIE",
  screenshots: [] as string[],
  director: "",
  tmdbRating: "",
  tmdbRatingCount: "",
  imdbRating: "",
  imdbRatingCount: "",
  releaseQuality: "1080p WEB-DL",
  releaseFormat: "Mkv",
  seasons: "",
  episodes: "",
  language: "",
  subtitles: "",
  episodeSize: "",
  cast: [] as CastInput[],
  seasonTrailers: [] as SeasonTrailerInput[],
  releasePackages: [] as ReleasePackageForm[]
};

const DESTINATION_TYPE_PRESETS: Array<{ value: ReleaseDestinationType; label: string }> = [
  { value: "EPISODE_LINKS", label: "Episode Links" },
  { value: "BATCH_ZIP", label: "Batch / Zip File" },
  { value: "MIRROR", label: "Mirror" },
  { value: "STREAM", label: "Stream" },
  { value: "OTHER", label: "Other" }
];

type MoviesModImportPreview = {
  sourceHost: string;
  rawTitle: string;
  cleanedTitle: string;
  releaseYear: string;
  contentTypeGuess: "MOVIE" | "SERIES";
  packageCount: number;
  confidence: "high" | "medium" | "low";
  warnings: string[];
  totalLinks: number;
  packageHighlights: string[];
  seasonLabels: string[];
  destinationTypeCounts: Record<string, number>;
  packages: ReleasePackageForm[];
};

function normalizeImportText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function packageSignature(pkg: ReleasePackageForm): string {
  return [
    normalizeImportText(pkg.title).toLowerCase(),
    normalizeImportText(pkg.seasonLabel).toLowerCase(),
    normalizeImportText(pkg.audioLabel).toLowerCase(),
    normalizeImportText(pkg.qualityLabel).toLowerCase(),
    normalizeImportText(pkg.subtitleLabel).toLowerCase(),
    normalizeImportText(pkg.sizeLabel).toLowerCase()
  ].join("::");
}

function destinationSignature(destination: ReleasePackageForm["destinations"][number]): string {
  return [
    normalizeImportText(destination.label).toLowerCase(),
    normalizeImportText(destination.url),
    destination.type
  ].join("::");
}

function jumpToTmdbSection() {
  const section = document.getElementById("tmdb-import-target");
  section?.scrollIntoView({ behavior: "smooth", block: "start" });
  const input = section?.querySelector<HTMLInputElement>("input");
  input?.focus();
}

function mergeImportedPackages(existing: ReleasePackageForm[], incoming: ReleasePackageForm[], replaceExisting: boolean) {
  const seed = replaceExisting ? [] : existing;
  const merged = new Map<string, ReleasePackageForm>();

  for (const pkg of seed) {
    merged.set(packageSignature(pkg), {
      ...pkg,
      destinations: [...pkg.destinations].sort((a, b) => a.sortOrder - b.sortOrder)
    });
  }

  for (const pkg of incoming) {
    const key = packageSignature(pkg);
    const current = merged.get(key);
    const destinationMap = new Map<string, ReleasePackageForm["destinations"][number]>();
    const sourceDestinations = current ? current.destinations : [];

    for (const destination of sourceDestinations) {
      destinationMap.set(destinationSignature(destination), destination);
    }

    for (const destination of pkg.destinations) {
      const destinationKey = destinationSignature(destination);
      if (!destinationMap.has(destinationKey)) {
        destinationMap.set(destinationKey, destination);
      }
    }

    const sortedDestinations = Array.from(destinationMap.values()).sort((a, b) => a.sortOrder - b.sortOrder);
    const nextPackage: ReleasePackageForm = current
      ? {
          ...current,
          title: current.title || pkg.title,
          seasonLabel: current.seasonLabel || pkg.seasonLabel,
          audioLabel: current.audioLabel || pkg.audioLabel,
          qualityLabel: current.qualityLabel || pkg.qualityLabel,
          subtitleLabel: current.subtitleLabel || pkg.subtitleLabel,
          sizeLabel: current.sizeLabel || pkg.sizeLabel,
          notes: current.notes || pkg.notes,
          sortOrder: Math.min(current.sortOrder, pkg.sortOrder),
          isActive: current.isActive || pkg.isActive,
          destinations: sortedDestinations
        }
      : {
          ...pkg,
          destinations: sortedDestinations
        };

    merged.set(key, nextPackage);
  }

  return Array.from(merged.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function AdminMovieForm({ movieId, onCancelEdit }: { movieId?: string | null; onCancelEdit?: () => void }) {
  const [form, setForm] = useState(initialState);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isFetchingTmdb, setIsFetchingTmdb] = useState(false);
  const [tmdbError, setTmdbError] = useState<string | null>(null);
  const [tmdbSuccess, setTmdbSuccess] = useState<string | null>(null);
  const router = useRouter();

  // MoviesMod URL importer state
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [scrapePreview, setScrapePreview] = useState<MoviesModImportPreview | null>(null);
  const [importMode, setImportMode] = useState<"append" | "replace">("replace");

  useEffect(() => {
    setStatus(null);
    setTmdbError(null);
    setTmdbSuccess(null);
    setScrapeStatus(null);
    setScrapePreview(null);
    if (movieId) {
      setIsLoadingData(true);
      fetch(`/api/admin/movies/${movieId}`)
        .then(res => res.json())
        .then(data => {
          if (data.movie) {
            setForm({
              title: data.movie.title,
              releaseYear: data.movie.releaseYear.toString(),
              synopsis: data.movie.synopsis || "",
              posterUrl: data.movie.posterUrl || "",
              backdropUrl: data.movie.backdropUrl || "",
              trailerUrl: data.movie.trailerUrl || "",
              externalId: data.movie.externalId || "",
              genreNames: data.movie.genres.map((g: any) => g.genre.name).join(", "),
              isFeatured: data.movie.isFeatured,
              status: (data.movie.status || "DRAFT") as "DRAFT" | "PUBLISHED" | "ARCHIVED",
              contentType: data.movie.contentType || "MOVIE",
              screenshots: data.movie.screenshots || [],
              director: data.movie.director || "",
              tmdbRating: data.movie.tmdbRating ? data.movie.tmdbRating.toString() : "",
              tmdbRatingCount: data.movie.tmdbRatingCount || "",
              imdbRating: data.movie.imdbRating || "",
              imdbRatingCount: data.movie.imdbRatingCount || "",
              releaseQuality: data.movie.releaseQuality || "1080p WEB-DL",
              releaseFormat: data.movie.releaseFormat || "Mkv",
              seasons: data.movie.seasons || "",
              episodes: data.movie.episodes || "",
              language: data.movie.language || "",
              subtitles: data.movie.subtitles || "",
              episodeSize: data.movie.episodeSize || "",
              cast: data.movie.castMembers.map((c: any) => ({
                name: c.actor.name,
                character: c.character || "",
                profileUrl: c.actor.profileUrl || ""
              })),
              seasonTrailers: (data.movie.seasonTrailers || []).map((trailer: any, index: number) => ({
                seasonLabel: trailer.seasonLabel || "",
                title: trailer.title || "",
                url: trailer.url || "",
                sortOrder: Number(trailer.sortOrder) || index,
                isActive: trailer.isActive ?? true
              })),
              releasePackages: normalizeReleasePackages(
                data.movie.title,
                data.movie.releasePackages,
                data.movie.watchLinks
              ).map((pkg) => ({
                title: pkg.title,
                seasonLabel: pkg.seasonLabel || "",
                audioLabel: pkg.audioLabel || "",
                qualityLabel: pkg.qualityLabel || "",
                subtitleLabel: pkg.subtitleLabel || "",
                sizeLabel: pkg.sizeLabel || "",
                notes: pkg.notes || "",
                sortOrder: pkg.sortOrder || 0,
                isActive: pkg.isActive,
                destinations: pkg.destinations.map((destination) => ({
                  label: destination.label,
                  url: destination.url,
                  type: destination.type,
                  sortOrder: destination.sortOrder
                }))
              }))
            });
          }
          setIsLoadingData(false);
        })
        .catch(err => {
          console.error("Failed to load movie", err);
          setIsLoadingData(false);
        });
    } else {
      setForm(initialState);
    }
  }, [movieId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(null);

    try {
      const url = movieId ? `/api/admin/movies/${movieId}` : "/api/admin/movies";
      const method = movieId ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...form,
          screenshots: form.screenshots.filter(Boolean),
          director: form.director,
          tmdbRating: form.tmdbRating ? parseFloat(form.tmdbRating) : null,
          imdbRating: form.imdbRating,
          releaseQuality: form.releaseQuality,
          releaseFormat: form.releaseFormat,
          cast: form.cast.filter(c => c.name.trim() !== ""),
          seasonTrailers: form.seasonTrailers
            .map((trailer, index) => ({
              ...trailer,
              seasonLabel: trailer.seasonLabel.trim(),
              title: trailer.title.trim(),
              url: trailer.url.trim(),
              sortOrder: Number(trailer.sortOrder) || index
            }))
            .filter((trailer) => trailer.seasonLabel.length > 0 && trailer.url.length > 0),
          isFeatured: form.isFeatured,
          releasePackages: form.releasePackages
            .map((pkg, index) => ({
              ...pkg,
              title: (pkg.title || "").trim() || formatReleasePackageTitle({
                baseTitle: form.title || "Untitled",
                seasonLabel: pkg.seasonLabel || undefined,
                audioLabel: pkg.audioLabel || undefined,
                qualityLabel: pkg.qualityLabel || undefined,
                subtitleLabel: pkg.subtitleLabel || undefined,
                sizeLabel: pkg.sizeLabel || undefined
              }),
              sortOrder: Number(pkg.sortOrder) || index,
              destinations: pkg.destinations
                .filter((destination) => destination.url.trim().length > 0)
                .map((destination, destinationIndex) => ({
                  ...destination,
                  sortOrder: Number(destination.sortOrder) || destinationIndex
                }))
            }))
            .filter((pkg) => pkg.title.trim().length > 0),
          genreNames: form.genreNames
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to save movie.");
      }

      if (!movieId) {
        setForm(initialState);
      }
      setStatus(movieId ? "Movie updated successfully." : "Movie and reference destinations created successfully.");
      router.refresh();
      if (movieId && onCancelEdit) {
        onCancelEdit();
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function addReleasePackage() {
    setForm((current) => ({
      ...current,
      releasePackages: [
        ...current.releasePackages,
        {
          title: "",
          seasonLabel: "",
          audioLabel: "",
          qualityLabel: "",
          subtitleLabel: "",
          sizeLabel: "",
          notes: "",
          sortOrder: current.releasePackages.length,
          isActive: true,
          destinations: [
            {
              label: "Episode Links",
              url: "",
              type: "EPISODE_LINKS",
              sortOrder: 0
            }
          ]
        }
      ]
    }));
  }

  function updateReleasePackage(index: number, fields: Partial<ReleasePackageForm>) {
    setForm((current) => {
      const updated = [...current.releasePackages];
      updated[index] = { ...updated[index], ...fields };
      const shouldAutoTitle =
        !updated[index].title.trim() ||
        updated[index].title.trim() === "Untitled" ||
        updated[index].title.trim() === current.title.trim();
      if (shouldAutoTitle) {
        updated[index].title = formatReleasePackageTitle({
          baseTitle: form.title || current.title || "Untitled",
          seasonLabel: updated[index].seasonLabel || undefined,
          audioLabel: updated[index].audioLabel || undefined,
          qualityLabel: updated[index].qualityLabel || undefined,
          subtitleLabel: updated[index].subtitleLabel || undefined,
          sizeLabel: updated[index].sizeLabel || undefined
        });
      }
      return { ...current, releasePackages: updated };
    });
  }

  function addReleaseDestination(packageIndex: number) {
    setForm((current) => {
      const updated = [...current.releasePackages];
      updated[packageIndex].destinations = [
        ...updated[packageIndex].destinations,
        {
          label: "Open Link",
          url: "",
          type: "OTHER",
          sortOrder: updated[packageIndex].destinations.length
        }
      ];
      return { ...current, releasePackages: updated };
    });
  }

  function updateReleaseDestination(packageIndex: number, destinationIndex: number, fields: Partial<ReleasePackageForm["destinations"][number]>) {
    setForm((current) => {
      const updated = [...current.releasePackages];
      const destinations = [...updated[packageIndex].destinations];
      destinations[destinationIndex] = { ...destinations[destinationIndex], ...fields };
      updated[packageIndex] = { ...updated[packageIndex], destinations };
      return { ...current, releasePackages: updated };
    });
  }

  function removeReleaseDestination(packageIndex: number, destinationIndex: number) {
    setForm((current) => {
      const updated = [...current.releasePackages];
      updated[packageIndex].destinations = updated[packageIndex].destinations.filter((_, idx) => idx !== destinationIndex);
      return { ...current, releasePackages: updated };
    });
  }

  function removeReleasePackage(index: number) {
    setForm((current) => ({
      ...current,
      releasePackages: current.releasePackages.filter((_, idx) => idx !== index)
    }));
  }

  function addSeasonTrailer() {
    setForm((current) => ({
      ...current,
      seasonTrailers: [
        ...current.seasonTrailers,
        {
          seasonLabel: current.contentType === "MOVIE" ? "Season 1" : `Season ${current.seasonTrailers.length + 1}`,
          title: "",
          url: "",
          sortOrder: current.seasonTrailers.length,
          isActive: true
        }
      ]
    }));
  }

  function updateSeasonTrailer(index: number, fields: Partial<SeasonTrailerInput>) {
    setForm((current) => {
      const updated = [...current.seasonTrailers];
      updated[index] = { ...updated[index], ...fields };
      return { ...current, seasonTrailers: updated };
    });
  }

  function removeSeasonTrailer(index: number) {
    setForm((current) => ({
      ...current,
      seasonTrailers: current.seasonTrailers.filter((_, idx) => idx !== index)
    }));
  }

  function seedSeasonTrailersFromSeries() {
    const labels = expandSeasonLabels(form.seasons);
    if (labels.length === 0) {
      setStatus("Add a seasons range first, then generate season trailer slots.");
      return;
    }

    setForm((current) => {
      const existing = new Set(current.seasonTrailers.map((trailer) => trailer.seasonLabel.trim().toLowerCase()));
      const next = [...current.seasonTrailers];
      let sortOrder = next.length;

      for (const label of labels) {
        if (existing.has(label.toLowerCase())) {
          continue;
        }

        next.push({
          seasonLabel: label,
          title: formatSeasonTrailerTitle(label),
          url: "",
          sortOrder,
          isActive: true
        });
        sortOrder += 1;
      }

      return { ...current, seasonTrailers: next };
    });
  }

  async function fetchTmdbData() {
    if (!form.externalId) {
      setTmdbError("Please enter a TMDB ID first.");
      return;
    }
    
    setIsFetchingTmdb(true);
    setTmdbError(null);
    setTmdbSuccess(null);
    
    try {
      const typeParam = form.contentType.toLowerCase(); // "movie", "series", "web_series", "anime"
      const response = await fetch(`/api/tmdb/${form.externalId.trim()}?type=${typeParam}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to fetch from TMDB");
      }
      
      const data = await response.json();
      
      setForm((current) => ({
        ...current,
        title: data.title || current.title,
        releaseYear: data.releaseYear?.toString() || current.releaseYear,
        synopsis: data.synopsis || current.synopsis,
        posterUrl: data.posterUrl || current.posterUrl,
        backdropUrl: data.backdropUrl || current.backdropUrl,
        trailerUrl: data.trailerUrl || current.trailerUrl,
        screenshots: data.screenshots && data.screenshots.length > 0 ? data.screenshots : current.screenshots,
        genreNames: data.genreNames || current.genreNames,
        contentType: data.contentType || current.contentType,
        director: data.director || current.director,
        tmdbRating: data.tmdbRating?.toString() || current.tmdbRating,
        tmdbRatingCount: data.tmdbRatingCount || current.tmdbRatingCount,
        cast: data.cast && data.cast.length > 0
          ? data.cast.map((actor: any) => ({
              name: actor.name || "",
              character: actor.character || "",
              profileUrl: actor.profileUrl || "",
              bio: actor.bio || "",
              birthDate: actor.birthDate || "",
              birthPlace: actor.birthPlace || "",
              sourceConfidence: actor.sourceConfidence != null ? String(actor.sourceConfidence) : "0.6",
              isIndexable: Boolean(actor.isIndexable),
              tmdbId: actor.tmdbId || ""
            }))
          : current.cast,
        seasonTrailers: (() => {
          const nextContentType = data.contentType || current.contentType;
          const hasSeriesTrailers = current.seasonTrailers.length > 0;
          if (nextContentType === "MOVIE" || hasSeriesTrailers) {
            return current.seasonTrailers;
          }

          const seeded = expandSeasonLabels(current.seasons).map((label, index) => ({
            seasonLabel: label,
            title: formatSeasonTrailerTitle(label),
            url: "",
            sortOrder: current.seasonTrailers.length + index,
            isActive: true
          }));

          return seeded.length > 0 ? seeded : current.seasonTrailers;
        })()
      }));
      setTmdbSuccess(
        data.trailerUrl
          ? "TMDB data imported, including the trailer link. Review the season trailer slots if this is a series, then save when ready."
          : "TMDB data imported into the form. Review the season trailer slots if this is a series, then save when ready."
      );
    } catch (err: any) {
      setTmdbError(err.message || "An error occurred fetching TMDB data.");
    } finally {
      setIsFetchingTmdb(false);
    }
  }

  async function handleScrape() {
    if (!scrapeUrl.trim()) return;
    setIsScraping(true);
    setScrapeStatus(null);
    setScrapePreview(null);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scrapeUrl.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scrape failed.");

      const importedPackages = (data.releasePackages || []).map((pkg: any) => ({
        title: (pkg.title || "").trim() || formatReleasePackageTitle({
          baseTitle: data.cleanedTitle || data.rawTitle || "Untitled",
          seasonLabel: pkg.seasonLabel,
          audioLabel: pkg.audioLabel,
          qualityLabel: pkg.qualityLabel,
          subtitleLabel: pkg.subtitleLabel,
          sizeLabel: pkg.sizeLabel
        }),
        seasonLabel: pkg.seasonLabel || "",
        audioLabel: pkg.audioLabel || "",
        qualityLabel: pkg.qualityLabel || "",
        subtitleLabel: pkg.subtitleLabel || "",
        sizeLabel: pkg.sizeLabel || "",
        notes: pkg.notes || "",
        sortOrder: Number(pkg.sortOrder) || 0,
        isActive: pkg.isActive ?? true,
        destinations: (pkg.destinations || [])
          .map((destination: any) => ({
            label: destination.label || "Open Link",
            url: destination.url || "",
            type: (destination.type as ReleaseDestinationType) || "OTHER",
            sortOrder: Number(destination.sortOrder) || 0
          }))
          .filter((destination: { url: string }) => destination.url.trim().length > 0)
      }));

      const normalizedPackages = mergeImportedPackages([], importedPackages, true);
      const hasImportedPackages = normalizedPackages.length > 0;
      const nextPackages = hasImportedPackages
        ? mergeImportedPackages(form.releasePackages, normalizedPackages, importMode === "replace")
        : form.releasePackages;
      const importedLooksLikeSeries =
        data.contentTypeGuess === "SERIES" || normalizedPackages.some((pkg: ReleasePackageForm) => pkg.seasonLabel.trim().length > 0);

      setScrapePreview({
        sourceHost: data.sourceHost || "moviesmod",
        rawTitle: data.rawTitle || "",
        cleanedTitle: data.cleanedTitle || "",
        releaseYear: data.releaseYear ? String(data.releaseYear) : "",
        contentTypeGuess: data.contentTypeGuess || (normalizedPackages.some((pkg: ReleasePackageForm) => pkg.seasonLabel.trim()) ? "SERIES" : "MOVIE"),
        packageCount: Number(data.packageCount) || normalizedPackages.length,
        confidence: data.confidence || "medium",
        warnings: Array.isArray(data.warnings) ? data.warnings : [],
        totalLinks: Number(data.totalLinks) || normalizedPackages.reduce((total: number, pkg: ReleasePackageForm) => total + pkg.destinations.length, 0),
        packageHighlights: Array.isArray(data.packageHighlights) ? data.packageHighlights : normalizedPackages.slice(0, 3).map((pkg: ReleasePackageForm) => pkg.title),
        seasonLabels: Array.isArray(data.seasonLabels) ? data.seasonLabels : Array.from(new Set(normalizedPackages.map((pkg: ReleasePackageForm) => pkg.seasonLabel.trim()).filter(Boolean))),
        destinationTypeCounts: (data.destinationTypeCounts && typeof data.destinationTypeCounts === "object") ? data.destinationTypeCounts : {},
        packages: normalizedPackages
      });

      setForm((current) => {
        const nextTitle = data.cleanedTitle || data.rawTitle || current.title;
        const shouldFillTitle = !current.title.trim() || current.title.trim() === "Untitled";
        const shouldFillReleaseYear = !current.releaseYear.trim() && data.releaseYear;

        return {
          ...current,
          title: shouldFillTitle && nextTitle ? nextTitle : current.title,
          releaseYear: shouldFillReleaseYear ? String(data.releaseYear) : current.releaseYear,
          contentType: !movieId && current.contentType === "MOVIE" && importedLooksLikeSeries ? "SERIES" : current.contentType,
          releasePackages: hasImportedPackages ? nextPackages : current.releasePackages
        };
      });

      setScrapeStatus({
        type: hasImportedPackages ? "success" : "error",
        message: hasImportedPackages
          ? `Imported ${normalizedPackages.length} release package${normalizedPackages.length === 1 ? "" : "s"} from ${data.sourceHost || "MoviesMod"} (${importMode === "replace" ? "replaced" : "merged into"} the staged list).`
          : `No release packages were found on ${data.sourceHost || "MoviesMod"}, so the staged list was left unchanged.`
      });
    } catch (err: any) {
      setScrapeStatus({ type: "error", message: err.message || "An error occurred." });
    } finally {
      setIsScraping(false);
    }
  }

  if (isLoadingData) {
    return <div className="text-zinc-400 p-8 text-center text-sm">Loading movie details...</div>;
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>

      {/* MoviesMod URL importer */}
      <div className="rounded-xl border border-dashed border-sky-500/30 bg-sky-500/5 p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-sky-400">Quick import from MoviesMod</p>
        <p className="mb-3 text-[11px] text-zinc-500">Paste a MoviesMod URL to stage grouped release packages. The importer now dedupes links, previews what it found, and can either replace or merge the existing staged list.</p>
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="https://moviesmod.money/download-..."
            value={scrapeUrl}
            onChange={(e) => setScrapeUrl(e.target.value)}
            className="flex-1 rounded-lg border border-[#222] bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
          />
          <button
            type="button"
            disabled={isScraping || !scrapeUrl.trim()}
            onClick={handleScrape}
            className="shrink-0 rounded-lg bg-sky-600 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isScraping ? "Extracting..." : "Extract Data"}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setImportMode("replace")}
            className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-all ${
              importMode === "replace"
                ? "border-sky-500/40 bg-sky-500/15 text-sky-300"
                : "border-[#222] bg-[#0a0a0a] text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Replace staged packages
          </button>
          <button
            type="button"
            onClick={() => setImportMode("append")}
            className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-all ${
              importMode === "append"
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                : "border-[#222] bg-[#0a0a0a] text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Merge into staged packages
          </button>
        </div>
        {scrapePreview && (
          <div className="mt-3 rounded-xl border border-sky-500/20 bg-[#08131d] p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-sky-300">Import preview</p>
                <p className="mt-1 text-[11px] text-zinc-400">
                  {scrapePreview.sourceHost} • {scrapePreview.packages.length} package{scrapePreview.packages.length === 1 ? "" : "s"} • {scrapePreview.totalLinks} destination{scrapePreview.totalLinks === 1 ? "" : "s"}
                </p>
                {scrapePreview.cleanedTitle ? (
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Clean title: <span className="text-zinc-300">{scrapePreview.cleanedTitle}</span>
                  </p>
                ) : null}
                {scrapePreview.releaseYear ? (
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Release year: <span className="text-zinc-300">{scrapePreview.releaseYear}</span>
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                    scrapePreview.contentTypeGuess === "SERIES"
                      ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  }`}>
                    Suggested {scrapePreview.contentTypeGuess === "SERIES" ? "Series / TV Show" : "Movie"}
                  </span>
                  <span className="rounded-full border border-[#234] bg-[#0a1118] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-sky-200">
                    {scrapePreview.packageCount} package{scrapePreview.packageCount === 1 ? "" : "s"}
                  </span>
                  {scrapePreview.seasonLabels.length > 0 ? (
                    <span className="rounded-full border border-[#234] bg-[#0a1118] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-200">
                      {scrapePreview.seasonLabels.length} season group{scrapePreview.seasonLabels.length === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                  scrapePreview.confidence === "high"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : scrapePreview.confidence === "medium"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                    : "border-red-500/30 bg-red-500/10 text-red-300"
                }`}>
                  {scrapePreview.confidence} confidence
                </span>
                <button
                  type="button"
                  onClick={jumpToTmdbSection}
                  className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-sky-300 transition-all hover:bg-sky-500 hover:text-black"
                >
                  Continue to TMDB
                </button>
              </div>
            </div>
            {scrapePreview.warnings.length > 0 && (
              <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Warnings</p>
                <ul className="mt-1 space-y-1 text-[11px] text-amber-100/80">
                  {scrapePreview.warnings.map((warning) => (
                    <li key={warning}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {scrapePreview.packages.slice(0, 4).map((pkg) => (
                <div key={packageSignature(pkg)} className="rounded-lg border border-[#173144] bg-[#0b1722] p-3">
                  <p className="text-sm font-bold text-sky-300">{pkg.title}</p>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    {pkg.destinations.length} destination{pkg.destinations.length === 1 ? "" : "s"} • {pkg.isActive ? "visible" : "hidden"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[pkg.seasonLabel, pkg.audioLabel, pkg.qualityLabel, pkg.subtitleLabel, pkg.sizeLabel]
                      .filter(Boolean)
                      .map((label) => (
                        <span key={label} className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-zinc-200">
                          {label}
                        </span>
                      ))}
                  </div>
                </div>
              ))}
            </div>
            {scrapePreview.packageHighlights.length > 0 ? (
              <div className="mt-3 rounded-lg border border-[#173144] bg-[#09121a] px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-sky-300">Top package titles</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {scrapePreview.packageHighlights.map((title) => (
                    <span key={title} className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] font-bold text-zinc-200">
                      {title}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {scrapePreview.packages.length > 4 ? (
              <p className="mt-2 text-[11px] text-zinc-500">
                Showing the first 4 packages. The rest are staged below in the release variant editor.
              </p>
            ) : null}
          </div>
        )}
        {scrapeStatus && (
          <p className={`mt-2 text-xs font-medium ${
            scrapeStatus.type === "success" ? "text-emerald-400" : "text-red-400"
          }`}>
            {scrapeStatus.message}
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium text-zinc-400">
          Title
          <input
            required
            placeholder="e.g. Inception"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            className="w-full rounded-xl border border-[#222222] bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 shadow-inner outline-none transition-all duration-300 focus:border-emerald-500 focus:bg-[#1a1b26] focus:shadow-[0_0_15px_rgba(16,185,129,0.15)]"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-zinc-400">
          Release Year
          <input
            required
            placeholder="e.g. 2010 or 2019-2026"
            value={form.releaseYear}
            onChange={(event) => setForm((current) => ({ ...current, releaseYear: event.target.value }))}
            className="w-full rounded-xl border border-[#222222] bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 shadow-inner outline-none transition-all duration-300 focus:border-emerald-500 focus:bg-[#1a1b26] focus:shadow-[0_0_15px_rgba(16,185,129,0.15)]"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-zinc-400">
          Content Type
          <select
            value={form.contentType}
            onChange={(event) => setForm((current) => ({ ...current, contentType: event.target.value }))}
            className="w-full rounded-xl border border-[#222222] bg-[#111111] px-4 py-3 text-sm text-white shadow-inner outline-none transition-all duration-300 focus:border-emerald-500 focus:bg-[#1a1b26] focus:shadow-[0_0_15px_rgba(16,185,129,0.15)]"
          >
            <option value="MOVIE">Movie</option>
            <option value="SERIES">Series / TV Show</option>
            <option value="WEB_SERIES">Web Series</option>
            <option value="ANIME">Anime</option>
          </select>
        </label>
      </div>
      
      <div id="tmdb-import-target" className="grid gap-4 md:grid-cols-8">
        <label className="grid gap-2 text-sm font-medium text-zinc-400 md:col-span-2">
          Director(s)
          <textarea
            rows={3}
            placeholder="e.g. Christopher Nolan"
            value={form.director}
            onChange={(event) => setForm((current) => ({ ...current, director: event.target.value }))}
            className="w-full rounded-xl border border-[#222222] bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 shadow-inner outline-none transition-all duration-300 focus:border-emerald-500 focus:bg-[#1a1b26] focus:shadow-[0_0_15px_rgba(16,185,129,0.15)] resize-y"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-zinc-400">
          TMDB Rating
          <input
            placeholder="e.g. 8.5"
            value={form.tmdbRating}
            onChange={(event) => setForm((current) => ({ ...current, tmdbRating: event.target.value }))}
            className="w-full rounded-xl border border-[#222222] bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 shadow-inner outline-none transition-all duration-300 focus:border-emerald-500 focus:bg-[#1a1b26] focus:shadow-[0_0_15px_rgba(16,185,129,0.15)]"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-zinc-400">
          TMDB Count
          <input
            placeholder="e.g. 12683"
            value={form.tmdbRatingCount}
            onChange={(event) => setForm((current) => ({ ...current, tmdbRatingCount: event.target.value }))}
            className="w-full rounded-xl border border-[#222222] bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 shadow-inner outline-none transition-all duration-300 focus:border-emerald-500 focus:bg-[#1a1b26] focus:shadow-[0_0_15px_rgba(16,185,129,0.15)]"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-zinc-400">
          IMDB Rating
          <input
            placeholder="e.g. 8.8"
            value={form.imdbRating}
            onChange={(event) => setForm((current) => ({ ...current, imdbRating: event.target.value }))}
            className="w-full rounded-xl border border-[#222222] bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 shadow-inner outline-none transition-all duration-300 focus:border-emerald-500 focus:bg-[#1a1b26] focus:shadow-[0_0_15px_rgba(16,185,129,0.15)]"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-zinc-400">
          IMDB Count
          <input
            placeholder="e.g. 1500"
            value={form.imdbRatingCount}
            onChange={(event) => setForm((current) => ({ ...current, imdbRatingCount: event.target.value }))}
            className="w-full rounded-xl border border-[#222222] bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 shadow-inner outline-none transition-all duration-300 focus:border-emerald-500 focus:bg-[#1a1b26] focus:shadow-[0_0_15px_rgba(16,185,129,0.15)]"
          />
        </label>
        <div className="grid gap-4 grid-cols-2 md:col-span-2">
          <label className="grid gap-2 text-sm font-medium text-zinc-400">
            Quality
            <input
              placeholder="1080p WEB-DL"
              value={form.releaseQuality}
              onChange={(event) => setForm((current) => ({ ...current, releaseQuality: event.target.value }))}
              className="w-full rounded-xl border border-[#222222] bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 shadow-inner outline-none transition-all duration-300 focus:border-emerald-500 focus:bg-[#1a1b26]"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-zinc-400">
            Format
            <input
              placeholder="Mkv"
              value={form.releaseFormat}
              onChange={(event) => setForm((current) => ({ ...current, releaseFormat: event.target.value }))}
              className="w-full rounded-xl border border-[#222222] bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 shadow-inner outline-none transition-all duration-300 focus:border-emerald-500 focus:bg-[#1a1b26]"
            />
          </label>
        </div>
      </div>


      <label className="grid gap-2 text-sm font-medium text-zinc-400">
        Synopsis
        <textarea
          rows={3}
          placeholder="A thief who steals corporate secrets through the use of dream-sharing technology..."
          value={form.synopsis}
          onChange={(event) => setForm((current) => ({ ...current, synopsis: event.target.value }))}
          className="w-full rounded-xl border border-[#222222] bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 shadow-inner outline-none transition-all duration-300 focus:border-emerald-500 focus:bg-[#1a1b26] focus:shadow-[0_0_15px_rgba(16,185,129,0.15)]"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-zinc-400">
          Poster URL
          <input
            placeholder="https://example.com/poster.jpg"
            value={form.posterUrl}
            onChange={(event) => setForm((current) => ({ ...current, posterUrl: event.target.value }))}
            className="w-full rounded-xl border border-[#222222] bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 shadow-inner outline-none transition-all duration-300 focus:border-emerald-500 focus:bg-[#1a1b26] focus:shadow-[0_0_15px_rgba(16,185,129,0.15)]"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-zinc-400">
          Backdrop URL
          <input
            placeholder="https://example.com/backdrop.jpg"
            value={form.backdropUrl}
            onChange={(event) => setForm((current) => ({ ...current, backdropUrl: event.target.value }))}
            className="w-full rounded-xl border border-[#222222] bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 shadow-inner outline-none transition-all duration-300 focus:border-emerald-500 focus:bg-[#1a1b26] focus:shadow-[0_0_15px_rgba(16,185,129,0.15)]"
          />
        </label>
        {form.contentType !== "MOVIE" && (
          <>
            <label className="grid gap-2 text-sm font-medium text-emerald-400">
              Seasons
              <input
                placeholder="e.g. 1, 2, 3, 4"
                value={form.seasons}
                onChange={(event) => setForm((current) => ({ ...current, seasons: event.target.value }))}
                className="w-full rounded-xl border border-emerald-500/30 bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-emerald-500"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-emerald-400">
              Episodes
              <input
                placeholder="e.g. 8 & 8 & 8 & 8"
                value={form.episodes}
                onChange={(event) => setForm((current) => ({ ...current, episodes: event.target.value }))}
                className="w-full rounded-xl border border-emerald-500/30 bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-emerald-500"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-emerald-400">
              Audio Language
              <input
                placeholder="e.g. Dual Audio (Hindi-English)"
                value={form.language}
                onChange={(event) => setForm((current) => ({ ...current, language: event.target.value }))}
                className="w-full rounded-xl border border-emerald-500/30 bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-emerald-500"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-emerald-400">
              Subtitles
              <input
                placeholder="e.g. Yes (Hindi+English)"
                value={form.subtitles}
                onChange={(event) => setForm((current) => ({ ...current, subtitles: event.target.value }))}
                className="w-full rounded-xl border border-emerald-500/30 bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-emerald-500"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-emerald-400 md:col-span-2">
              Size Per Episode
              <input
                placeholder="e.g. 200MB & 450MB & 800MB (Each Episode)"
                value={form.episodeSize}
                onChange={(event) => setForm((current) => ({ ...current, episodeSize: event.target.value }))}
                className="w-full rounded-xl border border-emerald-500/30 bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-emerald-500"
              />
            </label>
          </>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-zinc-400">
          Trailer URL
          <input
            placeholder="https://youtube.com/watch?v=..."
            value={form.trailerUrl}
            onChange={(event) => setForm((current) => ({ ...current, trailerUrl: event.target.value }))}
            className="w-full rounded-xl border border-[#222222] bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 shadow-inner outline-none transition-all duration-300 focus:border-emerald-500 focus:bg-[#1a1b26] focus:shadow-[0_0_15px_rgba(16,185,129,0.15)]"
          />
        </label>
        <div className="rounded-xl border border-[#222222] bg-[#111111] p-4 md:col-span-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-zinc-300">Season Trailers</p>
              <p className="mt-1 text-xs text-zinc-500">
                For series and web series, add one trailer per season. TMDB only fills the main trailer, so YouTube links stay manual here when season-specific videos are needed.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={seedSeasonTrailersFromSeries}
                className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs font-bold uppercase tracking-widest text-sky-300 transition-all hover:bg-sky-500 hover:text-black"
              >
                Generate from Seasons
              </button>
              <button
                type="button"
                onClick={addSeasonTrailer}
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold uppercase tracking-widest text-emerald-300 transition-all hover:bg-emerald-500 hover:text-black"
              >
                + Add Season Trailer
              </button>
            </div>
          </div>

          {form.seasonTrailers.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-[#2a2a2a] px-4 py-5 text-center">
              <p className="text-xs text-zinc-500">No season trailers yet. Add them manually or generate placeholders from the seasons field.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {form.seasonTrailers.map((trailer, index) => (
                <div key={`${trailer.seasonLabel}-${index}`} className="rounded-lg border border-[#222222] bg-[#0c0c0c] p-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                      {formatSeasonTrailerTitle(trailer.seasonLabel, trailer.title)}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateSeasonTrailer(index, { isActive: !trailer.isActive })}
                        className={`rounded-md border px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-all ${
                          trailer.isActive
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : "border-zinc-700 bg-zinc-900 text-zinc-400"
                        }`}
                      >
                        {trailer.isActive ? "Visible" : "Hidden"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSeasonTrailer(index)}
                        className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-red-300 transition-all hover:bg-red-500 hover:text-white"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[1fr_1.2fr_2fr_auto]">
                    <label className="grid gap-1 text-[11px] font-semibold text-zinc-500">
                      Season Label
                      <input
                        placeholder="Season 1"
                        value={trailer.seasonLabel}
                        onChange={(event) => updateSeasonTrailer(index, { seasonLabel: event.target.value })}
                        className="w-full rounded-md border border-[#222222] bg-[#111111] px-3 py-2 text-xs text-white outline-none focus:border-sky-500 placeholder:text-zinc-700"
                      />
                    </label>
                    <label className="grid gap-1 text-[11px] font-semibold text-zinc-500">
                      Title
                      <input
                        placeholder="Trailer Season 1"
                        value={trailer.title}
                        onChange={(event) => updateSeasonTrailer(index, { title: event.target.value })}
                        className="w-full rounded-md border border-[#222222] bg-[#111111] px-3 py-2 text-xs text-white outline-none focus:border-sky-500 placeholder:text-zinc-700"
                      />
                    </label>
                    <label className="grid gap-1 text-[11px] font-semibold text-zinc-500">
                      YouTube URL
                      <input
                        type="url"
                        placeholder="https://youtube.com/watch?v=..."
                        value={trailer.url}
                        onChange={(event) => updateSeasonTrailer(index, { url: event.target.value })}
                        className="w-full rounded-md border border-[#222222] bg-[#111111] px-3 py-2 text-xs text-white outline-none focus:border-sky-500 placeholder:text-zinc-700"
                      />
                    </label>
                    <label className="grid gap-1 text-[11px] font-semibold text-zinc-500">
                      Sort
                      <input
                        type="number"
                        placeholder="0"
                        value={trailer.sortOrder}
                        onChange={(event) => updateSeasonTrailer(index, { sortOrder: parseInt(event.target.value, 10) || 0 })}
                        className="w-full rounded-md border border-[#222222] bg-[#111111] px-3 py-2 text-xs text-white outline-none focus:border-sky-500 placeholder:text-zinc-700"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <label className="grid gap-2 text-sm font-medium text-zinc-400">
          <div className="flex justify-between items-center">
            <span>External ID (TMDB)</span>
            <button
              type="button"
              onClick={fetchTmdbData}
              disabled={isFetchingTmdb || !form.externalId}
              className="text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFetchingTmdb ? "Fetching..." : "Auto-fill from TMDB"}
            </button>
          </div>
          <input
            placeholder="e.g. 27205"
            value={form.externalId}
            onChange={(event) => setForm((current) => ({ ...current, externalId: event.target.value }))}
            className="w-full rounded-xl border border-[#222222] bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 shadow-inner outline-none transition-all duration-300 focus:border-emerald-500 focus:bg-[#1a1b26] focus:shadow-[0_0_15px_rgba(16,185,129,0.15)]"
          />
          {tmdbError && <span className="text-xs text-red-400">{tmdbError}</span>}
          {tmdbSuccess && <span className="text-xs text-emerald-400">{tmdbSuccess}</span>}
        </label>
      </div>

      <label className="grid gap-2 text-sm font-medium text-zinc-400">
        Genres (comma separated)
        <input
          value={form.genreNames}
          onChange={(event) => setForm((current) => ({ ...current, genreNames: event.target.value }))}
          placeholder="Drama, Romance, Sci-Fi"
          className="w-full rounded-xl border border-[#222222] bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 shadow-inner outline-none transition-all duration-300 focus:border-emerald-500 focus:bg-[#1a1b26] focus:shadow-[0_0_15px_rgba(16,185,129,0.15)]"
        />
      </label>

      {/* --- SCREENSHOTS SECTION --- */}
      <div className="rounded-xl border border-[#222222] bg-[#161616]/40 p-4">
        <div className="flex items-center justify-between border-b border-[#222222] pb-3 mb-4">
          <div>
            <h4 className="text-sm font-bold text-zinc-200">Screenshots Gallery</h4>
            <p className="text-xs text-zinc-500 mt-0.5">Add URLs for screenshots (TMDB import fetches up to 6 automatically).</p>
          </div>
          <button
            type="button"
            onClick={() => setForm((c) => ({ ...c, screenshots: [...c.screenshots, ""] }))}
            className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all"
          >
            + Add Screenshot
          </button>
        </div>

        {form.screenshots.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#333333] p-6 text-center">
            <p className="text-xs text-zinc-500">No screenshots added. Click "Auto-fill from TMDB" or add manually.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {form.screenshots.map((url, index) => (
              <div key={index} className="flex flex-col gap-2 rounded-xl border border-[#222222] bg-[#0c0c0c] p-3 relative group">
                <input
                  type="url"
                  placeholder="https://example.com/screenshot.jpg"
                  value={url}
                  onChange={(e) => {
                    const newScreenshots = [...form.screenshots];
                    newScreenshots[index] = e.target.value;
                    setForm(c => ({ ...c, screenshots: newScreenshots }));
                  }}
                  className="w-full rounded-lg border border-[#222222] bg-[#111] px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 placeholder:text-zinc-700"
                />
                <MediaUploadButton
                  folder="screenshots"
                  prefix={`${form.title || "movie"}-screenshot-${index + 1}`}
                  label="Upload screenshot"
                  onUploaded={(uploadedUrl) => {
                    setForm((current) => {
                      const newScreenshots = [...current.screenshots];
                      newScreenshots[index] = uploadedUrl;
                      return { ...current, screenshots: newScreenshots };
                    });
                  }}
                />
                {url && (
                  <div className="relative h-24 w-full rounded-lg bg-[#111] bg-cover bg-center border border-[#222]" style={{ backgroundImage: `url(${url})` }}>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const newScreenshots = form.screenshots.filter((_, i) => i !== index);
                    setForm(c => ({ ...c, screenshots: newScreenshots }));
                  }}
                  className="absolute top-4 right-4 h-6 w-6 rounded-full bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                  title="Remove Screenshot"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- CAST MEMBERS SECTION --- */}
      <div className="rounded-xl border border-[#222222] bg-[#161616]/40 p-4">
        <div className="flex items-center justify-between border-b border-[#222222] pb-3 mb-4">
          <div>
            <h4 className="text-sm font-bold text-zinc-200">Cast Members</h4>
            <p className="text-xs text-zinc-500 mt-0.5">Top billed cast from TMDB (can be edited).</p>
          </div>
          <button
            type="button"
            onClick={() => setForm((c) => ({ ...c, cast: [...c.cast, { name: "", character: "", profileUrl: "", bio: "", birthDate: "", birthPlace: "", sourceConfidence: "0.5", isIndexable: false, tmdbId: "" }] }))}
            className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all"
          >
            + Add Cast
          </button>
        </div>

        {form.cast.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#333333] p-6 text-center">
            <p className="text-xs text-zinc-500">No cast added. Click "Auto-fill from TMDB" or add manually.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {form.cast.map((actor, index) => (
              <div key={index} className="flex gap-3 rounded-xl border border-[#222222] bg-[#0c0c0c] p-3 relative group">
                <div className="h-14 w-14 shrink-0 rounded-full bg-[#111] overflow-hidden border border-[#222]">
                  {actor.profileUrl ? (
                    <img src={actor.profileUrl} alt={actor.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-zinc-700 text-xs font-bold">N/A</div>
                  )}
                </div>
                <div className="flex flex-col flex-1 gap-1 min-w-0">
                  <input
                    type="text"
                    placeholder="Actor Name"
                    value={actor.name}
                    onChange={(e) => {
                      const newCast = [...form.cast];
                      newCast[index].name = e.target.value;
                      setForm(c => ({ ...c, cast: newCast }));
                    }}
                    className="w-full rounded bg-transparent text-sm font-bold text-white outline-none placeholder:text-zinc-600 focus:text-emerald-400"
                  />
                  <input
                    type="text"
                    placeholder="Character"
                    value={actor.character}
                    onChange={(e) => {
                      const newCast = [...form.cast];
                      newCast[index].character = e.target.value;
                      setForm(c => ({ ...c, cast: newCast }));
                    }}
                    className="w-full rounded bg-transparent text-xs text-zinc-400 outline-none placeholder:text-zinc-600 focus:text-emerald-400"
                  />
                  <input
                    type="url"
                    placeholder="Profile Image URL (TMDB)"
                    value={actor.profileUrl}
                    onChange={(e) => {
                      const newCast = [...form.cast];
                      newCast[index].profileUrl = e.target.value;
                      setForm(c => ({ ...c, cast: newCast }));
                    }}
                    className="w-full rounded bg-transparent text-[10px] text-zinc-600 outline-none placeholder:text-zinc-700 focus:text-emerald-400"
                  />
                  <MediaUploadButton
                    folder="profiles"
                    prefix={`${actor.name || "cast"}-${index + 1}`}
                    label="Upload profile image"
                    onUploaded={(uploadedUrl) => {
                      setForm((current) => {
                        const newCast = [...current.cast];
                        if (newCast[index]) {
                          newCast[index] = { ...newCast[index], profileUrl: uploadedUrl };
                        }
                        return { ...current, cast: newCast };
                      });
                    }}
                    className="pt-1"
                  />
                  <details className="mt-1 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                    <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                      Profile details
                    </summary>
                    <div className="mt-3 space-y-2">
                      <textarea
                        placeholder="Short bio"
                        value={actor.bio}
                        onChange={(e) => {
                          const newCast = [...form.cast];
                          newCast[index].bio = e.target.value;
                          setForm(c => ({ ...c, cast: newCast }));
                        }}
                        className="min-h-[72px] w-full rounded border border-[#222222] bg-[#0b0b0b] px-2.5 py-2 text-[10px] leading-5 text-white outline-none placeholder:text-zinc-700 focus:border-emerald-500/40"
                      />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          type="text"
                          placeholder="Birth date"
                          value={actor.birthDate}
                          onChange={(e) => {
                            const newCast = [...form.cast];
                            newCast[index].birthDate = e.target.value;
                            setForm(c => ({ ...c, cast: newCast }));
                          }}
                          className="w-full rounded border border-[#222222] bg-[#0b0b0b] px-2.5 py-2 text-[10px] text-white outline-none placeholder:text-zinc-700 focus:border-emerald-500/40"
                        />
                        <input
                          type="text"
                          placeholder="Birth place"
                          value={actor.birthPlace}
                          onChange={(e) => {
                            const newCast = [...form.cast];
                            newCast[index].birthPlace = e.target.value;
                            setForm(c => ({ ...c, cast: newCast }));
                          }}
                          className="w-full rounded border border-[#222222] bg-[#0b0b0b] px-2.5 py-2 text-[10px] text-white outline-none placeholder:text-zinc-700 focus:border-emerald-500/40"
                        />
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                          Source confidence
                          <input
                            type="number"
                            min="0"
                            max="1"
                            step="0.1"
                            value={actor.sourceConfidence}
                            onChange={(e) => {
                              const newCast = [...form.cast];
                              newCast[index].sourceConfidence = e.target.value;
                              setForm(c => ({ ...c, cast: newCast }));
                            }}
                            className="w-full rounded border border-[#222222] bg-[#0b0b0b] px-2.5 py-2 text-[10px] text-white outline-none placeholder:text-zinc-700 focus:border-emerald-500/40"
                          />
                        </label>
                        <label className="flex items-center gap-2 rounded border border-[#222222] bg-[#0b0b0b] px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                          <input
                            type="checkbox"
                            checked={actor.isIndexable}
                            onChange={(e) => {
                              const newCast = [...form.cast];
                              newCast[index].isIndexable = e.target.checked;
                              setForm(c => ({ ...c, cast: newCast }));
                            }}
                            className="h-3.5 w-3.5 rounded border-[#333] bg-[#111] text-emerald-500 focus:ring-emerald-500/30"
                          />
                          Indexable profile
                        </label>
                      </div>
                      <input
                        type="text"
                        placeholder="TMDB person ID"
                        value={actor.tmdbId}
                        onChange={(e) => {
                          const newCast = [...form.cast];
                          newCast[index].tmdbId = e.target.value;
                          setForm(c => ({ ...c, cast: newCast }));
                        }}
                        className="w-full rounded border border-[#222222] bg-[#0b0b0b] px-2.5 py-2 text-[10px] text-zinc-500 outline-none placeholder:text-zinc-700 focus:border-emerald-500/40"
                      />
                    </div>
                  </details>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newCast = form.cast.filter((_, i) => i !== index);
                    setForm(c => ({ ...c, cast: newCast }));
                  }}
                  className="absolute top-2 right-2 h-5 w-5 rounded-full bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                  title="Remove Actor"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- RELEASE PACKAGES SECTION --- */}
      <div className="rounded-xl border border-[#222222] bg-[#161616]/40 p-4">
        <div className="flex items-center justify-between border-b border-[#222222] pb-3 mb-4">
          <div>
            <h4 className="text-sm font-bold text-zinc-200">Release Variants</h4>
            <p className="text-xs text-zinc-500 mt-0.5">Build the exact source-style block: one heading, then one or more destination buttons underneath it.</p>
          </div>
          <button
            type="button"
            onClick={addReleasePackage}
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-400 hover:bg-sky-500 hover:text-black transition-all"
          >
            + Add Variant
          </button>
        </div>

        {form.releasePackages.length === 0 ? (
          <p className="text-xs text-zinc-600 text-center py-6">No release packages staged yet.</p>
        ) : (
          <div className="space-y-4">
            {form.releasePackages.map((pkg, packageIndex) => {
              const previewTitle = (pkg.title || "").trim() || formatReleasePackageTitle({
                baseTitle: form.title || "Untitled",
                seasonLabel: pkg.seasonLabel || undefined,
                audioLabel: pkg.audioLabel || undefined,
                qualityLabel: pkg.qualityLabel || undefined,
                subtitleLabel: pkg.subtitleLabel || undefined,
                sizeLabel: pkg.sizeLabel || undefined
              });

              return (
                <div key={packageIndex} className="space-y-4 rounded-xl border border-[#222222] bg-[#111111] p-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider">
                        <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-sky-400">{pkg.isActive ? "Active" : "Hidden"}</span>
                        <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-zinc-400">Package {packageIndex + 1}</span>
                      </div>
                      <p className="text-sm font-black text-white">{previewTitle}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateReleasePackage(packageIndex, { isActive: !pkg.isActive })}
                        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:border-sky-500/40 hover:text-sky-300"
                      >
                        {pkg.isActive ? "Hide" : "Show"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeReleasePackage(packageIndex)}
                        className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500 hover:text-white transition-all"
                      >
                        Delete Package
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="grid gap-1.5 text-xs font-semibold text-zinc-500">
                      Display Title
                      <input
                        placeholder="Season 1 (Hindi-English) 480p Esubs [200MB]"
                        value={pkg.title}
                        onChange={(e) => updateReleasePackage(packageIndex, { title: e.target.value })}
                        className="w-full rounded-lg border border-[#222222] bg-[#0c0c0c] px-3 py-2 text-xs text-white outline-none focus:border-sky-500 placeholder:text-zinc-700"
                      />
                    </label>
                    <label className="grid gap-1.5 text-xs font-semibold text-zinc-500">
                      Season Label
                      <input
                        placeholder="Season 1"
                        value={pkg.seasonLabel}
                        onChange={(e) => updateReleasePackage(packageIndex, { seasonLabel: e.target.value })}
                        className="w-full rounded-lg border border-[#222222] bg-[#0c0c0c] px-3 py-2 text-xs text-white outline-none focus:border-sky-500 placeholder:text-zinc-700"
                      />
                    </label>
                    <label className="grid gap-1.5 text-xs font-semibold text-zinc-500">
                      Audio Label
                      <input
                        placeholder="Hindi-English, Dual Audio"
                        value={pkg.audioLabel}
                        onChange={(e) => updateReleasePackage(packageIndex, { audioLabel: e.target.value })}
                        className="w-full rounded-lg border border-[#222222] bg-[#0c0c0c] px-3 py-2 text-xs text-white outline-none focus:border-sky-500 placeholder:text-zinc-700"
                      />
                    </label>
                    <label className="grid gap-1.5 text-xs font-semibold text-zinc-500">
                      Quality Label
                      <input
                        placeholder="480p, 720p x265, 1080p"
                        value={pkg.qualityLabel}
                        onChange={(e) => updateReleasePackage(packageIndex, { qualityLabel: e.target.value })}
                        className="w-full rounded-lg border border-[#222222] bg-[#0c0c0c] px-3 py-2 text-xs text-white outline-none focus:border-sky-500 placeholder:text-zinc-700"
                      />
                    </label>
                    <label className="grid gap-1.5 text-xs font-semibold text-zinc-500">
                      Subtitle Label
                      <input
                        placeholder="Esubs, Subbed, No Subs"
                        value={pkg.subtitleLabel}
                        onChange={(e) => updateReleasePackage(packageIndex, { subtitleLabel: e.target.value })}
                        className="w-full rounded-lg border border-[#222222] bg-[#0c0c0c] px-3 py-2 text-xs text-white outline-none focus:border-sky-500 placeholder:text-zinc-700"
                      />
                    </label>
                    <label className="grid gap-1.5 text-xs font-semibold text-zinc-500">
                      File Size
                      <input
                        placeholder="200MB, 1.2GB"
                        value={pkg.sizeLabel}
                        onChange={(e) => updateReleasePackage(packageIndex, { sizeLabel: e.target.value })}
                        className="w-full rounded-lg border border-[#222222] bg-[#0c0c0c] px-3 py-2 text-xs text-white outline-none focus:border-sky-500 placeholder:text-zinc-700"
                      />
                    </label>
                    <label className="grid gap-1.5 text-xs font-semibold text-zinc-500 lg:col-span-2">
                      Notes
                      <input
                        placeholder="Optional editorial note for this package"
                        value={pkg.notes}
                        onChange={(e) => updateReleasePackage(packageIndex, { notes: e.target.value })}
                        className="w-full rounded-lg border border-[#222222] bg-[#0c0c0c] px-3 py-2 text-xs text-white outline-none focus:border-sky-500 placeholder:text-zinc-700"
                      />
                    </label>
                    <label className="grid gap-1.5 text-xs font-semibold text-zinc-500">
                      Sort Order
                      <input
                        type="number"
                        placeholder="0"
                        value={pkg.sortOrder}
                        onChange={(e) => updateReleasePackage(packageIndex, { sortOrder: parseInt(e.target.value, 10) || 0 })}
                        className="w-full rounded-lg border border-[#222222] bg-[#0c0c0c] px-3 py-2 text-xs text-white outline-none focus:border-sky-500 placeholder:text-zinc-700"
                      />
                    </label>
                  </div>

                  <div className="space-y-3 rounded-lg border border-[#222222] bg-[#0c0c0c] p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Destinations</p>
                      <button
                        type="button"
                        onClick={() => addReleaseDestination(packageIndex)}
                        className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all"
                      >
                        + Add Destination
                      </button>
                    </div>

                    {pkg.destinations.length === 0 ? (
                      <p className="text-[11px] text-zinc-600">Add at least one destination button for this release package.</p>
                    ) : (
                      <div className="space-y-3">
                        {pkg.destinations.map((destination, destinationIndex) => (
                          <div key={destinationIndex} className="grid gap-3 rounded-lg border border-[#222222] bg-[#111111] p-3">
                            <div className="grid gap-3 md:grid-cols-[1.2fr_2fr_1fr_auto]">
                              <label className="grid gap-1 text-[11px] font-semibold text-zinc-500">
                                Button Label
                                <input
                                  placeholder="Episode Links"
                                  value={destination.label}
                                  onChange={(e) => updateReleaseDestination(packageIndex, destinationIndex, { label: e.target.value })}
                                  className="w-full rounded-md border border-[#222222] bg-[#0c0c0c] px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 placeholder:text-zinc-700"
                                />
                              </label>
                              <label className="grid gap-1 text-[11px] font-semibold text-zinc-500">
                                Destination URL
                                <input
                                  required
                                  type="url"
                                  placeholder="https://third-party.example/link"
                                  value={destination.url}
                                  onChange={(e) => updateReleaseDestination(packageIndex, destinationIndex, { url: e.target.value })}
                                  className="w-full rounded-md border border-[#222222] bg-[#0c0c0c] px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 placeholder:text-zinc-700"
                                />
                              </label>
                              <label className="grid gap-1 text-[11px] font-semibold text-zinc-500">
                                Button Type
                                <select
                                  value={destination.type}
                                  onChange={(e) => updateReleaseDestination(packageIndex, destinationIndex, { type: e.target.value as ReleaseDestinationType })}
                                  className="w-full rounded-md border border-[#222222] bg-[#0c0c0c] px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                                >
                                  {DESTINATION_TYPE_PRESETS.map((preset) => (
                                    <option key={preset.value} value={preset.value}>
                                      {preset.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="grid gap-1 text-[11px] font-semibold text-zinc-500">
                                Sort
                                <input
                                  type="number"
                                  placeholder="0"
                                  value={destination.sortOrder}
                                  onChange={(e) => updateReleaseDestination(packageIndex, destinationIndex, { sortOrder: parseInt(e.target.value, 10) || 0 })}
                                  className="w-full rounded-md border border-[#222222] bg-[#0c0c0c] px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 placeholder:text-zinc-700"
                                />
                              </label>
                            </div>
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => removeReleaseDestination(packageIndex, destinationIndex)}
                                className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[11px] font-bold text-red-400 hover:bg-red-500 hover:text-white transition-all"
                              >
                                Remove Destination
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-[#222222] bg-[#0a0a0a] px-4 py-5 text-center">
                    <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-600">Live Preview</p>
                    <div className="mt-3 space-y-3">
                      <p className="text-lg font-medium text-sky-400">{previewTitle}</p>
                      <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em]">
                        {pkg.seasonLabel && <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-zinc-300">{pkg.seasonLabel}</span>}
                        {pkg.audioLabel && <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-zinc-300">{pkg.audioLabel}</span>}
                        {pkg.qualityLabel && <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-emerald-300">{pkg.qualityLabel}</span>}
                        {pkg.subtitleLabel && <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-zinc-300">{pkg.subtitleLabel}</span>}
                        {pkg.sizeLabel && <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">{pkg.sizeLabel}</span>}
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        {pkg.destinations.map((destination, destinationIndex) => {
                          const isBatch = destination.type === "BATCH_ZIP";
                          const isMirror = destination.type === "MIRROR";
                          const isStream = destination.type === "STREAM";
                          const previewButton = isBatch
                            ? "bg-[#ff2e63]"
                            : isStream
                            ? "bg-[#0ea5e9]"
                            : isMirror
                            ? "bg-[#10b981]"
                            : "bg-[#0ea5e9]";
                          return (
                            <span key={`${destination.label}-${destinationIndex}`} className={`inline-flex min-w-[150px] items-center justify-center rounded-xl px-4 py-2.5 text-xs font-black text-white shadow-lg ${previewButton}`}>
                              {destination.label || "Open Link"}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Status Selector */}
      <div className="rounded-xl border border-[#222222] bg-[#111111] px-4 py-3">
        <p className="text-sm font-bold text-zinc-300 mb-2">Publication Status</p>
        <p className="text-xs text-zinc-500 mb-3">Only Published entries are visible on the public site</p>
        <div className="flex gap-2">
          {(["DRAFT", "PUBLISHED", "ARCHIVED"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setForm(c => ({ ...c, status: s }))}
              className={`flex-1 rounded-lg py-2 text-xs font-bold uppercase tracking-widest transition-all ${
                form.status === s
                  ? s === "DRAFT"
                    ? "bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                    : s === "PUBLISHED"
                    ? "bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                    : "bg-zinc-500 text-white"
                  : "bg-[#0c0c0c] border border-[#333] text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"
              }`}
            >
              {s === "DRAFT" ? "🟡 Draft" : s === "PUBLISHED" ? "🟢 Publish" : "⚫ Archive"}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between rounded-xl border border-[#222222] bg-[#111111] px-4 py-3">
        <div>
          <p className="text-sm font-bold text-zinc-300">Feature on Homepage</p>
          <p className="text-xs text-zinc-500 mt-0.5">Pinned movies appear first in the hero carousel</p>
        </div>
        <button
          type="button"
          onClick={() => setForm(c => ({ ...c, isFeatured: !c.isFeatured }))}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
            form.isFeatured ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" : "bg-zinc-700"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${
              form.isFeatured ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center">
        <button
          disabled={isSubmitting}
          className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl bg-emerald-500 px-8 py-3 text-sm font-bold uppercase tracking-[0.1em] text-black shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all hover:bg-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] disabled:cursor-not-allowed disabled:opacity-50"
          type="submit"
        >
          {isSubmitting
            ? "Saving..."
            : form.status === "DRAFT"
            ? (movieId ? "Update Draft" : "Save as Draft")
            : form.status === "PUBLISHED"
            ? (movieId ? "Update & Publish" : "Publish Content")
            : (movieId ? "Update & Archive" : "Archive Content")}
        </button>
        {movieId && onCancelEdit && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl border border-[#222222] bg-[#161616] px-8 py-3 text-sm font-bold uppercase tracking-[0.1em] text-zinc-300 transition-all hover:bg-white/5 hover:text-white"
          >
            Cancel Edit
          </button>
        )}
        {status ? (
          <p className="text-sm font-medium text-emerald-400 animate-in fade-in slide-in-from-bottom-2">
            {status}
          </p>
        ) : null}
      </div>
    </form>
  );
}
