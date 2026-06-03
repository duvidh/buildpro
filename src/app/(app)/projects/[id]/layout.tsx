export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { getProjectHeader } from "@/actions/projects";
import { getSession } from "@/lib/session";
import type { UserRole } from "@/lib/auth-utils";
import { ProjectHeader } from "./_components/project-header";
import { ProjectTabsNav } from "./_components/project-tabs-nav";
import { MobileQuickLogButton } from "@/components/MobileQuickLogButton";
import { AIAssistantBar } from "@/components/AIAssistantBar";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [project, session] = await Promise.all([
    getProjectHeader(id),
    getSession(),
  ]);
  if (!project) notFound();

  if (!session) redirect("/login");
  const userRole = session.role as UserRole;
  const canDelete = userRole === "ADMIN" || userRole === "OFFICE_MANAGER";

  // Serialize dates before passing to client components
  const headerProject = {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    contractValue: project.contractValue,
    progressPercent: project.progressPercent,
    address: project.address,
    startDate: project.startDate ? new Date(project.startDate).toISOString() : null,
    endDate: project.endDate ? new Date(project.endDate).toISOString() : null,
    client: project.client,
    manager: project.manager,
  };

  const defaultSettings = {
    qcEnabled: true,
    risksEnabled: true,
    crEnabled: true,
    milestonesEnabled: true,
    wbsEnabled: true,
    procurementEnabled: true,
    ganttEnabled: true,
  };
  const settings = project.settings ?? defaultSettings;

  return (
    <div className="-mt-4 -mx-4 sm:-mt-6 sm:-mx-6 flex flex-col min-h-full">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/60">
        <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
          <ProjectHeader project={headerProject} canDelete={canDelete} />
        </div>
        <div className="px-4 sm:px-6">
          <ProjectTabsNav
            projectId={id}
            settings={settings}
            counts={project._count}
            userRole={userRole}
          />
        </div>
      </div>
      <div className="px-4 sm:px-6 py-6 pb-24 flex-1">{children}</div>
      <MobileQuickLogButton projectId={id} />
      <AIAssistantBar projectId={id} />
    </div>
  );
}
