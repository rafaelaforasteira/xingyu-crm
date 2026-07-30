import { demoSync, type IntegrationAdapter } from "./types";

export const whatsappAdapter: IntegrationAdapter = {
  name: "WhatsApp",
  isConfigured: () => Boolean(process.env.WHATSAPP_API_TOKEN?.trim()),
  sync: () => demoSync("WhatsApp"),
};
