"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart } from "lucide-react";
import { ordersApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ClientRelativeTime } from "@/components/ui/client-relative-time";
import { PageHeader, PaginationBar, ErrorBanner } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select } from "@/components/ui/form-controls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function OrdersPage() {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.orders.list({ page, search, status }),
    queryFn: () =>
      ordersApi.list({
        page,
        pageSize: 20,
        search: search || undefined,
        status: status || undefined,
      }),
    retry: false,
  });

  return (
    <div>
      <PageHeader title="Pedidos" description="Acompanhamento logístico e financeiro." />
      {error ? <ErrorBanner message={(error as Error).message} /> : null}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input
          className="sm:max-w-sm"
          placeholder="Buscar pedido…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Select
          className="sm:w-56"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos os status</option>
          <option value="ORDER_PLACED">Pedido feito</option>
          <option value="AWAITING_PAYMENT">Aguardando pagamento</option>
          <option value="IN_PRODUCTION">Em produção</option>
          <option value="INTERNATIONAL_TRANSPORT">Transporte internacional</option>
          <option value="DELIVERED">Entregue</option>
          <option value="COMPLETED">Concluído</option>
        </Select>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Pedido</th>
              <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Cliente</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Total</th>
              <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">Data</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="px-4 py-3">
                      <Skeleton className="h-7 w-full" />
                    </td>
                  </tr>
                ))
              : null}
            {!isLoading && (data?.data?.length ?? 0) === 0 ? (
              <tr>
                <td colSpan={5} className="p-4">
                  <EmptyState icon={ShoppingCart} title="Nenhum pedido" />
                </td>
              </tr>
            ) : null}
            {data?.data?.map((o) => (
              <tr key={o.id} className="border-b border-border/60 hover:bg-accent/40">
                <td className="px-4 py-3">
                  <Link href={`/orders/${o.id}`} className="font-medium hover:text-primary">
                    #{o.number}
                  </Link>
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  {o.contact?.name ?? o.company?.name ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">{o.status}</Badge>
                </td>
                <td className="px-4 py-3">{formatCurrency(o.total)}</td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  {formatDate(o.placedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

export function OrderDetailPage({ orderId }: { orderId: string }) {
  const order = useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => ordersApi.get(orderId),
    retry: false,
  });
  const timeline = useQuery({
    queryKey: ["orders", orderId, "timeline"],
    queryFn: () => ordersApi.timeline(orderId),
    retry: false,
  });

  if (order.isLoading) return <Skeleton className="h-48 w-full" />;
  if (order.isError || !order.data) {
    return <ErrorBanner message={(order.error as Error)?.message ?? "Pedido não encontrado"} />;
  }

  const o = order.data;
  const events = timeline.data ?? o.timeline ?? [];

  return (
    <div>
      <PageHeader
        title={`Pedido #${o.number}`}
        description={`${o.contact?.name ?? o.company?.name ?? "Cliente"} · ${formatCurrency(o.total)}`}
        actions={<Badge>{o.status}</Badge>}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Itens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(o.items ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem itens retornados pela API.</p>
            ) : (
              o.items?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border-b border-border/50 py-2 text-sm last:border-0"
                >
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  <p className="font-medium">{formatCurrency(item.total)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem eventos.</p>
            ) : (
              events.map((e) => (
                <div key={e.id} className="relative border-l-2 border-primary/30 pl-4">
                  <p className="text-sm font-medium">{e.title}</p>
                  {e.description ? (
                    <p className="text-xs text-muted-foreground">{e.description}</p>
                  ) : null}
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    <ClientRelativeTime value={e.createdAt} />
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
