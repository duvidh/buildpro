"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { LeadStatusValue, LeadUrgencyValue } from "@/lib/constants/lead-enums";

export type { LeadStatusValue };

// className only — labels come from the translation dictionary
export const LEAD_STATUS_CONFIG: Record<LeadStatusValue, { className: string }> = {
  NEW:               { className: "bg-slate-100 text-slate-700 border-slate-200" },
  CONTACTED:         { className: "bg-blue-100 text-blue-700 border-blue-200" },
  MEETING_SCHEDULED: { className: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  QUOTE_SENT:        { className: "bg-violet-100 text-violet-700 border-violet-200" },
  NEGOTIATION:       { className: "bg-orange-100 text-orange-700 border-orange-200" },
  CONVERTED:         { className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  LOST:              { className: "bg-red-100 text-red-700 border-red-200" },
};

export const LEAD_URGENCY_CONFIG: Record<LeadUrgencyValue, { className: string }> = {
  HIGH:   { className: "bg-red-100 text-red-700 border-red-200" },
  MEDIUM: { className: "bg-orange-100 text-orange-700 border-orange-200" },
  LOW:    { className: "bg-gray-100 text-gray-600 border-gray-200" },
};

export function LeadStatusBadge({ status }: { status: string }) {
  const t   = useTranslations("leads.status");
  const cfg = LEAD_STATUS_CONFIG[status as LeadStatusValue] ?? LEAD_STATUS_CONFIG.NEW;
  const label = (() => {
    try { return t(status as Parameters<typeof t>[0]); }
    catch { return status; }
  })();
  return (
    <Badge variant="outline" className={`text-xs ${cfg.className}`}>
      {label}
    </Badge>
  );
}

export function LeadUrgencyBadge({ urgency }: { urgency: string }) {
  const t   = useTranslations("leads.urgency");
  const cfg = LEAD_URGENCY_CONFIG[urgency as LeadUrgencyValue] ?? LEAD_URGENCY_CONFIG.MEDIUM;
  const label = (() => {
    try { return t(urgency as Parameters<typeof t>[0]); }
    catch { return urgency; }
  })();
  return (
    <Badge variant="outline" className={`text-xs ${cfg.className}`}>
      {label}
    </Badge>
  );
}
