import { describe, expect, it } from "vitest";
import {
  ALL_SECTIONS_OPEN,
  CONTEXT_SECTION_IDS,
  mergeStoredSectionState,
  toggleContextSection,
} from "./lead-context-sections";

describe("lead context section preferences", () => {
  it("opens every section by default", () => {
    expect(CONTEXT_SECTION_IDS.every((id) => ALL_SECTIONS_OPEN[id])).toBe(true);
  });

  it("preserves closed session sections and defaults new ones to open", () => {
    const merged = mergeStoredSectionState({ orders: false, files: false });
    expect(merged.orders).toBe(false);
    expect(merged.files).toBe(false);
    expect(merged.history).toBe(true);
    expect(toggleContextSection(merged, "orders").orders).toBe(true);
  });
});
