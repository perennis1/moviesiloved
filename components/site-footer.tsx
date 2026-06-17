import type { Route } from "next";
import Link from "next/link";

import type { FooterLink } from "@/lib/site-settings";
import { DEFAULT_FOOTER_LINKS, DEFAULT_SITE_SETTINGS, isInternalHref } from "@/lib/site-settings";

type SiteFooterProps = {
  brandName?: string;
  summary?: string;
  links?: FooterLink[];
};

function dedupeFooterLinks(primary: FooterLink[], secondary: FooterLink[]) {
  const seen = new Set<string>();
  const merged: FooterLink[] = [];

  for (const link of [...primary, ...secondary]) {
    const key = `${link.label.trim().toLowerCase()}::${link.href.trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(link);
  }

  return merged;
}

export function SiteFooter({
  brandName = DEFAULT_SITE_SETTINGS.siteTitle,
  summary = DEFAULT_SITE_SETTINGS.footerBlurb,
  links = DEFAULT_FOOTER_LINKS
}: SiteFooterProps) {
  const footerLinks = dedupeFooterLinks(DEFAULT_FOOTER_LINKS, links).filter(
    (link) => link.href.trim().toLowerCase() !== "/admin" && link.label.trim().toLowerCase() !== "admin"
  );

  return (
    <footer className="border-t border-white/10 bg-[#181818] text-zinc-300">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-[1.2rem] border border-white/8 bg-[#202020] px-5 py-5 shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
          <div className="flex flex-col gap-4">
            <div className="space-y-2 text-center md:text-left">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-zinc-500">
                {brandName}
              </p>
              <p className="mx-auto max-w-4xl text-sm leading-7 text-zinc-400 md:mx-0">
                {summary}
              </p>
            </div>

            <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[0.95rem] font-semibold text-zinc-300 md:justify-start">
              {footerLinks.map((link, index) => (
                <span key={`${link.label}-${link.href}`} className="inline-flex items-center gap-3">
                  {isInternalHref(link.href) ? (
                    <Link href={link.href as Route} className="transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  ) : (
                    <a href={link.href} target="_blank" rel="noreferrer" className="transition-colors hover:text-white">
                      {link.label}
                    </a>
                  )}
                  {index < footerLinks.length - 1 ? <span className="text-zinc-600">|</span> : null}
                </span>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
