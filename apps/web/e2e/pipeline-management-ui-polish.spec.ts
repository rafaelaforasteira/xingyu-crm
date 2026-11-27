import { expect, test } from "@playwright/test";

test("pipeline management menu and visual identity form", async ({ page }) => {
  await page.goto("/pipelines");
  const card = page.getByTestId("pipeline-card").first();
  await expect(card).toBeVisible();

  const actions = card.getByRole("button", { name: /Ações do pipeline/i });
  await actions.click();
  for (const name of ["Editar", "Canais", "Duplicar", "Arquivar", "Excluir"]) {
    await expect(page.getByRole("menuitem", { name, exact: true })).toBeVisible();
  }
  for (const name of ["Abrir", "Configurar", "Etapas"]) {
    await expect(page.getByRole("menuitem", { name, exact: true })).toHaveCount(0);
  }

  // Clicar fora fecha o menu sem abrir o pipeline.
  await page.mouse.click(5, 5);
  await expect(page.getByRole("menuitem", { name: "Editar", exact: true })).toHaveCount(0);
  await expect(page).toHaveURL(/\/pipelines$/);

  await actions.click();
  await page.getByRole("menuitem", { name: "Editar", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Editar pipeline" })).toBeVisible();
  await expect(page.getByText("Identidade visual", { exact: true })).toBeVisible();
  await expect(page.getByText(/\/80$/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Escolher ícone do pipeline" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Adicionar aos favoritos|Remover dos favoritos/ })).toHaveAttribute("aria-pressed", /true|false/);

  await page.getByRole("button", { name: "Escolher ícone do pipeline" }).click();
  await expect(page.getByRole("dialog", { name: "Escolher ícone do pipeline" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Metas" })).toBeVisible();
});
