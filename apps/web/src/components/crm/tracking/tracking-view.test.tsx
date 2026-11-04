import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { SalesTrackingFilters, DEFAULT_TRACKING_FILTERS } from "./sales-tracking-filters";
import type { TrackingFilters } from "./sales-tracking-types";
import { loadTrackingView, summarizeTrackingFilters, trackingFilterCount } from "./tracking-view";

describe("Tracking filter context", () => {
  it("includes the applied filter count in the button accessible name", () => {
    const html = renderToStaticMarkup(
      <SalesTrackingFilters
        appliedFilters={{ ...DEFAULT_TRACKING_FILTERS, customerType: "NEW", purchaseStage: "2" }}
        onApply={() => {}}
      />,
    );
    expect(html).toContain('aria-label="Filtrar dados de vendas, 2 filtros ativos"');
  });

  it("announces when no filters are active", () => {
    const html = renderToStaticMarkup(
      <SalesTrackingFilters appliedFilters={DEFAULT_TRACKING_FILTERS} onApply={() => {}} />,
    );
    expect(html).toContain('aria-label="Filtrar dados de vendas, nenhum filtro ativo"');
  });

  it.each([
    ["ALL", "Todos os clientes"],
    ["NEW", "Novos"],
    ["EXISTING", "Base existente"],
    ["REACTIVATED", "Reativados"],
  ] as const)("describes customer type %s", (customerType, expected) => {
    expect(summarizeTrackingFilters({ ...DEFAULT_TRACKING_FILTERS, customerType })).toBe(
      `${expected} · Todas as compras`,
    );
  });

  it.each(["1", "2", "3", "4", "5", "6+"] as const)(
    "describes purchase stage %s",
    (purchaseStage) => {
      const expected = purchaseStage === "6+" ? "6ª compra ou mais" : `${purchaseStage}ª compra`;
      expect(
        summarizeTrackingFilters({
          ...DEFAULT_TRACKING_FILTERS,
          customerType: "NEW",
          purchaseStage,
        }),
      ).toBe(`Novos · ${expected}`);
    },
  );

  it("counts custom periods and non-default presets without changing the summary", () => {
    expect(trackingFilterCount(DEFAULT_TRACKING_FILTERS)).toBe(0);
    expect(
      trackingFilterCount({
        ...DEFAULT_TRACKING_FILTERS,
        period: { mode: "preset", preset: "90d" },
      }),
    ).toBe(1);
    expect(
      trackingFilterCount({
        ...DEFAULT_TRACKING_FILTERS,
        period: { mode: "preset", preset: "12m" },
      }),
    ).toBe(1);
    const custom: TrackingFilters = {
      ...DEFAULT_TRACKING_FILTERS,
      period: { mode: "custom", startDate: "2026-01-01", endDate: "2026-03-31" },
      customerType: "REACTIVATED",
      purchaseStage: "6+",
    };
    expect(trackingFilterCount(custom)).toBe(3);
    expect(summarizeTrackingFilters(custom)).toBe("Reativados · 6ª compra ou mais");
  });

  it("captures filters before awaiting the dataset and preserves the dataset unchanged", async () => {
    const filters = structuredClone(DEFAULT_TRACKING_FILTERS);
    let resolve!: (value: { netSales: number; source: string }) => void;
    const promise = loadTrackingView(
      filters,
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    filters.customerType = "NEW";
    filters.period = { mode: "preset", preset: "90d" };
    const data = { netSales: 123, source: "mock" };
    resolve(data);
    const view = await promise;
    expect(view.data).toBe(data);
    expect(view.filters).toEqual(DEFAULT_TRACKING_FILTERS);
    expect(view.filters).not.toBe(filters);
  });

  it("keeps dataset A and its context through B placeholder/error, then switches together on retry", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    const a = DEFAULT_TRACKING_FILTERS;
    const b: TrackingFilters = { ...a, customerType: "NEW", purchaseStage: "2" };
    const dataA = { netSales: 100 };
    const dataB = { netSales: 200 };
    const viewA = await loadTrackingView(a, async () => dataA);
    const key = (filters: TrackingFilters) => ["tracking", "sales", "view", filters];
    client.setQueryData(key(a), viewA);
    const observer = new QueryObserver(client, {
      queryKey: key(a),
      queryFn: () => loadTrackingView(a, async () => dataA),
      enabled: false,
      placeholderData: (previous) => previous,
    });
    let lastValid = viewA;
    const unsubscribe = observer.subscribe((result) => {
      if (result.data) lastValid = result.data;
    });
    let resolveB!: () => void;
    observer.setOptions({
      queryKey: key(b),
      queryFn: () =>
        loadTrackingView(
          b,
          () =>
            new Promise<{ netSales: number }>((_, reject) => {
              resolveB = () => reject(new Error("offline"));
            }),
        ),
      placeholderData: (previous) => previous,
      retry: false,
    });
    expect(observer.getCurrentResult().isPlaceholderData).toBe(true);
    expect(observer.getCurrentResult().data).toBe(viewA);
    resolveB();
    await observer.refetch({ cancelRefetch: false });
    expect(observer.getCurrentResult().isError).toBe(true);
    expect(observer.getCurrentResult().data ?? lastValid).toEqual(viewA);
    observer.setOptions({
      queryKey: key(b),
      queryFn: () => loadTrackingView(b, async () => dataB),
      enabled: false,
    });
    const retried = await observer.refetch();
    expect(retried.data?.data).toBe(dataB);
    expect(retried.data?.filters).toEqual(b);
    expect(summarizeTrackingFilters(retried.data!.filters)).toBe("Novos · 2ª compra");
    unsubscribe();
    client.clear();
  });
});
