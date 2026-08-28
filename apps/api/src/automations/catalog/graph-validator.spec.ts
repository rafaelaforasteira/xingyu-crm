import { validateDefinition } from "./graph-validator";
import { emptyDefinition } from "../domain/definition";

describe("graph validator", () => {
  it("requires a trigger to publish", () => {
    const issues = validateDefinition({ ...emptyDefinition(), nodes: [{ id: "a", type: "action.task.create@1", position: { x: 0, y: 0 }, config: { title: "x" } }], edges: [] });
    expect(issues.some((issue) => issue.code === "NO_TRIGGER")).toBe(true);
  });

  it("detects cycles", () => {
    const issues = validateDefinition({
      schemaVersion: 1,
      nodes: [
        { id: "t", type: "trigger.manual@1", position: { x: 0, y: 0 } },
        { id: "a", type: "logic.filter@1", position: { x: 0, y: 80 } },
        { id: "b", type: "logic.stop@1", position: { x: 0, y: 160 } },
      ],
      edges: [
        { id: "e1", source: "t", target: "a" },
        { id: "e2", source: "a", target: "b" },
        { id: "e3", source: "b", target: "a" },
      ],
    });
    expect(issues.some((issue) => issue.code === "CYCLE")).toBe(true);
  });
});
