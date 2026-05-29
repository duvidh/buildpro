"use client";

import Link from "next/link";
import type React from "react";
import {
  Plus, FolderKanban, Users, CheckSquare,
  TrendingUp, FileText, Wallet, Calendar,
  ClipboardList, Wrench,
} from "lucide-react";
import { useTranslations } from "next-intl";

type ActionDef = {
  labelKey:  string;
  href:      string;
  icon:      React.ElementType;
  gradient:  string;
  textColor: string;
};

const ACTION_DEFS: ActionDef[] = [
  { labelKey: "newLead",     href: "/leads?new=1",    icon: TrendingUp,    gradient: "from-sky-500/10 to-blue-500/10",      textColor: "text-sky-600" },
  { labelKey: "newProject",  href: "/projects?new=1", icon: FolderKanban,  gradient: "from-violet-500/10 to-purple-500/10", textColor: "text-violet-600" },
  { labelKey: "newTask",     href: "/tasks?new=1",    icon: CheckSquare,   gradient: "from-orange-500/10 to-amber-500/10",  textColor: "text-orange-600" },
  { labelKey: "newClient",   href: "/clients?new=1",  icon: Users,         gradient: "from-emerald-500/10 to-teal-500/10",  textColor: "text-emerald-600" },
  { labelKey: "invoice",     href: "/finance",        icon: FileText,      gradient: "from-rose-500/10 to-pink-500/10",     textColor: "text-rose-600" },
  { labelKey: "finance",     href: "/finance",        icon: Wallet,        gradient: "from-green-500/10 to-emerald-500/10", textColor: "text-green-600" },
  { labelKey: "calendar",    href: "/tasks",          icon: Calendar,      gradient: "from-indigo-500/10 to-blue-500/10",   textColor: "text-indigo-600" },
  { labelKey: "fieldReport", href: "/field",          icon: ClipboardList, gradient: "from-amber-500/10 to-yellow-500/10",  textColor: "text-amber-600" },
  { labelKey: "suppliers",   href: "/suppliers",      icon: Wrench,        gradient: "from-slate-500/10 to-gray-500/10",    textColor: "text-slate-600" },
];

export function QuickActionsWidget() {
  const t = useTranslations("dashboard.quickActions");

  return (
    <div className="h-full overflow-auto p-3">
      <div className="grid grid-cols-3 gap-2 h-full">
        {ACTION_DEFS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.labelKey}
              href={action.href}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-xl
                bg-gradient-to-br ${action.gradient}
                border border-border/40 hover:border-border hover:shadow-sm
                p-3 transition-all duration-200 hover:scale-[1.02] group min-h-[70px]`}
            >
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg
                bg-background/80 shadow-sm group-hover:shadow transition-shadow`}
              >
                <Icon className={`h-3.5 w-3.5 ${action.textColor}`} />
              </div>
              <span className={`text-[11px] font-medium text-center leading-tight ${action.textColor}`}>
                {t(action.labelKey as Parameters<typeof t>[0])}
              </span>
            </Link>
          );
        })}
        {/* Coming soon placeholder */}
        <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl
          border border-dashed border-border/50 p-3 min-h-[70px] opacity-40"
        >
          <Plus className="h-4 w-4 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">{t("comingSoon")}</span>
        </div>
      </div>
    </div>
  );
}
