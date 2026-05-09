"use client";

import { useState, useTransition } from "react";
import { Clock, Receipt, ClipboardList, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { createTimeEntry, createExpense, createDailyLog } from "@/actions/field";

type Project = { id: string; name: string };
type Employee = { id: string; name: string; hourlyRate: number };

type Props = {
  projects: Project[];
  employees: Employee[];
};

const EXPENSE_CATEGORIES = [
  { value: "MATERIALS", label: "חומרי בניין" },
  { value: "FUEL", label: "דלק" },
  { value: "TOOLS", label: "כלים" },
  { value: "MEALS", label: "אוכל" },
  { value: "TRANSPORT", label: "תחבורה" },
  { value: "OTHER", label: "אחר" },
];

const WEATHER_OPTIONS = ["שמשי", "מעונן", "גשום", "סופה", "ערפל", "חם מאוד"];

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function FeedbackBanner({
  type,
  message,
}: {
  type: "success" | "error";
  message: string;
}) {
  const isSuccess = type === "success";
  return (
    <div
      className={`flex items-center gap-2 rounded-xl p-3.5 text-sm border ${
        isSuccess
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-red-50 text-red-700 border-red-200"
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0" />
      )}
      {message}
    </div>
  );
}

export function FieldPageClient({ projects, employees }: Props) {
  const [openSheet, setOpenSheet] = useState<"time" | "expense" | "daily" | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  // ─── Form state ────────────────────────────────────────────────────────────
  const [timeForm, setTimeForm] = useState({
    projectId: "",
    employeeId: "",
    date: todayISO(),
    hours: "",
    hourlyRate: "",
    description: "",
  });

  const [expenseForm, setExpenseForm] = useState({
    projectId: "",
    date: todayISO(),
    amount: "",
    category: "OTHER",
    description: "",
    receiptUrl: "",
  });

  const [dailyForm, setDailyForm] = useState({
    projectId: "",
    date: todayISO(),
    weatherConditions: "",
    visitors: "",
    safetyIncidents: "",
    notes: "",
  });

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function showFeedback(type: "success" | "error", message: string) {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  }

  function handleEmployeeChange(employeeId: string) {
    const emp = employees.find((e) => e.id === employeeId);
    setTimeForm((f) => ({
      ...f,
      employeeId,
      hourlyRate: emp ? String(emp.hourlyRate) : f.hourlyRate,
    }));
  }

  // ─── Submit handlers ────────────────────────────────────────────────────────
  function submitTimeEntry() {
    if (!timeForm.projectId || !timeForm.employeeId || !timeForm.hours) return;
    startTransition(async () => {
      const res = await createTimeEntry({
        projectId: timeForm.projectId,
        employeeId: timeForm.employeeId,
        date: timeForm.date,
        hours: parseFloat(timeForm.hours),
        hourlyRate: parseFloat(timeForm.hourlyRate) || 0,
        description: timeForm.description || undefined,
      });
      if (res.success) {
        showFeedback("success", "דיווח השעות נשמר בהצלחה!");
        setOpenSheet(null);
        setTimeForm({
          projectId: "",
          employeeId: "",
          date: todayISO(),
          hours: "",
          hourlyRate: "",
          description: "",
        });
      }
    });
  }

  function submitExpense() {
    if (!expenseForm.projectId || !expenseForm.amount) return;
    startTransition(async () => {
      const res = await createExpense({
        projectId: expenseForm.projectId,
        date: expenseForm.date,
        amount: parseFloat(expenseForm.amount),
        category: expenseForm.category,
        description: expenseForm.description || undefined,
        receiptUrl: expenseForm.receiptUrl || undefined,
      });
      if (res.success) {
        showFeedback("success", "ההוצאה נשמרה בהצלחה!");
        setOpenSheet(null);
        setExpenseForm({
          projectId: "",
          date: todayISO(),
          amount: "",
          category: "OTHER",
          description: "",
          receiptUrl: "",
        });
      }
    });
  }

  function submitDailyLog() {
    if (!dailyForm.projectId) return;
    startTransition(async () => {
      const res = await createDailyLog({
        projectId: dailyForm.projectId,
        date: dailyForm.date,
        weatherConditions: dailyForm.weatherConditions || undefined,
        visitors: dailyForm.visitors || undefined,
        safetyIncidents: dailyForm.safetyIncidents || undefined,
        notes: dailyForm.notes || undefined,
      });
      if (res.success) {
        showFeedback("success", "יומן העבודה נשמר בהצלחה!");
        setOpenSheet(null);
        setDailyForm({
          projectId: "",
          date: todayISO(),
          weatherConditions: "",
          visitors: "",
          safetyIncidents: "",
          notes: "",
        });
      } else {
        showFeedback("error", res.error ?? "שגיאה בשמירת היומן");
        setOpenSheet(null);
      }
    });
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  const noProjects = projects.length === 0;
  const noEmployees = employees.length === 0;

  const cards = [
    {
      type: "time" as const,
      icon: Clock,
      label: "דיווח שעות",
      description: "תעד שעות עבודה בפרויקט",
      iconBg: "bg-emerald-500",
      labelColor: "text-emerald-700",
      borderColor: "border-emerald-200",
      hoverBg: "hover:bg-emerald-50/60",
      disabled: noProjects || noEmployees,
      disabledHint: noEmployees ? "יש להוסיף עובדים תחילה" : undefined,
    },
    {
      type: "expense" as const,
      icon: Receipt,
      label: "הוצאת שטח",
      description: "רשום קנייה, דלק או הוצאה",
      iconBg: "bg-blue-500",
      labelColor: "text-blue-700",
      borderColor: "border-blue-200",
      hoverBg: "hover:bg-blue-50/60",
      disabled: noProjects,
      disabledHint: undefined,
    },
    {
      type: "daily" as const,
      icon: ClipboardList,
      label: "יומן יומי",
      description: "פתח יומן עבודה לאתר",
      iconBg: "bg-orange-500",
      labelColor: "text-orange-700",
      borderColor: "border-orange-200",
      hoverBg: "hover:bg-orange-50/60",
      disabled: noProjects,
      disabledHint: undefined,
    },
  ] as const;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">דיווחים מהשטח</h1>
        <p className="text-sm text-muted-foreground mt-1">
          טפסי דיווח מהיר לעובדי שטח
        </p>
      </div>

      {feedback && (
        <FeedbackBanner type={feedback.type} message={feedback.message} />
      )}

      {noProjects && (
        <FeedbackBanner
          type="error"
          message="אין פרויקטים פעילים. צור פרויקט תחילה."
        />
      )}

      {/* Action cards */}
      <div className="space-y-3">
        {cards.map(
          ({
            type,
            icon: Icon,
            label,
            description,
            iconBg,
            labelColor,
            borderColor,
            hoverBg,
            disabled,
            disabledHint,
          }) => (
            <button
              key={type}
              onClick={() => {
                setFeedback(null);
                setOpenSheet(type);
              }}
              disabled={disabled}
              className={`w-full flex items-center gap-4 p-5 rounded-2xl border ${borderColor} bg-white ${hoverBg} transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-start`}
            >
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${iconBg}`}
              >
                <Icon className="h-7 w-7 text-white" />
              </div>
              <div className="min-w-0">
                <p className={`text-lg font-bold leading-none ${labelColor}`}>
                  {label}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {description}
                </p>
                {disabledHint && (
                  <p className="text-xs text-red-500 mt-0.5">{disabledHint}</p>
                )}
              </div>
            </button>
          )
        )}
      </div>

      {/* ── Time Entry Sheet ─────────────────────────────────────────────────── */}
      <Sheet
        open={openSheet === "time"}
        onOpenChange={(o) => !o && setOpenSheet(null)}
      >
        <SheetContent
          side="bottom"
          className="h-auto max-h-[92dvh] overflow-y-auto rounded-t-2xl"
        >
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle className="flex items-center gap-2 text-emerald-700">
              <Clock className="h-5 w-5" />
              דיווח שעות עבודה
            </SheetTitle>
          </SheetHeader>

          <div className="px-4 pb-6 space-y-4">
            <div className="space-y-1.5">
              <Label>פרויקט *</Label>
              <Select
                value={timeForm.projectId}
                onValueChange={(v) =>
                  setTimeForm((f) => ({ ...f, projectId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר פרויקט" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>עובד *</Label>
              <Select
                value={timeForm.employeeId}
                onValueChange={handleEmployeeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר עובד" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>תאריך *</Label>
                <Input
                  type="date"
                  value={timeForm.date}
                  onChange={(e) =>
                    setTimeForm((f) => ({ ...f, date: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>שעות *</Label>
                <Input
                  type="number"
                  min="0.5"
                  max="24"
                  step="0.5"
                  placeholder="8"
                  value={timeForm.hours}
                  onChange={(e) =>
                    setTimeForm((f) => ({ ...f, hours: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>תעריף שעה (₪)</Label>
              <Input
                type="number"
                min="0"
                placeholder="ממולא מהפרופיל"
                value={timeForm.hourlyRate}
                onChange={(e) =>
                  setTimeForm((f) => ({ ...f, hourlyRate: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>תיאור (אופציונלי)</Label>
              <Input
                placeholder="סוג עבודה, הערות..."
                value={timeForm.description}
                onChange={(e) =>
                  setTimeForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>

            {timeForm.hours && timeForm.hourlyRate && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center">
                <p className="text-sm font-semibold text-emerald-700">
                  עלות משוערת: ₪
                  {(
                    parseFloat(timeForm.hours) *
                    parseFloat(timeForm.hourlyRate)
                  ).toLocaleString("he-IL", { maximumFractionDigits: 0 })}
                </p>
              </div>
            )}

            <Button
              className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700"
              disabled={
                !timeForm.projectId ||
                !timeForm.employeeId ||
                !timeForm.hours ||
                isPending
              }
              onClick={submitTimeEntry}
            >
              {isPending ? "שומר..." : "שמור דיווח שעות"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Expense Sheet ────────────────────────────────────────────────────── */}
      <Sheet
        open={openSheet === "expense"}
        onOpenChange={(o) => !o && setOpenSheet(null)}
      >
        <SheetContent
          side="bottom"
          className="h-auto max-h-[92dvh] overflow-y-auto rounded-t-2xl"
        >
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle className="flex items-center gap-2 text-blue-700">
              <Receipt className="h-5 w-5" />
              הוצאת שטח
            </SheetTitle>
          </SheetHeader>

          <div className="px-4 pb-6 space-y-4">
            <div className="space-y-1.5">
              <Label>פרויקט *</Label>
              <Select
                value={expenseForm.projectId}
                onValueChange={(v) =>
                  setExpenseForm((f) => ({ ...f, projectId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר פרויקט" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>תאריך *</Label>
                <Input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) =>
                    setExpenseForm((f) => ({ ...f, date: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>סכום (₪) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={expenseForm.amount}
                  onChange={(e) =>
                    setExpenseForm((f) => ({ ...f, amount: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>קטגוריה *</Label>
              <Select
                value={expenseForm.category}
                onValueChange={(v) =>
                  setExpenseForm((f) => ({ ...f, category: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>תיאור (אופציונלי)</Label>
              <Input
                placeholder="פרט את ההוצאה..."
                value={expenseForm.description}
                onChange={(e) =>
                  setExpenseForm((f) => ({
                    ...f,
                    description: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>קישור לקבלה (אופציונלי)</Label>
              <Input
                placeholder="https://... או מספר קבלה"
                value={expenseForm.receiptUrl}
                onChange={(e) =>
                  setExpenseForm((f) => ({
                    ...f,
                    receiptUrl: e.target.value,
                  }))
                }
              />
            </div>

            <Button
              className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700"
              disabled={
                !expenseForm.projectId || !expenseForm.amount || isPending
              }
              onClick={submitExpense}
            >
              {isPending ? "שומר..." : "שמור הוצאה"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Daily Log Sheet ──────────────────────────────────────────────────── */}
      <Sheet
        open={openSheet === "daily"}
        onOpenChange={(o) => !o && setOpenSheet(null)}
      >
        <SheetContent
          side="bottom"
          className="h-auto max-h-[92dvh] overflow-y-auto rounded-t-2xl"
        >
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle className="flex items-center gap-2 text-orange-700">
              <ClipboardList className="h-5 w-5" />
              יומן עבודה יומי
            </SheetTitle>
          </SheetHeader>

          <div className="px-4 pb-6 space-y-4">
            <div className="space-y-1.5">
              <Label>פרויקט *</Label>
              <Select
                value={dailyForm.projectId}
                onValueChange={(v) =>
                  setDailyForm((f) => ({ ...f, projectId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר פרויקט" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>תאריך *</Label>
              <Input
                type="date"
                value={dailyForm.date}
                onChange={(e) =>
                  setDailyForm((f) => ({ ...f, date: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>תנאי מזג אוויר</Label>
              <Select
                value={dailyForm.weatherConditions}
                onValueChange={(v) =>
                  setDailyForm((f) => ({ ...f, weatherConditions: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר מזג אוויר" />
                </SelectTrigger>
                <SelectContent>
                  {WEATHER_OPTIONS.map((w) => (
                    <SelectItem key={w} value={w}>
                      {w}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>מבקרים / גורמים חיצוניים</Label>
              <Input
                placeholder="פקח בטיחות, מהנדס עירייה..."
                value={dailyForm.visitors}
                onChange={(e) =>
                  setDailyForm((f) => ({ ...f, visitors: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>אירועי בטיחות</Label>
              <Input
                placeholder="לא היו / תיאור האירוע..."
                value={dailyForm.safetyIncidents}
                onChange={(e) =>
                  setDailyForm((f) => ({
                    ...f,
                    safetyIncidents: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>הערות כלליות</Label>
              <Textarea
                placeholder="תיאור העבודה שבוצעה, בעיות שעלו..."
                className="resize-none"
                rows={3}
                value={dailyForm.notes}
                onChange={(e) =>
                  setDailyForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </div>

            <Button
              className="w-full h-12 text-base bg-orange-600 hover:bg-orange-700"
              disabled={!dailyForm.projectId || isPending}
              onClick={submitDailyLog}
            >
              {isPending ? "שומר..." : "שמור יומן"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
