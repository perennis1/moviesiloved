export const adminUserIds = new Set(
  (process.env.CLERK_ADMIN_USER_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);

export type AdminRole = "USER" | "MODERATOR" | "EDITOR" | "ADMIN";

const rolePriority: Record<AdminRole, number> = {
  USER: 0,
  MODERATOR: 1,
  EDITOR: 2,
  ADMIN: 3
};

export function isAllowlistedAdminUserId(userId: null | string | undefined) {
  if (!userId) {
    return false;
  }

  return adminUserIds.has(userId);
}

export function isAdminUserId(userId: null | string | undefined) {
  return isAllowlistedAdminUserId(userId);
}

export function hasMinimumRole(role: AdminRole, minimumRole: AdminRole) {
  return rolePriority[role] >= rolePriority[minimumRole];
}
