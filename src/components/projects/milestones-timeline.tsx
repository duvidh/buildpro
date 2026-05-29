"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import {
  Check,
  Plus,
  Loader2,
  Trash2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createMilestone,
  toggleMilestoneComplete,
  deleteMilestone,
  seedProjectMilestones,
} from "@/actions/milestones";
import { createMilestoneSchema, type CreateMilestoneInput } from "@/lib/schemas/milestone-schema";
import { fmtDate } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type MilestoneItem = {
  id: string;
  name: string;
  date: Date;
  completed: boolean;
  completedAt: Date | null;
  weight: number;
  notes?: string | null;
  order: number;
};

type MilestonesTimelineProps = {
  projectId: string;
  milestones: MilestoneItem[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isOverdue(date: Date, completed: boolean) {
  if (completed) return false;
  return new Date(date) < new Date();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NewMilestoneDialog({
  projectId,
  onCreated,
}: {
  projectId: string;
  onCreated: () => void;
}) {
  const t = useTranslations("projects");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<CreateMilestoneInput>({
      resolver: zodResolver(createMilestoneSchema),
      defaultValues: { projectId, weight: "1" },
    });

  function onSubmit(data: CreateMilestoneInput) {
    startTransition(async () => {
      const res = await createMilestone(data);
      if (res.success) {
        reset({ projectId, weight: "1" });
        setOpen(false);
        onCreated();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 h-8">
          <Plus className="h-3.5 w-3.5" />
          {t("milestones.newMilestone")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{t("milestones.newMilestone")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          <input type="hidden" {...register("projectId")} />

          <div className="space-y-1.5">
            <Label htmlFor="ms-name">{t("milestones.nameLabel")}</Label>
            <Input
              id="ms-name"
              {...register("name")}
              placeholder={t("milestones.namePlaceholder")}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ms-date">{t("milestones.plannedDateLabel")}</Label>
              <Input id="ms-date" type="date" {...register("date")} />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ms-weight">{t("milestones.weightLabel")}</Label>
              <Input
                id="ms-weight"
                {...register("weight")}
                placeholder="1"
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ms-notes">{t("milestones.notesLabel")}</Label>
            <Textarea
              id="ms-notes"
              {...register("notes")}
              placeholder={t("milestones.notesPlaceholder")}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("wbs.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
              {t("wbs.add")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SeedDemoButton({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const t = useTranslations("projects");
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      className="gap-2"
      onClick={() =>
        startTransition(async () => {
          await seedProjectMilestones(projectId);
          onDone();
        })
      }
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-violet-500" />}
      {t("milestones.seedDemo")}
    </Button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MilestonesTimeline({ projectId, milestones }: MilestonesTimelineProps) {
  const t = useTranslations("projects");
  const router = useRouter();
  const [, startTransition] = useTransition();

  function handleToggle(id: string, completed: boolean) {
    startTransition(async () => {
      await toggleMilestoneComplete(id, completed);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteMilestone(id);
      router.refresh();
    });
  }

  const sorted = [...milestones].sort((a, b) => a.order - b.order);
  const doneCount = milestones.filter((m) => m.completed).length;
  const totalWeight = milestones.reduce((s, m) => s + m.weight, 0);
  const doneWeight = milestones.filter((m) => m.completed).reduce((s, m) => s + m.weight, 0);
  const progress = totalWeight > 0 ? Math.round((doneWeight / totalWeight) * 100) : 0;

  if (milestones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <p className="text-muted-foreground text-sm">{t("milestones.empty")}</p>
        <div className="flex items-center gap-2">
          <NewMilestoneDialog projectId={projectId} onCreated={() => router.refresh()} />
          <SeedDemoButton projectId={projectId} onDone={() => router.refresh()} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {doneCount} / {milestones.length} {t("milestones.completedSuffix")}
          </span>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs font-medium text-emerald-600">{progress}%</span>
          </div>
        </div>
        <NewMilestoneDialog projectId={projectId} onCreated={() => router.refresh()} />
      </div>

      {/* Timeline */}
      <div className="relative">
        {sorted.map((m, idx) => {
          const overdue = isOverdue(m.date, m.completed);
          const isLast = idx === sorted.length - 1;

          return (
            <div key={m.id} className="relative flex gap-4 pb-6 last:pb-0 group">
              {/* Vertical connector line */}
              {!isLast && (
                <div className="absolute start-[11px] top-6 bottom-0 w-px bg-border" />
              )}

              {/* Circle */}
              <div
                className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 mt-0.5 transition-colors ${
                  m.completed
                    ? "bg-emerald-500 border-emerald-500"
                    : overdue
                    ? "bg-background border-red-400"
                    : "bg-background border-primary"
                }`}
              >
                {m.completed && <Check className="h-3 w-3 text-white" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium leading-snug ${
                        m.completed ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {m.name}
                    </p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span
                        className={`text-xs ${
                          overdue
                            ? "text-red-500 font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        {fmtDate(m.date)}
                        {overdue && ` · ${t("milestones.overdue")}`}
                      </span>
                      {m.completed && m.completedAt && (
                        <span className="text-xs text-emerald-600">
                          {t("milestones.completedOnPrefix")} {fmtDate(m.completedAt)}
                        </span>
                      )}
                      {m.weight > 1 && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0">
                          {t("milestones.weightBadge", { n: m.weight })}
                        </Badge>
                      )}
                    </div>
                    {m.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{m.notes}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {m.completed ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => handleToggle(m.id, false)}
                        title={t("milestones.reopen")}
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[11px] px-2 gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        onClick={() => handleToggle(m.id, true)}
                      >
                        <Check className="h-3 w-3" />
                        {t("milestones.markDone")}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(m.id)}
                      title={t("milestones.deleteMilestone")}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
