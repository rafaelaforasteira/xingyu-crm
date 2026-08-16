import Link from "next/link";
import { ExternalLink, MessageCircle, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatOrderCurrency,
  orderEnumLabel,
  orderText,
  type OrderLocale,
} from "@/lib/orders-i18n";
import type { Order } from "@/lib/types";

export function OrderCustomerCard({ order, locale }: { order: Order; locale: OrderLocale }) {
  const t = orderText(locale);
  const contact = order.contact;
  const deal = order.deal;
  const orderCount = contact?.orderCount ?? order.purchaseOrdinal;
  const isNew = order.isFirstPurchase ?? (orderCount === 1 ? true : orderCount ? false : undefined);
  const salesConsultant = order.owner ?? deal?.owner;
  const currentOwner = contact?.owner ?? order.company?.owner;
  const conversation = deal?.conversation;
  const leadSource = deal?.source || contact?.source;
  const campaign = deal?.campaign || contact?.campaign;
  const hasCommercialContext = Boolean(
    salesConsultant ||
    currentOwner ||
    deal ||
    conversation ||
    leadSource ||
    campaign ||
    order.channel ||
    order.source,
  );
  const purchaseDate = (value?: string | null) =>
    value ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value)) : null;
  return (
    <section
      data-testid="order-customer-card"
      className="rounded-xl border border-border bg-card p-4 shadow-sm"
    >
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t.customerHistory}
      </h3>
      {isNew !== undefined || orderCount ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {isNew ? t.customerNew : t.customerReturning}
          {orderCount
            ? ` · ${orderCount === 1 ? t.firstOrder : `${orderCount} ${t.ordersCount}`}`
            : ""}
        </p>
      ) : null}
      {contact &&
      (orderCount ||
        Number(contact.totalPurchased) > 0 ||
        contact.firstPurchaseAt ||
        contact.lastPurchaseAt) ? (
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border/60 pt-3 text-xs">
          {orderCount ? <Metric label={t.ordersCount} value={String(orderCount)} /> : null}
          {Number(contact.totalPurchased) > 0 ? (
            <Metric
              label={t.purchasedTotal}
              value={formatOrderCurrency(Number(contact.totalPurchased), order.currency, locale)}
            />
          ) : null}
          {contact.firstPurchaseAt ? (
            <Metric label={t.firstPurchase} value={purchaseDate(contact.firstPurchaseAt)!} />
          ) : null}
          {contact.lastPurchaseAt ? (
            <Metric label={t.lastPurchase} value={purchaseDate(contact.lastPurchaseAt)!} />
          ) : null}
        </div>
      ) : null}
      {!contact ? (
        <p className="mt-2 text-xs text-muted-foreground">{t.noCustomerHistory}</p>
      ) : null}
      {contact?.tags?.length ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {contact.tags.slice(0, 3).map((tag) => (
            <Badge key={tag.id} variant="outline" className="font-normal">
              {tag.name}
            </Badge>
          ))}
        </div>
      ) : null}
      <div className="mt-4 border-t border-border/60 pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t.commercialContext}
        </h4>
        {hasCommercialContext ? (
          <div className="mt-3 space-y-3">
            {salesConsultant ? (
              <ContextRow label={t.salesConsultant} value={salesConsultant.name} />
            ) : null}
            {currentOwner && currentOwner.id !== salesConsultant?.id ? (
              <ContextRow label={t.currentOwner} value={currentOwner.name} />
            ) : null}
            {deal ? (
              <ContextRow
                label={t.linkedLead}
                value={`#${String(deal.leadSequence ?? "—").padStart(4, "0")}${deal.pipeline || deal.stage ? ` · ${[deal.pipeline?.name, deal.stage?.name].filter(Boolean).join(" › ")}` : ""}`}
              />
            ) : null}
            {conversation ? (
              <ContextRow
                label={t.conversation}
                value={`${conversation.channel?.displayName || conversation.channel?.name || conversation.channel?.type || orderEnumLabel(order.channel, locale)} · ${orderEnumLabel(conversation.status, locale)}`}
              />
            ) : null}
            {leadSource ? <ContextRow label={t.leadSource} value={leadSource} /> : null}
            {campaign ? <ContextRow label={t.campaign} value={campaign} /> : null}
            {order.channel || order.source ? (
              <ContextRow
                label={t.orderChannel}
                value={orderEnumLabel(order.channel || order.source, locale)}
              />
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {t.noCommercialContext}
          </p>
        )}
      </div>
      {!contact ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground">
          <UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{t.customerNotLinked}</span>
        </div>
      ) : null}
      {contact || deal || conversation ? (
        <div className="mt-4 flex flex-wrap gap-1 border-t border-border/60 pt-3">
          {contact ? <Action href={`/contacts/${contact.id}`} label={t.openCustomer} /> : null}
          {deal ? (
            <Action href={`/pipelines/${deal.pipelineId}/deals/${deal.id}`} label={t.openLead} />
          ) : null}
          {conversation ? (
            <Action href={`/inbox/${conversation.id}`} label={t.openConversation} conversation />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-medium text-foreground">{value}</p>
      <p className="truncate text-muted-foreground">{label}</p>
    </div>
  );
}
function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="break-words text-sm text-foreground">{value}</p>
    </div>
  );
}
function Action({
  href,
  label,
  conversation = false,
}: {
  href: string;
  label: string;
  conversation?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ size: "sm", variant: "ghost" }),
        "h-8 px-2 text-xs text-primary",
      )}
    >
      {conversation ? (
        <MessageCircle className="h-3.5 w-3.5" />
      ) : (
        <ExternalLink className="h-3.5 w-3.5" />
      )}
      {label}
    </Link>
  );
}
