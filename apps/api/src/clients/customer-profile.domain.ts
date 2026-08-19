import { OrderStatus, PaymentStatus } from "@xingyu/database";

export type CustomerStatus = "LEAD" | "CUSTOMER" | "RECURRING";

export function isQualifyingPurchase(order: {
  deletedAt?: Date | null;
  status: OrderStatus;
  financialStatus?: string | null;
  payments?: Array<{ status: PaymentStatus; deletedAt?: Date | null }>;
}) {
  if (order.deletedAt || order.status === OrderStatus.CANCELLED) return false;
  const financial = order.financialStatus?.toUpperCase();
  if (["CANCELLED", "CANCELED", "REFUNDED", "VOIDED", "DECLINED", "DRAFT", "TEST"].includes(financial ?? "")) return false;
  const payments = (order.payments ?? []).filter((payment) => !payment.deletedAt);
  if (payments.some((payment) => payment.status === PaymentStatus.APPROVED)) return true;
  const invalidPayments: PaymentStatus[] = [PaymentStatus.CANCELLED, PaymentStatus.DECLINED, PaymentStatus.REFUNDED];
  if (payments.length && payments.every((payment) => invalidPayments.includes(payment.status))) return false;
  return true;
}

export function customerStatus(orderCount: number): CustomerStatus {
  return orderCount === 0 ? "LEAD" : orderCount === 1 ? "CUSTOMER" : "RECURRING";
}

const countryAliases: Record<string, string> = {
  BR: "BR", BRA: "BR", BRASIL: "BR", BRAZIL: "BR",
  US: "US", USA: "US", "UNITED STATES": "US", "ESTADOS UNIDOS": "US",
  PT: "PT", PORTUGAL: "PT", AR: "AR", ARGENTINA: "AR", CL: "CL", CHILE: "CL",
  PY: "PY", PARAGUAI: "PY", PARAGUAY: "PY", MX: "MX", MEXICO: "MX", MÉXICO: "MX",
};
const stateAliases: Record<string, string> = {
  ACRE:"AC", ALAGOAS:"AL", AMAPA:"AP", AMAPÁ:"AP", AMAZONAS:"AM", BAHIA:"BA", CEARA:"CE", CEARÁ:"CE", "DISTRITO FEDERAL":"DF", "ESPIRITO SANTO":"ES", "ESPÍRITO SANTO":"ES", GOIAS:"GO", GOIÁS:"GO", MARANHAO:"MA", MARANHÃO:"MA", "MATO GROSSO":"MT", "MATO GROSSO DO SUL":"MS", "MINAS GERAIS":"MG", PARA:"PA", PARÁ:"PA", PARAIBA:"PB", PARAÍBA:"PB", PARANA:"PR", PARANÁ:"PR", PERNAMBUCO:"PE", PIAUI:"PI", PIAUÍ:"PI", "RIO DE JANEIRO":"RJ", "RIO GRANDE DO NORTE":"RN", "RIO GRANDE DO SUL":"RS", RONDONIA:"RO", RONDÔNIA:"RO", RORAIMA:"RR", "SANTA CATARINA":"SC", "SAO PAULO":"SP", "SÃO PAULO":"SP", SERGIPE:"SE", TOCANTINS:"TO",
};
const UFS = new Set(["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"]);

export function normalizeState(value?: string | null) {
  const raw = value?.trim().toUpperCase();
  if (!raw) return null;
  return UFS.has(raw) ? raw : stateAliases[raw] ?? null;
}

export function normalizeCountry(value?: string | null, state?: string | null) {
  const raw = value?.trim().toUpperCase();
  if (raw) return countryAliases[raw] ?? raw;
  return normalizeState(state) ? "BR" : null;
}

export function recencyBucket(lastPurchaseAt?: Date | null, now = new Date()) {
  if (!lastPurchaseAt) return "never";
  const days = Math.floor((now.getTime() - lastPurchaseAt.getTime()) / 86_400_000);
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}
