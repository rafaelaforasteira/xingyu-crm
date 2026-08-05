import { expect, test } from "@playwright/test";

test("main menu uses beta single-pipeline navigation", async ({ page }) => {
  await page.goto("/operacao");
  await expect(page.getByTestId("beta-nav-operation")).toBeVisible({
    timeout: 20_000,
  });
  const nav = page.getByTestId("beta-sidebar").locator("nav");
  await expect(nav.getByRole("link", { name: "Operação" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Configurações" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Conversas" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Pipelines" })).toHaveCount(0);
});

test("legacy module routes redirect to operação in beta mode", async ({ page }) => {
  await page.goto("/pipelines");
  await expect(page).toHaveURL(/\/operacao/, { timeout: 15_000 });
  await page.goto("/tasks");
  await expect(page).toHaveURL(/\/operacao/, { timeout: 15_000 });
});
