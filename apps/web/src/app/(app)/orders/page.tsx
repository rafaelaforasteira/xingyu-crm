"use client";

import { useSearchParams } from "next/navigation";
import { OrdersPage } from "@/components/crm/orders-page";
import { JourneyPipelinesOverview } from "@/components/crm/journey-pipelines-overview";

export default function Page() {
  const params = useSearchParams();
  if (!params.get("pipeline")) return <JourneyPipelinesOverview space="orders" />;
  return <OrdersPage />;
}
