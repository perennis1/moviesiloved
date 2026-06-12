import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { isClerkConfigured } from "@/lib/clerk-config";
import { ensureLocalUserForClerkId } from "@/server/lib/auth";
import { prisma } from "@/server/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account"
};

export default async function AccountPage() {
  if (!isClerkConfigured()) {
    redirect("/sign-in");
  }

  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const viewer = await ensureLocalUserForClerkId(userId);

  const [profile, bookmarks, wishlist] = await Promise.all([
    prisma.user.findUnique({
      where: { id: viewer.id },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            reviews: true,
            favorites: true,
            wishlists: true,
            auditLogs: true
          }
        }
      }
    }),
    prisma.movieFavorite.findMany({
      where: { userId: viewer.id },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        movie: {
          select: {
            id: true,
            slug: true,
            title: true,
            posterUrl: true,
            releaseYear: true
          }
        }
      }
    }),
    prisma.movieWishlist.findMany({
      where: { userId: viewer.id },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        movie: {
          select: {
            id: true,
            slug: true,
            title: true,
            posterUrl: true,
            releaseYear: true
          }
        }
      }
    })
  ]);

  if (!profile) {
    redirect("/sign-in");
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] pb-20">
      <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
        <section className="rounded-[1.8rem] border border-white/10 bg-[#111111] p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <ProfileAvatar profile={profile} size="lg" />
              <div className="min-w-0">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.3em] text-zinc-500">Account</p>
                <h1 className="mt-2 truncate text-3xl font-semibold text-white">{profile.displayName || profile.username || profile.email.split("@")[0]}</h1>
                <p className="mt-2 text-sm text-zinc-500">
                  @{profile.username || profile.email.split("@")[0]} · {profile.role} · Joined {formatDisplayDate(profile.createdAt)}
                </p>
                {profile.bio ? <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">{profile.bio}</p> : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Bookmarks" value={profile._count.favorites} />
              <StatCard label="Wishlist" value={profile._count.wishlists} />
              <StatCard label="Reviews" value={profile._count.reviews} />
              <StatCard label="Audit logs" value={profile._count.auditLogs} />
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Panel title="Bookmarks">
            <div className="grid gap-3">
              {bookmarks.length > 0 ? bookmarks.map((entry) => <SavedMovieRow key={entry.movie.id} movie={entry.movie} label="Bookmarked" />) : <EmptyState copy="No bookmarks yet." />}
            </div>
          </Panel>

          <Panel title="Wishlist">
            <div className="grid gap-3">
              {wishlist.length > 0 ? wishlist.map((entry) => <SavedMovieRow key={entry.movie.id} movie={entry.movie} label="Wishlist" />) : <EmptyState copy="No wishlist items yet." />}
            </div>
          </Panel>
        </div>
      </div>
    </main>
  );
}

function ProfileAvatar({
  profile,
  size
}: {
  profile: {
    avatarUrl: string | null;
    displayName: string | null;
    username: string | null;
    email: string;
  };
  size: "lg" | "md" | "sm";
}) {
  const dimensions = size === "lg" ? "h-16 w-16 text-sm" : size === "md" ? "h-11 w-11 text-xs" : "h-9 w-9 text-[0.62rem]";
  const label = (profile.displayName || profile.username || profile.email).charAt(0).toUpperCase();

  return (
    <div className={`shrink-0 overflow-hidden rounded-full border border-white/10 bg-gradient-to-br from-emerald-500/20 to-sky-500/20 ${dimensions}`}>
      {profile.avatarUrl ? <img src={profile.avatarUrl} alt={profile.displayName || profile.email} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center font-bold text-white">{label}</div>}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[7.5rem] rounded-[1rem] border border-white/5 bg-white/[0.03] px-3 py-3">
      <div className="text-[0.62rem] uppercase tracking-[0.16em] text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[1.6rem] border border-white/10 bg-[#111111] p-5">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.3em] text-zinc-500">{title}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyState({ copy }: { copy: string }) {
  return <div className="rounded-[1rem] border border-white/5 bg-white/[0.03] px-3 py-4 text-sm leading-7 text-zinc-500">{copy}</div>;
}

function SavedMovieRow({
  movie,
  label
}: {
  movie: { id: string; slug: string; title: string; posterUrl: string | null; releaseYear: string };
  label: string;
}) {
  return (
    <Link href={`/movies/${movie.slug}`} className="flex items-center gap-3 rounded-[1rem] border border-white/5 bg-white/[0.03] p-3 transition hover:bg-white/[0.05]">
      <div className="h-14 w-10 overflow-hidden rounded-lg border border-white/10 bg-[#090909]">
        {movie.posterUrl ? <img src={movie.posterUrl} alt={movie.title} className="h-full w-full object-cover" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{movie.title}</p>
        <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">{movie.releaseYear}</p>
      </div>
      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-zinc-400">{label}</span>
    </Link>
  );
}

function formatDisplayDate(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}
