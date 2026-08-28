import { BETA_SINGLE_PIPELINE_MODE } from "@/lib/beta-config";

/** Operational simplified CRM: Kanban + conversation as primary workspace. */
export const CORE_OPERATION_MODE =
  process.env.NEXT_PUBLIC_CORE_OPERATION_MODE !== "false";

export const DEFAULT_APP_HOME =
  BETA_SINGLE_PIPELINE_MODE || CORE_OPERATION_MODE ? "/operacao" : "/dashboard";

/**
 * Hide the global top bar on the operational workspace only.
 * Beta single-pipeline restores the classic Header on /operacao.
 */
export function shouldHideGlobalHeader(
  pathname: string | null | undefined,
  coreMode = CORE_OPERATION_MODE,
  betaMode = BETA_SINGLE_PIPELINE_MODE,
): boolean {
  if (pathname && /^\/automations\/(?!new(?:\/|$))[^/]+/.test(pathname)) return true;
  if (betaMode) return false;
  if (!coreMode || !pathname) return false;
  return pathname === "/operacao" || pathname.startsWith("/operacao/");
}
