"use client";
import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isCrmAdministrator } from "@xingyu/config";
import { ConceptHelp } from "../tracking-help";
import { TrackingMotion, useInViewOnce, useTrackingMotion } from "../tracking-motion";
import { dateBR } from "../tracking-format";
import {
  getRecoveryOverview,
  DEFAULT_RECOVERY_FILTERS,
  type RecoveryFilters,
} from "./recovery-service";
import { RecoveryFiltersPanel } from "./recovery-filters";
import { RecoverySummary } from "./recovery-summary";
import {
  RecoveryMethodBreakdown,
  RecoveryEvolution,
  RecoveryTimeAnalysis,
} from "./recovery-charts";
import { RecoveryIntelligence, RecoveryPrediction } from "./recovery-intelligence";
import { RecoverySegments, RecoveryProducts } from "./recovery-segments";
import { RecoveryOpportunities } from "./recovery-opportunities";
import { RecoveryDataQuality } from "./recovery-data-quality";
import theme from "../tracking-theme.module.css";
import styles from "./recovery.module.css";

export function RecoveryPage() {
  const { user } = useAuth();
  const admin = isCrmAdministrator(user?.role);
  const client = useQueryClient();
  const [filters, setFilters] = React.useState<RecoveryFilters>(DEFAULT_RECOVERY_FILTERS);
  const query = useQuery({
    queryKey: ["tracking", "recovery", "overview", filters],
    queryFn: () => getRecoveryOverview(filters),
    placeholderData: (previous) => previous,
    retry: false,
    enabled: admin,
    staleTime: 60_000,
  });
  const lastValid = React.useRef(query.data);
  React.useEffect(() => {
    if (query.data) lastValid.current = query.data;
  }, [query.data]);
  const data = query.data ?? lastValid.current;
  const refresh = async () => {
    const result = await query.refetch();
    if (!result.isError)
      await client.invalidateQueries({ queryKey: ["tracking", "recovery", "opportunities"] });
  };
  if (!admin) return <p role="status">Recuperação está disponível apenas para administradores.</p>;
  return (
    <div data-module-theme="tracking" className={theme.root + " " + styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.breadcrumb}>
          <h1 className="sr-only">Recuperação de carrinhos</h1>
          <p>
            Tracking <span>/</span> Recuperação
          </p>
          <ConceptHelp
            label="Recuperação de carrinhos"
            text="Entenda abandono, matching com pedidos pagos, métodos de recuperação e oportunidades. Coortes pela data do abandono. Carrinhos imaturos não são falhas de recuperação."
          />
        </div>
        <div className={styles.headActions}>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            data-tracking-control="refresh"
            className="h-9 w-9 rounded-full"
            aria-label="Atualizar recuperação"
            disabled={query.isFetching}
            onClick={refresh}
          >
            <RefreshCw className={query.isFetching ? styles.refresh : ""} size={16} />
          </Button>
          <RecoveryFiltersPanel
            applied={filters}
            onApply={setFilters}
            options={data?.filterOptions}
          />
        </div>
      </div>
      <div className={styles.meta} aria-live="polite">
        {data && (
          <>
            <span>
              {dateBR(data.range.startDate)} → {dateBR(data.range.endDate)} · coorte de abandono
            </span>
            <span className={styles.sourceBadge}>
              {data.source === "demo"
                ? "Dados demonstrativos · não são resultados reais"
                : "Dados normalizados da organização"}
            </span>
            <span>
              {data.timezone} · {data.currency}
            </span>
          </>
        )}
        {query.isFetching && <span>Atualizando análise…</span>}
      </div>
      {query.isError && (
        <div role="alert" className={styles.error}>
          <div>
            <strong>Não foi possível carregar a recuperação.</strong>
            <p>
              {data
                ? "O último recorte permanece visível; a atualização falhou."
                : "Verifique a conexão e tente novamente."}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => query.refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}
      {!data && query.isLoading && <RecoverySkeleton />}
      {data && (
        <TrackingMotion revision={Date.parse(data.updatedAt)}>
          <div className={styles.sections} aria-busy={query.isFetching}>
            <RecoverySummary data={data} />
            {!data.summary.eligibleCases ? (
              <section className={styles.card}>
                <h2>Nenhum carrinho abandonado neste período.</h2>
                <p className={styles.note}>
                  Altere o período ou os filtros para visualizar outra coorte.
                </p>
              </section>
            ) : (
              <>
                {!data.summary.matureCases && (
                  <p className={styles.maturity}>
                    Os carrinhos deste período ainda estão dentro da janela de recuperação.
                  </p>
                )}
                <RecoveryReveal>
                  <RecoveryIntelligence data={data} />
                </RecoveryReveal>
                <RecoveryReveal>
                  <RecoveryMethodBreakdown data={data} />
                </RecoveryReveal>
                <RecoveryReveal>
                  <div className={styles.twoColumns}>
                    <RecoveryEvolution data={data} />
                    <RecoveryTimeAnalysis data={data} />
                  </div>
                </RecoveryReveal>
                <RecoveryReveal>
                  <RecoverySegments data={data} />
                </RecoveryReveal>
                <RecoveryReveal>
                  <RecoveryProducts data={data} />
                </RecoveryReveal>
              </>
            )}
            <RecoveryReveal>
              <RecoveryPrediction data={data} />
            </RecoveryReveal>
            <RecoveryReveal>
              <RecoveryOpportunities
                key={JSON.stringify(filters)}
                filters={filters}
                summary={data.summary}
              />
            </RecoveryReveal>
            <RecoveryReveal>
              <RecoveryDataQuality data={data} />
            </RecoveryReveal>
          </div>
        </TrackingMotion>
      )}
    </div>
  );
}
function RecoveryReveal({ children }: { children: React.ReactNode }) {
  const { ref, seen } = useInViewOnce<HTMLDivElement>(0.12);
  const motion = useTrackingMotion();
  return (
    <div
      ref={ref}
      className={styles.reveal}
      data-revealed={seen}
      data-motion={motion.reduced || !motion.initial ? "off" : "on"}
    >
      {children}
    </div>
  );
}
function RecoverySkeleton() {
  return (
    <div aria-label="Carregando recuperação" className={styles.sections}>
      <div className={styles.kpiGrid}>
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-80 w-full rounded-xl" />
      <div className={styles.twoColumns}>
        <Skeleton className="h-80 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}
