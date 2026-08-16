"use client";
import * as React from "react";
import { useDraggable } from "@dnd-kit/core";
import { AlertTriangle, Check, ChevronDown } from "lucide-react";
import { Popover } from "@/components/ui/popover";
import {
  formatOrderCurrency,
  orderEnumLabel,
  orderText,
  type OrderLocale,
} from "@/lib/orders-i18n";
import type { Order } from "@/lib/types";

export const FINANCIAL_STATUS_OPTIONS = [
  "PENDING",
  "AWAITING_PAYMENT",
  "AUTHORIZED",
  "PARTIALLY_PAID",
  "PAID",
  "PAYMENT_APPROVED",
  "DECLINED",
  "OVERDUE",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
  "VOIDED",
  "CANCELLED",
] as const;

export function OrderKanbanCard({
  order,
  locale,
  onOpen,
  onFinancialStatusChange,
  updating = false,
}: {
  order: Order;
  locale: OrderLocale;
  onOpen: () => void;
  onFinancialStatusChange: (status: string) => void;
  updating?: boolean;
}) {
  const drag = useDraggable({ id: order.id, data: { order } });
  const [statusOpen, setStatusOpen] = React.useState(false);
  const t = orderText(locale);
  const financialStatus = order.financialStatus || order.status;
  const seller = order.owner?.name || order.deal?.owner?.name;
  const context = [
    order.deal?.leadSequence
      ? `${t.leadShort} #${String(order.deal.leadSequence).padStart(4, "0")}`
      : null,
    seller,
  ]
    .filter(Boolean)
    .join(" · ");
  const tracking = order.shipments?.[0]?.trackingCode || order.trackingCode;
  const units = order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const due = order.operationalDueAt ? new Date(order.operationalDueAt) : null;
  const overdue = due ? due.getTime() < new Date().setHours(0, 0, 0, 0) : false;
  const dueLabel = due
    ? new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit" }).format(due)
    : "—";
  const rawNumber = order.externalName || order.number;
  const displayNumber = rawNumber.startsWith("#") ? rawNumber : `#${rawNumber}`;
  const stop = (event: React.SyntheticEvent) => event.stopPropagation();
  return (
    <article
      ref={drag.setNodeRef}
      {...drag.listeners}
      {...drag.attributes}
      data-testid="order-kanban-card"
      data-order-id={order.id}
      onClick={onOpen}
      className="cursor-grab rounded-xl border border-border bg-card p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      style={{ opacity: drag.isDragging ? 0.45 : 1 }}
    >
      <div className="flex items-start justify-between gap-2">
        <strong
          data-testid="order-kanban-title"
          className="min-w-0 truncate text-sm font-semibold text-foreground"
          title={displayNumber}
        >
          {displayNumber}
        </strong>
        {order.operationalIssue ? (
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-label={t.issue} />
        ) : (
          <span className="h-4 w-4 shrink-0" aria-hidden />
        )}
      </div>
      <p className="mt-1 h-4 truncate text-xs text-muted-foreground" title={context || undefined}>
        {context || " "}
      </p>
      <div className="mt-2" onPointerDown={stop} onClick={stop}>
        <Popover
          open={statusOpen}
          onOpenChange={setStatusOpen}
          align="start"
          contentWidth={230}
          aria-label={t.changePaymentStatus}
          trigger={
            <button
              type="button"
              data-testid="order-financial-status"
              disabled={updating}
              aria-label={`${t.changePaymentStatus}: ${orderEnumLabel(financialStatus, locale)}`}
              className="inline-flex h-7 max-w-full items-center gap-1 rounded-full border border-border bg-background px-2 text-[11px] text-foreground hover:bg-muted disabled:opacity-60"
              onPointerDown={stop}
              onClick={(event) => {
                stop(event);
                setStatusOpen(!statusOpen);
              }}
            >
              <span className="truncate">{orderEnumLabel(financialStatus, locale)}</span>
              <ChevronDown className="h-3 w-3 shrink-0" />
            </button>
          }
        >
          <div className="max-h-72 overflow-y-auto p-1.5" onPointerDown={stop} onClick={stop}>
            {FINANCIAL_STATUS_OPTIONS.map((status) => (
              <button
                type="button"
                key={status}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-muted"
                onClick={() => {
                  onFinancialStatusChange(status);
                  setStatusOpen(false);
                }}
              >
                <span className="flex-1">{orderEnumLabel(status, locale)}</span>
                {status === financialStatus ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
              </button>
            ))}
          </div>
        </Popover>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        <strong className="truncate font-semibold text-primary">
          {formatOrderCurrency(
            Number(order.finalValue ?? order.total ?? 0),
            order.currency,
            locale,
          )}
        </strong>
        <span className="shrink-0 text-muted-foreground">
          {units} {t.units}
        </span>
      </div>
      <div className="mt-1.5 flex min-h-4 items-center justify-between gap-2 text-[11px]">
        <span className="min-w-0 truncate text-muted-foreground" title={tracking || undefined}>
          {tracking || " "}
        </span>
        <span
          className={
            overdue ? "shrink-0 font-medium text-destructive" : "shrink-0 text-muted-foreground"
          }
          title={overdue ? t.overdue : t.due}
        >
          {dueLabel}
          {overdue ? <span className="sr-only"> · {t.overdue}</span> : null}
        </span>
      </div>
    </article>
  );
}
