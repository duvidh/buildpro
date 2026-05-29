// Shared data shape passed to every widget

export type DashboardKpis = {
  activeLeads: number;
  newLeads: number;
  activeProjects: number;
  atRiskProjects: number;
  openTasks: number;
  overdueTasks: number;
  monthlyRevenue: number;
  prevMonthRevenue: number;
};

export type DashboardTask = {
  id: string;
  name: string;
  priority: string;
  dueDate: Date | null;
  status: string;
  project: { id: string; name: string } | null;
};

export type DashboardProject = {
  id: string;
  name: string;
  status: string;
  contractValue: number;
  progressPercent: number;
  client: { name: string };
};

export type DashboardPayment = {
  id: string;
  amount: number;
  date: Date;
  method: string;
  invoice: {
    invoiceNumber: string;
    client: { name: string };
    project: { name: string };
  };
};

export type DashboardMilestone = {
  id: string;
  name: string;
  date: Date;
  completed: boolean;
  project: { id: string; name: string };
};

export type DashboardInvoiceDue = {
  id: string;
  invoiceNumber: string;
  total: number;
  paidAmount: number;
  status: string;
  dueDate: Date | null;
  client: { name: string };
  project: { name: string };
};

export type DashboardActivity = {
  id: string;
  action: string;
  entityType: string;
  details: string | null;   // JSON: { projectId, description }
  createdAt: Date;
  user: { name: string } | null;
};

export type DashboardData = {
  kpis: DashboardKpis;
  upcomingTasks: DashboardTask[];
  projects: DashboardProject[];
  chartData: { month: string; revenue: number }[];
  recentPayments: DashboardPayment[];
  totalChartRevenue: number;
  avgMonthlyRevenue: number;
  currentMonth: string;
  // New
  upcomingMilestones: DashboardMilestone[];
  invoicesDue: DashboardInvoiceDue[];
  recentActivity: DashboardActivity[];
};

// Layout item (superset of react-grid-layout's Layout)
export type WidgetLayoutItem = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
};
