import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("lead notes history contract", () => {
  const source = readFileSync(new URL("./lead-notes.tsx", import.meta.url), "utf8");
  const tasks = readFileSync(new URL("./lead-tasks.tsx", import.meta.url), "utf8");
  const panel = readFileSync(new URL("./lead-context-panel.tsx", import.meta.url), "utf8");

  it("offers append-only, deal-scoped notes with a compact recent history", () => {
    expect(source).toContain('placeholder="Escreva uma anotação interna..."');
    expect(source).toContain("notes.slice(0, 3)");
    expect(source).toContain("Ver todas as notas");
    expect(source).toContain("dealId: links.dealId");
    expect(source).not.toContain("notesApi.update");
    expect(source).not.toContain("notesApi.delete");
    expect(panel).not.toContain("Abrir ficha");
  });

  it("reuses the task dialog and carries the source note", () => {
    expect(tasks).toContain("export function CreateTaskDialog");
    expect(source).toContain("<CreateTaskDialog");
    expect(source).toContain("initialDescription={taskNote?.content");
    expect(source).toContain("sourceNoteId={taskNote?.id}");
  });
});
