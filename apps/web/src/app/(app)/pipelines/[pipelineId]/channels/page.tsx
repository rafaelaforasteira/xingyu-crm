"use client";

import { useParams } from "next/navigation";
import { PipelineChannelsPage } from "@/components/crm/pipeline-channels-page";

export default function Page() {
  const params = useParams<{ pipelineId: string }>();
  return <PipelineChannelsPage pipelineId={params.pipelineId} />;
}
