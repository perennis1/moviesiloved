"use client";

import Link from "next/link";

type Movie = {
  id: string;
  slug: string;
  title: string;
  synopsis: string | null;
  releaseYear: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  genreNames: string[];
  averageRating: number | null;
};

export function MovieCard({ movie }: { movie: Movie }) {
  return (
    <Link
      href={`/movies/${movie.slug}`}
      className="group relative block overflow-hidden rounded-[1.2rem] border border-[#222222] bg-[#050505] shadow-[0_4px_24px_rgba(0,0,0,0.5)] transition-all duration-500 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_0_1px_rgba(16,185,129,0.12)]"
      style={{ aspectRatio: "0.68 / 1" }}
    >
      {/* ── Poster ── */}
      <div className="absolute inset-0">
        {movie.posterUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
            style={{ backgroundImage: `url(${movie.posterUrl})` }}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#111111]">
            <svg className="h-10 w-10 text-zinc-700" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </div>
        )}
      </div>

      {/* Emerald glow bloom on hover — desktop only */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(16,185,129,0.18),_transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      {/* ── Top badges ── */}
      <div className="absolute left-0 right-0 top-0 flex items-start justify-between p-2.5">
        {movie.genreNames[0] && (
          <span className="rounded-md bg-[#050505]/75 px-2 py-0.5 text-[0.5rem] font-black uppercase tracking-[0.18em] text-zinc-300 backdrop-blur-md">
            {movie.genreNames[0]}
          </span>
        )}
        {movie.averageRating && (
          <span className="ml-auto rounded-md bg-amber-400 px-1.5 py-0.5 text-[0.5rem] font-black text-black">
            ★ {movie.averageRating.toFixed(1)}
          </span>
        )}
      </div>

      {/* ── Always-visible bottom gradient + info ── */}
      {/* This gradient + static info is ALWAYS shown (mobile & desktop) */}
      <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-[#050505] via-[#050505]/70 to-transparent" />

      {/* Static info: always visible, fades out on hover (desktop only via @media hover) */}
      <div className="absolute inset-x-0 bottom-0 p-3 transition-all duration-400 group-hover:opacity-0 group-hover:translate-y-1">
        <p className="text-[0.55rem] font-bold uppercase tracking-[0.22em] text-zinc-600">
          {movie.releaseYear}
        </p>
        <h3 className="mt-0.5 line-clamp-2 text-sm font-black leading-snug text-white sm:text-base">
          {movie.title}
        </h3>
        {/* Genre pills — always shown at bottom */}
        <div className="mt-1.5 flex flex-wrap gap-1">
          {movie.genreNames.slice(0, 2).map((g) => (
            <span
              key={g}
              className="rounded-md bg-[#1a1a1a] px-1.5 py-0.5 text-[0.5rem] font-bold uppercase tracking-[0.12em] text-zinc-500"
            >
              {g}
            </span>
          ))}
        </div>
      </div>

      {/* ── Hover panel (desktop only — slides up over static info) ── */}
      {/* On mobile this stays translated away since touch has no hover state */}
      <div className="absolute inset-x-0 bottom-0 translate-y-full rounded-b-[1.2rem] bg-[#050505]/96 p-3 backdrop-blur-xl transition-transform duration-500 group-hover:translate-y-0">
        {/* Genre pills in panel */}
        <div className="mb-2 flex flex-wrap gap-1">
          {movie.genreNames.slice(0, 3).map((g) => (
            <span
              key={g}
              className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[0.5rem] font-bold uppercase tracking-[0.12em] text-emerald-400"
            >
              {g}
            </span>
          ))}
        </div>

        {/* Synopsis */}
        {movie.synopsis && (
          <p className="line-clamp-3 text-[0.65rem] leading-4 text-zinc-400 sm:text-xs sm:leading-5">
            {movie.synopsis}
          </p>
        )}

        {/* Footer row */}
        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-[0.5rem] font-bold uppercase tracking-[0.18em] text-zinc-600">
            {movie.releaseYear}
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-[0.58rem] font-black uppercase tracking-[0.08em] text-black transition-colors group-hover:bg-emerald-400">
            <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            View
          </span>
        </div>
      </div>
    </Link>
  );
}
