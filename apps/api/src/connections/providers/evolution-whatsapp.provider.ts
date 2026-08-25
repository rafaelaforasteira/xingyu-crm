import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConnectionLifecycleStatus } from "@xingyu/database";
import { timingSafeEqual } from "node:crypto";
import type {
  ConnectionProvider,
  NormalizedProviderEvent,
  ProviderConnection,
  ProviderQr,
} from "./connection-provider.types";

const QR_TTL_MS = 60_000;
const REQUEST_TIMEOUT_MS = 15_000;
const INTEGRATION = "WHATSAPP-BAILEYS";

type JsonObject = Record<string, unknown>;

@Injectable()
export class EvolutionWhatsAppProvider implements ConnectionProvider {
  readonly name = "evolution";

  async create(channelId: string): Promise<ProviderConnection> {
    const instanceName = this.instanceNameFor(channelId);
    try {
      const payload = await this.request("POST", "/instance/create", {
        instanceName,
        qrcode: true,
        integration: INTEGRATION,
      });
      return {
        externalInstanceId: this.readInstanceName(payload, instanceName),
        status: ConnectionLifecycleStatus.DRAFT,
      };
    } catch (error) {
      if (this.statusOf(error) === 409) {
        return {
          externalInstanceId: instanceName,
          status: ConnectionLifecycleStatus.DRAFT,
        };
      }
      throw error;
    }
  }

  async connect(_channelId: string, externalInstanceId: string): Promise<ProviderQr> {
    const qr = await this.readQr(externalInstanceId);
    if (!qr) {
      throw new ConflictException("Evolution QR code is unavailable");
    }
    return qr;
  }

  async getQr(_channelId: string, externalInstanceId: string): Promise<ProviderQr | null> {
    return this.readQr(externalInstanceId);
  }

  async disconnect(_channelId: string, externalInstanceId: string): Promise<void> {
    try {
      await this.request(
        "DELETE",
        `/instance/logout/${encodeURIComponent(externalInstanceId)}`,
      );
    } catch (error) {
      const status = this.statusOf(error);
      if (status === 400 || status === 404) return;
      throw error;
    }
  }

  validateWebhook(_payload: unknown, signature?: string): boolean {
    const secret = process.env.EVOLUTION_WEBHOOK_SECRET?.trim();
    if (!secret || !signature) return false;
    const expected = Buffer.from(secret);
    const supplied = Buffer.from(signature);
    if (expected.length !== supplied.length) return false;
    return timingSafeEqual(expected, supplied);
  }

  normalizeWebhook(_payload: unknown): NormalizedProviderEvent {
    throw new BadRequestException("Evolution webhook normalization is not implemented");
  }

  private async readQr(externalInstanceId: string): Promise<ProviderQr | null> {
    const payload = await this.request(
      "GET",
      `/instance/connect/${encodeURIComponent(externalInstanceId)}`,
    );
    if (this.hasEvolutionError(payload)) {
      throw new BadGatewayException("Evolution API request failed");
    }
    const qrPayload = this.extractQrImage(payload);
    if (!qrPayload) return null;
    return {
      qrPayload,
      expiresAt: new Date(Date.now() + QR_TTL_MS),
      status: ConnectionLifecycleStatus.QR_PENDING,
    };
  }

  private instanceNameFor(channelId: string) {
    const sanitized = channelId
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `xingyu-${sanitized || "channel"}`.slice(0, 100);
  }

  private readInstanceName(payload: unknown, fallback: string) {
    const record = this.asObject(payload);
    const instance = this.asObject(record?.instance);
    const names = [instance?.instanceName, record?.instanceName];
    for (const name of names) {
      if (typeof name === "string" && name.trim()) return name.trim();
    }
    return fallback;
  }

  private extractQrImage(payload: unknown): string | null {
    const record = this.asObject(payload);
    if (!record) return null;
    const nested = [this.asObject(record.qrcode), this.asObject(record.qr)];
    const candidates = [record.base64, nested[0]?.base64, nested[1]?.base64];
    for (const candidate of candidates) {
      const image = this.toDataUrl(candidate);
      if (image) return image;
    }
    return null;
  }

  private toDataUrl(value: unknown): string | null {
    if (typeof value !== "string" || !value.trim()) return null;
    const trimmed = value.trim();
    if (trimmed.startsWith("data:image/")) return trimmed;
    if (trimmed.startsWith("2@")) return null;
    if (trimmed.length < 32 || !/^[A-Za-z0-9+/=\s]+$/.test(trimmed)) return null;
    return `data:image/png;base64,${trimmed.replace(/\s/g, "")}`;
  }

  private async request(method: string, path: string, body?: JsonObject) {
    const { baseUrl, apiKey } = this.config();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          apikey: apiKey,
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      const text = await response.text();
      const payload = this.parseJson(text);
      if (!response.ok) {
        throw this.httpError(response.status);
      }
      return payload;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (this.isTimeout(error)) {
        throw new ServiceUnavailableException(this.redact("Evolution API request timed out"));
      }
      throw new ServiceUnavailableException(this.redact("Evolution API is unavailable"));
    } finally {
      clearTimeout(timer);
    }
  }

  private config() {
    const baseUrl = process.env.EVOLUTION_API_URL?.trim().replace(/\/+$/, "");
    const apiKey = process.env.EVOLUTION_API_KEY?.trim();
    if (!baseUrl || !apiKey) {
      throw new ServiceUnavailableException("Evolution API is not configured");
    }
    return { baseUrl, apiKey };
  }

  private parseJson(text: string): unknown {
    if (!text.trim()) return null;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new BadGatewayException("Evolution API returned an invalid response");
    }
  }

  private httpError(status: number) {
    if (status === 400) {
      return new BadRequestException("Evolution API request failed");
    }
    if (status === 401 || status === 403) {
      return new BadGatewayException("Evolution API authentication failed");
    }
    if (status === 404) {
      return new NotFoundException("Evolution instance was not found");
    }
    if (status === 409) {
      return new ConflictException("Evolution instance already exists");
    }
    if (status >= 500) {
      return new BadGatewayException("Evolution API is unavailable");
    }
    return new BadGatewayException("Evolution API request failed");
  }

  private statusOf(error: unknown) {
    return error instanceof HttpException ? error.getStatus() : 0;
  }

  private isTimeout(error: unknown) {
    return Boolean(error && typeof error === "object" && "name" in error && error.name === "AbortError");
  }

  private hasEvolutionError(payload: unknown) {
    const record = this.asObject(payload);
    return record?.error === true;
  }

  private asObject(value: unknown): JsonObject | null {
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as JsonObject)
      : null;
  }

  private redact(message: string) {
    const key = process.env.EVOLUTION_API_KEY?.trim();
    if (!key) return message;
    return message.split(key).join("[redacted]");
  }
}
