import { expect, test } from "@playwright/test";

test("main menu uses grouped navigation blocks", async ({ page }) => {
  await page.goto("/dashboard");
  const nav = page.locator("div.hidden.lg\\:block aside nav").first();
  await expect(nav.getByRole("link", { name: "Dashboard" })).toBeVisible();

  await expect(nav.getByText("Visão geral")).toBeVisible();
  await expect(nav.getByText("Jornadas")).toBeVisible();
  await expect(nav.getByText("Gestão")).toBeVisible();

  await expect(nav.getByRole("link", { name: "Conversas" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Negócios" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Tarefas" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Recompra" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Reativação" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "E-commerce" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Pós-venda" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Contatos" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Relatórios" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Configurações" })).toBeVisible();
});

test("pipelines submenu shows enumerated uppercase items and todos os leads", async ({
  page,
}) => {
  await page.goto("/dashboard");
  const sidebar = page.locator("div.hidden.lg\\:block aside").first();
  await sidebar.getByRole("button", { name: /Expandir pipelines|Recolher pipelines/i }).click();
  await expect(sidebar.getByText(/TODOS OS LEADS/i)).toBeVisible({ timeout: 15_000 });
  await expect(sidebar.getByText(/\d{2}\.\s+/).first()).toBeVisible();
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
  await page.getByRole("button", { name: "Criar" }).click();
  await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 });
});
