import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FacetRail } from "@/components/facet-rail";
import { absolutePublicUrl, compactText, truncateText } from "@/lib/public-url";
import { buildCastSummary, shouldIndexCastPage } from "@/lib/cast";
import { prisma } from "@/server/lib/prisma";

export const dynamic = "force-dynamic";

type CastPageMovie = {
  id: string;
  slug: string;
  title: string;
  releaseYear: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  contentType: string;
  isFeatured: boolean;
  synopsis: string | null;
  genres: Array<{ genre: { id: string; name: string } }>;
};

type CastPageMovieWithCast = CastPageMovie & {
  castMembers: Array<{
    actor: {
      id: string;
      slug: string | null;
      name: string;
      profileUrl: string | null;
    };
  }>;
};

type RelatedPerson = {
  id: string;
  slug: string;
  name: string;
  profileUrl: string | null;
  sharedTitles: number;
  filmographyCount: number;
  knownForTitle: string | null;
};

function parseYearValue(value: string) {
  const match = value.match(/\d{4}/);
  return match ? Number(match[0]) : 0;
}

function buildFacetOptions(values: Array<string | null | undefined>) {
  const counts = new Map<string, number>();

  for (const value of values) {
    const normalized = value?.trim();
    if (!normalized) {
      continue;
    }

    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value));
}

async function getCastPage(slug: string) {
  const actor = await prisma.actor.findFirst({
    where: { slug },
    include: {
      castMembers: {
        where: {
          movie: {
            status: "PUBLISHED",
            deletedAt: null
          }
        },
        include: {
          movie: {
            include: {
              genres: {
                include: {
                  genre: true
                }
              },
              castMembers: {
                include: {
                  actor: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!actor?.slug) {
    return null;
  }

  const filmography = actor.castMembers
    .map((member) => member.movie as CastPageMovieWithCast)
    .filter(Boolean)
    .sort((left, right) => {
      const yearDelta = parseYearValue(right.releaseYear) - parseYearValue(left.releaseYear);
      if (yearDelta !== 0) {
        return yearDelta;
      }

      if (left.isFeatured !== right.isFeatured) {
        return left.isFeatured ? -1 : 1;
      }

      return left.title.localeCompare(right.title);
    });

  const summary = actor.bio?.trim() || buildCastSummary(actor.name, filmography.map((movie) => ({
    title: movie.title,
    releaseYear: movie.releaseYear,
    role: null,
    contentType: movie.contentType,
    isFeatured: movie.isFeatured
  })));

  const genres = buildFacetOptions(filmography.flatMap((movie) => movie.genres.map((entry) => entry.genre.name)));
  const years = buildFacetOptions(filmography.map((movie) => movie.releaseYear));
  const relatedPeople = buildRelatedPeople(actor.id, filmography);
  const isIndexable = actor.isIndexable || shouldIndexCastPage({
    hasManualBio: Boolean(actor.bio?.trim()),
    entries: filmography.map((movie) => ({
      title: movie.title,
      releaseYear: movie.releaseYear,
      role: null,
      contentType: movie.contentType,
      isFeatured: movie.isFeatured
    })),
    isTopBilled: true
  });

  return {
    actor,
    filmography,
    summary,
    genres,
    years,
    relatedPeople,
    isIndexable
  };
}

function buildRelatedPeople(actorId: string, filmography: CastPageMovieWithCast[]): RelatedPerson[] {
  const related = new Map<
    string,
    {
      id: string;
      slug: string;
      name: string;
      profileUrl: string | null;
      sharedTitles: number;
      titleNames: Set<string>;
    }
  >();

  for (const movie of filmography) {
    for (const member of movie.castMembers || []) {
      const relatedActor = member.actor;
      if (!relatedActor?.slug || relatedActor.id === actorId) {
        continue;
      }

      const current = related.get(relatedActor.id);
      if (current) {
        current.sharedTitles += 1;
        current.titleNames.add(movie.title);
        continue;
      }

      related.set(relatedActor.id, {
        id: relatedActor.id,
        slug: relatedActor.slug,
        name: relatedActor.name,
        profileUrl: relatedActor.profileUrl,
        sharedTitles: 1,
        titleNames: new Set([movie.title])
      });
    }
  }

  return Array.from(related.values())
    .filter((person) => person.sharedTitles >= 2)
    .map((person) => ({
      id: person.id,
      slug: person.slug,
      name: person.name,
      profileUrl: person.profileUrl,
      sharedTitles: person.sharedTitles,
      filmographyCount: person.titleNames.size,
      knownForTitle: Array.from(person.titleNames)[0] ?? null
    }))
    .sort((left, right) => {
      if (right.sharedTitles !== left.sharedTitles) {
        return right.sharedTitles - left.sharedTitles;
      }

      if (right.filmographyCount !== left.filmographyCount) {
        return right.filmographyCount - left.filmographyCount;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, 6);
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const castPage = await getCastPage(params.slug);

  if (!castPage) {
    return {
      title: "Cast member not found",
      description: "The requested cast profile could not be found on Movies I Loved."
    };
  }

  const canonicalUrl = absolutePublicUrl(`/cast/${castPage.actor.slug}`);
  const imageUrl = castPage.actor.profileUrl || castPage.filmography[0]?.posterUrl || null;
  const description = truncateText(castPage.summary, 160) || `${castPage.actor.name} on Movies I Loved.`;
  const title = `${castPage.actor.name} | Cast`;

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
      type: "profile",
      images: imageUrl ? [{ url: imageUrl, alt: castPage.actor.name }] : undefined
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined
    },
    robots: {
      index: castPage.isIndexable,
      follow: true
    }
  };
}

export default async function CastPage({ params }: { params: { slug: string } }) {
  const castPage = await getCastPage(params.slug);

  if (!castPage) {
    notFound();
  }

  const { actor, filmography, summary, genres, years, relatedPeople, isIndexable } = castPage;
  const topTitles = filmography.slice(0, 4);
  const profileUrl = actor.profileUrl || filmography[0]?.posterUrl || null;
  const factLine = [actor.birthDate?.trim(), actor.birthPlace?.trim()].filter(Boolean).join(" | ");
  const knownForLine = actor.knownFor?.trim() || topTitles.map((movie) => `${movie.title} (${movie.releaseYear})`).join(" | ");

  return (
    <main className="min-h-screen pb-16 pt-6 sm:pb-20 sm:pt-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            name: actor.name,
            url: absolutePublicUrl(`/cast/${actor.slug}`),
            image: profileUrl ? [profileUrl] : undefined,
            description: compactText(summary),
            sameAs: []
          })
        }}
      />
      <div className="mx-auto max-w-[85rem] px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="rounded-[1.4rem] border border-[#222222] bg-[#161616] p-5 shadow-lg sm:p-6 lg:p-8">
            <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:items-start">
              <div className="overflow-hidden rounded-[1.4rem] border border-[#222222] bg-[#0f0f0f]">
                <div className="relative aspect-[3/4] bg-gradient-to-b from-[#111] to-[#050505]">
                  {profileUrl ? (
                    <img src={profileUrl} alt={actor.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-bold uppercase tracking-[0.2em] text-zinc-600">
                      No image
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">
                    <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1">
                      {isIndexable ? "Indexable profile" : "Profile in progress"}
                    </span>
                    <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1">
                      {filmography.length} titles
                    </span>
                    {actor.sourceConfidence ? (
                      <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1">
                        Confidence {(actor.sourceConfidence * 100).toFixed(0)}%
                      </span>
                    ) : null}
                  </div>
                  <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
                    {actor.name}
                  </h1>
                  <p className="max-w-4xl text-sm leading-7 text-zinc-300 sm:text-base sm:leading-8">
                    {summary}
                  </p>
                  {knownForLine ? (
                    <p className="max-w-4xl text-xs font-medium uppercase tracking-[0.18em] text-emerald-300/80">
                      Known for {knownForLine}
                    </p>
                  ) : null}
                  {factLine ? (
                    <p className="max-w-4xl text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                      {factLine}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href="#filmography"
                    className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300 transition hover:border-emerald-500/40 hover:text-emerald-200"
                  >
                    View filmography
                  </Link>
                  {filmography[0] ? (
                    <Link
                      href={`/movies/${filmography[0].slug}`}
                      className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-300 transition hover:border-white/15 hover:text-white"
                    >
                      Known for {filmography[0].title}
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <FacetRail
              title="Genres"
              description="Titles from this profile grouped by genre."
              items={genres}
              buildHref={(value) => `/genre/${encodeURIComponent(value)}`}
            />
            <FacetRail
              title="Release years"
              description="Browse titles from the same years."
              items={years}
              buildHref={(value) => `/year/${encodeURIComponent(value)}`}
            />
            <div className="rounded-[1.4rem] border border-[#222222] bg-[#111111] p-5">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.34em] text-zinc-600">Catalog notes</p>
              <p className="mt-3 text-sm leading-7 text-zinc-400">
                This profile is built from the titles currently in the catalog. As more releases are added, the page will automatically grow into a richer entity profile.
              </p>
            </div>
          </div>

          {relatedPeople.length > 0 ? (
            <section className="rounded-[1.4rem] border border-[#222222] bg-[#161616] p-5 shadow-lg lg:p-6">
              <div className="flex flex-col gap-3 border-b border-white/8 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black uppercase tracking-wider text-white">Related people</h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    Co-stars and collaborators who appear with {actor.name} in multiple catalog titles.
                  </p>
                </div>
                <span className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-300">
                  {relatedPeople.length} profiles
                </span>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {relatedPeople.map((person) => (
                  <Link
                    key={person.id}
                    href={`/cast/${person.slug}`}
                    className="group overflow-hidden rounded-[1.15rem] border border-[#222222] bg-[#0f0f0f] transition hover:-translate-y-1 hover:border-emerald-500/30"
                  >
                    <div className="flex items-center gap-4 p-4">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/8 bg-[#111111]">
                        {person.profileUrl ? (
                          <img
                            src={person.profileUrl}
                            alt={person.name}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-emerald-300">
                          {person.sharedTitles} shared titles
                        </p>
                        <h3 className="truncate text-base font-semibold text-white">{person.name}</h3>
                        <p className="line-clamp-2 text-xs leading-6 text-zinc-400">
                          {person.knownForTitle ? `Known for ${person.knownForTitle}` : `${person.filmographyCount} catalog titles`}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <div id="filmography" className="rounded-[1.4rem] border border-[#222222] bg-[#161616] p-5 shadow-lg lg:p-6">
            <div className="flex flex-col gap-3 border-b border-white/8 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black uppercase tracking-wider text-white">Filmography</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Titles in the Movies I Loved catalog featuring {actor.name}.
                </p>
              </div>
              <span className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-300">
                {topTitles.length} featured titles
              </span>
            </div>

            {filmography.length > 0 ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filmography.map((movie, index) => (
                  <Link
                    key={movie.id}
                    href={`/movies/${movie.slug}`}
                    className="group overflow-hidden rounded-[1.15rem] border border-[#222222] bg-[#0f0f0f] transition hover:-translate-y-1 hover:border-emerald-500/30"
                  >
                    <div className="relative aspect-[2/3] overflow-hidden bg-[#111111]">
                      {movie.posterUrl ? (
                        <img
                          src={movie.posterUrl}
                          alt={movie.title}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-zinc-600">
                          No poster
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-zinc-500">
                          #{index + 1}
                        </p>
                        <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-zinc-500">
                          {movie.releaseYear}
                        </p>
                      </div>
                      <h3 className="line-clamp-2 text-sm font-semibold text-white">{movie.title}</h3>
                      <p className="line-clamp-2 text-xs leading-6 text-zinc-400">
                        {movie.genres.slice(0, 2).map((entry) => entry.genre.name).join(", ") || "Catalog title"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-[1rem] border border-white/8 bg-white/[0.03] px-4 py-5 text-sm text-zinc-400">
                This profile does not have catalog titles yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
