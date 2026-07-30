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
  color?: string | null;
  icon?: string | null;
  isDefault?: boolean;
  favorite?: boolean;
  archived?: boolean;
  position?: number;
  defaultTeamId?: string | null;
  defaultTeam?: Team | null;
  defaultOwnerId?: string | null;
  defaultOwner?: UserRef | null;
  stages?: PipelineStage[];
  dealsCount?: number;
  stagesCount?: number;
  openValue?: number | string;
  channels?: PipelineChannelSummary[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PipelineChannelSummary {
  id: string;
  name: string;
  type?: string;
  enabled?: boolean;
}

export interface AvailablePipelineChannel {
  id: string;
  type: string;
  name: string;
  provider?: string | null;
  externalAccountId?: string | null;
  displayName?: string | null;
  status?: string | null;
  isActive: boolean;
  lastSyncAt?: string | null;
  lastErrorAt?: string | null;
  lastErrorMessage?: string | null;
  connected: boolean;
  connectionId?: string | null;
}

export interface PipelineChannelConnection {
  id: string;
  pipelineId: string;
  channelId: string;
  defaultStageId: string;
  defaultOwnerId?: string | null;
  defaultTeamId?: string | null;
  defaultTagIds?: string[];
  source?: string | null;
  campaignId?: string | null;
  active: boolean;
  createContact: boolean;
  createConversation: boolean;
  createDeal: boolean;
  duplicateStrategy: "MERGE" | "CREATE_NEW" | "REJECT";
  routingMode: "PIPELINE_DEFAULTS" | "FIXED" | "ROUND_ROBIN";
  lastSyncAt?: string | null;
  lastErrorAt?: string | null;
  lastErrorMessage?: string | null;
  createdAt?: string;
  updatedAt?: string;
  channel: {
    id: string;
    type: string;
    name: string;
    provider?: string | null;
    externalAccountId?: string | null;
    displayName?: string | null;
    status?: string | null;
    isActive?: boolean;
    lastSyncAt?: string | null;
    lastErrorAt?: string | null;
    lastErrorMessage?: string | null;
  };
  pipeline?: Pick<Pipeline, "id" | "name">;
  defaultStage?: Pick<PipelineStage, "id" | "name"> | null;
  defaultOwner?: UserRef | null;
  defaultTeam?: Team | null;
  campaign?: { id: string; name: string } | null;
}

export interface PipelineChannelInput {
  channelId: string;
  defaultStageId: string;
  defaultOwnerId?: string | null;
  defaultTeamId?: string | null;
  defaultTagIds?: string[];
  source?: string | null;
  campaignId?: string | null;
  active?: boolean;
  createContact?: boolean;
  createConversation?: boolean;
  createDeal?: boolean;
  duplicateStrategy?: "MERGE" | "CREATE_NEW" | "REJECT";
  routingMode?: "PIPELINE_DEFAULTS" | "FIXED" | "ROUND_ROBIN";
}

export interface PipelineChannelTestResult {
  ok: boolean;
  mode: string;
  testedAt: string;
  connectionId: string;
  channel: {
    id: string;
    type: string;
    name: string;
    status?: string | null;
  };
}

export interface PipelineLeadSimulationInput {
  name: string;
  phone?: string;
  email?: string;
  instagram?: string;
  message: string;
  estimatedValue?: number;
}

export interface PipelineLeadSimulationResult {
  ok: boolean;
  mode: string;
  simulatedAt: string;
  simulationId: string;
  connectionId: string;
  duplicateStrategy: "MERGE" | "CREATE_NEW" | "REJECT";
  matchedContactId: string | null;
  contactCreated: boolean;
  contactReused: boolean;
  contact: {
    id: string;
    firstName: string;
    lastName?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    instagram?: string | null;
  } | null;
  conversation: {
    id: string;
    contactId?: string | null;
    channelId?: string | null;
    assigneeId?: string | null;
    status: string;
    lastMessageAt?: string | null;
    unreadCount: number;
  } | null;
  message: {
    id: string;
    conversationId: string;
    channelId?: string | null;
    direction: "INBOUND";
    status: string;
    body?: string | null;
    sentAt: string;
  } | null;
  deal: {
    id: string;
    name: string;
    value: number | string;
    pipelineId: string;
    stageId: string;
    contactId?: string | null;
    conversationId?: string | null;
    ownerId?: string | null;
    teamId?: string | null;
    status: string;
  } | null;
  appliedTagIds: string[];
}

export interface PipelineListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  archived?: boolean;
  favorite?: boolean;
}

export interface PipelineInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  defaultTeamId?: string | null;
  defaultOwnerId?: string | null;
  favorite?: boolean;
}

export type PipelineStageType = "OPEN" | "WON" | "LOST";

export interface PipelineStage {
  id: string;
  pipelineId?: string;
  name: string;
  description?: string | null;
  order: number;
  position?: number;
  color?: string | null;
  type?: PipelineStageType;
  isInitial?: boolean;
  maxDurationMinutes?: number | null;
  probability?: number | null;
  archived?: boolean;
  isWon?: boolean;
  isLost?: boolean;
  maxDaysInStage?: number | null;
  _count?: {
    deals: number;
  };
  deals?: Deal[];
}

export interface PipelineStageInput {
  name: string;
  description?: string;
  color?: string;
  type?: PipelineStageType;
  isInitial?: boolean;
  maxDurationMinutes?: number;
  probability?: number;
  archived?: boolean;
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
  channel?: string | { id?: string; name?: string; type?: string } | null;
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
  body?: string;
  content?: string;
  entityType?: string;
  entityId?: string;
  contactId?: string | null;
  dealId?: string | null;
  isInternal?: boolean;
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

export type ReactivationStatus =
  | "LEAD"
  | "QUALIFIED"
  | "ACTIVE_CUSTOMER"
  | "INACTIVE"
  | "ARCHIVED";

export type ReactivationFilterStatus = Exclude<
  ReactivationStatus,
  "ARCHIVED"
>;

export type ReactivationSegment =
  | "lead_nunca_comprou"
  | "comprou_uma_vez"
  | "recorrente_parou"
  | "cliente_sem_resposta";

export type ReactivationSortBy =
  | "score"
  | "daysInactive"
  | "lastPurchaseAt"
  | "lastInteractionAt"
  | "name";

export interface ReactivationContact {
  id: string;
  name: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  totalPurchased: number;
  averageTicket: number;
  orderCount: number;
}

export interface ReactivationLead {
  id: string;
  contact: ReactivationContact | null;
  score: number;
  reason: string;
  status: ReactivationStatus;
  classification: ReactivationSegment;
  daysInactive: number;
  lastInteractionAt: string | null;
  lastPurchaseAt: string | null;
  owner: UserRef | null;
  team: Team | null;
  existingOpenDealId: string | null;
}

export interface ReactivationListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  scoreMin?: number;
  scoreMax?: number;
  inactiveDaysMin?: number;
  inactiveDaysMax?: number;
  status?: ReactivationFilterStatus;
  ownerId?: string;
  teamId?: string;
  lastPurchaseFrom?: string;
  lastPurchaseTo?: string;
  lastInteractionFrom?: string;
  lastInteractionTo?: string;
  segment?: ReactivationSegment;
  sortBy?: ReactivationSortBy;
  sortOrder?: "asc" | "desc";
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
