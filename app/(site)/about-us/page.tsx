import Link from "next/link";

import { EditorialPageShell } from "@/components/editorial-page-shell";

const pillars = [
  {
    title: "Search-first curation",
    body: "We organize titles around discovery, so you can move from a search query to a watchable result without wandering through clutter."
  },
  {
    title: "Metadata that matters",
    body: "Posters, genres, cast, trailers, release quality, and language cues are all surfaced where they help the most."
  },
  {
    title: "Editorial control",
    body: "The admin workflow keeps publishing, moderation, and catalog shaping inside one clean command center."
  }
];

export default function AboutUsPage() {
  return (
    <EditorialPageShell
      eyebrow="About Movies I Loved"
      title="A cinematic catalog built to feel fast, focused, and genuinely browsable."
      summary="Movies I Loved is our editorial movie home for discovery-first browsing. We combine a dark visual language with structured metadata, poster-led cards, and a workflow that keeps the public site clean while giving editors room to shape the catalog carefully."
      accent="text-emerald-300"
      stats={[
        { label: "Focus", value: "Discovery + metadata" },
        { label: "Workflow", value: "Editorial command center" },
        { label: "Experience", value: "Fast on mobile and desktop" }
      ]}
      panels={[
        {
          title: "What we try to do well",
          body: "Keep the browsing experience straightforward: find a title, read the important details, and move into the catalog without friction."
        },
        {
          title: "How the site is built",
          body: "The public site is powered by Next.js and Express, with Prisma-backed content records and TMDB enrichment where available."
        },
        {
          title: "Why the layout feels different",
          body: "We avoid a generic blog-style footer and homepage. The structure is made to feel like a media library, not a form dump."
        }
      ]}
    >
      <div className="grid gap-4 md:grid-cols-3">
        {pillars.map((pillar) => (
          <article
            key={pillar.title}
            className="rounded-[1.2rem] border border-white/8 bg-[#0c0c0c] p-5 transition-transform duration-300 hover:-translate-y-0.5"
          >
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-emerald-400/80">
              {pillar.title}
            </p>
            <p className="mt-3 text-sm leading-7 text-zinc-400">
              {pillar.body}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.4rem] border border-white/8 bg-[#0c0c0c] p-5">
          <h2 className="text-lg font-bold text-white">The short version</h2>
          <p className="mt-3 text-sm leading-7 text-zinc-400">
            Movies I Loved exists to make the catalog feel easy to scan, easier to trust, and much cleaner to navigate than a typical link dump. We keep the public experience simple and let the admin side handle the complex editorial work.
          </p>
        </div>

        <div className="rounded-[1.4rem] border border-emerald-500/15 bg-emerald-500/5 p-5">
          <h2 className="text-lg font-bold text-white">Explore next</h2>
          <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
            <Link href="/how-it-works" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-zinc-200 hover:text-white">
              How the Catalog Works
            </Link>
            <Link href="/site-disclaimer" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-zinc-200 hover:text-white">
              Site Disclaimer
            </Link>
          </div>
        </div>
      </div>
    </EditorialPageShell>
  );
}
