import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("dashboard visual analytics", () => {
  const charts = fs.readFileSync(path.join(__dirname, "analytics-charts.tsx"), "utf8");
  const dashboardTabs = fs.readFileSync(path.join(__dirname, "dashboard-tabs.tsx"), "utf8");

  it("respects reduced motion for every chart animation", () => {
    expect(charts).toContain("prefers-reduced-motion: reduce");
    expect(charts).toContain("isAnimationActive={!reduced}");
    expect(charts).toContain("animationDuration");
  });

  it("keeps Goals between Team and Customers", () => {
    expect(dashboardTabs.indexOf('value: "team"')).toBeLessThan(
      dashboardTabs.indexOf('value: "goals"'),
    );
    expect(dashboardTabs.indexOf('value: "goals"')).toBeLessThan(
      dashboardTabs.indexOf('value: "customers"'),
    );
  });

  it("keeps the sliding tabs accessible and respects reduced motion", () => {
    expect(dashboardTabs).toContain('role="tablist"');
    expect(dashboardTabs).toContain('role="tab"');
    expect(dashboardTabs).toContain("aria-selected={active}");
    expect(dashboardTabs).toContain("motion-reduce:transition-none");
  });
});
