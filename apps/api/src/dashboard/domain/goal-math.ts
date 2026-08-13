export type GoalPace = {
  actual: number;
  target: number;
  progressPct: number;
  remaining: number;
  exceeded: number;
  daysElapsed: number;
  daysRemaining: number;
  requiredPerDay: number | null;
  expectedToDate: number;
  pace: "AHEAD" | "ON_TRACK" | "BEHIND";
};

const DAY = 86_400_000;

export function calculateGoalPace(
  actual: number,
  target: number,
  periodStart: Date,
  periodEnd: Date,
  now = new Date(),
): GoalPace {
  const totalDays = Math.max(1, Math.ceil((periodEnd.getTime() - periodStart.getTime()) / DAY));
  const elapsed = Math.min(
    totalDays,
    Math.max(
      0,
      Math.ceil((Math.min(now.getTime(), periodEnd.getTime()) - periodStart.getTime()) / DAY),
    ),
  );
  const remainingDays = Math.max(0, totalDays - elapsed);
  const remaining = Math.max(0, target - actual);
  const expectedToDate = (target * elapsed) / totalDays;
  const ratio = expectedToDate > 0 ? actual / expectedToDate : actual > 0 ? 2 : 1;
  return {
    actual,
    target,
    progressPct: target > 0 ? Math.round((actual / target) * 1000) / 10 : 0,
    remaining,
    exceeded: Math.max(0, actual - target),
    daysElapsed: elapsed,
    daysRemaining: remainingDays,
    requiredPerDay: remainingDays > 0 ? remaining / remainingDays : remaining > 0 ? null : 0,
    expectedToDate: Math.round(expectedToDate * 100) / 100,
    pace: ratio >= 1.05 ? "AHEAD" : ratio >= 0.95 ? "ON_TRACK" : "BEHIND",
  };
}

export function buildGoalCurve(
  target: number,
  periodStart: Date,
  periodEnd: Date,
  actualByDay: Array<{ date: Date; value: number }>,
) {
  const totalDays = Math.max(1, Math.ceil((periodEnd.getTime() - periodStart.getTime()) / DAY));
  let cumulative = 0;
  const values = new Map(
    actualByDay.map((row) => [row.date.toISOString().slice(0, 10), row.value]),
  );
  return Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(periodStart.getTime() + index * DAY);
    cumulative += values.get(date.toISOString().slice(0, 10)) ?? 0;
    return {
      date: date.toISOString().slice(0, 10),
      expected: Math.round((target * (index + 1) * 100) / totalDays) / 100,
      actual: Math.round(cumulative * 100) / 100,
    };
  });
}
