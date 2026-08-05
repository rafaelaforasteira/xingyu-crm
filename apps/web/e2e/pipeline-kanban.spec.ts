import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { DEMO_ORG_ID, DEMO_USER_ID } from "@xingyu/config";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333/api";

const headers = {
  "x-demo-user-id": DEMO_USER_ID,
  "x-organization-id": DEMO_ORG_ID,
};

interface PipelineFixture {
  id: string;
  stages: { id: string; name: string }[];
}

async function createPipeline(request: APIRequestContext, name: string, stageNames: string[]) {
  const response = await request.post(`${API_URL}/pipelines`, {
    headers,
    data: {
      name,
      description: "Pipeline isolado para o E2E do Kanban.",
      stages: stageNames.map((stageName, index) => ({
        name: stageName,
        type: "OPEN",
        isInitial: index === 0,
        position: index,
        probability: index * 25,
      })),
    },
  });
  expect(response.ok()).toBeTruthy();
  const created = (await response.json()) as { id: string };

  const boardResponse = await request.get(`${API_URL}/pipelines/${created.id}/board`, { headers });
  expect(boardResponse.ok()).toBeTruthy();
  const board = (await boardResponse.json()) as PipelineFixture;
  return board;
}

function stageColumn(page: Page, name: string) {
  return page
    .getByTestId("kanban-stage")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
}

function dealCard(page: Page, name: string) {
  return page.getByTestId("deal-card").filter({ hasText: name });
}

async function moveCard(
  page: Page,
  dealName: string,
  pipelineId: string,
  stageId: string,
  dealId: string,
) {
  await dealCard(page, dealName)
    .getByRole("button", { name: `Mover ${dealName}` })
    .click();
  const dialog = page.getByRole("dialog", { name: "Mover card" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Pipeline").selectOption(pipelineId);
  await expect(dialog.getByLabel("Etapa").locator(`option[value="${stageId}"]`)).toHaveCount(1);
  await dialog.getByLabel("Etapa").selectOption(stageId);

  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" &&
      new URL(response.url()).pathname.endsWith(`/api/deals/${dealId}`),
  );
  await dialog.getByRole("button", { name: "Mover card", exact: true }).click();
  expect((await responsePromise).ok()).toBeTruthy();
  await expect(dialog).toBeHidden();
}

async function removeFixture(request: APIRequestContext, path: string) {
  const response = await request.delete(`${API_URL}${path}`, { headers });
  expect([200, 204, 404]).toContain(response.status());
}

test("creates and persistently moves a card between stages and pipelines", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const sourceName = `E2E Kanban Origem ${suffix}`;
  const targetName = `E2E Kanban Destino ${suffix}`;
  const sourceStageNames = [`Entrada ${suffix}`, `Qualificação ${suffix}`];
  const targetStageNames = [`Destino ${suffix}`];
  const dealName = `Card E2E ${suffix}`;
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const serverErrors: string[] = [];
  const pipelineIds: string[] = [];
  let dealId: string | undefined;

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 500) {
      serverErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  try {
    const source = await createPipeline(request, sourceName, sourceStageNames);
    const target = await createPipeline(request, targetName, targetStageNames);
    pipelineIds.push(source.id, target.id);

    const sourceInitial = source.stages.find((stage) => stage.name === sourceStageNames[0]);
    const sourceSecond = source.stages.find((stage) => stage.name === sourceStageNames[1]);
    const targetInitial = target.stages.find((stage) => stage.name === targetStageNames[0]);
    expect(sourceInitial).toBeTruthy();
    expect(sourceSecond).toBeTruthy();
    expect(targetInitial).toBeTruthy();

    await page.goto(`/pipelines/${source.id}`);
    await expect(page.getByRole("heading", { name: sourceName, exact: true })).toBeVisible();
    await expect(stageColumn(page, sourceStageNames[0])).toHaveCount(1);
    await expect(stageColumn(page, sourceStageNames[1])).toHaveCount(1);

    await page.getByRole("button", { name: "Criar card", exact: true }).click();
    const createDialog = page.getByRole("dialog", { name: "Criar card" });
    await createDialog.getByLabel("Nome").fill(dealName);
    await createDialog.getByLabel("Valor").fill("1530.75");

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        /\/api\/deals\/?$/.test(new URL(response.url()).pathname),
    );
    await createDialog.getByRole("button", { name: "Criar card", exact: true }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.ok()).toBeTruthy();
    const createdDeal = (await createResponse.json()) as { id: string };
    dealId = createdDeal.id;

    await expect(
      stageColumn(page, sourceStageNames[0]).getByText(dealName, {
        exact: true,
      }),
    ).toBeVisible();
    await page.reload();
    await expect(
      stageColumn(page, sourceStageNames[0]).getByText(dealName, {
        exact: true,
      }),
    ).toBeVisible();

    await moveCard(page, dealName, source.id, sourceSecond!.id, dealId);
    await expect(
      stageColumn(page, sourceStageNames[1]).getByText(dealName, {
        exact: true,
      }),
    ).toBeVisible();
    await page.reload();
    await expect(
      stageColumn(page, sourceStageNames[1]).getByText(dealName, {
        exact: true,
      }),
    ).toBeVisible();

    await moveCard(page, dealName, target.id, targetInitial!.id, dealId);
    await expect(dealCard(page, dealName)).toHaveCount(0);

    await page.goto(`/pipelines/${target.id}`);
    await expect(
      stageColumn(page, targetStageNames[0]).getByText(dealName, {
        exact: true,
      }),
    ).toBeVisible();
    await page.reload();
    await expect(
      stageColumn(page, targetStageNames[0]).getByText(dealName, {
        exact: true,
      }),
    ).toBeVisible();

    const persistedResponse = await request.get(`${API_URL}/deals/${dealId}`, {
      headers,
    });
    expect(persistedResponse.ok()).toBeTruthy();
    const persisted = (await persistedResponse.json()) as {
      pipelineId: string;
      stageId: string;
    };
    expect(persisted.pipelineId).toBe(target.id);
    expect(persisted.stageId).toBe(targetInitial!.id);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(serverErrors).toEqual([]);
  } finally {
    if (dealId) await removeFixture(request, `/deals/${dealId}`);
    for (const pipelineId of pipelineIds.reverse()) {
      await removeFixture(request, `/pipelines/${pipelineId}`);
    }
  }
});
