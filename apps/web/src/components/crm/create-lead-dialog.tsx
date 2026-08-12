"use client";

import { useQuery } from "@tanstack/react-query";
import { pipelinesApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { Dialog } from "@/components/ui/dialog";
import { ManualCreateLeadDialog } from "@/components/crm/manual-create-lead-dialog";

export function CreateLeadDialog({
  open,
  onOpenChange,
  pipelineId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId?: string | null;
}) {
  const board = useQuery({
    queryKey: queryKeys.pipelines.board(pipelineId ?? "unselected"),
    queryFn: () => pipelinesApi.board(pipelineId!),
    enabled: open && Boolean(pipelineId),
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
        {!pipelineId
          ? "Abra um pipeline para criar o lead na esteira correta."
          : board.error
            ? (board.error as Error).message
            : "Carregando etapas…"}
      </p>
    </Dialog>
  );
}
