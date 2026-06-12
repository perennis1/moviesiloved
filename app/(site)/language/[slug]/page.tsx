import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getMovieFacetStats, getMovies } from "@/lib/api";
import { absolutePublicUrl, compactText } from "@/lib/public-url";
import { MovieCard } from "@/components/movie-card";
import { PaginationControls } from "@/components/pagination-controls";
import { AdUnit } from "@/components/ad-unit";
import { FacetRail } from "@/components/facet-rail";
import { ArchiveSearchPanel } from "@/components/archive-search-panel";
import { SuggestedSearchesRow } from "@/components/suggested-searches-row";
import { getMonetizationConfig, getMonetizationSlot } from "@/server/lib/monetization";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

export async function generateMetadata({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams: { page?: string; q?: string };
}): Promise<Metadata> {
  const decodedLanguage = decodeURIComponent(params.slug);
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const query = searchParams.q?.trim() || undefined;
  const { total } = await getMovies(1, 1, { language: decodedLanguage, query });
  const pageSuffix = page > 1 ? ` - Page ${page}` : "";
  const searchSuffix = query ? ` matching "${query}"` : "";
  const title = `${decodedLanguage} Audio${searchSuffix}${pageSuffix}`;
  const description = compactText(
    `Browse ${total} titles with ${decodedLanguage} audio on Movies I Loved.${query ? ` Searching for "${query}".` : ""}${page > 1 ? ` Page ${page}.` : ""}`
  );
  const canonical = absolutePublicUrl(
    `/language/${encodeURIComponent(decodedLanguage)}${query || page > 1 ? "?" : ""}${query ? `q=${encodeURIComponent(query)}` : ""}${query && page > 1 ? "&" : ""}${page > 1 ? `page=${page}` : ""}`
  );

  return {
    title,
    description,
    alternates: {
      canonical
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title,
      description
    },
    robots: {
      index: true,
      follow: true
    }
  };
}

export default async function LanguagePage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams: { page?: string; q?: string };
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const decodedLanguage = decodeURIComponent(params.slug);
  const query = searchParams.q?.trim() || undefined;
  
  const [{ movies, total }, monetizationConfig, facetStats] = await Promise.all([
    getMovies(page, PAGE_SIZE, { language: decodedLanguage, query }),
    getMonetizationConfig(),
    getMovieFacetStats()
  ]);
  const totalPages = Math.ceil((total || 0) / PAGE_SIZE);
  const archiveInGridSlot = getMonetizationSlot(monetizationConfig, "archive_in_grid");
  const archivePaginationSlot = getMonetizationSlot(monetizationConfig, "archive_near_pagination");
  const pageUrl = absolutePublicUrl(
    `/language/${encodeURIComponent(decodedLanguage)}${query || page > 1 ? "?" : ""}${query ? `q=${encodeURIComponent(query)}` : ""}${query && page > 1 ? "&" : ""}${page > 1 ? `page=${page}` : ""}`
  );
  const archiveSearchBase = `/language/${encodeURIComponent(decodedLanguage)}`;
  const suggestedSearches = [
    { label: "Dual Audio", href: `${archiveSearchBase}?q=Dual%20Audio`, count: facetStats.audio.find((item) => item.value.toLowerCase() === "dual audio")?.count ?? 0 },
    { label: "1080p", href: `${archiveSearchBase}?q=1080p`, count: facetStats.quality.find((item) => item.value.toLowerCase() === "1080p")?.count ?? 0 },
    { label: "2024", href: `${archiveSearchBase}?q=2024`, count: facetStats.years.find((item) => item.value === "2024")?.count ?? 0 },
    { label: "Hindi", href: `${archiveSearchBase}?q=Hindi`, count: facetStats.languages.find((item) => item.value.toLowerCase() === "hindi")?.count ?? 0 }
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${decodedLanguage} Audio`,
    description: compactText(`Browse ${total} titles with ${decodedLanguage} audio on Movies I Loved.`),
    url: pageUrl,
    mainEntity: {
      "@type": "ItemList",
      itemListOrder: "http://schema.org/ItemListOrderAscending",
      numberOfItems: total,
      itemListElement: movies.map((movie, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absolutePublicUrl(`/movies/${movie.slug}`),
        name: `${movie.title} (${movie.releaseYear})`
      }))
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] pb-20 pt-8 sm:pt-12">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        
        {/* Header */}
        <div className="flex flex-col gap-4 rounded-[1.4rem] border border-[#222222] bg-[#111111] p-5">
          <div>
            <div className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.34em] text-zinc-600">
              <Link href="/" className="hover:text-emerald-400">Home</Link>
              <span>/</span>
              <span>Language</span>
            </div>
            <h2 className="mt-2 text-3xl font-black text-emerald-400 capitalize">{decodedLanguage} Audio</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {total} title{total !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <ArchiveSearchPanel
          title="Search within this language"
          description={`Search the ${decodedLanguage} archive without leaving the page.`}
          baseHref={`/language/${encodeURIComponent(decodedLanguage)}`}
          currentQuery={query}
          currentLabel={`Language: ${decodedLanguage}`}
          total={total}
          resultLabel={`${decodedLanguage} titles`}
        />

        <SuggestedSearchesRow
          title="Suggested searches"
          description="Quick shortcuts for common language and release terms."
          items={suggestedSearches}
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <FacetRail
            title="More languages"
            description="Browse titles by audio and language group."
            currentValue={decodedLanguage}
            items={facetStats.languages}
            buildHref={(value) => `/language/${encodeURIComponent(value)}`}
          />
          <FacetRail
            title="Popular genres"
            description="Move into the most common title categories."
            items={facetStats.genres}
            buildHref={(value) => `/genre/${encodeURIComponent(value)}`}
          />
          <FacetRail
            title="Browse years"
            description="Jump by release year without leaving the archive flow."
            items={facetStats.years}
            buildHref={(value) => `/year/${encodeURIComponent(value)}`}
          />
        </div>

        {/* Movie grid */}
        {movies.length > 0 ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {movies.map((movie, index) => (
                <div key={movie.id} className="contents">
                  <MovieCard movie={movie} />
                  {index === 5 && archiveInGridSlot.enabled && archiveInGridSlot.snippet ? (
                    <div
                      key={`${movie.id}-archive-ad`}
                      className="col-span-full rounded-[1.35rem] border border-[#222222] bg-[#161616] p-2"
                    >
                      <AdUnit
                        htmlScript={archiveInGridSlot.snippet}
                        className="w-full"
                        title={archiveInGridSlot.displayName}
                        slotKey={archiveInGridSlot.slotKey}
                        pageGroup={archiveInGridSlot.pageGroup}
                        providerType={archiveInGridSlot.providerType}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-[1.4rem] border border-[#222222] bg-[#111111]">
            <p className="text-sm text-zinc-600">No movies found in this language.</p>
            <Link href="/" className="text-sm text-emerald-400 hover:underline">← Back to home</Link>
          </div>
        )}

        {/* Pagination */}
        {archivePaginationSlot.enabled && archivePaginationSlot.snippet ? (
          <div className="rounded-[1.35rem] border border-[#222222] bg-[#161616] p-2">
            <AdUnit
              htmlScript={archivePaginationSlot.snippet}
              className="w-full"
              title={archivePaginationSlot.displayName}
              slotKey={archivePaginationSlot.slotKey}
              pageGroup={archivePaginationSlot.pageGroup}
              providerType={archivePaginationSlot.providerType}
            />
          </div>
        ) : null}
        {totalPages > 1 && (
          <div className="mt-8 flex flex-col items-center justify-center gap-4">
            <Suspense fallback={null}>
              <PaginationControls currentPage={page} totalPages={totalPages} />
            </Suspense>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Page {page} of {totalPages}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
