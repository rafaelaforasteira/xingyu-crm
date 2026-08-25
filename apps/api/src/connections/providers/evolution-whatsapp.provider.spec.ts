import {
  BadGatewayException,
  ConflictException,
  HttpException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConnectionLifecycleStatus } from "@xingyu/database";
import { EvolutionWhatsAppProvider } from "./evolution-whatsapp.provider";
import { ConnectionProviderRegistry } from "./connection-provider.registry";
import { FakeWhatsAppProvider } from "./fake-whatsapp.provider";

const API_KEY = "evolution-secret-key-test-value";
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

describe("EvolutionWhatsAppProvider", () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;
  let provider: EvolutionWhatsAppProvider;

  beforeEach(() => {
    process.env.EVOLUTION_API_URL = "https://evolution.example.com/";
    process.env.EVOLUTION_API_KEY = API_KEY;
    delete process.env.EVOLUTION_WEBHOOK_SECRET;
    fetchMock = jest.fn();
    global.fetch = fetchMock as typeof fetch;
    provider = new EvolutionWhatsAppProvider();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  it("creates an instance on the Evolution v2 endpoint with the apikey header", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(201, {
        instance: { instanceName: INSTANCE_NAME, status: "connecting" },
        hash: "instance-token-must-not-leak",
      }),
    );

    const created = await provider.create(CHANNEL_ID);

    expect(created).toEqual({
      externalInstanceId: INSTANCE_NAME,
      status: ConnectionLifecycleStatus.DRAFT,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
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
    }
  });

  it("maps 500 without exposing the API key", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { error: API_KEY }));

    try {
      await provider.connect(CHANNEL_ID, INSTANCE_NAME);
      throw new Error("expected failure");
    } catch (error) {
      expect(error).toBeInstanceOf(BadGatewayException);
      expect(errorText(error)).toContain("Evolution API is unavailable");
      expect(errorText(error)).not.toContain(API_KEY);
    }
  });

  it("never accepts an Evolution webhook without the server-side secret", () => {
    expect(provider.validateWebhook({ event: "connection.update" }, "anything")).toBe(false);
    process.env.EVOLUTION_WEBHOOK_SECRET = "webhook-shared-secret";
    expect(provider.validateWebhook({}, "webhook-shared-secret")).toBe(true);
    expect(provider.validateWebhook({}, "wrong")).toBe(false);
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
