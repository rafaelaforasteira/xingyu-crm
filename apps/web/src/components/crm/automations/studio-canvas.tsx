"use client";

import * as React from "react";
import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  SelectionMode,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import { Maximize2, Moon, Sun, ZoomIn, ZoomOut } from "lucide-react";
import "@xyflow/react/dist/style.css";
import type { AutomationNodeCatalogItem, Pipeline, WorkflowDefinition } from "@/lib/types";
import {
  edgeTypes,
  fromFlow,
  nodeTypes,
  toFlow,
  type AutomationFlowNode,
} from "./studio-nodes";
import { OrganicConnectionLine } from "./organic-flow-edge";

function CanvasViewportControls({
  theme,
  onToggleTheme,
}: {
  theme: "dark" | "light";
  onToggleTheme: () => void;
}) {
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const controls = [
    { label: "Aumentar zoom", icon: ZoomIn, action: () => void zoomIn() },
    { label: "Diminuir zoom", icon: ZoomOut, action: () => void zoomOut() },
    {
      label: "Enquadrar automação",
      icon: Maximize2,
      action: () => void fitView({ duration: 280 }),
    },
  ];

  return (
    <div className="absolute bottom-4 left-4 z-10 flex overflow-hidden rounded-xl border border-[hsl(var(--automation-border))] bg-[hsl(var(--automation-surface)/0.94)] p-1 shadow-soft backdrop-blur">
      {controls.map(({ label, icon: Icon, action }) => (
        <button
          key={label}
          type="button"
          onClick={action}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--automation-accent))] transition-colors hover:bg-[hsl(var(--automation-accent)/0.12)]"
          aria-label={label}
          title={label}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
      <span className="mx-1 my-1 w-px bg-[hsl(var(--automation-border))]" />
      <button
        type="button"
        onClick={onToggleTheme}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--automation-accent))] transition-colors hover:bg-[hsl(var(--automation-accent)/0.12)]"
        aria-label={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}
        title={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    </div>
  );
}

function KeepAllNodesVisible({ nodeCount }: { nodeCount: number }) {
  const { fitView } = useReactFlow();
  const previousCountRef = React.useRef(nodeCount);

  React.useEffect(() => {
    if (nodeCount <= previousCountRef.current) {
      previousCountRef.current = nodeCount;
      return;
    }
    previousCountRef.current = nodeCount;
    const frame = window.requestAnimationFrame(() => {
      void fitView({ duration: 280, padding: 0.22 });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [fitView, nodeCount]);

  return null;
}

type AlignmentGuides = { x?: number; y?: number };

function CanvasAlignmentGuides({ guides }: { guides: AlignmentGuides }) {
  const { getViewport } = useReactFlow();
  const viewport = getViewport();
  return (
    <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden" aria-hidden="true">
      {guides.x !== undefined ? (
        <div
          className="absolute inset-y-0 w-px bg-fuchsia-500 shadow-[0_0_5px_rgba(217,70,239,0.75)]"
          style={{ left: guides.x * viewport.zoom + viewport.x }}
        />
      ) : null}
      {guides.y !== undefined ? (
        <div
          className="absolute inset-x-0 h-px bg-fuchsia-500 shadow-[0_0_5px_rgba(217,70,239,0.75)]"
          style={{ top: guides.y * viewport.zoom + viewport.y }}
        />
      ) : null}
    </div>
  );
}

function nodeSize(node: Node) {
  const styleWidth = typeof node.style?.width === "number" ? node.style.width : undefined;
  const styleHeight = typeof node.style?.height === "number" ? node.style.height : undefined;
  return {
    width: node.measured?.width ?? styleWidth ?? (node.type === "note" ? 190 : 128),
    height: node.measured?.height ?? styleHeight ?? (node.type === "note" ? 104 : 96),
  };
}

function organizeNodesInFrame(
  nodes: AutomationFlowNode[],
  edges: Edge[],
  frameId: string,
): AutomationFlowNode[] {
  const children = nodes.filter((node) => node.parentId === frameId);
  if (!children.length) return nodes;

  const childIds = new Set(children.map((node) => node.id));
  const incoming = new Map(children.map((node) => [node.id, 0]));
  edges.forEach((edge) => {
    if (childIds.has(edge.source) && childIds.has(edge.target))
      incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
  });
  const depths = new Map<string, number>();
  const queue = children
    .filter((node) => (incoming.get(node.id) ?? 0) === 0)
    .sort((a, b) => a.position.y - b.position.y);
  queue.forEach((node) => depths.set(node.id, 0));
  for (let index = 0; index < queue.length; index += 1) {
    const source = queue[index]!;
    edges
      .filter(
        (edge) => edge.source === source.id && childIds.has(edge.target),
      )
      .forEach((edge) => {
        const target = children.find((node) => node.id === edge.target);
        if (!target) return;
        depths.set(target.id, Math.max(depths.get(target.id) ?? 0, (depths.get(source.id) ?? 0) + 1));
        if (!queue.some((node) => node.id === target.id)) queue.push(target);
      });
  }
  children.forEach((node) => {
    if (!depths.has(node.id)) depths.set(node.id, 0);
  });

  const columns = new Map<number, Node[]>();
  children.forEach((node) => {
    const depth = depths.get(node.id) ?? 0;
    columns.set(depth, [...(columns.get(depth) ?? []), node]);
  });
  const positions = new Map<string, { x: number; y: number }>();
  let x = 24;
  let contentBottom = 64;
  [...columns.entries()]
    .sort(([a], [b]) => a - b)
    .forEach(([, column]) => {
      let y = 58;
      let columnWidth = 0;
      column
        .sort((a, b) => a.position.y - b.position.y)
        .forEach((node) => {
          const size = nodeSize(node);
          positions.set(node.id, { x, y });
          y += size.height + 28;
          columnWidth = Math.max(columnWidth, size.width);
          contentBottom = Math.max(contentBottom, y);
        });
      x += columnWidth + 56;
    });

  const frameWidth = Math.max(220, x - 32);
  const frameHeight = Math.max(140, contentBottom - 4);
  return nodes.map((node) =>
    node.id === frameId
      ? { ...node, style: { ...node.style, width: frameWidth, height: frameHeight } }
      : positions.has(node.id)
        ? { ...node, position: positions.get(node.id)! }
        : node,
  ) as AutomationFlowNode[];
}

function alignDraggedNode(dragged: Node, allNodes: Node[]) {
  const draggedSize = nodeSize(dragged);
  const xOffsets = [0, draggedSize.width / 2, draggedSize.width];
  const yOffsets = [0, draggedSize.height / 2, draggedSize.height];
  let bestX: { distance: number; guide: number; position: number } | undefined;
  let bestY: { distance: number; guide: number; position: number } | undefined;

  for (const other of allNodes) {
    if (other.id === dragged.id) continue;
    const size = nodeSize(other);
    const otherX = [
      other.position.x,
      other.position.x + size.width / 2,
      other.position.x + size.width,
    ];
    const otherY = [
      other.position.y,
      other.position.y + size.height / 2,
      other.position.y + size.height,
    ];
    for (const offset of xOffsets) {
      for (const guide of otherX) {
        const distance = Math.abs(dragged.position.x + offset - guide);
        if (distance <= 8 && (!bestX || distance < bestX.distance))
          bestX = { distance, guide, position: guide - offset };
      }
    }
    for (const offset of yOffsets) {
      for (const guide of otherY) {
        const distance = Math.abs(dragged.position.y + offset - guide);
        if (distance <= 8 && (!bestY || distance < bestY.distance))
          bestY = { distance, guide, position: guide - offset };
      }
    }
  }

  return {
    position: {
      x: bestX?.position ?? dragged.position.x,
      y: bestY?.position ?? dragged.position.y,
    },
    guides: { x: bestX?.guide, y: bestY?.guide } satisfies AlignmentGuides,
  };
}

export function StudioCanvas({
  definition,
  selectedId,
  statuses,
  catalog,
  pipelines,
  users,
  tags,
  readOnly,
  theme,
  onChange,
  onSelect,
  onAddRequest,
  onDeleteRequest,
  onToggleTheme,
}: {
  definition: WorkflowDefinition;
  selectedId?: string | null;
  statuses?: Record<string, string>;
  catalog?: AutomationNodeCatalogItem[];
  pipelines?: Pipeline[];
  users?: Array<{ id: string; name: string }>;
  tags?: Array<{ id: string; name: string; color?: string }>;
  readOnly?: boolean;
  theme: "dark" | "light";
  onChange: (definition: WorkflowDefinition) => void;
  onSelect: (nodeId: string | null) => void;
  onAddRequest: (source?: string, edgeId?: string, handle?: string) => void;
  onDeleteRequest: (nodeId: string) => void;
  onToggleTheme: () => void;
}) {
  const addRequestRef = React.useRef(onAddRequest);
  addRequestRef.current = onAddRequest;
  const noteUpdateRef = React.useRef<(nodeId: string, patch: Record<string, unknown>) => void>(
    () => {},
  );
  noteUpdateRef.current = (nodeId, patch) => {
    if (readOnly) return;
    const { label, ...configPatch } = patch;
    onChange({
      ...definition,
      nodes: definition.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              label:
                typeof label === "string"
                  ? label
                  : typeof patch.text === "string"
                    ? patch.text
                    : node.label,
              config: { ...(node.config ?? {}), ...configPatch },
            }
          : node,
      ),
    });
  };
  const updateNote = React.useCallback((nodeId: string, patch: Record<string, unknown>) => {
    noteUpdateRef.current(nodeId, patch);
  }, []);
  const organizeRef = React.useRef<(frameId: string) => void>(() => {});
  organizeRef.current = (frameId) => {
    if (readOnly) return;
    const next = organizeNodesInFrame(nodesRef.current, edgesRef.current, frameId);
    nodesRef.current = next;
    setNodes(next);
    persist(next, edgesRef.current);
  };
  const organizeFrame = React.useCallback((frameId: string) => organizeRef.current(frameId), []);
  const mapped = React.useMemo(
    () =>
      toFlow(
        definition,
        catalog,
        statuses,
        (edgeId) => addRequestRef.current(undefined, edgeId),
        Boolean(readOnly),
        updateNote,
        organizeFrame,
        pipelines,
        users,
        tags,
      ),
    [catalog, definition, organizeFrame, pipelines, readOnly, statuses, tags, updateNote, users],
  );
  const [nodes, setNodes] = React.useState(mapped.nodes);
  const [edges, setEdges] = React.useState(mapped.edges);
  const nodesRef = React.useRef(mapped.nodes);
  const edgesRef = React.useRef(mapped.edges);
  const [miniMapVisible, setMiniMapVisible] = React.useState(false);
  const [alignmentGuides, setAlignmentGuides] = React.useState<AlignmentGuides>({});
  const [contextMenu, setContextMenu] = React.useState<{
    nodeId: string;
    x: number;
    y: number;
  } | null>(null);
  const miniMapTimerRef = React.useRef<number | null>(null);

  const showMiniMap = React.useCallback(() => {
    if (miniMapTimerRef.current) window.clearTimeout(miniMapTimerRef.current);
    setMiniMapVisible(true);
  }, []);

  const hideMiniMapSoon = React.useCallback(() => {
    if (miniMapTimerRef.current) window.clearTimeout(miniMapTimerRef.current);
    miniMapTimerRef.current = window.setTimeout(() => setMiniMapVisible(false), 700);
  }, []);

  React.useEffect(
    () => () => {
      if (miniMapTimerRef.current) window.clearTimeout(miniMapTimerRef.current);
    },
    [],
  );

  React.useEffect(() => {
    nodesRef.current = mapped.nodes;
    edgesRef.current = mapped.edges;
    setNodes(mapped.nodes);
    setEdges(mapped.edges);
  }, [mapped]);

  const persist = React.useCallback(
    (nextNodes: Node[], nextEdges: Edge[]) => {
      if (readOnly) return;
      onChange(fromFlow(nextNodes, nextEdges, definition));
    },
    [definition, onChange, readOnly],
  );
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      connectionLineComponent={OrganicConnectionLine}
      nodesDraggable={!readOnly}
      nodesConnectable={!readOnly}
      elementsSelectable
      selectionOnDrag={!readOnly}
      selectionMode={SelectionMode.Partial}
      panOnDrag={readOnly ? true : [1, 2]}
      panActivationKeyCode="Space"
      selectionKeyCode={null}
      onNodesChange={(changes) => {
        const next = applyNodeChanges(changes, nodes);
        nodesRef.current = next;
        setNodes(next);
        if (!readOnly && changes.some((change) => change.type === "remove"))
          persist(next, edgesRef.current);
      }}
      onEdgesChange={(changes) => {
        const next = applyEdgeChanges(changes, edges);
        edgesRef.current = next;
        setEdges(next);
        if (!readOnly && changes.some((change) => change.type === "remove")) persist(nodes, next);
      }}
      onConnect={(connection: Connection) => {
        if (readOnly) return;
        const next = addEdge(
          {
            ...connection,
            id: `e-${connection.source}-${connection.target}-${Date.now()}`,
            type: "insertable",
          },
          edges,
        );
        edgesRef.current = next;
        setEdges(next);
        persist(nodes, next);
      }}
      onConnectEnd={(_event, state) => {
        if (readOnly || state.toNode || !state.fromNode) return;
        onAddRequest(state.fromNode.id, undefined, state.fromHandle?.id ?? undefined);
      }}
      onMoveStart={showMiniMap}
      onMoveEnd={hideMiniMapSoon}
      onNodeDragStart={showMiniMap}
      onNodeDrag={(_event, draggedNode) => {
        const aligned = alignDraggedNode(draggedNode, nodesRef.current);
        setAlignmentGuides(aligned.guides);
        const next = nodesRef.current.map((node) =>
          node.id === draggedNode.id ? { ...node, position: aligned.position } : node,
        );
        nodesRef.current = next;
        setNodes(next);
      }}
      onNodeDragStop={(_event, draggedNode) => {
        // React Flow's third drag argument contains only the nodes participating
        // in the drag. Persisting it would replace the whole workflow with that
        // subset, making every other node disappear.
        let next = nodesRef.current;
        if (draggedNode.type !== "frame") {
          const dragged = next.find((node) => node.id === draggedNode.id);
          if (dragged) {
            const currentParent = dragged.parentId
              ? next.find((node) => node.id === dragged.parentId)
              : undefined;
            const absolute = currentParent
              ? {
                  x: currentParent.position.x + dragged.position.x,
                  y: currentParent.position.y + dragged.position.y,
                }
              : dragged.position;
            const size = nodeSize(dragged);
            const targetFrame = next
              .filter((node) => node.type === "frame")
              .map((node) => {
                const frameSize = nodeSize(node);
                const overlapWidth = Math.max(
                  0,
                  Math.min(absolute.x + size.width, node.position.x + frameSize.width) -
                    Math.max(absolute.x, node.position.x),
                );
                const overlapHeight = Math.max(
                  0,
                  Math.min(absolute.y + size.height, node.position.y + frameSize.height) -
                    Math.max(absolute.y, node.position.y),
                );
                return { node, overlap: overlapWidth * overlapHeight };
              })
              .filter((candidate) => candidate.overlap > 0)
              .sort((a, b) => b.overlap - a.overlap)[0]?.node;

            if (targetFrame) {
              const enteredFromOutside = dragged.parentId !== targetFrame.id;
              const frameSize = nodeSize(targetFrame);
              const padding = 24;
              const left = Math.min(targetFrame.position.x, absolute.x - padding);
              const top = Math.min(targetFrame.position.y, absolute.y - padding);
              const right = Math.max(
                targetFrame.position.x + frameSize.width,
                absolute.x + size.width + padding,
              );
              const bottom = Math.max(
                targetFrame.position.y + frameSize.height,
                absolute.y + size.height + padding,
              );
              const offsetX = targetFrame.position.x - left;
              const offsetY = targetFrame.position.y - top;
              const relative = {
                x: absolute.x - left,
                y: absolute.y - top,
              };
              const width = right - left;
              const height = bottom - top;
              next = next.map((node) =>
                node.id === targetFrame.id
                  ? { ...node, position: { x: left, y: top }, style: { ...node.style, width, height } }
                  : node.id === dragged.id
                    ? { ...node, parentId: targetFrame.id, expandParent: false, position: relative }
                    : node.parentId === targetFrame.id && (offsetX || offsetY)
                      ? {
                          ...node,
                          position: {
                            x: node.position.x + offsetX,
                            y: node.position.y + offsetY,
                          },
                        }
                    : node,
              );
              if (enteredFromOutside)
                next = organizeNodesInFrame(next, edgesRef.current, targetFrame.id);
            } else if (dragged.parentId) {
              next = next.map((node) =>
                node.id === dragged.id
                  ? { ...node, parentId: undefined, expandParent: false, position: absolute }
                  : node,
              );
            }
          }
        }
        nodesRef.current = next;
        setNodes(next);
        persist(next, edgesRef.current);
        setAlignmentGuides({});
        hideMiniMapSoon();
      }}
      onSelectionChange={({ nodes: selected }) => onSelect(selected[0]?.id ?? null)}
      onNodeClick={(_event, node) => onSelect(node.id)}
      onNodeContextMenu={(event, node) => {
        if (readOnly) return;
        event.preventDefault();
        onSelect(node.id);
        setContextMenu({ nodeId: node.id, x: event.clientX, y: event.clientY });
      }}
      onPaneClick={() => {
        setContextMenu(null);
        onSelect(null);
      }}
      fitView
      deleteKeyCode={readOnly ? [] : ["Backspace", "Delete"]}
      proOptions={{ hideAttribution: true }}
      className="h-full w-full [&_.react-flow__pane.selection]:cursor-crosshair [&_.react-flow__pane.dragging]:!cursor-grabbing"
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={22}
        size={1}
        color="hsl(var(--automation-grid))"
      />
      <KeepAllNodesVisible nodeCount={nodes.length} />
      <CanvasAlignmentGuides guides={alignmentGuides} />
      <CanvasViewportControls theme={theme} onToggleTheme={onToggleTheme} />
      {contextMenu ? (
        <div
          className="nodrag nopan fixed z-50 min-w-[150px] rounded-xl border border-[hsl(var(--automation-border))] bg-[hsl(var(--automation-surface))] p-1.5 shadow-2xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            type="button"
            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-xs font-medium text-[hsl(var(--automation-error))] hover:bg-[hsl(var(--automation-error)/0.1)]"
            onClick={() => {
              onDeleteRequest(contextMenu.nodeId);
              setContextMenu(null);
            }}
          >
            Excluir bloco
          </button>
        </div>
      ) : null}
      <MiniMap
        pannable
        zoomable
        className={`!overflow-hidden !rounded-xl !border-[hsl(var(--automation-border))] !bg-[hsl(var(--automation-surface))] !transition-opacity !duration-300 ${miniMapVisible ? "!opacity-100" : "pointer-events-none !opacity-0"}`}
        maskColor="rgba(0,0,0,0.35)"
      />
    </ReactFlow>
  );
}
