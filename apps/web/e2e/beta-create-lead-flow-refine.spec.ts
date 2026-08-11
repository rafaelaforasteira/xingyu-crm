import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const SCREENSHOT_DIR = path.join(__dirname, ".beta-screenshots", "create-lead-flow-refine");

test.describe("Refined manual lead creation", () => {
  test.setTimeout(120_000);

  test("creates and reuses a contact, then blocks an active duplicate", async ({ page }) => {
    await fs.promises.mkdir(SCREENSHOT_DIR, { recursive: true });
    const suffix = String(Date.now()).slice(-8);
    const phone = `47${suffix}`;
    const contactName = `Contato E2E ${suffix}`;

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/operacao?view=kanban");
    await page.getByRole("button", { name: "Criar lead" }).click();
    const form = page.getByTestId("create-lead-form");
    await expect(form).toBeVisible();
    await expect(form.getByLabel("Nome *")).toBeVisible();
    await expect(form.getByLabel("Etapa")).not.toHaveValue("");
    await form.getByLabel("Telefone *").fill(phone);
    await expect(form.getByText(/Nenhum contato encontrado/)).toBeVisible({ timeout: 15_000 });
    await form.getByLabel("Nome *").fill(contactName);
    await form.getByLabel("Valor estimado").fill("275.50");
    await form.getByLabel("Origem informada").selectOption({ label: "Indicação" });
    await form.getByRole("button", { name: /Adicionar anotação/ }).click();
    await form.getByLabel("Anotação inicial").fill("Nota inicial criada pelo fluxo E2E.");
    await form.getByRole("button", { name: /Adicionar tarefa/ }).click();
    await form.getByLabel("Título da tarefa").fill("Retornar contato E2E");
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "new-contact-both-expanded-1920.png"),
      fullPage: true,
    });
    await form.getByRole("button", { name: "Criar lead" }).click();
    await expect(page).toHaveURL(/deal=/, { timeout: 20_000 });
    await expect(page.getByTestId("deal-workspace-drawer")).toBeVisible();
    await page.getByLabel("Fechar drawer").click();

    await page.getByRole("button", { name: "Criar lead" }).click();
    await page.getByTestId("create-lead-form").getByLabel("Telefone *").fill(phone);
    await expect(page.getByText("Este lead já existe nesta esteira")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: "Criar lead" }).last()).toBeDisabled();
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "active-duplicate-1366.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Verificar lead" }).click();
    await expect(page.getByTestId("deal-workspace-drawer")).toBeVisible();
  });
});
