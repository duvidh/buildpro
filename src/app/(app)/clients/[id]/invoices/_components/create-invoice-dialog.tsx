"use client";

import { useCurrency } from "@/lib/currency-context";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { createInvoice } from "@/actions/invoices";

type Project = { id: string; name: string };

const EMPTY = {
  projectId:  "",
  date:       new Date().toISOString().split("T")[0],
  dueDate:    "",
  amount:     "",
  taxPercent: "17",
  notes:      "",
};

export function CreateInvoiceDialog({
  clientId,
  projects,
}: {
  clientId: string;
  projects: Project[];
}) {
  const { fmtAmount } = useCurrency();
  const router                  = useRouter();
  const [open,    setOpen]      = useState(false);
  const [form,    setForm]      = useState(EMPTY);
  const [error,   setError]     = useState("");
  const [isPending, startTx]    = useTransition();

  // Live preview
  const amountNum  = parseFloat(form.amount)    || 0;
  const taxPct     = parseFloat(form.taxPercent) || 0;
  const taxAmount  = Math.round(amountNum * (taxPct / 100) * 100) / 100;
  const total      = amountNum + taxAmount;

  function reset() {
    setForm(EMPTY);
    setError("");
  }

  function handleOpen(v: boolean) {
    setOpen(v);
    if (!v) reset();
  }

  function handleSubmit() {
    if (!form.projectId)       { setError("נא לבחור פרויקט");         return; }
    if (!form.date)            { setError("נא להזין תאריך חשבונית"); return; }
    if (!form.amount || amountNum <= 0) { setError("נא להזין סכום תקין"); return; }

    setError("");
    startTx(async () => {
      const res = await createInvoice({
        clientId,
        projectId:  form.projectId,
        date:       form.date,
        dueDate:    form.dueDate || undefined,
        amount:     amountNum,
        taxPercent: taxPct,
        notes:      form.notes || undefined,
      });
      if (res.success) {
        setOpen(false);
        router.refresh();
      } else {
        setError((res as { error?: string }).error ?? "שגיאה ביצירת חשבונית");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          חשבונית חדשה
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>יצירת חשבונית חדשה</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Project */}
          <div className="space-y-1.5">
            <Label>פרויקט *</Label>
            {projects.length === 0 ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm">
                <p className="text-destructive font-medium mb-1">ללקוח זה אין פרויקטים עדיין</p>
                <p className="text-xs text-muted-foreground mb-2">חשבונית חייבת להיות מקושרת לפרויקט. צור פרויקט קודם ואז חזור ליצור את החשבונית.</p>
                <Link
                  href="/projects"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  onClick={() => setOpen(false)}
                >
                  <ExternalLink className="h-3 w-3" />
                  עבור לפרויקטים ליצירת פרויקט חדש
                </Link>
              </div>
            ) : (
              <Select value={form.projectId} onValueChange={(v) => setForm({ ...form, projectId: v })}>
                <SelectTrigger><SelectValue placeholder="בחר פרויקט" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Date only (invoice number is auto-generated) */}
          <div className="space-y-1.5">
            <Label>תאריך חשבונית *</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>

          {/* Due date */}
          <div className="space-y-1.5">
            <Label>תאריך לתשלום</Label>
            <Input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>

          {/* Amount + Tax */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>סכום לפני מע״מ *</Label>
              <Input
                type="number" min="0" step="100" dir="ltr"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>מע״מ (%)</Label>
              <Input
                type="number" min="0" max="30" step="1" dir="ltr"
                value={form.taxPercent}
                onChange={(e) => setForm({ ...form, taxPercent: e.target.value })}
              />
            </div>
          </div>

          {/* Live total preview */}
          {amountNum > 0 && (
            <div className="rounded-lg bg-muted/40 border border-border px-4 py-3 text-xs space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>לפני מע״מ</span>
                <span className="tabular-nums">{fmtAmount(amountNum)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>מע״מ {taxPct}%</span>
                <span className="tabular-nums">{fmtAmount(taxAmount)}</span>
              </div>
              <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1 mt-1">
                <span>סה״כ לתשלום</span>
                <span className="tabular-nums text-emerald-700">{fmtAmount(total)}</span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>הערות</Label>
            <Textarea
              placeholder="הערות לחשבונית (אופציונלי)"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => handleOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleSubmit} disabled={isPending || projects.length === 0}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
              צור חשבונית
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
