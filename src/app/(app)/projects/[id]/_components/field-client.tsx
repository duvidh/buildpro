"use client";

import { useCurrency } from "@/lib/currency-context";
import { useState, useTransition, useRef } from "react";
import {
  Clock,
  Receipt,
  ClipboardList,
  Plus,
  ChevronDown,
  ChevronUp,
  Camera,
  CloudSun,
  Users,
  AlertTriangle,
  FileText,
  Check,
  X,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fmtDate } from "@/lib/utils";
import { createDailyLog, updateDailyLog, createTimeEntry, createExpense } from "@/actions/field";
import { uploadProjectFile } from "@/actions/files";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type Member = {
  id: string;
  user: { id: string; name: string };
};

type Employee = {
  id: string;
  name: string;
  hourlyRate: number;
};

type TimeEntry = {
  id: string;
  date: string;
  hours: number;
  hourlyRate: number;
  totalCost: number;
  description: string | null;
  employee: { id: string; name: string };
};

type ExpenseEntry = {
  id: string;
  date: string;
  amount: number;
  category: string;
  description: string | null;
  employee: { id: string; name: string } | null;
};

type DailyLog = {
  id: string;
  date: string;
  weatherConditions: string | null;
  visitors: string | null;
  safetyIncidents: string | null;
  notes: string | null;
  supervisor: { id: string; name: string } | null;
};

export type FieldData = {
  projectId: string;
  timeEntries: TimeEntry[];
  expenses: ExpenseEntry[];
  dailyLogs: DailyLog[];
  members: Member[];
  employees: Employee[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = [
  { value: "MATERIALS", label: "חומרי בניין" },
  { value: "FUEL",      label: "דלק" },
  { value: "TOOLS",     label: "כלים" },
  { value: "MEALS",     label: "אוכל" },
  { value: "TRANSPORT", label: "תחבורה" },
  { value: "OTHER",     label: "אחר" },
] as const;

const EXPENSE_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  EXPENSE_CATEGORIES.map(({ value, label }) => [value, label])
);

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Mock weather suggestions based on Hebrew month */
function mockWeatherSuggestions(): string[] {
  const month = new Date().getMonth(); // 0-indexed
  if (month >= 5 && month <= 8)
    return ["☀️ חם וצח, ~32°C", "🌡 חם מאוד, ~36°C", "⛅ חם עם עננים, ~30°C"];
  if (month === 9 || month === 10)
    return ["🌤 מעונן חלקית, ~22°C", "⛅ מעונן, ~18°C", "🌧 גשום, ~16°C"];
  if (month === 11 || month <= 1)
    return ["🌧 גשום וקר, ~12°C", "🌦 גשמים קלים, ~14°C", "☁️ מעונן, ~10°C"];
  return ["🌸 נעים ומתון, ~20°C", "☀️ שמשי, ~24°C", "🌤 חצי מעונן, ~18°C"];
}

// ─── Inline Daily-Log Form ─────────────────────────────────────────────────────

interface LogFormProps {
  projectId: string;
  members: Member[];
  existing?: DailyLog; // if set → edit mode
  defaultDate?: string;
  onDone: (log: DailyLog) => void;
  onCancel?: () => void;
}

function LogForm({ projectId, members, existing, defaultDate, onDone, onCancel }: LogFormProps) {
  const [date, setDate] = useState(existing?.date?.slice(0, 10) ?? defaultDate ?? todayIso());
  const [weather, setWeather] = useState(existing?.weatherConditions ?? "");
  const [showWeatherPicker, setShowWeatherPicker] = useState(false);
  const [safetyIncidents, setSafetyIncidents] = useState(existing?.safetyIncidents ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");

  // Attendance: map userId → checked
  const initialAttendance = () => {
    if (!existing?.visitors) return {} as Record<string, boolean>;
    const names = existing.visitors.split(",").map((s) => s.trim());
    const map: Record<string, boolean> = {};
    members.forEach((m) => {
      if (names.includes(m.user.name)) map[m.user.id] = true;
    });
    return map;
  };
  const [attendance, setAttendance] = useState<Record<string, boolean>>(initialAttendance);

  const photoRef = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const weatherOptions = mockWeatherSuggestions();

  const attendeeNames = members
    .filter((m) => attendance[m.user.id])
    .map((m) => m.user.name)
    .join(", ");

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", "PHOTOS");
      const result = await uploadProjectFile(projectId, fd);
      if (result.success) {
        toast.success("תמונה הועלתה בהצלחה");
      } else {
        toast.error("שגיאה בהעלאת תמונה");
      }
    } catch {
      toast.error("שגיאה בהעלאת תמונה");
    } finally {
      setPhotoUploading(false);
      if (photoRef.current) photoRef.current.value = "";
    }
  }

  function handleSubmit() {
    startTransition(async () => {
      const payload = {
        weatherConditions: weather || undefined,
        visitors: attendeeNames || undefined,
        safetyIncidents: safetyIncidents || undefined,
        notes: notes || undefined,
      };

      if (existing) {
        const result = await updateDailyLog(existing.id, projectId, payload);
        if (!result.success) {
          toast.error((result as { error?: string }).error ?? "שגיאה בעדכון יומן");
          return;
        }
        toast.success("יומן עודכן בהצלחה");
        onDone({
          ...existing,
          weatherConditions: weather || null,
          visitors: attendeeNames || null,
          safetyIncidents: safetyIncidents || null,
          notes: notes || null,
        });
      } else {
        const result = await createDailyLog({ projectId, date, ...payload });
        if (!result.success) {
          toast.error((result as { error?: string }).error ?? "שגיאה ביצירת יומן");
          return;
        }
        toast.success("יומן נוצר בהצלחה");
        // Use the real record returned from the server (has real id + serialised date)
        const created = result.log;
        onDone({
          id: created.id,
          date: typeof created.date === "string" ? created.date : created.date.toISOString(),
          weatherConditions: created.weatherConditions,
          visitors: created.visitors,
          safetyIncidents: created.safetyIncidents,
          notes: created.notes,
          supervisor: created.supervisor,
        });
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-4">
      {/* Date row */}
      {!existing && (
        <div className="flex items-center gap-3">
          <Label className="text-xs text-muted-foreground w-16 shrink-0">תאריך</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-8 text-sm max-w-[160px]"
            dir="ltr"
          />
        </div>
      )}

      {/* Weather row */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <CloudSun className="h-3.5 w-3.5" />
          תנאי מזג אויר
        </Label>
        <div className="flex gap-2">
          <Input
            value={weather}
            onChange={(e) => setWeather(e.target.value)}
            placeholder="לדוגמה: ☀️ שמשי, 28°C"
            className="h-8 text-sm flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 text-xs"
            onClick={() => setShowWeatherPicker((v) => !v)}
          >
            מלא אוטומטי
          </Button>
        </div>
        {showWeatherPicker && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {weatherOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  setWeather(opt);
                  setShowWeatherPicker(false);
                }}
                className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs hover:bg-muted transition-colors"
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Attendance */}
      {members.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            נוכחות ({members.filter((m) => attendance[m.user.id]).length}/{members.length})
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
            {members.map((m) => (
              <div key={m.user.id} className="flex items-center gap-2">
                <Switch
                  id={`att-${m.user.id}`}
                  checked={!!attendance[m.user.id]}
                  onCheckedChange={(checked) =>
                    setAttendance((prev) => ({ ...prev, [m.user.id]: checked }))
                  }
                />
                <Label
                  htmlFor={`att-${m.user.id}`}
                  className="text-sm cursor-pointer leading-none"
                >
                  {m.user.name}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Safety incidents */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" />
          אירועי בטיחות
        </Label>
        <Input
          value={safetyIncidents}
          onChange={(e) => setSafetyIncidents(e.target.value)}
          placeholder="תאר אירועים (אם לא היו — השאר ריק)"
          className="h-8 text-sm"
        />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          הערות
        </Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="רשום הערות לסיום יום העבודה..."
          rows={3}
          className="text-sm resize-none"
        />
      </div>

      {/* Photo upload */}
      <div className="flex items-center gap-2">
        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePhotoChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          disabled={photoUploading}
          onClick={() => photoRef.current?.click()}
        >
          <Camera className="h-3.5 w-3.5" />
          {photoUploading ? "מעלה..." : "צלם תמונה"}
        </Button>
        <span className="text-xs text-muted-foreground">תמונות יישמרו בלשונית קבצים</span>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-sm"
            onClick={onCancel}
          >
            <X className="h-3.5 w-3.5 ml-1" />
            ביטול
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          className="h-8 text-sm"
          disabled={isPending}
          onClick={handleSubmit}
        >
          <Check className="h-3.5 w-3.5 ml-1" />
          {isPending ? "שומר..." : existing ? "עדכן יומן" : "צור יומן"}
        </Button>
      </div>
    </div>
  );
}

// ─── Past Log Card ─────────────────────────────────────────────────────────────

function LogCard({
  log,
  projectId,
  members,
  onUpdated,
}: {
  log: DailyLog;
  projectId: string;
  members: Member[];
  onUpdated: (updated: DailyLog) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);

  const attendanceCount = log.visitors
    ? log.visitors.split(",").filter(Boolean).length
    : 0;

  if (editing) {
    return (
      <LogForm
        projectId={projectId}
        members={members}
        existing={log}
        onDone={(updated) => {
          onUpdated({ ...log, ...updated });
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header row — always visible */}
      <button
        type="button"
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-start"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-medium text-sm shrink-0">{fmtDate(log.date)}</span>
          {log.weatherConditions && (
            <Badge variant="outline" className="text-xs hidden sm:inline-flex">
              {log.weatherConditions}
            </Badge>
          )}
          {attendanceCount > 0 && (
            <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
              <Users className="h-3 w-3" />
              {attendanceCount}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Expandable body */}
      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-2.5">
          {log.weatherConditions && (
            <div className="flex gap-2 text-sm">
              <CloudSun className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <span>{log.weatherConditions}</span>
            </div>
          )}
          {log.visitors && (
            <div className="flex gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <span>{log.visitors}</span>
            </div>
          )}
          {log.safetyIncidents && (
            <div className="flex gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <span>{log.safetyIncidents}</span>
            </div>
          )}
          {log.notes && (
            <div className="flex gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-muted-foreground whitespace-pre-line">{log.notes}</p>
            </div>
          )}
          {!log.weatherConditions && !log.visitors && !log.safetyIncidents && !log.notes && (
            <p className="text-xs text-muted-foreground">אין פרטים נוספים ליומן זה.</p>
          )}
          <div className="flex justify-end pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-3 w-3" />
              ערוך יומן
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Inline Time-Entry Form ───────────────────────────────────────────────────

function TimeEntryForm({
  projectId,
  employees,
  onDone,
  onCancel,
}: {
  projectId: string;
  employees: Employee[];
  onDone: (entry: TimeEntry) => void;
  onCancel: () => void;
}) {
  const { fmtCompact } = useCurrency();
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate]             = useState(todayIso());
  const [hours, setHours]           = useState("");
  const [rate, setRate]             = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTx]        = useTransition();

  // Auto-fill rate from employee record
  function handleEmployeeChange(id: string) {
    setEmployeeId(id);
    const emp = employees.find((e) => e.id === id);
    if (emp && emp.hourlyRate > 0) setRate(String(emp.hourlyRate));
  }

  function handleSubmit() {
    if (!employeeId)                { toast.error("נא לבחור עובד");          return; }
    if (!date)                      { toast.error("נא לבחור תאריך");         return; }
    const h = parseFloat(hours);
    const r = parseFloat(rate);
    if (!h || h <= 0)               { toast.error("נא להזין מספר שעות");    return; }
    if (!r || r <= 0)               { toast.error("נא להזין תעריף לשעה");   return; }

    startTx(async () => {
      const res = await createTimeEntry({
        projectId,
        employeeId,
        date,
        hours: h,
        hourlyRate: r,
        description: description || undefined,
      });
      if (!res.success) { toast.error("שגיאה בשמירת שעות עבודה"); return; }
      toast.success("שעות עבודה נוספו");
      const emp = employees.find((e) => e.id === employeeId)!;
      onDone({
        id: Date.now().toString(), // optimistic — list will refresh from server on next load
        date,
        hours: h,
        hourlyRate: r,
        totalCost: Math.round(h * r * 100) / 100,
        description: description || null,
        employee: { id: emp.id, name: emp.name },
      });
    });
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/40 dark:bg-blue-950/20 dark:border-blue-900 p-4 space-y-3">
      <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">הוסף שעות עבודה</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Employee */}
        <div className="space-y-1">
          <Label className="text-xs">עובד *</Label>
          {employees.length === 0 ? (
            <p className="text-xs text-muted-foreground py-1">אין עובדים רשומים במערכת</p>
          ) : (
            <Select value={employeeId} onValueChange={handleEmployeeChange}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="בחר עובד" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Date */}
        <div className="space-y-1">
          <Label className="text-xs">תאריך *</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-8 text-sm"
            dir="ltr"
          />
        </div>

        {/* Hours */}
        <div className="space-y-1">
          <Label className="text-xs">מספר שעות *</Label>
          <Input
            type="number"
            min="0.5"
            step="0.5"
            placeholder="8"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="h-8 text-sm"
            dir="ltr"
          />
        </div>

        {/* Hourly rate */}
        <div className="space-y-1">
          <Label className="text-xs">תעריף לשעה *</Label>
          <Input
            type="number"
            min="1"
            step="5"
            placeholder="50"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="h-8 text-sm"
            dir="ltr"
          />
        </div>
      </div>

      {/* Cost preview */}
      {parseFloat(hours) > 0 && parseFloat(rate) > 0 && (
        <p className="text-xs text-muted-foreground">
          עלות: {fmtCompact(parseFloat(hours) * parseFloat(rate))}
        </p>
      )}

      {/* Description */}
      <div className="space-y-1">
        <Label className="text-xs">תיאור (אופציונלי)</Label>
        <Input
          placeholder="תיאור קצר של העבודה..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onCancel}>
          <X className="h-3 w-3 ml-1" />
          ביטול
        </Button>
        <Button size="sm" className="h-7 text-xs" disabled={isPending} onClick={handleSubmit}>
          <Check className="h-3 w-3 ml-1" />
          {isPending ? "שומר..." : "הוסף שעות"}
        </Button>
      </div>
    </div>
  );
}

// ─── Inline Expense Form ──────────────────────────────────────────────────────

function ExpenseForm({
  projectId,
  onDone,
  onCancel,
}: {
  projectId: string;
  onDone: (entry: ExpenseEntry) => void;
  onCancel: () => void;
}) {
  const [date, setDate]         = useState(todayIso());
  const [amount, setAmount]     = useState("");
  const [category, setCategory] = useState<string>("");
  const [description, setDescription] = useState("");
  const [isPending, startTx]    = useTransition();

  function handleSubmit() {
    if (!date)                      { toast.error("נא לבחור תאריך");         return; }
    const a = parseFloat(amount);
    if (!a || a <= 0)               { toast.error("נא להזין סכום תקין");    return; }
    if (!category)                  { toast.error("נא לבחור קטגוריה");       return; }

    startTx(async () => {
      const res = await createExpense({
        projectId,
        date,
        amount: a,
        category,
        description: description || undefined,
      });
      if (!res.success) { toast.error("שגיאה בשמירת הוצאה"); return; }
      toast.success("הוצאה נוספה");
      onDone({
        id: Date.now().toString(),
        date,
        amount: a,
        category,
        description: description || null,
        employee: null,
      });
    });
  }

  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50/40 dark:bg-orange-950/20 dark:border-orange-900 p-4 space-y-3">
      <p className="text-xs font-semibold text-orange-700 dark:text-orange-400">הוסף הוצאת שטח</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Date */}
        <div className="space-y-1">
          <Label className="text-xs">תאריך *</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-8 text-sm"
            dir="ltr"
          />
        </div>

        {/* Amount */}
        <div className="space-y-1">
          <Label className="text-xs">סכום *</Label>
          <Input
            type="number"
            min="0"
            step="10"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-8 text-sm"
            dir="ltr"
          />
        </div>

        {/* Category */}
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">קטגוריה *</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="בחר קטגוריה" />
            </SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORIES.map(({ value, label }) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1">
        <Label className="text-xs">תיאור (אופציונלי)</Label>
        <Input
          placeholder="פרטי ההוצאה..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onCancel}>
          <X className="h-3 w-3 ml-1" />
          ביטול
        </Button>
        <Button size="sm" className="h-7 text-xs" disabled={isPending} onClick={handleSubmit}>
          <Check className="h-3 w-3 ml-1" />
          {isPending ? "שומר..." : "הוסף הוצאה"}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Client ──────────────────────────────────────────────────────────────

export function FieldClient({ data }: { data: FieldData }) {
  const { fmtCompact } = useCurrency();
  const { projectId, members, employees } = data;

  const [logs, setLogs]           = useState<DailyLog[]>(data.dailyLogs);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(data.timeEntries);
  const [expenses, setExpenses]   = useState<ExpenseEntry[]>(data.expenses);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showTimeForm, setShowTimeForm]     = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  const today = todayIso();
  const todayLog = logs.find((l) => l.date?.slice(0, 10) === today);

  const totalHours    = timeEntries.reduce((s, e) => s + e.hours, 0);
  const totalCost     = timeEntries.reduce((s, e) => s + e.totalCost, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  function handleLogCreated(log: DailyLog) {
    setLogs((prev) => {
      const exists = prev.findIndex(
        (l) => l.id === log.id || l.date?.slice(0, 10) === log.date?.slice(0, 10)
      );
      if (exists >= 0) {
        const next = [...prev];
        next[exists] = log;
        return next;
      }
      return [log, ...prev];
    });
    setShowCreateForm(false);
  }

  function handleLogUpdated(updated: DailyLog) {
    setLogs((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }

  return (
    <div className="space-y-8" dir="rtl">

      {/* ── Today's Log Section ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            יומן היום
          </h3>
          {!showCreateForm && !todayLog && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-sm gap-1.5"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              צור יומן
            </Button>
          )}
        </div>

        {showCreateForm && !todayLog && (
          <LogForm
            projectId={projectId}
            members={members}
            defaultDate={today}
            onDone={handleLogCreated}
            onCancel={() => setShowCreateForm(false)}
          />
        )}

        {todayLog && (
          <LogCard
            log={todayLog}
            projectId={projectId}
            members={members}
            onUpdated={handleLogUpdated}
          />
        )}

        {!showCreateForm && !todayLog && (
          <p className="text-xs text-muted-foreground px-1">
            טרם נפתח יומן עבודה להיום.
          </p>
        )}
      </section>

      {/* ── Past Logs ── */}
      {logs.filter((l) => l.date?.slice(0, 10) !== today).length > 0 && (
        <section className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">יומנים קודמים</h4>
          {logs
            .filter((l) => l.date?.slice(0, 10) !== today)
            .map((log) => (
              <LogCard
                key={log.id}
                log={log}
                projectId={projectId}
                members={members}
                onUpdated={handleLogUpdated}
              />
            ))}
        </section>
      )}

      {/* ── Time Entries ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            שעות עבודה
          </h4>
          <div className="flex items-center gap-3">
            {timeEntries.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {totalHours.toLocaleString("he-IL", { maximumFractionDigits: 1 })} שעות ·{" "}
                {fmtCompact(totalCost)}
              </span>
            )}
            {!showTimeForm && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => setShowTimeForm(true)}
              >
                <Plus className="h-3 w-3" />
                הוסף שעות
              </Button>
            )}
          </div>
        </div>

        {showTimeForm && (
          <div className="mb-3">
            <TimeEntryForm
              projectId={projectId}
              employees={employees}
              onDone={(entry) => {
                setTimeEntries((prev) => [entry, ...prev]);
                setShowTimeForm(false);
              }}
              onCancel={() => setShowTimeForm(false)}
            />
          </div>
        )}

        {timeEntries.length === 0 && !showTimeForm ? (
          <p className="text-xs text-muted-foreground py-3 px-1">
            אין דיווחי שעות עדיין. לחץ &quot;הוסף שעות&quot; להוספה.
          </p>
        ) : timeEntries.length > 0 ? (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs">עובד</th>
                    <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs">תאריך</th>
                    <th className="text-end font-medium text-muted-foreground px-3 py-2 text-xs">שעות</th>
                    <th className="text-end font-medium text-muted-foreground px-3 py-2 text-xs">עלות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {timeEntries.map((e) => (
                    <tr key={e.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2.5">{e.employee.name}</td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs">{fmtDate(e.date)}</td>
                      <td className="px-3 py-2.5 text-end tabular-nums">{e.hours}</td>
                      <td className="px-3 py-2.5 text-end tabular-nums text-xs text-muted-foreground">
                        {fmtCompact(e.totalCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      {/* ── Expenses ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            <Receipt className="h-3.5 w-3.5" />
            הוצאות שטח
          </h4>
          <div className="flex items-center gap-3">
            {expenses.length > 0 && (
              <span className="text-xs text-muted-foreground">
                סה״כ {fmtCompact(totalExpenses)}
              </span>
            )}
            {!showExpenseForm && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => setShowExpenseForm(true)}
              >
                <Plus className="h-3 w-3" />
                הוסף הוצאה
              </Button>
            )}
          </div>
        </div>

        {showExpenseForm && (
          <div className="mb-3">
            <ExpenseForm
              projectId={projectId}
              onDone={(entry) => {
                setExpenses((prev) => [entry, ...prev]);
                setShowExpenseForm(false);
              }}
              onCancel={() => setShowExpenseForm(false)}
            />
          </div>
        )}

        {expenses.length === 0 && !showExpenseForm ? (
          <p className="text-xs text-muted-foreground py-3 px-1">
            אין הוצאות שטח עדיין. לחץ &quot;הוסף הוצאה&quot; להוספה.
          </p>
        ) : expenses.length > 0 ? (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs">תאריך</th>
                    <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs">קטגוריה</th>
                    <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs">תיאור</th>
                    <th className="text-end font-medium text-muted-foreground px-3 py-2 text-xs">סכום</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2.5 text-muted-foreground text-xs">{fmtDate(e.date)}</td>
                      <td className="px-3 py-2.5 text-xs">
                        {EXPENSE_CATEGORY_LABEL[e.category] ?? e.category}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs truncate max-w-[120px]">
                        {e.description ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-end tabular-nums font-medium">
                        {fmtCompact(e.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
