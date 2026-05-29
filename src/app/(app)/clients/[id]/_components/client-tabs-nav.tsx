"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutDashboard, FolderKanban, FileText, Receipt, Clock, Paperclip, CheckSquare2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Counts = { projects: number; quotes: number; invoices: number };

export function ClientTabsNav({
  clientId,
  counts,
}: {
  clientId: string;
  counts: Counts;
}) {
  const t       = useTranslations("clients.tabs");
  const pathname = usePathname();

  const tabs = [
    {
      labelKey: "overview",
      href:     `/clients/${clientId}`,
      icon:     LayoutDashboard,
      count:    null as number | null,
      exact:    true,
    },
    {
      labelKey: "projects",
      href:     `/clients/${clientId}/projects`,
      icon:     FolderKanban,
      count:    counts.projects,
      exact:    false,
    },
    {
      labelKey: "quotes",
      href:     `/clients/${clientId}/quotes`,
      icon:     FileText,
      count:    counts.quotes,
      exact:    false,
    },
    {
      labelKey: "invoices",
      href:     `/clients/${clientId}/invoices`,
      icon:     Receipt,
      count:    counts.invoices,
      exact:    false,
    },
    {
      labelKey: "activity",
      href:     `/clients/${clientId}/activity`,
      icon:     Clock,
      count:    null,
      exact:    false,
    },
    {
      labelKey: "tasks",
      href:     `/clients/${clientId}/tasks`,
      icon:     CheckSquare2,
      count:    null,
      exact:    false,
    },
    {
      labelKey: "files",
      href:     `/clients/${clientId}/files`,
      icon:     Paperclip,
      count:    null,
      exact:    false,
    },
  ] as const;

  return (
    <nav className="flex overflow-x-auto gap-0 -mb-px" aria-label="client tabs">
      {tabs.map(({ labelKey, href, icon: Icon, count, exact }) => {
        const isActive = exact
          ? pathname === href
          : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {t(labelKey)}
            {count !== null && count > 0 && (
              <span className="ms-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-muted text-[10px] font-medium">
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
