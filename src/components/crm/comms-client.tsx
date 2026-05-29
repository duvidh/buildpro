"use client";

import { useState, useTransition, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Phone, Users, Mail, FileText,
  Plus, Send, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { addCommunicationLog } from "@/actions/communications";
import { toast } from "sonner";
import type { CommunicationType } from "@/generated/prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CommEntry = {
  id: string;
  type: CommunicationType;
  content: string;
  createdAt: string;
  author: { id: string; name: string };
};

type Props = {
  entity: { type: "lead" | "client"; id: string };
  initialEntries: CommEntry[];
};

// ─── Type CSS config (labels come from t()) ───────────────────────────────────

const TYPE_CSS: Record<
  CommunicationType,
  { Icon: React.ElementType; color: string; bg: string; ring: string }
> = {
  NOTE:    { Icon: FileText, color: "text-slate-600",  bg: "bg-slate-100",  ring: "ring-slate-200" },
  CALL:    { Icon: Phone,    color: "text-emerald-600", bg: "bg-emerald-100", ring: "ring-emerald-200" },
  MEETING: { Icon: Users,    color: "text-blue-600",   bg: "bg-blue-100",   ring: "ring-blue-200" },
  EMAIL:   { Icon: Mail,     color: "text-violet-600", bg: "bg-violet-100", ring: "ring-violet-200" },
};

const TYPE_ORDER: CommunicationType[] = ["NOTE", "CALL", "MEETING", "EMAIL"];

// ─── Inline Log Form ──────────────────────────────────────────────────────────

function LogForm({
  entity,
  onAdded,
}: {
  entity: Props["entity"];
  onAdded: (entry: CommEntry) => void;
}) {
  const [type, setType]       = useState<CommunicationType>("NOTE");
  const [content, setContent] = useState("");
  const [isPending, start]    = useTransition();
  const textRef               = useRef<HTMLTextAreaElement>(null);
  const t     = useTranslations("clients");
  const locale = useLocale();
  const dir    = locale === "he" ? "rtl" : "ltr";

  const typeLabel = (tp: CommunicationType): string => {
    const map: Record<CommunicationType, string> = {
      NOTE:    t("activity.typeNote"),
      CALL:    t("activity.typeCall"),
      MEETING: t("activity.typeMeeting"),
      EMAIL:   t("activity.typeEmail"),
    };
    return map[tp];
  };

  const placeholder = (): string => {
    if (type === "CALL")    return t("activity.placeholderCall");
    if (type === "MEETING") return t("activity.placeholderMeeting");
    if (type === "EMAIL")   return t("activity.placeholderEmail");
    return t("activity.placeholderNote");
  };

  function handleSubmit() {
    if (!content.trim()) return;

    start(async () => {
      const res = await addCommunicationLog({
        type,
        content,
        leadId:   entity.type === "lead"   ? entity.id : undefined,
        clientId: entity.type === "client" ? entity.id : undefined,
      });

      if (!res.success) {
        toast.error((res as { error?: string }).error ?? t("activity.errorSave"));
        return;
      }

      // Optimistic entry (temp id, will be replaced on next server fetch)
      onAdded({
        id:        `tmp-${Date.now()}`,
        type,
        content:   content.trim(),
        createdAt: new Date().toISOString(),
        author:    { id: "", name: t("activity.you") },
      });

      setContent("");
      toast.success(t("activity.successSave"));
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-3" dir={dir}>
      {/* Type selector */}
      <div className="flex gap-1.5 flex-wrap">
        {TYPE_ORDER.map((tp) => {
          const cfg    = TYPE_CSS[tp];
          const active = type === tp;
          return (
            <button
              key={tp}
              type="button"
              onClick={() => setType(tp)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                "border transition-all",
                active
                  ? `${cfg.bg} ${cfg.color} border-transparent ring-2 ${cfg.ring}`
                  : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
              )}
            >
              <cfg.Icon className="h-3 w-3" />
              {typeLabel(tp)}
            </button>
          );
        })}
      </div>

      {/* Content input */}
      <Textarea
        ref={textRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder()}
        rows={3}
        className="resize-none text-sm"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
        }}
        disabled={isPending}
      />

      {/* Submit row */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{t("activity.ctrlHint")}</p>
        <Button
          size="sm"
          className="h-8 gap-1.5 text-sm"
          onClick={handleSubmit}
          disabled={!content.trim() || isPending}
        >
          <Send className="h-3.5 w-3.5" />
          {isPending ? t("activity.saving") : t("activity.saveBtn")}
        </Button>
      </div>
    </div>
  );
}

// ─── Timeline Entry ───────────────────────────────────────────────────────────

function TimelineEntry({ entry }: { entry: CommEntry }) {
  const cfg        = TYPE_CSS[entry.type];
  const t          = useTranslations("clients");
  const locale     = useLocale();

  function relativeTime(iso: string): string {
    const diff  = Date.now() - new Date(iso).getTime();
    const mins  = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days  = Math.floor(diff / 86_400_000);

    if (mins  < 1)  return t("activity.relativeNow");
    if (mins  < 60) return t("activity.relativeMinutes", { n: mins });
    if (hours < 24) return t("activity.relativeHours",   { n: hours });
    if (days  < 7)  return t("activity.relativeDays",    { n: days });

    const intlLocale = locale === "he" ? "he-IL" : "en-US";
    return new Date(iso).toLocaleDateString(intlLocale, {
      day:   "2-digit",
      month: "2-digit",
      year:  "numeric",
    });
  }

  const typeLabel = (): string => {
    const map: Record<CommunicationType, string> = {
      NOTE:    t("activity.typeNote"),
      CALL:    t("activity.typeCall"),
      MEETING: t("activity.typeMeeting"),
      EMAIL:   t("activity.typeEmail"),
    };
    return map[entry.type];
  };

  return (
    <div className="relative flex gap-3">
      {/* Vertical connector (shown via CSS in parent) */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full mt-0.5",
          cfg.bg,
        )}
      >
        <cfg.Icon className={cn("h-4 w-4", cfg.color)} />
      </div>

      <div className="flex-1 pb-4">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xs font-semibold text-foreground">
            {entry.author.name}
          </span>
          <span className={cn("text-xs font-medium", cfg.color)}>
            {typeLabel()}
          </span>
          <span className="text-xs text-muted-foreground ms-auto flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" />
            {relativeTime(entry.createdAt)}
          </span>
        </div>
        <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
          {entry.content}
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CommsClient({ entity, initialEntries }: Props) {
  const [entries, setEntries] = useState<CommEntry[]>(initialEntries);
  const [showForm, setShowForm] = useState(false);
  const t      = useTranslations("clients");
  const locale = useLocale();
  const dir    = locale === "he" ? "rtl" : "ltr";

  function handleAdded(entry: CommEntry) {
    setEntries((prev) => [entry, ...prev]);
    setShowForm(false);
  }

  return (
    <div className="space-y-6 max-w-2xl" dir={dir}>
      {/* Header + quick-open */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">{t("activity.title")}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {entries.length > 0
              ? t("activity.count", { n: entries.length })
              : t("activity.noRecordsYet")}
          </p>
        </div>
        {!showForm && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-sm"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("activity.logBtn")}
          </Button>
        )}
      </div>

      {/* Inline form */}
      {showForm && (
        <LogForm
          entity={entity}
          onAdded={handleAdded}
        />
      )}

      {/* Timeline */}
      {entries.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 mb-3">
            <Phone className="h-7 w-7 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">{t("activity.noRecordsEmpty")}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("activity.noRecordsEmptyHint")}
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Connecting line */}
          {entries.length > 1 && (
            <div
              className="absolute right-[15px] top-8 bottom-0 w-px bg-border"
              aria-hidden="true"
            />
          )}
          <div className="space-y-1">
            {entries.map((entry) => (
              <TimelineEntry key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
