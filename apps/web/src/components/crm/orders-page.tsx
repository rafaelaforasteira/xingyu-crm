"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DndContext, PointerSensor, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ExternalLink, Kanban, List, Package, Search, Settings2, Truck } from "lucide-react";
import { toast } from "sonner";
import { ordersApi, settingsApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Order, OrderStageDefinition } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader, PaginationBar, ErrorBanner } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label, Select } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/auth/auth-provider";

type Locale = "pt-BR" | "en" | "zh-CN" | "zh-HK";
const copy = {
  "pt-BR": { title: "Pedidos", subtitle: "Acompanhe e gerencie a operação dos pedidos.", kanban: "Kanban", list: "Lista", search: "Buscar número, cliente, SKU ou tracking…", filters: "Todos", configure: "Configurar etapas", empty: "Nenhum pedido neste recorte", owner: "Responsável", due: "Prazo" },
  en: { title: "Orders", subtitle: "Track and manage order operations.", kanban: "Board", list: "List", search: "Search number, customer, SKU or tracking…", filters: "All", configure: "Configure stages", empty: "No orders in this view", owner: "Owner", due: "Due" },
  "zh-CN": { title: "订单", subtitle: "跟踪并管理订单运营。", kanban: "看板", list: "列表", search: "搜索订单、客户、SKU或物流…", filters: "全部", configure: "配置阶段", empty: "暂无订单", owner: "负责人", due: "截止日期" },
  "zh-HK": { title: "訂單", subtitle: "追蹤及管理訂單營運。", kanban: "看板", list: "清單", search: "搜尋訂單、客戶、SKU或物流…", filters: "全部", configure: "設定階段", empty: "暫無訂單", owner: "負責人", due: "截止日期" },
};
const stageName = (stage: OrderStageDefinition, locale: Locale) => stage.translations?.[locale] || stage.name;
const customer = (order: Order) => order.customerNameSnapshot || order.contact?.name || order.company?.name || "—";
const total = (order: Order) => Number(order.finalValue ?? order.total ?? 0);

function OrderCard({ order, onOpen }: { order: Order; onOpen: () => void }) {
  const drag = useDraggable({ id: order.id, data: { order } });
  return <article ref={drag.setNodeRef} {...drag.listeners} {...drag.attributes} onClick={onOpen} className="cursor-grab rounded-xl border bg-card p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" style={{ opacity: drag.isDragging ? .45 : 1 }}>
    <div className="flex items-center justify-between"><strong className="text-sm">#{order.externalName || order.number}</strong>{order.operationalIssue ? <AlertTriangle className="h-4 w-4 text-destructive" /> : null}</div>
    <p className="mt-1 truncate text-xs text-muted-foreground">{customer(order)}</p>
    <div className="mt-3 flex flex-wrap gap-1"><Badge variant="outline">{order.financialStatus || order.status}</Badge>{order.fulfillmentStatus ? <Badge variant="secondary">{order.fulfillmentStatus}</Badge> : null}</div>
    <div className="mt-3 flex items-center justify-between text-xs"><span>{formatCurrency(total(order), order.currency)}</span><span className="text-muted-foreground">{order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0} un.</span></div>
    {order.shipments?.[0]?.trackingCode || order.currentLocation ? <p className="mt-2 truncate text-[11px] text-muted-foreground"><Truck className="mr-1 inline h-3 w-3" />{order.currentLocation || order.shipments?.[0]?.trackingCode}</p> : null}
  </article>;
}
function Column({ stage, orders, locale, onOpen }: { stage: OrderStageDefinition; orders: Order[]; locale: Locale; onOpen: (order: Order) => void }) {
  const drop = useDroppable({ id: stage.id });
  return <section ref={drop.setNodeRef} className="w-[290px] shrink-0 rounded-2xl bg-muted/35 p-2 ring-1 ring-border"><header className="mb-2 flex items-center gap-2 px-1 py-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: stage.color }} /><h2 className="min-w-0 flex-1 truncate text-xs font-bold uppercase">{stageName(stage, locale)}</h2><Badge variant="outline">{orders.length}</Badge></header><div className="space-y-2">{orders.map((order) => <OrderCard key={order.id} order={order} onOpen={() => onOpen(order)} />)}</div></section>;
}

export function OrdersPage() {
  const { user } = useAuth();
  const router = useRouter(); const params = useSearchParams(); const client = useQueryClient();
  const view = params.get("view") === "list" ? "list" : "kanban"; const [locale, setLocale] = React.useState<Locale>("pt-BR"); const t = copy[locale];
  const [search, setSearch] = React.useState(params.get("q") || ""); const [debounced, setDebounced] = React.useState(search); const [selected, setSelected] = React.useState<Order | null>(null); const [configure, setConfigure] = React.useState(false); const page = Number(params.get("page") || 1);
  const replace = (changes: Record<string, string | null>) => { const next = new URLSearchParams(params.toString()); Object.entries(changes).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key)); router.replace(`/orders?${next}`); };
  React.useEffect(() => { const timer = setTimeout(() => { setDebounced(search); replace({ q: search || null, page: null }); }, 250); return () => clearTimeout(timer); }, [search]);
  const stages = useQuery({ queryKey: ["orders", "stages"], queryFn: () => ordersApi.stages() });
  const orders = useQuery({ queryKey: queryKeys.orders.list({ page, search: debounced }), queryFn: () => ordersApi.list({ page, pageSize: view === "kanban" ? 100 : 30, search: debounced || undefined }) });
  const users = useQuery({ queryKey: ["settings", "users", "orders"], queryFn: () => settingsApi.users() });
  const refresh = () => { void client.invalidateQueries({ queryKey: ["orders"] }); };
  const update = useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<Order> }) => ordersApi.update(id, data), onSuccess: refresh, onError: (error: Error) => toast.error(error.message) });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const onDragEnd = (event: DragEndEvent) => { const id = String(event.active.id); const stageId = event.over?.id ? String(event.over.id) : null; const order = orders.data?.data.find((item) => item.id === id); if (order && stageId && order.operationalStageId !== stageId) update.mutate({ id, data: { operationalStageId: stageId } }); };
  const list = orders.data?.data ?? [];
  React.useEffect(() => {
    const orderId = params.get("order");
    if (!orderId || selected) return;
    const match = list.find((item) => item.id === orderId);
    if (match) setSelected(match);
    else void ordersApi.get(orderId).then(setSelected).catch(() => undefined);
  }, [list, params, selected]);
  return <div><PageHeader title={t.title} description={t.subtitle} actions={<div className="flex gap-2">{user?.role === "ADMIN" ? <Button variant="outline" onClick={() => setConfigure(true)}><Settings2 className="h-4 w-4" />{t.configure}</Button> : null}<Select aria-label="Idioma de Pedidos" value={locale} onChange={(e) => setLocale(e.target.value as Locale)}><option value="pt-BR">Português</option><option value="en">English</option><option value="zh-CN">简体中文</option><option value="zh-HK">繁體中文 / 粵語</option></Select></div>} />
    <div className="mb-4 flex flex-wrap gap-2"><Tabs value={view} onValueChange={(value) => replace({ view: value === "kanban" ? null : value })}><TabsList><TabsTrigger value="kanban"><Kanban className="mr-1 h-4 w-4" />{t.kanban}</TabsTrigger><TabsTrigger value="list"><List className="mr-1 h-4 w-4" />{t.list}</TabsTrigger></TabsList></Tabs><div className="relative min-w-[240px] flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.search} /></div></div>
    {orders.error || stages.error ? <ErrorBanner message={String((orders.error || stages.error) as Error)} /> : null}{orders.isLoading ? <Skeleton className="h-80 w-full" /> : null}
    {!orders.isLoading && !list.length ? <EmptyState icon={Package} title={t.empty} /> : null}
    {view === "kanban" && list.length ? <DndContext sensors={sensors} onDragEnd={onDragEnd}><div className="flex gap-3 overflow-x-auto pb-4">{(stages.data ?? []).map((stage) => <Column key={stage.id} stage={stage} locale={locale} orders={list.filter((order) => order.operationalStageId === stage.id || (!order.operationalStageId && stage.isInitial))} onOpen={setSelected} />)}</div></DndContext> : null}
    {view === "list" && list.length ? <div className="overflow-x-auto rounded-xl border bg-card"><table className="w-full text-sm"><thead className="bg-muted/50 text-xs uppercase"><tr><th className="p-3 text-left">Pedido</th><th className="p-3 text-left">Cliente</th><th className="p-3 text-left">Etapa</th><th className="p-3 text-left">Pagamento</th><th className="p-3 text-left">Tracking</th><th className="p-3 text-right">Total</th></tr></thead><tbody>{list.map((order) => <tr key={order.id} className="cursor-pointer border-t hover:bg-muted/30" onClick={() => setSelected(order)}><td className="p-3 font-medium">#{order.externalName || order.number}</td><td className="p-3">{customer(order)}</td><td className="p-3"><Badge style={{ borderColor: order.operationalStage?.color }}>{order.operationalStage ? stageName(order.operationalStage, locale) : "—"}</Badge></td><td className="p-3">{order.financialStatus || order.status}</td><td className="p-3">{order.shipments?.[0]?.trackingCode || "—"}</td><td className="p-3 text-right">{formatCurrency(total(order), order.currency)}</td></tr>)}</tbody></table></div> : null}
    {view === "list" && orders.data?.meta ? <PaginationBar page={orders.data.meta.page} totalPages={orders.data.meta.totalPages} onPageChange={(value) => replace({ page: String(value) })} /> : null}
    <OrderWorkspace order={selected} open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }} stages={stages.data ?? []} users={users.data ?? []} locale={locale} onUpdate={(data) => selected && update.mutate({ id: selected.id, data })} />
    <StagesDialog open={configure} onOpenChange={setConfigure} stages={stages.data ?? []} onChanged={refresh} />
  </div>;
}

function OrderWorkspace({ order, open, onOpenChange, stages, users, locale, onUpdate }: { order: Order | null; open: boolean; onOpenChange: (v: boolean) => void; stages: OrderStageDefinition[]; users: Array<{ id: string; name: string }>; locale: Locale; onUpdate: (data: Partial<Order>) => void }) {
  const detail = useQuery({ queryKey: ["orders", order?.id, "workspace"], queryFn: () => ordersApi.get(order!.id), enabled: open && Boolean(order) }); const value = detail.data ?? order;
  return <Dialog open={open} onOpenChange={onOpenChange} title={value ? `#${value.externalName || value.number}` : "Pedido"} description={value ? `${customer(value)} · ${formatCurrency(total(value), value.currency)}` : ""} wide className="max-h-[92vh] max-w-6xl overflow-y-auto">{value ? <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]"><main className="space-y-5"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-muted/40 p-3"><span className="text-xs text-muted-foreground">Pagamento</span><p className="font-semibold">{value.financialStatus || value.status}</p></div><div className="rounded-xl bg-muted/40 p-3"><span className="text-xs text-muted-foreground">Fulfillment</span><p className="font-semibold">{value.fulfillmentStatus || "—"}</p></div><div className="rounded-xl bg-muted/40 p-3"><span className="text-xs text-muted-foreground">Origem</span><p className="font-semibold">{value.source || value.channel || "Manual"}</p></div></div><section><h3 className="mb-2 font-semibold">Itens</h3>{value.items?.map((item) => <div key={item.id} className="flex justify-between border-b py-2 text-sm"><span>{item.quantity} × {item.productName}<small className="ml-2 text-muted-foreground">{item.sku}</small></span><strong>{formatCurrency(Number(item.totalPrice ?? item.total ?? 0), value.currency)}</strong></div>)}</section><section><h3 className="mb-2 font-semibold">Logística</h3>{value.shipments?.length ? value.shipments.map((shipment) => <div key={shipment.id} className="rounded-lg border p-3 text-sm"><Truck className="mr-2 inline h-4 w-4" />{shipment.carrier || "Transportadora"} · {shipment.trackingCode || "Sem tracking"} · {shipment.status}</div>) : <p className="text-sm text-muted-foreground">Nenhum envio registrado.</p>}</section><section><h3 className="mb-2 font-semibold">Histórico</h3>{value.events?.map((event) => <div key={event.id} className="border-l-2 border-primary/30 py-1 pl-3 text-sm"><strong>{event.title}</strong><p className="text-xs text-muted-foreground">{formatDate(event.occurredAt)}</p></div>)}</section></main><aside className="space-y-3 rounded-xl bg-muted/30 p-4"><div><Label>Etapa operacional</Label><Select value={value.operationalStageId ?? ""} onChange={(e) => onUpdate({ operationalStageId: e.target.value })}>{stages.map((stage) => <option key={stage.id} value={stage.id}>{stageName(stage, locale)}</option>)}</Select></div><div><Label>Responsável operacional</Label><Select value={value.operationalAssigneeId ?? ""} onChange={(e) => onUpdate({ operationalAssigneeId: e.target.value })}><option value="">Sem responsável</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</Select></div><div><Label>Prioridade</Label><Select value={value.operationalPriority || "MEDIUM"} onChange={(e) => onUpdate({ operationalPriority: e.target.value })}><option value="LOW">Baixa</option><option value="MEDIUM">Normal</option><option value="HIGH">Alta</option><option value="URGENT">Urgente</option></Select></div><div><Label>Prazo</Label><Input type="date" value={value.operationalDueAt?.slice(0,10) || ""} onChange={(e) => onUpdate({ operationalDueAt: e.target.value ? new Date(`${e.target.value}T12:00`).toISOString() : null })} /></div><div><Label>Localização atual</Label><Input defaultValue={value.currentLocation || ""} onBlur={(e) => onUpdate({ currentLocation: e.target.value })} /></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(value.operationalIssue)} onChange={(e) => onUpdate({ operationalIssue: e.target.checked })} />Problema / pendência</label>{value.externalUrl ? <a href={value.externalUrl} target="_blank" className="flex items-center gap-2 text-sm text-primary"><ExternalLink className="h-4 w-4" />Abrir na Shopify</a> : null}{value.deal ? <Link className="text-sm text-primary" href={`/pipelines/${value.deal.pipelineId}/deals/${value.deal.id}`}>Lead #{String(value.deal.leadSequence || "—").padStart(4,"0")}</Link> : <p className="text-xs text-muted-foreground">Sem card comercial vinculado</p>}</aside></div> : null}</Dialog>;
}

function StagesDialog({ open, onOpenChange, stages, onChanged }: { open: boolean; onOpenChange: (v: boolean) => void; stages: OrderStageDefinition[]; onChanged: () => void }) {
  const [name, setName] = React.useState(""); const create = useMutation({ mutationFn: () => ordersApi.createStage({ name, category: "IN_PROGRESS" }), onSuccess: () => { setName(""); onChanged(); }, onError: (error: Error) => toast.error(error.message) });
  return <Dialog open={open} onOpenChange={onOpenChange} title="Configurar etapas" description="Workflow operacional independente dos pipelines comerciais" wide><div className="space-y-2">{stages.map((stage) => <div key={stage.id} className="flex items-center gap-2 rounded-lg border p-2"><input type="color" value={stage.color} onChange={(e) => void ordersApi.updateStage(stage.id, { color: e.target.value }).then(onChanged)} /><span className="flex-1 text-sm">{stage.name}</span><Badge>{stage.category}</Badge><Button size="sm" variant="ghost" onClick={() => void ordersApi.updateStage(stage.id, { archived: true }).then(onChanged)}>Arquivar</Button></div>)}<div className="flex gap-2 pt-3"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nova etapa" /><Button disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>Adicionar</Button></div></div></Dialog>;
}

export function OrderDetailPage({ orderId }: { orderId: string }) { const router = useRouter(); React.useEffect(() => router.replace(`/orders?order=${orderId}`), [orderId, router]); return <Skeleton className="h-48 w-full" />; }
