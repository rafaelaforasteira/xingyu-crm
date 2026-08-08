import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateReactivationActionDto,
  CreateReactivationOpportunityDto,
  ReactivationActionType,
} from "./dto/reactivation.dto";
import { allocateLeadSequence } from "../common/lead-sequence";

/**
 * Extends ReactivationService with opportunity conversion + workflow actions.
 * Mixed into the main service file via class merge pattern — appended methods.
 */
export type LifecycleOpportunitySource = "REACTIVATION" | "REPURCHASE";

export async function createLifecycleOpportunity(
  prisma: PrismaService,
  organizationId: string,
  contactId: string,
  dto: CreateReactivationOpportunityDto,
  actorId: string,
  options: {
    source: LifecycleOpportunitySource;
    kind: "REACTIVATION" | "REPURCHASE";
    defaultNamePrefix: string;
  },
) {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, organizationId, deletedAt: null },
  });
  if (!contact) throw new NotFoundException(`Contact ${contactId} not found`);

  const pipeline = await prisma.pipeline.findFirst({
    where: { id: dto.pipelineId, organizationId, deletedAt: null, archived: false },
  });
  if (!pipeline) throw new NotFoundException(`Pipeline ${dto.pipelineId} not found`);

  const stage = await prisma.pipelineStage.findFirst({
    where: {
      id: dto.stageId,
      pipelineId: dto.pipelineId,
      deletedAt: null,
      archived: false,
    },
  });
  if (!stage) {
    throw new BadRequestException("stageId does not belong to the selected pipeline");
  }
  if (stage.isWon || stage.isLost) {
    throw new BadRequestException("Cannot create an opportunity directly in a won/lost stage");
  }

  const existingOpen = await prisma.deal.findFirst({
    where: {
      organizationId,
      contactId,
      status: "OPEN",
      deletedAt: null,
    },
    select: { id: true, name: true, pipelineId: true, stageId: true },
  });
  if (existingOpen) {
    throw new ConflictException({
      message: "Contact already has an open deal",
      existingOpenDealId: existingOpen.id,
      deal: existingOpen,
    });
  }

  if (dto.ownerId) {
    const owner = await prisma.user.findFirst({
      where: { id: dto.ownerId, organizationId, deletedAt: null },
    });
    if (!owner) throw new BadRequestException("ownerId is invalid for this organization");
  }

  if (dto.tagIds?.length) {
    const tags = await prisma.tag.findMany({
      where: { id: { in: dto.tagIds }, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (tags.length !== dto.tagIds.length) {
      throw new BadRequestException("One or more tagIds are invalid");
    }
  }

  const dealName =
    dto.name?.trim() ||
    `${options.defaultNamePrefix} — ${[contact.firstName, contact.lastName].filter(Boolean).join(" ")}`;

  return prisma.$transaction(async (tx) => {
    let conversationId = dto.conversationId ?? null;

    if (conversationId) {
      const conversation = await tx.conversation.findFirst({
        where: { id: conversationId, organizationId, contactId, deletedAt: null },
      });
      if (!conversation) {
        throw new BadRequestException("conversationId is invalid for this contact");
      }
    } else if (dto.createConversation) {
      const channel = await tx.channel.findFirst({
        where: { organizationId, deletedAt: null, isActive: true },
        orderBy: { createdAt: "asc" },
      });
      const conversation = await tx.conversation.create({
        data: {
          organizationId,
          contactId,
          channelId: channel?.id,
          assigneeId: dto.ownerId ?? contact.ownerId ?? actorId,
          subject: dealName,
          status: "OPEN",
          lastMessageAt: new Date(),
          createdById: actorId,
        },
      });
      conversationId = conversation.id;
    }

    const leadSequence = await allocateLeadSequence(tx, organizationId);
    const deal = await tx.deal.create({
      data: {
        organizationId,
        pipelineId: dto.pipelineId,
        stageId: dto.stageId,
        contactId,
        companyId: contact.companyId,
        ownerId: dto.ownerId ?? contact.ownerId ?? actorId,
        teamId: contact.teamId,
        conversationId,
        name: dealName,
        leadSequence,
        value: dto.value ?? 0,
        status: "OPEN",
        priority: "MEDIUM",
        source: options.source,
        campaign: contact.campaign,
        enteredStageAt: new Date(),
        lastInteractionAt: new Date(),
        createdById: actorId,
        ...(dto.tagIds?.length
          ? { tags: { create: dto.tagIds.map((tagId) => ({ tagId })) } }
          : {}),
      },
      include: {
        stage: true,
        contact: { select: { id: true, firstName: true, lastName: true } },
        owner: { select: { id: true, name: true } },
      },
    });

    await tx.dealStageHistory.create({
      data: {
        dealId: deal.id,
        stageId: dto.stageId,
        movedById: actorId,
        note: `Oportunidade criada a partir de ${options.kind === "REACTIVATION" ? "Reativação" : "Recompra"}`,
      },
    });

    await tx.activity.create({
      data: {
        organizationId,
        type: "DEAL_CREATED",
        title: `Oportunidade criada: ${deal.name}`,
        actorId,
        contactId,
        dealId: deal.id,
        conversationId: conversationId ?? undefined,
        metadata: { source: options.source },
      },
    });

    let taskId: string | null = null;
    if (dto.task) {
      const task = await tx.task.create({
        data: {
          organizationId,
          title: dto.task.title,
          type: "FOLLOW_UP",
          status: "PENDING",
          priority: "HIGH",
          dueAt: dto.task.dueAt ? new Date(dto.task.dueAt) : undefined,
          assigneeId: dto.task.assigneeId ?? dto.ownerId ?? actorId,
          createdById: actorId,
          contactId,
          dealId: deal.id,
          teamId: contact.teamId,
        },
      });
      taskId = task.id;
      await tx.activity.create({
        data: {
          organizationId,
          type: "TASK_CREATED",
          title: `Tarefa criada: ${task.title}`,
          actorId,
          contactId,
          dealId: deal.id,
          taskId: task.id,
        },
      });
    }

    await tx.lifecycleAction.create({
      data: {
        organizationId,
        contactId,
        kind: options.kind,
        action: "CONVERTED",
        actorId,
        dealId: deal.id,
        conversationId: conversationId ?? undefined,
        metadata: { source: `${options.source.toLowerCase()}_opportunity` },
      },
    });

    return {
      deal: {
        id: deal.id,
        name: deal.name,
        pipelineId: deal.pipelineId,
        stageId: deal.stageId,
        contactId: deal.contactId,
        conversationId: deal.conversationId,
        value: Number(deal.value),
        status: deal.status,
      },
      taskId,
      conversationId,
    };
  });
}

export async function createReactivationOpportunity(
  prisma: PrismaService,
  organizationId: string,
  contactId: string,
  dto: CreateReactivationOpportunityDto,
  actorId: string,
) {
  return createLifecycleOpportunity(prisma, organizationId, contactId, dto, actorId, {
    source: "REACTIVATION",
    kind: "REACTIVATION",
    defaultNamePrefix: "Reativação",
  });
}

export async function createReactivationAction(
  prisma: PrismaService,
  organizationId: string,
  contactId: string,
  dto: CreateReactivationActionDto,
  actorId: string,
) {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, organizationId, deletedAt: null },
  });
  if (!contact) throw new NotFoundException(`Contact ${contactId} not found`);

  if (dto.type === ReactivationActionType.POSTPONED) {
    if (!dto.snoozedUntil) {
      throw new BadRequestException("snoozedUntil is required for POSTPONED");
    }
    const until = new Date(dto.snoozedUntil);
    if (until.getTime() <= Date.now()) {
      throw new BadRequestException("snoozedUntil must be in the future");
    }
  }
  if (dto.type === ReactivationActionType.DISCARDED && !dto.reason?.trim()) {
    throw new BadRequestException("reason is required for DISCARDED");
  }

  const action = await prisma.lifecycleAction.create({
    data: {
      organizationId,
      contactId,
      kind: "REACTIVATION",
      action: dto.type,
      actorId,
      snoozedUntil:
        dto.type === ReactivationActionType.POSTPONED
          ? new Date(dto.snoozedUntil!)
          : null,
      reason: dto.reason ?? null,
      metadata: { source: "reactivation_ui" },
    },
  });

  await prisma.activity.create({
    data: {
      organizationId,
      type: "OTHER",
      title: `Reativação: ${dto.type}`,
      description: dto.reason ?? dto.snoozedUntil ?? null,
      actorId,
      contactId,
      metadata: { lifecycle: "REACTIVATION", action: dto.type },
    },
  });

  return { id: action.id, type: dto.type, contactId };
}
