export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getClientHeader, getClientProjects } from "@/actions/clients";
import { getProjectHeader } from "@/actions/projects";
import { getSession } from "@/lib/session";
import type { UserRole } from "@/lib/auth-utils";
import { ProjectsSplitClient } from "./_components/projects-split-client";
import { ProjectFocusOverlay } from "./_components/project-focus-overlay";
import { ProjectFocusTabContent } from "./_components/project-focus-tab-content";

const DEFAULT_SETTINGS = {
  qcEnabled: true,
  risksEnabled: true,
  crEnabled: true,
  milestonesEnabled: true,
  wbsEnabled: true,
  procurementEnabled: true,
  ganttEnabled: true,
};

export default async function ClientProjectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp     = await searchParams;

  const selectedProjectId =
    typeof sp.selectedProjectId === "string" ? sp.selectedProjectId : null;
  const projectTab =
    typeof sp.projectTab === "string" ? sp.projectTab : "overview";

  // Always fetch client + project list
  const [client, projects] = await Promise.all([
    getClientHeader(id),
    getClientProjects(id),
  ]);
  if (!client) notFound();

  // ── No project selected: show the project list ─────────────────────────────
  if (!selectedProjectId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = JSON.parse(JSON.stringify({ projects }));
    return (
      <ProjectsSplitClient
        clientId={id}
        projects={data.projects}
        selectedProjectId={null}
      />
    );
  }

  // ── Project selected: fetch header and render inline workspace ─────────────
  const [projectHeader, session] = await Promise.all([
    getProjectHeader(selectedProjectId),
    getSession(),
  ]);

  if (!projectHeader) {
    // Project not found — fall back to the list
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = JSON.parse(JSON.stringify({ projects }));
    return (
      <ProjectsSplitClient
        clientId={id}
        projects={data.projects}
        selectedProjectId={null}
      />
    );
  }

  const userRole = (session?.role ?? "FIELD_WORKER") as UserRole;

  return (
    // Inline workspace — ClientHeader + ClientTabsNav remain visible above
    <ProjectFocusOverlay
      projectId={selectedProjectId}
      projectName={projectHeader.name}
      activeTab={projectTab}
      settings={projectHeader.settings ?? DEFAULT_SETTINGS}
      counts={projectHeader._count}
      userRole={userRole}
    >
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        }
      >
        <ProjectFocusTabContent
          projectId={selectedProjectId}
          tab={projectTab}
        />
      </Suspense>
    </ProjectFocusOverlay>
  );
}
