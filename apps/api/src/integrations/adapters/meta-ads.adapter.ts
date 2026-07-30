import { demoSync, type IntegrationAdapter } from "./types";

export const metaAdsAdapter: IntegrationAdapter = {
  name: "Meta Ads",
  isConfigured: () => Boolean(process.env.META_ADS_ACCESS_TOKEN?.trim()),
  sync: () => demoSync("Meta Ads"),
};
