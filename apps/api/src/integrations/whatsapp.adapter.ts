import { Injectable, Logger } from "@nestjs/common";
import { BaseMockAdapter, IntegrationResult } from "./base.adapter";

@Injectable()
export class WhatsAppAdapter extends BaseMockAdapter {
  private readonly logger = new Logger(WhatsAppAdapter.name);

  async sendMessage(
    to: string,
    body: string,
  ): Promise<IntegrationResult<{ messageId: string; to: string; body: string }>> {
    this.logger.log(`[demo] WhatsApp send to ${to}`);
    return this.success(
      {
        messageId: `wa-demo-${Date.now()}`,
        to,
        body,
      },
      "WhatsApp message simulated (demo mode — not sent)",
    );
  }

  async getTemplates(): Promise<IntegrationResult<{ templates: string[] }>> {
    return this.success({
      templates: ["welcome", "follow_up", "payment_reminder", "order_shipped"],
    });
  }
}
