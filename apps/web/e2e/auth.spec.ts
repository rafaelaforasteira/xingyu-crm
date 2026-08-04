import { test, expect } from "@playwright/test";

test.describe("Authentication flow", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("protected route redirects to login, login works, session persists, logout works", async ({
    page,
  }) => {
    const email = process.env.ADMIN_EMAIL ?? "admin@xingyu.local";
    const password = process.env.ADMIN_INITIAL_PASSWORD ?? "ChangeMeNow123!";

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });

    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /visão geral|dashboard/i })).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: /visão geral|dashboard/i })).toBeVisible({
      timeout: 30_000,
    });

    await page.goto("/inbox");
    await expect(page).toHaveURL(/\/inbox/);
    await expect(page.getByRole("heading", { name: /inbox/i })).toBeVisible({
      timeout: 30_000,
    });

    await page.goto("/pipelines");
    await expect(page).toHaveURL(/\/pipelines/);
    await expect(page.getByRole("heading", { name: /pipeline/i })).toBeVisible({
      timeout: 30_000,
    });

    // Logout lives in the sidebar footer (not the topbar).
    const logout = page.getByRole("button", { name: /^Sair$|^Saindo/ });
    if (!(await logout.isVisible())) {
      await page.getByRole("button", { name: "Abrir menu" }).click();
    }
    await page.getByRole("button", { name: /^Sair$|^Saindo/ }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
