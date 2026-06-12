import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getMovie, getMovieFacetStats, getMovies } from "@/lib/api";
import { normalizeReleasePackages } from "@/lib/release-packages";
import { absolutePublicUrl, compactText, truncateText } from "@/lib/public-url";
import { formatSeasonTrailerTitle } from "@/lib/season-trailers";
import { getMonetizationConfig, getMonetizationSlot } from "@/server/lib/monetization";
import { CommentsSection } from "@/components/comments-section";
import { ViewTracker } from "@/components/view-tracker";
import { AdUnit } from "@/components/ad-unit";
import { FacetRail } from "@/components/facet-rail";

const SIDEBAR_CATEGORIES = [
  "Action", "Youtube Premium", "Year", "Western Drama Series", "Western", 
  "Web Series", "War Series", "War", "Vietnamese", "UrduFlix", "Uncategorized", 
  "Ukrainian", "TV Shows By Network", "TV Shows By Genre", "TV Series", 
  "Turkish", "Thriller Series", "Thriller", "The CW", "Thai", 
  "Teen Drama Series", "Tagalog", "Syfy", "Swedish", "Swahili", 
  "Starz", "Sport Series", "Sports"
];

function getTrailerEmbedUrl(trailerUrl: string | null): string | null {
  if (!trailerUrl) {
    return null;
  }

  try {
    const parsed = new URL(trailerUrl);
    const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();

    if (host === "youtu.be") {
      const videoId = parsed.pathname.split("/").filter(Boolean)[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      const videoId = parsed.searchParams.get("v");
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }

      const embedPath = parsed.pathname.match(/^\/embed\/([A-Za-z0-9_-]+)/i);
      if (embedPath?.[1]) {
        return `https://www.youtube.com/embed/${embedPath[1]}`;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function buildMovieDescription(movie: {
  title: string;
  synopsis: string | null;
  releaseYear: string;
  contentType: string;
}) {
  const synopsis = truncateText(movie.synopsis, 160);
  const kind = movie.contentType === "MOVIE" ? "movie" : "series";

  if (synopsis) {
    return `${synopsis} Watch the trailer, season trailers, cast, and release packages for this ${kind} on Movies I Loved.`;
  }

  return `Watch the trailer, season trailers, cast, and release packages for ${movie.title} (${movie.releaseYear}) on Movies I Loved.`;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const { movie } = await getMovie(params.slug);

    if (!movie) {
      return {
        title: "Movie not found",
        description: "The requested title could not be found on Movies I Loved."
      };
    }

    const canonicalUrl = absolutePublicUrl(`/movies/${movie.slug}`);
    const imageUrl = movie.backdropUrl || movie.posterUrl || null;
    const description = buildMovieDescription(movie);
    const title = `${movie.title} (${movie.releaseYear})`;

    return {
      title,
      description,
      alternates: {
        canonical: canonicalUrl
      },
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        type: "website",
        images: imageUrl ? [{ url: imageUrl, alt: movie.title }] : undefined
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: imageUrl ? [imageUrl] : undefined
      },
      robots: {
        index: true,
        follow: true
      }
    };
  } catch {
    return {
      title: "Movies I Loved",
      description: "Browse trailers, release packages, and seasonal trailer cards for movies and series."
    };
  }
}

export default async function MoviePage({ params }: { params: { slug: string } }) {
  try {
    const [{ movie }, monetizationConfig] = await Promise.all([
      getMovie(params.slug),
      getMonetizationConfig()
    ]);
    const facetStats = await getMovieFacetStats();
    const releasePackages = normalizeReleasePackages(movie.title, movie.releasePackages, movie.watchLinks).filter((pkg) => pkg.isActive);
    const seasonTrailers = (movie.seasonTrailers || []).filter((trailer) => trailer.isActive).sort((left, right) => left.sortOrder - right.sortOrder);
    const sidebarSlot = getMonetizationSlot(monetizationConfig, "movie_sidebar_desktop");
    const afterSynopsisSlot = getMonetizationSlot(monetizationConfig, "movie_after_synopsis");
    const trailerEmbedUrl = getTrailerEmbedUrl(movie.trailerUrl);
    const pageUrl = absolutePublicUrl(`/movies/${movie.slug}`);
    const posterUrl = movie.backdropUrl || movie.posterUrl || null;
    const primaryGenre = movie.genres[0]?.genre.name ?? null;
    const [genreMatches, yearMatches] = await Promise.all([
      primaryGenre ? getMovies(1, 8, { genre: primaryGenre }) : Promise.resolve({ movies: [], total: 0 }),
      movie.releaseYear ? getMovies(1, 8, { year: movie.releaseYear }) : Promise.resolve({ movies: [], total: 0 })
    ]);
    const relatedMovies = Array.from(
      new Map(
        [...genreMatches.movies, ...yearMatches.movies]
          .filter((candidate) => candidate.slug !== movie.slug)
          .map((candidate) => [candidate.slug, candidate] as const)
      ).values()
    ).slice(0, 6);
    const structuredData = {
      "@context": "https://schema.org",
      "@type": movie.contentType === "MOVIE" ? "Movie" : "TVSeries",
      name: movie.title,
      description: compactText(movie.synopsis) || `${movie.title} (${movie.releaseYear}) on Movies I Loved.`,
      url: pageUrl,
      image: posterUrl ? [posterUrl] : undefined,
      datePublished: movie.releaseYear,
      genre: movie.genres.map((item) => item.genre.name),
      director: movie.director
        ? movie.director
            .split(",")
            .map((name) => name.trim())
            .filter(Boolean)
            .map((name) => ({ "@type": "Person", name }))
        : undefined,
      actor: movie.castMembers
        .slice(0, 5)
        .map((member) => member.actor.name)
        .filter(Boolean)
        .map((name) => ({ "@type": "Person", name })),
      trailer: movie.trailerUrl
        ? {
            "@type": "VideoObject",
            name: `${movie.title} trailer`,
            description: `${movie.title} trailer on Movies I Loved`,
            url: movie.trailerUrl,
            embedUrl: trailerEmbedUrl || movie.trailerUrl,
            thumbnailUrl: posterUrl ? [posterUrl] : undefined
          }
        : undefined
    };

    return (
      <main className="min-h-screen pb-16 pt-6 sm:pb-20 sm:pt-8">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        <ViewTracker movieId={movie.id} />
        <div className="mx-auto max-w-[85rem] px-4 sm:px-6 lg:px-8">
          
          <div className="grid gap-8 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px]">
            
            {/* ── LEFT COLUMN: MAIN CONTENT ── */}
            <div className="space-y-6 min-w-0">
              
              {/* Breadcrumb & Title */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-zinc-500">
                  <Link href="/" className="hover:text-emerald-400">Home</Link>
                  <span>/</span>
                  <Link href="/#library" className="hover:text-emerald-400">
                    {movie.contentType === "WEB_SERIES" || movie.contentType === "SERIES" 
                      ? "Web Series" 
                      : movie.contentType === "ANIME" 
                      ? "Anime" 
                      : "Movies"}
                  </Link>
                  <span>/</span>
                  <span className="text-zinc-300">{movie.title}</span>
                </div>
                
                <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl md:text-5xl">
                  {movie.title} ({movie.releaseYear})
                </h1>
                
                <div className="flex items-center gap-4 text-xs font-medium text-zinc-500">
                  <span className="flex items-center gap-1.5">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                    {movie.releaseYear}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    {movie.reviews.length} Comments
                  </span>
                </div>
              </div>

              {/* Cover Image & Info Box */}
              <div className="relative overflow-hidden rounded-[1.2rem] border border-[#222222] bg-[#161616] flex flex-col shadow-2xl">
                
                {/* Background Poster/Backdrop */}
                <div className="relative w-full aspect-video">
                  <div 
                    className="absolute inset-0 bg-cover bg-top bg-no-repeat opacity-50 transition-transform duration-700 hover:scale-105" 
                    style={{ backgroundImage: `url(${movie.backdropUrl || movie.posterUrl})` }}
                  />
                  <div className="absolute inset-0 bg-[#0a0a0a] -z-10" />
                  
                  {/* Vignette Gradient from bottom to top */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#161616] via-[#161616]/60 to-transparent" />
                </div>
                
                {/* Content Overlay overlapping the image */}
                <div className="relative z-10 px-5 pb-5 sm:px-8 sm:pb-8 w-full -mt-20 sm:-mt-32">
                  <div className="space-y-4 max-w-4xl">
                    <div>
                      <h2 className="text-3xl font-black text-white sm:text-4xl tracking-tight leading-none drop-shadow-lg">
                        {movie.title} <span className="text-zinc-400 font-medium">({movie.releaseYear})</span>
                      </h2>
                      <p className="mt-3 text-xs font-bold text-emerald-400 uppercase tracking-[0.2em] drop-shadow-md">
                        {movie.genres.map(g => g.genre.name).join(" • ")}
                      </p>
                    </div>
                    
                    {/* Rating & Synopsis Block */}
                    <div className="flex flex-col gap-5 py-3 max-w-4xl">
                      <div className="flex flex-wrap items-center gap-x-12 gap-y-4">
                        {movie.imdbRating && (
                          <div className="flex items-center gap-4">
                            <div className="flex-shrink-0 relative flex h-16 w-16 items-center justify-center sm:h-20 sm:w-20">
                              <svg className="absolute inset-0 h-full w-full text-[#F5C518] drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                              </svg>
                              <span className="relative z-10 mt-1 text-lg font-black text-black sm:text-xl">
                                {movie.imdbRating}
                              </span>
                            </div>
                            <p className="text-sm text-zinc-300">
                              <strong className="text-white">IMDb:</strong> {movie.imdbRating} / 10
                              {movie.imdbRatingCount && <span className="block text-xs text-zinc-400">from {movie.imdbRatingCount} users</span>}
                            </p>
                          </div>
                        )}

                        {movie.tmdbRating && (
                          <div className="flex items-center gap-4">
                            <div className="flex-shrink-0 relative flex h-16 w-16 items-center justify-center sm:h-20 sm:w-20">
                              <svg className="absolute inset-0 h-full w-full text-sky-500 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                              </svg>
                              <span className="relative z-10 mt-1 text-lg font-black text-white sm:text-xl">
                                {movie.tmdbRating}
                              </span>
                            </div>
                            <p className="text-sm text-zinc-300">
                              <strong className="text-white">TMDB:</strong> {movie.tmdbRating} / 10
                              {movie.tmdbRatingCount && <span className="block text-xs text-zinc-400">from {movie.tmdbRatingCount} users</span>}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex flex-col gap-2">
                        <p className="text-sm leading-relaxed text-zinc-200 drop-shadow-md">
                          {movie.synopsis || "No synopsis available for this title."}
                        </p>
                        
                        <div className="mt-2 space-y-1 text-xs text-zinc-300">
                          <p>
                            <strong className="text-white">Director:</strong> {movie.director || "N/A"}
                          </p>
                          <p>
                            <strong className="text-white">Actors:</strong> {movie.castMembers.length > 0 
                                ? movie.castMembers.slice(0, 4).map(c => c.actor.name).join(", ")
                                : "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Title highlight text */}
              <div className="text-center">
                <h3 className="text-lg font-bold text-sky-500 sm:text-xl">
                  Watch {movie.title} ({movie.releaseYear}) High Quality - Movies I Loved
                </h3>
              </div>

              {/* Series Info List */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-emerald-500">
                  {movie.contentType === "SERIES" || movie.contentType === "WEB_SERIES" || movie.contentType === "ANIME" ? "Series Info:" : "Movie Info:"}
                </h3>
                <ul className="list-inside list-square space-y-1.5 text-sm text-zinc-300 marker:text-zinc-600">
                  <li><strong className="text-zinc-500">Full Name:</strong> {movie.title}</li>
                  {(movie.contentType === "SERIES" || movie.contentType === "WEB_SERIES" || movie.contentType === "ANIME") && (
                    <>
                      {movie.seasons && <li><strong className="text-zinc-500">Season:</strong> {movie.seasons}</li>}
                      {movie.episodes && <li><strong className="text-zinc-500">Episodes:</strong> {movie.episodes}</li>}
                      {movie.language && <li><strong className="text-zinc-500">Language:</strong> {movie.language}</li>}
                      {movie.subtitles && <li><strong className="text-zinc-500">Subtitles:</strong> {movie.subtitles}</li>}
                    </>
                  )}
                  <li><strong className="text-zinc-500">Release Year:</strong> {movie.releaseYear}</li>
                  {(movie.contentType === "SERIES" || movie.contentType === "WEB_SERIES" || movie.contentType === "ANIME") && movie.episodeSize && (
                    <li><strong className="text-zinc-500">Size:</strong> {movie.episodeSize}</li>
                  )}
                  <li><strong className="text-zinc-500">Genres:</strong> {movie.genres.map(g => g.genre.name).join(", ")}</li>
                  <li>
                    <strong className="text-zinc-500">Quality:</strong>{" "}
                    <span className="font-bold text-emerald-400">{movie.releaseQuality}</span>
                  </li>
                  <li><strong className="text-zinc-500">Format:</strong> {movie.releaseFormat}</li>
                </ul>
              </div>

              {/* Storyline */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-emerald-500">Storyline:</h3>
                <p className="leading-relaxed text-zinc-400">
                  {movie.synopsis || "No synopsis available for this title."}
                </p>
              </div>

              {movie.trailerUrl ? (
                <div className="space-y-4 rounded-[1.2rem] border border-[#222222] bg-[#161616] p-4 sm:p-5 shadow-lg">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-wider text-white">Trailer</h3>
                      <p className="mt-1 text-xs text-zinc-500">Official trailer preview for this title.</p>
                    </div>
                    <a
                      href={movie.trailerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 transition-all hover:border-sky-500/40 hover:text-sky-300"
                    >
                      Watch on YouTube
                    </a>
                  </div>
                  {trailerEmbedUrl ? (
                    <div className="overflow-hidden rounded-[1rem] border border-[#222222] bg-black">
                      <div className="relative aspect-video">
                        <iframe
                          src={trailerEmbedUrl}
                          title={`${movie.title} trailer`}
                          className="absolute inset-0 h-full w-full"
                          loading="lazy"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[1rem] border border-[#222222] bg-[#0d0d0d] px-4 py-4 text-sm text-zinc-400">
                      Trailer link saved, but this player only auto-embeds YouTube URLs. Use the YouTube button above to open it directly.
                    </div>
                  )}
                </div>
              ) : null}

              {seasonTrailers.length > 0 ? (
                <div className="space-y-4 rounded-[1.2rem] border border-[#222222] bg-[#161616] p-4 sm:p-5 shadow-lg">
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-wider text-white">Season Trailers</h3>
                    <p className="mt-1 text-xs text-zinc-500">Trailer cards for individual seasons of this series.</p>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {seasonTrailers.map((trailer) => {
                      const embedUrl = getTrailerEmbedUrl(trailer.url);
                      const trailerTitle = formatSeasonTrailerTitle(trailer.seasonLabel, trailer.title);

                      return (
                        <div key={trailer.id} className="space-y-3 rounded-[1rem] border border-[#222222] bg-black/20 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">{trailer.seasonLabel}</p>
                              <h4 className="mt-1 text-base font-bold text-sky-300">{trailerTitle}</h4>
                            </div>
                            <a
                              href={trailer.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-300 transition-all hover:border-sky-500/40 hover:text-sky-300"
                            >
                              Open Video
                            </a>
                          </div>

                          {embedUrl ? (
                            <div className="overflow-hidden rounded-[0.9rem] border border-[#222222] bg-black">
                              <div className="relative aspect-video">
                                <iframe
                                  src={embedUrl}
                                  title={trailerTitle}
                                  className="absolute inset-0 h-full w-full"
                                  loading="lazy"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                  allowFullScreen
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-[0.9rem] border border-[#222222] bg-[#0d0d0d] px-4 py-4 text-sm text-zinc-400">
                              This season trailer is saved as a link only. Use the Open Video button to watch it.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {afterSynopsisSlot.enabled && afterSynopsisSlot.snippet ? (
                <div className="rounded-[1.2rem] border border-[#222222] bg-[#161616] p-2 shadow-lg">
                  <AdUnit
                    htmlScript={afterSynopsisSlot.snippet}
                    className="w-full"
                    title={afterSynopsisSlot.displayName}
                    slotKey={afterSynopsisSlot.slotKey}
                    pageGroup={afterSynopsisSlot.pageGroup}
                    providerType={afterSynopsisSlot.providerType}
                  />
                </div>
              ) : null}

              {/* Screenshots Gallery */}
              {movie.screenshots && movie.screenshots.length > 0 && (
                <div className="space-y-3 pt-4">
                  <h3 className="text-lg font-bold text-emerald-500">Screenshots:</h3>
                  <div className="flex flex-col gap-4">
                    {movie.screenshots.map((url, idx) => (
                      <div key={idx} className="relative w-full overflow-hidden border border-[#222222] bg-[#111] rounded-sm">
                        <img 
                          src={url} 
                          alt={`Screenshot ${idx + 1}`}
                          className="h-auto w-full object-contain"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Release Packages Section */}
              <div className="border-t border-[#222222] pt-8 pb-4">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-black text-sky-500 tracking-tight sm:text-3xl drop-shadow-[0_0_15px_rgba(14,165,233,0.3)]">
                    Release Packages for {movie.title} ({movie.releaseYear})
                  </h2>
                </div>

                {releasePackages.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-[#222222] bg-[#161616]/40 p-8 text-center max-w-2xl mx-auto">
                    <svg className="h-10 w-10 text-zinc-600 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>
                    <h3 className="text-base font-bold text-zinc-300">Release packages staging</h3>
                    <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                      Our editorial team is currently indexing active release packages for this title. Join our Telegram for release updates and requests.
                    </p>
                    <div className="mt-4 flex justify-center">
                      <a 
                        href="https://t.me/" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center gap-2 rounded-xl bg-[#2AABEE] hover:bg-[#2298d6] transition px-5 py-2 text-xs font-bold text-white uppercase tracking-wider shadow-lg shadow-[#2AABEE]/20"
                      >
                        Join Telegram Channel
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 max-w-4xl mx-auto">
                    <div className="space-y-6 mt-2">
                      {releasePackages.map((pkg) => (
                        <div key={pkg.id} className="space-y-4 rounded-[1.4rem] border border-[#222222] bg-[#161616]/60 px-5 py-6 shadow-lg sm:px-6">
                          <div className="space-y-4 text-center">
                            <div className="space-y-2">
                              <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">
                                <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-zinc-400">
                                  {pkg.isActive ? "Visible on site" : "Hidden"}
                                </span>
                                {pkg.seasonLabel && <span>{pkg.seasonLabel}</span>}
                              </div>
                              <h3 className="text-xl font-medium text-sky-400 sm:text-2xl">{pkg.title}</h3>
                              {pkg.notes && <p className="mx-auto max-w-2xl text-sm text-zinc-400">{pkg.notes}</p>}
                            </div>

                            <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em]">
                              {pkg.audioLabel && <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-zinc-300">{pkg.audioLabel}</span>}
                              {pkg.qualityLabel && <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-emerald-300">{pkg.qualityLabel}</span>}
                              {pkg.subtitleLabel && <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-zinc-300">{pkg.subtitleLabel}</span>}
                              {pkg.sizeLabel && <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">{pkg.sizeLabel}</span>}
                            </div>

                            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                              {pkg.destinations.map((destination) => {
                                const isBatch = destination.type === "BATCH_ZIP";
                                const isMirror = destination.type === "MIRROR";
                                const isStream = destination.type === "STREAM";
                                const buttonStyle = isBatch
                                  ? "bg-[#ff2e63] hover:bg-[#ff1453] shadow-[0_0_15px_rgba(255,46,99,0.3)]"
                                  : isStream
                                  ? "bg-[#0ea5e9] hover:bg-[#0284c7] shadow-[0_0_15px_rgba(14,165,233,0.3)]"
                                  : isMirror
                                  ? "bg-[#10b981] hover:bg-[#059669] shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                                  : "bg-[#0ea5e9] hover:bg-[#0284c7] shadow-[0_0_15px_rgba(14,165,233,0.3)]";

                                return (
                                  <a
                                    key={destination.id}
                                    href={`/verify/${destination.id}`}
                                    className={`group inline-flex min-w-[180px] items-center justify-center gap-3 rounded-xl border border-black/10 px-5 py-3.5 transition-all duration-300 hover:scale-[1.01] ${buttonStyle}`}
                                  >
                                    <span className="text-base font-black text-white">{destination.label}</span>
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>



              <div className="rounded-[1.2rem] border border-[#222222] bg-[#161616] p-5 lg:p-6 shadow-lg">
                <div className="flex flex-col gap-3 border-b border-white/8 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-wider text-white">Keep browsing</h3>
                    <p className="mt-1 text-xs text-zinc-500">
                      Jump to the most relevant parts of the catalog after this title.
                    </p>
                  </div>
                  <a
                    href="#comments"
                    className="rounded-xl border border-[#222222] bg-[#0f0f0f] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-300 transition hover:border-emerald-500/40 hover:text-emerald-400"
                  >
                    Read comments
                  </a>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <FacetRail
                    title="Genres"
                    description="Jump to related genres from the wider catalog."
                    currentValue={primaryGenre || undefined}
                    items={facetStats.genres}
                    buildHref={(value) => `/genre/${encodeURIComponent(value)}`}
                  />
                  <FacetRail
                    title="Languages"
                    description="Move into titles with the same language group."
                    currentValue={movie.language || undefined}
                    items={facetStats.languages}
                    buildHref={(value) => `/language/${encodeURIComponent(value)}`}
                  />
                  <FacetRail
                    title="Years"
                    description="Browse nearby release years without leaving the title flow."
                    currentValue={movie.releaseYear}
                    items={facetStats.years}
                    buildHref={(value) => `/year/${encodeURIComponent(value)}`}
                  />
                </div>
              </div>

              {/* Cast Section */}
              <div className="mt-8 rounded-[1.2rem] border border-[#222222] bg-[#161616] p-5 lg:p-6 shadow-lg">
                <h3 className="text-lg font-black uppercase tracking-wider text-white mb-5">Full Cast</h3>
                {movie.castMembers.length > 0 ? (
                  <div className="flex overflow-x-auto gap-4 pb-4 snap-x scrollbar-thin scrollbar-thumb-[#333] scrollbar-track-transparent">
                    {movie.castMembers.map((member) => (
                      member.actor.slug ? (
                        <Link
                          key={member.actor.id}
                          href={`/cast/${member.actor.slug}` as Route}
                          className="group flex min-w-[130px] max-w-[130px] flex-col items-center gap-3 rounded-2xl border border-[#222222] bg-[#0c0c0c] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/40 hover:bg-[#111] hover:shadow-xl snap-start"
                        >
                          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-[#333] bg-[#161616] shadow-inner transition-transform duration-500 group-hover:scale-105">
                            {member.actor.profileUrl ? (
                              <img src={member.actor.profileUrl} alt={member.actor.name} className="h-full w-full object-cover" loading="lazy" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-[#111] text-[10px] font-bold text-zinc-600">N/A</div>
                            )}
                          </div>
                          <div className="flex w-full flex-col text-center">
                            <strong className="truncate text-sm font-bold text-zinc-200" title={member.actor.name}>{member.actor.name}</strong>
                            {member.character && <span className="truncate text-[11px] font-medium text-zinc-500 mt-0.5" title={member.character}>{member.character}</span>}
                            <span className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400 opacity-0 transition group-hover:opacity-100">
                              View profile
                            </span>
                          </div>
                        </Link>
                      ) : (
                        <div key={member.actor.id} className="group flex min-w-[130px] max-w-[130px] flex-col items-center gap-3 rounded-2xl border border-[#222222] bg-[#0c0c0c] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#444] hover:bg-[#111] hover:shadow-xl snap-start">
                          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-[#333] bg-[#161616] shadow-inner transition-transform duration-500 group-hover:scale-105">
                            {member.actor.profileUrl ? (
                              <img src={member.actor.profileUrl} alt={member.actor.name} className="h-full w-full object-cover" loading="lazy" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-[#111] text-[10px] font-bold text-zinc-600">N/A</div>
                            )}
                          </div>
                          <div className="flex w-full flex-col text-center">
                            <strong className="truncate text-sm font-bold text-zinc-200" title={member.actor.name}>{member.actor.name}</strong>
                            {member.character && <span className="truncate text-[11px] font-medium text-zinc-500 mt-0.5" title={member.character}>{member.character}</span>}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-600">No cast added yet.</p>
                )}
              </div>

              {/* Comments Section */}
              <div className="mt-8 rounded-[1.2rem] border border-[#222222] bg-[#161616] p-5 lg:p-6 shadow-lg">
                <CommentsSection comments={movie.reviews} targetId={movie.id} />
              </div>

              {/* Discovery Rail */}
              <div className="mt-8 rounded-[1.2rem] border border-[#222222] bg-[#161616] p-5 lg:p-6 shadow-lg">
                <div className="flex flex-col gap-3 border-b border-white/8 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-wider text-white">More to explore</h3>
                    <p className="mt-1 text-xs text-zinc-500">
                      More titles from {primaryGenre || "this catalog"} and the same {movie.releaseYear} release window.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {primaryGenre ? (
                      <Link
                        href={`/genre/${encodeURIComponent(primaryGenre)}`}
                        className="rounded-xl border border-[#222222] bg-[#0f0f0f] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-300 transition hover:border-emerald-500/40 hover:text-emerald-400"
                      >
                        Browse {primaryGenre}
                      </Link>
                    ) : null}
                    <Link
                      href={`/year/${encodeURIComponent(movie.releaseYear)}`}
                      className="rounded-xl border border-[#222222] bg-[#0f0f0f] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-300 transition hover:border-emerald-500/40 hover:text-emerald-400"
                    >
                      More from {movie.releaseYear}
                    </Link>
                  </div>
                </div>

                {relatedMovies.length > 0 ? (
                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                    {relatedMovies.map((related) => (
                      <Link
                        key={related.id}
                        href={`/movies/${related.slug}`}
                        className="group rounded-[1rem] border border-[#222222] bg-[#0f0f0f] p-3 transition hover:-translate-y-1 hover:border-emerald-500/30"
                      >
                        <div className="relative aspect-[2/3] overflow-hidden rounded-[0.8rem] bg-[#151515]">
                          {related.posterUrl ? (
                            <img
                              src={related.posterUrl}
                              alt={related.title}
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-zinc-600">No poster</div>
                          )}
                        </div>
                        <p className="mt-3 truncate text-sm font-semibold text-white">{related.title}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                          {related.releaseYear} · {related.genreNames.slice(0, 2).join(", ") || "Catalog"}
                        </p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[1rem] border border-white/8 bg-white/[0.03] px-4 py-5 text-sm text-zinc-400">
                    Related titles will appear here once the catalog has more same-genre or same-year matches.
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT COLUMN: SIDEBAR ── */}
            <div className="space-y-6">
              
              {/* Search Box */}
              <div className="rounded-[1.2rem] border border-[#222222] bg-[#161616] p-5">
                <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Search Movies</h3>
                <form action="/">
                  <label className="flex items-center gap-2 rounded-lg border border-[#222222] bg-[#0a0a0a] px-3 py-2 focus-within:border-emerald-500/50">
                    <input 
                      type="text"
                      name="q"
                      placeholder="What are you looking for?"
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
                    />
                    <svg className="h-4 w-4 text-zinc-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  </label>
                </form>
              </div>

              {/* Join Channel Box */}
              <div className="rounded-[1.2rem] border border-[#222222] bg-[#161616] p-5 text-center">
                <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Join Us On Telegram</h3>
                <a
                  href="https://t.me/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl border border-[#2AABEE]/30 bg-[#2AABEE]/10 px-4 py-3 text-sm font-bold text-[#2AABEE] transition-all hover:border-[#2AABEE] hover:bg-[#2AABEE] hover:text-white hover:shadow-[0_0_20px_rgba(42,171,238,0.4)]"
                >
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.892-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                  Telegram Channel
                </a>
              </div>

              {/* Categories Box */}
              <div className="rounded-[1.2rem] border border-[#222222] bg-[#161616] p-5">
                <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {SIDEBAR_CATEGORIES.map(cat => (
                    <Link
                      key={cat} 
                      href={`/?q=${encodeURIComponent(cat)}`}
                      className="cursor-pointer rounded-sm border-b-2 border-r-2 border-[#111111] bg-[#444] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-[#555]"
                      style={{ borderBottomColor: '#222', borderRightColor: '#222' }}
                    >
                      {cat}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Sidebar Ad Unit (Sticky) */}
              <div className="sticky top-8">
                <div className="min-h-[250px] rounded-[1.2rem] border border-[#222222] bg-[#161616] p-2 flex items-center justify-center relative overflow-hidden group">
                  {sidebarSlot.enabled && sidebarSlot.snippet ? (
                    <AdUnit
                      htmlScript={sidebarSlot.snippet}
                      className="w-full h-full"
                      title={sidebarSlot.displayName}
                      slotKey={sidebarSlot.slotKey}
                      pageGroup={sidebarSlot.pageGroup}
                      providerType={sidebarSlot.providerType}
                    />
                  ) : (
                    <>
                      <span className="z-10 text-xs font-bold uppercase tracking-widest text-zinc-600 group-hover:text-emerald-500 transition-colors">Sidebar Ad Space</span>
                      <div className="absolute inset-0 bg-gradient-to-tr from-[#111] to-[#1a1a1a] opacity-50"></div>
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    );
  } catch {
    notFound();
  }
}
