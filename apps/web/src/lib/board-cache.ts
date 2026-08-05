import type { QueryClient } from "@tanstack/react-query";
import type { Deal, Pipeline } from "@/lib/types";
import { queryKeys } from "@/lib/query-keys";
import { moveDealInStages, patchDealInStages } from "@/lib/operation-utils";

function isBoardQueryKey(queryKey: readonly unknown[]): boolean {
  return (
    queryKey[0] === "pipelines" &&
    typeof queryKey[1] === "string" &&
    queryKey[2] === "board"
  );
}

export function patchBoardDeal(
  queryClient: QueryClient,
  pipelineId: string,
  dealId: string,
  patch: Partial<Deal>,
) {
  queryClient.setQueryData<Pipeline>(queryKeys.pipelines.board(pipelineId), (current) => {
    if (!current?.stages) return current;
    return {
      ...current,
      stages: patchDealInStages(current.stages, dealId, patch),
    };
  });
}

export function patchBoardDealByConversation(
  queryClient: QueryClient,
  conversationId: string,
  patch: Partial<Deal>,
) {
  queryClient.setQueriesData<Pipeline>(
    {
      predicate: (query) => isBoardQueryKey(query.queryKey),
    },
    (current) => {
      if (!current?.stages || !Array.isArray(current.stages)) return current;
      let changed = false;
      const stages = current.stages.map((stage) => ({
        ...stage,
        deals: (stage.deals ?? []).map((deal) => {
          if (deal.conversationId !== conversationId) return deal;
          changed = true;
          return { ...deal, ...patch };
        }),
      }));
      return changed ? { ...current, stages } : current;
    },
  );
}

export function moveBoardDeal(
  queryClient: QueryClient,
  pipelineId: string,
  dealId: string,
  toStageId: string,
) {
  queryClient.setQueryData<Pipeline>(queryKeys.pipelines.board(pipelineId), (current) => {
    if (!current?.stages) return current;
    return {
      ...current,
      stages: moveDealInStages(current.stages, dealId, toStageId),
    };
  });
}

export function getBoardDealSnapshot(
  queryClient: QueryClient,
  pipelineId: string,
  dealId: string,
): Deal | null {
  const board = queryClient.getQueryData<Pipeline>(queryKeys.pipelines.board(pipelineId));
  if (!board?.stages) return null;
  for (const stage of board.stages) {
    const deal = stage.deals?.find((item) => item.id === dealId);
    if (deal) return deal;
  }
  return null;
}
