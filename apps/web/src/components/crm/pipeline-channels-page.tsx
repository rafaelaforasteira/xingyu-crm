"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Cable,
  CheckCircle2,
  CirclePause,
  ExternalLink,
  FlaskConical,
  Instagram,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Play,
  Plus,
  RefreshCw,
  Send,
  Tags,
  Trash2,
  UserRound,
  Users,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import {
  marketingApi,
  pipelineChannelsApi,
  pipelineStagesApi,
  pipelinesApi,
  settingsApi,
} from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type {
  PipelineChannelConnection,
  PipelineChannelInput,
  PipelineLeadSimulationInput,
  PipelineLeadSimulationResult,
  PipelineStage,
  Tag,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { ErrorBanner, PageHeader } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Label, Select } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

type DuplicateStrategy = PipelineChannelInput["duplicateStrategy"];
type RoutingMode = PipelineChannelInput["routingMode"];
const DEMO_MODE =
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
  (process.env.NEXT_PUBLIC_DEMO_MODE !== "false" &&
    process.env.NODE_ENV === "development");

interface ConnectionDraft {
  channelId: string;
  defaultStageId: string;
  defaultOwnerId: string;
  defaultTeamId: string;
  defaultTagIds: string[];
  source: string;
  campaignId: string;
  active: boolean;
  createContact: boolean;
  createConversation: boolean;
  createDeal: boolean;
  duplicateStrategy: NonNullable<DuplicateStrategy>;
  routingMode: NonNullable<RoutingMode>;
}

interface SimulationDraft {
  name: string;
  phone: string;
  email: string;
  instagram: string;
  message: string;
  estimatedValue: string;
}

const DUPLICATE_LABELS: Record<NonNullable<DuplicateStrategy>, string> = {
  MERGE: "Mesclar com registro existente",
  CREATE_NEW: "Sempre criar um novo",
  REJECT: "Rejeitar duplicados",
};

const ROUTING_LABELS: Record<NonNullable<RoutingMode>, string> = {
  PIPELINE_DEFAULTS: "Padrões do pipeline",
  FIXED: "Responsável fixo",
  ROUND_ROBIN: "Distribuição entre a equipe",
};

function emptySimulationDraft(): SimulationDraft {
  return {
    name: "",
    phone: "",
    email: "",
    instagram: "",
    message: "",
    estimatedValue: "",
  };
}

function simulationInputFromDraft(
  draft: SimulationDraft,
): PipelineLeadSimulationInput {
  return {
    name: draft.name.trim(),
    phone: draft.phone.trim() || undefined,
    email: draft.email.trim() || undefined,
    instagram: draft.instagram.trim() || undefined,
    message: draft.message.trim(),
    estimatedValue: draft.estimatedValue
      ? Number(draft.estimatedValue)
      : undefined,
  };
}

function sortStages(stages: PipelineStage[]) {
  return [...stages].sort(
    (left, right) =>
      (left.position ?? left.order ?? 0) -
      (right.position ?? right.order ?? 0),
  );
}

function defaultDraft(stages: PipelineStage[], channelId = ""): ConnectionDraft {
  const orderedStages = sortStages(stages);
  const initialStage =
    orderedStages.find((stage) => stage.isInitial) ?? orderedStages[0];

  return {
    channelId,
    defaultStageId: initialStage?.id ?? "",
    defaultOwnerId: "",
    defaultTeamId: "",
    defaultTagIds: [],
    source: "",
    campaignId: "",
    active: true,
    createContact: true,
    createConversation: true,
    createDeal: true,
    duplicateStrategy: "MERGE",
    routingMode: "PIPELINE_DEFAULTS",
  };
}

function draftFromConnection(
  connection: PipelineChannelConnection,
): ConnectionDraft {
  return {
    channelId: connection.channelId,
    defaultStageId: connection.defaultStageId,
    defaultOwnerId: connection.defaultOwnerId ?? "",
    defaultTeamId: connection.defaultTeamId ?? "",
    defaultTagIds: connection.defaultTagIds ?? [],
    source: connection.source ?? "",
    campaignId: connection.campaignId ?? "",
    active: connection.active,
    createContact: connection.createContact,
    createConversation: connection.createConversation,
    createDeal: connection.createDeal,
    duplicateStrategy: connection.duplicateStrategy ?? "MERGE",
    routingMode: connection.routingMode ?? "PIPELINE_DEFAULTS",
  };
}

function inputFromDraft(draft: ConnectionDraft): PipelineChannelInput {
  return {
    channelId: draft.channelId,
    defaultStageId: draft.defaultStageId,
    defaultOwnerId: draft.defaultOwnerId || null,
    defaultTeamId: draft.defaultTeamId || null,
    defaultTagIds: draft.defaultTagIds,
    source: draft.source.trim() || null,
    campaignId: draft.campaignId || null,
    active: draft.active,
    createContact: draft.createContact,
    createConversation: draft.createConversation,
    createDeal: draft.createDeal,
    duplicateStrategy: draft.duplicateStrategy,
    routingMode: draft.routingMode,
  };
}

function formatDateTime(value?: string | null) {
  if (!value) return "Nunca";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Nunca";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function channelTypeLabel(type?: string) {
  const labels: Record<string, string> = {
    WHATSAPP: "WhatsApp",
    INSTAGRAM: "Instagram",
    SITE_CHAT: "Chat do site",
    WEB_CHAT: "Chat do site",
    EMAIL: "E-mail",
    SHOPIFY: "Shopify",
    FORM: "Formulário",
    WEBHOOK: "Webhook",
    MANUAL: "Manual",
  };
  return type ? (labels[type] ?? type) : "Canal";
}

function FlagCheckbox({
  id,
  checked,
  label,
  description,
  onChange,
}: {
  id: string;
  checked: boolean;
  label: string;
  description: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3"
    >
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-primary"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

function ConnectionFormDialog({
  open,
  onOpenChange,
  connection,
  draft,
  setDraft,
  channels,
  stages,
  teams,
  users,
  tags,
  campaigns,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: PipelineChannelConnection | null;
  draft: ConnectionDraft;
  setDraft: React.Dispatch<React.SetStateAction<ConnectionDraft>>;
  channels: {
    id: string;
    name: string;
    displayName?: string | null;
    type: string;
    provider?: string | null;
    connected: boolean;
    isActive: boolean;
  }[];
  stages: PipelineStage[];
  teams: { id: string; name: string }[];
  users: { id: string; name: string }[];
  tags: Tag[];
  campaigns: { id: string; name: string; status: string }[];
  saving: boolean;
  onSave: () => void;
}) {
  const editing = Boolean(connection);
  const selectableChannels = editing
    ? channels
    : channels.filter((channel) => !channel.connected && channel.isActive);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Configurar canal" : "Conectar canal"}
      description="Defina como os leads recebidos por esta conta entram no pipeline."
      wide
      className="max-h-[90vh] overflow-y-auto"
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pipeline-channel-account">Conta/canal</Label>
            <Select
              id="pipeline-channel-account"
              value={draft.channelId}
              disabled={editing}
              required
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  channelId: event.target.value,
                }))
              }
            >
              <option value="">Selecione uma conta</option>
              {selectableChannels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.displayName || channel.name} ·{" "}
                  {channelTypeLabel(channel.type)}
                  {channel.provider ? ` · ${channel.provider}` : ""}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pipeline-channel-stage">Etapa inicial</Label>
            <Select
              id="pipeline-channel-stage"
              value={draft.defaultStageId}
              required
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  defaultStageId: event.target.value,
                }))
              }
            >
              <option value="">Selecione uma etapa</option>
              {sortStages(stages).map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                  {stage.isInitial ? " · inicial" : ""}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pipeline-channel-team">Equipe padrão</Label>
            <Select
              id="pipeline-channel-team"
              value={draft.defaultTeamId}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  defaultTeamId: event.target.value,
                }))
              }
            >
              <option value="">Usar configuração do pipeline</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pipeline-channel-owner">Responsável padrão</Label>
            <Select
              id="pipeline-channel-owner"
              value={draft.defaultOwnerId}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  defaultOwnerId: event.target.value,
                }))
              }
            >
              <option value="">Usar configuração do pipeline</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pipeline-channel-source">Origem</Label>
            <Input
              id="pipeline-channel-source"
              placeholder="Ex.: whatsapp-organico"
              value={draft.source}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  source: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pipeline-channel-campaign">Campanha</Label>
            <Select
              id="pipeline-channel-campaign"
              value={draft.campaignId}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  campaignId: event.target.value,
                }))
              }
            >
              <option value="">Sem campanha</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                  {campaign.status ? ` · ${campaign.status}` : ""}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pipeline-channel-routing">Roteamento</Label>
            <Select
              id="pipeline-channel-routing"
              value={draft.routingMode}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  routingMode: event.target.value as NonNullable<RoutingMode>,
                }))
              }
            >
              {Object.entries(ROUTING_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pipeline-channel-duplicates">Duplicidades</Label>
            <Select
              id="pipeline-channel-duplicates"
              value={draft.duplicateStrategy}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  duplicateStrategy: event.target
                    .value as NonNullable<DuplicateStrategy>,
                }))
              }
            >
              {Object.entries(DUPLICATE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Tags aplicadas automaticamente</legend>
          {tags.length ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const selected = draft.defaultTagIds.includes(tag.id);
                return (
                  <label
                    key={tag.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition",
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-accent",
                    )}
                  >
                    <input
                      type="checkbox"
                      aria-label={`Tag ${tag.name}`}
                      className="sr-only"
                      checked={selected}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          defaultTagIds: event.target.checked
                            ? [...current.defaultTagIds, tag.id]
                            : current.defaultTagIds.filter((id) => id !== tag.id),
                        }))
                      }
                    />
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: tag.color || "#7c3aed" }}
                    />
                    {tag.name}
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Nenhuma tag está disponível na organização.
            </p>
          )}
        </fieldset>

        <div className="grid gap-2 sm:grid-cols-2">
          <FlagCheckbox
            id="pipeline-channel-active"
            checked={draft.active}
            label="Conexão ativa"
            description="Aceita novas entradas deste canal."
            onChange={(active) =>
              setDraft((current) => ({ ...current, active }))
            }
          />
          <FlagCheckbox
            id="pipeline-channel-contact"
            checked={draft.createContact}
            label="Criar contato"
            description="Cria ou mescla o contato identificado."
            onChange={(createContact) =>
              setDraft((current) => ({ ...current, createContact }))
            }
          />
          <FlagCheckbox
            id="pipeline-channel-conversation"
            checked={draft.createConversation}
            label="Criar conversa"
            description="Abre uma conversa na caixa de entrada."
            onChange={(createConversation) =>
              setDraft((current) => ({ ...current, createConversation }))
            }
          />
          <FlagCheckbox
            id="pipeline-channel-deal"
            checked={draft.createDeal}
            label="Criar negócio"
            description="Cria um card na etapa inicial escolhida."
            onChange={(createDeal) =>
              setDraft((current) => ({ ...current, createDeal }))
            }
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={
              saving || !draft.channelId || !draft.defaultStageId
            }
          >
            {saving
              ? "Salvando…"
              : editing
                ? "Salvar configuração"
                : "Conectar canal"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function SimulateLeadDialog({
  open,
  onOpenChange,
  pipelineId,
  connection,
  draft,
  setDraft,
  result,
  error,
  simulating,
  onSimulate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId: string;
  connection: PipelineChannelConnection | null;
  draft: SimulationDraft;
  setDraft: React.Dispatch<React.SetStateAction<SimulationDraft>>;
  result: PipelineLeadSimulationResult | null;
  error?: string;
  simulating: boolean;
  onSimulate: () => void;
}) {
  if (!connection) return null;

  const accountName =
    connection.channel.displayName || connection.channel.name;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Simular novo lead"
      description="Modo DEMO: cria dados locais sem chamar o provedor externo."
      wide
      className="max-h-[90vh] overflow-y-auto"
    >
      {result ? (
        <div className="space-y-5">
          <div
            role="status"
            className="rounded-lg border border-success/30 bg-success/5 p-4"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
              <div>
                <p className="font-medium">Lead simulado com sucesso</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  A entrada foi processada pela rota desta conexão. Protocolo{" "}
                  <span className="font-mono text-foreground">
                    {result.simulationId}
                  </span>
                  .
                </p>
              </div>
            </div>
          </div>

          <dl className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Contato</dt>
              <dd className="mt-1 text-sm font-medium">
                {result.contact
                  ? [result.contact.firstName, result.contact.lastName]
                      .filter(Boolean)
                      .join(" ")
                  : "Não criado"}
                {result.contact ? (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    · {result.contactCreated ? "criado" : "reutilizado"} ·{" "}
                    {result.contact.id}
                  </span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Negócio</dt>
              <dd className="mt-1 text-sm font-medium">
                {result.deal?.name ?? "Não criado"}
                {result.deal ? (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    · {result.deal.id}
                  </span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Conversa</dt>
              <dd className="mt-1 truncate font-mono text-xs">
                {result.conversation?.id ?? "Não criada"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Mensagem</dt>
              <dd className="mt-1 truncate font-mono text-xs">
                {result.message?.id ?? "Não criada"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Pipeline</dt>
              <dd className="mt-1 text-sm font-medium">
                {connection.pipeline?.name ?? connection.pipelineId}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Etapa inicial</dt>
              <dd className="mt-1 text-sm font-medium">
                {connection.defaultStage?.name ?? connection.defaultStageId}
              </dd>
            </div>
          </dl>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
            {result.deal ? (
              <Link
                href={`/pipelines/${pipelineId}`}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                Ver card no Kanban
                <ExternalLink className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        </div>
      ) : (
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            onSimulate();
          }}
        >
          {error ? <ErrorBanner message={error} /> : null}

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              Rota selecionada
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="simulation-channel">Canal</Label>
                <Input
                  id="simulation-channel"
                  readOnly
                  value={channelTypeLabel(connection.channel.type)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="simulation-account">Conta</Label>
                <Input
                  id="simulation-account"
                  readOnly
                  value={accountName}
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              O lead será enviado para{" "}
              <strong className="text-foreground">
                {connection.defaultStage?.name ?? connection.defaultStageId}
              </strong>{" "}
              neste pipeline.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="simulation-name">Nome</Label>
              <Input
                id="simulation-name"
                required
                autoFocus
                maxLength={160}
                placeholder="Nome do lead"
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="simulation-phone">Telefone</Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="simulation-phone"
                  type="tel"
                  maxLength={40}
                  className="pl-9"
                  placeholder="+55 11 99999-9999"
                  value={draft.phone}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="simulation-email">E-mail</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="simulation-email"
                  type="email"
                  maxLength={320}
                  className="pl-9"
                  placeholder="lead@exemplo.com"
                  value={draft.email}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="simulation-instagram">Instagram</Label>
              <div className="relative">
                <Instagram className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="simulation-instagram"
                  maxLength={120}
                  className="pl-9"
                  placeholder="@perfil"
                  value={draft.instagram}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      instagram: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="simulation-value">Valor estimado</Label>
              <Input
                id="simulation-value"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={draft.estimatedValue}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    estimatedValue: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="simulation-message">Mensagem</Label>
              <Textarea
                id="simulation-message"
                required
                maxLength={4000}
                rows={4}
                placeholder="Mensagem recebida pelo canal"
                value={draft.message}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    message: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                simulating ||
                !draft.name.trim() ||
                !draft.message.trim() ||
                (Boolean(draft.estimatedValue) &&
                  (!Number.isFinite(Number(draft.estimatedValue)) ||
                    Number(draft.estimatedValue) < 0))
              }
            >
              <Send className="h-4 w-4" />
              {simulating ? "Simulando…" : "Simular entrada"}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </dt>
      <dd className="mt-1 truncate text-sm font-medium">{value}</dd>
    </div>
  );
}

function ConnectionCard({
  connection,
  pipelineName,
  tags,
  demoMode,
  pending,
  onSimulate,
  onEdit,
  onToggle,
  onTest,
  onDisconnect,
}: {
  connection: PipelineChannelConnection;
  pipelineName: string;
  tags: Tag[];
  demoMode: boolean;
  pending: boolean;
  onSimulate: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onTest: () => void;
  onDisconnect: () => void;
}) {
  const tagNames = (connection.defaultTagIds ?? [])
    .map((id) => tags.find((tag) => tag.id === id)?.name ?? id)
    .join(", ");
  const lastSyncAt = connection.lastSyncAt ?? connection.channel.lastSyncAt;
  const lastError =
    connection.lastErrorMessage ?? connection.channel.lastErrorMessage;
  const accountName =
    connection.channel.displayName || connection.channel.name;

  return (
    <Card data-testid="pipeline-channel-card" data-connection-id={connection.id}>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Wifi className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <CardTitle className="truncate">{accountName}</CardTitle>
            {connection.channel.provider ||
            connection.channel.externalAccountId ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {[connection.channel.provider, connection.channel.externalAccountId]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Badge variant={connection.active ? "success" : "secondary"}>
                {connection.active ? "Ativo" : "Pausado"}
              </Badge>
              <Badge variant="outline">
                {channelTypeLabel(connection.channel.type)}
              </Badge>
              {connection.channel.status ? (
                <Badge variant="outline">{connection.channel.status}</Badge>
              ) : null}
              {lastError ? (
                <Badge variant="destructive">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  Com erro
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {demoMode && connection.active ? (
            <Button
              type="button"
              size="sm"
              disabled={pending}
              aria-label={`Simular novo lead em ${accountName}`}
              onClick={onSimulate}
            >
              <Send className="h-3.5 w-3.5" />
              Simular novo lead
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            aria-label={`Configurar ${accountName}`}
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
            Configurar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending || !connection.active}
            aria-label={`Testar ${accountName}`}
            onClick={onTest}
          >
            <FlaskConical className="h-3.5 w-3.5" />
            Testar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            aria-label={`${connection.active ? "Pausar" : "Ativar"} ${accountName}`}
            onClick={onToggle}
          >
            {connection.active ? (
              <CirclePause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            {connection.active ? "Pausar" : "Ativar"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DetailItem
            icon={Cable}
            label="Pipeline"
            value={connection.pipeline?.name ?? pipelineName}
          />
          <DetailItem
            icon={CheckCircle2}
            label="Etapa inicial"
            value={connection.defaultStage?.name ?? connection.defaultStageId}
          />
          <DetailItem
            icon={Users}
            label="Equipe"
            value={connection.defaultTeam?.name ?? "Padrão do pipeline"}
          />
          <DetailItem
            icon={UserRound}
            label="Responsável"
            value={connection.defaultOwner?.name ?? "Padrão do pipeline"}
          />
          <DetailItem
            icon={Tags}
            label="Tags"
            value={tagNames || "Nenhuma"}
          />
          <DetailItem
            icon={MessageCircle}
            label="Origem / campanha"
            value={
              [connection.source, connection.campaign?.name]
                .filter(Boolean)
                .join(" · ") || "Não definida"
            }
          />
          <DetailItem
            icon={RefreshCw}
            label="Última sincronização"
            value={formatDateTime(lastSyncAt)}
          />
          <DetailItem
            icon={CheckCircle2}
            label="Automações"
            value={[
              connection.createContact ? "contato" : null,
              connection.createConversation ? "conversa" : null,
              connection.createDeal ? "negócio" : null,
            ]
              .filter(Boolean)
              .join(", ") || "Nenhuma"}
          />
        </dl>

        {lastError ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            <span className="font-medium">Último erro:</span> {lastError}
          </div>
        ) : null}

        <div className="flex justify-end border-t border-border pt-3">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-destructive hover:bg-destructive/5 hover:text-destructive"
            disabled={pending}
            aria-label={`Desconectar ${accountName}`}
            onClick={onDisconnect}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Desconectar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function PipelineChannelsPage({ pipelineId }: { pipelineId: string }) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingConnection, setEditingConnection] =
    React.useState<PipelineChannelConnection | null>(null);
  const [disconnectingConnection, setDisconnectingConnection] =
    React.useState<PipelineChannelConnection | null>(null);
  const [simulatingConnection, setSimulatingConnection] =
    React.useState<PipelineChannelConnection | null>(null);
  const [simulationDraft, setSimulationDraft] =
    React.useState<SimulationDraft>(emptySimulationDraft);
  const [simulationResult, setSimulationResult] =
    React.useState<PipelineLeadSimulationResult | null>(null);
  const [draft, setDraft] = React.useState<ConnectionDraft>(() =>
    defaultDraft([]),
  );

  const pipelineQuery = useQuery({
    queryKey: queryKeys.pipelines.detail(pipelineId),
    queryFn: () => pipelinesApi.get(pipelineId),
    retry: false,
  });
  const stagesQuery = useQuery({
    queryKey: queryKeys.pipelines.stages(pipelineId),
    queryFn: () => pipelineStagesApi.list(pipelineId),
    retry: false,
  });
  const connectionsQuery = useQuery({
    queryKey: queryKeys.pipelines.channels(pipelineId),
    queryFn: () => pipelineChannelsApi.list(pipelineId),
    retry: false,
  });
  const availableQuery = useQuery({
    queryKey: queryKeys.pipelines.availableChannels(pipelineId),
    queryFn: () => pipelineChannelsApi.available(pipelineId),
    retry: false,
  });
  const teamsQuery = useQuery({
    queryKey: [...queryKeys.settings, "teams"],
    queryFn: () => settingsApi.teams(),
    retry: false,
  });
  const usersQuery = useQuery({
    queryKey: [...queryKeys.settings, "users"],
    queryFn: () => settingsApi.users(),
    retry: false,
  });
  const tagsQuery = useQuery({
    queryKey: [...queryKeys.settings, "tags"],
    queryFn: () => settingsApi.tags(),
    retry: false,
  });
  const campaignsQuery = useQuery({
    queryKey: [...queryKeys.marketing, "campaigns"],
    queryFn: () => marketingApi.campaigns(),
    retry: false,
  });

  const invalidateChannelQueries = React.useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.pipelines.channels(pipelineId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.pipelines.availableChannels(pipelineId),
      }),
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all }),
    ]);
  }, [pipelineId, queryClient]);

  const saveMutation = useMutation({
    mutationFn: async ({
      connection,
      values,
    }: {
      connection: PipelineChannelConnection | null;
      values: PipelineChannelInput;
    }) => {
      if (!connection) return pipelineChannelsApi.connect(pipelineId, values);
      const { channelId: _channelId, ...update } = values;
      return pipelineChannelsApi.update(
        pipelineId,
        connection.id,
        update,
      );
    },
    onSuccess: async (_, variables) => {
      await invalidateChannelQueries();
      toast.success(
        variables.connection
          ? "Configuração do canal salva"
          : "Canal conectado ao pipeline",
      );
      setFormOpen(false);
      setEditingConnection(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (connection: PipelineChannelConnection) =>
      connection.active
        ? pipelineChannelsApi.pause(pipelineId, connection.id)
        : pipelineChannelsApi.resume(pipelineId, connection.id),
    onSuccess: async (connection) => {
      await invalidateChannelQueries();
      toast.success(connection.active ? "Canal ativado" : "Canal pausado");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const testMutation = useMutation({
    mutationFn: (connection: PipelineChannelConnection) =>
      pipelineChannelsApi.test(pipelineId, connection.id),
    onSuccess: async (result) => {
      await invalidateChannelQueries();
      toast.success(
        `Teste concluído para ${result.channel.name} (${result.mode})`,
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const simulateMutation = useMutation({
    mutationFn: ({
      connection,
      input,
    }: {
      connection: PipelineChannelConnection;
      input: PipelineLeadSimulationInput;
    }) =>
      pipelineChannelsApi.simulate(pipelineId, connection.id, input),
    onSuccess: async (result) => {
      await Promise.all([
        invalidateChannelQueries(),
        queryClient.invalidateQueries({
          queryKey: queryKeys.pipelines.board(pipelineId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.pipelines.detail(pipelineId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.contacts.all,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.all,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.dashboard.all,
        }),
        ...(result.conversation
          ? [
              queryClient.invalidateQueries({
                queryKey: queryKeys.conversations.detail(
                  result.conversation.id,
                ),
              }),
              queryClient.invalidateQueries({
                queryKey: queryKeys.conversations.messages(
                  result.conversation.id,
                ),
              }),
            ]
          : []),
      ]);
      setSimulationResult(result);
      toast.success("Novo lead simulado no modo DEMO");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const disconnectMutation = useMutation({
    mutationFn: (connection: PipelineChannelConnection) =>
      pipelineChannelsApi.disconnect(pipelineId, connection.id),
    onSuccess: async () => {
      await invalidateChannelQueries();
      toast.success("Canal desconectado do pipeline");
      setDisconnectingConnection(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const stages = stagesQuery.data ?? [];
  const connections = connectionsQuery.data ?? [];
  const availableChannels = availableQuery.data ?? [];
  const connectableChannels = availableChannels.filter(
    (channel) => channel.isActive && !channel.connected,
  );
  const loading =
    pipelineQuery.isLoading ||
    stagesQuery.isLoading ||
    connectionsQuery.isLoading ||
    availableQuery.isLoading ||
    teamsQuery.isLoading ||
    usersQuery.isLoading ||
    tagsQuery.isLoading ||
    campaignsQuery.isLoading;
  const primaryError = [
    pipelineQuery.error,
    stagesQuery.error,
    connectionsQuery.error,
    availableQuery.error,
    teamsQuery.error,
    usersQuery.error,
    tagsQuery.error,
    campaignsQuery.error,
  ].find(Boolean) as Error | undefined;
  const actionPending =
    saveMutation.isPending ||
    toggleMutation.isPending ||
    testMutation.isPending ||
    simulateMutation.isPending ||
    disconnectMutation.isPending;

  const openCreate = () => {
    setEditingConnection(null);
    setDraft(defaultDraft(stages, connectableChannels[0]?.id));
    setFormOpen(true);
  };

  const openEdit = (connection: PipelineChannelConnection) => {
    setEditingConnection(connection);
    setDraft(draftFromConnection(connection));
    setFormOpen(true);
  };

  const openSimulation = (connection: PipelineChannelConnection) => {
    simulateMutation.reset();
    setSimulatingConnection(connection);
    setSimulationDraft(emptySimulationDraft());
    setSimulationResult(null);
  };

  return (
    <div>
      <PageHeader
        title="Canais do pipeline"
        description={
          pipelineQuery.data
            ? `Configure a entrada automática de leads em ${pipelineQuery.data.name}.`
            : "Configure contas e regras de entrada deste pipeline."
        }
        actions={
          <>
            <Link
              href="/pipelines"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-input bg-card px-3.5 py-2 text-sm font-medium hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4" />
              Pipelines
            </Link>
            <Link
              href={`/pipelines/${pipelineId}/settings/stages`}
              className="inline-flex h-9 items-center rounded-lg border border-input bg-card px-3.5 py-2 text-sm font-medium hover:bg-accent"
            >
              Etapas
            </Link>
            <Button
              type="button"
              disabled={
                loading || stages.length === 0 || connectableChannels.length === 0
              }
              onClick={openCreate}
            >
              <Plus className="h-4 w-4" />
              Conectar canal
            </Button>
          </>
        }
      />

      {primaryError ? <ErrorBanner message={primaryError.message} /> : null}

      {!loading && stages.length === 0 ? (
        <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          Crie ao menos uma etapa antes de conectar um canal.{" "}
          <Link
            href={`/pipelines/${pipelineId}/settings/stages`}
            className="font-medium text-primary hover:underline"
          >
            Configurar etapas
          </Link>
        </div>
      ) : null}

      {!loading &&
      stages.length > 0 &&
      connectableChannels.length === 0 &&
      availableChannels.length > 0 ? (
        <div className="mb-4 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Todas as contas ativas já estão conectadas a este pipeline.
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-52 w-full" />
        </div>
      ) : null}

      {!loading && !primaryError && connections.length === 0 ? (
        <EmptyState
          icon={Cable}
          title="Nenhum canal conectado"
          description="Conecte uma conta para direcionar novos leads a este pipeline."
          actionLabel={
            connectableChannels.length > 0 && stages.length > 0
              ? "Conectar canal"
              : undefined
          }
          onAction={
            connectableChannels.length > 0 && stages.length > 0
              ? openCreate
              : undefined
          }
        />
      ) : null}

      {!loading && connections.length > 0 ? (
        <div className="space-y-4">
          {connections.map((connection) => (
            <ConnectionCard
              key={connection.id}
              connection={connection}
              pipelineName={pipelineQuery.data?.name ?? "Pipeline"}
              tags={tagsQuery.data ?? []}
              demoMode={DEMO_MODE}
              pending={actionPending}
              onSimulate={() => openSimulation(connection)}
              onEdit={() => openEdit(connection)}
              onToggle={() => toggleMutation.mutate(connection)}
              onTest={() => testMutation.mutate(connection)}
              onDisconnect={() => setDisconnectingConnection(connection)}
            />
          ))}
        </div>
      ) : null}

      <ConnectionFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingConnection(null);
        }}
        connection={editingConnection}
        draft={draft}
        setDraft={setDraft}
        channels={availableChannels}
        stages={stages}
        teams={teamsQuery.data ?? []}
        users={usersQuery.data ?? []}
        tags={tagsQuery.data ?? []}
        campaigns={campaignsQuery.data ?? []}
        saving={saveMutation.isPending}
        onSave={() =>
          saveMutation.mutate({
            connection: editingConnection,
            values: inputFromDraft(draft),
          })
        }
      />

      <SimulateLeadDialog
        open={Boolean(simulatingConnection)}
        onOpenChange={(open) => {
          if (!open) {
            setSimulatingConnection(null);
            setSimulationResult(null);
            simulateMutation.reset();
          }
        }}
        pipelineId={pipelineId}
        connection={simulatingConnection}
        draft={simulationDraft}
        setDraft={setSimulationDraft}
        result={simulationResult}
        error={
          simulateMutation.error
            ? (simulateMutation.error as Error).message
            : undefined
        }
        simulating={simulateMutation.isPending}
        onSimulate={() => {
          if (!simulatingConnection) return;
          simulateMutation.mutate({
            connection: simulatingConnection,
            input: simulationInputFromDraft(simulationDraft),
          });
        }}
      />

      <Dialog
        open={Boolean(disconnectingConnection)}
        onOpenChange={(open) => {
          if (!open) setDisconnectingConnection(null);
        }}
        title="Desconectar canal"
        description="Esta ação remove apenas o vínculo com este pipeline."
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Desconectar{" "}
            <strong className="text-foreground">
              {disconnectingConnection?.channel.displayName ||
                disconnectingConnection?.channel.name}
            </strong>
            ? Contatos, conversas e negócios já criados serão preservados.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDisconnectingConnection(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={
                !disconnectingConnection || disconnectMutation.isPending
              }
              onClick={() => {
                if (disconnectingConnection) {
                  disconnectMutation.mutate(disconnectingConnection);
                }
              }}
            >
              {disconnectMutation.isPending
                ? "Desconectando…"
                : "Desconectar canal"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
