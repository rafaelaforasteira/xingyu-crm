import { compactMoney, percentage } from "./tracking-format";
import type { RepurchaseTimeBucket, SalesTrackingData } from "./sales-tracking-types";

export type TrackingActionTone = "opportunity" | "attention" | "info";

export type TrackingActionInsight = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  tone: TrackingActionTone;
  actionLabel: string;
  actionHref: string;
  actionType: "route" | "anchor";
};

/** Same rule as the repurchase distribution: first bucket that holds the highest share. */
export function dominantRepurchaseBucket(buckets: RepurchaseTimeBucket[]) {
  const hasReturns = buckets.some((row) => row.customers > 0);
  const peakShare = buckets.reduce((max, row) => Math.max(max, row.percentage), 0);
  if (!hasReturns || peakShare <= 0) return null;
  return buckets.find((row) => row.percentage === peakShare) ?? null;
}

export function repurchaseWindowTitle(label: string) {
  if (label.startsWith("Até ")) {
    return `Sua principal janela de recompra está em ${label.charAt(0).toLowerCase()}${label.slice(1)}`;
  }
  if (label.includes("+")) {
    return `Sua principal janela de recompra acontece após ${label.replace("+", "").trim()}`;
  }
  const range = label.replace(/\s*dias\s*$/i, "").replace("–", " e ");
  return `Sua principal janela de recompra está entre ${range} dias`;
}

/** At most three practical signals, in commercial priority. Omits anything the analytics cannot support. */
export function trackingActionInsights(data: SalesTrackingData): TrackingActionInsight[] {
  const insights: TrackingActionInsight[] = [];
  const dominant = dominantRepurchaseBucket(data.repurchaseBuckets);
  if (dominant) {
    insights.push({
      id: "repurchase-window",
      eyebrow: "Janela de recompra",
      title: repurchaseWindowTitle(dominant.label),
      description: `${percentage(dominant.percentage)} das recompras acontecem nessa faixa.`,
      tone: "opportunity",
      actionLabel: "Ver recompra",
      actionHref: "/repurchase",
      actionType: "route",
    });
  }

  const reactivation = data.reactivation;
  if (reactivation.reactivatedCustomers > 0) {
    const count = reactivation.reactivatedCustomers.toLocaleString("pt-BR");
    const singular = reactivation.reactivatedCustomers === 1;
    const revenue =
      reactivation.netRevenue > 0
        ? `${singular ? "Esse cliente gerou" : "Eles geraram"} ${compactMoney(reactivation.netRevenue)} no período.`
        : "Esse retorno ainda não gerou receita líquida no período.";
    insights.push({
      id: "reactivation",
      eyebrow: "Clientes reativados",
      title: singular
        ? "1 cliente voltou depois de um período de inatividade"
        : `${count} clientes voltaram depois de um período de inatividade`,
      description: revenue,
      tone: "opportunity",
      actionLabel: "Ver reativação",
      actionHref: "/reactivation",
      actionType: "route",
    });
  }

  const share = data.attribution.unattributedRevenueShare;
  if (share != null && share > 0) {
    insights.push({
      id: "attribution-gap",
      eyebrow: "Origem das vendas",
      title: `${percentage(share)} da receita está sem origem identificada`,
      description: "Melhorar o tracking ajuda a entender quais canais realmente geram vendas.",
      tone: "attention",
      actionLabel: "Ver origens",
      actionHref: "#tracking-sales-origin",
      actionType: "anchor",
    });
  }

  return insights.slice(0, 3);
}
