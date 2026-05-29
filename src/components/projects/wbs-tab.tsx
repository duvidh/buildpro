"use client";

import { useCurrency } from "@/lib/currency-context";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Plus, Sparkles, GitBranch, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { createWorkPackage, updateWorkPackage, deleteWorkPackage, seedWorkPackages } from "@/actions/wbs";
import { fmtDate } from "@/lib/utils";

type WorkPackageEntry = {
  id: string;
  name: string;
  description: string | null;
  plannedCost: number;
  actualCost: number;
  completionPercent: number;
  startDate: Date | null;
  endDate: Date | null;
  order: number;
};

const EMPTY_ADD = { name: "", description: "", plannedCost: "", startDate: "", endDate: "" };

type EditForm = {
  name: string;
  description: string;
  plannedCost: string;
  actualCost: string;
  completionPercent: string;
  startDate: string;
  endDate: string;
};

function toEditForm(wp: WorkPackageEntry): EditForm {
  return {
    name: wp.name,
    description: wp.description ?? "",
    plannedCost: wp.plannedCost > 0 ? String(wp.plannedCost) : "",
    actualCost: wp.actualCost > 0 ? String(wp.actualCost) : "",
    completionPercent: String(wp.completionPercent),
    startDate: wp.startDate ? new Date(wp.startDate).toISOString().split("T")[0] : "",
    endDate: wp.endDate ? new Date(wp.endDate).toISOString().split("T")[0] : "",
  };
}

export function WBSTab({
  projectId,
  workPackages,
}: {
  projectId: string;
  workPackages: WorkPackageEntry[];
}) {
  const t = useTranslations("projects");
  const locale = useLocale();
  const dir = locale === "he" ? "rtl" : "ltr";

  const { fmtCompact } = useCurrency();
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_ADD);
  const [editOpen, setEditOpen] = useState(false);
  const [editWp, setEditWp] = useState<WorkPackageEntry | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSeed() {
    startTransition(async () => {
      await seedWorkPackages(projectId);
      router.refresh();
    });
  }

  function handleAdd() {
    if (!form.name.trim()) return;
    startTransition(async () => {
      await createWorkPackage({
        projectId,
        name: form.name,
        description: form.description || undefined,
        plannedCost: parseFloat(form.plannedCost) || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      });
      setAddOpen(false);
      setForm(EMPTY_ADD);
      router.refresh();
    });
  }

  function openEdit(wp: WorkPackageEntry) {
    setEditWp(wp);
    setEditForm(toEditForm(wp));
    setEditOpen(true);
  }

  function handleUpdate() {
    if (!editWp || !editForm || !editForm.name.trim()) return;
    startTransition(async () => {
      await updateWorkPackage(editWp.id, {
        name: editForm.name,
        description: editForm.description || undefined,
        plannedCost: parseFloat(editForm.plannedCost) || 0,
        actualCost: parseFloat(editForm.actualCost) || 0,
        completionPercent: Math.min(100, Math.max(0, parseInt(editForm.completionPercent, 10) || 0)),
        startDate: editForm.startDate || undefined,
        endDate: editForm.endDate || undefined,
      });
      setEditOpen(false);
      setEditWp(null);
      setEditForm(null);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteWorkPackage(id);
      router.refresh();
    });
  }

  const totalPlanned = workPackages.reduce((s, wp) => s + wp.plannedCost, 0);
  const totalActual  = workPackages.reduce((s, wp) => s + wp.actualCost, 0);
  const variance     = totalActual - totalPlanned;
  const overallCompletion =
    workPackages.length > 0
      ? Math.round(workPackages.reduce((s, wp) => s + wp.completionPercent, 0) / workPackages.length)
      : 0;

  if (workPackages.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 gap-3">
        <GitBranch className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">{t("wbs.empty")}</p>
        <div className="flex gap-2">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                {t("wbs.newPackageBtn")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" dir={dir}>
              <DialogHeader><DialogTitle>{t("wbs.addDialogTitle")}</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label>{t("wbs.nameLabel")}</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={t("wbs.namePlaceholder")}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("wbs.descLabel")}</Label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder={t("wbs.descPlaceholder")}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("wbs.plannedBudgetLabel")}</Label>
                  <Input
                    type="number" min="0" step="1000" dir="ltr"
                    value={form.plannedCost}
                    onChange={(e) => setForm({ ...form, plannedCost: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{t("wbs.startDateLabel")}</Label>
                    <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("wbs.endDateLabel")}</Label>
                    <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>{t("wbs.cancel")}</Button>
                  <Button onClick={handleAdd} disabled={isPending}>{t("wbs.add")}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={handleSeed} disabled={isPending}>
            <Sparkles className="h-3.5 w-3.5 me-1.5" />
            {isPending ? t("wbs.loading") : t("wbs.demoData")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: t("wbs.statPackages"),      value: workPackages.length,            color: "text-foreground" },
          { label: t("wbs.statCompletion"),     value: `${overallCompletion}%`,         color: overallCompletion >= 80 ? "text-emerald-600" : "text-foreground" },
          { label: t("wbs.statPlannedBudget"),  value: fmtCompact(totalPlanned),         color: "text-foreground" },
          {
            label: t("wbs.statVariance"),
            value: variance === 0 ? fmtCompact(0) : `${variance > 0 ? "+" : ""}${fmtCompact(variance)}`,
            color: variance > 0 ? "text-red-600" : variance < 0 ? "text-emerald-600" : "text-foreground",
          },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Header + Add */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
          <GitBranch className="h-3.5 w-3.5" />
          {t("wbs.sectionTitle")} ({workPackages.length})
        </h4>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs">
              <Plus className="h-3.5 w-3.5 me-1" />
              {t("wbs.newPackageBtnShort")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md" dir={dir}>
            <DialogHeader><DialogTitle>{t("wbs.addDialogTitle2")}</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label>{t("wbs.nameLabelFull")}</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t("wbs.namePlaceholder2")}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("wbs.descLabel")}</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={t("wbs.descPlaceholder2")}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("wbs.plannedBudgetLabel")}</Label>
                <Input
                  type="number"
                  value={form.plannedCost}
                  onChange={(e) => setForm({ ...form, plannedCost: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{t("wbs.startDateLabel")}</Label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("wbs.endDateLabel")}</Label>
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setAddOpen(false)}>{t("wbs.cancel")}</Button>
                <Button onClick={handleAdd} disabled={isPending}>{t("wbs.add")}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) { setEditWp(null); setEditForm(null); } }}>
        <DialogContent className="sm:max-w-lg" dir={dir}>
          <DialogHeader><DialogTitle>{t("wbs.editDialogTitle")}</DialogTitle></DialogHeader>
          {editForm && (
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label>{t("wbs.nameLabelFull")}</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("wbs.descLabel")}</Label>
                <Input
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{t("wbs.plannedBudgetLabel")}</Label>
                  <Input
                    type="number"
                    value={editForm.plannedCost}
                    onChange={(e) => setEditForm({ ...editForm, plannedCost: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("wbs.actualCostLabel")}</Label>
                  <Input
                    type="number"
                    value={editForm.actualCost}
                    onChange={(e) => setEditForm({ ...editForm, actualCost: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>{t("wbs.completionLabel")}</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={editForm.completionPercent}
                  onChange={(e) => setEditForm({ ...editForm, completionPercent: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{t("wbs.startDateLabel")}</Label>
                  <Input
                    type="date"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("wbs.endDateLabel")}</Label>
                  <Input
                    type="date"
                    value={editForm.endDate}
                    onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setEditOpen(false)}>{t("wbs.cancel")}</Button>
                <Button onClick={handleUpdate} disabled={isPending}>{t("wbs.save")}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Work package cards */}
      <div className="space-y-2">
        {workPackages.map((wp, idx) => {
          const wpVariance = wp.actualCost - wp.plannedCost;
          const isOver = wpVariance > 0;
          const pct = Math.min(100, Math.max(0, wp.completionPercent));
          return (
            <div key={wp.id} className="rounded-lg border border-border bg-muted/20 p-3 space-y-2.5 group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-sm leading-none">{wp.name}</p>
                    {wp.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{wp.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-sm font-bold">{pct.toFixed(0)}%</span>
                  {/* Action buttons — visible on hover */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ms-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(wp)}
                      title={t("wbs.editTitle")}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          title={t("wbs.deleteTitle")}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent dir={dir}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("wbs.deleteDialogTitle")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("wbs.deleteDialogDesc", { name: wp.name })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("wbs.cancel")}</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={() => handleDelete(wp.id)}
                          >
                            {t("wbs.deleteTitle")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>

              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : "bg-primary"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                {wp.startDate && (
                  <span>{fmtDate(wp.startDate)} — {fmtDate(wp.endDate)}</span>
                )}
                <span>
                  {t("wbs.plannedLabel")}: <strong className="text-foreground">{fmtCompact(wp.plannedCost)}</strong>
                </span>
                {wp.actualCost > 0 && (
                  <span>
                    {t("wbs.actualLabel")}:{" "}
                    <strong className={isOver ? "text-red-600" : "text-emerald-600"}>
                      {fmtCompact(wp.actualCost)}
                    </strong>
                  </span>
                )}
                {wp.actualCost > 0 && wpVariance !== 0 && (
                  <span className={isOver ? "text-red-600" : "text-emerald-600"}>
                    ({isOver ? "+" : ""}{fmtCompact(wpVariance)})
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
