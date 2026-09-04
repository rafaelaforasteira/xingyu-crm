"use client";

import { useSearchParams } from "next/navigation";
import { AfterSalesPage } from "@/components/crm/lifecycle-pages";
import { JourneyPipelinesOverview } from "@/components/crm/journey-pipelines-overview";

export default function Page() {
  const params = useSearchParams();
  if (!params.get("pipeline")) return <JourneyPipelinesOverview space="attendance" />;
  return <AfterSalesPage />;
}
