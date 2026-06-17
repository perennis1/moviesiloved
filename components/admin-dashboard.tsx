"use client";

import type { ReactNode } from "react";
import { useMemo, useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { canAccessAdminModule, getAccessibleAdminModules, type AdminModuleId, type AdminRole } from "@/components/admin-dashboard-config";
import type {
  AnalyticsReport,
  AnalyticsWindowKey
} from "@/lib/analytics-report";
import type { MonetizationReport } from "@/lib/monetization-report";
import {
  DEFAULT_SITE_SETTINGS,
  DEFAULT_FOOTER_LINKS,
  SITE_SETTINGS_KEYS,
  parseBooleanSetting,
  parseFooterLinks,
  serializeFooterLinks
} from "@/lib/site-settings";
import type { MediaReport } from "@/lib/media-report";
import { AdminMovieForm } from "@/components/admin-movie-form";
import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminTopbar } from "@/components/admin-topbar";
import { MediaUploadButton } from "@/components/media-upload-button";
import { MonetizationInventoryModule } from "@/components/monetization-module";

type AdminMovie = {
  id: string;
  title: string;
  slug: string;
  releaseYear: string;
  synopsis: null | string;
  posterUrl: null | string;
  backdropUrl: null | string;
  genreNames: string[];
  isFeatured?: boolean;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  contentType?: string;
  isArchived?: boolean;
  views?: number;
  clicks?: number;
};

type AdminActorRecord = {
  id: string;
  name: string;
  slug: string | null;
  tmdbId: string | null;
  bio: string | null;
  knownFor: string | null;
  birthDate: string | null;
  birthPlace: string | null;
  profileUrl: string | null;
  sourceConfidence: number;
  isIndexable: boolean;
  updatedAt: string | Date;
  _count: {
    castMembers: number;
  };
};

type AdminUserRecord = {
  id: string;
  email: string;
  clerkUserId: string | null;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: "ADMIN" | "EDITOR" | "MODERATOR" | "USER";
  createdAt: string | Date;
  updatedAt: string | Date;
  _count: {
    reviews: number;
    favorites: number;
    wishlists: number;
    auditLogs: number;
  };
};

type AdminReviewRecord = {
  id: string;
  rating: number;
  text: string | null;
  moderated: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  user: {
    id: string;
    email: string;
    role: "ADMIN" | "EDITOR" | "MODERATOR" | "USER";
  };
  movie: {
    id: string;
    title: string;
    slug: string;
    releaseYear: string;
  };
};

type AdminAuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  metadata: unknown;
  createdAt: string | Date;
  actor: null | {
    email: string;
    clerkUserId: string | null;
    role: "ADMIN" | "EDITOR" | "MODERATOR" | "USER";
  };
};

type AdminDashboardProps = {
  adminUserId: string;
  adminRole: AdminRole;
  moviesmodHostPattern: string;
  movieCount: number;
  analyticsReport: AnalyticsReport | null;
  monetizationReport: MonetizationReport | null;
  mediaReport: MediaReport;
  recentAuditLogs: AdminAuditLog[];
  recentReviews: AdminReviewRecord[];
  users: AdminUserRecord[];
  movies: AdminMovie[];
  actors: AdminActorRecord[];
};

export function AdminDashboard({ adminUserId, adminRole, moviesmodHostPattern, analyticsReport, monetizationReport, mediaReport, movieCount, recentAuditLogs, recentReviews, users, movies, actors }: AdminDashboardProps) {
  const router = useRouter();
  const accessibleModules = useMemo(() => getAccessibleAdminModules(adminRole), [adminRole]);
  const [activeModule, setActiveModule] = useState<AdminModuleId>(adminRole === "ADMIN" ? "overview" : "content");
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [editingMovieId, setEditingMovieId] = useState<string | null>(null);

  useEffect(() => {
    if (!canAccessAdminModule(adminRole, activeModule)) {
      setActiveModule(accessibleModules[0]?.id ?? "content");
    }
  }, [accessibleModules, activeModule, adminRole]);

  // Global keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        (event.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") ||
        (event.ctrlKey && event.key.toLowerCase() === "k")
      ) {
        event.preventDefault();
        const searchInput = document.getElementById("admin-search-input");
        searchInput?.focus();
      }

      if (event.altKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        setActiveModule("overview");
      }

      if (event.altKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setActiveModule("monetization");
      }

      if (event.key === "Escape") {
        const searchInput = document.getElementById("admin-search-input") as HTMLInputElement | null;
        if (document.activeElement === searchInput) {
          searchInput?.blur();
        }
        setIsMobileOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const dashboardStats = useMemo(() => {
    const genreMap = new Map<string, number>();
    let entriesMissingGenre = 0;
    let entriesMissingPoster = 0;
    let entriesMissingSynopsis = 0;

    for (const movie of movies) {
      if (movie.genreNames.length === 0) {
        entriesMissingGenre += 1;
      }

      if (!movie.posterUrl) {
        entriesMissingPoster += 1;
      }

      if (!movie.synopsis) {
        entriesMissingSynopsis += 1;
      }

      for (const genre of movie.genreNames) {
        genreMap.set(genre, (genreMap.get(genre) ?? 0) + 1);
      }
    }

    const categories = Array.from(genreMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));

    return {
      categories,
      entriesMissingGenre,
      entriesMissingPoster,
      entriesMissingSynopsis,
      publishedCount: movies.filter((movie) => movie.status === "PUBLISHED" && !movie.isArchived).length,
      draftCount: movies.filter((movie) => movie.status === "DRAFT" && !movie.isArchived).length,
      archivedCount: movies.filter((movie) => movie.isArchived || movie.status === "ARCHIVED").length,
      featuredCount: movies.filter((movie) => movie.isFeatured && !movie.isArchived).length,
      totalViews: movies.reduce((sum, movie) => sum + (movie.views ?? 0), 0),
      totalClicks: movies.reduce((sum, movie) => sum + (movie.clicks ?? 0), 0),
      recentMovies: movies.slice(0, 5)
    };
  }, [movies]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#111111] text-zinc-100 font-sans antialiased relative">
      <div className="relative mx-auto flex h-full w-full max-w-[1600px] gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <AdminSidebar
          activeModule={activeModule}
          adminUserId={adminUserId}
          adminRole={adminRole}
          alertCount={dashboardStats.entriesMissingPoster + dashboardStats.entriesMissingSynopsis}
          isDesktopCollapsed={isDesktopCollapsed}
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
          onDesktopToggle={() => setIsDesktopCollapsed((value) => !value)}
          onModuleChange={setActiveModule}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden transition-all duration-300">
          <AdminTopbar
            activeModule={activeModule}
            alertCount={dashboardStats.entriesMissingPoster + dashboardStats.entriesMissingSynopsis}
            movieCount={movieCount}
            adminRole={adminRole}
            onDesktopToggle={() => setIsDesktopCollapsed((value) => !value)}
            onMobileOpen={() => setIsMobileOpen(true)}
            onModuleChange={setActiveModule}
            movies={movies}
          />

          <section className="mt-4 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] p-5 sm:p-6 lg:p-8">
            {activeModule === "overview" && (
              <>
                <div className="flex flex-col gap-6 border-b border-white/6 pb-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <p className="text-[0.74rem] font-semibold uppercase tracking-[0.38em] text-emerald-300">
                  Subsystem: editorial grid
                </p>
                <div>
                  <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                    System <span className="text-amber-200">Overview</span>
                  </h2>
                  <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-300">
                    Content, media, users, monetization, analytics, and system access are separated into
                    function-specific modules so the admin area feels operational instead of generic.
                  </p>
                </div>
              </div>

            </div>

            <div className="mt-8 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-[1.8rem] border border-amber-300/14 bg-[linear-gradient(180deg,rgba(56,41,27,0.38),rgba(33,25,21,0.92))] p-5">
                <p className="text-[0.78rem] font-semibold uppercase tracking-[0.34em] text-amber-100 font-mono">Catalog integrity</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <TopMetricCard label="Catalog" value={String(movieCount)} />
                  <TopMetricCard label="Genres" value={String(dashboardStats.categories.length)} />
                  <TopMetricCard label="Missing posters" value={String(dashboardStats.entriesMissingPoster)} />
                  <TopMetricCard label="Missing synopsis" value={String(dashboardStats.entriesMissingSynopsis)} />
                </div>
              </div>

              <div className="rounded-[1.8rem] border border-[#222222] bg-[#1a1a1a] p-5 hover-shine-effect">
                <p className="text-[0.74rem] font-semibold uppercase tracking-[0.34em] text-emerald-300 font-mono">Action</p>
                <h3 className="mt-4 text-2xl font-bold tracking-tight text-white">Inspect admin workflow</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-300">
                  Open the focused movie and category lanes to resolve metadata gaps, expand media coverage, prepare monetization,
                  and stage the next reporting endpoints.
                </p>
                <button
                  className="mt-6 rounded-full border border-amber-300/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100 hover:bg-amber-300/10 transition-all duration-300"
                  onClick={() => setActiveModule("content")}
                  type="button"
                >
                  Open content lane
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <TelemetryCard label="Published" value={`${dashboardStats.publishedCount}`} />
              <TelemetryCard label="Drafts" value={`${dashboardStats.draftCount}`} />
              <TelemetryCard label="Archived" value={`${dashboardStats.archivedCount}`} />
              <TelemetryCard label="Featured" value={`${dashboardStats.featuredCount}`} />
            </div>
              </>
            )}

            <div className={activeModule === "overview" ? "mt-8" : ""}>
              <div className={activeModule === "overview" ? "rounded-[1.8rem] border border-[#222222] bg-[#1a1a1a] p-4 sm:p-5 lg:p-6" : ""}>
                {activeModule === "overview" ? (
                  <OverviewModule
                    categoryCount={dashboardStats.categories.length}
                    movieCount={movieCount}
                    totalClicks={dashboardStats.totalClicks}
                    totalViews={dashboardStats.totalViews}
                    recentMovies={dashboardStats.recentMovies}
                  />
                ) : null}
                {activeModule === "content" ? (
          <ContentModule
            editingMovieId={editingMovieId}
            moviesmodHostPattern={moviesmodHostPattern}
            movies={movies}
            onEditMovie={setEditingMovieId}
          />
                ) : null}
                {activeModule === "people" ? (
                  <PeopleModule
                    actors={actors}
                    onRefresh={() => router.refresh()}
                  />
                ) : null}
                {activeModule === "media" ? (
                  <MediaModule
                    mediaReport={mediaReport}
                    movies={movies}
                    onEditMovie={(movieId) => {
                      setEditingMovieId(movieId);
                      setActiveModule("content");
                    }}
                  />
                ) : null}
                {canAccessAdminModule(adminRole, "users") && activeModule === "users" ? (
                  <UsersModule
                    adminUserId={adminUserId}
                    adminRole={adminRole}
                    recentAuditLogs={recentAuditLogs}
                    recentReviews={recentReviews}
                    users={users}
                    movies={movies}
                    onOpenMovie={(movieId) => {
                      setEditingMovieId(movieId);
                      setActiveModule("content");
                    }}
                    onRefresh={() => router.refresh()}
                  />
                ) : null}
                {canAccessAdminModule(adminRole, "monetization") && activeModule === "monetization" && monetizationReport ? (
                  <MonetizationInventoryModule report={monetizationReport} />
                ) : null}
                {canAccessAdminModule(adminRole, "analytics") && activeModule === "analytics" && analyticsReport ? (
                  <AnalyticsModule analyticsReport={analyticsReport} categories={dashboardStats.categories} movieCount={movieCount} />
                ) : null}
                {canAccessAdminModule(adminRole, "settings") && activeModule === "settings" ? <SettingsModule adminUserId={adminUserId} adminRole={adminRole} /> : null}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function OverviewModule({
  categoryCount,
  movieCount,
  totalClicks,
  totalViews,
  recentMovies
}: {
  categoryCount: number;
  movieCount: number;
  totalClicks: number;
  totalViews: number;
  recentMovies: AdminMovie[];
}) {
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Overview"
        title="A real command post, not just a form page"
        copy="The overview surfaces platform-wide priorities first: catalog size, metadata coverage, the next content actions, and the modules that still need deeper backend wiring."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InsightCard title="Total movies" value={`${movieCount}`} copy="Current content items available in the catalog." />
        <InsightCard title="Genre coverage" value={`${categoryCount}`} copy="Distinct categories currently represented." />
        <InsightCard title="Total views" value={`${totalViews.toLocaleString()}`} copy="Lifetime movie-page visits recorded so far." />
        <InsightCard title="Link clicks" value={`${totalClicks.toLocaleString()}`} copy="Outbound verify handoffs tracked across the catalog." />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Latest content pipeline">
          <div className="grid gap-3">
            {recentMovies.map((movie) => (
              <div key={movie.id} className="flex items-center gap-4 rounded-[1.2rem] border border-[#222222] bg-[#111111] p-3">
                <div
                  className="h-20 w-14 shrink-0 rounded-xl bg-[#26272b] bg-cover bg-center"
                  style={{ backgroundImage: movie.posterUrl ? `url(${movie.posterUrl})` : undefined }}
                />
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-white">{movie.title}</p>
                  <p className="mt-1 text-sm text-zinc-500">{movie.releaseYear}</p>
                  <p className="mt-2 truncate text-sm text-zinc-400">{movie.genreNames.join(", ") || "Needs categories"}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Operational lanes">
          <div className="grid gap-3 text-sm text-zinc-300">
            <ChecklistItem label="Editors can manage content, people, and media assets" />
            <ChecklistItem label="Admins handle roles, logs, moderation, monetization, and settings" />
            <ChecklistItem label="Every protected write still records an audit trail" />
            <ChecklistItem label="Analytics and ad tools stay behind the admin gate" />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ContentModule({
  editingMovieId,
  moviesmodHostPattern,
  movies,
  onEditMovie
}: {
  editingMovieId: string | null;
  moviesmodHostPattern: string;
  movies: AdminMovie[];
  onEditMovie: (movieId: string | null) => void;
}) {
  const active = movies.filter(m => !m.isArchived);
  const archived = movies.filter(m => m.isArchived);
  const latest = [...active, ...archived];

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Content management"
        title="Create, review, and shape the catalog"
        copy="This module is the editorial core of the platform. Use it for direct movie creation now, then expand it with seasons, episodes, streaming links, TMDB ingest, and moderation workflows."
      />

      <div className="grid gap-4">
        <Panel title={editingMovieId ? "Edit Content" : "New content form"}>
          <AdminMovieForm 
            movieId={editingMovieId} 
            moviesmodHostPattern={moviesmodHostPattern}
            onCancelEdit={editingMovieId ? () => onEditMovie(null) : undefined} 
          />
        </Panel>
      </div>

      <Panel title="Content library">
        <div className="grid gap-3">
          {latest.map((movie) => (
            <article
              key={movie.id}
              className={`group grid gap-4 rounded-[1.3rem] border p-4 transition-all duration-300 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:items-center ${
                movie.isArchived
                  ? "border-zinc-800 bg-[#0e0e0e] opacity-60"
                  : "border-[#222222] bg-[#111111] hover:border-emerald-500/30 hover:bg-[#1a1b2a] hover:shadow-[0_8px_30px_rgba(16,185,129,0.05)]"
              }`}
            >
              <div
                className="h-28 rounded-[1rem] bg-[#26272b] bg-cover bg-center shadow-inner transition-transform duration-500 group-hover:scale-[1.02] sm:h-28"
                style={{ backgroundImage: movie.posterUrl ? `url(${movie.posterUrl})` : undefined }}
              />

              <div className="min-w-0 pr-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="truncate text-lg font-semibold text-white">{movie.title}</p>
                  {movie.contentType && movie.contentType !== "MOVIE" && (
                    <span className="rounded-md bg-sky-500/10 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-widest text-sky-400">
                      {movie.contentType === "WEB_SERIES" ? "Web Series" : movie.contentType === "ANIME" ? "Anime" : "Series"}
                    </span>
                  )}
                  {movie.isArchived && (
                    <span className="rounded-md bg-zinc-500/20 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-widest text-zinc-400">
                      Archived
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-zinc-500">
                  {movie.releaseYear} / {movie.slug}
                </p>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-400">
                  {movie.synopsis || "Synopsis still missing."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {movie.genreNames.length > 0 ? (
                    movie.genreNames.map((genre) => (
                      <span
                        key={`${movie.id}-${genre}`}
                        className="rounded-lg bg-[#222222] px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-zinc-300 transition-colors duration-300 group-hover:bg-emerald-500/10 group-hover:text-emerald-300"
                      >
                        {genre}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-lg bg-amber-400/10 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-amber-300">
                      Needs genres
                    </span>
                  )}
                </div>
                {movie.status && !movie.isArchived && (
                  <span className={`mt-3 inline-block rounded-lg px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-widest ${
                    movie.status === "PUBLISHED" ? "bg-emerald-500/15 text-emerald-400" :
                    movie.status === "ARCHIVED" ? "bg-zinc-500/15 text-zinc-400" :
                    "bg-amber-500/15 text-amber-400"
                  }`}>
                    {movie.status === "PUBLISHED" ? "Live" : movie.status === "ARCHIVED" ? "Paused" : "Draft"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {!movie.isArchived && (
                  <>
                    <StatusToggleButton movieId={movie.id} currentStatus={movie.status ?? "DRAFT"} />
                    <FeaturedToggleButton movieId={movie.id} isFeatured={!!movie.isFeatured} />
                    <button
                      onClick={() => {
                        onEditMovie(movie.id);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-sky-400 transition-all hover:border-sky-500/50 hover:bg-sky-500/10"
                      type="button"
                    >
                      Edit
                    </button>
                  </>
                )}
                <DeleteMovieButton movieId={movie.id} isArchived={movie.isArchived} />
              </div>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function MediaModule({
  mediaReport,
  movies,
  onEditMovie
}: {
  mediaReport: MediaReport;
  movies: AdminMovie[];
  onEditMovie: (movieId: string) => void;
}) {
  const previewAssets = movies.filter((movie) => movie.posterUrl || movie.backdropUrl).slice(0, 8);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Media library"
        title="Track the asset coverage that exists today"
        copy="This module now shows logo state, poster and backdrop coverage, and the titles that need artwork next. It is still form-backed, but the dashboard can now triage media work instead of just previewing it."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InsightCard title="Poster coverage" value={`${mediaReport.totals.withPosterCount}/${mediaReport.totals.movieCount || 0}`} copy="Entries currently carrying poster art." />
        <InsightCard title="Backdrop coverage" value={`${mediaReport.totals.withBackdropCount}/${mediaReport.totals.movieCount || 0}`} copy="Entries currently carrying backdrop art." />
        <InsightCard title="Missing art queue" value={`${mediaReport.totals.missingPosterCount + mediaReport.totals.missingBackdropCount}`} copy="Titles still waiting for artwork attention." />
        <InsightCard title="Logo state" value={mediaReport.logo.url ? "Live" : "Unset"} copy={mediaReport.logo.updatedAt ? `Last updated ${new Date(mediaReport.logo.updatedAt).toLocaleDateString()}` : "No uploaded site logo yet."} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Art coverage queue">
          <div className="grid gap-3">
            {mediaReport.missingPosterQueue.length > 0 ? (
              mediaReport.missingPosterQueue.map((movie) => (
                <button
                  key={`poster-${movie.id}`}
                  type="button"
                  onClick={() => onEditMovie(movie.id)}
                  className="flex items-start justify-between gap-4 rounded-[1.1rem] border border-[#222222] bg-[#111111] p-3 text-left transition-all hover:border-emerald-500/30 hover:bg-[#17191f]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{movie.title}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {movie.releaseYear} · poster missing{movie.missingBackdrop ? " · backdrop missing" : ""}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300">
                    Edit
                  </span>
                </button>
              ))
            ) : (
              <p className="text-sm text-zinc-500">All titles currently have poster art attached.</p>
            )}
          </div>
        </Panel>

        <Panel title="Backdrops and logo">
          <div className="grid gap-3">
            {mediaReport.logo.url ? (
              <div className="rounded-[1.2rem] border border-[#222222] bg-[#111111] p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Current site logo</p>
                <div className="mt-3 flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/8 bg-black/30 p-2">
                    <img src={mediaReport.logo.url} alt="Site logo" className="max-h-full max-w-full object-contain" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">Live logo asset</p>
                    <p className="mt-1 break-all text-xs text-zinc-500">{mediaReport.logo.url}</p>
                    {mediaReport.logo.updatedAt ? (
                      <p className="mt-1 text-xs text-zinc-600">Updated {new Date(mediaReport.logo.updatedAt).toLocaleString()}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[1.2rem] border border-[#222222] bg-[#111111] p-3">
                <p className="text-sm font-semibold text-white">No site logo uploaded yet</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Use the System panel to upload the official logo so the header and share surfaces stay consistent.
                </p>
              </div>
            )}

            {mediaReport.missingBackdropQueue.length > 0 ? (
              <div className="rounded-[1.2rem] border border-[#222222] bg-[#111111] p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Backdrop gaps</p>
                <div className="mt-3 grid gap-2">
                  {mediaReport.missingBackdropQueue.slice(0, 4).map((movie) => (
                    <button
                      key={`backdrop-${movie.id}`}
                      type="button"
                      onClick={() => onEditMovie(movie.id)}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 text-left transition-colors hover:border-sky-500/30 hover:bg-sky-500/8"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-white">{movie.title}</p>
                        <p className="mt-1 text-xs text-zinc-500">{movie.releaseYear}</p>
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-400">Backdrop missing</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-[1.2rem] border border-[#222222] bg-[#111111] p-3">
                <p className="text-sm font-semibold text-white">Backdrop coverage is complete</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">No titles are currently waiting on backdrop artwork.</p>
              </div>
            )}
          </div>
        </Panel>
      </div>

      <Panel title="Poster and backdrop preview">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {previewAssets.map((movie) => (
            <div key={movie.id} className="rounded-[1.2rem] border border-[#222222] bg-[#111111] p-2">
              <div
                className="aspect-[3/4] rounded-xl bg-[#26272b] bg-cover bg-center"
                style={{ backgroundImage: movie.posterUrl ? `url(${movie.posterUrl})` : movie.backdropUrl ? `url(${movie.backdropUrl})` : undefined }}
              />
              <p className="mt-3 truncate text-sm font-medium text-white">{movie.title}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">{movie.releaseYear}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Recent media changes">
        <div className="grid gap-3">
          {mediaReport.recentActivity.length > 0 ? (
            mediaReport.recentActivity.map((entry) => (
              <div key={entry.id} className="rounded-[1.15rem] border border-[#222222] bg-[#111111] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{entry.action}</p>
                  <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{entry.entityType}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {entry.entityId ? `Target: ${entry.entityId}` : "Target: global"}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  {new Date(entry.createdAt).toLocaleString()} · {entry.actor?.email || entry.actor?.clerkUserId || "Unknown actor"}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm leading-7 text-zinc-400">
              No media-related changes have been captured yet.
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
}

type ActorCurationDraft = {
  name: string;
  bio: string;
  knownFor: string;
  birthDate: string;
  birthPlace: string;
  profileUrl: string;
  sourceConfidence: string;
  isIndexable: boolean;
  tmdbId: string;
};

function buildActorDraft(actor: AdminActorRecord): ActorCurationDraft {
  return {
    name: actor.name,
    bio: actor.bio || "",
    knownFor: actor.knownFor || "",
    birthDate: actor.birthDate || "",
    birthPlace: actor.birthPlace || "",
    profileUrl: actor.profileUrl || "",
    sourceConfidence: actor.sourceConfidence != null ? String(actor.sourceConfidence) : "0.5",
    isIndexable: Boolean(actor.isIndexable),
    tmdbId: actor.tmdbId || ""
  };
}

function PeopleModule({
  actors,
  onRefresh
}: {
  actors: AdminActorRecord[];
  onRefresh: () => void;
}) {
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ActorCurationDraft | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [savingActorId, setSavingActorId] = useState<string | null>(null);
  const [queueFilter, setQueueFilter] = useState<"all" | "needs-bio" | "needs-known-for" | "ready">("all");
  const [promotionFocus, setPromotionFocus] = useState(false);
  const [isPending, startTransition] = useTransition();

  const curationQueue = useMemo(() => {
    return [...actors]
      .map((actor) => {
        const issues = [
          !actor.bio?.trim() ? "Missing bio" : null,
          !actor.knownFor?.trim() ? "Missing known-for" : null,
          !actor.profileUrl ? "Missing profile image" : null,
          !actor.isIndexable ? "Not indexable yet" : null,
          actor._count.castMembers < 3 ? "Low filmography depth" : null
        ].filter((issue): issue is string => issue !== null);
        const readiness = [
          actor.isIndexable ? 3 : 0,
          actor._count.castMembers >= 3 ? 2 : 0,
          actor.bio?.trim() ? 1 : 0,
          actor.knownFor?.trim() ? 1 : 0,
          actor.profileUrl ? 1 : 0
        ].reduce((total, value) => total + value, 0);

        return {
          ...actor,
          issues,
          priority: issues.length,
          readiness
        };
      })
      .sort((left, right) => {
        const readinessDelta = right.readiness - left.readiness;
        if (readinessDelta !== 0) {
          return readinessDelta;
        }

        const priorityDelta = left.priority - right.priority;
        if (priorityDelta !== 0) {
          return priorityDelta;
        }

        const updatedDelta = new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
        if (updatedDelta !== 0) {
          return updatedDelta;
        }

        return left.name.localeCompare(right.name);
      });
  }, [actors]);

  const filteredQueue = useMemo(() => {
    if (queueFilter === "all") {
      return curationQueue;
    }

    return curationQueue.filter((actor) => {
      const hasBio = Boolean(actor.bio?.trim());
      const hasKnownFor = Boolean(actor.knownFor?.trim());
      const readyToPromote = !actor.isIndexable && actor._count.castMembers >= 3 && hasBio && hasKnownFor && Boolean(actor.profileUrl);

      if (queueFilter === "needs-bio") {
        return !hasBio;
      }

      if (queueFilter === "needs-known-for") {
        return !hasKnownFor;
      }

      if (queueFilter === "ready") {
        return readyToPromote;
      }

      return true;
    });
  }, [curationQueue, queueFilter]);

  const selectedActor = useMemo(() => {
    if (!selectedActorId) {
      return null;
    }

    return actors.find((actor) => actor.id === selectedActorId) ?? null;
  }, [actors, selectedActorId]);

  useEffect(() => {
    if (!selectedActorId && filteredQueue.length > 0) {
      setSelectedActorId(filteredQueue[0].id);
      return;
    }

    if (selectedActorId && !filteredQueue.some((actor) => actor.id === selectedActorId) && filteredQueue.length > 0) {
      setSelectedActorId(filteredQueue[0].id);
    }
  }, [filteredQueue, selectedActorId]);

  useEffect(() => {
    if (selectedActor) {
      setDraft(buildActorDraft(selectedActor));
    } else {
      setDraft(null);
    }
  }, [selectedActor]);

  const stats = useMemo(() => {
    return {
      total: actors.length,
      indexable: actors.filter((actor) => actor.isIndexable).length,
      withBio: actors.filter((actor) => actor.bio?.trim()).length,
      withKnownFor: actors.filter((actor) => actor.knownFor?.trim()).length
    };
  }, [actors]);

  const canPromoteToIndexable =
    Boolean(selectedActor) &&
    Boolean(draft) &&
    !selectedActor?.isIndexable &&
    (selectedActor?._count.castMembers ?? 0) >= 3 &&
    Boolean(draft?.bio.trim() || draft?.knownFor.trim()) &&
    Boolean(draft?.profileUrl.trim());

  const promotionChecklist = selectedActor && draft ? [
    { label: "Profile image", done: Boolean(draft.profileUrl.trim()) },
    { label: "Bio or known-for", done: Boolean(draft.bio.trim() || draft.knownFor.trim()) },
    { label: "Three+ titles", done: (selectedActor._count.castMembers ?? 0) >= 3 },
    { label: "Not already indexable", done: !selectedActor.isIndexable }
  ] : [];

  async function saveActor() {
    if (!selectedActor || !draft) {
      return;
    }

    setSavingActorId(selectedActor.id);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/admin/actors/${selectedActor.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(draft)
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Could not update actor.");
      }

      setStatusMessage(`${selectedActor.name} updated successfully.`);
      startTransition(() => onRefresh());
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not update actor.");
    } finally {
      setSavingActorId(null);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="People and profiles"
        title="Curate the strongest cast pages"
        copy="Use this module to promote top-billed people pages, refine bios, add known-for summaries, and keep the public entity layer high quality."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InsightCard title="People" value={`${stats.total}`} copy="Canonical actor records in the catalog." />
        <InsightCard title="Indexable" value={`${stats.indexable}`} copy="Profiles already cleared for search indexing." />
        <InsightCard title="With bio" value={`${stats.withBio}`} copy="Actors with a curated short bio on file." />
        <InsightCard title="Known for" value={`${stats.withKnownFor}`} copy="Actors with a known-for summary attached." />
      </div>

      {statusMessage ? (
        <div className="rounded-[1rem] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {statusMessage}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Curation queue">
          <div className="flex flex-wrap gap-2 border-b border-white/8 pb-4">
            {[
              { value: "all", label: "All" },
              { value: "needs-bio", label: "Needs bio" },
              { value: "needs-known-for", label: "Needs known-for" },
              { value: "ready", label: "Ready to promote" }
            ].map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setQueueFilter(filter.value as typeof queueFilter)}
                className={`rounded-full border px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.16em] transition ${
                  queueFilter === filter.value
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
            <span>
              Showing {filteredQueue.length} of {curationQueue.length}
            </span>
            {queueFilter !== "all" ? (
              <button
                type="button"
                onClick={() => setQueueFilter("all")}
                className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-zinc-400 transition hover:border-white/20 hover:text-zinc-200"
              >
                Clear filter
              </button>
            ) : null}
          </div>

          <div className="grid gap-3">
            {filteredQueue.length > 0 ? (
              filteredQueue.slice(0, 12).map((actor) => (
                <button
                  key={actor.id}
                  type="button"
                  onClick={() => setSelectedActorId(actor.id)}
                  className={`rounded-[1.15rem] border p-4 text-left transition-all hover:border-emerald-500/30 hover:bg-[#17191f] ${
                    selectedActorId === actor.id ? "border-emerald-500/30 bg-[#17191f]" : "border-[#222222] bg-[#111111]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-white">{actor.name}</p>
                        {actor.slug ? (
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                            /cast/{actor.slug}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        {actor._count.castMembers} titles · {actor.isIndexable ? "Indexable" : "Needs curation"}
                      </p>
                    </div>
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-amber-200">
                      {actor.priority} issues
                    </span>
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-emerald-200">
                      Readiness {actor.readiness}/8
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {actor.issues.slice(0, 4).map((issue) => (
                      <span key={issue} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                        {issue}
                      </span>
                    ))}
                  </div>
                  {actor.knownFor ? (
                    <p className="mt-3 line-clamp-2 text-xs leading-6 text-zinc-400">
                      Known for {actor.knownFor}
                    </p>
                  ) : null}
                </button>
              ))
            ) : (
              <p className="text-sm leading-7 text-zinc-400">No actor records match the current filter.</p>
            )}
          </div>
        </Panel>

        <Panel title={selectedActor ? `Edit ${selectedActor.name}` : "Select an actor"}>
          {selectedActor && draft ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">
                <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1">
                  {selectedActor.isIndexable ? "Indexable profile" : "Profile in progress"}
                </span>
                <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1">
                  {selectedActor._count.castMembers} titles
                </span>
                {selectedActor.sourceConfidence ? (
                  <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1">
                    Confidence {(selectedActor.sourceConfidence * 100).toFixed(0)}%
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => setPromotionFocus((value) => !value)}
                  className={`rounded-full border px-2.5 py-1 transition ${
                    promotionFocus
                      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                      : "border-white/8 bg-white/[0.03] text-zinc-500 hover:border-white/15 hover:text-zinc-300"
                  }`}
                >
                  {promotionFocus ? "Promotion focus on" : "Promotion focus off"}
                </button>
              </div>

              {promotionFocus ? (
                <div className="rounded-[1rem] border border-cyan-500/20 bg-cyan-500/8 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-cyan-200">Indexable checklist</p>
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                      {canPromoteToIndexable ? "Ready to promote" : "Needs one more pass"}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {promotionChecklist.map((item) => (
                      <div
                        key={item.label}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${
                          item.done ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200" : "border-white/8 bg-white/[0.03] text-zinc-400"
                        }`}
                      >
                        <span>{item.label}</span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.16em]">{item.done ? "Done" : "Open"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
                <div className="overflow-hidden rounded-[1.15rem] border border-[#222222] bg-[#111111]">
                  <div className="aspect-[3/4] bg-[#0f0f0f]">
                    {selectedActor.profileUrl ? (
                      <img src={selectedActor.profileUrl} alt={selectedActor.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.2em] text-zinc-600">
                        No image
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Display name
                    <input
                      value={draft.name}
                      onChange={(event) => setDraft((current) => (current ? { ...current, name: event.target.value } : current))}
                      className="mt-2 w-full rounded-xl border border-[#222222] bg-[#111111] px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-500"
                    />
                  </label>

                  <div className={promotionFocus ? "grid gap-3 sm:grid-cols-1" : "grid gap-3 sm:grid-cols-2"}>
                    {!promotionFocus ? (
                      <label className="block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                        TMDB ID
                        <input
                          value={draft.tmdbId}
                          onChange={(event) => setDraft((current) => (current ? { ...current, tmdbId: event.target.value } : current))}
                          className="mt-2 w-full rounded-xl border border-[#222222] bg-[#111111] px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-500"
                        />
                      </label>
                    ) : null}
                    <label className="block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      Profile image URL
                      <input
                        value={draft.profileUrl}
                        onChange={(event) => setDraft((current) => (current ? { ...current, profileUrl: event.target.value } : current))}
                        className="mt-2 w-full rounded-xl border border-[#222222] bg-[#111111] px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-500"
                      />
                      <MediaUploadButton
                        folder="profiles"
                        prefix={selectedActor.slug || selectedActor.id}
                        label="Upload profile image"
                        onUploaded={(url) => {
                          setDraft((current) => (current ? { ...current, profileUrl: url } : current));
                          setStatusMessage(`${selectedActor.name} profile image uploaded.`);
                        }}
                        className="mt-2"
                      />
                    </label>
                  </div>

                  <label className="block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Known for
                    <textarea
                      value={draft.knownFor}
                      onChange={(event) => setDraft((current) => (current ? { ...current, knownFor: event.target.value } : current))}
                      rows={promotionFocus ? 2 : 2}
                      className="mt-2 w-full rounded-2xl border border-[#222222] bg-[#111111] px-3 py-3 text-sm leading-6 text-white outline-none transition focus:border-emerald-500"
                      placeholder="A short known-for summary"
                    />
                  </label>

                  {!promotionFocus ? (
                    <label className="block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      Bio
                      <textarea
                        value={draft.bio}
                        onChange={(event) => setDraft((current) => (current ? { ...current, bio: event.target.value } : current))}
                        rows={4}
                        className="mt-2 w-full rounded-2xl border border-[#222222] bg-[#111111] px-3 py-3 text-sm leading-6 text-white outline-none transition focus:border-emerald-500"
                        placeholder="Short editorial bio"
                      />
                    </label>
                  ) : null}
                </div>
              </div>

              {!promotionFocus ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Birth date
                    <input
                      value={draft.birthDate}
                      onChange={(event) => setDraft((current) => (current ? { ...current, birthDate: event.target.value } : current))}
                      className="mt-2 w-full rounded-xl border border-[#222222] bg-[#111111] px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-500"
                    />
                  </label>
                  <label className="block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Birth place
                    <input
                      value={draft.birthPlace}
                      onChange={(event) => setDraft((current) => (current ? { ...current, birthPlace: event.target.value } : current))}
                      className="mt-2 w-full rounded-xl border border-[#222222] bg-[#111111] px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-500"
                    />
                  </label>
                  <label className="block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Source confidence
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.1}
                      value={draft.sourceConfidence}
                      onChange={(event) => setDraft((current) => (current ? { ...current, sourceConfidence: event.target.value } : current))}
                      className="mt-2 w-full rounded-xl border border-[#222222] bg-[#111111] px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-500"
                    />
                  </label>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Source confidence
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.1}
                      value={draft.sourceConfidence}
                      onChange={(event) => setDraft((current) => (current ? { ...current, sourceConfidence: event.target.value } : current))}
                      className="mt-2 w-full rounded-xl border border-[#222222] bg-[#111111] px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-500"
                    />
                  </label>
                  <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 text-xs leading-6 text-zinc-400">
                    Promotion focus hides the extra biography fields and keeps the panel centered on the last-mile indexability decision.
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 rounded-xl border border-[#222222] bg-[#111111] px-3 py-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={draft.isIndexable}
                    onChange={(event) => setDraft((current) => (current ? { ...current, isIndexable: event.target.checked } : current))}
                  />
                  Indexable profile
                </label>
                <span className="text-xs text-zinc-500">
                  {draft.isIndexable ? "This profile can appear in the sitemap and public search." : "Keep this profile hidden from indexing until it is strong enough."}
                </span>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={savingActorId === selectedActor.id || isPending}
                  onClick={() => void saveActor()}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-60"
                >
                  Save profile
                </button>
                <button
                  type="button"
                  disabled={!canPromoteToIndexable || savingActorId === selectedActor.id || isPending}
                  onClick={() => {
                    setDraft((current) => (current ? { ...current, isIndexable: true } : current));
                    setStatusMessage(`${selectedActor.name} marked ready for indexing. Save to apply the change.`);
                  }}
                  className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-cyan-300 transition hover:bg-cyan-500/20 disabled:opacity-60"
                >
                  Promote to indexable
                </button>
                {selectedActor.slug ? (
                  <Link
                    href={`/cast/${selectedActor.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-zinc-300 transition hover:border-white/20 hover:text-white"
                  >
                    Open public page
                  </Link>
                ) : null}
                {savingActorId === selectedActor.id ? <span className="text-xs text-emerald-400">Saving...</span> : null}
              </div>
              {!canPromoteToIndexable && selectedActor && !selectedActor.isIndexable ? (
                <p className="text-xs text-zinc-500">
                  Promotion becomes available once the profile has a bio or known-for summary, a profile image, and at least 3 catalog titles.
                </p>
              ) : null}

              <div className="rounded-[1rem] border border-[#222222] bg-[#111111] p-4 text-sm leading-7 text-zinc-400">
                {selectedActor.bio?.trim() || selectedActor.knownFor?.trim() ? (
                  <p>
                    <strong className="text-white">Current profile:</strong>{" "}
                    {selectedActor.knownFor?.trim() ? `Known for ${selectedActor.knownFor}. ` : ""}
                    {selectedActor.bio?.trim() || "This profile still needs a curated bio."}
                  </p>
                ) : (
                  <p>This profile still needs curation. Add a bio and known-for summary to move it toward indexable status.</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm leading-7 text-zinc-400">Select a cast profile from the queue to start editing.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}

function UsersModule({
  adminUserId,
  adminRole,
  recentAuditLogs,
  recentReviews,
  users,
  movies,
  onOpenMovie,
  onRefresh
}: {
  adminUserId: string;
  adminRole: "ADMIN" | "EDITOR" | "MODERATOR" | "USER";
  recentAuditLogs: AdminAuditLog[];
  recentReviews: AdminReviewRecord[];
  users: AdminUserRecord[];
  movies: AdminMovie[];
  onOpenMovie: (movieId: string) => void;
  onRefresh: () => void;
}) {
  const roleCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of recentAuditLogs) {
      const role = entry.actor?.role || "USER";
      counts.set(role, (counts.get(role) ?? 0) + 1);
    }
    return counts;
  }, [recentAuditLogs]);

  const [governanceMessage, setGovernanceMessage] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [busyReviewId, setBusyReviewId] = useState<string | null>(null);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditAction, setAuditAction] = useState("ALL");
  const [auditEntityType, setAuditEntityType] = useState("ALL");
  const [auditActorRole, setAuditActorRole] = useState("ALL");
  const [isPending, startTransition] = useTransition();

  const userRoleCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const user of users) {
      counts.set(user.role, (counts.get(user.role) ?? 0) + 1);
    }
    return counts;
  }, [users]);

  const auditActionOptions = useMemo(() => {
    return Array.from(new Set(recentAuditLogs.map((entry) => entry.action))).sort((left, right) => left.localeCompare(right));
  }, [recentAuditLogs]);

  const auditEntityOptions = useMemo(() => {
    return Array.from(new Set(recentAuditLogs.map((entry) => entry.entityType))).sort((left, right) => left.localeCompare(right));
  }, [recentAuditLogs]);

  const auditRoleOptions = useMemo(() => {
    return Array.from(new Set(recentAuditLogs.map((entry) => entry.actor?.role || "UNKNOWN"))).sort((left, right) => left.localeCompare(right));
  }, [recentAuditLogs]);

  const filteredAuditLogs = useMemo(() => {
    const query = auditSearch.trim().toLowerCase();

    return recentAuditLogs.filter((entry) => {
      if (auditAction !== "ALL" && entry.action !== auditAction) {
        return false;
      }

      if (auditEntityType !== "ALL" && entry.entityType !== auditEntityType) {
        return false;
      }

      if (auditActorRole !== "ALL" && (entry.actor?.role || "UNKNOWN") !== auditActorRole) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchBlob = [
        entry.action,
        entry.entityType,
        entry.entityId ?? "",
        entry.actor?.email ?? "",
        entry.actor?.clerkUserId ?? "",
        JSON.stringify(entry.before ?? ""),
        JSON.stringify(entry.after ?? ""),
        JSON.stringify(entry.metadata ?? "")
      ]
        .join(" ")
        .toLowerCase();

      return searchBlob.includes(query);
    });
  }, [auditAction, auditActorRole, auditEntityType, auditSearch, recentAuditLogs]);

  const reviewQueue = useMemo(() => {
    return [...recentReviews]
      .sort(
        (left, right) =>
          Number(left.moderated) - Number(right.moderated) ||
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      )
      .slice(0, 12);
  }, [recentReviews]);

  const editorialQueue = useMemo(() => {
    return movies
      .map((movie) => {
        const issues = [
          !movie.posterUrl ? "Missing poster" : null,
          !movie.backdropUrl ? "Missing backdrop" : null,
          !movie.synopsis?.trim() ? "Missing synopsis" : null,
          movie.genreNames.length === 0 ? "Missing genres" : null,
          !movie.views ? "No view data" : null,
          movie.contentType === "SERIES" || movie.contentType === "WEB_SERIES" || movie.contentType === "ANIME"
            ? "Check season trailers"
            : null,
          movie.contentType === "SERIES" || movie.contentType === "WEB_SERIES" || movie.contentType === "ANIME"
            ? "Check release packages"
            : null,
          movie.contentType === "MOVIE" && movie.isArchived ? "Archived title" : null
        ].filter((issue): issue is string => issue !== null);

        return {
          ...movie,
          issues,
          priority: issues.length
        };
      })
      .filter((movie) => movie.priority > 0)
      .sort((left, right) => right.priority - left.priority || left.releaseYear.localeCompare(right.releaseYear) || left.title.localeCompare(right.title))
      .slice(0, 8);
  }, [movies]);

  async function updateUserRole(userId: string, role: AdminUserRecord["role"]) {
    setBusyUserId(userId);
    setGovernanceMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Could not update the role.");
      }

      setGovernanceMessage(`Role updated to ${role}.`);
      startTransition(() => onRefresh());
    } catch (error) {
      setGovernanceMessage(error instanceof Error ? error.message : "Could not update the role.");
    } finally {
      setBusyUserId(null);
    }
  }

  async function updateReviewModeration(reviewId: string, moderated: boolean) {
    setBusyReviewId(reviewId);
    setGovernanceMessage(null);

    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}/moderation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moderated })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Could not update the review.");
      }

      setGovernanceMessage(moderated ? "Review marked as reviewed." : "Review returned to queue.");
      startTransition(() => onRefresh());
    } catch (error) {
      setGovernanceMessage(error instanceof Error ? error.message : "Could not update the review.");
    } finally {
      setBusyReviewId(null);
    }
  }

  async function deleteReview(reviewId: string) {
    setBusyReviewId(reviewId);
    setGovernanceMessage(null);

    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Could not delete the review.");
      }

      setGovernanceMessage("Review deleted.");
      startTransition(() => onRefresh());
    } catch (error) {
      setGovernanceMessage(error instanceof Error ? error.message : "Could not delete the review.");
    } finally {
      setBusyReviewId(null);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Roles and logs"
        title="Know who can act and what they changed"
        copy="This module shows the live permission model, recent moderation, and the audit trail for every protected action. Role changes stay locked to admins."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <InsightCard title="Current role" value={adminRole} copy="Role stored in the local user record." />
        <InsightCard title="Clerk user" value={adminUserId.slice(-8).toUpperCase()} copy="The active Clerk identity attached to this dashboard session." />
        <InsightCard title="Audit rows" value={recentAuditLogs.length.toString()} copy="Recent admin actions captured in the audit trail." />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Role model">
          <div className="grid gap-3">
            <TaskCard title="ADMIN" copy="Full dashboard access for catalog, settings, analytics, monetization, and future governance tools." />
            <TaskCard title="EDITOR" copy="Reserved for content-focused publishing workflows and limited editorial operations." />
            <TaskCard title="MODERATOR" copy="Reserved for review and trust-safety actions without full catalog control." />
          </div>
        </Panel>

        <Panel title="Filtered audit trail" className="flex h-[42rem] flex-col" bodyClassName="flex min-h-0 flex-1 flex-col">
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 border-b border-[#222222] bg-[#1a1a1a] px-4 pt-4 pb-4 sm:-mx-5 sm:-mt-5 sm:px-5">
              <div className="grid gap-3 lg:grid-cols-4">
            <label className="grid gap-2 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Search
              <input
                value={auditSearch}
                onChange={(event) => setAuditSearch(event.target.value)}
                className="rounded-xl border border-[#222222] bg-[#161616] px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-500"
                placeholder="Action, actor, entity, review text..."
              />
            </label>
            <label className="grid gap-2 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Action
              <select
                value={auditAction}
                onChange={(event) => setAuditAction(event.target.value)}
                className="rounded-xl border border-[#222222] bg-[#161616] px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-500"
              >
                <option value="ALL">All actions</option>
                {auditActionOptions.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Entity
              <select
                value={auditEntityType}
                onChange={(event) => setAuditEntityType(event.target.value)}
                className="rounded-xl border border-[#222222] bg-[#161616] px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-500"
              >
                <option value="ALL">All entities</option>
                {auditEntityOptions.map((entityType) => (
                  <option key={entityType} value={entityType}>
                    {entityType}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Actor role
              <select
                value={auditActorRole}
                onChange={(event) => setAuditActorRole(event.target.value)}
                className="rounded-xl border border-[#222222] bg-[#161616] px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-500"
              >
                <option value="ALL">All roles</option>
                {auditRoleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>
          </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-[0.65rem] uppercase tracking-[0.16em] text-zinc-500">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
              Showing {filteredAuditLogs.length} of {recentAuditLogs.length}
            </span>
            <button
              type="button"
              onClick={() => {
                setAuditSearch("");
                setAuditAction("ALL");
                setAuditEntityType("ALL");
                setAuditActorRole("ALL");
              }}
              className="rounded-full border border-[#222222] bg-[#111111] px-3 py-1 text-zinc-300 transition hover:bg-[#1a1a24]"
            >
              Clear filters
            </button>
              </div>
            </div>
            <div className="grid gap-2">
            {filteredAuditLogs.length > 0 ? (
              filteredAuditLogs.map((entry) => (
                <div key={entry.id} className="rounded-[1rem] border border-[#222222] bg-[#111111] px-3 py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[0.92rem] font-semibold text-white">{entry.action}</p>
                      <p className="mt-0.5 text-[0.68rem] uppercase tracking-[0.14em] text-zinc-500">
                        {entry.entityType}{entry.entityId ? ` · ${entry.entityId}` : " · global"}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                      {new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="mt-1 text-[0.72rem] text-zinc-400">
                    {entry.actor?.email || entry.actor?.clerkUserId || "Unknown"}
                    {entry.actor?.role ? ` · ${entry.actor.role}` : ""}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-[1rem] border border-white/8 bg-white/[0.03] px-3 py-3 text-sm leading-7 text-zinc-400">
                No audit entries match the current filters.
              </p>
            )}
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Audit mix">
          <div className="grid gap-3">
            {Array.from(roleCounts.entries()).length > 0 ? (
              Array.from(roleCounts.entries()).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between rounded-[1.05rem] border border-[#222222] bg-[#111111] px-4 py-3">
                  <span className="text-sm text-zinc-300">{role}</span>
                  <span className="text-xs text-zinc-500">{count} entries</span>
                </div>
              ))
            ) : (
              <p className="text-sm leading-7 text-zinc-400">Role activity will populate here after audit logs are written.</p>
            )}
          </div>
        </Panel>

        <Panel title="Editorial queue">
          <div className="grid gap-3">
            {editorialQueue.length > 0 ? (
              editorialQueue.map((movie) => (
                <div key={movie.id} className="rounded-[1.1rem] border border-[#222222] bg-[#111111] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{movie.title}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {movie.releaseYear} · {movie.genreNames.length > 0 ? movie.genreNames.join(", ") : "No genres"} · {movie.issues.length} issues
                      </p>
                    </div>
                    <button
                      onClick={() => onOpenMovie(movie.id)}
                      className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-emerald-300 transition hover:bg-emerald-500/20"
                    >
                      Open editor
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {movie.issues.map((issue) => (
                      <span key={issue} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                        {issue}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-[0.68rem] uppercase tracking-[0.18em] text-zinc-500">
                    {movie.contentType === "SERIES" || movie.contentType === "WEB_SERIES" || movie.contentType === "ANIME"
                      ? "Series workflow"
                      : "Movie workflow"}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm leading-7 text-zinc-400">No catalog issues detected in the current snapshot.</p>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from(userRoleCounts.entries()).length > 0 ? (
          Array.from(userRoleCounts.entries()).map(([role, count]) => (
            <div key={role} className="rounded-[1.05rem] border border-[#222222] bg-[#111111] px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Current users</div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <span className="text-sm text-zinc-300">{role}</span>
                <span className="text-xs text-zinc-500">{count}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[1.05rem] border border-[#222222] bg-[#111111] px-4 py-3 text-sm text-zinc-400 sm:col-span-2 xl:col-span-4">
            No user roles are available yet.
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Role directory">
          <div className="grid gap-3">
            {users.length > 0 ? (
              users.map((user) => (
                <div key={user.id} className="rounded-[1.1rem] border border-[#222222] bg-[#111111] p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-gradient-to-br from-emerald-500/20 to-sky-500/20 text-xs font-bold text-white">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.displayName || user.email} className="h-full w-full object-cover" />
                        ) : (
                          (user.displayName || user.username || user.email).charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{user.displayName || user.username || user.email}</p>
                        <p className="mt-1 truncate text-xs text-zinc-500">
                          @{user.username || user.email.split("@")[0]} · {user.email}
                        </p>
                        <p className="mt-1 text-xs text-zinc-600">
                          {user.clerkUserId ? "Clerk " + user.clerkUserId.slice(-8).toUpperCase() : "No Clerk link"} · Joined {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-zinc-300">
                      {user.role}
                    </span>
                  </div>
                  {user.bio ? <p className="mt-3 text-sm leading-7 text-zinc-400">{user.bio}</p> : null}
                  <div className="mt-3 grid gap-2 text-[0.65rem] uppercase tracking-[0.14em] text-zinc-500 sm:grid-cols-4">
                    <span>Reviews: {user._count.reviews}</span>
                    <span>Bookmarks: {user._count.favorites}</span>
                    <span>Wishlist: {user._count.wishlists}</span>
                    <span>Audit logs: {user._count.auditLogs}</span>
                  </div>
                  {adminRole === "ADMIN" ? (
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <label className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                        Role
                        <select
                          value={user.role}
                          disabled={busyUserId === user.id || isPending}
                          onChange={(event) => {
                            void updateUserRole(user.id, event.target.value as AdminUserRecord["role"]);
                          }}
                          className="mt-2 block min-w-[10rem] rounded-xl border border-[#222222] bg-[#161616] px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-500 disabled:opacity-60"
                        >
                          <option value="USER">USER</option>
                          <option value="MODERATOR">MODERATOR</option>
                          <option value="EDITOR">EDITOR</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </label>
                      {busyUserId === user.id ? <span className="text-xs text-emerald-400">Saving...</span> : null}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-zinc-500">Role changes are restricted to admins.</p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm leading-7 text-zinc-400">No local users yet.</p>
            )}
          </div>
        </Panel>

        <Panel title="Review moderation queue">
          <div className="grid gap-3">
            {reviewQueue.length > 0 ? (
              reviewQueue.map((review) => (
                <div key={review.id} className="rounded-[1.15rem] border border-[#222222] bg-[#111111] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-white">{review.movie.title}</p>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                          {review.movie.releaseYear}
                        </span>
                        <span className={`rounded-full px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] ${review.moderated ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border border-amber-500/30 bg-amber-500/10 text-amber-200"}`}>
                          {review.moderated ? "Reviewed" : "Needs review"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        {review.user.email} · {review.rating}/5 · {new Date(review.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenMovie(review.movie.id)}
                      className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-emerald-300 transition hover:bg-emerald-500/20"
                    >
                      Open title
                    </button>
                  </div>
                  <div className="mt-3 rounded-[1rem] border border-[#222222] bg-[#161616] p-4 text-sm leading-relaxed text-zinc-400">
                    {review.text || <span className="italic text-zinc-600">No comment provided.</span>}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={busyReviewId === review.id || isPending}
                      onClick={() => {
                        void updateReviewModeration(review.id, !review.moderated);
                      }}
                      className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-zinc-200 transition hover:border-emerald-500/30 hover:text-white disabled:opacity-60"
                    >
                      {review.moderated ? "Return to queue" : "Mark reviewed"}
                    </button>
                    <button
                      type="button"
                      disabled={busyReviewId === review.id || isPending}
                      onClick={() => {
                        if (window.confirm("Delete this review? This action cannot be undone.")) {
                          void deleteReview(review.id);
                        }
                      }}
                      className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-60"
                    >
                      Delete
                    </button>
                    {busyReviewId === review.id ? <span className="text-xs text-emerald-400">Updating...</span> : null}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm leading-7 text-zinc-400">No recent reviews need attention right now.</p>
            )}
          </div>
        </Panel>
      </div>
      {governanceMessage ? (
        <div className="rounded-[1rem] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {governanceMessage}
        </div>
      ) : null}
    </div>
  );
}

function MonetizationModule() {
  const [scriptVerify, setScriptVerify] = useState("");
  const [scriptSidebar, setScriptSidebar] = useState("");
  const [scriptFeed, setScriptFeed] = useState("");
  const [videoAdScript, setVideoAdScript] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/settings?key=ad_script_verify_banner").then(r => r.json()),
      fetch("/api/settings?key=ad_script_movie_sidebar").then(r => r.json()),
      fetch("/api/settings?key=ad_script_homepage_feed").then(r => r.json()),
      fetch("/api/settings?key=video_ad_script").then(r => r.json())
    ]).then(([scriptVerifyData, scriptSidebarData, scriptFeedData, videoAdData]) => {
      setScriptVerify(scriptVerifyData.value || "");
      setScriptSidebar(scriptSidebarData.value || "");
      setScriptFeed(scriptFeedData.value || "");
      setVideoAdScript(videoAdData.value || "");
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const responses = await Promise.all([
        fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "ad_script_verify_banner", value: scriptVerify })
        }),
        fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "ad_script_movie_sidebar", value: scriptSidebar })
        }),
        fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "ad_script_homepage_feed", value: scriptFeed })
        }),
        fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "video_ad_script", value: videoAdScript })
        })
      ]);

      for (const response of responses) {
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Failed to save ad configuration.");
        }
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save ad configuration.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Monetization"
        title="Ad configuration with validation and isolation"
        copy="Manage trusted ad-provider embed snippets. Saved ads are validated on the server and rendered inside sandboxed iframes so they cannot directly mutate the parent page."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Banner & Display Ads">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading settings...</p>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Verify Page Banners</label>
                <textarea 
                  value={scriptVerify} 
                  onChange={e => setScriptVerify(e.target.value)} 
                  placeholder="<script src='...'></script>"
                  className="w-full min-h-[100px] rounded-xl border border-[#222222] bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-emerald-500 font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Movie Page Sidebar</label>
                <textarea 
                  value={scriptSidebar} 
                  onChange={e => setScriptSidebar(e.target.value)} 
                  placeholder="<script src='...'></script>"
                  className="w-full min-h-[100px] rounded-xl border border-[#222222] bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-emerald-500 font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Homepage Feed</label>
                <textarea 
                  value={scriptFeed} 
                  onChange={e => setScriptFeed(e.target.value)} 
                  placeholder="<script src='...'></script>"
                  className="w-full min-h-[100px] rounded-xl border border-[#222222] bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-emerald-500 font-mono"
                />
              </div>
              
              <div className="pt-4 border-t border-[#222222]">
                <h4 className="text-sm font-bold text-white mb-4">Third-Party Video Ad (Phase 1)</h4>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Video Ad HTML/JS Script</label>
                  <textarea 
                    value={videoAdScript} 
                    onChange={e => setVideoAdScript(e.target.value)} 
                    placeholder="<script src='...'></script>"
                    className="w-full min-h-[100px] rounded-xl border border-[#222222] bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-emerald-500 font-mono"
                  />
                  <p className="text-xs text-zinc-500">This snippet renders inside the 30-second Phase 1 waiting room.</p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-xl bg-emerald-500 px-5 py-2 text-xs font-bold uppercase tracking-wider text-black transition hover:bg-emerald-400 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Configuration"}
                </button>
                {saved && <span className="text-xs text-emerald-400">Settings saved.</span>}
                {saveError && <span className="text-xs text-red-400">{saveError}</span>}
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Setup Instructions">
          <div className="grid gap-3 text-sm text-zinc-300 leading-relaxed">
            <p>1. Go to your preferred Ad Network (e.g. Adsterra, Monetag, ExoClick).</p>
            <p>2. Create a new Ad Zone (Native Banner, Social Bar, Popunder, or Video).</p>
            <p>3. Copy the generated hosted embed snippet or iframe tag.</p>
            <p>4. Paste it into the relevant field on the left and save.</p>
            <p>5. If a provider is rejected, add its domain to <code>AD_ALLOWED_HOSTS</code> only after you trust it.</p>
            <p className="mt-4 text-emerald-400"><strong>Note:</strong> Ads now render in sandboxed iframes to reduce page-level breakage and cross-script interference.</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function AnalyticsModuleLegacy({
  categories,
  movies,
  movieCount
}: {
  categories: Array<{ count: number; name: string }>;
  movies: AdminMovie[];
  movieCount: number;
}) {
  const totalViews = movies.reduce((sum, m) => sum + (m.views || 0), 0);
  const totalClicks = movies.reduce((sum, m) => sum + (m.clicks || 0), 0);
  
  const topMoviesByViews = [...movies].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Analytics and reports"
        title="See trends before they become problems"
        copy="Overview of unique daily browser signals tracked directly on your infrastructure."
      />

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Panel title="Lifetime Traffic Signals">
          <div className="grid gap-3 sm:grid-cols-2">
            <InsightCard title="Total Movie Views" value={totalViews.toLocaleString()} copy="Unique daily movie-page visits after browser dedupe." />
            <InsightCard title="Total Link Clicks" value={totalClicks.toLocaleString()} copy="Unique daily outbound handoffs after browser dedupe." />
            <InsightCard title="Catalog Size" value={`${movieCount}`} copy="Current total content records." />
            <InsightCard title="Conversion Rate" value={`${totalViews ? ((totalClicks / totalViews) * 100).toFixed(1) : 0}%`} copy="Unique daily handoffs per unique daily view across the catalog." />
          </div>
        </Panel>

        <Panel title="Top Content by Views">
          <div className="grid gap-3">
            {topMoviesByViews.length > 0 ? topMoviesByViews.map((movie, idx) => (
              <div key={movie.id} className="rounded-[1.15rem] border border-[#222222] bg-[#111111] p-3 flex items-center gap-4">
                <span className="text-zinc-500 font-bold w-4">{idx + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{movie.title}</p>
                  <p className="text-xs text-zinc-500">{movie.views || 0} views • {movie.clicks || 0} clicks</p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-zinc-500 p-4 text-center">No traffic recorded yet.</p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function AnalyticsModule({
  analyticsReport,
  categories,
  movieCount
}: {
  analyticsReport: AnalyticsReport;
  categories: Array<{ count: number; name: string }>;
  movieCount: number;
}) {
  const [windowKey, setWindowKey] = useState<AnalyticsWindowKey>("30d");
  const selectedWindow = analyticsReport.windows.find((window) => window.key === windowKey) ?? analyticsReport.windows[1];
  const topMovies = analyticsReport.topMovies[windowKey];
  const topGenres = analyticsReport.topGenres[windowKey];
  const trend = analyticsReport.dailyTrend.slice(-14);
  const peakViews = Math.max(...trend.map((point) => point.views), 1);
  const peakClicks = Math.max(...trend.map((point) => point.clicks), 1);
  const activeCategories = categories.slice(0, 6);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Analytics and reports"
        title="See trends before they become problems"
        copy="Windowed reporting built from the daily metrics table, with clear 7, 30, and 90 day summaries plus the content and genres driving activity."
      />

      <div className="flex flex-wrap gap-2">
        {analyticsReport.windows.map((window) => (
          <button
            key={window.key}
            type="button"
            onClick={() => setWindowKey(window.key)}
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-all ${
              window.key === windowKey
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
            }`}
          >
            {window.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title={`${selectedWindow.label} performance`}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InsightCard title="Views" value={selectedWindow.views.toLocaleString()} copy="Daily metric views recorded in the selected window." />
            <InsightCard title="Clicks" value={selectedWindow.clicks.toLocaleString()} copy="Outbound handoffs recorded in the selected window." />
            <InsightCard title="Active titles" value={selectedWindow.activeTitles.toLocaleString()} copy="Distinct movies that generated activity in the selected window." />
            <InsightCard title="Conversion" value={`${(selectedWindow.conversionRate * 100).toFixed(1)}%`} copy="Click-through relative to the view total for the selected window." />
          </div>

          <div className="mt-5 rounded-[1.3rem] border border-[#222222] bg-[#111111] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[0.68rem] uppercase tracking-[0.22em] text-zinc-500">Trend</p>
                <p className="mt-1 text-sm text-zinc-300">Last {analyticsReport.trendDays} days of activity, zero-padded for quiet days.</p>
              </div>
              <p className="text-xs text-zinc-500">
                {selectedWindow.from} to {selectedWindow.to}
              </p>
            </div>

            <div className="mt-4 grid gap-2">
              {trend.map((point) => {
                const dayLabel = new Date(`${point.date}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
                const viewWidth = Math.max(6, Math.round((point.views / peakViews) * 100));
                const clickWidth = Math.max(6, Math.round((point.clicks / peakClicks) * 100));

                return (
                  <div key={point.date} className="grid grid-cols-[4rem_minmax(0,1fr)_3rem_3rem] items-center gap-3">
                    <span className="text-xs text-zinc-500">{dayLabel}</span>
                    <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.05]">
                      <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-400/80" style={{ width: `${viewWidth}%` }} />
                      <div className="absolute inset-y-0 left-0 rounded-full bg-cyan-400/80" style={{ width: `${clickWidth}%` }} />
                    </div>
                    <span className="text-right text-xs text-zinc-400">{point.views}</span>
                    <span className="text-right text-xs text-zinc-400">{point.clicks}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>

        <Panel title={`${selectedWindow.label} leaders`}>
          <div className="grid gap-3">
            {topMovies.length > 0 ? topMovies.map((movie, idx) => (
              <div key={movie.id} className="rounded-[1.15rem] border border-[#222222] bg-[#111111] p-3">
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 w-4 font-bold text-zinc-500">{idx + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{movie.title}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {movie.releaseYear} · {movie.views.toLocaleString()} views · {movie.clicks.toLocaleString()} clicks
                    </p>
                    <div className="mt-3 h-2 rounded-full bg-white/[0.05]">
                      <div
                        className="h-2 rounded-full bg-emerald-400/80"
                        style={{ width: `${Math.max(8, Math.min(100, Math.round(movie.conversionRate * 100 * 4)))}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <p className="p-4 text-center text-sm text-zinc-500">No activity recorded in this period yet.</p>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Genre momentum">
          <div className="grid gap-3">
            {topGenres.length > 0 ? topGenres.map((genre) => (
              <div key={genre.name} className="rounded-[1.1rem] border border-[#222222] bg-[#111111] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{genre.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">{genre.movieCount} active titles in window</p>
                  </div>
                  <p className="text-xs text-zinc-400">{genre.views.toLocaleString()} views</p>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                  <span>{genre.clicks.toLocaleString()} clicks</span>
                  <span>•</span>
                  <span>{genre.views > 0 ? ((genre.clicks / genre.views) * 100).toFixed(1) : "0.0"}% conversion</span>
                </div>
              </div>
            )) : (
              <p className="p-4 text-center text-sm text-zinc-500">No genre-level signal yet.</p>
            )}
          </div>
        </Panel>

        <Panel title="Catalog snapshot">
          <div className="grid gap-3 sm:grid-cols-2">
            <InsightCard title="Catalog size" value={`${movieCount}`} copy="Current total movies and series available in the admin catalog." />
            <InsightCard title="Tracked genres" value={`${categories.length}`} copy="Distinct categories currently represented in the catalog." />
            <InsightCard title="Best window" value={selectedWindow.label} copy="Quick switch between 7, 30, and 90 day reporting windows." />
            <InsightCard title="Generated at" value={new Date(analyticsReport.generatedAt).toLocaleTimeString()} copy="The last time this report was assembled from the database." />
          </div>

          <div className="mt-5 grid gap-2">
            {activeCategories.length > 0 ? activeCategories.map((category) => (
              <div key={category.name} className="flex items-center justify-between rounded-[1.05rem] border border-[#222222] bg-[#111111] px-4 py-3">
                <span className="text-sm text-zinc-300">{category.name}</span>
                <span className="text-xs text-zinc-500">{category.count}</span>
              </div>
            )) : (
              <p className="p-4 text-center text-sm text-zinc-500">No categories available yet.</p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function AnnouncementEditor() {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings?key=announcement_text")
      .then(r => r.json())
      .then(d => { setText(d.value ?? ""); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "announcement_text", value: text })
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading...</p>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">This text appears in the green announcement bar at the top of the homepage. Leave blank to hide it.</p>
      <textarea
        rows={3}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Our category system is expanding. Browse the library now..."
        className="w-full rounded-xl border border-[#222222] bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-emerald-500 focus:shadow-[0_0_15px_rgba(16,185,129,0.1)]"
      />
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-emerald-500 px-5 py-2 text-xs font-bold uppercase tracking-wider text-black transition hover:bg-emerald-400 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        {saved && <span className="text-xs text-emerald-400">Saved and live on homepage.</span>}
      </div>
    </div>
  );
}

function SitewideSettingsEditor() {
  const [siteTitle, setSiteTitle] = useState(DEFAULT_SITE_SETTINGS.siteTitle);
  const [siteDescription, setSiteDescription] = useState(DEFAULT_SITE_SETTINGS.siteDescription);
  const [footerBlurb, setFooterBlurb] = useState(DEFAULT_SITE_SETTINGS.footerBlurb);
  const [footerLinksText, setFooterLinksText] = useState(formatFooterLinks(DEFAULT_FOOTER_LINKS));
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState(DEFAULT_SITE_SETTINGS.maintenanceMessage);
  const [homepageFeaturedEnabled, setHomepageFeaturedEnabled] = useState(true);
  const [homepageFeedEnabled, setHomepageFeedEnabled] = useState(true);
  const [sponsorCampaignEnabled, setSponsorCampaignEnabled] = useState(false);
  const [sponsorCampaignTitle, setSponsorCampaignTitle] = useState("");
  const [sponsorCampaignBody, setSponsorCampaignBody] = useState("");
  const [sponsorCampaignSponsor, setSponsorCampaignSponsor] = useState("");
  const [sponsorCampaignCtaText, setSponsorCampaignCtaText] = useState("");
  const [sponsorCampaignCtaHref, setSponsorCampaignCtaHref] = useState("");
  const [sponsorCampaignStartAt, setSponsorCampaignStartAt] = useState("");
  const [sponsorCampaignEndAt, setSponsorCampaignEndAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/settings?key=${SITE_SETTINGS_KEYS.siteTitle}`).then((r) => r.json()),
      fetch(`/api/settings?key=${SITE_SETTINGS_KEYS.siteDescription}`).then((r) => r.json()),
      fetch(`/api/settings?key=${SITE_SETTINGS_KEYS.footerBlurb}`).then((r) => r.json()),
      fetch(`/api/settings?key=${SITE_SETTINGS_KEYS.footerLinksJson}`).then((r) => r.json()),
      fetch(`/api/settings?key=${SITE_SETTINGS_KEYS.maintenanceMode}`).then((r) => r.json()),
      fetch(`/api/settings?key=${SITE_SETTINGS_KEYS.maintenanceMessage}`).then((r) => r.json()),
      fetch(`/api/settings?key=${SITE_SETTINGS_KEYS.homepageFeaturedEnabled}`).then((r) => r.json()),
      fetch(`/api/settings?key=${SITE_SETTINGS_KEYS.homepageFeedEnabled}`).then((r) => r.json()),
      fetch(`/api/settings?key=${SITE_SETTINGS_KEYS.sponsorCampaignEnabled}`).then((r) => r.json()),
      fetch(`/api/settings?key=${SITE_SETTINGS_KEYS.sponsorCampaignTitle}`).then((r) => r.json()),
      fetch(`/api/settings?key=${SITE_SETTINGS_KEYS.sponsorCampaignBody}`).then((r) => r.json()),
      fetch(`/api/settings?key=${SITE_SETTINGS_KEYS.sponsorCampaignSponsor}`).then((r) => r.json()),
      fetch(`/api/settings?key=${SITE_SETTINGS_KEYS.sponsorCampaignCtaText}`).then((r) => r.json()),
      fetch(`/api/settings?key=${SITE_SETTINGS_KEYS.sponsorCampaignCtaHref}`).then((r) => r.json()),
      fetch(`/api/settings?key=${SITE_SETTINGS_KEYS.sponsorCampaignStartAt}`).then((r) => r.json()),
      fetch(`/api/settings?key=${SITE_SETTINGS_KEYS.sponsorCampaignEndAt}`).then((r) => r.json())
    ])
      .then(([titleData, descriptionData, blurbData, linksData, maintenanceData, messageData, featuredData, feedData, sponsorEnabledData, sponsorTitleData, sponsorBodyData, sponsorSponsorData, sponsorCtaTextData, sponsorCtaHrefData, sponsorStartAtData, sponsorEndAtData]) => {
        setSiteTitle(titleData.value || DEFAULT_SITE_SETTINGS.siteTitle);
        setSiteDescription(descriptionData.value || DEFAULT_SITE_SETTINGS.siteDescription);
        setFooterBlurb(blurbData.value || DEFAULT_SITE_SETTINGS.footerBlurb);
        setFooterLinksText(formatFooterLinks(parseFooterLinks(linksData.value)));
        setMaintenanceMode(parseBooleanSetting(maintenanceData.value, DEFAULT_SITE_SETTINGS.maintenanceMode));
        setMaintenanceMessage(messageData.value || DEFAULT_SITE_SETTINGS.maintenanceMessage);
        setHomepageFeaturedEnabled(parseBooleanSetting(featuredData.value, DEFAULT_SITE_SETTINGS.homepageFeaturedEnabled));
        setHomepageFeedEnabled(parseBooleanSetting(feedData.value, DEFAULT_SITE_SETTINGS.homepageFeedEnabled));
        setSponsorCampaignEnabled(parseBooleanSetting(sponsorEnabledData.value, DEFAULT_SITE_SETTINGS.sponsorCampaignEnabled));
        setSponsorCampaignTitle(sponsorTitleData.value || DEFAULT_SITE_SETTINGS.sponsorCampaignTitle);
        setSponsorCampaignBody(sponsorBodyData.value || DEFAULT_SITE_SETTINGS.sponsorCampaignBody);
        setSponsorCampaignSponsor(sponsorSponsorData.value || DEFAULT_SITE_SETTINGS.sponsorCampaignSponsor);
        setSponsorCampaignCtaText(sponsorCtaTextData.value || DEFAULT_SITE_SETTINGS.sponsorCampaignCtaText);
        setSponsorCampaignCtaHref(sponsorCtaHrefData.value || DEFAULT_SITE_SETTINGS.sponsorCampaignCtaHref);
        setSponsorCampaignStartAt(formatDateTimeLocalValue(sponsorStartAtData.value));
        setSponsorCampaignEndAt(formatDateTimeLocalValue(sponsorEndAtData.value));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function formatFooterLinks(links: Array<{ label: string; href: string }>) {
    return links.map((link) => `${link.label} | ${link.href}`).join("\n");
  }

  function formatDateTimeLocalValue(value: string | null | undefined) {
    if (!value) {
      return "";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return "";
    }

    const offsetDate = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
    return offsetDate.toISOString().slice(0, 16);
  }

  function parseFooterLinksText(text: string) {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return DEFAULT_FOOTER_LINKS;
    }

    const parsed = lines.map((line) => {
      const [labelPart, hrefPart] = line.split("|").map((part) => part.trim());
      if (!labelPart || !hrefPart) {
        return null;
      }
      return { label: labelPart, href: hrefPart };
    });

    if (parsed.some((link) => link === null)) {
      return null;
    }

    return parsed as Array<{ label: string; href: string }>;
  }

  function parseDateTime(value: string) {
    if (!value.trim()) {
      return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  async function saveSetting(key: string, value: string) {
    return fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value })
    });
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    setSaveError(null);

    const footerLinks = parseFooterLinksText(footerLinksText);

    if (!footerLinks) {
      setSaving(false);
      setSaveError("Footer links must be written as Label | /path per line.");
      return;
    }

    const campaignStart = parseDateTime(sponsorCampaignStartAt);
    const campaignEnd = parseDateTime(sponsorCampaignEndAt);

    if ((sponsorCampaignStartAt && !campaignStart) || (sponsorCampaignEndAt && !campaignEnd)) {
      setSaving(false);
      setSaveError("Sponsor campaign dates must be valid datetime-local values.");
      return;
    }

    if (campaignStart && campaignEnd && campaignEnd < campaignStart) {
      setSaving(false);
      setSaveError("Sponsor campaign end must be after the start.");
      return;
    }

    try {
      const responses = await Promise.all([
        saveSetting(SITE_SETTINGS_KEYS.siteTitle, siteTitle),
        saveSetting(SITE_SETTINGS_KEYS.siteDescription, siteDescription),
        saveSetting(SITE_SETTINGS_KEYS.footerBlurb, footerBlurb),
        saveSetting(SITE_SETTINGS_KEYS.footerLinksJson, serializeFooterLinks(footerLinks)),
        saveSetting(SITE_SETTINGS_KEYS.maintenanceMode, maintenanceMode ? "true" : "false"),
        saveSetting(SITE_SETTINGS_KEYS.maintenanceMessage, maintenanceMessage),
        saveSetting(SITE_SETTINGS_KEYS.homepageFeaturedEnabled, homepageFeaturedEnabled ? "true" : "false"),
        saveSetting(SITE_SETTINGS_KEYS.homepageFeedEnabled, homepageFeedEnabled ? "true" : "false"),
        saveSetting(SITE_SETTINGS_KEYS.sponsorCampaignEnabled, sponsorCampaignEnabled ? "true" : "false"),
        saveSetting(SITE_SETTINGS_KEYS.sponsorCampaignTitle, sponsorCampaignTitle),
        saveSetting(SITE_SETTINGS_KEYS.sponsorCampaignBody, sponsorCampaignBody),
        saveSetting(SITE_SETTINGS_KEYS.sponsorCampaignSponsor, sponsorCampaignSponsor),
        saveSetting(SITE_SETTINGS_KEYS.sponsorCampaignCtaText, sponsorCampaignCtaText),
        saveSetting(SITE_SETTINGS_KEYS.sponsorCampaignCtaHref, sponsorCampaignCtaHref),
        saveSetting(SITE_SETTINGS_KEYS.sponsorCampaignStartAt, sponsorCampaignStartAt),
        saveSetting(SITE_SETTINGS_KEYS.sponsorCampaignEndAt, sponsorCampaignEndAt)
      ]);

      const failed = responses.find((response) => !response.ok);
      if (failed) {
        const payload = (await failed.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to save sitewide settings.");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save sitewide settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading sitewide controls...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-zinc-400">
          Site title
          <input
            value={siteTitle}
            onChange={(event) => setSiteTitle(event.target.value)}
            className="w-full rounded-xl border border-[#222222] bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-emerald-500"
            placeholder="Movies I Loved"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-zinc-400">
          Site description
          <input
            value={siteDescription}
            onChange={(event) => setSiteDescription(event.target.value)}
            className="w-full rounded-xl border border-[#222222] bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-emerald-500"
            placeholder="A fast, dark movie catalog..."
          />
        </label>
      </div>

      <div className="rounded-[1.2rem] border border-[#222222] bg-[#111111] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Sponsor campaign</p>
            <p className="mt-1 text-xs text-zinc-500">Controls the sitewide sponsor strip shown above public pages and only renders inside the scheduled window.</p>
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-zinc-300">
            <span>Enabled</span>
            <input checked={sponsorCampaignEnabled} onChange={(event) => setSponsorCampaignEnabled(event.target.checked)} type="checkbox" />
          </label>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-zinc-400">
            Campaign title
            <input
              value={sponsorCampaignTitle}
              onChange={(event) => setSponsorCampaignTitle(event.target.value)}
              className="w-full rounded-xl border border-[#222222] bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-emerald-500"
              placeholder="Presented by..."
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-zinc-400">
            Sponsor name
            <input
              value={sponsorCampaignSponsor}
              onChange={(event) => setSponsorCampaignSponsor(event.target.value)}
              className="w-full rounded-xl border border-[#222222] bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-emerald-500"
              placeholder="Acme Studios"
            />
          </label>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-zinc-400">
            Campaign body
            <textarea
              rows={3}
              value={sponsorCampaignBody}
              onChange={(event) => setSponsorCampaignBody(event.target.value)}
              className="w-full rounded-xl border border-[#222222] bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-emerald-500"
              placeholder="Short sponsor message shown in the strip."
            />
          </label>
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-zinc-400">
              CTA text
              <input
                value={sponsorCampaignCtaText}
                onChange={(event) => setSponsorCampaignCtaText(event.target.value)}
                className="w-full rounded-xl border border-[#222222] bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-emerald-500"
                placeholder="Learn More"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-zinc-400">
              CTA href
              <input
                value={sponsorCampaignCtaHref}
                onChange={(event) => setSponsorCampaignCtaHref(event.target.value)}
                className="w-full rounded-xl border border-[#222222] bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-emerald-500"
                placeholder="https://..."
              />
            </label>
          </div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-zinc-400">
            Start date and time
            <input
              value={sponsorCampaignStartAt}
              onChange={(event) => setSponsorCampaignStartAt(event.target.value)}
              type="datetime-local"
              className="w-full rounded-xl border border-[#222222] bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-emerald-500"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-zinc-400">
            End date and time
            <input
              value={sponsorCampaignEndAt}
              onChange={(event) => setSponsorCampaignEndAt(event.target.value)}
              type="datetime-local"
              className="w-full rounded-xl border border-[#222222] bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-emerald-500"
            />
          </label>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          If both dates are set, the strip is only visible while the current time is within the scheduled window.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-zinc-400">
          Footer blurb
          <textarea
            rows={4}
            value={footerBlurb}
            onChange={(event) => setFooterBlurb(event.target.value)}
            className="w-full rounded-xl border border-[#222222] bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-emerald-500"
            placeholder="A dark, fast, category-driven movie home..."
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-zinc-400">
          Maintenance message
          <textarea
            rows={4}
            value={maintenanceMessage}
            onChange={(event) => setMaintenanceMessage(event.target.value)}
            className="w-full rounded-xl border border-[#222222] bg-[#111111] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-emerald-500"
            placeholder="We’ll be back shortly."
          />
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[1.2rem] border border-[#222222] bg-[#111111] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Homepage toggles</p>
              <p className="mt-1 text-xs text-zinc-500">Control the public hero section and feed ad placement.</p>
            </div>
            <div className="flex flex-col gap-2 text-xs">
              <label className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                <span className="text-zinc-300">Featured carousel</span>
                <input checked={homepageFeaturedEnabled} onChange={(event) => setHomepageFeaturedEnabled(event.target.checked)} type="checkbox" />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                <span className="text-zinc-300">Homepage feed ad</span>
                <input checked={homepageFeedEnabled} onChange={(event) => setHomepageFeedEnabled(event.target.checked)} type="checkbox" />
              </label>
            </div>
          </div>
        </div>

        <div className="rounded-[1.2rem] border border-[#222222] bg-[#111111] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Maintenance mode</p>
              <p className="mt-1 text-xs text-zinc-500">When enabled, the public shell shows a banner on every page.</p>
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-zinc-300">
              <span>Enabled</span>
              <input checked={maintenanceMode} onChange={(event) => setMaintenanceMode(event.target.checked)} type="checkbox" />
            </label>
          </div>
        </div>
      </div>

      <label className="grid gap-2 text-sm font-medium text-zinc-400">
        Footer links
        <textarea
          rows={4}
          value={footerLinksText}
          onChange={(event) => setFooterLinksText(event.target.value)}
          className="w-full rounded-xl border border-[#222222] bg-[#111111] px-4 py-3 font-mono text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-emerald-500"
          placeholder={`Browse | /#library\nCategories | /genre/Action\nSearch | /?q=\nAdmin | /admin`}
        />
        <p className="text-xs text-zinc-500">
          Use one link per line in the format <code>Label | /path</code>. External URLs are allowed too.
        </p>
      </label>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-emerald-500 px-5 py-2 text-xs font-bold uppercase tracking-wider text-black transition hover:bg-emerald-400 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Site Settings"}
        </button>
        {saved && <span className="text-xs text-emerald-400">Sitewide settings saved and live.</span>}
        {saveError && <span className="text-xs text-red-400">{saveError}</span>}
      </div>
    </div>
  );
}

function StatusToggleButton({ movieId, currentStatus }: { movieId: string; currentStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED" }) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  async function setTo(next: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
    setLoading(true);
    const res = await fetch(`/api/admin/movies/${movieId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next })
    });
    if (res.ok) setStatus(next);
    setLoading(false);
  }

  if (status === "DRAFT") {
    return (
      <button onClick={() => setTo("PUBLISHED")} disabled={loading}
        className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-emerald-400 transition-all hover:bg-emerald-500/20 disabled:opacity-50"
        type="button">
        {loading ? "..." : "Publish"}
      </button>
    );
  }
  if (status === "PUBLISHED") {
    return (
      <button onClick={() => setTo("ARCHIVED")} disabled={loading}
        className="rounded-xl border border-zinc-500/30 bg-zinc-500/10 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-zinc-400 transition-all hover:bg-zinc-500/20 disabled:opacity-50"
        type="button">
        {loading ? "..." : "Archive"}
      </button>
    );
  }
  // ARCHIVED
  return (
    <button onClick={() => setTo("DRAFT")} disabled={loading}
      className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-amber-400 transition-all hover:bg-amber-500/20 disabled:opacity-50"
      type="button">
      {loading ? "..." : "Restore"}
    </button>
  );
}

function FeaturedToggleButton({ movieId, isFeatured: initialFeatured }: { movieId: string; isFeatured: boolean }) {
  const [featured, setFeatured] = useState(initialFeatured);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const res = await fetch(`/api/admin/movies/${movieId}/featured`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFeatured: !featured })
    });
    if (res.ok) setFeatured(f => !f);
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`rounded-xl border px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] transition-all ${
        featured
          ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
          : "border-white/10 text-zinc-400 hover:border-emerald-500 hover:text-emerald-400"
      } disabled:opacity-50`}
      type="button"
    >
      {loading ? "..." : featured ? "Featured" : "Feature"}
    </button>
  );
}

function DeleteMovieButton({ movieId, isArchived }: { movieId: string; isArchived?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmHard, setConfirmHard] = useState(false);

  async function handleSoftDelete() {
    setLoading(true);
    await fetch(`/api/admin/movies/${movieId}`, { method: "DELETE" });
    router.refresh();
    setLoading(false);
  }

  async function handleRestore() {
    setLoading(true);
    await fetch(`/api/admin/movies/${movieId}/restore`, { method: "PATCH" });
    router.refresh();
    setLoading(false);
  }

  async function handleHardDelete() {
    if (!confirmHard) {
      setConfirmHard(true);
      setTimeout(() => setConfirmHard(false), 4000);
      return;
    }
    setLoading(true);
    await fetch(`/api/admin/movies/${movieId}?hard=true`, { method: "DELETE" });
    router.refresh();
    setLoading(false);
  }

  if (isArchived) {
    return (
      <div className="flex flex-col gap-1.5">
        <button
          onClick={handleRestore}
          disabled={loading}
          className="rounded-xl border border-emerald-500/40 px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-emerald-400 transition-all hover:bg-emerald-500/10 disabled:opacity-50"
          type="button"
        >
          {loading ? "..." : "Restore"}
        </button>
        <button
          onClick={handleHardDelete}
          disabled={loading}
          className={`rounded-xl border px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] transition-all ${
            confirmHard
              ? "border-red-500 bg-red-500 text-white"
              : "border-red-500/30 text-red-400 hover:bg-red-500/10"
          } disabled:opacity-50`}
          type="button"
        >
          {loading ? "..." : confirmHard ? "Confirm erase?" : "Hard delete"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleSoftDelete}
      disabled={loading}
      className="rounded-xl border border-zinc-500/20 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-zinc-400 transition-all hover:border-zinc-500/50 hover:bg-zinc-500/10 disabled:opacity-50"
      type="button"
    >
      {loading ? "..." : "Archive"}
    </button>
  );
}

function LogoUploader() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings?key=site_logo_url")
      .then(r => r.json())
      .then(d => { setLogoUrl(d.value); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      await uploadFile(file);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append("logo", file);
    try {
      const res = await fetch("/api/settings/logo", {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setLogoUrl(data.url);
      } else {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        setUploadError(payload?.error ?? "Failed to upload logo.");
      }
    } catch (err) {
      console.error(err);
      setUploadError("Failed to upload logo.");
    }
    setUploading(false);
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading...</p>;

  return (
    <div className="space-y-4">
      {logoUrl && (
        <div className="rounded-xl border border-[#222222] bg-[#161616] p-4 text-center">
          <p className="mb-3 text-xs uppercase tracking-widest text-zinc-500">Current Logo</p>
          <img src={logoUrl} alt="Site Logo" className="mx-auto h-16 w-auto object-contain" />
        </div>
      )}

      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
          isDragging ? "border-emerald-500 bg-emerald-500/10" : "border-[#333333] bg-[#111111] hover:border-emerald-500/50 hover:bg-[#161616]"
        }`}
      >
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange} 
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0" 
        />
        <svg className="mb-3 h-8 w-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
        <p className="text-sm font-medium text-white">{uploading ? "Uploading..." : "Click or drag image here"}</p>
        <p className="mt-1 text-xs text-zinc-500">PNG, JPG, SVG up to 5MB</p>
      </div>
      {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}
    </div>
  );
}

function SettingsModule({ adminUserId, adminRole }: { adminUserId: string; adminRole: "ADMIN" | "EDITOR" | "MODERATOR" | "USER" }) {
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="System and access"
        title="Homepage, SEO, and system settings"
        copy="Control public homepage behavior, metadata defaults, footer links, maintenance banners, logo assets, and the current production access model."
      />

      <Panel title="Announcement bar">
        <AnnouncementEditor />
      </Panel>

      <Panel title="Sitewide controls">
        <SitewideSettingsEditor />
      </Panel>

      <Panel title="Site logo">
        <LogoUploader />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Current access model">
          <div className="grid gap-3 text-sm text-zinc-400">
            <InfoRow label="Auth provider" value="Clerk" />
            <InfoRow label="Admin gate" value="Local role + Clerk bootstrap" />
            <InfoRow label="Current role" value={adminRole} />
            <InfoRow label="Session owner" value={adminUserId} />
            <InfoRow label="API pattern" value="Protected Express admin routes" />
          </div>
        </Panel>

        <Panel title="Current system notes">
          <div className="grid gap-3 text-sm text-zinc-300">
            <ChecklistItem label="Content management, settings, and analytics are live on the current admin surface." />
            <ChecklistItem label="SEO defaults, footer links, and homepage toggles now come from sitewide settings." />
            <ChecklistItem label="Ad snippets are validated on save and sandboxed on render." />
            <ChecklistItem label="Access and audit now reflect the live role model and recent admin actions." />
            <ChecklistItem label="Operational health is still limited to app-level checks rather than infrastructure metrics." />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function SectionHeader({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <div className="space-y-2 border-b border-white/8 pb-4">
      <p className="text-[0.72rem] uppercase tracking-[0.3em] text-emerald-300">{eyebrow}</p>
      <h3 className="text-2xl font-semibold text-white sm:text-3xl">{title}</h3>
      <p className="max-w-3xl text-sm leading-7 text-zinc-400">{copy}</p>
    </div>
  );
}

function TopMetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-[#222222] bg-[#111111] px-4 py-4">
      <p className="text-3xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-2 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-zinc-500">{label}</p>
    </div>
  );
}

function InsightCard({ copy, title, value }: { copy: string; title: string; value: string }) {
  return (
    <div className="rounded-[1.3rem] border border-[#222222] bg-[#111111] p-4">
      <p className="text-[0.68rem] uppercase tracking-[0.22em] text-zinc-500">{title}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{copy}</p>
    </div>
  );
}

function Panel({
  children,
  title,
  className = "",
  bodyClassName = ""
}: {
  children: ReactNode;
  title: string;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`rounded-[1.5rem] border border-[#222222] bg-[#1a1a1a] p-4 sm:p-5 ${className}`}>
      <p className="text-lg font-semibold text-white">{title}</p>
      <div className={`mt-4 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

function MiniAlert({ label }: { label: string }) {
  return <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">{label}</div>;
}

function ChecklistItem({ label }: { label: string }) {
  return <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">{label}</div>;
}

function TaskCard({ copy, title }: { copy: string; title: string }) {
  return (
    <div className="rounded-[1.15rem] border border-[#222222] bg-[#111111] p-4">
      <p className="text-base font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{copy}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.05rem] border border-[#222222] bg-[#111111] px-3 py-3">
      <p className="text-[0.68rem] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 break-all text-sm text-zinc-300">{value}</p>
    </div>
  );
}

function TelemetryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.7rem] border border-[#222222] bg-[#1a1a1a] px-5 py-5">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-emerald-300">{label}</p>
      <p className="mt-4 text-4xl font-semibold tracking-tight text-white">{value}</p>
    </div>
  );
}

