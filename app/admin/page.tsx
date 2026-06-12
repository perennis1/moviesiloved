import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AdminDashboard } from "@/components/admin-dashboard";
import { isClerkConfigured } from "@/lib/clerk-config";
import { buildAnalyticsReport } from "@/server/lib/analytics-report";
import { buildMonetizationReport } from "@/server/lib/monetization-report";
import { buildMediaReport } from "@/lib/media-report";
import { prisma } from "@/server/lib/prisma";
import { resolveUserByMinimumRole } from "@/server/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!isClerkConfigured()) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="rounded-[1.7rem] border border-white/10 bg-[#1e1f23] p-6">
          <p className="text-[0.72rem] uppercase tracking-[0.3em] text-zinc-500">Admin</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Admin access is unavailable until Clerk is configured.</h1>
          <p className="mt-3 text-sm leading-7 text-zinc-400">
            Set the Clerk publishable and secret keys in <code>.env</code>, restart the server, and the dashboard will lock to signed-in admins.
          </p>
        </section>
      </main>
    );
  }

  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const dashboardUser = await resolveUserByMinimumRole(userId, "EDITOR");

  if (!dashboardUser) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="rounded-[1.7rem] border border-white/10 bg-[#1e1f23] p-6">
          <p className="text-[0.72rem] uppercase tracking-[0.3em] text-zinc-500">Admin</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">You are signed in, but do not have dashboard access yet.</h1>
          <p className="mt-3 text-sm leading-7 text-zinc-400">
            Promote the local user role to <code>EDITOR</code> for content work or <code>ADMIN</code> for governance, moderation, and monetization tools.
          </p>
        </section>
      </main>
    );
  }

  const isAdmin = dashboardUser.role === "ADMIN";

  const [movies, actors, logoSetting] = await Promise.all([
    prisma.movie.findMany({
      where: {}, // Admins see ALL movies including soft-deleted
      orderBy: [
        { deletedAt: "asc" }, // active first (null sorts before dates)
        { releaseYear: "desc" },
        { title: "asc" }
      ],
      include: {
        genres: {
          include: {
            genre: true
          }
        }
      }
    }),
    prisma.actor.findMany({
      orderBy: [
        { isIndexable: "asc" },
        { updatedAt: "desc" },
        { name: "asc" }
      ],
      take: 60,
      select: {
        id: true,
        name: true,
        slug: true,
        tmdbId: true,
        bio: true,
        knownFor: true,
        birthDate: true,
        birthPlace: true,
        profileUrl: true,
        sourceConfidence: true,
        isIndexable: true,
        updatedAt: true,
        _count: {
          select: {
            castMembers: true
          }
        }
      }
    }),
    prisma.globalSettings.findUnique({
      where: { key: "site_logo_url" }
    })
  ]);

  const auditLogsForMedia = isAdmin
    ? await prisma.auditLog.findMany({
        orderBy: [{ createdAt: "desc" }],
        take: 50,
        include: {
          actor: {
            select: {
              email: true,
              clerkUserId: true,
              role: true
            }
          }
        }
      })
    : await prisma.auditLog.findMany({
        where: {
          OR: [
            { entityType: "Movie" },
            { entityType: "GlobalSettings", entityId: "site_logo_url" }
          ]
        },
        orderBy: [{ createdAt: "desc" }],
        take: 20,
        include: {
          actor: {
            select: {
              email: true,
              clerkUserId: true,
              role: true
            }
          }
        }
      });

  const [recentUsers, recentReviews, analyticsReport, monetizationReport, recentAuditLogs] = isAdmin
    ? await Promise.all([
        prisma.user.findMany({
          orderBy: [
            { updatedAt: "desc" },
            { createdAt: "desc" }
          ],
          take: 40,
          select: {
            id: true,
            email: true,
            clerkUserId: true,
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
        prisma.review.findMany({
          orderBy: [
            { moderated: "asc" },
            { createdAt: "desc" }
          ],
          take: 40,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true
              }
            },
            movie: {
              select: {
                id: true,
                title: true,
                slug: true,
                releaseYear: true
              }
            }
          }
        }),
        buildAnalyticsReport(prisma),
        buildMonetizationReport(prisma),
        auditLogsForMedia
      ])
    : [[], [], null, null, auditLogsForMedia];

  const mediaReport = buildMediaReport({
    movies: movies.map((movie) => ({
      id: movie.id,
      title: movie.title,
      slug: movie.slug,
      releaseYear: movie.releaseYear,
      posterUrl: movie.posterUrl,
      backdropUrl: movie.backdropUrl,
      isFeatured: movie.isFeatured,
      status: movie.status as "DRAFT" | "PUBLISHED" | "ARCHIVED",
      isArchived: !!movie.deletedAt,
      updatedAt: movie.updatedAt
    })),
    logoSetting: logoSetting
      ? {
          value: logoSetting.value,
          updatedAt: logoSetting.updatedAt
        }
      : null,
    recentAuditLogs: auditLogsForMedia
  });

  return (
    <AdminDashboard
      adminUserId={userId}
      adminRole={dashboardUser.role}
      movieCount={movies.length}
      analyticsReport={analyticsReport}
      monetizationReport={monetizationReport}
      mediaReport={mediaReport}
      recentAuditLogs={recentAuditLogs}
      users={recentUsers}
      recentReviews={recentReviews}
      actors={actors}
      movies={movies.map((movie) => ({
        id: movie.id,
        title: movie.title,
        slug: movie.slug,
        releaseYear: movie.releaseYear,
        synopsis: movie.synopsis,
        posterUrl: movie.posterUrl,
        backdropUrl: movie.backdropUrl,
        status: movie.status as "DRAFT" | "PUBLISHED" | "ARCHIVED",
        isFeatured: movie.isFeatured,
        contentType: movie.contentType,
        isArchived: !!movie.deletedAt,
        views: movie.views,
        clicks: movie.clicks,
        genreNames: movie.genres.map((entry) => entry.genre.name)
      }))}
    />
  );
}
