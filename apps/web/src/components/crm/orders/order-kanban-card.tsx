"use client";
import * as React from "react";
import { useDraggable } from "@dnd-kit/core";
import { AlertTriangle, Check, Flag, Truck, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Popover } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  formatOrderCurrency,
  orderEnumLabel,
  orderText,
  type OrderLocale,
} from "@/lib/orders-i18n";
import type { Order, UserRef } from "@/lib/types";

export function OrderKanbanCard({
  order,
  locale,
  onOpen,
  users,
  onUpdate,
}: {
  order: Order;
  locale: OrderLocale;
  onOpen: () => void;
  users: UserRef[];
  onUpdate: (data: Partial<Order>) => void;
}) {
  const drag = useDraggable({ id: order.id, data: { order } });
  const [ownerOpen, setOwnerOpen] = React.useState(false);
  const [priorityOpen, setPriorityOpen] = React.useState(false);
  const t = orderText(locale);
  const financialStatus = order.financialStatus || order.status;
  const operationalOwner = order.operationalAssignee;
  const priority = order.operationalPriority || "MEDIUM";
  const priorityColor: Record<string, string> = {
    LOW: "bg-blue-50 text-blue-600",
    MEDIUM: "bg-amber-50 text-amber-700",
    HIGH: "bg-red-50 text-red-600",
    URGENT: "bg-red-100 text-red-700",
  };
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
    : null;
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
        <div
          className="flex shrink-0 flex-col items-center gap-1.5"
          onPointerDown={stop}
          onClick={stop}
        >
          <Popover
            open={ownerOpen}
            onOpenChange={setOwnerOpen}
            contentWidth={260}
            contentClassName="rounded-xl"
            aria-label={t.owner}
            trigger={
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-full outline-none ring-offset-2 hover:ring-2 hover:ring-primary/30 focus-visible:ring-2 focus-visible:ring-primary"
                title={`${t.owner}: ${operationalOwner?.name || t.noOwner}`}
                aria-label={`${t.owner}: ${operationalOwner?.name || t.noOwner}`}
                onClick={() => setOwnerOpen((open) => !open)}
              >
                {operationalOwner ? (
                  <Avatar
                    name={operationalOwner.name}
                    src={operationalOwner.avatarUrl}
                    size="sm"
                    className="h-7 w-7"
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-muted">
                    <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                )}
              </button>
            }
          >
            <div className="p-3">
              <p className="mb-2 text-sm font-semibold">{t.owner}</p>
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {[null, ...users].map((user) => (
                  <button
                    key={user?.id || "none"}
                    type="button"
                    className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      onUpdate({ operationalAssigneeId: user?.id || null });
                      setOwnerOpen(false);
                    }}
                  >
                    {user ? (
                      <Avatar name={user.name} src={user.avatarUrl} size="sm" />
                    ) : (
                      <span className="flex h-7 w-7 items-center justify-center">
                        <UserRound className="h-4 w-4" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate">{user?.name || t.noOwner}</span>
                    {(order.operationalAssigneeId || null) === (user?.id || null) ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          </Popover>
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
                  "flex h-7 w-7 items-center justify-center rounded-full outline-none ring-offset-2 hover:ring-2 hover:ring-primary/30 focus-visible:ring-2 focus-visible:ring-primary",
                  priorityColor[priority],
                )}
                title={`${t.priority}: ${orderEnumLabel(priority, locale)}`}
                aria-label={`${t.priority}: ${orderEnumLabel(priority, locale)}`}
                onClick={() => setPriorityOpen((open) => !open)}
              >
                <Flag className="h-3.5 w-3.5" />
              </button>
            }
          >
            <div className="p-3">
              <p className="mb-2 text-sm font-semibold">{t.priority}</p>
              <div className="space-y-1">
                {(["LOW", "MEDIUM", "HIGH", "URGENT"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      onUpdate({ operationalPriority: value });
                      setPriorityOpen(false);
                    }}
                  >
                    <Flag className={cn("h-4 w-4", priorityColor[value]?.split(" ")[1])} />
                    <span className="flex-1">{orderEnumLabel(value, locale)}</span>
                    {priority === value ? <Check className="h-4 w-4 text-primary" /> : null}
                  </button>
                ))}
              </div>
            </div>
          </Popover>
          {order.operationalIssue ? (
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-label={t.issue} />
          ) : null}
        </div>
      </div>
      <p className="mt-1 h-4 truncate text-xs text-muted-foreground" title={context || undefined}>
        {context || " "}
      </p>
      <div className="mt-2">
        <span
          data-testid="order-financial-status"
          className="inline-flex h-7 max-w-full items-center rounded-full border border-primary/15 bg-primary/5 px-2.5 text-[11px] font-medium text-primary"
        >
          <span className="truncate">{orderEnumLabel(financialStatus, locale)}</span>
        </span>
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
        <span
          className={
            tracking
              ? "flex min-w-0 items-center gap-1.5 truncate text-muted-foreground"
              : "flex min-w-0 items-center gap-1.5 truncate font-medium text-destructive"
          }
          title={tracking || "Não informado"}
        >
          <Truck className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate">{tracking || "Não informado"}</span>
        </span>
        {dueLabel ? (
          <span
            className={
              overdue ? "shrink-0 font-medium text-destructive" : "shrink-0 text-muted-foreground"
            }
            title={overdue ? t.overdue : t.due}
          >
            {dueLabel}
            {overdue ? <span className="sr-only"> · {t.overdue}</span> : null}
          </span>
        ) : null}
      </div>
    </article>
  );
}
