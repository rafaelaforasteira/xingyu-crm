import { expect, test } from "@playwright/test";

test.describe("Beta single-pipeline UI", () => {
  test("kanban shell, drawer, conversations workspace and route guard", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/operacao");

    await expect(page.getByTestId("beta-operation-page")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("beta-header")).toBeVisible();
    await expect(page.getByTestId("beta-sidebar")).toBeVisible();
    await expect(page.getByTestId("beta-nav-operation")).toBeVisible();
    await expect(page.getByTestId("beta-kanban")).toBeVisible();
    await expect(page.getByTestId("beta-page-header")).toContainText(/Novos leads/i);
    await expect(page.getByTestId("beta-view-switcher")).toBeVisible();
    await expect(page.getByTestId("operation-header")).toHaveCount(0);

    await expect(page.getByTestId("beta-nav-operation")).toBeVisible();
    await expect(page.getByRole("link", { name: /^Dashboard$/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^Contatos$/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^Pipelines$/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^Configurações$/i })).toHaveCount(0);

    const dealCard = page
      .getByTestId("deal-card")
      .filter({ hasText: /Amanda Vieira|Lead WhatsApp - Amanda/i })
      .first();
    await expect(dealCard).toBeVisible({ timeout: 20_000 });
    await dealCard.click();

    const drawer = page.getByTestId("deal-workspace-drawer");
    await expect(drawer).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/view=kanban/);
    await expect(page).toHaveURL(/deal=/);
    await expect(page.getByTestId("beta-kanban")).toBeVisible();

    await expect(drawer.getByRole("button", { name: "Conversa", exact: true })).toBeVisible();
    await expect(drawer.getByRole("button", { name: "Resumo", exact: true })).toBeVisible();
    await expect(drawer.getByRole("button", { name: "Tarefas", exact: true })).toBeVisible();
    await expect(drawer.getByRole("button", { name: "Pedidos", exact: true })).toBeVisible();
    await expect(drawer.getByRole("button", { name: "Histórico", exact: true })).toBeVisible();
    await expect(drawer.getByRole("button", { name: "Arquivos", exact: true })).toBeVisible();
    await expect(
      drawer.getByPlaceholder(/Escreva uma mensagem|Digite uma mensagem|mensagem/i),
    ).toBeVisible();

    await page.getByLabel("Fechar drawer").click();
    await expect(drawer).toHaveCount(0);

    await page.getByTestId("beta-view-conversations").click();
    await expect(page).toHaveURL(/view=conversations/);
    await expect(page.getByTestId("beta-conversation-workspace")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("beta-conversation-list")).toBeVisible();
    await expect(page.getByTestId("conversation-list")).toBeVisible();
    await expect(
      page.getByPlaceholder(/Buscar conversas/i),
    ).toBeVisible();
    await expect(page.getByTestId("conversation-filters-trigger")).toBeVisible();
    await expect(page.getByText("Todos os canais")).toHaveCount(0);
    await expect(page.getByLabel("Não lidas", { exact: true })).toHaveCount(0);
    await expect(page.getByTestId("beta-conversation-thread")).toBeVisible();
    await expect(page.getByTestId("conversation-empty-state")).toBeVisible();
    await expect(page.getByTestId("conversation-composer")).toHaveCount(0);

    const amandaConversation = page
      .locator('[data-testid^="conversation-conv-"]')
      .filter({ hasText: /Amanda Vieira/i })
      .first();
    await amandaConversation.click();
    await expect(page).toHaveURL(/conversation=/);
    await expect(page.getByTestId("conversation-composer")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("beta-lead-context")).toBeVisible();
    await expect(page.getByTestId("lead-context-panel")).toBeVisible();
    await expect(page.getByText(/Contexto do lead/i).first()).toBeVisible();
    await expect(page.getByText(/^Resumo$/).first()).toBeVisible();
    await expect(page.getByText(/^Negociação$/).first()).toBeVisible();
    await expect(page.getByText(/^Canal$/).first()).toBeVisible();
    await expect(page.getByText(/^Tarefas$/).first()).toBeVisible();
    await expect(page.getByText(/^Pedidos$/).first()).toBeVisible();
    await expect(page.getByText(/^Notas$/).first()).toBeVisible();
    await expect(page.getByText(/^Arquivos$/).first()).toBeVisible();
    await expect(page.getByText(/^Histórico$/).first()).toBeVisible();

    const workspace = page.getByTestId("beta-conversation-workspace");
    const list = page.getByTestId("beta-conversation-list");
    const thread = page.getByTestId("beta-conversation-thread");
    const context = page.getByTestId("beta-lead-context");
    const workspaceBox = await workspace.boundingBox();
    const listBox = await list.boundingBox();
    const threadBox = await thread.boundingBox();
    const contextBox = await context.boundingBox();
    expect(workspaceBox).toBeTruthy();
    expect(listBox).toBeTruthy();
    expect(threadBox).toBeTruthy();
    expect(contextBox).toBeTruthy();
    expect(workspaceBox!.width).toBeGreaterThan(1100);
    expect(workspaceBox!.width).toBeLessThan(1500);
    expect(listBox!.width).toBeGreaterThanOrEqual(250);
    expect(listBox!.width).toBeLessThanOrEqual(310);
    expect(contextBox!.width).toBeGreaterThanOrEqual(280);
    expect(contextBox!.width).toBeLessThanOrEqual(330);
    expect(threadBox!.width).toBeGreaterThan(500);

    await page.getByTestId("beta-view-kanban").click();
    await expect(page).toHaveURL(/view=kanban/);
    await expect(page.getByTestId("beta-kanban")).toBeVisible();

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/operacao/, { timeout: 15_000 });
    await page.goto("/pipelines");
    await expect(page).toHaveURL(/\/operacao/, { timeout: 15_000 });
  });

  test("mobile conversations list opens thread and returns", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/operacao?view=conversations");
    await expect(page.getByTestId("conversation-list")).toBeVisible({
      timeout: 30_000,
    });
    const first = page
      .getByTestId("conversation-list")
      .locator('[data-testid^="conversation-"]')
      .first();
    await expect(first).toBeVisible({ timeout: 20_000 });
    await first.click();
    await expect(page).toHaveURL(/conversation=/);
    await expect(page.getByTestId("conversation-header")).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: /Voltar para conversas/i }).click();
    await expect(page.getByTestId("conversation-list")).toBeVisible();
  });
});
