import type { PrismaClient } from "@prisma/client";

import type {
  AnalyticsDailyPoint,
  AnalyticsReport,
  AnalyticsTopGenre,
  AnalyticsTopMovie,
  AnalyticsWindowKey,
  AnalyticsWindowSummary
} from "@/lib/analytics-report";

type AnalyticsRow = {
  date: Date;
  movieId: string;
  views: number;
  clicks: number;
  movie: {
    id: string;
    title: string;
    slug: string;
    releaseYear: string;
    posterUrl: string | null;
    genres: Array<{
      genre: {
        name: string;
      };
    }>;
  };
};

const WINDOW_DEFS: Array<{ days: number; key: AnalyticsWindowKey; label: string }> = [
  { key: "7d", days: 7, label: "Last 7 days" },
  { key: "30d", days: 30, label: "Last 30 days" },
  { key: "90d", days: 90, label: "Last 90 days" }
];

const TREND_DAYS = 30;

function startOfUtcDay(offsetDays: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - offsetDays);
  return date;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function createEmptyWindowSummary(window: { days: number; key: AnalyticsWindowKey; label: string }): AnalyticsWindowSummary {
  const to = new Date();
  to.setUTCHours(23, 59, 59, 999);
  const from = startOfUtcDay(window.days - 1);

  return {
    key: window.key,
    label: window.label,
    days: window.days,
    from: toDateKey(from),
    to: toDateKey(to),
    views: 0,
    clicks: 0,
    activeTitles: 0,
    activeDays: 0,
    conversionRate: 0
  };
}

export async function buildAnalyticsReport(prisma: PrismaClient): Promise<AnalyticsReport> {
  const lookbackDays = Math.max(...WINDOW_DEFS.map((window) => window.days));
  const trendStart = startOfUtcDay(TREND_DAYS - 1);
  const rows = (await prisma.dailyMetric.findMany({
    where: {
      date: {
        gte: startOfUtcDay(lookbackDays - 1)
      }
    },
    include: {
      movie: {
        select: {
          id: true,
          title: true,
          slug: true,
          releaseYear: true,
          posterUrl: true,
          genres: {
            include: {
              genre: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: [{ date: "asc" }, { movieId: "asc" }]
  })) as AnalyticsRow[];

  const aggregateWindow = (days: number) => {
    const from = startOfUtcDay(days - 1);
    const relevantRows = rows.filter((row) => row.date >= from);
    const titleSet = new Set<string>();
    const daySet = new Set<string>();
    let views = 0;
    let clicks = 0;

    for (const row of relevantRows) {
      titleSet.add(row.movieId);
      daySet.add(toDateKey(row.date));
      views += row.views;
      clicks += row.clicks;
    }

    return {
      from,
      views,
      clicks,
      activeTitles: titleSet.size,
      activeDays: daySet.size,
      conversionRate: views > 0 ? clicks / views : 0
    };
  };

  const windows = WINDOW_DEFS.map((window) => {
    const aggregate = aggregateWindow(window.days);

    return {
      key: window.key,
      label: window.label,
      days: window.days,
      from: toDateKey(aggregate.from),
      to: toDateKey(new Date()),
      views: aggregate.views,
      clicks: aggregate.clicks,
      activeTitles: aggregate.activeTitles,
      activeDays: aggregate.activeDays,
      conversionRate: aggregate.conversionRate
    } satisfies AnalyticsWindowSummary;
  });

  const trendRows = rows.filter((row) => row.date >= trendStart);
  const dailyMap = new Map<string, { views: number; clicks: number }>();
  for (let offset = TREND_DAYS - 1; offset >= 0; offset -= 1) {
    const date = startOfUtcDay(offset);
    dailyMap.set(toDateKey(date), { views: 0, clicks: 0 });
  }

  for (const row of trendRows) {
    const key = toDateKey(row.date);
    const bucket = dailyMap.get(key);
    if (bucket) {
      bucket.views += row.views;
      bucket.clicks += row.clicks;
    }
  }

  const dailyTrend: AnalyticsDailyPoint[] = Array.from(dailyMap.entries()).map(([date, value]) => ({
    date,
    views: value.views,
    clicks: value.clicks
  }));

  const buildRankings = (days: number) => {
    const from = startOfUtcDay(days - 1);
    const relevantRows = rows.filter((row) => row.date >= from);
    const movieMap = new Map<
      string,
      {
        id: string;
        title: string;
        slug: string;
        releaseYear: string;
        posterUrl: string | null;
        views: number;
        clicks: number;
      }
    >();
    const genreMap = new Map<
      string,
      {
        views: number;
        clicks: number;
        movieIds: Set<string>;
      }
    >();

    for (const row of relevantRows) {
      const movie = movieMap.get(row.movieId) ?? {
        id: row.movie.id,
        title: row.movie.title,
        slug: row.movie.slug,
        releaseYear: row.movie.releaseYear,
        posterUrl: row.movie.posterUrl,
        views: 0,
        clicks: 0
      };

      movie.views += row.views;
      movie.clicks += row.clicks;
      movieMap.set(row.movieId, movie);

      for (const entry of row.movie.genres) {
        const genreName = entry.genre.name;
        const genre = genreMap.get(genreName) ?? {
          views: 0,
          clicks: 0,
          movieIds: new Set<string>()
        };

        genre.views += row.views;
        genre.clicks += row.clicks;
        genre.movieIds.add(row.movieId);
        genreMap.set(genreName, genre);
      }
    }

    const topMovies: AnalyticsTopMovie[] = Array.from(movieMap.values())
      .map((movie) => ({
        id: movie.id,
        title: movie.title,
        slug: movie.slug,
        releaseYear: movie.releaseYear,
        posterUrl: movie.posterUrl,
        views: movie.views,
        clicks: movie.clicks,
        conversionRate: movie.views > 0 ? movie.clicks / movie.views : 0
      }))
      .sort((left, right) => right.views - left.views || right.clicks - left.clicks || left.title.localeCompare(right.title))
      .slice(0, 8);

    const topGenres: AnalyticsTopGenre[] = Array.from(genreMap.entries())
      .map(([name, aggregate]) => ({
        name,
        views: aggregate.views,
        clicks: aggregate.clicks,
        movieCount: aggregate.movieIds.size
      }))
      .sort((left, right) => right.views - left.views || right.clicks - left.clicks || left.name.localeCompare(right.name))
      .slice(0, 6);

    return { topMovies, topGenres };
  };

  const sevenDayRankings = buildRankings(7);
  const thirtyDayRankings = buildRankings(30);
  const ninetyDayRankings = buildRankings(90);

  return {
    generatedAt: new Date().toISOString(),
    trendDays: TREND_DAYS,
    windows,
    dailyTrend,
    topMovies: {
      "7d": sevenDayRankings.topMovies,
      "30d": thirtyDayRankings.topMovies,
      "90d": ninetyDayRankings.topMovies
    },
    topGenres: {
      "7d": sevenDayRankings.topGenres,
      "30d": thirtyDayRankings.topGenres,
      "90d": ninetyDayRankings.topGenres
    }
  };
}
