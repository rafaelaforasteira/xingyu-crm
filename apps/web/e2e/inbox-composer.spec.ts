import { expect, test } from "@playwright/test";

test("Inbox composer route redirects to operação in beta mode", async ({ page }) => {
  await page.goto("/inbox");
  await expect(page).toHaveURL(/\/operacao/, { timeout: 15_000 });
});

test("composer is available in beta conversations workspace", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/operacao?view=conversations&conversation=conv-operacao-demo");
  await expect(page.getByTestId("conversation-composer")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("button", { name: "Adicionar emoji" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Anexar arquivo" })).toBeVisible();
});

test("mobile conversation composer remains usable in beta", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/operacao?view=conversations&conversation=conv-operacao-demo");
  await expect(page.getByTestId("conversation-composer")).toBeVisible({
    timeout: 30_000,
  });
});

test("audio recording controls exist in beta composer", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/operacao?view=conversations&conversation=conv-operacao-demo");
  await expect(page.getByRole("button", { name: "Gravar áudio" })).toBeVisible({
    timeout: 30_000,
  });
});
