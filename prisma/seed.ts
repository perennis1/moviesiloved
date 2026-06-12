import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const genres = ["Drama", "Thriller", "Romance", "Science Fiction", "Comedy"];

  await Promise.all(
    genres.map((name) =>
      prisma.genre.upsert({
        where: { name },
        update: {},
        create: { name }
      })
    )
  );

  const movie = await prisma.movie.upsert({
    where: { slug: "in-the-mood-for-love-2000" },
    update: {
      synopsis:
        "Two neighbors in 1960s Hong Kong slowly discover their spouses are having an affair and form a fragile bond of their own."
    },
    create: {
      slug: "in-the-mood-for-love-2000",
      title: "In the Mood for Love",
      releaseYear: "2000",
      synopsis:
        "Two neighbors in 1960s Hong Kong slowly discover their spouses are having an affair and form a fragile bond of their own.",
      posterUrl:
        "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80",
      backdropUrl:
        "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80",
      trailerUrl: "https://www.youtube.com/embed/m8GuedsQnWQ"
    }
  });

  const drama = await prisma.genre.findUniqueOrThrow({ where: { name: "Drama" } });
  const romance = await prisma.genre.findUniqueOrThrow({ where: { name: "Romance" } });

  await prisma.movieGenre.upsert({
    where: {
      movieId_genreId: {
        movieId: movie.id,
        genreId: drama.id
      }
    },
    update: {},
    create: {
      movieId: movie.id,
      genreId: drama.id
    }
  });

  await prisma.movieGenre.upsert({
    where: {
      movieId_genreId: {
        movieId: movie.id,
        genreId: romance.id
      }
    },
    update: {},
    create: {
      movieId: movie.id,
      genreId: romance.id
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
