import { describe, expect, it } from "vitest";
import { priorityTone, taskAttention, taskTooltip, visibleCardChips } from "./kanban-card-utils";

describe("kanban card summaries", () => {
  it("prioritizes overdue and today task attention", () => {
    expect(taskAttention({ open: 3, today: 1, overdue: 1 })).toBe("overdue");
    expect(taskAttention({ open: 2, today: 1, overdue: 0 })).toBe("today");
    expect(taskAttention({ open: 1, today: 0, overdue: 0 })).toBe("future");
    expect(taskAttention({ open: 0, today: 0, overdue: 0 })).toBe("none");
    expect(taskTooltip({ open: 3, today: 1, overdue: 1 })).toContain("1 atrasada");
  });

  it("maps empty and persisted priority levels to operational colors", () => {
    expect(priorityTone()).toBe("neutral");
    expect(priorityTone("LOW")).toBe("blue");
    expect(priorityTone("MEDIUM")).toBe("amber");
    expect(priorityTone("HIGH")).toBe("red");
    expect(priorityTone("URGENT")).toBe("red");
  });

  it("puts channel first, deduplicates tags and reports overflow", () => {
    const result = visibleCardChips("WhatsApp Xingyu", [
      { id: "channel-copy", name: "whatsapp xingyu" },
      { id: "a", name: "Atacadista" },
      { id: "b", name: "VIP" },
      { id: "b", name: "VIP" },
    ]);
    expect(result.visible.map((item) => item.name)).toEqual(["WhatsApp Xingyu", "Atacadista"]);
    expect(result.overflow.map((item) => item.name)).toEqual(["VIP"]);
  });
});
