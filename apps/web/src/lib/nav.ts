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

/** Grouped sidebar — only real routes. */
export const NAV_GROUPS: NavGroup[] = [
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
    id: "journeys",
    label: "Jornadas",
    items: [
      { href: "/pipelines", label: "Pipelines", icon: Kanban, expandablePipelines: true },
      { href: "/repurchase", label: "Recompra", icon: RefreshCw },
      { href: "/reactivation", label: "Reativação", icon: Sparkles },
      { href: "/orders", label: "E-commerce", icon: Package },
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
