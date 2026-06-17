import type { ReactNode } from "react";

type EditorialPageShellProps = {
  eyebrow: string;
  title: string;
  summary: string;
  accent: string;
  children: ReactNode;
  stats?: Array<{
    label: string;
    value: string;
  }>;
  panels?: Array<{
    title: string;
    body: string;
  }>;
};

export function EditorialPageShell({
  eyebrow,
  title,
  summary,
  accent,
  children,
  stats = [],
  panels = []
}: EditorialPageShellProps) {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#0a0a0a] pb-16 pt-6 sm:pb-20 sm:pt-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[22rem] bg-[radial-gradient(ellipse_75%_35%_at_50%_0%,rgba(16,185,129,0.12),transparent_60%)] motion-safe:animate-pulse" />
      <div className="pointer-events-none absolute right-[-6rem] top-24 -z-10 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute left-[-8rem] top-40 -z-10 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[1.8rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
          <div className="grid gap-8 p-6 md:grid-cols-[1.3fr_0.7fr] md:p-8">
            <div className="space-y-5">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-zinc-500">
                {eyebrow}
              </p>
              <h1 className={`max-w-3xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl ${accent}`}>
                {title}
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-zinc-400 sm:text-base">
                {summary}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-[1.2rem] border border-white/8 bg-black/20 p-4">
                  <p className="text-[0.64rem] font-semibold uppercase tracking-[0.28em] text-zinc-500">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-lg font-bold text-white">
                    {stat.value}
                  </p>
                </div>
              ))}
              {stats.length === 0 ? (
                <div className="rounded-[1.2rem] border border-white/8 bg-black/20 p-4">
                  <p className="text-[0.64rem] font-semibold uppercase tracking-[0.28em] text-zinc-500">
                    Editorial mode
                  </p>
                  <p className="mt-2 text-lg font-bold text-white">
                    Clean, cinematic, and easy to scan
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          {panels.length > 0 ? (
            <div className="grid gap-3 border-t border-white/8 p-6 md:grid-cols-3 md:p-8">
              {panels.map((panel) => (
                <article
                  key={panel.title}
                  className="rounded-[1.2rem] border border-white/8 bg-black/20 p-4 transition-transform duration-300 hover:-translate-y-0.5 hover:border-white/15"
                >
                  <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-200">
                    {panel.title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-zinc-400">
                    {panel.body}
                  </p>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <section className="mt-6 rounded-[1.8rem] border border-white/8 bg-[#111111] p-5 sm:p-6">
          {children}
        </section>
      </div>
    </main>
  );
}
