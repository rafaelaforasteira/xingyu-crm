"use client";

import * as React from "react";
import { CreditCard, ExternalLink, Loader2, Paperclip, ReceiptText, Upload } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
  formatOrderCurrency,
  orderEnumLabel,
  orderText,
  type OrderLocale,
} from "@/lib/orders-i18n";
import { ordersApi } from "@/lib/api";
import type { Order } from "@/lib/types";

const acceptedReceiptTypes = "application/pdf,image/jpeg,image/png";

export function OrderFinancialSection({ order, locale }: { order: Order; locale: OrderLocale }) {
  const t = orderText(locale);
  const queryClient = useQueryClient();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [uploadError, setUploadError] = React.useState("");
  const payment = order.payments?.[0];
  const receiptUrl = order.payments?.find((item) => item.receiptUrl)?.receiptUrl;
  const money = (value: number | string | null | undefined) =>
    formatOrderCurrency(Number(value ?? 0), order.currency, locale);
  const grossValue =
    order.grossValue ?? Number(order.finalValue ?? order.total) + Number(order.discount ?? 0);
  const upload = useMutation({
    mutationFn: (file: File) => {
      if (!payment)
        throw new Error("O pedido ainda não possui um pagamento para vincular o comprovante.");
      return ordersApi.uploadPaymentReceipt(order.id, payment.id, file);
    },
    onSuccess: () => {
      setUploadError("");
      void queryClient.invalidateQueries({ queryKey: ["orders", order.id, "workspace"] });
    },
    onError: (value) =>
      setUploadError(
        value instanceof Error ? value.message : "Não foi possível enviar o comprovante.",
      ),
  });

  return (
    <section
      data-testid="order-workspace-financial"
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
    >
      <div className="flex min-h-12 items-center justify-between gap-3 border-b border-border/70 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{t.financial}</h3>
        </div>
        <Badge
          variant="outline"
          className="border-primary/15 bg-primary/5 text-xs font-medium text-primary"
        >
          {orderEnumLabel(payment?.status || order.financialStatus || order.status, locale)}
        </Badge>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <FinancialMetric label="Valor bruto" value={money(grossValue)} />
          <FinancialMetric
            label={t.total}
            value={money(order.finalValue ?? order.total)}
            emphasis
          />
        </div>

        <dl className="overflow-hidden rounded-xl border border-border/70 bg-muted/20">
          <FinancialRow
            label="Cupom de desconto"
            value={
              order.coupon ? (
                <span className="rounded-md bg-primary/10 px-2 py-1 font-mono text-xs font-semibold text-primary">
                  {order.coupon}
                </span>
              ) : (
                "Nenhum cupom"
              )
            }
          />
          <FinancialRow
            label="Frete"
            value={Number(order.shippingCost) > 0 ? money(order.shippingCost) : "Grátis"}
          />
          <FinancialRow
            label="Valor do desconto"
            value={
              Number(order.discount) > 0 ? (
                <span className="font-medium text-emerald-600">− {money(order.discount)}</span>
              ) : (
                money(0)
              )
            }
          />
          <FinancialRow
            label="Status do pagamento"
            value={orderEnumLabel(payment?.status || order.financialStatus || order.status, locale)}
          />
          <FinancialRow
            label="Forma de pagamento"
            value={payment?.method ? orderEnumLabel(payment.method, locale) : "Não informada"}
          />
        </dl>

        <div className="rounded-xl border border-dashed border-primary/25 bg-primary/[0.025] p-3">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ReceiptText className="h-4 w-4" />
            </span>
            <div className="mt-2 min-w-0 w-full">
              <p className="text-xs font-semibold text-foreground">{t.paymentReceipt}</p>
              {receiptUrl ? (
                <>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Comprovante vinculado automaticamente
                  </p>
                  <a
                    href={receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-primary hover:bg-muted"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    {t.openReceipt}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </>
              ) : (
                <>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    PDF, JPG ou PNG. O comprovante automático aparecerá aqui quando disponível.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={acceptedReceiptTypes}
                    className="sr-only"
                    aria-label="Selecionar comprovante de pagamento"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) upload.mutate(file);
                      event.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    disabled={!payment || upload.isPending}
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {upload.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    Adicionar comprovante
                  </button>
                </>
              )}
              {uploadError ? (
                <p className="mt-2 text-xs text-destructive" role="alert">
                  {uploadError}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinancialMetric({
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
      className={
        emphasis
          ? "rounded-xl border border-primary/15 bg-primary/5 p-3"
          : "rounded-xl border border-border/70 bg-muted/20 p-3"
      }
    >
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={
          emphasis
            ? "mt-1 text-lg font-semibold text-primary"
            : "mt-1 text-base font-semibold text-foreground"
        }
      >
        {value}
      </p>
    </div>
  );
}

function FinancialRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 border-b border-border/60 px-3 py-2 last:border-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm text-foreground">{value}</dd>
    </div>
  );
}
