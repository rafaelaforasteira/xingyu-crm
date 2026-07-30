export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface UserRef {
  id: string;
  name: string;
  avatarUrl?: string | null;
  role?: string;
  teamId?: string;
  team?: string;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
}

export interface Contact {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  companyId?: string | null;
  company?: Company | null;
  ownerId?: string | null;
  owner?: UserRef | null;
  status?: string;
  tags?: Tag[];
  source?: string | null;
  lastInteractionAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  notes?: string | null;
}

export interface Company {
  id: string;
  name: string;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  industry?: string | null;
  ownerId?: string | null;
  owner?: UserRef | null;
  contactsCount?: number;
  dealsCount?: number;
  createdAt: string;
}

export interface Pipeline {
  id: string;
  name: string;
  description?: string | null;
  isDefault?: boolean;
  stages?: PipelineStage[];
  dealsCount?: number;
}

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  color?: string;
  probability?: number;
  deals?: Deal[];
}

export type DealPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface Deal {
  id: string;
  name: string;
  value?: number | null;
  currency?: string;
  pipelineId: string;
  stageId: string;
  contactId?: string | null;
  contact?: Contact | null;
  companyId?: string | null;
  company?: Company | null;
  ownerId?: string | null;
  owner?: UserRef | null;
  priority?: DealPriority;
  tags?: Tag[];
  lastInteractionAt?: string | null;
  nextTask?: Task | null;
  unreadCount?: number;
  conversationId?: string | null;
  status?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Conversation {
  id: string;
  contactId?: string | null;
  contact?: Contact | null;
  dealId?: string | null;
  channel?: string;
  status?: string;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  unreadCount?: number;
  assignee?: UserRef | null;
  messages?: Message[];
}

export interface Message {
  id: string;
  conversationId: string;
  body: string;
  direction: "INBOUND" | "OUTBOUND" | "INTERNAL";
  channel?: string;
  authorId?: string | null;
  author?: UserRef | null;
  createdAt: string;
  status?: string;
}

export interface Note {
  id: string;
  body: string;
  entityType: string;
  entityId: string;
  authorId?: string | null;
  author?: UserRef | null;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  type?: string;
  status: "PENDING" | "IN_PROGRESS" | "DONE" | "CANCELLED" | string;
  priority?: DealPriority | string;
  dueAt?: string | null;
  assigneeId?: string | null;
  assignee?: UserRef | null;
  contactId?: string | null;
  contact?: Contact | null;
  dealId?: string | null;
  deal?: Deal | null;
  orderId?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export type OrderStatus =
  | "ORDER_PLACED"
  | "AWAITING_PAYMENT"
  | "PAYMENT_APPROVED"
  | "SEPARATING"
  | "IN_PRODUCTION"
  | "LEFT_FACTORY"
  | "INTERNATIONAL_TRANSPORT"
  | "ARRIVED_BRAZIL"
  | "NATIONAL_TRANSPORT"
  | "DELIVERED"
  | "AFTER_SALES_STARTED"
  | "COMPLETED"
  | string;

export interface Order {
  id: string;
  number: string;
  contactId?: string | null;
  contact?: Contact | null;
  companyId?: string | null;
  company?: Company | null;
  dealId?: string | null;
  status: OrderStatus;
  total: number;
  currency?: string;
  itemsCount?: number;
  placedAt?: string | null;
  updatedAt?: string;
  timeline?: Activity[];
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  productName: string;
  sku?: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Activity {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  entityType?: string;
  entityId?: string;
  actor?: UserRef | null;
  createdAt: string;
  meta?: Record<string, unknown>;
}

export interface Occurrence {
  id: string;
  title: string;
  status: string;
  type?: string;
  priority?: string;
  orderId?: string | null;
  order?: Order | null;
  contactId?: string | null;
  contact?: Contact | null;
  assignee?: UserRef | null;
  openedAt: string;
  resolvedAt?: string | null;
  description?: string | null;
}

export interface RepurchaseLead {
  id: string;
  contact: Contact;
  score: number;
  lastOrderAt?: string | null;
  daysSinceOrder?: number;
  predictedValue?: number | null;
  reason?: string | null;
  status?: string;
}

export interface ReactivationLead {
  id: string;
  contact: Contact;
  score: number;
  lastInteractionAt?: string | null;
  daysInactive?: number;
  reason?: string | null;
  status?: string;
}

export interface Automation {
  id: string;
  name: string;
  description?: string | null;
  status: "ACTIVE" | "DRAFT" | "PAUSED" | string;
  trigger?: string;
  nodes?: AutomationNode[];
  updatedAt?: string;
  createdAt: string;
}

export interface AutomationNode {
  id: string;
  type: "TRIGGER" | "CONDITION" | "ACTION" | "DELAY" | string;
  label: string;
  config?: Record<string, unknown>;
  order: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  body?: string | null;
  read: boolean;
  type?: string;
  href?: string | null;
  createdAt: string;
}

export interface SearchResult {
  contacts: Contact[];
  companies: Company[];
  deals: Deal[];
  orders: Order[];
  tasks: Task[];
}

export interface DashboardMetrics {
  openDeals: number;
  pipelineValue: number;
  tasksToday: number;
  unreadConversations: number;
  ordersInTransit: number;
  repurchaseReady: number;
  afterSalesOpen: number;
  conversionRate?: number;
  wonThisMonth?: number;
  lostThisMonth?: number;
}

export interface ChartPoint {
  label: string;
  value: number;
  secondary?: number;
}

export interface DashboardCharts {
  pipelineByStage: ChartPoint[];
  revenueTrend: ChartPoint[];
  channelMix: ChartPoint[];
}

export interface Team {
  id: string;
  name: string;
}

export interface SettingsOverview {
  organizationName: string;
  timezone: string;
  currency: string;
  teams: Team[];
  users: UserRef[];
  channels?: { id: string; name: string; status: string }[];
  integrations?: { id: string; name: string; connected: boolean }[];
}
