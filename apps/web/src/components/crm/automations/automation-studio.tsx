"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  History,
  Play,
  Redo2,
  Undo2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { automationsApi, pipelinesApi, settingsApi } from "@/lib/api";
import { automationsText, EXECUTION_LABEL, STATUS_LABEL } from "@/lib/automations-i18n";
import { queryKeys } from "@/lib/query-keys";
import { useUiStore } from "@/stores/ui";
import type { AutomationExecution, AutomationNodeCatalogItem, WorkflowDefinition } from "@/lib/types";
import { NodeInspector, WorkflowSettingsForm } from "./studio-inspector";

const StudioCanvas = dynamic(() => import("./studio-canvas").then((mod) => mod.StudioCanvas), { ssr: false });

const CATEGORY_LABEL: Record<string, string> = {
  triggers: "Gatilhos",
  logic: "Lógica",
  time: "Tempo",
  data: "Dados",
  crm: "CRM",
  communication: "Comunicação",
  integrations: "Integrações",
  ai: "IA",
  advanced: "Avançado",
  visual: "Organização",
};

function defaultHandle(type: string) {
  const kind = type.replace(/@\d+$/, "");
  if (kind === "logic.if") return "true";
  if (kind === "logic.waitForEvent") return "received";
  if (kind === "logic.switch") return "default";
  return "out";
}

export function AutomationStudio({ automationId }: { automationId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const t = automationsText();
  const setCollapsed = useUiStore((state) => state.setSidebarCollapsed);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [definition, setDefinition] = React.useState<WorkflowDefinition | null>(null);
  const [saveState, setSaveState] = React.useState<"saved" | "saving" | "error">("saved");
  const [selectorOpen, setSelectorOpen] = React.useState(false);
  const [panel, setPanel] = React.useState<"editor" | "executions" | "versions">("editor");
  const [history, setHistory] = React.useState<WorkflowDefinition[]>([]);
  const [future, setFuture] = React.useState<WorkflowDefinition[]>([]);
  const revisionRef = React.useRef<number>(0);
  const insertRef = React.useRef<{ source?: string; edgeId?: string; handle?: string } | null>(null);
  const requestAdd = React.useCallback((source?: string, edgeId?: string, handle?: string) => {
    insertRef.current = { source, edgeId, handle };
    setSelectorOpen(true);
  }, []);
  const executionId = searchParams.get("execution");

  const detail = useQuery({
    queryKey: queryKeys.automations.detail(automationId),
    queryFn: () => automationsApi.get(automationId),
    retry: false,
  });
  const catalog = useQuery({ queryKey: queryKeys.automations.catalog, queryFn: automationsApi.catalog });
  const pipelines = useQuery({ queryKey: ["pipelines", "automation-options"], queryFn: () => pipelinesApi.list({ pageSize: 100 }) });
  const users = useQuery({ queryKey: ["settings", "automation-users"], queryFn: settingsApi.users });
  const tags = useQuery({ queryKey: ["settings", "automation-tags"], queryFn: settingsApi.tags });
  const execution = useQuery({
    queryKey: queryKeys.automations.execution(executionId ?? ""),
    queryFn: () => automationsApi.getExecution(executionId!),
    enabled: Boolean(executionId),
  });
  const versions = useQuery({
    queryKey: ["automations", automationId, "versions"],
    queryFn: () => automationsApi.versions(automationId),
    enabled: panel === "versions",
  });
  const runs = useQuery({
    queryKey: queryKeys.automations.executions(automationId),
    queryFn: () => automationsApi.executions(automationId, { pageSize: 40 }),
    enabled: panel === "executions" || Boolean(executionId),
  });

  React.useEffect(() => {
    if (!detail.data) return;
    const draft = detail.data.draft ?? detail.data.draftDefinition ?? { schemaVersion: 1, nodes: [], edges: [] };
    setDefinition(draft);
    revisionRef.current = detail.data.revision ?? 0;
  }, [detail.data]);

  const save = useMutation({
    mutationFn: (next: WorkflowDefinition) =>
      automationsApi.saveDraft(automationId, { definition: next, revision: revisionRef.current, name: detail.data?.name }),
    onSuccess: (automation) => {
      revisionRef.current = automation.revision ?? revisionRef.current + 1;
      setSaveState("saved");
    },
    onError: (error: Error) => {
      setSaveState("error");
      toast.error(error.message);
    },
  });

  const publish = useMutation({
    mutationFn: () => automationsApi.publish(automationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.automations.detail(automationId) });
      toast.success("Automação publicada. Novas execuções usarão esta versão.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const test = useMutation({
    mutationFn: (dryRun: boolean) => automationsApi.test(automationId, { dryRun }),
    onSuccess: () => toast.success("Teste enfileirado."),
    onError: (error: Error) => toast.error(error.message),
  });
  const restore = useMutation({
    mutationFn: (versionId: string) => automationsApi.restoreVersion(automationId, versionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.automations.detail(automationId) });
      toast.success("Versão restaurada como rascunho.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const pushHistory = (next: WorkflowDefinition) => {
    if (definition) setHistory((items) => [...items.slice(-40), definition]);
    setFuture([]);
    setDefinition(next);
    setSaveState("saving");
  };

  React.useEffect(() => {
    if (!definition || saveState !== "saving") return;
    const timer = window.setTimeout(() => save.mutate(definition), 700);
    return () => window.clearTimeout(timer);
  }, [definition, save, saveState]);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (definition) save.mutate(definition);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          const next = future.at(-1);
          if (!next || !definition) return;
          setHistory((items) => [...items, definition]);
          setFuture((items) => items.slice(0, -1));
          setDefinition(next);
        } else {
          const prev = history.at(-1);
          if (!prev || !definition) return;
          setFuture((items) => [...items, definition]);
          setHistory((items) => items.slice(0, -1));
          setDefinition(prev);
        }
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSelectorOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [definition, future, history, save]);

  if (detail.isLoading || !definition) return <Skeleton className="h-full w-full" />;
  if (detail.error || !detail.data) return <p className="p-6 text-sm text-destructive">{(detail.error as Error)?.message ?? "Automação não encontrada"}</p>;

  const issues = detail.data.validation ?? [];
  const readOnly = Boolean(executionId && execution.data);
  const canvasDefinition = (execution.data?.version?.definition as WorkflowDefinition | undefined) ?? definition;
  const statuses = Object.fromEntries((execution.data?.nodeExecutions ?? []).map((item) => [item.nodeId, item.status]));
  const selected = definition.nodes.find((node) => node.id === selectedId)
    ?? canvasDefinition.nodes.find((node) => node.id === selectedId)
    ?? null;

  const addNode = (type: string, label: string) => {
    const id = `node-${crypto.randomUUID()}`;
    const pending = insertRef.current;
    insertRef.current = null;
    let nodes = definition.nodes;
    let edges = definition.edges;
    let position = { x: 180 + definition.nodes.length * 24, y: 140 + definition.nodes.length * 28 };
    if (pending?.edgeId) {
      const edge = definition.edges.find((item) => item.id === pending.edgeId);
      const sourceNode = definition.nodes.find((item) => item.id === edge?.source);
      const targetNode = definition.nodes.find((item) => item.id === edge?.target);
      if (edge && sourceNode && targetNode) {
        position = {
          x: (sourceNode.position.x + targetNode.position.x) / 2,
          y: (sourceNode.position.y + targetNode.position.y) / 2 + 24,
        };
        edges = definition.edges.filter((item) => item.id !== edge.id).concat([
          { id: `e-${edge.source}-${id}`, source: edge.source, target: id, sourceHandle: edge.sourceHandle },
          { id: `e-${id}-${edge.target}`, source: id, target: edge.target, sourceHandle: defaultHandle(type) },
        ]);
      }
    } else if (pending?.source) {
      const sourceNode = definition.nodes.find((item) => item.id === pending.source);
      position = { x: (sourceNode?.position.x ?? 180), y: (sourceNode?.position.y ?? 140) + 140 };
      edges = [...definition.edges, { id: `e-${pending.source}-${id}`, source: pending.source, target: id, sourceHandle: pending.handle ?? "out" }];
    }
    nodes = [...nodes, { id, type, label, position, config: {} }];
    pushHistory({ ...definition, nodes, edges });
    setSelectedId(id);
    setSelectorOpen(false);
  };

  return (
    <div className="automation-studio flex h-full min-h-0 flex-1 flex-col bg-[hsl(var(--automation-canvas))] text-[hsl(var(--automation-text))]">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[hsl(var(--automation-border))] px-3">
        <Button variant="ghost" size="sm" className="text-[hsl(var(--automation-text-2))]" onClick={() => router.push("/automations")}>
          <ArrowLeft className="h-4 w-4" />{t.back}
        </Button>
        <span className="h-4 w-px bg-[hsl(var(--automation-border))]" />
        <p className="truncate text-sm font-semibold">{detail.data.name}</p>
        <Badge variant={detail.data.status === "ACTIVE" ? "success" : "secondary"}>{STATUS_LABEL[detail.data.status] ?? detail.data.status}</Badge>
        <span className="text-[11px] text-[hsl(var(--automation-text-2))]">
          {saveState === "saving" ? t.saving : saveState === "error" ? t.saveError : t.saved}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <Button size="sm" variant={panel === "editor" ? "secondary" : "ghost"} onClick={() => { setPanel("editor"); router.replace(`/automations/${automationId}`); }}>Editor</Button>
          <Button size="sm" variant={panel === "executions" ? "secondary" : "ghost"} onClick={() => setPanel("executions")}>{t.executions}</Button>
          <Button size="sm" variant={panel === "versions" ? "secondary" : "ghost"} onClick={() => setPanel("versions")}><History className="h-4 w-4" />{t.history}</Button>
          <Button size="sm" variant="ghost" onClick={() => setCollapsed(true)}>{t.focus}</Button>
          <Button size="sm" variant="ghost" onClick={() => { const prev = history.at(-1); if (prev && definition) { setFuture((items) => [...items, definition]); setHistory((items) => items.slice(0, -1)); setDefinition(prev); } }}><Undo2 className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => { const next = future.at(-1); if (next && definition) { setHistory((items) => [...items, definition]); setFuture((items) => items.slice(0, -1)); setDefinition(next); } }}><Redo2 className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" className="border-[hsl(var(--automation-border))] bg-transparent" onClick={() => void automationsApi.validate(automationId).then((result) => toast.message(result.ok ? "Pronto para publicar" : `${result.issues.filter((i) => i.level === "error").length} problemas precisam ser corrigidos`))}><Check className="h-4 w-4" />{t.validate}</Button>
          <Button size="sm" variant="outline" className="border-[hsl(var(--automation-border))] bg-transparent" onClick={() => test.mutate(true)}><Play className="h-4 w-4" />{t.test}</Button>
          <Button size="sm" onClick={() => publish.mutate()} disabled={publish.isPending}><Upload className="h-4 w-4" />{t.publish}</Button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          {panel === "executions" && !executionId ? (
            <ExecutionList
              rows={runs.data?.data ?? []}
              loading={runs.isLoading}
              onOpen={(id) => router.push(`/automations/${automationId}?execution=${id}`)}
            />
          ) : panel === "versions" ? (
            <VersionList
              rows={versions.data ?? []}
              onRestore={(id) => restore.mutate(id)}
            />
          ) : (
            <StudioCanvas
              definition={canvasDefinition}
              selectedId={selectedId}
              catalog={catalog.data ?? []}
              statuses={executionId ? statuses : undefined}
              readOnly={readOnly}
              onChange={pushHistory}
              onSelect={setSelectedId}
              onAddRequest={requestAdd}
            />
          )}
        </div>
        <aside className="flex w-[340px] shrink-0 flex-col border-l border-[hsl(var(--automation-border))] bg-[hsl(var(--automation-surface))]">
          <div className="border-b border-[hsl(var(--automation-border))] px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[hsl(var(--automation-text-2))]">{execution.data ? "Execução" : t.inspector}</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {execution.data ? (
              <ExecutionInspector execution={execution.data} selectedId={selectedId} />
            ) : selected ? (
              <NodeInspector
                node={selected}
                catalog={catalog.data ?? []}
                pipelines={pipelines.data?.data ?? []}
                users={users.data ?? []}
                tags={tags.data ?? []}
                onChange={(next) => pushHistory({ ...definition, nodes: definition.nodes.map((node) => (node.id === selected.id ? next : node)) })}
              />
            ) : (
              <WorkflowSettingsForm
                settings={definition.settings ?? {}}
                onChange={(settings) => pushHistory({ ...definition, settings })}
              />
            )}
            {issues.length ? (
              <div className="mt-6 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--automation-text-2))]">{t.problems}</p>
                {issues.map((issue) => (
                  <button key={`${issue.code}-${issue.nodeId}`} type="button" className="block w-full rounded-lg bg-black/20 px-3 py-2 text-left text-xs" onClick={() => issue.nodeId && setSelectedId(issue.nodeId)}>
                    <span className={issue.level === "error" ? "text-[hsl(var(--automation-error))]" : "text-[hsl(var(--automation-warning))]"}>{issue.message}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </aside>
      </div>
      {selectorOpen ? (
        <NodeSelector catalog={catalog.data ?? []} onClose={() => setSelectorOpen(false)} onPick={addNode} />
      ) : null}
    </div>
  );
}

function ExecutionList({ rows, loading, onOpen }: { rows: AutomationExecution[]; loading: boolean; onOpen: (id: string) => void }) {
  if (loading) return <Skeleton className="m-6 h-40" />;
  if (!rows.length) return <p className="p-6 text-sm text-[hsl(var(--automation-text-2))]">Nenhuma execução ainda. Publique e dispare um evento real, ou use Testar.</p>;
  return (
    <div className="divide-y divide-[hsl(var(--automation-border))]">
      {rows.map((row) => (
        <button key={row.id} type="button" className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-white/5" onClick={() => onOpen(row.id)}>
          <div>
            <p className="text-sm">{EXECUTION_LABEL[row.status] ?? row.status}</p>
            <p className="text-[11px] text-[hsl(var(--automation-text-2))]">{row.subjectType} {row.subjectId}</p>
          </div>
          <span className="text-[11px] text-[hsl(var(--automation-text-2))]">{new Date(row.startedAt).toLocaleString()}</span>
        </button>
      ))}
    </div>
  );
}

function VersionList({ rows, onRestore }: { rows: Array<{ id: string; version: number; createdAt: string }>; onRestore: (id: string) => void }) {
  if (!rows.length) return <p className="p-6 text-sm text-[hsl(var(--automation-text-2))]">Ainda não há versões publicadas.</p>;
  return (
    <div className="divide-y divide-[hsl(var(--automation-border))]">
      {rows.map((row, index) => (
        <div key={row.id} className="flex items-center justify-between px-5 py-3">
          <div>
            <p className="text-sm">v{row.version}{index === 0 ? " · atual" : ""}</p>
            <p className="text-[11px] text-[hsl(var(--automation-text-2))]">{new Date(row.createdAt).toLocaleString()}</p>
          </div>
          <Button size="sm" variant="outline" className="border-[hsl(var(--automation-border))] bg-transparent" onClick={() => onRestore(row.id)}>Restaurar como rascunho</Button>
        </div>
      ))}
    </div>
  );
}

function ExecutionInspector({ execution, selectedId }: { execution: AutomationExecution; selectedId: string | null }) {
  const node = execution.nodeExecutions?.find((item) => item.nodeId === selectedId);
  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">{EXECUTION_LABEL[execution.status] ?? execution.status}</p>
      {execution.error ? <p className="text-xs text-[hsl(var(--automation-error))]">{execution.error}</p> : null}
      <div className="space-y-2">
        {(execution.logs ?? []).map((log) => (
          <p key={log.id} className="text-[11px] leading-5 text-[hsl(var(--automation-text-2))]">
            {new Date(log.createdAt).toLocaleTimeString()} — {log.message}
          </p>
        ))}
      </div>
      {node ? (
        <div className="space-y-2 rounded-lg bg-black/20 p-3">
          <p className="text-xs font-medium">{node.nodeType} · {node.status}</p>
          <pre className="overflow-auto text-[10px] text-[hsl(var(--automation-text-2))]">{JSON.stringify(node.output ?? {}, null, 2)}</pre>
          {node.errorMessage ? <p className="text-[11px] text-[hsl(var(--automation-error))]">{node.errorMessage}</p> : null}
        </div>
      ) : null}
      {execution.status === "FAILED" ? (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => void automationsApi.retryExecution(execution.id, false)}>Tentar de novo</Button>
          <Button size="sm" variant="outline" className="border-[hsl(var(--automation-border))] bg-transparent" onClick={() => void automationsApi.retryExecution(execution.id, true)}>Desde o início</Button>
        </div>
      ) : null}
    </div>
  );
}

function NodeSelector({
  catalog,
  onClose,
  onPick,
}: {
  catalog: AutomationNodeCatalogItem[];
  onClose: () => void;
  onPick: (type: string, label: string) => void;
}) {
  const [search, setSearch] = React.useState("");
  const categories = ["triggers", "logic", "time", "data", "crm", "communication", "advanced", "visual"];
  const filtered = catalog.filter((item) => `${item.label} ${item.description} ${item.type}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 p-6">
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[hsl(var(--automation-border))] bg-[hsl(var(--automation-surface))] shadow-drawer">
        <div className="flex items-center justify-between border-b border-[hsl(var(--automation-border))] px-4 py-3">
          <p className="text-sm font-semibold">Adicionar etapa</p>
          <Button size="sm" variant="ghost" onClick={onClose}>Fechar</Button>
        </div>
        <div className="p-3"><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar..." autoFocus /></div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          {categories.map((category) => {
            const items = filtered.filter((item) => item.category === category);
            if (!items.length) return null;
            return (
              <div key={category} className="mb-3">
                <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--automation-text-2))]">{CATEGORY_LABEL[category] ?? category}</p>
                <div className="space-y-1">
                  {items.map((item) => (
                    <button key={item.id} type="button" onClick={() => onPick(item.id, item.label)} className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-white/5">
                      <span className="text-sm">{item.label}</span>
                      <span className="text-[11px] text-[hsl(var(--automation-text-2))]">{item.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
