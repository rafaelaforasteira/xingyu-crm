import { test, expect } from "@playwright/test";

test.describe("Authentication flow", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.setTimeout(90_000);

  test("protected route redirects to login, login works, session persists, logout works", async ({
    page,
  }) => {
    const email = process.env.ADMIN_EMAIL ?? "admin@xingyu.local";
    const password = process.env.ADMIN_INITIAL_PASSWORD ?? "ChangeMeNow123!";

    await page.goto("/pipelines");
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });

    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha", { exact: true }).fill(password);
    await Promise.all([
      page.waitForURL(/\/pipelines/, { timeout: 60_000 }),
      page.getByRole("button", { name: "Entrar" }).click(),
    ]);
    await expect(page.locator("[data-app-shell='true']")).toBeVisible({
      timeout: 30_000,
    });

    await page.reload();
    await expect(page).toHaveURL(/\/pipelines/);
    await expect(page.locator("[data-app-shell='true']")).toBeVisible({
      timeout: 30_000,
    });

    await page.getByTestId("beta-nav-settings").click();
    await expect(page).toHaveURL(/\/settings/, { timeout: 30_000 });
    await page.getByRole("button", { name: "Sair da conta" }).click({ timeout: 15_000 });
    await page.getByRole("button", { name: /^Sair$/ }).click({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
