-- CreateTable
CREATE TABLE "AdSlotMetric" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "slotKey" TEXT NOT NULL,
    "pageGroup" TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "fallbacks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdSlotMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdSlotMetric_date_slotKey_key" ON "AdSlotMetric"("date", "slotKey");

-- CreateIndex
CREATE INDEX "AdSlotMetric_slotKey_idx" ON "AdSlotMetric"("slotKey");

-- CreateIndex
CREATE INDEX "AdSlotMetric_pageGroup_idx" ON "AdSlotMetric"("pageGroup");

-- CreateIndex
CREATE INDEX "AdSlotMetric_providerType_idx" ON "AdSlotMetric"("providerType");
