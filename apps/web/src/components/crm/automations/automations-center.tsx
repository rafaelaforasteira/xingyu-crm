"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Archive,
  CircleAlert,
  CircleDot,
  Clock3,
  Filter,
  Plus,
  Search,
  Settings2,
  Webhook,
  Workflow,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { PageHeader, ErrorBanner } from "@/components/crm/page-header";
import { Button } from "@/components/ui/button";
import { ClientRelativeTime } from "@/components/ui/client-relative-time";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Popover } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Label, Select } from "@/components/ui/form-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { automationsApi, pipelinesApi } from "@/lib/api";
import { canOpenPath } from "@/lib/access-policy";
import { automationsText, EXECUTION_LABEL } from "@/lib/automations-i18n";
import { queryKeys } from "@/lib/query-keys";
import type { Automation, AutomationExecution, AutomationTemplateCard, Pipeline } from "@/lib/types";
import { cn } from "@/lib/utils";

type StatusFilter = "ALL" | "ACTIVE" | "DRAFT" | "PAUSED" | "ERROR" | "ARCHIVED";

export function AutomationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const t = automationsText(user?.locale);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("ALL");
  const [tab, setTab] = React.useState("workflows");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingAutomation, setEditingAutomation] = React.useState<Automation | null>(null);
  const allowed = canOpenPath(user, "/automations");

  React.useEffect(() => {
    if (!authLoading && !allowed) router.replace("/dashboard");
  }, [allowed, authLoading, router]);

  const list = useQuery({
    queryKey: [...queryKeys.automations.all, search, status],
    queryFn: () => automationsApi.list({ search: search || undefined, status, pageSize: 50 }),
    enabled: allowed,
    retry: false,
  });
  const metrics = useQuery({
    queryKey: queryKeys.automations.metrics,
    queryFn: automationsApi.metrics,
    enabled: allowed,
    retry: false,
  });
  const health = useQuery({
    queryKey: ["automations", "runtime-health"],
    queryFn: automationsApi.runtimeHealth,
    enabled: allowed,
    refetchInterval: 15_000,
    retry: false,
  });
  const executions = useQuery({
    queryKey: queryKeys.automations.executions(),
    queryFn: () => automationsApi.allExecutions({ pageSize: 40 }),
    enabled: allowed && tab === "executions",
    retry: false,
  });
  const templates = useQuery({
    queryKey: queryKeys.automations.templates,
    queryFn: automationsApi.templates,
    enabled: allowed && (tab === "templates" || createOpen),
    retry: false,
  });
  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => automationsApi.pause(id, enabled),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.automations.all });
      toast.success("Status da automação atualizado");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (authLoading || !allowed) return <Skeleton className="mx-auto h-72 w-full max-w-7xl" />;
  const rows = list.data?.data ?? [];
  const filters: Array<[StatusFilter, string]> = [
    ["ALL", t.all],
    ["ACTIVE", t.active],
    ["DRAFT", t.drafts],
    ["PAUSED", t.paused],
    ["ERROR", t.withError],
    ["ARCHIVED", t.archived],
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 pb-8">
      <PageHeader
        title={t.title}
        description={t.subtitle}
        actions={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />{t.newAutomation}</Button>}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={cn("text-xs", health.data?.status === "operational" ? "text-success" : "text-destructive")}>
          {health.data?.status === "operational" ? t.engineOk : t.engineDown}
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label={t.active} value={metrics.data?.active ?? 0} />
        <Metric label={t.runningNow} value={metrics.data?.running ?? 0} />
        <Metric label={t.waiting} value={metrics.data?.waiting ?? 0} />
        <Metric label={t.withError} value={metrics.data?.failed ?? 0} />
      </section>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
          <TabsList className="shrink-0">
            <TabsTrigger value="workflows">{t.workflows}</TabsTrigger>
            <TabsTrigger value="executions">{t.executions}</TabsTrigger>
            <TabsTrigger value="templates">{t.templates}</TabsTrigger>
          </TabsList>
          {tab === "workflows" ? (
            <>
              <div className="relative w-full min-w-[220px] sm:w-72 lg:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t.search}
                  aria-label={t.search}
                  className="pl-9"
                />
              </div>
              <Popover
                open={filtersOpen}
                onOpenChange={setFiltersOpen}
                align="end"
                contentWidth={360}
                aria-label="Filtrar automações"
                trigger={
                  <Button
                    className="relative h-10 w-10 shrink-0 rounded-full p-0 hover:bg-primary/10"
                    variant="ghost"
                    aria-label={status === "ALL" ? "Filtrar automações" : `Filtrar automações: ${filters.find(([value]) => value === status)?.[1] ?? status}`}
                    title="Filtrar automações"
                    onClick={() => setFiltersOpen((value) => !value)}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                      <Filter className="h-4 w-4" />
                    </span>
                    {status !== "ALL" ? (
                      <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-destructive" aria-hidden="true" />
                    ) : null}
                  </Button>
                }
              >
                <div className="space-y-4 p-4">
                  <div>
                    <Label className="mb-2 block">Status</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {filters.map(([value, label]) => (
                        <Button
                          key={value}
                          size="sm"
                          variant={status === value ? "secondary" : "outline"}
                          onClick={() => {
                            setStatus(value);
                            setFiltersOpen(false);
                          }}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  {status !== "ALL" ? (
                    <Button
                      className="w-full"
                      variant="ghost"
                      onClick={() => {
                        setStatus("ALL");
                        setFiltersOpen(false);
                      }}
                    >
                      Limpar filtro
                    </Button>
                  ) : null}
                </div>
              </Popover>
            </>
          ) : null}
        </div>
        <TabsContent value="workflows" className="space-y-4">
          {list.error ? <ErrorBanner message={(list.error as Error).message} /> : null}
          {list.isLoading ? <div className="space-y-3"><Skeleton className="h-20" /><Skeleton className="h-20" /></div> : null}
          {!list.isLoading && !rows.length ? (
            <EmptyState icon={Zap} title={t.emptyTitle} description={t.emptyDescription} actionLabel={t.createFirst} onAction={() => setCreateOpen(true)} />
          ) : null}
          {rows.length ? (
            <section className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="hidden grid-cols-[minmax(220px,1.5fr)_minmax(180px,1fr)_120px_150px_100px_112px] border-b border-border bg-muted/35 px-4 py-2.5 text-xs font-medium text-muted-foreground lg:grid">
                <ColumnHeader icon={Workflow} label={t.name} />
                <ColumnHeader icon={Webhook} label={t.trigger} divided />
                <ColumnHeader icon={CircleDot} label={t.status} divided align="center" />
                <ColumnHeader icon={Clock3} label={t.lastRun} divided align="center" />
                <ColumnHeader icon={Activity} label={t.runs} divided align="center" />
                <ColumnHeader icon={Settings2} label="Config." divided align="center" />
              </div>
              <div className="divide-y divide-border">
                {rows.map((automation) => (
                  <WorkflowRow
                    key={automation.id}
                    automation={automation}
                    toggling={toggle.isPending}
                    onToggle={(enabled) => toggle.mutate({ id: automation.id, enabled })}
                    onEdit={() => setEditingAutomation(automation)}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </TabsContent>
        <TabsContent value="executions">
          <ExecutionsTable executions={executions.data?.data ?? []} loading={executions.isLoading} />
        </TabsContent>
        <TabsContent value="templates">
          <TemplateGallery templates={templates.data ?? []} onUse={(key) => { setCreateOpen(true); sessionStorage.setItem("xingyu.automationTemplate", key); }} />
        </TabsContent>
      </Tabs>

      <CreateAutomationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        templates={templates.data ?? []}
        locale={user?.locale}
      />
      <EditAutomationDialog
        automation={editingAutomation}
        onOpenChange={(open) => {
          if (!open) setEditingAutomation(null);
        }}
        onSaved={() => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.automations.all });
          setEditingAutomation(null);
        }}
        locale={user?.locale}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-accent/40 px-4 py-3">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function ColumnHeader({ icon: Icon, label, divided, align = "start" }: { icon: React.ElementType; label: string; divided?: boolean; align?: "start" | "center" | "end" }) {
  return (
    <span className={cn("flex items-center gap-1.5 px-3", divided && "border-l border-border/70", align === "center" && "justify-center", align === "end" && "justify-end")}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

function WorkflowRow({ automation, toggling, onToggle, onEdit }: { automation: Automation; toggling: boolean; onToggle: (enabled: boolean) => void; onEdit: () => void }) {
  const t = automationsText();
  const active = automation.status === "ACTIVE";
  const canToggle = automation.status === "ACTIVE" || automation.status === "PAUSED" || automation.status === "INACTIVE";
  const toggleTitle = !canToggle
    ? automation.status === "DRAFT"
      ? "Publique a automação antes de ativá-la"
      : automation.status === "ARCHIVED"
        ? "Automação arquivada"
        : "Corrija a automação antes de ativá-la"
    : active
      ? "Pausar automação"
      : "Ativar automação";
  return (
    <div className="grid gap-3 px-4 py-3.5 transition-colors hover:bg-muted/20 lg:grid-cols-[minmax(220px,1.5fr)_minmax(180px,1fr)_120px_150px_100px_112px] lg:items-center lg:gap-0">
      <Link href={`/automations/${automation.id}`} className="min-w-0 px-3">
        <p className="truncate text-sm font-semibold hover:text-primary">{automation.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {automation.description || automation.triggerLabel || automation.triggerType}
          {automation.recentFailures ? <span className="ml-2 text-destructive">{automation.recentFailures} falhas recentes</span> : null}
        </p>
      </Link>
      <p className="border-border/70 px-3 text-xs text-muted-foreground lg:border-l">{humanizeTrigger(automation.triggerLabel ?? automation.triggerType)}</p>
      <div className="flex items-center justify-center border-border/70 px-3 lg:border-l">
        <button
          type="button"
          role="switch"
          aria-checked={active}
          aria-label={active ? `Pausar ${automation.name}` : `Ativar ${automation.name}`}
          disabled={toggling || !canToggle}
          title={toggleTitle}
          onClick={() => onToggle(!active)}
          className={cn(
            "relative h-6 w-10 shrink-0 rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-45",
            active ? "border-success/50 bg-success/20 text-success" : "border-border bg-muted text-muted-foreground",
          )}
        >
          <span className={cn("absolute top-[3px] h-4 w-4 rounded-full bg-current shadow-sm transition-[left]", active ? "left-[19px]" : "left-[3px]")} />
        </button>
      </div>
      <div className="border-border/70 px-3 text-center text-xs text-muted-foreground lg:border-l">
        {automation.lastExecution ? <ClientRelativeTime value={automation.lastExecution.startedAt} /> : t.never}
      </div>
      <p className="border-border/70 px-3 text-center text-xs text-muted-foreground lg:border-l">{automation.executionCount ?? 0}</p>
      <div className="flex items-center justify-center border-border/70 px-3 lg:border-l">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-full"
          onClick={onEdit}
          aria-label={`Editar informações de ${automation.name}`}
          title="Editar informações"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function humanizeTrigger(value: string): string {
  const known: Record<string, string> = {
    GRAPH: "Fluxo visual",
    "contact.days_without_purchase": "Dias sem compra",
    "payment.pending": "Pagamento pendente",
  };
  return known[value] ?? value;
}

function ExecutionsTable({ executions, loading }: { executions: AutomationExecution[]; loading: boolean }) {
  if (loading) return <Skeleton className="h-32" />;
  if (!executions.length) return <p className="text-sm text-muted-foreground">Nenhuma execução registrada.</p>;
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="divide-y divide-border">
        {executions.map((execution) => (
          <Link key={execution.id} href={`/automations/${execution.automation?.id ?? ""}?execution=${execution.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40">
            <StatusIcon status={execution.status} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{execution.automation?.name ?? "Automação"}</p>
              <p className="text-xs text-muted-foreground">{EXECUTION_LABEL[execution.status] ?? execution.status}</p>
            </div>
            <ClientRelativeTime value={execution.startedAt} className="text-[11px] text-muted-foreground" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function TemplateGallery({ templates, onUse }: { templates: AutomationTemplateCard[]; onUse: (key: string) => void }) {
  const t = automationsText();
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {templates.map((template) => (
        <article key={template.key} className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{template.category}</p>
          <h3 className="mt-1 text-sm font-semibold">{template.name}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{template.description}</p>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">{template.nodeCount} etapas</span>
            <Button size="sm" variant="outline" onClick={() => onUse(template.key)}>{t.useTemplate}</Button>
          </div>
        </article>
      ))}
    </div>
  );
}

function EditAutomationDialog({
  automation,
  onOpenChange,
  onSaved,
  locale,
}: {
  automation: Automation | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  locale?: string;
}) {
  const t = automationsText(locale);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [scopeType, setScopeType] = React.useState("ORGANIZATION");
  const [scopeId, setScopeId] = React.useState("");
  const pipelines = useQuery({
    queryKey: ["pipelines", "automation-edit-options"],
    queryFn: () => pipelinesApi.list({ pageSize: 100 }),
    enabled: Boolean(automation),
  });
  const update = useMutation({
    mutationFn: () => automationsApi.update(automation!.id, {
      name,
      description,
      scopeType,
      scopeId: scopeType === "PIPELINE" ? scopeId : null,
    }),
    onSuccess: () => {
      toast.success("Informações da automação atualizadas");
      onSaved();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  React.useEffect(() => {
    if (!automation) return;
    setName(automation.name);
    setDescription(automation.description ?? "");
    setScopeType(automation.scopeType ?? "ORGANIZATION");
    setScopeId(automation.scopeId ?? "");
  }, [automation]);

  return (
    <Dialog
      open={Boolean(automation)}
      onOpenChange={onOpenChange}
      title="Editar automação"
      description="Atualize a identificação e o contexto desta automação."
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>{t.name}</Label>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome da automação" />
        </div>
        <div className="space-y-1.5">
          <Label>{t.description}</Label>
          <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Objetivo desta automação" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t.context}</Label>
            <Select value={scopeType} onChange={(event) => {
              setScopeType(event.target.value);
              if (event.target.value !== "PIPELINE") setScopeId("");
            }}>
              <option value="ORGANIZATION">{t.entireCrm}</option>
              <option value="PIPELINE">{t.specificPipeline}</option>
            </Select>
          </div>
          {scopeType === "PIPELINE" ? (
            <div className="space-y-1.5">
              <Label>Pipeline</Label>
              <Select value={scopeId} onChange={(event) => setScopeId(event.target.value)}>
                <option value="">Selecione</option>
                {(pipelines.data?.data ?? []).map((pipeline: Pipeline) => (
                  <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>
                ))}
              </Select>
            </div>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          Para editar gatilhos, condições e ações, abra o workflow pelo nome da automação.
        </p>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!name.trim() || (scopeType === "PIPELINE" && !scopeId) || update.isPending}
            onClick={() => update.mutate()}
          >
            {update.isPending ? t.saving : "Salvar alterações"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function CreateAutomationDialog({
  open,
  onOpenChange,
  templates,
  locale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: AutomationTemplateCard[];
  locale?: string;
}) {
  const router = useRouter();
  const t = automationsText(locale);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [scopeType, setScopeType] = React.useState("ORGANIZATION");
  const [scopeId, setScopeId] = React.useState("");
  const [templateKey, setTemplateKey] = React.useState("");
  const pipelines = useQuery({ queryKey: ["pipelines", "automation-options"], queryFn: () => pipelinesApi.list({ pageSize: 100 }), enabled: open });
  const create = useMutation({
    mutationFn: () => automationsApi.create({
      name,
      description,
      scopeType,
      scopeId: scopeType === "PIPELINE" ? scopeId : undefined,
      templateKey: templateKey || undefined,
    }),
    onSuccess: (automation) => {
      onOpenChange(false);
      router.push(`/automations/${automation.id}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  React.useEffect(() => {
    if (!open) return;
    const stored = sessionStorage.getItem("xingyu.automationTemplate");
    if (stored) {
      setTemplateKey(stored);
      sessionStorage.removeItem("xingyu.automationTemplate");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t.newAutomation} description="A automação nasce como rascunho e só executa depois de publicada.">
      <div className="space-y-4 p-5">
        <div className="space-y-1.5">
          <Label>{t.name}</Label>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Recuperação de Carrinho" />
        </div>
        <div className="space-y-1.5">
          <Label>{t.description}</Label>
          <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Objetivo desta automação" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t.context}</Label>
            <Select value={scopeType} onChange={(event) => setScopeType(event.target.value)}>
              <option value="ORGANIZATION">{t.entireCrm}</option>
              <option value="PIPELINE">{t.specificPipeline}</option>
            </Select>
          </div>
          {scopeType === "PIPELINE" ? (
            <div className="space-y-1.5">
              <Label>Pipeline</Label>
              <Select value={scopeId} onChange={(event) => setScopeId(event.target.value)}>
                <option value="">Selecione</option>
                {(pipelines.data?.data ?? []).map((pipeline: Pipeline) => (
                  <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>
                ))}
              </Select>
            </div>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label>{t.startFrom}</Label>
          <Select value={templateKey} onChange={(event) => setTemplateKey(event.target.value)}>
            <option value="">{t.blank}</option>
            {templates.map((template) => (
              <option key={template.key} value={template.key}>{template.name}</option>
            ))}
          </Select>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>{create.isPending ? t.saving : t.create}</Button>
        </div>
      </div>
    </Dialog>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "SUCCEEDED" || status === "SUCCESS") return <Activity className="h-4 w-4 text-success" />;
  if (status === "FAILED") return <CircleAlert className="h-4 w-4 text-destructive" />;
  if (status === "WAITING" || status === "RUNNING") return <Clock3 className="h-4 w-4 text-warning" />;
  return <Archive className="h-4 w-4 text-muted-foreground" />;
}

export function AutomationNewPage() {
  return <AutomationsPage />;
}
