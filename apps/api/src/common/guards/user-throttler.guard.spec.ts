import { UserThrottlerGuard } from "./user-throttler.guard";

describe("UserThrottlerGuard", () => {
  const guard = new (class extends UserThrottlerGuard {
    constructor() {
      super(
        { throttlers: [] } as any,
        {} as any,
        {} as any,
      );
    }
    public testGetTracker(req: any) {
      return (this as any).getTracker(req);
    }
  })();

  it("uses user id when authenticated", async () => {
    expect(await guard.testGetTracker({ user: { id: "u1" }, ip: "1.2.3.4" })).toBe("user-u1");
  });

  it("falls back to IP for anonymous requests", async () => {
    expect(await guard.testGetTracker({ ip: "10.0.0.1", ips: [] })).toBe("10.0.0.1");
  });

  it("uses first forwarded IP when available", async () => {
    expect(await guard.testGetTracker({ ip: "127.0.0.1", ips: ["10.0.0.5"] })).toBe("10.0.0.5");
  });

  it("different users on same IP get separate keys", async () => {
    const keyA = await guard.testGetTracker({ user: { id: "a" }, ip: "1.1.1.1" });
    const keyB = await guard.testGetTracker({ user: { id: "b" }, ip: "1.1.1.1" });
    expect(keyA).not.toBe(keyB);
  });
});
