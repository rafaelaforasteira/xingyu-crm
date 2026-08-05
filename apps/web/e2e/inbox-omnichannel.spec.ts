import { expect, test } from "@playwright/test";

test("Inbox omnichannel workspace is served via beta conversations", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/inbox");
  await expect(page).toHaveURL(/\/operacao/, { timeout: 15_000 });

  await page.goto("/operacao?view=conversations");
  await expect(page.getByTestId("lead-context-panel")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText(/Contexto do lead/i).first()).toBeVisible();
  await expect(page.getByTestId("conversation-composer")).toBeVisible();
});
