import { absolutePublicUrl } from "@/lib/public-url";
import { shouldIndexCastPage } from "@/lib/cast";
import { prisma } from "@/server/lib/prisma";

export const dynamic = "force-dynamic";

type CastSitemapItem = {
  slug: string;
  isIndexable: boolean;
  bio: string | null;
  castMembers: Array<{ movie: { slug: string; title: string; releaseYear: string; isFeatured: boolean } }>;
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(
  url: string,
  options?: {
    changeFrequency?: string;
    priority?: number;
  }
) {
  const parts = [
    `<url><loc>${escapeXml(url)}</loc>`,
    options?.changeFrequency ? `<changefreq>${options.changeFrequency}</changefreq>` : "",
    typeof options?.priority === "number" ? `<priority>${options.priority.toFixed(1)}</priority>` : "",
    `</url>`
  ];

  return parts.join("");
}

export async function GET() {
  try {
    const movies = await prisma.movie.findMany({
      where: {
        deletedAt: null,
        status: "PUBLISHED"
      },
      select: {
        slug: true,
        releaseYear: true,
        language: true,
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
            language: true
          }
        },
        releasePackages: {
          select: {
            audioLabel: true
          }
        }
      }
    });

    const genreNames = new Set<string>();
    const languageNames = new Set<string>();
    const years = new Set<string>();

    for (const movie of movies) {
      const genreValues = movie.genres.map((item) => item.genre.name);

      years.add(movie.releaseYear);

      for (const genre of genreValues) {
        if (genre.trim()) {
          genreNames.add(genre.trim());
        }
      }

      if (movie.language?.trim()) {
        languageNames.add(movie.language.trim());
      }

      for (const watchLink of movie.watchLinks) {
        if (watchLink.language?.trim()) {
          languageNames.add(watchLink.language.trim());
        }
      }

      for (const packageEntry of movie.releasePackages) {
        if (packageEntry.audioLabel?.trim()) {
          languageNames.add(packageEntry.audioLabel.trim());
        }
      }
    }

    const castData = (await prisma.actor.findMany({
      where: {
        slug: { not: null }
      },
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
              select: {
                slug: true,
                title: true,
                releaseYear: true,
                isFeatured: true
              }
            }
          }
        }
      }
    })) as CastSitemapItem[];

    const urls = [
      urlEntry(absolutePublicUrl("/"), { changeFrequency: "daily", priority: 1 }),
      ...movies.map((movie) => urlEntry(absolutePublicUrl(`/movies/${movie.slug}`), { changeFrequency: "weekly", priority: 0.9 })),
      ...Array.from(genreNames)
        .sort((left, right) => left.localeCompare(right))
        .map((genre) => urlEntry(absolutePublicUrl(`/genre/${encodeURIComponent(genre)}`), { changeFrequency: "weekly", priority: 0.7 })),
      ...Array.from(languageNames)
        .sort((left, right) => left.localeCompare(right))
        .map((language) => urlEntry(absolutePublicUrl(`/language/${encodeURIComponent(language)}`), { changeFrequency: "weekly", priority: 0.7 })),
      ...Array.from(years)
        .sort((left, right) => left.localeCompare(right))
        .map((year) => urlEntry(absolutePublicUrl(`/year/${encodeURIComponent(year)}`), { changeFrequency: "weekly", priority: 0.6 })),
      ...castData
        .filter(
          (actor) =>
            Boolean(actor.slug) &&
            (actor.isIndexable ||
              shouldIndexCastPage({
                hasManualBio: Boolean(actor.bio?.trim()),
                entries: actor.castMembers.map((entry) => ({
                  title: entry.movie.title,
                  releaseYear: entry.movie.releaseYear,
                  role: null,
                  contentType: "MOVIE",
                  isFeatured: entry.movie.isFeatured
                })),
                isTopBilled: true
              }))
        )
        .map((actor) => urlEntry(absolutePublicUrl(`/cast/${actor.slug}`), { changeFrequency: "weekly", priority: 0.5 }))
    ].join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8"
      }
    });
  } catch (error) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlEntry(
        absolutePublicUrl("/"),
        { changeFrequency: "daily", priority: 1 }
      )}</urlset>`,
      {
        status: 200,
        headers: {
          "Content-Type": "application/xml; charset=utf-8"
        }
      }
    );
  }
}
