import { randomUUID } from "crypto";
import { prisma } from "../server/lib/prisma";
import { normalizeReleasePackages } from "../lib/release-packages";

async function main() {
  const movies = await prisma.movie.findMany({
    include: {
      watchLinks: true,
      releasePackages: {
        include: {
          destinations: true
        }
      }
    }
  });

  let processed = 0;
  let skipped = 0;

  for (const movie of movies) {
    if (movie.releasePackages.length > 0 || movie.watchLinks.length === 0) {
      skipped += 1;
      continue;
    }

    const releasePackages = normalizeReleasePackages(movie.title, undefined, movie.watchLinks);

    await prisma.$transaction(async (tx) => {
      for (const pkg of releasePackages) {
        await tx.releasePackage.create({
          data: {
            movieId: movie.id,
            title: pkg.title,
            seasonLabel: pkg.seasonLabel,
            audioLabel: pkg.audioLabel,
            qualityLabel: pkg.qualityLabel,
            subtitleLabel: pkg.subtitleLabel,
            sizeLabel: pkg.sizeLabel,
            notes: pkg.notes,
            sortOrder: pkg.sortOrder,
            isActive: pkg.isActive,
              destinations: {
                create: pkg.destinations.map((destination) => ({
                  id: randomUUID(),
                  label: destination.label,
                  url: destination.url,
                  type: destination.type,
                sortOrder: destination.sortOrder
              }))
            }
          }
        });
      }
    });

    processed += 1;
  }

  console.log(`Backfill complete. Processed ${processed} movies, skipped ${skipped}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
