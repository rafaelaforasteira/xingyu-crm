"use client";

import * as React from "react";
import { EllipsisVertical, HeartHandshake, Pencil, Truck, ShieldCheck, ShoppingCart, Undo2, BadgeDollarSign, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-controls";
import { PageHeader } from "@/components/crm/page-header";

const STORAGE_KEY = "xingyu:journey-pipelines";

type PipelineItem = { href: string; name: string; description: string; color: string; icon: LucideIcon; stages: number; context: string };

const orderItems: PipelineItem[] = [
  { href: "/orders?pipeline=ecommerce", name: "E-commerce", description: "Pedidos criados no site, recuperação e confirmação do pagamento.", color: "#8B5CF6", icon: ShoppingCart, stages: 5, context: "pedidos" },
  { href: "/orders?pipeline=operation", name: "Envio", description: "Conferência, produção, transporte internacional e entrega.", color: "#06B6D4", icon: Truck, stages: 10, context: "pedidos pagos" },
];

const attendanceItems: PipelineItem[] = [
  { href: "/after-sales?pipeline=post-sale", name: "Pós-venda", description: "Relacionamento, satisfação e acompanhamento após a entrega.", color: "#10B981", icon: HeartHandshake, stages: 5, context: "conversas" },
  { href: "/after-sales?pipeline=warranty", name: "Garantia e assistência", description: "Análise de defeitos, avarias e solicitações de assistência.", color: "#F59E0B", icon: ShieldCheck, stages: 5, context: "atendimentos" },
  { href: "/after-sales?pipeline=returns", name: "Trocas e devoluções", description: "Solicitação, análise, coleta, reenvio e conclusão.", color: "#3B82F6", icon: Undo2, stages: 5, context: "atendimentos" },
  { href: "/after-sales?pipeline=refunds", name: "Reembolsos", description: "Solicitação, aprovação, processamento e confirmação financeira.", color: "#EC4899", icon: BadgeDollarSign, stages: 4, context: "atendimentos" },
];

export function JourneyPipelinesOverview({ space }: { space: "orders" | "attendance" }) {
  const router = useRouter();
  const defaults = space === "orders" ? orderItems : attendanceItems;
  const [custom, setCustom] = React.useState<Record<string, { name?: string; color?: string }>>({});
  const [editing, setEditing] = React.useState<PipelineItem | null>(null);
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState("#8B5CF6");

  React.useEffect(() => {
    try { setCustom(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")); } catch { setCustom({}); }
  }, []);

  const openEdit = (item: PipelineItem) => {
    setEditing(item); setName(custom[item.href]?.name ?? item.name); setColor(custom[item.href]?.color ?? item.color);
  };
  const save = () => {
    if (!editing) return;
    const next = { ...custom, [editing.href]: { name: name.trim() || editing.name, color } };
    setCustom(next); localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("xingyu:journey-pipelines-updated")); setEditing(null);
  };

  return <div><PageHeader title={space === "orders" ? "Pedidos" : "Atendimento"} description={space === "orders" ? "Escolha o pipeline da jornada do pedido." : "Escolha o pipeline de relacionamento e suporte ao cliente."} />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{defaults.map((item, index) => { const Icon = item.icon; const config = custom[item.href] ?? {}; const displayName = config.name ?? item.name; const displayColor = config.color ?? item.color; return <Card key={item.href} role="link" tabIndex={0} className="cursor-pointer transition hover:border-primary/30 hover:shadow-soft" onClick={() => router.push(item.href)} onKeyDown={(event) => { if (event.key === "Enter") router.push(item.href); }}><CardHeader className="flex-row items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white shadow-sm" style={{ backgroundColor: displayColor }}><Icon className="h-5 w-5" /></div><div><p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Pipeline {String(index + 1).padStart(2, "0")}</p><CardTitle className="mt-1">{displayName}</CardTitle><span className="mt-2 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Ativo</span></div></div><Button size="icon" variant="ghost" aria-label={`Editar ${displayName}`} onClick={(event) => { event.stopPropagation(); openEdit(item); }}><EllipsisVertical className="h-4 w-4" /></Button></CardHeader><CardContent><p className="min-h-10 text-sm text-muted-foreground">{item.description}</p><div className="mt-4 grid grid-cols-2 divide-x rounded-lg border bg-muted/30 py-2"><div className="text-center"><strong className="block text-sm">{item.stages}</strong><span className="text-[11px] text-muted-foreground">etapas</span></div><div className="text-center"><strong className="block text-sm">—</strong><span className="text-[11px] text-muted-foreground">{item.context}</span></div></div><div className="mt-4 flex items-center justify-between border-t pt-4 text-xs"><span className="text-muted-foreground">Ordem {index + 1}</span><span className="font-medium text-primary">Abrir pipeline</span></div></CardContent></Card>; })}</div>
    <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)} title="Editar pipeline" description="Altere o nome e a cor exibidos neste espaço."><div className="space-y-4"><div><Label>Nome</Label><Input value={name} onChange={(event) => setName(event.target.value)} /></div><div><Label>Cor do ícone</Label><div className="flex items-center gap-3"><input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-10 w-14 cursor-pointer rounded-lg border bg-background p-1"/><Input value={color} onChange={(event) => setColor(event.target.value)} /></div></div><div className="flex justify-end gap-2 border-t pt-4"><Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button><Button onClick={save}><Pencil className="h-4 w-4" />Salvar</Button></div></div></Dialog>
  </div>;
}
