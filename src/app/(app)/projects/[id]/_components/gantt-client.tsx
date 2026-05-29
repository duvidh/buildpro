"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  CalendarRange, CalendarClock, Factory, ArrowRight,
  GitCommitHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────────────

type PrefabRef = { id: string; name: string; status: string };

export type GanttTask = {
  id: string;
  name: string;
  status: string;
  priority: string;
  startDate: string | null;
  dueDate: string | null;
  dependsOnId: string | null;
  dependsOn: { id: string; name: string } | null;
  assignedTo: { id: string; name: string } | null;
  prefabElements: PrefabRef[];
};

// ─── Config ───────────────────────────────────────────────────────────────────

const ROW_H   = 48;  // total row height in px
const BAR_TOP = 10;  // px offset from row top → bar starts here
const BAR_H   = 28;  // px bar height (ROW_H - 2*BAR_TOP)
const SIDEBAR_W = 248;

const STATUS_BAR: Record<string, { bg: string; bar: string; text: string; border: string }> = {
  TODO:        { bg: "bg-slate-100",   bar: "bg-slate-400",   text: "text-slate-600",   border: "border-slate-300" },
  IN_PROGRESS: { bg: "bg-blue-100",    bar: "bg-blue-500",    text: "text-blue-700",    border: "border-blue-300" },
  BLOCKED:     { bg: "bg-red-100",     bar: "bg-red-400",     text: "text-red-700",     border: "border-red-300" },
  DONE:        { bg: "bg-emerald-100", bar: "bg-emerald-500", text: "text-emerald-700", border: "border-emerald-300" },
};

const PRIORITY_DOT: Record<string, string> = {
  LOW:    "bg-slate-300",
  MEDIUM: "bg-yellow-400",
  HIGH:   "bg-orange-500",
  URGENT: "bg-red-500",
};

// ─── Timeline (deterministic — no new Date() here) ───────────────────────────
//
// IMPORTANT: buildTimeline must never call new Date() without an argument.
// new Date() depends on wall-clock time and will produce different values
// on the SSR pass vs. client hydration, causing float percentage mismatches.
// The today line is handled separately via useEffect (client-only).

function buildTimeline(scheduled: GanttTask[]) {
  const allDates = scheduled.flatMap((t) => [
    t.startDate ? new Date(t.startDate) : null,
    t.dueDate   ? new Date(t.dueDate)   : null,
  ]).filter(Boolean) as Date[];

  const minMs = Math.min(...allDates.map((d) => d.getTime()));
  const maxMs = Math.max(...allDates.map((d) => d.getTime()));
  const spanMs = Math.max(maxMs - minMs, 86_400_000);          // at least 1 day
  const padMs  = Math.max(spanMs * 0.08, 14 * 86_400_000);    // at least 14-day padding
  const startMs = minMs - padMs;
  const endMs   = maxMs + padMs;
  const totalMs = endMs - startMs;

  /** Raw percentage (0–100+) — use pct() for style strings. */
  function toPct(date: string | Date): number {
    return ((new Date(date).getTime() - startMs) / totalMs) * 100;
  }

  /** Rounded to 4 dp with "%" unit — use directly in style={{ left/width }}. */
  function pct(date: string | Date): string {
    return `${toPct(date).toFixed(4)}%`;
  }

  // Month boundary dates — deterministic (constructed from task-derived startMs)
  const months: Date[] = [];
  const cur = new Date(new Date(startMs).getFullYear(), new Date(startMs).getMonth(), 1);
  while (cur.getTime() <= endMs) {
    months.push(new Date(cur));
    cur.setMonth(cur.getMonth() + 1);
  }

  return { toPct, pct, months, startMs, totalMs };
}

// ─── Dependency SVG ───────────────────────────────────────────────────────────
// Renders only when barWidth > 0 (i.e. never during SSR), so no hydration risk.

function DependencyArrows({
  scheduled,
  barWidth,
  toPct,
}: {
  scheduled: GanttTask[];
  barWidth: number;
  toPct: (d: string | Date) => number;
}) {
  if (barWidth === 0) return null;

  const indexMap = new Map(scheduled.map((t, i) => [t.id, i]));

  const arrows = scheduled.flatMap((task) => {
    if (!task.dependsOnId) return [];
    const fromIdx = indexMap.get(task.dependsOnId);
    if (fromIdx === undefined) return [];
    const toIdx = indexMap.get(task.id);
    if (toIdx === undefined) return [];

    const fromTask = scheduled[fromIdx];
    const fromDate = fromTask.dueDate || fromTask.startDate;
    const toDate   = task.startDate   || task.dueDate;
    if (!fromDate || !toDate) return [];

    // Pixel-space coordinates (client-only, no hydration risk)
    const fromX  = parseFloat((toPct(fromDate) * barWidth / 100).toFixed(2));
    const toX    = parseFloat((toPct(toDate)   * barWidth / 100).toFixed(2));
    const fromY  = fromIdx * ROW_H + ROW_H / 2;
    const toY    = toIdx   * ROW_H + ROW_H / 2;
    const elbowX = parseFloat(Math.max(fromX + 6, toX - 8).toFixed(2));

    const d = `M ${fromX} ${fromY} H ${elbowX} V ${toY} H ${toX}`;
    return [{ key: task.id, d }];
  });

  if (arrows.length === 0) return null;

  const totalH = scheduled.length * ROW_H;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-10 overflow-visible"
      style={{ width: `${barWidth}px`, height: `${totalH}px` }}
    >
      <defs>
        <marker id="gantt-arrow" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
          <path d="M 0 0 L 6 3 L 0 6 Z" fill="rgb(99 102 241 / 0.75)" />
        </marker>
      </defs>
      {arrows.map(({ key, d }) => (
        <path
          key={key}
          d={d}
          fill="none"
          stroke="rgb(99 102 241 / 0.55)"
          strokeWidth="1.5"
          strokeDasharray="5 3"
          markerEnd="url(#gantt-arrow)"
        />
      ))}
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function GanttClient({ tasks }: { tasks: GanttTask[] }) {
  const t = useTranslations("projects");
  const locale = useLocale();

  const barAreaRef = useRef<HTMLDivElement>(null);

  // barWidth starts at 0 — dependency SVG is suppressed until client measures it.
  const [barWidth, setBarWidth] = useState(0);

  // todayPct is null on SSR and during initial hydration to prevent mismatch.
  // It is set in useEffect (client-only, after timeline bounds are known).
  const [todayPct, setTodayPct] = useState<number | null>(null);

  function fmtMonth(d: Date) {
    const intlLocale = locale === "he" ? "he-IL" : "en-US";
    return new Intl.DateTimeFormat(intlLocale, { month: "short", year: "2-digit" }).format(d);
  }

  const statusLabel = (status: string): string => {
    const map: Record<string, string> = {
      TODO:        t("gantt.statusTodo"),
      IN_PROGRESS: t("gantt.statusInProgress"),
      BLOCKED:     t("gantt.statusBlocked"),
      DONE:        t("gantt.statusDone"),
    };
    return map[status] ?? status;
  };

  // ── Stable derived data ──────────────────────────────────────────────────────
  const { scheduled, unscheduled } = useMemo(() => {
    const sched = tasks
      .filter((t) => t.startDate || t.dueDate)
      .sort((a, b) =>
        new Date(a.startDate || a.dueDate!).getTime() -
        new Date(b.startDate || b.dueDate!).getTime()
      );
    const unsched = tasks.filter((t) => !t.startDate && !t.dueDate);
    return { scheduled: sched, unscheduled: unsched };
  }, [tasks]);

  const timeline = useMemo(
    () => (scheduled.length > 0 ? buildTimeline(scheduled) : null),
    [scheduled]
  );

  // ── Effects ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const el = barAreaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBarWidth(el.offsetWidth));
    ro.observe(el);
    setBarWidth(el.offsetWidth);
    return () => ro.disconnect();
  }, []);

  // Compute today's position AFTER mount to avoid SSR/client time-drift mismatch.
  useEffect(() => {
    if (!timeline) return;
    const nowMs = new Date().getTime();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTodayPct(((nowMs - timeline.startMs) / timeline.totalMs) * 100);
  }, [timeline]);

  // ── Counts ───────────────────────────────────────────────────────────────────
  const prefabLinked    = scheduled.filter((task) => task.prefabElements.length > 0).length;
  const dependencyCount = scheduled.filter((task) => task.dependsOnId).length;

  // ── Early empty states (after all hooks) ─────────────────────────────────────
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-2">
          <CalendarRange className="h-7 w-7 text-primary" />
        </div>
        <p className="text-base font-semibold text-foreground">{t("gantt.emptyNoTasks")}</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          {t("gantt.emptyNoTasksDesc")}
        </p>
      </div>
    );
  }

  if (scheduled.length === 0) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
          <CalendarClock className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">{t("gantt.emptyNoScheduled")}</p>
          <p className="text-xs text-muted-foreground/70">
            {t("gantt.emptyNoScheduledDesc")}
          </p>
        </div>
        <UnscheduledList tasks={unscheduled} />
      </div>
    );
  }

  // timeline is non-null when scheduled.length > 0
  const { toPct, pct, months } = timeline!;

  const totalRowsPx = `${scheduled.length * ROW_H}px`;

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-primary" />
            {t("gantt.taskGanttTitle")}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("gantt.scheduledCount", { n: scheduled.length })}
            {prefabLinked    > 0 && ` · ${t("gantt.prefabLinkedCount", { n: prefabLinked })}`}
            {dependencyCount > 0 && ` · ${t("gantt.dependencyCount", { n: dependencyCount })}`}
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 flex-wrap text-xs">
          {(["TODO","IN_PROGRESS","BLOCKED","DONE"] as const).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={`h-3 w-5 rounded-sm ${STATUS_BAR[s].bg} border ${STATUS_BAR[s].border}`} />
              <span className="text-muted-foreground">{statusLabel(s)}</span>
            </div>
          ))}
          {prefabLinked > 0 && (
            <div className="flex items-center gap-1.5">
              <Factory className="h-3.5 w-3.5 text-violet-500" />
              <span className="text-muted-foreground">{t("gantt.legendPrefab")}</span>
            </div>
          )}
          {dependencyCount > 0 && (
            <div className="flex items-center gap-1.5">
              <GitCommitHorizontal className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-muted-foreground">{t("gantt.legendDependency")}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-px bg-red-400" />
            <span className="text-muted-foreground">{t("gantt.legendToday")}</span>
          </div>
        </div>
      </div>

      {/* ── Gantt chart ── */}
      <div className="rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <div style={{ minWidth: "900px" }}>

            {/* Month header row */}
            <div className="flex border-b border-border bg-muted/40 sticky top-0 z-30">
              <div
                className="shrink-0 sticky left-0 z-40 bg-muted/40 border-e border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground"
                style={{ width: `${SIDEBAR_W}px` }}
              >
                {t("gantt.colTask")}
              </div>

              <div className="flex-1 relative h-9 overflow-hidden">
                {months.map((m, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 flex items-center"
                    style={{ left: pct(m) }}
                  >
                    <div className="h-full w-px bg-border/60" />
                    <span className="text-[10px] text-muted-foreground ps-1.5 whitespace-nowrap select-none">
                      {fmtMonth(m)}
                    </span>
                  </div>
                ))}
                {/* Today marker in header — only after mount */}
                {todayPct !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-400/70"
                    style={{ left: `${todayPct.toFixed(4)}%` }}
                  />
                )}
              </div>
            </div>

            {/* Rows */}
            <div className="flex">
              {/* Sidebar */}
              <div
                className="shrink-0 sticky left-0 z-20 bg-background border-e border-border"
                style={{ width: `${SIDEBAR_W}px` }}
              >
                {scheduled.map((task, i) => (
                  <div
                    key={task.id}
                    className={`flex items-center gap-2.5 px-3 border-b border-border last:border-0 ${
                      i % 2 === 0 ? "bg-background" : "bg-muted/20"
                    }`}
                    style={{ height: `${ROW_H}px` }}
                  >
                    <div className={`h-2 w-2 rounded-full shrink-0 ${PRIORITY_DOT[task.priority] ?? "bg-slate-300"}`} />
                    <span className="text-xs font-medium text-foreground truncate flex-1 leading-snug">
                      {task.name}
                    </span>
                    {task.prefabElements.length > 0 && (
                      <span title={t("gantt.prefabLinkedTooltip", { n: task.prefabElements.length })}>
                        <Factory className="h-3 w-3 text-violet-500 shrink-0" />
                      </span>
                    )}
                    {task.dependsOnId && (
                      <span title={t("gantt.dependsOnTooltip", { name: task.dependsOn?.name ?? "—" })}>
                        <ArrowRight className="h-3 w-3 text-indigo-400 shrink-0" />
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Bar area */}
              <div
                className="flex-1 relative overflow-hidden"
                ref={barAreaRef}
                style={{ height: totalRowsPx }}
              >
                {/* Row stripes + month grid lines */}
                {scheduled.map((_, i) => (
                  <div
                    key={i}
                    className={`absolute left-0 right-0 border-b border-border/40 ${
                      i % 2 === 0 ? "" : "bg-muted/10"
                    }`}
                    style={{ top: `${i * ROW_H}px`, height: `${ROW_H}px` }}
                  >
                    {months.map((m, mi) => (
                      <div
                        key={mi}
                        className="absolute top-0 bottom-0 w-px bg-border/25"
                        style={{ left: pct(m) }}
                      />
                    ))}
                  </div>
                ))}

                {/* Today line — client-only, null during SSR/hydration */}
                {todayPct !== null && (
                  <div
                    className="absolute top-0 w-0.5 bg-red-400/60 z-20"
                    style={{
                      left:   `${todayPct.toFixed(4)}%`,
                      height: totalRowsPx,
                    }}
                  >
                    <div className="absolute -top-0.5 -left-[3px] h-1.5 w-1.5 rounded-full bg-red-400" />
                  </div>
                )}

                {/* Dependency arrows (client-only: barWidth is 0 on SSR) */}
                <DependencyArrows
                  scheduled={scheduled}
                  barWidth={barWidth}
                  toPct={toPct}
                />

                {/* Task bars */}
                {scheduled.map((task, i) => {
                  const cfg = STATUS_BAR[task.status] ?? STATUS_BAR.TODO;

                  const start     = task.startDate ?? task.dueDate!;
                  const end       = task.dueDate   ?? task.startDate!;
                  const leftPct   = toPct(start);
                  const widthPct  = Math.max(0.4, toPct(end) - leftPct);
                  const narrow    = widthPct < 6;

                  return (
                    <div
                      key={task.id}
                      title={task.name}
                      className={`absolute flex items-center rounded-md border ${cfg.bg} ${cfg.border} overflow-hidden z-10`}
                      style={{
                        top:    `${i * ROW_H + BAR_TOP}px`,
                        height: `${BAR_H}px`,
                        left:   `${leftPct.toFixed(4)}%`,
                        width:  `${widthPct.toFixed(4)}%`,
                      }}
                    >
                      {task.status === "DONE" && (
                        <div className={`absolute inset-0 ${cfg.bar} opacity-30`} />
                      )}
                      {task.prefabElements.length > 0 && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500 opacity-70" />
                      )}
                      {!narrow && (
                        <span
                          className={`relative z-10 text-[10px] font-semibold ${cfg.text} truncate px-2 leading-none select-none`}
                          style={task.prefabElements.length > 0 ? { paddingInlineStart: "8px" } : undefined}
                        >
                          {task.name}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Unscheduled tasks */}
      <UnscheduledList tasks={unscheduled} />
    </div>
  );
}

// ─── Unscheduled section ──────────────────────────────────────────────────────

function UnscheduledList({ tasks }: { tasks: GanttTask[] }) {
  const t = useTranslations("projects");

  if (tasks.length === 0) return null;

  const statusLabel = (status: string): string => {
    const map: Record<string, string> = {
      TODO:        t("gantt.statusTodo"),
      IN_PROGRESS: t("gantt.statusInProgress"),
      BLOCKED:     t("gantt.statusBlocked"),
      DONE:        t("gantt.statusDone"),
    };
    return map[status] ?? status;
  };

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
        <CalendarClock className="h-3.5 w-3.5" />
        {t("gantt.unscheduledCount", { n: tasks.length })}
      </p>
      <div className="flex flex-wrap gap-2">
        {tasks.map((task) => {
          const cfg = STATUS_BAR[task.status] ?? STATUS_BAR.TODO;
          return (
            <div
              key={task.id}
              className={`flex items-center gap-2 rounded-lg border ${cfg.border} ${cfg.bg} px-3 py-1.5`}
            >
              <div className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[task.priority] ?? "bg-slate-300"}`} />
              <span className={`text-xs font-medium ${cfg.text} max-w-[180px] truncate`}>{task.name}</span>
              {task.prefabElements.length > 0 && <Factory className="h-3 w-3 text-violet-500 shrink-0" />}
              <Badge variant="outline" className={`text-[9px] h-4 px-1 ${cfg.text} border-current/30`}>
                {statusLabel(task.status)}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
