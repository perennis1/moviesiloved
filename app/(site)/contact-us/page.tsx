import Link from "next/link";

import { EditorialPageShell } from "@/components/editorial-page-shell";

const channels = [
  {
    title: "Broken links",
    body: "Use the broken link page when a destination no longer opens or points somewhere unexpected."
  },
  {
    title: "Requests",
    body: "Use the request page for additions, missing titles, or catalog suggestions."
  },
  {
    title: "Rights issues",
    body: "Use the DMCA page for takedown or ownership concerns."
  }
];

export default function ContactUsPage() {
  return (
    <EditorialPageShell
      eyebrow="Contact"
      title="Contact Us"
      summary="Instead of one noisy catch-all form, we route different kinds of messages through the right page. That keeps the editorial queue clean and helps us answer faster."
      accent="text-emerald-300"
      stats={[
        { label: "Best route", value: "Choose the right page" },
        { label: "Tone", value: "Short and clear" },
        { label: "Goal", value: "Less back and forth" }
      ]}
    >
      <div className="grid gap-4 md:grid-cols-3">
        {channels.map((channel) => (
          <article key={channel.title} className="rounded-[1.2rem] border border-white/8 bg-[#0c0c0c] p-5">
            <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-emerald-300/80">
              {channel.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-zinc-400">{channel.body}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 rounded-[1.4rem] border border-emerald-500/15 bg-emerald-500/5 p-5">
        <h2 className="text-lg font-bold text-white">Quick links</h2>
        <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
          <Link href="/report-broken-links" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-zinc-200 hover:text-white">
            Report an Issue
          </Link>
          <Link href="/request-us" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-zinc-200 hover:text-white">
            Request a Title
          </Link>
          <Link href="/dmca" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-zinc-200 hover:text-white">
            DMCA
          </Link>
        </div>
      </div>
    </EditorialPageShell>
  );
}
