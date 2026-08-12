import { expect, test } from "@playwright/test";

test("pipelines page and API are available in multi-pipeline mode", async ({ page, request }) => {
  await page.goto("/pipelines");
  await expect(page).toHaveURL(/\/pipelines$/);
  await expect(page.getByRole("button", { name: /Criar pipeline/i })).toBeVisible();

  const list = await request.get("/api/pipelines?pageSize=5");
  expect(list.ok(), await list.text()).toBeTruthy();
  const body = await list.json();
  expect(body.data.length).toBeGreaterThanOrEqual(3);
});
