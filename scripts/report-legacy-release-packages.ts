import { prisma } from "../server/lib/prisma";

async function main() {
  const movies = await prisma.movie.findMany({
    include: {
      watchLinks: true,
      releasePackages: true
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  const skipped = movies
    .filter((movie) => movie.watchLinks.length > 0 && movie.releasePackages.length === 0)
    .map((movie) => ({
      title: movie.title,
      slug: movie.slug,
      releaseYear: movie.releaseYear,
      watchLinks: movie.watchLinks.map((link) => ({
        platform: link.platform,
        type: link.type,
        quality: link.quality,
        language: link.language,
        price: link.price,
        seasonLabel: link.seasonLabel,
        linkLabel: link.linkLabel,
        sortOrder: link.sortOrder,
        url: link.url
      }))
    }));

  console.log(JSON.stringify(skipped, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
