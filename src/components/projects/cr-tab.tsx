"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCurrency } from "@/lib/currency-context";
import { useTranslations, useLocale } from "next-intl";
import { Plus, Sparkles, GitPullRequest, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { createChangeRequest, updateChangeRequestStatus, seedChangeRequests } from "@/actions/change-orders";
import { fmtDate } from "@/lib/utils";


type ChangeRequestEntry = {
  id: string;
  status: string;
  costImpact: number;
  description: string;
  date: Date;
  requestedBy: string;
  scheduleImpact: number;
  approvedAt: Date | null;
};

const CR_STATUS_CLS: Record<string, string> = {
  PENDING:  "bg-orange-100 text-orange-700 border-orange-200",
  APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
};

const EMPTY = { description: "", requestedBy: "", costImpact: "", scheduleImpact: "" };

export function CRTab({
  projectId,
  changeRequests,
}: {
  projectId: string;
  changeRequests: ChangeRequestEntry[];
}) {
  const t = useTranslations("projects");
  const locale = useLocale();
  const dir = locale === "he" ? "rtl" : "ltr";

  const { fmtCompact } = useCurrency();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [isPending, startTransition] = useTransition();

  const crStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      PENDING: t("cr.statusPending"), APPROVED: t("cr.statusApproved"), REJECTED: t("cr.statusRejected"),
    };
    return map[status] ?? status;
  };

  function handleSeed() {
    startTransition(async () => {
      await seedChangeRequests(projectId);
      router.refresh();
    });
  }

  function handleAdd() {
    if (!form.description.trim() || !form.requestedBy.trim()) return;
    startTransition(async () => {
      await createChangeRequest({
        projectId,
        description: form.description,
        requestedBy: form.requestedBy,
        costImpact: parseFloat(form.costImpact) || 0,
        scheduleImpact: parseInt(form.scheduleImpact) || 0,
      });
      setOpen(false);
      setForm(EMPTY);
      router.refresh();
    });
  }

  function handleStatus(id: string, status: string) {
    startTransition(async () => {
      await updateChangeRequestStatus(id, status, projectId);
      router.refresh();
    });
  }

  const approvedTotal = changeRequests
    .filter((cr) => cr.status === "APPROVED")
    .reduce((s, cr) => s + cr.costImpact, 0);
  const pendingList = changeRequests.filter((cr) => cr.status === "PENDING");

  if (changeRequests.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 gap-3">
        <GitPullRequest className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">{t("cr.empty")}</p>
        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                {t("cr.newCRBtn")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" dir={dir}>
              <DialogHeader><DialogTitle>{t("cr.crDialogTitle")}</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label>{t("cr.descLabel")}</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder={t("cr.descPlaceholder")}
                    rows={3}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("cr.requestedByLabel")}</Label>
                  <Input
                    value={form.requestedBy}
                    onChange={(e) => setForm({ ...form, requestedBy: e.target.value })}
                    placeholder={t("cr.requestedByPlaceholder")}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{t("cr.costImpactLabel")}</Label>
                    <Input
                      type="number" min="0" step="100" dir="ltr"
                      value={form.costImpact}
                      onChange={(e) => setForm({ ...form, costImpact: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("cr.scheduleImpactLabel")}</Label>
                    <Input
                      type="number" min="0" dir="ltr"
                      value={form.scheduleImpact}
                      onChange={(e) => setForm({ ...form, scheduleImpact: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setOpen(false)}>{t("cr.cancel")}</Button>
                  <Button onClick={handleAdd} disabled={isPending}>{t("cr.add")}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={handleSeed} disabled={isPending}>
            <Sparkles className="h-3.5 w-3.5 me-1.5" />
            {isPending ? t("cr.loading") : t("cr.demoData")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t("cr.statTotal"),        value: changeRequests.length,  color: "text-foreground" },
          { label: t("cr.statApprovedCost"),  value: fmtCompact(approvedTotal), color: "text-emerald-600" },
          { label: t("cr.statPending"),       value: pendingList.length,     color: pendingList.length > 0 ? "text-orange-600" : "text-emerald-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {pendingList.length > 0 && (
        <div className="rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 text-xs text-orange-700">
          {pendingList.length} {t("cr.statusPending").toLowerCase()} ·{" "}
          {fmtCompact(pendingList.reduce((s, cr) => s + cr.costImpact, 0))}
        </div>
      )}

      {/* Header + Add */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
          <GitPullRequest className="h-3.5 w-3.5" />
          {t("cr.sectionTitle")} ({changeRequests.length})
        </h4>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs">
              <Plus className="h-3.5 w-3.5 me-1" />
              {t("cr.newCRBtnShort")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md" dir={dir}>
            <DialogHeader><DialogTitle>{t("cr.crDialogTitle")}</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label>{t("cr.descLabel")}</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={t("cr.descPlaceholder")}
                  rows={2}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("cr.requestedByLabel")}</Label>
                <Input
                  value={form.requestedBy}
                  onChange={(e) => setForm({ ...form, requestedBy: e.target.value })}
                  placeholder={t("cr.requestedByPlaceholder2")}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{t("cr.budgetImpactLabel")}</Label>
                  <Input
                    type="number"
                    value={form.costImpact}
                    onChange={(e) => setForm({ ...form, costImpact: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("cr.delayDaysLabel")}</Label>
                  <Input
                    type="number"
                    value={form.scheduleImpact}
                    onChange={(e) => setForm({ ...form, scheduleImpact: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setOpen(false)}>{t("cr.cancel")}</Button>
                <Button onClick={handleAdd} disabled={isPending}>{t("cr.submitRequest")}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs">{t("cr.colDescription")}</th>
              <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs hidden sm:table-cell">{t("cr.colRequestedBy")}</th>
              <th className="text-end font-medium text-muted-foreground px-3 py-2 text-xs">{t("cr.colCost")}</th>
              <th className="text-center font-medium text-muted-foreground px-3 py-2 text-xs">{t("cr.colStatus")}</th>
              <th className="text-center font-medium text-muted-foreground px-3 py-2 text-xs hidden md:table-cell">{t("cr.colActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {changeRequests.map((cr) => (
              <tr key={cr.id} className="hover:bg-muted/20">
                <td className="px-3 py-2.5 max-w-[180px]">
                  <p className="text-xs leading-snug">{cr.description}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{fmtDate(cr.date)}</p>
                  {cr.scheduleImpact > 0 && (
                    <p className="text-[11px] text-orange-600 mt-0.5">
                      {t("cr.delayDays", { n: cr.scheduleImpact })}
                    </p>
                  )}
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">
                  {cr.requestedBy}
                </td>
                <td className="px-3 py-2.5 text-end tabular-nums font-medium text-xs">
                  {cr.costImpact !== 0 ? fmtCompact(cr.costImpact) : "—"}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex justify-center">
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${CR_STATUS_CLS[cr.status] ?? ""}`}>
                      {crStatusLabel(cr.status)}
                    </Badge>
                  </div>
                </td>
                <td className="px-3 py-2.5 hidden md:table-cell">
                  {cr.status === "PENDING" && (
                    <div className="flex justify-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] px-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                        onClick={() => handleStatus(cr.id, "APPROVED")}
                        disabled={isPending}
                      >
                        <Check className="h-3 w-3 me-0.5" />
                        {t("cr.approve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] px-2 text-red-700 border-red-200 hover:bg-red-50"
                        onClick={() => handleStatus(cr.id, "REJECTED")}
                        disabled={isPending}
                      >
                        <X className="h-3 w-3 me-0.5" />
                        {t("cr.reject")}
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
