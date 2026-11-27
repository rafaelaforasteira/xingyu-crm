import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const shots = path.join(__dirname, ".beta-screenshots");
fs.mkdirSync(shots, { recursive: true });

test.describe("Settings profile view/edit", () => {
  test("opens settings in view mode with unified profile grid", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/settings");

    const profile = page.locator('[data-settings-block="profile"]');
    await expect(profile).toBeVisible({ timeout: 30_000 });

    await expect(profile.getByText("MEU PERFIL")).toHaveCount(0);
    await expect(profile.getByText("Cargo")).toHaveCount(0);
    await expect(profile.getByText("Segurança", { exact: true })).toHaveCount(0);
    await expect(profile.getByRole("button", { name: "Salvar alterações" })).toHaveCount(0);
    await expect(profile.locator("input#settings-first-name")).toHaveCount(0);
    await expect(profile.getByRole("button", { name: "Editar perfil" })).toBeVisible();
    await expect(profile.getByText("Editar", { exact: true })).toBeVisible();

    const grid = profile.getByTestId("settings-profile-grid");
    await expect(grid).toBeVisible();
    await expect(grid.getByText("E-mail", { exact: true })).toBeVisible();
    await expect(grid.getByText("Telefone", { exact: true })).toBeVisible();
    await expect(grid.getByText("Senha", { exact: true })).toBeVisible();
    await expect(grid.getByText("Setor", { exact: true })).toBeVisible();
    await expect(grid.getByText("Fuso horário", { exact: true })).toBeVisible();
    await expect(grid.getByText("Idioma", { exact: true })).toBeVisible();
    await expect(grid.getByText("••••••••")).toBeVisible();
    await expect(grid.getByRole("button", { name: /Redefinir/ })).toBeVisible();

    await expect(page.locator("[data-settings-block='security']")).toHaveCount(0);
    await expect(page.locator("[data-settings-block='organization']")).toHaveCount(0);
    await expect(page.locator("[data-settings-block='account']")).toHaveCount(0);
    await page.screenshot({ path: path.join(shots, "settings-profile-view-1366.png"), fullPage: false });

    await grid.getByRole("button", { name: /Redefinir/ }).click();
    await expect(profile.getByTestId("settings-password-panel")).toBeVisible();
    await expect(profile.locator("#settings-current-password")).toBeVisible();
    await expect(profile.locator("#settings-new-password")).toBeVisible();
    await expect(profile.locator("#settings-confirm-password")).toBeVisible();
    await profile.getByRole("button", { name: "Cancelar" }).click();
    await expect(profile.getByTestId("settings-password-panel")).toHaveCount(0);

    await profile.getByRole("button", { name: "Editar perfil" }).click();
    await expect(profile.locator("#settings-first-name")).toBeVisible();
    await expect(profile.locator("#settings-last-name")).toBeVisible();
    await expect(profile.getByRole("button", { name: "Cancelar" })).toBeVisible();
    await expect(profile.getByRole("button", { name: "Salvar alterações" })).toBeVisible();
    await expect(profile.getByTestId("settings-password-panel")).toHaveCount(0);
    await page.screenshot({ path: path.join(shots, "settings-profile-edit-1366.png"), fullPage: false });

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: path.join(shots, "settings-profile-edit-1920.png"), fullPage: false });
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.screenshot({ path: path.join(shots, "settings-profile-edit-1024.png"), fullPage: false });

    const first = profile.locator("#settings-first-name");
    const original = await first.inputValue();
    await first.fill(`${original}`.trim() || "Admin");
    await profile.getByRole("button", { name: "Cancelar" }).click();
    await expect(profile.locator("#settings-first-name")).toHaveCount(0);
    await expect(profile.getByRole("button", { name: "Salvar alterações" })).toHaveCount(0);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(shots, "settings-profile-view-390.png"), fullPage: false });
  });
});
