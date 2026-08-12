import { expect, test } from "@playwright/test";

test("Pipelines is the primary module with dynamic children and route-driven workspace", async ({ page }) => {
  await page.goto("/pipelines");
  await expect(page).toHaveURL(/\/pipelines$/);
  await expect(page.getByRole("heading", { name: "Pipelines", exact: true })).toBeVisible();
  const cards = page.getByTestId("pipeline-card");
  await expect(cards.first()).toBeVisible();
  const pipelineId = await cards.first().getAttribute("data-pipeline-id");
  expect(pipelineId).toBeTruthy();
  await page.goto(`/pipelines/${pipelineId}?view=conversations`);
  await expect(page).toHaveURL(new RegExp(`/pipelines/${pipelineId}\\?view=conversations`));
  await expect(page.getByTestId("beta-conversation-workspace")).toBeVisible();

  await page.goto("/operacao");
  await expect(page).toHaveURL(/\/pipelines$/);
});
