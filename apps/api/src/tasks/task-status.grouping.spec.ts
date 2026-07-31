describe("task status grouping", () => {
  function legacyStatusToCategory(status: string) {
    if (status === "COMPLETED" || status === "DONE" || status === "CANCELLED") {
      return "DONE";
    }
    if (status === "IN_PROGRESS") return "IN_PROGRESS";
    return "OPEN";
  }

  function groupTasksByStatus<
    T extends { statusDefinitionId?: string | null; status: string },
  >(statuses: { id: string; category: string }[], tasks: T[]) {
    return statuses.map((status) => ({
      status,
      tasks: tasks.filter(
        (task) =>
          task.statusDefinitionId === status.id ||
          (!task.statusDefinitionId &&
            legacyStatusToCategory(task.status) === status.category),
      ),
    }));
  }

  it("groups by custom status definition id", () => {
    const statuses = [
      { id: "s1", category: "OPEN" },
      { id: "s2", category: "DONE" },
    ];
    const tasks = [
      { id: "t1", status: "PENDING", statusDefinitionId: "s1" },
      { id: "t2", status: "COMPLETED", statusDefinitionId: "s2" },
    ];
    const groups = groupTasksByStatus(statuses, tasks);
    expect(groups[0]?.tasks).toHaveLength(1);
    expect(groups[1]?.tasks).toHaveLength(1);
  });

  it("falls back to legacy category mapping", () => {
    const statuses = [{ id: "s1", category: "OPEN" }];
    const tasks = [{ id: "t1", status: "PENDING", statusDefinitionId: null }];
    expect(groupTasksByStatus(statuses, tasks)[0]?.tasks).toHaveLength(1);
  });
});
