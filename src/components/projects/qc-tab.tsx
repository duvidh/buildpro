"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles, ShieldCheck, AlertTriangle } from "lucide-react";
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
import { createQualityCheck, createNCR, seedQualityData } from "@/actions/quality";
import { fmtDate } from "@/lib/utils";

type QCCheck = {
  id: string;
  date: Date;
  type: string;
  result: string;
  inspector: string | null;
  notes: string | null;
};

type NCREntry = {
  id: string;
  date: Date;
  description: string;
  severity: string;
  status: string;
  assignedTo: string | null;
  resolution: string | null;
};

const QC_RESULT: Record<string, { label: string; cls: string }> = {
  PASS:    { label: "עבר",    cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  FAIL:    { label: "נכשל",   cls: "bg-red-100 text-red-700 border-red-200" },
  PENDING: { label: "ממתין",  cls: "bg-orange-100 text-orange-700 border-orange-200" },
};

const NCR_SEVERITY: Record<string, { label: string; cls: string }> = {
  LOW:      { label: "נמוכה",    cls: "bg-slate-100 text-slate-600 border-slate-200" },
  MEDIUM:   { label: "בינונית",  cls: "bg-orange-100 text-orange-600 border-orange-200" },
  HIGH:     { label: "גבוהה",    cls: "bg-red-100 text-red-700 border-red-200" },
  CRITICAL: { label: "קריטי",    cls: "bg-red-200 text-red-800 border-red-300" },
};

const NCR_STATUS: Record<string, { label: string; cls: string }> = {
  OPEN:        { label: "פתוח",     cls: "bg-red-100 text-red-700 border-red-200" },
  IN_PROGRESS: { label: "בטיפול",   cls: "bg-orange-100 text-orange-700 border-orange-200" },
  CLOSED:      { label: "סגור",     cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

const EMPTY_QC = { type: "", result: "PASS", inspector: "", notes: "" };
const EMPTY_NCR = { description: "", severity: "MEDIUM", assignedTo: "" };

export function QCTab({
  projectId,
  qualityChecks,
  ncrs,
}: {
  projectId: string;
  qualityChecks: QCCheck[];
  ncrs: NCREntry[];
}) {
  const router = useRouter();
  const [qcOpen, setQcOpen] = useState(false);
  const [ncrOpen, setNcrOpen] = useState(false);
  const [qcForm, setQcForm] = useState(EMPTY_QC);
  const [ncrForm, setNcrForm] = useState(EMPTY_NCR);
  const [isPending, startTransition] = useTransition();

  function handleSeed() {
    startTransition(async () => {
      await seedQualityData(projectId);
      router.refresh();
    });
  }

  function handleAddQC() {
    if (!qcForm.type.trim()) return;
    startTransition(async () => {
      await createQualityCheck({ projectId, ...qcForm });
      setQcOpen(false);
      setQcForm(EMPTY_QC);
      router.refresh();
    });
  }

  function handleAddNCR() {
    if (!ncrForm.description.trim()) return;
    startTransition(async () => {
      await createNCR({ projectId, ...ncrForm });
      setNcrOpen(false);
      setNcrForm(EMPTY_NCR);
      router.refresh();
    });
  }

  const passRate = qualityChecks.length
    ? Math.round((qualityChecks.filter((q) => q.result === "PASS").length / qualityChecks.length) * 100)
    : 0;
  const openNCRs = ncrs.filter((n) => n.status !== "CLOSED").length;

  if (qualityChecks.length === 0 && ncrs.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 gap-4">
        <ShieldCheck className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">אין נתוני בקרת איכות עדיין.</p>
        <div className="flex flex-wrap justify-center gap-2">
          {/* New QC Check */}
          <Dialog open={qcOpen} onOpenChange={setQcOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                בדיקת איכות חדשה
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" dir="rtl">
              <DialogHeader><DialogTitle>בדיקת איכות חדשה</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label>סוג בדיקה *</Label>
                  <Input
                    value={qcForm.type}
                    onChange={(e) => setQcForm({ ...qcForm, type: e.target.value })}
                    placeholder="למשל: בדיקת יסודות, בדיקת חשמל..."
                  />
                </div>
                <div className="space-y-1">
                  <Label>תוצאה</Label>
                  <Select value={qcForm.result} onValueChange={(v) => setQcForm({ ...qcForm, result: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PASS">עבר</SelectItem>
                      <SelectItem value="FAIL">נכשל</SelectItem>
                      <SelectItem value="PENDING">ממתין</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>מפקח</Label>
                  <Input
                    value={qcForm.inspector}
                    onChange={(e) => setQcForm({ ...qcForm, inspector: e.target.value })}
                    placeholder="שם המפקח"
                  />
                </div>
                <div className="space-y-1">
                  <Label>הערות</Label>
                  <Textarea
                    value={qcForm.notes}
                    onChange={(e) => setQcForm({ ...qcForm, notes: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setQcOpen(false)}>ביטול</Button>
                  <Button onClick={handleAddQC} disabled={isPending}>הוסף</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* New NCR */}
          <Dialog open={ncrOpen} onOpenChange={setNcrOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                NCR חדש
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" dir="rtl">
              <DialogHeader><DialogTitle>דוח אי-התאמה חדש (NCR)</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label>תיאור הבעיה *</Label>
                  <Textarea
                    value={ncrForm.description}
                    onChange={(e) => setNcrForm({ ...ncrForm, description: e.target.value })}
                    placeholder="תאר את אי-ההתאמה..."
                    rows={3}
                  />
                </div>
                <div className="space-y-1">
                  <Label>חומרה</Label>
                  <Select value={ncrForm.severity} onValueChange={(v) => setNcrForm({ ...ncrForm, severity: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">נמוכה</SelectItem>
                      <SelectItem value="MEDIUM">בינונית</SelectItem>
                      <SelectItem value="HIGH">גבוהה</SelectItem>
                      <SelectItem value="CRITICAL">קריטי</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>אחראי לטיפול</Label>
                  <Input
                    value={ncrForm.assignedTo}
                    onChange={(e) => setNcrForm({ ...ncrForm, assignedTo: e.target.value })}
                    placeholder="שם האחראי"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setNcrOpen(false)}>ביטול</Button>
                  <Button onClick={handleAddNCR} disabled={isPending}>הוסף</Button>
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
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "סה״כ בדיקות", value: qualityChecks.length, color: "text-foreground" },
          { label: "אחוז מעבר",   value: `${passRate}%`,       color: passRate >= 80 ? "text-emerald-600" : "text-orange-600" },
          { label: "NCR פתוחים",  value: openNCRs,             color: openNCRs > 0 ? "text-red-600" : "text-emerald-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Quality Checks */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            בדיקות איכות ({qualityChecks.length})
          </h4>
          <Dialog open={qcOpen} onOpenChange={setQcOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs">
                <Plus className="h-3.5 w-3.5 me-1" />
                בדיקה חדשה
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" dir="rtl">
              <DialogHeader><DialogTitle>בדיקת איכות חדשה</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label>נושא הבדיקה *</Label>
                  <Input value={qcForm.type} onChange={(e) => setQcForm({ ...qcForm, type: e.target.value })} placeholder="יציקת בטון — תקרת קומה א׳" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>תוצאה</Label>
                    <Select value={qcForm.result} onValueChange={(v) => setQcForm({ ...qcForm, result: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PASS">עבר</SelectItem>
                        <SelectItem value="FAIL">נכשל</SelectItem>
                        <SelectItem value="PENDING">ממתין</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>בודק / מפקח</Label>
                    <Input value={qcForm.inspector} onChange={(e) => setQcForm({ ...qcForm, inspector: e.target.value })} placeholder="שם המהנדס" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>הערות</Label>
                  <Input value={qcForm.notes} onChange={(e) => setQcForm({ ...qcForm, notes: e.target.value })} placeholder="פרטים נוספים..." />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={() => setQcOpen(false)}>ביטול</Button>
                  <Button onClick={handleAddQC} disabled={isPending}>הוסף</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs">נושא הבדיקה</th>
                <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs hidden sm:table-cell">בודק</th>
                <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs hidden md:table-cell">תאריך</th>
                <th className="text-center font-medium text-muted-foreground px-3 py-2 text-xs">תוצאה</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {qualityChecks.map((qc) => {
                const res = QC_RESULT[qc.result] ?? { label: qc.result, cls: "" };
                return (
                  <tr key={qc.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-xs leading-snug">{qc.type}</p>
                      {qc.notes && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{qc.notes}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">{qc.inspector ?? "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground hidden md:table-cell">{fmtDate(qc.date)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-center">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${res.cls}`}>{res.label}</Badge>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      </section>

      {/* NCRs */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            דוחות אי-התאמה — NCR ({ncrs.length})
          </h4>
          <Dialog open={ncrOpen} onOpenChange={setNcrOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs">
                <Plus className="h-3.5 w-3.5 me-1" />
                NCR חדש
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" dir="rtl">
              <DialogHeader><DialogTitle>דוח אי-התאמה חדש</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label>תיאור הליקוי *</Label>
                  <Textarea value={ncrForm.description} onChange={(e) => setNcrForm({ ...ncrForm, description: e.target.value })} placeholder="תיאור מפורט של הבעיה שהתגלתה..." rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>חומרה</Label>
                    <Select value={ncrForm.severity} onValueChange={(v) => setNcrForm({ ...ncrForm, severity: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">נמוכה</SelectItem>
                        <SelectItem value="MEDIUM">בינונית</SelectItem>
                        <SelectItem value="HIGH">גבוהה</SelectItem>
                        <SelectItem value="CRITICAL">קריטי</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>אחראי טיפול</Label>
                    <Input value={ncrForm.assignedTo} onChange={(e) => setNcrForm({ ...ncrForm, assignedTo: e.target.value })} placeholder="שם העובד / קבלן" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={() => setNcrOpen(false)}>ביטול</Button>
                  <Button onClick={handleAddNCR} disabled={isPending}>פתח NCR</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {ncrs.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 px-1">אין דוחות NCR פתוחים.</p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs">תיאור הליקוי</th>
                  <th className="text-center font-medium text-muted-foreground px-3 py-2 text-xs">חומרה</th>
                  <th className="text-center font-medium text-muted-foreground px-3 py-2 text-xs">סטטוס</th>
                  <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs hidden sm:table-cell">אחראי</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ncrs.map((ncr) => {
                  const sev = NCR_SEVERITY[ncr.severity] ?? { label: ncr.severity, cls: "" };
                  const st = NCR_STATUS[ncr.status] ?? { label: ncr.status, cls: "" };
                  return (
                    <tr key={ncr.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2.5">
                        <p className="text-xs leading-snug">{ncr.description}</p>
                        {ncr.resolution && (
                          <p className="text-[11px] text-emerald-600 mt-0.5">✓ {ncr.resolution}</p>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-center">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${sev.cls}`}>{sev.label}</Badge>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-center">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${st.cls}`}>{st.label}</Badge>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">{ncr.assignedTo ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
