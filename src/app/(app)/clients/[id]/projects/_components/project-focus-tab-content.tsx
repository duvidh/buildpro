// Server component — fetches data and renders the correct tab based on `tab`
import { notFound, redirect } from "next/navigation";

import {
  getProjectTasks,
  getProjectTeam,
  getProjectMilestones,
  getProjectWorkPackages,
  getProjectQC,
  getProjectRisks,
  getProjectCR,
  getProjectProcurement,
  getProjectSettings,
  getProjectFinancials,
} from "@/actions/projects";
import { getProjectFinancialSummary } from "@/actions/finance-analytics";
import { getFieldPageData, getEmployees } from "@/actions/field";
import { getProjectFiles } from "@/actions/files";
import { getProjectGanttData } from "@/actions/tasks";
import { getPrefabElements } from "@/actions/prefab";
import { getSession } from "@/lib/session";
import type { UserRole } from "@/lib/auth-utils";
import { DELETE_ROLES } from "@/lib/auth-utils";

import { ProjectOverviewContent } from "@/app/(app)/projects/[id]/_components/project-overview-content";
import { TasksKanban } from "@/components/projects/tasks-kanban";
import { FinancialsClient } from "@/app/(app)/projects/[id]/_components/financials-client";
import { FieldClient } from "@/app/(app)/projects/[id]/_components/field-client";
import { TeamClient } from "@/app/(app)/projects/[id]/_components/team-client";
import { PrefabClient } from "@/app/(app)/projects/[id]/_components/prefab-client";
import { FilesClient } from "@/app/(app)/projects/[id]/_components/files-client";
import { MilestonesTimeline } from "@/components/projects/milestones-timeline";
import { WBSTab } from "@/components/projects/wbs-tab";
import { QCTab } from "@/components/projects/qc-tab";
import { RisksTab } from "@/components/projects/risks-tab";
import { CRTab } from "@/components/projects/cr-tab";
import { ProcurementTab } from "@/components/projects/procurement-tab";
import { GanttClient } from "@/app/(app)/projects/[id]/_components/gantt-client";
import { SettingsClient } from "@/app/(app)/projects/[id]/_components/settings-client";

// ─── Component ────────────────────────────────────────────────────────────────

export async function ProjectFocusTabContent({
  projectId,
  tab,
}: {
  projectId: string;
  tab: string;
}) {
  const session   = await getSession();
  if (!session) redirect("/login");
  const userRole  = session.role as UserRole;
  const isFieldWorker = userRole === "FIELD_WORKER";

  switch (tab) {
    // ── Overview ────────────────────────────────────────────────────────────
    case "overview":
    default: {
      return <ProjectOverviewContent projectId={projectId} />;
    }

    // ── Tasks ────────────────────────────────────────────────────────────────
    case "tasks": {
      const rawTasks = await getProjectTasks(projectId);
      if (!rawTasks) notFound();
      const tasks = JSON.parse(JSON.stringify(rawTasks));
      return <TasksKanban projectId={projectId} tasks={tasks} />;
    }

    // ── Financials ───────────────────────────────────────────────────────────
    case "financials": {
      if (isFieldWorker) {
        return (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">אין הרשאה לצפות בנתונים פיננסיים.</p>
          </div>
        );
      }
      const [tables, summary] = await Promise.all([
        getProjectFinancials(projectId),
        getProjectFinancialSummary(projectId),
      ]);
      if (!tables || !summary) {
        return (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">אין גישה לנתונים פיננסיים.</p>
          </div>
        );
      }
      const data = JSON.parse(JSON.stringify({ ...tables, summary }));
      return <FinancialsClient projectId={projectId} data={data} />;
    }

    // ── Field reports ────────────────────────────────────────────────────────
    case "field": {
      const [raw, employees] = await Promise.all([
        getFieldPageData(projectId),
        getEmployees(),
      ]);
      if (!raw) notFound();
      const data = JSON.parse(JSON.stringify({ ...raw, employees }));
      return <FieldClient data={data} />;
    }

    // ── Team ─────────────────────────────────────────────────────────────────
    case "team": {
      const raw = await getProjectTeam(projectId);
      if (!raw) notFound();
      const data = JSON.parse(JSON.stringify(raw));
      return <TeamClient data={data} />;
    }

    // ── Prefab ───────────────────────────────────────────────────────────────
    case "prefab": {
      const [rawElements, rawTasks] = await Promise.all([
        getPrefabElements(projectId),
        getProjectTasks(projectId),
      ]);
      const elements = JSON.parse(JSON.stringify(rawElements));
      const tasks    = JSON.parse(JSON.stringify(rawTasks ?? []));
      return <PrefabClient projectId={projectId} elements={elements} tasks={tasks} />;
    }

    // ── Files ─────────────────────────────────────────────────────────────────
    case "files": {
      const raw = await getProjectFiles(projectId);
      if (!raw) notFound();
      const canDelete = DELETE_ROLES.includes(userRole);
      const files     = JSON.parse(JSON.stringify(raw));
      return <FilesClient projectId={projectId} files={files} canDelete={canDelete} />;
    }

    // ── Milestones ────────────────────────────────────────────────────────────
    case "milestones": {
      const raw        = await getProjectMilestones(projectId);
      const milestones = JSON.parse(JSON.stringify(raw));
      return <MilestonesTimeline projectId={projectId} milestones={milestones} />;
    }

    // ── WBS ───────────────────────────────────────────────────────────────────
    case "wbs": {
      const raw          = await getProjectWorkPackages(projectId);
      const workPackages = JSON.parse(JSON.stringify(raw));
      return <WBSTab projectId={projectId} workPackages={workPackages} />;
    }

    // ── QC ────────────────────────────────────────────────────────────────────
    case "qc": {
      const raw = await getProjectQC(projectId);
      if (!raw) notFound();
      const data = JSON.parse(JSON.stringify(raw));
      return <QCTab projectId={projectId} qualityChecks={data.qualityChecks} ncrs={data.ncrs} />;
    }

    // ── Risks ─────────────────────────────────────────────────────────────────
    case "risks": {
      const raw   = await getProjectRisks(projectId);
      const risks = JSON.parse(JSON.stringify(raw));
      return <RisksTab projectId={projectId} risks={risks} />;
    }

    // ── Change requests ───────────────────────────────────────────────────────
    case "cr": {
      const raw            = await getProjectCR(projectId);
      const changeRequests = JSON.parse(JSON.stringify(raw));
      return <CRTab projectId={projectId} changeRequests={changeRequests} />;
    }

    // ── Procurement ───────────────────────────────────────────────────────────
    case "procurement": {
      const raw       = await getProjectProcurement(projectId);
      const contracts = JSON.parse(JSON.stringify(raw));
      return <ProcurementTab projectId={projectId} contracts={contracts} />;
    }

    // ── Gantt ─────────────────────────────────────────────────────────────────
    case "gantt": {
      const raw   = await getProjectGanttData(projectId);
      const tasks = JSON.parse(JSON.stringify(raw));
      return <GanttClient tasks={tasks} />;
    }

    // ── Settings ─────────────────────────────────────────────────────────────
    case "settings": {
      if (isFieldWorker) {
        return (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">אין הרשאה לצפות בהגדרות.</p>
          </div>
        );
      }
      const settings = await getProjectSettings(projectId);
      if (!settings) notFound();
      return <SettingsClient projectId={projectId} initialSettings={settings} />;
    }
  }
}
