import Link from "next/link";

type SuggestedSearchItem = {
  label: string;
  href: string | Parameters<typeof Link>[0]["href"];
  count?: number;
};

type SuggestedSearchesRowProps = {
  title: string;
  description?: string;
  items: SuggestedSearchItem[];
};

export function SuggestedSearchesRow({ title, description, items }: SuggestedSearchesRowProps) {
  const visibleItems = items.filter((item) => item.label.trim().length > 0);

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
            key={item.label}
            href={item.href as Parameters<typeof Link>[0]["href"]}
            className="rounded-xl border border-[#222222] bg-[#161616] px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-zinc-300 transition-colors hover:border-emerald-500/40 hover:text-emerald-400"
          >
            {item.label}
            {typeof item.count === "number" ? (
              <span className="ml-2 rounded-full border border-white/5 bg-black/30 px-1.5 py-0.5 text-[0.55rem] uppercase tracking-[0.12em] text-zinc-500">
                {item.count}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
