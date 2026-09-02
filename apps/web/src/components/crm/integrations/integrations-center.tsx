"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  CircleAlert,
  Megaphone,
  PackageSearch,
  Search,
  ShoppingBag,
  Webhook,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { canOpenPath } from "@/lib/access-policy";
import { cn } from "@/lib/utils";

type IntegrationCategory = "Todas" | "E-commerce" | "Marketing" | "Automação" | "Logística";
type IntegrationStatus = "Configurar" | "Atenção" | "Operacional" | "Em breve";

interface IntegrationItem {
  id: string;
  name: string;
  category: Exclude<IntegrationCategory, "Todas"> | "Desenvolvimento";
  status: IntegrationStatus;
  description: string;
  icon: LucideIcon;
  iconClassName: string;
  action: string;
  disabled?: boolean;
}

const integrations: IntegrationItem[] = [
  {
    id: "shopify",
    name: "Shopify",
    category: "E-commerce",
    status: "Configurar",
    description: "Sincroniza clientes, pedidos, produtos e pagamentos da loja.",
    icon: ShoppingBag,
    iconClassName: "bg-emerald-100 text-emerald-700",
    action: "Conectar Shopify",
  },
  {
    id: "n8n",
    name: "n8n",
    category: "Automação",
    status: "Atenção",
    description: "Orquestra workflows, webhooks e tarefas entre sistemas.",
    icon: Workflow,
    iconClassName: "bg-orange-100 text-orange-700",
    action: "Ver diagnóstico",
  },
  {
    id: "meta-ads",
    name: "Meta Ads",
    category: "Marketing",
    status: "Operacional",
    description: "Importa campanhas, investimento, leads e conversões.",
    icon: Megaphone,
    iconClassName: "bg-blue-100 text-blue-700",
    action: "Gerenciar",
  },
  {
    id: "google-analytics",
    name: "Google Analytics",
    category: "Marketing",
    status: "Operacional",
    description: "Relaciona origem, campanha e conversão dos clientes.",
    icon: BarChart3,
    iconClassName: "bg-amber-100 text-amber-700",
    action: "Gerenciar",
  },
  {
    id: "tracking",
    name: "Rastreamento",
    category: "Logística",
    status: "Em breve",
    description: "Receberá eventos de postagem, trânsito, entrega e ocorrências.",
    icon: PackageSearch,
    iconClassName: "bg-violet-100 text-violet-700",
    action: "Configuração futura",
    disabled: true,
  },
  {
    id: "api-webhooks",
    name: "API e Webhooks",
    category: "Desenvolvimento",
    status: "Operacional",
    description: "Central de eventos, endpoints e chaves de serviço do CRM.",
    icon: Webhook,
    iconClassName: "bg-slate-100 text-slate-700",
    action: "Abrir central",
  },
];

const categories: IntegrationCategory[] = ["Todas", "E-commerce", "Marketing", "Automação", "Logística"];

export function IntegrationsCenter() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [category, setCategory] = React.useState<IntegrationCategory>("Todas");
  const [search, setSearch] = React.useState("");

  const allowed = canOpenPath(user, "/integrations");

  React.useEffect(() => {
    if (!isLoading && !allowed) router.replace("/dashboard");
  }, [allowed, isLoading, router]);

  const visibleIntegrations = React.useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
    return integrations.filter((integration) => {
      const matchesCategory = category === "Todas" || integration.category === category;
      const matchesSearch =
        !normalizedSearch ||
        `${integration.name} ${integration.category} ${integration.description}`
          .toLocaleLowerCase("pt-BR")
          .includes(normalizedSearch);
      return matchesCategory && matchesSearch;
    });
  }, [category, search]);

  if (isLoading || !allowed) {
    return <Skeleton className="mx-auto h-72 w-full max-w-7xl" />;
  }

  const handleIntegrationAction = (integration: IntegrationItem) => {
    const messages: Record<string, string> = {
      shopify: "O fluxo seguro de conexão com a Shopify será aberto aqui.",
      n8n: "O diagnóstico do n8n será conectado aos logs reais da operação.",
      "meta-ads": "A gestão da conta Meta Ads será conectada nesta etapa.",
      "google-analytics": "A gestão do Google Analytics será conectada nesta etapa.",
      "api-webhooks": "A central técnica de API e webhooks será habilitada nesta área.",
    };
    toast.info(messages[integration.id] ?? "Integração planejada para uma próxima etapa.");
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 pb-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Integrações</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Serviços, dados e automações da operação Xingyu.
        </p>
      </header>

      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-1.5 overflow-x-auto pb-1 lg:pb-0" role="tablist" aria-label="Categorias">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={category === item}
              onClick={() => setCategory(item)}
              className={cn(
                "h-8 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors",
                category === item
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar integração"
            aria-label="Buscar integração"
            className="pl-9"
          />
        </div>
      </section>

      {visibleIntegrations.length ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleIntegrations.map((integration) => (
            <IntegrationCard key={integration.id} integration={integration} onAction={handleIntegrationAction} />
          ))}
        </section>
      ) : (
        <section className="rounded-xl border border-dashed border-border px-6 py-14 text-center">
          <Search className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <h2 className="mt-3 text-sm font-semibold">Nenhuma integração encontrada</h2>
          <p className="mt-1 text-xs text-muted-foreground">Tente outro nome ou categoria.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => { setSearch(""); setCategory("Todas"); }}>
            Limpar filtros
          </Button>
        </section>
      )}

      <ActivityPanel />
    </div>
  );
}

function IntegrationCard({ integration, onAction }: { integration: IntegrationItem; onAction: (integration: IntegrationItem) => void }) {
  const Icon = integration.icon;
  return (
    <article className="flex min-h-[158px] flex-col rounded-xl border border-border/80 bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex min-w-0 items-center gap-3">
        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", integration.iconClassName)}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{integration.name}</h2>
          <p className="text-xs text-muted-foreground">{integration.category}</p>
        </div>
      </div>

      <Button
        variant="outline"
        className="mt-auto w-full"
        disabled={integration.disabled}
        onClick={() => onAction(integration)}
      >
        {integration.action}
      </Button>
    </article>
  );
}

function ActivityPanel() {
  const events = [
    { icon: CheckCircle2, color: "text-emerald-600", title: "Google Analytics sincronizado", time: "Há 7 min" },
    { icon: CheckCircle2, color: "text-emerald-600", title: "Meta Ads sincronizado", time: "Há 12 min" },
    { icon: CircleAlert, color: "text-amber-600", title: "Falha em workflow do n8n", time: "Há 18 min" },
  ];
  return (
    <section className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Atualizações recentes</h2>
      </div>
      <div className="mt-3 grid gap-2 lg:grid-cols-3">
        {events.map((event) => {
          const Icon = event.icon;
          return <div key={event.title} className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/45 px-3 py-2.5"><Icon className={cn("h-4 w-4 shrink-0", event.color)} /><p className="min-w-0 flex-1 truncate text-xs font-medium">{event.title}</p><span className="shrink-0 text-[11px] text-muted-foreground">{event.time}</span></div>;
        })}
      </div>
    </section>
  );
}
