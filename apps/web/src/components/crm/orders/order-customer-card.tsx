import Link from "next/link";
import { BriefcaseBusiness, ExternalLink, History, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
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
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
    >
      <div className="flex min-h-12 items-center justify-between gap-3 border-b border-border/70 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{t.customerHistory}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {isNew !== undefined ? (
            <Badge
              variant="outline"
              className="border-primary/15 bg-primary/5 text-xs font-medium text-primary"
            >
              {isNew ? t.customerNew : t.customerReturning}
            </Badge>
          ) : null}
          {contact ? (
            <HeaderAction href={`/contacts/${contact.id}`} label={t.openCustomer} />
          ) : null}
          {deal ? (
            <HeaderAction
              href={`/pipelines/${deal.pipelineId}/deals/${deal.id}`}
              label={`${t.openLead} #${String(deal.leadSequence ?? "—").padStart(4, "0")}`}
              lead
            />
          ) : null}
        </div>
      </div>
      <div className="space-y-4 p-4">
        {contact &&
        (orderCount ||
          Number(contact.totalPurchased) > 0 ||
          contact.firstPurchaseAt ||
          contact.lastPurchaseAt) ? (
          <div className="grid grid-cols-2 gap-3 text-xs">
            {orderCount ? (
              <Metric label={t.ordersCount} value={String(orderCount)} emphasis />
            ) : null}
            {Number(contact.totalPurchased) > 0 ? (
              <Metric
                label={t.purchasedTotal}
                value={formatOrderCurrency(Number(contact.totalPurchased), order.currency, locale)}
                emphasis
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
        {!contact ? <p className="text-xs text-muted-foreground">{t.noCustomerHistory}</p> : null}
        {contact?.tags?.length ? (
          <div className="flex flex-wrap gap-1.5">
            {contact.tags.slice(0, 3).map((tag) => (
              <Badge key={tag.id} variant="outline" className="font-normal">
                {tag.name}
              </Badge>
            ))}
          </div>
        ) : null}
        <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
          <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t.commercialContext}
          </h4>
          {hasCommercialContext ? (
            <div className="grid gap-x-4 gap-y-3 sm:grid-cols-3">
              {salesConsultant ? (
                <div className="flex min-w-0 items-center gap-2 sm:col-span-3">
                  <Avatar name={salesConsultant.name} src={salesConsultant.avatarUrl} size="sm" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground">{t.salesConsultant}</p>
                    <p className="truncate text-sm font-medium text-foreground">
                      {salesConsultant.name}
                    </p>
                  </div>
                </div>
              ) : null}
              {currentOwner && currentOwner.id !== salesConsultant?.id ? (
                <ContextRow label={t.currentOwner} value={currentOwner.name} />
              ) : null}
              {deal ? (
                <ContextRow
                  label={t.linkedLead}
                  value={`#${String(deal.leadSequence ?? "—").padStart(4, "0")}`}
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
            <p className="text-xs leading-relaxed text-muted-foreground">{t.noCommercialContext}</p>
          )}
        </div>
        {!contact ? (
          <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground">
            <UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{t.customerNotLinked}</span>
          </div>
        ) : null}
        <div className="border-t border-border/60 pt-3">
          <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t.marketingAttribution}
          </h4>
          {attributionRows.length ? (
            <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-3">
              {attributionRows.map(([label, value]) => (
                <ContextRow key={label} label={label} value={value} />
              ))}
            </dl>
          ) : (
            <p className="text-xs text-muted-foreground">{t.noAttribution}</p>
          )}
          {conversation ? (
            <Link
              href={`/inbox/${conversation.id}`}
              className="mt-3 inline-flex text-xs font-medium text-primary hover:underline"
            >
              {t.openConversation}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
function Metric({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border p-3",
        emphasis ? "border-primary/15 bg-primary/5" : "border-border/70 bg-muted/20",
      )}
    >
      <p
        className={cn(
          "truncate font-semibold",
          emphasis ? "text-base text-primary" : "text-sm text-foreground",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{label}</p>
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
function HeaderAction({
  href,
  label,
  lead = false,
}: {
  href: string;
  label: string;
  lead?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={cn(
        buttonVariants({ size: "icon", variant: "ghost" }),
        "h-8 w-8 rounded-lg text-primary",
      )}
    >
      {lead ? <BriefcaseBusiness className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
    </Link>
  );
}
