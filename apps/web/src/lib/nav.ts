import {
  LayoutDashboard,
  Inbox,
  CheckSquare,
  Kanban,
  Zap,
  Megaphone,
  BarChart3,
  Settings,
  Users,
  RefreshCw,
  Sparkles,
  Package,
  HeartHandshake,
  Contact,
  Plug,
  Landmark,
  QrCode,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Optional badge query key hint for real counters */
  countKey?: "openDeals" | "waitingConversations" | "tasksToday";
  /** Match only exact pathname (ignore nested routes) */
  exact?: boolean;
  /** Render expandable pipeline children under this item */
  expandablePipelines?: boolean;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

/** Full navigation — preserved for reactivation when CORE_OPERATION_MODE=false. */
export const FULL_NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    label: "Visão geral",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/pipelines", label: "Negócios", icon: Kanban, countKey: "openDeals", exact: true },
      { href: "/inbox", label: "Conversas", icon: Inbox, countKey: "waitingConversations" },
      { href: "/tasks", label: "Tarefas", icon: CheckSquare, countKey: "tasksToday" },
    ],
  },
  {
    id: "relationships",
    label: "Relacionamento",
    items: [{ href: "/clients", label: "Clientes", icon: UsersRound }],
  },
  {
    id: "journeys",
    label: "Jornadas",
    items: [
      { href: "/pipelines", label: "Pipelines", icon: Kanban, expandablePipelines: true },
      { href: "/repurchase", label: "Recompra", icon: RefreshCw },
      { href: "/reactivation", label: "Reativação", icon: Sparkles },
      { href: "/orders", label: "Pedidos", icon: Package },
      { href: "/after-sales", label: "Pós-venda", icon: HeartHandshake },
    ],
  },
  {
    id: "management",
    label: "Gestão",
    items: [
      { href: "/contacts", label: "Contatos", icon: Contact },
      { href: "/reports", label: "Relatórios", icon: BarChart3 },
      { href: "/settings/users", label: "Equipe", icon: Users },
      { href: "/automations", label: "Automação", icon: Zap },
      { href: "/marketing", label: "Marketing", icon: Megaphone },
      { href: "/settings/integrations", label: "Integrações", icon: Plug },
      { href: "/settings", label: "Configurações", icon: Settings },
    ],
  },
];

/** Legacy operational menu retained for compatibility tests. */
export const CORE_OPERATION_NAV_GROUPS: NavGroup[] = [
  {
    id: "core",
    label: "Principal",
    items: [
      {
        href: "/pipelines",
        label: "Pipelines",
        icon: Kanban,
        countKey: "waitingConversations",
        exact: true,
      },
      { href: "/settings", label: "Configurações", icon: Settings },
    ],
  },
];

/** Official multi-pipeline navigation. */
export const BETA_SINGLE_PIPELINE_NAV_GROUPS: NavGroup[] = [
  {
    id: "beta",
    label: "Principal",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/tasks", label: "Tarefas", icon: CheckSquare },
      {
        href: "/pipelines",
        label: "Pipelines",
        icon: Kanban,
        exact: true,
        expandablePipelines: true,
      },
      { href: "/orders", label: "Pedidos", icon: Package },
    ],
  },
];

/** Compact sidebar grouped by product area; secondary modules remain routable but hidden. */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    label: "Visão geral",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/tasks", label: "Tarefas", icon: CheckSquare },
    ],
  },
  {
    id: "journeys",
    label: "Jornadas",
    items: [
      {
        href: "/pipelines",
        label: "Pipelines",
        icon: Kanban,
        exact: true,
        expandablePipelines: true,
      },
      { href: "/orders", label: "Pedidos", icon: Package },
    ],
  },
  {
    id: "management",
    label: "Gestão",
    items: [
      { href: "/finance", label: "Financeiro", icon: Landmark },
      { href: "/clients", label: "Clientes", icon: UsersRound },
    ],
  },
  {
    id: "infrastructure",
    label: "Infraestrutura",
    items: [
      { href: "/connections", label: "Conexões", icon: QrCode },
      { href: "/integrations", label: "Integrações", icon: Plug },
      { href: "/automations", label: "Automações", icon: Zap },
    ],
  },
];

/** Flat list kept for command palette / legacy helpers. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items).filter(
  (item, index, arr) => arr.findIndex((candidate) => candidate.href === item.href) === index,
);

export const SETTINGS_NAV = [
  { href: "/settings/general", label: "Geral" },
  { href: "/settings/pipelines", label: "Pipelines" },
  { href: "/settings/tasks", label: "Status de tarefas" },
  { href: "/settings/custom-fields", label: "Campos customizados" },
  { href: "/settings/tags", label: "Tags" },
  { href: "/settings/users", label: "Usuários" },
  { href: "/settings/integrations", label: "Integrações" },
  { href: "/settings/teams", label: "Equipes" },
  { href: "/settings/channels", label: "Canais" },
  { href: "/settings/notifications", label: "Notificações" },
];
