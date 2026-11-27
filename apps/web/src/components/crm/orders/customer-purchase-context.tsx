import { orderText, type OrderLocale } from "@/lib/orders-i18n";

export type CustomerPurchaseContextData = {
  kind: "new" | "returning";
  detail?: string;
};

type PurchaseSignals = {
  isFirstPurchase?: boolean | null;
  purchaseOrdinal?: number | null;
  orderCount?: number | null;
};

const positiveInteger = (value: number | null | undefined) =>
  typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;

function ordinalDetail(value: number, locale: OrderLocale) {
  if (locale === "pt-BR") return `${value}ª compra`;
  if (locale === "en") {
    const remainder = value % 100;
    const suffix =
      remainder >= 11 && remainder <= 13
        ? "th"
        : value % 10 === 1
          ? "st"
          : value % 10 === 2
            ? "nd"
            : value % 10 === 3
              ? "rd"
              : "th";
    return `${value}${suffix} purchase`;
  }
  return locale === "zh-CN" ? `第 ${value} 次购买` : `第 ${value} 次購買`;
}

function orderCountDetail(value: number, locale: OrderLocale) {
  if (locale === "pt-BR") return `${value} ${value === 1 ? "pedido" : "pedidos"}`;
  if (locale === "en") return `${value} ${value === 1 ? "order" : "orders"}`;
  return locale === "zh-CN" ? `${value} 个订单` : `${value} 張訂單`;
}

export function getCustomerPurchaseContext(
  signals: PurchaseSignals,
  locale: OrderLocale,
): CustomerPurchaseContextData | null {
  const t = orderText(locale);
  const ordinal = positiveInteger(signals.purchaseOrdinal);
  const orderCount = positiveInteger(signals.orderCount);

  if (signals.isFirstPurchase === true) {
    return { kind: "new", detail: t.firstPurchaseRegistered };
  }
  if (signals.isFirstPurchase === false) {
    return { kind: "returning", detail: ordinal ? ordinalDetail(ordinal, locale) : undefined };
  }
  if (ordinal === 1) return { kind: "new", detail: t.firstPurchaseRegistered };
  if (ordinal && ordinal > 1) {
    return { kind: "returning", detail: ordinalDetail(ordinal, locale) };
  }
  if (orderCount === 1) return { kind: "new", detail: t.firstPurchaseRegistered };
  if (orderCount && orderCount > 1) {
    return { kind: "returning", detail: orderCountDetail(orderCount, locale) };
  }
  return null;
}

export function CustomerPurchaseContext({
  isFirstPurchase,
  purchaseOrdinal,
  orderCount,
  locale,
}: PurchaseSignals & { locale: OrderLocale }) {
  const t = orderText(locale);
  const context = getCustomerPurchaseContext(
    { isFirstPurchase, purchaseOrdinal, orderCount },
    locale,
  );
  if (!context) return null;

  const returning = context.kind === "returning";
  return (
    <aside
      data-testid="customer-purchase-context"
      className={`flex min-h-10 flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg border px-3 py-2 text-sm ${
        returning
          ? "border-success/20 bg-success/5"
          : "border-primary/15 bg-primary/5"
      }`}
    >
      <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
        <span
          className={`absolute inline-flex h-full w-full rounded-full opacity-20 motion-safe:animate-ping motion-safe:[animation-duration:2.4s] ${
            returning ? "bg-success" : "bg-primary"
          }`}
        />
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
            returning ? "bg-success" : "bg-primary"
          }`}
        />
      </span>
      <span className="font-medium text-foreground">
        {returning ? t.customerReturning : t.customerNew}
      </span>
      {context.detail ? (
        <>
          <span className="text-muted-foreground" aria-hidden="true">
            •
          </span>
          <span className="text-muted-foreground">{context.detail}</span>
        </>
      ) : null}
    </aside>
  );
}
