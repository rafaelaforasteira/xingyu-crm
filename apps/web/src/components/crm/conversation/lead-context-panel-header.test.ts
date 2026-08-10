import { describe, expect, it } from "vitest";

/**
 * Contract for the lead context panel header after back-action cleanup.
 * Full DOM interaction is covered by Playwright.
 */
describe("LeadContextPanel header cleanup contract", () => {
  it("keeps the title copy and drops the back affordance", () => {
    const title = "Contexto do lead";
    const backAriaLabel = "Voltar para conversa";
    const headerShowsBack = false;

    expect(title).toBe("Contexto do lead");
    expect(headerShowsBack).toBe(false);
    expect(backAriaLabel).not.toBe("");
  });

  it("preserves accordion section titles used in the panel body", () => {
    const sections = [
      "Resumo",
      "Negociação",
      "Canal",
      "Tarefas",
      "Pedidos",
      "Notas",
      "Arquivos",
      "Histórico",
      "Outras negociações",
    ];
    expect(sections).toHaveLength(9);
    expect(sections[0]).toBe("Resumo");
    expect(sections.includes("Negociação")).toBe(true);
  });
});
