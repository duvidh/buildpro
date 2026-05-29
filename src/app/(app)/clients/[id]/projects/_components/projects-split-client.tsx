"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { Plus, MapPin, CalendarDays, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fmtDate } from "@/lib/utils";
import { useCurrency } from "@/lib/currency-context";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Project = {
  id: string;
  name: string;
  status: string;
  contractValue: number;
  progressPercent: number;
  startDate: string | null;
  endDate: string | null;
  address: string | null;
};

type Props = {
  clientId: string;
  projects: Project[];
  selectedProjectId: string | null;
};

// ─── Status CSS (labels come from t()) ───────────────────────────────────────

const PROJECT_STATUS_CLS: Record<string, string> = {
  PLANNING:  "bg-blue-100 text-blue-700 border-blue-200",
  ACTIVE:    "bg-emerald-100 text-emerald-700 border-emerald-200",
  ON_HOLD:   "bg-orange-100 text-orange-700 border-orange-200",
  COMPLETED: "bg-slate-100 text-slate-600 border-slate-200",
  CANCELLED: "bg-red-100 text-red-700 border-red-200",
};

function progressBarColor(pct: number): string {
  if (pct >= 90) return "[&>div]:bg-emerald-500";
  if (pct >= 30) return "[&>div]:bg-primary";
  return "[&>div]:bg-orange-400";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProjectsSplitClient({
  clientId: _clientId,
  projects,
  selectedProjectId,
}: Props) {
  const { fmtCompact } = useCurrency();
  const router   = useRouter();
  const pathname = usePathname();
  const t        = useTranslations("clients");
  const tCommon  = useTranslations("common");
  const tProj    = useTranslations("projects");
  const locale   = useLocale();
  const dir      = locale === "he" ? "rtl" : "ltr";

  function selectProject(id: string) {
    // Any click opens the focus overlay (no deselect — use the overlay's back button)
    router.push(`${pathname}?selectedProjectId=${id}`, { scroll: false });
  }

  return (
    <div className="space-y-2 pb-2 max-w-5xl" dir={dir}>
      {/* Header row */}
      <div className="flex items-center justify-between py-1">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {t("projectsList.count", { n: projects.length })}
        </h2>
        <Button asChild size="sm" variant="outline" className="h-8 gap-1.5">
          <Link href="/projects">
            <Plus className="h-3.5 w-3.5" />
            {tCommon("newProject")}
          </Link>
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            {t("projectsList.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {projects.map((project) => {
            const statusCls  = PROJECT_STATUS_CLS[project.status] ?? PROJECT_STATUS_CLS.PLANNING;
            const statusLabel = tProj(`status.${project.status as "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED"}`);
            const pct        = project.progressPercent ?? 0;
            const isSelected = project.id === selectedProjectId;

            return (
              <button
                key={project.id}
                type="button"
                onClick={() => selectProject(project.id)}
                className={cn(
                  "w-full text-start rounded-xl border transition-all duration-200",
                  "hover:shadow-md hover:border-primary/30",
                  isSelected
                    ? "border-primary/50 bg-primary/5 shadow-md ring-1 ring-primary/20"
                    : "border-border bg-card shadow-sm",
                )}
              >
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Name + status */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-foreground truncate">
                          {project.name}
                        </span>
                        <Badge variant="outline" className={`text-xs ${statusCls}`}>
                          {statusLabel}
                        </Badge>
                      </div>

                      {project.address && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {project.address}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mb-1.5">
                        <Progress value={pct} className={`h-1.5 flex-1 ${progressBarColor(pct)}`} />
                        <span className="text-xs text-muted-foreground tabular-nums w-8 text-end">{pct}%</span>
                      </div>

                      {(project.startDate || project.endDate) && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarDays className="h-3 w-3 shrink-0" />
                          <span dir="ltr">
                            {fmtDate(project.startDate)}
                            {project.endDate ? ` – ${fmtDate(project.endDate)}` : ""}
                          </span>
                        </p>
                      )}
                    </div>

                    <div className="text-end shrink-0 flex flex-col items-end gap-1">
                      <p className="text-sm font-bold text-foreground">{fmtCompact(project.contractValue)}</p>
                      <p className="text-xs text-muted-foreground">{t("projectsList.contractValue")}</p>
                      {/* Arrow hint */}
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50 mt-1" />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
