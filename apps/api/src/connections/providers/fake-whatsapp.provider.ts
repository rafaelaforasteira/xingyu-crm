import { BadRequestException, Injectable } from "@nestjs/common";
import { ConnectionLifecycleStatus } from "@xingyu/database";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type {
  ConnectionProvider,
  NormalizedProviderEvent,
  ProviderConnection,
  ProviderOutboundTextResult,
  ProviderQr,
} from "./connection-provider.types";

type QrState = ProviderQr & { timer: NodeJS.Timeout };

@Injectable()
export class FakeWhatsAppProvider implements ConnectionProvider {
  readonly name = "fake";
  private readonly qrs = new Map<string, QrState>();

  async create(channelId: string): Promise<ProviderConnection> {
    return {
      externalInstanceId: `fake-${channelId}-${randomUUID()}`,
      status: ConnectionLifecycleStatus.DRAFT,
    };
  }

  async connect(channelId: string, _externalInstanceId?: string): Promise<ProviderQr> {
    this.clearQr(channelId);
    const expiresAt = new Date(Date.now() + 60_000);
    const value = `xingyu:${channelId}:${randomUUID()}`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><rect width="100%" height="100%" fill="white"/><text x="16" y="160" font-family="monospace" font-size="12">${value}</text></svg>`;
    const qr: ProviderQr = {
      qrPayload: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
      expiresAt,
      status: ConnectionLifecycleStatus.QR_PENDING,
    };
    const timer = setTimeout(() => this.qrs.delete(channelId), 60_000);
    timer.unref();
    this.qrs.set(channelId, { ...qr, timer });
    return qr;
  }

  async getQr(channelId: string, _externalInstanceId?: string): Promise<ProviderQr | null> {
    const qr = this.qrs.get(channelId);
    if (!qr || qr.expiresAt <= new Date()) {
      this.clearQr(channelId);
      return null;
    }
    const { timer: _timer, ...result } = qr;
    return result;
  }

  async disconnect(channelId: string, _externalInstanceId?: string): Promise<void> {
    this.clearQr(channelId);
  }

  async deleteInstance(channelId: string, _externalInstanceId?: string): Promise<void> {
    this.clearQr(channelId);
  }

  async sendText(
    _channelId: string,
    _externalInstanceId: string,
    destination: string,
    _text: string,
  ): Promise<ProviderOutboundTextResult> {
    return {
      externalMessageId: `fake-${randomUUID()}`,
      remoteJid: `${destination}@s.whatsapp.net`,
      status: "SENT",
    };
  }

  simulateScan(channelId: string) {
    this.clearQr(channelId);
    return {
      status: ConnectionLifecycleStatus.CONNECTED,
      displayAccount: `+55 11 9${channelId.replace(/\D/g, "").slice(-8).padStart(8, "0")}`,
    };
  }

  validateWebhook(payload: unknown, signature?: string): boolean {
    const secret = process.env.CONNECTION_WEBHOOK_SECRET;
    if (!secret || !signature) return process.env.NODE_ENV === "test" && signature === "test";
    const expected = createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
    const supplied = signature.replace(/^sha256=/i, "");
    if (expected.length !== supplied.length) return false;
    return timingSafeEqual(Buffer.from(expected), Buffer.from(supplied));
  }

  normalizeWebhook(payload: unknown): NormalizedProviderEvent {
    if (!payload || typeof payload !== "object") {
      throw new BadRequestException("Invalid webhook payload");
    }
    const value = payload as Record<string, unknown>;
    const externalEventId = this.required(value.externalEventId, "externalEventId");
    const occurredAt =
      typeof value.occurredAt === "string" && !Number.isNaN(Date.parse(value.occurredAt))
        ? new Date(value.occurredAt)
        : new Date();
    if (value.type === "connection.status") {
      return {
        kind: "connection_status",
        externalEventId,
        status: this.required(value.status, "status"),
        displayAccount: this.optional(value.displayAccount),
        errorCode: this.optional(value.errorCode),
        occurredAt,
      };
    }
    return {
      kind: "inbound_message",
      externalEventId,
      externalMessageId: this.optional(value.externalMessageId),
      phone: this.required(value.phone, "phone"),
      contactName: this.optional(value.contactName),
      body: this.required(value.body, "body"),
      occurredAt,
    };
  }

  private required(value: unknown, field: string) {
    if (typeof value !== "string" || !value.trim()) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    return value.trim();
  }

  private optional(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }

  private clearQr(channelId: string) {
    const qr = this.qrs.get(channelId);
    if (qr) clearTimeout(qr.timer);
    this.qrs.delete(channelId);
  }
}
