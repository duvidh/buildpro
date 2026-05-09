import { ClipboardList } from "lucide-react";
import { getAllDailyLogs } from "@/actions/field";
import { getActiveProjects } from "@/actions/field";
import { DailyLogList } from "@/components/daily-logs/daily-log-list";

export default async function DailyLogsPage() {
  const [logs, projects] = await Promise.all([
    getAllDailyLogs(),
    getActiveProjects(),
  ]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 shrink-0">
          <ClipboardList className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">יומן עבודה</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            דוחות יומיים מכל הפרויקטים
          </p>
        </div>
      </div>

      <DailyLogList initial={logs} projects={projects} />
    </div>
  );
}
