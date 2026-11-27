"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ExternalLink, Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import { ordersApi } from "@/lib/api";
import { orderText, type OrderLocale } from "@/lib/orders-i18n";
import type { Order, OrderItem } from "@/lib/types";

type Props = {
  orderId: string;
  items: OrderItem[];
  locale: OrderLocale;
};

function separatedCounter(count: number, total: number, locale: OrderLocale) {
  if (locale === "pt-BR") return `${count} de ${total} separados`;
  if (locale === "en") return `${count} of ${total} separated`;
  if (locale === "zh-CN") return `已分拣 ${count}/${total}`;
  return `已分揀 ${count}/${total}`;
}

export function OrderProductsSection({ orderId, items, locale }: Props) {
  const t = orderText(locale);
  const separatedCount = items.filter((item) => item.isSeparated).length;
  const allSeparated = items.length > 0 && separatedCount === items.length;

  return (
    <section
      data-testid="order-workspace-products"
      className="overflow-hidden rounded-xl border border-primary/10 bg-card shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Package className="h-4 w-4 text-primary" />
          {t.products}
        </h3>
        <span
          data-testid="order-products-separated-count"
          className={`text-xs font-medium ${allSeparated ? "text-success" : "text-muted-foreground"}`}
        >
          {separatedCounter(separatedCount, items.length, locale)}
        </span>
      </div>
      {items.length ? (
        <>
          <div className="sticky top-0 z-10 hidden grid-cols-[minmax(76px,.7fr)_minmax(130px,1.7fr)_minmax(100px,1fr)_72px_58px_76px] items-center gap-2 border-b border-border/60 bg-card px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
            <span>{t.sku}</span>
            <span>{t.name}</span>
            <span>{t.variation}</span>
            <span>{t.quantity}</span>
            <span className="text-center">{t.product}</span>
            <span className="text-center">{t.separated}</span>
          </div>
          <div
            data-testid="order-products-scroll"
            className="max-h-[280px] overflow-y-auto overscroll-contain"
          >
            {items.map((item) => (
              <OrderProductRow key={item.id} orderId={orderId} item={item} locale={locale} />
            ))}
          </div>
        </>
      ) : (
        <p className="px-4 py-4 text-xs text-muted-foreground">—</p>
      )}
    </section>
  );
}

function OrderProductRow({
  orderId,
  item,
  locale,
}: {
  orderId: string;
  item: OrderItem;
  locale: OrderLocale;
}) {
  const t = orderText(locale);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (isSeparated: boolean) =>
      ordersApi.updateItemSeparation(orderId, item.id, isSeparated),
    onMutate: async (isSeparated) => {
      await queryClient.cancelQueries({ queryKey: ["orders", orderId, "workspace"] });
      queryClient.setQueryData<Order>(["orders", orderId, "workspace"], (current) =>
        current
          ? {
              ...current,
              items: current.items?.map((currentItem) =>
                currentItem.id === item.id ? { ...currentItem, isSeparated } : currentItem,
              ),
            }
          : current,
      );
      return { previous: item.isSeparated };
    },
    onSuccess: (saved) => {
      queryClient.setQueryData<Order>(["orders", orderId, "workspace"], (current) =>
        current
          ? {
              ...current,
              items: current.items?.map((currentItem) =>
                currentItem.id === saved.id ? { ...currentItem, ...saved } : currentItem,
              ),
            }
          : current,
      );
    },
    onError: (_error, _next, context) => {
      queryClient.setQueryData<Order>(["orders", orderId, "workspace"], (current) =>
        current
          ? {
              ...current,
              items: current.items?.map((currentItem) =>
                currentItem.id === item.id
                  ? { ...currentItem, isSeparated: context?.previous ?? item.isSeparated }
                  : currentItem,
              ),
            }
          : current,
      );
      toast.error(t.itemSeparationError);
    },
  });

  return (
    <div
      data-testid="order-product-row"
      data-item-id={item.id}
      className={`grid min-h-[52px] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border/50 px-4 py-2.5 text-sm transition-colors last:border-b-0 motion-reduce:transition-none sm:grid-cols-[minmax(76px,.7fr)_minmax(130px,1.7fr)_minmax(100px,1fr)_72px_58px_76px] ${
        item.isSeparated ? "bg-success/5 hover:bg-success/5" : "bg-card hover:bg-primary/[0.02]"
      }`}
    >
      <span className="truncate text-xs text-muted-foreground" title={item.sku || undefined}>
        {item.sku || "—"}
      </span>
      <div className="min-w-0 sm:col-start-2 sm:row-start-1">
        <p className="truncate font-medium text-foreground" title={item.productName}>
          {item.productName}
        </p>
      </div>
      <span className="hidden truncate text-xs text-muted-foreground sm:block" title={item.variantTitle || undefined}>{item.variantTitle || "—"}</span>
      <span className="w-fit rounded-full bg-primary/5 px-2 py-1 text-xs font-medium text-foreground sm:col-start-4 sm:row-start-1">
        {item.quantity} {t.units}
      </span>
      <div className="hidden justify-center sm:flex">
        <span className="text-muted-foreground" title={t.productLinkUnavailable}>
          <ExternalLink className="h-4 w-4 opacity-30" aria-hidden="true" />
          <span className="sr-only">{t.productLinkUnavailable}</span>
        </span>
      </div>
      <div className="flex justify-end sm:justify-center">
        <button
          type="button"
          role="checkbox"
          aria-checked={item.isSeparated}
          aria-label={`${item.isSeparated ? t.unmarkSeparated : t.markSeparated}: ${item.productName}`}
          disabled={mutation.isPending}
          onClick={() => mutation.mutate(!item.isSeparated)}
          className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait motion-reduce:transform-none motion-reduce:transition-none ${
            item.isSeparated
              ? "border-success/40 bg-success text-success-foreground"
              : "border-border bg-background text-transparent hover:border-primary/40"
          }`}
        >
          {mutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <Check className={`h-4 w-4 ${item.isSeparated ? "scale-100" : "scale-75"}`} />
          )}
        </button>
      </div>
    </div>
  );
}
