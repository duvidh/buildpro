"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
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

type Project  = { id: string; name: string };
type Employee = { id: string; name: string; hourlyRate: number };

type Props = {
  projects:  Project[];
  employees: Employee[];
};

const EXPENSE_CATEGORY_KEYS = [
  "MATERIALS", "FUEL", "TOOLS", "MEALS", "TRANSPORT", "OTHER",
] as const;

const WEATHER_KEYS = [
  "SUNNY", "CLOUDY", "RAINY", "STORM", "FOGGY", "VERY_HOT",
] as const;

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
  const t      = useTranslations("field");
  const locale = useLocale();
  const dateLocale = locale === "he" ? "he-IL" : "en-US";

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
        projectId:  timeForm.projectId,
        employeeId: timeForm.employeeId,
        date:       timeForm.date,
        hours:      parseFloat(timeForm.hours),
        hourlyRate: parseFloat(timeForm.hourlyRate) || 0,
        description: timeForm.description || undefined,
      });
      if (res.success) {
        showFeedback("success", t("time.toastSuccess"));
        setOpenSheet(null);
        setTimeForm({ projectId: "", employeeId: "", date: todayISO(), hours: "", hourlyRate: "", description: "" });
      }
    });
  }

  function submitExpense() {
    if (!expenseForm.projectId || !expenseForm.amount) return;
    startTransition(async () => {
      const res = await createExpense({
        projectId:   expenseForm.projectId,
        date:        expenseForm.date,
        amount:      parseFloat(expenseForm.amount),
        category:    expenseForm.category,
        description: expenseForm.description || undefined,
        receiptUrl:  expenseForm.receiptUrl   || undefined,
      });
      if (res.success) {
        showFeedback("success", t("expense.toastSuccess"));
        setOpenSheet(null);
        setExpenseForm({ projectId: "", date: todayISO(), amount: "", category: "OTHER", description: "", receiptUrl: "" });
      }
    });
  }

  function submitDailyLog() {
    if (!dailyForm.projectId) return;
    startTransition(async () => {
      const res = await createDailyLog({
        projectId:          dailyForm.projectId,
        date:               dailyForm.date,
        weatherConditions:  dailyForm.weatherConditions  || undefined,
        visitors:           dailyForm.visitors            || undefined,
        safetyIncidents:    dailyForm.safetyIncidents    || undefined,
        notes:              dailyForm.notes               || undefined,
      });
      if (res.success) {
        showFeedback("success", t("daily.toastSuccess"));
        setOpenSheet(null);
        setDailyForm({ projectId: "", date: todayISO(), weatherConditions: "", visitors: "", safetyIncidents: "", notes: "" });
      } else {
        showFeedback("error", res.error ?? t("daily.toastError"));
        setOpenSheet(null);
      }
    });
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  const noProjects  = projects.length === 0;
  const noEmployees = employees.length === 0;

  const cards = [
    {
      type:         "time" as const,
      icon:         Clock,
      labelKey:     "cards.time.label"     as const,
      descKey:      "cards.time.description" as const,
      iconBg:       "bg-emerald-500",
      labelColor:   "text-emerald-700",
      borderColor:  "border-emerald-200",
      hoverBg:      "hover:bg-emerald-50/60",
      disabled:     noProjects || noEmployees,
      disabledHint: noEmployees ? t("cards.time.disabledHint") : undefined,
    },
    {
      type:        "expense" as const,
      icon:        Receipt,
      labelKey:    "cards.expense.label"       as const,
      descKey:     "cards.expense.description" as const,
      iconBg:      "bg-blue-500",
      labelColor:  "text-blue-700",
      borderColor: "border-blue-200",
      hoverBg:     "hover:bg-blue-50/60",
      disabled:    noProjects,
      disabledHint: undefined,
    },
    {
      type:        "daily" as const,
      icon:        ClipboardList,
      labelKey:    "cards.daily.label"       as const,
      descKey:     "cards.daily.description" as const,
      iconBg:      "bg-orange-500",
      labelColor:  "text-orange-700",
      borderColor: "border-orange-200",
      hoverBg:     "hover:bg-orange-50/60",
      disabled:    noProjects,
      disabledHint: undefined,
    },
  ] as const;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      {feedback && (
        <FeedbackBanner type={feedback.type} message={feedback.message} />
      )}

      {noProjects && (
        <FeedbackBanner type="error" message={t("noProjects")} />
      )}

      {/* Action cards */}
      <div className="space-y-3">
        {cards.map(({ type, icon: Icon, labelKey, descKey, iconBg, labelColor, borderColor, hoverBg, disabled, disabledHint }) => (
          <button
            key={type}
            onClick={() => { setFeedback(null); setOpenSheet(type); }}
            disabled={disabled}
            className={`w-full flex items-center gap-4 p-5 rounded-2xl border ${borderColor} bg-white ${hoverBg} transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-start`}
          >
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${iconBg}`}>
              <Icon className="h-7 w-7 text-white" />
            </div>
            <div className="min-w-0">
              <p className={`text-lg font-bold leading-none ${labelColor}`}>{t(labelKey)}</p>
              <p className="text-sm text-muted-foreground mt-1">{t(descKey)}</p>
              {disabledHint && <p className="text-xs text-red-500 mt-0.5">{disabledHint}</p>}
            </div>
          </button>
        ))}
      </div>

      {/* ── Time Entry Sheet ─────────────────────────────────────────────────── */}
      <Sheet open={openSheet === "time"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <SheetContent side="bottom" className="h-auto max-h-[92dvh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle className="flex items-center gap-2 text-emerald-700">
              <Clock className="h-5 w-5" />
              {t("time.sheetTitle")}
            </SheetTitle>
          </SheetHeader>

          <div className="px-4 pb-6 space-y-4">
            <div className="space-y-1.5">
              <Label>{t("time.project")} *</Label>
              <Select value={timeForm.projectId} onValueChange={(v) => setTimeForm((f) => ({ ...f, projectId: v }))}>
                <SelectTrigger><SelectValue placeholder={t("selectProject")} /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t("time.employee")} *</Label>
              <Select value={timeForm.employeeId} onValueChange={handleEmployeeChange}>
                <SelectTrigger><SelectValue placeholder={t("selectEmployee")} /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("time.date")} *</Label>
                <Input type="date" value={timeForm.date} onChange={(e) => setTimeForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("time.hours")} *</Label>
                <Input type="number" min="0.5" max="24" step="0.5" placeholder="8" value={timeForm.hours}
                  onChange={(e) => setTimeForm((f) => ({ ...f, hours: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t("time.hourlyRate")}</Label>
              <Input type="number" min="0" placeholder={t("time.hourlyRatePlaceholder")} value={timeForm.hourlyRate}
                onChange={(e) => setTimeForm((f) => ({ ...f, hourlyRate: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label>{t("time.description")}</Label>
              <Input placeholder={t("time.descriptionPlaceholder")} value={timeForm.description}
                onChange={(e) => setTimeForm((f) => ({ ...f, description: e.target.value }))} />
            </div>

            {timeForm.hours && timeForm.hourlyRate && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center">
                <p className="text-sm font-semibold text-emerald-700">
                  {t("time.estimatedCost", {
                    amount: (parseFloat(timeForm.hours) * parseFloat(timeForm.hourlyRate)).toLocaleString(dateLocale, { maximumFractionDigits: 0 }),
                  })}
                </p>
              </div>
            )}

            <Button
              className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700"
              disabled={!timeForm.projectId || !timeForm.employeeId || !timeForm.hours || isPending}
              onClick={submitTimeEntry}
            >
              {isPending ? t("saving") : t("time.save")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Expense Sheet ────────────────────────────────────────────────────── */}
      <Sheet open={openSheet === "expense"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <SheetContent side="bottom" className="h-auto max-h-[92dvh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle className="flex items-center gap-2 text-blue-700">
              <Receipt className="h-5 w-5" />
              {t("expense.sheetTitle")}
            </SheetTitle>
          </SheetHeader>

          <div className="px-4 pb-6 space-y-4">
            <div className="space-y-1.5">
              <Label>{t("expense.project")} *</Label>
              <Select value={expenseForm.projectId} onValueChange={(v) => setExpenseForm((f) => ({ ...f, projectId: v }))}>
                <SelectTrigger><SelectValue placeholder={t("selectProject")} /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("expense.date")} *</Label>
                <Input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("expense.amount")} *</Label>
                <Input type="number" min="0" step="0.01" placeholder="0.00" value={expenseForm.amount}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t("expense.category")} *</Label>
              <Select value={expenseForm.category} onValueChange={(v) => setExpenseForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORY_KEYS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {t(`expenseCategory.${k}` as Parameters<typeof t>[0])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t("expense.description")}</Label>
              <Input placeholder={t("expense.descriptionPlaceholder")} value={expenseForm.description}
                onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label>{t("expense.receiptUrl")}</Label>
              <Input placeholder={t("expense.receiptPlaceholder")} value={expenseForm.receiptUrl}
                onChange={(e) => setExpenseForm((f) => ({ ...f, receiptUrl: e.target.value }))} />
            </div>

            <Button
              className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700"
              disabled={!expenseForm.projectId || !expenseForm.amount || isPending}
              onClick={submitExpense}
            >
              {isPending ? t("saving") : t("expense.save")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Daily Log Sheet ──────────────────────────────────────────────────── */}
      <Sheet open={openSheet === "daily"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <SheetContent side="bottom" className="h-auto max-h-[92dvh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle className="flex items-center gap-2 text-orange-700">
              <ClipboardList className="h-5 w-5" />
              {t("daily.sheetTitle")}
            </SheetTitle>
          </SheetHeader>

          <div className="px-4 pb-6 space-y-4">
            <div className="space-y-1.5">
              <Label>{t("daily.project")} *</Label>
              <Select value={dailyForm.projectId} onValueChange={(v) => setDailyForm((f) => ({ ...f, projectId: v }))}>
                <SelectTrigger><SelectValue placeholder={t("selectProject")} /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t("daily.date")} *</Label>
              <Input type="date" value={dailyForm.date} onChange={(e) => setDailyForm((f) => ({ ...f, date: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label>{t("daily.weather")}</Label>
              <Select value={dailyForm.weatherConditions} onValueChange={(v) => setDailyForm((f) => ({ ...f, weatherConditions: v }))}>
                <SelectTrigger><SelectValue placeholder={t("daily.weatherPlaceholder")} /></SelectTrigger>
                <SelectContent>
                  {WEATHER_KEYS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {t(`weather.${k}` as Parameters<typeof t>[0])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t("daily.visitors")}</Label>
              <Input placeholder={t("daily.visitorsPlaceholder")} value={dailyForm.visitors}
                onChange={(e) => setDailyForm((f) => ({ ...f, visitors: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label>{t("daily.safetyIncidents")}</Label>
              <Input placeholder={t("daily.safetyPlaceholder")} value={dailyForm.safetyIncidents}
                onChange={(e) => setDailyForm((f) => ({ ...f, safetyIncidents: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label>{t("daily.notes")}</Label>
              <Textarea
                placeholder={t("daily.notesPlaceholder")}
                className="resize-none"
                rows={3}
                value={dailyForm.notes}
                onChange={(e) => setDailyForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <Button
              className="w-full h-12 text-base bg-orange-600 hover:bg-orange-700"
              disabled={!dailyForm.projectId || isPending}
              onClick={submitDailyLog}
            >
              {isPending ? t("saving") : t("daily.save")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
