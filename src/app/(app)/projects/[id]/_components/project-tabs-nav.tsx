"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  CheckSquare,
  Wallet,
  HardHat,
  Users,
  FolderOpen,
  Milestone,
  GitBranch,
  ShieldCheck,
  AlertTriangle,
  GitPullRequest,
  ShoppingCart,
  CalendarRange,
  Settings2,
  Factory,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/auth-utils";
import { MobileTabSelect } from "@/components/layout/mobile-tab-select";

type Settings = {
  qcEnabled: boolean;
  risksEnabled: boolean;
  crEnabled: boolean;
  milestonesEnabled: boolean;
  wbsEnabled: boolean;
  procurementEnabled: boolean;
  ganttEnabled: boolean;
};

type Counts = {
  tasks: number;
  milestones: number;
  qualityChecks: number;
  ncrs: number;
  risks: number;
  changeRequests: number;
  contracts: number;
  files: number;
  workPackages: number;
};

type Tab = {
  href:     string;
  labelKey: string;
  icon:     React.ElementType;
  count:    number | null;
};

export function ProjectTabsNav({
  projectId,
  settings,
  counts,
  userRole,
}: {
  projectId: string;
  settings:  Settings;
  counts:    Counts;
  userRole:  UserRole;
}) {
  const t        = useTranslations("projects.tabs");
  const pathname = usePathname();

  const isFieldWorker     = userRole === "FIELD_WORKER";
  const canViewFinancials = !isFieldWorker;
  const canViewSettings   = !isFieldWorker;

  // ── Core tabs ──────────────────────────────────────────────────────────────
  const coreTabs: Tab[] = [
    { href: `/projects/${projectId}`,         labelKey: "overview",   icon: LayoutDashboard, count: null },
    { href: `/projects/${projectId}/tasks`,   labelKey: "tasks",      icon: CheckSquare,     count: counts.tasks },
    ...(canViewFinancials
      ? [{ href: `/projects/${projectId}/financials`, labelKey: "financials", icon: Wallet, count: null }]
      : []),
    { href: `/projects/${projectId}/field`,   labelKey: "field",      icon: HardHat,         count: null },
    { href: `/projects/${projectId}/team`,    labelKey: "team",       icon: Users,            count: null },
    { href: `/projects/${projectId}/prefab`,  labelKey: "prefab",     icon: Factory,          count: null },
    { href: `/projects/${projectId}/files`,   labelKey: "files",      icon: FolderOpen,       count: counts.files },
  ];

  // ── Optional tabs (driven by ProjectSettings) ──────────────────────────────
  const optionalTabs: Tab[] = [
    settings.milestonesEnabled && { href: `/projects/${projectId}/milestones`,  labelKey: "milestones",  icon: Milestone,      count: counts.milestones },
    settings.wbsEnabled        && { href: `/projects/${projectId}/wbs`,         labelKey: "wbs",         icon: GitBranch,      count: counts.workPackages },
    settings.qcEnabled         && { href: `/projects/${projectId}/qc`,          labelKey: "qc",          icon: ShieldCheck,    count: counts.qualityChecks + counts.ncrs },
    settings.risksEnabled      && { href: `/projects/${projectId}/risks`,       labelKey: "risks",       icon: AlertTriangle,  count: counts.risks },
    settings.crEnabled         && { href: `/projects/${projectId}/cr`,          labelKey: "cr",          icon: GitPullRequest, count: counts.changeRequests },
    settings.procurementEnabled&& { href: `/projects/${projectId}/procurement`, labelKey: "procurement", icon: ShoppingCart,   count: counts.contracts },
    settings.ganttEnabled      && { href: `/projects/${projectId}/gantt`,       labelKey: "gantt",       icon: CalendarRange,  count: null },
  ].filter(Boolean) as Tab[];

  // ── Settings tab — hidden for FIELD_WORKER ─────────────────────────────────
  const settingsTabs: Tab[] = canViewSettings
    ? [{ href: `/projects/${projectId}/settings`, labelKey: "settings", icon: Settings2, count: null }]
    : [];

  const allTabs = [...coreTabs, ...optionalTabs, ...settingsTabs];

  const isTabActive = (href: string) =>
    href === `/projects/${projectId}` ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {/* Mobile: dropdown selector (no horizontal scrolling) */}
      <div className="md:hidden">
        <MobileTabSelect
          ariaLabel="project tabs"
          items={allTabs.map((tab) => ({
            id:     tab.href,
            label:  t(tab.labelKey as Parameters<typeof t>[0]),
            icon:   tab.icon,
            count:  tab.count,
            active: isTabActive(tab.href),
            href:   tab.href,
          }))}
        />
      </div>

      {/* Desktop: horizontal tab row */}
      <nav className="hidden md:flex overflow-x-auto gap-0 -mb-px" aria-label="project tabs">
        {allTabs.map((tab) => {
          const isActive = isTabActive(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors shrink-0",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {t(tab.labelKey as Parameters<typeof t>[0])}
              {tab.count != null && tab.count > 0 && (
                <span className="ms-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                  {tab.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
