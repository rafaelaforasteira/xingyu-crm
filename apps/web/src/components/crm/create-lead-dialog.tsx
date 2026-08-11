"use client";

import { useQuery } from "@tanstack/react-query";
import { BETA_PIPELINE_ID } from "@/lib/beta-config";
import { pipelinesApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { Dialog } from "@/components/ui/dialog";
import { ManualCreateLeadDialog } from "@/components/crm/manual-create-lead-dialog";

export function CreateLeadDialog({
  open,
  onOpenChange,
  pipelineId = BETA_PIPELINE_ID,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId?: string;
}) {
  const board = useQuery({
    queryKey: queryKeys.pipelines.board(pipelineId),
    queryFn: () => pipelinesApi.board(pipelineId),
    enabled: open,
    retry: false,
  });
  if (board.data)
    return <ManualCreateLeadDialog open={open} onOpenChange={onOpenChange} pipeline={board.data} />;
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Criar lead"
      description="Carregando pipeline…"
    >
      <p className="text-sm text-muted-foreground">
        {board.error ? (board.error as Error).message : "Carregando etapas…"}
      </p>
    </Dialog>
  );
}
