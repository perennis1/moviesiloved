"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import type { Route } from "next";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SignedIn, SignedOut, SignInButton, useClerk } from "@clerk/nextjs";

import type { HomepageFacetStats } from "@/lib/home-facets";

type NavSubItem = {
  href: string;
  label: string;
  count?: number;
};

type NavItem = {
  href: string;
  label: string;
  subItems?: NavSubItem[];
};

const adminHref = "/admin" as Route;

const chips = [
  { href: "https://t.me/", label: "Join updates", style: "border border-sky-500/20 bg-sky-500/10 text-sky-400" },
  { href: "/language/English", label: "English Movies", style: "border border-[#222222] bg-[#161616]/80 text-zinc-400 hover:bg-white/5 hover:text-white" },
  { href: "/language/Dual Audio", label: "Dual Audio", style: "border border-[#222222] bg-[#161616]/80 text-zinc-400 hover:bg-white/5 hover:text-white" },
  { href: "/genre/Anime", label: "Anime", style: "border border-[#222222] bg-[#161616]/80 text-zinc-400 hover:bg-white/5 hover:text-white" },
  { href: "/?q=Drama%20Series", label: "Drama Series", style: "border border-[#222222] bg-[#161616]/80 text-zinc-400 hover:bg-white/5 hover:text-white" },
  { href: "/?q=4K", label: "4K Picks", style: "bg-amber-400 text-black shadow-[0_0_12px_rgba(251,191,36,0.3)]" }
];

function buildCountMap(items: HomepageFacetStats["genres"]) {
  return new Map(items.map((item) => [item.value.toLowerCase(), item.count] as const));
}

export function SiteHeader({
  logoUrl,
  facetStats
}: {
  logoUrl?: string | null;
  facetStats: HomepageFacetStats;
}) {
  const clerkReady =
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_") &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("replace_me");

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get("q") ?? "";

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const countMaps = useMemo(
    () => ({
      genre: buildCountMap(facetStats.genres),
      language: buildCountMap(facetStats.languages),
      year: buildCountMap(facetStats.years),
      type: buildCountMap(facetStats.types),
      audio: buildCountMap(facetStats.audio),
      quality: buildCountMap(facetStats.quality)
    }),
    [facetStats]
  );

  const navItems = useMemo<NavItem[]>(
    () => [
      { href: "/", label: "Home" },
      {
        href: "/",
        label: "Movies",
        subItems: [
          { href: "/language/Hindi Dubbed", label: "Bollywood", count: countMaps.language.get("hindi") },
          { href: "/language/English", label: "Hollywood", count: countMaps.language.get("english") },
          { href: "/language/Dual Audio", label: "Dual Audio", count: countMaps.audio.get("dual audio") },
          { href: "/language/Multi Audio", label: "Multi Audio", count: countMaps.audio.get("multi audio") }
        ]
      },
      {
        href: "/",
        label: "Language",
        subItems: [
          { href: "/language/Hindi Dubbed", label: "Hindi Dubbed", count: countMaps.language.get("hindi") },
          { href: "/language/English", label: "English", count: countMaps.language.get("english") },
          { href: "/language/Tamil", label: "Tamil", count: countMaps.language.get("tamil") },
          { href: "/language/Telugu", label: "Telugu", count: countMaps.language.get("telugu") },
          { href: "/language/Malayalam", label: "Malayalam", count: countMaps.language.get("malayalam") }
        ]
      },
      {
        href: "/",
        label: "Genre",
        subItems: [
          { href: "/genre/Action", label: "Action", count: countMaps.genre.get("action") },
          { href: "/genre/Anime", label: "Anime", count: countMaps.genre.get("anime") },
          { href: "/genre/Comedy", label: "Comedy", count: countMaps.genre.get("comedy") },
          { href: "/genre/Drama", label: "Drama", count: countMaps.genre.get("drama") },
          { href: "/genre/Horror", label: "Horror", count: countMaps.genre.get("horror") },
          { href: "/genre/Sci-Fi", label: "Sci-Fi", count: countMaps.genre.get("sci-fi") },
          { href: "/genre/Thriller", label: "Thriller", count: countMaps.genre.get("thriller") }
        ]
      },
      {
        href: "/",
        label: "Year",
        subItems: [
          { href: "/year/2024", label: "2024", count: countMaps.year.get("2024") },
          { href: "/year/2023", label: "2023", count: countMaps.year.get("2023") },
          { href: "/year/2022", label: "2022", count: countMaps.year.get("2022") },
          { href: "/year/2021", label: "2021", count: countMaps.year.get("2021") },
          { href: "/year/2020", label: "2020", count: countMaps.year.get("2020") }
        ]
      },
      {
        href: "/",
        label: "OTT",
        subItems: [
          { href: "/?q=Netflix", label: "Netflix" },
          { href: "/?q=Amazon Prime", label: "Amazon Prime" },
          { href: "/?q=Hotstar", label: "Disney+ Hotstar" }
        ]
      },
      {
        href: "/",
        label: "Web Series",
        subItems: [
          { href: "/?type=Series", label: "Hindi Series", count: countMaps.type.get("series") },
          { href: "/?type=Anime", label: "Anime Series", count: countMaps.type.get("anime") }
        ]
      }
    ],
    [countMaps]
  );

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-3">
      <div className="mx-auto max-w-7xl rounded-[1.4rem] border border-white/5 bg-[#111111]/58 shadow-[0_8px_40px_rgba(0,0,0,0.42)] backdrop-blur-3xl transition-all duration-300">
        <div className="flex items-center justify-between px-4 py-3 sm:px-5">
          <Link href="/" className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Movies I Loved" className="h-10 w-auto object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
            ) : (
              <>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ee3f5b,#3cd16d)] text-[0.52rem] font-black uppercase tracking-[0.2em] text-white shadow-[0_0_20px_rgba(60,209,109,0.3)] sm:h-10 sm:w-10">
                  MIL
                </span>
                <div className="hidden xs:block">
                  <p className="text-[0.6rem] font-bold uppercase tracking-[0.3em] text-zinc-300">Movies I Loved</p>
                </div>
              </>
            )}
          </Link>

          <div className="hidden md:block flex-1 max-w-md mx-6">
            <form action="/">
              <label className="group flex min-w-0 cursor-text items-center gap-2 rounded-xl border border-white/5 bg-[#161616]/70 px-3 py-2 transition-all focus-within:border-emerald-500/40 focus-within:shadow-[0_0_0_3px_rgba(16,185,129,0.06)]">
                <svg className="h-4 w-4 shrink-0 text-zinc-600 transition-colors group-focus-within:text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  aria-label="Search movies"
                  name="q"
                  defaultValue={currentQuery}
                  placeholder="Search films, genres, moods..."
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
                />
              </label>
            </form>
          </div>

          <div className="flex items-center gap-3">
            {clerkReady ? <ClerkActions profileMenuRef={profileMenuRef} isProfileMenuOpen={isProfileMenuOpen} setIsProfileMenuOpen={setIsProfileMenuOpen} /> : <AuthOffBadge />}

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/5 bg-[#161616]/70 text-zinc-400 transition-colors hover:text-white md:hidden"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        <div className="hidden md:block rounded-b-[1.4rem] overflow-visible">
          <div className="flex items-center gap-4 border-t border-white/5 px-5 py-2">
            {navItems.map((item) => (
              <div key={item.label} className="group relative">
                <Link
                  href={item.href as Route}
                  className="flex items-center gap-1.5 shrink-0 rounded-xl px-2 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-zinc-400 transition-colors group-hover:bg-white/5 group-hover:text-emerald-300"
                >
                  {item.label}
                  {item.subItems ? (
                    <svg className="h-3 w-3 opacity-60 transition-transform duration-300 group-hover:-rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  ) : null}
                </Link>

                {item.subItems ? (
                  <div className="pointer-events-none absolute left-0 top-full z-50 pt-2 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-y-1">
                    <div className="min-w-[190px] rounded-xl border border-white/5 bg-[#161616]/85 p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
                      {item.subItems.map((sub) => (
                        <Link
                          key={sub.label}
                          href={sub.href as Route}
                          className="flex items-center justify-between gap-3 rounded-lg px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-400 transition-all hover:bg-emerald-500/10 hover:text-emerald-300 hover:pl-5"
                        >
                          <span>{sub.label}</span>
                          {typeof sub.count === "number" ? (
                            <span className="rounded-full border border-white/5 bg-black/30 px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.12em] text-zinc-500">
                              {sub.count}
                            </span>
                          ) : null}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto border-t border-white/5 px-5 py-2.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {chips.map((chip) => (
              <Link
                key={chip.label}
                href={chip.href as Route}
                className={`shrink-0 cursor-pointer rounded-xl px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.1em] transition-colors ${chip.style}`}
              >
                {chip.label}
              </Link>
            ))}
          </div>
        </div>

        {isMobileMenuOpen ? (
          <div className="border-t border-white/5 bg-[#161616]/45 md:hidden">
            <div className="px-4 py-3 pb-1">
              <form action="/">
                <label className="group flex min-w-0 cursor-text items-center gap-2 rounded-xl border border-white/5 bg-[#111111]/80 px-3 py-2.5 transition-all focus-within:border-emerald-500/40 focus-within:shadow-[0_0_0_3px_rgba(16,185,129,0.06)]">
                  <svg className="h-4 w-4 shrink-0 text-zinc-600 transition-colors group-focus-within:text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  <input
                    aria-label="Search movies"
                    name="q"
                    defaultValue={currentQuery}
                    placeholder="Search movies..."
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
                  />
                </label>
              </form>
            </div>

            <div className="flex flex-col p-2">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href as Route}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-lg px-4 py-3 text-xs font-bold uppercase tracking-[0.15em] text-zinc-300 transition-colors hover:bg-[#222222] hover:text-emerald-300"
                >
                  {item.label}
                </Link>
              ))}
              <div className="my-2 h-px w-full bg-white/5" />
              <div className="flex flex-wrap gap-2 px-3 py-2">
                {chips.map((chip) => (
                  <Link
                    key={chip.label}
                    href={chip.href as Route}
                    className={`shrink-0 cursor-pointer rounded-xl px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] transition-colors ${chip.style}`}
                  >
                    {chip.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}

function ClerkActions({
  profileMenuRef,
  isProfileMenuOpen,
  setIsProfileMenuOpen
}: {
  profileMenuRef: RefObject<HTMLDivElement>;
  isProfileMenuOpen: boolean;
  setIsProfileMenuOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const { user } = useClerk();

  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <button className="rounded-xl border border-white/5 bg-[#161616]/70 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-zinc-300 transition hover:bg-white/5 hover:text-white">
            Sign in
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <Link href={adminHref} className="inline-flex rounded-xl border border-white/5 bg-[#161616]/70 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-zinc-300 transition hover:bg-white/5 hover:text-white">
          Admin
        </Link>
        <div ref={profileMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsProfileMenuOpen((current) => !current)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/5 bg-[#161616]/70 px-2 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-zinc-300 transition hover:bg-white/5 hover:text-white"
          >
            <span className="flex h-7 w-7 overflow-hidden rounded-full border border-white/10 bg-gradient-to-br from-emerald-500/20 to-sky-500/20">
              {user?.imageUrl ? <img src={user.imageUrl} alt={user?.fullName || "Account"} className="h-full w-full object-cover" /> : null}
            </span>
            <span className="hidden sm:inline">Profile</span>
            <svg className={`h-3 w-3 transition-transform ${isProfileMenuOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isProfileMenuOpen ? (
            <>
              <button
                type="button"
                aria-label="Close profile menu"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setIsProfileMenuOpen(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-white/5 bg-[#161616]/95 p-1.5 shadow-[0_16px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
                <div className="px-3 py-2">
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-zinc-500">Signed in as</p>
                  <p className="mt-1 truncate text-sm font-semibold text-white">{user?.fullName || user?.primaryEmailAddress?.emailAddress || "Account"}</p>
                </div>
                <div className="my-1 h-px bg-white/5" />
                <Link
                  href="/account"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="flex items-center rounded-xl px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
                >
                  Account
                </Link>
              </div>
            </>
          ) : null}
        </div>
      </SignedIn>
    </>
  );
}

function AuthOffBadge() {
  return <span className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-2.5 py-1.5 text-[0.58rem] font-medium text-amber-400">Auth off</span>;
}
