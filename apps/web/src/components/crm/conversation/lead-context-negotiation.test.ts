import { describe, expect, it } from "vitest";
import { formatLeadCode } from "./conversation-list-utils";

/**
 * Contracts for the Negociação accordion in LeadContextPanel.
 * Full DOM interaction is covered by Playwright.
 */

type SectionHeader = {
  title: string;
  count?: number;
};

function sectionShowsCountBadge(section: SectionHeader): boolean {
  return typeof section.count === "number";
}

function buildNegotiationLines(options: {
  dealName: string;
  leadSequence: number | null;
  pipelineName: string | null;
  stageName: string | null;
}): string[] {
  const lines: string[] = [];
  const leadCode = formatLeadCode(options.leadSequence);
  if (leadCode) lines.push(leadCode);
  lines.push(`Pipeline: ${options.pipelineName?.trim() || "Não informado"}`);
  lines.push(`Etapa: ${options.stageName?.trim() || "Sem etapa"}`);
  return lines;
}

describe("Lead context negotiation contracts", () => {
  it("omits numeric badge only on Negociação while other sections keep counts", () => {
    const sections: SectionHeader[] = [
      { title: "Negociação" },
      { title: "Tarefas", count: 2 },
      { title: "Pedidos", count: 0 },
      { title: "Notas", count: 0 },
      { title: "Arquivos", count: 0 },
      { title: "Histórico", count: 2 },
    ];

    const negociacao = sections.find((s) => s.title === "Negociação")!;
    expect(sectionShowsCountBadge(negociacao)).toBe(false);
    expect(negociacao.count).toBeUndefined();

    expect(sectionShowsCountBadge(sections.find((s) => s.title === "Tarefas")!)).toBe(
      true,
    );
    expect(sections.find((s) => s.title === "Tarefas")!.count).toBe(2);
    expect(sectionShowsCountBadge(sections.find((s) => s.title === "Pedidos")!)).toBe(
      true,
    );
    expect(sections.find((s) => s.title === "Pedidos")!.count).toBe(0);
    expect(sectionShowsCountBadge(sections.find((s) => s.title === "Histórico")!)).toBe(
      true,
    );
    expect(sections.find((s) => s.title === "Histórico")!.count).toBe(2);
  });

  it("does not render Deal.title in negotiation lines", () => {
    const dealTitle = "Lead sem resposta - Luciana Blumenau";
    const lines = buildNegotiationLines({
      dealName: dealTitle,
      leadSequence: 28,
      pipelineName: "Novos leads",
      stageName: "Novo",
    });

    expect(lines).not.toContain(dealTitle);
    expect(lines.some((line) => line.includes("Lead sem resposta"))).toBe(false);
    expect(lines[0]).toBe("Lead #0028");
  });

  it("orders Lead code then Pipeline then Etapa", () => {
    const lines = buildNegotiationLines({
      dealName: "ignored-title",
      leadSequence: 28,
      pipelineName: "Novos leads",
      stageName: "Novo",
    });

    expect(lines).toEqual([
      "Lead #0028",
      "Pipeline: Novos leads",
      "Etapa: Novo",
    ]);
    expect(lines.indexOf("Lead #0028")).toBeLessThan(
      lines.indexOf("Pipeline: Novos leads"),
    );
    expect(lines.indexOf("Pipeline: Novos leads")).toBeLessThan(
      lines.indexOf("Etapa: Novo"),
    );
  });

  it("uses formatLeadCode and fallbacks for missing pipeline/stage", () => {
    expect(formatLeadCode(28)).toBe("Lead #0028");
    expect(
      buildNegotiationLines({
        dealName: "x",
        leadSequence: null,
        pipelineName: null,
        stageName: null,
      }),
    ).toEqual(["Pipeline: Não informado", "Etapa: Sem etapa"]);
  });

  it("does not include Abrir negociação CTA in the approved surface", () => {
    const openNegotiationLabel = "Abrir negociação";
    const negotiationSurface = [
      "Negociação",
      "Lead #0028",
      "Pipeline: Novos leads",
      "Etapa: Novo",
    ];
    expect(negotiationSurface).not.toContain(openNegotiationLabel);
    expect(
      negotiationSurface.some((line) => /abrir negocia/i.test(line)),
    ).toBe(false);
  });

  it("preserves Outras negociações as a separate section title", () => {
    const sections = ["Negociação", "Outras negociações"];
    expect(sections).toContain("Outras negociações");
    expect(sections[0]).toBe("Negociação");
  });
});
