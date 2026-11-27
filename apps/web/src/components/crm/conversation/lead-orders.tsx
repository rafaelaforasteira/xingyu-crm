"use client";

import * as React from "react";
import { ArrowLeft, ChevronRight, Clock3, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ordersApi } from "@/lib/api";
import { formatPhoneForDisplay } from "@/lib/format-phone-display";
import { queryKeys } from "@/lib/query-keys";
import { orderStatusLabel } from "@/lib/status-labels";
import type { Order } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  averagePurchaseInterval,
  orderDate,
  orderPaidAt,
  orderTotal,
  sortOrdersNewestFirst,
} from "./lead-order-utils";

function Value({ label, children }: { label: string; children?: React.ReactNode }) {
  if (children == null || children === "") return null;
  return (
    <div>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 border-t border-border/70 pt-4 first:border-0 first:pt-0">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function paymentStatus(order: Order) {
  const latest =
    order.payments?.find((payment) => payment.status === "APPROVED") ?? order.payments?.[0];
  if (latest?.status === "APPROVED") return "Pago";
  if (order.financialStatus)
    return order.financialStatus
      .replaceAll("_", " ")
      .toLocaleLowerCase("pt-BR")
      .replace(/^./, (letter) => letter.toUpperCase());
  return orderStatusLabel(order.status);
}

function OrderDetail({ order, onBack }: { order: Order; onBack: () => void }) {
  const attribution = order.attributions?.[0];
  const date = orderDate(order);
  const paidAt = orderPaidAt(order);
  const addressParts = [
    order.address1Snapshot,
    order.addressNumberSnapshot,
    order.address2Snapshot,
    order.complementSnapshot,
    order.neighborhoodSnapshot,
    order.citySnapshot,
    order.provinceSnapshot,
    order.postalCodeSnapshot,
    order.countrySnapshot,
  ].filter(Boolean);
  return (
    <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-2" data-testid="lead-order-detail">
      <button
        type="button"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        onClick={onBack}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Histórico de pedidos
      </button>
      <div>
        <p className="text-lg font-semibold">Pedido #{order.externalName || order.number}</p>
        <p className="text-sm text-muted-foreground">
          {date ? formatDate(date, "dd/MM/yyyy 'às' HH:mm") : "Data não registrada"}
        </p>
        <p className="mt-2 text-xl font-semibold">
          {formatCurrency(orderTotal(order), order.currency || "BRL")}
        </p>
        <p className="text-sm">{paymentStatus(order)}</p>
      </div>
      <Section title="Cliente">
        <dl className="grid gap-2 sm:grid-cols-2">
          <Value label="Nome">{order.customerNameSnapshot || "Não registrado no pedido"}</Value>
          <Value label="E-mail">{order.customerEmailSnapshot || "Não registrado no pedido"}</Value>
          <Value label="Telefone">
            {order.customerPhoneSnapshot
              ? formatPhoneForDisplay(order.customerPhoneSnapshot)
              : "Não registrado no pedido"}
          </Value>
        </dl>
      </Section>
      <Section title="Endereço">
        <p className="whitespace-pre-wrap text-sm">
          {order.formattedAddressSnapshot || addressParts.join(", ") || "Não registrado no pedido"}
        </p>
      </Section>
      <Section title="Itens">
        {order.items?.length ? (
          <ul className="space-y-2">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 text-sm">
                <span>
                  <span className="font-medium">{item.productName}</span>
                  {item.variantTitle ? (
                    <span className="block text-xs text-muted-foreground">{item.variantTitle}</span>
                  ) : null}
                  <span className="block text-xs text-muted-foreground">
                    {item.quantity} ×{" "}
                    {formatCurrency(Number(item.unitPrice), order.currency || "BRL")}
                  </span>
                </span>
                <span>
                  {formatCurrency(
                    Number(item.totalPrice ?? item.total ?? 0),
                    order.currency || "BRL",
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Itens não registrados.</p>
        )}
      </Section>
      <Section title="Valores">
        <dl className="grid grid-cols-2 gap-2">
          <Value label="Subtotal">
            {formatCurrency(Number(order.grossValue ?? 0), order.currency || "BRL")}
          </Value>
          <Value label="Desconto">
            {formatCurrency(Number(order.discount ?? 0), order.currency || "BRL")}
          </Value>
          <Value label="Frete">
            {formatCurrency(Number(order.shippingCost ?? 0), order.currency || "BRL")}
          </Value>
          <Value label="Impostos">
            {formatCurrency(Number(order.taxes ?? 0), order.currency || "BRL")}
          </Value>
          <Value label="Total">{formatCurrency(orderTotal(order), order.currency || "BRL")}</Value>
        </dl>
      </Section>
      <Section title="Pagamento">
        <dl className="grid gap-2 sm:grid-cols-2">
          <Value label="Status">{paymentStatus(order)}</Value>
          <Value label="Pago em">
            {paidAt ? formatDate(paidAt, "dd/MM/yyyy 'às' HH:mm") : "Não registrado"}
          </Value>
          <Value label="Forma">
            {order.payments?.[0]?.method?.replaceAll("_", " ") || "Não registrada"}
          </Value>
          <Value label="Gateway">{order.paymentGateway || "Não registrado"}</Value>
        </dl>
      </Section>
      <Section title="Descontos">
        <dl className="grid gap-2 sm:grid-cols-2">
          <Value label="Cupom">{order.coupon || "Não utilizado/registrado"}</Value>
          <Value label="Desconto">
            {formatCurrency(Number(order.discount ?? 0), order.currency || "BRL")}
          </Value>
        </dl>
      </Section>
      <Section title="Rastreamento da venda">
        <dl className="grid gap-2 sm:grid-cols-2">
          <Value label="Origem">
            {order.trackingSourceSnapshot ||
              attribution?.source ||
              order.source ||
              "Não registrada"}
          </Value>
          <Value label="Medium">
            {order.trackingMediumSnapshot || attribution?.medium || "Não registrado"}
          </Value>
          <Value label="Campaign">
            {order.trackingCampaignSnapshot ||
              attribution?.campaign ||
              order.campaign ||
              "Não registrada"}
          </Value>
          <Value label="Content">{order.trackingContentSnapshot || attribution?.content}</Value>
          <Value label="Term">{order.trackingTermSnapshot || attribution?.term}</Value>
          <Value label="Landing page">{order.landingPageSnapshot || attribution?.page}</Value>
          <Value label="Referrer">{order.referrerSnapshot}</Value>
        </dl>
      </Section>
      <Section title="Compra">
        <dl className="grid gap-2 sm:grid-cols-2">
          <Value label="Classificação">
            {order.isFirstPurchase === true
              ? "Primeira compra"
              : order.isFirstPurchase === false
                ? "Recompra"
                : "Não determinada"}
          </Value>
          <Value label="Número da compra">
            {order.purchaseOrdinal ? `${order.purchaseOrdinal}ª compra` : "Não determinado"}
          </Value>
          <Value label="ID Shopify/externo">{order.externalId}</Value>
        </dl>
        {order.externalUrl ? (
          <a
            href={order.externalUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Consultar pedido <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </Section>
      <Section title="Histórico do pedido">
        {order.events?.length ? (
          <ol className="space-y-2">
            {order.events.map((event) => (
              <li key={event.id} className="text-sm">
                <p className="font-medium">{event.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(event.occurredAt, "dd/MM/yyyy HH:mm")}
                </p>
                {event.description ? <p className="text-xs">{event.description}</p> : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
        )}
      </Section>
    </div>
  );
}

export function LeadOrders({
  contactId,
  contactName,
  initialCount,
  onCountChange,
}: {
  contactId?: string;
  contactName: string;
  initialCount: number;
  onCountChange?: (count: number) => void;
}) {
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Order | null>(null);
  const params = { contactId, pageSize: 100, sortBy: "orderedAt", sortOrder: "desc" };
  const query = useQuery({
    queryKey: queryKeys.orders.list(params),
    queryFn: () => ordersApi.list(params),
    enabled: Boolean(contactId),
    staleTime: 60_000,
  });
  const orders = sortOrdersNewestFirst(query.data?.data ?? []);
  const total = query.data?.meta?.total ?? initialCount;
  React.useEffect(() => onCountChange?.(total), [onCountChange, total]);
  const average = averagePurchaseInterval(orders);
  if (query.isLoading) return <Skeleton className="h-20 w-full" />;
  if (!orders.length)
    return <p className="text-xs text-muted-foreground">Nenhum pedido identificado.</p>;
  return (
    <div className="space-y-3" data-testid="lead-orders-history">
      {average ? (
        <button
          type="button"
          className="order-kpi-enter w-full rounded-lg border border-border bg-muted/30 p-3 text-left"
          onClick={() => {
            setSelected(null);
            setHistoryOpen(true);
          }}
          aria-label="Detalhes do tempo médio entre compras"
        >
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            Tempo médio entre compras
          </span>
          <strong className="mt-0.5 block text-sm">{average.label}</strong>
          <span className="text-[11px] text-muted-foreground">
            Baseado em {average.eligibleCount} pedidos
          </span>
        </button>
      ) : null}
      <ul className="space-y-3">
        {orders.slice(0, 3).map((order) => (
          <li key={order.id}>
            <button
              type="button"
              className="w-full text-left"
              onClick={() => {
                setSelected(order);
                setHistoryOpen(true);
              }}
            >
              <span className="block text-xs font-medium">
                #{order.externalName || order.number} ·{" "}
                {orderDate(order) ? formatDate(orderDate(order), "dd/MM/yyyy") : "Sem data"}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {formatCurrency(orderTotal(order), order.currency || "BRL")} ·{" "}
                {paymentStatus(order)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="text-xs text-primary hover:underline"
        onClick={() => {
          setSelected(null);
          setHistoryOpen(true);
        }}
      >
        Ver histórico de pedidos
      </button>
      <Dialog
        open={historyOpen}
        onOpenChange={(open) => {
          setHistoryOpen(open);
          if (!open) setSelected(null);
        }}
        title={
          selected
            ? `Pedido #${selected.externalName || selected.number}`
            : `Histórico de pedidos · ${contactName}`
        }
        wide
      >
        {selected ? (
          <OrderDetail order={selected} onBack={() => setSelected(null)} />
        ) : (
          <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            <p className="text-sm text-muted-foreground">
              {total} {total === 1 ? "pedido" : "pedidos"}
            </p>
            {average ? (
              <div className="rounded-lg bg-muted/40 p-3 text-sm">
                <strong>{average.label}</strong>
                <p className="text-xs text-muted-foreground">
                  Média aritmética de {average.eligibleCount - 1} intervalos consecutivos entre{" "}
                  {average.eligibleCount} compras válidas. Prioriza a data de pagamento.
                </p>
              </div>
            ) : null}
            <ul className="divide-y divide-border">
              {orders.map((order) => (
                <li key={order.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 py-3 text-left"
                    onClick={() => setSelected(order)}
                  >
                    <span>
                      <strong className="block text-sm">
                        Pedido #{order.externalName || order.number}
                      </strong>
                      <span className="text-xs text-muted-foreground">
                        {orderDate(order) ? formatDate(orderDate(order), "dd/MM/yyyy") : "Sem data"}{" "}
                        · {formatCurrency(orderTotal(order), order.currency || "BRL")}
                      </span>
                      <span className="block text-xs">{paymentStatus(order)}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Dialog>
      <style jsx>{`
        @keyframes order-kpi-enter {
          from {
            opacity: 0;
            transform: translateY(3px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .order-kpi-enter {
          animation: order-kpi-enter 220ms ease-out both;
        }
        @media (prefers-reduced-motion: reduce) {
          .order-kpi-enter {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
