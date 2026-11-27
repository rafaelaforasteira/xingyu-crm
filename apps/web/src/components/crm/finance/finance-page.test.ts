import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("finance workspace contract", () => {
  const source = readFileSync(new URL("./finance-page.tsx", import.meta.url), "utf8");

  it("keeps the accounting workspace focused on financial information", () => {
    expect(source).toContain("Receitas");
    expect(source).toContain("Contas a receber");
    expect(source).toContain("Comissões");
    expect(source).toContain("Conciliação e fechamento");
    expect(source).not.toContain("Histórico do cliente");
  });

  it("does not invent commission percentages when no rule exists", () => {
    expect(source).toContain("Nenhum percentual foi presumido");
    expect(source).toContain("Regra pendente");
  });

  it("offers an accounting CSV export", () => {
    expect(source).toContain("Exportar CSV");
    expect(source).toContain("financeiro-${tab}");
  });
});
