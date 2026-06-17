import { EditorialPageShell } from "@/components/editorial-page-shell";

const dmcaPoints = [
  {
    title: "What to include",
    body: "The page URL, the content title, proof that you own the rights, and a clear description of the issue."
  },
  {
    title: "What we review",
    body: "We look at the listing, the linked destination, and the claim details before deciding whether to remove or correct the entry."
  },
  {
    title: "What we do not do",
    body: "We do not host or re-upload content in this workflow. We handle catalog edits and link reviews."
  }
];

export default function DmcaPage() {
  return (
    <EditorialPageShell
      eyebrow="Legal"
      title="DMCA"
      summary="If you believe a listing or link on this site needs a takedown review, send a concise notice with the page URL and your rights information so we can investigate quickly."
      accent="text-violet-300"
      stats={[
        { label: "Best for", value: "Takedown requests" },
        { label: "Need", value: "URL + ownership proof" },
        { label: "Result", value: "Review and action" }
      ]}
    >
      <div className="grid gap-4 md:grid-cols-3">
        {dmcaPoints.map((item) => (
          <article key={item.title} className="rounded-[1.2rem] border border-white/8 bg-[#0c0c0c] p-5">
            <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-violet-300/80">
              {item.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-zinc-400">{item.body}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 rounded-[1.4rem] border border-violet-500/15 bg-violet-500/5 p-5">
        <h2 className="text-lg font-bold text-white">Fast path</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
          Please keep the notice short and factual. The cleaner the claim, the faster it can be routed to the right review queue.
        </p>
      </div>
    </EditorialPageShell>
  );
}
