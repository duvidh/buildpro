"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import {
  Phone, Users, Mail, CheckSquare2, Plus, ChevronDown,
  FolderKanban, TrendingUp, Building2, User as UserIcon,
  CalendarDays, AlertCircle, MoreVertical, Pencil, Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { updateTaskStatus, updateTask, deleteTask } from "@/actions/tasks";
import { toast } from "sonner";
import type { TaskStatusValue } from "@/lib/constants/task-enums";
import { NewGlobalTaskForm, type SelectData } from "./new-global-task-form";

// ─── Types ────────────────────────────────────────────────────────────────────

export type GlobalTask = {
  id:           string;
  name:         string;
  description:  string | null;
  taskType:     string;
  status:       string;
  priority:     string;
  dueDate:      string | null;
  completedAt:  string | null;
  project:      { id: string; name: string; managerId: string | null } | null;
  lead:         { id: string; name: string } | null;
  client:       { id: string; name: string } | null;
  assignedTo:   { id: string; name: string } | null;
};

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

/** Convert an ISO string to datetime-local input value (YYYY-MM-DDTHH:mm). */
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d   = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Edit Task Dialog ─────────────────────────────────────────────────────────

function EditTaskDialog({
  task,
  open,
  onClose,
  onSaved,
}: {
  task:    GlobalTask | null;
  open:    boolean;
  onClose: () => void;
  onSaved: (id: string, updates: Partial<GlobalTask>) => void;
}) {
  const t       = useTranslations("globalTasks");
  const tCommon = useTranslations("common");
  const locale  = useLocale();

  const [name,        setName]        = useState("");
  const [description, setDescription] = useState("");
  const [status,      setStatus]      = useState("TODO");
  const [priority,    setPriority]    = useState("MEDIUM");
  const [dueDate,     setDueDate]     = useState("");
  const [isPending,   start]          = useTransition();

  const tStatus   = (s: string) => { try { return t(`status.${s}`   as Parameters<typeof t>[0]); } catch { return s; } };
  const tPriority = (p: string) => { try { return t(`priority.${p}` as Parameters<typeof t>[0]); } catch { return p; } };

  // Populate form whenever the task changes
  useEffect(() => {
    if (task) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setName(task.name);
      setDescription(task.description ?? "");
      setStatus(task.status);
      setPriority(task.priority);
      setDueDate(toDatetimeLocal(task.dueDate));
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [task]);

  function handleSave() {
    if (!name.trim()) { toast.error(t("edit.nameRequired")); return; }
    if (!task) return;
    start(async () => {
      const res = await updateTask(task.id, {
        name:        name.trim(),
        description: description || undefined,
        status,
        priority,
        dueDate:     dueDate || undefined,
      });
      if (!res.success) { toast.error(t("edit.toastError")); return; }
      toast.success(t("edit.toastSuccess"));
      onSaved(task.id, {
        name:        name.trim(),
        description: description || null,
        status,
        priority,
        dueDate:     dueDate ? new Date(dueDate).toISOString() : null,
        completedAt: status === "DONE" ? new Date().toISOString() : null,
      });
      onClose();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md" dir={locale === "he" ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>{t("edit.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-sm">{t("edit.name")} *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("edit.namePlaceholder")}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleSave(); }}
            />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">{t("edit.status")}</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(STATUS_CLASS).map((val) => (
                    <SelectItem key={val} value={val} className="text-sm">{tStatus(val)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{t("edit.priority")}</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(PRIORITY_CLASS).map((val) => (
                    <SelectItem key={val} value={val} className="text-sm">{tPriority(val)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due date */}
          <div className="space-y-1.5">
            <Label className="text-sm">{t("edit.dueDate")}</Label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              dir="ltr"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-sm">{t("edit.description")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("edit.descPlaceholder")}
              rows={3}
              className="text-sm resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
            {tCommon("cancel")}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isPending || !name.trim()}>
            {isPending ? t("edit.saving") : t("edit.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  task:           GlobalTask;
  onStatusChange: (id: string, status: string) => void;
  onEdit:         (task: GlobalTask) => void;
  onDelete:       (id: string) => void;
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

  const tStatus   = (s: string) => { try { return t(`status.${s}`   as Parameters<typeof t>[0]); } catch { return s; } };
  const tPriority = (p: string) => { try { return t(`priority.${p}` as Parameters<typeof t>[0]); } catch { return p; } };

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 transition-colors",
        "hover:bg-muted/20 group",
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
          {task.project && (
            <Link
              href={`/projects/${task.project.id}`}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <FolderKanban className="h-3 w-3" />
              {task.project.name}
            </Link>
          )}
          {task.lead && (
            <Link
              href={`/leads/${task.lead.id}`}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <TrendingUp className="h-3 w-3" />
              {task.lead.name}
            </Link>
          )}
          {task.client && (
            <Link
              href={`/clients/${task.client.id}`}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Building2 className="h-3 w-3" />
              {task.client.name}
            </Link>
          )}
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
              {overdue  && <AlertCircle  className="h-3 w-3" />}
              {!overdue && <CalendarDays className="h-3 w-3" />}
              {formattedDue}
            </span>
          )}
        </div>
      </div>

      {/* Right side: priority badge + status select + actions */}
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

        {/* 3-dots actions menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3.5 w-3.5" />
              <span className="sr-only">{t("actions.actions")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              className="gap-2 text-sm cursor-pointer"
              onClick={() => onEdit(task)}
            >
              <Pencil className="h-3.5 w-3.5" />
              {t("actions.edit")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 text-sm cursor-pointer text-destructive focus:text-destructive"
              onClick={() => onDelete(task.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("actions.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ─── Task Group ───────────────────────────────────────────────────────────────

function TaskGroup({
  title, icon: Icon, tasks, onStatusChange, onEdit, onDelete, emptyLabel, accent,
}: {
  title:          string;
  icon:           React.ElementType;
  tasks:          GlobalTask[];
  onStatusChange: (id: string, status: string) => void;
  onEdit:         (task: GlobalTask) => void;
  onDelete:       (id: string) => void;
  emptyLabel:     string;
  accent:         string;
}) {
  const t = useTranslations("globalTasks");
  const [open, setOpen] = useState(true);
  const activeTasks = tasks.filter((task) => task.status !== "DONE");
  const doneTasks   = tasks.filter((task) => task.status === "DONE");

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-start"
      >
        <Icon className={cn("h-4 w-4", accent)} />
        <span className="text-sm font-semibold flex-1">{title}</span>
        <Badge variant="secondary" className="h-5 min-w-5 text-[10px]">
          {activeTasks.length}
        </Badge>
        {doneTasks.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {t("doneCount", { count: doneTasks.length })}
          </span>
        )}
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", !open && "-rotate-90")} />
      </button>

      {open && (
        <div>
          {tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground px-4 py-4">{emptyLabel}</p>
          ) : (
            <div>
              {activeTasks.map((task) => (
                <TaskRow key={task.id} task={task} onStatusChange={onStatusChange} onEdit={onEdit} onDelete={onDelete} />
              ))}
              {doneTasks.length > 0 && (
                <details className="group/done">
                  <summary className="px-4 py-2 text-xs text-muted-foreground cursor-pointer select-none hover:text-foreground list-none flex items-center gap-1.5 border-t border-border/50">
                    <ChevronDown className="h-3 w-3 transition-transform group-open/done:rotate-0 -rotate-90" />
                    {t("doneTasksCount", { count: doneTasks.length })}
                  </summary>
                  {doneTasks.map((task) => (
                    <TaskRow key={task.id} task={task} onStatusChange={onStatusChange} onEdit={onEdit} onDelete={onDelete} />
                  ))}
                </details>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Client ──────────────────────────────────────────────────────────────

export function TasksPageClient({
  initial,
  selectData,
}: {
  initial:    GlobalTask[];
  selectData: SelectData;
}) {
  const t       = useTranslations("globalTasks");
  const tCommon = useTranslations("common");
  const locale  = useLocale();
  const router  = useRouter();

  const [tasks,          setTasks]          = useState<GlobalTask[]>(initial);
  const [showForm,       setShowForm]       = useState(false);
  const [editingTask,    setEditingTask]    = useState<GlobalTask | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [, startTransition]  = useTransition();
  const [, startDelete]      = useTransition();

  // Sync when server re-fetches after router.refresh()
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTasks(initial);
  }, [initial]);

  // Group tasks by context
  const projectTasks  = tasks.filter((task) => task.project  && !task.lead && !task.client);
  const leadTasks     = tasks.filter((task) => task.lead);
  const clientTasks   = tasks.filter((task) => task.client   && !task.lead);
  const personalTasks = tasks.filter((task) => !task.project && !task.lead && !task.client);

  // Stats
  const counts = {
    todo:        tasks.filter((task) => task.status === "TODO").length,
    in_progress: tasks.filter((task) => task.status === "IN_PROGRESS").length,
    blocked:     tasks.filter((task) => task.status === "BLOCKED").length,
    done:        tasks.filter((task) => task.status === "DONE").length,
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

  function handleTaskUpdated(id: string, updates: Partial<GlobalTask>) {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, ...updates } : task)));
  }

  function handleDeleteConfirm() {
    const id = deletingTaskId;
    if (!id) return;
    setDeletingTaskId(null);
    // Optimistic remove
    setTasks((prev) => prev.filter((task) => task.id !== id));
    startDelete(async () => {
      const res = await deleteTask(id);
      if (!res.success) {
        toast.error(t("deleteConfirm.toastError"));
        router.refresh(); // re-sync on failure
      } else {
        toast.success(t("deleteConfirm.toastSuccess"));
      }
    });
  }

  function handleCreated() {
    setShowForm(false);
    router.refresh();
  }

  const sharedGroupProps = {
    onStatusChange: handleStatusChange,
    onEdit:         setEditingTask,
    onDelete:       setDeletingTaskId,
  };

  return (
    <div className="space-y-5" dir={locale === "he" ? "rtl" : "ltr"}>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
        <Button className="gap-2 w-full sm:w-auto" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          {t("newTask")}
        </Button>
      ) : (
        <NewGlobalTaskForm
          selectData={selectData}
          onCreated={handleCreated}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* ── Groups ── */}
      <div className="space-y-4">
        <TaskGroup
          title={t("groups.projects")}
          icon={FolderKanban}
          tasks={projectTasks}
          emptyLabel={t("groupEmpty.projects")}
          accent="text-blue-600"
          {...sharedGroupProps}
        />
        <TaskGroup
          title={t("groups.leads")}
          icon={TrendingUp}
          tasks={leadTasks}
          emptyLabel={t("groupEmpty.leads")}
          accent="text-emerald-600"
          {...sharedGroupProps}
        />
        <TaskGroup
          title={t("groups.clients")}
          icon={Building2}
          tasks={clientTasks}
          emptyLabel={t("groupEmpty.clients")}
          accent="text-violet-600"
          {...sharedGroupProps}
        />
        <TaskGroup
          title={t("groups.personal")}
          icon={UserIcon}
          tasks={personalTasks}
          emptyLabel={t("groupEmpty.personal")}
          accent="text-slate-600"
          {...sharedGroupProps}
        />
      </div>

      {/* ── Edit Dialog ── */}
      <EditTaskDialog
        task={editingTask}
        open={editingTask !== null}
        onClose={() => setEditingTask(null)}
        onSaved={handleTaskUpdated}
      />

      {/* ── Delete Confirmation ── */}
      <AlertDialog
        open={deletingTaskId !== null}
        onOpenChange={(v) => { if (!v) setDeletingTaskId(null); }}
      >
        <AlertDialogContent dir={locale === "he" ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirm.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("deleteConfirm.action")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
