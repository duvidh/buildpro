"use client";

import { useCurrency } from "@/lib/currency-context";
import { useOptimistic, useTransition, useLayoutEffect, useState } from "react";
import {
  DragDropContext, Droppable, Draggable,
  type DropResult, type DroppableProps,
} from "@hello-pangea/dnd";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { PhoneCall, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { updateLeadStatus } from "@/actions/leads";
import { LEAD_STATUS_CONFIG } from "./lead-status-badge";
import type { LeadStatusValue } from "@/lib/constants/lead-enums";

// ─── Types ────────────────────────────────────────────────────────────────────

type Lead = {
  id:                string;
  name:              string;
  phone:             string;
  budget:            number | null;
  status:            LeadStatusValue;
  constructionTypes: string[];
  city:              string | null;
  createdAt:         string;
};

// ─── Pipeline columns ─────────────────────────────────────────────────────────

const PIPELINE_COLS: {
  status:       LeadStatusValue;
  accentBg:     string;
  accentBorder: string;
  overBg:       string;
}[] = [
  { status: "NEW",               accentBg: "bg-slate-100",  accentBorder: "border-slate-300",  overBg: "bg-slate-50" },
  { status: "CONTACTED",         accentBg: "bg-blue-100",   accentBorder: "border-blue-300",   overBg: "bg-blue-50" },
  { status: "MEETING_SCHEDULED", accentBg: "bg-indigo-100", accentBorder: "border-indigo-300", overBg: "bg-indigo-50" },
  { status: "QUOTE_SENT",        accentBg: "bg-violet-100", accentBorder: "border-violet-300", overBg: "bg-violet-50" },
  { status: "NEGOTIATION",       accentBg: "bg-orange-100", accentBorder: "border-orange-300", overBg: "bg-orange-50" },
];

const PIPELINE_STATUS_SET = new Set(PIPELINE_COLS.map((c) => c.status));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? "972" + digits.slice(1) : digits;
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// ─── Translated relative time ─────────────────────────────────────────────────

function useTimeAgo() {
  const t = useTranslations("leads.pipeline");
  return (iso: string): string => {
    const diff  = Date.now() - new Date(iso).getTime();
    const days  = Math.floor(diff / 86400000);
    const hours = Math.floor(diff / 3600000);
    const mins  = Math.floor(diff / 60000);
    if (days > 30) return t("timeMonths", { n: Math.floor(days / 30) });
    if (days  > 0) return t("timeDays",   { n: days });
    if (hours > 0) return t("timeHours",  { n: hours });
    if (mins  > 0) return t("timeMins",   { n: mins });
    return t("timeNow");
  };
}

// ─── StrictMode-safe Droppable ────────────────────────────────────────────────

function SafeDroppable(props: DroppableProps) {
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true));
    return () => {
      cancelAnimationFrame(raf);
      setReady(false);
    };
  }, []);
  if (!ready) {
    return (
      <div className="flex-1 min-h-[120px] rounded-b-lg border border-t-0 border-border/40 bg-muted/10 p-2" />
    );
  }
  return <Droppable {...props} />;
}

// ─── Lead card ────────────────────────────────────────────────────────────────

function LeadCard({ lead, index }: { lead: Lead; index: number }) {
  const { fmtCompact } = useCurrency();
  const t       = useTranslations("leads.pipeline");
  const timeAgo = useTimeAgo();

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "bg-white rounded-lg border border-border/60 p-2.5 mb-2 select-none",
            "shadow-sm transition-shadow duration-150",
            snapshot.isDragging
              ? "shadow-xl rotate-[1.5deg] border-primary/40 scale-[1.02]"
              : "hover:shadow-md hover:border-border cursor-grab active:cursor-grabbing"
          )}
        >
          {/* Name */}
          <Link
            href={`/leads/${lead.id}`}
            className="block text-sm font-semibold text-foreground hover:text-primary leading-snug truncate"
            onClick={(e) => snapshot.isDragging && e.preventDefault()}
          >
            {lead.name}
          </Link>

          {/* City / construction type */}
          {(lead.city || lead.constructionTypes[0]) && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {[lead.city, lead.constructionTypes[0]].filter(Boolean).join(" · ")}
            </p>
          )}

          {/* Phone + WA */}
          <div
            className="flex items-center gap-1.5 mt-1.5"
            dir="ltr"
            onClick={(e) => e.stopPropagation()}
          >
            <a
              href={`tel:${lead.phone}`}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <PhoneCall className="h-2.5 w-2.5 opacity-60" />
              {lead.phone}
            </a>
            <a
              href={`https://wa.me/${toWhatsAppNumber(lead.phone)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#25D366] hover:opacity-80"
            >
              <WhatsAppIcon />
            </a>
          </div>

          {/* Budget + time */}
          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/40">
            {lead.budget ? (
              <span className="text-xs font-semibold text-emerald-600">
                {fmtCompact(lead.budget)}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground/50">{t("noBudget")}</span>
            )}
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground/70">
              <Clock className="h-2.5 w-2.5" />
              {timeAgo(lead.createdAt)}
            </span>
          </div>
        </div>
      )}
    </Draggable>
  );
}

// ─── Pipeline column ──────────────────────────────────────────────────────────

function PipelineColumn({
  col,
  leads,
}: {
  col:   (typeof PIPELINE_COLS)[number];
  leads: Lead[];
}) {
  const t   = useTranslations("leads");
  const cfg = LEAD_STATUS_CONFIG[col.status];

  const label = (() => {
    try { return t(`status.${col.status}` as Parameters<typeof t>[0]); }
    catch { return col.status; }
  })();

  return (
    <div className="flex flex-col w-[220px] min-w-[220px] max-w-[220px]">
      {/* Column header */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 rounded-t-lg border",
          col.accentBg,
          col.accentBorder
        )}
      >
        <span className={`text-xs font-bold ${cfg.className} px-1.5 py-0.5 rounded-md border`}>
          {label}
        </span>
        <span
          className={cn(
            "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5",
            "text-xs font-bold bg-white/70 border",
            col.accentBorder
          )}
        >
          {leads.length}
        </span>
      </div>

      {/* Drop zone */}
      <SafeDroppable droppableId={col.status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 min-h-[120px] rounded-b-lg border border-t-0 p-2 transition-colors duration-150",
              snapshot.isDraggingOver
                ? cn(col.overBg, col.accentBorder, "border-dashed")
                : "bg-muted/20 border-border/40"
            )}
          >
            {leads.map((lead, index) => (
              <LeadCard key={lead.id} lead={lead} index={index} />
            ))}
            {provided.placeholder}

            {leads.length === 0 && !snapshot.isDraggingOver && (
              <p className="text-xs text-muted-foreground/40 text-center pt-4 select-none">
                {t("pipeline.dragHere")}
              </p>
            )}
          </div>
        )}
      </SafeDroppable>
    </div>
  );
}

// ─── Main pipeline component ──────────────────────────────────────────────────

export function LeadsPipeline({
  leads,
  convertedCount,
  lostCount,
}: {
  leads:          Lead[];
  convertedCount: number;
  lostCount:      number;
}) {
  const { fmtCompact } = useCurrency();
  const t      = useTranslations("leads.pipeline");
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [optimisticLeads, addOptimistic] = useOptimistic(
    leads,
    (state: Lead[], { id, status }: { id: string; status: LeadStatusValue }) =>
      state.map((l) => (l.id === id ? { ...l, status } : l))
  );

  function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const newStatus = destination.droppableId as LeadStatusValue;

    startTransition(async () => {
      addOptimistic({ id: draggableId, status: newStatus });
      const res = await updateLeadStatus(draggableId, newStatus);
      if (!res.success) {
        toast.error(t("errorStatus"));
        router.refresh();
      } else {
        router.refresh();
      }
    });
  }

  const activeLeads = optimisticLeads.filter((l) => PIPELINE_STATUS_SET.has(l.status));
  const byStatus = Object.fromEntries(
    PIPELINE_COLS.map((col) => [col.status, activeLeads.filter((l) => l.status === col.status)])
  ) as Record<LeadStatusValue, Lead[]>;

  return (
    <div className="flex flex-col gap-3">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1">
          {PIPELINE_COLS.map((col) => (
            <PipelineColumn
              key={col.status}
              col={col}
              leads={byStatus[col.status] ?? []}
            />
          ))}
        </div>
      </DragDropContext>

      {/* Terminal status summary */}
      {(convertedCount > 0 || lostCount > 0) && (
        <div className="flex gap-3 pt-1 border-t border-border/30">
          {convertedCount > 0 && (
            <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-1">
              ✓ {t("converted", { count: convertedCount })}
            </span>
          )}
          {lostCount > 0 && (
            <span className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-full px-2.5 py-1">
              ✗ {t("lost", { count: lostCount })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
