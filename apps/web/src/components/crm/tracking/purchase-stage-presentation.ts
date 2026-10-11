/** Fixed volume thresholds; category and ranking never determine the color. */
export function getPurchaseDistributionColor(value: number) {
  if (value < 30) return "var(--tracking-data-red, #e63e46)";
  if (value < 50) return "var(--tracking-data-orange, #f28a20)";
  if (value < 80) return "var(--tracking-data-yellow, #f4c542)";
  if (value < 100) return "var(--tracking-data-blue, #3478f6)";
  return "var(--tracking-data-green, #5dd62c)";
}
