export type AdminRole = "ADMIN" | "EDITOR" | "MODERATOR" | "USER";

type AdminModule = {
  id: string;
  label: string;
  eyebrow: string;
  accent: string;
  minimumRole: "EDITOR" | "ADMIN";
};

export const adminModules = [
  { id: "overview", label: "Overview", eyebrow: "Mission control", accent: "bg-amber-400", minimumRole: "EDITOR" },
  { id: "content", label: "Content", eyebrow: "Movies and series", accent: "bg-emerald-400", minimumRole: "EDITOR" },
  { id: "people", label: "People", eyebrow: "Cast and profiles", accent: "bg-amber-300", minimumRole: "EDITOR" },
  { id: "media", label: "Media library", eyebrow: "Assets and posters", accent: "bg-sky-400", minimumRole: "EDITOR" },
  { id: "users", label: "Roles & logs", eyebrow: "User governance", accent: "bg-rose-400", minimumRole: "ADMIN" },
  { id: "monetization", label: "Monetization", eyebrow: "Ads and revenue", accent: "bg-violet-400", minimumRole: "ADMIN" },
  { id: "analytics", label: "Analytics", eyebrow: "Reports and trends", accent: "bg-cyan-300", minimumRole: "ADMIN" },
  { id: "settings", label: "System", eyebrow: "Access and health", accent: "bg-stone-400", minimumRole: "ADMIN" }
] as const satisfies readonly AdminModule[];

export type AdminModuleId = (typeof adminModules)[number]["id"];

const rolePriority: Record<AdminRole, number> = {
  USER: 0,
  MODERATOR: 1,
  EDITOR: 2,
  ADMIN: 3
};

export function canAccessAdminModule(role: AdminRole, moduleId: AdminModuleId) {
  const module = adminModules.find((entry) => entry.id === moduleId);

  if (!module) {
    return false;
  }

  return rolePriority[role] >= rolePriority[module.minimumRole];
}

export function getAccessibleAdminModules(role: AdminRole) {
  return adminModules.filter((module) => canAccessAdminModule(role, module.id));
}
