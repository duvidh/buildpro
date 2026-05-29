"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { User, Clock, CheckSquare, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export function LeadTabs({ leadId }: { leadId: string }) {
  const pathname = usePathname();
  const t = useTranslations("leads");

  const tabs = [
    { label: t("detail.tabs.details"),   href: `/leads/${leadId}`,          icon: User },
    { label: t("detail.tabs.activity"),  href: `/leads/${leadId}/activity`, icon: Clock },
    { label: t("detail.tabs.tasks"),     href: `/leads/${leadId}/tasks`,    icon: CheckSquare },
    { label: t("detail.tabs.documents"), href: `/leads/${leadId}/files`,    icon: FileText },
  ];

  return (
    <nav className="flex gap-0 overflow-x-auto" aria-label="lead tabs">
      {tabs.map(({ label, href, icon: Icon }) => {
        // exact match for overview, prefix match for sub-routes
        const isActive =
          href === `/leads/${leadId}`
            ? pathname === href
            : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
              "border-b-2",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
