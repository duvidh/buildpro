"use client";

import Link from "next/link";
import { HardHat, Users, ChevronLeft } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import type { DashboardData } from "./types";

function dateLabel(iso: string, locale: string, t: (k: "today" | "yesterday") => string) {
  const d = new Date(iso);
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000);
  if (diffDays === 0) return t("today");
  if (diffDays === 1) return t("yesterday");
  return new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-US", {
    day: "numeric", month: "short",
  }).format(d);
}

/** Recent daily logs from the field, across all company projects. */
export function FieldActivityWidget({ data }: { data: DashboardData }) {
  const t = useTranslations("dashboard.fieldActivity");
  const locale = useLocale();
  const logs = data.execStats.recentLogs;

  if (logs.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
        <HardHat className="h-7 w-7 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-3 pt-2">
        <div className="relative space-y-1">
          {/* Timeline line */}
          <div className="absolute start-[7px] top-3 bottom-3 w-px bg-border/60" />
          {logs.map((log) => (
            <Link
              key={log.id}
              href={`/projects/${log.projectId}/logs`}
              className="relative flex items-start gap-2.5 rounded-lg py-2 ps-5 pe-2
                transition-colors hover:bg-muted/40"
            >
              {/* Timeline dot */}
              <span className="absolute start-1 top-3.5 h-2 w-2 rounded-full border-2 border-amber-500 bg-background" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {log.projectName}
                  </p>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {dateLabel(log.date, locale, t)}
                  </span>
                </div>
                {log.notes && (
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                    {log.notes}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground/80">
                  {log.supervisorName && <span>{t("by", { name: log.supervisorName })}</span>}
                  {log.workforceCount != null && (
                    <span className="flex items-center gap-0.5">
                      <Users className="h-2.5 w-2.5" />
                      {log.workforceCount}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <Link
        href="/daily-logs"
        className="flex items-center justify-center gap-1 border-t border-border/30 py-2
          text-xs font-medium text-primary transition-colors hover:bg-muted/30"
      >
        {t("viewAll")}
        <ChevronLeft className="h-3 w-3 ltr:rotate-180" />
      </Link>
    </div>
  );
}
