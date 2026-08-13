import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@xingyu/database";
import { PrismaService } from "../prisma/prisma.service";
import { SaveMessageAttachmentDto } from "./dto/lead-file.dto";

const LEAD_FILE_INCLUDE = {
  savedBy: { select: { id: true, name: true, avatarUrl: true } },
} satisfies Prisma.LeadFileInclude;

const ELIGIBLE_KINDS = new Set(["image", "video", "audio", "voice", "ptt", "document", "file"]);

export function isEligibleLeadFile(kind: string, mimeType?: string | null) {
  const normalizedKind = kind.trim().toLowerCase();
  if (!ELIGIBLE_KINDS.has(normalizedKind)) return false;
  if (!mimeType) return true;
  const mime = mimeType.toLowerCase();
  if (normalizedKind === "image") return mime.startsWith("image/");
  if (normalizedKind === "video") return mime.startsWith("video/");
  if (["audio", "voice", "ptt"].includes(normalizedKind)) return mime.startsWith("audio/");
  return (
    mime.startsWith("application/") ||
    mime.startsWith("text/") ||
    mime === "application/octet-stream"
  );
}

@Injectable()
export class LeadFilesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, dealId: string) {
    await this.assertDeal(organizationId, dealId);
    const data = await this.prisma.leadFile.findMany({
      where: { organizationId, dealId },
      orderBy: [{ savedAt: "desc" }, { id: "desc" }],
      include: LEAD_FILE_INCLUDE,
    });
    return { data, total: data.length };
  }

  async save(
    organizationId: string,
    dealId: string,
    dto: SaveMessageAttachmentDto,
    userId: string,
  ) {
    await this.assertDeal(organizationId, dealId);
    const attachment = await this.prisma.messageAttachment.findFirst({
      where: {
        id: dto.attachmentId,
        messageId: dto.messageId,
        message: {
          deletedAt: null,
          conversation: {
            organizationId,
            deletedAt: null,
            deal: { id: dealId, deletedAt: null },
          },
        },
      },
      include: { message: true },
    });
    if (!attachment) {
      throw new BadRequestException("Anexo não pertence à conversa desta negociação");
    }
    if (!attachment.url.trim() || !isEligibleLeadFile(attachment.kind, attachment.mimeType)) {
      throw new BadRequestException("Tipo de anexo não elegível para Arquivos");
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.leadFile.findUnique({
        where: { dealId_attachmentId: { dealId, attachmentId: attachment.id } },
        include: LEAD_FILE_INCLUDE,
      });
      if (existing) return existing;
      const leadFile = await tx.leadFile.create({
        data: {
        organizationId,
        dealId,
        conversationId: attachment.message.conversationId,
        messageId: attachment.messageId,
        attachmentId: attachment.id,
        savedById: userId,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize,
        url: attachment.url,
        kind: attachment.kind,
        messageDirection: attachment.message.direction,
        messageCreatedAt: attachment.message.sentAt,
        },
        include: LEAD_FILE_INCLUDE,
      });
      await tx.activity.create({
        data: {
          organizationId,
          dealId,
          contactId: null,
          conversationId: attachment.message.conversationId,
          actorId: userId,
          type: "FILE_SAVED",
          title: "File saved",
          metadata: { leadFileId: leadFile.id, attachmentId: attachment.id },
        },
      });
      return leadFile;
    });
  }

  async remove(organizationId: string, dealId: string, id: string, userId: string) {
    const leadFile = await this.prisma.leadFile.findFirst({
      where: { id, organizationId, dealId },
      select: { id: true, conversationId: true, attachmentId: true },
    });
    if (!leadFile) throw new NotFoundException("Arquivo salvo não encontrado");
    await this.prisma.$transaction(async (tx) => {
      await tx.leadFile.delete({ where: { id } });
      await tx.activity.create({
        data: {
          organizationId,
          dealId,
          conversationId: leadFile.conversationId,
          actorId: userId,
          type: "FILE_REMOVED",
          title: "File removed",
          metadata: { leadFileId: id, attachmentId: leadFile.attachmentId },
        },
      });
    });
    return { removed: true };
  }

  private async assertDeal(organizationId: string, dealId: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!deal) throw new NotFoundException("Negociação não encontrada");
  }
}
