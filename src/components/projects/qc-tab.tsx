"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
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

const QC_RESULT_CLS: Record<string, string> = {
  PASS:    "bg-emerald-100 text-emerald-700 border-emerald-200",
  FAIL:    "bg-red-100 text-red-700 border-red-200",
  PENDING: "bg-orange-100 text-orange-700 border-orange-200",
};

const NCR_SEVERITY_CLS: Record<string, string> = {
  LOW:      "bg-slate-100 text-slate-600 border-slate-200",
  MEDIUM:   "bg-orange-100 text-orange-600 border-orange-200",
  HIGH:     "bg-red-100 text-red-700 border-red-200",
  CRITICAL: "bg-red-200 text-red-800 border-red-300",
};

const NCR_STATUS_CLS: Record<string, string> = {
  OPEN:        "bg-red-100 text-red-700 border-red-200",
  IN_PROGRESS: "bg-orange-100 text-orange-700 border-orange-200",
  CLOSED:      "bg-emerald-100 text-emerald-700 border-emerald-200",
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
  const t = useTranslations("projects");
  const locale = useLocale();
  const dir = locale === "he" ? "rtl" : "ltr";

  const router = useRouter();
  const [qcOpen, setQcOpen] = useState(false);
  const [ncrOpen, setNcrOpen] = useState(false);
  const [qcForm, setQcForm] = useState(EMPTY_QC);
  const [ncrForm, setNcrForm] = useState(EMPTY_NCR);
  const [isPending, startTransition] = useTransition();

  // Label lookups using translations
  const qcResultLabel = (result: string) => {
    const map: Record<string, string> = {
      PASS: t("qc.resultPass"), FAIL: t("qc.resultFail"), PENDING: t("qc.resultPending"),
    };
    return map[result] ?? result;
  };
  const ncrSeverityLabel = (sev: string) => {
    const map: Record<string, string> = {
      LOW: t("qc.severityLow"), MEDIUM: t("qc.severityMedium"),
      HIGH: t("qc.severityHigh"), CRITICAL: t("qc.severityCritical"),
    };
    return map[sev] ?? sev;
  };
  const ncrStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      OPEN: t("qc.statusOpen"), IN_PROGRESS: t("qc.statusInProgress"), CLOSED: t("qc.statusClosed"),
    };
    return map[status] ?? status;
  };

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
        <p className="text-sm text-muted-foreground">{t("qc.empty")}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {/* New QC Check */}
          <Dialog open={qcOpen} onOpenChange={setQcOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                {t("qc.newQCBtn")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" dir={dir}>
              <DialogHeader><DialogTitle>{t("qc.qcDialogTitle")}</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label>{t("qc.typeLabel")}</Label>
                  <Input
                    value={qcForm.type}
                    onChange={(e) => setQcForm({ ...qcForm, type: e.target.value })}
                    placeholder={t("qc.typePlaceholder")}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("qc.resultLabel")}</Label>
                  <Select value={qcForm.result} onValueChange={(v) => setQcForm({ ...qcForm, result: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PASS">{t("qc.resultPass")}</SelectItem>
                      <SelectItem value="FAIL">{t("qc.resultFail")}</SelectItem>
                      <SelectItem value="PENDING">{t("qc.resultPending")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>{t("qc.inspectorLabel")}</Label>
                  <Input
                    value={qcForm.inspector}
                    onChange={(e) => setQcForm({ ...qcForm, inspector: e.target.value })}
                    placeholder={t("qc.inspectorPlaceholder")}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("qc.notesLabel")}</Label>
                  <Textarea
                    value={qcForm.notes}
                    onChange={(e) => setQcForm({ ...qcForm, notes: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setQcOpen(false)}>{t("qc.cancel")}</Button>
                  <Button onClick={handleAddQC} disabled={isPending}>{t("qc.add")}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* New NCR */}
          <Dialog open={ncrOpen} onOpenChange={setNcrOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                {t("qc.newNCRBtn")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" dir={dir}>
              <DialogHeader><DialogTitle>{t("qc.ncrDialogTitle")}</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label>{t("qc.ncrDescLabel")}</Label>
                  <Textarea
                    value={ncrForm.description}
                    onChange={(e) => setNcrForm({ ...ncrForm, description: e.target.value })}
                    placeholder={t("qc.ncrDescPlaceholder")}
                    rows={3}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("qc.severityLabel")}</Label>
                  <Select value={ncrForm.severity} onValueChange={(v) => setNcrForm({ ...ncrForm, severity: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">{t("qc.severityLow")}</SelectItem>
                      <SelectItem value="MEDIUM">{t("qc.severityMedium")}</SelectItem>
                      <SelectItem value="HIGH">{t("qc.severityHigh")}</SelectItem>
                      <SelectItem value="CRITICAL">{t("qc.severityCritical")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>{t("qc.assignedLabel")}</Label>
                  <Input
                    value={ncrForm.assignedTo}
                    onChange={(e) => setNcrForm({ ...ncrForm, assignedTo: e.target.value })}
                    placeholder={t("qc.assignedPlaceholder")}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setNcrOpen(false)}>{t("qc.cancel")}</Button>
                  <Button onClick={handleAddNCR} disabled={isPending}>{t("qc.add")}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="sm" onClick={handleSeed} disabled={isPending}>
            <Sparkles className="h-3.5 w-3.5 me-1.5" />
            {isPending ? t("qc.loading") : t("qc.demoData")}
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
          { label: t("qc.statTotal"),    value: qualityChecks.length, color: "text-foreground" },
          { label: t("qc.statPassRate"), value: `${passRate}%`,       color: passRate >= 80 ? "text-emerald-600" : "text-orange-600" },
          { label: t("qc.statOpenNCR"),  value: openNCRs,             color: openNCRs > 0 ? "text-red-600" : "text-emerald-600" },
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
            {t("qc.sectionQCTitle")} ({qualityChecks.length})
          </h4>
          <Dialog open={qcOpen} onOpenChange={setQcOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs">
                <Plus className="h-3.5 w-3.5 me-1" />
                {t("qc.newQCBtnShort")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" dir={dir}>
              <DialogHeader><DialogTitle>{t("qc.qcDialogTitle")}</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label>{t("qc.subjectLabel")}</Label>
                  <Input value={qcForm.type} onChange={(e) => setQcForm({ ...qcForm, type: e.target.value })} placeholder={t("qc.subjectPlaceholder")} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{t("qc.resultLabel")}</Label>
                    <Select value={qcForm.result} onValueChange={(v) => setQcForm({ ...qcForm, result: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PASS">{t("qc.resultPass")}</SelectItem>
                        <SelectItem value="FAIL">{t("qc.resultFail")}</SelectItem>
                        <SelectItem value="PENDING">{t("qc.resultPending")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{t("qc.inspectorAndSupervisorLabel")}</Label>
                    <Input value={qcForm.inspector} onChange={(e) => setQcForm({ ...qcForm, inspector: e.target.value })} placeholder={t("qc.engineerPlaceholder")} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>{t("qc.notesLabel")}</Label>
                  <Input value={qcForm.notes} onChange={(e) => setQcForm({ ...qcForm, notes: e.target.value })} />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={() => setQcOpen(false)}>{t("qc.cancel")}</Button>
                  <Button onClick={handleAddQC} disabled={isPending}>{t("qc.add")}</Button>
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
                <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs">{t("qc.colType")}</th>
                <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs hidden sm:table-cell">{t("qc.colInspector")}</th>
                <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs hidden md:table-cell">{t("qc.colDate")}</th>
                <th className="text-center font-medium text-muted-foreground px-3 py-2 text-xs">{t("qc.colResult")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {qualityChecks.map((qc) => (
                <tr key={qc.id} className="hover:bg-muted/20">
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-xs leading-snug">{qc.type}</p>
                    {qc.notes && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{qc.notes}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">{qc.inspector ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground hidden md:table-cell">{fmtDate(qc.date)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-center">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${QC_RESULT_CLS[qc.result] ?? ""}`}>
                        {qcResultLabel(qc.result)}
                      </Badge>
                    </div>
                  </td>
                </tr>
              ))}
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
            {t("qc.sectionNCRTitle")} ({ncrs.length})
          </h4>
          <Dialog open={ncrOpen} onOpenChange={setNcrOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs">
                <Plus className="h-3.5 w-3.5 me-1" />
                {t("qc.newNCRBtn")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" dir={dir}>
              <DialogHeader><DialogTitle>{t("qc.ncrDialogTitleShort")}</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label>{t("qc.ncrDefectLabel")}</Label>
                  <Textarea value={ncrForm.description} onChange={(e) => setNcrForm({ ...ncrForm, description: e.target.value })} placeholder={t("qc.ncrDefectPlaceholder")} rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{t("qc.severityLabel")}</Label>
                    <Select value={ncrForm.severity} onValueChange={(v) => setNcrForm({ ...ncrForm, severity: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">{t("qc.severityLow")}</SelectItem>
                        <SelectItem value="MEDIUM">{t("qc.severityMedium")}</SelectItem>
                        <SelectItem value="HIGH">{t("qc.severityHigh")}</SelectItem>
                        <SelectItem value="CRITICAL">{t("qc.severityCritical")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{t("qc.assignedHandlerLabel")}</Label>
                    <Input value={ncrForm.assignedTo} onChange={(e) => setNcrForm({ ...ncrForm, assignedTo: e.target.value })} placeholder={t("qc.assignedSubPlaceholder")} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={() => setNcrOpen(false)}>{t("qc.cancel")}</Button>
                  <Button onClick={handleAddNCR} disabled={isPending}>{t("qc.openNCR")}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {ncrs.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 px-1">{t("qc.noNCR")}</p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs">{t("qc.colDescription")}</th>
                  <th className="text-center font-medium text-muted-foreground px-3 py-2 text-xs">{t("qc.colSeverity")}</th>
                  <th className="text-center font-medium text-muted-foreground px-3 py-2 text-xs">{t("qc.colStatus")}</th>
                  <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs hidden sm:table-cell">{t("qc.colAssigned")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ncrs.map((ncr) => (
                  <tr key={ncr.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2.5">
                      <p className="text-xs leading-snug">{ncr.description}</p>
                      {ncr.resolution && (
                        <p className="text-[11px] text-emerald-600 mt-0.5">✓ {ncr.resolution}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-center">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${NCR_SEVERITY_CLS[ncr.severity] ?? ""}`}>
                          {ncrSeverityLabel(ncr.severity)}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-center">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${NCR_STATUS_CLS[ncr.status] ?? ""}`}>
                          {ncrStatusLabel(ncr.status)}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">{ncr.assignedTo ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
