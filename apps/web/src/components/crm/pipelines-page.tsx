"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArchiveRestore,
  Copy,
  EllipsisVertical,
  ExternalLink,
  Kanban,
  Pencil,
  Plus,
  Search,
  Settings,
  Star,
  SlidersHorizontal,
  Trash2,
  Users,
  UsersRound,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { pipelinesApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { cn, formatCurrency } from "@/lib/utils";
import { PageHeader, PaginationBar, ErrorBanner } from "@/components/crm/page-header";
import { PipelineViewSwitcher } from "@/components/crm/pipeline-view-switcher";
import { ManualCreateLeadDialog } from "@/components/crm/manual-create-lead-dialog";
import { DealWorkspaceDrawer } from "@/components/crm/deal-workspace";
import { PipelineFormDialog } from "@/components/crm/pipeline-form-dialog";
import { useUiStore } from "@/stores/ui";
import type { Deal, Pipeline } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { resolvePipelineIcon } from "@/lib/pipeline-icons";
import { useAuth } from "@/components/auth/auth-provider";

const KanbanBoard = dynamic(
  () => import("@/components/crm/kanban-board").then((mod) => ({ default: mod.KanbanBoard })),
  {
    loading: () => <Skeleton className="h-96 w-full" />,
  },
);

type PipelineTab = "active" | "archived" | "favorites";
type PipelineAction = "duplicate" | "favorite" | "archive" | "restore";

function formatUpdatedAt(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function closeActionsMenu(element: HTMLElement) {
  element.closest("details")?.removeAttribute("open");
}

function MenuButton({
  icon: Icon,
  children,
  destructive,
  disabled,
  onClick,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition hover:bg-accent disabled:pointer-events-none disabled:opacity-50",
        destructive && "text-destructive hover:bg-destructive/5",
      )}
      onClick={(event) => {
        closeActionsMenu(event.currentTarget);
        onClick();
      }}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function PipelineCard({
  pipeline,
  actionPending,
  onEdit,
  onDelete,
  onAction,
  canManage,
}: {
  pipeline: Pipeline;
  actionPending: boolean;
  onEdit: (pipeline: Pipeline) => void;
  onDelete: (pipeline: Pipeline) => void;
  onAction: (action: PipelineAction, pipeline: Pipeline) => void;
  canManage: boolean;
}) {
  const router = useRouter();
  const Icon = resolvePipelineIcon(pipeline.icon);
  const stagesCount = pipeline.stagesCount ?? pipeline.stages?.length ?? 0;
  const dealsCount = pipeline.dealsCount ?? 0;
  const channels = pipeline.channels?.filter((channel) => channel.enabled !== false) ?? [];

  return (
    <Card
      data-testid="pipeline-card"
      data-pipeline-id={pipeline.id}
      role="link"
      tabIndex={0}
      aria-label={`Abrir pipeline ${pipeline.name}`}
      className="flex h-full cursor-pointer flex-col transition hover:border-primary/30 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => router.push(`/pipelines/${pipeline.id}?view=kanban`)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") router.push(`/pipelines/${pipeline.id}?view=kanban`);
      }}
    >
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
            style={{ backgroundColor: pipeline.color ?? "#7c3aed" }}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <CardTitle className="truncate">
              <Link
                href={`/pipelines/${pipeline.id}?view=kanban`}
                className="outline-none hover:text-primary focus-visible:text-primary"
                onClick={(event) => event.stopPropagation()}
              >
                {pipeline.name}
              </Link>
            </CardTitle>
            <div className="mt-1 flex flex-wrap gap-1">
              <Badge variant={pipeline.archived ? "secondary" : "success"}>
                {pipeline.archived ? "Arquivado" : "Ativo"}
              </Badge>
              {pipeline.isDefault ? <Badge>Padrão</Badge> : null}
            </div>
          </div>
        </div>

        <details className="relative shrink-0" onClick={(event) => event.stopPropagation()}>
          <summary
            aria-label={`Ações do pipeline ${pipeline.name}`}
            title="Ações do pipeline"
            className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground [&::-webkit-details-marker]:hidden"
          >
            <EllipsisVertical className="h-4 w-4" />
          </summary>
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 w-52 rounded-lg border border-border bg-card p-1.5 shadow-card"
          >
            <Link
              role="menuitem"
              href={`/pipelines/${pipeline.id}?view=kanban`}
              className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition hover:bg-accent"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir
            </Link>
            {canManage ? <><MenuButton icon={Pencil} disabled={actionPending} onClick={() => onEdit(pipeline)}>
              Editar
            </MenuButton>
            <Link
              role="menuitem"
              href={`/pipelines/access?pipelineId=${pipeline.id}`}
              className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition hover:bg-accent"
            >
              <Settings className="h-4 w-4" />
              Configurar
            </Link>
            <Link
              role="menuitem"
              href={`/pipelines/${pipeline.id}/settings/stages`}
              className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition hover:bg-accent"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Etapas
            </Link>
            <Link
              role="menuitem"
              href={`/pipelines/${pipeline.id}/channels`}
              className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition hover:bg-accent"
            >
              <Wifi className="h-4 w-4" />
              Canais
            </Link>
            <div className="my-1 border-t border-border" />
            <MenuButton
              icon={Copy}
              disabled={actionPending}
              onClick={() => onAction("duplicate", pipeline)}
            >
              Duplicar
            </MenuButton>
            <MenuButton
              icon={Star}
              disabled={actionPending}
              onClick={() => onAction("favorite", pipeline)}
            >
              {pipeline.favorite ? "Remover dos favoritos" : "Favoritar"}
            </MenuButton>
            {pipeline.archived ? (
              <MenuButton
                icon={ArchiveRestore}
                disabled={actionPending}
                onClick={() => onAction("restore", pipeline)}
              >
                Restaurar
              </MenuButton>
            ) : (
              <MenuButton
                icon={Archive}
                disabled={actionPending}
                onClick={() => onAction("archive", pipeline)}
              >
                Arquivar
              </MenuButton>
            )}
            <MenuButton
              icon={Trash2}
              destructive
              disabled={actionPending}
              onClick={() => onDelete(pipeline)}
            >
              Excluir
            </MenuButton>
            </> : null}
          </div>
        </details>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        <p className="min-h-10 text-sm text-muted-foreground">
          {pipeline.description || "Sem descrição."}
        </p>

        <div className="mt-4 grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-muted/30 py-2">
          <div className="px-2 text-center">
            <p className="text-sm font-semibold">{stagesCount}</p>
            <p className="text-[11px] text-muted-foreground">etapas</p>
          </div>
          <div className="px-2 text-center">
            <p className="text-sm font-semibold">{dealsCount}</p>
            <p className="text-[11px] text-muted-foreground">negócios</p>
          </div>
          <div className="min-w-0 px-2 text-center">
            <p className="truncate text-sm font-semibold">
              {pipeline.openValue == null ? "—" : formatCurrency(Number(pipeline.openValue))}
            </p>
            <p className="text-[11px] text-muted-foreground">em aberto</p>
          </div>
        </div>

        <dl className="mt-4 space-y-2 text-xs">
          <div className="flex items-start justify-between gap-3">
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <Wifi className="h-3.5 w-3.5" />
              Canais
            </dt>
            <dd className="max-w-[65%] text-right">
              {channels.length
                ? channels.map((channel) => channel.name).join(", ")
                : "Nenhum canal conectado"}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Equipe padrão
            </dt>
            <dd className="max-w-[65%] truncate text-right">
              {pipeline.defaultTeam?.name ?? "Não definida"}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="text-muted-foreground">Responsável padrão</dt>
            <dd className="max-w-[65%] truncate text-right">
              {pipeline.defaultOwner?.name ?? "Não definido"}
            </dd>
          </div>
        </dl>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-[11px] text-muted-foreground">
            Atualizado em {formatUpdatedAt(pipeline.updatedAt)}
          </p>
          <Link
            href={`/pipelines/${pipeline.id}?view=kanban`}
            className="text-xs font-medium text-primary hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            Abrir pipeline
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export function PipelinesListPage() {
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN";
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [tab, setTab] = React.useState<PipelineTab>("active");
  const [search, setSearch] = React.useState("");
  const deferredSearch = React.useDeferredValue(search.trim());
  const [page, setPage] = React.useState(1);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingPipeline, setEditingPipeline] = React.useState<Pipeline | null>(null);
  const [pipelineToDelete, setPipelineToDelete] = React.useState<Pipeline | null>(null);
  const [pendingAction, setPendingAction] = React.useState<{ action: "duplicate" | "archive"; pipeline: Pipeline } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = React.useState("");

  const params = {
    page,
    pageSize: 12,
    search: deferredSearch || undefined,
    archived: tab === "archived",
    favorite: tab === "favorites" ? true : undefined,
  };

  const list = useQuery({
    queryKey: queryKeys.pipelines.list(params),
    queryFn: () => pipelinesApi.list(params),
    retry: false,
  });

  React.useEffect(() => {
    const idleDays = searchParams.get("idleDays");
    const stageId = searchParams.get("stageId");
    if (!idleDays && !stageId) return;
    const first = list.data?.data?.[0];
    if (!first) return;
    const next = new URLSearchParams();
    if (idleDays) next.set("idleDays", idleDays);
    if (stageId) next.set("stageId", stageId);
    router.replace(`/pipelines/${first.id}?${next.toString()}`);
  }, [list.data?.data, router, searchParams]);

  const actionMutation = useMutation({
    mutationFn: ({ action, pipeline }: { action: PipelineAction; pipeline: Pipeline }) => {
      if (action === "duplicate") return pipelinesApi.duplicate(pipeline.id);
      if (action === "favorite") {
        return pipelinesApi.update(pipeline.id, {
          favorite: !pipeline.favorite,
        });
      }
      if (action === "archive") return pipelinesApi.archive(pipeline.id);
      return pipelinesApi.restore(pipeline.id);
    },
    onMutate: async (variables) => {
      if (variables.action !== "favorite") return;
      await queryClient.cancelQueries({ queryKey: queryKeys.pipelines.all });
      const snapshots = queryClient.getQueriesData({ queryKey: queryKeys.pipelines.all });
      queryClient.setQueriesData({ queryKey: queryKeys.pipelines.all }, (current: unknown) => {
        if (!current || typeof current !== "object") return current;
        const response = current as { data?: Pipeline[] };
        if (!Array.isArray(response.data)) return current;
        return { ...response, data: response.data.map((item) => item.id === variables.pipeline.id ? { ...item, favorite: !item.favorite } : item) };
      });
      return { snapshots };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all });
      setPendingAction(null);
      const messages: Record<PipelineAction, string> = {
        duplicate: "Pipeline duplicado",
        favorite: variables.pipeline.favorite
          ? "Pipeline removido dos favoritos"
          : "Pipeline adicionado aos favoritos",
        archive: "Pipeline arquivado",
        restore: "Pipeline restaurado",
      };
      toast.success(messages[variables.action]);
    },
    onError: (error: Error, _variables, context) => {
      context?.snapshots?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (pipeline: Pipeline) => pipelinesApi.remove(pipeline.id),
    onSuccess: (_, pipeline) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all });
      toast.success(`Pipeline “${pipeline.name}” excluído`);
      setPipelineToDelete(null);
      setDeleteConfirmation("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const openCreateDialog = () => {
    setEditingPipeline(null);
    setFormOpen(true);
  };

  const openEditDialog = (pipeline: Pipeline) => {
    setEditingPipeline(pipeline);
    setFormOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Pipelines"
        description="Crie, organize e acompanhe todos os funis da operação."
        actions={
          <div className="flex flex-wrap gap-2">
            {canManage ? <Link className={buttonVariants({ variant: "outline" })} href="/pipelines/access"><UsersRound className="h-4 w-4" />Equipes e acessos</Link> : null}
            {canManage ? <Button onClick={openCreateDialog}><Plus className="h-4 w-4" />Criar pipeline</Button> : null}
          </div>
        }
      />

      <div className="mb-5 flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={tab}
          onValueChange={(value) => {
            setTab(value as PipelineTab);
            setPage(1);
          }}
        >
          <TabsList>
            <TabsTrigger value="active">Ativos</TabsTrigger>
            <TabsTrigger value="archived">Arquivados</TabsTrigger>
            <TabsTrigger value="favorites">Favoritos</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Buscar pipelines"
            placeholder="Buscar por nome…"
            className="pl-9"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {list.error ? <ErrorBanner message={(list.error as Error).message} /> : null}

      {list.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-[360px] w-full" />
          ))}
        </div>
      ) : null}

      {!list.isLoading && (list.data?.data.length ?? 0) === 0 ? (
        <EmptyState
          icon={tab === "archived" ? Archive : Kanban}
          title={
            search
              ? "Nenhum pipeline encontrado"
              : tab === "archived"
                ? "Nenhum pipeline arquivado"
                : tab === "favorites"
                  ? "Nenhum pipeline favorito"
                  : "Nenhum pipeline ativo"
          }
          description={
            search
              ? "Tente buscar por outro nome."
              : "Crie um pipeline para organizar as oportunidades."
          }
          actionLabel={tab === "active" && !search ? "Criar pipeline" : undefined}
          onAction={tab === "active" && !search ? openCreateDialog : undefined}
        />
      ) : null}

      {list.data?.data.length ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {list.data.data.map((pipeline) => (
              <PipelineCard
                key={pipeline.id}
                pipeline={pipeline}
                canManage={canManage}
                actionPending={actionMutation.isPending || deleteMutation.isPending}
                onEdit={openEditDialog}
                onDelete={(selectedPipeline) => { setDeleteConfirmation(""); setPipelineToDelete(selectedPipeline); }}
                onAction={(action, selectedPipeline) => {
                  if (action === "duplicate" || action === "archive") setPendingAction({ action, pipeline: selectedPipeline });
                  else actionMutation.mutate({ action, pipeline: selectedPipeline });
                }}
              />
            ))}
          </div>
          <PaginationBar
            page={list.data.meta.page}
            totalPages={list.data.meta.totalPages}
            onPageChange={setPage}
          />
        </>
      ) : null}

      <PipelineFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingPipeline(null);
        }}
        pipeline={editingPipeline}
        onSaved={(savedPipeline, mode) => {
          if (mode === "create") router.push(`/pipelines/${savedPipeline.id}`);
        }}
      />

      <Dialog
        open={Boolean(pipelineToDelete)}
        onOpenChange={(open) => {
          if (!open) setPipelineToDelete(null);
        }}
        title={pipelineToDelete && (pipelineToDelete.dealsCount ?? 0) > 0 ? "Não é possível excluir este pipeline" : "Excluir pipeline?"}
        description={pipelineToDelete && (pipelineToDelete.dealsCount ?? 0) > 0 ? "Arquive-o para removê-lo da operação sem perder dados." : "Esta ação é permanente."}
      >
        <div className="space-y-4">
          {(pipelineToDelete?.dealsCount ?? 0) > 0 ? <p className="text-sm text-muted-foreground">Este pipeline possui <strong className="text-foreground">{pipelineToDelete?.dealsCount} negócios</strong>. Os negócios e o histórico serão preservados.</p> : <>
            <p className="text-sm text-muted-foreground">Digite <strong className="text-foreground">{pipelineToDelete?.name}</strong> para confirmar:</p>
            <Input aria-label="Nome do pipeline para confirmar exclusão" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} autoComplete="off" />
          </>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setPipelineToDelete(null)}>
              Cancelar
            </Button>
            {(pipelineToDelete?.dealsCount ?? 0) === 0 ? <Button
              type="button"
              variant="destructive"
              disabled={!pipelineToDelete || deleteMutation.isPending || deleteConfirmation !== pipelineToDelete.name}
              onClick={() => {
                if (pipelineToDelete) deleteMutation.mutate(pipelineToDelete);
              }}
            >
              {deleteMutation.isPending ? "Excluindo…" : "Excluir permanentemente"}
            </Button> : null}
          </div>
        </div>
      </Dialog>

      <Dialog open={Boolean(pendingAction)} onOpenChange={(open) => { if (!open) setPendingAction(null); }} title={pendingAction?.action === "duplicate" ? "Duplicar pipeline?" : "Arquivar pipeline?"} description={pendingAction?.action === "duplicate" ? "Será criada uma nova esteira com a mesma estrutura de etapas." : `“${pendingAction?.pipeline.name ?? ""}” deixará de aparecer entre os pipelines ativos.`}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{pendingAction?.action === "duplicate" ? "Negócios e históricos não serão copiados." : "Os negócios e o histórico serão preservados."}</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setPendingAction(null)}>Cancelar</Button>
            <Button type="button" disabled={!pendingAction || actionMutation.isPending} onClick={() => pendingAction && actionMutation.mutate(pendingAction)}>{actionMutation.isPending ? "Processando…" : pendingAction?.action === "duplicate" ? "Duplicar" : "Arquivar"}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export function PipelineBoardPage({ pipelineId }: { pipelineId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openDealDrawer = useUiStore((state) => state.openDealDrawer);
  const [createDealOpen, setCreateDealOpen] = React.useState(false);
  const stageId = searchParams.get("stageId") || undefined;
  const idleDaysRaw = searchParams.get("idleDays");
  const idleDays = idleDaysRaw ? Number(idleDaysRaw) : undefined;
  const idleDaysFilter =
    idleDays != null && Number.isFinite(idleDays) && idleDays > 0 ? idleDays : undefined;

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.pipelines.board(pipelineId),
    queryFn: () => pipelinesApi.board(pipelineId),
    retry: false,
  });

  const onOpenDeal = (deal: Deal) => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      router.push(`/pipelines/${pipelineId}/deals/${deal.id}`);
      return;
    }
    openDealDrawer(deal.id);
  };

  const clearBoardFilters = () => {
    router.replace(`/pipelines/${pipelineId}`);
  };

  return (
    <div>
      <PageHeader
        title={data?.name ?? "Pipeline"}
        description={data?.description ?? "Quadro Kanban"}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <PipelineViewSwitcher pipelineId={pipelineId} active="kanban" />
            <Link href="/pipelines" className="text-sm text-primary hover:underline">
              Todos os pipelines
            </Link>
            <Button
              type="button"
              disabled={!data?.stages?.length}
              onClick={() => setCreateDealOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Criar lead
            </Button>
          </div>
        }
      />
      {stageId || idleDaysFilter ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-soft">
          <p className="text-muted-foreground">
            {stageId ? "Exibindo apenas a etapa selecionada. " : null}
            {idleDaysFilter
              ? `Exibindo negócios sem movimentação há ${idleDaysFilter}+ dias.`
              : null}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={clearBoardFilters}>
            Limpar filtro
          </Button>
        </div>
      ) : null}
      {error ? <ErrorBanner message={(error as Error).message} /> : null}
      {isLoading ? <Skeleton className="h-96 w-full" /> : null}
      {data ? (
        <KanbanBoard
          pipeline={data}
          onOpenDeal={onOpenDeal}
          filterStageId={stageId}
          idleDays={idleDaysFilter}
        />
      ) : null}
      {data ? (
        <ManualCreateLeadDialog
          open={createDealOpen}
          onOpenChange={setCreateDealOpen}
          pipeline={data}
        />
      ) : null}
      <DealWorkspaceDrawer />
    </div>
  );
}
