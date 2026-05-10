"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LayoutDashboard,
  CheckSquare,
  Milestone,
  GitBranch,
  ShieldCheck,
  AlertTriangle,
  GitPullRequest,
  ShoppingCart,
  CalendarRange,
  Settings2,
  FolderOpen,
  HardHat,
  Clock,
  Receipt,
  ClipboardList,
  Wallet,
  TrendingUp,
  TrendingDown,
  Users,
  Wrench,
  Lock,
  Plus,
  Loader2,
} from "lucide-react";
import { updateProjectSettings } from "@/actions/projects";
import { recordPayment } from "@/actions/finance";
import { TasksKanban } from "@/components/projects/tasks-kanban";
import { MilestonesTimeline } from "@/components/projects/milestones-timeline";
import { QCTab } from "@/components/projects/qc-tab";
import { RisksTab } from "@/components/projects/risks-tab";
import { CRTab } from "@/components/projects/cr-tab";
import { ProcurementTab } from "@/components/projects/procurement-tab";
import { WBSTab } from "@/components/projects/wbs-tab";
import { GanttTab } from "@/components/projects/gantt-tab";

// ─── Types ────────────────────────────────────────────────────────────────────

type SettingsState = {
  qcEnabled: boolean;
  risksEnabled: boolean;
  crEnabled: boolean;
  milestonesEnabled: boolean;
  wbsEnabled: boolean;
  procurementEnabled: boolean;
  ganttEnabled: boolean;
};

type Task = {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  assignedTo: { id: string; name: string } | null;
};

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

type Member = {
  id: string;
  role: string;
  user: { id: string; name: string; avatarUrl: string | null };
};

type Counts = {
  tasks: number;
  milestones: number;
  qualityChecks: number;
  ncrs: number;
  risks: number;
  changeRequests: number;
  contracts: number;
  workPackages: number;
  files: number;
};

type TimeEntry = {
  id: string;
  date: Date;
  hours: number;
  hourlyRate: number;
  totalCost: number;
  description: string | null;
  approved: boolean;
  employee: { id: string; name: string };
};

type ExpenseEntry = {
  id: string;
  date: Date;
  amount: number;
  category: string;
  description: string | null;
  approved: boolean;
  employee: { id: string; name: string } | null;
};

type DailyLogEntry = {
  id: string;
  date: Date;
  weatherConditions: string | null;
  visitors: string | null;
  safetyIncidents: string | null;
  notes: string | null;
  supervisor: { id: string; name: string } | null;
};

type InvoicePayment = {
  id: string;
  date: Date;
  amount: number;
  method: string;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  date: Date;
  dueDate: Date | null;
  status: string;
  amount: number;
  total: number;
  paidAmount: number;
  payments: InvoicePayment[];
};

type ContractPayment = {
  id: string;
  date: Date;
  amount: number;
};

type ProjectContract = {
  id: string;
  description: string | null;
  value: number;
  paidAmount: number;
  status: string;
  retentionPercent: number;
  supplier: { id: string; name: string; type: string };
  payments: ContractPayment[];
};

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

type RiskEntry = {
  id: string;
  description: string;
  probability: number;
  impact: number;
  mitigation: string | null;
  status: string;
};

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

type EquipmentLogEntry = {
  id: string;
  checkOutDate: Date;
  notes: string | null;
  equipment: { id: string; name: string; code: string | null; status: string };
};

type ProjectTabsProps = {
  projectId: string;
  initialSettings: SettingsState;
  tasks: Task[];
  milestones: MilestoneItem[];
  members: Member[];
  counts: Counts;
  timeEntries: TimeEntry[];
  expenses: ExpenseEntry[];
  dailyLogs: DailyLogEntry[];
  contractValue: number;
  invoices: Invoice[];
  contracts: ProjectContract[];
  changeRequests: ChangeRequestEntry[];
  equipmentLogs: EquipmentLogEntry[];
  qualityChecks: QCCheck[];
  ncrs: NCREntry[];
  risks: RiskEntry[];
  workPackages: WorkPackageEntry[];
};

// ─── Config ───────────────────────────────────────────────────────────────────

const TASK_STATUS: Record<string, { label: string; className: string }> = {
  TODO:        { label: "לביצוע", className: "bg-slate-100 text-slate-600 border-slate-200" },
  IN_PROGRESS: { label: "בביצוע", className: "bg-blue-100 text-blue-700 border-blue-200" },
  BLOCKED:     { label: "חסום",   className: "bg-red-100 text-red-700 border-red-200" },
  DONE:        { label: "הושלם",  className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

const MEMBER_ROLE: Record<string, string> = {
  MANAGER: "מנהל", ENGINEER: "מהנדס", FOREMAN: "ממונה", VIEWER: "צופה",
};

const INVOICE_STATUS: Record<string, { label: string; cls: string }> = {
  DRAFT:          { label: "טיוטה",        cls: "bg-slate-100 text-slate-600 border-slate-200" },
  SENT:           { label: "נשלחה",        cls: "bg-blue-100 text-blue-700 border-blue-200" },
  PARTIALLY_PAID: { label: "שולמה חלקית", cls: "bg-orange-100 text-orange-700 border-orange-200" },
  PAID:           { label: "שולמה",        cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  OVERDUE:        { label: "בפיגור",       cls: "bg-red-100 text-red-700 border-red-200" },
  CANCELLED:      { label: "בוטלה",        cls: "bg-slate-100 text-slate-500 border-slate-200" },
};

const CONTRACT_STATUS: Record<string, { label: string; cls: string }> = {
  DRAFT:      { label: "טיוטה",  cls: "bg-slate-100 text-slate-600 border-slate-200" },
  ACTIVE:     { label: "פעיל",   cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  COMPLETED:  { label: "הושלם",  cls: "bg-blue-100 text-blue-700 border-blue-200" },
  TERMINATED: { label: "הופסק",  cls: "bg-red-100 text-red-700 border-red-200" },
};

function fmtShekel(v: number) {
  if (Math.abs(v) >= 1_000_000) return `₪${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `₪${(v / 1_000).toFixed(0)}K`;
  return `₪${v.toLocaleString("he-IL", { maximumFractionDigits: 0 })}`;
}

const EXPENSE_CATEGORY_LABEL: Record<string, string> = {
  MATERIALS: "חומרי בניין",
  FUEL: "דלק",
  TOOLS: "כלים",
  MEALS: "אוכל",
  TRANSPORT: "תחבורה",
  OTHER: "אחר",
};

function fmt(date: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("he-IL").format(new Date(date));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmptyModule({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-muted-foreground text-sm">מודול {label} יתווסף בקרוב.</p>
      <p className="text-xs text-muted-foreground mt-1">הפעלת המודול בלשונית ״הגדרות״.</p>
    </div>
  );
}

function OverviewTab({
  tasks,
  milestones,
  members,
  counts,
  settings,
}: {
  tasks: Task[];
  milestones: MilestoneItem[];
  members: Member[];
  counts: Counts;
  settings: SettingsState;
}) {
  const doneTasks = tasks.filter((t) => t.status === "DONE").length;
  const pendingTasks = tasks.filter((t) => t.status !== "DONE").length;
  const upcomingMilestones = milestones.filter((m) => !m.completed).slice(0, 3);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "משימות פתוחות", value: pendingTasks, color: "text-blue-600" },
          { label: "משימות הושלמו", value: doneTasks, color: "text-emerald-600" },
          { label: "חברי צוות",     value: members.length, color: "text-violet-600" },
          { label: "קבצים",          value: counts.files,   color: "text-slate-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {tasks.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-2">משימות אחרונות</h4>
          <ul className="divide-y divide-border">
            {tasks.slice(0, 5).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 px-1">
                <p className="text-sm flex-1 min-w-0 truncate">{t.name}</p>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="outline"
                    className={`text-[10px] h-4 px-1.5 py-0 ${TASK_STATUS[t.status]?.className}`}
                  >
                    {TASK_STATUS[t.status]?.label ?? t.status}
                  </Badge>
                  {t.dueDate && (
                    <span className="text-[11px] text-muted-foreground">{fmt(t.dueDate)}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {settings.milestonesEnabled && upcomingMilestones.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-2">אבני דרך קרובות</h4>
          <ul className="divide-y divide-border">
            {upcomingMilestones.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-2.5 px-1">
                <p className="text-sm">{m.name}</p>
                <span className="text-xs text-muted-foreground">{fmt(m.date)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {members.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-2">צוות הפרויקט</h4>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {m.user.name[0]}
                </div>
                <span className="text-xs font-medium">{m.user.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {MEMBER_ROLE[m.role] ?? m.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tasks.length === 0 && members.length === 0 && (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <p className="text-sm text-muted-foreground">פרויקט חדש — אין נתונים עדיין.</p>
          <p className="text-xs text-muted-foreground mt-1">
            עבור ללשונית ״משימות״ כדי להוסיף נתוני דמו ולהתחיל.
          </p>
        </div>
      )}
    </div>
  );
}

function FieldReportsTab({
  timeEntries,
  expenses,
  dailyLogs,
}: {
  timeEntries: TimeEntry[];
  expenses: ExpenseEntry[];
  dailyLogs: DailyLogEntry[];
}) {
  const totalHours = timeEntries.reduce((s, e) => s + e.hours, 0);
  const totalCost = timeEntries.reduce((s, e) => s + e.totalCost, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* ── Time Entries ───────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            שעות עבודה
          </h4>
          {timeEntries.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {totalHours.toLocaleString("he-IL", { maximumFractionDigits: 1 })} שעות · ₪{totalCost.toLocaleString("he-IL", { maximumFractionDigits: 0 })}
            </span>
          )}
        </div>
        {timeEntries.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 px-1">אין דיווחי שעות עדיין.</p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs">עובד</th>
                  <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs">תאריך</th>
                  <th className="text-end font-medium text-muted-foreground px-3 py-2 text-xs">שעות</th>
                  <th className="text-end font-medium text-muted-foreground px-3 py-2 text-xs">עלות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {timeEntries.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2.5">{e.employee.name}</td>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs">{fmt(e.date)}</td>
                    <td className="px-3 py-2.5 text-end tabular-nums">{e.hours}</td>
                    <td className="px-3 py-2.5 text-end tabular-nums text-xs text-muted-foreground">
                      ₪{e.totalCost.toLocaleString("he-IL", { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Expenses ────────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            <Receipt className="h-3.5 w-3.5" />
            הוצאות שטח
          </h4>
          {expenses.length > 0 && (
            <span className="text-xs text-muted-foreground">
              סה״כ ₪{totalExpenses.toLocaleString("he-IL", { maximumFractionDigits: 0 })}
            </span>
          )}
        </div>
        {expenses.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 px-1">אין הוצאות שטח עדיין.</p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs">תאריך</th>
                  <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs">קטגוריה</th>
                  <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs">תיאור</th>
                  <th className="text-end font-medium text-muted-foreground px-3 py-2 text-xs">סכום</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2.5 text-muted-foreground text-xs">{fmt(e.date)}</td>
                    <td className="px-3 py-2.5 text-xs">{EXPENSE_CATEGORY_LABEL[e.category] ?? e.category}</td>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs truncate max-w-[120px]">
                      {e.description ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-end tabular-nums font-medium">
                      ₪{e.amount.toLocaleString("he-IL", { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Daily Logs ──────────────────────────────────────────────────────── */}
      <section>
        <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
          <ClipboardList className="h-3.5 w-3.5" />
          יומני עבודה יומיים
        </h4>
        {dailyLogs.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 px-1">אין יומני עבודה עדיין.</p>
        ) : (
          <div className="space-y-2">
            {dailyLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{fmt(log.date)}</span>
                  {log.weatherConditions && (
                    <span className="text-xs text-muted-foreground">{log.weatherConditions}</span>
                  )}
                </div>
                {log.visitors && (
                  <p className="text-xs text-muted-foreground">מבקרים: {log.visitors}</p>
                )}
                {log.safetyIncidents && (
                  <p className="text-xs text-muted-foreground">בטיחות: {log.safetyIncidents}</p>
                )}
                {log.notes && (
                  <p className="text-xs text-muted-foreground">{log.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: "העברה בנקאית",
  CHECK: "צ'ק",
  CASH: "מזומן",
  CREDIT_CARD: "כרטיס אשראי",
  OTHER: "אחר",
};

function AddPaymentDialog({
  invoice,
  onSuccess,
}: {
  invoice: Invoice;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");

  const isPaid = invoice.status === "PAID";
  const balance = invoice.total - invoice.paidAmount;

  function handleOpen(val: boolean) {
    setOpen(val);
    if (!val) {
      setAmount("");
      setReference("");
      setError("");
    }
  }

  function submit() {
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError("הכנס סכום תקין");
      return;
    }
    if (amountNum > balance + 0.01) {
      setError(`הסכום גבוה מהיתרה (${fmtShekel(balance)})`);
      return;
    }
    setError("");
    startTransition(async () => {
      const res = await recordPayment(invoice.id, {
        amount: amountNum,
        method,
        date,
        reference: reference || undefined,
      });
      if (res.success) {
        handleOpen(false);
        onSuccess();
      } else {
        setError(res.error ?? "שגיאה");
      }
    });
  }

  if (isPaid) {
    return (
      <div className="flex items-center justify-center gap-1 text-muted-foreground" title="שולמה במלואה">
        <Lock className="h-3.5 w-3.5" />
        <span className="text-xs">שולמה</span>
      </div>
    );
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-6 text-xs px-2 gap-1"
        onClick={() => handleOpen(true)}
      >
        <Plus className="h-3 w-3" />
        תשלום
      </Button>

      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>הוסף תשלום</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-1">
            <div className="text-sm text-muted-foreground">
              חשבונית <span className="font-medium text-foreground">#{invoice.invoiceNumber}</span>
              {" · "}יתרה לתשלום:{" "}
              <span className="font-semibold text-foreground">{fmtShekel(balance)}</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>סכום (₪) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                dir="ltr"
                placeholder={fmtShekel(balance).replace("₪", "")}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>תאריך תשלום *</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>אמצעי תשלום</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>אסמכתא</Label>
              <Input
                placeholder="מספר שיק, אסמכתא..."
                dir="ltr"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => handleOpen(false)}>
                ביטול
              </Button>
              <Button size="sm" onClick={submit} disabled={isPending}>
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin me-1.5" />}
                שמור תשלום
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FinancialsTab({
  contractValue,
  timeEntries,
  expenses,
  contracts,
  invoices,
  changeRequests,
}: {
  contractValue: number;
  timeEntries: TimeEntry[];
  expenses: ExpenseEntry[];
  contracts: ProjectContract[];
  invoices: Invoice[];
  changeRequests: ChangeRequestEntry[];
}) {
  const router = useRouter();
  const approvedCRs = changeRequests.filter(cr => cr.status === "APPROVED").reduce((s, cr) => s + cr.costImpact, 0);
  const budget = contractValue + approvedCRs;
  const laborCost = timeEntries.reduce((s, te) => s + te.totalCost, 0);
  const fieldExpCost = expenses.reduce((s, e) => s + e.amount, 0);
  const subCost = contracts.reduce((s, c) => s + c.paidAmount, 0);
  const actualCost = laborCost + fieldExpCost + subCost;
  const grossProfit = budget - actualCost;
  const profitMargin = budget > 0 ? (grossProfit / budget) * 100 : 0;
  const invoicedTotal = invoices.reduce((s, inv) => s + inv.total, 0);
  const paidTotal = invoices.reduce((s, inv) => s + inv.paidAmount, 0);
  const outstanding = Math.max(0, invoicedTotal - paidTotal);

  const isProfit = grossProfit >= 0;
  const costBreakdown = [
    { label: "עבודה", value: laborCost, color: "bg-violet-400" },
    { label: "הוצאות שטח", value: fieldExpCost, color: "bg-orange-400" },
    { label: "קבלני משנה", value: subCost, color: "bg-blue-400" },
  ];

  return (
    <div className="space-y-6">
      {/* P&L KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            label: "תקציב מאושר",
            value: budget > 0 ? fmtShekel(budget) : "לא הוגדר",
            sub: approvedCRs !== 0 ? `כולל שינויים ${fmtShekel(approvedCRs)}` : `ערך חוזה בסיסי`,
            icon: Wallet,
            bg: "bg-blue-50", iconColor: "text-blue-600", valueColor: "text-blue-700",
          },
          {
            label: "עלויות בפועל",
            value: actualCost > 0 ? fmtShekel(actualCost) : "₪0",
            sub: `עבודה + שטח + קבלנים`,
            icon: TrendingDown,
            bg: "bg-orange-50", iconColor: "text-orange-500", valueColor: "text-orange-700",
          },
          {
            label: "רווח גולמי",
            value: budget > 0 ? fmtShekel(grossProfit) : "—",
            sub: budget > 0 ? `מרווח ${profitMargin.toFixed(1)}%` : "הגדר ערך חוזה",
            icon: isProfit ? TrendingUp : TrendingDown,
            bg: isProfit ? "bg-emerald-50" : "bg-red-50",
            iconColor: isProfit ? "text-emerald-600" : "text-red-500",
            valueColor: isProfit ? "text-emerald-700" : "text-red-700",
          },
        ].map(kpi => (
          <div key={kpi.label} className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${kpi.bg}`}>
              <kpi.icon className={`h-5 w-5 ${kpi.iconColor}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className={`text-lg font-bold tabular-nums leading-tight ${kpi.valueColor}`}>{kpi.value}</p>
              <p className="text-[11px] text-muted-foreground">{kpi.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Cost Breakdown */}
      {actualCost > 0 && (
        <section>
          <h4 className="text-sm font-semibold text-muted-foreground mb-3">פירוט עלויות</h4>
          <div className="space-y-2.5">
            {costBreakdown.map(({ label, value, color }) => {
              const pct = actualCost > 0 ? (value / actualCost) * 100 : 0;
              return (
                <div key={label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="tabular-nums font-medium">{fmtShekel(value)} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Receivables Summary */}
      {invoices.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-muted-foreground">חשבוניות ותקבולים</h4>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>חויב: <strong className="text-foreground">{fmtShekel(invoicedTotal)}</strong></span>
              <span>שולם: <strong className="text-emerald-700">{fmtShekel(paidTotal)}</strong></span>
              {outstanding > 0 && <span>יתרה: <strong className="text-orange-600">{fmtShekel(outstanding)}</strong></span>}
            </div>
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs">מס׳ חשבונית</th>
                  <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs">תאריך</th>
                  <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs">סטטוס</th>
                  <th className="text-end font-medium text-muted-foreground px-3 py-2 text-xs">סכום</th>
                  <th className="text-end font-medium text-muted-foreground px-3 py-2 text-xs">שולם</th>
                  <th className="text-end font-medium text-muted-foreground px-3 py-2 text-xs">יתרה</th>
                  <th className="text-center font-medium text-muted-foreground px-3 py-2 text-xs">פעולה</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((inv) => {
                  const bal = inv.total - inv.paidAmount;
                  const st = INVOICE_STATUS[inv.status] ?? { label: inv.status, cls: "" };
                  return (
                    <tr key={inv.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2.5 font-medium">{inv.invoiceNumber}</td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs">{fmt(inv.date)}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className={`text-[10px] h-4 px-1.5 py-0 ${st.cls}`}>{st.label}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-end tabular-nums">{fmtShekel(inv.total)}</td>
                      <td className="px-3 py-2.5 text-end tabular-nums text-emerald-700">
                        {inv.paidAmount > 0 ? fmtShekel(inv.paidAmount) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-end tabular-nums">
                        {bal > 0 ? <span className="text-orange-600 font-medium">{fmtShekel(bal)}</span> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <AddPaymentDialog invoice={inv} onSuccess={() => router.refresh()} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {invoices.length === 0 && (
        <p className="text-xs text-muted-foreground py-2 px-1">אין חשבוניות עדיין לפרויקט זה.</p>
      )}

      {/* Contracts Summary */}
      {contracts.length > 0 && (
        <section>
          <h4 className="text-sm font-semibold text-muted-foreground mb-2">חוזי קבלני משנה</h4>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs">ספק / קבלן</th>
                  <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs">סטטוס</th>
                  <th className="text-end font-medium text-muted-foreground px-3 py-2 text-xs">שווי חוזה</th>
                  <th className="text-end font-medium text-muted-foreground px-3 py-2 text-xs">שולם</th>
                  <th className="text-end font-medium text-muted-foreground px-3 py-2 text-xs">עכבון %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {contracts.map((c) => {
                  const cs = CONTRACT_STATUS[c.status] ?? { label: c.status, cls: "" };
                  return (
                    <tr key={c.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2.5 font-medium">{c.supplier.name}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className={`text-[10px] h-4 px-1.5 py-0 ${cs.cls}`}>{cs.label}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-end tabular-nums">{fmtShekel(c.value)}</td>
                      <td className="px-3 py-2.5 text-end tabular-nums text-emerald-700">
                        {c.paidAmount > 0 ? fmtShekel(c.paidAmount) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-end tabular-nums text-muted-foreground">
                        {c.retentionPercent > 0 ? `${c.retentionPercent}%` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

const EQUIPMENT_STATUS: Record<string, { label: string; cls: string }> = {
  AVAILABLE:   { label: "פנוי",       cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  IN_USE:      { label: "בשימוש",     cls: "bg-blue-100 text-blue-700 border-blue-200" },
  MAINTENANCE: { label: "תחזוקה",     cls: "bg-orange-100 text-orange-700 border-orange-200" },
  RETIRED:     { label: "יצא משימוש", cls: "bg-slate-100 text-slate-500 border-slate-200" },
};

function TeamEquipmentTab({
  members,
  equipmentLogs,
}: {
  members: Member[];
  equipmentLogs: EquipmentLogEntry[];
}) {
  return (
    <div className="space-y-6">
      {/* Team Members */}
      <section>
        <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 mb-3">
          <Users className="h-3.5 w-3.5" />
          צוות הפרויקט ({members.length})
        </h4>
        {members.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 px-1">לא שויכו חברי צוות לפרויקט זה.</p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs">שם</th>
                  <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs">תפקיד בפרויקט</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary shrink-0">
                          {m.user.name[0]}
                        </div>
                        <span className="font-medium">{m.user.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs">
                      {MEMBER_ROLE[m.role] ?? m.role}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Equipment */}
      <section>
        <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 mb-3">
          <Wrench className="h-3.5 w-3.5" />
          ציוד משויך ({equipmentLogs.length})
        </h4>
        {equipmentLogs.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 px-1">אין ציוד משויך לפרויקט זה כרגע.</p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs">ציוד</th>
                  <th className="text-center font-medium text-muted-foreground px-3 py-2 text-xs">סטטוס</th>
                  <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs">שויך מתאריך</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {equipmentLogs.map((log) => {
                  const st = EQUIPMENT_STATUS[log.equipment.status] ?? { label: log.equipment.status, cls: "" };
                  return (
                    <tr key={log.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 shrink-0">
                            <Wrench className="h-3.5 w-3.5 text-amber-600" />
                          </div>
                          <div>
                            <p className="font-medium leading-none">{log.equipment.name}</p>
                            {log.equipment.code && (
                              <p className="text-[11px] text-muted-foreground mt-0.5">{log.equipment.code}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-center">
                          <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${st.cls}`}>
                            {st.label}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs">{fmt(log.checkOutDate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SettingsTab({
  settings,
  onToggle,
}: {
  projectId: string;
  settings: SettingsState;
  onToggle: (key: keyof SettingsState, value: boolean) => void;
}) {
  const toggles: { key: keyof SettingsState; label: string; description: string }[] = [
    { key: "milestonesEnabled", label: "אבני דרך",      description: "ניהול אבני דרך ולוח זמנים" },
    { key: "wbsEnabled",        label: "WBS / תקציב",   description: "מבנה פירוק עבודה ותכנון תקציב" },
    { key: "qcEnabled",         label: "בקרת איכות",    description: "בדיקות QC ודוחות NCR" },
    { key: "risksEnabled",      label: "ניהול סיכונים", description: "מעקב סיכונים ומטריצת סיכונים" },
    { key: "crEnabled",         label: "בקשות שינוי",   description: "ניהול שינויים בחוזה" },
    { key: "procurementEnabled",label: "רכש",            description: "חוזי קבלני משנה וספקים" },
    { key: "ganttEnabled",      label: "גאנט",           description: "תצוגת לוח זמנים גאנט" },
  ];

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3">
        הפעל או כבה מודולים עבור פרויקט זה. שינויים מתעדכנים מיד.
      </p>
      <div className="divide-y divide-border">
        {toggles.map(({ key, label, description }) => (
          <div key={key} className="flex items-center justify-between py-3 px-1">
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
            <Switch checked={settings[key]} onCheckedChange={(v) => onToggle(key, v)} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProjectTabs({
  projectId,
  initialSettings,
  tasks,
  milestones,
  members,
  counts,
  timeEntries,
  expenses,
  dailyLogs,
  contractValue,
  invoices,
  contracts,
  changeRequests,
  equipmentLogs,
  qualityChecks,
  ncrs,
  risks,
  workPackages,
}: ProjectTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(() => searchParams.get("tab") ?? "overview");
  const [settings, setSettings] = useState<SettingsState>(initialSettings);
  const [, startTransition] = useTransition();

  function handleTabChange(value: string) {
    setTab(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function toggleSetting(key: keyof SettingsState, value: boolean) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    startTransition(() => {
      updateProjectSettings(projectId, { [key]: value });
    });
  }

  const optionalTabs: {
    settingsKey: keyof SettingsState;
    value: string;
    icon: React.ElementType;
    label: string;
    countValue: number;
  }[] = [
    { settingsKey: "milestonesEnabled", value: "milestones",  icon: Milestone,      label: "אבני דרך",   countValue: counts.milestones },
    { settingsKey: "wbsEnabled",        value: "wbs",         icon: GitBranch,      label: "WBS",         countValue: counts.workPackages },
    { settingsKey: "qcEnabled",         value: "qc",          icon: ShieldCheck,    label: "איכות",       countValue: counts.qualityChecks },
    { settingsKey: "risksEnabled",      value: "risks",       icon: AlertTriangle,  label: "סיכונים",     countValue: counts.risks },
    { settingsKey: "crEnabled",         value: "cr",          icon: GitPullRequest, label: "שינויים",     countValue: counts.changeRequests },
    { settingsKey: "procurementEnabled",value: "procurement", icon: ShoppingCart,   label: "רכש",         countValue: counts.contracts },
    { settingsKey: "ganttEnabled",      value: "gantt",       icon: CalendarRange,  label: "גאנט",        countValue: 0 },
  ];

  const visibleOptional = optionalTabs.filter((t) => settings[t.settingsKey]);

  const tabTriggerClass =
    "relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground shrink-0";

  return (
    <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
      <ScrollArea className="w-full" type="scroll">
        <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent p-0 h-auto gap-0 min-w-max">
          {[
            { value: "overview",   icon: LayoutDashboard, label: "סקירה",       count: null },
            { value: "tasks",      icon: CheckSquare,     label: "משימות",      count: counts.tasks },
            { value: "financials", icon: Wallet,          label: "פיננסי",      count: invoices.length || null },
            { value: "field",      icon: HardHat,         label: "דיווחי שטח", count: timeEntries.length + expenses.length + dailyLogs.length || null },
            { value: "team",       icon: Users,           label: "צוות וציוד",  count: members.length + equipmentLogs.length || null },
            { value: "files",      icon: FolderOpen,      label: "קבצים",       count: counts.files },
          ].map(({ value, icon: Icon, label, count }) => (
            <TabsTrigger key={value} value={value} className={tabTriggerClass}>
              <Icon className="h-4 w-4 me-1.5" />
              {label}
              {count !== null && count > 0 && (
                <span className="ms-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                  {count}
                </span>
              )}
            </TabsTrigger>
          ))}

          {visibleOptional.map(({ value, icon: Icon, label, countValue }) => (
            <TabsTrigger key={value} value={value} className={tabTriggerClass}>
              <Icon className="h-4 w-4 me-1.5" />
              {label}
              {countValue > 0 && (
                <span className="ms-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                  {countValue}
                </span>
              )}
            </TabsTrigger>
          ))}

          <TabsTrigger value="settings" className={`${tabTriggerClass} ms-auto`}>
            <Settings2 className="h-4 w-4 me-1.5" />
            הגדרות
          </TabsTrigger>
        </TabsList>
      </ScrollArea>

      <TabsContent value="overview" className="px-4 pt-4 pb-2">
        <OverviewTab tasks={tasks} milestones={milestones} members={members} counts={counts} settings={settings} />
      </TabsContent>

      <TabsContent value="tasks" className="px-4 pt-4 pb-2">
        <TasksKanban projectId={projectId} tasks={tasks} />
      </TabsContent>

      <TabsContent value="financials" className="px-4 pt-4 pb-2">
        <FinancialsTab
          contractValue={contractValue}
          timeEntries={timeEntries}
          expenses={expenses}
          contracts={contracts}
          invoices={invoices}
          changeRequests={changeRequests}
        />
      </TabsContent>

      <TabsContent value="field" className="px-4 pt-4 pb-2">
        <FieldReportsTab timeEntries={timeEntries} expenses={expenses} dailyLogs={dailyLogs} />
      </TabsContent>

      <TabsContent value="team" className="px-4 pt-4 pb-2">
        <TeamEquipmentTab members={members} equipmentLogs={equipmentLogs} />
      </TabsContent>

      <TabsContent value="files" className="px-4 pt-4 pb-2">
        <EmptyModule label="קבצים" />
      </TabsContent>

      {visibleOptional.map(({ value, label }) => (
        <TabsContent key={value} value={value} className="px-4 pt-4 pb-2">
          {value === "milestones"  ? <MilestonesTimeline projectId={projectId} milestones={milestones} /> :
           value === "qc"          ? <QCTab projectId={projectId} qualityChecks={qualityChecks} ncrs={ncrs} /> :
           value === "risks"       ? <RisksTab projectId={projectId} risks={risks} /> :
           value === "cr"          ? <CRTab projectId={projectId} changeRequests={changeRequests} /> :
           value === "procurement" ? <ProcurementTab projectId={projectId} contracts={contracts} /> :
           value === "wbs"         ? <WBSTab projectId={projectId} workPackages={workPackages} /> :
           value === "gantt"       ? <GanttTab workPackages={workPackages} /> :
           <EmptyModule label={label} />}
        </TabsContent>
      ))}

      <TabsContent value="settings" className="px-4 pt-4 pb-2">
        <SettingsTab projectId={projectId} settings={settings} onToggle={toggleSetting} />
      </TabsContent>
    </Tabs>
  );
}
