"use client";

import type { CSSProperties } from "react";
import { Radar, Repeat2, UserRoundCheck, type LucideIcon } from "lucide-react";
import { trackingActionInsights, type TrackingActionInsight } from "./tracking-action-insights";
import type { SalesTrackingData } from "./sales-tracking-types";
import styles from "./tracking-executive.module.css";

const ICONS: Record<TrackingActionInsight["id"], LucideIcon> = {
  "repurchase-window": Repeat2,
  reactivation: UserRoundCheck,
  "attribution-gap": Radar,
};

export function TrackingActionInsights({ data }: { data: SalesTrackingData }) {
  const insights = trackingActionInsights(data);
  if (!insights.length) return null;
  return (
    <section aria-labelledby="tracking-action-insights-title">
      <header className={styles.sectionHead}>
        <h2 id="tracking-action-insights-title" className={styles.sectionTitle}>
          O que fazer agora
        </h2>
        <p className={styles.sectionText}>Sinais do período que merecem sua atenção.</p>
      </header>
      <div className={styles.insightGrid}>
        {insights.map((insight, index) => (
          <InsightCard key={insight.id} insight={insight} index={index} />
        ))}
      </div>
    </section>
  );
}

function InsightCard({ insight, index }: { insight: TrackingActionInsight; index: number }) {
  const Icon = ICONS[insight.id] ?? Radar;
  return (
    <article
      className={styles.insight}
      data-tone={insight.tone}
      data-action={insight.id}
      style={{ "--delay": `${index * 50}ms` } as CSSProperties}
    >
      <div className={styles.insightHead}>
        <span className={styles.icon}>
          <Icon size={15} aria-hidden="true" />
        </span>
        <p className={styles.eyebrow}>{insight.eyebrow}</p>
      </div>
      <h3 className={styles.insightTitle}>{insight.title}</h3>
      <p className={styles.insightText}>{insight.description}</p>
      <p className={styles.comingSoon}>Disponível em breve</p>
    </article>
  );
}
