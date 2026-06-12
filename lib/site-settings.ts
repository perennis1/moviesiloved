export type FooterLink = {
  label: string;
  href: string;
};

export type SiteSettings = {
  siteTitle: string;
  siteDescription: string;
  footerBlurb: string;
  footerLinks: FooterLink[];
  maintenanceMode: boolean;
  maintenanceMessage: string;
  homepageFeaturedEnabled: boolean;
  homepageFeedEnabled: boolean;
  announcementText: string;
  sponsorCampaignEnabled: boolean;
  sponsorCampaignTitle: string;
  sponsorCampaignBody: string;
  sponsorCampaignSponsor: string;
  sponsorCampaignCtaText: string;
  sponsorCampaignCtaHref: string;
  sponsorCampaignStartAt: string;
  sponsorCampaignEndAt: string;
  homepageFeedAdScript: string;
  logoUrl: string | null;
};

export const SITE_SETTINGS_KEYS = {
  siteTitle: "site_meta_title",
  siteDescription: "site_meta_description",
  footerBlurb: "site_footer_blurb",
  footerLinksJson: "site_footer_links_json",
  maintenanceMode: "maintenance_mode_enabled",
  maintenanceMessage: "maintenance_message",
  homepageFeaturedEnabled: "homepage_featured_enabled",
  homepageFeedEnabled: "homepage_feed_enabled",
  announcementText: "announcement_text",
  sponsorCampaignEnabled: "sponsor_campaign_enabled",
  sponsorCampaignTitle: "sponsor_campaign_title",
  sponsorCampaignBody: "sponsor_campaign_body",
  sponsorCampaignSponsor: "sponsor_campaign_sponsor",
  sponsorCampaignCtaText: "sponsor_campaign_cta_text",
  sponsorCampaignCtaHref: "sponsor_campaign_cta_href",
  sponsorCampaignStartAt: "sponsor_campaign_start_at",
  sponsorCampaignEndAt: "sponsor_campaign_end_at",
  homepageFeedAdScript: "ad_script_homepage_feed",
  logoUrl: "site_logo_url"
} as const;

export const DEFAULT_FOOTER_LINKS: FooterLink[] = [
  { label: "Browse", href: "/#library" },
  { label: "Categories", href: "/genre/Action" },
  { label: "Search", href: "/?q=" },
  { label: "Admin", href: "/admin" }
];

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteTitle: "Movies I Loved",
  siteDescription: "A fast, dark movie catalog built for discovery, metadata, and a clean public browsing experience.",
  footerBlurb: "A dark, fast, category-driven movie home built for posters, discovery, and later deeper metadata.",
  footerLinks: DEFAULT_FOOTER_LINKS,
  maintenanceMode: false,
  maintenanceMessage: "We’re making a few sitewide improvements. Browsing remains available.",
  homepageFeaturedEnabled: true,
  homepageFeedEnabled: true,
  announcementText: "",
  sponsorCampaignEnabled: false,
  sponsorCampaignTitle: "",
  sponsorCampaignBody: "",
  sponsorCampaignSponsor: "",
  sponsorCampaignCtaText: "",
  sponsorCampaignCtaHref: "",
  sponsorCampaignStartAt: "",
  sponsorCampaignEndAt: "",
  homepageFeedAdScript: "",
  logoUrl: null
};

export function parseBooleanSetting(value: string | null | undefined, fallback = false) {
  if (value == null || value.trim() === "") {
    return fallback;
  }

  return value.trim().toLowerCase() === "true";
}

export function parseDateTimeSetting(value: string | null | undefined) {
  if (!value || value.trim() === "") {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isSponsorCampaignLive(now: Date, startAt: string, endAt: string) {
  const start = parseDateTimeSetting(startAt);
  const end = parseDateTimeSetting(endAt);

  if (start && now < start) {
    return false;
  }

  if (end && now > end) {
    return false;
  }

  return true;
}

export function serializeFooterLinks(links: FooterLink[]) {
  return JSON.stringify(
    links
      .map((link) => ({
        label: link.label.trim(),
        href: link.href.trim()
      }))
      .filter((link) => link.label !== "" && link.href !== "")
  );
}

export function parseFooterLinks(value: string | null | undefined): FooterLink[] {
  if (!value) {
    return DEFAULT_FOOTER_LINKS;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return DEFAULT_FOOTER_LINKS;
    }

    const links = parsed
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const candidate = entry as Partial<FooterLink>;
        if (typeof candidate.label !== "string" || typeof candidate.href !== "string") return null;
        const label = candidate.label.trim();
        const href = candidate.href.trim();
        if (!label || !href) return null;
        return { label, href };
      })
      .filter((link): link is FooterLink => link !== null);

    return links.length > 0 ? links : DEFAULT_FOOTER_LINKS;
  } catch {
    return DEFAULT_FOOTER_LINKS;
  }
}

export function isInternalHref(href: string) {
  return href.startsWith("/");
}
