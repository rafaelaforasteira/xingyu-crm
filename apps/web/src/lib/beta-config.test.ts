import { describe, expect, it } from "vitest";
import {
  BETA_PIPELINE_ID,
  buildBetaConversationsHref,
  buildBetaKanbanHref,
  isBetaBlockedPath,
  parseBetaView,
} from "./beta-config";

describe("beta-config", () => {
  it("defaults view to kanban", () => {
    expect(parseBetaView(null)).toBe("kanban");
    expect(parseBetaView(undefined)).toBe("kanban");
    expect(parseBetaView("kanban")).toBe("kanban");
    expect(parseBetaView("invalid")).toBe("kanban");
  });

  it("parses conversations view", () => {
    expect(parseBetaView("conversations")).toBe("conversations");
  });

  it("uses fixed beta pipeline id", () => {
    expect(BETA_PIPELINE_ID).toBeTruthy();
    expect(typeof BETA_PIPELINE_ID).toBe("string");
  });

  it("builds kanban and conversations URLs without pipeline param", () => {
    expect(buildBetaKanbanHref()).toBe("/operacao?view=kanban");
    expect(buildBetaKanbanHref("deal-1")).toBe(
      "/operacao?view=kanban&deal=deal-1",
    );
    expect(buildBetaConversationsHref()).toBe(
      "/operacao?view=conversations",
    );
    expect(buildBetaConversationsHref("conv-1")).toBe(
      "/operacao?view=conversations&conversation=conv-1",
    );
  });

  it("preserves search query in beta hrefs", () => {
    expect(buildBetaKanbanHref(null, { q: " maria " })).toBe(
      "/operacao?view=kanban&q=maria",
    );
    expect(buildBetaKanbanHref("deal-1", { q: "maria" })).toBe(
      "/operacao?view=kanban&deal=deal-1&q=maria",
    );
    expect(buildBetaConversationsHref("conv-1", { q: "maria" })).toBe(
      "/operacao?view=conversations&conversation=conv-1&q=maria",
    );
  });

  it("blocks hidden module paths and allows operacao/login", () => {
    expect(isBetaBlockedPath("/dashboard")).toBe(true);
    expect(isBetaBlockedPath("/pipelines")).toBe(true);
    expect(isBetaBlockedPath("/pipelines/pipe-novos")).toBe(true);
    expect(isBetaBlockedPath("/inbox")).toBe(true);
    expect(isBetaBlockedPath("/contacts")).toBe(true);
    expect(isBetaBlockedPath("/settings")).toBe(true);
    expect(isBetaBlockedPath("/tasks")).toBe(true);
    expect(isBetaBlockedPath("/operacao")).toBe(false);
    expect(isBetaBlockedPath("/operacao/")).toBe(false);
    expect(isBetaBlockedPath("/login")).toBe(false);
  });
});
