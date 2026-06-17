import { EditorialPageShell } from "@/components/editorial-page-shell";

const rules = [
  {
    title: "Catalog only",
    body: "We organize titles, metadata, and links. We are not the original source of the films, series, posters, or trailers referenced on the site."
  },
  {
    title: "Third-party destinations",
    body: "When a title points outward, the final destination is controlled by the external host. Availability, playback, and file integrity can change without notice."
  },
  {
    title: "Rights and removal",
    body: "If you believe a listing is incorrect or needs review, we want the report. The fastest path is to flag the URL and the title in question."
  }
];

export default function SiteDisclaimerPage() {
  return (
    <EditorialPageShell
      eyebrow="Policy"
      title="Site Disclaimer"
      summary="Movies I Loved is a catalog and navigation experience. We do not claim ownership of the media, posters, or external destinations referenced by the site, and we do not control third-party host behavior."
      accent="text-sky-300"
      stats={[
        { label: "Ownership", value: "Respective rights holders" },
        { label: "Hosting", value: "Third-party destinations" },
        { label: "Support", value: "Report issues quickly" }
      ]}
      panels={[
        {
          title: "Important note",
          body: "Content availability can change because external hosts move, remove, or expire files. A listing on this site is not a guarantee that the destination will remain online."
        },
        {
          title: "Accuracy",
          body: "We try to keep titles, genres, and metadata clean, but imported data can be imperfect. If you spot a mismatch, report the page and we will review it."
        },
        {
          title: "Use responsibly",
          body: "Please follow the laws and policies that apply in your region when using any third-party destination linked from this catalog."
        }
      ]}
    >
      <div className="space-y-4">
        {rules.map((rule, index) => (
          <div
            key={rule.title}
            className="rounded-[1.2rem] border border-white/8 bg-[#0c0c0c] p-5 transition-transform duration-300 hover:-translate-y-0.5"
          >
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-sky-300/80">
              {String(index + 1).padStart(2, "0")}
            </p>
            <h2 className="mt-2 text-lg font-bold text-white">{rule.title}</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-400">{rule.body}</p>
          </div>
        ))}
      </div>
    </EditorialPageShell>
  );
}
