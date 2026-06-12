-- CreateEnum
CREATE TYPE "MovieStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WatchLinkType" AS ENUM ('STREAM', 'RENT', 'BUY', 'FREE', 'DOWNLOAD');

-- AlterTable
ALTER TABLE "Actor" ADD COLUMN     "profileUrl" TEXT;

-- AlterTable
ALTER TABLE "Movie" ADD COLUMN     "clicks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "contentType" TEXT NOT NULL DEFAULT 'MOVIE',
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "director" TEXT,
ADD COLUMN     "episodeSize" TEXT,
ADD COLUMN     "episodes" TEXT,
ADD COLUMN     "imdbRating" TEXT,
ADD COLUMN     "imdbRatingCount" TEXT,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "releaseFormat" TEXT DEFAULT 'Mkv',
ADD COLUMN     "releaseQuality" TEXT DEFAULT '1080p WEB-DL',
ADD COLUMN     "screenshots" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "seasons" TEXT,
ADD COLUMN     "status" "MovieStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "subtitles" TEXT,
ADD COLUMN     "tmdbRating" DOUBLE PRECISION,
ADD COLUMN     "tmdbRatingCount" TEXT,
ADD COLUMN     "views" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "releaseYear" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "SeasonTrailer" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "clerkUserId" TEXT,
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "username" TEXT,
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "MovieWishlist" (
    "userId" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovieWishlist_pkey" PRIMARY KEY ("userId","movieId")
);

-- CreateTable
CREATE TABLE "WatchLink" (
    "id" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "WatchLinkType" NOT NULL DEFAULT 'STREAM',
    "quality" TEXT,
    "language" TEXT,
    "price" TEXT,
    "seasonLabel" TEXT,
    "linkLabel" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMetric" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "movieId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DailyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WatchLink_movieId_idx" ON "WatchLink"("movieId");

-- CreateIndex
CREATE INDEX "DailyMetric_movieId_idx" ON "DailyMetric"("movieId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyMetric_date_movieId_key" ON "DailyMetric"("date", "movieId");

-- CreateIndex
CREATE INDEX "Movie_status_idx" ON "Movie"("status");

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkUserId_key" ON "User"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "MovieWishlist" ADD CONSTRAINT "MovieWishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieWishlist" ADD CONSTRAINT "MovieWishlist_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchLink" ADD CONSTRAINT "WatchLink_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyMetric" ADD CONSTRAINT "DailyMetric_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
