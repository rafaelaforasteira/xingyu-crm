"use client";

import type { CSSProperties } from "react";
import { ConceptHelp } from "./tracking-help";
import { AnimatedMetric } from "./tracking-motion";
import { percentage } from "./tracking-format";

import { journeyBucketAria } from "./journey-analytics";
import { METRIC_DEFINITIONS } from "./tracking-dictionary";
import type { JourneyAnalytics } from "./sales-tracking-types";
import styles from "./channel-origin-section.module.css";
import layout from "./purchase-journey-card.module.css";

const HELP = {
  touchpoints:
    "Quantidade média de interações registradas entre o início da jornada e uma compra válida.",
  channels: "Quantidade média de canais distintos presentes nas jornadas que resultaram em compra.",
  time: "Tempo médio entre a primeira interação registrada e a compra.",
};

function oneDecimal(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function timeToPurchase(value: number | null) {
  return value == null || !Number.isFinite(value) ? "—" : oneDecimal(value) + " dias";
}

export function PurchaseJourneyCard({
  journey,
  animate,
}: {
  journey: JourneyAnalytics;
  animate: boolean;
}) {
  return (
    <section
      className={styles.journeyWidget + " " + layout.widget}
      aria-label="Jornada até a compra"
    >
      <div className={styles.coverageHead}>
        <h3 className={styles.coverageTitle}>Jornada até a compra</h3>
        <ConceptHelp
          hoverOnly
          label="Jornada até a compra"
          text={METRIC_DEFINITIONS.purchaseJourney}
        />
      </div>
      {journey.status === "ready" ? (
        <JourneyBody journey={journey} animate={animate} />
      ) : (
        <p className={styles.coverageHint}>
          {journey.status === "insufficient"
            ? "Dados de jornada insuficientes para este período."
            : "Tracking de jornada ainda não configurado."}
        </p>
      )}
    </section>
  );
}

function JourneyBody({
  journey,
  animate,
}: {
  journey: Extract<JourneyAnalytics, { status: "ready" }>;
  animate: boolean;
}) {
  const metrics = [
    {
      label: "interações por compra",
      value: journey.averageTouchpoints,
      format: oneDecimal,
      help: HELP.touchpoints,
    },
    {
      label: "canais por jornada",
      value: journey.averageChannels,
      format: oneDecimal,
      help: HELP.channels,
    },
    {
      label: "tempo até a compra",
      value: journey.averageTimeToPurchaseDays,
      format: timeToPurchase,
      help: HELP.time,
    },
  ];
  return (
    <div className={layout.body}>
      <div className={layout.metrics}>
        {metrics.map((metric) => (
          <div className={layout.metric} key={metric.label}>
            <p className={layout.value}>
              <AnimatedMetric
                value={metric.value}
                format={metric.format}
                duration={560}
                active={animate}
              />
            </p>
            <p className={layout.label}>
              {metric.label}
              <ConceptHelp
                hoverOnly
                label={metric.label}
                text={metric.help}
                className={styles.journeyHelp}
              />
            </p>
          </div>
        ))}
      </div>
      <div className={layout.chart} aria-label="Distribuição das interações até a compra">
        <div className={layout.stack}>
          {journey.distribution.map((point) => (
            <ConceptHelp
              key={point.bucket}
              hoverOnly
              label={journeyBucketAria(point)}
              text={
                <>
                  <strong>{point.label}</strong>
                  <br />
                  {percentage(point.percentage)} das compras
                </>
              }
              className={layout.segment}
              style={{ flexGrow: Math.max(0, point.percentage) } as CSSProperties}
            >
              <span className={layout.segmentFill} data-bucket={point.bucket} aria-hidden />
            </ConceptHelp>
          ))}
        </div>
        <div className={layout.scale}>
          {journey.distribution.map((point) => (
            <span
              className={layout.scaleLabel}
              key={point.bucket}
              style={{ flexGrow: Math.max(0, point.percentage) }}
            >
              <span className={layout.dot} data-bucket={point.bucket} aria-hidden />
              {point.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
