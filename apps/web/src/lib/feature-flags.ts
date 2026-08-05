/** Operational simplified CRM: Kanban + conversation as primary workspace. */
export const CORE_OPERATION_MODE =
  process.env.NEXT_PUBLIC_CORE_OPERATION_MODE !== "false";

export const DEFAULT_APP_HOME = CORE_OPERATION_MODE ? "/operacao" : "/dashboard";
