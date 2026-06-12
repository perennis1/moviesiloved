import { prisma } from "./prisma";
import { isPrismaMissingTableError } from "./prisma-errors";
import {
  DEFAULT_SITE_SETTINGS,
  SITE_SETTINGS_KEYS,
  parseBooleanSetting,
  parseFooterLinks
} from "@/lib/site-settings";

export async function getSiteSettings() {
  try {
    const rows = await prisma.globalSettings.findMany({
      where: {
        key: {
          in: Object.values(SITE_SETTINGS_KEYS)
        }
      }
    });

    const byKey = new Map(rows.map((row) => [row.key, row.value]));

    return {
      ...DEFAULT_SITE_SETTINGS,
      siteTitle: byKey.get(SITE_SETTINGS_KEYS.siteTitle)?.trim() || DEFAULT_SITE_SETTINGS.siteTitle,
      siteDescription: byKey.get(SITE_SETTINGS_KEYS.siteDescription)?.trim() || DEFAULT_SITE_SETTINGS.siteDescription,
      footerBlurb: byKey.get(SITE_SETTINGS_KEYS.footerBlurb)?.trim() || DEFAULT_SITE_SETTINGS.footerBlurb,
      footerLinks: parseFooterLinks(byKey.get(SITE_SETTINGS_KEYS.footerLinksJson)),
      maintenanceMode: parseBooleanSetting(byKey.get(SITE_SETTINGS_KEYS.maintenanceMode), DEFAULT_SITE_SETTINGS.maintenanceMode),
      maintenanceMessage: byKey.get(SITE_SETTINGS_KEYS.maintenanceMessage)?.trim() || DEFAULT_SITE_SETTINGS.maintenanceMessage,
      homepageFeaturedEnabled: parseBooleanSetting(
        byKey.get(SITE_SETTINGS_KEYS.homepageFeaturedEnabled),
        DEFAULT_SITE_SETTINGS.homepageFeaturedEnabled
      ),
      homepageFeedEnabled: parseBooleanSetting(
        byKey.get(SITE_SETTINGS_KEYS.homepageFeedEnabled),
        DEFAULT_SITE_SETTINGS.homepageFeedEnabled
      ),
      announcementText: byKey.get(SITE_SETTINGS_KEYS.announcementText)?.trim() || "",
      sponsorCampaignEnabled: parseBooleanSetting(
        byKey.get(SITE_SETTINGS_KEYS.sponsorCampaignEnabled),
        DEFAULT_SITE_SETTINGS.sponsorCampaignEnabled
      ),
      sponsorCampaignTitle: byKey.get(SITE_SETTINGS_KEYS.sponsorCampaignTitle)?.trim() || "",
      sponsorCampaignBody: byKey.get(SITE_SETTINGS_KEYS.sponsorCampaignBody)?.trim() || "",
      sponsorCampaignSponsor: byKey.get(SITE_SETTINGS_KEYS.sponsorCampaignSponsor)?.trim() || "",
      sponsorCampaignCtaText: byKey.get(SITE_SETTINGS_KEYS.sponsorCampaignCtaText)?.trim() || "",
      sponsorCampaignCtaHref: byKey.get(SITE_SETTINGS_KEYS.sponsorCampaignCtaHref)?.trim() || "",
      sponsorCampaignStartAt: byKey.get(SITE_SETTINGS_KEYS.sponsorCampaignStartAt)?.trim() || "",
      sponsorCampaignEndAt: byKey.get(SITE_SETTINGS_KEYS.sponsorCampaignEndAt)?.trim() || "",
      homepageFeedAdScript: byKey.get(SITE_SETTINGS_KEYS.homepageFeedAdScript)?.trim() || "",
      logoUrl: byKey.get(SITE_SETTINGS_KEYS.logoUrl)?.trim() || null
    };
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      console.warn("GlobalSettings table is missing. Falling back to default site settings until migrations are applied.");
      return DEFAULT_SITE_SETTINGS;
    }

    throw error;
  }
}
