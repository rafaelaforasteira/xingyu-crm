"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Copy, ExternalLink, FileText, Loader2, Printer, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-controls";
import { ordersApi } from "@/lib/api";
import { formatOrderDate, orderEnumLabel, orderText, type OrderLocale } from "@/lib/orders-i18n";
import type { Order, OrderShipment } from "@/lib/types";

type Props = { order: Order; locale: OrderLocale };

const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);

function printInternalLabel(order: Order, title: string) {
  const popup = window.open("", "_blank", "noopener,noreferrer,width=720,height=760");
  if (!popup) return;
  const address = [order.address1Snapshot, order.addressNumberSnapshot, order.complementSnapshot, order.neighborhoodSnapshot, order.citySnapshot, order.provinceSnapshot, order.postalCodeSnapshot, order.countrySnapshot].filter(Boolean).map(esc).join("<br>");
  popup.document.write(`<!doctype html><html><head><title>${esc(title)}</title><style>body{font:16px system-ui;padding:32px;color:#18181b}h1{font-size:20px;border-bottom:2px solid #18181b;padding-bottom:12px}dl{display:grid;grid-template-columns:140px 1fr;gap:10px}dt{color:#71717a}dd{margin:0;font-weight:600}</style></head><body><h1>${esc(title)}</h1><dl><dt>Pedido</dt><dd>${esc(order.number)}</dd><dt>Destinatário</dt><dd>${esc(order.recipientNameSnapshot || order.customerNameSnapshot || order.contact?.name)}</dd><dt>Telefone</dt><dd>${esc(order.customerPhoneSnapshot || order.contact?.phone)}</dd><dt>Endereço</dt><dd>${address}</dd></dl><script>window.print();</script></body></html>`);
  popup.document.close();
}

export function OrderShippingTrackingSection({ order, locale }: Props) {
  const t = orderText(locale);
  const qc = useQueryClient();
  const shipment = useMemo(() => order.shipments?.find((item) => !item.deliveredAt) ?? order.shipments?.[0], [order.shipments]);
  const [tracking, setTracking] = useState(shipment?.trackingCode || order.trackingCode || "");
  const [link, setLink] = useState(order.customerOrderStatusUrl || "");
  const [copied, setCopied] = useState<"link" | "tracking" | null>(null);
  useEffect(() => setTracking(shipment?.trackingCode || order.trackingCode || ""), [shipment?.trackingCode, order.trackingCode]);
  useEffect(() => setLink(order.customerOrderStatusUrl || ""), [order.customerOrderStatusUrl]);

  const mergeShipment = (saved: OrderShipment) => qc.setQueryData<Order>(["orders", order.id, "workspace"], (current) => current ? ({ ...current, shipments: current.shipments?.some((item) => item.id === saved.id) ? current.shipments.map((item) => item.id === saved.id ? saved : item) : [saved, ...(current.shipments ?? [])] }) : current);
  const trackingMutation = useMutation({
    mutationFn: () => shipment ? ordersApi.updateShipment(order.id, shipment.id, { trackingCode: tracking.trim() }) : ordersApi.createShipment(order.id, { trackingCode: tracking.trim() }),
    onSuccess: mergeShipment,
    onError: () => toast.error(t.updateTrackingError),
  });
  const postingMutation = useMutation({
    mutationFn: () => ordersApi.updateShipment(order.id, shipment!.id, { postedAt: new Date().toISOString() }),
    onSuccess: mergeShipment,
    onError: () => toast.error(t.registerPostingError),
  });
  const linkMutation = useMutation({
    mutationFn: () => ordersApi.update(order.id, { customerOrderStatusUrl: link.trim() || null }),
    onSuccess: (saved) => qc.setQueryData<Order>(["orders", order.id, "workspace"], (current) => current ? { ...current, customerOrderStatusUrl: saved.customerOrderStatusUrl } : current),
    onError: () => toast.error(t.linkSaveError),
  });
  const copy = async (value: string, kind: "link" | "tracking") => { await navigator.clipboard.writeText(value); setCopied(kind); window.setTimeout(() => setCopied(null), 1400); };
  const status = shipment?.deliveredAt ? t.deliveredOrder : shipment?.postedAt ? t.inTransport : tracking.trim() ? t.awaitingPosting : t.notProcessed;
  const events = [...(shipment?.events ?? [])].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  return (
    <section
      data-testid="order-workspace-shipping"
      className="overflow-hidden rounded-xl border border-primary/15 bg-card shadow-sm"
    >
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Truck className="h-4 w-4 text-primary" />
        </span>
        <div>
          <h3 className="text-sm font-semibold">{t.shippingTracking}</h3>
          <p className="text-xs text-muted-foreground">{order.number}</p>
        </div>
        <span
          className={`ml-auto rounded-full px-2.5 py-1 text-[11px] font-semibold ${shipment?.deliveredAt ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}
        >
          {status}
        </span>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(240px,0.8fr)_minmax(0,2.2fr)]">
        <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t.logistics}
          </p>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <Info
              label={t.orderPlaced}
              value={formatOrderDate(order.orderedAt || order.createdAt, locale)}
            />
            <Info
              label={t.trackingIssuedAt}
              value={
                shipment?.trackingIssuedAt
                  ? formatOrderDate(shipment.trackingIssuedAt, locale)
                  : "—"
              }
            />
            <div>
              <Info
                label={t.postedAt}
                value={
                  shipment?.postedAt ? formatOrderDate(shipment.postedAt, locale) : t.notProcessed
                }
              />
              {shipment && !shipment.postedAt ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-1 h-7 px-0 text-primary"
                  onClick={() => postingMutation.mutate()}
                  disabled={postingMutation.isPending}
                >
                  {t.registerPosting}
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label>{t.orderLink}</Label>
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Input
                  aria-label={t.orderLink}
                  value={link}
                  onChange={(event) => setLink(event.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-primary"
                  aria-label={t.copy}
                  disabled={!link.trim()}
                  onClick={() => copy(link.trim(), "link")}
                >
                  {copied === "link" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              <Button
                variant="default"
                onClick={() => linkMutation.mutate()}
                disabled={linkMutation.isPending}
              >
                {t.save}
              </Button>
            </div>
            {order.customerOrderStatusUrl ? (
              <div className="mt-1.5 flex gap-3 text-xs">
                <a
                  href={order.customerOrderStatusUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary"
                >
                  {t.open}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ) : (
              <p className="mt-1.5 text-xs text-muted-foreground">{t.unavailableNow}</p>
            )}
          </div>

          <div>
            <Label htmlFor={`tracking-${order.id}`}>{t.trackingCode}</Label>
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Input
                  id={`tracking-${order.id}`}
                  value={tracking}
                  placeholder={t.trackingPlaceholder}
                  onChange={(event) => setTracking(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !trackingMutation.isPending) {
                      event.preventDefault();
                      trackingMutation.mutate();
                    }
                  }}
                  className="pr-10"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-primary"
                  aria-label={t.copy}
                  disabled={!tracking.trim()}
                  onClick={() => copy(tracking.trim(), "tracking")}
                >
                  {copied === "tracking" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              <Button
                variant="default"
                onClick={() => trackingMutation.mutate()}
                disabled={trackingMutation.isPending}
              >
                {trackingMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  t.save
                )}
              </Button>
            </div>
            {copied === "tracking" ? (
              <p className="mt-1 text-xs text-success">{t.copied}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 rounded-lg border border-primary/10 bg-primary/[0.03] p-3">
            <Button
              size="sm"
              variant="outline"
              className="border-primary/20 bg-background text-primary shadow-sm hover:bg-primary/10"
              onClick={() =>
                shipment?.shippingLabelUrl
                  ? window.open(shipment.shippingLabelUrl, "_blank", "noopener,noreferrer")
                  : printInternalLabel(order, t.internalShippingLabel)
              }
            >
              <Printer className="h-3.5 w-3.5" />
              {t.printShippingLabel}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-primary/20 bg-background text-primary shadow-sm hover:bg-primary/10"
              disabled={!shipment?.commercialInvoiceUrl}
              title={!shipment?.commercialInvoiceUrl ? t.unavailableNow : undefined}
              onClick={() =>
                shipment?.commercialInvoiceUrl &&
                window.open(shipment.commercialInvoiceUrl, "_blank", "noopener,noreferrer")
              }
            >
              <FileText className="h-3.5 w-3.5" />
              {t.generateCommercialInvoice}
            </Button>
          </div>
        </div>

        <div className="border-t border-border/60 pt-4 lg:col-span-2">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t.shippingUpdates}
          </p>
          {events.length ? (
            <ol className="max-h-56 space-y-0 overflow-y-auto pr-2">
              {events.map((event, index) => (
                <li
                  key={event.id}
                  className="relative grid grid-cols-[12px_1fr] gap-2 pb-3 last:pb-0"
                >
                  {index < events.length - 1 ? (
                    <span className="absolute bottom-0 left-[4px] top-2 w-px bg-border" />
                  ) : null}
                  <span
                    className={`relative mt-1 h-2.5 w-2.5 rounded-full ${event.status === "DELIVERED" ? "bg-success" : event.status === "EXCEPTION" ? "bg-destructive" : "bg-primary"}`}
                  />
                  <div>
                    <p className="text-xs font-medium">
                      {event.description || orderEnumLabel(event.status, locale)}
                    </p>
                    {event.location ? (
                      <p className="text-[11px] text-muted-foreground">{event.location}</p>
                    ) : null}
                    <time className="text-[11px] text-muted-foreground">
                      {formatOrderDate(event.occurredAt, locale)}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-muted-foreground">{t.noShippingUpdates}</p>
          )}
        </div>

        {shipment?.deliveredAt ? (
          <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 px-3 py-2 text-xs text-success lg:col-span-2">
            <CheckCircle2 className="h-4 w-4" />
            <strong>{t.deliveredOrder}</strong>
            <span>· {formatOrderDate(shipment.deliveredAt, locale)}</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-0.5 text-sm font-medium text-foreground">{value}</p></div>; }
