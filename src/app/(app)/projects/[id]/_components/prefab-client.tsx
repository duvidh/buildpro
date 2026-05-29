"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Factory, Plus, ChevronRight, Trash2, Loader2,
  CalendarClock, Tag, Link2, ChevronUp,
  Package, Truck, CheckCircle2, Wrench, FlaskConical,
  ClipboardList, Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  createPrefabElement,
  updatePrefabElementStatus,
  deletePrefabElement,
} from "@/actions/prefab";
import { PREFAB_STATUSES } from "@/lib/prefab-config";
import type { PrefabStatus } from "@/generated/prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type Task = { id: string; name: string };

type PrefabElement = {
  id: string;
  projectId: string;
  taskId: string | null;
  name: string;
  elementType: string;
  status: PrefabStatus;
  productionStartDate: string | null;
  targetDeliveryDate: string | null;
  notes: string | null;
  task: { id: string; name: string } | null;
};

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  PrefabStatus,
  { label: string; color: string; bg: string; border: string; icon: React.ElementType }
> = {
  PLANNED:             { label: "מתוכנן",           color: "text-slate-600",   bg: "bg-slate-50",    border: "border-slate-200",  icon: ClipboardList },
  IN_PRODUCTION:       { label: "בייצור",            color: "text-blue-700",    bg: "bg-blue-50",     border: "border-blue-200",   icon: Factory },
  QUALITY_CHECK:       { label: "בדיקת איכות",       color: "text-violet-700",  bg: "bg-violet-50",   border: "border-violet-200", icon: FlaskConical },
  READY_FOR_DISPATCH:  { label: "מוכן למשלוח",       color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200",  icon: Package },
  SHIPPED:             { label: "נשלח",              color: "text-orange-700",  bg: "bg-orange-50",   border: "border-orange-200", icon: Send },
  DELIVERED:           { label: "נמסר לאתר",         color: "text-cyan-700",    bg: "bg-cyan-50",     border: "border-cyan-200",   icon: Truck },
  INSTALLED:           { label: "הותקן",             color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200",icon: CheckCircle2 },
};

const ELEMENT_TYPES = [
  "קיר בטון",
  "לוח רצפה",
  "קורה",
  "עמוד",
  "מדרגות",
  "מרפסת",
  "חיפוי חזית",
  "רכיב מבני",
  "אחר",
];

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit", month: "2-digit", year: "numeric",
  }).format(new Date(iso));
}

// ─── Add Form ─────────────────────────────────────────────────────────────────

function AddElementForm({
  projectId,
  tasks,
  onClose,
}: {
  projectId: string;
  tasks: Task[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [elementType, setElementType] = useState(ELEMENT_TYPES[0]);
  const [taskId, setTaskId] = useState<string>("none");

  const nameRef = useRef<HTMLInputElement>(null);
  const customTypeRef = useRef<HTMLInputElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  const deliveryDateRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = nameRef.current?.value.trim() ?? "";
    const type = elementType === "אחר" ? (customTypeRef.current?.value.trim() ?? "אחר") : elementType;
    if (!name) { toast.error("נדרש שם אלמנט"); return; }

    startTransition(async () => {
      const res = await createPrefabElement(projectId, {
        name,
        elementType: type,
        productionStartDate: startDateRef.current?.value || undefined,
        targetDeliveryDate: deliveryDateRef.current?.value || undefined,
        notes: notesRef.current?.value.trim() || undefined,
        taskId: taskId === "none" ? undefined : taskId,
      });
      if (res.success) {
        toast.success("אלמנט נוסף");
        onClose();
        router.refresh();
      } else {
        toast.error(res.error ?? "שגיאה בהוספה");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-primary/30 bg-primary/5 p-5 mb-6 shadow-sm"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <Plus className="h-4 w-4 text-primary" />
        אלמנט חדש
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Name */}
        <div className="sm:col-span-2">
          <Label className="text-xs mb-1 block">שם האלמנט *</Label>
          <Input ref={nameRef} placeholder='לדוג׳ "קיר A3 - קומה 2"' className="h-8 text-sm" required />
        </div>

        {/* Type */}
        <div>
          <Label className="text-xs mb-1 block">סוג</Label>
          <Select value={elementType} onValueChange={setElementType}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ELEMENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {elementType === "אחר" && (
          <div>
            <Label className="text-xs mb-1 block">תאר את הסוג</Label>
            <Input ref={customTypeRef} placeholder="סוג מותאם" className="h-8 text-sm" />
          </div>
        )}

        {/* Task link */}
        {tasks.length > 0 && (
          <div>
            <Label className="text-xs mb-1 block">קישור למשימה</Label>
            <Select value={taskId} onValueChange={setTaskId}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="ללא קישור" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ללא קישור</SelectItem>
                {tasks.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Dates */}
        <div>
          <Label className="text-xs mb-1 block">תאריך התחלת ייצור</Label>
          <Input ref={startDateRef} type="date" className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs mb-1 block">תאריך יעד למסירה</Label>
          <Input ref={deliveryDateRef} type="date" className="h-8 text-sm" />
        </div>

        {/* Notes */}
        <div className="sm:col-span-2">
          <Label className="text-xs mb-1 block">הערות</Label>
          <Textarea ref={notesRef} rows={2} placeholder="פרטים נוספים..." className="text-sm resize-none" />
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
          ביטול
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending && <Loader2 className="h-3.5 w-3.5 me-1.5 animate-spin" />}
          הוסף אלמנט
        </Button>
      </div>
    </form>
  );
}

// ─── Element Card ─────────────────────────────────────────────────────────────

function ElementCard({
  element,
  projectId,
}: {
  element: PrefabElement;
  projectId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const cfg = STATUS_CONFIG[element.status];
  const statusIdx = PREFAB_STATUSES.indexOf(element.status);
  const nextStatus = PREFAB_STATUSES[statusIdx + 1] as PrefabStatus | undefined;
  const nextCfg = nextStatus ? STATUS_CONFIG[nextStatus] : null;

  function handleAdvance() {
    if (!nextStatus) return;
    startTransition(async () => {
      const res = await updatePrefabElementStatus(element.id, nextStatus, projectId);
      if (res.success) {
        toast.success(`עבר ל${STATUS_CONFIG[nextStatus].label}`);
        router.refresh();
      } else {
        toast.error("שגיאה בעדכון סטטוס");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await deletePrefabElement(element.id, projectId);
      if (res.success) {
        toast.success("אלמנט נמחק");
        router.refresh();
      } else {
        toast.error("שגיאה במחיקה");
      }
    });
  }

  return (
    <div className={`rounded-xl border ${cfg.border} bg-white shadow-sm p-3 flex flex-col gap-2 group`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground leading-snug">{element.name}</p>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-destructive"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Type badge */}
      <Badge variant="outline" className={`text-[10px] w-fit ${cfg.color} border-current/30`}>
        <Tag className="h-2.5 w-2.5 me-1" />
        {element.elementType}
      </Badge>

      {/* Dates */}
      {element.targetDeliveryDate && (
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <CalendarClock className="h-3 w-3 shrink-0" />
          {formatDate(element.targetDeliveryDate)}
        </p>
      )}

      {/* Linked task */}
      {element.task && (
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
          <Link2 className="h-3 w-3 shrink-0" />
          {element.task.name}
        </p>
      )}

      {/* Notes */}
      {element.notes && (
        <p className="text-[11px] text-muted-foreground line-clamp-2">{element.notes}</p>
      )}

      {/* Advance button */}
      {nextStatus && nextCfg && (
        <button
          onClick={handleAdvance}
          disabled={isPending}
          className={`mt-1 flex items-center justify-center gap-1 rounded-lg border ${nextCfg.border} ${nextCfg.bg} ${nextCfg.color} text-[11px] font-medium py-1 px-2 hover:opacity-80 transition-opacity disabled:opacity-50`}
        >
          {isPending
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : <ChevronRight className="h-3 w-3" />}
          {nextCfg.label}
        </button>
      )}

      {element.status === "INSTALLED" && (
        <span className="mt-1 flex items-center justify-center gap-1 text-[11px] font-medium text-emerald-600">
          <CheckCircle2 className="h-3 w-3" />
          הושלם
        </span>
      )}
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  status,
  elements,
  projectId,
}: {
  status: PrefabStatus;
  elements: PrefabElement[];
  projectId: string;
}) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;

  return (
    <div className={`flex flex-col rounded-2xl border ${cfg.border} ${cfg.bg} min-w-[220px] w-[220px] shrink-0`}>
      {/* Column header */}
      <div className={`flex items-center gap-2 px-3 py-2.5 border-b ${cfg.border}`}>
        <Icon className={`h-4 w-4 ${cfg.color}`} />
        <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
        {elements.length > 0 && (
          <span className={`ms-auto text-[10px] font-medium ${cfg.color} opacity-70`}>
            {elements.length}
          </span>
        )}
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 p-2 flex-1">
        {elements.length === 0 && (
          <p className="text-[11px] text-muted-foreground/50 text-center py-6">ריק</p>
        )}
        {elements.map((el) => (
          <ElementCard key={el.id} element={el} projectId={projectId} />
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PrefabClient({
  projectId,
  elements,
  tasks,
}: {
  projectId: string;
  elements: PrefabElement[];
  tasks: Task[];
}) {
  const [showAddForm, setShowAddForm] = useState(false);

  const byStatus = PREFAB_STATUSES.reduce<Record<PrefabStatus, PrefabElement[]>>(
    (acc, s) => { acc[s] = []; return acc; },
    {} as Record<PrefabStatus, PrefabElement[]>
  );
  for (const el of elements) {
    byStatus[el.status].push(el);
  }

  const totalInstalled = byStatus["INSTALLED"].length;
  const totalActive = elements.length - totalInstalled;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Factory className="h-5 w-5 text-primary" />
            מעקב ייצור ופרפאב
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {elements.length === 0
              ? "אין אלמנטים עדיין"
              : `${elements.length} אלמנטים · ${totalActive} בתהליך · ${totalInstalled} הותקנו`}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowAddForm((v) => !v)}
          variant={showAddForm ? "outline" : "default"}
          className="gap-1.5"
        >
          {showAddForm
            ? <><ChevronUp className="h-4 w-4" /> סגור</>
            : <><Plus className="h-4 w-4" /> הוסף אלמנט</>}
        </Button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <AddElementForm
          projectId={projectId}
          tasks={tasks}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {/* Empty state */}
      {elements.length === 0 && !showAddForm && (
        <div className="rounded-2xl border border-border/50 bg-white/90 shadow-[0_4px_24px_rgb(0,0,0,0.04)] flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <Wrench className="h-7 w-7 text-primary" />
          </div>
          <p className="text-base font-semibold text-foreground">אין אלמנטים עדיין</p>
          <p className="text-sm text-muted-foreground mt-1 mb-5 max-w-xs">
            הוסף רכיבי פרפאב לפרויקט כדי לעקוב אחר תהליך הייצור מהמפעל עד ההתקנה.
          </p>
          <Button size="sm" onClick={() => setShowAddForm(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            הוסף אלמנט ראשון
          </Button>
        </div>
      )}

      {/* Kanban board */}
      {elements.length > 0 && (
        <div className="overflow-x-auto pb-4 -mx-4 sm:-mx-6 px-4 sm:px-6">
          <div className="flex gap-3 w-max">
            {PREFAB_STATUSES.map((status) => (
              <KanbanColumn
                key={status}
                status={status as PrefabStatus}
                elements={byStatus[status as PrefabStatus]}
                projectId={projectId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Progress summary bar */}
      {elements.length > 0 && (
        <div className="rounded-2xl border border-border/50 bg-white/90 shadow-sm p-4">
          <p className="text-xs font-medium text-muted-foreground mb-3">התפלגות סטטוסים</p>
          <div className="flex gap-2 flex-wrap">
            {PREFAB_STATUSES.map((status) => {
              const count = byStatus[status as PrefabStatus].length;
              if (count === 0) return null;
              const cfg = STATUS_CONFIG[status as PrefabStatus];
              const Icon = cfg.icon;
              return (
                <div
                  key={status}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 ${cfg.bg} border ${cfg.border}`}
                >
                  <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                  <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                  <span className={`text-xs font-bold ${cfg.color}`}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
