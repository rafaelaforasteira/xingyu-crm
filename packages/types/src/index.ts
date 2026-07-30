export type Paginated<T> = {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    pageCount: number;
  };
};

export type ApiError = {
  statusCode: number;
  message: string | string[];
  error?: string;
};

export type DemoUser = {
  id: string;
  name: string;
  email: string;
  title: string;
  teamId: string;
  teamName: string;
};

export type DateRangePreset = "today" | "7d" | "30d" | "90d" | "custom";

export type DashboardFilters = {
  range?: DateRangePreset;
  from?: string;
  to?: string;
  ownerId?: string;
  teamId?: string;
  source?: string;
  campaign?: string;
  pipelineId?: string;
};

export type DashboardMetrics = {
  newLeads: number;
  unansweredLeads: number;
  openDeals: number;
  pipelineValue: number;
  pendingPayments: number;
  salesCount: number;
  revenue: number;
  averageTicket: number;
  conversionRate: number;
  avgFirstResponseMinutes: number;
  tasksToday: number;
  overdueTasks: number;
  repurchaseReady: number;
  atRiskCustomers: number;
  ordersInProgress: number;
};
