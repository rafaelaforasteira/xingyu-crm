import { describe, expect, it } from "vitest";
import { Position } from "@xyflow/react";
import { edgeExecutionStatus, organicEdgeGeometry, seedFromString } from "./organic-flow-edge";

describe("organic flow edge", () => {
  it("derives stable procedural geometry from the edge id", () => {
    const input = [
      "edge-a",
      { x: 10, y: 40 },
      { x: 320, y: 180 },
      Position.Right,
      Position.Left,
      4,
    ] as const;

    const first = organicEdgeGeometry(...input);
    const second = organicEdgeGeometry(...input);

    expect(first).toEqual(second);
    expect(first.fibers).toHaveLength(0);
    expect(first.core).toContain(" L ");
  });

  it("keeps routing independent from cosmetic edge ids", () => {
    expect(seedFromString("edge-a")).toBe(seedFromString("edge-a"));
    expect(seedFromString("edge-a")).not.toBe(seedFromString("edge-b"));
    expect(
      organicEdgeGeometry("edge-a", { x: 0, y: 0 }, { x: 200, y: 0 }, Position.Right, Position.Left)
        .core,
    ).toEqual(
      organicEdgeGeometry("edge-b", { x: 0, y: 0 }, { x: 200, y: 0 }, Position.Right, Position.Left)
        .core,
    );
  });

  it("translates runtime states into visual edge states", () => {
    expect(edgeExecutionStatus("RUNNING", undefined)).toBe("running");
    expect(edgeExecutionStatus("SUCCESS", "WAITING")).toBe("waiting");
    expect(edgeExecutionStatus("SUCCESS", "SUCCEEDED")).toBe("success");
    expect(edgeExecutionStatus("SUCCESS", "FAILED")).toBe("failed");
    expect(edgeExecutionStatus("SUCCESS", "SKIPPED")).toBe("skipped");
    expect(edgeExecutionStatus()).toBe("idle");
  });

  it("supports vertical routing while keeping labels readable", () => {
    const geometry = organicEdgeGeometry(
      "vertical-edge",
      { x: 120, y: 10 },
      { x: 180, y: 330 },
      Position.Bottom,
      Position.Top,
    );

    expect(geometry.core).toContain("L");
    expect(geometry.label.angle).toBeGreaterThanOrEqual(-12);
    expect(geometry.label.angle).toBeLessThanOrEqual(12);
  });
});
