import { describe, expect, it } from "vitest";
import {
  BETA_SEARCH_ARIA_LABEL,
  BETA_SEARCH_PLACEHOLDER,
} from "./beta-config";

describe("beta header search copy", () => {
  it("uses the approved placeholder and aria-label", () => {
    expect(BETA_SEARCH_PLACEHOLDER).toBe(
      "Buscar contatos, deals e pedidos…",
    );
    expect(BETA_SEARCH_ARIA_LABEL).toBe(
      "Buscar contatos, deals e pedidos",
    );
    expect(BETA_SEARCH_PLACEHOLDER).not.toMatch(/⌘/);
    expect(BETA_SEARCH_PLACEHOLDER).not.toContain("⌘K");
  });
});
