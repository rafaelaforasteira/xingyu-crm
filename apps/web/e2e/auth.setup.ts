import { test as setup, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const authFile = path.join(__dirname, ".auth/user.json");

setup("authenticate as admin", async ({ page }) => {
  const email = process.env.ADMIN_EMAIL ?? "admin@xingyu.local";
  const password = process.env.ADMIN_INITIAL_PASSWORD ?? "ChangeMeNow123!";

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  setup.setTimeout(90_000);

  const login = await page.request.post("/api/auth/login", {
    data: { email, password },
  });
  expect(login.ok(), `login failed: ${login.status()} ${await login.text()}`).toBeTruthy();

  await page.goto("/operacao");
  await expect(page).toHaveURL(/\/operacao/, { timeout: 60_000 });
  await expect(page.getByTestId("beta-operation-page")).toBeVisible({
    timeout: 30_000,
  });

  await page.context().storageState({ path: authFile });
});
