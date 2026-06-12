"use client";

import { useEffect, useState, useCallback } from "react";
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
};

export function MovieCarousel({ movies }: { movies: Movie[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => {
    setActive((current) => (current + 1) % movies.length);
  }, [movies.length]);

  const prev = useCallback(() => {
    setActive((current) => (current - 1 + movies.length) % movies.length);
  }, [movies.length]);

  useEffect(() => {
    if (paused || movies.length <= 1) return;
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [next, paused, movies.length]);

  if (movies.length === 0) return null;

  const film = movies[active];

  return (
    <div
      className="relative w-full overflow-hidden rounded-[1.8rem] border border-[#222222] bg-[#050505] shadow-[0_20px_80px_rgba(0,0,0,0.7)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{ minHeight: "clamp(340px, 55vw, 540px)" }}
    >
      {/* Backdrop */}
      {movies.map((m, i) => (
        <div
          key={m.id}
          aria-hidden={i !== active}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
          style={{
            backgroundImage: m.backdropUrl ? `url(${m.backdropUrl})` : undefined,
            opacity: i === active ? 1 : 0,
            backgroundColor: "#050505"
          }}
        />
      ))}

      {/* Cinematic overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505]/30" />

      {/* Content */}
      <div className="relative flex h-full items-end p-5 sm:p-10 lg:p-14" style={{ minHeight: "clamp(340px, 55vw, 540px)" }}>
        <div className="w-full max-w-xl space-y-3 sm:space-y-5">
          {/* Label */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="h-px w-5 bg-emerald-500 sm:w-8" />
            <p className="text-[0.58rem] font-bold uppercase tracking-[0.28em] text-emerald-400 sm:text-[0.65rem] sm:tracking-[0.32em]">
              Now Featured
            </p>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-black leading-none tracking-tight text-white sm:text-4xl lg:text-5xl xl:text-6xl">
            {film.title}
          </h2>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-white/10 px-2.5 py-1 text-[0.55rem] font-black uppercase tracking-[0.16em] text-zinc-300 sm:px-3 sm:text-xs">
              {film.releaseYear}
            </span>
            {film.genreNames.slice(0, 2).map((g) => (
              <span
                key={g}
                className="rounded-lg border border-[#222222] bg-[#111111]/80 px-2.5 py-1 text-[0.55rem] font-black uppercase tracking-[0.16em] text-zinc-400 sm:px-3 sm:text-xs"
              >
                {g}
              </span>
            ))}
          </div>

          {/* Synopsis — hidden on very small screens */}
          {film.synopsis && (
            <p className="hidden max-w-sm text-xs leading-6 text-zinc-400 sm:block sm:text-sm sm:leading-7 line-clamp-2">
              {film.synopsis}
            </p>
          )}

          {/* CTA */}
          <div className="flex gap-2 pt-1 sm:gap-3">
            <Link
              href={`/movies/${film.slug}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-black uppercase tracking-[0.1em] text-black shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:bg-emerald-400 sm:px-6 sm:py-3 sm:text-sm"
            >
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              View Movie
            </Link>
            <button
              onClick={next}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#222222] bg-[#111111]/80 px-4 py-2.5 text-xs font-black uppercase tracking-[0.1em] text-zinc-300 backdrop-blur-sm transition-all hover:border-white/20 hover:text-white sm:px-6 sm:py-3 sm:text-sm"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Poster thumbnail strip — bottom right */}
      <div className="absolute bottom-8 right-8 hidden flex-col gap-2 lg:flex">
        {movies.map((m, i) => (
          <button
            key={m.id}
            onClick={() => setActive(i)}
            className={`relative h-16 w-11 overflow-hidden rounded-xl border-2 transition-all duration-300 ${
              i === active
                ? "border-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.4)] opacity-100 scale-110"
                : "border-[#222222] opacity-40 hover:opacity-70"
            }`}
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: m.posterUrl ? `url(${m.posterUrl})` : undefined, backgroundColor: "#050505" }}
            />
          </button>
        ))}
      </div>

      {/* Dot indicators — mobile */}
      <div className="absolute bottom-8 right-8 flex gap-2 lg:hidden">
        {movies.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === active ? "w-8 bg-emerald-500" : "w-1.5 bg-white/20"
            }`}
          />
        ))}
      </div>

      {/* Progress bar */}
      {!paused && movies.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5">
          <div
            key={`${active}-progress`}
            className="h-full bg-emerald-500 origin-left"
            style={{ animation: "progress 5s linear forwards" }}
          />
        </div>
      )}

      <style>{`
        @keyframes progress {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}
