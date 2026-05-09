"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FolderKanban,
  FileText,
  Receipt,
  CheckSquare,
  LayoutDashboard,
  CalendarDays,
  ExternalLink,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Project = {
  id: string; name: string; status: string;
  contractValue: number; progressPercent: number;
  startDate: Date | null; endDate: Date | null; address: string | null;
};

type Quote = {
  id: string; quoteNumber: string | null; date: Date;
  validUntil: Date | null; status: string; total: number;
};

type Invoice = {
  id: string; invoiceNumber: string; date: Date;
  dueDate: Date | null; status: string; total: number; paidAmount: number;
};

type ClientTabsProps = {
  clientId: string;
  projects: Project[];
  quotes: Quote[];
  invoices: Invoice[];
};

// ─── Config ───────────────────────────────────────────────────────────────────

const PROJECT_STATUS: Record<string, { label: string; className: string }> = {
  PLANNING:   { label: "תכנון",    className: "bg-blue-100 text-blue-700 border-blue-200" },
  ACTIVE:     { label: "פעיל",     className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  ON_HOLD:    { label: "מושהה",   className: "bg-orange-100 text-orange-700 border-orange-200" },
  COMPLETED:  { label: "הושלם",   className: "bg-slate-100 text-slate-600 border-slate-200" },
  CANCELLED:  { label: "בוטל",    className: "bg-red-100 text-red-700 border-red-200" },
};

const QUOTE_STATUS: Record<string, { label: string; className: string }> = {
  DRAFT:    { label: "טיוטה",       className: "bg-slate-100 text-slate-600 border-slate-200" },
  SENT:     { label: "נשלחה",       className: "bg-blue-100 text-blue-700 border-blue-200" },
  ACCEPTED: { label: "אושרה",       className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "נדחתה",      className: "bg-red-100 text-red-700 border-red-200" },
  EXPIRED:  { label: "פג תוקף",    className: "bg-orange-100 text-orange-700 border-orange-200" },
};

const INVOICE_STATUS: Record<string, { label: string; className: string }> = {
  DRAFT:    { label: "טיוטה",  className: "bg-slate-100 text-slate-600 border-slate-200" },
  SENT:     { label: "נשלחה",  className: "bg-blue-100 text-blue-700 border-blue-200" },
  PAID:     { label: "שולמה",  className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  OVERDUE:  { label: "פג מועד", className: "bg-red-100 text-red-700 border-red-200" },
  PARTIAL:  { label: "חלקית",  className: "bg-orange-100 text-orange-700 border-orange-200" },
  CANCELLED:{ label: "בוטלה",  className: "bg-slate-100 text-slate-600 border-slate-200" },
};

function fmt(date: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("he-IL").format(new Date(date));
}
function fmtCurrency(n: number) {
  return `₪${n.toLocaleString("he-IL", { maximumFractionDigits: 0 })}`;
}
function progressColor(pct: number) {
  if (pct >= 90) return "[&>div]:bg-emerald-500";
  if (pct >= 30) return "[&>div]:bg-primary";
  return "[&>div]:bg-orange-400";
}

// ─── Tab panels ───────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <p className="text-muted-foreground text-sm">אין {label} עדיין.</p>
    </div>
  );
}

function ProjectsTab({ projects, clientId }: { projects: Project[]; clientId: string }) {
  if (!projects.length) return <EmptyState label="פרויקטים" />;
  return (
    <ul className="divide-y divide-border">
      {projects.map((p) => (
        <li key={p.id} className="px-1 py-3">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <Link
                href={`/projects/${p.id}`}
                className="text-sm font-medium text-foreground hover:text-primary flex items-center gap-1 group"
              >
                {p.name}
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
              </Link>
              <p className="text-xs text-muted-foreground mt-0.5">{p.address || "—"}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge
                variant="outline"
                className={`text-[10px] h-4 px-1.5 py-0 ${PROJECT_STATUS[p.status]?.className}`}
              >
                {PROJECT_STATUS[p.status]?.label ?? p.status}
              </Badge>
              <span className="text-xs font-semibold text-muted-foreground">
                {p.progressPercent.toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Progress
              value={p.progressPercent}
              className={`h-1.5 flex-1 ${progressColor(p.progressPercent)}`}
            />
            <span className="text-[11px] text-muted-foreground shrink-0">
              {fmtCurrency(p.contractValue)}
            </span>
            <span className="text-[11px] text-muted-foreground shrink-0">
              {fmt(p.startDate)} ← {fmt(p.endDate)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function QuotesTab({ quotes }: { quotes: Quote[] }) {
  if (!quotes.length) return <EmptyState label="הצעות מחיר" />;
  return (
    <ul className="divide-y divide-border">
      {quotes.map((q) => (
        <li key={q.id} className="flex items-center justify-between gap-3 px-1 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              {q.quoteNumber ? `הצעה #${q.quoteNumber}` : "הצעה ללא מספר"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {fmt(q.date)}
              {q.validUntil && ` · בתוקף עד ${fmt(q.validUntil)}`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant="outline"
              className={`text-[10px] h-4 px-1.5 py-0 ${QUOTE_STATUS[q.status]?.className}`}
            >
              {QUOTE_STATUS[q.status]?.label ?? q.status}
            </Badge>
            <span className="text-sm font-semibold">{fmtCurrency(q.total)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function InvoicesTab({ invoices }: { invoices: Invoice[] }) {
  if (!invoices.length) return <EmptyState label="חשבוניות" />;
  return (
    <ul className="divide-y divide-border">
      {invoices.map((inv) => (
        <li key={inv.id} className="flex items-center justify-between gap-3 px-1 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              חשבונית #{inv.invoiceNumber}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {fmt(inv.date)}
              {inv.dueDate && ` · לתשלום עד ${fmt(inv.dueDate)}`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant="outline"
              className={`text-[10px] h-4 px-1.5 py-0 ${INVOICE_STATUS[inv.status]?.className}`}
            >
              {INVOICE_STATUS[inv.status]?.label ?? inv.status}
            </Badge>
            <div className="text-end">
              <p className="text-sm font-semibold">{fmtCurrency(inv.total)}</p>
              {inv.paidAmount > 0 && inv.paidAmount < inv.total && (
                <p className="text-[10px] text-muted-foreground">
                  שולם: {fmtCurrency(inv.paidAmount)}
                </p>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ClientTabs({ clientId, projects, quotes, invoices }: ClientTabsProps) {
  const [tab, setTab] = useState("overview");

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent p-0 h-auto gap-0">
        {[
          { value: "overview",  icon: LayoutDashboard, label: "סקירה",        count: null },
          { value: "projects",  icon: FolderKanban,    label: "פרויקטים",     count: projects.length },
          { value: "quotes",    icon: FileText,        label: "הצעות מחיר",  count: quotes.length },
          { value: "invoices",  icon: Receipt,         label: "חשבוניות",    count: invoices.length },
        ].map(({ value, icon: Icon, label, count }) => (
          <TabsTrigger
            key={value}
            value={value}
            className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground"
          >
            <Icon className="h-4 w-4 me-1.5" />
            {label}
            {count !== null && count > 0 && (
              <span className="ms-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                {count}
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="overview" className="pt-4">
        {projects.length === 0 && quotes.length === 0 && invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground text-sm">לקוח חדש — אין נתונים עדיין.</p>
            <p className="text-muted-foreground text-xs mt-1">
              התחל על ידי יצירת פרויקט או הצעת מחיר ללקוח.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">פרויקטים אחרונים</h3>
                <ProjectsTab projects={projects.slice(0, 3)} clientId={clientId} />
              </div>
            )}
          </div>
        )}
      </TabsContent>

      <TabsContent value="projects" className="pt-4">
        <ScrollArea className="max-h-[500px]">
          <ProjectsTab projects={projects} clientId={clientId} />
        </ScrollArea>
      </TabsContent>

      <TabsContent value="quotes" className="pt-4">
        <ScrollArea className="max-h-[500px]">
          <QuotesTab quotes={quotes} />
        </ScrollArea>
      </TabsContent>

      <TabsContent value="invoices" className="pt-4">
        <ScrollArea className="max-h-[500px]">
          <InvoicesTab invoices={invoices} />
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}
