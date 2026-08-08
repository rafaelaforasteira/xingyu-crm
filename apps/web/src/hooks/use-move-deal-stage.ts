"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { dealsApi } from "@/lib/api";
import { moveBoardDeal } from "@/lib/board-cache";
import { queryKeys } from "@/lib/query-keys";
import type {
  Conversation,
  ConversationContext,
  ConversationListItem,
  PipelineStage,
} from "@/lib/types";

export type MoveDealStageInput = {
  dealId: string;
  pipelineId: string;
  stageId: string;
  stageName: string;
  previousStageId: string;
  conversationId?: string | null;
};

type ListCache =
  | ConversationListItem[]
  | {
      data: ConversationListItem[];
      meta?: unknown;
    };

function patchListCache(
  current: ListCache | undefined,
  dealId: string,
  stageId: string,
  stageName: string,
): ListCache | undefined {
  if (!current) return current;

  const patchItem = (item: ConversationListItem): ConversationListItem => {
    if (item.currentDeal?.id !== dealId) return item;
    return {
      ...item,
      currentDeal: {
        ...item.currentDeal,
        stageId,
        stageName,
      },
    };
  };

  if (Array.isArray(current)) {
    return current.map(patchItem);
  }
  if (Array.isArray(current.data)) {
    return { ...current, data: current.data.map(patchItem) };
  }
  return current;
}

function patchConversationDetail(
  current: Conversation | undefined,
  dealId: string,
  stageId: string,
  stage: Pick<PipelineStage, "id" | "name" | "color"> | null,
): Conversation | undefined {
  if (!current?.deal || current.deal.id !== dealId) return current;
  return {
    ...current,
    deal: {
      ...current.deal,
      stageId,
      stage: stage
        ? ({
            ...(current.deal.stage ?? { position: 0 }),
            id: stage.id,
            name: stage.name,
            position: current.deal.stage?.position ?? 0,
            color: stage.color ?? current.deal.stage?.color ?? null,
          } satisfies PipelineStage)
        : current.deal.stage,
    },
  };
}

function patchConversationContext(
  current: ConversationContext | undefined,
  dealId: string,
  stageId: string,
  stageName: string,
): ConversationContext | undefined {
  if (!current) return current;
  if (current.currentDeal?.id !== dealId) return current;

  return {
    ...current,
    stage: current.stage
      ? { ...current.stage, id: stageId, name: stageName }
      : ({
          id: stageId,
          name: stageName,
          position: 0,
        } satisfies NonNullable<ConversationContext["stage"]>),
    currentDeal: {
      ...current.currentDeal,
      stageId,
      stageName,
    },
  };
}

export function useMoveDealStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dealId, stageId }: MoveDealStageInput) =>
      dealsApi.move(dealId, stageId),
    onMutate: async (vars) => {
      const {
        dealId,
        pipelineId,
        stageId,
        stageName,
        previousStageId,
        conversationId,
      } = vars;

      await Promise.all([
        queryClient.cancelQueries({
          queryKey: queryKeys.pipelines.board(pipelineId),
        }),
        queryClient.cancelQueries({ queryKey: queryKeys.conversations.lists }),
        conversationId
          ? queryClient.cancelQueries({
              queryKey: queryKeys.conversations.detail(conversationId),
            })
          : Promise.resolve(),
        conversationId
          ? queryClient.cancelQueries({
              queryKey: queryKeys.conversations.context(conversationId),
            })
          : Promise.resolve(),
      ]);

      const previousBoard = queryClient.getQueryData(
        queryKeys.pipelines.board(pipelineId),
      );
      const previousLists = queryClient.getQueriesData({
        queryKey: queryKeys.conversations.lists,
      });
      const previousDetail = conversationId
        ? queryClient.getQueryData<Conversation>(
            queryKeys.conversations.detail(conversationId),
          )
        : undefined;
      const previousContext = conversationId
        ? queryClient.getQueryData<ConversationContext>(
            queryKeys.conversations.context(conversationId),
          )
        : undefined;

      moveBoardDeal(queryClient, pipelineId, dealId, stageId);

      queryClient.setQueriesData(
        { queryKey: queryKeys.conversations.lists },
        (current: ListCache | undefined) =>
          patchListCache(current, dealId, stageId, stageName),
      );

      if (conversationId) {
        queryClient.setQueryData<Conversation>(
          queryKeys.conversations.detail(conversationId),
          (current) =>
            patchConversationDetail(current, dealId, stageId, {
              id: stageId,
              name: stageName,
            }),
        );
        queryClient.setQueryData<ConversationContext>(
          queryKeys.conversations.context(conversationId),
          (current) =>
            patchConversationContext(current, dealId, stageId, stageName),
        );
      }

      return {
        previousBoard,
        previousLists,
        previousDetail,
        previousContext,
        previousStageId,
      };
    },
    onError: (_error, vars, context) => {
      if (context?.previousBoard !== undefined) {
        queryClient.setQueryData(
          queryKeys.pipelines.board(vars.pipelineId),
          context.previousBoard,
        );
      } else {
        moveBoardDeal(
          queryClient,
          vars.pipelineId,
          vars.dealId,
          context?.previousStageId ?? vars.previousStageId,
        );
      }

      if (context?.previousLists) {
        for (const [key, data] of context.previousLists) {
          queryClient.setQueryData(key, data);
        }
      }

      if (vars.conversationId && context?.previousDetail !== undefined) {
        queryClient.setQueryData(
          queryKeys.conversations.detail(vars.conversationId),
          context.previousDetail,
        );
      }
      if (vars.conversationId && context?.previousContext !== undefined) {
        queryClient.setQueryData(
          queryKeys.conversations.context(vars.conversationId),
          context.previousContext,
        );
      }

      toast.error("Não foi possível alterar a etapa do lead.");
    },
    onSuccess: (_data, vars) => {
      toast.success(`Lead movido para ${vars.stageName}.`);
    },
    onSettled: async (_data, _error, vars) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.pipelines.board(vars.pipelineId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.pipelines.detail(vars.pipelineId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.lists,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.deals.detail(vars.dealId),
        }),
        vars.conversationId
          ? queryClient.invalidateQueries({
              queryKey: queryKeys.conversations.detail(vars.conversationId),
            })
          : Promise.resolve(),
        vars.conversationId
          ? queryClient.invalidateQueries({
              queryKey: queryKeys.conversations.context(vars.conversationId),
            })
          : Promise.resolve(),
      ]);
    },
  });
}
