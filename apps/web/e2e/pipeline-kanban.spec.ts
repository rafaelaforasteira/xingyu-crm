import { expect, test } from "@playwright/test";

test("pipeline kanban UI redirects to operação; beta board remains available", async ({
  page,
}) => {
  await page.goto("/pipelines/pipe-novos");
  await expect(page).toHaveURL(/\/operacao/, { timeout: 15_000 });
  await page.goto("/operacao?view=kanban");
  await expect(page.getByTestId("beta-kanban")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("kanban-stage").first()).toBeVisible();
});
