import { Injectable, Logger } from "@nestjs/common";
import { BaseMockAdapter, IntegrationResult } from "./base.adapter";

@Injectable()
export class InstagramAdapter extends BaseMockAdapter {
  private readonly logger = new Logger(InstagramAdapter.name);

  async listConversations(): Promise<
    IntegrationResult<{ conversations: Array<{ id: string; username: string }> }>
  > {
    this.logger.log("[demo] Instagram listConversations");
    return this.success({
      conversations: [
        { id: "ig-demo-1", username: "cliente_demo" },
        { id: "ig-demo-2", username: "loja_parceira" },
      ],
    });
  }

  async sendDm(
    recipientId: string,
    text: string,
  ): Promise<IntegrationResult<{ messageId: string }>> {
    this.logger.log(`[demo] Instagram DM to ${recipientId}`);
    return this.success(
      { messageId: `ig-demo-${Date.now()}` },
      `DM simulated to ${recipientId}: ${text.slice(0, 40)}`,
    );
  }
}
