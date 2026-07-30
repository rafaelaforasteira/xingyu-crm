"use client";

import { useParams } from "next/navigation";
import { PageHeader } from "@/components/crm/page-header";
import { ConversationWorkspace } from "@/components/crm/conversation/conversation-workspace";

export function InboxPage() {
  const params = useParams<{ conversationId?: string | string[] }>();
  const routeId = params?.conversationId;
  const selectedId = Array.isArray(routeId) ? routeId[0] : routeId;
  const activeId = selectedId || undefined;

  return (
    <ConversationWorkspace
      scope={{ type: "global" }}
      conversationId={activeId}
      basePath="/inbox"
      header={
        <PageHeader title="Inbox" description="Atendimento unificado." />
      }
    />
  );
}
