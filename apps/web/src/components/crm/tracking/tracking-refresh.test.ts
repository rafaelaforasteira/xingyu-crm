import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { createTrackingRefresh } from "./tracking-refresh";

afterEach(() => vi.useRealTimers());
describe("Tracking refresh lifecycle", () => {
  it("coalesces rapid clicks and refuses refresh during a filter fetch", async () => {
    vi.useFakeTimers();
    const run = createTrackingRefresh();
    const callbacks = { onPending: vi.fn(), onSuccess: vi.fn(), onError: vi.fn() };
    const refetch = vi.fn(async () => ({ isError: false }));
    await run({ ...callbacks, isFetching: true, refetch });
    expect(refetch).not.toHaveBeenCalled();
    const first = run({ ...callbacks, isFetching: false, refetch });
    await run({ ...callbacks, isFetching: false, refetch });
    expect(refetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(450);
    await first;
    expect(callbacks.onPending.mock.calls).toEqual([[true], [false]]);
    expect(callbacks.onSuccess).toHaveBeenCalledTimes(1);
  });

  it("keeps the last valid dataset after failure and updates the same filtered query on retry", async () => {
    vi.useFakeTimers();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    const filters = {
      customerType: "REACTIVATED",
      period: { mode: "custom", startDate: "2026-01-01", endDate: "2026-03-31" },
    };
    const queryKey = ["tracking", "sales", filters];
    const original = { netSales: 120, filters };
    client.setQueryData(queryKey, original);
    let fail = true;
    let amount = 120;
    const queryFn = vi.fn(async () => {
      if (fail) throw new Error("offline");
      return { netSales: amount, filters };
    });
    const observer = new QueryObserver(client, { queryKey, queryFn, enabled: false });
    const unsubscribe = observer.subscribe(() => {});
    const run = createTrackingRefresh();
    const callbacks = { onPending: vi.fn(), onSuccess: vi.fn(), onError: vi.fn() };
    const refresh = async () => {
      const pending = run({
        ...callbacks,
        isFetching: false,
        refetch: () => observer.refetch({ cancelRefetch: false }),
      });
      await vi.advanceTimersByTimeAsync(450);
      await pending;
    };
    await refresh();
    expect(client.getQueryData(queryKey)).toEqual(original);
    expect(callbacks.onError).toHaveBeenCalledTimes(1);
    fail = false;
    await refresh(); // unchanged mock
    expect(client.getQueryData(queryKey)).toEqual(original);
    amount = 240;
    await refresh(); // newly returned data
    expect(client.getQueryData(queryKey)).toEqual({ netSales: 240, filters });
    expect(callbacks.onSuccess).toHaveBeenCalledTimes(2);
    expect(client.getQueryCache().getAll()).toHaveLength(1);
    unsubscribe();
    client.clear();
  });

  it("releases the lock even when the service rejects directly", async () => {
    const run = createTrackingRefresh();
    const callbacks = { onPending: vi.fn(), onSuccess: vi.fn(), onError: vi.fn() };
    const refetch = vi.fn().mockRejectedValue(new Error("network"));
    await run({ ...callbacks, isFetching: false, refetch });
    await run({ ...callbacks, isFetching: false, refetch });
    expect(refetch).toHaveBeenCalledTimes(2);
    expect(callbacks.onPending.mock.calls).toEqual([[true], [false], [true], [false]]);
  });
});
