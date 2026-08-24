import { expect, test } from "@playwright/test";

test.describe("Settings teams block", () => {
  test("renders refined team cards and can create then archive a fixture team", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto("/settings");
    const teams = page.locator("[data-settings-block='teams']");
    await expect(teams).toBeVisible({ timeout: 30_000 });
    await teams.scrollIntoViewIfNeeded();
    await expect(teams.getByText("Organize os usuários por equipe e responsabilidade.")).toHaveCount(0);
    await expect(teams.getByRole("button", { name: "Criar equipe" })).toBeVisible();
    await expect(teams.getByRole("button", { name: "Gerenciar", exact: true })).toHaveCount(0);

    const name = `E2E Equipe ${Date.now()}`;
    await teams.getByRole("button", { name: "Criar equipe" }).click();
    await page.locator("#team-name").fill(name);
    await page.locator("#team-desc").fill("Equipe temporária de validação.");
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(teams.getByText(name, { exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("#team-name")).toHaveCount(0);
    const card = teams.locator("article").filter({ hasText: name });
    await expect(card.getByText("Equipe temporária de validação.")).toBeVisible();
    await expect(card.getByText("Nenhum membro")).toBeVisible();

    await expect(card.getByRole("button", { name: `Gerenciar equipe ${name}` })).toBeVisible();
    await expect(card.getByRole("button", { name: `Adicionar membros à equipe ${name}` })).toBeVisible();

    await card.getByRole("button", { name: `Gerenciar equipe ${name}` }).click();
    await expect(page.getByRole("menuitem", { name: "Editar equipe" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Gerenciar membros" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Arquivar equipe" })).toBeVisible();
    await page.keyboard.press("Escape");

    await card.getByRole("button", { name: `Adicionar membros à equipe ${name}` }).click();
    await expect(
      page.getByRole("heading", { name: `Adicionar membros à equipe ${name}` }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("menuitem", { name: "Editar equipe" })).toHaveCount(0);
    await page.getByRole("button", { name: "Cancelar" }).click();

    await card.getByRole("button", { name: `Gerenciar equipe ${name}` }).click();
    await page.getByRole("menuitem", { name: "Arquivar equipe" }).click();
    await expect(page.getByRole("heading", { name: `Arquivar ${name}?` })).toBeVisible();
    await page.getByRole("button", { name: "Arquivar equipe" }).last().click();
    await expect(teams.getByText(name, { exact: true })).toHaveCount(0, { timeout: 20_000 });
  });
});
