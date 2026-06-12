const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const deletedCount = await prisma.movie.deleteMany({
    where: {
      deletedAt: { not: null }
    }
  });
  console.log(`Hard deleted ${deletedCount.count} soft-deleted movies.`);
}

main().finally(() => prisma.$disconnect());
