export const dynamic = "force-dynamic";

import { CheckSquare2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getAllTasks, getTaskSelectData } from "@/actions/tasks";
import { TasksPageClient } from "@/components/tasks/tasks-page-client";

export default async function TasksPage() {
  const [tasks, selectData, t] = await Promise.all([
    getAllTasks(),
    getTaskSelectData(),
    getTranslations("globalTasks"),
  ]);

  // Serialize Dates → strings for the client component
  const serialized = JSON.parse(JSON.stringify(tasks));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 shrink-0">
          <CheckSquare2 className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("subtitle")}</p>
        </div>
      </div>

      <TasksPageClient initial={serialized} selectData={selectData} />
    </div>
  );
}
