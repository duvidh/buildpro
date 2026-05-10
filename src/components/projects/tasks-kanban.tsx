"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  id: string;
  name: string;
  description?: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  assignedTo: { id: string; name: string } | null;
};

type TasksKanbanProps = {
  projectId: string;
  tasks: Task[];
};

// ─── Schemas ──────────────────────────────────────────────────────────────────

const updateTaskSchema = z.object({
  name: z.string().min(2, "שם חייב להכיל לפחות 2 תווים"),
  description: z.string().optional(),
  status: z.enum(TASK_STATUS_VALUES),
  priority: z.enum(TASK_PRIORITY_VALUES),
  dueDate: z.string().optional(),
});
type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

// ─── Config ───────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  LOW:    { label: "נמוך",   className: "bg-slate-100 text-slate-500 border-slate-200" },
  MEDIUM: { label: "בינוני", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  HIGH:   { label: "גבוה",   className: "bg-orange-100 text-orange-700 border-orange-200" },
  URGENT: { label: "דחוף",   className: "bg-red-100 text-red-700 border-red-200" },
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "נמוך", MEDIUM: "בינוני", HIGH: "גבוה", URGENT: "דחוף",
};

const COLUMNS = [
  {
    id: "todo",
    label: "לביצוע",
    statuses: ["TODO"],
    headerClass: "bg-slate-50",
    accentClass: "border-slate-300",
    dotClass: "bg-slate-400",
  },
  {
    id: "inprogress",
    label: "בביצוע",
    statuses: ["IN_PROGRESS", "BLOCKED"],
    headerClass: "bg-blue-50",
    accentClass: "border-blue-300",
    dotClass: "bg-blue-500",
  },
  {
    id: "done",
    label: "הושלם",
    statuses: ["DONE"],
    headerClass: "bg-emerald-50",
    accentClass: "border-emerald-300",
    dotClass: "bg-emerald-500",
  },
];

const NEXT_STATUS: Record<string, string> = {
  TODO: "IN_PROGRESS",
  BLOCKED: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  DONE: "TODO",
};

const NEXT_STATUS_LABEL: Record<string, string> = {
  TODO: "התחל",
  BLOCKED: "בטל חסימה",
  IN_PROGRESS: "סיים",
  DONE: "פתח מחדש",
};

const STATUS_LABELS: Record<string, string> = {
  TODO: "לביצוע",
  IN_PROGRESS: "בביצוע",
  BLOCKED: "חסום",
  DONE: "הושלם",
};

function fmt(date: Date | null) {
  if (!date) return null;
  return new Intl.DateTimeFormat("he-IL").format(new Date(date));
}

function isOverdue(date: Date | null) {
  if (!date) return false;
  return new Date(date) < new Date();
}

function isoToDateInput(d: Date | null): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

// ─── Edit Dialog ──────────────────────────────────────────────────────────────

function EditTaskDialog({
  task,
  open,
  onOpenChange,
  onEdited,
}: {
  task: Task;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onEdited: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, setValue, formState: { errors } } =
    useForm<UpdateTaskInput>({
      resolver: zodResolver(updateTaskSchema),
      defaultValues: {
        name: task.name,
        description: task.description ?? "",
        status: task.status as UpdateTaskInput["status"],
        priority: task.priority as UpdateTaskInput["priority"],
        dueDate: isoToDateInput(task.dueDate),
      },
    });

  function onSubmit(data: UpdateTaskInput) {
    startTransition(async () => {
      const res = await updateTask(task.id, data);
      if (res.success) {
        toast.success("משימה עודכנה בהצלחה");
        onOpenChange(false);
        onEdited();
      } else {
        toast.error("שגיאה בעדכון המשימה");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>עריכת משימה</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label>שם המשימה *</Label>
            <Input {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>סטטוס</Label>
              <Select
                defaultValue={task.status}
                onValueChange={(v) => setValue("status", v as UpdateTaskInput["status"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_STATUS_VALUES.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>עדיפות</Label>
              <Select
                defaultValue={task.priority}
                onValueChange={(v) => setValue("priority", v as UpdateTaskInput["priority"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITY_VALUES.map((p) => (
                    <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>תאריך יעד</Label>
            <Input type="date" {...register("dueDate")} />
          </div>

          <div className="space-y-1.5">
            <Label>תיאור</Label>
            <Textarea {...register("description")} rows={2} placeholder="פרטים נוספים..." />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ביטול
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
              שמור שינויים
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TaskCard({
  task,
  onStatusChange,
  onDelete,
  onEdit,
}: {
  task: Task;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}) {
  const priority = PRIORITY_CONFIG[task.priority];
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const overdue = task.status !== "DONE" && isOverdue(task.dueDate);
  const isBlocked = task.status === "BLOCKED";

  const otherStatuses = Object.keys(STATUS_LABELS).filter((s) => s !== task.status);

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
              ערוך
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">שנה סטטוס</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {otherStatuses.map((s) => (
              <DropdownMenuItem key={s} onClick={() => onStatusChange(task.id, s)}>
                {STATUS_LABELS[s]}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(task.id)}
            >
              מחק
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {priority && (
            <Badge variant="outline" className={`text-[10px] h-4 px-1.5 py-0 ${priority.className}`}>
              {priority.label}
            </Badge>
          )}
          {isBlocked && (
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0 bg-red-100 text-red-700 border-red-200">
              חסום
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
        → {NEXT_STATUS_LABEL[task.status] ?? "שנה סטטוס"}
      </Button>
    </div>
  );
}

function NewTaskDialog({ projectId, onCreated }: { projectId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, setValue, reset, formState: { errors } } =
    useForm<CreateTaskInput>({
      resolver: zodResolver(createTaskSchema),
      defaultValues: { projectId, status: "TODO", priority: "MEDIUM" },
    });

  function onSubmit(data: CreateTaskInput) {
    startTransition(async () => {
      const res = await createTask(data);
      if (res.success) {
        reset({ projectId, status: "TODO", priority: "MEDIUM" });
        setOpen(false);
        onCreated();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 h-8">
          <Plus className="h-3.5 w-3.5" />
          משימה חדשה
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>משימה חדשה</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          <input type="hidden" {...register("projectId")} />

          <div className="space-y-1.5">
            <Label htmlFor="task-name">שם המשימה *</Label>
            <Input id="task-name" {...register("name")} placeholder="יציקת קירות, הנחת ריצוף..." />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>עדיפות</Label>
              <Select
                defaultValue="MEDIUM"
                onValueChange={(v) =>
                  setValue("priority", v as (typeof TASK_PRIORITY_VALUES)[number])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITY_VALUES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-due">תאריך יעד</Label>
              <Input id="task-due" type="date" {...register("dueDate")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-desc">תיאור</Label>
            <Textarea
              id="task-desc"
              {...register("description")}
              placeholder="פרטים נוספים..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              ביטול
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
              הוסף משימה
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SeedDemoButton({ projectId, onDone }: { projectId: string; onDone: () => void }) {
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
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4 text-violet-500" />
      )}
      הוסף נתוני דמו
    </Button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TasksKanban({ projectId, tasks }: TasksKanbanProps) {
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
      toast.success("משימה נמחקה");
      router.refresh();
    });
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <p className="text-muted-foreground text-sm">אין משימות עדיין.</p>
        <div className="flex items-center gap-2">
          <NewTaskDialog projectId={projectId} onCreated={() => router.refresh()} />
          <SeedDemoButton projectId={projectId} onDone={() => router.refresh()} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{tasks.length} משימות</p>
        <NewTaskDialog projectId={projectId} onCreated={() => router.refresh()} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => col.statuses.includes(t.status as never));
          return (
            <div key={col.id} className="space-y-2">
              <div
                className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${col.accentClass} ${col.headerClass}`}
              >
                <div className={`h-2 w-2 rounded-full ${col.dotClass}`} />
                <span className="text-xs font-semibold">{col.label}</span>
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
                    <p className="text-xs text-muted-foreground">ריק</p>
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
          open={!!editingTask}
          onOpenChange={(v) => { if (!v) setEditingTask(null); }}
          onEdited={() => { setEditingTask(null); router.refresh(); }}
        />
      )}
    </div>
  );
}
