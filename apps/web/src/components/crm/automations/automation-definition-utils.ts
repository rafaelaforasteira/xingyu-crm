import type { WorkflowDefinition } from "@/lib/types";

export function removeCanvasItem(
  definition: WorkflowDefinition,
  itemId: string,
): WorkflowDefinition {
  return {
    ...definition,
    nodes: definition.nodes.filter((node) => node.id !== itemId),
    edges: definition.edges.filter(
      (edge) => edge.source !== itemId && edge.target !== itemId,
    ),
    frames: definition.frames?.filter((frame) => frame.id !== itemId),
    annotations: definition.annotations?.filter(
      (annotation) => annotation.id !== itemId,
    ),
  };
}
