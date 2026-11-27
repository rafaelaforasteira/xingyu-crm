import { describe, expect, it } from "vitest";
import type { Activity } from "@/lib/types";
import { presentHistoryEvent } from "./lead-history-presenter";

function event(type: string, metadata?: Record<string, unknown>): Activity {
  return { id: "event-1", type, title: "internal title", createdAt: new Date().toISOString(), metadata };
}

describe("lead history presenter", () => {
  it("presents immutable stage snapshots", () => {
    expect(presentHistoryEvent(event("STAGE_CHANGED", { fromStageName: "Novo", stageName: "Em contato" }))).toEqual({ label: "Moveu o lead", detail: "Novo → Em contato" });
  });
  it("does not expose note or task content", () => {
    expect(presentHistoryEvent(event("NOTE_CREATED", { body: "segredo" }))).toEqual({ label: "Adicionou uma nota", detail: null });
    expect(presentHistoryEvent(event("TASK_CREATED", { description: "segredo" }))).toEqual({ label: "Criou uma tarefa", detail: null });
  });
  it("uses a safe unknown-event fallback", () => {
    expect(presentHistoryEvent(event("FUTURE_EVENT"))).toEqual({ label: "Acontecimento registrado", detail: null });
  });
});
