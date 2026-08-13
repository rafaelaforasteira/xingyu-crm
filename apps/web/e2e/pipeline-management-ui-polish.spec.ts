import { expect, test } from "@playwright/test";

test("pipeline management menu and visual identity form", async ({ page }) => {
  await page.goto("/pipelines");
  const card = page.getByTestId("pipeline-card").first();
  await expect(card).toBeVisible();

  await card.getByLabel(/Ações do pipeline/i).click();
  await expect(page.getByRole("menuitem", { name: "Abrir", exact: true })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Configurar", exact: true })).toHaveAttribute("href", /\/pipelines\/access\?pipelineId=/);
  await expect(page.getByRole("menuitem", { name: "Etapas", exact: true })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Canais", exact: true })).toBeVisible();

  await page.getByRole("menuitem", { name: "Editar", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Editar pipeline" })).toBeVisible();
  await expect(page.getByText("Identidade visual", { exact: true })).toBeVisible();
  await expect(page.getByText(/\/140$/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Escolher ícone do pipeline" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Adicionar aos favoritos|Remover dos favoritos/ })).toHaveAttribute("aria-pressed", /true|false/);

  await page.getByRole("button", { name: "Escolher ícone do pipeline" }).click();
  await expect(page.getByRole("dialog", { name: "Escolher ícone do pipeline" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Metas" })).toBeVisible();
});
