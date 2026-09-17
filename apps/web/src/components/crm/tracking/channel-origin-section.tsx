"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHANNEL_LABELS } from "./tracking-dictionary";
import { ConceptHelp } from "./tracking-help";
import { money, percentage, integer } from "./tracking-format";
import { AnimatedMetric, AnimatedProgress, useTrackingMotion } from "./tracking-motion";
import type { SalesTrackingData } from "./sales-tracking-types";
import styles from "./tracking-overview.module.css";

const channelColors = [
  "hsl(var(--primary))",
  "hsl(248 48% 55%)",
  "hsl(274 42% 64%)",
  "hsl(240 38% 68%)",
  "hsl(265 40% 76%)",
  "hsl(250 28% 47%)",
  "hsl(280 24% 57%)",
  "hsl(255 25% 82%)",
];
const channelKeys = Object.keys(CHANNEL_LABELS);
function color(channel: string) {
  return channel === "UNIDENTIFIED"
    ? "hsl(var(--muted-foreground) / .45)"
    : channelColors[channelKeys.indexOf(channel) % channelColors.length];
}
export function ChannelOriginSection({ data }: { data: SalesTrackingData }) {
  const { attribution } = data;
  const { revision } = useTrackingMotion();
  const channels = [...data.channels].sort((a, b) => b.netRevenue - a.netRevenue);
  const describe = (row: (typeof channels)[number]) => (
    <>
      <strong className="mb-2 block">{CHANNEL_LABELS[row.channel]}</strong>
      <span className="block font-semibold">
        {money(row.netRevenue)} · {percentage(row.revenueShare)} da receita
      </span>
      <span className="mt-2 block">
        {integer(row.orders)} pedidos · {integer(row.buyers)} compradores ·{" "}
        {integer(row.newCustomers)} novos clientes
      </span>
      <span className="mt-1 block">Ticket médio: {money(row.averageTicket)}</span>
    </>
  );
  return (
    <Card className="min-w-0 rounded-2xl shadow-soft">
      <CardHeader>
        <CardTitle>De onde vêm as vendas?</CardTitle>
        <p className="text-xs text-muted-foreground">
          Entenda quais canais estão associados à receita realizada no período.
        </p>
      </CardHeader>
      <CardContent className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)]">
        <div className="min-w-0">
          {attribution.totalNetRevenue > 0 ? (
            <>
              <div
                key={revision}
                className={styles.channelBar + " mb-5 flex h-8 gap-0.5 rounded-xl bg-muted"}
                aria-label="Composição da receita por canal"
              >
                {channels
                  .filter((row) => row.netRevenue > 0)
                  .map((row) => (
                    <ConceptHelp
                      key={row.channel}
                      label={CHANNEL_LABELS[row.channel]}
                      text={describe(row)}
                      className={
                        styles.segment + " h-full min-w-0 first:rounded-l-xl last:rounded-r-xl"
                      }
                      style={{
                        width: (row.revenueShare ?? 0) + "%",
                        background: color(row.channel),
                      }}
                    >
                      <span className="sr-only">{CHANNEL_LABELS[row.channel]}</span>
                    </ConceptHelp>
                  ))}
              </div>
              {attribution.attributedRevenue === 0 && (
                <p className="mb-3 text-xs text-muted-foreground">
                  100% da receita está sem origem identificada.
                </p>
              )}
            </>
          ) : (
            <p className="mb-4 text-sm text-muted-foreground">
              Não há receita líquida para atribuir neste recorte.
            </p>
          )}
          <div className="grid gap-x-5 gap-y-1 sm:grid-cols-2">
            {channels.map((row) => (
              <div
                key={row.channel}
                className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: color(row.channel) }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-0.5 text-xs font-medium">
                    {CHANNEL_LABELS[row.channel]}
                    <ConceptHelp label={CHANNEL_LABELS[row.channel]} text={describe(row)} />
                  </div>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {money(row.netRevenue)}
                  </span>
                </div>
                <strong className="text-xs tabular-nums">{percentage(row.revenueShare)}</strong>
              </div>
            ))}
          </div>
        </div>
        <aside className="rounded-2xl bg-primary/[0.025] p-4 sm:p-5">
          <div className="flex items-center gap-1 text-sm font-medium">
            Cobertura de atribuição
            <ConceptHelp
              label="Cobertura de atribuição"
              text="Percentual da receita líquida em que o FAROL conseguiu identificar uma origem. Não representa ROAS ou retorno de mídia."
            />
          </div>
          <strong className="mt-3 block text-4xl font-semibold tracking-tight text-primary">
            <AnimatedMetric
              value={attribution.attributedRevenueShare}
              format={percentage}
              duration={750}
            />
          </strong>
          <p className="mt-1 text-[11px] text-muted-foreground">
            da receita possui origem identificada
          </p>
          <div className="my-4 h-2 overflow-hidden rounded-full bg-muted">
            <AnimatedProgress value={attribution.attributedRevenueShare} className="bg-primary" />
          </div>
          <dl className="grid grid-cols-2 gap-3 text-[11px]">
            {[
              {
                label: "Identificada",
                value: attribution.attributedRevenue,
                share: attribution.attributedRevenueShare,
              },
              {
                label: "Não identificada",
                value: attribution.unattributedRevenue,
                share: attribution.unattributedRevenueShare,
              },
            ].map((row) => (
              <div key={row.label} className="min-w-0">
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="mt-1 font-semibold tabular-nums">
                  <AnimatedMetric value={row.value} format={money} duration={500} />
                </dd>
                <dd className="mt-1 text-muted-foreground">{percentage(row.share)}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </CardContent>
    </Card>
  );
}
