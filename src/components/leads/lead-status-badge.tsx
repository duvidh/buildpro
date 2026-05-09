import { Badge } from "@/components/ui/badge";
import type { LeadStatusValue, LeadUrgencyValue } from "@/lib/constants/lead-enums";

export type { LeadStatusValue };

export const LEAD_STATUS_CONFIG: Record<
  LeadStatusValue,
  { label: string; className: string }
> = {
  NEW:                { label: "ליד חדש",       className: "bg-slate-100 text-slate-700 border-slate-200" },
  CONTACTED:          { label: "נוצר קשר",       className: "bg-blue-100 text-blue-700 border-blue-200" },
  MEETING_SCHEDULED:  { label: "פגישה נקבעה",    className: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  QUOTE_SENT:         { label: "הצעה נשלחה",     className: "bg-violet-100 text-violet-700 border-violet-200" },
  NEGOTIATION:        { label: "משא ומתן",       className: "bg-orange-100 text-orange-700 border-orange-200" },
  CONVERTED:          { label: "הומר ללקוח",     className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  LOST:               { label: "ליד אבוד",       className: "bg-red-100 text-red-700 border-red-200" },
};

export const LEAD_SOURCE_LABELS: Record<string, string> = {
  REFERRAL:     "המלצה",
  WEBSITE:      "אתר אינטרנט",
  PHONE:        "פנייה טלפונית",
  SOCIAL_MEDIA: "רשתות חברתיות",
  WALK_IN:      "פנייה ישירה",
  OTHER:        "אחר",
};

export const LEAD_URGENCY_CONFIG: Record<
  LeadUrgencyValue,
  { label: string; className: string }
> = {
  HIGH:   { label: "דחוף",   className: "bg-red-100 text-red-700 border-red-200" },
  MEDIUM: { label: "בינוני", className: "bg-orange-100 text-orange-700 border-orange-200" },
  LOW:    { label: "נמוך",   className: "bg-gray-100 text-gray-600 border-gray-200" },
};

export function LeadStatusBadge({ status }: { status: string }) {
  const cfg = LEAD_STATUS_CONFIG[status as LeadStatusValue] ?? LEAD_STATUS_CONFIG.NEW;
  return (
    <Badge variant="outline" className={`text-xs ${cfg.className}`}>
      {cfg.label}
    </Badge>
  );
}

export function LeadUrgencyBadge({ urgency }: { urgency: string }) {
  const cfg = LEAD_URGENCY_CONFIG[urgency as LeadUrgencyValue] ?? LEAD_URGENCY_CONFIG.MEDIUM;
  return (
    <Badge variant="outline" className={`text-xs ${cfg.className}`}>
      {cfg.label}
    </Badge>
  );
}
