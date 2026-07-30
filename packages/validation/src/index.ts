import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});

export const createContactSchema = z.object({
  firstName: z.string().min(1).max(120),
  lastName: z.string().max(120).optional().nullable(),
  companyId: z.string().optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  whatsapp: z.string().max(40).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  instagram: z.string().max(80).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  state: z.string().max(80).optional().nullable(),
  country: z.string().max(80).optional().nullable(),
  cnpj: z.string().max(20).optional().nullable(),
  cpf: z.string().max(20).optional().nullable(),
  type: z
    .enum([
      "RESELLER",
      "RETAILER",
      "WHOLESALER",
      "SITE_CUSTOMER",
      "WHATSAPP",
      "INSTAGRAM",
      "OTHER",
    ])
    .optional(),
  status: z
    .enum(["LEAD", "QUALIFIED", "ACTIVE_CUSTOMER", "INACTIVE", "ARCHIVED"])
    .optional(),
  source: z.string().max(120).optional().nullable(),
  campaign: z.string().max(120).optional().nullable(),
  ownerId: z.string().optional().nullable(),
  teamId: z.string().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  tagIds: z.array(z.string()).optional(),
});

export const createDealSchema = z.object({
  name: z.string().min(1).max(200),
  pipelineId: z.string().min(1),
  stageId: z.string().min(1),
  contactId: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  teamId: z.string().optional().nullable(),
  value: z.coerce.number().min(0).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  source: z.string().optional().nullable(),
  campaign: z.string().optional().nullable(),
});

export const moveDealSchema = z.object({
  stageId: z.string().min(1),
  position: z.number().optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  type: z
    .enum([
      "CALL",
      "WHATSAPP",
      "FOLLOW_UP",
      "COLLECTION",
      "SEND_CATALOG",
      "SEND_LINK",
      "PAYMENT",
      "MEETING",
      "MONITORING",
      "AFTER_SALES",
      "REPURCHASE",
      "INTERNAL",
    ])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueAt: z.string().datetime().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  dealId: z.string().optional().nullable(),
  orderId: z.string().optional().nullable(),
  occurrenceId: z.string().optional().nullable(),
});

export const sendMessageSchema = z.object({
  body: z.string().min(1).max(10000),
  isInternal: z.boolean().optional(),
  direction: z.enum(["INBOUND", "OUTBOUND", "INTERNAL"]).optional(),
});

export const createCompanySchema = z.object({
  legalName: z.string().min(1).max(200),
  tradeName: z.string().max(200).optional().nullable(),
  cnpj: z.string().max(20).optional().nullable(),
  segment: z.string().max(120).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  instagram: z.string().max(80).optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal("")),
  address: z.string().max(300).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  state: z.string().max(80).optional().nullable(),
  ownerId: z.string().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export const createOrderSchema = z.object({
  contactId: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  dealId: z.string().optional().nullable(),
  channel: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  campaign: z.string().optional().nullable(),
  discount: z.coerce.number().min(0).optional(),
  coupon: z.string().optional().nullable(),
  shippingCost: z.coerce.number().min(0).optional(),
  taxes: z.coerce.number().min(0).optional(),
  notes: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string().optional().nullable(),
        productName: z.string().min(1),
        sku: z.string().optional().nullable(),
        collection: z.string().optional().nullable(),
        quantity: z.coerce.number().int().min(1),
        unitPrice: z.coerce.number().min(0),
        discount: z.coerce.number().min(0).optional(),
      }),
    )
    .min(1),
});

/** Demonstrative repurchase score 0-100 */
export function calculateRepurchaseScore(input: {
  daysWithoutPurchase: number;
  orderCount: number;
  averageTicket: number;
  totalPurchased: number;
}): { score: number; level: "HIGH" | "MEDIUM" | "LOW" } {
  const recency =
    input.daysWithoutPurchase <= 30
      ? 40
      : input.daysWithoutPurchase <= 60
        ? 32
        : input.daysWithoutPurchase <= 90
          ? 24
          : input.daysWithoutPurchase <= 120
            ? 16
            : input.daysWithoutPurchase <= 180
              ? 8
              : 4;
  const frequency = Math.min(30, input.orderCount * 6);
  const monetary = Math.min(
    30,
    Math.floor(Number(input.totalPurchased) / 500) +
      Math.floor(Number(input.averageTicket) / 200),
  );
  const score = Math.min(100, recency + frequency + monetary);
  const level = score >= 70 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW";
  return { score, level };
}

export function formatCurrencyBRL(value: number | string): string {
  const amount = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(amount) ? amount : 0);
}
