import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("dashboard visual analytics", () => {
  const charts = fs.readFileSync(path.join(__dirname, "analytics-charts.tsx"), "utf8");
  const dashboard = fs.readFileSync(path.join(__dirname, "dashboard-page.tsx"), "utf8");

  it("respects reduced motion for every chart animation", () => {
    expect(charts).toContain("prefers-reduced-motion: reduce");
    expect(charts).toContain("isAnimationActive={!reduced}");
    expect(charts).toContain("animationDuration");
  });

  it("keeps Goals between Team and Customers", () => {
    expect(dashboard.indexOf('value: "team"')).toBeLessThan(dashboard.indexOf('value: "goals"'));
    expect(dashboard.indexOf('value: "goals"')).toBeLessThan(
      dashboard.indexOf('value: "customers"'),
    );
  });
});
