"use client";

import { useTransition } from "react";
import Link from "next/link";
import type React from "react";
import {
  Users, FolderKanban, FileText, UserPlus, ClipboardList,
  Check, ChevronLeft, Sparkles, Loader2, EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  dismissSetupChecklist,
  loadSampleData,
  type SetupProgress,
} from "@/actions/onboarding";

type StepDef = {
  key: "client" | "project" | "quote" | "team" | "dailyLog";
  href: string;
  icon: React.ElementType;
  accent: string;     // gradient for the icon tile
  iconColor: string;
};

const STEP_DEFS: StepDef[] = [
  { key: "client",   href: "/clients/new",  icon: Users,         accent: "from-emerald-500/15 to-teal-500/15",   iconColor: "text-emerald-600" },
  { key: "project",  href: "/projects/new", icon: FolderKanban,  accent: "from-violet-500/15 to-purple-500/15",  iconColor: "text-violet-600" },
  { key: "quote",    href: "/quotes",       icon: FileText,      accent: "from-sky-500/15 to-blue-500/15",       iconColor: "text-sky-600" },
  { key: "team",     href: "/employees",    icon: UserPlus,      accent: "from-orange-500/15 to-amber-500/15",   iconColor: "text-orange-600" },
  { key: "dailyLog", href: "/field",        icon: ClipboardList, accent: "from-rose-500/15 to-pink-500/15",      iconColor: "text-rose-600" },
];

function stepDone(progress: SetupProgress, key: StepDef["key"]): boolean {
  switch (key) {
    case "client":   return progress.hasClient;
    case "project":  return progress.hasProject;
    case "quote":    return progress.hasQuote;
    case "team":     return progress.hasTeamMember;
    case "dailyLog": return progress.hasDailyLog;
  }
}

function StepRow({
  def,
  index,
  done,
}: {
  def: StepDef;
  index: number;
  done: boolean;
}) {
  const t = useTranslations("dashboard.setup");
  const Icon = def.icon;

  const inner = (
    <>
      {/* Status / number indicator */}
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold transition-colors",
          done
            ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-600"
            : "border-border bg-muted/40 text-muted-foreground group-hover:border-primary/40 group-hover:text-primary",
        )}
      >
        {done ? <Check className="h-4.5 w-4.5" strokeWidth={3} /> : index + 1}
      </div>

      {/* Icon tile */}
      <div
        className={cn(
          "hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br border border-border/40",
          def.accent,
        )}
      >
        <Icon className={cn("h-5 w-5", done ? "text-muted-foreground/50" : def.iconColor)} />
      </div>

      {/* Texts */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-semibold leading-tight",
            done ? "text-muted-foreground line-through decoration-emerald-500/50" : "text-foreground",
          )}
        >
          {t(`steps.${def.key}.title`)}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {t(`steps.${def.key}.description`)}
        </p>
      </div>

      {/* Trailing CTA */}
      {done ? (
        <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-600">
          {t("stepDone")}
        </span>
      ) : (
        <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-primary opacity-70 transition-opacity group-hover:opacity-100">
          {t("start")}
          <ChevronLeft className="h-3.5 w-3.5 ltr:rotate-180" />
        </span>
      )}
    </>
  );

  const rowClass = cn(
    "group flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-all duration-200",
    done
      ? "border-emerald-500/20 bg-emerald-500/[0.04]"
      : "border-border/60 bg-card hover:border-primary/40 hover:shadow-[0_2px_12px_rgb(0,0,0,0.06)]",
  );

  if (done) return <div className={rowClass}>{inner}</div>;

  return (
    <Link href={def.href} className={rowClass}>
      {inner}
    </Link>
  );
}

export function SetupChecklist({
  progress,
  userName,
}: {
  progress: SetupProgress;
  userName: string;
}) {
  const t = useTranslations("dashboard.setup");
  const [isLoadingSample, startLoadingSample] = useTransition();
  const [isDismissing, startDismissing] = useTransition();
  const percent = Math.round((progress.completedCount / progress.totalSteps) * 100);

  function handleLoadSample() {
    startLoadingSample(async () => {
      const res = await loadSampleData();
      if (res.success) toast.success(t("sampleSuccess"));
      else             toast.error(t("sampleError"));
    });
  }

  function handleDismiss() {
    startDismissing(async () => {
      const res = await dismissSetupChecklist();
      if (!res.success) toast.error(t("dismissError"));
    });
  }

  return (
    <div className="mx-auto w-full max-w-2xl py-4 sm:py-8">
      {/* ── Welcome header ── */}
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">
          {t("welcome", { name: userName })}
        </p>
        <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight">
          <span className="bg-gradient-to-l from-primary to-primary/70 bg-clip-text text-transparent">
            {t("title")}
          </span>
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      {/* ── Progress bar ── */}
      <div className="mt-7">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium text-muted-foreground">
            {t("progressLabel", {
              completed: progress.completedCount,
              total: progress.totalSteps,
            })}
          </span>
          <span className="font-semibold text-primary">{percent}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-l from-primary to-primary/70 transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* ── Steps ── */}
      <div className="mt-5 space-y-2.5">
        {STEP_DEFS.map((def, i) => (
          <StepRow key={def.key} def={def} index={i} done={stepDone(progress, def.key)} />
        ))}
      </div>

      {/* ── Sample data card ── */}
      <div
        className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-primary/20
          bg-gradient-to-br from-primary/[0.06] to-primary/[0.02] px-5 py-5 text-center
          sm:flex-row sm:text-start"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{t("sampleQuestion")}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("sampleHint")}</p>
        </div>
        <Button
          onClick={handleLoadSample}
          disabled={isLoadingSample || isDismissing}
          className="shrink-0 gap-1.5 bg-gradient-to-l from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
        >
          {isLoadingSample ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("sampleLoading")}
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {t("sampleCta")}
            </>
          )}
        </Button>
      </div>

      {/* ── Dismiss ── */}
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={handleDismiss}
          disabled={isDismissing || isLoadingSample}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70
            transition-colors hover:text-foreground disabled:opacity-50"
        >
          {isDismissing
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <EyeOff className="h-3.5 w-3.5" />}
          {t("dismiss")}
        </button>
      </div>
    </div>
  );
}
