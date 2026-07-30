import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { DEMO_ORG_ID, DEMO_USER_ID } from "@xingyu/config";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333/api";

const headers = {
  "x-demo-user-id": DEMO_USER_ID,
  "x-organization-id": DEMO_ORG_ID,
};

function connectionCard(page: Page, accountName: string) {
  return page
    .getByTestId("pipeline-channel-card")
    .filter({ hasText: accountName });
}

async function removeFixture(
  request: APIRequestContext,
  path: string,
) {
  const response = await request.delete(`${API_URL}${path}`, { headers });
  expect([200, 204, 404]).toContain(response.status());
}

test("connects, persists, tests, pauses, resumes and disconnects a pipeline channel", async ({
  page,
  request,
}) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const pipelineName = `E2E Canais ${suffix}`;
  const stageName = `Entrada ${suffix}`;
  const source = `e2e-channel-${suffix}`;
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const serverErrors: string[] = [];
  let pipelineId: string | undefined;
  let connectionId: string | undefined;

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
        description: "Pipeline isolado para o E2E de canais.",
        stages: [
          {
            name: stageName,
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

    const availableResponse = await request.get(
      `${API_URL}/pipelines/${pipelineId}/channels/available`,
      { headers },
    );
    expect(availableResponse.ok()).toBeTruthy();
    const availableBody = (await availableResponse.json()) as {
      data: {
        id: string;
        name: string;
        displayName?: string | null;
        isActive: boolean;
        connected: boolean;
      }[];
    };
    const demoChannel =
      availableBody.data.find(
        (channel) =>
          channel.isActive &&
          !channel.connected &&
          /whatsapp/i.test(channel.name),
      ) ??
      availableBody.data.find(
        (channel) => channel.isActive && !channel.connected,
      );
    expect(demoChannel, "an active demo channel must be available").toBeTruthy();
    const accountName = demoChannel?.displayName || demoChannel?.name || "";

    await page.goto(`/pipelines/${pipelineId}/channels`);
    await expect(
      page.getByRole("heading", { name: "Canais do pipeline", exact: true }),
    ).toBeVisible();
    await expect(page.getByText(pipelineName, { exact: false })).toBeVisible();

    await page
      .getByRole("button", { name: "Conectar canal", exact: true })
      .first()
      .click();
    const connectDialog = page.getByRole("dialog", {
      name: "Conectar canal",
    });
    await expect(connectDialog).toBeVisible();
    await connectDialog
      .getByLabel("Conta/canal", { exact: true })
      .selectOption(demoChannel?.id);
    await connectDialog.getByLabel("Etapa inicial", { exact: true }).selectOption({
      label: `${stageName} · inicial`,
    });
    await connectDialog.getByLabel("Origem", { exact: true }).fill(source);
    await expect(
      connectDialog.getByRole("checkbox", { name: /^Criar contato\b/ }),
    ).toBeChecked();
    await expect(
      connectDialog.getByRole("checkbox", { name: /^Criar conversa\b/ }),
    ).toBeChecked();
    await expect(
      connectDialog.getByRole("checkbox", { name: /^Criar negócio\b/ }),
    ).toBeChecked();

    const connectResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname.endsWith(
          `/api/pipelines/${pipelineId}/channels`,
        ),
    );
    await connectDialog
      .getByRole("button", { name: "Conectar canal", exact: true })
      .click();
    const connectResponse = await connectResponsePromise;
    expect(connectResponse.ok()).toBeTruthy();
    const connection = (await connectResponse.json()) as {
      id: string;
      active: boolean;
      source?: string | null;
    };
    connectionId = connection.id;
    expect(connection.active).toBe(true);
    expect(connection.source).toBe(source);

    const card = connectionCard(page, accountName);
    await expect(card).toBeVisible();
    await expect(card.getByText("Ativo", { exact: true })).toBeVisible();
    await expect(card.getByText(source, { exact: false })).toBeVisible();

    const reloadListResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        new URL(response.url()).pathname.endsWith(
          `/api/pipelines/${pipelineId}/channels`,
        ),
    );
    await page.reload();
    expect((await reloadListResponse).ok()).toBeTruthy();
    await expect(connectionCard(page, accountName)).toBeVisible();
    await expect(
      connectionCard(page, accountName).getByText(source, { exact: false }),
    ).toBeVisible();

    const testResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname.endsWith(
          `/api/pipelines/${pipelineId}/channels/${connectionId}/test`,
        ),
    );
    await connectionCard(page, accountName)
      .getByRole("button", { name: `Testar ${accountName}` })
      .click();
    const testResponse = await testResponsePromise;
    expect(testResponse.ok()).toBeTruthy();
    const testResult = (await testResponse.json()) as {
      ok: boolean;
      mode: string;
    };
    expect(testResult).toMatchObject({ ok: true, mode: "DEMO" });

    const pauseResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        new URL(response.url()).pathname.endsWith(
          `/api/pipelines/${pipelineId}/channels/${connectionId}/pause`,
        ),
    );
    await connectionCard(page, accountName)
      .getByRole("button", { name: `Pausar ${accountName}` })
      .click();
    expect((await pauseResponsePromise).ok()).toBeTruthy();
    await expect(
      connectionCard(page, accountName).getByText("Pausado", { exact: true }),
    ).toBeVisible();

    await page.reload();
    await expect(
      connectionCard(page, accountName).getByText("Pausado", { exact: true }),
    ).toBeVisible();

    const resumeResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        new URL(response.url()).pathname.endsWith(
          `/api/pipelines/${pipelineId}/channels/${connectionId}/resume`,
        ),
    );
    await connectionCard(page, accountName)
      .getByRole("button", { name: `Ativar ${accountName}` })
      .click();
    expect((await resumeResponsePromise).ok()).toBeTruthy();
    await expect(
      connectionCard(page, accountName).getByText("Ativo", { exact: true }),
    ).toBeVisible();

    await connectionCard(page, accountName)
      .getByRole("button", { name: `Desconectar ${accountName}` })
      .click();
    const disconnectDialog = page.getByRole("dialog", {
      name: "Desconectar canal",
    });
    await expect(disconnectDialog).toContainText(accountName);
    const disconnectResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "DELETE" &&
        new URL(response.url()).pathname.endsWith(
          `/api/pipelines/${pipelineId}/channels/${connectionId}`,
        ),
    );
    await disconnectDialog
      .getByRole("button", { name: "Desconectar canal", exact: true })
      .click();
    expect((await disconnectResponsePromise).ok()).toBeTruthy();
    connectionId = undefined;
    await expect(connectionCard(page, accountName)).toHaveCount(0);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(serverErrors).toEqual([]);
  } finally {
    if (connectionId && pipelineId) {
      await removeFixture(
        request,
        `/pipelines/${pipelineId}/channels/${connectionId}`,
      );
    }
    if (pipelineId) await removeFixture(request, `/pipelines/${pipelineId}`);
  }
});
