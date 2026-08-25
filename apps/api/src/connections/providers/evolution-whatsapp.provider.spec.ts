import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  HttpException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConnectionLifecycleStatus } from "@xingyu/database";
import { EvolutionWhatsAppProvider } from "./evolution-whatsapp.provider";
import { ConnectionProviderRegistry } from "./connection-provider.registry";
import { FakeWhatsAppProvider } from "./fake-whatsapp.provider";

const API_KEY = "evolution-secret-key-test-value";
const WEBHOOK_SECRET = "evolution-webhook-secret-test-value";
const CHANNEL_ID = "550e8400-e29b-41d4-a716-446655440000";
const INSTANCE_NAME = `xingyu-${CHANNEL_ID}`;
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

function errorText(error: unknown) {
  if (error instanceof HttpException) {
    return `${error.message} ${JSON.stringify(error.getResponse())}`;
  }
  return String(error);
}

function webhookEnvelope(
  event: string,
  data: Record<string, unknown>,
  extras: Record<string, unknown> = {},
) {
  return {
    event,
    instance: INSTANCE_NAME,
    data,
    date_time: "2026-08-24T18:00:00.000Z",
    sender: "evolution",
    ...extras,
  };
}

describe("EvolutionWhatsAppProvider", () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;
  let provider: EvolutionWhatsAppProvider;

  beforeEach(() => {
    process.env.EVOLUTION_API_URL = "https://evolution.example.com/";
    process.env.EVOLUTION_API_KEY = API_KEY;
    process.env.EVOLUTION_WEBHOOK_SECRET = WEBHOOK_SECRET;
    process.env.CRM_PUBLIC_API_URL = "https://crm.example.com";
    fetchMock = jest.fn(async (url: string) => {
      if (String(url).includes("/instance/create")) {
        return jsonResponse(201, {
          instance: { instanceName: INSTANCE_NAME, status: "connecting" },
          hash: "instance-token-must-not-leak",
        });
      }
      if (String(url).includes("/webhook/set")) {
        return jsonResponse(201, { enabled: true });
      }
      return jsonResponse(200, {});
    });
    global.fetch = fetchMock as typeof fetch;
    provider = new EvolutionWhatsAppProvider();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  it("creates an instance on the Evolution v2 endpoint with the apikey header", async () => {
    const created = await provider.create(CHANNEL_ID);

    expect(created).toEqual({
      externalInstanceId: INSTANCE_NAME,
      status: ConnectionLifecycleStatus.DRAFT,
    });
    const createCall = fetchMock.mock.calls.find(([url]) => String(url).includes("/instance/create"));
    expect(createCall).toBeDefined();
    const [url, init] = createCall as [string, RequestInit];
    expect(url).toBe("https://evolution.example.com/instance/create");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual(
      expect.objectContaining({
        apikey: API_KEY,
        "Content-Type": "application/json",
      }),
    );
    expect(JSON.parse(String(init.body))).toEqual({
      instanceName: INSTANCE_NAME,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
    });
  });

  it("configures the instance webhook after create with the signature header", async () => {
    await provider.create(CHANNEL_ID);

    const webhookCall = fetchMock.mock.calls.find(([url]) => String(url).includes("/webhook/set"));
    expect(webhookCall).toBeDefined();
    const [url, init] = webhookCall as [string, RequestInit];
    expect(url).toBe(`https://evolution.example.com/webhook/set/${INSTANCE_NAME}`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      webhook: {
        enabled: true,
        url: `https://crm.example.com/api/webhooks/connections/evolution/${INSTANCE_NAME}`,
        byEvents: false,
        base64: false,
        headers: { "x-connection-signature": WEBHOOK_SECRET },
        events: ["CONNECTION_UPDATE", "MESSAGES_UPSERT", "QRCODE_UPDATED"],
      },
    });
  });

  it("reapplies the webhook when create returns 409", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes("/instance/create")) {
        return jsonResponse(409, { message: "already exists" });
      }
      if (String(url).includes("/webhook/set")) {
        return jsonResponse(201, { enabled: true });
      }
      return jsonResponse(200, {});
    });

    const created = await provider.create(CHANNEL_ID);

    expect(created.externalInstanceId).toBe(INSTANCE_NAME);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/webhook/set"))).toBe(true);
  });

  it("converts a real Evolution QR image into qrPayload", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        base64: PNG_BASE64,
        code: "2@not-an-image",
      }),
    );

    const qr = await provider.connect(CHANNEL_ID, INSTANCE_NAME);

    expect(qr.status).toBe(ConnectionLifecycleStatus.QR_PENDING);
    expect(qr.qrPayload).toBe(`data:image/png;base64,${PNG_BASE64}`);
    expect(qr.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(fetchMock.mock.calls[0][0]).toBe(
      `https://evolution.example.com/instance/connect/${INSTANCE_NAME}`,
    );
  });

  it("keeps an Evolution data URL QR payload unchanged", async () => {
    const dataUrl = `data:image/png;base64,${PNG_BASE64}`;
    fetchMock.mockResolvedValue(jsonResponse(200, { qrcode: { base64: dataUrl } }));

    const qr = await provider.getQr(CHANNEL_ID, "already-created-instance");

    expect(qr?.qrPayload).toBe(dataUrl);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://evolution.example.com/instance/connect/already-created-instance",
    );
  });

  it("returns null when Evolution has no QR image", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        instance: { instanceName: INSTANCE_NAME, state: "open" },
      }),
    );

    await expect(provider.getQr(CHANNEL_ID, INSTANCE_NAME)).resolves.toBeNull();
    await expect(provider.connect(CHANNEL_ID, INSTANCE_NAME)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("logs out without deleting the Evolution instance", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { status: "SUCCESS" }));

    await provider.disconnect(CHANNEL_ID, INSTANCE_NAME);

    expect(fetchMock).toHaveBeenCalledWith(
      `https://evolution.example.com/instance/logout/${INSTANCE_NAME}`,
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("treats an already disconnected Evolution instance as success", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, { message: `The "${INSTANCE_NAME}" instance is not connected` }),
    );

    await expect(provider.disconnect(CHANNEL_ID, INSTANCE_NAME)).resolves.toBeUndefined();
  });

  it("times out Evolution requests", async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const error = new Error("Aborted");
          error.name = "AbortError";
          reject(error);
        });
      });
    });

    const pending = provider.create(CHANNEL_ID);
    const assertion = expect(pending).rejects.toBeInstanceOf(ServiceUnavailableException);
    await jest.advanceTimersByTimeAsync(15_000);
    await assertion;
  });

  it("maps 401 without exposing the API key", async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { message: `unauthorized ${API_KEY}` }));

    await expect(provider.create(CHANNEL_ID)).rejects.toBeInstanceOf(BadGatewayException);
    await expect(provider.create(CHANNEL_ID)).rejects.toThrow("Evolution API authentication failed");
    try {
      await provider.create(CHANNEL_ID);
    } catch (error) {
      expect(errorText(error)).not.toContain(API_KEY);
      expect(errorText(error)).not.toContain(WEBHOOK_SECRET);
    }
  });

  it("maps 500 without exposing the API key or webhook secret", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { error: `${API_KEY} ${WEBHOOK_SECRET}` }));

    try {
      await provider.connect(CHANNEL_ID, INSTANCE_NAME);
      throw new Error("expected failure");
    } catch (error) {
      expect(error).toBeInstanceOf(BadGatewayException);
      expect(errorText(error)).toContain("Evolution API is unavailable");
      expect(errorText(error)).not.toContain(API_KEY);
      expect(errorText(error)).not.toContain(WEBHOOK_SECRET);
    }
  });

  it("accepts a matching webhook signature and rejects a wrong one", () => {
    expect(provider.validateWebhook({ event: "connection.update" }, WEBHOOK_SECRET)).toBe(true);
    expect(provider.validateWebhook({ event: "connection.update" }, "wrong")).toBe(false);
  });

  it("never accepts an Evolution webhook without the server-side secret", () => {
    delete process.env.EVOLUTION_WEBHOOK_SECRET;
    expect(provider.validateWebhook({ event: "connection.update" }, "anything")).toBe(false);
  });

  it("normalizes CONNECTION_UPDATE open to connected with displayAccount", () => {
    const event = provider.normalizeWebhook(
      webhookEnvelope("connection.update", {
        instance: INSTANCE_NAME,
        state: "open",
        wuid: "5511999887766@s.whatsapp.net",
        profileName: "Comercial",
        statusReason: 200,
      }),
    );

    expect(event).toEqual({
      kind: "connection_status",
      externalEventId: `evolution:${INSTANCE_NAME}:connection.update:open:2026-08-24T18:00:00.000Z`,
      status: "open",
      displayAccount: "+5511999887766",
      errorCode: "200",
      occurredAt: new Date("2026-08-24T18:00:00.000Z"),
    });
  });

  it("normalizes CONNECTION_UPDATE close", () => {
    const event = provider.normalizeWebhook(
      webhookEnvelope("CONNECTION_UPDATE", {
        instance: INSTANCE_NAME,
        state: "close",
        statusReason: 401,
      }),
    );

    expect(event.kind).toBe("connection_status");
    if (event.kind !== "connection_status") return;
    expect(event.status).toBe("close");
    expect(event.errorCode).toBe("401");
  });

  it("normalizes a simple inbound conversation message", () => {
    const event = provider.normalizeWebhook(
      webhookEnvelope("messages.upsert", {
        key: {
          remoteJid: "5511987654321@s.whatsapp.net",
          fromMe: false,
          id: "MSG123",
        },
        pushName: "Maria Silva",
        message: { conversation: "Olá" },
        messageTimestamp: 1756058400,
      }),
    );

    expect(event).toEqual({
      kind: "inbound_message",
      externalEventId: `evolution:${INSTANCE_NAME}:messages.upsert:MSG123:2026-08-24T18:00:00.000Z`,
      externalMessageId: "MSG123",
      phone: "5511987654321",
      contactName: "Maria Silva",
      body: "Olá",
      occurredAt: new Date("2026-08-24T18:00:00.000Z"),
    });
  });

  it("normalizes extendedTextMessage text", () => {
    const event = provider.normalizeWebhook(
      webhookEnvelope("MESSAGES_UPSERT", {
        key: {
          remoteJid: "5511912345678@s.whatsapp.net",
          fromMe: false,
          id: "MSG456",
        },
        message: { extendedTextMessage: { text: "Segue o link" } },
      }),
    );

    expect(event.kind).toBe("inbound_message");
    if (event.kind !== "inbound_message") return;
    expect(event.body).toBe("Segue o link");
  });

  it("ignores outbound, broadcast, group, and invalid payloads without throwing 400", () => {
    expect(
      provider.normalizeWebhook(
        webhookEnvelope("messages.upsert", {
          key: { remoteJid: "5511987654321@s.whatsapp.net", fromMe: true, id: "OUT1" },
          message: { conversation: "eu enviei" },
        }),
      ),
    ).toEqual({ kind: "ignored", reason: "fromMe" });

    expect(
      provider.normalizeWebhook(
        webhookEnvelope("messages.upsert", {
          key: { remoteJid: "status@broadcast", fromMe: false, id: "ST1" },
          message: { conversation: "status" },
        }),
      ),
    ).toEqual({ kind: "ignored", reason: "broadcast" });

    expect(
      provider.normalizeWebhook(
        webhookEnvelope("messages.upsert", {
          key: { remoteJid: "1203630-group@g.us", fromMe: false, id: "G1" },
          message: { conversation: "grupo" },
        }),
      ),
    ).toEqual({ kind: "ignored", reason: "group" });

    expect(provider.normalizeWebhook(webhookEnvelope("qrcode.updated", { qrcode: {} }))).toEqual({
      kind: "ignored",
      reason: "qrcode.updated",
    });
  });

  it("does not invent a phone number from a LID without a real PN", () => {
    expect(
      provider.normalizeWebhook(
        webhookEnvelope("messages.upsert", {
          key: { remoteJid: "123456789012345@lid", fromMe: false, id: "LID1" },
          message: { conversation: "oi" },
        }),
      ),
    ).toEqual({ kind: "ignored", reason: "missing-phone" });

    const withAlt = provider.normalizeWebhook(
      webhookEnvelope("messages.upsert", {
        key: {
          remoteJid: "123456789012345@lid",
          remoteJidAlt: "5511999999999@s.whatsapp.net",
          fromMe: false,
          id: "LID2",
        },
        message: { conversation: "oi" },
      }),
    );
    expect(withAlt.kind).toBe("inbound_message");
    if (withAlt.kind !== "inbound_message") return;
    expect(withAlt.phone).toBe("5511999999999");
  });

  it("rejects an invalid webhook payload", () => {
    expect(() => provider.normalizeWebhook(null)).toThrow(BadRequestException);
    expect(() => provider.normalizeWebhook("nope")).toThrow(BadRequestException);
  });
});

describe("ConnectionProviderRegistry with Evolution", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns evolution for evolution and whatsapp aliases, and keeps fake working", async () => {
    process.env.NODE_ENV = "test";
    delete process.env.CONNECTION_PROVIDER;
    const fake = new FakeWhatsAppProvider();
    const evolution = new EvolutionWhatsAppProvider();
    const registry = new ConnectionProviderRegistry(fake, evolution);

    expect(registry.get("evolution").name).toBe("evolution");
    expect(registry.get("whatsapp").name).toBe("evolution");
    expect(registry.get("fake").name).toBe("fake");

    const created = await registry.get("fake").create("channel-test");
    expect(created.externalInstanceId).toMatch(/^fake-channel-test-/);
    expect(created.status).toBe(ConnectionLifecycleStatus.DRAFT);
  });
});
