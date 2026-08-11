export const queryKeys = {
  dashboard: {
    all: ["dashboard"] as const,
    metrics: (params?: unknown) => ["dashboard", "metrics", params] as const,
    charts: (params?: unknown) => ["dashboard", "charts", params] as const,
    lists: (params?: unknown) => ["dashboard", "lists", params] as const,
  },
  contacts: {
    all: ["contacts"] as const,
    list: (params?: unknown) => ["contacts", "list", params] as const,
    detail: (id: string) => ["contacts", id] as const,
    activities: (id: string) => ["contacts", id, "activities"] as const,
    deals: (id: string) => ["contacts", id, "deals"] as const,
  },
  companies: {
    all: ["companies"] as const,
    list: (params?: unknown) => ["companies", "list", params] as const,
    detail: (id: string) => ["companies", id] as const,
  },
  pipelines: {
    all: ["pipelines"] as const,
    navigation: ["pipelines", "navigation"] as const,
    list: (params?: unknown) => ["pipelines", "list", params] as const,
    detail: (id: string) => ["pipelines", id] as const,
    board: (id: string) => ["pipelines", id, "board"] as const,
    stages: (id: string, archived = false) =>
      ["pipelines", id, "stages", { archived }] as const,
    channels: (id: string) => ["pipelines", id, "channels"] as const,
    availableChannels: (id: string) =>
      ["pipelines", id, "channels", "available"] as const,
  },
  deals: {
    detail: (id: string) => ["deals", id] as const,
    activities: (id: string) => ["deals", id, "activities"] as const,
    history: (id: string) => ["deals", id, "history"] as const,
    files: (id: string) => ["deals", id, "files"] as const,
  },
  conversations: {
    all: ["conversations"] as const,
    lists: ["conversations", "list"] as const,
    list: (params?: unknown) => ["conversations", "list", params] as const,
    detail: (id: string) => ["conversations", id] as const,
    context: (id: string) => ["conversations", id, "context"] as const,
    messages: (id: string, params?: unknown) =>
      ["conversations", id, "messages", params] as const,
  },
  tasks: {
    list: (params?: unknown) => ["tasks", "list", params] as const,
    board: (params?: unknown) => ["tasks", "board", params] as const,
    statuses: ["tasks", "statuses"] as const,
    today: ["tasks", "today"] as const,
  },
  orders: {
    list: (params?: unknown) => ["orders", "list", params] as const,
    detail: (id: string) => ["orders", id] as const,
  },
  repurchase: (params?: unknown) => ["repurchase", params] as const,
  reactivation: (params?: unknown) => ["reactivation", params] as const,
  occurrences: {
    list: (params?: unknown) => ["occurrences", "list", params] as const,
    detail: (id: string) => ["occurrences", id] as const,
  },
  automations: {
    all: ["automations"] as const,
    detail: (id: string) => ["automations", id] as const,
  },
  marketing: ["marketing"] as const,
  reports: ["reports"] as const,
  notifications: ["notifications"] as const,
  search: (q: string) => ["search", q] as const,
  settings: ["settings"] as const,
  notes: (entityType: string, entityId: string) =>
    ["notes", entityType, entityId] as const,
};
