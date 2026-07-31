import { Injectable, Logger } from "@nestjs/common";
import { BaseMockAdapter, IntegrationResult } from "./base.adapter";

@Injectable()
export class WebhooksAdapter extends BaseMockAdapter {
  private readonly logger = new Logger(WebhooksAdapter.name);

  async dispatch(
    event: string,
    payload: Record<string, unknown>,
  ): Promise<IntegrationResult<{ event: string; delivered: boolean }>> {
    this.logger.log(`[demo] Webhook dispatch ${event}`);
    return this.success(
      { event, delivered: false },
      `Webhook ${event} queued in demo mode (not delivered). Payload keys: ${Object.keys(payload).join(", ")}`,
    );
  }

  async verifySignature(_signature: string, _body: string): Promise<boolean> {
    // Demo mode always accepts
    return true;
  }
}
