import type { ConnectionLifecycleStatus } from "@xingyu/database";

export type ProviderConnection = {
  externalInstanceId: string;
  status: ConnectionLifecycleStatus;
};

export type ProviderQr = {
  qrPayload: string;
  expiresAt: Date;
  status: ConnectionLifecycleStatus;
};

export type NormalizedProviderEvent =
  | {
      kind: "inbound_message";
      externalEventId: string;
      externalMessageId?: string;
      phone: string;
      contactName?: string;
      body: string;
      occurredAt: Date;
    }
  | {
      kind: "connection_status";
      externalEventId: string;
      status: string;
      displayAccount?: string;
      errorCode?: string;
      occurredAt: Date;
    };

export interface ConnectionProvider {
  readonly name: string;
  create(channelId: string): Promise<ProviderConnection>;
  connect(channelId: string, externalInstanceId: string): Promise<ProviderQr>;
  getQr(channelId: string): Promise<ProviderQr | null>;
  disconnect(channelId: string, externalInstanceId: string): Promise<void>;
  validateWebhook(payload: unknown, signature?: string): boolean;
  normalizeWebhook(payload: unknown): NormalizedProviderEvent;
}
