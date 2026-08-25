import { ConnectionLifecycleStatus } from "@xingyu/database";

export const CONNECTION_STATUS_GROUPS = ["ALL", "CONNECTED", "ATTENTION", "OFFLINE"] as const;
export type ConnectionStatusGroup = (typeof CONNECTION_STATUS_GROUPS)[number];

const attention: ConnectionLifecycleStatus[] = [
  ConnectionLifecycleStatus.ERROR,
  ConnectionLifecycleStatus.RECONNECTING,
];
const offline: ConnectionLifecycleStatus[] = [
  ConnectionLifecycleStatus.DISCONNECTED,
  ConnectionLifecycleStatus.DRAFT,
  ConnectionLifecycleStatus.QR_PENDING,
  ConnectionLifecycleStatus.CONNECTING,
];

export function mapProviderStatus(status: string): ConnectionLifecycleStatus {
  const normalized = status.trim().toUpperCase();
  const aliases: Record<string, ConnectionLifecycleStatus> = {
    OPEN: ConnectionLifecycleStatus.CONNECTED,
    READY: ConnectionLifecycleStatus.CONNECTED,
    ONLINE: ConnectionLifecycleStatus.CONNECTED,
    CONNECTED: ConnectionLifecycleStatus.CONNECTED,
    CONNECTING: ConnectionLifecycleStatus.CONNECTING,
    QR: ConnectionLifecycleStatus.QR_PENDING,
    QRCODE: ConnectionLifecycleStatus.QR_PENDING,
    QR_PENDING: ConnectionLifecycleStatus.QR_PENDING,
    PAIRING: ConnectionLifecycleStatus.QR_PENDING,
    RECONNECTING: ConnectionLifecycleStatus.RECONNECTING,
    CLOSE: ConnectionLifecycleStatus.DISCONNECTED,
    CLOSED: ConnectionLifecycleStatus.DISCONNECTED,
    OFFLINE: ConnectionLifecycleStatus.DISCONNECTED,
    DISCONNECTED: ConnectionLifecycleStatus.DISCONNECTED,
    ERROR: ConnectionLifecycleStatus.ERROR,
    FAILED: ConnectionLifecycleStatus.ERROR,
    REFUSED: ConnectionLifecycleStatus.ERROR,
  };
  return aliases[normalized] ?? ConnectionLifecycleStatus.ERROR;
}

export function lifecycleStatusesForGroup(
  group: ConnectionStatusGroup,
): ConnectionLifecycleStatus[] | undefined {
  if (group === "ALL") return undefined;
  if (group === "CONNECTED") return [ConnectionLifecycleStatus.CONNECTED];
  if (group === "ATTENTION") return attention;
  return offline;
}

export function statusGroupFor(status: ConnectionLifecycleStatus): ConnectionStatusGroup {
  if (status === ConnectionLifecycleStatus.CONNECTED) return "CONNECTED";
  if (attention.includes(status)) return "ATTENTION";
  return "OFFLINE";
}
