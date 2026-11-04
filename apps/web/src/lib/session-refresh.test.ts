import { afterEach, describe, expect, it, vi } from "vitest";
import { requestSessionRefresh } from "./session-refresh";

afterEach(() => {
  vi.unstubAllGlobals();
});
describe("shared session renewal", () => {
  it("shares a single request and lets each caller consume its response", async () => {
    let release!: (response: Response) => void;
    const fetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          release = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetch);
    const first = requestSessionRefresh("/api/auth/refresh");
    const second = requestSessionRefresh("/api/auth/refresh");
    release(new Response(JSON.stringify({ user: { id: "u1" } })));
    const [a, b] = await Promise.all([first, second]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(await a.json()).toEqual(await b.json());
  });
  it("releases the single-flight after network failure", async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetch);
    await expect(requestSessionRefresh("/api/auth/refresh")).rejects.toThrow("offline");
    expect((await requestSessionRefresh("/api/auth/refresh")).ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("uses a browser lock and reuses a session refreshed by another tab", async () => {
    const request = vi.fn((_name, run) => run());
    vi.stubGlobal("navigator", { locks: { request } });
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: "already-refreshed" })));
    vi.stubGlobal("fetch", fetch);
    const result = await requestSessionRefresh("/api/auth/refresh");
    expect(request).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/me",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(await result.json()).toEqual({ user: { id: "already-refreshed" } });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
