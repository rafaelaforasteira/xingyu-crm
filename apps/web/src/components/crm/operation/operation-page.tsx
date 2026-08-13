"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Filter, Loader2, Menu, Plus, RefreshCw, Search, Settings } from "lucide-react";
import { dealsApi, pipelinesApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Deal, Pipeline } from "@/lib/types";
import {
  chooseDefaultPipeline,
  countBoardDeals,
  countBoardUnread,
  filterPipelineBoard,
  findDealByConversationId,
  findDealInBoard,
  normalizeFilterForView,
  parseOperationView,
  type OperationFilter,
  type OperationView,
} from "@/lib/operation-utils";
import { moveBoardDeal } from "@/lib/board-cache";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { useUiStore } from "@/stores/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ManualCreateLeadDialog } from "@/components/crm/manual-create-lead-dialog";
import { PipelineViewSwitcher } from "@/components/crm/pipeline-view-switcher";
import { OperationEmptyState } from "./operation-empty-state";
import { DealConversationPanel } from "./deal-conversation-panel";
import { OperationConversationsView } from "./operation-conversations-view";
import { ConfigurePipelineStagesDialog } from "./configure-pipeline-stages-dialog";

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
  const { user } = useAuth();
  const setMobileOpen = useUiStore((s) => s.setSidebarMobileOpen);
  const isAdmin = user?.role === "ADMIN";

  const pipelineParam = searchParams.get("pipeline");
  const dealParam = searchParams.get("deal");
  const conversationParam = searchParams.get("conversation");
  const search = searchParams.get("q") ?? "";
  const rawFilter = (searchParams.get("filter") as OperationFilter | null) ?? "all";
  const view = parseOperationView(searchParams.get("view"));
  const filter = normalizeFilterForView(rawFilter, view);

  const isDesktop = useMediaQuery("(min-width: 1536px)");
  const isMobile = useMediaQuery("(max-width: 767px)");

  const [createOpen, setCreateOpen] = React.useState(false);
  const [stageSettingsOpen, setStageSettingsOpen] = React.useState(false);
  const invalidDealHandled = React.useRef<string | null>(null);
  const invalidConversationHandled = React.useRef<string | null>(null);

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
              deals: [selectedDeal, ...(stage.deals ?? []).filter((d) => d.id !== selectedDeal.id)],
            }
          : stage,
      ),
    };
  }, [filteredBoard, selectedDeal]);

  const panelOpen = view === "kanban" && Boolean(dealParam && selectedDeal);

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
        if (!params.get("view")) params.set("view", "kanban");
      });
    }
  }, [pipelineParam, selectedPipeline?.id, setParams]);

  // Normalize invalid view / incompatible filter in URL.
  React.useEffect(() => {
    const rawView = searchParams.get("view");
    const needsViewFix = rawView != null && rawView !== "kanban" && rawView !== "conversations";
    const needsFilterFix = view === "conversations" && rawFilter === "no-conversation";
    if (!needsViewFix && !needsFilterFix) return;
    setParams((params) => {
      if (needsViewFix) params.set("view", "kanban");
      if (needsFilterFix) params.set("filter", "all");
    });
  }, [rawFilter, searchParams, setParams, view]);

  React.useEffect(() => {
    if (view !== "kanban" || !dealParam || !board || boardQuery.isLoading) return;
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
  }, [dealParam, board, boardQuery.isLoading, setParams, view]);

  const handleInvalidConversation = React.useCallback(
    (conversationId: string) => {
      if (invalidConversationHandled.current === conversationId) return;
      invalidConversationHandled.current = conversationId;
      toast.error("Conversa não encontrada neste pipeline.");
      setParams((params) => {
        params.delete("conversation");
      });
    },
    [setParams],
  );

  React.useEffect(() => {
    if (conversationParam && findDealByConversationId(board, conversationParam)) {
      invalidConversationHandled.current = null;
    }
  }, [board, conversationParam]);

  const switchView = React.useCallback(
    (next: OperationView) => {
      if (!selectedPipeline) return;
      setParams((params) => {
        params.set("pipeline", selectedPipeline.id);
        params.set("view", next);
        const currentFilter = normalizeFilterForView(
          (params.get("filter") as OperationFilter | null) ?? "all",
          next,
        );
        if (currentFilter === "all") params.delete("filter");
        else params.set("filter", currentFilter);

        if (next === "conversations") {
          const openDealId = params.get("deal");
          const openDeal =
            (openDealId ? findDealInBoard(board, openDealId) : null) ??
            (selectedDeal && (!openDealId || selectedDeal.id === openDealId) ? selectedDeal : null);
          params.delete("deal");
          if (openDeal?.conversationId) {
            params.set("conversation", openDeal.conversationId);
          } else {
            params.delete("conversation");
          }
        } else {
          const openConversationId = params.get("conversation");
          const linked = openConversationId
            ? findDealByConversationId(board, openConversationId)
            : null;
          params.delete("conversation");
          if (linked) params.set("deal", linked.id);
          else params.delete("deal");
        }
      });
    },
    [board, selectedDeal, selectedPipeline, setParams],
  );

  const openDeal = (deal: Deal) => {
    setParams((params) => {
      if (selectedPipeline?.id) params.set("pipeline", selectedPipeline.id);
      params.set("view", "kanban");
      params.set("deal", deal.id);
      params.delete("conversation");
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
        .querySelector<HTMLElement>(`[data-testid="deal-card"][data-deal-id="${focusId}"]`)
        ?.focus();
    });
  }, [dealParam, setParams]);

  const selectConversation = React.useCallback(
    (conversationId: string) => {
      setParams((params) => {
        if (selectedPipeline?.id) params.set("pipeline", selectedPipeline.id);
        params.set("view", "conversations");
        params.set("conversation", conversationId);
        params.delete("deal");
      });
    },
    [selectedPipeline?.id, setParams],
  );

  const closeConversation = React.useCallback(() => {
    setParams((params) => {
      params.delete("conversation");
    });
  }, [setParams]);

  const refresh = async (notify = true) => {
    const tasks: Promise<unknown>[] = [
      pipelinesQuery.refetch(),
      boardQuery.refetch(),
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.lists }),
    ];
    const activeConversation = conversationParam || selectedDeal?.conversationId || null;
    if (activeConversation) {
      tasks.push(
        queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.detail(activeConversation),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.messages(activeConversation),
        }),
      );
    }
    await Promise.all(tasks);
    if (notify) toast.success("Atualizado");
  };

  const changeStage = async (deal: Deal, stageId: string) => {
    if (!selectedPipeline || deal.stageId === stageId) return;
    const previousStageId = deal.stageId;
    moveBoardDeal(queryClient, selectedPipeline.id, deal.id, stageId);
    try {
      await dealsApi.move(deal.id, stageId);
      toast.success("Etapa atualizada");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.pipelines.board(selectedPipeline.id),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.lists,
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.deals.history(deal.id) }),
      ]);
    } catch (error) {
      moveBoardDeal(queryClient, selectedPipeline.id, deal.id, previousStageId);
      toast.error(error instanceof Error ? error.message : "Não foi possível mover o negócio");
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

  const conversationFilters: Array<[OperationFilter, string]> = [
    ["all", "Todas"],
    ["unread", "Não lidas"],
    ["awaiting", "Aguardando resposta"],
  ];
  const kanbanFilters: Array<[OperationFilter, string]> = [
    ["all", "Todos"],
    ["unread", "Não lidos"],
    ["awaiting", "Aguardando"],
    ["no-conversation", "Sem conversa"],
  ];
  const filterButtons = view === "conversations" ? conversationFilters : kanbanFilters;

  return (
    <div
      data-testid="operation-page"
      data-view={view}
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
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="text-lg font-semibold tracking-tight">Operação</h1>
            <span className="truncate text-sm text-muted-foreground">
              · {selectedPipeline.name}
            </span>
            <PipelineViewSwitcher
              pipelineId={selectedPipeline.id}
              active={view}
              kanbanLabel="Pipeline"
              onNavigate={switchView}
            />
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
          {filterButtons.map(([value, label]) => (
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

        {view === "kanban" ? (
          <Button
            type="button"
            size="sm"
            data-testid="operation-new-deal"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="mr-1 h-4 w-4" />
            Novo lead
          </Button>
        ) : null}

        {isAdmin ? (
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-9 w-9 shrink-0 rounded-lg"
            aria-label="Configurar esteira"
            title="Configurar esteira"
            data-testid="operation-configure-stages"
            onClick={() => setStageSettingsOpen(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        ) : null}
      </header>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {view === "conversations" ? (
          <div className="min-h-0 min-w-0 flex-1">
            <OperationConversationsView
              pipeline={selectedPipeline}
              board={board}
              conversationId={conversationParam}
              search={search}
              filter={filter}
              onSelectConversation={selectConversation}
              onCloseConversation={closeConversation}
              onStageChange={(deal, stageId) => void changeStage(deal, stageId)}
              onInvalidConversation={handleInvalidConversation}
            />
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>

      <ManualCreateLeadDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        pipeline={(board ?? selectedPipeline) as Pipeline}
      />

      {isAdmin ? (
        <ConfigurePipelineStagesDialog
          open={stageSettingsOpen}
          pipelineId={selectedPipeline.id}
          pipelineName={selectedPipeline.name}
          onOpenChange={setStageSettingsOpen}
          onChanged={() => refresh(false)}
        />
      ) : null}
    </div>
  );
}
