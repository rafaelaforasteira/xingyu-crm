"use client";

import { useParams } from "next/navigation";
import { PipelineConversationsPage } from "@/components/crm/pipeline-conversations-page";

export default function Page() {
  const params = useParams<{ occurrenceId: string; conversationId: string }>();
  return (
    <PipelineConversationsPage
      pipelineId={params.occurrenceId}
      conversationId={params.conversationId}
      rootPath="/after-sales"
    />
  );
}
