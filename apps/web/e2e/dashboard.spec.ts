import { expect, test } from "@playwright/test";

test.describe("Dashboard decision center", () => {
  test("loads dashboard blocks and grouped sidebar", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByTestId("dashboard-page")).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("heading", { name: "Visão geral da operação" }),
    ).toBeVisible();

    const nav = page.locator("div.hidden.lg\\:block aside nav").first();
    await expect(nav.getByText("Visão geral")).toBeVisible();
    await expect(nav.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await expect(page.getByText("Precisa da sua atenção")).toBeVisible();
    await expect(page.getByText("Funil comercial")).toBeVisible();
    await expect(page.getByLabel("Filtrar por período")).toBeVisible();
  });

  test("period filter can be changed without remounting the page", async ({ page }) => {
    test.setTimeout(60_000);
    const metrics30d = page.waitForResponse(
      (res) => {
        try {
          const url = new URL(res.url());
          return (
            url.pathname.includes("/dashboard/metrics") &&
            url.searchParams.get("period") === "30d"
          );
        } catch {
          return false;
        }
      },
      { timeout: 45_000 },
    );
    await page.goto("/dashboard");
    const dashboard = page.getByTestId("dashboard-page");
    await expect(dashboard).toBeVisible({ timeout: 30_000 });
    await metrics30d;
    await expect(dashboard).toHaveAttribute("data-period", "30d");

    const period = page.locator('select[aria-label="Filtrar por período"]');
    await expect(period).toHaveValue("30d");

    const metrics7d = page.waitForResponse((res) => {
      try {
        const url = new URL(res.url());
        return (
          url.pathname.includes("/dashboard/metrics") &&
          url.searchParams.get("period") === "7d"
        );
      } catch {
        return false;
      }
    });

    await period.selectOption("7d");
    await expect(dashboard).toHaveAttribute("data-period", "7d", { timeout: 15_000 });
    await expect(period).toHaveValue("7d");
    await metrics7d;

    await expect(dashboard).toBeVisible();
    await expect(page.getByRole("heading", { name: "Visão geral da operação" })).toBeVisible();
  });

  test("awaiting payment kpi is a real link", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByTestId("dashboard-page")).toBeVisible({ timeout: 30_000 });
    const link = page.getByRole("link", { name: /Aguardando pagamento/i }).first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", /\/pipelines/);
  });
});
