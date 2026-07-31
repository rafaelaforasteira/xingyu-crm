import { Injectable, Logger } from "@nestjs/common";
import { BaseMockAdapter, IntegrationResult } from "./base.adapter";

@Injectable()
export class GoogleAnalyticsAdapter extends BaseMockAdapter {
  private readonly logger = new Logger(GoogleAnalyticsAdapter.name);

  async getOverview(): Promise<
    IntegrationResult<{
      sessions: number;
      users: number;
      conversions: number;
      measurementId: string;
    }>
  > {
    this.logger.log("[demo] GA overview");
    return this.success({
      sessions: 8420,
      users: 6100,
      conversions: 96,
      measurementId: process.env.GOOGLE_ANALYTICS_MEASUREMENT_ID || "G-DEMO000000",
    });
  }

  async trackEvent(
    name: string,
    params?: Record<string, unknown>,
  ): Promise<IntegrationResult<{ tracked: boolean }>> {
    this.logger.log(`[demo] GA event ${name}`, params);
    return this.success({ tracked: true }, `Event ${name} simulated (demo mode)`);
  }
}
