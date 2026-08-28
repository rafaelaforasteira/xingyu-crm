"use client";

import * as React from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { AutomationNodeCatalogItem, WorkflowDefinition } from "@/lib/types";
import { edgeTypes, fromFlow, nodeTypes, toFlow } from "./studio-nodes";

export function StudioCanvas({
  definition,
  selectedId,
  statuses,
  catalog,
  readOnly,
  onChange,
  onSelect,
  onAddRequest,
}: {
  definition: WorkflowDefinition;
  selectedId?: string | null;
  statuses?: Record<string, string>;
  catalog?: AutomationNodeCatalogItem[];
  readOnly?: boolean;
  onChange: (definition: WorkflowDefinition) => void;
  onSelect: (nodeId: string | null) => void;
  onAddRequest: (source?: string, edgeId?: string, handle?: string) => void;
}) {
  const addRequestRef = React.useRef(onAddRequest);
  addRequestRef.current = onAddRequest;
  const mapped = React.useMemo(
    () => toFlow(definition, catalog, statuses, (edgeId) => addRequestRef.current(undefined, edgeId), Boolean(readOnly)),
    [catalog, definition, readOnly, statuses],
  );
  const [nodes, setNodes] = React.useState(mapped.nodes);
  const [edges, setEdges] = React.useState(mapped.edges);

  React.useEffect(() => {
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
      nodes={nodes.map((node) => ({ ...node, selected: node.id === selectedId }))}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodesDraggable={!readOnly}
      nodesConnectable={!readOnly}
      elementsSelectable
      onNodesChange={(changes) => {
        const next = applyNodeChanges(changes, nodes);
        setNodes(next);
        if (!readOnly && changes.some((change) => change.type === "remove")) persist(next, edges);
      }}
      onEdgesChange={(changes) => {
        const next = applyEdgeChanges(changes, edges);
        setEdges(next);
        if (!readOnly && changes.some((change) => change.type === "remove")) persist(nodes, next);
      }}
      onConnect={(connection: Connection) => {
        if (readOnly) return;
        const next = addEdge({ ...connection, id: `e-${connection.source}-${connection.target}-${Date.now()}`, type: "insertable" }, edges);
        setEdges(next);
        persist(nodes, next);
      }}
      onConnectEnd={(_event, state) => {
        if (readOnly || state.toNode || !state.fromNode) return;
        onAddRequest(state.fromNode.id, undefined, state.fromHandle?.id ?? undefined);
      }}
      onNodeDragStop={(_, __, nextNodes) => persist(nextNodes, edges)}
      onSelectionChange={({ nodes: selected }) => onSelect(selected[0]?.id ?? null)}
      onPaneClick={() => onSelect(null)}
      fitView
      deleteKeyCode={readOnly ? [] : ["Backspace", "Delete"]}
      proOptions={{ hideAttribution: true }}
      className="h-full w-full"
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="hsl(240 6% 22%)" />
      <Controls showInteractive={false} className="!overflow-hidden !rounded-lg !border-[hsl(var(--automation-border))] !bg-[hsl(var(--automation-surface))] !shadow-none" />
      <MiniMap
        pannable
        zoomable
        className="!overflow-hidden !rounded-lg !border-[hsl(var(--automation-border))] !bg-[hsl(var(--automation-surface))]"
        maskColor="rgba(0,0,0,0.35)"
      />
      {readOnly ? null : (
        <button
          type="button"
          onClick={() => onAddRequest()}
          className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 rounded-full border border-[hsl(var(--automation-border))] bg-[hsl(var(--automation-elevated))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--automation-text))]"
        >
          Adicionar etapa
        </button>
      )}
    </ReactFlow>
  );
}
