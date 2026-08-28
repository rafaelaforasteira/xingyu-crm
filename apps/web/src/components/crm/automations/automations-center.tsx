"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Archive,
  CircleAlert,
  Clock3,
  Copy,
  Pause,
  Play,
  Plus,
  Search,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { PageHeader, ErrorBanner } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientRelativeTime } from "@/components/ui/client-relative-time";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label, Select } from "@/components/ui/form-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { automationsApi, pipelinesApi } from "@/lib/api";
import { canOpenPath } from "@/lib/access-policy";
import { automationsText, EXECUTION_LABEL, STATUS_LABEL } from "@/lib/automations-i18n";
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
  const [createOpen, setCreateOpen] = React.useState(false);
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
        <TabsList>
          <TabsTrigger value="workflows">{t.workflows}</TabsTrigger>
          <TabsTrigger value="executions">{t.executions}</TabsTrigger>
          <TabsTrigger value="templates">{t.templates}</TabsTrigger>
        </TabsList>
        <TabsContent value="workflows" className="space-y-4">
          <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-1.5 overflow-x-auto" role="tablist" aria-label={t.status}>
              {filters.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatus(value)}
                  className={cn(
                    "h-8 rounded-full border px-3 text-xs font-medium",
                    status === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="relative w-full lg:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.search} className="pl-9" />
            </div>
          </section>
          {list.error ? <ErrorBanner message={(list.error as Error).message} /> : null}
          {list.isLoading ? <div className="space-y-3"><Skeleton className="h-20" /><Skeleton className="h-20" /></div> : null}
          {!list.isLoading && !rows.length ? (
            <EmptyState icon={Zap} title={t.emptyTitle} description={t.emptyDescription} actionLabel={t.createFirst} onAction={() => setCreateOpen(true)} />
          ) : null}
          {rows.length ? (
            <section className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="hidden grid-cols-[minmax(220px,1.5fr)_1fr_110px_140px_90px_110px] gap-4 border-b border-border bg-muted/35 px-4 py-2.5 text-xs font-medium text-muted-foreground lg:grid">
                <span>{t.name}</span>
                <span>{t.trigger}</span>
                <span>{t.status}</span>
                <span>{t.lastRun}</span>
                <span>{t.runs}</span>
                <span className="text-right">{t.status}</span>
              </div>
              <div className="divide-y divide-border">
                {rows.map((automation) => (
                  <WorkflowRow key={automation.id} automation={automation} toggling={toggle.isPending} onToggle={(enabled) => toggle.mutate({ id: automation.id, enabled })} />
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

function WorkflowRow({ automation, toggling, onToggle }: { automation: Automation; toggling: boolean; onToggle: (enabled: boolean) => void }) {
  const t = automationsText();
  return (
    <div className="grid gap-3 px-4 py-3.5 lg:grid-cols-[minmax(220px,1.5fr)_1fr_110px_140px_90px_110px] lg:items-center lg:gap-4">
      <Link href={`/automations/${automation.id}`} className="min-w-0">
        <p className="truncate text-sm font-semibold hover:text-primary">{automation.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {automation.description || automation.triggerLabel || automation.triggerType}
          {automation.recentFailures ? <span className="ml-2 text-destructive">{automation.recentFailures} falhas recentes</span> : null}
        </p>
      </Link>
      <p className="text-xs text-muted-foreground">{automation.triggerLabel ?? automation.triggerType}</p>
      <Badge variant={automation.status === "ACTIVE" ? "success" : automation.status === "DRAFT" ? "secondary" : "warning"}>
        {STATUS_LABEL[automation.status] ?? automation.status}
      </Badge>
      <div className="text-xs text-muted-foreground">
        {automation.lastExecution ? <ClientRelativeTime value={automation.lastExecution.startedAt} /> : t.never}
      </div>
      <p className="text-xs text-muted-foreground">{automation.executionCount ?? 0}</p>
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          disabled={toggling || automation.status === "DRAFT" || automation.status === "ARCHIVED"}
          onClick={() => onToggle(automation.status !== "ACTIVE")}
        >
          {automation.status === "ACTIVE" ? <><Pause className="h-3.5 w-3.5" />{t.pause}</> : <><Play className="h-3.5 w-3.5" />{t.activate}</>}
        </Button>
      </div>
    </div>
  );
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
