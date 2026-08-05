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

type SimulationResult = {
  ok: boolean;
  mode: string;
  simulationId: string;
  connectionId: string;
  duplicateStrategy: string;
  contactCreated: boolean;
  contact: {
    id: string;
    firstName: string;
    lastName?: string | null;
  } | null;
  conversation: {
    id: string;
    contactId?: string | null;
    channelId?: string | null;
    assigneeId?: string | null;
  } | null;
  message: {
    id: string;
    conversationId: string;
    channelId?: string | null;
    direction: string;
    body?: string | null;
  } | null;
  deal: {
    id: string;
    name: string;
    value: number | string;
    pipelineId: string;
    stageId: string;
    contactId?: string | null;
    conversationId?: string | null;
    ownerId?: string | null;
    teamId?: string | null;
  } | null;
  appliedTagIds: string[];
};

function unwrapData<T>(body: T[] | { data: T[] }) {
  return Array.isArray(body) ? body : body.data;
}

async function removeFixture(
  request: APIRequestContext,
  path: string,
) {
  const response = await request.delete(`${API_URL}${path}`, { headers });
  expect([200, 204, 404]).toContain(response.status());
}

function connectionCard(page: Page, accountName: string) {
  return page
    .getByTestId("pipeline-channel-card")
    .filter({ hasText: accountName });
}

test("simulates a demo lead through a pipeline channel and persists every entity", async ({
  page,
  request,
}) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const pipelineName = `E2E Simulação ${suffix}`;
  const stageName = `Entrada ${suffix}`;
  const leadName = `Lead Simulado ${suffix}`;
  const leadEmail = `lead-${suffix}@example.test`;
  const leadPhone = `55119${Date.now().toString().slice(-8)}`;
  const leadInstagram = `@lead_${suffix.replace(/[^a-z0-9]/gi, "_")}`;
  const leadMessage = `Mensagem inbound E2E ${suffix}`;
  const estimatedValue = 1849.9;
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const serverErrors: string[] = [];
  let pipelineId: string | undefined;
  let connectionId: string | undefined;
  let result: SimulationResult | undefined;

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
        description: "Pipeline isolado para simulação DEMO E2E.",
        stages: [
          {
            name: stageName,
            type: "OPEN",
            isInitial: true,
            color: "#7c3aed",
            probability: 15,
          },
        ],
      },
    });
    expect(pipelineResponse.ok()).toBeTruthy();
    pipelineId = ((await pipelineResponse.json()) as { id: string }).id;

    const [
      stagesResponse,
      availableResponse,
      usersResponse,
      teamsResponse,
      tagsResponse,
    ] = await Promise.all([
      request.get(`${API_URL}/pipelines/${pipelineId}/stages`, { headers }),
      request.get(
        `${API_URL}/pipelines/${pipelineId}/channels/available`,
        { headers },
      ),
      request.get(`${API_URL}/settings/users?pageSize=100`, { headers }),
      request.get(`${API_URL}/settings/teams?pageSize=100`, { headers }),
      request.get(`${API_URL}/settings/tags?pageSize=100`, { headers }),
    ]);
    for (const response of [
      stagesResponse,
      availableResponse,
      usersResponse,
      teamsResponse,
      tagsResponse,
    ]) {
      expect(response.ok()).toBeTruthy();
    }

    const stages = unwrapData(
      (await stagesResponse.json()) as
        | { id: string; name: string; isInitial?: boolean }[]
        | { data: { id: string; name: string; isInitial?: boolean }[] },
    );
    const defaultStage =
      stages.find((stage) => stage.isInitial) ?? stages[0];
    expect(defaultStage).toBeTruthy();

    const available = unwrapData(
      (await availableResponse.json()) as
        | {
            id: string;
            name: string;
            displayName?: string | null;
            type: string;
            isActive: boolean;
            connected: boolean;
          }[]
        | {
            data: {
              id: string;
              name: string;
              displayName?: string | null;
              type: string;
              isActive: boolean;
              connected: boolean;
            }[];
          },
    );
    const demoChannel =
      available.find(
        (channel) =>
          channel.isActive &&
          !channel.connected &&
          /whatsapp/i.test(channel.name),
      ) ??
      available.find((channel) => channel.isActive && !channel.connected);
    expect(demoChannel, "an active demo channel must be available").toBeTruthy();
    const accountName = demoChannel?.displayName || demoChannel?.name || "";

    const users = unwrapData(
      (await usersResponse.json()) as
        | { id: string; name: string }[]
        | { data: { id: string; name: string }[] },
    );
    const teams = unwrapData(
      (await teamsResponse.json()) as
        | { id: string; name: string }[]
        | { data: { id: string; name: string }[] },
    );
    const tags = unwrapData(
      (await tagsResponse.json()) as
        | { id: string; name: string; entityType?: string }[]
        | {
            data: { id: string; name: string; entityType?: string }[];
          },
    );
    const owner = users[0];
    const team = teams[0];
    const tag =
      tags.find((candidate) => candidate.entityType === "CONTACT") ??
      tags.find((candidate) =>
        ["CONTACT", "DEAL"].includes(candidate.entityType ?? ""),
      );

    const connectionResponse = await request.post(
      `${API_URL}/pipelines/${pipelineId}/channels`,
      {
        headers,
        data: {
          channelId: demoChannel?.id,
          defaultStageId: defaultStage?.id,
          defaultOwnerId: owner?.id,
          defaultTeamId: team?.id,
          defaultTagIds: tag ? [tag.id] : [],
          source: `e2e-simulation-${suffix}`,
          active: true,
          createContact: true,
          createConversation: true,
          createDeal: true,
          duplicateStrategy: "MERGE",
          routingMode: owner ? "FIXED" : "PIPELINE_DEFAULTS",
        },
      },
    );
    expect(connectionResponse.ok()).toBeTruthy();
    connectionId = (
      (await connectionResponse.json()) as { id: string }
    ).id;

    await page.goto(`/pipelines/${pipelineId}/channels`);
    const card = connectionCard(page, accountName);
    await expect(card).toBeVisible();
    await card
      .getByRole("button", {
        name: `Simular novo lead em ${accountName}`,
        exact: true,
      })
      .click();

    const dialog = page.getByRole("dialog", {
      name: "Simular novo lead",
    });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Canal", { exact: true })).toHaveValue(
      /.+/,
    );
    await expect(dialog.getByLabel("Conta", { exact: true })).toHaveValue(
      accountName,
    );
    await expect(dialog.getByLabel("Canal", { exact: true })).toHaveAttribute(
      "readonly",
    );
    await expect(dialog.getByLabel("Conta", { exact: true })).toHaveAttribute(
      "readonly",
    );

    await dialog.getByLabel("Nome", { exact: true }).fill(leadName);
    await dialog.getByLabel("Telefone", { exact: true }).fill(leadPhone);
    await dialog.getByLabel("E-mail", { exact: true }).fill(leadEmail);
    await dialog
      .getByLabel("Instagram", { exact: true })
      .fill(leadInstagram);
    await dialog
      .getByLabel("Mensagem", { exact: true })
      .fill(leadMessage);
    await dialog
      .getByLabel("Valor estimado", { exact: true })
      .fill(String(estimatedValue));

    const simulationResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname.endsWith(
          `/api/pipelines/${pipelineId}/channels/${connectionId}/simulate`,
        ),
    );
    await dialog
      .getByRole("button", { name: "Simular entrada", exact: true })
      .click();
    const simulationResponse = await simulationResponsePromise;
    expect(simulationResponse.ok()).toBeTruthy();
    result = (await simulationResponse.json()) as SimulationResult;

    expect(result).toMatchObject({
      ok: true,
      mode: "DEMO",
      connectionId,
      duplicateStrategy: "MERGE",
      contactCreated: true,
    });
    expect(result.simulationId).toBeTruthy();
    expect(result.contact?.id).toBeTruthy();
    expect(result.conversation?.id).toBeTruthy();
    expect(result.message?.id).toBeTruthy();
    expect(result.deal?.id).toBeTruthy();
    expect(result.deal?.pipelineId).toBe(pipelineId);
    expect(result.deal?.stageId).toBe(defaultStage?.id);
    expect(result.message?.direction).toBe("INBOUND");
    expect(result.message?.body).toBe(leadMessage);
    if (tag) expect(result.appliedTagIds).toContain(tag.id);
    const dealName = result.deal?.name ?? leadName;

    await expect(dialog.getByRole("status")).toContainText(
      "Lead simulado com sucesso",
    );
    await expect(dialog.getByText(result.simulationId)).toBeVisible();
    await expect(
      dialog.getByRole("link", { name: "Ver card no Kanban" }),
    ).toHaveAttribute("href", `/pipelines/${pipelineId}`);

    const [
      contactResponse,
      conversationResponse,
      messagesResponse,
      dealResponse,
    ] = await Promise.all([
      request.get(`${API_URL}/contacts/${result.contact?.id}`, { headers }),
      request.get(
        `${API_URL}/conversations/${result.conversation?.id}`,
        { headers },
      ),
      request.get(
        `${API_URL}/conversations/${result.conversation?.id}/messages`,
        { headers },
      ),
      request.get(`${API_URL}/deals/${result.deal?.id}`, { headers }),
    ]);
    for (const response of [
      contactResponse,
      conversationResponse,
      messagesResponse,
      dealResponse,
    ]) {
      expect(response.ok()).toBeTruthy();
    }

    const contact = (await contactResponse.json()) as {
      id: string;
      name?: string;
      firstName?: string;
      email?: string | null;
      phone?: string | null;
      instagram?: string | null;
      tags?: {
        id?: string;
        tagId?: string;
        tag?: { id: string };
      }[];
    };
    expect(contact.id).toBe(result.contact?.id);
    expect(contact.name ?? contact.firstName).toContain("Lead");
    expect(contact.email).toBe(leadEmail);
    expect(contact.phone?.replace(/\D/g, "")).toBe(
      leadPhone.replace(/\D/g, ""),
    );
    expect(contact.instagram).toBe(leadInstagram);
    if (tag?.entityType === "CONTACT") {
      expect(
        contact.tags?.map(
          (item) => item.id ?? item.tagId ?? item.tag?.id,
        ),
      ).toContain(tag.id);
    }

    const conversation = (await conversationResponse.json()) as {
      id: string;
      contactId?: string | null;
      channelId?: string | null;
      assigneeId?: string | null;
      status: string;
      unreadCount: number;
    };
    expect(conversation).toMatchObject({
      id: result.conversation?.id,
      contactId: result.contact?.id,
      channelId: demoChannel?.id,
      status: "OPEN",
      unreadCount: 1,
    });
    if (owner) expect(conversation.assigneeId).toBe(owner.id);

    const messages = unwrapData(
      (await messagesResponse.json()) as
        | {
            id: string;
            body?: string | null;
            direction: string;
            conversationId: string;
            channelId?: string | null;
            status: string;
          }[]
        | {
            data: {
              id: string;
              body?: string | null;
              direction: string;
              conversationId: string;
              channelId?: string | null;
              status: string;
            }[];
          },
    );
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: result.message?.id,
          body: leadMessage,
          direction: "INBOUND",
          conversationId: result.conversation?.id,
          channelId: demoChannel?.id,
          status: "DELIVERED",
        }),
      ]),
    );

    const deal = (await dealResponse.json()) as {
      id: string;
      name: string;
      value: number | string;
      pipelineId: string;
      stageId: string;
      contactId?: string | null;
      conversationId?: string | null;
      ownerId?: string | null;
      teamId?: string | null;
      status: string;
    };
    expect(deal).toMatchObject({
      id: result.deal?.id,
      pipelineId,
      stageId: defaultStage?.id,
      contactId: result.contact?.id,
      conversationId: result.conversation?.id,
      status: "OPEN",
    });
    expect(Number(deal.value)).toBe(estimatedValue);
    if (owner) expect(deal.ownerId).toBe(owner.id);
    if (team) expect(deal.teamId).toBe(team.id);

    await dialog
      .getByRole("link", { name: "Ver card no Kanban" })
      .click();
    await expect(page).toHaveURL(new RegExp(`/pipelines/${pipelineId}$`), {
      timeout: 20_000,
    });
    const dealCard = page
      .getByTestId("deal-card")
      .filter({ hasText: dealName });
    await expect(dealCard).toBeVisible();
    await expect(
      page
        .getByTestId("kanban-stage")
        .filter({ hasText: stageName })
        .getByTestId("deal-card")
        .filter({ hasText: dealName }),
    ).toBeVisible();

    await page.reload();
    await expect(
      page
        .getByTestId("kanban-stage")
        .filter({ hasText: stageName })
        .getByTestId("deal-card")
        .filter({ hasText: dealName }),
    ).toBeVisible();

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(serverErrors).toEqual([]);
  } finally {
    if (result?.deal) await removeFixture(request, `/deals/${result.deal.id}`);
    if (result?.conversation) {
      await removeFixture(
        request,
        `/conversations/${result.conversation.id}`,
      );
    }
    if (result?.contact && result.contactCreated) {
      await removeFixture(request, `/contacts/${result.contact.id}`);
    }
    if (connectionId && pipelineId) {
      await removeFixture(
        request,
        `/pipelines/${pipelineId}/channels/${connectionId}`,
      );
    }
    if (pipelineId) await removeFixture(request, `/pipelines/${pipelineId}`);
  }
});
