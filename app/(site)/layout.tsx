import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getMovieFacetStats } from "@/lib/api";
import { absolutePublicUrl } from "@/lib/public-url";
import { isSponsorCampaignLive } from "@/lib/site-settings";
import { getSiteSettings } from "@/server/lib/site-settings";
import { isClerkConfigured } from "@/lib/clerk-config";
import { auth } from "@clerk/nextjs/server";
import { isAllowlistedAdminUserId } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const siteSettings = await getSiteSettings();

  return {
    title: {
      default: siteSettings.siteTitle,
      template: `%s | ${siteSettings.siteTitle}`
    },
    description: siteSettings.siteDescription,
    openGraph: {
      title: siteSettings.siteTitle,
      description: siteSettings.siteDescription,
      url: absolutePublicUrl("/"),
      siteName: siteSettings.siteTitle,
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title: siteSettings.siteTitle,
      description: siteSettings.siteDescription
    }
  };
}

// Navbar height is responsive and can stretch across three rows on desktop,
// so reserve a little extra vertical space to avoid content hiding behind it.

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const [siteSettings, facetStats] = await Promise.all([getSiteSettings(), getMovieFacetStats()]);
  const clerkConfigured = isClerkConfigured();
  const { userId } = clerkConfigured ? await auth() : { userId: null };
  const isAdmin = isAllowlistedAdminUserId(userId);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0a0a0a]">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,_rgba(16,185,129,0.06),_transparent)]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[20rem] bg-[radial-gradient(ellipse_60%_30%_at_80%_0%,_rgba(238,63,91,0.04),_transparent)]" />

      <Suspense fallback={null}>
        <SiteHeader logoUrl={siteSettings.logoUrl} facetStats={facetStats} clerkConfigured={clerkConfigured} isAdmin={isAdmin} />
      </Suspense>

      <div className="relative pt-[clamp(164px,16vw,220px)]">
        {siteSettings.maintenanceMode ? (
          <div className="mx-auto mb-6 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-[1.4rem] border border-amber-500/20 bg-amber-500/10 px-5 py-4 text-amber-100">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-amber-200">Maintenance mode</p>
              <p className="mt-2 text-sm leading-7 text-amber-50">{siteSettings.maintenanceMessage}</p>
            </div>
          </div>
        ) : null}
        {siteSettings.sponsorCampaignEnabled &&
        isSponsorCampaignLive(new Date(), siteSettings.sponsorCampaignStartAt, siteSettings.sponsorCampaignEndAt) &&
        (siteSettings.sponsorCampaignTitle.trim() || siteSettings.sponsorCampaignBody.trim() || siteSettings.sponsorCampaignCtaHref.trim()) ? (
          <div className="mx-auto mb-6 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-[1.4rem] border border-sky-500/20 bg-sky-500/10 px-5 py-4 text-sky-50 shadow-[0_0_0_1px_rgba(14,165,233,0.05)]">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-sky-200">
                    {siteSettings.sponsorCampaignSponsor || "Sponsored"}
                  </p>
                  <h2 className="text-lg font-semibold text-white">{siteSettings.sponsorCampaignTitle || "Featured Sponsor"}</h2>
                  {siteSettings.sponsorCampaignBody ? <p className="max-w-3xl text-sm leading-7 text-sky-50/90">{siteSettings.sponsorCampaignBody}</p> : null}
                  {siteSettings.sponsorCampaignStartAt || siteSettings.sponsorCampaignEndAt ? (
                    <p className="text-xs text-sky-100/80">
                      {siteSettings.sponsorCampaignStartAt ? `Starts ${new Date(siteSettings.sponsorCampaignStartAt).toLocaleString()}` : ""}
                      {siteSettings.sponsorCampaignStartAt && siteSettings.sponsorCampaignEndAt ? " · " : ""}
                      {siteSettings.sponsorCampaignEndAt ? `Ends ${new Date(siteSettings.sponsorCampaignEndAt).toLocaleString()}` : ""}
                    </p>
                  ) : null}
                </div>
                {siteSettings.sponsorCampaignCtaHref ? (
                  <a
                    href={siteSettings.sponsorCampaignCtaHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-950 transition hover:bg-slate-100"
                  >
                    {siteSettings.sponsorCampaignCtaText || "Learn More"}
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
        {children}
        <SiteFooter brandName={siteSettings.siteTitle} summary={siteSettings.footerBlurb} links={siteSettings.footerLinks} />
      </div>
    </div>
  );
}
