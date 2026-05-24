import Link from "next/link";
import {
  TrendingUp,
  FolderKanban,
  CheckSquare,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  ChevronLeft,
  AlertCircle,
  CreditCard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { DashboardActions } from "@/components/dashboard/dashboard-actions";
import { getDashboardData } from "@/actions/dashboard";
import { getClients } from "@/actions/clients";
import { getSession } from "@/lib/session";
import { fmtShekel } from "@/lib/utils";

export const dynamic = "force-dynamic";

// ─── Helpers ──────────────────────────────────────────────────────────────────


function fmtDue(d: Date | null): { text: string; overdue: boolean } {
  if (!d) return { text: "—", overdue: false };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const due = new Date(d);
  due.setHours(0, 0, 0, 0);
  if (due.getTime() === today.getTime()) return { text: "היום", overdue: false };
  if (due.getTime() === tomorrow.getTime()) return { text: "מחר", overdue: false };
  const overdue = due < today;
  const text = new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(d));
  return { text, overdue };
}

function fmtDate() {
  return new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function progressColor(pct: number) {
  if (pct >= 90) return "[&>div]:bg-emerald-500";
  if (pct >= 60) return "[&>div]:bg-primary";
  if (pct >= 30) return "[&>div]:bg-primary/70";
  return "[&>div]:bg-orange-400";
}

// ─── Config ───────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  URGENT: { label: "דחוף מאוד", className: "bg-red-100 text-red-700 border-red-200" },
  HIGH:   { label: "דחוף",      className: "bg-red-100 text-red-700 border-red-200" },
  MEDIUM: { label: "בינוני",    className: "bg-orange-100 text-orange-700 border-orange-200" },
  LOW:    { label: "נמוך",      className: "bg-gray-100 text-gray-600 border-gray-200" },
};

const PAYMENT_METHOD_LABELS: Record<string, { label: string; className: string }> = {
  BANK_TRANSFER: { label: "העברה",   className: "bg-blue-50 text-blue-700 border-blue-200" },
  CHECK:         { label: "צ׳ק",     className: "bg-violet-50 text-violet-700 border-violet-200" },
  CASH:          { label: "מזומן",   className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CREDIT_CARD:   { label: "אשראי",   className: "bg-orange-50 text-orange-700 border-orange-200" },
  OTHER:         { label: "אחר",     className: "bg-gray-50 text-gray-600 border-gray-200" },
};

const PROJECT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  ACTIVE:    { label: "פעיל",  className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  PLANNING:  { label: "תכנון", className: "bg-blue-100 text-blue-700 border-blue-200" },
  ON_HOLD:   { label: "מושהה", className: "bg-orange-100 text-orange-700 border-orange-200" },
  COMPLETED: { label: "הושלם", className: "bg-slate-100 text-slate-600 border-slate-200" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const [{ kpis, projects, upcomingTasks, chartData, currentMonth, totalChartRevenue, avgMonthlyRevenue, recentPayments }, clients, session] =
    await Promise.all([getDashboardData(), getClients(), getSession()]);
  const currentUserName = session?.name ?? "משתמש";

  const clientOptions = clients.map((c) => ({ id: c.id, name: c.name, address: c.address ?? "" }));

  // Revenue trend (month-over-month %)
  const revenueChange =
    kpis.prevMonthRevenue > 0
      ? Math.round(((kpis.monthlyRevenue - kpis.prevMonthRevenue) / kpis.prevMonthRevenue) * 100)
      : null;

  const kpiCards = [
    {
      label: "לידים פעילים",
      value: String(kpis.activeLeads),
      trend: {
        text: kpis.newLeads > 0 ? `${kpis.newLeads} חדשים בפייפליין` : "אין לידים חדשים",
        positive: kpis.newLeads > 0,
      },
      icon: TrendingUp,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      valueColor: "text-blue-600",
    },
    {
      label: "פרויקטים פעילים",
      value: String(kpis.activeProjects),
      trend: {
        text: kpis.atRiskProjects > 0 ? `${kpis.atRiskProjects} מושהים` : "הכל תקין",
        positive: kpis.atRiskProjects === 0,
      },
      icon: FolderKanban,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
      valueColor: "text-violet-600",
    },
    {
      label: "משימות פתוחות",
      value: String(kpis.openTasks),
      trend: {
        text: kpis.overdueTasks > 0 ? `${kpis.overdueTasks} בפיגור` : "ללא פיגורים",
        positive: kpis.overdueTasks === 0,
      },
      icon: CheckSquare,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-500",
      valueColor: "text-orange-500",
    },
    {
      label: "הכנסה חודשית",
      value: fmtShekel(kpis.monthlyRevenue),
      trend: {
        text:
          revenueChange !== null
            ? `${revenueChange >= 0 ? "+" : ""}${revenueChange}% מהחודש שעבר`
            : kpis.monthlyRevenue > 0
            ? "נתון ראשון"
            : "אין הכנסות החודש",
        positive: revenueChange === null ? kpis.monthlyRevenue > 0 : revenueChange >= 0,
      },
      icon: Wallet,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      valueColor: "text-emerald-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">ברוך הבא, {currentUserName}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{fmtDate()}</p>
        </div>
        <DashboardActions clientOptions={clientOptions} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className={`mt-1.5 text-3xl font-bold ${kpi.valueColor}`}>
                    {kpi.value}
                  </p>
                  <div className="mt-2 flex items-center gap-1 text-xs">
                    {kpi.trend.positive ? (
                      <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                    )}
                    <span className={kpi.trend.positive ? "text-emerald-600" : "text-orange-600"}>
                      {kpi.trend.text}
                    </span>
                  </div>
                </div>
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${kpi.iconBg} shrink-0`}
                >
                  <kpi.icon className={`h-5 w-5 ${kpi.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Chart */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                הכנסות — 6 חודשים אחרונים
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                סך הכנסות: {fmtShekel(totalChartRevenue)} · ממוצע חודשי:{" "}
                {fmtShekel(avgMonthlyRevenue)}
              </p>
            </div>
            <Badge variant="outline" className="text-xs font-normal">
              {fmtShekel(kpis.monthlyRevenue)} {currentMonth}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          {/* chartData is { month: string, revenue: number }[] — safe to pass to Client Component */}
          <RevenueChart data={chartData} currentMonth={currentMonth} />
        </CardContent>
      </Card>

      {/* Recent Payments */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">תשלומים אחרונים</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-xs text-muted-foreground"
            >
              <Link href="/projects">
                לפרויקטים
                <ChevronLeft className="h-3.5 w-3.5 ms-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recentPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <p className="text-sm text-muted-foreground">אין תשלומים שנרשמו עדיין.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recentPayments.map((payment) => {
                const method = PAYMENT_METHOD_LABELS[payment.method] ?? PAYMENT_METHOD_LABELS.OTHER;
                const dateText = new Intl.DateTimeFormat("he-IL", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "2-digit",
                }).format(new Date(payment.date));
                return (
                  <li
                    key={payment.id}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                      <CreditCard className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {payment.invoice.client.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {payment.invoice.project.name} · {payment.invoice.invoiceNumber}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-sm font-semibold text-emerald-600">
                        ₪{payment.amount.toLocaleString("he-IL", { maximumFractionDigits: 0 })}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 h-4 ${method.className}`}
                        >
                          {method.label}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">{dateText}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Bottom Grid: Tasks + Projects */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Upcoming Tasks */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">משימות קרובות</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-xs text-muted-foreground"
              >
                <Link href="/tasks">
                  הצג הכל
                  <ChevronLeft className="h-3.5 w-3.5 ms-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {upcomingTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <p className="text-sm text-muted-foreground">אין משימות פתוחות עם תאריך יעד.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  עבור לפרויקט כלשהו והוסף משימות.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {upcomingTasks.map((task) => {
                  const due = fmtDue(task.dueDate);
                  const priority =
                    PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.MEDIUM;
                  return (
                    <li
                      key={task.id}
                      className="flex items-start gap-3 px-5 py-3 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p
                            className={`text-sm font-medium truncate ${
                              due.overdue ? "text-destructive" : "text-foreground"
                            }`}
                          >
                            {due.overdue && (
                              <AlertCircle className="inline h-3.5 w-3.5 me-1 mb-0.5" />
                            )}
                            {task.name}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {task.project.name}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 text-xs ${
                            due.overdue
                              ? "text-destructive font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          <CalendarDays className="h-3 w-3" />
                          {due.text}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 h-4 ${priority.className}`}
                        >
                          {priority.label}
                        </Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Active Projects */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">פרויקטים פעילים</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-xs text-muted-foreground"
              >
                <Link href="/projects">
                  הצג הכל
                  <ChevronLeft className="h-3.5 w-3.5 ms-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <p className="text-sm text-muted-foreground">אין פרויקטים פעילים כרגע.</p>
                <Button asChild size="sm" variant="outline" className="mt-3">
                  <Link href="/projects">עבור לפרויקטים</Link>
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {projects.map((project) => {
                  const statusCfg =
                    PROJECT_STATUS_CONFIG[project.status] ??
                    PROJECT_STATUS_CONFIG.PLANNING;
                  return (
                    <li
                      key={project.id}
                      className="px-5 py-3 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/projects/${project.id}`}
                            className="text-sm font-medium text-foreground truncate block hover:text-primary transition-colors"
                          >
                            {project.name}
                          </Link>
                          <p className="text-xs text-muted-foreground truncate">
                            {project.client.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ms-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 h-4 ${statusCfg.className}`}
                          >
                            {statusCfg.label}
                          </Badge>
                          <span className="text-xs font-semibold text-muted-foreground w-8 text-end">
                            {project.progressPercent.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress
                          value={project.progressPercent}
                          className={`h-1.5 flex-1 ${progressColor(project.progressPercent)}`}
                        />
                        {project.contractValue > 0 && (
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {fmtShekel(project.contractValue)}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
