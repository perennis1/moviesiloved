-- Release package link model
CREATE TYPE "ReleaseDestinationType" AS ENUM ('EPISODE_LINKS', 'BATCH_ZIP', 'MIRROR', 'STREAM', 'OTHER');

CREATE TABLE "ReleasePackage" (
  "id" TEXT NOT NULL,
  "movieId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "seasonLabel" TEXT,
  "audioLabel" TEXT,
  "qualityLabel" TEXT,
  "subtitleLabel" TEXT,
  "sizeLabel" TEXT,
  "notes" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ReleasePackage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReleasePackage_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ReleaseDestination" (
  "id" TEXT NOT NULL,
  "packageId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "type" "ReleaseDestinationType" NOT NULL DEFAULT 'OTHER',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ReleaseDestination_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReleaseDestination_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ReleasePackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ReleasePackage_movieId_sortOrder_idx" ON "ReleasePackage"("movieId", "sortOrder");
CREATE INDEX "ReleasePackage_movieId_isActive_idx" ON "ReleasePackage"("movieId", "isActive");
CREATE INDEX "ReleaseDestination_packageId_sortOrder_idx" ON "ReleaseDestination"("packageId", "sortOrder");
CREATE INDEX "ReleaseDestination_type_idx" ON "ReleaseDestination"("type");
