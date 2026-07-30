"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import { Headphones, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  occurrencesApi,
  reactivationApi,
  repurchaseApi,
} from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { formatCurrency, formatRelative } from "@/lib/utils";
import { PageHeader, PaginationBar, ErrorBanner } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

function ScoreBadge({ score }: { score: number }) {
  const variant =
    score >= 80 ? "success" : score >= 50 ? "warning" : "secondary";
  return <Badge variant={variant}>{score}</Badge>;
}

export function RepurchasePage() {
  const [page, setPage] = React.useState(1);
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.repurchase({ page }),
    queryFn: () => repurchaseApi.list({ page, pageSize: 20 }),
    retry: false,
  });

  return (
    <div>
      <PageHeader
        title="Recompra"
        description="Contatos com alto potencial de novo pedido."
      />
      {error ? <ErrorBanner message={(error as Error).message} /> : null}
      <ScoreTable
        loading={isLoading}
        emptyIcon={RefreshCw}
        emptyTitle="Nenhuma oportunidade de recompra"
        rows={(data?.data ?? []).map((r) => ({
          id: r.id,
          href: `/contacts/${r.contact.id}`,
          name: r.contact.name,
          score: r.score,
          meta: r.reason || `${r.daysSinceOrder ?? "—"} dias desde o pedido`,
          extra: r.predictedValue != null ? formatCurrency(r.predictedValue) : undefined,
          status: r.status,
        }))}
      />
      {data?.meta ? (
        <PaginationBar
          page={data.meta.page}
          totalPages={data.meta.totalPages}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}

export function ReactivationPage() {
  const [page, setPage] = React.useState(1);
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.reactivation({ page }),
    queryFn: () => reactivationApi.list({ page, pageSize: 20 }),
    retry: false,
  });

  return (
    <div>
      <PageHeader
        title="Reativação"
        description="Base fria e contatos inativos priorizados por score."
      />
      {error ? <ErrorBanner message={(error as Error).message} /> : null}
      <ScoreTable
        loading={isLoading}
        emptyIcon={Sparkles}
        emptyTitle="Nenhuma oportunidade de reativação"
        rows={(data?.data ?? []).map((r) => ({
          id: r.id,
          href: `/contacts/${r.contact.id}`,
          name: r.contact.name,
          score: r.score,
          meta: r.reason || `${r.daysInactive ?? "—"} dias inativo`,
          extra: formatRelative(r.lastInteractionAt),
          status: r.status,
        }))}
      />
      {data?.meta ? (
        <PaginationBar
          page={data.meta.page}
          totalPages={data.meta.totalPages}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}

function ScoreTable({
  loading,
  rows,
  emptyIcon,
  emptyTitle,
}: {
  loading: boolean;
  emptyIcon?: LucideIcon;
  emptyTitle: string;
  rows: {
    id: string;
    href: string;
    name: string;
    score: number;
    meta?: string;
    extra?: string;
    status?: string;
  }[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Contato</th>
            <th className="px-4 py-3 text-left font-medium">Score</th>
            <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Motivo</th>
            <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">Extra</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="px-4 py-3">
                    <Skeleton className="h-7 w-full" />
                  </td>
                </tr>
              ))
            : null}
          {!loading && rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-4">
                <EmptyState icon={emptyIcon} title={emptyTitle} />
              </td>
            </tr>
          ) : null}
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/60 hover:bg-accent/40">
              <td className="px-4 py-3">
                <Link href={r.href} className="font-medium hover:text-primary">
                  {r.name}
                </Link>
              </td>
              <td className="px-4 py-3">
                <ScoreBadge score={r.score} />
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                {r.meta || "—"}
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                {r.extra || "—"}
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline">{r.status || "—"}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AfterSalesPage() {
  const [page, setPage] = React.useState(1);
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.occurrences.list({ page }),
    queryFn: () => occurrencesApi.list({ page, pageSize: 20 }),
    retry: false,
  });

  return (
    <div>
      <PageHeader title="Pós-venda" description="Ocorrências e suporte pós-entrega." />
      {error ? <ErrorBanner message={(error as Error).message} /> : null}
      <div className="space-y-2">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
          : null}
        {!isLoading && (data?.data?.length ?? 0) === 0 ? (
          <EmptyState icon={Headphones} title="Nenhuma ocorrência" />
        ) : null}
        {data?.data?.map((o) => (
          <Link
            key={o.id}
            href={`/after-sales/${o.id}`}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-soft hover:border-primary/30"
          >
            <div>
              <p className="font-medium">{o.title}</p>
              <p className="text-xs text-muted-foreground">
                {o.contact?.name ?? "—"}
                {o.order?.number ? ` · Pedido #${o.order.number}` : ""}
                {` · ${formatRelative(o.openedAt)}`}
              </p>
            </div>
            <div className="flex gap-2">
              {o.priority ? <Badge variant="warning">{o.priority}</Badge> : null}
              <Badge>{o.status}</Badge>
            </div>
          </Link>
        ))}
      </div>
      {data?.meta ? (
        <PaginationBar
          page={data.meta.page}
          totalPages={data.meta.totalPages}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}

export function OccurrenceDetailPage({ occurrenceId }: { occurrenceId: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.occurrences.detail(occurrenceId),
    queryFn: () => occurrencesApi.get(occurrenceId),
    retry: false,
  });

  const update = useMutation({
    mutationFn: (status: string) => occurrencesApi.update(occurrenceId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.occurrences.detail(occurrenceId) });
      queryClient.invalidateQueries({ queryKey: ["occurrences"] });
      toast.success("Ocorrência atualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (error || !data) {
    return <ErrorBanner message={(error as Error)?.message ?? "Ocorrência não encontrada"} />;
  }

  return (
    <div>
      <PageHeader
        title={data.title}
        description={data.type || undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{data.status}</Badge>
            {data.status !== "RESOLVED" && data.status !== "CLOSED" ? (
              <button
                type="button"
                className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent"
                disabled={update.isPending}
                onClick={() => update.mutate("RESOLVED")}
              >
                Marcar resolvida
              </button>
            ) : null}
          </div>
        }
      />
      <Card>
        <CardContent className="space-y-2 py-4 text-sm">
          <Row label="Contato" value={data.contact?.name} />
          <Row
            label="Pedido"
            value={data.order?.number ? `#${data.order.number}` : undefined}
          />
          <Row label="Prioridade" value={data.priority} />
          <Row label="Responsável" value={data.assignee?.name} />
          <Row label="Aberta em" value={formatRelative(data.openedAt)} />
          <div className="pt-2">
            <p className="text-muted-foreground">Descrição</p>
            <p className="mt-1 whitespace-pre-wrap">{data.description || "—"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between border-b border-border/50 py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}
