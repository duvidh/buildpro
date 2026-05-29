"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { Plus, FolderKanban, Cloud, Users, AlertTriangle, FileText } from "lucide-react";
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
  SheetTrigger,
} from "@/components/ui/sheet";
import { createDailyLog } from "@/actions/field";

type DailyLog = {
  id: string;
  date: Date;
  weatherConditions: string | null;
  visitors: string | null;
  safetyIncidents: string | null;
  notes: string | null;
  project: { id: string; name: string };
  supervisor: { id: string; name: string } | null;
};

type Project = { id: string; name: string };

const EMPTY_FORM = {
  projectId: "",
  date: new Date().toISOString().slice(0, 10),
  weatherConditions: "",
  visitors: "",
  safetyIncidents: "",
  notes: "",
};

function fmt(date: Date, locale: string): string {
  const dateLocale = locale === "he" ? "he-IL" : "en-US";
  return new Intl.DateTimeFormat(dateLocale, {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function DailyLogList({
  initial,
  projects,
}: {
  initial: DailyLog[];
  projects: Project[];
}) {
  const t      = useTranslations("dailyLogs");
  const tField = useTranslations("field");
  const tCommon = useTranslations("common");
  const locale  = useLocale();

  const [logs] = useState(initial);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Translate a stored weather key (SUNNY, CLOUDY, etc.) to the locale label
  const weatherLabel = (w: string | null) => {
    if (!w) return "";
    try { return tField(`weather.${w}` as Parameters<typeof tField>[0]); }
    catch { return w; }
  };

  const filtered = logs.filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      log.project.name.toLowerCase().includes(q) ||
      log.weatherConditions?.toLowerCase().includes(q) ||
      log.notes?.toLowerCase().includes(q)
    );
  });

  const projectNames = [...new Set(logs.map((l) => l.project.name))];

  function handleAdd() {
    if (!form.projectId) { setError(t("form.projectRequired")); return; }
    if (!form.date)       { setError(t("form.dateRequired"));    return; }
    startTransition(async () => {
      const res = await createDailyLog({
        projectId:         form.projectId,
        date:              form.date,
        weatherConditions: form.weatherConditions || undefined,
        visitors:          form.visitors          || undefined,
        safetyIncidents:   form.safetyIncidents   || undefined,
        notes:             form.notes             || undefined,
      });
      if (!res.success) { setError(res.error); return; }
      setOpen(false);
      setForm(EMPTY_FORM);
      setError(null);
      window.location.reload();
    });
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { labelKey: "stats.total",          value: logs.length,         color: "text-foreground" },
          { labelKey: "stats.activeProjects",  value: projectNames.length, color: "text-blue-600"  },
          {
            labelKey: "stats.thisWeek",
            value: logs.filter((l) => {
              const d    = new Date(l.date);
              const now  = new Date();
              const weekAgo = new Date(now.getTime() - 7 * 86400000);
              return d >= weekAgo;
            }).length,
            color: "text-emerald-600",
          },
        ].map((s) => (
          <div key={s.labelKey} className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">{t(s.labelKey as Parameters<typeof t>[0])}</p>
            <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder={t("search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="sm:ms-auto">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 me-1" />
                {t("newLog")}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto" dir={locale === "he" ? "rtl" : "ltr"}>
              <SheetHeader className="mb-4">
                <SheetTitle>{t("sheetTitle")}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 max-w-lg mx-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{t("form.project")} *</Label>
                    <Select value={form.projectId} onValueChange={(v) => setForm({ ...form, projectId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("form.selectProject")} />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{t("form.date")} *</Label>
                    <Input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>{t("form.weather")}</Label>
                  <Input
                    value={form.weatherConditions}
                    onChange={(e) => setForm({ ...form, weatherConditions: e.target.value })}
                    placeholder={t("form.weatherPlaceholder")}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("form.visitors")}</Label>
                  <Input
                    value={form.visitors}
                    onChange={(e) => setForm({ ...form, visitors: e.target.value })}
                    placeholder={t("form.visitorsPlaceholder")}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("form.safetyIncidents")}</Label>
                  <Input
                    value={form.safetyIncidents}
                    onChange={(e) => setForm({ ...form, safetyIncidents: e.target.value })}
                    placeholder={t("form.safetyPlaceholder")}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("form.notes")}</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder={t("form.notesPlaceholder")}
                    rows={3}
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <div className="flex justify-end gap-2 pb-4">
                  <Button variant="outline" onClick={() => { setOpen(false); setForm(EMPTY_FORM); setError(null); }}>
                    {tCommon("cancel")}
                  </Button>
                  <Button onClick={handleAdd}>{t("save")}</Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Log cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-border bg-muted/20">
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("emptyHint")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((log) => (
            <div
              key={log.id}
              className="rounded-xl border border-border bg-card p-4 space-y-3 hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm">{fmt(log.date, locale)}</p>
                  <Link
                    href={`/projects/${log.project.id}`}
                    className="flex items-center gap-1 text-xs text-primary hover:underline mt-0.5"
                  >
                    <FolderKanban className="h-3 w-3 shrink-0" />
                    {log.project.name}
                  </Link>
                </div>
                {log.supervisor && (
                  <span className="text-xs text-muted-foreground shrink-0">{log.supervisor.name}</span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {log.weatherConditions && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Cloud className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{weatherLabel(log.weatherConditions)}</span>
                  </div>
                )}
                {log.visitors && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{log.visitors}</span>
                  </div>
                )}
                {log.safetyIncidents && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-orange-500" />
                    <span>{log.safetyIncidents}</span>
                  </div>
                )}
                {log.notes && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground sm:col-span-2">
                    <FileText className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{log.notes}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
