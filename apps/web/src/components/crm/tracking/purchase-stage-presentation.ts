/** The accent identifies recurrent purchases, independent of volume or rank. */
export function purchaseStageFill(stage: string) {
  return stage === "6ª+"
    ? "var(--tracking-data-green, #5dd62c)"
    : "var(--purchase-stage-base, var(--tracking-data-charcoal, #3b3f42))";
}
