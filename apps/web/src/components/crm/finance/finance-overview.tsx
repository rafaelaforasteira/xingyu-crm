"use client";

import type React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  Banknote,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  Landmark,
  ReceiptText,
  Scale,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FinanceWorkspace } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const compactMoney = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const DEMO_FINANCE = {
  metrics: {
    grossRevenue: 184750,
    netSales: 161980,
    received: 128640,
    receivable: 33340,
    overdue: 8760,
    discounts: 6450,
    shipping: 9840,
    taxes: 13120,
    cancelled: 3200,
    refunded: 3200,
    orderCount: 327,
  },
  timeline: [
    { label: "Semana 1", gross: 38500, net: 33900, received: 27600 },
    { label: "Semana 2", gross: 42800, net: 37200, received: 30100 },
    { label: "Semana 3", gross: 47300, net: 41580, received: 32940 },
    { label: "Semana 4", gross: 56150, net: 49300, received: 38000 },
  ],
  methods: [
    { method: "Pix", amount: 61747.2, count: 142, color: "#7c3aed" },
    { method: "Cartão de crédito", amount: 43737.6, count: 96, color: "#2563eb" },
    { method: "Boleto", amount: 15436.8, count: 31, color: "#10b981" },
    { method: "Transferência", amount: 7718.4, count: 18, color: "#f59e0b" },
  ],
  forecast: [
    { label: "Próximos 7 dias", amount: 12480, count: 14 },
    { label: "Próximos 15 dias", amount: 21930, count: 27 },
    { label: "Próximos 30 dias", amount: 33340, count: 42 },
  ],
  issues: [
    { order: "#DASH-2048", text: "Pagamento não conciliado", amount: 4890, age: "Há 2 dias", action: "Conciliar", tab: "closing" },
    { order: "#DASH-2017", text: "Parcela vencida", amount: 2740, age: "Há 5 dias", action: "Ver cobrança", tab: "receivables" },
    { order: "#DASH-1986", text: "Estorno aguardando confirmação", amount: 1130, age: "Há 1 dia", action: "Revisar", tab: "closing" },
  ],
} as const;

function SummaryMetric({ label, value, note, variation, icon: Icon, tone = "primary" }: {
  label: string;
  value: string;
  note: string;
  variation: string;
  icon: typeof CircleDollarSign;
  tone?: "primary" | "positive" | "warning";
}) {
  return (
    <Card className="overflow-hidden border-border/80 shadow-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
            <p className={cn("mt-2 whitespace-nowrap text-xl font-semibold tracking-tight 2xl:text-2xl", tone === "positive" && "text-emerald-700", tone === "warning" && "text-amber-700")}>{value}</p>
          </div>
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary", tone === "positive" && "bg-emerald-50 text-emerald-700", tone === "warning" && "bg-amber-50 text-amber-700")}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
          <span className="truncate text-muted-foreground">{note}</span>
          <span className="flex shrink-0 items-center gap-1 font-semibold text-emerald-700"><TrendingUp className="h-3 w-3" />{variation}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{title}</h2><p className="mt-0.5 text-xs text-muted-foreground">{description}</p></div>{action}</div>;
}

export function FinanceOverview({ data }: { data: FinanceWorkspace }) {
  const hasRealMovement = data.metrics.orderCount > 0 || data.revenueTimeline.some((item) => item.gross || item.net || item.received);
  const metrics = hasRealMovement ? data.metrics : DEMO_FINANCE.metrics;
  const timeline = hasRealMovement && data.revenueTimeline.length ? data.revenueTimeline.slice(-12) : [...DEMO_FINANCE.timeline];
  const methods = hasRealMovement && data.paymentMethods.length
    ? data.paymentMethods.map((item, index) => ({ method: item.method, amount: item.amount, count: item.count, color: ["#7c3aed", "#2563eb", "#10b981", "#f59e0b"][index % 4] }))
    : [...DEMO_FINANCE.methods];
  const methodTotal = methods.reduce((sum, item) => sum + item.amount, 0) || 1;
  const isDemo = !hasRealMovement;

  return (
    <div className="space-y-4">
      {isDemo ? <div className="flex items-center justify-between rounded-lg border border-primary/15 bg-primary/[0.035] px-3 py-2 text-xs"><span className="text-muted-foreground">Dados demonstrativos para avaliação visual</span><Badge variant="outline">Simulação</Badge></div> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric label="Vendas no período" value={money(metrics.grossRevenue)} note={`${metrics.orderCount} pedidos`} variation="12,4%" icon={ShoppingBag} />
        <SummaryMetric label="Receita líquida" value={money(metrics.netSales)} note={`${money(metrics.discounts)} em ajustes`} variation="9,8%" icon={Landmark} />
        <SummaryMetric label="Recebido" value={money(metrics.received)} note={`${((metrics.received / Math.max(metrics.netSales, 1)) * 100).toFixed(1).replace(".", ",")}% da receita líquida`} variation="7,2%" icon={Banknote} tone="positive" />
        <SummaryMetric label="A receber" value={money(metrics.receivable)} note="42 cobranças pendentes" variation="4,1%" icon={CalendarClock} tone="warning" />
      </div>

      {metrics.overdue > 0 ? <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50/70 px-4 py-3 sm:flex-row sm:items-center"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700"><AlertTriangle className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-red-950">8 cobranças vencidas totalizam {money(metrics.overdue)}</p><p className="text-xs text-red-800/70">Existem valores que precisam de acompanhamento financeiro.</p></div><Link className={buttonVariants({ variant: "outline", size: "sm", className: "border-red-200 bg-white text-red-700 hover:bg-red-50" })} href="/finance?tab=receivables">Ver pendências <ArrowRight className="h-3.5 w-3.5" /></Link></div> : null}

      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.75fr]">
        <section className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-soft">
          <SectionHeader title="Movimento financeiro" description="Compare vendas, receita líquida e valores recebidos ao longo do período." action={<div className="hidden rounded-lg bg-muted p-1 text-[11px] sm:flex"><span className="rounded-md bg-card px-2.5 py-1 font-medium shadow-sm">Semanal</span><span className="px-2.5 py-1 text-muted-foreground">Mensal</span></div>} />
          <div className="mt-4 h-[260px] w-full" aria-label="Gráfico do movimento financeiro">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <defs><linearGradient id="financeGross" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7c3aed" stopOpacity={0.22}/><stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.18} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={compactMoney} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={70} />
                <Tooltip formatter={(value: number, name: string) => [money(Number(value)), name]} contentStyle={{ borderRadius: 12, borderColor: "hsl(var(--border))", fontSize: 12 }} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="gross" name="Vendas" stroke="#7c3aed" fill="url(#financeGross)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="net" name="Receita líquida" stroke="#2563eb" fill="transparent" strokeWidth={2.25} />
                <Area type="monotone" dataKey="received" name="Recebido" stroke="#10b981" fill="transparent" strokeWidth={2.25} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-soft">
          <SectionHeader title="Formas de pagamento" description="Participação de cada meio nos valores recebidos." />
          <div className="mt-2 grid items-center gap-1 sm:grid-cols-[180px_1fr] xl:grid-cols-1 2xl:grid-cols-[170px_1fr]">
            <div className="relative mx-auto h-[170px] w-[170px]">
              <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={methods} dataKey="amount" nameKey="method" innerRadius={52} outerRadius={75} paddingAngle={3}>{methods.map((item) => <Cell key={item.method} fill={item.color} />)}</Pie><Tooltip formatter={(value: number) => money(Number(value))} contentStyle={{ borderRadius: 12, fontSize: 12 }} /></PieChart></ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-[10px] uppercase tracking-wide text-muted-foreground">Recebido</span><strong className="text-sm">{compactMoney(metrics.received)}</strong></div>
            </div>
            <div className="space-y-2.5">{methods.map((item) => <div key={item.method} className="flex items-center gap-2 text-xs"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} /><div className="min-w-0 flex-1"><p className="truncate font-medium">{item.method}</p><p className="text-[10px] text-muted-foreground">{item.count} pagamentos</p></div><div className="text-right"><p className="font-semibold tabular-nums">{Math.round((item.amount / methodTotal) * 100)}%</p><p className="text-[10px] text-muted-foreground">{compactMoney(item.amount)}</p></div></div>)}</div>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-xl border border-border bg-card p-4 shadow-soft">
          <SectionHeader title="Previsão de recebimentos" description="Valores previstos conforme o vencimento das cobranças abertas." />
          <div className="mt-4 grid gap-2 sm:grid-cols-3">{DEMO_FINANCE.forecast.map((item, index) => <div key={item.label} className="rounded-lg border border-border/70 bg-muted/20 p-3"><div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{item.label}</p><Clock3 className="h-3.5 w-3.5 text-primary" /></div><p className="mt-2 text-lg font-semibold tabular-nums">{money(item.amount)}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{item.count} cobranças</p><div className="mt-3 h-1 overflow-hidden rounded-full bg-primary/10"><div className="h-full rounded-full bg-primary" style={{ width: `${[38, 66, 100][index]}%` }} /></div></div>)}</div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4 shadow-soft">
          <SectionHeader title="Fechamento do período" description="Conferência financeira antes de concluir o mês." action={<FileCheck2 className="h-5 w-5 text-primary" />} />
          <div className="mt-4 space-y-2 text-xs"><div className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2.5 text-amber-900"><span className="font-semibold">3 pendências antes do fechamento</span><AlertTriangle className="h-4 w-4" /></div><div className="flex items-center gap-2 text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />2 pagamentos sem conciliação</div><div className="flex items-center gap-2 text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />1 cobrança sem responsável</div><div className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />Nenhuma divergência fiscal</div></div>
          <Link className={buttonVariants({ size: "sm", className: "mt-4 w-full" })} href="/finance?tab=closing">Revisar pendências <ArrowRight className="h-3.5 w-3.5" /></Link>
        </section>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{[
        { label: "Frete cobrado", value: metrics.shipping, note: "5,3% das vendas", icon: WalletCards },
        { label: "Impostos registrados", value: metrics.taxes, note: "7,1% das vendas", icon: Scale },
        { label: "Descontos concedidos", value: metrics.discounts, note: "3,5% das vendas", icon: BadgeDollarSign },
        { label: "Cancelamentos e estornos", value: metrics.cancelled, note: "1,7% · 9 pedidos", icon: TrendingDown },
      ].map((item) => <div key={item.label} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-soft"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary"><item.icon className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-[11px] text-muted-foreground">{item.label}</p><p className="font-semibold tabular-nums">{money(item.value)}</p><p className="text-[10px] text-muted-foreground">{item.note}</p></div></div>)}</div>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <div className="border-b border-border/70 p-4"><SectionHeader title="Pendências que exigem atenção" description="Itens prioritários para manter o financeiro em dia." action={<Link className={buttonVariants({ variant: "ghost", size: "sm" })} href="/finance?tab=receivables">Ver todas <ArrowRight className="h-3.5 w-3.5" /></Link>} /></div>
        <div className="divide-y divide-border/70">{DEMO_FINANCE.issues.map((issue, index) => <div key={issue.order} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"><span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", index === 1 ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600")}><ReceiptText className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{issue.order}</strong><span className="text-xs text-muted-foreground">{issue.text}</span></div><p className="mt-0.5 text-[11px] text-muted-foreground">{issue.age}</p></div><strong className="text-sm tabular-nums">{money(issue.amount)}</strong><Link className={buttonVariants({ variant: "outline", size: "sm" })} href={`/finance?tab=${issue.tab}`}>{issue.action}</Link></div>)}</div>
      </section>
    </div>
  );
}
