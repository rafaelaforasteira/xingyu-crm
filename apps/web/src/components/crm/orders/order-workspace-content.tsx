import { ExternalLink, Truck } from "lucide-react";
import { OrderCustomerCard } from "@/components/crm/orders/order-customer-card";
import { OrderIdentificationCard } from "@/components/crm/orders/order-identification-card";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-controls";
import {
  formatOrderCurrency,
  formatOrderDate,
  orderEnumLabel,
  orderText,
  stageLabel,
  type OrderLocale,
} from "@/lib/orders-i18n";
import type { Order, OrderStageDefinition } from "@/lib/types";

type Props = {
  order: Order;
  locale: OrderLocale;
  stages: OrderStageDefinition[];
  users: Array<{ id: string; name: string }>;
  onUpdate: (data: Partial<Order>) => void;
};

const money = (value: number | string | null | undefined, order: Order, locale: OrderLocale) =>
  formatOrderCurrency(Number(value ?? 0), order.currency, locale);

function Section({
  title,
  children,
  testId,
}: {
  title: string;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <section data-testid={testId} className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function DataRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2 text-sm last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={strong ? "text-right font-semibold text-primary" : "text-right text-foreground"}
      >
        {value}
      </span>
    </div>
  );
}

export function OrderWorkspaceContent({ order, locale, stages, users, onUpdate }: Props) {
  const t = orderText(locale);
  const payment = order.payments?.[0];
  const attribution = order.attributions?.at(-1);
  const attributionRows = [
    [t.utmSource, order.trackingSourceSnapshot || attribution?.source],
    [t.utmMedium, order.trackingMediumSnapshot || attribution?.medium],
    [t.utmCampaign, order.trackingCampaignSnapshot || attribution?.campaign],
    [t.utmContent, order.trackingContentSnapshot || attribution?.content],
    [t.utmTerm, order.trackingTermSnapshot || attribution?.term],
    [t.landingPage, order.landingPageSnapshot || attribution?.page],
    [t.referrer, order.referrerSnapshot],
  ].filter((row): row is [string, string] => Boolean(row[1]));
  const receiptUrl = order.payments?.find((item) => item.receiptUrl)?.receiptUrl;
  const summary = [
    [t.payment, orderEnumLabel(order.financialStatus || order.status, locale)],
    order.fulfillmentStatus
      ? [t.fulfillment, orderEnumLabel(order.fulfillmentStatus, locale)]
      : null,
    order.operationalAssignee?.name || order.owner?.name
      ? [t.owner, order.operationalAssignee?.name || order.owner?.name]
      : null,
    order.source || order.channel
      ? [t.source, orderEnumLabel(order.source || order.channel, locale)]
      : null,
    order.orderedAt || order.createdAt
      ? [t.date, formatOrderDate(order.orderedAt || order.createdAt, locale)]
      : null,
    [t.total, money(order.finalValue ?? order.total, order, locale)],
  ].filter((item): item is string[] => Boolean(item));

  return (
    <div className="space-y-4">
      <OrderIdentificationCard order={order} locale={locale} />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,320px)]">
        <main className="min-w-0 space-y-4">
          <Section title={t.orderSummary} testId="order-workspace-summary">
            <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-3 xl:grid-cols-6">
              {summary.map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd
                    className="mt-0.5 truncate text-sm font-semibold text-foreground"
                    title={value}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section title={t.products} testId="order-workspace-products">
            {order.items?.length ? (
              <div>
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-1 border-b border-border/60 py-2.5 text-sm last:border-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {item.quantity} × {item.productName}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {[item.sku, item.variantTitle].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-semibold text-foreground">
                        {money(item.totalPrice ?? item.total, order, locale)}
                      </p>
                      {Number(item.unitPrice) > 0 ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {money(item.unitPrice, order, locale)} / {t.units}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">—</p>
            )}
          </Section>

          <div className="grid items-start gap-4 md:grid-cols-2">
            <Section title={t.financial} testId="order-workspace-financial">
              <DataRow
                label={t.payment}
                value={orderEnumLabel(order.financialStatus || order.status, locale)}
              />
              {order.grossValue !== undefined ? (
                <DataRow label={t.subtotal} value={money(order.grossValue, order, locale)} />
              ) : null}
              {Number(order.shippingCost) > 0 ? (
                <DataRow label={t.shipping} value={money(order.shippingCost, order, locale)} />
              ) : null}
              {Number(order.discount) > 0 ? (
                <DataRow label={t.discount} value={`− ${money(order.discount, order, locale)}`} />
              ) : null}
              {order.coupon ? <DataRow label={t.coupon} value={order.coupon} /> : null}
              <DataRow
                label={t.total}
                value={money(order.finalValue ?? order.total, order, locale)}
                strong
              />
              {payment ? (
                <>
                  <DataRow label={t.paid} value={money(payment.amount, order, locale)} />
                  <DataRow label={t.paymentMethod} value={orderEnumLabel(payment.method, locale)} />
                  {payment.paidAt ? (
                    <DataRow
                      label={t.paymentDate}
                      value={formatOrderDate(payment.paidAt, locale)}
                    />
                  ) : null}
                </>
              ) : null}
              {order.paymentGateway ? (
                <DataRow label={t.paymentGateway} value={order.paymentGateway} />
              ) : null}
              <div className="mt-3 border-t border-border/60 pt-3">
                <p className="text-xs font-medium text-foreground">{t.paymentReceipt}</p>
                {receiptUrl ? (
                  <a
                    className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    href={receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t.openReceipt}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">{t.noReceipt}</p>
                )}
              </div>
            </Section>

            <Section title={t.logistics} testId="order-workspace-logistics">
              {order.shipments?.length ? (
                <div className="space-y-3">
                  {order.shipments.map((shipment) => (
                    <div
                      key={shipment.id}
                      className="border-b border-border/60 pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Truck className="h-4 w-4 text-primary" />
                        {shipment.carrier || t.carrier}
                      </div>
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground">{t.trackingCode}</p>
                        <p className="break-all text-sm font-semibold text-foreground">
                          {shipment.trackingCode || order.trackingCode || "—"}
                        </p>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-muted-foreground">{t.fulfillment}</span>
                          <p>{orderEnumLabel(shipment.status, locale)}</p>
                        </div>
                        {shipment.postedAt ? (
                          <div>
                            <span className="text-muted-foreground">{t.postedAt}</span>
                            <p>{formatOrderDate(shipment.postedAt, locale)}</p>
                          </div>
                        ) : null}
                        {shipment.deliveredAt ? (
                          <div>
                            <span className="text-muted-foreground">{t.deliveredAt}</span>
                            <p>{formatOrderDate(shipment.deliveredAt, locale)}</p>
                          </div>
                        ) : null}
                        {order.currentLocation ? (
                          <div>
                            <span className="text-muted-foreground">{t.location}</span>
                            <p>{order.currentLocation}</p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <p className="text-xs text-muted-foreground">{t.trackingCode}</p>
                  <p className="mt-0.5 text-sm font-semibold">{order.trackingCode || "—"}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{t.noShipment}</p>
                </div>
              )}
            </Section>
          </div>

          <Section title={t.marketingAttribution} testId="order-workspace-attribution">
            {attributionRows.length ? (
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                {attributionRows.map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="mt-0.5 break-words text-sm text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-xs text-muted-foreground">{t.noAttribution}</p>
            )}
          </Section>

          <Section title={t.timeline} testId="order-workspace-timeline">
            {order.events?.length ? (
              <ol className="space-y-0">
                {order.events.map((event, index) => (
                  <li
                    key={event.id}
                    className="relative grid grid-cols-[16px_minmax(0,1fr)] gap-3 pb-4 last:pb-0"
                  >
                    {index < (order.events?.length ?? 0) - 1 ? (
                      <span className="absolute bottom-0 left-[7px] top-3 w-px bg-border" />
                    ) : null}
                    <span className="relative mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-primary bg-card" />
                    <div>
                      <time className="text-xs text-muted-foreground">
                        {formatOrderDate(event.occurredAt, locale)}
                      </time>
                      <p className="mt-0.5 text-sm font-medium text-foreground">
                        {orderEnumLabel(event.type, locale)}
                      </p>
                      {event.description ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">{event.description}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-muted-foreground">{t.noHistory}</p>
            )}
          </Section>
        </main>

        <aside className="min-w-0 space-y-4">
          <OrderCustomerCard order={order} locale={locale} />
          <Section title={t.operation} testId="order-workspace-operation">
            <div className="space-y-3">
              <Field label={t.stage}>
                <Select
                  value={order.operationalStageId ?? ""}
                  onChange={(event) => onUpdate({ operationalStageId: event.target.value })}
                >
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stageLabel(stage, locale)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t.owner}>
                <Select
                  value={order.operationalAssigneeId ?? ""}
                  onChange={(event) =>
                    onUpdate({ operationalAssigneeId: event.target.value || null })
                  }
                >
                  <option value="">{t.noOwner}</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t.priority}>
                <Select
                  value={order.operationalPriority || "MEDIUM"}
                  onChange={(event) => onUpdate({ operationalPriority: event.target.value })}
                >
                  {["LOW", "MEDIUM", "HIGH", "URGENT"].map((value) => (
                    <option key={value} value={value}>
                      {orderEnumLabel(value, locale)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t.due}>
                <Input
                  type="date"
                  value={order.operationalDueAt?.slice(0, 10) || ""}
                  onChange={(event) =>
                    onUpdate({
                      operationalDueAt: event.target.value
                        ? new Date(`${event.target.value}T12:00`).toISOString()
                        : null,
                    })
                  }
                />
              </Field>
              <Field label={t.location}>
                <Input
                  defaultValue={order.currentLocation || ""}
                  onBlur={(event) => onUpdate({ currentLocation: event.target.value })}
                />
              </Field>
              <label className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(order.operationalIssue)}
                  onChange={(event) => onUpdate({ operationalIssue: event.target.checked })}
                />
                {t.issue}
              </label>
              {order.externalUrl ? (
                <a
                  href={order.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t.openShopify}
                </a>
              ) : null}
            </div>
          </Section>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
