import { CheckSquare } from "lucide-react";
import { getAllTasks } from "@/actions/tasks";
import { TasksPageClient } from "@/components/tasks/tasks-page-client";

export default async function TasksPage() {
  const tasks = await getAllTasks();

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 shrink-0">
          <CheckSquare className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">משימות</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            כל המשימות בכל הפרויקטים
          </p>
        </div>
      </div>

      <TasksPageClient initial={tasks} />
    </div>
  );
}
