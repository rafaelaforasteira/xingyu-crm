import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConnectionLifecycleStatus, Prisma } from "@xingyu/database";
import { allocateLeadSequence } from "../common/lead-sequence";
import { normalizePhone } from "../common/phone-normalization";
import { PrismaService } from "../prisma/prisma.service";
import { mapProviderStatus } from "./connection-status";
import type { NormalizedProviderEvent } from "./providers/connection-provider.types";

@Injectable()
export class ConnectionsInboundService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveChannel(provider: string, externalInstanceId: string) {
    const channel = await this.prisma.channel.findFirst({
      where: {
        provider: { equals: provider, mode: "insensitive" },
        externalAccountId: externalInstanceId,
        deletedAt: null,
        archivedAt: null,
      },
      select: {
        id: true,
        organizationId: true,
        provider: true,
        externalAccountId: true,
        lifecycleStatus: true,
      },
    });
    if (!channel) throw new NotFoundException("Connection not found");
    return channel;
  }

  async process(
    channel: { id: string; organizationId: string },
    event: NormalizedProviderEvent,
  ) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const duplicate = await tx.providerEventReceipt.findUnique({
            where: {
              channelId_externalEventId: {
                channelId: channel.id,
                externalEventId: event.externalEventId,
              },
            },
            select: { id: true },
          });
          if (duplicate) return { accepted: true, duplicate: true };

          await tx.providerEventReceipt.create({
            data: {
              organizationId: channel.organizationId,
              channelId: channel.id,
              externalEventId: event.externalEventId,
              externalMessageId:
                event.kind === "inbound_message" ? event.externalMessageId ?? null : null,
            },
          });

          if (event.kind === "connection_status") {
            return this.processStatus(tx, channel, event);
          }
          return this.processInboundMessage(tx, channel, event);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return { accepted: true, duplicate: true };
      }
      throw error;
    }
  }

  private async processStatus(
    tx: Prisma.TransactionClient,
    channel: { id: string; organizationId: string },
    event: Extract<NormalizedProviderEvent, { kind: "connection_status" }>,
  ) {
    const status = mapProviderStatus(event.status);
    await tx.channel.update({
      where: { id: channel.id },
      data: {
        lifecycleStatus: status,
        displayAccount: event.displayAccount,
        lastActivityAt: event.occurredAt,
        lastErrorAt: status === ConnectionLifecycleStatus.ERROR ? event.occurredAt : null,
        lastErrorCode: status === ConnectionLifecycleStatus.ERROR ? event.errorCode ?? "PROVIDER_ERROR" : null,
        lastErrorMessage: null,
        ...(status === ConnectionLifecycleStatus.CONNECTED
          ? {
              connectedAt: event.occurredAt,
              disconnectedAt: null,
              status: "ACTIVE",
              isActive: true,
            }
          : {}),
        ...(status === ConnectionLifecycleStatus.DISCONNECTED
          ? {
              disconnectedAt: event.occurredAt,
              status: "DISCONNECTED",
              isActive: false,
            }
          : {}),
      },
    });
    return { accepted: true, duplicate: false, status };
  }

  private async processInboundMessage(
    tx: Prisma.TransactionClient,
    channel: { id: string; organizationId: string },
    event: Extract<NormalizedProviderEvent, { kind: "inbound_message" }>,
  ) {
    const organizationId = channel.organizationId;
    const phone = normalizePhone(event.phone);
    const route = await tx.pipelineChannelConnection.findFirst({
      where: {
        organizationId,
        channelId: channel.id,
        active: true,
        isDefault: true,
        deletedAt: null,
        pipeline: { organizationId, deletedAt: null, archived: false },
      },
      orderBy: { priority: "asc" },
      select: {
        id: true,
        pipelineId: true,
        defaultStageId: true,
        defaultOwnerId: true,
        defaultTeamId: true,
        source: true,
        createContact: true,
        createConversation: true,
        createDeal: true,
        pipeline: {
          select: { name: true, defaultOwnerId: true, defaultTeamId: true },
        },
      },
    });
    if (!route) throw new ConflictException("Connection has no active default pipeline");

    let contact = await tx.contact.findFirst({
      where: {
        organizationId,
        deletedAt: null,
        OR: [{ phone }, { whatsapp: phone }],
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!contact && !route.createContact) {
      throw new ConflictException("Connection routing does not allow contact creation");
    }
    const displayName = event.contactName?.trim() || phone;
    const [firstName, ...lastNameParts] = displayName.split(/\s+/);
    if (!contact) {
      contact = await tx.contact.create({
        data: {
          organizationId,
          firstName,
          lastName: lastNameParts.join(" ") || null,
          phone,
          whatsapp: phone,
          type: "WHATSAPP",
          status: "LEAD",
          source: route.source ?? route.pipeline.name,
          ownerId: route.defaultOwnerId ?? route.pipeline.defaultOwnerId,
          teamId: route.defaultTeamId ?? route.pipeline.defaultTeamId,
          firstInteractionAt: event.occurredAt,
        },
        select: { id: true, firstName: true, lastName: true },
      });
    }

    let conversation = await tx.conversation.findFirst({
      where: {
        organizationId,
        contactId: contact.id,
        channelId: channel.id,
        status: { in: ["OPEN", "PENDING"] },
        deletedAt: null,
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    if (!conversation && !route.createConversation) {
      throw new ConflictException("Connection routing does not allow conversation creation");
    }
    if (!conversation) {
      conversation = await tx.conversation.create({
        data: {
          organizationId,
          contactId: contact.id,
          channelId: channel.id,
          assigneeId: route.defaultOwnerId ?? route.pipeline.defaultOwnerId,
          subject: `WhatsApp — ${displayName}`,
          status: "OPEN",
          lastMessageAt: event.occurredAt,
          unreadCount: 0,
        },
        select: { id: true },
      });
    }

    const enabledRoutes = await tx.pipelineChannelConnection.findMany({
      where: {
        organizationId,
        channelId: channel.id,
        active: true,
        deletedAt: null,
        pipeline: { organizationId, deletedAt: null, archived: false },
      },
      select: { pipelineId: true },
    });
    const enabledPipelineIds = enabledRoutes.map((item) => item.pipelineId);
    let deal = await tx.deal.findFirst({
      where: {
        organizationId,
        contactId: contact.id,
        pipelineId: { in: enabledPipelineIds },
        status: "OPEN",
        deletedAt: null,
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true, conversationId: true },
    });

    if (!deal && route.createDeal) {
      const stage =
        (route.defaultStageId
          ? await tx.pipelineStage.findFirst({
              where: {
                id: route.defaultStageId,
                organizationId,
                pipelineId: route.pipelineId,
                type: "OPEN",
                archived: false,
                deletedAt: null,
              },
              select: { id: true },
            })
          : null) ??
        (await tx.pipelineStage.findFirst({
          where: {
            organizationId,
            pipelineId: route.pipelineId,
            type: "OPEN",
            archived: false,
            deletedAt: null,
          },
          orderBy: [{ isInitial: "desc" }, { position: "asc" }],
          select: { id: true },
        }));
      if (!stage) throw new ConflictException("Default pipeline has no active OPEN stage");
      const leadSequence = await allocateLeadSequence(tx, organizationId);
      deal = await tx.deal.create({
        data: {
          organizationId,
          pipelineId: route.pipelineId,
          stageId: stage.id,
          contactId: contact.id,
          conversationId: conversation.id,
          name: `Oportunidade — ${displayName}`,
          leadSequence,
          ownerId: route.defaultOwnerId ?? route.pipeline.defaultOwnerId,
          teamId: route.defaultTeamId ?? route.pipeline.defaultTeamId,
          status: "OPEN",
          source: route.source ?? route.pipeline.name,
          enteredStageAt: event.occurredAt,
          lastInteractionAt: event.occurredAt,
          unreadMessages: 1,
        },
        select: { id: true, conversationId: true },
      });
      await tx.dealStageHistory.create({
        data: {
          dealId: deal.id,
          stageId: stage.id,
          movedAt: event.occurredAt,
          note: `Created from connection event ${event.externalEventId}`,
        },
      });
    } else if (deal) {
      await tx.deal.update({
        where: { id: deal.id },
        data: {
          lastInteractionAt: event.occurredAt,
          unreadMessages: { increment: 1 },
          ...(!deal.conversationId ? { conversationId: conversation.id } : {}),
        },
      });
    }

    const message = await tx.message.create({
      data: {
        conversationId: conversation.id,
        channelId: channel.id,
        direction: "INBOUND",
        status: "DELIVERED",
        body: event.body,
        isInternal: false,
        sentAt: event.occurredAt,
        metadata: {
          providerEventId: event.externalEventId,
          externalMessageId: event.externalMessageId ?? null,
          pipelineChannelConnectionId: route.id,
        },
      },
      select: { id: true },
    });
    await tx.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: event.occurredAt, unreadCount: { increment: 1 }, status: "OPEN" },
    });
    await tx.activity.create({
      data: {
        organizationId,
        type: "MESSAGE_RECEIVED",
        title: "Inbound WhatsApp message",
        description: event.body.slice(0, 500),
        contactId: contact.id,
        conversationId: conversation.id,
        dealId: deal?.id ?? null,
        metadata: {
          channelId: channel.id,
          providerEventId: event.externalEventId,
          messageId: message.id,
        },
      },
    });
    await tx.channel.update({
      where: { id: channel.id },
      data: {
        lastInboundAt: event.occurredAt,
        lastActivityAt: event.occurredAt,
        lifecycleStatus: ConnectionLifecycleStatus.CONNECTED,
        status: "ACTIVE",
        isActive: true,
      },
    });
    return {
      accepted: true,
      duplicate: false,
      contactId: contact.id,
      conversationId: conversation.id,
      dealId: deal?.id ?? null,
      messageId: message.id,
    };
  }
}
