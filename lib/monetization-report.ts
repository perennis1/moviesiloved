import type {
  MonetizationDeviceTarget,
  MonetizationFallbackMode,
  MonetizationPageGroup,
  MonetizationProviderType,
  MonetizationSlotKey
} from "@/lib/monetization";

export type MonetizationSlotReport = {
  slotKey: MonetizationSlotKey;
  displayName: string;
  priority: number;
  pageGroup: MonetizationPageGroup;
  placement: string;
  providerName: string;
  providerType: MonetizationProviderType;
  deviceTarget: MonetizationDeviceTarget;
  stickyAllowed: boolean;
  fallbackMode: MonetizationFallbackMode;
  enabled: boolean;
  highRisk: boolean;
  snippetPresent: boolean;
  impressions: number;
  clicks: number;
  fallbacks: number;
  fillRate: number;
  clickThroughRate: number;
  lastSeenAt: string | null;
  status: "LIVE" | "NEEDS_SNIPPET" | "OFF" | "HIGH_RISK" | "EMPTY";
};

export type MonetizationDailyPoint = {
  date: string;
  impressions: number;
  clicks: number;
  fallbacks: number;
};

export type MonetizationBreakdownRow = {
  key: string;
  label: string;
  slots: number;
  enabledSlots: number;
  liveSlots: number;
  highRiskSlots: number;
  impressions: number;
  clicks: number;
  fallbacks: number;
  fillRate: number;
  clickThroughRate: number;
};

export type MonetizationReport = {
  generatedAt: string;
  lookbackDays: number;
  totalImpressions: number;
  totalClicks: number;
  totalFallbacks: number;
  dailyTrend: MonetizationDailyPoint[];
  pageGroups: MonetizationBreakdownRow[];
  providers: MonetizationBreakdownRow[];
  deviceTargets: MonetizationBreakdownRow[];
  slots: MonetizationSlotReport[];
};
