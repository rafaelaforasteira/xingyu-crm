import type { AbandonedCheckout, RecoveryOrder } from "@xingyu/types";
export const RECOVERY_DATA_SOURCE = Symbol("RECOVERY_DATA_SOURCE");
/** Adapters must normalize, verify evidence and partition by tenant before analytics. No raw provider payload crosses this boundary. */
export interface RecoveryDataSource {
  load(
    organizationId: string,
    asOf: string,
  ): Promise<{
    source: "demo" | "production";
    provider: string;
    timezone: string;
    checkouts: AbandonedCheckout[];
    orders: RecoveryOrder[];
  }>;
}
