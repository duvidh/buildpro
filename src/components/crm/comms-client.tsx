"use client";

import { useState, useTransition, useRef } from "react";
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

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  CommunicationType,
  { label: string; Icon: React.ElementType; color: string; bg: string; ring: string }
> = {
  NOTE: {
    label: "הערה",
    Icon: FileText,
    color: "text-slate-600",
    bg: "bg-slate-100",
    ring: "ring-slate-200",
  },
  CALL: {
    label: "שיחה",
    Icon: Phone,
    color: "text-emerald-600",
    bg: "bg-emerald-100",
    ring: "ring-emerald-200",
  },
  MEETING: {
    label: "פגישה",
    Icon: Users,
    color: "text-blue-600",
    bg: "bg-blue-100",
    ring: "ring-blue-200",
  },
  EMAIL: {
    label: "אימייל",
    Icon: Mail,
    color: "text-violet-600",
    bg: "bg-violet-100",
    ring: "ring-violet-200",
  },
};

const TYPE_ORDER: CommunicationType[] = ["NOTE", "CALL", "MEETING", "EMAIL"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);

  if (mins  < 1)   return "עכשיו";
  if (mins  < 60)  return `לפני ${mins} דקות`;
  if (hours < 24)  return `לפני ${hours} שעות`;
  if (days  < 7)   return `לפני ${days} ימים`;

  return new Date(iso).toLocaleDateString("he-IL", {
    day:   "2-digit",
    month: "2-digit",
    year:  "numeric",
  });
}

// ─── Inline Log Form ──────────────────────────────────────────────────────────

function LogForm({
  entity,
  onAdded,
}: {
  entity: Props["entity"];
  onAdded: (entry: CommEntry) => void;
}) {
  const [type, setType]     = useState<CommunicationType>("NOTE");
  const [content, setContent] = useState("");
  const [isPending, start]  = useTransition();
  const textRef             = useRef<HTMLTextAreaElement>(null);

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
        toast.error((res as { error?: string }).error ?? "שגיאה");
        return;
      }

      // Optimistic entry (temp id, will be replaced on next server fetch)
      onAdded({
        id:        `tmp-${Date.now()}`,
        type,
        content:   content.trim(),
        createdAt: new Date().toISOString(),
        author:    { id: "", name: "אתה" },
      });

      setContent("");
      toast.success("נרשם בהצלחה");
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-3">
      {/* Type selector */}
      <div className="flex gap-1.5 flex-wrap">
        {TYPE_ORDER.map((t) => {
          const cfg = TYPE_CONFIG[t];
          const active = type === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                "border transition-all",
                active
                  ? `${cfg.bg} ${cfg.color} border-transparent ring-2 ${cfg.ring}`
                  : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
              )}
            >
              <cfg.Icon className="h-3 w-3" />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Content input */}
      <Textarea
        ref={textRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={
          type === "CALL"    ? "סיכום השיחה, על מה דיברתם..." :
          type === "MEETING" ? "על מה הוסכם, מה נדון..." :
          type === "EMAIL"   ? "נושא ותוכן האימייל..." :
                               "הערה כללית..."
        }
        rows={3}
        className="resize-none text-sm"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
        }}
        disabled={isPending}
      />

      {/* Submit row */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Ctrl+Enter לשמירה</p>
        <Button
          size="sm"
          className="h-8 gap-1.5 text-sm"
          onClick={handleSubmit}
          disabled={!content.trim() || isPending}
        >
          <Send className="h-3.5 w-3.5" />
          {isPending ? "שומר..." : "שמור רשומה"}
        </Button>
      </div>
    </div>
  );
}

// ─── Timeline Entry ───────────────────────────────────────────────────────────

function TimelineEntry({ entry }: { entry: CommEntry }) {
  const cfg = TYPE_CONFIG[entry.type];

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
            {cfg.label}
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

  function handleAdded(entry: CommEntry) {
    setEntries((prev) => [entry, ...prev]);
    setShowForm(false);
  }

  return (
    <div className="space-y-6 max-w-2xl" dir="rtl">
      {/* Header + quick-open */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">יומן פעילות</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {entries.length > 0
              ? `${entries.length} רשומות`
              : "טרם נרשמו אינטראקציות"}
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
            רשום אינטראקציה
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
          <p className="text-sm font-medium text-muted-foreground">אין רשומות פעילות</p>
          <p className="text-xs text-muted-foreground mt-1">
            לחץ &ldquo;רשום אינטראקציה&rdquo; כדי לתעד שיחה, פגישה או הערה
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
