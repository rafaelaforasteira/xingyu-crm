import { expect, test } from "@playwright/test";

test("sidebar keeps a single persistent Pipelines entry", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedResponses: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 500) {
      failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /visão geral|dashboard/i })).toBeVisible();

  const sidebar = page.locator("aside").first();
  const pipelinesEntry = sidebar.getByRole("link", { name: "Pipelines", exact: true });

  await expect(pipelinesEntry).toHaveCount(1);
  await expect(sidebar.locator('a[href^="/pipelines/"]')).toHaveCount(0);

  await sidebar.evaluate((element) => {
    element.dataset.persistenceProbe = "same-layout";
  });
  const navigationEntriesBefore = await page.evaluate(
    () => performance.getEntriesByType("navigation").length,
  );

  await pipelinesEntry.click();
  await expect(page).toHaveURL(/\/pipelines$/);
  await expect(page.getByRole("heading", { name: "Pipelines", exact: true })).toBeVisible();
  await expect(sidebar).toHaveAttribute("data-persistence-probe", "same-layout");
  await expect(pipelinesEntry).toHaveAttribute("aria-current", "page");

  const navigationEntriesAfter = await page.evaluate(
    () => performance.getEntriesByType("navigation").length,
  );
  expect(navigationEntriesAfter).toBe(navigationEntriesBefore);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(failedResponses).toEqual([]);
});
