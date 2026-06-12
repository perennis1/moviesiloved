import { prisma } from "../server/lib/prisma";
import { buildCastSummary, slugifyName } from "../lib/cast";

type CastMovie = {
  title: string;
  releaseYear: string;
  slug: string;
  isFeatured: boolean;
  posterUrl: string | null;
  genres: Array<{ genre: { name: string } }>;
};

async function main() {
  const actors = await prisma.actor.findMany({
    orderBy: { name: "asc" },
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
              }
            }
          }
        }
      }
    }
  });

  const usedSlugs = new Set(
    actors
      .map((actor) => actor.slug?.trim())
      .filter((slug): slug is string => Boolean(slug))
  );

  let updated = 0;

  for (const actor of actors) {
    const filmography = actor.castMembers
      .map((member) => member.movie as CastMovie)
      .filter(Boolean)
      .sort((left, right) => {
        const yearDelta = Number(right.releaseYear.match(/\d{4}/)?.[0] ?? 0) - Number(left.releaseYear.match(/\d{4}/)?.[0] ?? 0);
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
      contentType: "MOVIE",
      isFeatured: movie.isFeatured
    })));
    const knownFor = filmography
      .slice(0, 3)
      .map((movie) => `${movie.title} (${movie.releaseYear})`)
      .join(" • ");

    const baseSlug = slugifyName(actor.name) || "cast-member";
    let slug = actor.slug?.trim() || baseSlug;
    let counter = 1;

    while (usedSlugs.has(slug) && slug !== actor.slug) {
      slug = `${baseSlug}-${counter}`;
      counter += 1;
    }

    usedSlugs.add(slug);

    await prisma.actor.update({
      where: { id: actor.id },
      data: {
        slug,
        bio: actor.bio?.trim() ? actor.bio : summary,
        knownFor: actor.knownFor?.trim() ? actor.knownFor : knownFor || null,
        sourceConfidence: Math.min(1, 0.5 + filmography.length * 0.1 + (actor.profileUrl ? 0.1 : 0)),
        isIndexable: actor.isIndexable || filmography.length >= 3
      }
    });

    updated += 1;
  }

  console.log(`Backfill complete. Updated ${updated} actors.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
