import { expect, test } from "@playwright/test";

test.describe("Dashboard intelligence center", () => {
  test("renders all seven areas and keeps filters in the URL", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByTestId("dashboard-intelligence-center")).toBeVisible({
      timeout: 30_000,
    });
    for (const label of [
      "Visão geral",
      "Comercial",
      "Atendimento",
      "Equipe",
      "Metas",
      "Clientes",
      "Canais",
    ]) {
      await expect(page.getByRole("button", { name: label })).toBeVisible();
    }
    await page.getByRole("button", { name: "Atendimento" }).click();
    await expect(page).toHaveURL(/tab=attendance/);
    await page.locator("select").first().selectOption("7d");
    await expect(page).toHaveURL(/period=7d/);
    await page.getByRole("button", { name: "Equipe" }).click();
    await expect(page).toHaveURL(/tab=team.*period=7d|period=7d.*tab=team/);
  });

  test("keeps Dashboard above Pipelines and Tasks", async ({ page }) => {
    await page.goto("/dashboard");
    const links = page.getByTestId("sidebar-navigation").getByRole("link");
    await expect(links.filter({ hasText: "Dashboard" })).toHaveAttribute("aria-current", "page");
    await expect(links.filter({ hasText: "Pipelines" })).toBeVisible();
    await expect(links.filter({ hasText: "Tarefas" })).toBeVisible();
  });
});
