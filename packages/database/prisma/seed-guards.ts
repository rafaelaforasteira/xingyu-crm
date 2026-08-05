import fs from "node:fs";
import path from "node:path";

/** Stable IDs for the /operacao demo conversation (idempotent upserts). */
export const OPERATION_DEMO_IDS = {
  contactId: "ct-29",
  conversationId: "conv-operacao-demo",
  dealId: "deal-operacao-demo",
  channelId: "ch-whatsapp",
  pipelineId: "pipe-novos",
  stageId: "st-novos-contatado",
  ownerId: "user-juliana",
} as const;

/** Conversation History MVP demo threads (pipeline pipe-novos). */
export const HISTORY_MVP_THREADS = [
  {
    key: "claudia",
    contactId: "ct-29",
    conversationId: "conv-operacao-demo",
    dealId: "deal-operacao-demo",
    channelId: "ch-whatsapp",
    ownerId: "user-juliana",
    stageId: "st-novos-contatado",
  },
  {
    key: "amanda",
    contactId: "ct-16",
    conversationId: "conv-01",
    dealId: "deal-01",
    channelId: "ch-whatsapp",
    ownerId: "user-amanda",
    stageId: "st-novos-novo",
  },
  {
    key: "leticia",
    contactId: "ct-18",
    conversationId: "conv-04",
    dealId: "deal-03",
    channelId: "ch-whatsapp",
    ownerId: "user-carla",
    stageId: "st-novos-novo",
  },
  {
    key: "luciana",
    contactId: "ct-34",
    conversationId: "conv-11",
    dealId: "deal-05",
    channelId: "ch-whatsapp",
    ownerId: "user-amanda",
    stageId: "st-novos-novo",
  },
  {
    key: "caroline",
    contactId: "ct-17",
    conversationId: "conv-02",
    dealId: "deal-02",
    channelId: "ch-instagram",
    ownerId: "user-juliana",
    stageId: "st-novos-contatado",
  },
] as const;

/**
 * Demo / homologation seed must never run against production.
 */
export function assertDemoSeedAllowed(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): void {
  if ((nodeEnv ?? "development") === "production") {
    throw new Error(
      "Seed de autenticação/homologação não deve rodar com NODE_ENV=production.",
    );
  }
}

/** Writes tiny demo media files under apps/api/uploads for history MVP. */
export function ensureDemoUploadFiles(): {
  imageUrl: string;
  documentUrl: string;
  audioUrl: string;
} {
  const uploadRoot = path.resolve(
    __dirname,
    "../../../apps/api/uploads/demo-history",
  );
  fs.mkdirSync(uploadRoot, { recursive: true });

  const imagePath = path.join(uploadRoot, "catalogo.png");
  const docPath = path.join(uploadRoot, "tabela-precos.txt");
  const audioPath = path.join(uploadRoot, "nota-voz.webm");

  // Minimal 1x1 PNG
  if (!fs.existsSync(imagePath)) {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    fs.writeFileSync(imagePath, png);
  }
  if (!fs.existsSync(docPath)) {
    fs.writeFileSync(
      docPath,
      "Tabela de preços Xingyu (demo)\nKit inicial: R$ 1.890\n",
      "utf8",
    );
  }
  if (!fs.existsSync(audioPath)) {
    // Tiny placeholder bytes — browser may not play, but attachment UI still shows.
    fs.writeFileSync(audioPath, Buffer.from("demo-audio-placeholder"));
  }

  return {
    imageUrl: "/api/uploads/files/demo-history/catalogo.png",
    documentUrl: "/api/uploads/files/demo-history/tabela-precos.txt",
    audioUrl: "/api/uploads/files/demo-history/nota-voz.webm",
  };
}
