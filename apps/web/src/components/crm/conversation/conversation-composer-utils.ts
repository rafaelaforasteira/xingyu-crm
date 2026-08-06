export const MIN_COMPOSER_TEXTAREA_HEIGHT = 44;
export const MAX_COMPOSER_TEXTAREA_HEIGHT = 160;

export type ComposerResizeResult = {
  height: number;
  overflowY: "hidden" | "auto";
};

/**
 * Pure height calculation for the composer textarea.
 * Pass measured scrollHeight after resetting height to "auto"/0.
 */
export function computeComposerTextareaSize(
  scrollHeight: number,
  minHeight: number = MIN_COMPOSER_TEXTAREA_HEIGHT,
  maxHeight: number = MAX_COMPOSER_TEXTAREA_HEIGHT,
): ComposerResizeResult {
  const measured = Number.isFinite(scrollHeight) ? scrollHeight : minHeight;
  const height = Math.min(Math.max(measured, minHeight), maxHeight);
  return {
    height,
    overflowY: measured > maxHeight ? "auto" : "hidden",
  };
}
