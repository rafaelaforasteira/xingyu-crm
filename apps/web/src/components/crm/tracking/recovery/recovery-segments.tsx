"use client";
import * as React from "react";
import type { RecoveryOverviewData, RecoverySegment } from "@xingyu/types";
import { Users, Package, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConceptHelp } from "../tracking-help";
import { CHANNEL_LABELS, CHANNEL_COLORS } from "../channel-origin-config";
import { ChannelBrandMark } from "../channel-origin-brand";
import { recoveryMoney, recoveryCompactMoney, recoveryPercent, recoveryHours } from "./recovery-format";
import styles from "./recovery.module.css";
import overview from "../tracking-overview.module.css";
import segments from "./recovery-segment-widgets.module.css";

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
  const groups = [
    {id:"customer",title:"Perfil do cliente",description:"Recuperação por perfil de compra.",rows:data.customerSegments},
    {id:"value",title:"Faixa do carrinho",description:"Resultados por valor do carrinho.",rows:[...data.valueSegments].sort((a,b)=>(b.recoveryRate ?? -1)-(a.recoveryRate ?? -1))},
    {id:"channel",title:"Origem / canal",description:"Receita recuperada por origem de aquisição.",rows:[...data.channels].sort((a,b)=>b.recoveredCents-a.recoveredCents)},
  ];
  return <div className="grid items-start gap-3 xl:grid-cols-3">{groups.map(group=><section key={group.id} className={overview.chartCard} aria-labelledby={"recovery-segment-"+group.id}>
    <h2 id={"recovery-segment-"+group.id} className="flex items-center gap-1 font-semibold">{group.title}<ConceptHelp label={group.title} text="Recuperados ÷ maduros. Intervalo de Wilson de 95%; amostra mínima de 20 maduros para evidenciar padrões. Origem de aquisição não é evidência de método. Sob filtro de resultado, taxas ficam indisponíveis." /></h2>
    <p className="mt-1 mb-4 text-xs text-muted-foreground">{group.description}</p>
    <div className={segments.rows}>{group.rows.map(row=><article key={row.key} className={overview.profileCard + " " + segments.row} style={{"--profile-identity":group.id === "channel" ? CHANNEL_COLORS[row.key as keyof typeof CHANNEL_COLORS] ?? "var(--tracking-data-charcoal)" : row.key === "EXISTING" ? "var(--tracking-data-orange)" : row.key === "NEW" || group.id === "value" ? "var(--tracking-data-blue)" : "var(--tracking-data-charcoal)"} as React.CSSProperties}>
      <div className={overview.profileIdentity}>{group.id === "channel" ? <ChannelBrandMark channel={row.key as keyof typeof CHANNEL_LABELS} size={24} /> : <span className={overview.profileMark + " " + segments.mark}>{group.id === "value" ? <Package size={15} aria-hidden /> : <Users size={15} aria-hidden />}</span>}<h3 className={overview.profileName}>{group.id === "channel" ? CHANNEL_LABELS[row.key as keyof typeof CHANNEL_LABELS] ?? row.label : row.label}</h3><SegmentDetails row={row}/></div>
      <div className={overview.profileMetrics}>
        <strong className={overview.profileBuyers}>{recoveryPercent(row.recoveryRate)}</strong><strong className={overview.profileMoney} title={recoveryMoney(row.recoveredCents)}>{recoveryCompactMoney(row.recoveredCents)}</strong>
        <span className={overview.profileCaption}>Taxa madura</span><span className={overview.profileCaption}>Receita recuperada</span>
        <strong className={segments.secondary}>{row.recoveredCases}</strong><strong className={segments.secondary}>{recoveryHours(row.meanHours)}</strong>
        <span className={overview.profileCaption}>Recuperados</span><span className={overview.profileCaption}>Tempo médio</span>
      </div>
      <p className={segments.sample}>{row.matureCases} maduros / {row.cases} abandonados · {!row.sufficientSample ? "Amostra insuficiente" : row.interval ? "IC 95% " + recoveryPercent(row.interval[0])+"–"+recoveryPercent(row.interval[1]) : "Taxa indisponível neste filtro"}</p>
    </article>)}</div>
    {!group.rows.length && <p className={styles.empty}>Sem segmentos neste recorte.</p>}
  </section>)}</div>;
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
