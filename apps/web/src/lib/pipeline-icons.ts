import {
  Boxes,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Columns3,
  Goal,
  Handshake,
  Headphones,
  Kanban,
  MessageSquare,
  PackageCheck,
  RefreshCw,
  Rocket,
  ShoppingBag,
  ShoppingCart,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";

export const PIPELINE_ICON_OPTIONS = [
  { key: "kanban", label: "Pipeline", icon: Columns3 },
  { key: "briefcase", label: "Negócios", icon: BriefcaseBusiness },
  { key: "target", label: "Metas", icon: Target },
  { key: "sales", label: "Vendas", icon: CircleDollarSign },
  { key: "shopping-cart", label: "Pedidos", icon: ShoppingCart },
  { key: "shopping-bag", label: "Compras", icon: ShoppingBag },
  { key: "package", label: "Entrega", icon: PackageCheck },
  { key: "refresh", label: "Reativação", icon: RefreshCw },
  { key: "users", label: "Clientes", icon: Users },
  { key: "relationship", label: "Relacionamento", icon: Handshake },
  { key: "messages", label: "Comunicação", icon: MessageSquare },
  { key: "support", label: "Atendimento", icon: Headphones },
  { key: "check", label: "Concluído", icon: CheckCircle2 },
  { key: "launch", label: "Lançamento", icon: Rocket },
  { key: "tasks", label: "Tarefas", icon: ClipboardList },
  { key: "portfolio", label: "Portfólio", icon: Boxes },
  { key: "goal", label: "Objetivo", icon: Goal },
] as const;

export const PIPELINE_ICON_KEYS: readonly string[] = PIPELINE_ICON_OPTIONS.map(({ key }) => key);

export const PIPELINE_ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  PIPELINE_ICON_OPTIONS.map(({ key, icon }) => [key, icon]),
);

// Values persisted by the first version of the pipeline form remain supported.
Object.assign(PIPELINE_ICON_MAP, {
  Kanban,
  ShoppingBag,
  Handshake,
  Rocket,
  Headphones,
});

export function resolvePipelineIcon(icon?: string | null): LucideIcon {
  if (!icon) return Columns3;
  return PIPELINE_ICON_MAP[icon] ?? Columns3;
}

export function formatPipelineNavLabel(name: string, index: number): string {
  const padded = String(index).padStart(2, "0");
  return `${padded}. ${name.trim().toUpperCase()}`;
}
