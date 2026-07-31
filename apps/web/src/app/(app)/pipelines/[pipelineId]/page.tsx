"use client";

import { useParams } from "next/navigation";
import { PipelineBoardPage } from "@/components/crm/pipelines-page";

export default function Page() {
  const params = useParams<{ pipelineId: string }>();
  return <PipelineBoardPage pipelineId={params.pipelineId} />;
}
