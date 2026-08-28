"use client";

import * as React from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  Handle,
  Position,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
  type EdgeTypes,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { AutomationNodeCatalogItem, WorkflowDefinition, WorkflowGraphNode } from "@/lib/types";

export type AutomationFlowNode = Node<{
  label: string;
  summary?: string;
  kind: string;
  handles: { inputs: string[]; outputs: string[] };
  status?: string;
  invalid?: boolean;
  text?: string;
  color?: string;
}>;

const HANDLE_CLASS = "!h-2 !w-2 !border-0";

function outputPosition(id: string, index: number, total: number) {
  if (id === "received") return { position: Position.Right, style: { top: "35%" } };
  if (id === "timeout") return { position: Position.Right, style: { top: "70%" } };
  if (total <= 1) return { position: Position.Bottom, style: undefined };
  const left = `${((index + 1) / (total + 1)) * 100}%`;
  return { position: Position.Bottom, style: { left } };
}

export function AutomationNodeCard({ data, selected }: NodeProps<AutomationFlowNode>) {
  const outputs = data.handles.outputs.length ? data.handles.outputs : ["out"];
  const inputs = data.handles.inputs;
  return (
    <div
      className={cn(
        "min-w-[196px] max-w-[240px] rounded-xl border bg-[hsl(var(--automation-surface))] px-3 py-2.5 shadow-sm",
        selected
          ? "border-[hsl(var(--automation-border-selected))] ring-2 ring-[hsl(var(--automation-accent)/0.25)]"
          : "border-[hsl(var(--automation-border))]",
        data.invalid && "border-[hsl(var(--automation-error))]",
        data.status === "SUCCEEDED" && "border-[hsl(var(--automation-success)/0.7)]",
        data.status === "FAILED" && "border-[hsl(var(--automation-error))]",
        data.status === "RUNNING" && "border-[hsl(var(--automation-accent))]",
        data.status === "WAITING" && "border-[hsl(var(--automation-warning)/0.8)]",
        data.status && !["SUCCEEDED", "FAILED", "RUNNING", "WAITING"].includes(data.status) && "opacity-45",
      )}
    >
      {inputs.length ? <Handle type="target" position={Position.Top} className={cn(HANDLE_CLASS, "!bg-[hsl(var(--automation-accent))]")} /> : null}
      {outputs.map((id, index) => {
        const placed = outputPosition(id, index, outputs.length);
        return (
          <Handle
            key={id}
            id={id}
            type="source"
            position={placed.position}
            style={placed.style}
            className={cn(
              HANDLE_CLASS,
              id === "true" || id === "received" || id === "a" ? "!bg-[hsl(var(--automation-success))]" : "",
              id === "false" || id === "timeout" || id === "b" ? "!bg-[hsl(var(--automation-error))]" : "",
              id === "out" || id === "default" ? "!bg-[hsl(var(--automation-accent))]" : "",
            )}
          />
        );
      })}
      <p className="truncate text-[13px] font-medium text-[hsl(var(--automation-text))]">{data.label}</p>
      {data.summary ? <p className="mt-0.5 truncate text-[11px] text-[hsl(var(--automation-text-2))]">{data.summary}</p> : null}
      {data.status === "SUCCEEDED" ? <p className="mt-1 text-[10px] text-[hsl(var(--automation-success))]">Concluído</p> : null}
      {data.status === "FAILED" ? <p className="mt-1 text-[10px] text-[hsl(var(--automation-error))]">Falhou</p> : null}
      {data.status === "WAITING" ? <p className="mt-1 text-[10px] text-[hsl(var(--automation-warning))]">Aguardando</p> : null}
      {data.status === "RUNNING" ? <p className="mt-1 text-[10px] text-[hsl(var(--automation-accent))]">Executando</p> : null}
    </div>
  );
}

export function FrameNode({ data, selected }: NodeProps<AutomationFlowNode>) {
  return (
    <div
      className={cn(
        "h-full min-h-[140px] min-w-[220px] rounded-2xl border border-dashed bg-[hsl(var(--automation-accent)/0.06)] px-3 py-2",
        selected ? "border-[hsl(var(--automation-border-selected))]" : "border-[hsl(var(--automation-border))]",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--automation-text-2))]">{data.label}</p>
    </div>
  );
}

export function NoteNode({ data, selected }: NodeProps<AutomationFlowNode>) {
  return (
    <div
      className={cn(
        "min-h-[88px] min-w-[160px] max-w-[220px] rounded-lg border bg-[hsl(38_40%_18%)] px-3 py-2 text-[12px] leading-5 text-[hsl(var(--automation-text))]",
        selected ? "border-[hsl(var(--automation-border-selected))]" : "border-[hsl(var(--automation-border))]",
      )}
    >
      {data.text || data.label || "Nota"}
    </div>
  );
}

export function InsertableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
}: EdgeProps) {
  const [path, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const meta = (data ?? {}) as { onInsert?: (edgeId: string) => void; readOnly?: boolean };
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />
      {meta.onInsert && !meta.readOnly ? (
        <EdgeLabelRenderer>
          <button
            type="button"
            className="nodrag nopan absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[hsl(var(--automation-border))] bg-[hsl(var(--automation-elevated))] text-[11px] text-[hsl(var(--automation-text-2))] hover:border-[hsl(var(--automation-border-selected))] hover:text-[hsl(var(--automation-text))]"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, pointerEvents: "all" }}
            onClick={(event) => {
              event.stopPropagation();
              meta.onInsert?.(id);
            }}
            aria-label="Inserir etapa"
          >
            +
          </button>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export const nodeTypes = { automation: AutomationNodeCard, frame: FrameNode, note: NoteNode };
export const edgeTypes = { insertable: InsertableEdge } as EdgeTypes;

function kindOf(type: string) {
  return type.replace(/@\d+$/, "");
}

function handlesFor(type: string, catalog?: AutomationNodeCatalogItem[]) {
  const kind = kindOf(type);
  const entry = catalog?.find((item) => item.id === type || item.type === kind);
  if (entry?.handles) return entry.handles;
  if (kind === "logic.if") return { inputs: ["in"], outputs: ["true", "false"] };
  if (kind === "logic.waitForEvent") return { inputs: ["in"], outputs: ["received", "timeout"] };
  if (kind === "logic.switch") return { inputs: ["in"], outputs: ["default"] };
  if (kind.startsWith("trigger.")) return { inputs: [], outputs: ["out"] };
  if (kind.startsWith("visual.")) return { inputs: [], outputs: [] };
  return { inputs: ["in"], outputs: ["out"] };
}

function flowType(type: string) {
  const kind = kindOf(type);
  if (kind === "visual.frame") return "frame";
  if (kind === "visual.note") return "note";
  return "automation";
}

export function toFlow(
  definition: WorkflowDefinition,
  catalog?: AutomationNodeCatalogItem[],
  statuses?: Record<string, string>,
  onInsert?: (edgeId: string) => void,
  readOnly = false,
): { nodes: AutomationFlowNode[]; edges: Edge[] } {
  const frameNodes: WorkflowGraphNode[] = (definition.frames ?? [])
    .filter((frame) => !definition.nodes.some((node) => node.id === frame.id))
    .map((frame) => ({
      id: frame.id,
      type: "visual.frame@1",
      label: frame.label,
      position: { x: frame.x, y: frame.y },
      config: { width: frame.width, height: frame.height, color: frame.color },
    }));
  const noteNodes: WorkflowGraphNode[] = (definition.annotations ?? [])
    .filter((note) => !definition.nodes.some((node) => node.id === note.id))
    .map((note) => ({
      id: note.id,
      type: "visual.note@1",
      label: note.text,
      position: { x: note.x, y: note.y },
      config: { text: note.text },
    }));
  const allNodes = [...frameNodes, ...noteNodes, ...definition.nodes];
  return {
    nodes: allNodes.map((node) => ({
      id: node.id,
      type: flowType(node.type),
      position: node.position,
      style: kindOf(node.type) === "visual.frame"
        ? { width: Number(node.config?.width ?? 280), height: Number(node.config?.height ?? 180), zIndex: -1 }
        : undefined,
      data: {
        label: node.label || kindOf(node.type).split(".").slice(-1)[0] || node.type,
        summary: summarize(node.type, node.config),
        kind: node.type,
        handles: handlesFor(node.type, catalog),
        status: statuses?.[node.id],
        invalid: false,
        text: String(node.config?.text ?? node.label ?? ""),
        color: typeof node.config?.color === "string" ? node.config.color : undefined,
      },
    })) as AutomationFlowNode[],
    edges: definition.edges.map((edge) => ({
      ...edge,
      type: "insertable",
      data: { onInsert, readOnly },
      label: edge.label,
      style: {
        stroke: statuses && statuses[edge.source] && statuses[edge.target]
          ? "hsl(var(--automation-accent))"
          : "hsl(var(--automation-border))",
        strokeWidth: 1.5,
      },
    })),
  };
}

export function fromFlow(nodes: Node[], edges: Edge[], previous: WorkflowDefinition): WorkflowDefinition {
  const mappedNodes = nodes.map((node) => {
    const original = previous.nodes.find((item) => item.id === node.id);
    const data = node.data as AutomationFlowNode["data"];
    const type = original?.type
      ?? (node.type === "frame" ? "visual.frame@1" : node.type === "note" ? "visual.note@1" : data.kind ?? "logic.filter@1");
    return {
      id: node.id,
      type,
      label: original?.label ?? data.label,
      position: node.position,
      config: {
        ...(original?.config ?? {}),
        ...(node.type === "note" ? { text: data.text || data.label } : {}),
        ...(node.type === "frame" ? { width: Number(original?.config?.width ?? 280), height: Number(original?.config?.height ?? 180) } : {}),
      },
    };
  });
  return {
    ...previous,
    nodes: mappedNodes,
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      label: typeof edge.label === "string" ? edge.label : undefined,
    })),
    frames: mappedNodes
      .filter((node) => node.type.startsWith("visual.frame"))
      .map((node) => ({
        id: node.id,
        label: node.label ?? "Grupo",
        x: node.position.x,
        y: node.position.y,
        width: Number(node.config?.width ?? 280),
        height: Number(node.config?.height ?? 180),
      })),
    annotations: mappedNodes
      .filter((node) => node.type.startsWith("visual.note"))
      .map((node) => ({
        id: node.id,
        text: String(node.config?.text ?? node.label ?? ""),
        x: node.position.x,
        y: node.position.y,
      })),
  };
}

function summarize(type: string, config?: Record<string, unknown>) {
  if (!config) return undefined;
  if (type.includes("delay")) {
    const minutes = Number(config.durationMinutes ?? 0);
    if (minutes) return `${minutes} min`;
  }
  if (config.stageId) return "Etapa selecionada";
  if (typeof config.title === "string") return config.title;
  if (typeof config.body === "string") return config.body.slice(0, 42);
  return undefined;
}
