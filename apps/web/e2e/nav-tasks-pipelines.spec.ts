import { expect, test } from "@playwright/test";

test("main menu uses simplified operation navigation", async ({ page }) => {
  await page.goto("/operacao");
  const nav = page.locator("div.hidden.lg\\:block aside nav").first();
  await expect(nav.getByRole("link", { name: "Operação" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Configurações" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Conversas" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Pipelines" })).toHaveCount(0);
});

test("legacy routes remain reachable outside the simplified menu", async ({ page }) => {
  await page.goto("/pipelines");
  await expect(page.getByRole("heading", { name: /pipeline/i })).toBeVisible({
    timeout: 20_000,
  });
});

test("tasks board groups by custom status and creates a task", async ({ page }) => {
  await page.goto("/tasks");
  await expect(page.getByTestId("tasks-page")).toBeVisible();
  await expect(page.getByTestId(/task-group-/).first()).toBeVisible({
    timeout: 20_000,
  });

  await page.getByRole("button", { name: "Nova tarefa" }).click();
  const title = `E2E task ${Date.now()}`;
  await page.getByLabel("Nome").fill(title);
  await page.getByTestId("tasks-page").getByRole("button", { name: "Criar", exact: true }).click();
  await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 });
});
