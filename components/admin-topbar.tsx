"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useClerk } from "@clerk/nextjs";

import { getAccessibleAdminModules, type AdminModuleId, type AdminRole } from "@/components/admin-dashboard-config";

type AdminTopbarProps = {
  activeModule: AdminModuleId;
  alertCount: number;
  movieCount: number;
  adminRole: AdminRole;
  onDesktopToggle: () => void;
  onMobileOpen: () => void;
  onModuleChange: (moduleId: AdminModuleId) => void;
  movies: Array<{
    id: string;
    title: string;
    slug: string;
    releaseYear: string;
    synopsis: null | string;
    posterUrl: null | string;
    genreNames: string[];
  }>;
};

export function AdminTopbar({
  activeModule,
  alertCount,
  movieCount,
  adminRole,
  onMobileOpen,
  onModuleChange,
  movies
}: AdminTopbarProps) {
  const { signOut, user } = useClerk();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const accessibleModules = getAccessibleAdminModules(adminRole);
  const activeModuleMeta = accessibleModules.find((module) => module.id === activeModule);
  const filteredMovies = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (query.length < 2) {
      return [];
    }

    return movies
      .filter(
        (movie) =>
          movie.title.toLowerCase().includes(query) ||
          movie.slug.toLowerCase().includes(query) ||
          movie.genreNames.some((genre) => genre.toLowerCase().includes(query))
      )
      .slice(0, 8);
  }, [movies, searchQuery]);

  const adminEmail = user?.primaryEmailAddress?.emailAddress || "Admin";
  const adminName = user?.fullName || "Admin";

  return (
    <section className="relative z-40 mt-4 mx-4 flex items-center justify-between rounded-full border border-[#222222] bg-[#1a1a1a]/80 px-4 py-2 shadow-sm backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <button
          aria-label="Open navigation"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#111111] text-slate-300 transition hover:bg-[#1a1a24] xl:hidden"
          onClick={onMobileOpen}
          type="button"
        >
          <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="hidden md:block">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.26em] text-slate-500">Admin</p>
          <p className="text-sm font-semibold text-white">{activeModuleMeta?.label || "Dashboard"}</p>
        </div>
      </div>

      <div className="relative flex min-w-0 flex-1 justify-center px-2 md:px-4">
        <div className="relative flex w-full items-center rounded-full border border-[#222222] bg-[#111111] px-3 py-1.5 transition focus-within:border-slate-500/50">
          <svg className="mr-2 h-3.5 w-3.5 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="admin-search-input"
            aria-label="Admin search"
            placeholder="Search titles or genres..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            className="w-full bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-500"
          />
          <span className="ml-2 hidden shrink-0 rounded border border-[#222222] bg-[#1a1a24] px-1.5 py-1 text-slate-400 lg:flex">
            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
        </div>

        {isSearchFocused && searchQuery.trim().length >= 2 ? (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setIsSearchFocused(false)} />
            <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-[#222222] bg-[#1a1a1a] shadow-2xl md:left-4 md:right-4">
              <div className="border-b border-[#222222] px-4 py-3">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Catalog search
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Search is currently scoped to movies and series in the catalog.
                </p>
              </div>

              <div className="max-h-[380px] overflow-y-auto p-3">
                {filteredMovies.length > 0 ? (
                  <div className="grid gap-2">
                    {filteredMovies.map((movie) => (
                      <div
                        key={movie.id}
                        className="flex items-center gap-3 rounded-xl border border-[#222222] bg-[#111111] p-3"
                      >
                        <div
                          className="h-12 w-9 shrink-0 rounded-lg bg-[#181818] bg-cover bg-center"
                          style={{ backgroundImage: movie.posterUrl ? `url(${movie.posterUrl})` : undefined }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{movie.title}</p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {movie.releaseYear} / {movie.genreNames.join(", ") || "Needs genres"}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            onClick={() => {
                              onModuleChange("content");
                              setIsSearchFocused(false);
                            }}
                            className="rounded-lg border border-emerald-500/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-400 transition hover:bg-emerald-500/10"
                            type="button"
                          >
                            Open content
                          </button>
                          <Link
                            href={`/movies/${movie.slug}`}
                            className="rounded-lg border border-[#222222] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300 transition hover:bg-[#1f1f1f]"
                            onClick={() => setIsSearchFocused(false)}
                          >
                            View page
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="px-2 py-8 text-center text-sm text-slate-500">
                    No catalog items matched that search yet.
                  </p>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/"
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#222222] bg-[#111111] px-2 text-[10px] font-semibold text-slate-300 transition hover:bg-[#1a1a24] md:gap-2 md:px-3 md:text-xs"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>Home</span>
        </Link>

        <div className="relative">
          <button
            aria-label="Admin notices"
            onClick={() => {
              setIsNotificationsOpen((value) => !value);
              setIsProfileOpen(false);
            }}
            className={`relative inline-flex h-8 w-8 items-center justify-center rounded-full border ${
              isNotificationsOpen ? "border-[#222222] bg-[#111111] text-white" : "border-[#222222] bg-[#111111] text-slate-300 hover:bg-[#1a1a24]"
            }`}
            type="button"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {alertCount > 0 ? <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-300" /> : null}
          </button>

          {isNotificationsOpen ? (
            <>
              <div className="fixed inset-0 z-35" onClick={() => setIsNotificationsOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-3 w-72 rounded-2xl border border-[#222222] bg-[#1a1a1a] p-4 shadow-2xl md:w-80">
                <div className="border-b border-[#222222] pb-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-200">Admin signals</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Live counts from the current catalog and dashboard state.
                  </p>
                </div>

                <div className="mt-3 grid gap-3">
                  <div className="rounded-xl border border-[#222222] bg-[#111111] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Catalog size</p>
                    <p className="mt-1 text-lg font-semibold text-white">{movieCount}</p>
                  </div>
                  <div className="rounded-xl border border-[#222222] bg-[#111111] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Metadata alerts</p>
                    <p className="mt-1 text-lg font-semibold text-white">{alertCount}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Missing poster or synopsis entries that need editorial follow-up.
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      onModuleChange("content");
                      setIsNotificationsOpen(false);
                    }}
                    className="rounded-lg border border-emerald-500/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-400 transition hover:bg-emerald-500/10"
                    type="button"
                  >
                    Open content
                  </button>
                  {adminRole === "ADMIN" ? (
                    <button
                      onClick={() => {
                        onModuleChange("analytics");
                        setIsNotificationsOpen(false);
                      }}
                      className="rounded-lg border border-cyan-500/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-300 transition hover:bg-cyan-500/10"
                      type="button"
                    >
                      Open analytics
                    </button>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </div>

        <div className="relative">
          <button
            aria-label="Profile"
            onClick={() => {
              setIsProfileOpen((value) => !value);
              setIsNotificationsOpen(false);
            }}
            className="inline-flex items-center gap-2 rounded-full border border-[#222222] bg-[#111111] py-1 pl-1 pr-3 transition hover:bg-[#1a1a24]"
            type="button"
          >
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#222222] bg-[#1a1a1a] text-[9px] font-bold text-white shadow-sm">
              {adminName.slice(0, 2).toUpperCase()}
            </span>
            <span className="hidden min-w-0 text-left sm:block">
              <span className="block truncate text-[10px] font-bold uppercase text-slate-200">{adminName}</span>
              <span className="block text-[8px] uppercase leading-none tracking-wider text-slate-400">
                Clerk admin
              </span>
            </span>
            <svg className="ml-1 hidden h-3 w-3 text-slate-500 sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isProfileOpen ? (
            <>
              <div className="fixed inset-0 z-35" onClick={() => setIsProfileOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-3 w-64 space-y-4 rounded-2xl border border-[#222222] bg-[#1a1a1a] p-4 shadow-2xl">
                <div className="rounded-xl border border-[#222222] bg-[#111111] p-3">
                  <p className="text-sm font-semibold text-white">{adminName}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{adminEmail}</p>
                </div>
                <button
                  onClick={() => signOut({ redirectUrl: "/" })}
                  className="w-full rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-400 transition hover:bg-rose-500 hover:text-white"
                  type="button"
                >
                  Sign out
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
