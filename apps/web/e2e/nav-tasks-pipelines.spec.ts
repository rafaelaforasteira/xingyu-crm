import { expect, test } from "@playwright/test";

test("sidebar exposes Pipelines and the global Tasks module", async ({ page }) => {
  await page.goto("/tasks");
  const nav = page.getByTestId("sidebar-navigation");
  await expect(nav.getByRole("link", { name: "Pipelines" })).toBeVisible({ timeout: 20_000 });
  await expect(nav.getByRole("link", { name: "Tarefas" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Tarefas" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "Tarefas" })).toBeVisible();
  const labels = await nav.getByRole("link").allTextContents();
  const dashboardIndex = labels.findIndex((label) => label.includes("Dashboard"));
  const tasksIndex = labels.findIndex((label) => label.includes("Tarefas"));
  const pipelinesIndex = labels.findIndex((label) => label.includes("Pipelines"));
  expect(dashboardIndex).toBeGreaterThanOrEqual(0);
  expect(dashboardIndex).toBeLessThan(tasksIndex);
  expect(tasksIndex).toBeLessThan(pipelinesIndex);
  await expect(page.getByText("Organize e acompanhe as atividades da operação.")).toBeVisible();
});

test("global task center keeps operational filters shareable", async ({ page }) => {
  await page.goto("/tasks?scope=mine&due=today");
  await expect(page.getByRole("button", { name: "Minhas tarefas" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Hoje" })).toBeVisible();
  await page.getByLabel("Buscar tarefas").fill("pagamento");
  await expect(page).toHaveURL(/q=pagamento/, { timeout: 3_000 });
  await page.getByRole("button", { name: /Filtros/ }).click();
  await expect(page.getByText("Pipeline", { exact: true })).toBeVisible();
  await expect(page.getByText("Responsável", { exact: true })).toBeVisible();
  await expect(page.getByText("Status", { exact: true })).toBeVisible();
});
