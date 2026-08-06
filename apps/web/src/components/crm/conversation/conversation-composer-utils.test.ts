import { describe, expect, it } from "vitest";
import {
  computeComposerTextareaSize,
  MAX_COMPOSER_TEXTAREA_HEIGHT,
  MIN_COMPOSER_TEXTAREA_HEIGHT,
} from "./conversation-composer-utils";

describe("computeComposerTextareaSize", () => {
  it("uses minimum for empty/single-line heights", () => {
    expect(computeComposerTextareaSize(20)).toEqual({
      height: MIN_COMPOSER_TEXTAREA_HEIGHT,
      overflowY: "hidden",
    });
    expect(computeComposerTextareaSize(44)).toEqual({
      height: MIN_COMPOSER_TEXTAREA_HEIGHT,
      overflowY: "hidden",
    });
  });

  it("grows between min and max without scroll", () => {
    expect(computeComposerTextareaSize(96)).toEqual({
      height: 96,
      overflowY: "hidden",
    });
  });

  it("caps at max and enables overflow", () => {
    expect(computeComposerTextareaSize(240)).toEqual({
      height: MAX_COMPOSER_TEXTAREA_HEIGHT,
      overflowY: "auto",
    });
  });

  it("treats invalid scrollHeight as minimum", () => {
    expect(computeComposerTextareaSize(Number.NaN)).toEqual({
      height: MIN_COMPOSER_TEXTAREA_HEIGHT,
      overflowY: "hidden",
    });
  });
});
