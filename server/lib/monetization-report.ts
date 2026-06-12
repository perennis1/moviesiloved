import type { PrismaClient } from "@prisma/client";

import { getMonetizationConfig } from "./monetization";
import type {
  MonetizationBreakdownRow,
  MonetizationDailyPoint,
  MonetizationReport,
  MonetizationSlotReport
} from "@/lib/monetization-report";
import { type MonetizationSlotConfig } from "@/lib/monetization";

type AdSlotMetricRow = {
  date: Date;
  slotKey: string;
  impressions: number;
  clicks: number;
  fallbacks: number;
  updatedAt: Date;
};

const LOOKBACK_DAYS = 30;

function startOfUtcDay(offsetDays: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - offsetDays);
  return date;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function createTrendTimeline(): Map<string, MonetizationDailyPoint> {
  const trend = new Map<string, MonetizationDailyPoint>();
  for (let offset = LOOKBACK_DAYS - 1; offset >= 0; offset -= 1) {
    const date = startOfUtcDay(offset);
    trend.set(toDateKey(date), {
      date: toDateKey(date),
      impressions: 0,
      clicks: 0,
      fallbacks: 0
    });
  }

  return trend;
}

function buildSlotReport(
  slot: MonetizationSlotConfig,
  row: AdSlotMetricRow | undefined
): MonetizationSlotReport {
  const impressions = row?.impressions ?? 0;
  const clicks = row?.clicks ?? 0;
  const fallbacks = row?.fallbacks ?? 0;
  const snippetPresent = slot.snippet.trim().length > 0;
  const status = !slot.enabled
    ? "OFF"
    : !snippetPresent
      ? "NEEDS_SNIPPET"
      : slot.highRisk
        ? "HIGH_RISK"
        : impressions > 0
          ? "LIVE"
          : "EMPTY";

  return {
    slotKey: slot.slotKey,
    displayName: slot.displayName,
    priority: slot.priority,
    pageGroup: slot.pageGroup,
    placement: slot.placement,
    providerName: slot.providerName,
    providerType: slot.providerType,
    deviceTarget: slot.deviceTarget,
    stickyAllowed: slot.stickyAllowed,
    fallbackMode: slot.fallbackMode,
    enabled: slot.enabled,
    highRisk: slot.highRisk,
    snippetPresent,
    impressions,
    clicks,
    fallbacks,
    fillRate: impressions > 0 ? Math.max(0, 1 - fallbacks / impressions) : snippetPresent ? 1 : 0,
    clickThroughRate: impressions > 0 ? clicks / impressions : 0,
    lastSeenAt: row?.updatedAt ? row.updatedAt.toISOString() : null,
    status
  };
}

function buildBreakdown(
  rows: MonetizationSlotReport[],
  select: (slot: MonetizationSlotReport) => string,
  labelMap?: (key: string, slots: MonetizationSlotReport[]) => string
): MonetizationBreakdownRow[] {
  const groupMap = new Map<
    string,
    {
      slots: MonetizationSlotReport[];
      impressions: number;
      clicks: number;
      fallbacks: number;
    }
  >();

  for (const slot of rows) {
    const key = select(slot);
    const current = groupMap.get(key) ?? {
      slots: [],
      impressions: 0,
      clicks: 0,
      fallbacks: 0
    };

    current.slots.push(slot);
    current.impressions += slot.impressions;
    current.clicks += slot.clicks;
    current.fallbacks += slot.fallbacks;
    groupMap.set(key, current);
  }

  return Array.from(groupMap.entries())
    .map(([key, aggregate]) => {
      const slots = aggregate.slots;
      const label = labelMap?.(key, slots) ?? key;
      const enabledSlots = slots.filter((slot) => slot.enabled).length;
      const liveSlots = slots.filter((slot) => slot.status === "LIVE").length;
      const highRiskSlots = slots.filter((slot) => slot.highRisk).length;

      return {
        key,
        label,
        slots: slots.length,
        enabledSlots,
        liveSlots,
        highRiskSlots,
        impressions: aggregate.impressions,
        clicks: aggregate.clicks,
        fallbacks: aggregate.fallbacks,
        fillRate: aggregate.impressions > 0 ? Math.max(0, 1 - aggregate.fallbacks / aggregate.impressions) : 0,
        clickThroughRate: aggregate.impressions > 0 ? aggregate.clicks / aggregate.impressions : 0
      } satisfies MonetizationBreakdownRow;
    })
    .sort((left, right) => right.impressions - left.impressions || right.clicks - left.clicks || left.label.localeCompare(right.label));
}

export async function buildMonetizationReport(prisma: PrismaClient): Promise<MonetizationReport> {
  const config = await getMonetizationConfig();
  const rows = (await prisma.adSlotMetric.findMany({
    where: {
      date: {
        gte: startOfUtcDay(LOOKBACK_DAYS - 1)
      }
    },
    orderBy: [{ date: "asc" }, { slotKey: "asc" }]
  })) as AdSlotMetricRow[];

  const bySlot = new Map<string, AdSlotMetricRow>();
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalFallbacks = 0;
  const trend = createTrendTimeline();

  for (const row of rows) {
    const current = bySlot.get(row.slotKey);
    if (!current) {
      bySlot.set(row.slotKey, row);
      totalImpressions += row.impressions;
      totalClicks += row.clicks;
      totalFallbacks += row.fallbacks;

      const bucket = trend.get(toDateKey(row.date));
      if (bucket) {
        bucket.impressions += row.impressions;
        bucket.clicks += row.clicks;
        bucket.fallbacks += row.fallbacks;
      }
      continue;
    }

    current.impressions += row.impressions;
    current.clicks += row.clicks;
    current.fallbacks += row.fallbacks;
    current.updatedAt = row.updatedAt > current.updatedAt ? row.updatedAt : current.updatedAt;
    totalImpressions += row.impressions;
    totalClicks += row.clicks;
    totalFallbacks += row.fallbacks;

    const bucket = trend.get(toDateKey(row.date));
    if (bucket) {
      bucket.impressions += row.impressions;
      bucket.clicks += row.clicks;
      bucket.fallbacks += row.fallbacks;
    }
  }

  const slotReports = config.slots
    .map((slot) => buildSlotReport(slot, bySlot.get(slot.slotKey)))
    .sort((left, right) => {
      if (left.enabled !== right.enabled) {
        return left.enabled ? -1 : 1;
      }

      return right.impressions - left.impressions || left.priority - right.priority || left.displayName.localeCompare(right.displayName);
    });

  const dailyTrend = Array.from(trend.values());
  const pageGroups = buildBreakdown(slotReports, (slot) => slot.pageGroup, (key) => key);
  const providers = buildBreakdown(slotReports, (slot) => slot.providerName, (key) => key);
  const deviceTargets = buildBreakdown(slotReports, (slot) => slot.deviceTarget, (key) => key);

  return {
    generatedAt: new Date().toISOString(),
    lookbackDays: LOOKBACK_DAYS,
    totalImpressions,
    totalClicks,
    totalFallbacks,
    dailyTrend,
    pageGroups,
    providers,
    deviceTargets,
    slots: slotReports
  };
}
