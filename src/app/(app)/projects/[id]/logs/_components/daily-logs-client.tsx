"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ClipboardList, Plus, X, CalendarDays, CloudSun, Users, ShieldCheck,
  ShieldAlert, Loader2, Minus,
} from "lucide-react";
import { toast } from "sonner";
import { createDailyLog } from "@/actions/daily-logs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type SerializedLog = {
  id: string;
  date: string;
  weatherConditions: string | null;
  workforceCount: number | null;
  safetyIncidents: string | null;
  notes: string | null;
  supervisorName: string | null;
};

// Quick-pick weather chips — common Israeli site conditions.
const WEATHER_CHIPS: Record<"he" | "en", string[]> = {
  he: ["☀️ שמשי", "🔥 חם מאוד", "⛅ מעונן חלקית", "🌧️ גשום", "💨 רוחות חזקות"],
  en: ["☀️ Sunny", "🔥 Very hot", "⛅ Partly cloudy", "🌧️ Rainy", "💨 Strong winds"],
};

function todayISO(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// ─── New log form ─────────────────────────────────────────────────────────────

function NewLogForm({
  projectId,
  onDone,
  onCancel,
}: {
  projectId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("projectLogs");
  const rawLocale = useLocale();
  const locale: "he" | "en" = rawLocale === "he" ? "he" : "en";

  const [date, setDate]           = useState(todayISO());
  const [weather, setWeather]     = useState("");
  const [workforce, setWorkforce] = useState<number | "">("");
  const [progress, setProgress]   = useState("");
  const [safety, setSafety]       = useState("");
  const [isSaving, startSaving]   = useTransition();

  function bumpWorkforce(delta: number) {
    setWorkforce((w) => Math.max(0, (typeof w === "number" ? w : 0) + delta));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSaving) return;
    startSaving(async () => {
      const res = await createDailyLog({
        projectId,
        date,
        weather,
        workforceCount: workforce === "" ? undefined : workforce,
        progressNotes: progress,
        safetyIssues: safety,
      });
      if (res.success) {
        toast.success(t("toastCreated"));
        onDone();
      } else if (res.error === "duplicate") {
        toast.error(t("toastDuplicate"));
      } else {
        toast.error(t("toastError"));
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-primary/20 bg-card shadow-sm p-4 sm:p-5 space-y-4
        animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          {t("form.title")}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          aria-label={t("form.cancel")}
          className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Date + workforce: side by side even on phones — both are short */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="log-date" className="text-xs">{t("form.date")}</Label>
          <Input
            id="log-date"
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            required
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="log-workforce" className="text-xs">{t("form.workforce")}</Label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => bumpWorkforce(-1)}
              aria-label="-"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/30
                text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all"
            >
              <Minus className="h-4 w-4" />
            </button>
            <Input
              id="log-workforce"
              type="number"
              inputMode="numeric"
              min={0}
              value={workforce}
              onChange={(e) => setWorkforce(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))}
              placeholder={t("form.workforcePlaceholder")}
              className="h-11 text-center"
            />
            <button
              type="button"
              onClick={() => bumpWorkforce(1)}
              aria-label="+"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/30
                text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Weather: free text + quick chips */}
      <div className="space-y-1.5">
        <Label htmlFor="log-weather" className="text-xs">{t("form.weather")}</Label>
        <Input
          id="log-weather"
          value={weather}
          onChange={(e) => setWeather(e.target.value)}
          placeholder={t("form.weatherPlaceholder")}
          className="h-11"
        />
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {WEATHER_CHIPS[locale].map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setWeather(chip.replace(/^\S+\s/, ""))}
              className="rounded-full border border-border/50 bg-muted/40 px-2.5 py-1 text-xs
                hover:bg-muted hover:border-border active:scale-95 transition-all"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <Label htmlFor="log-progress" className="text-xs">{t("form.progress")}</Label>
        <Textarea
          id="log-progress"
          value={progress}
          onChange={(e) => setProgress(e.target.value)}
          placeholder={t("form.progressPlaceholder")}
          rows={3}
          className="resize-none"
        />
      </div>

      {/* Safety */}
      <div className="space-y-1.5">
        <Label htmlFor="log-safety" className="text-xs">{t("form.safety")}</Label>
        <Textarea
          id="log-safety"
          value={safety}
          onChange={(e) => setSafety(e.target.value)}
          placeholder={t("form.safetyPlaceholder")}
          rows={2}
          className="resize-none"
        />
      </div>

      <Button type="submit" disabled={isSaving} className="w-full h-12 text-sm font-semibold gap-2">
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
        {t("form.submit")}
      </Button>
    </form>
  );
}

// ─── Log timeline card ────────────────────────────────────────────────────────

function LogCard({ log, locale }: { log: SerializedLog; locale: "he" | "en" }) {
  const t = useTranslations("projectLogs");

  const d = new Date(log.date);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);

  const dateLabel =
    diffDays === 0 ? t("today") :
    diffDays === 1 ? t("yesterday") :
    new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-US", {
      weekday: "short", day: "numeric", month: "long",
    }).format(d);

  return (
    <div className="relative ps-10">
      {/* Timeline dot */}
      <div className="absolute start-2.5 top-4 h-3 w-3 rounded-full border-2 border-primary bg-background" />

      <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm space-y-2.5">
        {/* Header: date + badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            {dateLabel}
          </span>
          {log.weatherConditions && (
            <span className="flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-600 dark:text-sky-400">
              <CloudSun className="h-3 w-3" />
              {log.weatherConditions}
            </span>
          )}
          {log.workforceCount != null && (
            <span className="flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-600 dark:text-violet-300">
              <Users className="h-3 w-3" />
              {t("workers", { count: log.workforceCount })}
            </span>
          )}
        </div>

        {/* Progress notes */}
        {log.notes && (
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{log.notes}</p>
        )}

        {/* Safety */}
        {log.safetyIncidents ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-400 whitespace-pre-wrap">
              {log.safetyIncidents}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t("noSafety")}
          </div>
        )}

        {/* Footer */}
        {log.supervisorName && (
          <p className="text-[11px] text-muted-foreground pt-0.5">
            {t("reportedBy", { name: log.supervisorName })}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main client ──────────────────────────────────────────────────────────────

export function DailyLogsClient({
  projectId,
  logs,
}: {
  projectId: string;
  logs: SerializedLog[];
}) {
  const t = useTranslations("projectLogs");
  const rawLocale = useLocale();
  const locale: "he" | "en" = rawLocale === "he" ? "he" : "en";

  // Open the form by default when the project has no logs yet.
  const [formOpen, setFormOpen] = useState(logs.length === 0);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            {t("title")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t("subtitle")}</p>
        </div>
        {!formOpen && (
          <Button onClick={() => setFormOpen(true)} size="sm" className="h-10 gap-1.5 shrink-0">
            <Plus className="h-4 w-4" />
            {t("addLog")}
          </Button>
        )}
      </div>

      {/* Form */}
      {formOpen && (
        <NewLogForm
          projectId={projectId}
          onDone={() => setFormOpen(false)}
          onCancel={() => setFormOpen(false)}
        />
      )}

      {/* Timeline */}
      {logs.length === 0 ? (
        !formOpen && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border/60 py-12 text-center">
            <ClipboardList className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">{t("empty")}</p>
            <p className="text-xs text-muted-foreground/70">{t("emptyHint")}</p>
          </div>
        )
      ) : (
        <div className="relative space-y-3">
          {/* Timeline line */}
          <div className="absolute start-4 top-2 bottom-2 w-px bg-border/60" />
          {logs.map((log) => (
            <LogCard key={log.id} log={log} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
