import { Suspense } from "react";
import Link from "next/link";

import { getMovies, getFeaturedMovies, getMovieFacetStats } from "@/lib/api";
import {
  audioFilters,
  genreFilters,
  languageFilters,
  qualityFilters,
  sortFilters,
  typeFilters,
  yearFilters
} from "@/lib/home-facets";
import { MovieCarousel } from "@/components/movie-carousel";
import { MovieCard } from "@/components/movie-card";
import { PaginationControls } from "@/components/pagination-controls";
import { AdUnit } from "@/components/ad-unit";
import { HomeFacetGroup } from "@/components/home-facet-group";
import { SuggestedSearchesRow } from "@/components/suggested-searches-row";
import { getSiteSettings } from "@/server/lib/site-settings";
import { getMonetizationConfig, getMonetizationSlot } from "@/server/lib/monetization";

const PAGE_SIZE = 12;
type HomeHref = Parameters<typeof Link>[0]["href"];

function normalizeFilter(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function buildHomeHref(
  current: Record<string, string | undefined>,
  updates: Record<string, string | undefined>,
  preservePage = false
) : HomeHref {
  const params = new URLSearchParams();
  const keys = ["q", "genre", "language", "year", "type", "audio", "quality", "sort", "page"] as const;

  for (const key of keys) {
    const value = current[key];
    if (value) {
      params.set(key, value);
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
  }

  if (!preservePage) {
    params.delete("page");
  }

  const queryString = params.toString();
  return (queryString ? `/?${queryString}` : "/") as HomeHref;
}

export default async function HomePage({
  searchParams
}: {
  searchParams: {
    page?: string;
    q?: string;
    genre?: string;
    language?: string;
    year?: string;
    type?: string;
    audio?: string;
    quality?: string;
    sort?: string;
  };
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const query = normalizeFilter(searchParams.q);
  const genre = normalizeFilter(searchParams.genre);
  const language = normalizeFilter(searchParams.language);
  const year = normalizeFilter(searchParams.year);
  const type = normalizeFilter(searchParams.type);
  const audio = normalizeFilter(searchParams.audio);
  const quality = normalizeFilter(searchParams.quality);
  const sort = normalizeFilter(searchParams.sort) || "Newest";
  const currentParams = {
    q: query,
    genre,
    language,
    year,
    type,
    audio,
    quality,
    sort,
    page: page > 1 ? String(page) : undefined
  };
  const siteSettingsPromise = getSiteSettings();
  const monetizationConfigPromise = getMonetizationConfig();
  const facetStatsPromise = getMovieFacetStats();
  const siteSettings = await siteSettingsPromise;
  const [{ movies, total }, featuredMovies, monetizationConfig, facetStats] = await Promise.all([
    getMovies(page, PAGE_SIZE, { query, genre, language, year, type, audio, quality, sort }),
    siteSettings.homepageFeaturedEnabled ? getFeaturedMovies() : Promise.resolve([]),
    monetizationConfigPromise,
    facetStatsPromise
  ]);
  const homepageTopSlot = getMonetizationSlot(monetizationConfig, "homepage_top");
  const homepageFeedSlot = getMonetizationSlot(monetizationConfig, "homepage_feed");
  const facetCountLookup = {
    genre: new Map(facetStats.genres.map((item) => [item.value.toLowerCase(), item.count] as const)),
    language: new Map(facetStats.languages.map((item) => [item.value.toLowerCase(), item.count] as const)),
    year: new Map(facetStats.years.map((item) => [item.value.toLowerCase(), item.count] as const)),
    type: new Map(facetStats.types.map((item) => [item.value.toLowerCase(), item.count] as const)),
    audio: new Map(facetStats.audio.map((item) => [item.value.toLowerCase(), item.count] as const)),
    quality: new Map(facetStats.quality.map((item) => [item.value.toLowerCase(), item.count] as const))
  };
  const activeFacetLabel =
    genre ? `Genre: ${genre}` : language ? `Language: ${language}` : year ? `Year: ${year}` : type ? `Type: ${type}` : audio ? `Audio: ${audio}` : quality ? `Quality: ${quality}` : query ? `Search: ${query}` : undefined;
  const suggestedSearches = (() => {
    const baseItems = [
      { label: "Dual Audio", href: buildHomeHref(currentParams, { q: "Dual Audio" }, false), count: facetCountLookup.audio.get("dual audio") ?? 0 },
      { label: "1080p", href: buildHomeHref(currentParams, { q: "1080p" }, false), count: facetCountLookup.quality.get("1080p") ?? 0 },
      { label: "2024", href: buildHomeHref(currentParams, { q: "2024" }, false), count: facetCountLookup.year.get("2024") ?? 0 },
      { label: "Anime", href: buildHomeHref(currentParams, { q: "Anime" }, false), count: facetCountLookup.type.get("anime") ?? 0 },
      { label: "Hindi", href: buildHomeHref(currentParams, { q: "Hindi" }, false), count: facetCountLookup.language.get("hindi") ?? 0 },
      { label: "Thriller", href: buildHomeHref(currentParams, { q: "Thriller" }, false), count: facetCountLookup.genre.get("thriller") ?? 0 }
    ];

    if (genre) {
      return [baseItems[0], baseItems[1], baseItems[5], baseItems[2], baseItems[3], baseItems[4]];
    }

    if (language) {
      return [baseItems[0], baseItems[1], baseItems[2], baseItems[4], baseItems[3], baseItems[5]];
    }

    if (year) {
      return [baseItems[2], baseItems[0], baseItems[1], baseItems[3], baseItems[4], baseItems[5]];
    }

    if (type) {
      return [baseItems[3], baseItems[0], baseItems[1], baseItems[2], baseItems[4], baseItems[5]];
    }

    if (audio) {
      return [baseItems[0], baseItems[1], baseItems[2], baseItems[4], baseItems[3], baseItems[5]];
    }

    if (quality) {
      return [baseItems[1], baseItems[0], baseItems[2], baseItems[3], baseItems[4], baseItems[5]];
    }

    return baseItems;
  })();

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <main className="min-h-screen bg-[#0a0a0a] pb-20">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pt-6 sm:px-6 lg:px-8">
        {siteSettings.announcementText && siteSettings.announcementText.trim() !== "" ? (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            <p className="text-center text-sm font-medium text-emerald-300">{siteSettings.announcementText}</p>
          </div>
        ) : null}

        {siteSettings.homepageFeaturedEnabled ? (
          <Suspense
            fallback={
              <div className="flex h-[520px] items-center justify-center rounded-[1.8rem] border border-[#222222] bg-[#050505]">
                <p className="text-sm text-zinc-600">Loading featured movies…</p>
              </div>
            }
          >
            {featuredMovies.length > 0 ? (
              <MovieCarousel movies={featuredMovies} />
            ) : (
              <div className="flex h-[320px] flex-col items-center justify-center gap-4 rounded-[1.8rem] border border-[#222222] bg-[#050505]">
                <p className="text-[0.72rem] uppercase tracking-[0.3em] text-zinc-600">Featured entry</p>
                <p className="text-2xl font-bold text-zinc-500">No movies added yet</p>
                <Link href="/admin" className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-emerald-400">
                  Add movies in Admin →
                </Link>
              </div>
            )}
          </Suspense>
        ) : (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-[1.8rem] border border-[#222222] bg-[#050505] px-6 py-10 text-center">
            <p className="text-[0.72rem] uppercase tracking-[0.3em] text-zinc-600">Featured section disabled</p>
            <p className="max-w-xl text-2xl font-bold text-white">The featured carousel is turned off from site settings.</p>
            <p className="max-w-2xl text-sm leading-7 text-zinc-500">
              Admins can re-enable it from the System settings panel when the editorial team is ready to promote a hero set again.
            </p>
          </div>
        )}

        {homepageTopSlot.enabled && homepageTopSlot.snippet ? (
          <div className="group relative min-h-[90px] w-full overflow-hidden rounded-[1.4rem] border border-[#222222] bg-[#161616] p-2 md:min-h-[250px]">
            <AdUnit
              htmlScript={homepageTopSlot.snippet}
              className="h-full w-full"
              title={homepageTopSlot.displayName}
              slotKey={homepageTopSlot.slotKey}
              pageGroup={homepageTopSlot.pageGroup}
              providerType={homepageTopSlot.providerType}
            />
          </div>
        ) : null}

        <section id="library" className="space-y-5">
          <div className="flex flex-col gap-4 rounded-[1.4rem] border border-[#222222] bg-[#111111] p-5">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.34em] text-zinc-600">Library</p>
              <h2 className="mt-1 text-2xl font-black text-white">
                {query
                  ? `Search results for "${query}"`
                  : genre || language || year || type || audio || quality
                  ? "Filtered titles"
                  : "All Movies"}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                {total} title{total !== 1 ? "s" : ""}
              </p>
            </div>

            <form action="/" className="grid gap-3 border-t border-[#222222] pt-4">
              <div className="flex flex-wrap items-center gap-3">
                <label className="group flex min-w-[18rem] flex-1 items-center gap-2 rounded-xl border border-[#222222] bg-[#161616] px-3 py-2 transition-all focus-within:border-emerald-500/40">
                  <svg className="h-4 w-4 shrink-0 text-zinc-600 transition-colors group-focus-within:text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  <input
                    aria-label="Search movies"
                    name="q"
                    defaultValue={query}
                    placeholder="Search titles, genres, languages..."
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
                  />
                </label>
                <select
                  name="sort"
                  defaultValue={sort}
                  className="rounded-xl border border-[#222222] bg-[#161616] px-3 py-2 text-sm text-zinc-300 outline-none transition focus:border-emerald-500/40"
                >
                  {sortFilters.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-emerald-400"
                >
                  Search
                </button>
              </div>

              <input type="hidden" name="genre" value={genre || ""} />
              <input type="hidden" name="language" value={language || ""} />
              <input type="hidden" name="year" value={year || ""} />
              <input type="hidden" name="type" value={type || ""} />
              <input type="hidden" name="audio" value={audio || ""} />
              <input type="hidden" name="quality" value={quality || ""} />

              {(query || genre || language || year || type || audio || quality) ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-zinc-600">Active:</span>
                  {query ? (
                    <Link href={buildHomeHref(currentParams, { q: undefined }, false)} className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-emerald-300">
                      Search: {query}
                    </Link>
                  ) : null}
                  {genre ? (
                    <Link href={buildHomeHref(currentParams, { genre: undefined }, false)} className="rounded-xl border border-[#222222] bg-[#161616] px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-zinc-400">
                      Genre: {genre}
                    </Link>
                  ) : null}
                  {language ? (
                    <Link href={buildHomeHref(currentParams, { language: undefined }, false)} className="rounded-xl border border-[#222222] bg-[#161616] px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-zinc-400">
                      Language: {language}
                    </Link>
                  ) : null}
                  {year ? (
                    <Link href={buildHomeHref(currentParams, { year: undefined }, false)} className="rounded-xl border border-[#222222] bg-[#161616] px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-zinc-400">
                      Year: {year}
                    </Link>
                  ) : null}
                  {type ? (
                    <Link href={buildHomeHref(currentParams, { type: undefined }, false)} className="rounded-xl border border-[#222222] bg-[#161616] px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-zinc-400">
                      Type: {type}
                    </Link>
                  ) : null}
                  {audio ? (
                    <Link href={buildHomeHref(currentParams, { audio: undefined }, false)} className="rounded-xl border border-[#222222] bg-[#161616] px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-zinc-400">
                      Audio: {audio}
                    </Link>
                  ) : null}
                  {quality ? (
                    <Link href={buildHomeHref(currentParams, { quality: undefined }, false)} className="rounded-xl border border-[#222222] bg-[#161616] px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-zinc-400">
                      Quality: {quality}
                    </Link>
                  ) : null}
                  <Link href="/" className="rounded-xl border border-[#222222] bg-[#161616] px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-zinc-400 transition-colors hover:border-emerald-500/40 hover:text-emerald-400">
                    Clear all
                  </Link>
                </div>
              ) : null}

              <div className="grid gap-4 border-t border-[#222222] pt-4 lg:grid-cols-2">
                <HomeFacetGroup
                  label="Genre"
                  values={genreFilters}
                  countLookup={facetCountLookup.genre}
                  currentParams={currentParams}
                  param="genre"
                  defaultOpenDesktop
                />
                <HomeFacetGroup
                  label="Language"
                  values={languageFilters}
                  countLookup={facetCountLookup.language}
                  currentParams={currentParams}
                  param="language"
                  defaultOpenDesktop
                />
                <HomeFacetGroup
                  label="Year"
                  values={yearFilters}
                  countLookup={facetCountLookup.year}
                  currentParams={currentParams}
                  param="year"
                />
                <HomeFacetGroup label="Type" values={typeFilters} countLookup={facetCountLookup.type} currentParams={currentParams} param="type" />
                <HomeFacetGroup label="Audio" values={audioFilters} countLookup={facetCountLookup.audio} currentParams={currentParams} param="audio" />
                <HomeFacetGroup label="Quality" values={qualityFilters} countLookup={facetCountLookup.quality} currentParams={currentParams} param="quality" />
              </div>

              {facetStats.popularFilters.length > 0 ? (
                <div className="rounded-[1.1rem] border border-emerald-500/10 bg-emerald-500/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-emerald-300">Popular filters</p>
                      <p className="mt-1 text-xs text-zinc-500">Quick jumps from the catalog’s most common facets.</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {facetStats.popularFilters.map((filter) => (
                      <Link
                        key={`${filter.facet}:${filter.value}`}
                        href={buildHomeHref(currentParams, { [filter.facet]: filter.value }, false)}
                        className="rounded-xl border border-emerald-500/20 bg-black/30 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-emerald-200 transition-colors hover:border-emerald-400/50 hover:text-emerald-100"
                      >
                        {filter.value}
                        <span className="ml-2 rounded-full border border-white/5 bg-white/5 px-1.5 py-0.5 text-[0.55rem] uppercase tracking-[0.12em] text-emerald-100/70">
                          {filter.count}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              <SuggestedSearchesRow
                title="Suggested searches"
                description={
                  activeFacetLabel
                    ? `Shortcuts tuned for your current browse state (${activeFacetLabel}).`
                    : "One-click shortcuts for the kinds of titles people keep looking for."
                }
                items={suggestedSearches}
              />
            </form>
          </div>

          {movies.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {movies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-[1.4rem] border border-[#222222] bg-[#111111]">
              <p className="text-sm text-zinc-600">No movies on this page.</p>
              <Link href="/" className="text-sm text-emerald-400 hover:underline">
                ← Back to page 1
              </Link>
            </div>
          )}

          {siteSettings.homepageFeedEnabled ? (
            <div className="group relative my-8 flex min-h-[90px] w-full items-center justify-center overflow-hidden rounded-xl border border-[#333] bg-[#1a1a1a] text-sm font-bold uppercase tracking-widest text-zinc-600 md:min-h-[250px]">
              {homepageFeedSlot.enabled && homepageFeedSlot.snippet ? (
                <div className="z-10 h-full w-full p-2 relative">
                  <AdUnit
                    htmlScript={homepageFeedSlot.snippet}
                    className="h-full w-full"
                    title={homepageFeedSlot.displayName}
                    slotKey={homepageFeedSlot.slotKey}
                    pageGroup={homepageFeedSlot.pageGroup}
                    providerType={homepageFeedSlot.providerType}
                  />
                </div>
              ) : (
                <>
                  <span className="z-10 transition-colors group-hover:text-emerald-500">Homepage Feed Ad Space</span>
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#111] to-[#222] opacity-50" />
                </>
              )}
            </div>
          ) : null}

          {totalPages > 1 ? (
            <div className="mt-8 flex flex-col items-center justify-center gap-4">
              <Suspense fallback={null}>
                <PaginationControls currentPage={page} totalPages={totalPages} />
              </Suspense>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-zinc-500">
                Page {page} of {totalPages}
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
