"use client";

import type { CSSProperties } from "react";
import { ConceptHelp } from "./tracking-help";
import { AnimatedMetric } from "./tracking-motion";
import { percentage } from "./tracking-format";
import { COVERAGE_COLORS } from "./channel-origin-model";
import { journeyBucketAria } from "./journey-analytics";
import { METRIC_DEFINITIONS } from "./tracking-dictionary";
import type { JourneyAnalytics } from "./sales-tracking-types";
import styles from "./channel-origin-section.module.css";

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
    <div className={styles.insightCard + " " + styles.journeyCard}>
      <div className={styles.coverageHead}>
        <h3 className={styles.coverageTitle}>Jornada até a compra</h3>
        <ConceptHelp label="Jornada até a compra" text={METRIC_DEFINITIONS.purchaseJourney} />
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
    </div>
  );
}

function JourneyBody({
  journey,
  animate,
}: {
  journey: Extract<JourneyAnalytics, { status: "ready" }>;
  animate: boolean;
}) {
  return (
    <div className={styles.journey}>
      <div className={styles.journeyKpis}>
        <p className={styles.journeyValue}>
          <AnimatedMetric
            value={journey.averageTouchpoints}
            format={oneDecimal}
            duration={650}
            active={animate}
          />
        </p>
        <p className={styles.journeyValue + " " + styles.journeyChannels}>
          <AnimatedMetric
            value={journey.averageChannels}
            format={oneDecimal}
            duration={560}
            active={animate}
          />
        </p>
        <p className={styles.journeyValue + " " + styles.journeyTime}>
          <AnimatedMetric
            value={journey.averageTimeToPurchaseDays}
            format={timeToPurchase}
            duration={560}
            active={animate}
          />
        </p>
        <p className={styles.journeySupport}>
          interações por compra
          <ConceptHelp
            label="Média de interações até a compra"
            text={HELP.touchpoints}
            className={styles.journeyHelp}
          />
        </p>
        <p className={styles.journeyStatLabel + " " + styles.journeyChannelsLabel}>
          Canais por jornada
          <ConceptHelp label="Canais por jornada" text={HELP.channels} className={styles.journeyHelp} />
        </p>
        <p className={styles.journeyStatLabel + " " + styles.journeyTimeLabel}>
          Tempo até a compra
          <ConceptHelp label="Tempo até a compra" text={HELP.time} className={styles.journeyHelp} />
        </p>
      </div>
      <div className={styles.journeyDistribution}>
        <p className={styles.journeyDistributionTitle}>Interações antes da compra</p>
        <ul className={styles.journeyBars}>
          {journey.distribution.map((point, index) => (
            <li key={point.bucket} className={styles.journeyRow}>
              <span className={styles.journeyBarLabel}>{point.label}</span>
              <span className={styles.journeyTrack}>
                <span
                  className={styles.journeyFill}
                  style={
                    {
                      "--share": Math.max(0, Math.min(100, point.percentage)) + "%",
                      "--stagger": index,
                      background: COVERAGE_COLORS.identified,
                    } as CSSProperties
                  }
                  aria-hidden
                />
              </span>
              <span className={styles.journeyPercent} aria-label={journeyBucketAria(point)}>
                {percentage(point.percentage)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

