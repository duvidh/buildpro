"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCurrency } from "@/lib/currency-context";
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

const CR_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING:  { label: "ממתין", cls: "bg-orange-100 text-orange-700 border-orange-200" },
  APPROVED: { label: "אושר",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "נדחה",  cls: "bg-red-100 text-red-700 border-red-200" },
};

const EMPTY = { description: "", requestedBy: "", costImpact: "", scheduleImpact: "" };

export function CRTab({
  projectId,
  changeRequests,
}: {
  projectId: string;
  changeRequests: ChangeRequestEntry[];
}) {
  const { fmtCompact } = useCurrency();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [isPending, startTransition] = useTransition();

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
        <p className="text-sm text-muted-foreground">אין בקשות שינוי עדיין.</p>
        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                בקשת שינוי חדשה
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" dir="rtl">
              <DialogHeader><DialogTitle>בקשת שינוי חדשה</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label>תיאור השינוי *</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="תאר את השינוי המבוקש..."
                    rows={3}
                  />
                </div>
                <div className="space-y-1">
                  <Label>מבוקש על ידי *</Label>
                  <Input
                    value={form.requestedBy}
                    onChange={(e) => setForm({ ...form, requestedBy: e.target.value })}
                    placeholder="שם המבקש"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>השפעה על עלות</Label>
                    <Input
                      type="number" min="0" step="100" dir="ltr"
                      value={form.costImpact}
                      onChange={(e) => setForm({ ...form, costImpact: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>השפעה על לוח זמנים (ימים)</Label>
                    <Input
                      type="number" min="0" dir="ltr"
                      value={form.scheduleImpact}
                      onChange={(e) => setForm({ ...form, scheduleImpact: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setOpen(false)}>ביטול</Button>
                  <Button onClick={handleAdd} disabled={isPending}>הוסף</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={handleSeed} disabled={isPending}>
            <Sparkles className="h-3.5 w-3.5 me-1.5" />
            {isPending ? "טוען..." : "נתוני דמו"}
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
          { label: "סה״כ בקשות",     value: changeRequests.length,           color: "text-foreground" },
          { label: "עלות מאושרת",     value: fmtCompact(approvedTotal),        color: "text-emerald-600" },
          { label: "ממתינות לאישור",  value: pendingList.length,              color: pendingList.length > 0 ? "text-orange-600" : "text-emerald-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {pendingList.length > 0 && (
        <div className="rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 text-xs text-orange-700">
          {pendingList.length} בקשה/ות ממתינות לאישור · עלות פוטנציאלית:{" "}
          {fmtCompact(pendingList.reduce((s, cr) => s + cr.costImpact, 0))}
        </div>
      )}

      {/* Header + Add */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
          <GitPullRequest className="h-3.5 w-3.5" />
          בקשות שינוי ({changeRequests.length})
        </h4>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs">
              <Plus className="h-3.5 w-3.5 me-1" />
              בקשה חדשה
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader><DialogTitle>בקשת שינוי חדשה</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label>תיאור השינוי *</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="תאר את השינוי המבוקש..."
                  rows={2}
                />
              </div>
              <div className="space-y-1">
                <Label>מבוקש על ידי *</Label>
                <Input
                  value={form.requestedBy}
                  onChange={(e) => setForm({ ...form, requestedBy: e.target.value })}
                  placeholder="שם הלקוח / גורם מבקש"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>השפעה תקציבית</Label>
                  <Input
                    type="number"
                    value={form.costImpact}
                    onChange={(e) => setForm({ ...form, costImpact: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label>עיכוב בימים</Label>
                  <Input
                    type="number"
                    value={form.scheduleImpact}
                    onChange={(e) => setForm({ ...form, scheduleImpact: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
                <Button onClick={handleAdd} disabled={isPending}>שלח בקשה</Button>
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
              <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs">תיאור</th>
              <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs hidden sm:table-cell">מבקש</th>
              <th className="text-end font-medium text-muted-foreground px-3 py-2 text-xs">עלות</th>
              <th className="text-center font-medium text-muted-foreground px-3 py-2 text-xs">סטטוס</th>
              <th className="text-center font-medium text-muted-foreground px-3 py-2 text-xs hidden md:table-cell">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {changeRequests.map((cr) => {
              const st = CR_STATUS[cr.status] ?? { label: cr.status, cls: "" };
              return (
                <tr key={cr.id} className="hover:bg-muted/20">
                  <td className="px-3 py-2.5 max-w-[180px]">
                    <p className="text-xs leading-snug">{cr.description}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{fmtDate(cr.date)}</p>
                    {cr.scheduleImpact > 0 && (
                      <p className="text-[11px] text-orange-600 mt-0.5">+{cr.scheduleImpact} ימי עיכוב</p>
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
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${st.cls}`}>
                        {st.label}
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
                          אשר
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] px-2 text-red-700 border-red-200 hover:bg-red-50"
                          onClick={() => handleStatus(cr.id, "REJECTED")}
                          disabled={isPending}
                        >
                          <X className="h-3 w-3 me-0.5" />
                          דחה
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
