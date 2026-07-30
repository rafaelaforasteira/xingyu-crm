export const queryKeys = {
  dashboard: {
    metrics: ["dashboard", "metrics"] as const,
    charts: ["dashboard", "charts"] as const,
    lists: ["dashboard", "lists"] as const,
  },
  contacts: {
    all: ["contacts"] as const,
    list: (params?: unknown) => ["contacts", "list", params] as const,
    detail: (id: string) => ["contacts", id] as const,
    activities: (id: string) => ["contacts", id, "activities"] as const,
  },
  companies: {
    all: ["companies"] as const,
    list: (params?: unknown) => ["companies", "list", params] as const,
    detail: (id: string) => ["companies", id] as const,
  },
  pipelines: {
    all: ["pipelines"] as const,
    detail: (id: string) => ["pipelines", id] as const,
    board: (id: string) => ["pipelines", id, "board"] as const,
  },
  deals: {
    detail: (id: string) => ["deals", id] as const,
    activities: (id: string) => ["deals", id, "activities"] as const,
    files: (id: string) => ["deals", id, "files"] as const,
  },
  conversations: {
    list: (params?: unknown) => ["conversations", "list", params] as const,
    detail: (id: string) => ["conversations", id] as const,
    messages: (id: string) => ["conversations", id, "messages"] as const,
  },
  tasks: {
    list: (params?: unknown) => ["tasks", "list", params] as const,
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
