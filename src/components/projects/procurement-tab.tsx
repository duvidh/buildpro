"use client";

import { useCurrency } from "@/lib/currency-context";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Plus, Sparkles, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { seedProcurement, createContractSimple } from "@/actions/procurement";

type ProjectContract = {
  id: string;
  description: string | null;
  value: number;
  paidAmount: number;
  status: string;
  retentionPercent: number;
  supplier: { id: string; name: string; type: string };
  payments: { id: string; date: Date; amount: number }[];
};

const CONTRACT_STATUS_CLS: Record<string, string> = {
  DRAFT:      "bg-slate-100 text-slate-600 border-slate-200",
  ACTIVE:     "bg-emerald-100 text-emerald-700 border-emerald-200",
  COMPLETED:  "bg-blue-100 text-blue-700 border-blue-200",
  TERMINATED: "bg-red-100 text-red-700 border-red-200",
};

const EMPTY = { supplierName: "", supplierType: "SUBCONTRACTOR", description: "", value: "", retentionPercent: "0" };

export function ProcurementTab({
  projectId,
  contracts,
}: {
  projectId: string;
  contracts: ProjectContract[];
}) {
  const t = useTranslations("projects");
  const locale = useLocale();
  const dir = locale === "he" ? "rtl" : "ltr";

  const { fmtCompact } = useCurrency();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [isPending, startTransition] = useTransition();

  const contractStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      DRAFT: t("procurement.contractStatusDraft"),
      ACTIVE: t("procurement.contractStatusActive"),
      COMPLETED: t("procurement.contractStatusCompleted"),
      TERMINATED: t("procurement.contractStatusTerminated"),
    };
    return map[status] ?? status;
  };

  const supplierTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      SUPPLIER: t("procurement.supplierTypeSupplier"),
      SUBCONTRACTOR: t("procurement.supplierTypeSubcontractor"),
    };
    return map[type] ?? type;
  };

  function handleSeed() {
    startTransition(async () => {
      await seedProcurement(projectId);
      router.refresh();
    });
  }

  function handleAdd() {
    if (!form.supplierName.trim() || !form.value) return;
    startTransition(async () => {
      await createContractSimple({
        projectId,
        supplierName: form.supplierName,
        supplierType: form.supplierType as "SUPPLIER" | "SUBCONTRACTOR",
        description: form.description || undefined,
        value: parseFloat(form.value) || 0,
        retentionPercent: parseFloat(form.retentionPercent) || 0,
      });
      setOpen(false);
      setForm(EMPTY);
      router.refresh();
    });
  }

  const totalValue     = contracts.reduce((s, c) => s + c.value, 0);
  const totalPaid      = contracts.reduce((s, c) => s + c.paidAmount, 0);
  const totalRetention = contracts.reduce((s, c) => s + c.value * (c.retentionPercent / 100), 0);

  if (contracts.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 gap-3">
        <ShoppingCart className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">{t("procurement.empty")}</p>
        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                {t("procurement.addContractBtn")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" dir={dir}>
              <DialogHeader><DialogTitle>{t("procurement.addDialogTitle")}</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label>{t("procurement.supplierNameLabel")}</Label>
                  <Input
                    value={form.supplierName}
                    onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
                    placeholder={t("procurement.supplierNamePlaceholder")}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("procurement.typeLabel")}</Label>
                  <Select value={form.supplierType} onValueChange={(v) => setForm({ ...form, supplierType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUBCONTRACTOR">{t("procurement.supplierTypeSubcontractor")}</SelectItem>
                      <SelectItem value="SUPPLIER">{t("procurement.supplierTypeSupplier")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>{t("procurement.descLabel")}</Label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder={t("procurement.descPlaceholder")}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{t("procurement.contractValueLabel")}</Label>
                    <Input
                      type="number" min="0" step="1000" dir="ltr"
                      value={form.value}
                      onChange={(e) => setForm({ ...form, value: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("procurement.retentionLabel")}</Label>
                    <Input
                      type="number" min="0" max="20" step="1" dir="ltr"
                      value={form.retentionPercent}
                      onChange={(e) => setForm({ ...form, retentionPercent: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setOpen(false)}>{t("procurement.cancel")}</Button>
                  <Button onClick={handleAdd} disabled={isPending}>{t("procurement.add")}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={handleSeed} disabled={isPending}>
            <Sparkles className="h-3.5 w-3.5 me-1.5" />
            {isPending ? t("procurement.loading") : t("procurement.demoData")}
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
          { label: t("procurement.statContractValue"), value: fmtCompact(totalValue),     color: "text-foreground" },
          { label: t("procurement.statPaid"),          value: fmtCompact(totalPaid),      color: "text-emerald-600" },
          { label: t("procurement.statRetention"),     value: fmtCompact(totalRetention), color: "text-orange-600" },
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
          <ShoppingCart className="h-3.5 w-3.5" />
          {t("procurement.sectionTitle")} ({contracts.length})
        </h4>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs">
              <Plus className="h-3.5 w-3.5 me-1" />
              {t("procurement.newContractBtnShort")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md" dir={dir}>
            <DialogHeader><DialogTitle>{t("procurement.addDialogTitleShort")}</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{t("procurement.supplierNameLabel")}</Label>
                  <Input
                    value={form.supplierName}
                    onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
                    placeholder={t("procurement.supplierNamePlaceholder2")}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("procurement.typeLabel")}</Label>
                  <Select value={form.supplierType} onValueChange={(v) => setForm({ ...form, supplierType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUBCONTRACTOR">{t("procurement.supplierTypeSubcontractor")}</SelectItem>
                      <SelectItem value="SUPPLIER">{t("procurement.supplierTypeSupplier")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>{t("procurement.descLabel")}</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={t("procurement.descPlaceholder2")}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{t("procurement.contractValueLabel")}</Label>
                  <Input
                    type="number"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("procurement.retentionLabelShort")}</Label>
                  <Input
                    type="number"
                    value={form.retentionPercent}
                    onChange={(e) => setForm({ ...form, retentionPercent: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setOpen(false)}>{t("procurement.cancel")}</Button>
                <Button onClick={handleAdd} disabled={isPending}>{t("procurement.add")}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Contract cards */}
      <div className="space-y-3">
        {contracts.map((c) => {
          const paidPct = c.value > 0 ? Math.min(100, (c.paidAmount / c.value) * 100) : 0;
          const cs = CONTRACT_STATUS_CLS[c.status] ?? "";
          return (
            <div key={c.id} className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{c.supplier.name}</span>
                    <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                      {supplierTypeLabel(c.supplier.type)}
                    </span>
                  </div>
                  {c.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{c.description}</p>
                  )}
                </div>
                <Badge variant="outline" className={`shrink-0 text-[10px] px-1.5 py-0.5 ${cs}`}>
                  {contractStatusLabel(c.status)}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <span className="text-muted-foreground">
                  {t("procurement.cardValue")}: <strong className="text-foreground">{fmtCompact(c.value)}</strong>
                </span>
                <span className="text-muted-foreground">
                  {t("procurement.cardPaid")}: <strong className="text-emerald-700">{fmtCompact(c.paidAmount)}</strong>
                </span>
                {c.retentionPercent > 0 && (
                  <span className="text-muted-foreground">
                    {t("procurement.cardRetention")}: <strong className="text-orange-600">{c.retentionPercent}%</strong>
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-muted-foreground">{t("procurement.cardPaymentProgress")}</span>
                  <span className="font-medium">{paidPct.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${paidPct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
