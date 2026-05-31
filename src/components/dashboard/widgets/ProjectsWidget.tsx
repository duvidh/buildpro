"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCurrency } from "@/lib/currency-context";
import { ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { DashboardData } from "./types";

function progressColor(pct: number) {
  if (pct >= 90) return "[&>div]:bg-emerald-500";
  if (pct >= 60) return "[&>div]:bg-primary";
  return "[&>div]:bg-orange-400";
}

export function ProjectsWidget({ data }: { data: DashboardData }) {
  const t = useTranslations("widgets.projects");
  const { fmtCompact } = useCurrency();
  const { projects } = data;

  const STATUS_CFG: Record<string, { labelKey: string; className: string }> = {
    ACTIVE:    { labelKey: "statusActive",    className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    PLANNING:  { labelKey: "statusPlanning",  className: "bg-blue-100 text-blue-700 border-blue-200" },
    ON_HOLD:   { labelKey: "statusOnHold",    className: "bg-orange-100 text-orange-700 border-orange-200" },
    COMPLETED: { labelKey: "statusCompleted", className: "bg-slate-100 text-slate-600 border-slate-200" },
  };

  return (
    <div className="flex flex-col h-full">
      {projects.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground p-4">
          {t("noActiveProjects")}
        </div>
      ) : (
        <ul className="flex-1 divide-y divide-border overflow-auto">
          {projects.map((project) => {
            const cfg = STATUS_CFG[project.status] ?? STATUS_CFG.PLANNING;
            return (
              <li key={project.id} className="px-4 py-2.5 hover:bg-muted/40 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/projects/${project.id}`}
                      className="text-sm font-medium text-foreground truncate block hover:text-primary transition-colors"
                    >
                      {project.name}
                    </Link>
                    <p className="text-xs text-muted-foreground truncate">{project.client.name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ms-3">
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${cfg.className}`}>
                      {t(cfg.labelKey as Parameters<typeof t>[0])}
                    </Badge>
                    <span className="text-xs font-semibold text-muted-foreground w-8 text-end">
                      {project.progressPercent.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Progress
                    value={project.progressPercent}
                    className={`h-1.5 flex-1 ${progressColor(project.progressPercent)}`}
                  />
                  {project.contractValue > 0 && (
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {fmtCompact(project.contractValue)}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="border-t border-border/40 px-4 py-2 shrink-0">
        <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground w-full justify-end">
          <Link href="/projects">
            {t("allProjects")} <ChevronLeft className="h-3.5 w-3.5 ms-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
