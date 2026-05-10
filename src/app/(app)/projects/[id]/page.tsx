import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  MapPin,
  CalendarDays,
  User2,
  Building2,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { getProjectById } from "@/actions/projects";
import { ProjectTabs } from "@/components/projects/project-tabs";
import { EditProjectDialog } from "@/components/projects/edit-project-dialog";

const PROJECT_STATUS: Record<string, { label: string; className: string }> = {
  PLANNING:  { label: "תכנון",  className: "bg-blue-100 text-blue-700 border-blue-200" },
  ACTIVE:    { label: "פעיל",   className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  ON_HOLD:   { label: "מושהה",  className: "bg-orange-100 text-orange-700 border-orange-200" },
  COMPLETED: { label: "הושלם",  className: "bg-slate-100 text-slate-600 border-slate-200" },
  CANCELLED: { label: "בוטל",   className: "bg-red-100 text-red-700 border-red-200" },
};

function fmtDate(d: Date | null) {
  if (!d) return null;
  return new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(d)
  );
}

function progressColor(pct: number) {
  if (pct >= 90) return "[&>div]:bg-emerald-500";
  if (pct >= 30) return "[&>div]:bg-primary";
  return "[&>div]:bg-orange-400";
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const raw = await getProjectById(id);
  if (!raw) notFound();
  // Serialize all Date objects — Client Components cannot receive Date instances as props
  const project = JSON.parse(JSON.stringify(raw)) as typeof raw;

  const status = PROJECT_STATUS[project.status];
  const startDate = fmtDate(project.startDate);
  const endDate = fmtDate(project.endDate);

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
    <div className="w-full px-4 md:px-8 py-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground -me-1">
          <Link href="/projects">
            <ArrowRight className="h-4 w-4 me-1" />
            פרויקטים
          </Link>
        </Button>
        <span className="text-muted-foreground text-sm">/</span>
        <span className="text-sm font-medium text-foreground">{project.name}</span>
      </div>

      {/* Header card */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            {/* Icon */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <TrendingUp className="h-7 w-7 text-primary" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-2xl font-bold text-foreground leading-none">
                    {project.name}
                  </h1>
                  {project.description && (
                    <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="outline"
                    className={`text-xs px-2.5 py-0.5 ${status?.className}`}
                  >
                    {status?.label ?? project.status}
                  </Badge>
                  <EditProjectDialog
                    project={{
                      id: project.id,
                      name: project.name,
                      description: project.description,
                      address: project.address,
                      status: project.status,
                      startDate: project.startDate as string | null,
                      endDate: project.endDate as string | null,
                      contractValue: project.contractValue,
                    }}
                  />
                </div>
              </div>

              <Separator className="my-3" />

              <div className="flex flex-wrap gap-x-5 gap-y-2">
                <Link
                  href={`/clients/${project.client.id}`}
                  className="flex items-center gap-1.5 text-sm text-foreground hover:text-primary transition-colors"
                >
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {project.client.name}
                </Link>
                {project.manager && (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <User2 className="h-3.5 w-3.5 shrink-0" />
                    {project.manager.name}
                  </span>
                )}
                {project.address && (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {project.address}
                  </span>
                )}
                {(startDate || endDate) && (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground" dir="ltr">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    {startDate ?? "?"} – {endDate ?? "?"}
                  </span>
                )}
              </div>

              {/* Progress + contract value */}
              <div className="mt-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">התקדמות</span>
                    <span className="font-semibold">{project.progressPercent.toFixed(0)}%</span>
                  </div>
                  <Progress
                    value={project.progressPercent}
                    className={`h-2 ${progressColor(project.progressPercent)}`}
                  />
                </div>
                {project.contractValue > 0 && (
                  <div className="text-end shrink-0">
                    <p className="text-xs text-muted-foreground">ערך חוזה</p>
                    <p className="text-sm font-bold text-foreground">
                      ₪{project.contractValue.toLocaleString("he-IL", { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card className="shadow-sm">
        <CardContent className="p-0 pb-4">
          <ProjectTabs
            projectId={project.id}
            initialSettings={settings}
            tasks={project.tasks}
            milestones={project.milestones}
            members={project.members}
            counts={project._count}
            timeEntries={project.timeEntries}
            expenses={project.expenses}
            dailyLogs={project.dailyLogs}
            contractValue={project.contractValue}
            invoices={project.invoices}
            contracts={project.contracts}
            changeRequests={project.changeRequests}
            equipmentLogs={project.equipmentLogs}
            qualityChecks={project.qualityChecks}
            ncrs={project.ncrs}
            risks={project.risks}
            workPackages={project.workPackages}
          />
        </CardContent>
      </Card>
    </div>
  );
}
