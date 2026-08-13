import { expect, test } from "@playwright/test";

test("orders exposes kanban, list and isolated locale controls", async ({ page }) => {
  await page.goto("/orders?view=kanban");
  await expect(page.getByRole("heading", { name: "Pedidos" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Kanban/ })).toBeVisible();
  await page.getByRole("button", { name: /Lista/ }).click();
  await expect(page).toHaveURL(/view=list/);
  await page.getByLabel("Idioma de Pedidos").selectOption("zh-CN");
  await expect(page.getByRole("heading", { name: "订单" })).toBeVisible();
});
