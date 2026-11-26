import { describe, expect, it } from "vitest";
import { shouldHideTopBar } from "./feature-flags";

describe("shouldHideTopBar", () => {
  it("hides the top bar across the pipelines area", () => {
    expect(shouldHideTopBar("/pipelines")).toBe(true);
    expect(shouldHideTopBar("/pipelines/pipe-comercial")).toBe(true);
    expect(shouldHideTopBar("/pipelines/access")).toBe(true);
  });

  it("keeps it everywhere else", () => {
    expect(shouldHideTopBar("/dashboard")).toBe(false);
    expect(shouldHideTopBar("/pipelinesx")).toBe(false);
    expect(shouldHideTopBar(null)).toBe(false);
  });
});
