import type { PrismaClient } from "@prisma/client";
import {
  ConversationStatus,
  DealStatus,
  MessageDirection,
  MessageStatus,
} from "@prisma/client";
import { ensureDemoUploadFiles, OPERATION_DEMO_IDS } from "./seed-guards";

type Ago = {
  hoursAgo: (n: number) => Date;
  daysAgo: (n: number) => Date;
};

type MsgDef = {
  id: string;
  body: string | null;
  direction: MessageDirection;
  senderId?: string | null;
  sentAt: Date;
  status?: MessageStatus;
  metadata?: Record<string, unknown>;
  attachment?: {
    id: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    url: string;
    kind: string;
  };
};

async function ensureMessage(
  prisma: PrismaClient,
  conversationId: string,
  channelId: string,
  def: MsgDef,
): Promise<boolean> {
  const existing = await prisma.message.findUnique({
    where: { id: def.id },
    select: { id: true },
  });
  if (existing) return false;

  await prisma.message.create({
    data: {
      id: def.id,
      conversationId,
      channelId,
      body: def.body,
      direction: def.direction,
      senderId: def.senderId ?? undefined,
      status:
        def.status ??
        (def.direction === MessageDirection.INBOUND
          ? MessageStatus.DELIVERED
          : MessageStatus.SENT),
      sentAt: def.sentAt,
      createdAt: def.sentAt,
      metadata: def.metadata ?? undefined,
      ...(def.attachment
        ? {
            attachments: {
              create: {
                id: def.attachment.id,
                fileName: def.attachment.fileName,
                mimeType: def.attachment.mimeType,
                fileSize: def.attachment.fileSize,
                url: def.attachment.url,
                kind: def.attachment.kind,
              },
            },
          }
        : {}),
    },
  });
  return true;
}

function claudiaExtraMessages(
  conversationId: string,
  ownerId: string,
  ago: Ago,
  files: ReturnType<typeof ensureDemoUploadFiles>,
): MsgDef[] {
  const longBody = [
    "Cláudia, segue o resumo completo do kit Essência que montamos:",
    "",
    "• 6 colares dourados (referência ES-01)",
    "• 4 pulseiras mistas",
    "• 2 pares de brincos",
    "",
    "Valor total: R$ 1.860,00 com frete estimado para Cuiabá.",
    "Prazo após PIX: 5 a 8 dias úteis. Qualquer dúvida é só responder aqui 😊✨",
  ].join("\n");

  return [
    {
      id: `${conversationId}-hist-9`,
      body: "Bom dia! Ainda estou pensando no kit 😊",
      direction: MessageDirection.INBOUND,
      sentAt: ago.hoursAgo(50),
      status: MessageStatus.READ,
    },
    {
      id: `${conversationId}-hist-10`,
      body: "Bom dia, Cláudia! Sem pressa. Posso te enviar fotos das peças.",
      direction: MessageDirection.OUTBOUND,
      senderId: ownerId,
      sentAt: ago.hoursAgo(49.5),
      status: MessageStatus.READ,
    },
    {
      id: `${conversationId}-hist-11`,
      body: null,
      direction: MessageDirection.OUTBOUND,
      senderId: ownerId,
      sentAt: ago.hoursAgo(49),
      status: MessageStatus.READ,
      attachment: {
        id: `${conversationId}-att-image`,
        fileName: "catalogo.png",
        mimeType: "image/png",
        fileSize: 70,
        url: files.imageUrl,
        kind: "image",
      },
    },
    {
      id: `${conversationId}-hist-12`,
      body: "Recebi a foto, gostei muito!",
      direction: MessageDirection.INBOUND,
      sentAt: ago.hoursAgo(48),
      status: MessageStatus.READ,
    },
    {
      id: `${conversationId}-hist-13`,
      body: "Também enviei a tabela de preços em anexo.",
      direction: MessageDirection.OUTBOUND,
      senderId: ownerId,
      sentAt: ago.hoursAgo(47.5),
      status: MessageStatus.DELIVERED,
      attachment: {
        id: `${conversationId}-att-doc`,
        fileName: "tabela-precos.txt",
        mimeType: "text/plain",
        fileSize: 64,
        url: files.documentUrl,
        kind: "document",
      },
    },
    {
      id: `${conversationId}-hist-14`,
      body: "Áudio rápido sobre prazo 🎤",
      direction: MessageDirection.OUTBOUND,
      senderId: ownerId,
      sentAt: ago.hoursAgo(47),
      status: MessageStatus.DELIVERED,
      attachment: {
        id: `${conversationId}-att-audio`,
        fileName: "nota-voz.webm",
        mimeType: "audio/webm",
        fileSize: 24,
        url: files.audioUrl,
        kind: "audio",
      },
    },
    {
      id: `${conversationId}-hist-15`,
      body: longBody,
      direction: MessageDirection.OUTBOUND,
      senderId: ownerId,
      sentAt: ago.hoursAgo(26),
      status: MessageStatus.READ,
    },
    {
      id: `${conversationId}-hist-16`,
      body: "Nossa, ficou bem claro. Obrigada! 🙌",
      direction: MessageDirection.INBOUND,
      sentAt: ago.hoursAgo(25),
      status: MessageStatus.READ,
    },
    {
      id: `${conversationId}-hist-17`,
      body: "Disponível também em prata se preferir.",
      direction: MessageDirection.OUTBOUND,
      senderId: ownerId,
      sentAt: ago.hoursAgo(24),
      status: MessageStatus.READ,
      metadata: { senderType: "automation" },
    },
    {
      id: `${conversationId}-hist-18`,
      body: "Prefiro dourado mesmo.",
      direction: MessageDirection.INBOUND,
      sentAt: ago.hoursAgo(23),
      status: MessageStatus.READ,
    },
    {
      id: `${conversationId}-hist-19`,
      body: "Combinado. Reserva válida por 48h.",
      direction: MessageDirection.OUTBOUND,
      senderId: ownerId,
      sentAt: ago.hoursAgo(22),
      status: MessageStatus.READ,
    },
    {
      id: `${conversationId}-hist-20`,
      body: "Posso pagar amanhã de manhã?",
      direction: MessageDirection.INBOUND,
      sentAt: ago.hoursAgo(20),
      status: MessageStatus.READ,
    },
    {
      id: `${conversationId}-hist-21`,
      body: "Pode sim!",
      direction: MessageDirection.OUTBOUND,
      senderId: ownerId,
      sentAt: ago.hoursAgo(19.5),
      status: MessageStatus.DELIVERED,
    },
    {
      id: `${conversationId}-hist-22`,
      body: "Vocês embalam para presente?",
      direction: MessageDirection.INBOUND,
      sentAt: ago.hoursAgo(12),
      status: MessageStatus.READ,
    },
    {
      id: `${conversationId}-hist-23`,
      body: "Sim, embalagem kraft sem custo extra.",
      direction: MessageDirection.OUTBOUND,
      senderId: ownerId,
      sentAt: ago.hoursAgo(11.5),
      status: MessageStatus.READ,
    },
    {
      id: `${conversationId}-hist-24`,
      body: "Perfeito ❤️",
      direction: MessageDirection.INBOUND,
      sentAt: ago.hoursAgo(10),
      status: MessageStatus.READ,
    },
    {
      id: `${conversationId}-hist-25`,
      body: "Qual a chave Pix?",
      direction: MessageDirection.INBOUND,
      sentAt: ago.hoursAgo(8),
      status: MessageStatus.READ,
    },
    {
      id: `${conversationId}-hist-26`,
      body: "CNPJ Xingyu — envio o QR na sequência.",
      direction: MessageDirection.OUTBOUND,
      senderId: ownerId,
      sentAt: ago.hoursAgo(7.5),
      status: MessageStatus.SENT,
    },
    {
      id: `${conversationId}-hist-27`,
      body: "Ok, aguardo.",
      direction: MessageDirection.INBOUND,
      sentAt: ago.hoursAgo(7),
      status: MessageStatus.DELIVERED,
    },
    {
      id: `${conversationId}-hist-28`,
      body: "Só confirmando: frete incluso até 2kg.",
      direction: MessageDirection.OUTBOUND,
      senderId: ownerId,
      sentAt: ago.hoursAgo(3),
      status: MessageStatus.DELIVERED,
    },
    {
      id: `${conversationId}-hist-29`,
      body: "Sim, kit fica abaixo de 2kg.",
      direction: MessageDirection.OUTBOUND,
      senderId: ownerId,
      sentAt: ago.hoursAgo(2.5),
      status: MessageStatus.DELIVERED,
    },
    {
      id: `${conversationId}-hist-30`,
      body: "Maravilha, fecho com vocês! 🎉",
      direction: MessageDirection.INBOUND,
      sentAt: ago.hoursAgo(0.15),
      status: MessageStatus.DELIVERED,
    },
  ];
}

/**
 * Idempotent Conversation History MVP demo enrichment.
 * Extends Cláudia + Amanda + Letícia + Luciana + Caroline threads.
 * Never deletes existing rows; create-only by stable IDs.
 */
export async function ensureConversationHistoryMvp(
  prisma: PrismaClient,
  orgId: string,
  ago: Ago,
): Promise<void> {
  const files = ensureDemoUploadFiles();
  const {
    conversationId: claudiaConv,
    channelId: whatsappId,
    ownerId: julianaId,
  } = OPERATION_DEMO_IDS;

  const claudiaExists = await prisma.conversation.findUnique({
    where: { id: claudiaConv },
    select: { id: true },
  });
  if (!claudiaExists) {
    console.log(
      "Conversation History MVP: conv-operacao-demo ausente; rode ensureOperationDemoConversation primeiro.",
    );
    return;
  }

  let created = 0;
  for (const def of claudiaExtraMessages(
    claudiaConv,
    julianaId,
    ago,
    files,
  )) {
    if (await ensureMessage(prisma, claudiaConv, whatsappId, def)) created += 1;
  }

  // Amanda Vieira — extra msgs + awaiting reply (last inbound)
  const amandaMsgs: MsgDef[] = [
    {
      id: "conv-01-hist-mvp-1",
      body: "Consegue me mandar fotos das pulseiras?",
      direction: MessageDirection.INBOUND,
      sentAt: ago.hoursAgo(0.4),
    },
    {
      id: "conv-01-hist-mvp-2",
      body: "Claro! Te envio em instantes.",
      direction: MessageDirection.OUTBOUND,
      senderId: "user-amanda",
      sentAt: ago.hoursAgo(0.35),
      status: MessageStatus.DELIVERED,
    },
    {
      id: "conv-01-hist-mvp-3",
      body: "Ainda não recebi as fotos 🙏",
      direction: MessageDirection.INBOUND,
      sentAt: ago.hoursAgo(0.15),
    },
    {
      id: "conv-01-hist-mvp-4",
      body: "E o pedido mínimo continua 10 peças?",
      direction: MessageDirection.INBOUND,
      sentAt: ago.hoursAgo(0.1),
    },
    {
      id: "conv-01-hist-mvp-5",
      body: "Também quero saber sobre frete para MG.",
      direction: MessageDirection.INBOUND,
      sentAt: ago.hoursAgo(0.08),
    },
    {
      id: "conv-01-hist-mvp-6",
      body: "Oi de novo — alguma novidade?",
      direction: MessageDirection.INBOUND,
      sentAt: ago.hoursAgo(0.05),
    },
    {
      id: "conv-01-hist-mvp-7",
      body: "Preciso fechar hoje se possível.",
      direction: MessageDirection.INBOUND,
      sentAt: ago.hoursAgo(0.03),
    },
    {
      id: "conv-01-hist-mvp-8",
      body: "Aguardando retorno de vocês 🙂",
      direction: MessageDirection.INBOUND,
      sentAt: ago.hoursAgo(0.02),
    },
  ];
  for (const def of amandaMsgs) {
    if (await ensureMessage(prisma, "conv-01", "ch-whatsapp", def)) created += 1;
  }

  // Letícia — older history + mark resolved/inactive
  const leticiaMsgs: MsgDef[] = [
    {
      id: "conv-04-hist-mvp-1",
      body: "Oi, ainda estão atendendo Joinville?",
      direction: MessageDirection.INBOUND,
      sentAt: ago.daysAgo(45),
      status: MessageStatus.READ,
    },
    {
      id: "conv-04-hist-mvp-2",
      body: "Oi Letícia! Sim, atendemos SC toda.",
      direction: MessageDirection.OUTBOUND,
      senderId: "user-carla",
      sentAt: ago.daysAgo(44),
      status: MessageStatus.READ,
    },
    {
      id: "conv-04-hist-mvp-3",
      body: "Na época não fechei. Obrigada mesmo assim.",
      direction: MessageDirection.INBOUND,
      sentAt: ago.daysAgo(40),
      status: MessageStatus.READ,
    },
    {
      id: "conv-04-hist-mvp-4",
      body: "Quando quiser retomar, estamos aqui.",
      direction: MessageDirection.OUTBOUND,
      senderId: "user-carla",
      sentAt: ago.daysAgo(39),
      status: MessageStatus.READ,
    },
    {
      id: "conv-04-hist-mvp-5",
      body: "Conversa encerrada pelo time.",
      direction: MessageDirection.OUTBOUND,
      senderId: "user-carla",
      sentAt: ago.daysAgo(38),
      status: MessageStatus.READ,
    },
  ];
  for (const def of leticiaMsgs) {
    if (await ensureMessage(prisma, "conv-04", "ch-whatsapp", def)) created += 1;
  }
  await prisma.conversation.update({
    where: { id: "conv-04" },
    data: { status: ConversationStatus.RESOLVED, unreadCount: 0 },
  });

  // Luciana — short consecutive bursts + unread
  const lucianaMsgs: MsgDef[] = [
    {
      id: "conv-11-hist-mvp-1",
      body: "Oi",
      direction: MessageDirection.INBOUND,
      sentAt: ago.hoursAgo(0.9),
    },
    {
      id: "conv-11-hist-mvp-2",
      body: "Tudo bem?",
      direction: MessageDirection.INBOUND,
      sentAt: ago.hoursAgo(0.88),
    },
    {
      id: "conv-11-hist-mvp-3",
      body: "Queria catálogo",
      direction: MessageDirection.INBOUND,
      sentAt: ago.hoursAgo(0.86),
    },
    {
      id: "conv-11-hist-mvp-4",
      body: "Oi Luciana! Já te envio.",
      direction: MessageDirection.OUTBOUND,
      senderId: "user-amanda",
      sentAt: ago.hoursAgo(0.8),
      status: MessageStatus.DELIVERED,
    },
    {
      id: "conv-11-hist-mvp-5",
      body: "Ok",
      direction: MessageDirection.INBOUND,
      sentAt: ago.hoursAgo(0.7),
    },
    {
      id: "conv-11-hist-mvp-6",
      body: "Viu?",
      direction: MessageDirection.INBOUND,
      sentAt: ago.hoursAgo(0.5),
    },
    {
      id: "conv-11-hist-mvp-7",
      body: "??",
      direction: MessageDirection.INBOUND,
      sentAt: ago.hoursAgo(0.35),
    },
  ];
  for (const def of lucianaMsgs) {
    if (await ensureMessage(prisma, "conv-11", "ch-whatsapp", def)) created += 1;
  }
  await prisma.conversation.update({
    where: { id: "conv-11" },
    data: { unreadCount: 2, lastMessageAt: ago.hoursAgo(0.35) },
  });
  await prisma.deal.update({
    where: { id: "deal-05" },
    data: { unreadMessages: 2, lastInteractionAt: ago.hoursAgo(0.35) },
  });

  // Caroline — Instagram channel + attachment + statuses
  const carolineMsgs: MsgDef[] = [
    {
      id: "conv-02-hist-mvp-1",
      body: "Segue o catálogo da campanha Verão.",
      direction: MessageDirection.OUTBOUND,
      senderId: "user-juliana",
      sentAt: ago.hoursAgo(1.5),
      status: MessageStatus.READ,
      attachment: {
        id: "conv-02-att-image",
        fileName: "catalogo.png",
        mimeType: "image/png",
        fileSize: 70,
        url: files.imageUrl,
        kind: "image",
      },
    },
    {
      id: "conv-02-hist-mvp-2",
      body: "Amei! Quero o kit.",
      direction: MessageDirection.INBOUND,
      sentAt: ago.hoursAgo(1.2),
      status: MessageStatus.DELIVERED,
    },
    {
      id: "conv-02-hist-mvp-3",
      body: "Pix enviado. Confirme por favor.",
      direction: MessageDirection.OUTBOUND,
      senderId: "user-juliana",
      sentAt: ago.hoursAgo(1),
      status: MessageStatus.FAILED,
    },
    {
      id: "conv-02-hist-mvp-4",
      body: "Reenviando o Pix.",
      direction: MessageDirection.OUTBOUND,
      senderId: "user-juliana",
      sentAt: ago.hoursAgo(0.9),
      status: MessageStatus.SENT,
    },
  ];
  for (const def of carolineMsgs) {
    if (await ensureMessage(prisma, "conv-02", "ch-instagram", def)) created += 1;
  }

  // Refresh Claudia last message timestamp for list preview
  await prisma.conversation.update({
    where: { id: claudiaConv },
    data: {
      lastMessageAt: ago.hoursAgo(0.15),
      unreadCount: 1,
    },
  });
  await prisma.deal.update({
    where: { id: OPERATION_DEMO_IDS.dealId },
    data: {
      unreadMessages: 1,
      lastInteractionAt: ago.hoursAgo(0.15),
    },
  });

  // Amanda awaiting reply markers
  await prisma.conversation.update({
    where: { id: "conv-01" },
    data: {
      unreadCount: 2,
      lastMessageAt: ago.hoursAgo(0.02),
      status: ConversationStatus.OPEN,
    },
  });
  await prisma.deal.update({
    where: { id: "deal-01" },
    data: {
      unreadMessages: 2,
      lastInteractionAt: ago.hoursAgo(0.02),
    },
  });

  // Ensure demo deals stay OPEN on active stages so history remains reachable.
  const demoDealFixes = [
    {
      id: "deal-operacao-demo",
      stageId: "st-novos-contatado",
      conversationId: "conv-operacao-demo",
    },
    { id: "deal-01", stageId: "st-novos-novo", conversationId: "conv-01" },
    { id: "deal-03", stageId: "st-novos-novo", conversationId: "conv-04" },
    { id: "deal-05", stageId: "st-novos-novo", conversationId: "conv-11" },
    { id: "deal-02", stageId: "st-novos-contatado", conversationId: "conv-02" },
  ] as const;
  for (const deal of demoDealFixes) {
    await prisma.deal.updateMany({
      where: { id: deal.id },
      data: {
        status: DealStatus.OPEN,
        deletedAt: null,
        closedAt: null,
        stageId: deal.stageId,
        pipelineId: "pipe-novos",
        conversationId: deal.conversationId,
      },
    });
  }

  void orgId;
  console.log(
    created > 0
      ? `Conversation History MVP: ${created} mensagens demo criadas (idempotente).`
      : "Conversation History MVP: mensagens demo já presentes (idempotente).",
  );
}
