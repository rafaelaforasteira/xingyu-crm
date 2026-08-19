import { expect, test } from "@playwright/test";

test.describe("API authorization from the browser session", () => {
  test("admin session reaches users API without leaking passwordHash", async ({
    request,
  }) => {
    const me = await request.get("/api/auth/me");
    expect(me.status()).toBe(200);
    const meBody = await me.json();
    expect(meBody).not.toHaveProperty("passwordHash");
    expect(meBody.role).toBe("ADMIN");

    const spoofed = await request.get("/api/auth/me", {
      headers: { "X-Organization-Id": "org-b" },
    });
    expect(spoofed.status()).toBe(200);
    const spoofedBody = await spoofed.json();
    expect(spoofedBody.id).toBe(meBody.id);

    const users = await request.get("/api/users?page=1&pageSize=20");
    expect(users.status()).toBe(200);
    const payload = await users.json();
    const rows = payload.data ?? payload.items ?? payload;
    const list = Array.isArray(rows) ? rows : [];
    for (const row of list) {
      expect(row).not.toHaveProperty("passwordHash");
      expect(row).not.toHaveProperty("refreshTokenHash");
    }
  });

  test("unauthenticated API calls are 401", async ({ playwright }) => {
    const anonymous = await playwright.request.newContext({ storageState: undefined });
    const res = await anonymous.get("http://localhost:3000/api/orders?page=1");
    expect(res.status()).toBe(401);
    await anonymous.dispose();
  });

  test("admin can open settings users URL", async ({ page }) => {
    await page.goto("/settings/users");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator("[data-app-shell='true']")).toBeVisible({ timeout: 20_000 });
  });
});

test.describe("Direct URL without session", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("settings users redirects to login", async ({ page }) => {
    await page.goto("/settings/users");
    await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
  });
});
