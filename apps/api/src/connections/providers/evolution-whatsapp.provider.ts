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
  ProviderOutboundTextResult,
  ProviderQr,
} from "./connection-provider.types";

const QR_TTL_MS = 60_000;
const REQUEST_TIMEOUT_MS = 15_000;
const INTEGRATION = "WHATSAPP-BAILEYS";
const WEBHOOK_EVENTS = ["CONNECTION_UPDATE", "MESSAGES_UPSERT", "QRCODE_UPDATED"];

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
      const externalInstanceId = this.readInstanceName(payload, instanceName);
      await this.ensureWebhook(externalInstanceId);
      return {
        externalInstanceId,
        status: ConnectionLifecycleStatus.DRAFT,
      };
    } catch (error) {
      if (this.statusOf(error) === 409) {
        await this.ensureWebhook(instanceName);
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

  async sendText(
    _channelId: string,
    externalInstanceId: string,
    destination: string,
    text: string,
  ): Promise<ProviderOutboundTextResult> {
    const payload = await this.request(
      "POST",
      `/message/sendText/${encodeURIComponent(externalInstanceId)}`,
      {
        number: destination,
        text,
      },
    );
    if (this.hasEvolutionError(payload)) {
      throw new BadGatewayException("Evolution API request failed");
    }
    return this.readOutboundResult(payload);
  }

  async ensureWebhook(externalInstanceId: string): Promise<void> {
    const secret = process.env.EVOLUTION_WEBHOOK_SECRET?.trim();
    if (!secret) {
      throw new ServiceUnavailableException("Evolution webhook secret is not configured");
    }
    await this.request("POST", `/webhook/set/${encodeURIComponent(externalInstanceId)}`, {
      webhook: {
        enabled: true,
        url: this.webhookUrl(externalInstanceId),
        byEvents: false,
        base64: false,
        headers: { "x-connection-signature": secret },
        events: WEBHOOK_EVENTS,
      },
    });
  }

  validateWebhook(_payload: unknown, signature?: string): boolean {
    const secret = process.env.EVOLUTION_WEBHOOK_SECRET?.trim();
    if (!secret || !signature) return false;
    const expected = Buffer.from(secret);
    const supplied = Buffer.from(signature);
    if (expected.length !== supplied.length) return false;
    return timingSafeEqual(expected, supplied);
  }

  normalizeWebhook(payload: unknown): NormalizedProviderEvent {
    const record = this.asObject(payload);
    if (!record) {
      throw new BadRequestException("Invalid webhook payload");
    }
    const eventName = this.eventName(record);
    const data = this.asObject(record.data) ?? record;
    const instance = this.stringValue(record.instance) ?? this.stringValue(data.instance) ?? "unknown";
    const occurredAt = this.occurredAt(record, data);

    if (eventName === "connection.update") {
      return this.normalizeConnectionUpdate(instance, data, occurredAt, record);
    }
    if (eventName === "messages.upsert") {
      return this.normalizeMessageUpsert(instance, data, occurredAt, record);
    }
    if (!eventName) {
      throw new BadRequestException("Invalid webhook payload");
    }
    return { kind: "ignored", reason: eventName };
  }

  private normalizeConnectionUpdate(
    instance: string,
    data: JsonObject,
    occurredAt: Date,
    envelope: JsonObject,
  ): NormalizedProviderEvent {
    const status =
      this.stringValue(data.state) ??
      this.stringValue(data.status) ??
      this.stringValue(this.asObject(data.instance)?.state);
    if (!status) return { kind: "ignored", reason: "connection.update-missing-state" };
    const wuid = this.stringValue(data.wuid) ?? this.stringValue(data.ownerJid);
    const phone = this.phoneFromJid(wuid);
    const dateTime = this.stringValue(envelope.date_time) ?? occurredAt.toISOString();
    const statusReason = data.statusReason;
    return {
      kind: "connection_status",
      externalEventId: `evolution:${instance}:connection.update:${status}:${dateTime}`,
      status,
      displayAccount: phone ? `+${phone}` : undefined,
      errorCode:
        statusReason === undefined || statusReason === null ? undefined : String(statusReason),
      occurredAt,
    };
  }

  private normalizeMessageUpsert(
    instance: string,
    data: JsonObject,
    occurredAt: Date,
    envelope: JsonObject,
  ): NormalizedProviderEvent {
    const message = this.firstMessage(data);
    const key = this.asObject(message.key) ?? {};
    if (key.fromMe === true) return { kind: "ignored", reason: "fromMe" };

    const remoteJid = this.stringValue(key.remoteJid) ?? "";
    if (this.isBroadcast(remoteJid)) return { kind: "ignored", reason: "broadcast" };
    if (this.isGroup(remoteJid)) return { kind: "ignored", reason: "group" };

    const bodyMessage = this.asObject(message.message) ?? {};
    if (bodyMessage.protocolMessage) return { kind: "ignored", reason: "protocolMessage" };
    if (bodyMessage.reactionMessage) return { kind: "ignored", reason: "reactionMessage" };

    const body = this.messageText(bodyMessage);
    if (!body) return { kind: "ignored", reason: "unsupported-body" };

    const phone = this.messagePhone(key, remoteJid);
    if (!phone) return { kind: "ignored", reason: "missing-phone" };

    const messageId = this.stringValue(key.id) ?? "unknown";
    const dateTime = this.stringValue(envelope.date_time) ?? occurredAt.toISOString();
    return {
      kind: "inbound_message",
      externalEventId: `evolution:${instance}:messages.upsert:${messageId}:${dateTime}`,
      externalMessageId: messageId,
      phone,
      contactName: this.stringValue(message.pushName),
      body,
      occurredAt,
    };
  }

  private firstMessage(data: JsonObject) {
    if (Array.isArray(data.messages)) {
      const first = this.asObject(data.messages[0]);
      if (first) return first;
    }
    return data;
  }

  private messagePhone(key: JsonObject, remoteJid: string) {
    const candidates = [
      remoteJid,
      this.stringValue(key.remoteJidAlt),
      this.stringValue(key.senderPn),
      this.stringValue(key.participantAlt),
    ];
    for (const candidate of candidates) {
      const phone = this.phoneFromJid(candidate);
      if (phone) return phone;
    }
    return null;
  }

  private phoneFromJid(value: string | null) {
    if (!value) return null;
    const jid = value.trim();
    if (!jid || this.isGroup(jid) || this.isBroadcast(jid) || this.isLid(jid)) return null;
    const local = jid.includes("@") ? jid.split("@")[0] : jid;
    if (jid.includes("@") && !jid.includes("@s.whatsapp.net")) return null;
    const digits = local.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) return null;
    return digits;
  }

  private messageText(message: JsonObject) {
    const conversation = this.stringValue(message.conversation);
    if (conversation) return conversation;
    const extended = this.asObject(message.extendedTextMessage);
    return this.stringValue(extended?.text);
  }

  private isGroup(jid: string) {
    return jid.includes("@g.us");
  }

  private isBroadcast(jid: string) {
    return jid === "status@broadcast" || jid.includes("@broadcast");
  }

  private isLid(jid: string) {
    return jid.includes("@lid");
  }

  private eventName(record: JsonObject) {
    const raw = this.stringValue(record.event) ?? this.stringValue(record.type);
    if (!raw) return "";
    return raw.toLowerCase().replace(/_/g, ".");
  }

  private occurredAt(envelope: JsonObject, data: JsonObject) {
    const dateTime = this.stringValue(envelope.date_time);
    if (dateTime && !Number.isNaN(Date.parse(dateTime))) return new Date(dateTime);
    const timestamp = data.messageTimestamp;
    if (typeof timestamp === "number" && Number.isFinite(timestamp)) {
      return new Date(timestamp < 1e12 ? timestamp * 1000 : timestamp);
    }
    if (typeof timestamp === "string" && /^\d+$/.test(timestamp)) {
      const numeric = Number(timestamp);
      return new Date(numeric < 1e12 ? numeric * 1000 : numeric);
    }
    return new Date();
  }

  private webhookUrl(instanceName: string) {
    const base = process.env.CRM_PUBLIC_API_URL?.trim().replace(/\/+$/, "");
    if (!base) {
      throw new ServiceUnavailableException("CRM public API URL is not configured");
    }
    return `${base}/api/webhooks/connections/evolution/${encodeURIComponent(instanceName)}`;
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

  private readOutboundResult(payload: unknown): ProviderOutboundTextResult {
    const record = this.asObject(payload);
    const key = this.asObject(record?.key);
    return {
      externalMessageId:
        this.stringValue(key?.id) ??
        this.stringValue(record?.keyId) ??
        this.stringValue(record?.messageId),
      remoteJid: this.stringValue(key?.remoteJid),
      status: this.stringValue(record?.status) ?? this.stringValue(record?.messageStatus),
    };
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

  private stringValue(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  private asObject(value: unknown): JsonObject | null {
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as JsonObject)
      : null;
  }

  private redact(message: string) {
    let result = message;
    for (const value of [process.env.EVOLUTION_API_KEY, process.env.EVOLUTION_WEBHOOK_SECRET]) {
      const secret = value?.trim();
      if (secret) result = result.split(secret).join("[redacted]");
    }
    return result;
  }
}
