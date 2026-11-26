"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArchiveRestore,
  CircleAlert,
  ClipboardList,
  Copy,
  Ellipsis,
  Facebook,
  Globe2,
  Instagram,
  Kanban,
  Mail,
  MessageCircle,
  Pencil,
  Plus,
  Radio,
  Search,
  ShieldCheck,
  ShoppingBag,
  Star,
  Trash2,
  UserRound,
  UsersRound,
  Webhook,
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
import type { Deal, Pipeline, PipelineChannelSummary } from "@/lib/types";
import { WhatsAppIcon } from "@/components/crm/connections/whatsapp-icon";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SlidingPills } from "@/components/ui/sliding-pills";
import { Popover } from "@/components/ui/popover";
import { resolvePipelineIcon } from "@/lib/pipeline-icons";
import { displayPipelineName } from "@/lib/pipeline-display";
import { useAuth } from "@/components/auth/auth-provider";
import { Avatar } from "@/components/ui/avatar";

const KanbanBoard = dynamic(
  () => import("@/components/crm/kanban-board").then((mod) => ({ default: mod.KanbanBoard })),
  {
    loading: () => <Skeleton className="h-96 w-full" />,
  },
);

type PipelineTab = "active" | "archived" | "favorites";
const PIPELINE_TABS: { value: PipelineTab; label: string }[] = [
  { value: "active", label: "Ativos" },
  { value: "archived", label: "Arquivados" },
  { value: "favorites", label: "Favoritos" },
];
type PipelineAction = "duplicate" | "favorite" | "archive" | "restore";

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
        "group/item flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        destructive
          ? "text-destructive hover:bg-destructive/[0.07] focus-visible:bg-destructive/[0.07]"
          : "text-foreground hover:bg-primary/[0.07] hover:text-primary focus-visible:bg-primary/[0.07] focus-visible:text-primary",
      )}
      onClick={onClick}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          destructive ? "text-destructive" : "text-muted-foreground group-hover/item:text-primary group-focus-visible/item:text-primary",
        )}
        aria-hidden
      />
      {children}
    </button>
  );
}

/**
 * Menu dos 3 pontinhos do card. Abre em um popover sobre a página, que fecha
 * ao clicar fora ou apertar Esc. Os cliques dentro dele não abrem o card.
 */
function PipelineActionsMenu({
  pipeline,
  actionPending,
  onEdit,
  onChannels,
  onAction,
  onDelete,
}: {
  pipeline: Pipeline;
  actionPending: boolean;
  onEdit: () => void;
  onChannels: () => void;
  onAction: (action: PipelineAction) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const run = (callback: () => void) => () => {
    setOpen(false);
    callback();
  };

  return (
    <span
      className="-mr-1.5 -mt-1 shrink-0"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Popover
        open={open}
        onOpenChange={setOpen}
        align="end"
        contentWidth={208}
        aria-label={`Ações do pipeline ${pipeline.name}`}
        contentClassName="rounded-xl shadow-[0_12px_32px_-12px_rgb(40_20_90/0.25)]"
        trigger={
          <button
            type="button"
            aria-label={`Ações do pipeline ${pipeline.name}`}
            aria-haspopup="menu"
            aria-expanded={open}
            title="Ações do pipeline"
            onClick={() => setOpen((current) => !current)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/70 transition hover:bg-primary/[0.07] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
              open && "bg-primary/[0.08] text-primary",
            )}
          >
            <Ellipsis className="h-4 w-4" />
          </button>
        }
      >
        <div role="menu" aria-label={`Ações do pipeline ${pipeline.name}`} className="p-1.5">
          <MenuButton icon={Pencil} disabled={actionPending} onClick={run(onEdit)}>
            Editar
          </MenuButton>
          <MenuButton icon={Radio} onClick={run(onChannels)}>
            Canais
          </MenuButton>
          <div className="mx-2 my-1.5 border-t border-border/70" />
          <MenuButton icon={Copy} disabled={actionPending} onClick={run(() => onAction("duplicate"))}>
            Duplicar
          </MenuButton>
          <MenuButton icon={Star} disabled={actionPending} onClick={run(() => onAction("favorite"))}>
            {pipeline.favorite ? "Remover dos favoritos" : "Favoritar"}
          </MenuButton>
          {pipeline.archived ? (
            <MenuButton icon={ArchiveRestore} disabled={actionPending} onClick={run(() => onAction("restore"))}>
              Restaurar
            </MenuButton>
          ) : (
            <MenuButton icon={Archive} disabled={actionPending} onClick={run(() => onAction("archive"))}>
              Arquivar
            </MenuButton>
          )}
          <div className="mx-2 my-1.5 border-t border-border/70" />
          <MenuButton icon={Trash2} destructive disabled={actionPending} onClick={run(onDelete)}>
            Excluir
          </MenuButton>
        </div>
      </Popover>
    </span>
  );
}

type AccessPerson = { id: string; name: string; avatarUrl?: string | null };
type PipelineAccessSummary = {
  accessMode: "ORGANIZATION" | "RESTRICTED";
  teams: { id: string; name: string }[];
  users: AccessPerson[];
  organizationUsers: AccessPerson[];
};
type AccessMember =
  | ({ kind: "user" } & AccessPerson)
  | { kind: "team"; id: string; name: string };

const ACCESS_STACK_LIMIT = 4;

/** Ícone e cor de marca de cada canal conectado ao pipeline. */
function channelVisual(channel: PipelineChannelSummary): { label: string; color: string; icon: React.ReactNode } {
  const value = `${channel.type ?? ""} ${channel.name}`.toLowerCase();
  const iconClass = "h-3 w-3";
  if (value.includes("whatsapp")) return { label: "WhatsApp", color: "#25D366", icon: <WhatsAppIcon className={iconClass} /> };
  if (value.includes("instagram")) return { label: "Instagram", color: "#E1306C", icon: <Instagram className={iconClass} /> };
  if (value.includes("facebook") || value.includes("messenger")) return { label: "Facebook", color: "#1877F2", icon: <Facebook className={iconClass} /> };
  if (value.includes("shopify")) return { label: "Shopify", color: "#5E8E3E", icon: <ShoppingBag className={iconClass} /> };
  if (value.includes("email") || value.includes("e-mail")) return { label: "E-mail", color: "#64748B", icon: <Mail className={iconClass} /> };
  if (value.includes("chat") || value.includes("site") || value.includes("web_")) return { label: "Chat do site", color: "#0EA5E9", icon: <Globe2 className={iconClass} /> };
  if (value.includes("form")) return { label: "Formulário", color: "#F59E0B", icon: <ClipboardList className={iconClass} /> };
  if (value.includes("webhook")) return { label: "Webhook", color: "#475569", icon: <Webhook className={iconClass} /> };
  return { label: "Manual", color: "#94A3B8", icon: <MessageCircle className={iconClass} /> };
}

/** Bolinhas sobrepostas dos canais conectados: até 4 e depois "+N". */
function ChannelStack({ channels }: { channels: PipelineChannelSummary[] }) {
  if (!channels.length) return <span className="text-muted-foreground">Nenhum</span>;
  const visible = channels.slice(0, ACCESS_STACK_LIMIT);
  const extra = channels.length - visible.length;
  const titles = channels.map((channel) => `${channelVisual(channel).label}: ${channel.name}`);
  return (
    <span className="flex items-center -space-x-1.5" title={titles.join(", ")} aria-label={`${channels.length} canais conectados`}>
      {visible.map((channel) => {
        const visual = channelVisual(channel);
        return (
          <span
            key={channel.id}
            className="relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-card text-white"
            style={{ backgroundColor: visual.color }}
          >
            {visual.icon}
          </span>
        );
      })}
      {extra > 0 ? (
        <span className="relative flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-card bg-muted px-1 text-[9px] font-semibold text-muted-foreground">
          +{extra}
        </span>
      ) : null}
    </span>
  );
}

/** Bolinhas sobrepostas de quem tem acesso: até 4 e depois "+N". */
function AccessStack({ members, everyone }: { members: AccessMember[]; everyone: boolean }) {
  if (!members.length) {
    return <span className="text-muted-foreground">{everyone ? "Toda a organização" : "Ninguém"}</span>;
  }
  const visible = members.slice(0, ACCESS_STACK_LIMIT);
  const extra = members.length - visible.length;
  const names = members.map((member) => (member.kind === "team" ? `Time ${member.name}` : member.name));
  return (
    <span
      className="flex items-center -space-x-1.5"
      title={everyone ? `Toda a organização: ${names.join(", ")}` : names.join(", ")}
      aria-label={`${members.length} com acesso`}
    >
      {visible.map((member) =>
        member.kind === "team" ? (
          <span
            key={`team-${member.id}`}
            className="relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-primary/[0.12] text-primary"
          >
            <UsersRound className="h-3 w-3" aria-hidden />
          </span>
        ) : (
          <Avatar
            key={`user-${member.id}`}
            name={member.name}
            src={member.avatarUrl}
            className="relative h-6 w-6 border-2 border-card text-[8px]"
          />
        ),
      )}
      {extra > 0 ? (
        <span className="relative flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-card bg-muted px-1 text-[9px] font-semibold text-muted-foreground">
          +{extra}
        </span>
      ) : null}
    </span>
  );
}

/** Linha informativa do rodapé do card (ícone, rótulo e valor). */
function CardInfoRow({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-9 items-center justify-between gap-3 px-1.5">
      <dt className="flex shrink-0 items-center gap-2 text-muted-foreground">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/[0.08] text-primary">
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
        {label}
      </dt>
      <dd className="flex min-w-0 items-center justify-end gap-1.5">{children}</dd>
    </div>
  );
}

function PipelineCard({
  pipeline,
  actionPending,
  onEdit,
  onDelete,
  onAction,
  canManage,
  basePath,
  access,
}: {
  pipeline: Pipeline;
  actionPending: boolean;
  onEdit: (pipeline: Pipeline) => void;
  onDelete: (pipeline: Pipeline) => void;
  onAction: (action: PipelineAction, pipeline: Pipeline) => void;
  canManage: boolean;
  basePath: string;
  access?: PipelineAccessSummary;
}) {
  const router = useRouter();
  const Icon = resolvePipelineIcon(pipeline.icon);
  const stagesCount = pipeline.stagesCount ?? pipeline.stages?.length ?? 0;
  const dealsCount = pipeline.dealsCount ?? 0;

  const color = pipeline.color ?? "#7c3aed";
  const href = `${basePath}/${pipeline.id}?view=kanban`;
  const openValue = pipeline.openValue == null ? null : Number(pipeline.openValue);
  const owner = pipeline.defaultOwner?.name ? pipeline.defaultOwner : null;
  const channels = pipeline.channels?.filter((channel) => channel.enabled !== false) ?? [];
  const restricted = (access?.accessMode ?? pipeline.accessMode) === "RESTRICTED";
  const users = access?.users ?? [];
  // Restrito: times e pessoas liberados. Aberto: todas as pessoas da organização.
  const members: AccessMember[] = restricted
    ? [
        ...(access?.teams ?? []).map((team) => ({ kind: "team" as const, ...team })),
        ...users.map((user) => ({ kind: "user" as const, ...user })),
      ]
    : (access?.organizationUsers ?? []).map((user) => ({ kind: "user" as const, ...user }));

  return (
    <article
      data-testid="pipeline-card"
      data-pipeline-id={pipeline.id}
      role="link"
      tabIndex={0}
      aria-label={`Abrir pipeline ${pipeline.name}`}
      className="group flex h-full cursor-pointer flex-col rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_8px_24px_-12px_rgb(76_29_149/0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      onClick={() => router.push(href)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") router.push(href);
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}1a`, color }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <h3 className="truncate text-[15px] font-semibold leading-tight tracking-tight">
              <Link
                href={href}
                className="outline-none hover:text-primary focus-visible:text-primary"
                onClick={(event) => event.stopPropagation()}
              >
                {displayPipelineName(pipeline.name)}
              </Link>
            </h3>
            {pipeline.isDefault ? (
              <span className="shrink-0 rounded-full bg-primary/[0.08] px-2 py-0.5 text-[10px] font-semibold text-primary">
                Padrão
              </span>
            ) : null}
            {pipeline.archived ? (
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                Arquivado
              </span>
            ) : null}
            {pipeline.favorite ? (
              <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" aria-label="Favorito" />
            ) : null}
          </div>
          {pipeline.description ? (
            <p className="mt-1 truncate text-xs text-muted-foreground" title={pipeline.description}>{pipeline.description}</p>
          ) : null}
        </div>

        {canManage ? (
          <PipelineActionsMenu
            pipeline={pipeline}
            actionPending={actionPending}
            onEdit={() => onEdit(pipeline)}
            onChannels={() => router.push(`${basePath}/${pipeline.id}/channels`)}
            onAction={(action) => onAction(action, pipeline)}
            onDelete={() => onDelete(pipeline)}
          />
        ) : null}
      </div>

      <div className="mb-4 mt-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Em aberto
        </p>
        <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
          {openValue == null ? "—" : formatCurrency(openValue)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {dealsCount} {dealsCount === 1 ? "negócio" : "negócios"}
          <span className="mx-1.5 text-border">•</span>
          {stagesCount} {stagesCount === 1 ? "etapa" : "etapas"}
        </p>
      </div>

      <dl className="mt-auto space-y-1 border-t border-border/70 pt-3 text-xs">
        <CardInfoRow label="Responsável" icon={UserRound}>
          {owner ? (
            <span className="flex items-center" title={owner.name} aria-label={`Responsável: ${owner.name}`}>
              <Avatar name={owner.name} src={owner.avatarUrl} className="h-6 w-6 shrink-0 text-[8px]" />
            </span>
          ) : (
            <span className="flex items-center gap-1 font-medium text-amber-600">
              <CircleAlert className="h-3.5 w-3.5" aria-hidden />
              Definir
            </span>
          )}
        </CardInfoRow>

        <CardInfoRow label="Acesso" icon={ShieldCheck}>
          <AccessStack members={members} everyone={!restricted} />
        </CardInfoRow>

        <CardInfoRow label="Canais" icon={Radio}>
          <ChannelStack channels={channels} />
        </CardInfoRow>
      </dl>
    </article>
  );
}

export function PipelinesListPage({ space = "COMMERCIAL", basePath = "/pipelines" }: { space?: "COMMERCIAL" | "ATTENDANCE"; basePath?: string } = {}) {
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
    space,
  };

  const list = useQuery({
    queryKey: queryKeys.pipelines.list(params),
    queryFn: () => pipelinesApi.list(params),
    retry: 1,
  });

  // Quem tem acesso a cada pipeline (times e pessoas). Só administradores consultam.
  const accessOverview = useQuery({
    queryKey: queryKeys.pipelines.access,
    queryFn: pipelinesApi.accessOverview,
    enabled: canManage,
    retry: false,
  });
  const accessByPipeline = React.useMemo(() => {
    const map = new Map<string, PipelineAccessSummary>();
    const data = accessOverview.data;
    if (!data) return map;
    const teamsById = new Map(data.teams.map((team) => [team.id, team]));
    const usersById = new Map(data.users.map((user) => [user.id, user]));
    const organizationUsers = data.users.map((user) => ({ id: user.id, name: user.name, avatarUrl: user.avatarUrl }));
    for (const item of data.pipelines) {
      map.set(item.id, {
        accessMode: item.accessMode,
        teams: item.teamIds.flatMap((id) => {
          const team = teamsById.get(id);
          return team ? [{ id: team.id, name: team.name }] : [];
        }),
        users: item.userIds.flatMap((id) => {
          const user = usersById.get(id);
          return user ? [{ id: user.id, name: user.name, avatarUrl: user.avatarUrl }] : [];
        }),
        organizationUsers,
      });
    }
    return map;
  }, [accessOverview.data]);

  React.useEffect(() => {
    const idleDays = searchParams.get("idleDays");
    const stageId = searchParams.get("stageId");
    if (!idleDays && !stageId) return;
    const first = list.data?.data?.[0];
    if (!first) return;
    const next = new URLSearchParams();
    if (idleDays) next.set("idleDays", idleDays);
    if (stageId) next.set("stageId", stageId);
    router.replace(`${basePath}/${first.id}?${next.toString()}`);
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
        className="mb-7 sm:flex-col sm:items-stretch lg:flex-row lg:items-center"
        title={space === "ATTENDANCE" ? "Atendimento" : "Pipelines"}
        description={space === "ATTENDANCE" ? "Crie e acompanhe funis de conversa e suporte ao cliente." : "Crie, organize e acompanhe todos os funis da operação."}
        actions={
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
        <SlidingPills
          value={tab}
          options={PIPELINE_TABS}
          onChange={(value) => {
            setTab(value);
            setPage(1);
          }}
        />

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <label className="flex h-11 w-full items-center gap-2 rounded-xl border border-border/70 bg-card pl-1 pr-3 transition focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15 sm:w-64 xl:w-72">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Search className="h-4 w-4" aria-hidden />
            </span>
            <input
              type="search"
              aria-label="Buscar pipelines"
              placeholder="Buscar pipeline…"
              className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </label>
          {canManage ? (
            <Button
              type="button"
              size="icon"
              aria-label="Criar pipeline"
              title="Criar pipeline"
              className="h-11 w-11 shrink-0 rounded-xl"
              onClick={openCreateDialog}
            >
              <Plus className="h-5 w-5" />
            </Button>
          ) : null}
        </div>
      </div>
        }
      />

      {list.error ? <ErrorBanner message={(list.error as Error).message} /> : null}

      {list.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-[repeat(auto-fill,minmax(290px,340px))]">
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
          <div className="grid gap-4 sm:grid-cols-[repeat(auto-fill,minmax(290px,340px))]">
            {list.data.data.map((pipeline) => (
              <PipelineCard
                key={pipeline.id}
                pipeline={pipeline}
                basePath={basePath}
                access={accessByPipeline.get(pipeline.id)}
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
        initialSpace={space}
        onSaved={(savedPipeline, mode) => {
          if (mode === "create") router.push(`${basePath}/${savedPipeline.id}`);
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

export function PipelineBoardPage({ pipelineId, basePath = "/pipelines" }: { pipelineId: string; basePath?: string }) {
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
      router.push(`${basePath}/${pipelineId}/deals/${deal.id}`);
      return;
    }
    openDealDrawer(deal.id);
  };

  const clearBoardFilters = () => {
    router.replace(`${basePath}/${pipelineId}`);
  };

  return (
    <div>
      <PageHeader
        title={data?.name ?? "Pipeline"}
        description={data?.description ?? "Quadro Kanban"}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <PipelineViewSwitcher pipelineId={pipelineId} active="kanban" kanbanHref={`${basePath}/${pipelineId}`} conversationsHref={`${basePath}/${pipelineId}/conversations`} />
            <Link href={basePath} className="text-sm text-primary hover:underline">
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
