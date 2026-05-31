"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  FolderKanban,
  FileText,
  UserCog,
  Wrench,
  ClipboardList,
  CheckSquare,
  Package,
  ShoppingBag,
  Wallet,
  Settings,
  Building2,
  HardHat,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { APP_CONFIG } from "@/lib/config/app-config";
import type { UserRole } from "@/lib/auth-utils";

type SessionUser = { name: string; email: string; initials: string; role: UserRole };

// ─── Nav item definition ──────────────────────────────────────────────────────

type NavItem = {
  href:     string;
  icon:     React.ElementType;
  labelKey: string;
  /** Roles that may see this item (undefined = everyone). */
  roles?: UserRole[];
};

type NavGroup = { groupKey: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    groupKey: "groups.management",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, labelKey: "dashboard" },
      { href: "/leads",     icon: TrendingUp,      labelKey: "leads",          roles: ["ADMIN", "OFFICE_MANAGER", "PROJECT_MANAGER"] },
      { href: "/clients",   icon: Users,           labelKey: "clients",         roles: ["ADMIN", "OFFICE_MANAGER", "PROJECT_MANAGER"] },
      { href: "/projects",  icon: FolderKanban,    labelKey: "projects" },
      { href: "/quotes",    icon: FileText,         labelKey: "quotes",          roles: ["ADMIN", "OFFICE_MANAGER", "PROJECT_MANAGER"] },
    ],
  },
  {
    groupKey: "groups.field",
    items: [
      { href: "/field",      icon: HardHat,       labelKey: "fieldReports" },
      { href: "/hr",         icon: UserCog,       labelKey: "hr",         roles: ["ADMIN", "OFFICE_MANAGER", "PROJECT_MANAGER"] },
      { href: "/equipment",  icon: Wrench,        labelKey: "equipment" },
      { href: "/daily-logs", icon: ClipboardList, labelKey: "dailyLogs" },
      { href: "/tasks",      icon: CheckSquare,   labelKey: "tasks" },
    ],
  },
  {
    groupKey: "groups.finance",
    items: [
      { href: "/subcontractors", icon: Package,     labelKey: "subcontractors", roles: ["ADMIN", "OFFICE_MANAGER", "PROJECT_MANAGER"] },
      { href: "/catalog",        icon: ShoppingBag, labelKey: "catalog",         roles: ["ADMIN", "OFFICE_MANAGER", "PROJECT_MANAGER"] },
      { href: "/finance",        icon: Wallet,      labelKey: "finance",         roles: ["ADMIN", "OFFICE_MANAGER", "PROJECT_MANAGER"] },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function AppSidebar({
  user,
  companyName,
}: {
  user: SessionUser;
  companyName?: string;
}) {
  const pathname  = usePathname();
  const t         = useTranslations("nav");
  const tSettings = useTranslations("settings");
  const locale    = useLocale();

  const tRole = (r: UserRole) => {
    try { return tSettings(`roles.${r}` as Parameters<typeof tSettings>[0]); } catch { return r; }
  };

  /**
   * When the app is in English and the stored name contains Hebrew characters
   * (e.g. a seeded role name stored in Hebrew), substitute the translated role
   * label so no Hebrew text leaks into the English UI.
   */
  const isHebrew = (s: string) => /[֐-׿]/.test(s);
  const resolvedName =
    locale === "en" && isHebrew(user.name) ? tRole(user.role) : user.name;

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.roles || item.roles.includes(user.role)
      ),
    }))
    .filter((group) => group.items.length > 0);

  const canViewSettings = user.role !== "FIELD_WORKER";
  const displayName = companyName || APP_CONFIG.companyName;

  return (
    <aside className="group flex h-screen w-16 hover:w-64 shrink-0 flex-col bg-sidebar/90 glass-sidebar border-e border-sidebar-border transition-[width] duration-300 ease-in-out overflow-x-hidden">

      {/* ── Brand ── */}
      <div className="flex h-16 items-center border-b border-sidebar-border shrink-0 overflow-hidden">
        {/* Icon — always visible, centered in collapsed state */}
        <div className="flex h-16 w-16 shrink-0 items-center justify-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
            <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
        </div>
        {/* Text — fades in on hover */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100 whitespace-nowrap overflow-hidden pe-3">
          <p className="text-sm font-bold text-sidebar-foreground leading-none">{displayName}</p>
          <p className="text-[11px] text-sidebar-foreground/50 mt-0.5">{t("tagline")}</p>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4 space-y-5 scrollbar-none">
        {visibleGroups.map((group) => (
          <div key={group.groupKey}>
            {/* Section label — hidden when collapsed */}
            <p className="mb-2 px-2 text-[10px] font-semibold tracking-wide text-sidebar-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-75 whitespace-nowrap">
              {t(group.groupKey as Parameters<typeof t>[0])}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group/item flex items-center rounded-lg py-2 text-sm font-medium transition-colors overflow-hidden",
                        isActive
                          ? "bg-sidebar-primary/15 text-sidebar-primary"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      {/* Icon wrapper — always w-12 so icon stays centered when collapsed */}
                      <span className="flex w-12 shrink-0 items-center justify-center">
                        <item.icon className="h-4 w-4 transition-all duration-200 group-hover/item:scale-110 group-hover/item:text-primary" />
                      </span>
                      {/* Label */}
                      <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100 leading-none">
                        {t(item.labelKey as Parameters<typeof t>[0])}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div className="border-t border-sidebar-border py-2 space-y-0.5 shrink-0 overflow-hidden">
        {canViewSettings && (
          <Link
            href="/settings"
            className={cn(
              "group/item flex items-center rounded-lg py-2 text-sm font-medium transition-colors overflow-hidden",
              pathname === "/settings"
                ? "bg-sidebar-primary/15 text-sidebar-primary"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <span className="flex w-12 shrink-0 items-center justify-center">
              <Settings className="h-4 w-4 transition-all duration-200 group-hover/item:scale-110 group-hover/item:text-primary" />
            </span>
            <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100 leading-none">
              {t("settings")}
            </span>
          </Link>
        )}

        <Separator className="bg-sidebar-border mx-2 my-1" />

        {/* User row */}
        <div className="flex items-center overflow-hidden py-1">
          <div className="flex w-12 shrink-0 items-center justify-center">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary text-xs font-bold">
                {user.initials}
              </AvatarFallback>
            </Avatar>
          </div>
          <div
            className="min-w-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100 overflow-hidden pe-3"
            dir={locale === "he" ? "rtl" : "ltr"}
          >
            <p className="text-sm font-medium text-sidebar-foreground truncate leading-none whitespace-nowrap">
              {resolvedName}
            </p>
            {/* Hide role subtitle when it would duplicate the overridden name */}
            {resolvedName !== tRole(user.role) && (
              <p className="text-[11px] text-sidebar-foreground/50 mt-0.5 truncate whitespace-nowrap">
                {tRole(user.role)}
              </p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
