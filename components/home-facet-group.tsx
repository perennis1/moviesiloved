"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import type { FacetOption } from "@/lib/home-facets";

type HomeHref = Parameters<typeof Link>[0]["href"];

type HomeFacetGroupProps = {
  label: string;
  values: string[];
  countLookup: Map<string, number>;
  currentParams: Record<string, string | undefined>;
  param: "genre" | "language" | "year" | "type" | "audio" | "quality";
  defaultOpenDesktop?: boolean;
};

function buildFacetHref(
  currentParams: Record<string, string | undefined>,
  param: HomeFacetGroupProps["param"],
  value: string
): HomeHref {
  const params = new URLSearchParams();
  const keys = ["q", "genre", "language", "year", "type", "audio", "quality", "sort", "page"] as const;

  for (const key of keys) {
    const currentValue = currentParams[key];
    if (currentValue) {
      params.set(key, currentValue);
    }
  }

  params.set(param, value);
  params.delete("page");

  const queryString = params.toString();
  return (queryString ? `/?${queryString}` : "/") as HomeHref;
}

export function HomeFacetGroup({
  label,
  values,
  countLookup,
  currentParams,
  param,
  defaultOpenDesktop = false
}: HomeFacetGroupProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    setIsOpen(isDesktop ? defaultOpenDesktop : false);
  }, [defaultOpenDesktop]);

  const activeCount = useMemo(() => {
    return values.reduce((total, value) => {
      return total + (countLookup.get(value.toLowerCase()) ?? 0);
    }, 0);
  }, [countLookup, values]);

  return (
    <div className="rounded-[1.1rem] border border-[#222222] bg-[#161616] p-4">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div>
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-zinc-500">{label}</p>
          <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-zinc-600">
            {activeCount} titles
          </p>
        </div>
        <div className="flex items-center gap-2">
          {currentParams[param] ? (
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[0.58rem] uppercase tracking-[0.14em] text-emerald-300">
              Active
            </span>
          ) : null}
          <span className="rounded-full border border-[#222222] bg-[#111111] px-2 py-1 text-[0.58rem] uppercase tracking-[0.14em] text-zinc-500">
            {isOpen ? "Hide" : "Show"}
          </span>
        </div>
      </button>

      {isOpen ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {values.map((value) => {
            const count = countLookup.get(value.toLowerCase()) ?? 0;

            return (
              <Link
                key={value}
                href={buildFacetHref(currentParams, param, value)}
                className={`rounded-xl border px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] transition-colors ${
                  currentParams[param]?.toLowerCase() === value.toLowerCase()
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-[#222222] bg-[#111111] text-zinc-400 hover:border-emerald-500/40 hover:text-emerald-400"
                }`}
              >
                {value}
                <span className="ml-2 rounded-full border border-white/5 bg-black/30 px-1.5 py-0.5 text-[0.55rem] uppercase tracking-[0.12em] text-zinc-500">
                  {count}
                </span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
