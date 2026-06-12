const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const movie = await prisma.movie.findFirst({
    where: { title: { contains: 'The Boys' } }
  });
  console.log(movie);
}

main().finally(() => prisma.$disconnect());
