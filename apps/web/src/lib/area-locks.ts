/**
 * Áreas da plataforma liberadas para uso durante o desenvolvimento por etapas.
 *
 * Tudo o que não pertence a uma área liberada aparece com cadeado no menu e,
 * se aberto por link direto, mostra a tela de "área bloqueada". O código das
 * áreas bloqueadas continua intacto; só o acesso pela interface fica fechado.
 *
 * Para liberar uma área, adicione o id dela em UNLOCKED_AREAS.
 *
 * Importante: isto é um bloqueio de navegação na interface, não um controle de
 * segurança. Permissões reais continuam sendo validadas pela API.
 */

export type AreaId =
  | "pipelines"
  | "dashboard"
  | "inbox"
  | "tasks"
  | "clients"
  | "contacts"
  | "companies"
  | "repurchase"
  | "reactivation"
  | "orders"
  | "afterSales"
  | "tracking"
  | "finance"
  | "reports"
  | "automations"
  | "marketing"
  | "connections"
  | "integrations"
  | "settings";

export const AREAS: Record<AreaId, { label: string; paths: readonly string[] }> = {
  pipelines: { label: "Pipelines", paths: ["/pipelines", "/operacao"] },
  dashboard: { label: "Dados", paths: ["/dashboard"] },
  inbox: { label: "Conversas", paths: ["/inbox"] },
  tasks: { label: "Tarefas", paths: ["/tasks"] },
  clients: { label: "Clientes", paths: ["/clients"] },
  contacts: { label: "Contatos", paths: ["/contacts"] },
  companies: { label: "Empresas", paths: ["/companies"] },
  repurchase: { label: "Recompra", paths: ["/repurchase"] },
  reactivation: { label: "Reativação", paths: ["/reactivation"] },
  orders: { label: "Pedidos", paths: ["/orders"] },
  afterSales: { label: "Atendimento e pós-venda", paths: ["/after-sales"] },
  tracking: { label: "Tracking", paths: ["/tracking"] },
  finance: { label: "Financeiro", paths: ["/finance"] },
  reports: { label: "Relatórios", paths: ["/reports"] },
  automations: { label: "Automações", paths: ["/automations"] },
  marketing: { label: "Marketing", paths: ["/marketing"] },
  connections: { label: "Conexões", paths: ["/connections"] },
  integrations: { label: "Integrações", paths: ["/integrations"] },
  settings: { label: "Configurações", paths: ["/settings"] },
};

/** Áreas abertas no momento. Etapa atual: somente Pipelines. */
export const UNLOCKED_AREAS: readonly AreaId[] = ["pipelines"];

export const LOCKED_AREA_TOOLTIP = "Área bloqueada nesta etapa";

function normalizePath(href: string): string {
  const path = href.split(/[?#]/)[0] || "/";
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/** Área à qual um caminho pertence, ou null se não for de nenhuma área conhecida. */
export function findArea(href: string): AreaId | null {
  const path = normalizePath(href);
  let best: { id: AreaId; length: number } | null = null;
  for (const [id, area] of Object.entries(AREAS) as [AreaId, (typeof AREAS)[AreaId]][]) {
    for (const prefix of area.paths) {
      if (matchesPrefix(path, prefix) && (!best || prefix.length > best.length)) {
        best = { id, length: prefix.length };
      }
    }
  }
  return best?.id ?? null;
}

/**
 * Um caminho fica liberado quando pertence a uma área liberada. Caminhos fora
 * de qualquer área conhecida ficam bloqueados por padrão, para que telas novas
 * não apareçam sem querer.
 */
export function isPathUnlocked(href: string, unlocked: readonly AreaId[] = UNLOCKED_AREAS): boolean {
  const area = findArea(href);
  return area !== null && unlocked.includes(area);
}

export function lockedAreaLabel(href: string): string | null {
  const area = findArea(href);
  return area ? AREAS[area].label : null;
}

/** Primeira tela liberada, usada como destino do botão "Voltar". */
export function firstUnlockedPath(unlocked: readonly AreaId[] = UNLOCKED_AREAS): string {
  const first = unlocked[0];
  return first ? AREAS[first].paths[0]! : "/pipelines";
}
