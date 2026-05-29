"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import {
  ArrowRight,
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
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/auth-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

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

type TabDef = {
  id: string;
  label: string;
  icon: React.ElementType;
  count: number | null;
};

type Props = {
  projectId: string;
  projectName: string;
  activeTab: string;
  settings: Settings;
  counts: Counts;
  userRole: UserRole;
  children: React.ReactNode;
};

// ─── Default settings guard ───────────────────────────────────────────────────

const DEFAULT_SETTINGS: Settings = {
  qcEnabled: true,
  risksEnabled: true,
  crEnabled: true,
  milestonesEnabled: true,
  wbsEnabled: true,
  procurementEnabled: true,
  ganttEnabled: true,
};

// ─── Component ────────────────────────────────────────────────────────────────
// Renders INLINE (not fixed) so the parent ClientHeader + ClientTabsNav
// remain visible in their sticky position above this content.

export function ProjectFocusOverlay({
  projectId,
  projectName,
  activeTab,
  settings,
  counts,
  userRole,
  children,
}: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const tProj    = useTranslations("projects");
  const tClients = useTranslations("clients");
  const locale   = useLocale();
  const dir      = locale === "he" ? "rtl" : "ltr";

  const s = settings ?? DEFAULT_SETTINGS;

  const isFieldWorker     = userRole === "FIELD_WORKER";
  const canViewFinancials = !isFieldWorker;
  const canViewSettings   = !isFieldWorker;

  // ── Build tab list (mirrors ProjectTabsNav) ──────────────────────────────
  const coreTabs: TabDef[] = [
    { id: "overview",  label: tProj("tabs.overview"),    icon: LayoutDashboard, count: null },
    { id: "tasks",     label: tProj("tabs.tasks"),       icon: CheckSquare,     count: counts.tasks },
    ...(canViewFinancials
      ? [{ id: "financials", label: tProj("tabs.financials"), icon: Wallet, count: null } as TabDef]
      : []),
    { id: "field",  label: tProj("tabs.field"),  icon: HardHat,    count: null },
    { id: "team",   label: tProj("tabs.team"),   icon: Users,      count: null },
    { id: "prefab", label: tProj("tabs.prefab"), icon: Factory,    count: null },
    { id: "files",  label: tProj("tabs.files"),  icon: FolderOpen, count: counts.files },
  ];

  const optionalTabs: TabDef[] = [
    s.milestonesEnabled && { id: "milestones",   label: tProj("tabs.milestones"),   icon: Milestone,      count: counts.milestones },
    s.wbsEnabled        && { id: "wbs",          label: tProj("tabs.wbs"),          icon: GitBranch,      count: counts.workPackages },
    s.qcEnabled         && { id: "qc",           label: tProj("tabs.qc"),           icon: ShieldCheck,    count: counts.qualityChecks + counts.ncrs },
    s.risksEnabled      && { id: "risks",        label: tProj("tabs.risks"),        icon: AlertTriangle,  count: counts.risks },
    s.crEnabled         && { id: "cr",           label: tProj("tabs.cr"),           icon: GitPullRequest, count: counts.changeRequests },
    s.procurementEnabled&& { id: "procurement",  label: tProj("tabs.procurement"),  icon: ShoppingCart,   count: counts.contracts },
    s.ganttEnabled      && { id: "gantt",        label: tProj("tabs.gantt"),        icon: CalendarRange,  count: null },
  ].filter(Boolean) as TabDef[];

  const settingsTabs: TabDef[] = canViewSettings
    ? [{ id: "settings", label: tProj("tabs.settings"), icon: Settings2, count: null }]
    : [];

  const allTabs = [...coreTabs, ...optionalTabs, ...settingsTabs];

  function goBack() {
    router.push(pathname, { scroll: false });
  }

  function goTab(tabId: string) {
    router.push(
      `${pathname}?selectedProjectId=${projectId}&projectTab=${tabId}`,
      { scroll: false }
    );
  }

  return (
    // ── Inline container — fills parent flow, NOT fixed/absolute ──────────────
    <div dir={dir} className="flex flex-col animate-in fade-in-0 slide-in-from-top-2 duration-200">

      {/* ── Back bar + project name ───────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 py-3 mb-1">
        {/* Back to project list */}
        <Button
          variant="ghost"
          size="sm"
          onClick={goBack}
          className="gap-2 text-muted-foreground hover:text-foreground -ms-1"
        >
          <ArrowRight className="h-4 w-4" />
          <span>{tClients("projectsList.backToList")}</span>
        </Button>

        {/* Open full project page */}
        <Button
          asChild
          variant="outline"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground shrink-0"
        >
          <Link href={`/projects/${projectId}`}>
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{tClients("projectsList.openProjectPage")}</span>
          </Link>
        </Button>
      </div>

      {/* ── Project name ─────────────────────────────────────────────────── */}
      <h2 className="text-lg font-bold text-foreground truncate mb-3 px-0.5">
        {projectName}
      </h2>

      {/* ── Tab nav ──────────────────────────────────────────────────────── */}
      <div className="border-b border-border/60 -mx-4 sm:-mx-6 px-4 sm:px-6 mb-4">
        <nav className="flex overflow-x-auto gap-0 -mb-px scrollbar-none" aria-label="project focus tabs">
          {allTabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => goTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors shrink-0",
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.count != null && tab.count > 0 && (
                  <span className="ms-0.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────── */}
      <div>
        {children}
      </div>
    </div>
  );
}
