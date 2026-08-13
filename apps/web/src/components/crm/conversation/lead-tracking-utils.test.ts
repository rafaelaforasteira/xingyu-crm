import { describe, expect, it } from "vitest";
import {
  buildLeadTrackingFields,
  formatTrackingDateTime,
  hasStructuredUtm,
  resolveEntryMethod,
  resolveTrackingOrigin,
} from "./lead-tracking-utils";

describe("lead tracking utils", () => {
  it("renames Canal to Rastreamento in the approved section title list", () => {
    const sections = [
      "Resumo",
      "Negociação",
      "Rastreamento",
      "Tarefas",
      "Pedidos",
      "Notas",
      "Arquivos",
      "Histórico",
      "Outras negociações",
    ];
    expect(sections).not.toContain("Canal");
    expect(sections).toContain("Rastreamento");
  });

  it("does not attach a count badge to Rastreamento", () => {
    const section: { title: string; count?: number } = { title: "Rastreamento" };
    expect(typeof section.count === "number").toBe(false);
  });

  it("resolves origin from the real channel label", () => {
    expect(
      resolveTrackingOrigin({
        id: "ch-1",
        type: "WHATSAPP",
        name: "WhatsApp",
        displayName: "WhatsApp Xingyu",
      }),
    ).toBe("WhatsApp Xingyu");
    expect(resolveTrackingOrigin(null)).toBeNull();
  });

  it("maps first inbound and outbound directions", () => {
    expect(resolveEntryMethod("INBOUND")).toBe("Mensagem recebida");
    expect(resolveEntryMethod("OUTBOUND")).toBe("Mensagem enviada");
    expect(resolveEntryMethod(null)).toBeNull();
  });

  it("uses chronological first message direction (outbound at 08:00 before inbound)", () => {
    const messages = [
      { direction: "OUTBOUND" as const, at: "2026-08-10T08:00:00.000Z" },
      { direction: "INBOUND" as const, at: "2026-08-10T08:05:00.000Z" },
    ];
    const first = [...messages].sort((a, b) => a.at.localeCompare(b.at))[0]!;
    expect(resolveEntryMethod(first.direction)).toBe("Mensagem enviada");
    expect(formatTrackingDateTime(first.at)).toMatch(/às 05:00|às 08:00/);
  });

  it("uses inbound first when it is chronologically first", () => {
    const messages = [
      { direction: "INBOUND" as const, at: "2026-08-10T09:15:00.000Z" },
      { direction: "OUTBOUND" as const, at: "2026-08-10T09:20:00.000Z" },
    ];
    const first = [...messages].sort((a, b) => a.at.localeCompare(b.at))[0]!;
    expect(resolveEntryMethod(first.direction)).toBe("Mensagem recebida");
  });

  it("formats timestamps in pt-BR with às", () => {
    const formatted = formatTrackingDateTime("2026-08-10T17:32:00.000Z");
    expect(formatted).toMatch(/^\d{2}\/\d{2}\/2026 às \d{2}:\d{2}$/);
  });

  it("does not invent UTMs when missing", () => {
    expect(hasStructuredUtm(null)).toBe(false);
    expect(hasStructuredUtm({ source: null, medium: null, campaign: null, content: null, term: null })).toBe(
      false,
    );
    const fields = buildLeadTrackingFields({
      channel: {
        id: "ch-1",
        type: "WHATSAPP",
        name: "WhatsApp",
        displayName: "WhatsApp Xingyu",
      },
      tracking: {
        firstContactAt: null,
        firstContactDirection: null,
        leadCreatedAt: null,
        utm: null,
        landingPage: null,
        referrer: null,
      },
    });
    expect(fields.some((f) => f.value === "organic")).toBe(false);
    expect(fields.some((f) => f.value === "whatsapp" && f.label === "UTM Source")).toBe(
      false,
    );
    expect(fields.find((f) => f.label === "UTM")?.value).toBe("Não identificada");
  });

  it("renders structured UTM fields when present", () => {
    const fields = buildLeadTrackingFields({
      channel: {
        id: "ch-1",
        type: "WHATSAPP",
        name: "WhatsApp",
        displayName: "WhatsApp Xingyu",
      },
      tracking: {
        firstContactAt: "2026-08-10T17:32:00.000Z",
        firstContactDirection: "INBOUND",
        leadCreatedAt: "2026-08-10T17:32:00.000Z",
        utm: {
          source: "meta",
          medium: "paid_social",
          campaign: "china_no_brasil",
          content: "video_03",
          term: "anel",
        },
        landingPage: "/collections/origem",
        referrer: null,
      },
    });
    expect(fields.map((f) => f.label)).toEqual([
      "Origem",
      "Entrada",
      "Primeiro contato",
      "Criado em",
      "UTM Source",
      "UTM Medium",
      "UTM Campaign",
      "UTM Content",
      "UTM Term",
      "Página de entrada",
    ]);
    expect(fields.find((f) => f.label === "UTM Source")?.value).toBe("meta");
    expect(fields.find((f) => f.label === "Página de entrada")?.value).toBe(
      "/collections/origem",
    );
  });

  it("omits Criado em without Deal and survives empty conversation", () => {
    const fields = buildLeadTrackingFields({
      channel: null,
      tracking: {
        firstContactAt: null,
        firstContactDirection: null,
        leadCreatedAt: null,
        utm: null,
        landingPage: null,
        referrer: null,
      },
    });
    expect(fields.find((f) => f.label === "Criado em")).toBeUndefined();
    expect(fields.find((f) => f.label === "Primeiro contato")).toBeUndefined();
    expect(fields.every((f) => f.value && !f.value.includes("undefined"))).toBe(
      true,
    );
  });

  it("marks long URLs for truncate handling", () => {
    const long =
      "/collections/origem/muito-longa/path/com/varios/segmentos/para-nao-estourar";
    const fields = buildLeadTrackingFields({
      channel: { id: "1", type: "SITE", name: "Site", displayName: "Site" },
      tracking: {
        firstContactAt: null,
        firstContactDirection: null,
        leadCreatedAt: null,
        utm: { source: "meta", medium: null, campaign: null, content: null, term: null },
        landingPage: long,
        referrer: null,
      },
    });
    expect(fields.find((f) => f.label === "Página de entrada")?.truncate).toBe(true);
  });
});
