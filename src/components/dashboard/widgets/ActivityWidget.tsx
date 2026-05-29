import {
  FileText, FolderKanban, CreditCard, CheckSquare,
  TrendingUp, AlertCircle, Wrench, User,
} from "lucide-react";
import type { DashboardData, DashboardActivity } from "./types";

// Map entityType → icon + colour
const ENTITY_CFG: Record<string, { icon: React.ElementType; bg: string; text: string }> = {
  INVOICE:        { icon: FileText,      bg: "bg-emerald-100", text: "text-emerald-600" },
  PROJECT:        { icon: FolderKanban,  bg: "bg-violet-100",  text: "text-violet-600"  },
  PAYMENT:        { icon: CreditCard,    bg: "bg-blue-100",    text: "text-blue-600"    },
  TASK:           { icon: CheckSquare,   bg: "bg-orange-100",  text: "text-orange-600"  },
  LEAD:           { icon: TrendingUp,    bg: "bg-sky-100",     text: "text-sky-600"     },
  NCR:            { icon: AlertCircle,   bg: "bg-red-100",     text: "text-red-600"     },
  CONTRACT:       { icon: Wrench,        bg: "bg-amber-100",   text: "text-amber-600"   },
};

function getDescription(a: DashboardActivity): string {
  if (!a.details) return a.action;
  try {
    const parsed = JSON.parse(a.details) as { description?: string };
    return parsed.description ?? a.action;
  } catch {
    return a.details;
  }
}

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const min  = Math.floor(diff / 60_000);
  const hr   = Math.floor(diff / 3_600_000);
  const day  = Math.floor(diff / 86_400_000);
  if (min < 1)  return "עכשיו";
  if (min < 60) return `לפני ${min} דק׳`;
  if (hr  < 24) return `לפני ${hr} שע׳`;
  if (day < 7)  return `לפני ${day} ימים`;
  return new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit" }).format(new Date(date));
}

import type React from "react";

export function ActivityWidget({ data }: { data: DashboardData }) {
  const activity = data.recentActivity;

  return (
    <div className="flex flex-col h-full">
      {activity.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <User className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">אין פעילות אחרונה</p>
        </div>
      ) : (
        <ul className="flex-1 overflow-auto divide-y divide-border/50">
          {activity.map((a) => {
            const cfg = ENTITY_CFG[a.entityType] ?? { icon: User, bg: "bg-muted", text: "text-muted-foreground" };
            const Icon = cfg.icon;
            const desc = getDescription(a);

            return (
              <li key={a.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${cfg.bg}`}>
                  <Icon className={`h-3 w-3 ${cfg.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground leading-snug line-clamp-2">{desc}</p>
                  {a.user && (
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">{a.user.name}</p>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground/60 shrink-0 mt-0.5 whitespace-nowrap">
                  {timeAgo(a.createdAt)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
