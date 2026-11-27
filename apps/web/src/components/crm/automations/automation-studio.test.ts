import { describe, expect, it } from "vitest";
import type { WorkflowDefinition } from "@/lib/types";
import { removeCanvasItem } from "./automation-definition-utils";

const definition: WorkflowDefinition = {
  nodes: [
    { id: "trigger", type: "trigger.manual@1", position: { x: 0, y: 0 } },
    { id: "note", type: "visual.note@1", position: { x: 100, y: 0 } },
    { id: "frame", type: "visual.frame@1", position: { x: 200, y: 0 } },
  ],
  edges: [
    { id: "to-note", source: "trigger", target: "note" },
    { id: "from-note", source: "note", target: "frame" },
  ],
  annotations: [{ id: "note", text: "Lembrete", x: 100, y: 0 }],
  frames: [{ id: "frame", label: "Quadro", x: 200, y: 0, width: 300, height: 200 }],
};

describe("removeCanvasItem", () => {
  it("remove uma nota de nodes, annotations e conexões", () => {
    const result = removeCanvasItem(definition, "note");

    expect(result.nodes.map((node) => node.id)).not.toContain("note");
    expect(result.annotations?.map((note) => note.id)).not.toContain("note");
    expect(result.edges).toHaveLength(0);
  });

  it("remove um quadro de nodes e frames", () => {
    const result = removeCanvasItem(definition, "frame");

    expect(result.nodes.map((node) => node.id)).not.toContain("frame");
    expect(result.frames?.map((frame) => frame.id)).not.toContain("frame");
  });

  it("remove etapas executáveis e suas conexões", () => {
    const result = removeCanvasItem(definition, "trigger");

    expect(result.nodes.map((node) => node.id)).not.toContain("trigger");
    expect(
      result.edges.every(
        (edge) => edge.source !== "trigger" && edge.target !== "trigger",
      ),
    ).toBe(true);
  });
});
