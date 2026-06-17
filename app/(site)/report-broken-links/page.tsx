import { EditorialPageShell } from "@/components/editorial-page-shell";

const reportItems = [
  {
    title: "Title",
    body: "Share the movie or series name exactly as it appears on the site."
  },
  {
    title: "Package label",
    body: "Include the release package name, season label, or quality label if you can see it."
  },
  {
    title: "What failed",
    body: "Tell us whether the link is dead, redirected, missing, or simply incorrect."
  }
];

export default function ReportBrokenLinksPage() {
  return (
    <EditorialPageShell
      eyebrow="Support"
      title="Report an Issue"
      summary="When a listing looks wrong or a destination stops working, the fastest help comes from a clean report. Give us the title and what you saw, and we can trace the issue much faster."
      accent="text-rose-300"
      stats={[
        { label: "Best report", value: "Title + issue + context" },
        { label: "Goal", value: "Fix the listing" },
        { label: "Tone", value: "Short and specific" }
      ]}
    >
      <div className="grid gap-4 md:grid-cols-3">
        {reportItems.map((item) => (
          <article key={item.title} className="rounded-[1.2rem] border border-white/8 bg-[#0c0c0c] p-5">
            <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-rose-300/80">
              {item.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-zinc-400">{item.body}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 rounded-[1.4rem] border border-rose-500/15 bg-rose-500/5 p-5">
        <h2 className="text-lg font-bold text-white">What happens next</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
          We review the listing, confirm the destination if there is one, and replace or remove the broken entry when needed. If the source moved or disappeared, we treat it as stale.
        </p>
      </div>
    </EditorialPageShell>
  );
}
