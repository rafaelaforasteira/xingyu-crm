import { ConnectionLifecycleStatus } from "@xingyu/database";
import {
  lifecycleStatusesForGroup,
  mapProviderStatus,
  statusGroupFor,
} from "./connection-status";

describe("connection status mapping", () => {
  it("maps provider aliases to lifecycle statuses", () => {
    expect(mapProviderStatus("ready")).toBe(ConnectionLifecycleStatus.CONNECTED);
    expect(mapProviderStatus("open")).toBe(ConnectionLifecycleStatus.CONNECTED);
    expect(mapProviderStatus("qr")).toBe(ConnectionLifecycleStatus.QR_PENDING);
    expect(mapProviderStatus("qrcode")).toBe(ConnectionLifecycleStatus.QR_PENDING);
    expect(mapProviderStatus("failed")).toBe(ConnectionLifecycleStatus.ERROR);
    expect(mapProviderStatus("refused")).toBe(ConnectionLifecycleStatus.ERROR);
  });

  it("uses the canonical list filter groups", () => {
    expect(lifecycleStatusesForGroup("ATTENTION")).toEqual([
      ConnectionLifecycleStatus.ERROR,
      ConnectionLifecycleStatus.RECONNECTING,
    ]);
    expect(statusGroupFor(ConnectionLifecycleStatus.DISCONNECTED)).toBe("OFFLINE");
    expect(lifecycleStatusesForGroup("ALL")).toBeUndefined();
  });
});
