import type {
  Activity,
  Automation,
  Company,
  Contact,
  ContactWriteInput,
  Conversation,
  ConversationContext,
  ConversationListItem,
  ConversationListQuery,
  DashboardCharts,
  DashboardMetrics,
  DashboardJourneySummaries,
  Deal,
  DealActionItem,
  LeadFile,
  Message,
  MessageCursorPage,
  MessageQuery,
  Note,
  NotificationItem,
  Occurrence,
  Order,
  PaginatedResponse,
  Pipeline,
  AvailablePipelineChannel,
  PipelineChannelConnection,
  PipelineChannelInput,
  PipelineChannelTestResult,
  PipelineLeadSimulationInput,
  PipelineLeadSimulationResult,
  PipelineAccessOverview,
  PipelineInput,
  PipelineListQuery,
  PipelineNavigationItem,
  PipelineStage,
  PipelineStageInput,
  CreateLifecycleOpportunityInput,
  CreateReactivationActionInput,
  LifecycleOpportunityResult,
  ReactivationListQuery,
  RepurchaseLead,
  SearchResult,
  SettingsOverview,
  Tag,
  Task,
  TaskBoardGroup,
  TaskStatusDefinition,
  TaskComment,
  TaskWorkspaceData,
  Team,
  UserRef,
  ManagedUser,
} from "./types";
import { normalizeMessages, unwrapMessageCursorPage } from "./inbox-utils";
import { normalizeReactivationResponse } from "./reactivation-utils";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "development" ? "http://localhost:3000/api" : "");
const REQUEST_TIMEOUT_MS = 10_000;

if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL nÃ£o foi definida.");

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
  const base = API_URL.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const requestPath =
    /\/api$/i.test(base) && normalizedPath.startsWith("/api/")
      ? normalizedPath.slice(4)
      : normalizedPath;

  let url = `${base}${requestPath}`;

  if (query) {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      params.set(key, String(value));
    }

    const search = params.toString();

    if (search) {
      url += `${url.includes("?") ? "&" : "?"}${search}`;
    }
  }

  if (typeof window !== "undefined") {
    return url;
  }

  return new URL(url, "http://localhost").toString();
}

function isAuthPath(path: string): boolean {
  const normalized = path.replace(/^\/api/, "");
  return (
    normalized.startsWith("/auth/login") ||
    normalized.startsWith("/auth/refresh") ||
    normalized.startsWith("/auth/logout")
  );
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const response = await fetch(buildUrl("/auth/refresh"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  const next = `${window.location.pathname}${window.location.search}`;
  const target = next && next !== "/login" ? `/login?next=${encodeURIComponent(next)}` : "/login";
  if (window.location.pathname !== "/login") {
    window.location.assign(target);
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { query?: Record<string, QueryValue>; _retried?: boolean } = {},
): Promise<T> {
  const { query, headers, _retried, ...rest } = options;
  const url = buildUrl(path, query);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    const isFormData = typeof FormData !== "undefined" && rest.body instanceof FormData;
    response = await fetch(url, {
      ...rest,
      credentials: "include",
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...headers,
      },
      cache: "no-store",
      signal: controller.signal,
    });
  } catch {
    throw new ApiError("NÃ£o foi possÃ­vel conectar Ã  API do Xingyu CRM.", 0);
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 401 && !_retried && !isAuthPath(path)) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      return request<T>(path, { ...options, _retried: true });
    }
    redirectToLogin();
    throw new ApiError("SessÃ£o expirada.", 401);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const body = text ? safeJson(text) : null;

  if (!response.ok) {
    const serverMessage =
      body && typeof body === "object" && "message" in body
        ? Array.isArray((body as { message: unknown }).message)
          ? (body as { message: string[] }).message.join(", ")
          : String((body as { message: unknown }).message)
        : null;
    const message =
      response.status === 503
        ? "O banco de dados local nÃ£o estÃ¡ disponÃ­vel. Inicie o ambiente com pnpm dev:local."
        : response.status >= 500
          ? "O Xingyu CRM encontrou um erro ao processar a solicitaÃ§Ã£o."
          : (serverMessage ?? `Erro ${response.status}`);
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
    request<T>(path, {
      method: "POST",
      body:
        data == null
          ? undefined
          : typeof FormData !== "undefined" && data instanceof FormData
            ? data
            : JSON.stringify(data),
    }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PUT", body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export const healthApi = {
  check: () => api.get<{ status: string }>("/health"),
};

export type DashboardGoalAnalytics = {
  id: string;
  metric: string;
  scope: string;
  teamId?: string | null;
  userId?: string | null;
  pipelineId?: string | null;
  targetValue: number;
  target: number;
  actual: number;
  progressPct: number;
  remaining: number;
  exceeded: number;
  expectedToDate: number;
  requiredPerDay: number | null;
  daysElapsed: number;
  daysRemaining: number;
  pace: string;
  periodStart: string;
  periodEnd: string;
  team?: { id: string; name: string } | null;
  user?: { id: string; name: string } | null;
  curve: Array<{ date: string; actual: number; expected: number }>;
};

export const dashboardApi = {
  filters: () =>
    api.get<{
      pipelines: Array<{ id: string; name: string }>;
      teams: Array<{ id: string; name: string }>;
      users: Array<{ id: string; name: string; teamId?: string | null }>;
      channels: Array<{
        id: string;
        name: string;
        displayName?: string | null;
        accessMode: string;
      }>;
      timezone: string;
      currency: string;
    }>("/dashboard/filters"),
  area: (
    area: "overview" | "commercial" | "attendance" | "team" | "customers" | "channels",
    query?: Record<string, QueryValue>,
  ) => api.get<Record<string, any>>(`/dashboard/${area}`, query),
  metrics: (query?: Record<string, QueryValue>) =>
    api.get<DashboardMetrics>("/dashboard/metrics", query),
  charts: (query?: Record<string, QueryValue>) =>
    api.get<DashboardCharts>("/dashboard/charts", query),
  lists: (query?: Record<string, QueryValue>) =>
    api.get<{
      tasksToday: Task[];
      overdueTasks?: Task[];
      unread: Conversation[];
      waitingConversations?: Conversation[];
      recentDeals: Deal[];
      dealsRequiringAction?: DealActionItem[];
      afterSales: Occurrence[];
      pendingPayments?: unknown[];
      journeys?: DashboardJourneySummaries;
    }>("/dashboard/lists", query),
  goals: (query?: Record<string, QueryValue>) =>
    api.get<{ goals: DashboardGoalAnalytics[]; registry: Record<string, unknown> }>(
      "/dashboard/goals/analytics",
      query,
    ),
  createGoal: (data: Record<string, unknown>) =>
    api.post<Record<string, unknown>>("/dashboard/goals", data),
  updateGoal: (id: string, data: Record<string, unknown>) =>
    api.patch<Record<string, unknown>>(`/dashboard/goals/${id}`, data),
  archiveGoal: (id: string) => api.delete<Record<string, unknown>>(`/dashboard/goals/${id}`),
  explore: (query?: Record<string, QueryValue>) =>
    api.get<{
      metric: string;
      dimension: string;
      rows: Array<{ label: string; value: number | null }>;
    }>("/dashboard/explore", query),
};

export const contactsApi = {
  list: (query?: Record<string, QueryValue>) =>
    api.get<PaginatedResponse<Contact>>("/contacts", query),
  get: (id: string) => api.get<Contact>(`/contacts/${id}`),
  create: (data: ContactWriteInput) => api.post<Contact>("/contacts", data),
  update: (id: string, data: Partial<ContactWriteInput>) =>
    api.patch<Contact>(`/contacts/${id}`, data),
  activities: (id: string) => api.get<Activity[]>(`/contacts/${id}/activities`),
  deals: (id: string) => api.get<Deal[]>(`/contacts/${id}/deals`),
  orders: (id: string) => api.get<Order[]>(`/contacts/${id}/orders`),
  tasks: (id: string) => api.get<Task[]>(`/contacts/${id}/tasks`),
  updateTags: (contactId: string, tagIds: string[], mode: "add" | "remove" | "set") =>
    api.post<{ updated: number }>("/contacts/bulk/tags", {
      contactIds: [contactId],
      tagIds,
      mode,
    }),
};

export const companiesApi = {
  list: (query?: Record<string, QueryValue>) =>
    api.get<PaginatedResponse<Company>>("/companies", query),
  get: (id: string) => api.get<Company>(`/companies/${id}`),
  create: (data: {
    legalName: string;
    tradeName?: string;
    cnpj?: string;
    email?: string;
    phone?: string;
    segment?: string;
    website?: string;
    notes?: string;
    ownerId?: string;
  }) => api.post<Company>("/companies", data),
  update: (
    id: string,
    data: Partial<{
      legalName: string;
      tradeName: string;
      cnpj: string;
      email: string;
      phone: string;
      segment: string;
      website: string;
      notes: string;
      ownerId: string;
    }>,
  ) => api.patch<Company>(`/companies/${id}`, data),
  contacts: (id: string) => api.get<Contact[]>(`/companies/${id}/contacts`),
};

export const pipelinesApi = {
  accessOverview: () => api.get<PipelineAccessOverview>("/pipelines/access"),
  updateAccess: (
    id: string,
    data: { accessMode: "ORGANIZATION" | "RESTRICTED"; teamIds: string[]; userIds: string[] },
  ) => api.put<PipelineAccessOverview>(`/pipelines/access/${id}`, data),
  eligibleUsers: (id: string) => api.get<UserRef[]>(`/pipelines/access/${id}/eligible-users`),
  navigation: () => api.get<PipelineNavigationItem[]>("/pipelines/navigation"),
  list: async (query?: PipelineListQuery): Promise<PaginatedResponse<Pipeline>> => {
    const res = await api.get<Pipeline[] | PaginatedResponse<Pipeline>>("/pipelines", {
      page: query?.page,
      pageSize: query?.pageSize ?? 20,
      search: query?.search,
      archived: query?.archived,
      favorite: query?.favorite,
    });
    if (!Array.isArray(res)) return res;
    return {
      data: res,
      meta: {
        total: res.length,
        page: query?.page ?? 1,
        pageSize: query?.pageSize ?? Math.max(res.length, 1),
        totalPages: 1,
      },
    };
  },
  get: (id: string) => api.get<Pipeline>(`/pipelines/${id}`),
  board: (id: string) => api.get<Pipeline>(`/pipelines/${id}/board`),
  create: (data: PipelineInput) => api.post<Pipeline>("/pipelines", data),
  update: (id: string, data: Partial<PipelineInput>) =>
    api.patch<Pipeline>(`/pipelines/${id}`, data),
  duplicate: (id: string) => api.post<Pipeline>(`/pipelines/${id}/duplicate`, {}),
  archive: (id: string) => api.post<Pipeline>(`/pipelines/${id}/archive`),
  restore: (id: string) => api.post<Pipeline>(`/pipelines/${id}/restore`),
  remove: (id: string) => api.delete<void>(`/pipelines/${id}`),
};

export const pipelineStagesApi = {
  list: (pipelineId: string, archived = false) =>
    api.get<PipelineStage[]>(`/pipelines/${pipelineId}/stages`, { archived }),
  create: (pipelineId: string, data: PipelineStageInput) =>
    api.post<PipelineStage>(`/pipelines/${pipelineId}/stages`, data),
  update: (pipelineId: string, stageId: string, data: Partial<PipelineStageInput>) =>
    api.patch<PipelineStage>(`/pipelines/${pipelineId}/stages/${stageId}`, data),
  reorder: (pipelineId: string, stageIds: string[]) =>
    api.post<PipelineStage[]>(`/pipelines/${pipelineId}/stages/reorder`, {
      stageIds,
    }),
  remove: (pipelineId: string, stageId: string, targetStageId?: string) => {
    const query = targetStageId ? `?targetStageId=${encodeURIComponent(targetStageId)}` : "";
    return api.delete<PipelineStage>(`/pipelines/${pipelineId}/stages/${stageId}${query}`);
  },
};

function unwrapData<T>(response: T[] | { data: T[] }) {
  return Array.isArray(response) ? response : response.data;
}

export const pipelineChannelsApi = {
  list: async (pipelineId: string) =>
    unwrapData(
      await api.get<PipelineChannelConnection[] | { data: PipelineChannelConnection[] }>(
        `/pipelines/${pipelineId}/channels`,
      ),
    ),
  available: async (pipelineId: string) =>
    unwrapData(
      await api.get<AvailablePipelineChannel[] | { data: AvailablePipelineChannel[] }>(
        `/pipelines/${pipelineId}/channels/available`,
      ),
    ),
  connect: (pipelineId: string, data: PipelineChannelInput) =>
    api.post<PipelineChannelConnection>(`/pipelines/${pipelineId}/channels`, data),
  update: (
    pipelineId: string,
    connectionId: string,
    data: Partial<Omit<PipelineChannelInput, "channelId">>,
  ) =>
    api.patch<PipelineChannelConnection>(`/pipelines/${pipelineId}/channels/${connectionId}`, data),
  pause: (pipelineId: string, connectionId: string) =>
    api.patch<PipelineChannelConnection>(`/pipelines/${pipelineId}/channels/${connectionId}/pause`),
  resume: (pipelineId: string, connectionId: string) =>
    api.patch<PipelineChannelConnection>(
      `/pipelines/${pipelineId}/channels/${connectionId}/resume`,
    ),
  test: (pipelineId: string, connectionId: string) =>
    api.post<PipelineChannelTestResult>(`/pipelines/${pipelineId}/channels/${connectionId}/test`),
  simulate: (pipelineId: string, connectionId: string, data: PipelineLeadSimulationInput) =>
    api.post<PipelineLeadSimulationResult>(
      `/pipelines/${pipelineId}/channels/${connectionId}/simulate`,
      data,
    ),
  disconnect: (pipelineId: string, connectionId: string) =>
    api.delete<{ id: string; disconnected: boolean }>(
      `/pipelines/${pipelineId}/channels/${connectionId}`,
    ),
};

export const dealsApi = {
  get: (id: string) => api.get<Deal>(`/deals/${id}`),
  create: (data: Partial<Deal>) => api.post<Deal>("/deals", data),
  lookupManualLead: (query: { pipelineId: string; phone?: string; email?: string }) =>
    api.get<{
      phone: string | null;
      contact:
        | (Contact & {
            deals: Array<
              Deal & { pipeline?: Pipeline; stage?: PipelineStage; owner?: UserRef | null }
            >;
          })
        | null;
      activeDeal: (Deal & { stage?: PipelineStage; owner?: UserRef | null }) | null;
      possibleEmailContact: Pick<Contact, "id" | "firstName" | "lastName" | "email"> | null;
    }>("/deals/manual-lead/lookup", query),
  createManualLead: (data: {
    phone: string;
    contactName: string;
    email?: string;
    pipelineId: string;
    stageId: string;
    ownerId?: string;
    value?: number;
    informedSource?: string;
    note?: string;
    taskTitle?: string;
    taskDueAt?: string;
  }) => api.post<Deal>("/deals/manual-lead", data),
  update: (id: string, data: Partial<Deal>) => api.patch<Deal>(`/deals/${id}`, data),
  addTag: (id: string, tagId: string) => api.post(`/deals/${id}/tags/${tagId}`),
  removeTag: (id: string, tagId: string) => api.delete(`/deals/${id}/tags/${tagId}`),
  move: (id: string, stageId: string) => api.patch<Deal>(`/deals/${id}`, { stageId }),
  activities: (id: string) => api.get<Activity[]>(`/deals/${id}/activities`),
  files: async (id: string) =>
    (await api.get<{ data: LeadFile[]; total: number }>(`/deals/${id}/files`)).data,
  saveMessageFile: (id: string, data: { messageId: string; attachmentId: string }) =>
    api.post<LeadFile>(`/deals/${id}/files/from-message`, data),
  removeFile: (dealId: string, id: string) =>
    api.delete<{ removed: true }>(`/deals/${dealId}/files/${id}`),
};

export const conversationsApi = {
  list: (query?: ConversationListQuery) =>
    api.get<
      | PaginatedResponse<ConversationListItem>
      | {
          data: ConversationListItem[];
          meta: { pageSize: number; hasMore: boolean; nextCursor: string | null };
        }
    >("/conversations", query as Record<string, QueryValue> | undefined),
  get: (id: string) => api.get<Conversation>(`/conversations/${id}`),
  messages: async (id: string, query?: MessageQuery): Promise<MessageCursorPage> =>
    unwrapMessageCursorPage(
      await api.get<Message[] | MessageCursorPage>(
        `/conversations/${id}/messages`,
        query as Record<string, QueryValue> | undefined,
      ),
    ),
  context: (id: string) => api.get<ConversationContext>(`/conversations/${id}/context`),
  markRead: (id: string) =>
    api.patch<{ id: string; unreadCount: number }>(`/conversations/${id}/read`),
  sendMessage: async (id: string, body: string) => {
    const raw = await api.post<unknown>(`/conversations/${id}/messages`, { body });
    const messages = normalizeMessages(raw);
    if (!messages[0]) {
      throw new ApiError("Resposta de mensagem invÃ¡lida.", 500, raw);
    }
    return messages[0];
  },
  sendMessageWithAttachments: async (id: string, payload: { body?: string; files: File[] }) => {
    const form = new FormData();
    if (payload.body?.trim()) form.append("body", payload.body.trim());
    for (const file of payload.files) {
      form.append("files", file, file.name);
    }
    const raw = await api.post<unknown>(`/conversations/${id}/messages`, form);
    const messages = normalizeMessages(raw);
    if (!messages[0]) {
      throw new ApiError("Resposta de mensagem invÃ¡lida.", 500, raw);
    }
    return messages[0];
  },
  byDeal: async (dealId: string) => {
    const res = await api.get<Conversation | Conversation[] | PaginatedResponse<Conversation>>(
      "/conversations",
      { dealId },
    );
    if (Array.isArray(res)) return res[0] ?? null;
    if (res && typeof res === "object" && "data" in res) {
      return (res as PaginatedResponse<Conversation>).data[0] ?? null;
    }
    return (res as Conversation) ?? null;
  },
};

export const notesApi = {
  listPage: (query?: Record<string, QueryValue>) =>
    api.get<PaginatedResponse<Note>>("/notes", query),
  list: async (query?: Record<string, QueryValue>) =>
    unwrapData(await api.get<Note[] | PaginatedResponse<Note>>("/notes", query)),
  create: (data: { content: string; contactId?: string; dealId?: string; isInternal?: boolean }) =>
    api.post<Note>("/notes", data),
};

export const tasksApi = {
  list: (query?: Record<string, QueryValue>) => api.get<PaginatedResponse<Task>>("/tasks", query),
  board: (query?: Record<string, QueryValue>) => api.get<TaskBoardGroup[]>("/tasks/board", query),
  statuses: (includeArchived = false) =>
    api.get<TaskStatusDefinition[]>("/tasks/statuses", {
      includeArchived: includeArchived ? true : undefined,
    }),
  createStatus: (data: Partial<TaskStatusDefinition> & { name: string }) =>
    api.post<TaskStatusDefinition>("/tasks/statuses", data),
  updateStatus: (id: string, data: Partial<TaskStatusDefinition>) =>
    api.patch<TaskStatusDefinition>(`/tasks/statuses/${id}`, data),
  reorderStatuses: (statusIds: string[]) =>
    api.post<TaskStatusDefinition[]>("/tasks/statuses/reorder", { statusIds }),
  get: (id: string) => api.get<Task>(`/tasks/${id}`),
  workspace: (id: string) => api.get<TaskWorkspaceData>(`/tasks/${id}/workspace`),
  comment: (id: string, data: FormData) => api.post<TaskComment>(`/tasks/${id}/comments`, data),
  create: (data: Partial<Task> & { title: string; statusDefinitionId?: string }) =>
    api.post<Task>("/tasks", data),
  update: (id: string, data: Partial<Task>) =>
    api.patch<Task>(`/tasks/${id}`, data),
  complete: (id: string) => api.post<Task>(`/tasks/${id}/complete`),
  reopen: (id: string) => api.post<Task>(`/tasks/${id}/reopen`),
  today: () => api.get<Task[]>("/tasks/today"),
};

export const ordersApi = {
  list: (query?: Record<string, QueryValue>) => api.get<PaginatedResponse<Order>>("/orders", query),
  get: (id: string) => api.get<Order>(`/orders/${id}`),
  timeline: (id: string) => api.get<Activity[]>(`/orders/${id}/timeline`),
};

export const repurchaseApi = {
  list: (query?: Record<string, QueryValue>) =>
    api.get<PaginatedResponse<RepurchaseLead>>("/repurchase", query),
  createOpportunity: (contactId: string, data: CreateLifecycleOpportunityInput) =>
    api.post<LifecycleOpportunityResult>(`/repurchase/${contactId}/opportunity`, data),
};

export const reactivationApi = {
  list: async (query: ReactivationListQuery = {}) =>
    normalizeReactivationResponse(await api.get<unknown>("/reactivation", { ...query }), query),
  createOpportunity: (contactId: string, data: CreateLifecycleOpportunityInput) =>
    api.post<LifecycleOpportunityResult>(`/reactivation/${contactId}/opportunity`, data),
  createAction: (contactId: string, data: CreateReactivationActionInput) =>
    api.post<{ id: string; type: string; contactId: string }>(
      `/reactivation/${contactId}/actions`,
      data,
    ),
};

export const occurrencesApi = {
  list: (query?: Record<string, QueryValue>) =>
    api.get<PaginatedResponse<Occurrence>>("/occurrences", query),
  get: (id: string) => api.get<Occurrence>(`/occurrences/${id}`),
  update: (id: string, data: Partial<Occurrence>) =>
    api.patch<Occurrence>(`/occurrences/${id}`, data),
};

export const automationsApi = {
  list: async () =>
    unwrapData(await api.get<Automation[] | PaginatedResponse<Automation>>("/automations")),
  get: (id: string) => api.get<Automation>(`/automations/${id}`),
  create: (data: Partial<Automation>) => api.post<Automation>("/automations", data),
  update: (id: string, data: Partial<Automation>) =>
    api.patch<Automation>(`/automations/${id}`, data),
};

export const marketingApi = {
  campaigns: async () => {
    const response = await api.get<
      | { id: string; name: string; status: string }[]
      | PaginatedResponse<{ id: string; name: string; status: string }>
    >("/marketing/campaigns", { pageSize: 100 });
    return Array.isArray(response) ? response : response.data;
  },
  overview: () =>
    api.get<{
      campaigns: { id: string; name: string; status: string; spend: number; leads: number }[];
      charts: {
        reach: { label: string; value: number }[];
        conversions: { label: string; value: number }[];
      };
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
  list: async () => {
    const response = await api.get<
      | (Omit<NotificationItem, "read"> & { readAt?: string | null })[]
      | PaginatedResponse<Omit<NotificationItem, "read"> & { readAt?: string | null }>
    >("/notifications");
    const notifications = Array.isArray(response) ? response : response.data;
    return notifications.map((notification) => ({
      ...notification,
      read: Boolean(notification.readAt),
    }));
  },
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch("/notifications/read-all"),
};

export const settingsApi = {
  overview: () => api.get<SettingsOverview>("/settings"),
  teams: async () => {
    const response = await api.get<Team[] | PaginatedResponse<Team>>("/settings/teams", {
      pageSize: 100,
    });
    return Array.isArray(response) ? response : response.data;
  },
  users: async () => {
    const response = await api.get<UserRef[] | PaginatedResponse<UserRef>>("/settings/users", {
      pageSize: 100,
    });
    return Array.isArray(response) ? response : response.data;
  },
  tags: async () => {
    const response = await api.get<Tag[] | PaginatedResponse<Tag>>("/settings/tags", {
      pageSize: 100,
    });
    return Array.isArray(response) ? response : response.data;
  },
  createTag: (data: { name: string; color?: string }) => api.post<Tag>("/settings/tags", data),
  update: (data: Partial<SettingsOverview>) => api.patch("/settings", data),
};

export const usersApi = {
  list: (query?: { page?: number; pageSize?: number; search?: string; status?: string }) =>
    api.get<PaginatedResponse<ManagedUser>>("/users", query),
  invite: (data: {
    name: string;
    email: string;
    phone?: string;
    role: "ADMIN" | "MANAGER" | "CONSULTANT";
    teamId?: string;
  }) =>
    api.post<{ user: ManagedUser; inviteUrl: string; expiresAt: string }>("/users/invite", data),
  resendInvite: (id: string) =>
    api.post<{ inviteUrl: string; expiresAt: string }>(`/users/${id}/resend-invite`),
  update: (
    id: string,
    data: Partial<{
      name: string;
      phone: string;
      role: "ADMIN" | "MANAGER" | "CONSULTANT";
      teamId: string | null;
    }>,
  ) => api.patch<ManagedUser>(`/users/${id}`, data),
  deactivate: (id: string) => api.post(`/users/${id}/deactivate`),
  reactivate: (id: string) => api.post(`/users/${id}/reactivate`),
  revokeSessions: (id: string) => api.post<{ revoked: number }>(`/users/${id}/revoke-sessions`),
  inspectInvite: (token: string) =>
    api.get<{ name: string; email: string; expiresAt: string }>(
      `/users/invites/${encodeURIComponent(token)}`,
    ),
  acceptInvite: (token: string, data: { password: string; confirmPassword: string }) =>
    api.post<{ ok: true }>(`/users/invites/${encodeURIComponent(token)}/accept`, data),
};

export const activitiesApi = {
  list: (query?: Record<string, QueryValue>) =>
    api.get<PaginatedResponse<Activity>>("/activities", query),
  history: (dealId: string, page = 1, pageSize = 20) =>
    api.get<PaginatedResponse<Activity>>("/activities/timeline", { dealId, page, pageSize }),
};
