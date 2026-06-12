ALTER TABLE "Actor" ADD COLUMN "slug" TEXT;
ALTER TABLE "Actor" ADD COLUMN "tmdbId" TEXT;
ALTER TABLE "Actor" ADD COLUMN "bio" TEXT;
ALTER TABLE "Actor" ADD COLUMN "birthDate" TEXT;
ALTER TABLE "Actor" ADD COLUMN "birthPlace" TEXT;
ALTER TABLE "Actor" ADD COLUMN "sourceConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5;
ALTER TABLE "Actor" ADD COLUMN "isIndexable" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "Actor_slug_key" ON "Actor"("slug");
CREATE UNIQUE INDEX "Actor_tmdbId_key" ON "Actor"("tmdbId");
CREATE INDEX "Actor_isIndexable_updatedAt_idx" ON "Actor"("isIndexable", "updatedAt");
