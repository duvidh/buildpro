import Link from "next/link";
import { Flag, ChevronLeft, CheckCircle2, Clock } from "lucide-react";
import type { DashboardData } from "./types";

function daysUntil(date: Date): { text: string; urgent: boolean; past: boolean } {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff < 0)  return { text: `${Math.abs(diff)} ימים בפיגור`, urgent: true, past: true };
  if (diff === 0) return { text: "היום!", urgent: true, past: false };
  if (diff === 1) return { text: "מחר", urgent: true, past: false };
  if (diff <= 7)  return { text: `${diff} ימים`, urgent: true, past: false };
  return { text: `${diff} ימים`, urgent: false, past: false };
}

export function MilestonesWidget({ data }: { data: DashboardData }) {
  const milestones = data.upcomingMilestones;

  return (
    <div className="flex flex-col h-full">
      {milestones.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-400/60" />
          <p className="text-sm text-muted-foreground">אין אבני דרך קרובות</p>
        </div>
      ) : (
        <ul className="flex-1 divide-y divide-border overflow-auto">
          {milestones.map((m) => {
            const due = daysUntil(m.date);
            return (
              <li key={m.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full
                  ${due.past ? "bg-red-100" : due.urgent ? "bg-amber-100" : "bg-muted/50"}`}
                >
                  {due.past
                    ? <Flag className="h-3.5 w-3.5 text-red-500" />
                    : <Clock className={`h-3.5 w-3.5 ${due.urgent ? "text-amber-500" : "text-muted-foreground"}`} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate leading-tight">{m.name}</p>
                  <Link
                    href={`/projects/${m.project.id}`}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors truncate block"
                  >
                    {m.project.name}
                  </Link>
                </div>
                <span className={`text-xs font-semibold shrink-0 px-2 py-0.5 rounded-full
                  ${due.past
                    ? "bg-red-100 text-red-600"
                    : due.urgent
                      ? "bg-amber-100 text-amber-700"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {due.text}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <div className="border-t border-border/40 px-4 py-2 shrink-0">
        <Link
          href="/projects"
          className="flex items-center justify-end gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          כל הפרויקטים <ChevronLeft className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
