import type { Route } from "next";
import Link from "next/link";

import type { FooterLink } from "@/lib/site-settings";
import { DEFAULT_FOOTER_LINKS, DEFAULT_SITE_SETTINGS, isInternalHref } from "@/lib/site-settings";

type SiteFooterProps = {
  brandName?: string;
  summary?: string;
  links?: FooterLink[];
};

function isAdminLink(link: FooterLink) {
  return link.label.trim().toLowerCase() === "admin" || link.href.trim().toLowerCase() === "/admin";
}

export function SiteFooter({
  brandName = DEFAULT_SITE_SETTINGS.siteTitle,
  summary = DEFAULT_SITE_SETTINGS.footerBlurb,
  links = DEFAULT_FOOTER_LINKS
}: SiteFooterProps) {
  const footerLinks = links.filter((link) => !isAdminLink(link));
  const safeLinks = footerLinks.length > 0 ? footerLinks : DEFAULT_FOOTER_LINKS.filter((link) => !isAdminLink(link));

  return (
    <footer className="border-t border-white/10 bg-[#1a1a1a] text-zinc-300">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 border-b border-white/10 pb-5 text-center md:text-left">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-zinc-500">
            {brandName}
          </p>
          <p className="mx-auto max-w-4xl text-sm font-medium leading-7 text-zinc-400 md:mx-0">
            {summary}
          </p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm font-semibold text-zinc-300 md:justify-start">
          {safeLinks.map((link, index) => (
            <span key={link.label} className="inline-flex items-center gap-3">
              {isInternalHref(link.href) ? (
                <Link
                  href={link.href as Route}
                  className="transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-white"
                >
                  {link.label}
                </a>
              )}
              {index < safeLinks.length - 1 ? <span className="text-zinc-600">|</span> : null}
            </span>
          ))}
        </nav>

        <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 pt-4 text-[11px] uppercase tracking-[0.2em] text-zinc-500 md:justify-start">
          <span>Browse first</span>
          <span className="text-zinc-700">•</span>
          <span>Metadata-driven</span>
          <span className="text-zinc-700">•</span>
          <span>Mobile-ready</span>
          <span className="text-zinc-700">•</span>
          <span>Editorial workflow</span>
        </div>
      </div>
    </footer>
  );
}
