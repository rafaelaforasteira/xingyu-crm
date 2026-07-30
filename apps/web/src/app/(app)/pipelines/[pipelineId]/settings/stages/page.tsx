"use client";

import { useParams } from "next/navigation";
import { PipelineStagesPage } from "@/components/crm/pipeline-stages-page";

export default function Page() {
  const params = useParams<{ pipelineId: string }>();
  return <PipelineStagesPage pipelineId={params.pipelineId} />;
}
