import { describe, expect, it } from "vitest";
import { shouldHideTopBar } from "./feature-flags";

describe("shouldHideTopBar", () => {
  it("hides the top bar only on the pipelines list", () => {
    expect(shouldHideTopBar("/pipelines")).toBe(true);
    expect(shouldHideTopBar("/pipelines/")).toBe(true);
  });

  it("shows it inside a pipeline and everywhere else", () => {
    expect(shouldHideTopBar("/pipelines/pipe-comercial")).toBe(false);
    expect(shouldHideTopBar("/pipelines/pipe-comercial/settings/stages")).toBe(false);
    expect(shouldHideTopBar("/pipelines/access")).toBe(false);
    expect(shouldHideTopBar("/dashboard")).toBe(false);
    expect(shouldHideTopBar("/pipelinesx")).toBe(false);
    expect(shouldHideTopBar(null)).toBe(false);
  });
});
