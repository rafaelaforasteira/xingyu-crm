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
