import { Router } from "express";
import * as cheerio from "cheerio";
import { formatReleasePackageTitle, isSizeLabel } from "../../lib/release-packages";
import { resolveEditorActor } from "../lib/auth";

const router = Router();
const allowedScrapeHosts = new Set([
  "moviesmod.band",
  "moviesmod.bond",
  "moviesmod.cafe",
  "moviesmod.chat",
  "moviesmod.day",
  "moviesmod.email",
  "moviesmod.food",
  "moviesmod.fyi",
  "moviesmod.hair",
  "moviesmod.ink",
  "moviesmod.lat",
  "moviesmod.life",
  "moviesmod.money",
  "moviesmod.zip",
  "www.moviesmod.band",
  "www.moviesmod.bond",
  "www.moviesmod.cafe",
  "www.moviesmod.chat",
  "www.moviesmod.day",
  "www.moviesmod.email",
  "www.moviesmod.food",
  "www.moviesmod.fyi",
  "www.moviesmod.hair",
  "www.moviesmod.ink",
  "www.moviesmod.lat",
  "www.moviesmod.life",
  "www.moviesmod.money",
  "www.moviesmod.zip",
]);

/**
 * Cleans a raw MoviesMod title into a usable movie/series name.
 * Input:  "Download The Boys (Season 1-5) Dual Audio {Hindi-English} WEB-DL 480p [200MB] || 720p [350MB]"
 * Output: "The Boys"
 */
function cleanTitle(raw: string): string {
  let title = raw;

  // Strip "Download" prefix
  title = title.replace(/^Download\s+/i, "");

  // Remove everything after the first bracket / brace / pipe / dash following the real title
  // e.g.  "(Season 1-5)", "{Hindi-English}", "[200MB]", "|| 720p", "- MoviesMod"
  title = title
    .replace(/\(Season[^)]*\)/gi, "")      // (Season 1-5)
    .replace(/\{[^}]*\}/g, "")            // {Hindi-English}
    .replace(/\[[^\]]*\]/g, "")           // [200MB]
    .replace(/\|.*/g, "")                 // || 720p ...
    .replace(/480p|720p|1080p|2160p|4K/gi, "")
    .replace(/WEB[\s-]?DL|BluRay|HDTS|CAMRip/gi, "")
    .replace(/Dual\s*Audio|Hindi|English|Tamil|Telugu/gi, "")
    .replace(/-\s*MoviesMod.*/gi, "")     // - MoviesMod ...
    .replace(/\s{2,}/g, " ")              // collapse multiple spaces
    .trim();

  // Remove trailing punctuation / dashes
  title = title.replace(/[-:,.\s]+$/, "").trim();

  return title;
}

function normalizeScrapeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeScrapeKey(value: string): string {
  return normalizeScrapeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractReleaseYear(raw: string): string {
  const match = raw.match(/\b(19|20)\d{2}\b/);
  return match?.[0] || "";
}

/**
 * Infers the link label (quality + type) from a maxbutton class string and link text.
 * e.g. class "maxbutton-episode-links" + surrounding text "S01 480p" → "S01 Episode Links 480p"
 */
function inferLinkLabel(classes: string, text: string): string {
  const label = text.trim();
  return label || classes.replace(/maxbutton[-\d]*/gi, "").replace(/-/g, " ").trim();
}

function inferPackageHeading($: any, anchor: any, fallbackTitle: string): string {
  let current = anchor.parent();

  for (let depth = 0; depth < 6 && current.length > 0; depth += 1) {
    const heading = current.find("h1,h2,h3,h4,h5,h6").first().text().trim();
    if (heading) {
      return heading;
    }

    const previousHeading = current.prevAll("h1,h2,h3,h4,h5,h6").first().text().trim();
    if (previousHeading) {
      return previousHeading;
    }

    current = current.parent();
  }

  return fallbackTitle;
}

function inferPackageFields(packageHeading: string, fallbackTitle: string) {
  const source = `${packageHeading} ${fallbackTitle}`.trim();
  const seasonMatch = source.match(/\bSeason\s*\d+(?:\s*[-–]\s*\d+)?\b/i) || source.match(/\bComplete Series\b/i);
  const audioMatch = source.match(/\b(?:Dual Audio|Hindi-English|English-Hindi|Hindi English|Hindi|English|Multi Audio|Multi-Language|Dual Language|Tamil|Telugu|Malayalam|Kannada|Bangla|Urdu)\b(?:[^\]\)]*)?/i);
  const qualityMatch = source.match(/\b(?:2160p|4K|1080p|720p|480p|360p)(?:\s*x265|\s*x264)?(?:\s*10Bit|\s*10-bit)?\b/i);
  const subtitleMatch = source.match(/\b(?:Esubs|Subbed|No Subs|With Subtitles|Subtitles)\b/i);
  const sizeMatch = source.match(/\[(\d+(?:\.\d+)?\s?(?:KB|MB|GB|TB))\]/i);

  const seasonLabel = seasonMatch?.[0]?.trim() || "";
  const audioLabel = audioMatch?.[0]?.trim() || "";
  const qualityLabel = qualityMatch?.[0]?.trim() || "";
  const subtitleLabel = subtitleMatch?.[0]?.trim() || "";
  const sizeLabel = sizeMatch?.[1]?.trim() || (isSizeLabel(fallbackTitle) ? fallbackTitle : "");

  return {
    seasonLabel,
    audioLabel,
    qualityLabel,
    subtitleLabel,
    sizeLabel
  };
}

router.post("/", async (req, res) => {
  await resolveEditorActor(req);
  const { url } = req.body as { url?: string };

  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "Missing or invalid 'url' in request body." });
    return;
  }

  // Only allow explicitly approved MoviesMod domains
  let parsedUrl: URL | null = null;
  try {
    parsedUrl = new URL(url);
    if (!allowedScrapeHosts.has(parsedUrl.hostname.toLowerCase())) {
      res.status(400).json({ error: "URL must be from a moviesmod domain." });
      return;
    }
  } catch {
    res.status(400).json({ error: "Invalid URL provided." });
    return;
  }

  let html: string;
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      res.status(502).json({ error: `Remote site returned HTTP ${response.status}.` });
      return;
    }

    html = await response.text();
  } catch (err) {
    console.error("Scrape fetch error:", err);
    res.status(502).json({ error: "Failed to fetch the remote URL. It may be temporarily unavailable." });
    return;
  }

  const $ = cheerio.load(html);

  // ── Extract raw title ─────────────────────────────────────────────────────
  const rawTitle =
    $("h1.title, h1.single-title, h1.entry-title").first().text().trim() ||
    $("meta[property='og:title']").attr("content") ||
    "";

  const cleanedTitle = rawTitle ? cleanTitle(rawTitle) : "";
  const releaseYear = extractReleaseYear(rawTitle || cleanedTitle);

  // ── Extract poster image ──────────────────────────────────────────────────
  const ogImage = $("meta[property='og:image']").attr("content") || "";

  // ── Extract description ───────────────────────────────────────────────────
  const ogDesc = $("meta[property='og:description']").attr("content") || "";

  // ── Extract download links ────────────────────────────────────────────────
  // MoviesMod uses MaxButtons with predictable classes.
  // We look for all anchor tags that are "maxbutton" and have an href.
  const scrapedLinks: { label: string; url: string; classes: string }[] = [];
  const seenUrls = new Set<string>();
  let duplicateDestinationCount = 0;
  let skippedHiddenCount = 0;

  $("a.maxbutton[href]").each((_i, el) => {
    const anchor = $(el);
    const href = anchor.attr("href") || "";
    const classes = anchor.attr("class") || "";
    const text = anchor.find(".mb-text").text().trim() || anchor.text().trim();

    // Skip hidden buttons (Google Drive direct / OneDrive which they deliberately hide)
    if (classes.includes("maxbutton-g-direct") || classes.includes("maxbutton-onedrive")) {
      skippedHiddenCount += 1;
      return;
    }
    // Skip if no meaningful href
    if (!href || href === "#") return;

    let normalizedUrl = href;
    try {
      const parsedUrl = new URL(href, url);
      if (!/^https?:$/i.test(parsedUrl.protocol)) {
        return;
      }
      normalizedUrl = parsedUrl.href;
    } catch {
      return;
    }

    if (seenUrls.has(normalizedUrl)) {
      duplicateDestinationCount += 1;
      return;
    }
    seenUrls.add(normalizedUrl);

    scrapedLinks.push({
      label: inferLinkLabel(classes, text),
      url: normalizedUrl,
      classes,
    });
  });

  const packageMap = new Map<string, {
    title: string;
    seasonLabel: string;
    audioLabel: string;
    qualityLabel: string;
    subtitleLabel: string;
    sizeLabel: string;
    notes: string;
    sortOrder: number;
    isActive: boolean;
    destinations: Array<{
      label: string;
      url: string;
      type: "EPISODE_LINKS" | "BATCH_ZIP" | "MIRROR" | "STREAM" | "OTHER";
      sortOrder: number;
    }>;
  }>();

  scrapedLinks.forEach((link, index) => {
    const anchor = $(`a.maxbutton[href="${link.url.replace(/"/g, '\\"')}"]`).first();
    const packageHeading = inferPackageHeading($, anchor, cleanedTitle || rawTitle || "Untitled");
    const fields = inferPackageFields(packageHeading, cleanedTitle || rawTitle || "Untitled");
    const title = formatReleasePackageTitle({
      baseTitle: cleanedTitle || rawTitle || "Untitled",
      seasonLabel: fields.seasonLabel || packageHeading || undefined,
      audioLabel: fields.audioLabel || undefined,
      qualityLabel: fields.qualityLabel || undefined,
      subtitleLabel: fields.subtitleLabel || undefined,
      sizeLabel: fields.sizeLabel || undefined
    });
    const packageKey = [
      normalizeScrapeKey(fields.seasonLabel || packageHeading || cleanedTitle || rawTitle || "Untitled"),
      normalizeScrapeKey(fields.audioLabel || ""),
      normalizeScrapeKey(fields.qualityLabel || ""),
      normalizeScrapeKey(fields.subtitleLabel || ""),
      normalizeScrapeKey(fields.sizeLabel || "")
    ].join("::");

    const destinationType: "EPISODE_LINKS" | "BATCH_ZIP" | "MIRROR" | "STREAM" | "OTHER" = link.classes.includes("maxbutton-batch-zip") || /batch|zip/i.test(link.label)
      ? "BATCH_ZIP"
      : link.classes.includes("maxbutton-stream") || /stream/i.test(link.label)
        ? "STREAM"
        : /mirror/i.test(link.label)
          ? "MIRROR"
          : /episode/i.test(link.label)
            ? "EPISODE_LINKS"
            : "OTHER";

    const current = packageMap.get(packageKey);
    const destination = {
      label: link.label || "Open Link",
      url: link.url,
      type: destinationType,
      sortOrder: index
    };

    if (!current) {
      packageMap.set(packageKey, {
        title,
        seasonLabel: fields.seasonLabel || packageHeading || "",
        audioLabel: fields.audioLabel || "",
        qualityLabel: fields.qualityLabel || "",
        subtitleLabel: fields.subtitleLabel || "",
        sizeLabel: fields.sizeLabel || "",
        notes: "",
        sortOrder: index,
        isActive: true,
        destinations: [destination]
      });
      return;
    }

    current.destinations.push(destination);
    current.destinations.sort((a, b) => a.sortOrder - b.sortOrder);
    current.sortOrder = Math.min(current.sortOrder, index);
  });

  const releasePackages = Array.from(packageMap.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  const watchLinks = releasePackages.flatMap((pkg) =>
    pkg.destinations.map((destination, index) => ({
      platform: pkg.title,
      type: destination.type === "STREAM" ? "STREAM" : "DOWNLOAD",
      url: destination.url,
      quality: pkg.qualityLabel || null,
      language: pkg.audioLabel || null,
      price: pkg.sizeLabel || null,
      seasonLabel: pkg.seasonLabel || null,
      linkLabel: destination.label,
      sortOrder: destination.sortOrder ?? index
    }))
  );
  const seasonLabels = Array.from(
    new Set(
      releasePackages
        .map((pkg) => pkg.seasonLabel.trim())
        .filter((label) => label.length > 0)
    )
  );
  const destinationTypeCounts = releasePackages.reduce<Record<string, number>>((counts, pkg) => {
    for (const destination of pkg.destinations) {
      counts[destination.type] = (counts[destination.type] || 0) + 1;
    }
    return counts;
  }, {});
  const contentTypeGuess =
    seasonLabels.length > 0 || releasePackages.some((pkg) => /season\s*\d+/i.test(pkg.title))
      ? "SERIES"
      : "MOVIE";

  res.json({
    success: true,
    rawTitle,
    cleanedTitle,
    releaseYear,
    ogImage,
    ogDesc,
    sourceHost: parsedUrl?.hostname || "moviesmod",
    releasePackages,
    watchLinks,
    contentTypeGuess,
    packageCount: releasePackages.length,
    destinationTypeCounts,
    packageHighlights: releasePackages.slice(0, 3).map((pkg) => pkg.title),
    seasonLabels,
    warnings: [
      !rawTitle ? "Could not infer a page title." : "",
      scrapedLinks.length === 0 ? "No visible MoviesMod destination buttons were found." : "",
      releasePackages.length > 1 && seasonLabels.length > 0 ? `Detected ${seasonLabels.length} season group${seasonLabels.length === 1 ? "" : "s"}.` : "",
      contentTypeGuess === "SERIES" ? "This scrape looks like a series. Consider setting the content type to Series / TV Show." : "",
      duplicateDestinationCount > 0 ? `Skipped ${duplicateDestinationCount} duplicate destination link${duplicateDestinationCount === 1 ? "" : "s"}.` : "",
      skippedHiddenCount > 0 ? `Skipped ${skippedHiddenCount} hidden destination button${skippedHiddenCount === 1 ? "" : "s"}.` : "",
    ].filter(Boolean),
    confidence: cleanedTitle && releasePackages.length > 0 ? "high" : cleanedTitle || releasePackages.length > 0 ? "medium" : "low",
    totalLinks: releasePackages.reduce((total, pkg) => total + pkg.destinations.length, 0),
  });
});

export default router;
