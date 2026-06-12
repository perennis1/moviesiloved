"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function PaginationControls({
  currentPage,
  totalPages
}: {
  currentPage: number;
  totalPages: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const goTo = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const showEllipsisStart = currentPage > 4;
  const showEllipsisEnd = currentPage < totalPages - 3;

  const visiblePages = pages.filter((p) => {
    if (p === 1 || p === totalPages) return true;
    if (Math.abs(p - currentPage) <= 1) return true;
    return false;
  });

  return (
    <div className="flex items-center justify-center gap-2">
      {/* Prev */}
      <button
        disabled={currentPage === 1}
        onClick={() => goTo(currentPage - 1)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#222222] bg-[#111111] text-zinc-400 transition-all hover:border-white/20 hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      {/* Page numbers */}
      {visiblePages.map((page, idx) => {
        const prevPage = visiblePages[idx - 1];
        const needsStartEllipsis = showEllipsisStart && idx === 1 && prevPage !== undefined && page - prevPage > 1;
        const needsEndEllipsis = showEllipsisEnd && idx === visiblePages.length - 2 && visiblePages[idx + 1] !== undefined && visiblePages[idx + 1]! - page > 1;

        return (
          <span key={page} className="flex items-center gap-2">
            {needsStartEllipsis && (
              <span className="flex h-10 w-10 items-center justify-center text-sm text-zinc-600">…</span>
            )}
            <button
              onClick={() => goTo(page)}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold transition-all ${
                page === currentPage
                  ? "bg-emerald-500 text-black shadow-[0_0_16px_rgba(16,185,129,0.35)]"
                  : "border border-[#222222] bg-[#111111] text-zinc-400 hover:border-white/20 hover:bg-white/5 hover:text-white"
              }`}
            >
              {page}
            </button>
            {needsEndEllipsis && (
              <span className="flex h-10 w-10 items-center justify-center text-sm text-zinc-600">…</span>
            )}
          </span>
        );
      })}

      {/* Next */}
      <button
        disabled={currentPage === totalPages}
        onClick={() => goTo(currentPage + 1)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#222222] bg-[#111111] text-zinc-400 transition-all hover:border-white/20 hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}
