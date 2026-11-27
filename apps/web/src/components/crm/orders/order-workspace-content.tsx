"use client";

import * as React from "react";
import { Check, ClipboardCheck, ExternalLink, Flag, UserRound } from "lucide-react";
import { OrderCustomerCard } from "@/components/crm/orders/order-customer-card";
import { CustomerPurchaseContext } from "@/components/crm/orders/customer-purchase-context";
import { OrderIdentificationCard } from "@/components/crm/orders/order-identification-card";
import { OrderProductsSection } from "@/components/crm/orders/order-products-section";
import { OrderShippingTrackingSection } from "@/components/crm/orders/order-shipping-tracking-section";
import { OrderNotesPanel } from "@/components/crm/orders/order-notes-panel";
import { OrderFinancialSection } from "@/components/crm/orders/order-financial-section";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-controls";
import { Avatar } from "@/components/ui/avatar";
import { Popover } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
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
  users: Array<{ id: string; name: string; avatarUrl?: string | null }>;
  onUpdate: (data: Partial<Order>) => void;
};

export function OrderWorkspaceContent({ order, locale, stages, users, onUpdate }: Props) {
  const t = orderText(locale);
  const [ownerOpen, setOwnerOpen] = React.useState(false);
  const [priorityOpen, setPriorityOpen] = React.useState(false);
  const owner =
    order.operationalAssignee ?? users.find((user) => user.id === order.operationalAssigneeId);
  const priority = order.operationalPriority || "MEDIUM";
  const priorityColor: Record<string, string> = {
    LOW: "text-blue-600",
    MEDIUM: "text-amber-600",
    HIGH: "text-red-600",
    URGENT: "text-red-700",
  };
  return (
    <div className="space-y-4">
      <OrderIdentificationCard order={order} locale={locale} stages={stages} />
      <CustomerPurchaseContext
        isFirstPurchase={order.isFirstPurchase}
        purchaseOrdinal={order.purchaseOrdinal}
        orderCount={order.contact?.orderCount}
        locale={locale}
      />
      <div className="space-y-4">
        <OrderProductsSection orderId={order.id} items={order.items ?? []} locale={locale} />
        <OrderShippingTrackingSection order={order} locale={locale} />
      </div>
      <section
        data-testid="order-workspace-operation"
        className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      >
        <div className="flex min-h-12 items-center justify-between gap-3 border-b border-border/70 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">{t.operation}</h3>
          </div>
          {order.externalUrl ? (
            <a
              href={order.externalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              {t.openShopify}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>
        <div className="grid gap-4 p-4 lg:grid-cols-3">
          <div className="flex min-h-72 flex-col rounded-xl border border-border/70 bg-muted/25 p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Controle da etapa
            </p>
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
              <Field label={t.stageCompletionDue}>
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
            </div>
            <div className="mt-auto grid grid-cols-2 gap-4 border-t border-border/70 pt-4">
              <div className="flex flex-col items-start">
                <p className="mb-1.5 text-[11px] text-muted-foreground">{t.owner}</p>
                <Popover
                  open={ownerOpen}
                  onOpenChange={setOwnerOpen}
                  contentWidth={260}
                  contentClassName="rounded-xl"
                  aria-label={t.owner}
                  trigger={
                    <button
                      type="button"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full outline-none ring-offset-2 transition hover:ring-2 hover:ring-primary/30 focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label={`${t.owner}: ${owner?.name || t.noOwner}`}
                      title={owner?.name || t.noOwner}
                      onClick={() => setOwnerOpen((open) => !open)}
                    >
                      {owner ? (
                        <Avatar name={owner.name} src={owner.avatarUrl} size="sm" />
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-muted">
                          <UserRound className="h-4 w-4 text-muted-foreground" />
                        </span>
                      )}
                    </button>
                  }
                >
                  <div className="p-3">
                    <p className="mb-2 text-sm font-semibold">{t.owner}</p>
                    <div className="max-h-64 space-y-1 overflow-y-auto">
                      {[{ id: "", name: t.noOwner }, ...users].map((user) => (
                        <button
                          key={user.id || "none"}
                          type="button"
                          className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-muted"
                          onClick={() => {
                            onUpdate({ operationalAssigneeId: user.id || null });
                            setOwnerOpen(false);
                          }}
                        >
                          {user.id ? (
                            <Avatar name={user.name} src={user.avatarUrl} size="sm" />
                          ) : (
                            <span className="flex h-7 w-7 items-center justify-center">
                              <UserRound className="h-4 w-4" />
                            </span>
                          )}
                          <span className="min-w-0 flex-1 truncate">{user.name}</span>
                          {(order.operationalAssigneeId || "") === user.id ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>
                </Popover>
              </div>
              <div className="flex flex-col items-start">
                <p className="mb-1.5 text-[11px] text-muted-foreground">{t.priority}</p>
                <Popover
                  open={priorityOpen}
                  onOpenChange={setPriorityOpen}
                  contentWidth={220}
                  contentClassName="rounded-xl"
                  aria-label={t.priority}
                  trigger={
                    <button
                      type="button"
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full outline-none ring-offset-2 transition hover:ring-2 hover:ring-primary/30 focus-visible:ring-2 focus-visible:ring-primary",
                        priority === "LOW" && "bg-blue-50",
                        priority === "MEDIUM" && "bg-amber-50",
                        priority === "HIGH" && "bg-red-50",
                        priority === "URGENT" && "bg-red-100",
                      )}
                      aria-label={`${t.priority}: ${orderEnumLabel(priority, locale)}`}
                      title={orderEnumLabel(priority, locale)}
                      onClick={() => setPriorityOpen((open) => !open)}
                    >
                      <Flag className={cn("h-3.5 w-3.5", priorityColor[priority])} />
                    </button>
                  }
                >
                  <div className="p-3">
                    <p className="mb-2 text-sm font-semibold">{t.priority}</p>
                    <div className="space-y-1">
                      {["LOW", "MEDIUM", "HIGH", "URGENT"].map((value) => (
                        <button
                          key={value}
                          type="button"
                          className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-muted"
                          onClick={() => {
                            onUpdate({ operationalPriority: value });
                            setPriorityOpen(false);
                          }}
                        >
                          <Flag className={cn("h-4 w-4", priorityColor[value])} />
                          <span className="flex-1">{orderEnumLabel(value, locale)}</span>
                          {priority === value ? <Check className="h-4 w-4 text-primary" /> : null}
                        </button>
                      ))}
                    </div>
                  </div>
                </Popover>
              </div>
            </div>
          </div>
          <OrderNotesPanel orderId={order.id} users={users} />
          <div className="min-h-72 rounded-xl border border-border/70 bg-muted/25 p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Atualizações do pedido
            </p>
            {order.events?.length ? (
              <ol className="max-h-64 space-y-0 overflow-y-auto pr-2">
                {order.events.map((event, index) => (
                  <li
                    key={event.id}
                    className="relative grid grid-cols-[14px_minmax(0,1fr)] gap-3 pb-3 last:pb-0"
                  >
                    {index < (order.events?.length ?? 0) - 1 ? (
                      <span className="absolute bottom-0 left-[6px] top-3 w-px bg-border" />
                    ) : null}
                    <span className="relative mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-primary bg-card" />
                    <div className="min-w-0">
                      <time className="shrink-0 text-xs text-muted-foreground">
                        {formatOrderDate(event.occurredAt, locale)}
                      </time>
                      <p className="mt-0.5 text-sm font-medium text-foreground">
                        {orderEnumLabel(event.type, locale)}
                      </p>
                      {event.description ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {event.description}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-muted-foreground">{t.noHistory}</p>
            )}
          </div>
        </div>
      </section>
      <main className="min-w-0 space-y-4">
        <div className="grid items-stretch gap-4 lg:grid-cols-2">
          <OrderFinancialSection order={order} locale={locale} />
          <OrderCustomerCard order={order} locale={locale} />
        </div>
      </main>
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
