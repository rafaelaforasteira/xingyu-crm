"use client";

import { useParams } from "next/navigation";
import { PipelineBoardPage } from "@/components/crm/pipelines-page";

export default function Page() {
  const params = useParams<{ occurrenceId: string }>();
  return <PipelineBoardPage pipelineId={params.occurrenceId} basePath="/after-sales" />;
}
