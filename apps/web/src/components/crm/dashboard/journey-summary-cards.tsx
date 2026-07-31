"use client";

import Link from "next/link";
import type { DashboardJourneySummaries } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HeartHandshake, Package, RefreshCw, Sparkles } from "lucide-react";

export function JourneySummaryCards({
  journeys,
  loading,
}: {
  journeys?: DashboardJourneySummaries;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      key: "repurchase",
      title: "Recompra",
      icon: RefreshCw,
      primary: journeys?.repurchase.ready ?? 0,
      primaryLabel: "clientes prontos",
      secondary: [
        `Abordados: ${formatMaybe(journeys?.repurchase.approached)}`,
        `Realizadas: ${formatMaybe(journeys?.repurchase.completed)}`,
        `Receita: ${formatMaybeMoney(journeys?.repurchase.revenue)}`,
        journeys?.repurchase.readyRule
          ? "Prontos: 30–90 dias sem compra (faixas Até 30 / 31–60 / 61–90)"
          : "Prontos: 30 a 90 dias sem compra",
      ],
      href: journeys?.repurchase.href ?? "/repurchase",
    },
    {
      key: "reactivation",
      title: "Reativação",
      icon: Sparkles,
      primary: journeys?.reactivation.inactive ?? 0,
      primaryLabel: "clientes inativos",
      secondary: [
        `Em reativação: ${journeys?.reactivation.inProgress ?? 0}`,
        `Recuperados: ${journeys?.reactivation.recovered ?? 0}`,
        `Receita: ${formatMaybeMoney(journeys?.reactivation.revenue)}`,
      ],
      href: journeys?.reactivation.href ?? "/reactivation",
    },
    {
      key: "afterSales",
      title: "Pós-venda",
      icon: HeartHandshake,
      primary: journeys?.afterSales.open ?? 0,
      primaryLabel: "casos abertos",
      secondary: [
        `Atrasados: ${formatMaybe(journeys?.afterSales.delayed)}`,
        `Críticos: ${journeys?.afterSales.critical ?? 0}`,
        `Resolução média: ${
          journeys?.afterSales.avgResolutionDays != null
            ? `${journeys.afterSales.avgResolutionDays} dias`
            : "Dados indisponíveis"
        }`,
      ],
      href: journeys?.afterSales.href ?? "/after-sales",
    },
    {
      key: "ecommerce",
      title: "E-commerce e logística",
      icon: Package,
      primary: journeys?.ecommerce.inTransit ?? 0,
      primaryLabel: "pedidos em trânsito",
      secondary: [
        `Aguardando separação: ${journeys?.ecommerce.awaitingSeparation ?? 0}`,
        `Atrasados (previsão): ${formatMaybe(journeys?.ecommerce.delayed)}`,
        journeys?.ecommerce.staleTrackingLabel
          ? `${journeys.ecommerce.staleTrackingLabel}: ${formatMaybe(journeys.ecommerce.missingTracking)}`
          : `Sem atualização de rastreio: ${formatMaybe(journeys?.ecommerce.missingTracking)}`,
      ],
      href: journeys?.ecommerce.href ?? "/orders",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link key={card.key} href={card.href}>
            <Card className="h-full rounded-2xl p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-card">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{card.title}</p>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
              </div>
              <p className="mt-4 text-2xl font-bold tracking-tight">{card.primary}</p>
              <p className="text-xs text-muted-foreground">{card.primaryLabel}</p>
              <div className="mt-4 space-y-1 text-[11px] text-muted-foreground">
                {card.secondary.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

function formatMaybe(value: number | null | undefined) {
  return value == null ? "Dados indisponíveis" : String(value);
}

function formatMaybeMoney(value: number | null | undefined) {
  return value == null ? "Dados indisponíveis" : formatCurrency(value);
}
