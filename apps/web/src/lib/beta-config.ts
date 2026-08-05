/**
 * Beta single-pipeline mode — one pipeline, Operação-only navigation,
 * classic pipeline UI on /operacao.
 */
export const BETA_SINGLE_PIPELINE_MODE =
  process.env.NEXT_PUBLIC_BETA_SINGLE_PIPELINE_MODE !== "false";

export const BETA_PIPELINE_ID =
  (process.env.NEXT_PUBLIC_BETA_PIPELINE_ID ?? "pipe-novos").trim() ||
  "pipe-novos";

export const BETA_COMING_SOON_MESSAGE =
  "Disponível nas próximas etapas do beta";

export type BetaView = "kanban" | "conversations";

export function parseBetaView(
  value: string | null | undefined,
): BetaView {
  if (value === "conversations") return "conversations";
  return "kanban";
}

export function buildBetaKanbanHref(dealId?: string | null): string {
  const params = new URLSearchParams();
  params.set("view", "kanban");
  if (dealId) params.set("deal", dealId);
  return `/operacao?${params.toString()}`;
}

export function buildBetaConversationsHref(
  conversationId?: string | null,
): string {
  const params = new URLSearchParams();
  params.set("view", "conversations");
  if (conversationId) params.set("conversation", conversationId);
  return `/operacao?${params.toString()}`;
}

/** Authenticated app routes blocked while beta single-pipeline mode is on. */
const BETA_BLOCKED_PREFIXES = [
  "/dashboard",
  "/pipelines",
  "/inbox",
  "/contacts",
  "/companies",
  "/orders",
  "/tasks",
  "/reports",
  "/automations",
  "/settings",
  "/marketing",
  "/repurchase",
  "/reactivation",
  "/after-sales",
  "/products",
  "/occurrences",
  "/notifications",
  "/search",
] as const;

export function isBetaBlockedPath(pathname: string): boolean {
  if (!pathname || pathname === "/operacao" || pathname.startsWith("/operacao/")) {
    return false;
  }
  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return false;
  }
  return BETA_BLOCKED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
