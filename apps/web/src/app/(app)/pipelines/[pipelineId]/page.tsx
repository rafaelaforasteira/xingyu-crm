"use client";

import { useParams } from "next/navigation";
import { BetaOperationPage } from "@/components/crm/beta/beta-operation-page";

export default function Page() {
  const params = useParams<{ pipelineId: string }>();
  return <BetaOperationPage pipelineId={params.pipelineId} />;
}
