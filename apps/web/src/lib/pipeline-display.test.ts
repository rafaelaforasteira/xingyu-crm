import { describe, expect, it } from "vitest";
import { displayPipelineName } from "./pipeline-display";

describe("displayPipelineName", () => {
  it("softens names saved in all caps", () => {
    expect(displayPipelineName("COMERCIAL PRINCIPAL")).toBe("Comercial Principal");
    expect(displayPipelineName("PÓS-VENDA")).toBe("Pós-venda");
    expect(displayPipelineName("FUNIL DE VENDAS")).toBe("Funil de Vendas");
  });

  it("keeps names that already use mixed case", () => {
    expect(displayPipelineName("Novos leads B2B")).toBe("Novos leads B2B");
  });

  it("leaves names without letters untouched", () => {
    expect(displayPipelineName("2026")).toBe("2026");
  });
});
