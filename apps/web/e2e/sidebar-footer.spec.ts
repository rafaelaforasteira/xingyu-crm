import { expect, test } from "@playwright/test";

test.describe("Sidebar footer identity", () => {
  test("settings opens /settings and footer stays identity-only", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/pipelines");

    const sidebar = page.getByTestId("beta-sidebar");
    await expect(sidebar).toBeVisible();

    const settings = page.getByTestId("beta-nav-settings");
    await expect(settings).toBeVisible();
    await expect(settings).toHaveAttribute("href", "/settings");

    const footer = page.getByTestId("sidebar-user-footer");
    await expect(footer).toBeVisible();
    await expect(page.getByRole("button", { name: "Abrir menu da conta" })).toHaveCount(0);
    await expect(footer.getByText(/@/)).toHaveCount(0);
    await expect(footer.getByText("Equipe", { exact: true })).toHaveCount(0);
    await expect(footer.getByText("Meu perfil")).toHaveCount(0);
    await expect(footer.getByText(/^Sair$/)).toHaveCount(0);

    await settings.click();
    await expect(page).toHaveURL(/\/settings/, { timeout: 30_000 });
    await expect(page.getByTestId("sidebar-user-identity")).toBeVisible();
  });

  test("logout from settings header reaches login", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.locator('[data-settings-block="profile"]')).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Sair da conta" }).click();
    await page.getByRole("button", { name: /^Sair$/ }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
  });
});
