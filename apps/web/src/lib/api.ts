import {
  DEMO_ORG_ID,
  DEMO_USER_ID,
} from "@xingyu/config";
import type {
  Activity,
  Automation,
  Company,
  Contact,
  Conversation,
  DashboardCharts,
  DashboardMetrics,
  Deal,
  Message,
  Note,
  NotificationItem,
  Occurrence,
  Order,
  PaginatedResponse,
  Pipeline,
  ReactivationLead,
  RepurchaseLead,
  SearchResult,
  SettingsOverview,
  Task,
  Team,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

type QueryValue = string | number | boolean | null | undefined;

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const normalized = path.startsWith("/api")
    ? path
    : `/api${path.startsWith("/") ? path : `/${path}`}`;
  const url = new URL(normalized.startsWith("http") ? normalized : `${API_URL}${normalized}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function request<T>(
  path: string,
  options: RequestInit & { query?: Record<string, QueryValue> } = {},
): Promise<T> {
  const { query, headers, ...rest } = options;
  const url = buildUrl(path, query);

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        "x-demo-user-id": DEMO_USER_ID,
        "x-organization-id": DEMO_ORG_ID,
        ...headers,
      },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      "Não foi possível conectar à API. Verifique se o servidor está em execução.",
      0,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const body = text ? safeJson(text) : null;

  if (!response.ok) {
    const message =
      (body && typeof body === "object" && "message" in body
        ? Array.isArray((body as { message: unknown }).message)
          ? ((body as { message: string[] }).message).join(", ")
          : String((body as { message: unknown }).message)
        : null) ?? `Erro ${response.status}`;
    throw new ApiError(message, response.status, body);
  }

  return body as T;
}

function safeJson(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export const api = {
  get: <T>(path: string, query?: Record<string, QueryValue>) =>
    request<T>(path, { method: "GET", query }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PUT", body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export const healthApi = {
  check: () => api.get<{ status: string }>("/health"),
};

export const dashboardApi = {
  metrics: () => api.get<DashboardMetrics>("/dashboard/metrics"),
  charts: () => api.get<DashboardCharts>("/dashboard/charts"),
  lists: () =>
    api.get<{
      tasksToday: Task[];
      unread: Conversation[];
      recentDeals: Deal[];
      afterSales: Occurrence[];
    }>("/dashboard/lists"),
};

export const contactsApi = {
  list: (query?: Record<string, QueryValue>) =>
    api.get<PaginatedResponse<Contact>>("/contacts", query),
  get: (id: string) => api.get<Contact>(`/contacts/${id}`),
  create: (data: Partial<Contact>) => api.post<Contact>("/contacts", data),
  update: (id: string, data: Partial<Contact>) =>
    api.patch<Contact>(`/contacts/${id}`, data),
  activities: (id: string) => api.get<Activity[]>(`/contacts/${id}/activities`),
  deals: (id: string) => api.get<Deal[]>(`/contacts/${id}/deals`),
  orders: (id: string) => api.get<Order[]>(`/contacts/${id}/orders`),
  tasks: (id: string) => api.get<Task[]>(`/contacts/${id}/tasks`),
};

export const companiesApi = {
  list: (query?: Record<string, QueryValue>) =>
    api.get<PaginatedResponse<Company>>("/companies", query),
  get: (id: string) => api.get<Company>(`/companies/${id}`),
  create: (data: Partial<Company>) => api.post<Company>("/companies", data),
  update: (id: string, data: Partial<Company>) =>
    api.patch<Company>(`/companies/${id}`, data),
  contacts: (id: string) => api.get<Contact[]>(`/companies/${id}/contacts`),
};

export const pipelinesApi = {
  list: async () => {
    const res = await api.get<Pipeline[] | PaginatedResponse<Pipeline>>("/pipelines", {
      pageSize: 100,
    });
    return Array.isArray(res) ? res : res.data;
  },
  get: (id: string) => api.get<Pipeline>(`/pipelines/${id}`),
  board: (id: string) => api.get<Pipeline>(`/pipelines/${id}/board`),
};

export const dealsApi = {
  get: (id: string) => api.get<Deal>(`/deals/${id}`),
  create: (data: Partial<Deal>) => api.post<Deal>("/deals", data),
  update: (id: string, data: Partial<Deal>) => api.patch<Deal>(`/deals/${id}`, data),
  move: (id: string, stageId: string) =>
    api.patch<Deal>(`/deals/${id}`, { stageId }),
  activities: (id: string) => api.get<Activity[]>(`/deals/${id}/activities`),
  files: (id: string) =>
    api.get<{ id: string; name: string; url: string; createdAt: string }[]>(
      `/deals/${id}/files`,
    ),
};

export const conversationsApi = {
  list: (query?: Record<string, QueryValue>) =>
    api.get<PaginatedResponse<Conversation>>("/conversations", query),
  get: (id: string) => api.get<Conversation>(`/conversations/${id}`),
  messages: (id: string) => api.get<Message[]>(`/conversations/${id}/messages`),
  sendMessage: (id: string, body: string) =>
    api.post<Message>(`/conversations/${id}/messages`, { body }),
  byDeal: async (dealId: string) => {
    const res = await api.get<
      Conversation | Conversation[] | PaginatedResponse<Conversation>
    >("/conversations", { dealId });
    if (Array.isArray(res)) return res[0] ?? null;
    if (res && typeof res === "object" && "data" in res) {
      return (res as PaginatedResponse<Conversation>).data[0] ?? null;
    }
    return (res as Conversation) ?? null;
  },
};

export const notesApi = {
  list: (query?: Record<string, QueryValue>) => api.get<Note[]>("/notes", query),
  create: (data: {
    content: string;
    contactId?: string;
    dealId?: string;
    isInternal?: boolean;
  }) => api.post<Note>("/notes", data),
};

export const tasksApi = {
  list: (query?: Record<string, QueryValue>) =>
    api.get<PaginatedResponse<Task>>("/tasks", query),
  get: (id: string) => api.get<Task>(`/tasks/${id}`),
  create: (data: Partial<Task>) => api.post<Task>("/tasks", data),
  update: (id: string, data: Partial<Task>) => api.patch<Task>(`/tasks/${id}`, data),
  today: () => api.get<Task[]>("/tasks/today"),
};

export const ordersApi = {
  list: (query?: Record<string, QueryValue>) =>
    api.get<PaginatedResponse<Order>>("/orders", query),
  get: (id: string) => api.get<Order>(`/orders/${id}`),
  timeline: (id: string) => api.get<Activity[]>(`/orders/${id}/timeline`),
};

export const repurchaseApi = {
  list: (query?: Record<string, QueryValue>) =>
    api.get<PaginatedResponse<RepurchaseLead>>("/repurchase", query),
};

export const reactivationApi = {
  list: (query?: Record<string, QueryValue>) =>
    api.get<PaginatedResponse<ReactivationLead>>("/reactivation", query),
};

export const occurrencesApi = {
  list: (query?: Record<string, QueryValue>) =>
    api.get<PaginatedResponse<Occurrence>>("/occurrences", query),
  get: (id: string) => api.get<Occurrence>(`/occurrences/${id}`),
  update: (id: string, data: Partial<Occurrence>) =>
    api.patch<Occurrence>(`/occurrences/${id}`, data),
};

export const automationsApi = {
  list: () => api.get<Automation[]>("/automations"),
  get: (id: string) => api.get<Automation>(`/automations/${id}`),
  create: (data: Partial<Automation>) => api.post<Automation>("/automations", data),
  update: (id: string, data: Partial<Automation>) =>
    api.patch<Automation>(`/automations/${id}`, data),
};

export const marketingApi = {
  overview: () =>
    api.get<{
      campaigns: { id: string; name: string; status: string; spend: number; leads: number }[];
      charts: { reach: { label: string; value: number }[]; conversions: { label: string; value: number }[] };
    }>("/marketing/overview"),
};

export const reportsApi = {
  overview: () =>
    api.get<{
      kpis: { label: string; value: number; change?: number }[];
      charts: {
        sales: { label: string; value: number }[];
        funnel: { label: string; value: number }[];
        owners: { label: string; value: number }[];
      };
    }>("/reports/overview"),
};

export const searchApi = {
  search: (q: string) => api.get<SearchResult>("/search", { q }),
};

export const notificationsApi = {
  list: () => api.get<NotificationItem[]>("/notifications"),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch("/notifications/read-all"),
};

export const settingsApi = {
  overview: () => api.get<SettingsOverview>("/settings"),
  teams: () => api.get<Team[]>("/settings/teams"),
  update: (data: Partial<SettingsOverview>) => api.patch("/settings", data),
};

export const activitiesApi = {
  list: (query?: Record<string, QueryValue>) =>
    api.get<Activity[]>("/activities", query),
};
