import {
  LayoutDashboard,
  Inbox,
  Users,
  Building2,
  Kanban,
  CheckSquare,
  ShoppingCart,
  RefreshCw,
  Sparkles,
  Headphones,
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

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/contacts", label: "Contatos", icon: Users },
  { href: "/companies", label: "Empresas", icon: Building2 },
  { href: "/pipelines", label: "Pipelines", icon: Kanban },
  { href: "/tasks", label: "Tarefas", icon: CheckSquare },
  { href: "/orders", label: "Pedidos", icon: ShoppingCart },
  { href: "/repurchase", label: "Recompra", icon: RefreshCw },
  { href: "/reactivation", label: "Reativação", icon: Sparkles },
  { href: "/after-sales", label: "Pós-venda", icon: Headphones },
  { href: "/automations", label: "Automações", icon: Zap },
  { href: "/marketing", label: "Marketing", icon: Megaphone },
  { href: "/reports", label: "Relatórios", icon: BarChart3 },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export const SETTINGS_NAV = [
  { href: "/settings", label: "Geral" },
  { href: "/settings/teams", label: "Equipes" },
  { href: "/settings/users", label: "Usuários" },
  { href: "/settings/pipelines", label: "Pipelines" },
  { href: "/settings/channels", label: "Canais" },
  { href: "/settings/integrations", label: "Integrações" },
  { href: "/settings/notifications", label: "Notificações" },
];
