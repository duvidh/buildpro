import {
  BarChart3, TrendingUp, CheckSquare, FolderKanban,
  CreditCard, LayoutDashboard, Clock, Flag,
  FileText, Activity, Zap, Map as MapIcon,
} from "lucide-react";
import type { WidgetLayoutItem } from "./types";
import type React from "react";

export { KpiWidget }              from "./KpiWidget";
export { LeadsWidget }            from "./LeadsWidget";
export { TasksWidget }            from "./TasksWidget";
export { FinanceWidget }          from "./FinanceWidget";
export { ProjectsWidget }         from "./ProjectsWidget";
export { PaymentsWidget }         from "./PaymentsWidget";
export { ClockWidget }            from "./ClockWidget";
export { MilestonesWidget }       from "./MilestonesWidget";
export { InvoicesDueWidget }      from "./InvoicesDueWidget";
export { ActivityWidget }         from "./ActivityWidget";
export { QuickActionsWidget }     from "./QuickActionsWidget";
export { MapWidget }              from "./MapWidget";
export type { DashboardData, WidgetLayoutItem } from "./types";

// ─── Widget definitions ───────────────────────────────────────────────────────

export type WidgetDef = {
  labelKey: string;
  icon: React.ElementType;
  descriptionKey: string;
  category: "finance" | "projects" | "crm" | "tools";
  accentColor: string;   // Tailwind bg class for top border accent
  defaultSize: Omit<WidgetLayoutItem, "i" | "x" | "y">;
};

export const WIDGET_DEFS: Record<string, WidgetDef> = {
  kpis: {
    labelKey: "dashboard.widgetDefs.kpis.label",
    icon: LayoutDashboard,
    descriptionKey: "dashboard.widgetDefs.kpis.description",
    category: "tools",
    accentColor: "from-indigo-500 to-purple-500",
    defaultSize: { w: 12, h: 2, minW: 6, minH: 2 },
  },
  finance: {
    labelKey: "dashboard.widgetDefs.finance.label",
    icon: BarChart3,
    descriptionKey: "dashboard.widgetDefs.finance.description",
    category: "finance",
    accentColor: "from-emerald-500 to-teal-500",
    defaultSize: { w: 8, h: 5, minW: 4, minH: 4 },
  },
  leads: {
    labelKey: "dashboard.widgetDefs.leads.label",
    icon: TrendingUp,
    descriptionKey: "dashboard.widgetDefs.leads.description",
    category: "crm",
    accentColor: "from-sky-500 to-blue-500",
    defaultSize: { w: 4, h: 5, minW: 3, minH: 4 },
  },
  tasks: {
    labelKey: "dashboard.widgetDefs.tasks.label",
    icon: CheckSquare,
    descriptionKey: "dashboard.widgetDefs.tasks.description",
    category: "projects",
    accentColor: "from-orange-500 to-amber-500",
    defaultSize: { w: 6, h: 4, minW: 3, minH: 3 },
  },
  projects: {
    labelKey: "dashboard.widgetDefs.projects.label",
    icon: FolderKanban,
    descriptionKey: "dashboard.widgetDefs.projects.description",
    category: "projects",
    accentColor: "from-violet-500 to-purple-500",
    defaultSize: { w: 6, h: 4, minW: 3, minH: 3 },
  },
  payments: {
    labelKey: "dashboard.widgetDefs.payments.label",
    icon: CreditCard,
    descriptionKey: "dashboard.widgetDefs.payments.description",
    category: "finance",
    accentColor: "from-green-500 to-emerald-500",
    defaultSize: { w: 5, h: 4, minW: 3, minH: 3 },
  },
  clock: {
    labelKey: "dashboard.widgetDefs.clock.label",
    icon: Clock,
    descriptionKey: "dashboard.widgetDefs.clock.description",
    category: "tools",
    accentColor: "from-cyan-500 to-sky-500",
    defaultSize: { w: 3, h: 4, minW: 2, minH: 3 },
  },
  milestones: {
    labelKey: "dashboard.widgetDefs.milestones.label",
    icon: Flag,
    descriptionKey: "dashboard.widgetDefs.milestones.description",
    category: "projects",
    accentColor: "from-amber-500 to-yellow-500",
    defaultSize: { w: 4, h: 4, minW: 3, minH: 3 },
  },
  invoices_due: {
    labelKey: "dashboard.widgetDefs.invoices_due.label",
    icon: FileText,
    descriptionKey: "dashboard.widgetDefs.invoices_due.description",
    category: "finance",
    accentColor: "from-rose-500 to-red-500",
    defaultSize: { w: 4, h: 4, minW: 3, minH: 3 },
  },
  activity: {
    labelKey: "dashboard.widgetDefs.activity.label",
    icon: Activity,
    descriptionKey: "dashboard.widgetDefs.activity.description",
    category: "tools",
    accentColor: "from-slate-500 to-gray-500",
    defaultSize: { w: 4, h: 4, minW: 3, minH: 3 },
  },
  quick_actions: {
    labelKey: "dashboard.widgetDefs.quick_actions.label",
    icon: Zap,
    descriptionKey: "dashboard.widgetDefs.quick_actions.description",
    category: "tools",
    accentColor: "from-fuchsia-500 to-purple-500",
    defaultSize: { w: 4, h: 4, minW: 3, minH: 3 },
  },
  map: {
    labelKey: "dashboard.widgetDefs.map.label",
    icon: MapIcon,
    descriptionKey: "dashboard.widgetDefs.map.description",
    category: "projects",
    accentColor: "from-teal-500 to-cyan-500",
    defaultSize: { w: 8, h: 5, minW: 4, minH: 4 },
  },
};

// ─── Layout version ───────────────────────────────────────────────────────────
// Increment this whenever DEFAULT_LAYOUT changes significantly (e.g. moving
// from compactType="vertical" to compactType={null}).  Saved layouts that
// don't carry this version marker are automatically discarded and replaced
// with DEFAULT_LAYOUT on the next page load.
export const LAYOUT_VERSION = 3;

// ─── Default layout ───────────────────────────────────────────────────────────

export const DEFAULT_LAYOUT: WidgetLayoutItem[] = [
  // Row 0-1: KPIs full-width
  { i: "kpis",         x: 0, y: 0,  w: 12, h: 2,  minW: 6,  minH: 2 },
  // Row 2-5: clock | quick_actions | finance (side-by-side)
  { i: "clock",        x: 0, y: 2,  w: 3,  h: 4,  minW: 2,  minH: 3 },
  { i: "quick_actions",x: 3, y: 2,  w: 4,  h: 4,  minW: 3,  minH: 3 },
  { i: "finance",      x: 7, y: 2,  w: 5,  h: 5,  minW: 4,  minH: 4 },
  // Row 6-10: leads | tasks | projects (side-by-side)
  { i: "leads",        x: 0, y: 7,  w: 4,  h: 5,  minW: 3,  minH: 4 },
  { i: "tasks",        x: 4, y: 7,  w: 4,  h: 5,  minW: 3,  minH: 3 },
  { i: "projects",     x: 8, y: 7,  w: 4,  h: 5,  minW: 3,  minH: 3 },
  // Row 12-15: invoices | milestones | activity (side-by-side)
  { i: "invoices_due", x: 0, y: 12, w: 4,  h: 4,  minW: 3,  minH: 3 },
  { i: "milestones",   x: 4, y: 12, w: 4,  h: 4,  minW: 3,  minH: 3 },
  { i: "activity",     x: 8, y: 12, w: 4,  h: 4,  minW: 3,  minH: 3 },
  // Row 16-20: projects map (full width)
  { i: "map",          x: 0, y: 16, w: 12, h: 5,  minW: 4,  minH: 4 },
];
