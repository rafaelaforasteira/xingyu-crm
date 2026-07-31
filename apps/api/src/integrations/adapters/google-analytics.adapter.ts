import { demoSync, type IntegrationAdapter } from "./types";

export const googleAnalyticsAdapter: IntegrationAdapter = {
  name: "Google Analytics",
  isConfigured: () => Boolean(process.env.GOOGLE_ANALYTICS_MEASUREMENT_ID?.trim()),
  sync: () => demoSync("Google Analytics"),
};
