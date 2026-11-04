import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SalesTrackingPage } from "./sales-tracking-page";
import { DEFAULT_TRACKING_FILTERS } from "./sales-tracking-filters";
import { getSalesTrackingData } from "./sales-tracking-service";
import { loadTrackingView } from "./tracking-view";

afterEach(() => vi.unstubAllGlobals());

// Keep the orchestration real; chart rendering itself is outside this SSR check.
vi.mock("./sales-tracking-visuals", () => ({
  CustomerMix: () => null,
  RepurchaseAnalysis: () => null,
  SalesHero: () => null,
  ValueAndReactivation: () => null,
}));
vi.mock("./channel-origin-section", () => ({ ChannelOriginSection: () => null }));
vi.mock("./tracking-action-insights-panel", () => ({ TrackingActionInsights: () => null }));
vi.mock("./tracking-executive-summary", () => ({
  TrackingExecutiveSummary: ({ meta }: { meta: React.ReactNode }) => <section>{meta}</section>,
}));

describe("Tracking view presentation", () => {
  it("renders the displayed dataset context and demo badge rather than the current control defaults", async () => {
    // Vitest uses classic JSX here; Next's production compiler uses the automatic runtime.
    vi.stubGlobal("React", React);
    const view = await loadTrackingView(
      { ...DEFAULT_TRACKING_FILTERS, customerType: "NEW", purchaseStage: "2" },
      getSalesTrackingData,
    );
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    client.setQueryData(["tracking", "sales", "view", DEFAULT_TRACKING_FILTERS], view);
    try {
      const html = renderToStaticMarkup(
        <QueryClientProvider client={client}>
          <SalesTrackingPage />
        </QueryClientProvider>,
      );
      expect(html).toContain("Recorte exibido: Novos · 2ª compra");
      expect(html).toContain("Dados demonstrativos");
      expect(html).not.toContain("Recorte exibido: Todos os clientes");
      expect(html).toContain('aria-label="Informações sobre Inteligência de Vendas"');
    } finally {
      client.clear();
    }
  });
});
