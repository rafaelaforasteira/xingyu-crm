import {
  LayoutDashboard,
  Inbox,
  CheckSquare,
  Kanban,
  Zap,
  Megaphone,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Main sidebar order — Contatos/Empresas/Pedidos/lifecycle remain routable via command palette. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/tasks", label: "Tarefas", icon: CheckSquare },
  { href: "/pipelines", label: "Pipelines", icon: Kanban },
  { href: "/automations", label: "Automação", icon: Zap },
  { href: "/marketing", label: "Marketing", icon: Megaphone },
  { href: "/reports", label: "Relatórios", icon: BarChart3 },
  { href: "/settings", label: "Configurações", icon: Settings },
];

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
