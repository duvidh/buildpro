"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { createRisk, seedRisks, updateRiskStatus } from "@/actions/risks";

type RiskEntry = {
  id: string;
  description: string;
  probability: number;
  impact: number;
  mitigation: string | null;
  status: string;
};

const RISK_STATUS: Record<string, { label: string; cls: string }> = {
  OPEN:      { label: "פתוח",   cls: "bg-red-100 text-red-700 border-red-200" },
  MITIGATED: { label: "בטיפול", cls: "bg-orange-100 text-orange-700 border-orange-200" },
  CLOSED:    { label: "סגור",   cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

function riskScore(probability: number, impact: number) {
  const score = probability * impact;
  if (score >= 16) return { label: "קריטי",  cls: "bg-red-200 text-red-900 border-red-300",           score };
  if (score >= 10) return { label: "גבוה",   cls: "bg-red-100 text-red-700 border-red-200",           score };
  if (score >= 5)  return { label: "בינוני", cls: "bg-orange-100 text-orange-700 border-orange-200",  score };
  return             { label: "נמוך",   cls: "bg-slate-100 text-slate-600 border-slate-200",  score };
}

const PROB_LABEL: Record<number, string> = { 1: "נמוכה מאד", 2: "נמוכה", 3: "בינונית", 4: "גבוהה", 5: "גבוהה מאד" };
const IMPACT_LABEL: Record<number, string> = { 1: "זניח", 2: "נמוך", 3: "בינוני", 4: "גבוה", 5: "קריטי" };

const EMPTY = { description: "", probability: "3", impact: "3", mitigation: "" };

export function RisksTab({
  projectId,
  risks,
}: {
  projectId: string;
  risks: RiskEntry[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [isPending, startTransition] = useTransition();

  function handleSeed() {
    startTransition(async () => {
      await seedRisks(projectId);
      router.refresh();
    });
  }

  function handleAdd() {
    if (!form.description.trim()) return;
    startTransition(async () => {
      await createRisk({
        projectId,
        description: form.description,
        probability: Number(form.probability),
        impact: Number(form.impact),
        mitigation: form.mitigation || undefined,
      });
      setOpen(false);
      setForm(EMPTY);
      router.refresh();
    });
  }

  function handleStatusChange(id: string, status: string) {
    startTransition(async () => {
      await updateRiskStatus(id, status, projectId);
      router.refresh();
    });
  }

  const openCount  = risks.filter((r) => r.status === "OPEN").length;
  const highCount  = risks.filter((r) => riskScore(r.probability, r.impact).score >= 10).length;

  if (risks.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 gap-3">
        <AlertTriangle className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">אין נתוני סיכונים עדיין.</p>
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
          { label: "סה״כ סיכונים",   value: risks.length, color: "text-foreground" },
          { label: "סיכונים פתוחים", value: openCount,    color: openCount > 0  ? "text-red-600"    : "text-emerald-600" },
          { label: "סיכונים גבוהים", value: highCount,    color: highCount > 0  ? "text-red-700"    : "text-emerald-600" },
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
          <AlertTriangle className="h-3.5 w-3.5" />
          מאגר סיכונים ({risks.length})
        </h4>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs">
              <Plus className="h-3.5 w-3.5 me-1" />
              סיכון חדש
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader><DialogTitle>הוספת סיכון</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label>תיאור הסיכון *</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="תאר את הסיכון..."
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>סבירות (1–5)</Label>
                  <Select value={form.probability} onValueChange={(v) => setForm({ ...form, probability: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n} — {PROB_LABEL[n]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>השפעה (1–5)</Label>
                  <Select value={form.impact} onValueChange={(v) => setForm({ ...form, impact: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n} — {IMPACT_LABEL[n]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>פעולות מיטיגציה</Label>
                <Input
                  value={form.mitigation}
                  onChange={(e) => setForm({ ...form, mitigation: e.target.value })}
                  placeholder="כיצד מתכננים להפחית את הסיכון..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
                <Button onClick={handleAdd} disabled={isPending}>הוסף</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs">תיאור</th>
              <th className="text-center font-medium text-muted-foreground px-3 py-2 text-xs">ציון</th>
              <th className="text-center font-medium text-muted-foreground px-3 py-2 text-xs hidden sm:table-cell">סבירות</th>
              <th className="text-center font-medium text-muted-foreground px-3 py-2 text-xs hidden sm:table-cell">השפעה</th>
              <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs">סטטוס</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {risks.map((risk) => {
              const rs = riskScore(risk.probability, risk.impact);
              return (
                <tr key={risk.id} className="hover:bg-muted/20">
                  <td className="px-3 py-2.5 max-w-[200px]">
                    <p className="text-xs leading-snug">{risk.description}</p>
                    {risk.mitigation && (
                      <p className="text-[11px] text-emerald-600 mt-0.5">✓ {risk.mitigation}</p>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-center">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 font-bold ${rs.cls}`}>
                        {rs.score} — {rs.label}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center text-xs text-muted-foreground hidden sm:table-cell">
                    {risk.probability}/5
                  </td>
                  <td className="px-3 py-2.5 text-center text-xs text-muted-foreground hidden sm:table-cell">
                    {risk.impact}/5
                  </td>
                  <td className="px-3 py-2.5">
                    <Select
                      value={risk.status}
                      onValueChange={(v) => handleStatusChange(risk.id, v)}
                      disabled={isPending}
                    >
                      <SelectTrigger className="h-7 text-[11px] w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPEN">פתוח</SelectItem>
                        <SelectItem value="MITIGATED">בטיפול</SelectItem>
                        <SelectItem value="CLOSED">סגור</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
