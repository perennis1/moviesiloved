import { EditorialPageShell } from "@/components/editorial-page-shell";

const requests = [
  {
    title: "Search first",
    body: "If the title is already in the catalog, the search and filter tools are the quickest path."
  },
  {
    title: "Be specific",
    body: "Include the name, year, language, and whether you want a movie, series, or anime entry."
  },
  {
    title: "Give context",
    body: "Tell us why it matters so the editorial team can prioritize the right additions."
  }
];

export default function RequestUsPage() {
  return (
    <EditorialPageShell
      eyebrow="Requests"
      title="Request a Title"
      summary="Got a title you want added or highlighted? Keep the request tight and useful, and we can route it into the editorial workflow without creating noise."
      accent="text-cyan-300"
      stats={[
        { label: "Include", value: "Title, year, language" },
        { label: "Best for", value: "New or missing entries" },
        { label: "Workflow", value: "Editorial review" }
      ]}
    >
      <div className="grid gap-4 md:grid-cols-3">
        {requests.map((item) => (
          <article key={item.title} className="rounded-[1.2rem] border border-white/8 bg-[#0c0c0c] p-5">
            <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-300/80">
              {item.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-zinc-400">{item.body}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 rounded-[1.4rem] border border-cyan-500/15 bg-cyan-500/5 p-5">
        <h2 className="text-lg font-bold text-white">Editorial note</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
          Requests work best when they are one title per message. That keeps the queue clear and makes it easier to match your request to the right data source or import path.
        </p>
      </div>
    </EditorialPageShell>
  );
}
