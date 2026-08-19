"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BadgeDollarSign,
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  Download,
  FileCheck2,
  Landmark,
  ReceiptText,
  Scale,
  TrendingDown,
  WalletCards,
} from "lucide-react";
import { financeApi } from "@/lib/api";
import type { FinanceRevenueRow, FinanceWorkspace } from "@/lib/types";
import { PageHeader, ErrorBanner } from "@/components/crm/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type FinanceTab = "overview" | "revenue" | "receivables" | "commissions" | "closing";

const tabs: Array<{ value: FinanceTab; label: string }> = [
  { value: "overview", label: "Visão geral" },
  { value: "revenue", label: "Receitas" },
  { value: "receivables", label: "Contas a receber" },
  { value: "commissions", label: "Comissões" },
  { value: "closing", label: "Conciliação e fechamento" },
];

const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const date = (value?: string | null) =>
  value ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(value)) : "—";
const paymentMethods: Record<string, string> = {
  PIX: "Pix",
  CREDIT_CARD: "Cartão de crédito",
  BOLETO: "Boleto",
  BANK_TRANSFER: "Transferência",
  CASH: "Dinheiro",
  OTHER: "Outro",
};

function statusLabel(row: FinanceRevenueRow) {
  if (row.orderStatus === "CANCELLED") return { label: "Cancelado", variant: "destructive" as const };
  if (row.isOverdue) return { label: "Vencido", variant: "destructive" as const };
  if (row.openAmount <= 0) return { label: "Pago", variant: "success" as const };
  if (row.paidAmount > 0) return { label: "Pagamento parcial", variant: "warning" as const };
  return { label: "Aguardando pagamento", variant: "outline" as const };
}

function Metric({ label, value, note, icon: Icon, tone = "default" }: {
  label: string;
  value: string;
  note: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "positive" | "warning";
}) {
  return (
    <Card className="overflow-hidden border-border/80 shadow-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
            <p className={cn("mt-2 truncate text-2xl font-semibold tracking-tight", tone === "positive" && "text-primary", tone === "warning" && "text-amber-600")}>{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{note}</p>
          </div>
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary", tone === "warning" && "bg-amber-50 text-amber-600")}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function FinancialTable({ rows, empty }: { rows: FinanceRevenueRow[]; empty: string }) {
  if (!rows.length) return <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">{empty}</div>;
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[980px] text-sm">
        <thead className="border-b bg-muted/30 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left">Pedido</th><th className="px-4 py-3 text-left">Competência</th><th className="px-4 py-3 text-left">Responsável</th><th className="px-4 py-3 text-right">Bruto</th><th className="px-4 py-3 text-right">Desconto</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Recebido</th><th className="px-4 py-3 text-right">Em aberto</th><th className="px-4 py-3 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const status = statusLabel(row);
            return (
              <tr key={row.id} className="border-b border-border/70 last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3"><Link className="font-semibold text-primary hover:underline" href={`/orders?order=${row.id}`}>#{row.number}</Link><p className="mt-0.5 text-[11px] text-muted-foreground">{paymentMethods[row.paymentMethod ?? ""] ?? "Sem método"}</p></td>
                <td className="px-4 py-3 text-muted-foreground">{date(row.orderedAt)}</td>
                <td className="px-4 py-3"><div className="flex items-center gap-2"><Avatar name={row.owner?.name ?? "Sem responsável"} src={row.owner?.avatarUrl ?? undefined} size="sm" /><span>{row.owner?.name ?? "Sem responsável"}</span></div></td>
                <td className="px-4 py-3 text-right tabular-nums">{money(row.grossValue)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{row.discount ? `− ${money(row.discount)}` : "—"}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">{money(row.finalValue)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-emerald-700">{money(row.paidAmount)}</td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">{money(row.openAmount)}</td>
                <td className="px-4 py-3"><Badge variant={status.variant}>{status.label}</Badge></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function downloadCsv(data: FinanceWorkspace, tab: FinanceTab) {
  const rows = tab === "receivables" ? data.receivables : data.revenues;
  const header = ["Pedido", "Competência", "Responsável", "Valor bruto", "Desconto", "Frete", "Impostos", "Total", "Recebido", "Em aberto", "Forma de pagamento"];
  const body = rows.map((row) => [row.number, row.orderedAt.slice(0, 10), row.owner?.name ?? "", row.grossValue, row.discount, row.shippingCost, row.taxes, row.finalValue, row.paidAmount, row.openAmount, paymentMethods[row.paymentMethod ?? ""] ?? ""]);
  const csv = [header, ...body].map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `financeiro-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function FinancePage() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const requested = params.get("tab") as FinanceTab | null;
  const tab = tabs.some((item) => item.value === requested) ? requested! : "overview";
  const period = params.get("period") ?? "month";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const replace = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(changes).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };
  const workspace = useQuery({
    queryKey: ["finance", "workspace", period, from, to],
    queryFn: () => financeApi.workspace({ period, from: from || undefined, to: to || undefined }),
    retry: false,
  });
  const data = workspace.data;

  return (
    <div className="mx-auto w-full max-w-[1560px] space-y-5" data-testid="finance-workspace">
      <PageHeader title="Financeiro" description="Receitas, recebíveis, comissões e fechamento contábil em um único espaço." actions={data ? <Button variant="outline" onClick={() => downloadCsv(data, tab)}><Download className="h-4 w-4" />Exportar CSV</Button> : null} />
      <section className="rounded-xl border border-border bg-card p-3 shadow-soft">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-3">
            <div><Label>Período</Label><Select value={period} onChange={(event) => replace({ period: event.target.value, from: null, to: null })}><option value="today">Hoje</option><option value="7d">Últimos 7 dias</option><option value="30d">Últimos 30 dias</option><option value="month">Este mês</option><option value="previous-month">Mês anterior</option><option value="custom">Personalizado</option></Select></div>
            {period === "custom" ? <><div><Label>Início</Label><Input type="date" value={from} onChange={(event) => replace({ from: event.target.value || null })} /></div><div><Label>Fim</Label><Input type="date" value={to} onChange={(event) => replace({ to: event.target.value || null })} /></div></> : <div className="sm:col-span-2 flex items-end"><p className="pb-2 text-xs text-muted-foreground">Visão por competência do pedido. Recebimentos são conciliados pelos pagamentos associados.</p></div>}
          </div>
          {data ? <Badge variant={data.closing.ready ? "success" : "warning"} className="mb-1 w-fit">{data.closing.ready ? "Período pronto para fechar" : "Período com pendências"}</Badge> : null}
        </div>
      </section>
      <Tabs value={tab} onValueChange={(value) => replace({ tab: value === "overview" ? null : value })}>
        <TabsList className="h-auto max-w-full flex-wrap justify-start">{tabs.map((item) => <TabsTrigger key={item.value} value={item.value}>{item.label}</TabsTrigger>)}</TabsList>
        {workspace.error ? <ErrorBanner message={(workspace.error as Error).message} /> : null}
        {workspace.isLoading ? <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-28" />)}</div> : null}
        {data ? <>
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Faturamento bruto" value={money(data.metrics.grossRevenue)} note={`${data.metrics.orderCount} pedidos no período`} icon={CircleDollarSign} /><Metric label="Receita líquida de vendas" value={money(data.metrics.netSales)} note={`${money(data.metrics.discounts)} em descontos`} icon={Landmark} tone="positive" /><Metric label="Recebido" value={money(data.metrics.received)} note={`${money(data.metrics.receivable)} ainda a receber`} icon={Banknote} tone="positive" /><Metric label="Vencido" value={money(data.metrics.overdue)} note="Valores que exigem ação" icon={AlertTriangle} tone={data.metrics.overdue > 0 ? "warning" : "default"} /><Metric label="Frete cobrado" value={money(data.metrics.shipping)} note="Componente da receita" icon={WalletCards} /><Metric label="Impostos registrados" value={money(data.metrics.taxes)} note="Conforme dados dos pedidos" icon={Scale} /><Metric label="Cancelamentos" value={money(data.metrics.cancelled)} note={`${money(data.metrics.refunded)} estornado`} icon={TrendingDown} /><Metric label="Descontos concedidos" value={money(data.metrics.discounts)} note="Cupons e descontos manuais" icon={BadgeDollarSign} /></div>
            <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
              <section className="rounded-xl border bg-card p-4"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">Movimento do período</h2><p className="text-xs text-muted-foreground">Receita líquida e valores efetivamente recebidos.</p></div></div><div className="space-y-3">{data.revenueTimeline.length ? data.revenueTimeline.slice(-12).map((item) => { const max = Math.max(...data.revenueTimeline.map((row) => row.net), 1); return <div key={item.label} className="grid grid-cols-[78px_1fr_100px] items-center gap-3 text-xs"><span className="text-muted-foreground">{date(item.label)}</span><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max((item.net / max) * 100, item.net ? 4 : 0)}%` }} /></div><span className="text-right font-medium tabular-nums">{money(item.net)}</span></div>; }) : <p className="py-12 text-center text-sm text-muted-foreground">Sem movimentos neste período.</p>}</div></section>
              <section className="rounded-xl border bg-card p-4"><h2 className="font-semibold">Formas de pagamento</h2><p className="mb-4 text-xs text-muted-foreground">Volume informado nos pagamentos.</p><div className="space-y-3">{data.paymentMethods.map((method) => <div key={method.method} className="flex items-center justify-between border-b pb-3 last:border-0"><div><p className="text-sm font-medium">{paymentMethods[method.method] ?? method.method}</p><p className="text-xs text-muted-foreground">{method.count} lançamento(s)</p></div><p className="font-semibold tabular-nums">{money(method.amount)}</p></div>)}</div></section>
            </div>
          </TabsContent>
          <TabsContent value="revenue"><FinancialTable rows={data.revenues} empty="Nenhuma receita registrada no período." /></TabsContent>
          <TabsContent value="receivables" className="space-y-3"><div className="grid gap-3 sm:grid-cols-3"><Metric label="Total em aberto" value={money(data.metrics.receivable)} note={`${data.receivables.length} título(s)`} icon={ReceiptText} /><Metric label="Vencido" value={money(data.metrics.overdue)} note="Prioridade de cobrança" icon={AlertTriangle} tone="warning" /><Metric label="Recebido" value={money(data.metrics.received)} note="Pagamentos aprovados" icon={CheckCircle2} tone="positive" /></div><FinancialTable rows={data.receivables} empty="Não há contas a receber neste período." /></TabsContent>
          <TabsContent value="commissions" className="space-y-4"><div className="rounded-xl border border-primary/15 bg-primary/[0.035] p-4"><div className="flex gap-3"><BadgeDollarSign className="mt-0.5 h-5 w-5 text-primary" /><div><h2 className="font-semibold">Base de apuração de comissões</h2><p className="mt-1 text-sm text-muted-foreground">A base considera pagamentos aprovados, descontando estornos. Nenhum percentual foi presumido: as regras de comissão ainda precisam ser cadastradas.</p></div></div></div><div className="grid gap-3 lg:grid-cols-2">{data.commissions.map((row) => <Card key={row.ownerId ?? "unassigned"}><CardContent className="p-4"><div className="flex items-center gap-3"><Avatar name={row.ownerName} src={row.avatarUrl ?? undefined} /><div className="min-w-0 flex-1"><p className="font-semibold">{row.ownerName}</p><p className="text-xs text-muted-foreground">{row.orders} venda(s) elegível(is)</p></div><Badge variant="outline">Regra pendente</Badge></div><div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-muted/35 p-3"><div><p className="text-[11px] uppercase text-muted-foreground">Base elegível</p><p className="mt-1 font-semibold text-primary">{money(row.eligibleRevenue)}</p></div><div><p className="text-[11px] uppercase text-muted-foreground">Comissão calculada</p><p className="mt-1 font-semibold">A configurar</p></div></div></CardContent></Card>)}</div>{!data.commissions.length ? <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">Nenhuma venda paga compõe a base de comissão neste período.</div> : null}</TabsContent>
          <TabsContent value="closing" className="space-y-4"><div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]"><section className="rounded-xl border bg-card p-4"><div className="flex items-start justify-between"><div><h2 className="font-semibold">Checklist de fechamento</h2><p className="text-xs text-muted-foreground">Pendências que impedem uma conferência limpa.</p></div><FileCheck2 className="h-5 w-5 text-primary" /></div><div className="mt-4 space-y-2">{[{label:"Divergências de valor",value:data.closing.divergences},{label:"Pedidos sem conciliação",value:data.closing.pendingReconciliation},{label:"Pagamentos sem comprovante",value:data.closing.missingReceipts}].map((item) => <div key={item.label} className="flex items-center justify-between rounded-lg border px-3 py-2.5"><span className="text-sm">{item.label}</span><Badge variant={item.value ? "warning" : "success"}>{item.value ? `${item.value} pendência(s)` : "Conferido"}</Badge></div>)}</div></section><section className="overflow-hidden rounded-xl border bg-card"><div className="border-b p-4"><h2 className="font-semibold">Conciliação por pedido</h2><p className="text-xs text-muted-foreground">Valor esperado comparado aos pagamentos aprovados.</p></div><div className="max-h-[420px] overflow-auto"><table className="w-full min-w-[620px] text-sm"><thead className="sticky top-0 border-b bg-muted/90 text-xs text-muted-foreground"><tr><th className="px-4 py-3 text-left">Pedido</th><th className="px-4 py-3 text-right">Esperado</th><th className="px-4 py-3 text-right">Recebido</th><th className="px-4 py-3 text-right">Diferença</th><th className="px-4 py-3 text-left">Situação</th></tr></thead><tbody>{data.reconciliation.map((row) => <tr key={row.orderId} className="border-b last:border-0"><td className="px-4 py-3"><Link className="font-semibold text-primary hover:underline" href={`/orders?order=${row.orderId}`}>#{row.orderNumber}</Link></td><td className="px-4 py-3 text-right">{money(row.expected)}</td><td className="px-4 py-3 text-right">{money(row.received)}</td><td className="px-4 py-3 text-right font-medium">{money(row.difference)}</td><td className="px-4 py-3"><Badge variant={row.status === "MATCHED" ? "success" : row.status === "DIVERGENT" ? "warning" : "outline"}>{row.status === "MATCHED" ? "Conciliado" : row.status === "DIVERGENT" ? "Divergente" : "Pendente"}</Badge></td></tr>)}</tbody></table></div></section></div></TabsContent>
        </> : null}
      </Tabs>
    </div>
  );
}
