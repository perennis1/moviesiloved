import Link from "next/link";

import { EditorialPageShell } from "@/components/editorial-page-shell";

const steps = [
  "Open a title page and review the catalog details, cast, and related titles.",
  "Use the genre, language, year, and search tools to narrow the catalog quickly.",
  "Check the metadata cards for trailers, ratings, and the most relevant context.",
  "If a destination is missing or incorrect, report the title and listing details.",
  "Use the request page to suggest new titles or fill catalog gaps."
];

export default function HowItWorksPage() {
  return (
    <EditorialPageShell
      eyebrow="Help"
      title="How the Catalog Works"
      summary="Start from the homepage or a title page, then use the catalog tools to move through genres, years, languages, cast, and related titles. The site is built for discovery first, with clean navigation and clear metadata."
      accent="text-amber-300"
      stats={[
        { label: "Step 1", value: "Open a title page" },
        { label: "Step 2", value: "Use the filters" },
        { label: "Step 3", value: "Browse related titles" }
      ]}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {steps.map((step, index) => (
          <article key={step} className="rounded-[1.2rem] border border-white/8 bg-[#0c0c0c] p-5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-amber-300/80">
              Step {index + 1}
            </p>
            <p className="mt-3 text-sm leading-7 text-zinc-400">{step}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 rounded-[1.4rem] border border-amber-500/15 bg-amber-500/5 p-5">
        <h2 className="text-lg font-bold text-white">Keep it tidy</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
          The catalog cards are designed to reduce guesswork. If you do not see the title or context you expect, use the filtering tools on the title page or browse related titles instead of jumping around.
        </p>
        <div className="mt-4">
          <Link href="/report-broken-links" className="inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:text-white">
            Report an Issue
          </Link>
        </div>
      </div>
    </EditorialPageShell>
  );
}
