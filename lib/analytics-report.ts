export type AnalyticsWindowKey = "7d" | "30d" | "90d";

export type AnalyticsWindowSummary = {
  key: AnalyticsWindowKey;
  label: string;
  days: number;
  from: string;
  to: string;
  views: number;
  clicks: number;
  activeTitles: number;
  activeDays: number;
  conversionRate: number;
};

export type AnalyticsDailyPoint = {
  date: string;
  views: number;
  clicks: number;
};

export type AnalyticsTopMovie = {
  id: string;
  title: string;
  slug: string;
  releaseYear: string;
  posterUrl: string | null;
  views: number;
  clicks: number;
  conversionRate: number;
};

export type AnalyticsTopGenre = {
  name: string;
  views: number;
  clicks: number;
  movieCount: number;
};

export type AnalyticsReport = {
  generatedAt: string;
  trendDays: number;
  windows: AnalyticsWindowSummary[];
  dailyTrend: AnalyticsDailyPoint[];
  topMovies: Record<AnalyticsWindowKey, AnalyticsTopMovie[]>;
  topGenres: Record<AnalyticsWindowKey, AnalyticsTopGenre[]>;
};
