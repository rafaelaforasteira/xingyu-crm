import { describe, expect, it } from "vitest";
import type { Task } from "@/lib/types";
import { formatLeadTaskDue, isTaskDone, sortLeadTasks } from "./lead-task-utils";

const task = (id: string, dueAt: string | null, createdAt = "2026-08-01T00:00:00Z") =>
  ({ id, title: id, status: "PENDING", dueAt, createdAt }) as Task;

describe("lead task helpers", () => {
  it("recognizes configured and legacy final statuses", () => {
    expect(
      isTaskDone({
        ...task("a", null),
        statusDefinition: {
          id: "done",
          name: "Feita",
          slug: "feita",
          color: "#0f0",
          position: 2,
          category: "DONE",
        },
      }),
    ).toBe(true);
    expect(isTaskDone({ ...task("b", null), status: "COMPLETED" })).toBe(true);
    expect(isTaskDone(task("c", null))).toBe(false);
  });

  it("orders dated tasks first and keeps undated tasks last", () => {
    expect(
      sortLeadTasks([
        task("none", null),
        task("later", "2026-08-12T10:00:00Z"),
        task("overdue", "2026-08-09T10:00:00Z"),
      ]).map(({ id }) => id),
    ).toEqual(["overdue", "later", "none"]);
  });

  it("formats today, tomorrow, other dates and overdue state", () => {
    const now = new Date("2026-08-10T12:00:00-03:00");
    expect(formatLeadTaskDue("2026-08-10T14:00:00-03:00", now).label).toBe("Hoje");
    expect(formatLeadTaskDue("2026-08-11T14:00:00-03:00", now).label).toBe("Amanhã");
    expect(formatLeadTaskDue("2026-08-09T14:00:00-03:00", now).overdue).toBe(true);
    expect(formatLeadTaskDue(null, now).label).toBe("Sem data");
  });
});
