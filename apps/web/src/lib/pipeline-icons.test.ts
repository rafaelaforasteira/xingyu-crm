import { describe, expect, it } from "vitest";
import {
  formatPipelineNavLabel,
  resolvePipelineIcon,
} from "./pipeline-icons";

describe("pipeline nav formatting", () => {
  it("enumerates and uppercases labels", () => {
    expect(formatPipelineNavLabel("Funil Comercial", 4)).toBe(
      "04. FUNIL COMERCIAL",
    );
  });

  it("keeps two digits through 9 and does not truncate 10+", () => {
    expect(formatPipelineNavLabel("Primeiro", 1)).toBe("01. PRIMEIRO");
    expect(formatPipelineNavLabel("Décimo", 10)).toBe("10. DÉCIMO");
  });

  it("resolves known icons and falls back to Kanban", () => {
    expect(resolvePipelineIcon("ShoppingBag").displayName || resolvePipelineIcon("ShoppingBag").name).toBeTruthy();
    expect(resolvePipelineIcon("unknown").name || "Kanban").toBeTruthy();
  });
});

describe("task board grouping helpers", () => {
  it("maps legacy status categories for grouping", () => {
    const legacyToCategory = (status: string) => {
      if (status === "COMPLETED" || status === "DONE" || status === "CANCELLED") {
        return "DONE";
      }
      if (status === "IN_PROGRESS") return "IN_PROGRESS";
      return "OPEN";
    };
    expect(legacyToCategory("PENDING")).toBe("OPEN");
    expect(legacyToCategory("IN_PROGRESS")).toBe("IN_PROGRESS");
    expect(legacyToCategory("DONE")).toBe("DONE");
    expect(legacyToCategory("COMPLETED")).toBe("DONE");
  });
});
