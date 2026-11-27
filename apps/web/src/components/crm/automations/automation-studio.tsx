"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Braces,
  Clock3,
  Contact,
  Copy,
  Database,
  GitFork,
  HelpCircle,
  History,
  LayoutGrid,
  MessageCircle,
  Play,
  Plus,
  Redo2,
  Search as SearchIcon,
  StickyNote,
  Undo2,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { automationsApi, pipelinesApi } from "@/lib/api";
import { automationsText, EXECUTION_LABEL } from "@/lib/automations-i18n";
import { queryKeys } from "@/lib/query-keys";
import type {
  AutomationExecution,
  AutomationNodeCatalogItem,
  WorkflowDefinition,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { AutomationNodeIcon, AUTOMATION_CATEGORY_META } from "./automation-node-icon";
import { removeCanvasItem } from "./automation-definition-utils";

const StudioCanvas = dynamic(() => import("./studio-canvas").then((mod) => mod.StudioCanvas), {
  ssr: false,
});

function defaultHandle(type: string) {
  const kind = type.replace(/@\d+$/, "");
  if (kind === "logic.if") return "true";
  if (kind === "logic.waitForEvent") return "received";
  if (kind === "logic.switch") return "default";
  return "out";
}

function availableNodePosition(
  nodes: WorkflowDefinition["nodes"],
  preferred: { x: number; y: number },
  type: string,
) {
  const sizeFor = (nodeType: string, config?: Record<string, unknown>) => {
    const kind = nodeType.replace(/@\d+$/, "");
    if (kind === "visual.frame")
      return { width: Number(config?.width ?? 280), height: Number(config?.height ?? 180) };
    if (kind === "visual.note") return { width: 190, height: 120 };
    if (kind === "action.whatsapp.send") return { width: 380, height: 520 };
    if (kind === "action.deal.moveStage" || kind === "trigger.deal.created")
      return { width: 286, height: 240 };
    return { width: 300, height: 300 };
  };
  const absolutePosition = (node: WorkflowDefinition["nodes"][number]) => {
    const parentId = typeof node.config?.parentId === "string" ? node.config.parentId : undefined;
    const parent = parentId ? nodes.find((item) => item.id === parentId) : undefined;
    return parent
      ? { x: parent.position.x + node.position.x, y: parent.position.y + node.position.y }
      : node.position;
  };
  const targetSize = sizeFor(type);
  const gap = 28;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    const column = Math.floor(attempt / 12);
    const rowIndex = attempt % 12;
    const row = rowIndex === 0 ? 0 : Math.ceil(rowIndex / 2) * (rowIndex % 2 ? 1 : -1);
    const candidate = {
      x: preferred.x + column * (targetSize.width + 48),
      y: Math.max(24, preferred.y + row * (targetSize.height + 40)),
    };
    const occupied = nodes.some((node) => {
      const position = absolutePosition(node);
      const size = sizeFor(node.type, node.config);
      return !(
        candidate.x + targetSize.width + gap <= position.x ||
        candidate.x >= position.x + size.width + gap ||
        candidate.y + targetSize.height + gap <= position.y ||
        candidate.y >= position.y + size.height + gap
      );
    });
    if (!occupied) return candidate;
  }

  return preferred;
}

function autoLayout(definition: WorkflowDefinition): WorkflowDefinition {
  const incoming = new Map(definition.nodes.map((node) => [node.id, 0]));
  definition.edges.forEach((edge) =>
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1),
  );
  const depths = new Map<string, number>();
  const queue = definition.nodes
    .filter((node) => (incoming.get(node.id) ?? 0) === 0)
    .map((node) => node.id);
  queue.forEach((id) => depths.set(id, 0));
  for (let index = 0; index < queue.length; index += 1) {
    const source = queue[index]!;
    definition.edges
      .filter((edge) => edge.source === source)
      .forEach((edge) => {
        depths.set(
          edge.target,
          Math.max(depths.get(edge.target) ?? 0, (depths.get(source) ?? 0) + 1),
        );
        if (!queue.includes(edge.target)) queue.push(edge.target);
      });
  }
  const rows = new Map<number, number>();
  return {
    ...definition,
    nodes: definition.nodes.map((node) => {
      if (node.type.startsWith("visual.")) return node;
      const depth = depths.get(node.id) ?? 0;
      const row = rows.get(depth) ?? 0;
      rows.set(depth, row + 1);
      return { ...node, position: { x: 120 + depth * 190, y: 130 + row * 135 } };
    }),
  };
}

export function AutomationStudio({ automationId }: { automationId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const t = automationsText();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [definition, setDefinition] = React.useState<WorkflowDefinition | null>(null);
  const [saveState, setSaveState] = React.useState<"saved" | "saving" | "error">("saved");
  const [selectorOpen, setSelectorOpen] = React.useState(false);
  const [panel, setPanel] = React.useState<"editor" | "executions" | "versions" | "analytics">(
    "editor",
  );
  const [history, setHistory] = React.useState<WorkflowDefinition[]>([]);
  const [future, setFuture] = React.useState<WorkflowDefinition[]>([]);
  const [theme, setTheme] = React.useState<"dark" | "light">("dark");
  const [simulationOpen, setSimulationOpen] = React.useState(false);
  const [simulation, setSimulation] = React.useState({
    dealId: "",
    contactId: "",
    orderId: "",
    context: "{}",
  });
  const [nodeIdToDelete, setNodeIdToDelete] = React.useState<string | null>(null);
  const [selectorCategory, setSelectorCategory] = React.useState("all");
  const revisionRef = React.useRef<number>(0);
  const definitionRef = React.useRef<WorkflowDefinition | null>(null);
  const insertRef = React.useRef<{ source?: string; edgeId?: string; handle?: string } | null>(
    null,
  );
  const requestAdd = React.useCallback((source?: string, edgeId?: string, handle?: string) => {
    insertRef.current = { source, edgeId, handle };
    setSelectorOpen(true);
  }, []);
  const executionId = searchParams.get("execution");
  definitionRef.current = definition;

  const detail = useQuery({
    queryKey: queryKeys.automations.detail(automationId),
    queryFn: () => automationsApi.get(automationId),
    retry: false,
  });
  const catalog = useQuery({
    queryKey: queryKeys.automations.catalog,
    queryFn: automationsApi.catalog,
  });
  const pipelines = useQuery({
    queryKey: ["pipelines", "automation-options"],
    queryFn: () => pipelinesApi.list({ pageSize: 100 }),
  });
  const users = useQuery({
    queryKey: ["automations", "assignment-users"],
    queryFn: automationsApi.assignmentUsers,
  });
  const tags = useQuery({
    queryKey: ["automations", "assignment-tags"],
    queryFn: automationsApi.assignmentTags,
  });
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
  const draftSnapshots = useQuery({
    queryKey: ["automations", automationId, "draft-snapshots"],
    queryFn: () => automationsApi.draftSnapshots(automationId),
    enabled: panel === "versions",
  });
  const runs = useQuery({
    queryKey: queryKeys.automations.executions(automationId),
    queryFn: () => automationsApi.executions(automationId, { pageSize: 40 }),
    enabled: panel === "executions" || Boolean(executionId),
  });
  const analytics = useQuery({
    queryKey: ["automations", automationId, "analytics"],
    queryFn: () => automationsApi.analytics(automationId),
    enabled: panel === "analytics",
  });

  React.useEffect(() => {
    if (!detail.data) return;
    const incomingRevision = detail.data.revision ?? 0;
    const shouldHydrate =
      definition === null || (saveState === "saved" && incomingRevision > revisionRef.current);
    if (!shouldHydrate) return;
    const draft = detail.data.draft ??
      detail.data.draftDefinition ?? { schemaVersion: 1, nodes: [], edges: [] };
    setDefinition(draft);
    revisionRef.current = incomingRevision;
  }, [definition, detail.data, saveState]);

  React.useEffect(() => {
    const stored = window.localStorage.getItem("xingyu.automationStudioTheme");
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);

  const save = useMutation({
    mutationFn: (next: WorkflowDefinition) =>
      automationsApi.saveDraft(automationId, {
        definition: next,
        revision: revisionRef.current,
        name: detail.data?.name,
      }),
    onSuccess: (automation, savedDefinition) => {
      revisionRef.current = automation.revision ?? revisionRef.current + 1;
      setSaveState(definitionRef.current === savedDefinition ? "saved" : "saving");
    },
    onError: (error: Error) => {
      setSaveState("error");
      toast.error(error.message);
    },
  });

  const toggleStatus = useMutation({
    mutationFn: (enabled: boolean) =>
      enabled && detail.data?.status === "DRAFT"
        ? automationsApi.publish(automationId)
        : automationsApi.pause(automationId, enabled),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.automations.detail(automationId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.automations.all });
      toast.success("Status da automação atualizado.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const test = useMutation({
    mutationFn: (data: Record<string, unknown>) => automationsApi.test(automationId, data),
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
  const restoreSnapshot = useMutation({
    mutationFn: (snapshotId: string) =>
      automationsApi.restoreDraftSnapshot(automationId, snapshotId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.automations.detail(automationId) });
      void queryClient.invalidateQueries({
        queryKey: ["automations", automationId, "draft-snapshots"],
      });
      toast.success("Rascunho recuperado.");
      setPanel("editor");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const pushHistory = (next: WorkflowDefinition) => {
    if (definition) setHistory((items) => [...items.slice(-40), definition]);
    setFuture([]);
    setDefinition(next);
    setSaveState("saving");
  };

  const undo = React.useCallback(() => {
    const previous = history.at(-1);
    if (!previous || !definition) return;
    setFuture((items) => [...items, definition]);
    setHistory((items) => items.slice(0, -1));
    setDefinition(previous);
    setSaveState("saving");
  }, [definition, history]);

  const redo = React.useCallback(() => {
    const next = future.at(-1);
    if (!next || !definition) return;
    setHistory((items) => [...items, definition]);
    setFuture((items) => items.slice(0, -1));
    setDefinition(next);
    setSaveState("saving");
  }, [definition, future]);

  React.useEffect(() => {
    if (!definition || saveState !== "saving" || save.isPending) return;
    const timer = window.setTimeout(() => save.mutate(definition), 700);
    return () => window.clearTimeout(timer);
  }, [definition, save.isPending, save.mutate, saveState]);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (definition) save.mutate(definition);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSelectorOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [definition, redo, save, undo]);

  if (detail.isLoading || !definition) return <Skeleton className="h-full w-full" />;
  if (detail.error || !detail.data)
    return (
      <p className="p-6 text-sm text-destructive">
        {(detail.error as Error)?.message ?? "Automação não encontrada"}
      </p>
    );

  const issues = detail.data.validation ?? [];
  const readOnly = Boolean(executionId && execution.data);
  const canvasDefinition =
    (execution.data?.version?.definition as WorkflowDefinition | undefined) ?? definition;
  const statuses = Object.fromEntries(
    (execution.data?.nodeExecutions ?? []).map((item) => [item.nodeId, item.status]),
  );
  const selected =
    definition.nodes.find((node) => node.id === selectedId) ??
    canvasDefinition.nodes.find((node) => node.id === selectedId) ??
    null;
  const active = detail.data.status === "ACTIVE";
  const statusToggleDisabled = toggleStatus.isPending || detail.data.status === "ARCHIVED";

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.localStorage.setItem("xingyu.automationStudioTheme", next);
  };

  const addNode = (type: string, label: string) => {
    const id = `node-${crypto.randomUUID()}`;
    const pending = insertRef.current;
    insertRef.current = null;
    let nodes = definition.nodes;
    let edges = definition.edges;
    const rightmostX = definition.nodes.reduce(
      (maximum, node) => {
        const width = Number(node.config?.width ?? (node.type.includes("whatsapp.send") ? 380 : 300));
        return Math.max(maximum, node.position.x + width);
      },
      10,
    );
    let position = availableNodePosition(definition.nodes, {
      x: rightmostX + 48,
      y: definition.nodes[0]?.position.y ?? 140,
    }, type);
    if (pending?.edgeId) {
      const edge = definition.edges.find((item) => item.id === pending.edgeId);
      const sourceNode = definition.nodes.find((item) => item.id === edge?.source);
      const targetNode = definition.nodes.find((item) => item.id === edge?.target);
      if (edge && sourceNode && targetNode) {
        position = availableNodePosition(definition.nodes, {
          x: (sourceNode.position.x + targetNode.position.x) / 2,
          y: (sourceNode.position.y + targetNode.position.y) / 2,
        }, type);
        edges = definition.edges
          .filter((item) => item.id !== edge.id)
          .concat([
            {
              id: `e-${edge.source}-${id}`,
              source: edge.source,
              target: id,
              sourceHandle: edge.sourceHandle,
            },
            {
              id: `e-${id}-${edge.target}`,
              source: id,
              target: edge.target,
              sourceHandle: defaultHandle(type),
            },
          ]);
      }
    } else if (pending?.source) {
      const sourceNode = definition.nodes.find((item) => item.id === pending.source);
      position = availableNodePosition(definition.nodes, {
        x: (sourceNode?.position.x ?? 10) + 170,
        y: sourceNode?.position.y ?? 140,
      }, type);
      edges = [
        ...definition.edges,
        {
          id: `e-${pending.source}-${id}`,
          source: pending.source,
          target: id,
          sourceHandle: pending.handle ?? "out",
        },
      ];
    }
    nodes = [...nodes, { id, type, label, position, config: {} }];
    pushHistory({ ...definition, nodes, edges });
    setSelectedId(id);
    setSelectorOpen(false);
  };

  const duplicateSelected = () => {
    const source = definition.nodes.find((node) => node.id === selectedId);
    if (!source) return;
    const id = `node-${crypto.randomUUID()}`;
    pushHistory({
      ...definition,
      nodes: [
        ...definition.nodes,
        {
          ...source,
          id,
          label: `${source.label ?? "Etapa"} (cópia)`,
          position: { x: source.position.x + 40, y: source.position.y + 50 },
        },
      ],
    });
    setSelectedId(id);
  };

  const removeSelected = () => {
    if (!nodeIdToDelete) return;
    pushHistory(removeCanvasItem(definition, nodeIdToDelete));
    setSelectedId(null);
    setNodeIdToDelete(null);
  };

  const runSimulation = () => {
    let context: Record<string, unknown> = {};
    try {
      context = JSON.parse(simulation.context || "{}");
    } catch {
      toast.error("O contexto precisa ser um JSON válido.");
      return;
    }
    test.mutate(
      {
        dryRun: true,
        dealId: simulation.dealId || undefined,
        contactId: simulation.contactId || undefined,
        orderId: simulation.orderId || undefined,
        context,
      },
      {
        onSuccess: () => setSimulationOpen(false),
      },
    );
  };

  return (
    <div
      className={cn(
        "automation-studio flex h-full min-h-0 flex-1 flex-col bg-[hsl(var(--automation-canvas))] text-[hsl(var(--automation-text))]",
        theme === "light" && "automation-studio-light",
      )}
    >
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[hsl(var(--automation-border))] px-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-[hsl(var(--automation-accent))] hover:bg-[hsl(var(--automation-accent)/0.12)]"
          onClick={() => router.push("/automations")}
          aria-label="Voltar para automações"
          title="Voltar para automações"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold",
            saveState === "saved"
              ? "border-[hsl(var(--automation-success)/0.35)] bg-[hsl(var(--automation-success)/0.1)] text-[hsl(var(--automation-success))]"
              : "border-[hsl(var(--automation-error)/0.4)] bg-[hsl(var(--automation-error)/0.1)] text-[hsl(var(--automation-error))]",
          )}
          role="status"
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full bg-current",
              saveState !== "saved" && "animate-pulse",
            )}
          />
          {saveState === "saved" ? "Salvo" : "Não salvo"}
        </span>
        <span className="h-4 w-px bg-[hsl(var(--automation-border))]" />
        <span className="min-w-0 truncate text-sm font-semibold">{detail.data.name}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            role="switch"
            aria-checked={active}
            aria-label={active ? "Desativar automação" : "Ativar automação"}
            disabled={statusToggleDisabled}
            title={
              detail.data.status === "ARCHIVED"
                ? "Automação arquivada"
                : active
                  ? "Desativar automação"
                  : "Ativar automação"
            }
            onClick={() => toggleStatus.mutate(!active)}
            className={cn(
              "relative h-7 w-12 rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-55",
              active
                ? "border-[hsl(var(--automation-success)/0.65)] bg-[hsl(var(--automation-success)/0.18)] text-[hsl(var(--automation-success))]"
                : "border-[hsl(var(--automation-border))] bg-[hsl(var(--automation-surface-2))] text-[hsl(var(--automation-text-2))]",
            )}
          >
            <span
              className={cn(
                "absolute top-[3px] h-5 w-5 rounded-full bg-current opacity-90 shadow-sm transition-[left]",
                active ? "left-[23px]" : "left-[3px]",
              )}
            />
          </button>
        </div>
      </header>
      <div className="relative flex min-h-0 flex-1">
        <nav
          aria-label="Seções da automação"
          className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-[hsl(var(--automation-border))] bg-[hsl(var(--automation-surface)/0.94)] p-1 shadow-soft backdrop-blur"
        >
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full border border-[hsl(var(--automation-accent)/0.22)] bg-[hsl(var(--automation-accent)/0.07)] text-[hsl(var(--automation-accent))] hover:bg-[hsl(var(--automation-accent)/0.15)]"
            onClick={() => setSimulationOpen(true)}
            aria-label="Testar automação"
            title="Testar automação"
          >
            <Play className="h-4 w-4" />
          </Button>
          <span className="mx-0.5 h-5 w-px bg-[hsl(var(--automation-border))]" />
          <Button
            size="sm"
            variant={panel === "editor" ? "secondary" : "ghost"}
            onClick={() => {
              setPanel("editor");
              router.replace(`/automations/${automationId}`);
            }}
          >
            <Workflow className="h-4 w-4 text-[hsl(var(--automation-accent))]" />
            Editor
          </Button>
          <Button
            size="sm"
            variant={panel === "executions" ? "secondary" : "ghost"}
            onClick={() => setPanel("executions")}
          >
            <Activity className="h-4 w-4 text-[hsl(var(--automation-accent))]" />
            {t.executions}
          </Button>
          <Button
            size="sm"
            variant={panel === "versions" ? "secondary" : "ghost"}
            onClick={() => setPanel("versions")}
          >
            <History className="h-4 w-4 text-[hsl(var(--automation-accent))]" />
            {t.history}
          </Button>
          <Button
            size="sm"
            variant={panel === "analytics" ? "secondary" : "ghost"}
            onClick={() => setPanel("analytics")}
          >
            <BarChart3 className="h-4 w-4 text-[hsl(var(--automation-accent))]" />
            Resultados
          </Button>
        </nav>
        {panel === "editor" && !readOnly ? (
          <div className="absolute right-4 top-3 z-20 flex flex-col gap-1 rounded-xl border border-[hsl(var(--automation-border))] bg-[hsl(var(--automation-surface)/0.94)] p-1 shadow-soft backdrop-blur">
            <button
              type="button"
              onClick={undo}
              disabled={!history.length}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--automation-accent))] transition-colors hover:bg-[hsl(var(--automation-accent)/0.12)] disabled:opacity-30"
              aria-label="Desfazer"
              title="Desfazer"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!future.length}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--automation-accent))] transition-colors hover:bg-[hsl(var(--automation-accent)/0.12)] disabled:opacity-30"
              aria-label="Refazer"
              title="Refazer"
            >
              <Redo2 className="h-4 w-4" />
            </button>
            <span className="mx-1 my-0.5 h-px bg-[hsl(var(--automation-border))]" />
            <button
              type="button"
              onClick={() => requestAdd()}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--automation-accent))] transition-colors hover:bg-[hsl(var(--automation-accent)/0.12)]"
              aria-label="Adicionar etapa"
              title="Adicionar etapa"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => addNode("visual.note@1", "Nova anotação")}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--automation-warning))] transition-colors hover:bg-[hsl(var(--automation-warning)/0.12)]"
              aria-label="Adicionar anotação"
              title="Adicionar anotação"
            >
              <StickyNote className="h-4 w-4" />
            </button>
            <span className="mx-1 my-0.5 h-px bg-[hsl(var(--automation-border))]" />
            <button
              type="button"
              onClick={() => pushHistory(autoLayout(definition))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--automation-accent))] transition-colors hover:bg-[hsl(var(--automation-accent)/0.12)]"
              aria-label="Organizar blocos automaticamente"
              title="Organizar blocos automaticamente"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={duplicateSelected}
              disabled={!selectedId}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--automation-accent))] transition-colors hover:bg-[hsl(var(--automation-accent)/0.12)] disabled:opacity-30"
              aria-label="Duplicar etapa selecionada"
              title="Duplicar etapa selecionada"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        ) : null}
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
              snapshots={draftSnapshots.data ?? []}
              onRestore={(id) => restore.mutate(id)}
              onRestoreSnapshot={(id) => restoreSnapshot.mutate(id)}
            />
          ) : panel === "analytics" ? (
            <AutomationAnalytics data={analytics.data} loading={analytics.isLoading} />
          ) : (
            <StudioCanvas
              definition={canvasDefinition}
              selectedId={selectedId}
              catalog={catalog.data ?? []}
              pipelines={pipelines.data?.data ?? []}
              users={users.data ?? []}
              tags={tags.data ?? []}
              statuses={executionId ? statuses : undefined}
              readOnly={readOnly}
              theme={theme}
              onChange={pushHistory}
              onSelect={setSelectedId}
              onAddRequest={requestAdd}
              onDeleteRequest={(nodeId) => {
                setSelectedId(nodeId);
                setNodeIdToDelete(nodeId);
              }}
              onToggleTheme={toggleTheme}
            />
          )}
        </div>
        {execution.data ? (
          <aside
            className={cn(
              "absolute right-16 top-16 z-20 flex w-[340px] flex-col",
              execution.data &&
                "bottom-4 overflow-hidden rounded-2xl border border-[hsl(var(--automation-border))] bg-[hsl(var(--automation-surface)/0.96)] shadow-[0_24px_70px_hsl(var(--automation-canvas)/0.55)] backdrop-blur-xl",
            )}
          >
            {execution.data ? (
              <div className="border-b border-[hsl(var(--automation-border))] px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[hsl(var(--automation-text-2))]">
                  {execution.data ? "Execução" : selected?.label || t.inspector}
                </p>
              </div>
            ) : null}
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <ExecutionInspector execution={execution.data} selectedId={selectedId} />
              {issues.length && selected?.type.replace(/@\d+$/, "") !== "action.deal.moveStage" ? (
                <div className="mt-6 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--automation-text-2))]">
                    {t.problems}
                  </p>
                  {issues.map((issue) => (
                    <button
                      key={`${issue.code}-${issue.nodeId}`}
                      type="button"
                      className="block w-full rounded-lg bg-black/20 px-3 py-2 text-left text-xs"
                      onClick={() => issue.nodeId && setSelectedId(issue.nodeId)}
                    >
                      <span
                        className={
                          issue.level === "error"
                            ? "text-[hsl(var(--automation-error))]"
                            : "text-[hsl(var(--automation-warning))]"
                        }
                      >
                        {issue.message}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </aside>
        ) : null}
      </div>
      {selectorOpen ? (
        <NodeSelector
          catalog={catalog.data ?? []}
          category={selectorCategory}
          onCategoryChange={setSelectorCategory}
          onClose={() => setSelectorOpen(false)}
          onPick={addNode}
        />
      ) : null}
      <Dialog
        open={simulationOpen}
        onOpenChange={setSimulationOpen}
        title="Simular automação"
        description="Executa o rascunho sem enviar mensagens nem alterar dados. Informe um registro de exemplo se desejar."
        wide
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium">ID do lead</label>
              <Input
                value={simulation.dealId}
                onChange={(event) =>
                  setSimulation((value) => ({ ...value, dealId: event.target.value }))
                }
                placeholder="Opcional"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">ID do contato</label>
              <Input
                value={simulation.contactId}
                onChange={(event) =>
                  setSimulation((value) => ({ ...value, contactId: event.target.value }))
                }
                placeholder="Opcional"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">ID do pedido</label>
              <Input
                value={simulation.orderId}
                onChange={(event) =>
                  setSimulation((value) => ({ ...value, orderId: event.target.value }))
                }
                placeholder="Opcional"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Contexto adicional (JSON)</label>
            <Textarea
              className="min-h-32 font-mono text-xs"
              value={simulation.context}
              onChange={(event) =>
                setSimulation((value) => ({ ...value, context: event.target.value }))
              }
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSimulationOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={runSimulation} disabled={test.isPending}>
              {test.isPending ? "Simulando…" : "Executar simulação"}
            </Button>
          </div>
        </div>
      </Dialog>
      <Dialog
        open={Boolean(nodeIdToDelete)}
        onOpenChange={(open) => {
          if (!open) setNodeIdToDelete(null);
        }}
        title="Excluir esta etapa?"
        description="As conexões ligadas a ela também serão removidas."
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setNodeIdToDelete(null)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={removeSelected}>
            Excluir etapa
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function AutomationAnalytics({
  data,
  loading,
}: {
  data?: Awaited<ReturnType<typeof automationsApi.analytics>>;
  loading: boolean;
}) {
  if (loading || !data) return <Skeleton className="m-6 h-48" />;
  const duration =
    data.averageDurationMs < 1000
      ? `${data.averageDurationMs} ms`
      : `${(data.averageDurationMs / 1000).toFixed(1)} s`;
  const cards = [
    ["Execuções", data.total],
    ["Taxa de sucesso", `${data.successRate}%`],
    ["Conversões", data.conversions],
    [
      "Receita atribuída",
      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
        data.attributedRevenue,
      ),
    ],
    ["Falhas", data.failed],
    ["Tempo médio", duration],
  ];
  return (
    <div className="p-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-xl border border-[hsl(var(--automation-border))] bg-[hsl(var(--automation-surface))] p-4"
          >
            <p className="text-xs text-[hsl(var(--automation-text-2))]">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-xl border border-[hsl(var(--automation-border))] bg-[hsl(var(--automation-surface))]">
        <div className="border-b border-[hsl(var(--automation-border))] px-4 py-3">
          <p className="text-sm font-semibold">Etapas com mais falhas</p>
        </div>
        {data.failedNodes.length ? (
          data.failedNodes.map((item) => (
            <div
              key={item.nodeId}
              className="flex items-center justify-between border-b border-[hsl(var(--automation-border))] px-4 py-3 text-sm last:border-0"
            >
              <span>{item.nodeType}</span>
              <span className="text-[hsl(var(--automation-error))]">{item.count} falha(s)</span>
            </div>
          ))
        ) : (
          <p className="p-4 text-sm text-[hsl(var(--automation-text-2))]">
            Nenhuma falha registrada.
          </p>
        )}
      </div>
    </div>
  );
}

function ExecutionList({
  rows,
  loading,
  onOpen,
}: {
  rows: AutomationExecution[];
  loading: boolean;
  onOpen: (id: string) => void;
}) {
  if (loading) return <Skeleton className="m-6 h-40" />;
  if (!rows.length)
    return (
      <p className="p-6 text-sm text-[hsl(var(--automation-text-2))]">
        Nenhuma execução ainda. Publique e dispare um evento real, ou use Testar.
      </p>
    );
  return (
    <div className="divide-y divide-[hsl(var(--automation-border))]">
      {rows.map((row) => (
        <button
          key={row.id}
          type="button"
          className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-white/5"
          onClick={() => onOpen(row.id)}
        >
          <div>
            <p className="text-sm">{EXECUTION_LABEL[row.status] ?? row.status}</p>
            <p className="text-[11px] text-[hsl(var(--automation-text-2))]">
              {row.subjectType} {row.subjectId}
            </p>
          </div>
          <span className="text-[11px] text-[hsl(var(--automation-text-2))]">
            {new Date(row.startedAt).toLocaleString()}
          </span>
        </button>
      ))}
    </div>
  );
}

function VersionList({
  rows,
  snapshots,
  onRestore,
  onRestoreSnapshot,
}: {
  rows: Array<{ id: string; version: number; createdAt: string }>;
  snapshots: Array<{ id: string; revision: number; createdAt: string }>;
  onRestore: (id: string) => void;
  onRestoreSnapshot: (id: string) => void;
}) {
  if (!rows.length && !snapshots.length)
    return (
      <p className="p-6 text-sm text-[hsl(var(--automation-text-2))]">
        Ainda não há versões publicadas.
      </p>
    );
  return (
    <div>
      {snapshots.length ? (
        <>
          <div className="border-b border-[hsl(var(--automation-border))] px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--automation-text-2))]">
              Rascunhos automáticos
            </p>
            <p className="mt-1 text-[11px] text-[hsl(var(--automation-text-2))]">
              Até 30 pontos de recuperação salvos automaticamente.
            </p>
          </div>
          <div className="divide-y divide-[hsl(var(--automation-border))]">
            {snapshots.map((row) => (
              <div key={row.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm">Revisão {row.revision}</p>
                  <p className="text-[11px] text-[hsl(var(--automation-text-2))]">
                    {new Date(row.createdAt).toLocaleString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[hsl(var(--automation-border))] bg-transparent"
                  onClick={() => onRestoreSnapshot(row.id)}
                >
                  Recuperar rascunho
                </Button>
              </div>
            ))}
          </div>
        </>
      ) : null}
      {rows.length ? (
        <div className="border-y border-[hsl(var(--automation-border))] px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--automation-text-2))]">
            Versões publicadas
          </p>
        </div>
      ) : null}
      <div className="divide-y divide-[hsl(var(--automation-border))]">
        {rows.map((row, index) => (
          <div key={row.id} className="flex items-center justify-between px-5 py-3">
            <div>
              <p className="text-sm">
                v{row.version}
                {index === 0 ? " · atual" : ""}
              </p>
              <p className="text-[11px] text-[hsl(var(--automation-text-2))]">
                {new Date(row.createdAt).toLocaleString()}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-[hsl(var(--automation-border))] bg-transparent"
              onClick={() => onRestore(row.id)}
            >
              Restaurar como rascunho
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExecutionInspector({
  execution,
  selectedId,
}: {
  execution: AutomationExecution;
  selectedId: string | null;
}) {
  const node = execution.nodeExecutions?.find((item) => item.nodeId === selectedId);
  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">{EXECUTION_LABEL[execution.status] ?? execution.status}</p>
      {execution.error ? (
        <p className="text-xs text-[hsl(var(--automation-error))]">{execution.error}</p>
      ) : null}
      <div className="space-y-2">
        {(execution.logs ?? []).map((log) => (
          <p key={log.id} className="text-[11px] leading-5 text-[hsl(var(--automation-text-2))]">
            {new Date(log.createdAt).toLocaleTimeString()} — {log.message}
          </p>
        ))}
      </div>
      {node ? (
        <div className="space-y-2 rounded-lg bg-black/20 p-3">
          <p className="text-xs font-medium">
            {node.nodeType} · {node.status}
          </p>
          <pre className="overflow-auto text-[10px] text-[hsl(var(--automation-text-2))]">
            {JSON.stringify(node.output ?? {}, null, 2)}
          </pre>
          {node.errorMessage ? (
            <p className="text-[11px] text-[hsl(var(--automation-error))]">{node.errorMessage}</p>
          ) : null}
        </div>
      ) : null}
      {execution.status === "FAILED" ? (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => void automationsApi.retryExecution(execution.id, false)}>
            Tentar de novo
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-[hsl(var(--automation-border))] bg-transparent"
            onClick={() => void automationsApi.retryExecution(execution.id, true)}
          >
            Desde o início
          </Button>
        </div>
      ) : null}
    </div>
  );
}

const NODE_HELP_TEXT: Record<string, string> = {
  "logic.loop@1":
    "Executa as próximas etapas uma vez para cada item de uma lista. O limite evita processamentos excessivos.",
  "logic.randomSplit@1":
    "Distribui cada execução aleatoriamente entre os caminhos A e B conforme o percentual configurado.",
  "logic.stopError@1":
    "Interrompe este caminho imediatamente e registra a execução da automação como uma falha.",
  "action.http.request@1":
    "Envia uma requisição para uma API ou sistema externo usando o método e a URL configurados.",
};

function NodeSelector({
  catalog,
  category,
  onCategoryChange,
  onClose,
  onPick,
}: {
  catalog: AutomationNodeCatalogItem[];
  category: string;
  onCategoryChange: (category: string) => void;
  onClose: () => void;
  onPick: (type: string, label: string) => void;
}) {
  const [search, setSearch] = React.useState("");
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  const categories = [
    { id: "all", label: "Todas as etapas", icon: LayoutGrid },
    { id: "triggers", label: "Gatilhos", icon: Zap },
    { id: "logic", label: "Lógica", icon: GitFork },
    { id: "time", label: "Tempo", icon: Clock3 },
    { id: "data", label: "Dados", icon: Database },
    { id: "crm", label: "CRM", icon: Contact },
    { id: "communication", label: "Comunicação", icon: MessageCircle },
    { id: "advanced", label: "Avançado", icon: Braces },
    { id: "visual", label: "Organização", icon: LayoutGrid },
  ];
  const normalizedSearch = search.trim().toLowerCase();
  const filtered = catalog.filter(
    (item) =>
      (category === "all" || item.category === category) &&
      (!normalizedSearch ||
        `${item.label} ${item.description} ${item.type} ${item.category}`
          .toLowerCase()
          .includes(normalizedSearch)),
  );
  return (
    <aside
      className="absolute inset-y-0 right-0 z-30 flex w-full max-w-[680px] flex-col overflow-hidden border-l border-[hsl(var(--automation-border))] bg-[hsl(var(--automation-surface)/0.98)] shadow-[-20px_0_60px_hsl(var(--automation-canvas)/0.5)] backdrop-blur-none"
      aria-label="Catálogo de etapas"
    >
        <div className="flex items-center justify-between border-b border-[hsl(var(--automation-border))] px-5 py-4">
          <div>
            <p className="text-base font-semibold">O que acontece a seguir?</p>
            <p className="mt-0.5 text-xs text-[hsl(var(--automation-text-2))]">
              Escolha um gatilho, condição ou ação para continuar a automação.
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="rounded-full"
            onClick={onClose}
            aria-label="Fechar catálogo"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="border-b border-[hsl(var(--automation-border))] p-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--automation-accent))]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar uma etapa, ação ou integração..."
              className="h-11 border-[hsl(var(--automation-border))] bg-[hsl(var(--automation-canvas)/0.45)] pl-10"
              autoFocus
            />
          </div>
        </div>
        <div className="flex min-h-0 flex-1">
          <nav className="w-48 shrink-0 space-y-1 overflow-y-auto border-r border-[hsl(var(--automation-border))] p-3" aria-label="Categorias de etapas">
            {categories.map((item) => {
              const Icon = item.icon;
              const selected = category === item.id;
              const count =
                item.id === "all"
                  ? catalog.length
                  : catalog.filter((node) => node.category === item.id).length;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onCategoryChange(item.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-medium transition-colors",
                    selected
                      ? "bg-[hsl(var(--automation-accent)/0.13)] text-[hsl(var(--automation-text))]"
                      : "text-[hsl(var(--automation-text-2))] hover:bg-[hsl(var(--automation-surface-2))] hover:text-[hsl(var(--automation-text))]",
                  )}
                >
                  <Icon
                    className={cn("h-4 w-4", selected && "text-[hsl(var(--automation-accent))]")}
                  />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  <span className="text-[10px] opacity-60">{count}</span>
                </button>
              );
            })}
          </nav>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--automation-text-2))]">
                {category === "all" ? "Todas as etapas" : AUTOMATION_CATEGORY_META[category]?.label}
              </p>
              <span className="text-[11px] text-[hsl(var(--automation-text-2))]">
                {filtered.length} disponíveis
              </span>
            </div>
            {filtered.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {filtered.map((item) => {
                  const meta =
                    AUTOMATION_CATEGORY_META[item.category] ?? AUTOMATION_CATEGORY_META.triggers!;
                  const helpText = NODE_HELP_TEXT[item.id] ?? item.description;
                  return (
                    <div
                      key={item.id}
                      className="group relative min-h-[86px] rounded-xl border border-[hsl(var(--automation-border))] bg-[hsl(var(--automation-canvas)/0.28)] transition hover:-translate-y-px hover:border-[hsl(var(--automation-accent)/0.55)] hover:bg-[hsl(var(--automation-accent)/0.06)]"
                    >
                      <button
                        type="button"
                        onClick={() => onPick(item.id, item.label)}
                        className="flex min-h-[84px] w-full items-start gap-3 p-3 pr-10 text-left"
                      >
                        <span
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                            meta.surface,
                          )}
                        >
                          <AutomationNodeIcon
                            icon={item.icon}
                            category={item.category}
                            className="h-5 w-5"
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-[hsl(var(--automation-text))]">
                            {item.label}
                          </span>
                          <span className="mt-1 block text-[11px] leading-4 text-[hsl(var(--automation-text-2))]">
                            {item.description}
                          </span>
                        </span>
                      </button>
                      <span
                        tabIndex={0}
                        role="note"
                        aria-label={`Ajuda sobre ${item.label}: ${helpText}`}
                        className="group/help absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-full text-[hsl(var(--automation-text-2))] outline-none transition-colors hover:bg-[hsl(var(--automation-accent)/0.14)] hover:text-[hsl(var(--automation-accent))] focus-visible:bg-[hsl(var(--automation-accent)/0.14)] focus-visible:text-[hsl(var(--automation-accent))]"
                      >
                        <HelpCircle className="h-4 w-4" />
                        <span className="pointer-events-none absolute right-0 top-8 z-50 hidden w-52 rounded-xl border border-[hsl(var(--automation-border))] bg-[hsl(var(--automation-elevated))] p-3 text-left text-[11px] font-normal leading-5 text-[hsl(var(--automation-text))] shadow-[0_16px_38px_hsl(var(--automation-canvas)/0.72)] group-hover/help:block group-focus-visible/help:block">
                          {helpText}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-[hsl(var(--automation-border))] text-sm text-[hsl(var(--automation-text-2))]">
                Nenhuma etapa encontrada.
              </div>
            )}
          </div>
        </div>
    </aside>
  );
}
