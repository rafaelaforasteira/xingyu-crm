import type { TrackingFilters } from "./sales-tracking-types";

/** Local presentation context; the analytics DTO and adapter remain unchanged. */
export async function loadTrackingView<T>(
  filters: TrackingFilters,
  load: (filters: TrackingFilters) => Promise<T>,
) {
  const snapshot = structuredClone(filters);
  const data = await load(snapshot);
  return { data, filters: snapshot };
}

export function trackingFilterCount(filters: TrackingFilters) {
  return (
    Number(filters.period.mode !== "preset" || filters.period.preset !== "30d") +
    Number(filters.customerType !== "ALL") +
    Number(filters.purchaseStage !== "ALL")
  );
}

export function summarizeTrackingFilters(filters: TrackingFilters) {
  const customerLabels: Record<TrackingFilters["customerType"], string> = {
    ALL: "Todos os clientes",
    NEW: "Novos",
    EXISTING: "Base existente",
    REACTIVATED: "Reativados",
  };
  const purchase =
    filters.purchaseStage === "ALL"
      ? "Todas as compras"
      : filters.purchaseStage === "6+"
        ? "6ª compra ou mais"
        : `${filters.purchaseStage}ª compra`;
  return `${customerLabels[filters.customerType]} · ${purchase}`;
}
