"use client";

import { useEffect, useMemo, useState } from "react";

import {
  LEGACY_MONETIZATION_SNIPPET_KEYS,
  MONETIZATION_CONFIG_KEY,
  createDefaultMonetizationConfig,
  getLegacySnippetKeyForSlot,
  normalizeMonetizationConfig,
  serializeMonetizationConfig,
  type MonetizationConfig,
  type MonetizationDeviceTarget,
  type MonetizationFallbackMode,
  type MonetizationProviderType,
  type MonetizationSlotConfig
} from "@/lib/monetization";
import type { MonetizationReport } from "@/lib/monetization-report";

type SettingResponse = {
  value: string | null;
};

const deviceTargets: MonetizationDeviceTarget[] = ["all", "desktop", "mobile"];
const providerTypes: MonetizationProviderType[] = ["network", "direct-sold", "affiliate"];
const fallbackModes: MonetizationFallbackMode[] = ["hide", "collapse", "placeholder"];

function updateSlot(config: MonetizationConfig, slotKey: MonetizationSlotConfig["slotKey"], updater: (slot: MonetizationSlotConfig) => MonetizationSlotConfig) {
  return {
    ...config,
    slots: config.slots.map((slot) => (slot.slotKey === slotKey ? updater(slot) : slot))
  };
}

function getFieldHint(slot: MonetizationSlotConfig) {
  if (slot.enabled && !slot.snippet.trim()) {
    return "Enabled, but no snippet is assigned yet.";
  }

  if (slot.providerType === "direct-sold" && !slot.snippet.trim()) {
    return "Direct-sold slot is waiting for campaign markup or copy.";
  }

  if (slot.highRisk) {
    return "High-risk placement. Keep it conservative.";
  }

  return slot.notes;
}

export function MonetizationInventoryModule({ report }: { report: MonetizationReport }) {
  const [config, setConfig] = useState<MonetizationConfig>(() => createDefaultMonetizationConfig());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/settings?key=${MONETIZATION_CONFIG_KEY}`).then((response) => response.json()),
      ...LEGACY_MONETIZATION_SNIPPET_KEYS.map((key) => fetch(`/api/settings?key=${key}`).then((response) => response.json()))
    ])
      .then(([configData, ...legacyData]) => {
        const legacySnippets = {
          homepage_feed: legacyData[2]?.value || "",
          movie_sidebar_desktop: legacyData[1]?.value || "",
          verify_top: legacyData[0]?.value || "",
          verify_bottom: legacyData[0]?.value || "",
          video_ad: legacyData[3]?.value || ""
        };

        const parsedConfig = configData?.value ? normalizeMonetizationConfig(configData.value, legacySnippets) : createDefaultMonetizationConfig(legacySnippets);
        setConfig(parsedConfig);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const summary = useMemo(() => {
    return {
      enabled: config.slots.filter((slot) => slot.enabled).length,
      highRisk: config.slots.filter((slot) => slot.highRisk).length,
      directSold: config.slots.filter((slot) => slot.providerType === "direct-sold").length
    };
  }, [config]);
  const topSlots = report.slots.slice(0, 3);
  const reportBySlot = useMemo(() => new Map(report.slots.map((slot) => [slot.slotKey, slot])), [report.slots]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setSaveError(null);

    try {
      const responses = await Promise.all([
        fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: MONETIZATION_CONFIG_KEY, value: serializeMonetizationConfig(config) })
        }),
        ...config.slots
          .map((slot) => {
            const legacyKey = getLegacySnippetKeyForSlot(slot.slotKey);
            if (!legacyKey) {
              return null;
            }

            return fetch("/api/admin/settings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ key: legacyKey, value: slot.snippet || "" })
            });
          })
          .filter((value): value is Promise<Response> => value !== null)
      ]);

      for (const response of responses) {
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Failed to save monetization configuration.");
        }
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save monetization configuration.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading monetization inventory...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Slots enabled" value={summary.enabled} />
        <MetricCard label="High-risk slots" value={summary.highRisk} />
        <MetricCard label="Direct-sold slots" value={summary.directSold} />
        <MetricCard label="Tracked impressions" value={report.totalImpressions} />
        <MetricCard label="Tracked clicks" value={report.totalClicks} />
      </div>

      <section className="rounded-[1.5rem] border border-[#222222] bg-[#111111] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 border-b border-white/6 pb-4">
          <div>
            <p className="text-[0.72rem] uppercase tracking-[0.28em] text-emerald-300">Top slots</p>
            <h4 className="mt-2 text-xl font-semibold text-white">The placements getting the most traffic</h4>
          </div>
          <p className="text-xs text-zinc-500">Ordered by live impressions in the last {report.lookbackDays} days</p>
        </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {topSlots.map((slot, index) => (
            <div key={slot.slotKey} className="rounded-[1.2rem] border border-[#222222] bg-[#0f0f0f] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.68rem] uppercase tracking-[0.24em] text-zinc-500">#{index + 1}</p>
                  <p className="mt-2 truncate text-base font-semibold text-white">{slot.displayName}</p>
                  <p className="mt-1 text-xs text-zinc-500">{slot.slotKey}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.18em] ${
                  slot.status === "LIVE"
                    ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                    : slot.status === "HIGH_RISK"
                    ? "border border-amber-500/20 bg-amber-500/10 text-amber-300"
                    : "border border-white/10 bg-white/[0.04] text-zinc-400"
                }`}>
                  {slot.status}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                  <MiniMetric label="Impressions" value={slot.impressions} />
                  <MiniMetric label="Clicks" value={slot.clicks} />
                  <MiniMetric label="Fill rate" value={`${Math.round(slot.fillRate * 100)}%`} />
                  <MiniMetric label="CTR" value={`${Math.round(slot.clickThroughRate * 100)}%`} />
                </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-[#222222] bg-[#111111] p-4 sm:p-5">
        <div className="flex flex-col gap-3 border-b border-white/6 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[0.72rem] uppercase tracking-[0.28em] text-emerald-300">Performance</p>
            <h4 className="mt-2 text-xl font-semibold text-white">Slot-level signal over the last {report.lookbackDays} days</h4>
            <p className="mt-2 text-sm text-zinc-400">
              This is real impression data from the client beacon, plus config state for slots that are enabled, disabled, or waiting on creative.
            </p>
          </div>
          <div className="grid gap-2 text-xs text-zinc-400">
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">Impressions: {report.totalImpressions.toLocaleString()}</div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">Fallbacks: {report.totalFallbacks.toLocaleString()}</div>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {report.slots.map((slot) => (
            <div key={slot.slotKey} className="rounded-[1.2rem] border border-[#222222] bg-[#0f0f0f] p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-white">{slot.displayName}</p>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                      {slot.slotKey}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.18em] ${
                      slot.status === "LIVE"
                        ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                        : slot.status === "HIGH_RISK"
                        ? "border border-amber-500/20 bg-amber-500/10 text-amber-300"
                        : slot.status === "NEEDS_SNIPPET"
                        ? "border border-rose-500/20 bg-rose-500/10 text-rose-300"
                        : "border border-white/10 bg-white/[0.04] text-zinc-400"
                    }`}>
                      {slot.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">{slot.placement}</p>
                  <p className="mt-2 text-xs text-zinc-500">
                    {slot.pageGroup} · {slot.providerType} · {slot.deviceTarget} · {slot.enabled ? "enabled" : "disabled"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[28rem]">
                  <MiniMetric label="Impressions" value={slot.impressions} />
                  <MiniMetric label="Fallbacks" value={slot.fallbacks} />
                  <MiniMetric label="Fill rate" value={`${Math.round(slot.fillRate * 100)}%`} />
                  <MiniMetric label="Last seen" value={slot.lastSeenAt ? new Date(slot.lastSeenAt).toLocaleDateString() : "—"} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-[1.5rem] border border-[#222222] bg-[#111111] p-4 sm:p-5 xl:col-span-3">
          <div className="flex items-center justify-between gap-3 border-b border-white/6 pb-4">
            <div>
              <p className="text-[0.72rem] uppercase tracking-[0.28em] text-emerald-300">Trend</p>
              <h4 className="mt-2 text-xl font-semibold text-white">Daily ad performance</h4>
              <p className="mt-2 text-sm text-zinc-400">Impressions, clicks, and fallbacks over the last {report.lookbackDays} days.</p>
            </div>
            <p className="text-xs text-zinc-500">Peak impressions: {Math.max(1, ...report.dailyTrend.map((point) => point.impressions)).toLocaleString()}</p>
          </div>
          <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(12px,1fr))] items-end gap-2">
            {report.dailyTrend.map((point) => (
              <div key={point.date} className="flex flex-col items-center gap-2">
                <div className="flex h-36 w-full items-end gap-1 rounded-xl border border-white/6 bg-white/[0.02] px-2 pb-2 pt-3">
                  <TrendBar label="Impressions" value={point.impressions} max={Math.max(1, ...report.dailyTrend.map((entry) => entry.impressions))} className="bg-emerald-400" />
                  <TrendBar label="Clicks" value={point.clicks} max={Math.max(1, ...report.dailyTrend.map((entry) => entry.impressions))} className="bg-cyan-400" />
                  <TrendBar label="Fallbacks" value={point.fallbacks} max={Math.max(1, ...report.dailyTrend.map((entry) => entry.impressions))} className="bg-rose-400" />
                </div>
                <span className="text-[0.58rem] text-zinc-500">{point.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </section>

        <BreakdownPanel title="Page groups" subtitle="Performance by page family" rows={report.pageGroups} />
        <BreakdownPanel title="Providers" subtitle="Performance by provider name" rows={report.providers} />
        <BreakdownPanel title="Devices" subtitle="Performance by device target" rows={report.deviceTargets} />
      </section>

      <div className="grid gap-4">
        {config.slots.map((slot) => (
          <section key={slot.slotKey} className="rounded-[1.5rem] border border-[#222222] bg-[#111111] p-4 sm:p-5">
            <div className="flex flex-col gap-3 border-b border-white/6 pb-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-lg font-semibold text-white">{slot.displayName}</h4>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    {slot.slotKey}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] ${
                    slot.highRisk ? "border border-rose-500/30 bg-rose-500/10 text-rose-300" : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                  }`}>
                    {slot.pageGroup}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] ${
                      reportBySlot.get(slot.slotKey)?.status === "LIVE"
                        ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                        : reportBySlot.get(slot.slotKey)?.status === "HIGH_RISK"
                        ? "border border-amber-500/20 bg-amber-500/10 text-amber-300"
                        : reportBySlot.get(slot.slotKey)?.status === "NEEDS_SNIPPET"
                        ? "border border-rose-500/20 bg-rose-500/10 text-rose-300"
                        : "border border-white/10 bg-white/[0.04] text-zinc-400"
                    }`}
                  >
                    {reportBySlot.get(slot.slotKey)?.status ?? "EMPTY"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-400">{slot.placement}</p>
                <p className="mt-2 text-xs text-zinc-500">{getFieldHint(slot)}</p>
              </div>

              <label className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-zinc-300">
                <span>Enabled</span>
                <input
                  checked={slot.enabled}
                  onChange={(event) =>
                    setConfig((current) =>
                      updateSlot(current, slot.slotKey, (currentSlot) => ({ ...currentSlot, enabled: event.target.checked }))
                    )
                  }
                  type="checkbox"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <label className="grid gap-2 text-sm text-zinc-400">
                Display name
                <input
                  value={slot.displayName}
                  onChange={(event) =>
                    setConfig((current) =>
                      updateSlot(current, slot.slotKey, (currentSlot) => ({ ...currentSlot, displayName: event.target.value }))
                    )
                  }
                  className="w-full rounded-xl border border-[#222222] bg-[#0f0f0f] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"
                />
              </label>

              <label className="grid gap-2 text-sm text-zinc-400">
                Placement
                <input
                  value={slot.placement}
                  onChange={(event) =>
                    setConfig((current) =>
                      updateSlot(current, slot.slotKey, (currentSlot) => ({ ...currentSlot, placement: event.target.value }))
                    )
                  }
                  className="w-full rounded-xl border border-[#222222] bg-[#0f0f0f] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"
                />
              </label>

              <label className="grid gap-2 text-sm text-zinc-400">
                Provider name
                <input
                  value={slot.providerName}
                  onChange={(event) =>
                    setConfig((current) =>
                      updateSlot(current, slot.slotKey, (currentSlot) => ({ ...currentSlot, providerName: event.target.value }))
                    )
                  }
                  className="w-full rounded-xl border border-[#222222] bg-[#0f0f0f] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"
                />
              </label>

              <label className="grid gap-2 text-sm text-zinc-400">
                Provider type
                <select
                  value={slot.providerType}
                  onChange={(event) =>
                    setConfig((current) =>
                      updateSlot(current, slot.slotKey, (currentSlot) => ({ ...currentSlot, providerType: event.target.value as MonetizationProviderType }))
                    )
                  }
                  className="w-full rounded-xl border border-[#222222] bg-[#0f0f0f] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"
                >
                  {providerTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm text-zinc-400">
                Device target
                <select
                  value={slot.deviceTarget}
                  onChange={(event) =>
                    setConfig((current) =>
                      updateSlot(current, slot.slotKey, (currentSlot) => ({ ...currentSlot, deviceTarget: event.target.value as MonetizationDeviceTarget }))
                    )
                  }
                  className="w-full rounded-xl border border-[#222222] bg-[#0f0f0f] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"
                >
                  {deviceTargets.map((target) => (
                    <option key={target} value={target}>
                      {target}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm text-zinc-400">
                Fallback mode
                <select
                  value={slot.fallbackMode}
                  onChange={(event) =>
                    setConfig((current) =>
                      updateSlot(current, slot.slotKey, (currentSlot) => ({ ...currentSlot, fallbackMode: event.target.value as MonetizationFallbackMode }))
                    )
                  }
                  className="w-full rounded-xl border border-[#222222] bg-[#0f0f0f] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"
                >
                  {fallbackModes.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm text-zinc-400">
                Approved hosts
                <input
                  value={slot.approvedHosts.join(", ")}
                  onChange={(event) =>
                    setConfig((current) =>
                      updateSlot(current, slot.slotKey, (currentSlot) => ({
                        ...currentSlot,
                        approvedHosts: event.target.value
                          .split(",")
                          .map((value) => value.trim())
                          .filter(Boolean)
                      }))
                    )
                  }
                  className="w-full rounded-xl border border-[#222222] bg-[#0f0f0f] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"
                  placeholder="adsterra.com, monetag.com"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 text-xs text-zinc-300">
                  <span>Sticky allowed</span>
                  <input
                    checked={slot.stickyAllowed}
                    onChange={(event) =>
                      setConfig((current) =>
                        updateSlot(current, slot.slotKey, (currentSlot) => ({ ...currentSlot, stickyAllowed: event.target.checked }))
                      )
                    }
                    type="checkbox"
                  />
                </label>
                <label className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 text-xs text-zinc-300">
                  <span>Refresh allowed</span>
                  <input
                    checked={slot.refreshAllowed}
                    onChange={(event) =>
                      setConfig((current) =>
                        updateSlot(current, slot.slotKey, (currentSlot) => ({ ...currentSlot, refreshAllowed: event.target.checked }))
                      )
                    }
                    type="checkbox"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="grid gap-2 text-sm text-zinc-400">
                  Priority
                  <input
                    type="number"
                    value={slot.priority}
                    onChange={(event) =>
                      setConfig((current) =>
                        updateSlot(current, slot.slotKey, (currentSlot) => ({ ...currentSlot, priority: Number(event.target.value) || 0 }))
                      )
                    }
                    className="w-full rounded-xl border border-[#222222] bg-[#0f0f0f] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"
                  />
                </label>
                <label className="grid gap-2 text-sm text-zinc-400">
                  Min height
                  <input
                    type="number"
                    value={slot.minContentHeight}
                    onChange={(event) =>
                      setConfig((current) =>
                        updateSlot(current, slot.slotKey, (currentSlot) => ({ ...currentSlot, minContentHeight: Number(event.target.value) || 0 }))
                      )
                    }
                    className="w-full rounded-xl border border-[#222222] bg-[#0f0f0f] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"
                  />
                </label>
                <label className="grid gap-2 text-sm text-zinc-400">
                  Max instances
                  <input
                    type="number"
                    value={slot.maxInstancesPerPage}
                    onChange={(event) =>
                      setConfig((current) =>
                        updateSlot(current, slot.slotKey, (currentSlot) => ({ ...currentSlot, maxInstancesPerPage: Number(event.target.value) || 0 }))
                      )
                    }
                    className="w-full rounded-xl border border-[#222222] bg-[#0f0f0f] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm text-zinc-400 lg:col-span-2">
                Notes
                <textarea
                  rows={2}
                  value={slot.notes}
                  onChange={(event) =>
                    setConfig((current) =>
                      updateSlot(current, slot.slotKey, (currentSlot) => ({ ...currentSlot, notes: event.target.value }))
                    )
                  }
                  className="w-full rounded-xl border border-[#222222] bg-[#0f0f0f] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"
                />
              </label>

              <label className="grid gap-2 text-sm text-zinc-400 lg:col-span-2">
                Snippet
                <textarea
                  rows={5}
                  value={slot.snippet}
                  onChange={(event) =>
                    setConfig((current) =>
                      updateSlot(current, slot.slotKey, (currentSlot) => ({ ...currentSlot, snippet: event.target.value }))
                    )
                  }
                  placeholder="<script src='...'></script>"
                  className="w-full rounded-xl border border-[#222222] bg-[#0f0f0f] px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-emerald-500"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_0.8fr]">
              <div className="rounded-[1.2rem] border border-[#222222] bg-[#0f0f0f] p-3">
                <p className="text-[0.68rem] uppercase tracking-[0.24em] text-zinc-500">Live preview</p>
                <div className="mt-3 rounded-[1rem] border border-[#222222] bg-[#161616] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{slot.displayName}</p>
                      <p className="mt-1 text-xs text-zinc-500">{slot.placement}</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                      {reportBySlot.get(slot.slotKey)?.status ?? "EMPTY"}
                    </span>
                  </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <MiniMetric label="Impressions" value={reportBySlot.get(slot.slotKey)?.impressions ?? 0} />
                    <MiniMetric label="Clicks" value={reportBySlot.get(slot.slotKey)?.clicks ?? 0} />
                  </div>
                  <p className="mt-3 text-[0.72rem] text-zinc-500">
                    {slot.snippet.trim()
                      ? "Creative is present and eligible to render."
                      : "No creative assigned yet, so the slot will fail closed."}
                  </p>
                </div>
              </div>

              <div className="rounded-[1.2rem] border border-[#222222] bg-[#0f0f0f] p-3">
                <p className="text-[0.68rem] uppercase tracking-[0.24em] text-zinc-500">Status badge</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] ${
                    slot.enabled ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border border-white/10 bg-white/[0.04] text-zinc-400"
                  }`}>
                    {slot.enabled ? "Enabled" : "Disabled"}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] ${
                    slot.stickyAllowed ? "border border-cyan-500/20 bg-cyan-500/10 text-cyan-300" : "border border-white/10 bg-white/[0.04] text-zinc-400"
                  }`}>
                    {slot.stickyAllowed ? "Sticky allowed" : "No sticky"}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] ${
                    slot.highRisk ? "border border-rose-500/20 bg-rose-500/10 text-rose-300" : "border border-white/10 bg-white/[0.04] text-zinc-400"
                  }`}>
                    {slot.highRisk ? "High risk" : "Standard risk"}
                  </span>
                </div>
                <p className="mt-3 text-xs text-zinc-500">
                  {reportBySlot.get(slot.slotKey)?.fillRate
                    ? `Fill rate: ${Math.round((reportBySlot.get(slot.slotKey)?.fillRate ?? 0) * 100)}%`
                    : "Fill rate will appear after the first impressions arrive."}
                </p>
              </div>
            </div>
          </section>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-emerald-500 px-5 py-2 text-xs font-bold uppercase tracking-wider text-black transition hover:bg-emerald-400 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Monetization Inventory"}
        </button>
        {saved && <span className="text-xs text-emerald-400">Monetization inventory saved and live.</span>}
        {saveError && <span className="text-xs text-red-400">{saveError}</span>}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.15rem] border border-[#222222] bg-[#161616] px-4 py-4">
      <p className="text-3xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-2 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-zinc-500">{label}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function TrendBar({
  label,
  value,
  max,
  className
}: {
  label: string;
  value: number;
  max: number;
  className: string;
}) {
  const normalized = max > 0 ? value / max : 0;
  const height = Math.max(4, Math.round(normalized * 100));

  return (
    <div className="flex h-full flex-1 flex-col justify-end gap-1">
      <div title={`${label}: ${value.toLocaleString()}`} className={`w-full rounded-t-md ${className}`} style={{ height: `${height}%` }} />
    </div>
  );
}

function BreakdownPanel({
  title,
  subtitle,
  rows
}: {
  title: string;
  subtitle: string;
  rows: Array<{
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
  }>;
}) {
  return (
    <section className="rounded-[1.5rem] border border-[#222222] bg-[#111111] p-4 sm:p-5">
      <div className="border-b border-white/6 pb-4">
        <p className="text-[0.72rem] uppercase tracking-[0.28em] text-emerald-300">{title}</p>
        <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>
      </div>

      <div className="mt-4 grid gap-3">
        {rows.length === 0 ? (
          <div className="rounded-[1rem] border border-white/8 bg-white/[0.03] px-4 py-5 text-sm text-zinc-400">No reporting yet.</div>
        ) : (
          rows.slice(0, 6).map((row) => (
            <div key={row.key} className="rounded-[1rem] border border-white/8 bg-white/[0.03] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{row.label}</p>
                  <p className="mt-1 text-[0.68rem] text-zinc-500">
                    {row.slots} slots · {row.enabledSlots} enabled · {row.liveSlots} live · {row.highRiskSlots} high risk
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{row.impressions.toLocaleString()}</p>
                  <p className="text-[0.68rem] text-zinc-500">impressions</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-zinc-300">
                <MiniMetric label="Clicks" value={row.clicks} />
                <MiniMetric label="Fill" value={`${Math.round(row.fillRate * 100)}%`} />
                <MiniMetric label="CTR" value={`${Math.round(row.clickThroughRate * 100)}%`} />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
