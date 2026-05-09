"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { FolderKanban, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateTaskStatus } from "@/actions/tasks";
import type { TaskStatusValue } from "@/lib/constants/task-enums";

type Task = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  completedAt: Date | null;
  project: { id: string; name: string };
  assignedTo: { id: string; name: string } | null;
};

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  TODO:        { label: "לביצוע", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  IN_PROGRESS: { label: "בביצוע", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  BLOCKED:     { label: "חסום",   cls: "bg-red-100 text-red-700 border-red-200" },
  DONE:        { label: "הושלם",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

const PRIORITY_CONFIG: Record<string, { label: string; cls: string }> = {
  LOW:    { label: "נמוכה",  cls: "bg-slate-100 text-slate-500 border-slate-200" },
  MEDIUM: { label: "בינונית", cls: "bg-blue-100 text-blue-600 border-blue-200" },
  HIGH:   { label: "גבוהה",  cls: "bg-orange-100 text-orange-700 border-orange-200" },
  URGENT: { label: "דחוף",   cls: "bg-red-100 text-red-700 border-red-200" },
};

const STATUS_FILTERS = [
  { value: "ALL",         label: "הכל" },
  { value: "TODO",        label: "לביצוע" },
  { value: "IN_PROGRESS", label: "בביצוע" },
  { value: "BLOCKED",     label: "חסום" },
  { value: "DONE",        label: "הושלם" },
];

function fmt(date: Date | null) {
  if (!date) return null;
  return new Intl.DateTimeFormat("he-IL").format(new Date(date));
}

function isOverdue(dueDate: Date | null, status: string) {
  if (!dueDate || status === "DONE") return false;
  return new Date(dueDate) < new Date();
}

export function TasksPageClient({ initial }: { initial: Task[] }) {
  const [tasks, setTasks] = useState(initial);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [, startTransition] = useTransition();

  const filtered = tasks.filter((t) => {
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.project.name.toLowerCase().includes(q);
    }
    return true;
  });

  const counts = {
    ALL:         tasks.length,
    TODO:        tasks.filter((t) => t.status === "TODO").length,
    IN_PROGRESS: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    BLOCKED:     tasks.filter((t) => t.status === "BLOCKED").length,
    DONE:        tasks.filter((t) => t.status === "DONE").length,
  } as Record<string, number>;

  function handleStatusChange(taskId: string, status: string) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status, completedAt: status === "DONE" ? new Date() : null }
          : t
      )
    );
    startTransition(async () => {
      await updateTaskStatus(taskId, status as TaskStatusValue);
    });
  }

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "לביצוע",  value: counts.TODO,        color: "text-slate-600" },
          { label: "בביצוע",  value: counts.IN_PROGRESS, color: "text-blue-600" },
          { label: "חסומות",  value: counts.BLOCKED,     color: "text-red-600" },
          { label: "הושלמו",  value: counts.DONE,        color: "text-emerald-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="חיפוש משימה, פרויקט..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={statusFilter === f.value ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
              {counts[f.value] > 0 && (
                <span className="ms-1.5 text-[10px] opacity-70">({counts[f.value]})</span>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-start font-medium text-muted-foreground px-4 py-3 text-xs">משימה</th>
              <th className="text-start font-medium text-muted-foreground px-4 py-3 text-xs hidden sm:table-cell">פרויקט</th>
              <th className="text-center font-medium text-muted-foreground px-4 py-3 text-xs">עדיפות</th>
              <th className="text-start font-medium text-muted-foreground px-4 py-3 text-xs hidden md:table-cell">תאריך יעד</th>
              <th className="text-start font-medium text-muted-foreground px-4 py-3 text-xs">סטטוס</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted-foreground text-sm py-10">
                  לא נמצאו משימות.
                </td>
              </tr>
            )}
            {filtered.map((task) => {
              const statusCfg = STATUS_CONFIG[task.status] ?? { label: task.status, cls: "" };
              const priorityCfg = PRIORITY_CONFIG[task.priority] ?? { label: task.priority, cls: "" };
              const overdue = isOverdue(task.dueDate, task.status);
              return (
                <tr
                  key={task.id}
                  className={`hover:bg-muted/20 transition-colors ${task.status === "DONE" ? "opacity-60" : ""}`}
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className={`font-medium leading-none ${task.status === "DONE" ? "line-through text-muted-foreground" : ""}`}>
                        {task.name}
                      </p>
                      {task.assignedTo && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{task.assignedTo.name}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <Link
                      href={`/projects/${task.project.id}`}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      <FolderKanban className="h-3 w-3 shrink-0" />
                      {task.project.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${priorityCfg.cls}`}>
                        {priorityCfg.label}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {task.dueDate ? (
                      <span className={`flex items-center gap-1 text-xs ${overdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                        <CalendarDays className="h-3 w-3 shrink-0" />
                        {fmt(task.dueDate)}
                        {overdue && " ⚠"}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={task.status}
                      onValueChange={(v) => handleStatusChange(task.id, v)}
                    >
                      <SelectTrigger className="h-7 w-[120px] text-xs border-0 shadow-none focus:ring-0 p-0">
                        <Badge variant="outline" className={`text-[10px] px-2 py-0.5 cursor-pointer ${statusCfg.cls}`}>
                          {statusCfg.label}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                          <SelectItem key={val} value={val} className="text-xs">
                            {cfg.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
