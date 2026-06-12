import type { Request } from "express";
import { clerkClient, getAuth } from "@clerk/express";

import { hasMinimumRole, isAllowlistedAdminUserId, type AdminRole } from "@/lib/admin";
import { env } from "./env";
import { AppError } from "./errors";
import { prisma } from "./prisma";

export function requireClerkUserId(request: Request) {
  if (!isServerClerkConfigured()) {
    throw new AppError("Clerk auth is not configured yet.", 503);
  }

  const { isAuthenticated, userId } = getAuth(request);

  if (!isAuthenticated || !userId) {
    throw new AppError("Authentication required.", 401);
  }

  return userId;
}

export async function requireAdminClerkUserId(request: Request) {
  const userId = requireClerkUserId(request);
  const user = await resolveAdminUserByClerkId(userId);

  if (!user || user.role !== "ADMIN") {
    throw new AppError("Admin access required.", 403);
  }

  return userId;
}

export async function ensureLocalUserForClerkId(clerkUserId: string) {
  return resolveDashboardUserByClerkId(clerkUserId);
}

export async function resolveDashboardUserByClerkId(clerkUserId: string) {
  const clerkProfile = await getClerkProfileSnapshot(clerkUserId);
  const email = clerkProfile.email;
  const role = isAllowlistedAdminUserId(clerkUserId) ? "ADMIN" : "USER";

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ clerkUserId }, { email }]
    }
  });

  if (existingUser) {
    const nextRole = isAllowlistedAdminUserId(clerkUserId) ? "ADMIN" : existingUser.role;

    return prisma.user.update({
      where: { id: existingUser.id },
      data: {
        clerkUserId,
        email,
        username: existingUser.username ?? (await ensureUniqueCommunityUsername({
          preferredUsername: clerkProfile.username,
          email,
          clerkUserId,
          userId: existingUser.id
        })),
        displayName: existingUser.displayName ?? clerkProfile.displayName,
        avatarUrl: existingUser.avatarUrl ?? clerkProfile.avatarUrl,
        role: nextRole
      }
    });
  }

  return prisma.user.create({
    data: {
      clerkUserId,
      email,
      username: await ensureUniqueCommunityUsername({
        preferredUsername: clerkProfile.username,
        email,
        clerkUserId
      }),
      displayName: clerkProfile.displayName,
      avatarUrl: clerkProfile.avatarUrl,
      role
    }
  });
}

export async function resolveAdminUserByClerkId(clerkUserId: string) {
  const user = await resolveDashboardUserByClerkId(clerkUserId);

  if (user.role !== "ADMIN") {
    return null;
  }

  return user;
}

export async function resolveUserByMinimumRole(clerkUserId: string, minimumRole: AdminRole) {
  const user = await resolveDashboardUserByClerkId(clerkUserId);

  if (!hasMinimumRole(user.role, minimumRole)) {
    return null;
  }

  return user;
}

export async function resolveAdminActor(request: Request) {
  const clerkUserId = requireClerkUserId(request);
  const user = await resolveAdminUserByClerkId(clerkUserId);

  if (!user) {
    throw new AppError("Admin access required.", 403);
  }

  return { clerkUserId, user };
}

export async function resolveEditorActor(request: Request) {
  const clerkUserId = requireClerkUserId(request);
  const user = await resolveUserByMinimumRole(clerkUserId, "EDITOR");

  if (!user) {
    throw new AppError("Editor access required.", 403);
  }

  return { clerkUserId, user };
}

async function getClerkProfileSnapshot(clerkUserId: string) {
  const user = await clerkClient.users.getUser(clerkUserId);
  const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress;

  if (!email) {
    throw new AppError("Authenticated user is missing an email address.", 400);
  }

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.username || email.split("@")[0];

  return {
    email,
    username: user.username ?? null,
    displayName,
    avatarUrl: user.imageUrl ?? null
  };
}

async function ensureUniqueCommunityUsername({
  preferredUsername,
  email,
  clerkUserId,
  userId
}: {
  preferredUsername: string | null;
  email: string;
  clerkUserId: string;
  userId?: string;
}) {
  const baseValue = normalizeCommunityUsername(preferredUsername ?? email.split("@")[0]) || "user";
  const suffix = clerkUserId.slice(-6).toLowerCase();
  const candidates = [baseValue, `${baseValue}-${suffix}`];

  for (const candidate of candidates) {
    const existing = await prisma.user.findFirst({
      where: {
        username: candidate,
        ...(userId ? { NOT: { id: userId } } : {})
      },
      select: {
        id: true
      }
    });

    if (!existing) {
      return candidate;
    }
  }

  return `${baseValue}-${suffix}`;
}

function normalizeCommunityUsername(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

export function isServerClerkConfigured() {
  return (
    env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith("pk_") &&
    !env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("replace_me") &&
    env.CLERK_SECRET_KEY.startsWith("sk_") &&
    !env.CLERK_SECRET_KEY.includes("replace_me")
  );
}
