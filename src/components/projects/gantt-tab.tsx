"use client";

import { useTranslations, useLocale } from "next-intl";
import { CalendarRange } from "lucide-react";

type WorkPackageEntry = {
  id: string;
  name: string;
  description: string | null;
  plannedCost: number;
  actualCost: number;
  completionPercent: number;
  startDate: Date | null;
  endDate: Date | null;
  order: number;
};

const BAR_STYLES = [
  { bg: "bg-blue-100",   fill: "bg-blue-500",   border: "border-blue-300" },
  { bg: "bg-violet-100", fill: "bg-violet-500", border: "border-violet-300" },
  { bg: "bg-emerald-100",fill: "bg-emerald-500",border: "border-emerald-300" },
  { bg: "bg-orange-100", fill: "bg-orange-500", border: "border-orange-300" },
  { bg: "bg-red-100",    fill: "bg-red-500",    border: "border-red-300" },
  { bg: "bg-teal-100",   fill: "bg-teal-500",   border: "border-teal-300" },
  { bg: "bg-indigo-100", fill: "bg-indigo-500", border: "border-indigo-300" },
];

export function GanttTab({ workPackages }: { workPackages: WorkPackageEntry[] }) {
  const t = useTranslations("projects");
  const locale = useLocale();

  function fmtMonth(date: Date) {
    const intlLocale = locale === "he" ? "he-IL" : "en-US";
    return new Intl.DateTimeFormat(intlLocale, { month: "short", year: "2-digit" }).format(new Date(date));
  }

  const wps = workPackages.filter((wp) => wp.startDate && wp.endDate);

  if (wps.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 gap-3">
        <CalendarRange className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">
          {workPackages.length === 0
            ? t("gantt.emptyNoPackages")
            : t("gantt.emptyNoDates")}
        </p>
      </div>
    );
  }

  const minTime = Math.min(...wps.map((wp) => new Date(wp.startDate!).getTime()));
  const maxTime = Math.max(...wps.map((wp) => new Date(wp.endDate!).getTime()));
  const totalMs = Math.max(1, maxTime - minTime);
  const timelineStart = new Date(minTime);
  const timelineEnd   = new Date(maxTime);

  // Generate month tick positions
  const months: Date[] = [];
  const cursor = new Date(timelineStart.getFullYear(), timelineStart.getMonth(), 1);
  while (cursor.getTime() <= timelineEnd.getTime()) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  function toPct(date: Date | string) {
    return Math.max(0, Math.min(100, ((new Date(date).getTime() - minTime) / totalMs) * 100));
  }

  function widthPct(start: Date | string, end: Date | string) {
    return Math.max(1, ((new Date(end).getTime() - new Date(start).getTime()) / totalMs) * 100);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5">
        <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm font-semibold text-muted-foreground">
          {t("gantt.headerTitle", { n: wps.length })}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <div className="min-w-[600px]">
          {/* Month header row */}
          <div className="flex border-b border-border bg-muted/40">
            <div className="w-44 shrink-0 px-3 py-2 text-xs font-medium text-muted-foreground border-e border-border">
              {t("gantt.colWorkPackage")}
            </div>
            <div className="relative flex-1 h-8">
              {months.map((month, i) => {
                const leftPct = toPct(month);
                return (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 flex items-center"
                    style={{ left: `${leftPct}%` }}
                  >
                    <div className="h-full w-px bg-border" />
                    <span className="ps-1 text-[10px] text-muted-foreground whitespace-nowrap">
                      {fmtMonth(month)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Work package rows */}
          {wps.map((wp, idx) => {
            const left  = toPct(wp.startDate!);
            const width = widthPct(wp.startDate!, wp.endDate!);
            const pct   = Math.min(100, Math.max(0, wp.completionPercent));
            const style = BAR_STYLES[idx % BAR_STYLES.length];
            return (
              <div
                key={wp.id}
                className="flex border-b border-border last:border-0 hover:bg-muted/10 group"
              >
                {/* Name column */}
                <div className="w-44 shrink-0 px-3 py-2.5 border-e border-border">
                  <p className="text-xs font-medium leading-snug line-clamp-1">{wp.name}</p>
                  <p className="text-[10px] text-muted-foreground">{pct.toFixed(0)}%</p>
                </div>

                {/* Bar area */}
                <div className="relative flex-1 min-h-[48px] py-2.5">
                  {/* Month grid lines */}
                  {months.map((month, i) => (
                    <div
                      key={i}
                      className="absolute inset-y-0 w-px bg-border/40"
                      style={{ left: `${toPct(month)}%` }}
                    />
                  ))}

                  {/* Background (planned) bar */}
                  <div
                    className={`absolute inset-y-2.5 rounded-md border ${style.bg} ${style.border}`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  >
                    {/* Completion fill */}
                    <div
                      className={`h-full rounded-md ${style.fill} opacity-80`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground px-1">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-6 rounded-sm bg-blue-500 opacity-80" />
          <span>{t("gantt.legendActual")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-6 rounded-sm bg-blue-100 border border-blue-300" />
          <span>{t("gantt.legendPlanned")}</span>
        </div>
      </div>
    </div>
  );
}
