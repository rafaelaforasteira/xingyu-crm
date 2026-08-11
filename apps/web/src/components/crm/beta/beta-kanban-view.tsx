"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { pipelinesApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Deal } from "@/lib/types";
import {
  BETA_PIPELINE_ID,
  buildBetaConversationsHref,
  buildBetaKanbanHref,
} from "@/lib/beta-config";
import { countBoardDeals, filterPipelineBoard } from "@/lib/operation-utils";
import { PageHeader, ErrorBanner } from "@/components/crm/page-header";
import { PipelineViewSwitcher } from "@/components/crm/pipeline-view-switcher";
import { CreateDealDialog } from "@/components/crm/deal-board-dialogs";
import { DealWorkspaceDrawer, DealWorkspacePage } from "@/components/crm/deal-workspace";
import { useUiStore } from "@/stores/ui";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PipelineStageSettingsButton } from "@/components/crm/operation/pipeline-stage-settings-button";

const KanbanBoard = dynamic(
  () =>
    import("@/components/crm/kanban-board").then((mod) => ({
      default: mod.KanbanBoard,
    })),
  {
    loading: () => <Skeleton className="h-96 w-full" />,
  },
);

function useIsMobile() {
  const [mobile, setMobile] = React.useState(false);
  React.useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const onChange = () => setMobile(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return mobile;
}

export function BetaKanbanView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pipelineId = BETA_PIPELINE_ID;
  const dealParam = searchParams.get("deal");
  const searchQuery = searchParams.get("q") ?? "";
  const openDealDrawer = useUiStore((state) => state.openDealDrawer);
  const closeDealDrawer = useUiStore((state) => state.closeDealDrawer);
  const [createDealOpen, setCreateDealOpen] = React.useState(false);
  const isMobile = useIsMobile();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.pipelines.board(pipelineId),
    queryFn: () => pipelinesApi.board(pipelineId),
    retry: false,
  });

  const filteredBoard = React.useMemo(() => {
    if (!data) return null;
    if (!searchQuery.trim()) return data;
    return filterPipelineBoard(data, { search: searchQuery });
  }, [data, searchQuery]);

  const hasSearchResults =
    !searchQuery.trim() || (filteredBoard != null && countBoardDeals(filteredBoard) > 0);

  const setDealParam = React.useCallback(
    (dealId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("view", "kanban");
      params.delete("pipeline");
      params.delete("conversation");
      if (dealId) params.set("deal", dealId);
      else params.delete("deal");
      router.replace(`/operacao?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  React.useEffect(() => {
    if (isMobile) {
      closeDealDrawer();
      return;
    }
    if (dealParam) openDealDrawer(dealParam);
    else closeDealDrawer();
  }, [closeDealDrawer, dealParam, isMobile, openDealDrawer]);

  const onOpenDeal = (deal: Deal) => {
    setDealParam(deal.id);
    if (!isMobile) openDealDrawer(deal.id);
  };

  const onCloseMobileDeal = () => {
    closeDealDrawer();
    setDealParam(null);
  };

  const onCloseDrawer = React.useCallback(() => {
    setDealParam(null);
  }, [setDealParam]);

  const qOpt = searchQuery.trim() ? { q: searchQuery } : undefined;

  return (
    <div data-testid="beta-kanban">
      <div data-testid="beta-page-header">
        <PageHeader
          title={data?.name ?? "Pipeline"}
          description={data?.description ?? "Quadro Kanban"}
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <PipelineViewSwitcher
                pipelineId={pipelineId}
                active="kanban"
                kanbanHref={buildBetaKanbanHref(null, qOpt)}
                conversationsHref={buildBetaConversationsHref(null, qOpt)}
                kanbanLabel="Kanban"
                dataTestIdPrefix="beta"
              />
              <Button
                type="button"
                disabled={!data?.stages?.length}
                onClick={() => setCreateDealOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Criar card
              </Button>
              <PipelineStageSettingsButton
                pipelineId={pipelineId}
                pipelineName={data?.name ?? "Pipeline"}
              />
            </div>
          }
        />
      </div>
      {error ? <ErrorBanner message={(error as Error).message} /> : null}
      {isLoading ? <Skeleton className="h-96 w-full" /> : null}
      {filteredBoard ? (
        <>
          {!hasSearchResults ? (
            <p
              className="mb-3 text-sm text-muted-foreground"
              data-testid="beta-kanban-empty-search"
              role="status"
            >
              Nenhum lead encontrado.
            </p>
          ) : null}
          <KanbanBoard
            pipeline={filteredBoard}
            onOpenDeal={onOpenDeal}
            selectedDealId={dealParam}
          />
        </>
      ) : null}
      {data ? (
        <CreateDealDialog open={createDealOpen} onOpenChange={setCreateDealOpen} pipeline={data} />
      ) : null}
      <div data-testid="beta-deal-drawer">
        <DealWorkspaceDrawer onClose={onCloseDrawer} />
      </div>
      {isMobile && dealParam ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-background md:hidden">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <Button type="button" variant="ghost" size="sm" onClick={onCloseMobileDeal}>
              Voltar ao quadro
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <DealWorkspacePage dealId={dealParam} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
