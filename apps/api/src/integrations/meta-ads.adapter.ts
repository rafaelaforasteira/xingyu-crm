import { Injectable, Logger } from "@nestjs/common";
import { BaseMockAdapter, IntegrationResult } from "./base.adapter";

@Injectable()
export class MetaAdsAdapter extends BaseMockAdapter {
  private readonly logger = new Logger(MetaAdsAdapter.name);

  async listCampaigns(): Promise<
    IntegrationResult<{
      campaigns: Array<{ id: string; name: string; status: string; spend: number }>;
    }>
  > {
    this.logger.log("[demo] Meta Ads listCampaigns");
    return this.success({
      campaigns: [
        { id: "meta-demo-1", name: "Xingyu Awareness", status: "ACTIVE", spend: 1250.5 },
        { id: "meta-demo-2", name: "Retargeting Jul", status: "PAUSED", spend: 420 },
      ],
    });
  }

  async getInsights(campaignId: string): Promise<
    IntegrationResult<{
      campaignId: string;
      impressions: number;
      clicks: number;
      conversions: number;
    }>
  > {
    return this.success({
      campaignId,
      impressions: 15000,
      clicks: 420,
      conversions: 18,
    });
  }
}
