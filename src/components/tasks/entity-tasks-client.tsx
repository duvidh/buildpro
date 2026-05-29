"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  Phone, Users, Mail, CheckSquare2, Plus, ChevronDown,
  CalendarDays, AlertCircle, User as UserIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { updateTaskStatus } from "@/actions/tasks";
import type { TaskStatusValue } from "@/lib/constants/task-enums";
import { NewGlobalTaskForm, type SelectData } from "./new-global-task-form";
import type { GlobalTask } from "./tasks-page-client";

// ─── Config (className only — labels from translations) ───────────────────────

const STATUS_CLASS: Record<string, string> = {
  TODO:        "bg-slate-100 text-slate-600 border-slate-200",
  IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-200",
  BLOCKED:     "bg-red-100 text-red-700 border-red-200",
  DONE:        "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const PRIORITY_CLASS: Record<string, string> = {
  LOW:    "bg-slate-100 text-slate-500 border-slate-200",
  MEDIUM: "bg-blue-100 text-blue-600 border-blue-200",
  HIGH:   "bg-orange-100 text-orange-700 border-orange-200",
  URGENT: "bg-red-100 text-red-700 border-red-200",
};

const TYPE_ICON: Record<string, React.ElementType> = {
  GENERAL: CheckSquare2,
  CALL:    Phone,
  MEETING: Users,
  EMAIL:   Mail,
};

const TYPE_COLOR: Record<string, string> = {
  GENERAL: "text-slate-500",
  CALL:    "text-emerald-600",
  MEETING: "text-blue-600",
  EMAIL:   "text-violet-600",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string | null, locale: string): string | null {
  if (!iso) return null;
  const d          = new Date(iso);
  const dateLocale = locale === "he" ? "he-IL" : "en-US";
  const time       = d.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });
  const date       = d.toLocaleDateString(dateLocale, { day: "2-digit", month: "2-digit", year: "numeric" });
  const hasTime    = d.getHours() !== 0 || d.getMinutes() !== 0;
  return hasTime ? `${time} | ${date}` : date;
}

function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === "DONE") return false;
  return new Date(dueDate) < new Date();
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  onStatusChange,
}: {
  task:           GlobalTask;
  onStatusChange: (id: string, status: string) => void;
}) {
  const t            = useTranslations("globalTasks");
  const locale       = useLocale();
  const TypeIcon     = TYPE_ICON[task.taskType]  ?? CheckSquare2;
  const typeColor    = TYPE_COLOR[task.taskType] ?? "text-slate-500";
  const isDone       = task.status === "DONE";
  const overdue      = isOverdue(task.dueDate, task.status);
  const priorityCls  = PRIORITY_CLASS[task.priority] ?? "";
  const statusCls    = STATUS_CLASS[task.status]     ?? "";
  const formattedDue = fmtDateTime(task.dueDate, locale);

  const tStatus   = (s: string) => { try { return t(`status.${s}` as Parameters<typeof t>[0]); } catch { return s; } };
  const tPriority = (p: string) => { try { return t(`priority.${p}` as Parameters<typeof t>[0]); } catch { return p; } };

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 transition-colors",
        "hover:bg-muted/20",
        isDone && "opacity-60",
      )}
    >
      {/* Type icon */}
      <div className="mt-0.5 shrink-0">
        <TypeIcon className={cn("h-4 w-4", typeColor)} />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium leading-snug", isDone && "line-through text-muted-foreground")}>
          {task.name}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
          {task.assignedTo && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <UserIcon className="h-3 w-3" />
              {task.assignedTo.name}
            </span>
          )}
          {formattedDue && (
            <span
              className={cn(
                "flex items-center gap-1 text-xs",
                overdue ? "text-red-600 font-medium" : "text-muted-foreground",
              )}
            >
              {overdue ? <AlertCircle className="h-3 w-3" /> : <CalendarDays className="h-3 w-3" />}
              {formattedDue}
            </span>
          )}
        </div>
      </div>

      {/* Right side: priority + status */}
      <div className="shrink-0 flex items-center gap-2">
        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0.5 hidden sm:inline-flex", priorityCls)}>
          {tPriority(task.priority)}
        </Badge>
        <Select value={task.status} onValueChange={(v) => onStatusChange(task.id, v)}>
          <SelectTrigger className="h-7 w-auto min-w-[110px] text-xs border-0 shadow-none focus:ring-0 p-0">
            <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 cursor-pointer w-full justify-center", statusCls)}>
              {tStatus(task.status)}
            </Badge>
          </SelectTrigger>
          <SelectContent>
            {Object.keys(STATUS_CLASS).map((val) => (
              <SelectItem key={val} value={val} className="text-xs">{tStatus(val)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EntityTasksClient({
  initial,
  selectData,
  entityType,
  entityId,
  entityName: _entityName,
}: {
  initial:    GlobalTask[];
  selectData: SelectData;
  entityType: "lead" | "client";
  entityId:   string;
  entityName: string;
}) {
  const t               = useTranslations("globalTasks");
  const router          = useRouter();
  const [tasks, setTasks]     = useState<GlobalTask[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [, startTransition]   = useTransition();

  // Sync when server re-fetches after router.refresh()
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTasks(initial);
  }, [initial]);

  const activeTasks = tasks.filter((t) => t.status !== "DONE");
  const doneTasks   = tasks.filter((t) => t.status === "DONE");

  const counts = {
    todo:        tasks.filter((t) => t.status === "TODO").length,
    in_progress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    blocked:     tasks.filter((t) => t.status === "BLOCKED").length,
    done:        tasks.filter((t) => t.status === "DONE").length,
  };

  function handleStatusChange(taskId: string, status: string) {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? { ...task, status, completedAt: status === "DONE" ? new Date().toISOString() : null }
          : task,
      ),
    );
    startTransition(async () => {
      await updateTaskStatus(taskId, status as TaskStatusValue);
    });
  }

  function handleCreated() {
    setShowForm(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { labelKey: "stats.todo",       value: counts.todo,        color: "text-slate-600"   },
          { labelKey: "stats.inProgress", value: counts.in_progress, color: "text-blue-600"    },
          { labelKey: "stats.blocked",    value: counts.blocked,     color: "text-red-600"     },
          { labelKey: "stats.done",       value: counts.done,        color: "text-emerald-600" },
        ].map((s) => (
          <div key={s.labelKey} className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">{t(s.labelKey as Parameters<typeof t>[0])}</p>
            <p className={cn("text-xl font-bold mt-0.5", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── New Task Button / Form ── */}
      {!showForm ? (
        <Button size="sm" className="gap-2 w-full sm:w-auto" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          {t("newTask")}
        </Button>
      ) : (
        <NewGlobalTaskForm
          selectData={selectData}
          defaultContext={entityType}
          defaultContextId={entityId}
          onCreated={handleCreated}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* ── Task list ── */}
      {tasks.length === 0 ? (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckSquare2 className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
          {/* Active tasks */}
          {activeTasks.map((task) => (
            <TaskRow key={task.id} task={task} onStatusChange={handleStatusChange} />
          ))}

          {/* Completed tasks — collapsed by default */}
          {doneTasks.length > 0 && (
            <details className="group/done">
              <summary className="px-4 py-2.5 text-xs text-muted-foreground cursor-pointer select-none hover:text-foreground list-none flex items-center gap-1.5 border-t border-border/50">
                <ChevronDown className="h-3 w-3 transition-transform group-open/done:rotate-0 -rotate-90" />
                {t("doneTasksCount", { count: doneTasks.length })}
              </summary>
              {doneTasks.map((task) => (
                <TaskRow key={task.id} task={task} onStatusChange={handleStatusChange} />
              ))}
            </details>
          )}
        </div>
      )}
    </div>
  );
}
