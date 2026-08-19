import { describe, expect, it } from "vitest";
import {
  chooseDefaultPipeline,
  dealMatchesOperationFilter,
  dealMatchesSearch,
  filterPipelineBoard,
  findDealByConversationId,
  isValidStageName,
  moveDealInStages,
  normalizeFilterForView,
  parseOperationView,
  patchDealInStages,
  sanitizeStageName,
} from "./operation-utils";
import type { Deal, Pipeline, PipelineStage } from "./types";
import { CORE_OPERATION_NAV_GROUPS, FULL_NAV_GROUPS, NAV_GROUPS } from "./nav";
import { shouldHideGlobalHeader } from "./feature-flags";

function deal(partial: Partial<Deal> & Pick<Deal, "id" | "name" | "pipelineId" | "stageId">): Deal {
  return {
    createdAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("chooseDefaultPipeline", () => {
  const pipelines = [
    { id: "p2", name: "B", isDefault: false, archived: false, position: 1 },
    { id: "p1", name: "A", isDefault: true, archived: false, position: 0 },
    { id: "p3", name: "C", isDefault: false, archived: true, position: 2 },
  ];

  it("prefers isDefault among active pipelines", () => {
    expect(chooseDefaultPipeline(pipelines)?.id).toBe("p1");
  });

  it("falls back to first active by position", () => {
    const withoutDefault = pipelines.map((p) => ({ ...p, isDefault: false }));
    expect(chooseDefaultPipeline(withoutDefault)?.id).toBe("p1");
  });

  it("honors preferred pipeline id when active", () => {
    expect(chooseDefaultPipeline(pipelines, "p2")?.id).toBe("p2");
  });

  it("returns null when no active pipelines", () => {
    expect(chooseDefaultPipeline([{ id: "x", name: "X", archived: true, position: 0 }])).toBeNull();
  });
});

describe("operation filters and search", () => {
  const sample = deal({
    id: "d1",
    name: "Lead WhatsApp - Amanda",
    pipelineId: "pipe",
    stageId: "s1",
    contact: {
      id: "c1",
      name: "Amanda Vieira",
      phone: "+5534988667780",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    conversationId: "conv-1",
    unreadCount: 2,
    awaitingReply: true,
    lastMessagePreview: "Prazo de entrega",
  });

  it("filters unread / awaiting / no-conversation", () => {
    expect(dealMatchesOperationFilter(sample, "unread")).toBe(true);
    expect(dealMatchesOperationFilter(sample, "awaiting")).toBe(true);
    expect(dealMatchesOperationFilter({ ...sample, conversationId: null }, "no-conversation")).toBe(
      true,
    );
  });

  it("searches contact, deal name, phone and preview", () => {
    expect(dealMatchesSearch(sample, "amanda")).toBe(true);
    expect(dealMatchesSearch(sample, "8667780")).toBe(true);
    expect(dealMatchesSearch(sample, "prazo")).toBe(true);
    expect(dealMatchesSearch(sample, "xyz")).toBe(false);
  });

  it("searches email, company and normalized phone digits", () => {
    const rich = deal({
      id: "d-rich",
      name: "Oportunidade X",
      pipelineId: "pipe",
      stageId: "s1",
      contact: {
        id: "c2",
        name: "João",
        email: "joao@empresa.com",
        phone: "(34) 99999-8877",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      company: {
        id: "co1",
        name: "Xingyu Comércio",
        tradeName: "Xingyu",
        legalName: "Xingyu LTDA",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });
    expect(dealMatchesSearch(rich, "JOAO@EMPRESA.COM")).toBe(true);
    expect(dealMatchesSearch(rich, "xingyu")).toBe(true);
    expect(dealMatchesSearch(rich, "999998877")).toBe(true);
    expect(dealMatchesSearch(rich, "  Oportunidade  ")).toBe(true);
  });

  it("preserves filters when filtering board", () => {
    const pipeline: Pipeline = {
      id: "pipe",
      name: "Novos",
      stages: [
        {
          id: "s1",
          name: "Novo",
          pipelineId: "pipe",
          position: 0,
          deals: [sample, deal({ id: "d2", name: "Sem conversa", pipelineId: "pipe", stageId: "s1" })],
        } as PipelineStage,
      ],
    };
    const filtered = filterPipelineBoard(pipeline, { filter: "unread", search: "amanda" });
    expect(filtered.stages?.[0]?.deals).toHaveLength(1);
    expect(filtered.stages?.[0]?.deals?.[0]?.id).toBe("d1");
  });
});

describe("stage move helpers", () => {
  const stages: PipelineStage[] = [
    {
      id: "s1",
      name: "A",
      pipelineId: "p",
      position: 0,
      deals: [deal({ id: "d1", name: "D", pipelineId: "p", stageId: "s1" })],
    } as PipelineStage,
    {
      id: "s2",
      name: "B",
      pipelineId: "p",
      position: 1,
      deals: [],
    } as PipelineStage,
  ];

  it("moves deal between stages", () => {
    const next = moveDealInStages(stages, "d1", "s2");
    expect(next[0]?.deals).toHaveLength(0);
    expect(next[1]?.deals?.[0]?.id).toBe("d1");
    expect(next[1]?.deals?.[0]?.stageId).toBe("s2");
  });

  it("rolls back by moving again to previous stage", () => {
    const moved = moveDealInStages(stages, "d1", "s2");
    const rolled = moveDealInStages(moved, "d1", "s1");
    expect(rolled[0]?.deals?.[0]?.id).toBe("d1");
  });

  it("patches card after send / mark read", () => {
    const patched = patchDealInStages(stages, "d1", {
      lastMessagePreview: "Olá",
      unreadCount: 0,
      awaitingReply: false,
    });
    expect(patched[0]?.deals?.[0]?.lastMessagePreview).toBe("Olá");
    expect(patched[0]?.deals?.[0]?.unreadCount).toBe(0);
  });
});

describe("navigation mode", () => {
  it("exposes full nav groups for reactivation", () => {
    expect(FULL_NAV_GROUPS.some((g) => g.items.some((i) => i.href === "/dashboard"))).toBe(true);
    expect(CORE_OPERATION_NAV_GROUPS).toHaveLength(1);
    expect(CORE_OPERATION_NAV_GROUPS[0]?.items.map((i) => i.href)).toEqual([
      "/pipelines",
      "/settings",
    ]);
  });

  it("keeps the compact sidebar separated into product areas", () => {
    expect(NAV_GROUPS.map((group) => group.label)).toEqual(["Visão geral", "Relacionamento", "Jornadas", "Gestão"]);
    expect(NAV_GROUPS.flatMap((group) => group.items).map((item) => item.href)).toEqual([
      "/dashboard",
      "/tasks",
      "/clients",
      "/pipelines",
      "/orders",
      "/finance",
    ]);
  });
});

describe("shouldHideGlobalHeader", () => {
  it("never hides header when beta single-pipeline mode is on", () => {
    expect(shouldHideGlobalHeader("/operacao", true, true)).toBe(false);
    expect(shouldHideGlobalHeader("/settings", true, true)).toBe(false);
  });

  it("hides header only on /operacao when core mode is on and beta is off", () => {
    expect(shouldHideGlobalHeader("/operacao", true, false)).toBe(true);
    expect(shouldHideGlobalHeader("/operacao/", true, false)).toBe(true);
    expect(shouldHideGlobalHeader("/settings", true, false)).toBe(false);
    expect(shouldHideGlobalHeader("/inbox", true, false)).toBe(false);
    expect(shouldHideGlobalHeader("/dashboard", true, false)).toBe(false);
  });

  it("keeps header when core mode is off", () => {
    expect(shouldHideGlobalHeader("/operacao", false, false)).toBe(false);
  });
});

describe("operation view helpers", () => {
  it("defaults missing or invalid view to kanban", () => {
    expect(parseOperationView(null)).toBe("kanban");
    expect(parseOperationView(undefined)).toBe("kanban");
    expect(parseOperationView("kanban")).toBe("kanban");
    expect(parseOperationView("conversations")).toBe("conversations");
    expect(parseOperationView("weird")).toBe("kanban");
  });

  it("removes no-conversation filter when entering conversations view", () => {
    expect(normalizeFilterForView("no-conversation", "conversations")).toBe("all");
    expect(normalizeFilterForView("unread", "conversations")).toBe("unread");
    expect(normalizeFilterForView("no-conversation", "kanban")).toBe(
      "no-conversation",
    );
  });

  it("finds deal by conversation id", () => {
    const pipeline: Pipeline = {
      id: "pipe",
      name: "P",
      stages: [
        {
          id: "s1",
          name: "Novo",
          pipelineId: "pipe",
          position: 0,
          deals: [
            deal({
              id: "d1",
              name: "Lead",
              pipelineId: "pipe",
              stageId: "s1",
              conversationId: "conv-1",
            }),
          ],
        },
      ],
    };
    expect(findDealByConversationId(pipeline, "conv-1")?.id).toBe("d1");
    expect(findDealByConversationId(pipeline, "missing")).toBeNull();
  });

  it("searches deals by contact name and phone", () => {
    const claudia = deal({
      id: "d1",
      name: "Lead",
      pipelineId: "pipe",
      stageId: "s1",
      contact: {
        id: "c1",
        name: "Cláudia Nunes",
        phone: "+556599900011",
        whatsapp: "+556599900011",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });
    expect(dealMatchesSearch(claudia, "Cláudia")).toBe(true);
    expect(dealMatchesSearch(claudia, "599900011")).toBe(true);
    expect(dealMatchesSearch(claudia, "Amanda")).toBe(false);
  });

  it("filters board by pipeline deals matching search", () => {
    const pipeline: Pipeline = {
      id: "pipe-novos",
      name: "Novos",
      stages: [
        {
          id: "s1",
          name: "Novo",
          pipelineId: "pipe-novos",
          position: 0,
          deals: [
            deal({
              id: "d1",
              name: "A",
              pipelineId: "pipe-novos",
              stageId: "s1",
              conversationId: "conv-1",
              contact: {
                id: "c1",
                name: "Letícia Araújo",
                createdAt: "2026-01-01T00:00:00.000Z",
              },
            }),
            deal({
              id: "d2",
              name: "B",
              pipelineId: "pipe-novos",
              stageId: "s1",
              conversationId: "conv-2",
              contact: {
                id: "c2",
                name: "Amanda Vieira",
                createdAt: "2026-01-01T00:00:00.000Z",
              },
            }),
          ],
        },
      ],
    };
    const filtered = filterPipelineBoard(pipeline, { search: "Letícia" });
    expect(filtered.stages?.[0]?.deals?.map((d) => d.id)).toEqual(["d1"]);
  });

  it("validates stage names", () => {
    expect(sanitizeStageName("  Nova   etapa  ")).toBe("Nova etapa");
    expect(isValidStageName("")).toBe(false);
    expect(isValidStageName("   ")).toBe(false);
    expect(isValidStageName("Proposta")).toBe(true);
    expect(isValidStageName("x".repeat(81))).toBe(false);
  });
});
