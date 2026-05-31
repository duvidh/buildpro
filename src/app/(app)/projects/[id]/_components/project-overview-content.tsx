import { getTranslations } from "next-intl/server";
import { getLocale } from "next-intl/server";
import { getProjectOverview } from "@/actions/projects";
import { getProjectActivity } from "@/actions/notifications";
import { Badge } from "@/components/ui/badge";
import { fmtDate } from "@/lib/utils";
import {
  CheckSquare2,
  Factory,
  FileText,
  Activity,
  FolderOpen,
} from "lucide-react";

// ─── Activity helpers ─────────────────────────────────────────────────────────

type ActivityEntry = {
  id:         string;
  entityType: string;
  details:    string | null;
  createdAt:  Date | string;
  user:       { id: string; name: string } | null;
};

function parseDetails(raw: string | null): { description?: string } {
  if (!raw) return {};
  try   { return JSON.parse(raw); }
  catch { return {}; }
}

function makeRelativeTime(
  locale: string,
  tCommon: (key: string, values?: Record<string, string | number>) => string
) {
  return function relativeTime(date: Date | string): string {
    const intlLocale = locale === "he" ? "he-IL" : "en-US";
    const ms   = Date.now() - new Date(date).getTime();
    const min  = Math.floor(ms / 60_000);
    if (min < 1)    return tCommon("relativeTime.justNow");
    if (min < 60)   return tCommon("relativeTime.minutesAgo", { min });
    const hrs = Math.floor(min / 60);
    if (hrs < 24)   return tCommon("relativeTime.hoursAgo", { hrs });
    const days = Math.floor(hrs / 24);
    if (days === 1) return tCommon("relativeTime.yesterday");
    if (days < 7)   return tCommon("relativeTime.daysAgo", { days });
    return new Date(date).toLocaleDateString(intlLocale, { day: "2-digit", month: "2-digit" });
  };
}

function EntityIcon({ type }: { type: string }) {
  const cls = "h-3.5 w-3.5";
  if (type === "TASK")   return <CheckSquare2 className={`${cls} text-emerald-500`} />;
  if (type === "PREFAB") return <Factory      className={`${cls} text-violet-500`}  />;
  if (type === "FILE")   return <FileText     className={`${cls} text-blue-500`}    />;
  return                        <Activity     className={`${cls} text-slate-400`}   />;
}

// ─── Component ────────────────────────────────────────────────────────────────

export async function ProjectOverviewContent({ projectId }: { projectId: string }) {
  const [data, activityLogs, t, tCommon, locale] = await Promise.all([
    getProjectOverview(projectId),
    getProjectActivity(projectId, 15),
    getTranslations("projectOverview"),
    getTranslations("common"),
    getLocale(),
  ]);

  const relativeTime = makeRelativeTime(locale, (key, values) =>
    tCommon(key as Parameters<typeof tCommon>[0], values)
  );

  const TASK_STATUS_CLS: Record<string, string> = {
    TODO:        "bg-slate-100 text-slate-600 border-slate-200",
    IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-200",
    BLOCKED:     "bg-red-100 text-red-700 border-red-200",
    DONE:        "bg-emerald-100 text-emerald-700 border-emerald-200",
  };

  if (!data) {
    return (
      <p className="text-sm text-muted-foreground">{t("cannotLoad")}</p>
    );
  }

  const doneTasks    = data.tasks.filter((task) => task.status === "DONE").length;
  const pendingTasks = data.tasks.filter((task) => task.status !== "DONE").length;

  return (
    <div className="space-y-5 max-w-3xl">
      {/* ── Stats grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: t("openTasks"),      value: pendingTasks,        color: "text-blue-600" },
          { label: t("completedTasks"), value: doneTasks,           color: "text-emerald-600" },
          { label: t("teamMembers"),    value: data.members.length, color: "text-violet-600" },
          { label: t("files"),          value: data._count.files,   color: "text-slate-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Recent tasks ────────────────────────────────────────────────────── */}
      {data.tasks.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-2">{t("recentTasks")}</h4>
          <ul className="divide-y divide-border">
            {data.tasks.slice(0, 5).map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-3 py-2.5 px-1">
                <p className="text-sm flex-1 min-w-0 truncate">{task.name}</p>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="outline"
                    className={`text-[10px] h-4 px-1.5 py-0 ${TASK_STATUS_CLS[task.status] ?? ""}`}
                  >
                    {t(`taskStatus.${task.status}` as Parameters<typeof t>[0], undefined, { fallback: task.status })}
                  </Badge>
                  {task.dueDate && (
                    <span className="text-[11px] text-muted-foreground">{fmtDate(task.dueDate)}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Upcoming milestones ──────────────────────────────────────────────── */}
      {data.milestones.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-2">{t("upcomingMilestones")}</h4>
          <ul className="divide-y divide-border">
            {data.milestones.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-2.5 px-1">
                <p className="text-sm">{m.name}</p>
                <span className="text-xs text-muted-foreground">{fmtDate(m.date)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Team members ────────────────────────────────────────────────────── */}
      {data.members.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-2">{t("projectTeam")}</h4>
          <div className="flex flex-wrap gap-2">
            {data.members.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {m.user.name[0]}
                </div>
                <span className="text-xs font-medium">{m.user.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {t(`memberRole.${m.role}` as Parameters<typeof t>[0], undefined, { fallback: m.role })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Activity timeline ────────────────────────────────────────────────── */}
      <div>
        <h4 className="text-sm font-semibold text-muted-foreground mb-3">{t("activityLog")}</h4>
        {activityLogs.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-border px-4 py-6">
            <FolderOpen className="h-5 w-5 text-muted-foreground/40 shrink-0" />
            <p className="text-sm text-muted-foreground">{t("noActivity")}</p>
          </div>
        ) : (
          <ol className="relative border-s border-border/60 ms-3 space-y-0">
            {(activityLogs as ActivityEntry[]).map((log, i) => {
              const { description } = parseDetails(log.details);
              const isLast = i === activityLogs.length - 1;
              return (
                <li key={log.id} className={`ms-5 ${isLast ? "pb-0" : "pb-4"}`}>
                  <span className="absolute -start-[9px] flex h-4 w-4 items-center justify-center rounded-full border border-border bg-background ring-4 ring-background">
                    <EntityIcon type={log.entityType} />
                  </span>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm leading-relaxed text-foreground/90">
                      {description ?? log.entityType}
                    </p>
                    <time className="shrink-0 text-[11px] text-muted-foreground/60 whitespace-nowrap">
                      {relativeTime(log.createdAt)}
                    </time>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {data.tasks.length === 0 && data.members.length === 0 && (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <p className="text-sm text-muted-foreground">{t("emptyProject")}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("emptySubtitle")}</p>
        </div>
      )}
    </div>
  );
}
