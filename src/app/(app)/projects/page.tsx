export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { FolderKanban, MapPin, CalendarDays, TrendingUp, ExternalLink, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { getProjects } from "@/actions/projects";
import { getCurrencyCode } from "@/actions/settings";
import { formatCurrencyCompact } from "@/lib/formatters";

// className-only status map — labels come from translations
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

async function ProjectsContent() {
  const [projects, t, locale, currencyCode] = await Promise.all([
    getProjects(),
    getTranslations("projects"),
    getLocale(),
    getCurrencyCode(),
  ]);

  const dateLocale = locale === "he" ? "he-IL" : "en-US";

  function fmtDate(d: Date | null) {
    if (!d) return null;
    return new Intl.DateTimeFormat(dateLocale, {
      day: "2-digit", month: "2-digit", year: "numeric",
    }).format(new Date(d));
  }

  const tStatus = (status: string) => {
    try { return t(`status.${status}` as Parameters<typeof t>[0]); }
    catch { return status; }
  };

  if (projects.length === 0) {
    return (
      <div className="rounded-3xl bg-card border border-border shadow-sm flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
          <FolderKanban className="h-7 w-7 text-primary" />
        </div>
        <p className="text-base font-semibold text-foreground">{t("page.emptyTitle")}</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">{t("page.emptyDesc")}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => {
        const statusClass = PROJECT_STATUS_CLASS[project.status] ?? "bg-slate-100 text-slate-600 border-slate-200";
        const startDate = fmtDate(project.startDate);
        const endDate   = fmtDate(project.endDate);

        return (
          <Link key={project.id} href={`/projects/${project.id}`} className="group">
            <Card className="shadow-sm h-full transition-shadow group-hover:shadow-md">
              <CardContent className="p-4 flex flex-col gap-3 h-full">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm leading-snug truncate group-hover:text-primary transition-colors">
                      {project.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{project.client.name}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="outline" className={`text-[10px] h-4 px-1.5 py-0 ${statusClass}`}>
                      {tStatus(project.status)}
                    </Badge>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity" />
                  </div>
                </div>

                {/* Address */}
                {project.address && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{project.address}</span>
                  </p>
                )}

                {/* Progress */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t("page.progress")}</span>
                    <span className="font-medium">{project.progressPercent.toFixed(0)}%</span>
                  </div>
                  <Progress
                    value={project.progressPercent}
                    className={`h-1.5 ${progressColor(project.progressPercent)}`}
                  />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto pt-1">
                  {project.contractValue > 0 ? (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      <span>{formatCurrencyCompact(project.contractValue, currencyCode, dateLocale)}</span>
                    </div>
                  ) : (
                    <span />
                  )}
                  {(startDate || endDate) && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3" />
                      <span dir="ltr">
                        {startDate ?? "?"} – {endDate ?? "?"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 border-t border-border pt-2.5">
                  <span className="text-xs text-muted-foreground">
                    {t("page.tasks", { count: project._count.tasks })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("page.milestones", { count: project._count.milestones })}
                  </span>
                  {project.manager && (
                    <span className="text-xs text-muted-foreground ms-auto truncate">
                      {project.manager.name}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

export default async function ProjectsPage() {
  const t = await getTranslations("projects");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <FolderKanban className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground leading-none">{t("page.title")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t("page.subtitle")}</p>
          </div>
        </div>
        <Button size="sm" asChild>
          <Link href="/projects/new">
            <Plus className="h-4 w-4 me-1.5" />
            {t("page.newProject")}
          </Link>
        </Button>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        }
      >
        <ProjectsContent />
      </Suspense>
    </div>
  );
}
