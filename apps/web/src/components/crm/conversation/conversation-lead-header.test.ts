import { describe, expect, it } from "vitest";
import {
  resolveSelectedConversationId,
  shouldAutoSelectFirstConversation,
} from "./conversation-selection";
import {
  resolveStageLabel,
  sortPipelineStages,
} from "./pipeline-stage-utils";
import {
  assigneeShortCode,
  conversationContactDisplayName,
  formatLeadCode,
} from "./conversation-list-utils";
import type { PipelineStage } from "@/lib/types";

describe("resolveSelectedConversationId", () => {
  it("returns null when conversation param is absent", () => {
    expect(resolveSelectedConversationId(null)).toBeNull();
    expect(resolveSelectedConversationId(undefined)).toBeNull();
    expect(resolveSelectedConversationId("")).toBeNull();
    expect(resolveSelectedConversationId("   ")).toBeNull();
  });

  it("returns the conversation id when present", () => {
    expect(resolveSelectedConversationId("conv-123")).toBe("conv-123");
    expect(resolveSelectedConversationId("  conv-123  ")).toBe("conv-123");
  });

  it("never auto-selects the first conversation", () => {
    expect(shouldAutoSelectFirstConversation()).toBe(false);
    expect(shouldAutoSelectFirstConversation(1)).toBe(false);
    expect(shouldAutoSelectFirstConversation(100)).toBe(false);
  });
});

describe("conversation lead header display helpers", () => {
  it("resolves contact display name hierarchy", () => {
    expect(
      conversationContactDisplayName({ firstName: "Amanda", lastName: "Vieira" }),
    ).toBe("Amanda Vieira");
    expect(
      conversationContactDisplayName({
        displayName: "Display",
        pushName: "Push",
      }),
    ).toBe("Display");
    expect(conversationContactDisplayName({ pushName: "Push Only" })).toBe(
      "Push Only",
    );
    expect(conversationContactDisplayName({ phone: "11987654321" })).toMatch(
      /11/,
    );
    expect(conversationContactDisplayName(null)).toBe("Contato sem nome");
  });

  it("formats persisted lead codes only", () => {
    expect(formatLeadCode(48)).toBe("Lead #0048");
    expect(formatLeadCode(null)).toBeNull();
    expect(formatLeadCode(0)).toBeNull();
  });

  it("derives assignee short codes", () => {
    expect(assigneeShortCode("Isa Rezende")).toBe("IR");
    expect(assigneeShortCode("Isa")).toBe("IS");
    expect(assigneeShortCode(null)).toBeNull();
  });
});

describe("pipeline stage utils", () => {
  const stages: PipelineStage[] = [
    { id: "b", name: "Em negociação", position: 2 },
    { id: "a", name: "Novo lead", position: 1 },
    { id: "c", name: "Aguardando pagamento", position: 3 },
  ];

  it("sorts stages by position ascending", () => {
    expect(sortPipelineStages(stages).map((s) => s.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("resolves current stage label", () => {
    expect(
      resolveStageLabel({
        stages,
        stageId: "b",
        stageName: null,
        hasDeal: true,
      }),
    ).toBe("Em negociação");
    expect(
      resolveStageLabel({
        stages,
        stageId: "missing",
        stageName: "Fallback",
        hasDeal: true,
      }),
    ).toBe("Fallback");
    expect(
      resolveStageLabel({
        stages: [],
        stageId: null,
        stageName: null,
        hasDeal: false,
      }),
    ).toBe("Sem etapa");
    expect(
      resolveStageLabel({
        stages: [],
        stageId: "x",
        stageName: null,
        hasDeal: true,
      }),
    ).toBe("Sem etapa");
  });

  it("does not invent duplicate stages", () => {
    const sorted = sortPipelineStages(stages);
    expect(new Set(sorted.map((s) => s.id)).size).toBe(sorted.length);
  });
});
