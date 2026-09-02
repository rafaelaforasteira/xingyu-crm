"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Handle,
  NodeResizer,
  Position,
  type Edge,
  type EdgeTypes,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { cn } from "@/lib/utils";
import {
  Bold,
  Check,
  ChevronDown,
  GripHorizontal,
  Italic,
  LayoutGrid,
  MoveRight,
  Underline,
} from "lucide-react";
import { pipelineStagesApi } from "@/lib/api";
import type {
  AutomationNodeCatalogItem,
  Pipeline,
  PipelineStage,
  WorkflowDefinition,
  WorkflowGraphNode,
} from "@/lib/types";
import { AutomationNodeIcon, AUTOMATION_CATEGORY_META } from "./automation-node-icon";
import { edgeExecutionStatus, OrganicFlowEdge } from "./organic-flow-edge";
import { NodeInspector } from "./studio-inspector";

export type AutomationFlowNode = Node<{
  label: string;
  summary?: string;
  kind: string;
  handles: { inputs: string[]; outputs: string[] };
  status?: string;
  invalid?: boolean;
  text?: string;
  color?: string;
  icon?: string;
  category?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  readOnly?: boolean;
  onNoteUpdate?: (patch: Record<string, unknown>) => void;
  onNodeUpdate?: (patch: Record<string, unknown>) => void;
  onOrganize?: () => void;
  pipelines?: Pipeline[];
  pipelineId?: string;
  stageId?: string;
  config?: Record<string, unknown>;
  users?: Array<{ id: string; name: string }>;
  tags?: Array<{ id: string; name: string }>;
}>;

const HANDLE_CLASS = "automation-receptor !h-6 !w-6 !border-0 !bg-transparent";

const INLINE_CONFIG_KINDS = new Set([
  "trigger.deal.stageChanged",
  "trigger.deal.fieldChanged",
  "trigger.contact.fieldChanged",
  "trigger.task.due",
  "trigger.task.overdue",
  "trigger.schedule",
  "trigger.deal.tagAdded",
  "trigger.deal.tagRemoved",
  "logic.filter",
  "logic.if",
  "logic.switch",
  "logic.delay",
  "logic.waitForEvent",
  "logic.randomSplit",
  "logic.loop",
  "data.findDuplicates",
  "action.deal.assignOwner",
  "action.deal.assignRoundRobin",
  "action.deal.updateField",
  "action.contact.updateField",
  "action.deal.addTag",
  "action.deal.removeTag",
  "action.task.create",
  "action.note.create",
  "action.order.updateStatus",
  "action.whatsapp.send",
  "action.notify.user",
  "action.http.request",
]);

function outputPosition(id: string, index: number, total: number) {
  if (id === "received") return { position: Position.Right, style: { top: "35%" } };
  if (id === "timeout") return { position: Position.Right, style: { top: "70%" } };
  if (total <= 1) return { position: Position.Right, style: undefined };
  const top = `${((index + 1) / (total + 1)) * 100}%`;
  return { position: Position.Right, style: { top } };
}

export function AutomationNodeCard({ data, selected }: NodeProps<AutomationFlowNode>) {
  const nodeKind = data.kind.replace(/@\d+$/, "");
  if (nodeKind === "action.deal.moveStage" || nodeKind === "trigger.deal.created") {
    return <MoveLeadNodeCard data={data} selected={selected} />;
  }
  if (INLINE_CONFIG_KINDS.has(nodeKind)) {
    return <InlineConfigNodeCard data={data} selected={selected} />;
  }
  const outputs = data.handles.outputs;
  const inputs = data.handles.inputs;
  const category =
    AUTOMATION_CATEGORY_META[data.category ?? ""] ?? AUTOMATION_CATEGORY_META.triggers!;
  return (
    <div
      className={cn(
        "group flex w-[128px] flex-col items-center text-center",
        data.status &&
          !["SUCCEEDED", "FAILED", "RUNNING", "WAITING"].includes(data.status) &&
          "opacity-45",
      )}
    >
      <div
        className={cn(
          "relative flex h-16 w-16 items-center justify-center overflow-visible rounded-2xl border bg-[hsl(var(--automation-surface)/0.96)] shadow-[0_8px_26px_hsl(var(--automation-canvas)/0.38)] backdrop-blur transition-[border-color,box-shadow,transform] group-hover:-translate-y-0.5",
          selected
            ? "border-[hsl(var(--automation-border-selected))] shadow-[0_0_0_3px_hsl(var(--automation-accent)/0.16),0_0_24px_hsl(var(--automation-accent)/0.22)]"
            : "border-[hsl(var(--automation-border))]",
          data.invalid && "border-[hsl(var(--automation-error))]",
          data.status === "SUCCEEDED" && "border-[hsl(var(--automation-success)/0.8)]",
          data.status === "FAILED" && "border-[hsl(var(--automation-error))]",
          data.status === "RUNNING" &&
            "border-[hsl(var(--automation-accent))] shadow-[0_0_26px_hsl(var(--automation-accent)/0.3)]",
          data.status === "WAITING" && "border-[hsl(var(--automation-warning)/0.8)]",
        )}
      >
        <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--automation-accent)/0.85)] to-transparent" />
        {inputs.length ? (
          <Handle
            type="target"
            position={Position.Left}
            className={cn(HANDLE_CLASS, "automation-receptor-accent")}
          />
        ) : null}
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
                id === "true" || id === "received" || id === "a"
                  ? "automation-receptor-success"
                  : "",
                id === "false" || id === "timeout" || id === "b" ? "automation-receptor-error" : "",
                id === "out" || id === "default" ? "automation-receptor-accent" : "",
              )}
            />
          );
        })}
        <span
          className={cn("flex h-10 w-10 items-center justify-center rounded-xl", category.surface)}
        >
          <AutomationNodeIcon icon={data.icon} category={data.category} className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-2 line-clamp-2 max-w-full text-[11px] font-semibold leading-4 text-[hsl(var(--automation-text))]">
        {data.label}
      </p>
      {data.summary ? (
        <p className="mt-0.5 line-clamp-1 max-w-full text-[9px] text-[hsl(var(--automation-text-2))]">
          {data.summary}
        </p>
      ) : null}
    </div>
  );
}

function InlineConfigNodeCard({
  data,
  selected,
}: {
  data: AutomationFlowNode["data"];
  selected: boolean;
}) {
  const inputs = data.handles.inputs;
  const outputs = data.handles.outputs;
  const category = AUTOMATION_CATEGORY_META[data.category ?? ""] ?? AUTOMATION_CATEGORY_META.logic!;
  const isMessageCard = data.kind.replace(/@\d+$/, "") === "action.whatsapp.send";
  const node = {
    id: "embedded",
    type: data.kind,
    label: data.label,
    position: { x: 0, y: 0 },
    config: data.config ?? {},
  };
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-[hsl(var(--automation-accent)/0.32)] bg-gradient-to-br from-[hsl(var(--automation-accent)/0.1)] to-[hsl(var(--automation-surface-2)/0.98)] p-3 shadow-[0_18px_45px_hsl(var(--automation-canvas)/0.42)]",
        isMessageCard ? "w-[380px]" : "w-[300px]",
        selected &&
          "ring-2 ring-[hsl(var(--automation-accent)/0.5)] ring-offset-2 ring-offset-[hsl(var(--automation-canvas))]",
      )}
    >
      {inputs.length ? (
        <Handle
          type="target"
          position={Position.Left}
          className={cn(HANDLE_CLASS, "automation-receptor-accent")}
        />
      ) : null}
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
              id === "true" || id === "received"
                ? "automation-receptor-success"
                : id === "false" || id === "timeout"
                  ? "automation-receptor-error"
                  : "automation-receptor-accent",
            )}
          />
        );
      })}
      <div className="drag-handle mb-3 flex cursor-grab items-center gap-2 active:cursor-grabbing">
        <span className={cn("grid h-7 w-7 place-items-center rounded-lg", category.surface)}>
          <AutomationNodeIcon icon={data.icon} category={data.category} className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold text-[hsl(var(--automation-text))]">
            {data.label}
          </p>
          <p className="line-clamp-1 text-[9px] text-[hsl(var(--automation-text-2))]">
            {data.summary || "Configure esta etapa"}
          </p>
        </div>
      </div>
      <div className="nodrag nopan max-h-[360px] overflow-y-auto pr-1">
        <NodeInspector
          embedded
          node={node}
          catalog={[]}
          pipelines={data.pipelines ?? []}
          users={data.users ?? []}
          tags={data.tags ?? []}
          onChange={(next) => data.onNodeUpdate?.(next.config ?? {})}
        />
      </div>
    </div>
  );
}

function MoveLeadNodeCard({
  data,
  selected,
}: {
  data: AutomationFlowNode["data"];
  selected: boolean;
}) {
  const pipelineId = data.pipelineId ?? "";
  const isCreatedTrigger = data.kind.replace(/@\d+$/, "") === "trigger.deal.created";
  const stages = useQuery({
    queryKey: ["pipelines", pipelineId, "automation-node-stages"],
    queryFn: () => pipelineStagesApi.list(pipelineId),
    enabled: Boolean(pipelineId),
  });
  return (
    <div
      className={cn(
        "relative w-[286px] rounded-2xl border border-[hsl(var(--automation-accent)/0.4)] bg-gradient-to-br from-[hsl(var(--automation-accent)/0.14)] to-[hsl(var(--automation-surface-2)/0.98)] p-3 shadow-[0_18px_45px_hsl(var(--automation-canvas)/0.45)]",
        selected &&
          "ring-2 ring-[hsl(var(--automation-accent)/0.55)] ring-offset-2 ring-offset-[hsl(var(--automation-canvas))]",
      )}
    >
      {!isCreatedTrigger ? (
        <Handle
          type="target"
          position={Position.Left}
          className={cn(HANDLE_CLASS, "automation-receptor-accent")}
        />
      ) : null}
      <Handle
        id="out"
        type="source"
        position={Position.Right}
        className={cn(HANDLE_CLASS, "automation-receptor-accent")}
      />
      <div className="drag-handle mb-3 flex cursor-grab items-center gap-2 active:cursor-grabbing">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-[hsl(var(--automation-accent)/0.16)] text-[hsl(var(--automation-accent))]">
          {isCreatedTrigger ? (
            <AutomationNodeIcon icon={data.icon} category={data.category} className="h-4 w-4" />
          ) : (
            <MoveRight className="h-4 w-4" />
          )}
        </span>
        <div>
          <p className="text-[12px] font-semibold text-[hsl(var(--automation-text))]">
            {isCreatedTrigger ? "Quando um lead for criado" : "Mover lead"}
          </p>
          <p className="text-[9px] text-[hsl(var(--automation-text-2))]">
            {isCreatedTrigger ? "Defina onde o lead deve entrar" : "Escolha o destino no CRM"}
          </p>
        </div>
      </div>
      <div className="nodrag nopan space-y-2.5">
        <CardSelect
          label={isCreatedTrigger ? "Pipeline de entrada" : "Pipeline de destino"}
          value={pipelineId}
          placeholder={
            isCreatedTrigger ? "Selecione o pipeline de entrada" : "Selecione o pipeline"
          }
          options={(data.pipelines ?? []).map((pipeline) => ({
            value: pipeline.id,
            label: pipeline.name,
          }))}
          onChange={(value) => data.onNodeUpdate?.({ pipelineId: value, stageId: "" })}
        />
        <CardSelect
          label={isCreatedTrigger ? "Etapa inicial" : "Etapa de destino"}
          value={data.stageId ?? ""}
          placeholder={isCreatedTrigger ? "Selecione a etapa inicial" : "Selecione a etapa"}
          options={(stages.data ?? []).map((stage: PipelineStage) => ({
            value: stage.id,
            label: stage.name,
          }))}
          disabled={!pipelineId}
          onChange={(value) => data.onNodeUpdate?.({ stageId: value })}
        />
      </div>
    </div>
  );
}

function CardSelect({
  label,
  value,
  placeholder,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((option) => option.value === value);
  return (
    <div
      className="relative block space-y-1"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <span className="text-[10px] font-medium text-[hsl(var(--automation-text-2))]">{label}</span>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-xl border border-[hsl(var(--automation-border))] bg-[hsl(var(--automation-surface))] px-3 text-left text-[11px] outline-none transition-[border-color,background-color,box-shadow] hover:border-[hsl(var(--automation-accent)/0.55)] focus-visible:border-[hsl(var(--automation-accent))] focus-visible:shadow-[0_0_0_3px_hsl(var(--automation-accent)/0.13)] disabled:cursor-not-allowed disabled:bg-[hsl(var(--automation-surface-2))]",
          selected ? "text-[hsl(var(--automation-text))]" : "text-[hsl(var(--automation-text-2))]",
        )}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown
          className={cn(
            "ml-2 h-3.5 w-3.5 shrink-0 text-[hsl(var(--automation-accent))] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div
          role="listbox"
          aria-label={label}
          className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-[hsl(var(--automation-border-selected)/0.55)] bg-[hsl(var(--automation-surface)/0.98)] p-1.5 shadow-[0_18px_42px_hsl(var(--automation-canvas)/0.75)] backdrop-blur-xl"
        >
          {options.length ? (
            options.map((option) => {
              const active = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[10px] font-medium transition-colors",
                    active
                      ? "bg-[hsl(var(--automation-accent)/0.16)] text-[hsl(var(--automation-accent))]"
                      : "text-[hsl(var(--automation-text))] hover:bg-[hsl(var(--automation-accent)/0.09)]",
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {active ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                </button>
              );
            })
          ) : (
            <p className="px-2.5 py-2 text-[10px] text-[hsl(var(--automation-text-2))]">
              Nenhuma opção disponível
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function FrameNode({ data, selected }: NodeProps<AutomationFlowNode>) {
  const color = data.color || "#7c3aed";
  return (
    <div
      className={cn(
        "h-full min-h-[140px] min-w-[220px] rounded-2xl border border-dashed px-3 py-2",
      )}
      style={{
        "--frame-color": color,
        borderColor: color,
        backgroundColor: `${color}14`,
      } as React.CSSProperties}
    >
      <NodeResizer
        isVisible={selected && !data.readOnly}
        minWidth={220}
        minHeight={140}
        onResizeEnd={(_event, params) =>
          data.onNodeUpdate?.({ width: params.width, height: params.height })
        }
        lineStyle={{ borderColor: "transparent" }}
        handleStyle={{
          opacity: 0,
          pointerEvents: "none",
        }}
      />
      {selected && !data.readOnly ? (
        <div className="nodrag nopan absolute -top-10 left-0 flex items-center gap-1.5 rounded-xl border border-[hsl(var(--automation-border))] bg-[hsl(var(--automation-surface))] p-1.5 shadow-xl">
          {["#7c3aed", "#2563eb", "#0891b2", "#059669", "#d97706", "#e11d48"].map(
            (item) => (
              <button
                key={item}
                type="button"
                aria-label={`Usar cor ${item}`}
                onClick={() => data.onNodeUpdate?.({ color: item })}
                className={cn(
                  "h-4 w-4 rounded-full border border-white/30 transition-transform hover:scale-110",
                  color === item && "ring-2 ring-white ring-offset-1 ring-offset-[hsl(var(--automation-surface))]",
                )}
                style={{ backgroundColor: item }}
              />
            ),
          )}
          <span className="mx-0.5 h-4 w-px bg-[hsl(var(--automation-border))]" />
          <button
            type="button"
            aria-label="Organizar elementos do quadro"
            title="Organizar elementos"
            onClick={() => data.onOrganize?.()}
            className="grid h-6 w-6 place-items-center rounded-md text-[hsl(var(--automation-text-2))] transition-colors hover:bg-[hsl(var(--automation-accent)/0.14)] hover:text-[hsl(var(--automation-accent))]"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
      {selected && !data.readOnly ? (
        <input
          key={data.label}
          className="nodrag nopan w-full bg-transparent text-[11px] font-semibold uppercase tracking-[0.14em] outline-none"
          style={{ color }}
          defaultValue={data.label}
          aria-label="Nome do quadro"
          onBlur={(event) => data.onNodeUpdate?.({ label: event.target.value.trim() || "Quadro" })}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
      ) : (
        <p className="pointer-events-none text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color }}>
          {data.label}
        </p>
      )}
    </div>
  );
}

const NOTE_COLORS = {
  yellow: "border-amber-300 bg-amber-200 text-amber-950",
  rose: "border-rose-300 bg-rose-200 text-rose-950",
  blue: "border-sky-300 bg-sky-200 text-sky-950",
  green: "border-emerald-300 bg-emerald-200 text-emerald-950",
  violet: "border-violet-300 bg-violet-200 text-violet-950",
} as const;

export function NoteNode({ data, selected }: NodeProps<AutomationFlowNode>) {
  const color = data.color && data.color in NOTE_COLORS ? data.color : "yellow";
  const formatOptions = [
    { key: "bold", label: "Negrito", icon: Bold, active: data.bold },
    { key: "italic", label: "Itálico", icon: Italic, active: data.italic },
    { key: "underline", label: "Sublinhado", icon: Underline, active: data.underline },
  ] as const;
  return (
    <div
      className={cn(
        "relative min-h-[104px] w-[190px] rounded-lg border px-3 py-2.5 text-[12px] leading-5 shadow-md transition-shadow",
        NOTE_COLORS[color as keyof typeof NOTE_COLORS],
        selected &&
          "ring-2 ring-[hsl(var(--automation-accent)/0.65)] ring-offset-2 ring-offset-[hsl(var(--automation-canvas))]",
      )}
    >
      {selected && !data.readOnly ? (
        <div
          className="nodrag nopan absolute -top-9 left-0 flex items-center gap-1 rounded-lg border border-[hsl(var(--automation-border))] bg-[hsl(var(--automation-surface))] p-1 shadow-lg"
          onMouseDown={(event) => event.preventDefault()}
        >
          {(Object.keys(NOTE_COLORS) as Array<keyof typeof NOTE_COLORS>).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => data.onNoteUpdate?.({ color: item })}
              className={cn(
                "h-4 w-4 rounded-full border",
                NOTE_COLORS[item],
                color === item && "ring-1 ring-[hsl(var(--automation-accent))] ring-offset-1",
              )}
              aria-label={`Cor ${item}`}
            />
          ))}
          <span className="mx-0.5 h-4 w-px bg-[hsl(var(--automation-border))]" />
          {formatOptions.map(({ key, label, icon: Icon, active }) => (
            <button
              key={key}
              type="button"
              onClick={() => data.onNoteUpdate?.({ [key]: !active })}
              className={cn(
                "grid h-5 w-5 place-items-center rounded text-[hsl(var(--automation-text-2))]",
                active &&
                  "bg-[hsl(var(--automation-accent)/0.16)] text-[hsl(var(--automation-accent))]",
              )}
              aria-label={label}
              title={label}
            >
              <Icon className="h-3 w-3" />
            </button>
          ))}
        </div>
      ) : null}
      {!data.readOnly ? (
        <div
          className="drag-handle -mx-1 mb-1 flex h-4 cursor-grab items-center justify-center rounded opacity-45 transition-opacity hover:opacity-100 active:cursor-grabbing"
          aria-label="Arrastar anotação"
          title="Arraste por aqui"
        >
          <GripHorizontal className="h-3.5 w-3.5" />
        </div>
      ) : null}
      <div
        className={cn(
          "nodrag nopan nowheel min-h-[62px] whitespace-pre-wrap outline-none",
          data.bold && "font-bold",
          data.italic && "italic",
          data.underline && "underline",
        )}
        contentEditable={!data.readOnly}
        suppressContentEditableWarning
        role="textbox"
        aria-label="Texto da anotação"
        onBlur={(event) => {
          const text = event.currentTarget.textContent?.trim() || "Nota";
          if (text !== (data.text || data.label || "Nota")) data.onNoteUpdate?.({ text });
        }}
      >
        {data.text || data.label || "Clique para escrever"}
      </div>
    </div>
  );
}

export const nodeTypes = { automation: AutomationNodeCard, frame: FrameNode, note: NoteNode };
export const edgeTypes = { insertable: OrganicFlowEdge } as EdgeTypes;

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
  onNoteUpdate?: (nodeId: string, patch: Record<string, unknown>) => void,
  onOrganize?: (frameId: string) => void,
  pipelines?: Pipeline[],
  users?: Array<{ id: string; name: string }>,
  tags?: Array<{ id: string; name: string }>,
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
    nodes: allNodes.map((node) => {
      const catalogEntry = catalog?.find(
        (item) => item.id === node.type || item.type === kindOf(node.type),
      );
      return {
        id: node.id,
        type: flowType(node.type),
        position: node.position,
        parentId: typeof node.config?.parentId === "string" ? node.config.parentId : undefined,
        expandParent: false,
        style:
          kindOf(node.type) === "visual.frame"
            ? {
                width: Number(node.config?.width ?? 280),
                height: Number(node.config?.height ?? 180),
                zIndex: 0,
              }
            : kindOf(node.type) === "visual.note"
              ? { zIndex: 2 }
              : kindOf(node.type) === "action.deal.moveStage" ||
                  kindOf(node.type) === "trigger.deal.created"
                ? { width: 286, zIndex: 2 }
                : kindOf(node.type) === "action.whatsapp.send"
                  ? { width: 380, zIndex: 2 }
                  : INLINE_CONFIG_KINDS.has(kindOf(node.type))
                    ? { width: 300, zIndex: 2 }
                  : { width: 128, zIndex: 2 },
        data: {
          label:
            kindOf(node.type) === "visual.frame" && (!node.label || node.label === "Grupo")
              ? "Quadro"
              : node.label || kindOf(node.type).split(".").slice(-1)[0] || node.type,
          summary: summarize(node.type, node.config),
          kind: node.type,
          handles: handlesFor(node.type, catalog),
          status: statuses?.[node.id],
          invalid: false,
          text: String(node.config?.text ?? node.label ?? ""),
          color: typeof node.config?.color === "string" ? node.config.color : undefined,
          bold: Boolean(node.config?.bold),
          italic: Boolean(node.config?.italic),
          underline: Boolean(node.config?.underline),
          readOnly,
          onNoteUpdate: (patch: Record<string, unknown>) => onNoteUpdate?.(node.id, patch),
          onNodeUpdate: (patch: Record<string, unknown>) => onNoteUpdate?.(node.id, patch),
          onOrganize: () => onOrganize?.(node.id),
          pipelines,
          pipelineId: typeof node.config?.pipelineId === "string" ? node.config.pipelineId : "",
          stageId: typeof node.config?.stageId === "string" ? node.config.stageId : "",
          config: (node.config ?? {}) as Record<string, unknown>,
          users,
          tags,
          icon: catalogEntry?.icon,
          category: catalogEntry?.category,
        },
      };
    }).sort((a, b) => (a.type === "frame" ? -1 : b.type === "frame" ? 1 : 0)) as AutomationFlowNode[],
    edges: definition.edges.map((edge) => ({
      ...edge,
      type: "insertable",
      data: {
        onInsert,
        readOnly,
        tone:
          edge.sourceHandle === "true" ||
          edge.sourceHandle === "received" ||
          edge.sourceHandle === "a"
            ? "success"
            : edge.sourceHandle === "false" ||
                edge.sourceHandle === "timeout" ||
                edge.sourceHandle === "b"
              ? "error"
              : "accent",
        status: edgeExecutionStatus(statuses?.[edge.source], statuses?.[edge.target]),
      },
      label: edge.label,
      style: {
        stroke:
          statuses && statuses[edge.source] && statuses[edge.target]
            ? "hsl(var(--automation-accent))"
            : "hsl(var(--automation-border))",
        strokeWidth: 1.5,
      },
    })),
  };
}

export function fromFlow(
  nodes: Node[],
  edges: Edge[],
  previous: WorkflowDefinition,
): WorkflowDefinition {
  const mappedNodes = nodes.map((node) => {
    const original = previous.nodes.find((item) => item.id === node.id);
    const data = node.data as AutomationFlowNode["data"];
    const type =
      original?.type ??
      (node.type === "frame"
        ? "visual.frame@1"
        : node.type === "note"
          ? "visual.note@1"
          : (data.kind ?? "logic.filter@1"));
    return {
      id: node.id,
      type,
      label:
        node.type === "frame" && original?.label === "Grupo"
          ? "Quadro"
          : original?.label ?? data.label,
      position: node.position,
      config: {
        ...(original?.config ?? {}),
        ...(node.parentId ? { parentId: node.parentId } : { parentId: undefined }),
        ...(node.type === "note" ? { text: data.text || data.label } : {}),
        ...(node.type === "frame"
          ? {
              width: Number(node.style?.width ?? node.measured?.width ?? node.width ?? original?.config?.width ?? 280),
              height: Number(node.style?.height ?? node.measured?.height ?? node.height ?? original?.config?.height ?? 180),
              color: typeof data.color === "string" ? data.color : original?.config?.color,
            }
          : {}),
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
        label: node.label ?? "Quadro",
        x: node.position.x,
        y: node.position.y,
        width: Number(node.config?.width ?? 280),
        height: Number(node.config?.height ?? 180),
        color: typeof node.config?.color === "string" ? node.config.color : undefined,
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
