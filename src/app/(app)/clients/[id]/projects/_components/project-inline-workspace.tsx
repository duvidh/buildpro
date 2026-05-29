"use client";

import { useCurrency } from "@/lib/currency-context";
import { useState } from "react";
import Link from "next/link";
import {
  ExternalLink, CheckSquare, Flag, AlertCircle,
  CalendarDays, User, CheckCircle2, Circle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// ─── Types (dates are strings after JSON serialisation) ────────────────────

type ProjectSummary = {
  id: string;
  name: string;
  status: string;
  contractValue: number;
  progressPercent: number;
  address: string | null;
  startDate: string | null;
  endDate: string | null;
};

type Task = {
  id: string;
  name: string;
  priority: string;
  status: string;
  dueDate: string | null;
  assignedTo: { id: string; name: string } | null;
};

type Milestone = {
  id: string;
  name: string;
  date: string;
  completed: boolean;
  notes: string | null;
};

type Props = {
  project: ProjectSummary;
  tasks: Task[];
  milestones: Milestone[];
};

// ─── Constants ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  PLANNING:  { label: "תכנון",  cls: "bg-blue-100 text-blue-700 border-blue-200" },
  ACTIVE:    { label: "פעיל",   cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  ON_HOLD:   { label: "מושהה",  cls: "bg-orange-100 text-orange-700 border-orange-200" },
  COMPLETED: { label: "הושלם",  cls: "bg-slate-100 text-slate-600 border-slate-200" },
  CANCELLED: { label: "בוטל",   cls: "bg-red-100 text-red-700 border-red-200" },
};

const PRIORITY_CFG: Record<string, { label: string; cls: string }> = {
  URGENT: { label: "דחוף מאוד", cls: "text-red-600" },
  HIGH:   { label: "דחוף",      cls: "text-red-500" },
  MEDIUM: { label: "בינוני",    cls: "text-orange-500" },
  LOW:    { label: "נמוך",      cls: "text-slate-400" },
};

function progressColor(pct: number) {
  if (pct >= 90) return "[&>div]:bg-emerald-500";
  if (pct >= 30) return "[&>div]:bg-primary";
  return "[&>div]:bg-orange-400";
}

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(new Date(d));
}

function dueDays(dueDate: string | null): { label: string; overdue: boolean } | null {
  if (!dueDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due   = new Date(dueDate); due.setHours(0, 0, 0, 0);
  const diff  = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (diff < 0)  return { label: `${Math.abs(diff)}י׳ בפיגור`, overdue: true };
  if (diff === 0) return { label: "היום", overdue: false };
  if (diff === 1) return { label: "מחר", overdue: false };
  return { label: `${diff} ימים`, overdue: false };
}

// ─── Tab Button ─────────────────────────────────────────────────────────────

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 text-xs font-medium border-b-2 transition-colors",
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ProjectInlineWorkspace({ project, tasks, milestones }: Props) {
  const { fmtCompact } = useCurrency();
  const [tab, setTab] = useState<"tasks" | "milestones">("tasks");

  const statusCfg = STATUS_CFG[project.status] ?? STATUS_CFG.PLANNING;
  const pct       = project.progressPercent ?? 0;

  const openTasks     = tasks.filter((t) => t.status !== "DONE");
  const doneTasks     = tasks.filter((t) => t.status === "DONE");
  const pendingMiles  = milestones.filter((m) => !m.completed);
  const doneMiles     = milestones.filter((m) => m.completed);

  return (
    <div className="p-4 space-y-4" dir="rtl">

      {/* ── Project summary header ── */}
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-foreground">{project.name}</h3>
            <Badge variant="outline" className={`text-xs ${statusCfg.cls}`}>
              {statusCfg.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={pct} className={`h-1.5 w-32 ${progressColor(pct)}`} />
            <span className="text-xs text-muted-foreground">{pct}% הושלם</span>
            {project.contractValue > 0 && (
              <span className="text-xs text-muted-foreground">
                · {fmtCompact(project.contractValue)}
              </span>
            )}
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
        <Button asChild size="sm" variant="outline" className="h-7 gap-1 text-xs shrink-0">
          <Link href={`/projects/${project.id}`} target="_blank">
            <ExternalLink className="h-3 w-3" />
            פתח פרויקט
          </Link>
        </Button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-border/60 -mx-4 px-4">
        <TabBtn active={tab === "tasks"} onClick={() => setTab("tasks")}>
          <CheckSquare className="inline h-3 w-3 me-1 mb-0.5" />
          משימות {openTasks.length > 0 && `(${openTasks.length})`}
        </TabBtn>
        <TabBtn active={tab === "milestones"} onClick={() => setTab("milestones")}>
          <Flag className="inline h-3 w-3 me-1 mb-0.5" />
          אבני דרך {pendingMiles.length > 0 && `(${pendingMiles.length})`}
        </TabBtn>
      </div>

      {/* ── Tasks ── */}
      {tab === "tasks" && (
        <div className="space-y-1">
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">אין משימות לפרויקט זה</p>
          ) : (
            <>
              {openTasks.map((task) => {
                const prio = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.MEDIUM;
                const due  = dueDays(task.dueDate);
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/30 transition-colors"
                  >
                    <Circle className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{task.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className={prio.cls}>{prio.label}</span>
                        {task.assignedTo && (
                          <span className="flex items-center gap-0.5">
                            <User className="h-2.5 w-2.5" />
                            {task.assignedTo.name}
                          </span>
                        )}
                      </div>
                    </div>
                    {due && (
                      <span className={cn(
                        "text-xs shrink-0 flex items-center gap-0.5",
                        due.overdue ? "text-red-500 font-medium" : "text-muted-foreground",
                      )}>
                        {due.overdue && <AlertCircle className="h-3 w-3" />}
                        {due.label}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Done tasks (collapsed) */}
              {doneTasks.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-muted-foreground cursor-pointer px-3 py-1 hover:text-foreground">
                    {doneTasks.length} משימות שהושלמו ▸
                  </summary>
                  {doneTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 rounded-lg px-3 py-1.5 opacity-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <p className="text-sm text-muted-foreground line-through truncate">{task.name}</p>
                    </div>
                  ))}
                </details>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Milestones ── */}
      {tab === "milestones" && (
        <div className="space-y-1">
          {milestones.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">אין אבני דרך לפרויקט זה</p>
          ) : (
            <>
              {pendingMiles.map((m) => {
                const today = new Date(); today.setHours(0,0,0,0);
                const mDate = new Date(m.date); mDate.setHours(0,0,0,0);
                const diff = Math.round((mDate.getTime() - today.getTime()) / 86_400_000);
                const past = diff < 0;
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/30 transition-colors"
                  >
                    <Flag className={cn("h-3.5 w-3.5 shrink-0", past ? "text-red-400" : "text-amber-400")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(m.date)}</p>
                    </div>
                    <span className={cn(
                      "text-xs shrink-0 px-2 py-0.5 rounded-full",
                      past
                        ? "bg-red-100 text-red-600"
                        : diff <= 7
                          ? "bg-amber-100 text-amber-700"
                          : "bg-muted text-muted-foreground",
                    )}>
                      {past ? `${Math.abs(diff)}י׳ בפיגור` : diff === 0 ? "היום" : `${diff}י׳`}
                    </span>
                  </div>
                );
              })}
              {doneMiles.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-muted-foreground cursor-pointer px-3 py-1 hover:text-foreground">
                    {doneMiles.length} אבני דרך שהושלמו ▸
                  </summary>
                  {doneMiles.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-lg px-3 py-1.5 opacity-50">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <p className="text-sm text-muted-foreground line-through truncate">{m.name}</p>
                    </div>
                  ))}
                </details>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
