"use client";

import { useParams } from "next/navigation";
import { PipelineConversationsPage } from "@/components/crm/pipeline-conversations-page";

export default function Page() {
  const params = useParams<{ occurrenceId: string }>();
  return <PipelineConversationsPage pipelineId={params.occurrenceId} rootPath="/after-sales" />;
}
