"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations, useLocale } from "next-intl";
import { z } from "zod";
import { toast } from "sonner";
import {
  MoreHorizontal,
  Plus,
  Loader2,
  Sparkles,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createTask, updateTask, updateTaskStatus, deleteTask, seedProjectTasks } from "@/actions/tasks";
import { seedProjectMilestones } from "@/actions/milestones";
import { createTaskSchema, type CreateTaskInput } from "@/lib/schemas/task-schema";
import { TASK_PRIORITY_VALUES, TASK_STATUS_VALUES } from "@/lib/constants/task-enums";

// ─── Types ────────────────────────────────────────────────────────────────────

type Task = {
  id:          string;
  name:        string;
  description?: string | null;
  status:      string;
  priority:    string;
  startDate:   Date | null;
  dueDate:     Date | null;
  dependsOnId: string | null;
  assignedTo:  { id: string; name: string } | null;
};

type TasksKanbanProps = {
  projectId: string;
  tasks:     Task[];
};

// Type for update form — inferred shape only (no Hebrew messages)
const _updateTaskSchema = z.object({
  name:        z.string().min(2),
  description: z.string().optional(),
  status:      z.enum(TASK_STATUS_VALUES),
  priority:    z.enum(TASK_PRIORITY_VALUES),
  startDate:   z.string().optional(),
  dueDate:     z.string().optional(),
  dependsOnId: z.string().optional(),
});
type UpdateTaskInput = z.infer<typeof _updateTaskSchema>;

// ─── Static config (className only — labels come from translations) ───────────

const PRIORITY_CLASS: Record<string, string> = {
  LOW:    "bg-slate-100 text-slate-500 border-slate-200",
  MEDIUM: "bg-yellow-100 text-yellow-700 border-yellow-200",
  HIGH:   "bg-orange-100 text-orange-700 border-orange-200",
  URGENT: "bg-red-100 text-red-700 border-red-200",
};

const TASK_STATUS_CLASS: Record<string, string> = {
  TODO:        "bg-slate-100 text-slate-600 border-slate-200",
  IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-200",
  BLOCKED:     "bg-red-100 text-red-700 border-red-200",
  DONE:        "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const COLUMNS = [
  { id: "todo",       labelKey: "tasks.columns.todo",       statuses: ["TODO"],                        headerClass: "bg-slate-50",   accentClass: "border-slate-300",  dotClass: "bg-slate-400"   },
  { id: "inprogress", labelKey: "tasks.columns.inprogress", statuses: ["IN_PROGRESS", "BLOCKED"],      headerClass: "bg-blue-50",    accentClass: "border-blue-300",   dotClass: "bg-blue-500"    },
  { id: "done",       labelKey: "tasks.columns.done",       statuses: ["DONE"],                        headerClass: "bg-emerald-50", accentClass: "border-emerald-300",dotClass: "bg-emerald-500" },
] as const;

const NEXT_STATUS: Record<string, string> = {
  TODO:        "IN_PROGRESS",
  BLOCKED:     "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  DONE:        "TODO",
};

// Maps current status → translation key for the action label
const NEXT_STATUS_KEY: Record<string, string> = {
  TODO:        "tasks.nextStatus.TODO",
  BLOCKED:     "tasks.nextStatus.BLOCKED",
  IN_PROGRESS: "tasks.nextStatus.IN_PROGRESS",
  DONE:        "tasks.nextStatus.DONE",
};

function isoToDateInput(d: Date | null): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

function isOverdue(date: Date | null) {
  if (!date) return false;
  return new Date(date) < new Date();
}

// ─── Edit Dialog ──────────────────────────────────────────────────────────────

function EditTaskDialog({
  task,
  allTasks,
  open,
  onOpenChange,
  onEdited,
}: {
  task:         Task;
  allTasks:     Task[];
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  onEdited:     () => void;
}) {
  const t       = useTranslations("projects");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();

  const schema = useMemo(
    () => z.object({
      name:        z.string().min(2, t("validation.nameTooShort")),
      description: z.string().optional(),
      status:      z.enum(TASK_STATUS_VALUES),
      priority:    z.enum(TASK_PRIORITY_VALUES),
      startDate:   z.string().optional(),
      dueDate:     z.string().optional(),
      dependsOnId: z.string().optional(),
    }),
    [t]
  );

  const { register, handleSubmit, setValue, formState: { errors } } =
    useForm<UpdateTaskInput>({
      resolver: zodResolver(schema),
      defaultValues: {
        name:        task.name,
        description: task.description ?? "",
        status:      task.status    as UpdateTaskInput["status"],
        priority:    task.priority  as UpdateTaskInput["priority"],
        startDate:   isoToDateInput(task.startDate),
        dueDate:     isoToDateInput(task.dueDate),
        dependsOnId: task.dependsOnId ?? "",
      },
    });

  function onSubmit(data: UpdateTaskInput) {
    startTransition(async () => {
      const res = await updateTask(task.id, {
        ...data,
        dependsOnId: data.dependsOnId === "__none__" || !data.dependsOnId ? null : data.dependsOnId,
      });
      if (res.success) {
        toast.success(t("tasks.toastUpdated"));
        onOpenChange(false);
        onEdited();
      } else {
        toast.error(t("tasks.toastUpdateError"));
      }
    });
  }

  const tf  = (k: string) => t(k as Parameters<typeof t>[0]);
  const otherTasks = allTasks.filter((tk) => tk.id !== task.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("tasks.form.editTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label>{t("tasks.form.name")} *</Label>
            <Input {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{tf("form.fields.status")}</Label>
              <Select
                defaultValue={task.status}
                onValueChange={(v) => setValue("status", v as UpdateTaskInput["status"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_STATUS_VALUES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {tf(`taskStatus.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("tasks.form.priority")}</Label>
              <Select
                defaultValue={task.priority}
                onValueChange={(v) => setValue("priority", v as UpdateTaskInput["priority"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITY_VALUES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {tf(`tasks.priority.${p}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{tf("form.fields.startDate")}</Label>
              <Input type="date" {...register("startDate")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("tasks.form.dueDate")}</Label>
              <Input type="date" {...register("dueDate")} />
            </div>
          </div>

          {otherTasks.length > 0 && (
            <div className="space-y-1.5">
              <Label>{t("tasks.form.dependency")}</Label>
              <Select
                defaultValue={task.dependsOnId ?? "__none__"}
                onValueChange={(v) => setValue("dependsOnId", v)}
              >
                <SelectTrigger><SelectValue placeholder={t("tasks.form.noDependency")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("tasks.form.noDependency")}</SelectItem>
                  {otherTasks.map((tk) => (
                    <SelectItem key={tk.id} value={tk.id}>{tk.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>{tf("form.fields.description")}</Label>
            <Textarea
              {...register("description")}
              rows={2}
              placeholder={t("tasks.form.descPlaceholder")}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
              {t("tasks.form.saveChanges")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  onStatusChange,
  onDelete,
  onEdit,
}: {
  task:           Task;
  onStatusChange: (id: string, status: string) => void;
  onDelete:       (id: string) => void;
  onEdit:         (task: Task) => void;
}) {
  const t      = useTranslations("projects");
  const locale = useLocale();
  const dateLocale = locale === "he" ? "he-IL" : "en-US";

  const priorityCls  = PRIORITY_CLASS[task.priority];
  const due          = task.dueDate ? new Date(task.dueDate) : null;
  const overdue      = task.status !== "DONE" && isOverdue(task.dueDate);
  const isBlocked    = task.status === "BLOCKED";
  const otherStatuses = Object.keys(TASK_STATUS_CLASS).filter((s) => s !== task.status);

  function fmt(date: Date | null) {
    if (!date) return null;
    return new Intl.DateTimeFormat(dateLocale).format(new Date(date));
  }

  const tStatus = (s: string) => {
    try { return t(`taskStatus.${s}` as Parameters<typeof t>[0]); }
    catch { return s; }
  };

  return (
    <div
      className={`group rounded-lg border bg-card p-3 space-y-2 shadow-sm transition-shadow hover:shadow-md ${
        isBlocked ? "border-red-200 bg-red-50/30" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug flex-1 min-w-0">{task.name}</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onEdit(task)}>
              <Pencil className="h-3.5 w-3.5 me-2" />
              {t("tasks.card.edit")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {t("tasks.card.changeStatus")}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {otherStatuses.map((s) => (
              <DropdownMenuItem key={s} onClick={() => onStatusChange(task.id, s)}>
                {tStatus(s)}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(task.id)}
            >
              {t("tasks.card.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {priorityCls && (
            <Badge variant="outline" className={`text-[10px] h-4 px-1.5 py-0 ${priorityCls}`}>
              {t(`tasks.priority.${task.priority}` as Parameters<typeof t>[0])}
            </Badge>
          )}
          {isBlocked && (
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0 bg-red-100 text-red-700 border-red-200">
              {t("taskStatus.BLOCKED")}
            </Badge>
          )}
        </div>
        {due && (
          <span className={`text-[11px] ${overdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
            {fmt(task.dueDate)}
          </span>
        )}
      </div>

      {task.assignedTo && (
        <div className="flex items-center gap-1.5">
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
            {task.assignedTo.name[0]}
          </div>
          <span className="text-[11px] text-muted-foreground">{task.assignedTo.name}</span>
        </div>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="w-full h-6 text-xs text-muted-foreground hover:text-foreground justify-start px-0 mt-1"
        onClick={() => onStatusChange(task.id, NEXT_STATUS[task.status])}
      >
        → {t(NEXT_STATUS_KEY[task.status] as Parameters<typeof t>[0])}
      </Button>
    </div>
  );
}

// ─── New Task Dialog ──────────────────────────────────────────────────────────

function NewTaskDialog({
  projectId,
  allTasks,
  onCreated,
}: {
  projectId: string;
  allTasks:  Task[];
  onCreated: () => void;
}) {
  const t = useTranslations("projects");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, setValue, reset, formState: { errors } } =
    useForm<CreateTaskInput>({
      resolver: zodResolver(createTaskSchema),
      defaultValues: { projectId, status: "TODO", priority: "MEDIUM" },
    });

  function onSubmit(data: CreateTaskInput) {
    startTransition(async () => {
      const payload = {
        ...data,
        dependsOnId: data.dependsOnId === "__none__" ? undefined : data.dependsOnId,
      };
      const res = await createTask(payload);
      if (res.success) {
        reset({ projectId, status: "TODO", priority: "MEDIUM" });
        setOpen(false);
        onCreated();
      }
    });
  }

  const tf = (k: string) => t(k as Parameters<typeof t>[0]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 h-8">
          <Plus className="h-3.5 w-3.5" />
          {t("tasks.newTask")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("tasks.form.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          <input type="hidden" {...register("projectId")} />

          <div className="space-y-1.5">
            <Label htmlFor="task-name">{t("tasks.form.name")} *</Label>
            <Input
              id="task-name"
              {...register("name")}
              placeholder={t("tasks.form.namePlaceholder")}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("tasks.form.priority")}</Label>
              <Select
                defaultValue="MEDIUM"
                onValueChange={(v) => setValue("priority", v as (typeof TASK_PRIORITY_VALUES)[number])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITY_VALUES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {tf(`tasks.priority.${p}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-start">{tf("form.fields.startDate")}</Label>
              <Input id="task-start" type="date" {...register("startDate")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-due">{t("tasks.form.dueDate")}</Label>
              <Input id="task-due" type="date" {...register("dueDate")} />
            </div>
          </div>

          {allTasks.length > 0 && (
            <div className="space-y-1.5">
              <Label>{t("tasks.form.dependency")}</Label>
              <Select
                defaultValue="__none__"
                onValueChange={(v) => setValue("dependsOnId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("tasks.form.noDependency")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("tasks.form.noDependency")}</SelectItem>
                  {allTasks.map((tk) => (
                    <SelectItem key={tk.id} value={tk.id}>{tk.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="task-desc">{tf("form.fields.description")}</Label>
            <Textarea
              id="task-desc"
              {...register("description")}
              placeholder={t("tasks.form.descPlaceholder")}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
              {t("tasks.form.addTask")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Seed Demo Button ─────────────────────────────────────────────────────────

function SeedDemoButton({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const t = useTranslations("projects");
  const [isPending, startTransition] = useTransition();

  function handleSeed() {
    startTransition(async () => {
      await seedProjectTasks(projectId);
      await seedProjectMilestones(projectId);
      onDone();
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSeed} disabled={isPending} className="gap-2">
      {isPending
        ? <Loader2 className="h-4 w-4 animate-spin" />
        : <Sparkles className="h-4 w-4 text-violet-500" />
      }
      {t("tasks.seedDemo")}
    </Button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TasksKanban({ projectId, tasks }: TasksKanbanProps) {
  const t = useTranslations("projects");
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  function handleStatusChange(id: string, status: string) {
    startTransition(async () => {
      await updateTaskStatus(id, status as Parameters<typeof updateTaskStatus>[1]);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteTask(id);
      toast.success(t("tasks.toastDeleted"));
      router.refresh();
    });
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <p className="text-muted-foreground text-sm">{t("tasks.empty")}</p>
        <div className="flex items-center gap-2">
          <NewTaskDialog projectId={projectId} allTasks={[]} onCreated={() => router.refresh()} />
          <SeedDemoButton projectId={projectId} onDone={() => router.refresh()} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {t("tasks.count", { count: tasks.length })}
        </p>
        <NewTaskDialog projectId={projectId} allTasks={tasks} onCreated={() => router.refresh()} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((tk) => col.statuses.includes(tk.status as never));
          return (
            <div key={col.id} className="space-y-2">
              <div
                className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${col.accentClass} ${col.headerClass}`}
              >
                <div className={`h-2 w-2 rounded-full ${col.dotClass}`} />
                <span className="text-xs font-semibold">
                  {t(col.labelKey as Parameters<typeof t>[0])}
                </span>
                <span className="text-xs text-muted-foreground ms-auto">
                  {colTasks.length}
                </span>
              </div>
              <div className="space-y-2 min-h-[80px]">
                {colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                    onEdit={setEditingTask}
                  />
                ))}
                {colTasks.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border p-4 text-center">
                    <p className="text-xs text-muted-foreground">{t("tasks.emptyCell")}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editingTask && (
        <EditTaskDialog
          key={editingTask.id}
          task={editingTask}
          allTasks={tasks}
          open={!!editingTask}
          onOpenChange={(v) => { if (!v) setEditingTask(null); }}
          onEdited={() => { setEditingTask(null); router.refresh(); }}
        />
      )}
    </div>
  );
}
