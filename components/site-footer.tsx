import type { Route } from "next";
import Link from "next/link";

import type { FooterLink } from "@/lib/site-settings";
import { isInternalHref, DEFAULT_FOOTER_LINKS, DEFAULT_SITE_SETTINGS } from "@/lib/site-settings";

type SiteFooterProps = {
  brandName?: string;
  summary?: string;
  links?: FooterLink[];
};

export function SiteFooter({
  brandName = DEFAULT_SITE_SETTINGS.siteTitle,
  summary = DEFAULT_SITE_SETTINGS.footerBlurb,
  links = DEFAULT_FOOTER_LINKS
}: SiteFooterProps) {
  const footerLinks = links.length > 0 ? links : DEFAULT_FOOTER_LINKS;

  return (
    <footer className="mt-16 border-t border-white/10 bg-[#0f0f0f] text-zinc-300">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-[1.6rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.28)] sm:p-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl space-y-4">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-emerald-400/80">
                {brandName}
              </p>
              <h2 className="text-2xl font-black leading-tight text-white sm:text-3xl">
                {summary}
              </h2>
              <p className="max-w-xl text-sm leading-7 text-zinc-400">
                A focused catalog surface for discovery, clean metadata, and fast navigation.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {footerLinks.map((link) =>
                isInternalHref(link.href) ? (
                  <Link
                    key={link.label}
                    href={link.href as Route}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-white"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-white"
                  >
                    {link.label}
                  </a>
                )
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-white/8 pt-5 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
            <p>Built for search-first browsing, editorial curation, and smoother admin workflows.</p>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">App Router</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Express API</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Prisma + PostgreSQL</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
