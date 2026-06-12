import Link from "next/link";

type ArchiveSearchPanelProps = {
  title: string;
  description: string;
  baseHref: string;
  currentQuery?: string;
  currentLabel?: string;
  total: number;
  resultLabel: string;
};

export function ArchiveSearchPanel({
  title,
  description,
  baseHref,
  currentQuery,
  currentLabel,
  total,
  resultLabel
}: ArchiveSearchPanelProps) {
  return (
    <div className="rounded-[1.4rem] border border-[#222222] bg-[#111111] p-5">
      <div className="flex flex-col gap-3 border-b border-white/8 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.34em] text-zinc-600">{title}</p>
          <p className="mt-1 text-sm text-zinc-500">{description}</p>
        </div>
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-zinc-500">
          {total} title{total !== 1 ? "s" : ""}
        </p>
      </div>

      <form action={baseHref} className="mt-4 flex flex-wrap items-center gap-3">
        <label className="group flex min-w-[16rem] flex-1 items-center gap-2 rounded-xl border border-[#222222] bg-[#161616] px-3 py-2 transition-all focus-within:border-emerald-500/40">
          <svg className="h-4 w-4 shrink-0 text-zinc-600 transition-colors group-focus-within:text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            aria-label={`Search within ${resultLabel}`}
            name="q"
            defaultValue={currentQuery}
            placeholder={`Search ${resultLabel.toLowerCase()}...`}
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
          />
        </label>
        <button
          type="submit"
          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-emerald-400"
        >
          Search
        </button>
        {currentQuery ? (
          <Link
            href={baseHref as Parameters<typeof Link>[0]["href"]}
            className="rounded-xl border border-[#222222] bg-[#161616] px-4 py-2 text-sm font-bold text-zinc-300 transition hover:border-emerald-500/40 hover:text-emerald-400"
          >
            Clear
          </Link>
        ) : null}
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {currentLabel ? (
          <span className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-emerald-300">
            {currentLabel}
          </span>
        ) : null}
        {currentQuery ? (
          <span className="rounded-xl border border-[#222222] bg-[#161616] px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-zinc-400">
            Search: {currentQuery}
          </span>
        ) : null}
      </div>
    </div>
  );
}
