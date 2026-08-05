"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Filter, Loader2, Menu, Plus, RefreshCw, Search } from "lucide-react";
import { dealsApi, pipelinesApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Deal } from "@/lib/types";
import {
  chooseDefaultPipeline,
  countBoardDeals,
  countBoardUnread,
  filterPipelineBoard,
  findDealInBoard,
  type OperationFilter,
} from "@/lib/operation-utils";
import { moveBoardDeal } from "@/lib/board-cache";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateDealDialog } from "@/components/crm/deal-board-dialogs";
import { OperationEmptyState } from "./operation-empty-state";
import { DealConversationPanel } from "./deal-conversation-panel";

const KanbanBoard = dynamic(
  () =>
    import("@/components/crm/kanban-board").then((mod) => ({
      default: mod.KanbanBoard,
    })),
  { loading: () => <Skeleton className="h-96 w-full" /> },
);

function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });
  React.useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

export function OperationPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const setMobileOpen = useUiStore((s) => s.setSidebarMobileOpen);

  const pipelineParam = searchParams.get("pipeline");
  const dealParam = searchParams.get("deal");
  const search = searchParams.get("q") ?? "";
  const filter = (searchParams.get("filter") as OperationFilter | null) ?? "all";

  const isDesktop = useMediaQuery("(min-width: 1536px)");
  const isMobile = useMediaQuery("(max-width: 767px)");

  const [createOpen, setCreateOpen] = React.useState(false);
  const invalidDealHandled = React.useRef<string | null>(null);

  const pipelinesQuery = useQuery({
    queryKey: queryKeys.pipelines.list({ archived: false, pageSize: 100 }),
    queryFn: () => pipelinesApi.list({ archived: false, pageSize: 100 }),
    staleTime: 60_000,
  });

  const selectedPipeline = React.useMemo(
    () => chooseDefaultPipeline(pipelinesQuery.data?.data ?? [], pipelineParam),
    [pipelinesQuery.data?.data, pipelineParam],
  );

  const boardQuery = useQuery({
    queryKey: queryKeys.pipelines.board(selectedPipeline?.id ?? ""),
    queryFn: () => pipelinesApi.board(selectedPipeline!.id),
    enabled: Boolean(selectedPipeline?.id),
  });

  const board = boardQuery.data;
  const filteredBoard = React.useMemo(() => {
    if (!board) return null;
    return filterPipelineBoard(board, { search, filter });
  }, [board, search, filter]);

  const selectedDeal = React.useMemo(() => {
    if (!dealParam || !board) return null;
    return findDealInBoard(board, dealParam);
  }, [board, dealParam]);

  // Keep selected deal visible even if current filter would hide it.
  const boardForKanban = React.useMemo(() => {
    if (!filteredBoard || !selectedDeal) return filteredBoard;
    const stillVisible = findDealInBoard(filteredBoard, selectedDeal.id);
    if (stillVisible) return filteredBoard;
    return {
      ...filteredBoard,
      stages: (filteredBoard.stages ?? []).map((stage) =>
        stage.id === selectedDeal.stageId
          ? {
              ...stage,
              deals: [
                selectedDeal,
                ...(stage.deals ?? []).filter((d) => d.id !== selectedDeal.id),
              ],
            }
          : stage,
      ),
    };
  }, [filteredBoard, selectedDeal]);

  const panelOpen = Boolean(dealParam && selectedDeal);

  const setParams = React.useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  React.useEffect(() => {
    if (!pipelineParam && selectedPipeline?.id) {
      setParams((params) => {
        params.set("pipeline", selectedPipeline.id);
      });
    }
  }, [pipelineParam, selectedPipeline?.id, setParams]);

  React.useEffect(() => {
    if (!dealParam || !board || boardQuery.isLoading) return;
    if (findDealInBoard(board, dealParam)) {
      invalidDealHandled.current = null;
      return;
    }
    if (invalidDealHandled.current === dealParam) return;
    invalidDealHandled.current = dealParam;
    toast.error("Negócio não encontrado neste quadro.");
    setParams((params) => {
      params.delete("deal");
    });
  }, [dealParam, board, boardQuery.isLoading, setParams]);

  const openDeal = (deal: Deal) => {
    setParams((params) => {
      if (selectedPipeline?.id) params.set("pipeline", selectedPipeline.id);
      params.set("deal", deal.id);
    });
  };

  const closePanel = React.useCallback(() => {
    const focusId = dealParam;
    setParams((params) => {
      params.delete("deal");
    });
    requestAnimationFrame(() => {
      if (!focusId) return;
      document
        .querySelector<HTMLElement>(
          `[data-testid="deal-card"][data-deal-id="${focusId}"]`,
        )
        ?.focus();
    });
  }, [dealParam, setParams]);

  const refresh = async () => {
    const tasks: Promise<unknown>[] = [pipelinesQuery.refetch(), boardQuery.refetch()];
    if (selectedDeal?.conversationId) {
      tasks.push(
        queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.detail(selectedDeal.conversationId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.messages(selectedDeal.conversationId),
        }),
      );
    }
    await Promise.all(tasks);
    toast.success("Atualizado");
  };

  const changeStage = async (deal: Deal, stageId: string) => {
    if (!selectedPipeline || deal.stageId === stageId) return;
    const previousStageId = deal.stageId;
    moveBoardDeal(queryClient, selectedPipeline.id, deal.id, stageId);
    try {
      await dealsApi.move(deal.id, stageId);
      toast.success("Etapa atualizada");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.pipelines.board(selectedPipeline.id),
      });
    } catch (error) {
      moveBoardDeal(queryClient, selectedPipeline.id, deal.id, previousStageId);
      toast.error(
        error instanceof Error ? error.message : "Não foi possível mover o negócio",
      );
    }
  };

  if (pipelinesQuery.isLoading) {
    return (
      <div data-testid="operation-page" className="flex h-full flex-col gap-3 p-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="min-h-0 flex-1 w-full" />
      </div>
    );
  }

  if (!selectedPipeline) {
    return (
      <div data-testid="operation-page" className="flex h-full flex-col p-4">
        <OperationEmptyState />
      </div>
    );
  }

  const totalDeals = countBoardDeals(board);
  const unreadTotal = countBoardUnread(board);
  const showSplit = panelOpen && isDesktop;
  const showDrawer = panelOpen && !isDesktop && !isMobile;
  const showFullScreen = panelOpen && isMobile;

  return (
    <div
      data-testid="operation-page"
      className="flex h-dvh min-h-0 flex-col overflow-hidden"
    >
      <header
        data-testid="operation-header"
        className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-background px-3 py-2.5 sm:px-4"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 lg:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
          data-testid="operation-open-sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h1 className="text-lg font-semibold tracking-tight">Operação</h1>
            <span className="truncate text-sm text-muted-foreground">
              · {selectedPipeline.name}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {totalDeals} negócios
            {unreadTotal > 0 ? ` · ${unreadTotal} não lidas` : ""}
          </p>
        </div>

        <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-testid="operation-search"
            aria-label="Buscar no quadro"
            className="pl-8"
            placeholder="Buscar contato, telefone…"
            value={search}
            onChange={(event) =>
              setParams((params) => {
                const value = event.target.value;
                if (value) params.set("q", value);
                else params.delete("q");
              })
            }
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtros">
          {(
            [
              ["all", "Todos"],
              ["unread", "Não lidos"],
              ["awaiting", "Aguardando"],
              ["no-conversation", "Sem conversa"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={filter === value ? "default" : "outline"}
              data-testid={`operation-filter-${value}`}
              onClick={() =>
                setParams((params) => {
                  if (value === "all") params.delete("filter");
                  else params.set("filter", value);
                })
              }
            >
              {value === "all" ? <Filter className="mr-1 h-3.5 w-3.5" /> : null}
              {label}
            </Button>
          ))}
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label="Atualizar quadro"
          data-testid="operation-refresh"
          onClick={() => void refresh()}
          disabled={boardQuery.isFetching}
        >
          {boardQuery.isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>

        <Button
          type="button"
          size="sm"
          data-testid="operation-new-deal"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="mr-1 h-4 w-4" />
          Novo lead
        </Button>
      </header>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <div
          className={cn(
            "min-h-0 min-w-0 flex-1 overflow-hidden p-3",
            showFullScreen && "hidden",
          )}
          data-testid="operation-kanban"
        >
          {boardQuery.isLoading || !boardForKanban ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <KanbanBoard
              pipeline={boardForKanban}
              onOpenDeal={openDeal}
              variant="operation"
              selectedDealId={dealParam}
              fillColumns={!panelOpen}
              className="h-full"
            />
          )}
        </div>

        {showSplit && selectedDeal ? (
          <aside
            className="flex w-[clamp(620px,40vw,700px)] shrink-0 flex-col border-l border-border bg-background"
            data-testid="operation-conversation-panel"
          >
            <DealConversationPanel
              deal={selectedDeal}
              pipeline={board ?? selectedPipeline}
              onClose={closePanel}
              onStageChange={(stageId) => void changeStage(selectedDeal, stageId)}
            />
          </aside>
        ) : null}

        {showDrawer && selectedDeal ? (
          <div
            className="absolute inset-y-0 right-0 z-30 flex w-[min(60vw,700px)] flex-col border-l border-border bg-background shadow-xl"
            data-testid="operation-conversation-panel"
          >
            <button
              type="button"
              className="absolute inset-y-0 right-full w-screen cursor-default bg-black/20"
              aria-label="Fechar sobreposição"
              onClick={closePanel}
            />
            <DealConversationPanel
              deal={selectedDeal}
              pipeline={board ?? selectedPipeline}
              onClose={closePanel}
              onStageChange={(stageId) => void changeStage(selectedDeal, stageId)}
            />
          </div>
        ) : null}

        {showFullScreen && selectedDeal ? (
          <div
            className="absolute inset-0 z-40 flex flex-col bg-background"
            data-testid="operation-conversation-panel"
          >
            <DealConversationPanel
              deal={selectedDeal}
              pipeline={board ?? selectedPipeline}
              onClose={closePanel}
              onStageChange={(stageId) => void changeStage(selectedDeal, stageId)}
              mobile
            />
          </div>
        ) : null}
      </div>

      <CreateDealDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        pipeline={board ?? selectedPipeline}
      />
    </div>
  );
}
