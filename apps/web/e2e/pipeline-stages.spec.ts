import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { DEMO_ORG_ID, DEMO_USER_ID } from "@xingyu/config";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333/api";

const headers = {
  "x-demo-user-id": DEMO_USER_ID,
  "x-organization-id": DEMO_ORG_ID,
};

function stageCard(page: Page, name: string) {
  return page
    .getByTestId("stage-card")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
}

async function createStage(
  page: Page,
  name: string,
  options: {
    type?: "OPEN" | "WON" | "LOST";
    probability?: number;
    maxDurationMinutes?: number;
  } = {},
) {
  await page.getByRole("button", { name: "Criar etapa", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Criar etapa" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Nome").fill(name);
  await dialog.getByLabel("Descrição").fill(`Etapa ${name} criada pelo Playwright.`);
  await dialog.getByLabel("Tipo").selectOption(options.type ?? "OPEN");
  if (options.probability !== undefined) {
    await dialog
      .getByLabel("Probabilidade (%)")
      .fill(String(options.probability));
  }
  if (options.maxDurationMinutes !== undefined) {
    await dialog
      .getByLabel("Prazo máximo (minutos)")
      .fill(String(options.maxDurationMinutes));
  }

  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /\/api\/pipelines\/[^/]+\/stages\/?$/.test(
        new URL(response.url()).pathname,
      ),
  );
  await dialog.getByRole("button", { name: "Criar etapa", exact: true }).click();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
  const stage = (await response.json()) as { id: string; name: string };
  await expect(dialog).toBeHidden();
  await expect(stageCard(page, name)).toHaveCount(1);
  return stage;
}

async function removeFixture(
  request: APIRequestContext,
  path: string,
) {
  const response = await request.delete(`${API_URL}${path}`, { headers });
  expect([200, 204, 404]).toContain(response.status());
}

test("manages pipeline stages and safely moves deals before deletion", async ({
  page,
  request,
}) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const pipelineName = `E2E Etapas ${suffix}`;
  const baseName = `Entrada ${suffix}`;
  const discoveryName = `Descoberta ${suffix}`;
  const proposalName = `Proposta ${suffix}`;
  const closingName = `Fechamento ${suffix}`;
  const renamedProposal = `${proposalName} editada`;
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const serverErrors: string[] = [];
  let pipelineId: string | undefined;
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
    const pipelineResponse = await request.post(`${API_URL}/pipelines`, {
      headers,
      data: {
        name: pipelineName,
        description: "Pipeline isolado para o E2E de etapas.",
        stages: [
          {
            name: baseName,
            type: "OPEN",
            isInitial: true,
            color: "#2563eb",
            probability: 10,
          },
        ],
      },
    });
    expect(pipelineResponse.ok()).toBeTruthy();
    const pipeline = (await pipelineResponse.json()) as { id: string };
    pipelineId = pipeline.id;

    await page.goto(`/pipelines/${pipelineId}/settings/stages`);
    await expect(
      page.getByRole("heading", { name: "Etapas do pipeline", exact: true }),
    ).toBeVisible();
    await expect(
      page.locator("main").getByText(pipelineName, { exact: false }),
    ).toBeVisible();
    await expect(stageCard(page, baseName)).toHaveCount(1);

    const discovery = await createStage(page, discoveryName, {
      probability: 25,
      maxDurationMinutes: 1440,
    });
    const proposal = await createStage(page, proposalName, {
      probability: 60,
      maxDurationMinutes: 2880,
    });
    const closing = await createStage(page, closingName, {
      probability: 80,
      maxDurationMinutes: 720,
    });

    const reorderResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname.endsWith(
          `/api/pipelines/${pipelineId}/stages/reorder`,
        ),
    );
    await stageCard(page, closingName)
      .getByRole("button", { name: `Mover ${closingName} para cima` })
      .click();
    expect((await reorderResponsePromise).ok()).toBeTruthy();

    await expect
      .poll(async () =>
        page
          .getByTestId("stage-card")
          .getByRole("heading")
          .allTextContents(),
      )
      .toEqual([baseName, discoveryName, closingName, proposalName]);

    await page.reload();
    await expect
      .poll(async () =>
        page
          .getByTestId("stage-card")
          .getByRole("heading")
          .allTextContents(),
      )
      .toEqual([baseName, discoveryName, closingName, proposalName]);

    await stageCard(page, proposalName)
      .getByRole("button", { name: "Editar", exact: true })
      .click();
    const editDialog = page.getByRole("dialog", { name: "Editar etapa" });
    await editDialog.getByLabel("Nome").fill(renamedProposal);
    await editDialog.getByLabel("Tipo").selectOption("WON");
    const renameResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        new URL(response.url()).pathname.endsWith(
          `/api/pipelines/${pipelineId}/stages/${proposal.id}`,
        ),
    );
    await editDialog
      .getByRole("button", { name: "Salvar alterações", exact: true })
      .click();
    expect((await renameResponsePromise).ok()).toBeTruthy();
    await expect(stageCard(page, renamedProposal)).toHaveCount(1);
    await expect(stageCard(page, renamedProposal).getByText("Ganha")).toBeVisible();

    await stageCard(page, discoveryName)
      .getByRole("button", { name: `Excluir ${discoveryName}` })
      .click();
    const emptyDeleteDialog = page.getByRole("dialog", { name: "Excluir etapa" });
    const emptyDeleteResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "DELETE" &&
        new URL(response.url()).pathname.endsWith(
          `/api/pipelines/${pipelineId}/stages/${discovery.id}`,
        ),
    );
    await emptyDeleteDialog
      .getByRole("button", { name: "Excluir etapa", exact: true })
      .click();
    expect((await emptyDeleteResponsePromise).ok()).toBeTruthy();
    await expect(stageCard(page, discoveryName)).toHaveCount(0);

    const dealResponse = await request.post(`${API_URL}/deals`, {
      headers,
      data: {
        name: `Negócio de exclusão ${suffix}`,
        value: 1234,
        pipelineId,
        stageId: closing.id,
      },
    });
    expect(dealResponse.ok()).toBeTruthy();
    const deal = (await dealResponse.json()) as { id: string };
    dealId = deal.id;

    await queryStageCounts(page, pipelineId);
    await expect(stageCard(page, closingName).getByText("1 negócios")).toBeVisible();
    await stageCard(page, closingName)
      .getByRole("button", { name: `Excluir ${closingName}` })
      .click();

    const conflictResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "DELETE" &&
        new URL(response.url()).pathname.endsWith(
          `/api/pipelines/${pipelineId}/stages/${closing.id}`,
        ) &&
        !new URL(response.url()).searchParams.has("targetStageId"),
    );
    const deleteDialog = page.getByRole("dialog", { name: "Excluir etapa" });
    await deleteDialog
      .getByRole("button", { name: "Excluir etapa", exact: true })
      .click();
    const conflictResponse = await conflictResponsePromise;
    expect(conflictResponse.status()).toBe(409);
    await expect(deleteDialog.getByRole("alert")).toContainText(
      "Selecione outra etapa",
    );

    await deleteDialog
      .getByLabel("Etapa de destino")
      .selectOption(proposal.id);
    const moveDeleteResponsePromise = page.waitForResponse(
      (response) => {
        const url = new URL(response.url());
        return (
          response.request().method() === "DELETE" &&
          url.pathname.endsWith(
            `/api/pipelines/${pipelineId}/stages/${closing.id}`,
          ) &&
          url.searchParams.get("targetStageId") === proposal.id
        );
      },
    );
    await deleteDialog
      .getByRole("button", { name: "Mover e excluir", exact: true })
      .click();
    expect((await moveDeleteResponsePromise).ok()).toBeTruthy();
    await expect(stageCard(page, closingName)).toHaveCount(0);

    const movedDealResponse = await request.get(`${API_URL}/deals/${dealId}`, {
      headers,
    });
    expect(movedDealResponse.ok()).toBeTruthy();
    const movedDeal = (await movedDealResponse.json()) as {
      stageId: string;
      status: string;
    };
    expect(movedDeal.stageId).toBe(proposal.id);
    expect(movedDeal.status).toBe("WON");

    const expectedConflictErrors = consoleErrors.filter((message) =>
      /status of 409 \(Conflict\)/i.test(message),
    );
    expect(expectedConflictErrors).toHaveLength(1);
    expect(
      consoleErrors.filter(
        (message) => !/status of 409 \(Conflict\)/i.test(message),
      ),
    ).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(serverErrors).toEqual([]);
  } finally {
    if (dealId) await removeFixture(request, `/deals/${dealId}`);
    if (pipelineId) await removeFixture(request, `/pipelines/${pipelineId}`);
  }
});

async function queryStageCounts(page: Page, pipelineId: string) {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      new URL(response.url()).pathname.endsWith(
        `/api/pipelines/${pipelineId}/stages`,
      ),
  );
  await page.reload();
  expect((await responsePromise).ok()).toBeTruthy();
}
