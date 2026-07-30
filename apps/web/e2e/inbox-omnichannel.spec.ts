import { expect, test } from "@playwright/test";

test("Inbox omnichannel workspace shows lead context and persists messages", async ({
  page,
}) => {
  await page.goto("/inbox");
  await expect(page.getByTestId("conversation-list")).toBeVisible({ timeout: 15_000 });

  const firstConversation = page.locator('[data-testid^="conversation-"]').first();
  await expect(firstConversation).toBeVisible({ timeout: 15_000 });

  if (!/\/inbox\/[^/?#]+$/.test(page.url())) {
    await firstConversation.click();
  }
  await expect(page).toHaveURL(/\/inbox\/[^/?#]+$/, { timeout: 10_000 });

  await expect(page.getByTestId("conversation-header")).toBeVisible();
  await expect(page.getByTestId("lead-context-panel")).toBeVisible();

  const headerName = (await page.getByTestId("conversation-header").textContent())?.trim();
  expect(headerName).toBeTruthy();
  await expect(page.getByTestId("lead-context-contact-name")).toContainText(
    headerName!,
  );

  const uniqueMessage = `E2E omnichannel ${Date.now()}`;
  await page.getByRole("textbox", { name: "Mensagem" }).fill(uniqueMessage);
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(page.getByText("Mensagem enviada.")).toBeVisible();
  await expect(
    page.getByTestId("message-list").getByText(uniqueMessage, { exact: true }),
  ).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("lead-context-contact-name")).toContainText(
    headerName!,
  );
  await expect(
    page.getByTestId("message-list").getByText(uniqueMessage, { exact: true }),
  ).toBeVisible();
});
