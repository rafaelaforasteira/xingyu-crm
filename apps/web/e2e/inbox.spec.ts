import { expect, test } from "@playwright/test";

test("Inbox redirects, switches conversations and persists a sent message", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/inbox");
  await expect(page).toHaveURL(/\/inbox\/[^/?#]+$/);
  const firstUrl = page.url();
  const firstId = new URL(firstUrl).pathname.split("/").pop();
  expect(firstId).toBeTruthy();

  await expect(page.getByTestId("conversation-header")).toBeVisible();
  await expect(page.getByTestId("message-list")).toBeVisible();
  await expect(page.locator('[data-testid^="message-"]').first()).toBeVisible();

  const uniqueMessage = `Mensagem E2E Inbox ${Date.now()}`;
  const composer = page.getByRole("textbox", { name: "Mensagem" });
  await composer.fill(uniqueMessage);
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(page.getByText("Mensagem enviada.")).toBeVisible();
  await expect(page.getByTestId("message-list").getByText(uniqueMessage, { exact: true })).toBeVisible();
  await expect(composer).toHaveValue("");

  await page.reload();
  await expect(page.getByTestId("message-list").getByText(uniqueMessage, { exact: true })).toBeVisible();

  const secondConversation = page.locator('a[data-testid^="conversation-"]').nth(1);
  await expect(secondConversation).toBeVisible();
  const firstHeader = await page.getByTestId("conversation-header").textContent();
  await secondConversation.click();
  await expect(page).not.toHaveURL(firstUrl);
  await expect(page.getByTestId("conversation-header")).not.toHaveText(firstHeader ?? "");

  await page.goto(firstUrl);
  await expect(page.getByTestId("message-list").getByText(uniqueMessage, { exact: true })).toBeVisible();

  const hydrationErrors = [...consoleErrors, ...pageErrors].filter((message) =>
    /hydration mismatch|a tree hydrated|didn't match the client|server rendered html/i.test(
      message,
    ),
  );
  expect(hydrationErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("Inbox remains usable on tablet and mobile", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/inbox");
  await expect(page).toHaveURL(/\/inbox\/[^/?#]+$/);
  await expect(page.getByTestId("conversation-list")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Mensagem" })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByTestId("conversation-list")).toBeHidden();
  await expect(page.getByTestId("message-list")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Mensagem" })).toBeVisible();
  const backButton = page.getByRole("button", { name: "Voltar para conversas" });
  await expect(backButton).toBeVisible();
  await backButton.click();
  await expect(page.getByTestId("conversation-list")).toBeVisible();
});
