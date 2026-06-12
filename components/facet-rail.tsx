import Link from "next/link";

import type { FacetOption } from "@/lib/home-facets";

type FacetRailProps = {
  title: string;
  description?: string;
  currentValue?: string;
  items: FacetOption[];
  buildHref: (value: string) => string;
};

export function FacetRail({ title, description, currentValue, items, buildHref }: FacetRailProps) {
  const visibleItems = items.slice(0, 8);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div className="rounded-[1.4rem] border border-[#222222] bg-[#111111] p-5">
      <div>
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.34em] text-zinc-600">{title}</p>
        {description ? <p className="mt-1 text-sm text-zinc-500">{description}</p> : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {visibleItems.map((item) => (
          <Link
            key={item.value}
            href={buildHref(item.value) as Parameters<typeof Link>[0]["href"]}
            className={`rounded-xl border px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] transition-colors ${
              currentValue?.toLowerCase() === item.value.toLowerCase()
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-[#222222] bg-[#161616] text-zinc-400 hover:border-emerald-500/40 hover:text-emerald-400"
            }`}
          >
            {item.value}
            <span className="ml-2 rounded-full border border-white/5 bg-black/30 px-1.5 py-0.5 text-[0.55rem] uppercase tracking-[0.12em] text-zinc-500">
              {item.count}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
