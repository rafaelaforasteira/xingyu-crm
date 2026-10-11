"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import type { RecoveryQuery, RecoverySummary } from "@xingyu/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ConceptHelp } from "../tracking-help";
import { TrackingSelect } from "../tracking-select";
import { CHANNEL_LABELS } from "../channel-origin-config";
import { getRecoveryOpportunities, type RecoveryFilters } from "./recovery-service";
import {
  recoveryMoney,
  recoveryCompactMoney,
  recoveryHours,
  recoveryPercent,
} from "./recovery-format";
import styles from "./recovery.module.css";

export function RecoveryOpportunities({
  filters,
  summary,
}: {
  filters: RecoveryFilters;
  summary: RecoverySummary;
}) {
  const [page, setPage] = React.useState(1),
    [sort, setSort] = React.useState<NonNullable<RecoveryQuery["sort"]>>("priority"),
    [search, setSearch] = React.useState(""),
    [debounced, setDebounced] = React.useState("");
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  React.useEffect(() => setPage(1), [filters, sort]);
  const query = useQuery({
    queryKey: ["tracking", "recovery", "opportunities", filters, page, sort, debounced],
    queryFn: () => getRecoveryOpportunities(filters, { page, sort, search: debounced }),
    placeholderData: (old) => old,
    retry: false,
  });
  const data = query.data;
  return (
    <section
      className={styles.card + " " + styles.opportunities}
      aria-labelledby="recovery-opportunities-title"
      aria-busy={query.isFetching}
    >
      <div className={styles.sectionHead}>
        <div>
          <h2 id="recovery-opportunities-title">Oportunidades em aberto</h2>
          <p>
            Prioridade explicável. Estimativa histórica e previsão de ML são conceitos distintos.
          </p>
        </div>
        <ConceptHelp
          label="Prioridade de recuperação"
          text="Sem modelo READY, ordenação por valor × taxa empírica de clientes do mesmo perfil, com pelo menos 20 casos maduros. Sem essa amostra, ordenação pelo valor. Nenhuma ação operacional está implementada."
        />
      </div>
      <div className={styles.opportunitySummary}>
        <div>
          <span>Valor ainda dentro da janela</span>
          <strong>{recoveryCompactMoney(summary.openCents)}</strong>
        </div>
        <div>
          <strong>{summary.openCases}</strong>
          <span>carrinhos em aberto no recorte</span>
        </div>
        <p>Priorize a próxima oportunidade com contexto, valor e prazo.</p>
      </div>
      <div className={styles.tableControls}>
        <Input
          type="search"
          aria-label="Buscar oportunidade"
          placeholder="Buscar checkout ou cliente"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <TrackingSelect
          id="recovery-opportunity-sort"
          label="Ordenar oportunidades"
          value={sort}
          options={[
            { value: "priority", label: "Potencial histórico / valor" },
            { value: "value", label: "Maior valor" },
            { value: "oldest", label: "Mais antigos" },
            { value: "deadline", label: "Menor janela restante" },
          ]}
          onChange={(v) => setSort(v as typeof sort)}
        />
      </div>
      {query.isError && (
        <div role="alert" className={styles.error}>
          Não foi possível atualizar as oportunidades.{" "}
          <Button size="sm" variant="outline" onClick={() => query.refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}
      {query.isLoading && !data && <Skeleton className="h-56 w-full" />}
      {data && (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Cliente / checkout</th>
                  <th scope="col">Valor / itens</th>
                  <th scope="col">Abandono / tempo</th>
                  <th scope="col">Perfil</th>
                  <th scope="col">Origem</th>
                  <th scope="col">Probabilidade ML</th>
                  <th scope="col">Estimativa histórica</th>
                  <th scope="col">Janela restante</th>
                  <th scope="col">Prioridade / janela</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((c) => (
                  <tr key={c.id}>
                    <th scope="row">
                      {c.customerLabel}
                      <span className={styles.cellNote}>{c.checkoutLabel}</span>
                    </th>
                    <td>
                      {recoveryMoney(c.abandonedCents)}
                      <span className={styles.cellNote}>{c.itemCount} itens</span>
                    </td>
                    <td>
                      {new Intl.DateTimeFormat("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                        day: "2-digit",
                        month: "2-digit",
                      }).format(new Date(c.abandonedAt))}
                      <span className={styles.cellNote}>
                        {recoveryHours(c.ageHours)} desde abandono
                      </span>
                    </td>
                    <td>
                      {c.customerType === "NEW"
                        ? "Novo"
                        : c.customerType === "EXISTING"
                          ? "Base existente"
                          : "Não identificado"}
                    </td>
                    <td>{CHANNEL_LABELS[c.channel]}</td>
                    <td>
                      {c.probability == null ? "—" : recoveryPercent(c.probability * 100)}
                      <span className={styles.cellNote}>
                        {c.probability == null
                          ? "Modelo em aprendizado"
                          : "Valor esperado " + recoveryMoney(c.expectedCents)}
                      </span>
                    </td>
                    <td>
                      {recoveryMoney(c.historicalEstimateCents)}
                      <span className={styles.cellNote}>
                        {c.historicalRate == null
                          ? "Amostra insuficiente"
                          : "Taxa observada " + recoveryPercent(c.historicalRate)}
                      </span>
                    </td>
                    <td>{recoveryHours(c.remainingHours)}</td>
                    <td>
                      <span
                        className={styles.priority}
                        data-urgency={
                          c.remainingHours <= 24
                            ? "high"
                            : c.remainingHours <= 72
                              ? "medium"
                              : "low"
                        }
                      >
                        {c.remainingHours <= 24
                          ? "Alta"
                          : c.remainingHours <= 72
                            ? "Média"
                            : "Baixa"}
                      </span>
                      <span className={styles.cellNote}>
                        {c.priority === "HISTORICAL"
                          ? "Histórica"
                          : c.priority === "VALUE"
                            ? "Valor"
                            : "Preditiva"}
                      </span>
                      <ConceptHelp
                        label={"Prioridade " + c.checkoutLabel}
                        text={
                          c.explanation +
                          " Urgência visual da janela: Alta até 24h restantes; Média até 72h; Baixa acima de 72h. A ordenação analítica permanece a fornecida pelo backend."
                        }
                      />
                      {c.matchAmbiguous && (
                        <span className={styles.cellNote}>Matching ambíguo</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!data.data.length && (
            <p className={styles.empty}>Nenhuma oportunidade em aberto para estes filtros.</p>
          )}
          <div className={styles.pagination}>
            <span>
              {data.meta.total} oportunidades · página {data.meta.page} de {data.meta.pageCount}
              {query.isFetching ? " · Atualizando…" : ""}
            </span>
            <div>
              <Button
                variant="outline"
                size="sm"
                disabled={data.meta.page <= 1 || query.isFetching}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={data.meta.page >= data.meta.pageCount || query.isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}
      <p className={styles.note}>
        Iniciar automação, enviar follow-up e atribuir consultora: disponível em breve.
      </p>
    </section>
  );
}
