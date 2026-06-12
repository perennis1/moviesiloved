-- CreateTable
CREATE TABLE "SeasonTrailer" (
    "id" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "seasonLabel" TEXT NOT NULL,
    "title" TEXT,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeasonTrailer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SeasonTrailer_movieId_sortOrder_idx" ON "SeasonTrailer"("movieId", "sortOrder");

-- CreateIndex
CREATE INDEX "SeasonTrailer_movieId_isActive_idx" ON "SeasonTrailer"("movieId", "isActive");

-- AddForeignKey
ALTER TABLE "SeasonTrailer"
ADD CONSTRAINT "SeasonTrailer_movieId_fkey"
FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
