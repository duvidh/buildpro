import Link from "next/link";
import { CalendarDays, AlertCircle, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DashboardData } from "./types";

const PRIORITY_CFG: Record<string, { label: string; className: string }> = {
  URGENT: { label: "דחוף מאוד", className: "bg-red-100 text-red-700 border-red-200" },
  HIGH:   { label: "דחוף",      className: "bg-red-100 text-red-700 border-red-200" },
  MEDIUM: { label: "בינוני",    className: "bg-orange-100 text-orange-700 border-orange-200" },
  LOW:    { label: "נמוך",      className: "bg-gray-100 text-gray-600 border-gray-200" },
};

function fmtDue(d: Date | null) {
  if (!d) return { text: "—", overdue: false };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const due = new Date(d); due.setHours(0, 0, 0, 0);
  if (due.getTime() === today.getTime()) return { text: "היום", overdue: false };
  if (due.getTime() === tomorrow.getTime()) return { text: "מחר", overdue: false };
  const overdue = due < today;
  return {
    text: new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit" }).format(new Date(d)),
    overdue,
  };
}

export function TasksWidget({ data }: { data: DashboardData }) {
  const tasks = data.upcomingTasks;

  return (
    <div className="flex flex-col h-full">
      {tasks.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground p-4">
          אין משימות פתוחות עם תאריך יעד
        </div>
      ) : (
        <ul className="flex-1 divide-y divide-border overflow-auto">
          {tasks.map((task) => {
            const due = fmtDue(task.dueDate);
            const priority = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.MEDIUM;
            return (
              <li key={task.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate leading-snug ${due.overdue ? "text-destructive" : "text-foreground"}`}>
                    {due.overdue && <AlertCircle className="inline h-3 w-3 me-1 mb-0.5" />}
                    {task.name}
                  </p>
                  {task.project && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{task.project.name}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`flex items-center gap-0.5 text-xs ${due.overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                    <CalendarDays className="h-3 w-3" />
                    {due.text}
                  </span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${priority.className}`}>
                    {priority.label}
                  </Badge>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="border-t border-border/40 px-4 py-2 shrink-0">
        <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground w-full justify-end">
          <Link href="/tasks">
            כל המשימות <ChevronLeft className="h-3.5 w-3.5 ms-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
