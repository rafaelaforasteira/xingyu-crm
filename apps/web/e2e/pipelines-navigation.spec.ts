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

  const shell = page.locator("[data-app-shell='true']");
  const sidebar = page.locator("div.hidden.lg\\:block aside").first();
  const pipelinesEntry = sidebar.getByRole("link", { name: "Pipelines", exact: true });

  await expect(pipelinesEntry).toHaveCount(1);

  await shell.evaluate((element) => {
    element.setAttribute("data-persistence-probe", "same-layout");
  });
  const navigationEntriesBefore = await page.evaluate(
    () => performance.getEntriesByType("navigation").length,
  );

  await Promise.all([
    page.waitForURL(/\/pipelines$/),
    pipelinesEntry.click(),
  ]);
  await expect(page.getByRole("heading", { name: "Pipelines", exact: true })).toBeVisible();
  // Soft SPA navigation: navigation entries must not increase
  const navigationEntriesAfter = await page.evaluate(
    () => performance.getEntriesByType("navigation").length,
  );
  expect(navigationEntriesAfter).toBe(navigationEntriesBefore);
  await expect(shell).toBeVisible();
  expect(pageErrors).toEqual([]);
  expect(failedResponses).toEqual([]);
  // Allow benign 404 noise from optional assets during cold compiles
  expect(consoleErrors.filter((e) => !e.includes("404"))).toEqual([]);
});
