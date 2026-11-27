import { buildGoalCurve, calculateGoalPace } from "./goal-math";

describe("goal math", () => {
  const start = new Date("2026-08-01T00:00:00.000Z");
  const end = new Date("2026-09-01T00:00:00.000Z");

  it("calculates progress, remaining and expected pace without forecasting", () => {
    const result = calculateGoalPace(60, 100, start, end, new Date("2026-08-16T00:00:00.000Z"));
    expect(result.progressPct).toBe(60);
    expect(result.remaining).toBe(40);
    expect(result.expectedToDate).toBeCloseTo(48.39, 2);
    expect(result.pace).toBe("AHEAD");
  });

  it("preserves actual cumulative values in the goal curve", () => {
    const curve = buildGoalCurve(310, start, end, [
      { date: start, value: 4 },
      { date: new Date("2026-08-02T00:00:00.000Z"), value: 6 },
    ]);
    expect(curve).toHaveLength(31);
    expect(curve[1]).toEqual({ date: "2026-08-02", expected: 20, actual: 10 });
  });
});
