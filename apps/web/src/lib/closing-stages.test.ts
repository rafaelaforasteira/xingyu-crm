import { describe, expect, it } from "vitest";
import {
  findArchivedClosing,
  needsReorder,
  orderWithClosingLast,
  splitClosingStages,
  stageKind,
} from "./closing-stages";
import type { PipelineStage } from "./types";

const stage = (id: string, position: number, type: "OPEN" | "WON" | "LOST" = "OPEN", extra: Partial<PipelineStage> = {}): PipelineStage => ({
  id,
  name: id,
  position,
  type,
  ...extra,
});

describe("closing stages", () => {
  it("reads the kind from type or legacy flags", () => {
    expect(stageKind(stage("a", 0, "WON"))).toBe("WON");
    expect(stageKind({ type: "OPEN", isLost: true })).toBe("LOST");
    expect(stageKind(stage("a", 0))).toBe("OPEN");
  });

  it("splits working stages from the first won and lost columns", () => {
    const result = splitClosingStages([
      stage("lost", 1, "LOST"),
      stage("qualificacao", 0),
      stage("won", 2, "WON"),
      stage("proposta", 3),
    ]);
    expect(result.working.map((item) => item.id)).toEqual(["qualificacao", "proposta"]);
    expect(result.won?.id).toBe("won");
    expect(result.lost?.id).toBe("lost");
  });

  it("works when a pipeline has no closing columns", () => {
    const result = splitClosingStages([stage("a", 0), stage("b", 1)]);
    expect(result.won).toBeNull();
    expect(result.lost).toBeNull();
    expect(orderWithClosingLast([stage("a", 0), stage("b", 1)])).toEqual(["a", "b"]);
  });

  it("keeps won then lost at the end of the board", () => {
    const stages = [stage("won", 0, "WON"), stage("a", 1), stage("lost", 2, "LOST"), stage("b", 3)];
    expect(orderWithClosingLast(stages)).toEqual(["a", "b", "won", "lost"]);
    expect(orderWithClosingLast(stages, ["b", "a"])).toEqual(["b", "a", "won", "lost"]);
    expect(needsReorder(stages)).toBe(true);
    expect(needsReorder([stage("a", 0), stage("won", 1, "WON"), stage("lost", 2, "LOST")])).toBe(false);
  });

  it("finds the most recent archived column of a kind", () => {
    const archived = [
      stage("old", 0, "WON", { updatedAt: "2026-01-01T00:00:00Z" }),
      stage("recent", 1, "WON", { updatedAt: "2026-06-01T00:00:00Z" }),
      stage("lost", 2, "LOST"),
    ];
    expect(findArchivedClosing(archived, "WON")?.id).toBe("recent");
    expect(findArchivedClosing(archived, "LOST")?.id).toBe("lost");
    expect(findArchivedClosing([], "WON")).toBeNull();
  });
});
