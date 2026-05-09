import Link from "next/link";
import {
  TrendingUp,
  FolderKanban,
  CheckSquare,
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  ChevronLeft,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RevenueChart } from "@/components/dashboard/revenue-chart";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const kpis = [
  {
    label: "לידים פעילים",
    value: "12",
    trend: { text: "+3 מהחודש שעבר", positive: true },
    icon: TrendingUp,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    valueColor: "text-blue-600",
  },
  {
    label: "פרויקטים פעילים",
    value: "8",
    trend: { text: "2 בסיכון פיגור", positive: false },
    icon: FolderKanban,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    valueColor: "text-violet-600",
  },
  {
    label: "משימות פתוחות",
    value: "34",
    trend: { text: "7 בפיגור", positive: false },
    icon: CheckSquare,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-500",
    valueColor: "text-orange-500",
  },
  {
    label: "הכנסה חודשית",
    value: "₪320K",
    trend: { text: "+15% מהחודש שעבר", positive: true },
    icon: Wallet,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    valueColor: "text-emerald-600",
  },
];

const upcomingTasks = [
  {
    id: "1",
    title: "אישור תכניות מול האדריכל",
    project: "מגדלי שרונה",
    due: "מחר",
    priority: "HIGH" as const,
    overdue: false,
  },
  {
    id: "2",
    title: "הזמנת קורות ברזל — ספק כהן",
    project: "קניון רמת גן",
    due: "12/05",
    priority: "MEDIUM" as const,
    overdue: false,
  },
  {
    id: "3",
    title: "בדיקת איכות יציקת בטון קומה 3",
    project: "בנייני הים אשדוד",
    due: "07/05",
    priority: "HIGH" as const,
    overdue: true,
  },
  {
    id: "4",
    title: "פגישת לקוח — עדכון תקציב",
    project: "וילה הרצלייה",
    due: "14/05",
    priority: "MEDIUM" as const,
    overdue: false,
  },
  {
    id: "5",
    title: "הגשת דו\"ח בטיחות חודשי",
    project: "מתחם תעשייה חולון",
    due: "15/05",
    priority: "LOW" as const,
    overdue: false,
  },
];

const activeProjects = [
  {
    id: "1",
    name: "מגדלי שרונה",
    client: "חברת אלרוב",
    progress: 68,
    value: "₪4.2M",
    status: "ON_TRACK" as const,
  },
  {
    id: "2",
    name: "בנייני הים אשדוד",
    client: "קבוצת דניה סיבוס",
    progress: 42,
    value: "₪2.8M",
    status: "AT_RISK" as const,
  },
  {
    id: "3",
    name: "וילה הרצלייה",
    client: "משפחת כהן",
    progress: 91,
    value: "₪850K",
    status: "ON_TRACK" as const,
  },
  {
    id: "4",
    name: 'קניון רמת גן',
    client: 'ריט 1 נדל"ן',
    progress: 23,
    value: "₪12M",
    status: "PLANNING" as const,
  },
  {
    id: "5",
    name: "מתחם תעשייה חולון",
    client: "עיריית חולון",
    progress: 55,
    value: "₪3.1M",
    status: "ON_TRACK" as const,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const priorityConfig = {
  HIGH: { label: "דחוף", className: "bg-red-100 text-red-700 border-red-200" },
  MEDIUM: { label: "בינוני", className: "bg-orange-100 text-orange-700 border-orange-200" },
  LOW: { label: "נמוך", className: "bg-gray-100 text-gray-600 border-gray-200" },
};

const statusConfig = {
  ON_TRACK: { label: "בסדר", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  AT_RISK: { label: "בסיכון", className: "bg-orange-100 text-orange-700 border-orange-200" },
  PLANNING: { label: "תכנון", className: "bg-blue-100 text-blue-700 border-blue-200" },
};

function progressColor(pct: number) {
  if (pct >= 90) return "[&>div]:bg-emerald-500";
  if (pct >= 60) return "[&>div]:bg-primary";
  if (pct >= 30) return "[&>div]:bg-primary/70";
  return "[&>div]:bg-orange-400";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">ברוך הבא, מנהל</h2>
          <p className="text-sm text-muted-foreground mt-0.5">יום חמישי, 8 במאי 2026</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/leads/new">
              <Plus className="h-4 w-4 me-1.5" />
              ליד חדש
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/projects/new">
              <Plus className="h-4 w-4 me-1.5" />
              פרויקט חדש
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/tasks/new">
              <Plus className="h-4 w-4 me-1.5" />
              משימה חדשה
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
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
                    <span
                      className={
                        kpi.trend.positive
                          ? "text-emerald-600"
                          : "text-orange-600"
                      }
                    >
                      {kpi.trend.text}
                    </span>
                  </div>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${kpi.iconBg} shrink-0`}>
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
              <CardTitle className="text-base font-semibold">הכנסות — 6 חודשים אחרונים</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                סך הכנסות: ₪1.475M · ממוצע חודשי: ₪245K
              </p>
            </div>
            <Badge variant="outline" className="text-xs font-normal">
              ₪320K מאי
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <RevenueChart />
        </CardContent>
      </Card>

      {/* Bottom Grid: Tasks + Projects */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Upcoming Tasks */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">משימות קרובות</CardTitle>
              <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground">
                <Link href="/tasks">
                  הצג הכל
                  <ChevronLeft className="h-3.5 w-3.5 ms-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {upcomingTasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-start gap-3 px-5 py-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p
                        className={`text-sm font-medium truncate ${
                          task.overdue ? "text-destructive" : "text-foreground"
                        }`}
                      >
                        {task.overdue && (
                          <AlertCircle className="inline h-3.5 w-3.5 me-1 mb-0.5" />
                        )}
                        {task.title}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {task.project}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 text-xs ${
                        task.overdue ? "text-destructive font-medium" : "text-muted-foreground"
                      }`}
                    >
                      <CalendarDays className="h-3 w-3" />
                      {task.due}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 h-4 ${
                        priorityConfig[task.priority].className
                      }`}
                    >
                      {priorityConfig[task.priority].label}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Active Projects */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">פרויקטים פעילים</CardTitle>
              <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground">
                <Link href="/projects">
                  הצג הכל
                  <ChevronLeft className="h-3.5 w-3.5 ms-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {activeProjects.map((project) => (
                <li
                  key={project.id}
                  className="px-5 py-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {project.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {project.client}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ms-3">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 h-4 ${
                          statusConfig[project.status].className
                        }`}
                      >
                        {statusConfig[project.status].label}
                      </Badge>
                      <span className="text-xs font-semibold text-muted-foreground w-8 text-end">
                        {project.progress}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress
                      value={project.progress}
                      className={`h-1.5 flex-1 ${progressColor(project.progress)}`}
                    />
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {project.value}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
