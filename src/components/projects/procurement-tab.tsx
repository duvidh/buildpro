"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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

const CONTRACT_STATUS: Record<string, { label: string; cls: string }> = {
  DRAFT:      { label: "טיוטה", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  ACTIVE:     { label: "פעיל",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  COMPLETED:  { label: "הושלם", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  TERMINATED: { label: "הופסק", cls: "bg-red-100 text-red-700 border-red-200" },
};

const SUPPLIER_TYPE_LABEL: Record<string, string> = {
  SUPPLIER:      "ספק",
  SUBCONTRACTOR: "קבלן משנה",
};

function fmtShekel(v: number) {
  if (Math.abs(v) >= 1_000_000) return `₪${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `₪${(v / 1_000).toFixed(0)}K`;
  return `₪${v.toLocaleString("he-IL", { maximumFractionDigits: 0 })}`;
}

const EMPTY = { supplierName: "", supplierType: "SUBCONTRACTOR", description: "", value: "", retentionPercent: "0" };

export function ProcurementTab({
  projectId,
  contracts,
}: {
  projectId: string;
  contracts: ProjectContract[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [isPending, startTransition] = useTransition();

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
        <p className="text-sm text-muted-foreground">אין חוזי קבלני משנה עדיין.</p>
        <Button variant="outline" size="sm" onClick={handleSeed} disabled={isPending}>
          <Sparkles className="h-3.5 w-3.5 me-1.5" />
          {isPending ? "טוען..." : "הוסף נתוני דמו"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "שווי חוזים", value: fmtShekel(totalValue),     color: "text-foreground" },
          { label: "שולם",       value: fmtShekel(totalPaid),      color: "text-emerald-600" },
          { label: "עכבון",      value: fmtShekel(totalRetention), color: "text-orange-600" },
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
          חוזים ({contracts.length})
        </h4>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs">
              <Plus className="h-3.5 w-3.5 me-1" />
              חוזה חדש
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader><DialogTitle>הוספת חוזה</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>שם הספק / קבלן *</Label>
                  <Input
                    value={form.supplierName}
                    onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
                    placeholder="שם הספק"
                  />
                </div>
                <div className="space-y-1">
                  <Label>סוג</Label>
                  <Select value={form.supplierType} onValueChange={(v) => setForm({ ...form, supplierType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUBCONTRACTOR">קבלן משנה</SelectItem>
                      <SelectItem value="SUPPLIER">ספק</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>תיאור עבודה</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="תאר את עבודת הקבלן..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>שווי חוזה (₪) *</Label>
                  <Input
                    type="number"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label>עכבון %</Label>
                  <Input
                    type="number"
                    value={form.retentionPercent}
                    onChange={(e) => setForm({ ...form, retentionPercent: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
                <Button onClick={handleAdd} disabled={isPending}>הוסף</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Contract cards */}
      <div className="space-y-3">
        {contracts.map((c) => {
          const paidPct = c.value > 0 ? Math.min(100, (c.paidAmount / c.value) * 100) : 0;
          const cs = CONTRACT_STATUS[c.status] ?? { label: c.status, cls: "" };
          return (
            <div key={c.id} className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{c.supplier.name}</span>
                    <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                      {SUPPLIER_TYPE_LABEL[c.supplier.type] ?? c.supplier.type}
                    </span>
                  </div>
                  {c.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{c.description}</p>
                  )}
                </div>
                <Badge variant="outline" className={`shrink-0 text-[10px] px-1.5 py-0.5 ${cs.cls}`}>
                  {cs.label}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <span className="text-muted-foreground">
                  שווי: <strong className="text-foreground">{fmtShekel(c.value)}</strong>
                </span>
                <span className="text-muted-foreground">
                  שולם: <strong className="text-emerald-700">{fmtShekel(c.paidAmount)}</strong>
                </span>
                {c.retentionPercent > 0 && (
                  <span className="text-muted-foreground">
                    עכבון: <strong className="text-orange-600">{c.retentionPercent}%</strong>
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-muted-foreground">תשלום</span>
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
