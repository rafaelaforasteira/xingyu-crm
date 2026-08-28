export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
  totals?: {
    all: number;
    active: number;
    invited: number;
    inactive: number;
    activeAdmins?: number;
  };
}

export interface UserRef {
  id: string;
  name: string;
  avatarUrl?: string | null;
  role?: string;
  teamId?: string;
  team?: string;
  status?: string;
}

export interface ManagedUser extends Omit<UserRef, "team"> {
  email: string;
  phone?: string | null;
  title?: string | null;
  authRole: "ADMIN" | "MANAGER" | "CONSULTANT";
  status: "ACTIVE" | "INVITED" | "INACTIVE";
  lastLoginAt?: string | null;
  deactivatedAt?: string | null;
  inviteExpiresAt?: string | null;
  team?: { id: string; name: string } | null;
  activeSessions: number;
  directPipelineIds: string[];
  channelOwnerships?: Array<{ id: string; name: string; type: string; status: string }>;
}
export interface SettingsProfile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  title?: string | null;
  authRole: "ADMIN" | "MANAGER" | "CONSULTANT";
  status: string;
  locale: "pt-BR" | "en" | "zh-CN" | "zh-HK";
  timezone: string;
  team?: { id: string; name: string } | null;
}

export type ConnectionStatus =
  | "CONNECTED"
  | "ATTENTION"
  | "OFFLINE"
  | "QR_PENDING"
  | "CONNECTING"
  | "ARCHIVED";

export interface ConnectionListItem {
  id: string;
  name: string;
  provider: string | null;
  type?: string;
  channel?: string;
  status: ConnectionStatus | string;
  phone?: string | null;
  displayAccount?: string | null;
  defaultPipeline?: { id: string; name: string } | null;
  defaultStage?: { id: string; name: string } | null;
  enabledPipelineCount?: number;
  accessSummary?: string | null;
  avatarUrl?: string | null;
  lastActivityAt?: string | null;
  lastError?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConnectionCounts {
  all: number;
  connected: number;
  attention: number;
  offline: number;
}

export interface ConnectionDetail extends ConnectionListItem {
  description?: string | null;
  configurationComplete?: boolean;
  routing?: {
    defaultPipelineId?: string | null;
    defaultPipelineName?: string | null;
    defaultStageId?: string | null;
    defaultStageName?: string | null;
    enabledPipelines?: Array<{
      id: string;
      pipelineId: string;
      pipelineName?: string;
      isDefault: boolean;
      active?: boolean;
      priority?: number;
      defaultStageId?: string | null;
      defaultStageName?: string | null;
      pipeline?: { id: string; name: string };
    }>;
  };
  access?: {
    mode?: "ALL" | "RESTRICTED" | "ORGANIZATION" | "PIPELINE" | string;
    userIds?: string[];
    teamIds?: string[];
    users?: Array<{ id: string; name: string }>;
    teams?: Array<{ id: string; name: string }>;
  };
  diagnostics?: {
    id?: string;
    status?: string;
    provider?: string | null;
    configurationComplete?: boolean;
    lastActivityAt?: string | null;
    lastInboundAt?: string | null;
    lastOutboundAt?: string | null;
    lastErrorAt?: string | null;
    lastErrorCode?: string | null;
    routing?: {
      enabledPipelineCount?: number;
      hasDefault?: boolean;
      defaultPipelineName?: string | null;
      defaultStageName?: string | null;
      enabledPipelineNames?: string[];
    };
    checks?: {
      providerConfigured?: boolean;
      routingConfigured?: boolean;
    };
    [key: string]: unknown;
  };
  activity?: Array<{
    id: string;
    type: string;
    message?: string | null;
    createdAt: string;
    actorName?: string | null;
  }>;
  qrCode?: string | null;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  entityType?: "CONTACT" | "COMPANY" | "DEAL" | "ORDER" | "OCCURRENCE" | "TASK";
  status?: string;
}

export interface Contact {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  companyId?: string | null;
  company?: Company | null;
  ownerId?: string | null;
  owner?: UserRef | null;
  teamId?: string | null;
  team?: Team | null;
  status?: string;
  tags?: Tag[];
  source?: string | null;
  campaign?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  cpf?: string | null;
  cnpj?: string | null;
  firstPurchaseAt?: string | null;
  lastInteractionAt?: string | null;
  lastPurchaseAt?: string | null;
  totalPurchased?: number;
  orderCount?: number;
  createdAt: string;
  updatedAt?: string;
  notes?: string | null;
}

export interface ContactWriteInput {
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  source?: string | null;
  companyId?: string | null;
  ownerId?: string | null;
  teamId?: string | null;
  status?: string;
  type?: string;
  notes?: string | null;
  tagIds?: string[];
}

export interface Company {
  id: string;
  name: string;
  legalName?: string;
  tradeName?: string | null;
  document?: string | null;
  cnpj?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  industry?: string | null;
  segment?: string | null;
  ownerId?: string | null;
  owner?: UserRef | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  totalPurchased?: number;
  lastPurchaseAt?: string | null;
  contactsCount?: number;
  dealsCount?: number;
  createdAt: string;
}

export type CustomerProfileStatus = "LEAD" | "CUSTOMER" | "RECURRING";
export interface CustomerProfileSummary {
  profileId: string;
  profileType: "PERSON" | "COMPANY";
  entityId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  document?: string | null;
  owner?: UserRef | null;
  source?: string | null;
  tags: Tag[];
  location: { country?: string | null; state?: string | null; city?: string | null; address?: string | null };
  status: CustomerProfileStatus;
  orderCount: number;
  lifetimeValue: number;
  averageTicket: number;
  firstPurchaseAt?: string | null;
  lastPurchaseAt?: string | null;
  recency: string;
  units: number;
  openDeals: number;
  createdAt: string;
}
export interface CustomerProfile extends CustomerProfileSummary {
  contacts: Contact[];
  orders: Order[];
  deals: Array<Deal & { pipeline?: Pipeline | null; stage?: PipelineStage | null }>;
  tasks: Task[];
  notes: Note[];
  activities: Activity[];
}
export interface CustomersDashboard {
  total: number; leads: number; customers: number; recurring: number;
  lifetimeValue: number; averageTicket: number;
  profile: Array<{ label: string; value: number; filter: string }>;
  location: Array<{ label: string; value: number; filter: string }>;
  states: Array<{ label: string; value: number }>;
  countries: Array<{ label: string; value: number }>;
  recency: Array<{ label: string; value: number }>;
  owners: Array<{ label: string; value: number }>;
  quality: { withoutPhone: number; withoutEmail: number; withoutLocation: number; withoutOwner: number };
}

export interface PipelineNavigationItem {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
  position: number;
  index?: number;
  favorite: boolean;
  active?: boolean;
  unreadCount?: number;
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
  position: number;
  /** @deprecated Prefer `position` — kept optional for older payloads */
  order?: number;
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
  source?: string | null;
  campaign?: string | null;
  leadSequence?: number | null;
  priority?: DealPriority;
  tags?: Tag[];
  lastInteractionAt?: string | null;
  nextTask?: Task | null;
  unreadCount?: number;
  conversationId?: string | null;
  conversationStatus?: string | null;
  channel?: ConversationChannelSummary | null;
  lastMessagePreview?: string | null;
  lastMessageAt?: string | null;
  awaitingReply?: boolean;
  taskSummary?: { open: number; today: number; overdue: number };
  status?: string;
  createdAt: string;
  updatedAt?: string;
  accessLevel?: "FULL" | "SUMMARY";
  canOpen?: boolean;
  canMove?: boolean;
  canEdit?: boolean;
  canChangeResponsible?: boolean;
}

export interface ConversationChannelSummary {
  id: string;
  type: string;
  name: string;
  displayName?: string | null;
  provider?: string | null;
  externalAccountId?: string | null;
  status?: string | null;
}

export interface ConversationContactSummary {
  id: string;
  firstName: string;
  lastName?: string | null;
  name: string;
  phone?: string | null;
  whatsapp?: string | null;
  avatarUrl?: string | null;
}

export interface ConversationDealSummary {
  id: string;
  name: string;
  pipelineId: string;
  stageId: string;
  stageName?: string | null;
  stageColor?: string | null;
  priority?: string | null;
  leadSequence?: number | null;
  ownerId?: string | null;
  owner?: UserRef | null;
}

export interface ConversationListItem {
  id: string;
  status: string;
  lastMessageAt?: string | null;
  unreadCount: number;
  lastMessagePreview?: string | null;
  lastMessageDirection?: string | null;
  awaitingReply?: boolean;
  contact?: ConversationContactSummary | null;
  assignee?: UserRef | null;
  channel?: ConversationChannelSummary | null;
  currentDeal?: ConversationDealSummary | null;
  tags?: Tag[];
}

export interface ConversationListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  pipelineId?: string;
  channelId?: string;
  channels?: string;
  stageId?: string;
  stages?: string;
  tags?: string;
  assigneeId?: string;
  unreadOnly?: boolean;
  awaitingReply?: boolean;
  replyStatus?: "mine" | "customer";
  conversationState?: "open" | "closed";
  period?: "today" | "7d" | "30d" | "older30";
  cursor?: string;
}

export interface Conversation {
  id: string;
  contactId?: string | null;
  contact?: Contact | null;
  dealId?: string | null;
  orderId?: string | null;
  deal?: {
    id: string;
    name: string;
    pipelineId: string;
    stageId: string;
    priority?: string | null;
    leadSequence?: number | null;
    pipeline?: Pick<Pipeline, "id" | "name" | "color"> | null;
    stage?: PipelineStage | null;
    owner?: UserRef | null;
    tags?: Tag[];
  } | null;
  channel?: string | ConversationChannelSummary | null;
  status?: string;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  unreadCount?: number;
  assignee?: UserRef | null;
  messages?: Message[];
  awaitingReply?: boolean;
  waitingKind?: "first_response" | "follow_up" | string;
  waitingKindLabel?: string;
  waitingMinutes?: number;
  waitingDurationLabel?: string;
  lastClientMessageAt?: string | null;
}

export interface MessageQuery {
  pageSize?: number;
  cursor?: string;
  before?: boolean;
}

export interface CursorPageMeta {
  pageSize: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface MessageCursorPage {
  data: Message[];
  meta: CursorPageMeta;
}

export interface ConversationContextCounts {
  notesCount: number;
  filesCount: number;
  tasksCount: number;
  ordersCount: number;
  activitiesCount: number;
}

export interface ConversationContextUtm {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
}

export interface ConversationContextTracking {
  firstContactAt: string | null;
  firstContactDirection: "INBOUND" | "OUTBOUND" | null;
  leadCreatedAt: string | null;
  utm: ConversationContextUtm | null;
  landingPage: string | null;
  referrer: string | null;
}

export interface ConversationContext {
  conversation: {
    id: string;
    status: string;
    subject?: string | null;
    unreadCount: number;
    lastMessageAt?: string | null;
    lastMessagePreview?: string | null;
    assignee?: UserRef | null;
  };
  contact: Contact | null;
  company: Company | null;
  currentDeal:
    | (ConversationDealSummary & {
        owner?: UserRef | null;
        team?: Team | null;
      })
    | null;
  pipeline: Pipeline | null;
  stage: PipelineStage | null;
  owner: UserRef | null;
  team: Team | null;
  channel: ConversationChannelSummary | null;
  tags: Tag[];
  tagSources?: { contactTagIds: string[]; dealTagIds: string[] };
  nextTask:
    | (Pick<Task, "id" | "title" | "dueAt" | "status" | "priority"> & {
        assignee?: UserRef | null;
      })
    | null;
  lastOrder: {
    id: string;
    number: string;
    status: string;
    finalValue?: number | string;
    orderedAt?: string | null;
  } | null;
  tracking?: ConversationContextTracking | null;
  counts: ConversationContextCounts;
}

export interface MessageAttachment {
  id: string;
  fileName: string;
  mimeType?: string | null;
  fileSize?: number | null;
  url: string;
  kind: "image" | "video" | "audio" | "document" | string;
  createdAt?: string;
}

export interface LeadFile {
  id: string;
  organizationId: string;
  dealId: string;
  conversationId?: string | null;
  messageId?: string | null;
  attachmentId?: string | null;
  savedById?: string | null;
  savedBy?: UserRef | null;
  fileName: string;
  mimeType?: string | null;
  fileSize?: number | null;
  url: string;
  kind: string;
  messageDirection?: "INBOUND" | "OUTBOUND" | "INTERNAL" | null;
  messageCreatedAt?: string | null;
  savedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  body: string | null;
  direction: "INBOUND" | "OUTBOUND" | "INTERNAL";
  channel?: string;
  authorId?: string | null;
  author?: UserRef | null;
  senderType?: string | null;
  createdAt: string;
  status?: string;
  attachments?: MessageAttachment[];
  metadata?: Record<string, unknown> | null;
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
  generatedTasks?: Task[];
  createdAt: string;
}

export interface TaskStatusDefinition {
  id: string;
  name: string;
  slug: string;
  color: string;
  position: number;
  category: "OPEN" | "IN_PROGRESS" | "DONE" | string;
  active?: boolean;
  archived?: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  type?: string;
  status: "PENDING" | "IN_PROGRESS" | "DONE" | "COMPLETED" | "CANCELLED" | string;
  statusDefinitionId?: string | null;
  statusDefinition?: TaskStatusDefinition | null;
  priority?: DealPriority | string;
  dueAt?: string | null;
  assigneeId?: string | null;
  assignee?: UserRef | null;
  contactId?: string | null;
  contact?: Contact | null;
  dealId?: string | null;
  deal?: Deal | null;
  sourceNoteId?: string | null;
  pipelineId?: string | null;
  pipeline?: { id: string; name: string; color?: string | null } | null;
  stageId?: string | null;
  stage?: { id: string; name: string; color?: string | null } | null;
  orderId?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface TaskBoardGroup {
  status: TaskStatusDefinition;
  tasks: Task[];
  count: number;
}

export interface TaskCommentAttachment {
  id: string;
  fileName: string;
  mimeType?: string | null;
  fileSize?: number | null;
  url: string;
  kind: string;
}
export interface TaskComment {
  id: string;
  body: string;
  createdAt: string;
  author: UserRef;
  mentions: Array<{ user: UserRef }>;
  attachments: TaskCommentAttachment[];
}
export interface TaskWorkspaceData {
  task: Task;
  comments: TaskComment[];
  activity: Activity[];
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
  ownerId?: string | null;
  owner?: UserRef | null;
  dealId?: string | null;
  deal?:
    | (Deal & {
        pipeline?: { id: string; name: string } | null;
        stage?: { id: string; name: string; color?: string | null } | null;
        conversation?: {
          id: string;
          status: string;
          channel?: ConversationChannelSummary | null;
        } | null;
      })
    | null;
  operationalStageId?: string | null;
  operationalStage?: OrderStageDefinition | null;
  operationalAssigneeId?: string | null;
  operationalAssignee?: UserRef | null;
  operationalPriority?: string;
  operationalDueAt?: string | null;
  operationalIssue?: boolean;
  fulfillmentStatus?: string | null;
  currentLocation?: string | null;
  trackingCode?: string | null;
  status: OrderStatus;
  total?: number;
  grossValue?: number | string;
  discount?: number | string;
  coupon?: string | null;
  shippingCost?: number | string;
  taxes?: number | string;
  finalValue?: number | string;
  currency?: string;
  channel?: string | null;
  source?: string | null;
  campaign?: string | null;
  orderedAt?: string | null;
  createdAt?: string;
  externalId?: string | null;
  externalName?: string | null;
  externalUrl?: string | null;
  customerOrderStatusUrl?: string | null;
  financialStatus?: string | null;
  paymentGateway?: string | null;
  customerNameSnapshot?: string | null;
  customerEmailSnapshot?: string | null;
  customerPhoneSnapshot?: string | null;
  recipientNameSnapshot?: string | null;
  address1Snapshot?: string | null;
  address2Snapshot?: string | null;
  addressNumberSnapshot?: string | null;
  complementSnapshot?: string | null;
  neighborhoodSnapshot?: string | null;
  citySnapshot?: string | null;
  provinceSnapshot?: string | null;
  postalCodeSnapshot?: string | null;
  countrySnapshot?: string | null;
  countryCodeSnapshot?: string | null;
  formattedAddressSnapshot?: string | null;
  isFirstPurchase?: boolean | null;
  purchaseOrdinal?: number | null;
  trackingSourceSnapshot?: string | null;
  trackingMediumSnapshot?: string | null;
  trackingCampaignSnapshot?: string | null;
  trackingContentSnapshot?: string | null;
  trackingTermSnapshot?: string | null;
  landingPageSnapshot?: string | null;
  referrerSnapshot?: string | null;
  itemsCount?: number;
  placedAt?: string | null;
  updatedAt?: string;
  timeline?: Activity[];
  items?: OrderItem[];
  payments?: OrderPayment[];
  shipments?: OrderShipment[];
  attributions?: OrderAttribution[];
  events?: OrderEvent[];
}

export interface OrderStageDefinition {
  id: string;
  code: string;
  name: string;
  translations?: Record<string, string>;
  color: string;
  position: number;
  category: "OPEN" | "IN_PROGRESS" | "DONE" | "ISSUE";
  isInitial: boolean;
  isFinal: boolean;
  active: boolean;
  archived: boolean;
  _count?: { orders: number };
}

export interface CreateOrderInput {
  number?: string;
  orderedAt?: string;
  contactId?: string;
  companyId?: string;
  dealId?: string;
  operationalAssigneeId?: string;
  operationalPriority?: string;
  operationalDueAt?: string;
  source?: string;
  channel?: string;
  status?: string;
  financialStatus?: string;
  currency?: string;
  total?: number;
  grossValue?: number;
  discount?: number;
  notes?: string;
  customerSnapshot?: { name?: string; email?: string; phone?: string };
  items?: Array<{
    productId?: string;
    productName?: string;
    sku?: string;
    quantity: number;
    unitPrice?: number;
    notes?: string;
  }>;
}

export type UpdateOrderInput = Partial<Order> & {
  customerSnapshot?: { name?: string; email?: string; phone?: string };
  addressSnapshot?: {
    recipientName?: string;
    address1?: string;
    address2?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
    countryCode?: string;
    formattedAddress?: string;
  };
};

export interface OrderItem {
  id: string;
  productName: string;
  sku?: string | null;
  quantity: number;
  unitPrice: number;
  discount?: number | string;
  total?: number;
  totalPrice?: number | string;
  externalProductId?: string | null;
  externalVariantId?: string | null;
  variantTitle?: string | null;
  isSeparated: boolean;
  separatedAt?: string | null;
  product?: {
    id: string;
    name: string;
    sku: string;
  } | null;
}

export interface OrderPayment {
  id: string;
  amount: number | string;
  method: string;
  status: string;
  paidAt?: string | null;
  dueAt?: string | null;
  paymentLink?: string | null;
  receiptUrl?: string | null;
}
export interface OrderShipment {
  id: string;
  carrier?: string | null;
  trackingCode?: string | null;
  status: string;
  postedAt?: string | null;
  trackingIssuedAt?: string | null;
  expectedAt?: string | null;
  deliveredAt?: string | null;
  shippingLabelUrl?: string | null;
  commercialInvoiceUrl?: string | null;
  events?: ShipmentEvent[];
}
export interface ShipmentEvent {
  id: string;
  status: string;
  description?: string | null;
  location?: string | null;
  occurredAt: string;
  source: string;
  externalCode?: string | null;
  externalEventId?: string | null;
  metadata?: Record<string, unknown> | null;
}
export interface OrderAttribution {
  id: string;
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  content?: string | null;
  term?: string | null;
  page?: string | null;
  channel?: string | null;
}
export interface OrderEvent {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  occurredAt: string;
  metadata?: Record<string, unknown> | null;
}

export interface FinanceRevenueRow {
  id: string;
  number: string;
  orderedAt: string;
  owner?: UserRef | null;
  grossValue: number;
  discount: number;
  coupon?: string | null;
  shippingCost: number;
  taxes: number;
  finalValue: number;
  financialStatus?: string | null;
  orderStatus: string;
  paymentMethod?: string | null;
  paidAmount: number;
  openAmount: number;
  dueAt?: string | null;
  paidAt?: string | null;
  isOverdue: boolean;
  hasReceipt: boolean;
}

export interface FinanceWorkspace {
  generatedAt: string;
  period: { start: string; end: string; label: string };
  metrics: {
    grossRevenue: number;
    discounts: number;
    shipping: number;
    taxes: number;
    netSales: number;
    received: number;
    receivable: number;
    overdue: number;
    refunded: number;
    cancelled: number;
    orderCount: number;
  };
  revenues: FinanceRevenueRow[];
  receivables: FinanceRevenueRow[];
  reconciliation: Array<{
    orderId: string;
    orderNumber: string;
    expected: number;
    received: number;
    difference: number;
    status: "MATCHED" | "PENDING" | "DIVERGENT";
  }>;
  commissions: Array<{
    ownerId?: string | null;
    ownerName: string;
    avatarUrl?: string | null;
    orders: number;
    eligibleRevenue: number;
    rate?: number | null;
    commission?: number | null;
    status: "RULE_REQUIRED" | "CALCULATED";
  }>;
  paymentMethods: Array<{ method: string; amount: number; count: number }>;
  revenueTimeline: Array<{ label: string; gross: number; net: number; received: number }>;
  closing: {
    ready: boolean;
    divergences: number;
    pendingReconciliation: number;
    missingReceipts: number;
    approvedPayments: number;
    receipts: number;
  };
}

export interface Activity {
  id: string;
  type: string;
  title?: string;
  description?: string | null;
  entityType?: string;
  entityId?: string;
  actor?: UserRef | null;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
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
  contactId: string;
  contact: Pick<Contact, "id" | "name" | "firstName" | "lastName" | "email" | "phone" | "whatsapp">;
  sourceDealId?: string | null;
  sourceOrderId?: string | null;
  score: number;
  lastOrderAt?: string | null;
  lastPurchaseAt?: string | null;
  daysSinceOrder?: number;
  predictedValue?: number | null;
  totalPurchased?: number;
  averageTicket?: number;
  orderCount?: number;
  reason?: string | null;
  status?: string;
  owner?: UserRef | null;
  team?: Team | null;
}

export type ReactivationStatus = "LEAD" | "QUALIFIED" | "ACTIVE_CUSTOMER" | "INACTIVE" | "ARCHIVED";

export type ReactivationFilterStatus = Exclude<ReactivationStatus, "ARCHIVED">;

export type ReactivationSegment =
  "lead_nunca_comprou" | "comprou_uma_vez" | "recorrente_parou" | "cliente_sem_resposta";

export type ReactivationSortBy =
  "score" | "daysInactive" | "lastPurchaseAt" | "lastInteractionAt" | "name";

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

export interface ReactivationExistingOpenDeal {
  id: string;
  pipelineId: string;
  stageId: string;
  conversationId: string | null;
}

export interface ReactivationConversation {
  id: string;
  status: string;
  lastMessageAt: string | null;
}

export type ReactivationWorkflowStatus = "APPROACHED" | "POSTPONED" | "DISCARDED" | "CONVERTED";

export interface ReactivationWorkflow {
  status: ReactivationWorkflowStatus;
  actedAt: string;
  snoozedUntil: string | null;
  reason: string | null;
  actor: UserRef | null;
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
  existingOpenDeal: ReactivationExistingOpenDeal | null;
  latestConversation: ReactivationConversation | null;
  workflow: ReactivationWorkflow | null;
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

export interface CreateLifecycleOpportunityTaskInput {
  title: string;
  dueAt?: string;
  assigneeId?: string;
}

export interface CreateLifecycleOpportunityInput {
  name?: string;
  value?: number;
  pipelineId: string;
  stageId: string;
  ownerId?: string;
  tagIds?: string[];
  conversationId?: string;
  createConversation?: boolean;
  task?: CreateLifecycleOpportunityTaskInput;
}

export interface LifecycleOpportunityResult {
  deal: {
    id: string;
    name: string;
    pipelineId: string;
    stageId: string;
    contactId: string | null;
    conversationId: string | null;
    value: number;
    status: string;
  };
  taskId: string | null;
  conversationId: string | null;
}

export type ReactivationActionType = "APPROACHED" | "POSTPONED" | "DISCARDED";

export interface CreateReactivationActionInput {
  type: ReactivationActionType;
  snoozedUntil?: string;
  reason?: string;
}

export type AutomationTrigger = string;
export type AutomationStatus = "ACTIVE" | "INACTIVE" | "DRAFT" | "PAUSED" | "ARCHIVED" | string;
export type AutomationActionType = "CREATE_TASK" | "MOVE_STAGE" | "ASSIGN_OWNER" | "ADD_TAG" | "CREATE_NOTIFICATION" | string;
export type AutomationConditionOperator = "EQUALS" | "NOT_EQUALS" | "GREATER_THAN" | "LESS_THAN" | "CONTAINS" | "IS_EMPTY" | "IS_NOT_EMPTY" | string;

export interface WorkflowGraphNode {
  id: string;
  type: string;
  label?: string;
  position: { x: number; y: number };
  config?: Record<string, unknown>;
}

export interface WorkflowGraphEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  label?: string;
}

export interface WorkflowDefinition {
  schemaVersion?: number;
  nodes: WorkflowGraphNode[];
  edges: WorkflowGraphEdge[];
  viewport?: { x: number; y: number; zoom: number };
  frames?: Array<{ id: string; label: string; x: number; y: number; width: number; height: number; color?: string }>;
  annotations?: Array<{ id: string; text: string; x: number; y: number }>;
  settings?: Record<string, unknown>;
}

export interface AutomationNodeCatalogItem {
  id: string;
  type: string;
  version: number;
  category: string;
  label: string;
  description: string;
  icon: string;
  executable: boolean;
  eventType?: string;
  handles: { inputs: string[]; outputs: string[] };
}

export interface AutomationTemplateCard {
  key: string;
  name: string;
  description: string;
  category: string;
  nodeCount: number;
}

export interface AutomationCondition {
  field: string;
  operator: AutomationConditionOperator;
  value?: unknown;
}

export interface AutomationAction {
  id?: string;
  type: AutomationActionType;
  config: Record<string, unknown>;
}

export interface AutomationConfig {
  triggerConfig: { pipelineId?: string; fromStageId?: string; toStageId?: string };
  conditions: AutomationCondition[];
  actions: AutomationAction[];
}

export interface AutomationExecution {
  id: string;
  status: "RUNNING" | "SUCCESS" | "FAILED" | "SKIPPED" | string;
  startedAt: string;
  finishedAt?: string | null;
  error?: string | null;
  context?: Record<string, unknown>;
  currentNodeId?: string | null;
  subjectType?: string | null;
  subjectId?: string | null;
  automation?: { id: string; name: string };
  logs?: Array<{ id: string; level: string; message: string; createdAt: string }>;
  nodeExecutions?: Array<{
    id: string;
    nodeId: string;
    nodeType: string;
    status: string;
    output?: unknown;
    input?: unknown;
    errorMessage?: string | null;
    startedAt: string;
    finishedAt?: string | null;
  }>;
  version?: { id: string; version: number; definition?: WorkflowDefinition };
}

export interface Automation {
  id: string;
  name: string;
  description?: string | null;
  status: AutomationStatus;
  triggerType: AutomationTrigger;
  triggerLabel?: string;
  config?: AutomationConfig | null;
  draft?: WorkflowDefinition | null;
  draftDefinition?: WorkflowDefinition | null;
  revision?: number;
  webhookToken?: string | null;
  scopeType?: string;
  scopeId?: string | null;
  validation?: Array<{ level: string; code: string; message: string; nodeId?: string }>;
  nodes?: AutomationNode[];
  executions?: AutomationExecution[];
  lastExecution?: AutomationExecution | null;
  executionCount?: number;
  recentFailures?: number;
  successRate?: number | null;
  updatedAt?: string;
  createdAt: string;
}

export interface AutomationNode {
  id: string;
  type: "TRIGGER" | "CONDITION" | "ACTION" | "DELAY" | string;
  label: string;
  config?: Record<string, unknown>;
  positionX?: number;
  positionY?: number;
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
  unansweredLeads?: number;
  waitingConversations?: number;
  ordersInTransit: number;
  ordersInProgress?: number;
  repurchaseReady: number;
  repurchaseReadyRule?: string;
  afterSalesOpen: number;
  conversionRate?: number | null;
  wonThisMonth?: number;
  lostThisMonth?: number;
  confirmedRevenue?: number;
  confirmedRevenueDeltaPct?: number | null;
  negotiatingValue?: number;
  awaitingPaymentValue?: number;
  awaitingPaymentCount?: number;
  awaitingPaymentStageId?: string | null;
  awaitingPaymentPipelineId?: string | null;
  conversionDeltaPp?: number | null;
  monthlyGoal?: number | null;
  monthlyGoalProgress?: number | null;
  overdueTasks?: number;
  stalledDeals?: number;
  afterSalesCritical?: number;
  ordersDelayed?: number | null;
  ordersStaleTracking?: number;
  atRiskCustomers?: number;
  reactivationInProgress?: number;
  pendingPayments?: number;
  revenue?: number;
  averageTicket?: number;
  wonInPeriod?: number;
  lostInPeriod?: number;
  conversionDenominator?: number;
}

export interface ChartPoint {
  label: string;
  value: number;
  secondary?: number;
}

export interface FunnelStagePoint {
  id: string;
  label: string;
  count: number;
  value: number;
  conversionFromPrevious: number;
  barWidthPct: number;
  pipelineId: string;
}

export interface ChannelPerformancePoint {
  label: string;
  revenue: number;
  sales: number;
  leads: number;
  conversionRate: number | null;
  sharePct: number;
  avgFirstResponseMinutes: number | null;
}

export interface TeamPerformancePoint {
  id: string;
  name: string;
  openDeals: number;
  revenue: number;
  conversionRate: number | null;
  averageTicket: number;
  overdueTasks: number;
  waitingConversations: number;
}

export interface DashboardCharts {
  pipelineByStage: ChartPoint[];
  revenueTrend: ChartPoint[];
  channelMix: ChartPoint[];
  funnel?: FunnelStagePoint[];
  funnelStats?: {
    avgCloseDays: number | null;
    averageTicket: number;
    lostValue: number;
  };
  revenueByPeriod?: ChartPoint[];
  channelPerformance?: ChannelPerformancePoint[];
  performanceByOwner?: TeamPerformancePoint[];
}

export interface DashboardJourneySummaries {
  repurchase: {
    ready: number;
    approached: number | null;
    completed: number | null;
    revenue: number | null;
    readyRule?: string;
    href: string;
  };
  reactivation: {
    inactive: number;
    inProgress: number;
    recovered: number;
    revenue: number | null;
    href: string;
  };
  afterSales: {
    open: number;
    delayed: number | null;
    critical: number;
    avgResolutionDays: number | null;
    href: string;
  };
  ecommerce: {
    awaitingSeparation: number;
    inTransit: number;
    delayed: number | null;
    missingTracking: number | null;
    staleTrackingLabel?: string;
    href: string;
  };
}

export interface DealActionItem extends Deal {
  stage?: { id: string; name: string } | null;
  idleDays?: number;
  reason?: string;
  actionPriority?: "HIGH" | "MEDIUM" | "LOW" | string;
}

export interface Team {
  id: string;
  name: string;
  description?: string | null;
  members?: UserRef[];
  memberCount?: number;
  memberPreview?: Array<{ id: string; name: string; avatarUrl?: string | null }>;
  _count?: { members: number };
}

export interface PipelineAccessOverview {
  pipelines: Array<
    Pick<Pipeline, "id" | "name" | "position"> & {
      accessMode: "ORGANIZATION" | "RESTRICTED";
      teamIds: string[];
      userIds: string[];
    }
  >;
  teams: Team[];
  users: Array<UserRef & { team?: Team | null }>;
}

export interface SettingsOverview {
  organization?: {
    id: string;
    name: string;
    timezone?: string;
    currency?: string;
  } | null;
  organizationName?: string;
  timezone?: string;
  currency?: string;
  counts?: { users: number; teams: number; tags: number; pipelines: number };
  teams?: Team[];
  users?: UserRef[];
  channels?: { id: string; name: string; status: string }[];
  integrations?: { id: string; name: string; connected: boolean }[];
}

export interface SettingsPermissionMatrix {
  roles: Array<"ADMIN" | "MANAGER" | "CONSULTANT">;
  rows: Array<{
    area: string;
    cells: Record<"ADMIN" | "MANAGER" | "CONSULTANT", string>;
  }>;
}
