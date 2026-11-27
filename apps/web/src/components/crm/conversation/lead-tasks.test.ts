import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("lead tasks manager contract", () => {
  const source = readFileSync(new URL("./lead-tasks.tsx", import.meta.url), "utf8");
  const panel = readFileSync(new URL("./lead-context-panel.tsx", import.meta.url), "utf8");

  it("uses lead-scoped dialogs and the configured status source", () => {
    expect(source).toContain("tasksApi.statuses()");
    expect(source).toContain("Ver todas as tarefas");
    expect(source).toContain("Abertas (");
    expect(source).toContain("Concluídas (");
    expect(source).toContain("slice(0, 3)");
    expect(source).not.toContain('href="/tasks"');
  });

  it("removes the legacy next task, quick add and complete actions", () => {
    expect(panel).not.toContain("Próxima:");
    expect(panel).not.toContain("Abrir lista completa");
    expect(panel).not.toContain("Concluir");
    expect(panel).not.toContain('placeholder="Nova tarefa');
  });
});
