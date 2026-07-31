"use client";

import { useParams } from "next/navigation";
import { AutomationDetailPage } from "@/components/crm/automations-page";

export default function Page() {
  const params = useParams<{ automationId: string }>();
  return <AutomationDetailPage automationId={params.automationId} />;
}
