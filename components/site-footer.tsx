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
    <footer className="border-t border-white/10 bg-[#141414] text-zinc-300">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-[0.72rem] uppercase tracking-[0.3em] text-zinc-500">{brandName}</p>
            <h2 className="max-w-2xl text-2xl font-semibold text-white sm:text-3xl">
              {summary}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            {footerLinks.map((link) =>
              isInternalHref(link.href) ? (
                <Link
                  key={link.label}
                  href={link.href as Route}
                  className="rounded-xl border border-white/10 px-3 py-2 transition-colors hover:border-emerald-500/30 hover:text-white"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-white/10 px-3 py-2 transition-colors hover:border-emerald-500/30 hover:text-white"
                >
                  {link.label}
                </a>
              )
            )}
          </div>
        </div>

        <div className="grid gap-6 text-sm text-zinc-400 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <p className="font-medium text-white">Foundation</p>
            <p>Next.js App Router</p>
            <p>Express API</p>
            <p>Prisma and PostgreSQL</p>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-white">Next Up</p>
            <p>Categories and collections</p>
            <p>Bookmarks and wishlist</p>
            <p>Community posts and reactions</p>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-white">Homepage Pattern</p>
            <p>Search-first header</p>
            <p>Poster-led grid</p>
            <p>Utility category ribbons</p>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-white">Status</p>
            <p>Mobile-first layout ready</p>
            <p>Tailwind wired</p>
            <p>Category phase next</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
