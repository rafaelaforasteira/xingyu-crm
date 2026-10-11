"use client";
import * as React from "react";
import type { RecoveryOverviewData, RecoverySegment } from "@xingyu/types";
import { Users, Package, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConceptHelp } from "../tracking-help";
import { CHANNEL_LABELS, CHANNEL_COLORS } from "../channel-origin-config";
import { ChannelBrandMark } from "../channel-origin-brand";
import { recoveryMoney, recoveryPercent, recoveryHours } from "./recovery-format";
import styles from "./recovery.module.css";

function SegmentDetails({ row }: { row: RecoverySegment }) {
  return (
    <ConceptHelp
      label={`Detalhes de ${row.label}`}
      text={
        <>
          <strong>{row.label}</strong>
          <p>
            {row.cases} abandonados · {row.matureCases} maduros · {row.recoveredCases} recuperados
          </p>
          <p>
            Valor abandonado: {recoveryMoney(row.abandonedCents)}
            <br />
            Receita recuperada: {recoveryMoney(row.recoveredCents)}
            <br />
            Tempo médio: {recoveryHours(row.meanHours)}
          </p>
          <p>
            {!row.sufficientSample
              ? "Amostra insuficiente"
              : row.interval
                ? `IC 95% ${recoveryPercent(row.interval[0])}–${recoveryPercent(row.interval[1])}`
                : "Taxa indisponível neste filtro"}
          </p>
        </>
      }
    />
  );
}
export function RecoverySegments({ data }: { data: RecoveryOverviewData }) {
  const [tab, setTab] = React.useState<"customer" | "value" | "channel">("customer");
  const rows =
    tab === "customer"
      ? data.customerSegments
      : tab === "value"
        ? data.valueSegments
        : data.channels;
  const ranked =
    tab === "customer"
      ? rows
      : [...rows].sort((a, b) =>
          tab === "channel"
            ? b.recoveredCents - a.recoveredCents
            : (b.recoveryRate ?? -1) - (a.recoveryRate ?? -1),
        );
  const maxRevenue = Math.max(...rows.map((r) => r.recoveredCents), 1);
  return (
    <section
      className={styles.card + " " + styles.segments}
      aria-labelledby="recovery-segments-title"
    >
      <div className={styles.sectionHead}>
        <div>
          <h2 id="recovery-segments-title">Quem recupera melhor</h2>
          <p>Perfil, valor e origem · compare resultados de populações maduras.</p>
        </div>
        <ConceptHelp
          label="Taxa por segmento"
          text="Recuperados ÷ maduros. Intervalo de Wilson de 95%; amostra mínima de 20 maduros para evidenciar padrões. Origem de aquisição não é evidência de método. Sob filtro de resultado, taxas ficam indisponíveis."
        />
      </div>
      <div className={styles.toggle}>
        {(
          [
            ["customer", "Perfil do cliente"],
            ["value", "Faixa do carrinho"],
            ["channel", "Origem / canal"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            variant={tab === id ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
      </div>
      <div
        className={
          tab === "customer"
            ? styles.segmentCards
            : tab === "channel"
              ? styles.channelCards
              : styles.valueRanking
        }
      >
        {ranked.map((row, i) => (
          <article
            key={row.key}
            className={tab === "customer" ? styles.segmentCard : styles.segmentRanking}
            data-tone={
              tab === "customer"
                ? row.key === "NEW"
                  ? "blue"
                  : row.key === "EXISTING"
                    ? "orange"
                    : "charcoal"
                : "blue"
            }
            style={
              tab === "channel"
                ? ({
                    "--recovery-tone": CHANNEL_COLORS[row.key as keyof typeof CHANNEL_COLORS],
                  } as React.CSSProperties)
                : undefined
            }
          >
            <div className={styles.segmentIdentity}>
              {tab === "channel" ? (
                <ChannelBrandMark channel={row.key as keyof typeof CHANNEL_LABELS} size={28} />
              ) : tab === "customer" ? (
                <span className={styles.segmentIcon}>
                  <Users size={20} />
                </span>
              ) : (
                <span className={styles.rankNumber}>{String(i + 1).padStart(2, "0")}</span>
              )}
              <h3>
                {tab === "channel"
                  ? CHANNEL_LABELS[row.key as keyof typeof CHANNEL_LABELS]
                  : row.label}
              </h3>
              <SegmentDetails row={row} />
            </div>
            <div className={styles.segmentMain}>
              <span>Taxa madura</span>
              <strong>{recoveryPercent(row.recoveryRate)}</strong>
            </div>
            <div className={styles.barTrack}>
              <div
                className={styles.bar}
                style={{
                  width: `${tab === "channel" ? (row.recoveredCents / maxRevenue) * 100 : (row.recoveryRate ?? 0)}%`,
                  background: "var(--recovery-tone)",
                }}
              />
            </div>
            <dl className={styles.segmentMetrics}>
              <div>
                <dt>Receita recuperada</dt>
                <dd>{recoveryMoney(row.recoveredCents)}</dd>
              </div>
              <div>
                <dt>Tempo médio</dt>
                <dd>{recoveryHours(row.meanHours)}</dd>
              </div>
            </dl>
            <p className={styles.segmentSample}>
              {row.recoveredCases} recuperados · {row.matureCases} maduros / {row.cases} abandonados
            </p>
            <span className={styles.sampleNote}>
              {!row.sufficientSample
                ? "Amostra insuficiente"
                : row.interval
                  ? `IC 95% ${recoveryPercent(row.interval[0])}–${recoveryPercent(row.interval[1])}`
                  : "Taxa indisponível neste filtro"}
            </span>
          </article>
        ))}
      </div>
      {!rows.length && <p className={styles.empty}>Sem segmentos neste recorte.</p>}
    </section>
  );
}
export function RecoveryProducts({ data }: { data: RecoveryOverviewData }) {
  const [sort, setSort] = React.useState<"abandoned" | "recovered">("abandoned"),
    [expanded, setExpanded] = React.useState(false);
  const rows = React.useMemo(
    () =>
      [...data.products].sort((a, b) =>
        sort === "abandoned"
          ? b.abandonedCents - a.abandonedCents
          : b.allocatedRecoveredCents - a.allocatedRecoveredCents,
      ),
    [data.products, sort],
  );
  const max = Math.max(
    ...rows.map((p) => (sort === "abandoned" ? p.abandonedCents : p.allocatedRecoveredCents)),
    1,
  );
  return (
    <section className={styles.products} aria-labelledby="recovery-products-title">
      <div className={styles.sectionHead}>
        <div>
          <h2 id="recovery-products-title">Produtos e padrões da cesta</h2>
          <p>Os produtos com maior valor em jogo · ranking por SKU.</p>
        </div>
        <ConceptHelp
          label="Atribuição por produto"
          text="Uma cesta pode conter múltiplos produtos; a soma de casos por SKU não representa pedidos únicos. Receita é alocada proporcionalmente aos valores da cesta abandonada, em centavos com resto exato; não são vendas adicionais."
        />
      </div>
      <div className={styles.toggle}>
        <Button
          size="sm"
          variant={sort === "abandoned" ? "secondary" : "ghost"}
          aria-pressed={sort === "abandoned"}
          onClick={() => setSort("abandoned")}
        >
          Maior valor abandonado
        </Button>
        <Button
          size="sm"
          variant={sort === "recovered" ? "secondary" : "ghost"}
          aria-pressed={sort === "recovered"}
          onClick={() => setSort("recovered")}
        >
          Maior recuperação
        </Button>
      </div>
      <div className={styles.productRanking}>
        {(expanded ? rows : rows.slice(0, 5)).map((p, i) => (
          <article className={styles.productRow} key={p.key}>
            <span className={styles.productIcon} aria-hidden>
              <Package size={22} />
            </span>
            <div className={styles.productIdentity}>
              <h3>
                <span className={styles.productRank}>{String(i + 1).padStart(2, "0")}</span>
                {p.label}
              </h3>
              <span>
                {p.key} · {p.cases} casos / {p.lineItems} linhas
              </span>
            </div>
            <div className={styles.productValue}>
              <strong>
                {recoveryMoney(sort === "abandoned" ? p.abandonedCents : p.allocatedRecoveredCents)}
              </strong>
              <span>{sort === "abandoned" ? "valor abandonado" : "receita alocada"}</span>
              <div className={styles.barTrack}>
                <div
                  className={styles.bar}
                  style={{
                    width: `${((sort === "abandoned" ? p.abandonedCents : p.allocatedRecoveredCents) / max) * 100}%`,
                    background:
                      sort === "abandoned"
                        ? "var(--tracking-data-orange)"
                        : "var(--tracking-data-green)",
                  }}
                />
              </div>
            </div>
            <div className={styles.productRate}>
              <strong>{recoveryPercent(p.recoveryRate)}</strong>
              <span>
                {p.sufficientSample ? `${p.matureCases} maduros` : "Amostra insuficiente"}
              </span>
            </div>
            <ConceptHelp
              label={`Detalhes do produto ${p.label}`}
              text={
                <>
                  <p>
                    {p.recoveredCases} casos recuperados / {p.matureCases} maduros
                  </p>
                  <p>
                    Valor abandonado: {recoveryMoney(p.abandonedCents)}
                    <br />
                    Receita alocada: {recoveryMoney(p.allocatedRecoveredCents)}
                    <br />
                    Tempo médio: {recoveryHours(p.meanHours)}
                  </p>
                  <p>
                    {p.interval
                      ? `IC 95% ${recoveryPercent(p.interval[0])}–${recoveryPercent(p.interval[1])}`
                      : "Taxa indisponível ou amostra insuficiente"}
                  </p>
                </>
              }
            />
          </article>
        ))}
      </div>
      {rows.length > 5 && (
        <Button
          variant="ghost"
          size="sm"
          className={styles.expandProducts}
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}{" "}
          {expanded ? "Mostrar Top 5" : `Ver todos os ${rows.length} produtos`}
        </Button>
      )}
      {!rows.length && <p className={styles.empty}>Sem produtos neste recorte.</p>}
      <p className={styles.note}>
        Casos por produto têm associação múltipla. Receitas alocadas reconciliam com o total
        recuperado.
      </p>
    </section>
  );
}
