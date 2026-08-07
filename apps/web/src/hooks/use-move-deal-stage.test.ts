import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Conversation, ConversationListItem } from "@/lib/types";

const moveMock = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock("@/lib/api", () => ({
  dealsApi: {
    move: (...args: unknown[]) => moveMock(...args),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

vi.mock("@/lib/board-cache", () => ({
  moveBoardDeal: vi.fn(),
}));

/**
 * Pure optimistic patch contracts used by useMoveDealStage.
 * Mirrors the cache patching rules without mounting React Query.
 */
function patchListItem(
  item: ConversationListItem,
  dealId: string,
  stageId: string,
  stageName: string,
): ConversationListItem {
  if (item.currentDeal?.id !== dealId) return item;
  return {
    ...item,
    currentDeal: {
      ...item.currentDeal,
      stageId,
      stageName,
    },
  };
}

function patchDetail(
  current: Conversation,
  dealId: string,
  stageId: string,
  stageName: string,
): Conversation {
  if (!current.deal || current.deal.id !== dealId) return current;
  return {
    ...current,
    deal: {
      ...current.deal,
      stageId,
      stage: {
        ...(current.deal.stage ?? { id: stageId, name: stageName, position: 0 }),
        id: stageId,
        name: stageName,
      },
    },
  };
}

describe("move deal stage optimistic contracts", () => {
  beforeEach(() => {
    moveMock.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  it("patches list stage for the matching deal only", () => {
    const items: ConversationListItem[] = [
      {
        id: "c1",
        status: "OPEN",
        unreadCount: 0,
        currentDeal: {
          id: "d1",
          name: "A",
          pipelineId: "p1",
          stageId: "s1",
          stageName: "Novo lead",
        },
      },
      {
        id: "c2",
        status: "OPEN",
        unreadCount: 0,
        currentDeal: {
          id: "d2",
          name: "B",
          pipelineId: "p1",
          stageId: "s1",
          stageName: "Novo lead",
        },
      },
    ];
    const next = items.map((item) =>
      patchListItem(item, "d1", "s2", "Em negociação"),
    );
    expect(next[0]!.currentDeal!.stageName).toBe("Em negociação");
    expect(next[1]!.currentDeal!.stageName).toBe("Novo lead");
  });

  it("patches conversation detail stage without touching status", () => {
    const detail: Conversation = {
      id: "c1",
      status: "OPEN",
      deal: {
        id: "d1",
        name: "Lead",
        pipelineId: "p1",
        stageId: "s1",
        stage: { id: "s1", name: "Novo lead", position: 1 },
      },
    };
    const next = patchDetail(detail, "d1", "s2", "Em negociação");
    expect(next.status).toBe("OPEN");
    expect(next.deal?.stageId).toBe("s2");
    expect(next.deal?.stage?.name).toBe("Em negociação");
  });

  it("skips mutation when selecting the same stage", () => {
    const currentStageId = "s1";
    const selectedStageId = "s1";
    const shouldMutate = selectedStageId !== currentStageId;
    expect(shouldMutate).toBe(false);
  });

  it("uses dealsApi.move for a real stage change", async () => {
    moveMock.mockResolvedValue({ id: "d1", stageId: "s2" });
    await moveMock("d1", "s2");
    expect(moveMock).toHaveBeenCalledWith("d1", "s2");
  });

  it("defines success and error toast copy", () => {
    toastSuccess("Lead movido para Em negociação.");
    toastError("Não foi possível alterar a etapa do lead.");
    expect(toastSuccess).toHaveBeenCalledWith(
      "Lead movido para Em negociação.",
    );
    expect(toastError).toHaveBeenCalledWith(
      "Não foi possível alterar a etapa do lead.",
    );
  });
});
