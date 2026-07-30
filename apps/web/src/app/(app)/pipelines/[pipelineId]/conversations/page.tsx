"use client";

import { useParams } from "next/navigation";
import { PipelineConversationsPage } from "@/components/crm/pipeline-conversations-page";

export default function Page() {
  const params = useParams<{ pipelineId: string }>();
  return <PipelineConversationsPage pipelineId={params.pipelineId} />;
}
