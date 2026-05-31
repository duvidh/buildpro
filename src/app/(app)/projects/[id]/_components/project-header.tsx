"use client";

import { useCurrency } from "@/lib/currency-context";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  ArrowRight,
  Building2,
  User2,
  MapPin,
  CalendarDays,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HardDeleteDialog } from "@/components/ui/hard-delete-dialog";
import { deleteProject } from "@/actions/projects";
import { EditProjectDialog } from "@/components/projects/edit-project-dialog";

type HeaderProject = {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  contractValue: number;
  progressPercent: number;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  client: { id: string; name: string };
  manager?: { id: string; name: string } | null;
};

type ProjectHeaderProps = {
  project: HeaderProject;
  /** Whether the current user may delete this project (ADMIN / OFFICE_MANAGER). */
  canDelete?: boolean;
};

// className-only status config — labels come from translations
const PROJECT_STATUS_CLASS: Record<string, string> = {
  PLANNING:  "bg-blue-100 text-blue-700 border-blue-200",
  ACTIVE:    "bg-emerald-100 text-emerald-700 border-emerald-200",
  ON_HOLD:   "bg-orange-100 text-orange-700 border-orange-200",
  COMPLETED: "bg-slate-100 text-slate-600 border-slate-200",
  CANCELLED: "bg-red-100 text-red-700 border-red-200",
};

function progressColor(pct: number) {
  if (pct >= 90) return "[&>div]:bg-emerald-500";
  if (pct >= 30) return "[&>div]:bg-primary";
  return "[&>div]:bg-orange-400";
}

export function ProjectHeader({ project, canDelete = false }: ProjectHeaderProps) {
  const { fmtCompact } = useCurrency();
  const t      = useTranslations("projects");
  const locale = useLocale();
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const dateLocale = locale === "he" ? "he-IL" : "en-US";

  const statusClass = PROJECT_STATUS_CLASS[project.status]
    ?? "bg-slate-100 text-slate-600 border-slate-200";

  const statusLabel = (() => {
    try { return t(`status.${project.status}` as Parameters<typeof t>[0]); }
    catch { return project.status; }
  })();

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteProject(project.id);
      if (res.success) {
        toast.success(t("header.toastDeleted"));
        router.push("/projects");
      } else {
        toast.error(res.error ?? t("header.toastDeleteError"));
        setDeleteOpen(false);
      }
    });
  }

  return (
    <div className="space-y-2">
      {/* Top row: breadcrumb + actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="shrink-0 -ms-2 text-muted-foreground"
          >
            <Link href="/projects">
              <ArrowRight className="h-4 w-4 me-1" />
              {t("header.breadcrumb")}
            </Link>
          </Button>
          <span className="text-muted-foreground/60">/</span>
          <span className="text-sm font-medium text-foreground truncate">
            {project.name}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant="outline"
            className={`text-xs px-2 py-0.5 ${statusClass}`}
          >
            {statusLabel}
          </Badge>
          <EditProjectDialog
            project={{
              id:            project.id,
              name:          project.name,
              description:   project.description ?? null,
              address:       project.address ?? null,
              status:        project.status,
              startDate:     project.startDate?.slice(0, 10) ?? null,
              endDate:       project.endDate?.slice(0, 10) ?? null,
              contractValue: project.contractValue,
              latitude:      project.latitude ?? null,
              longitude:     project.longitude ?? null,
            }}
          />
          {canDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">{t("header.moreActions")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4 me-2" />
                  {t("header.deleteProject")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Link
          href={`/clients/${project.client.id}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          {project.client.name}
        </Link>
        {project.manager && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <User2 className="h-3.5 w-3.5 shrink-0" />
            {project.manager.name}
          </span>
        )}
        {project.address && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {project.address}
          </span>
        )}
        {(project.startDate || project.endDate) && (
          <span
            className="flex items-center gap-1 text-sm text-muted-foreground"
            dir="ltr"
          >
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            {project.startDate
              ? new Date(project.startDate).toLocaleDateString(dateLocale)
              : "?"}{" "}
            –{" "}
            {project.endDate
              ? new Date(project.endDate).toLocaleDateString(dateLocale)
              : "?"}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3 max-w-lg">
        <div className="flex-1">
          <Progress
            value={project.progressPercent}
            className={`h-1.5 ${progressColor(project.progressPercent)}`}
          />
        </div>
        <span className="text-xs font-semibold text-muted-foreground w-8 text-end shrink-0">
          {project.progressPercent.toFixed(0)}%
        </span>
        {project.contractValue > 0 && (
          <span className="text-xs text-muted-foreground shrink-0">
            {fmtCompact(project.contractValue)}
          </span>
        )}
      </div>

      {/* Delete confirmation */}
      <HardDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        itemName={project.name}
        itemKind={t("header.deleteItemKind")}
        cascadeList={[
          t("header.cascade.tasks"),
          t("header.cascade.milestones"),
          t("header.cascade.files"),
          t("header.cascade.invoices"),
          t("header.cascade.contracts"),
          t("header.cascade.labor"),
          t("header.cascade.qc"),
          t("header.cascade.risks"),
        ]}
        onConfirm={handleDelete}
        isPending={isPending}
      />
    </div>
  );
}
