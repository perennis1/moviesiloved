"use client";

import { useClerk } from "@clerk/nextjs";
import { getAccessibleAdminModules, type AdminModuleId, type AdminRole } from "@/components/admin-dashboard-config";

type AdminSidebarProps = {
  activeModule: AdminModuleId;
  adminUserId: string;
  adminRole: AdminRole;
  alertCount: number;
  isDesktopCollapsed: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onDesktopToggle: () => void;
  onModuleChange: (moduleId: AdminModuleId) => void;
};

export function AdminSidebar({
  activeModule,
  adminUserId,
  adminRole,
  alertCount,
  isDesktopCollapsed,
  isMobileOpen,
  onCloseMobile,
  onDesktopToggle,
  onModuleChange
}: AdminSidebarProps) {
  const { signOut } = useClerk();

  const getModuleIcon = (moduleId: string, className: string) => {
    switch (moduleId) {
      case "overview":
        return (
          <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        );
      case "content":
        return (
          <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
          </svg>
        );
      case "media":
        return (
          <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case "users":
        return (
          <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case "monetization":
        return (
          <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "analytics":
        return (
          <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4m8 12H3m2-2v-4m5 4v-8m5 8v-6m5 6v-10" />
          </svg>
        );
      case "settings":
        return (
          <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      default:
        return (
          <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        );
    }
  };

  return (
    <>
      {isMobileOpen ? (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm xl:hidden"
          onClick={onCloseMobile}
          type="button"
        />
      ) : null}

      <aside
        className={`fixed inset-y-4 left-4 z-50 flex w-[280px] shrink-0 flex-col rounded-[2rem] border border-[#222222] bg-[#1a1a1a] transition-all duration-300 xl:static xl:inset-auto xl:z-auto xl:h-full xl:shadow-none ${
          isMobileOpen ? "translate-x-0 shadow-[0_18px_60px_rgba(0,0,0,0.6)]" : "-translate-x-[120%] xl:translate-x-0"
        } ${isDesktopCollapsed ? "xl:w-20" : "xl:w-[280px]"}`}
      >
        {/* Header — fixed, never scrolls */}
        <div className="shrink-0 border-b border-[#222222] px-4 py-5">
          <div className={`flex items-center gap-3 ${isDesktopCollapsed ? "xl:justify-center" : ""}`}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#111111] border border-[#222222] shadow-sm">
              <div className="h-4.5 w-4.5 rounded-full border-2 border-white/90" />
            </div>

            <div className={`${isDesktopCollapsed ? "xl:hidden" : ""}`}>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-white">Command Center</p>
              <p className="mt-0.5 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-slate-400 font-mono">Operational</p>
            </div>

            <button
              aria-label={isDesktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden h-9 w-9 items-center justify-center rounded-xl border border-[#222222] bg-[#111111] text-slate-300 transition hover:bg-[#1a1a24] xl:inline-flex ml-auto"
              onClick={onDesktopToggle}
              type="button"
            >
              <svg className={`h-4 w-4 transition-transform duration-300 ${isDesktopCollapsed ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>

            <button
              aria-label="Close menu"
              className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#222222] bg-[#111111] text-slate-300 transition hover:bg-[#1a1a24] xl:hidden"
              onClick={onCloseMobile}
              type="button"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable body — nav ONLY */}
        <div className="flex flex-1 flex-col overflow-y-auto px-3 py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Section label */}
          <div className="mb-3 shrink-0">
            <p className={`px-2 text-[0.62rem] font-bold uppercase tracking-[0.34em] text-slate-500 font-mono ${isDesktopCollapsed ? "xl:text-center" : ""}`}>
              Command
            </p>
          </div>

          {/* Nav items */}
          <div className="grid gap-1">
            {getAccessibleAdminModules(adminRole).map((module) => {
              const isActive = module.id === activeModule;
              const hasAlert = (module.id === "overview" || module.id === "content") && alertCount > 0;

              return (
                <button
                  key={module.id}
                  className={`group relative rounded-xl border px-3 py-3 text-left transition duration-200 ${
                    isActive
                      ? "border-[#222222] bg-[#111111] text-white"
                      : "border-transparent bg-transparent text-slate-400 hover:border-[#222222] hover:bg-[#111111]/50 hover:text-slate-200"
                  } ${isDesktopCollapsed ? "xl:px-0 xl:text-center xl:flex xl:justify-center" : ""}`}
                  onClick={() => {
                    onModuleChange(module.id);
                    onCloseMobile();
                  }}
                  type="button"
                >
                  {/* Active State Spring Indicator */}
                  {isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-slate-300 shadow-sm" />
                  )}

                  <div className={`flex items-center gap-3 ${isDesktopCollapsed ? "xl:flex-col xl:items-center xl:gap-0" : ""}`}>
                    <div className="relative">
                      <div className={`flex shrink-0 h-8 w-8 items-center justify-center rounded-lg transition-colors ${isActive ? 'bg-[#1a1a1a] border border-[#222222]' : ''}`}>
                        {getModuleIcon(module.id, `h-5 w-5 ${isActive ? module.accent.replace("bg-", "text-") : "text-slate-500 group-hover:text-slate-300"}`)}
                      </div>
                      {/* Collapsed Pulsing Badge */}
                      {isDesktopCollapsed && hasAlert && (
                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                        </span>
                      )}
                    </div>

                    <div className={`min-w-0 ${isDesktopCollapsed ? "xl:hidden" : ""}`}>
                      <p className="text-[0.62rem] uppercase tracking-[0.24em] text-slate-500 font-mono leading-none">{module.eyebrow}</p>
                      <p className="mt-1 text-sm font-semibold">
                        {module.label}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

        </div>

        {/* User Matrix Footer - fixed at bottom */}
        <div className="shrink-0 border-t border-[#222222] px-4 py-4">
            <div className={`flex items-center gap-3 rounded-2xl border border-[#222222] bg-[#111111] p-2.5 ${isDesktopCollapsed ? "justify-center" : ""}`}>
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1a1a1a] border border-[#222222] text-xs font-bold text-white shadow-sm font-mono">
                {adminUserId.slice(-2).toUpperCase() || "OP"}
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-slate-900 bg-emerald-500" />
              </div>

              {!isDesktopCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-200">Admin access</p>
                  <p className="truncate mt-0.5 text-[0.62rem] uppercase tracking-wider text-slate-400 font-mono">
                    Role-based dashboard
                  </p>
                </div>
              )}

              {!isDesktopCollapsed && (
                <button
                  onClick={() => signOut({ redirectUrl: "/" })}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#222222] bg-[#1a1a1a] text-slate-400 transition hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400"
                  title="Terminate Session"
                  type="button"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              )}
            </div>
        </div>
      </aside>
    </>
  );
}
