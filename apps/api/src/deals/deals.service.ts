import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ActivityType, DealStatus, PipelineStageType, Prisma } from "@xingyu/database";
import { PrismaService } from "../prisma/prisma.service";
import { paginate, paginationArgs } from "../common/types/paginated-response";
import { notDeleted, softDeleteData } from "../common/utils/soft-delete";
import {
  BulkMoveDealsDto,
  CreateDealDto,
  CreateManualLeadDto,
  LookupManualLeadDto,
  MoveStageDto,
  QueryDealsDto,
  UpdateDealDto,
  WinLoseDto,
} from "./dto/deal.dto";
import { allocateLeadSequence, formatLeadCode } from "../common/lead-sequence";
import { normalizePhone } from "../common/phone-normalization";
import { toDealResponse } from "../common/mappers";

type DbClient = Prisma.TransactionClient | PrismaService;

type OptionalRelationIds = Pick<
  CreateDealDto,
  "contactId" | "companyId" | "ownerId" | "teamId" | "conversationId"
>;

type ActiveStage = {
  id: string;
  pipelineId: string;
  name: string;
  type: PipelineStageType;
  isWon: boolean;
  isLost: boolean;
};

type StageTransitionData = {
  enteredStageAt: Date;
  status: DealStatus;
  closedAt: Date | null;
  lostReason: string | null;
};

type ExplicitStatusData = {
  status: DealStatus;
  closedAt?: Date | null;
  lostReason?: string | null;
};

const dealMutationSelect = {
  id: true,
  organizationId: true,
  pipelineId: true,
  stageId: true,
  contactId: true,
  companyId: true,
  ownerId: true,
  teamId: true,
  conversationId: true,
  status: true,
  closedAt: true,
  lostReason: true,
} satisfies Prisma.DealSelect;

@Injectable()
export class DealsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: QueryDealsDto, allowedPipelineIds?: string[] | null) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { skip, take } = paginationArgs(page, pageSize);
    const sortableFields = new Set([
      "name",
      "value",
      "status",
      "enteredStageAt",
      "createdAt",
      "updatedAt",
    ]);
    const sortBy = query.sortBy && sortableFields.has(query.sortBy) ? query.sortBy : "updatedAt";
    const where: Prisma.DealWhereInput = {
      organizationId,
      ...notDeleted,
      ...(allowedPipelineIds ? { pipelineId: { in: allowedPipelineIds } } : {}),
      ...(query.pipelineId ? { pipelineId: query.pipelineId } : {}),
      ...(query.stageId ? { stageId: query.stageId } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.contactId ? { contactId: query.contactId } : {}),
      ...(query.companyId ? { companyId: query.companyId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { name: { contains: query.search, mode: "insensitive" } } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.deal.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: query.sortOrder ?? "desc" },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
          company: { select: { id: true, legalName: true, tradeName: true } },
          stage: true,
          owner: { select: { id: true, name: true } },
          tags: { include: { tag: true } },
        },
      }),
      this.prisma.deal.count({ where }),
    ]);
    return paginate(data.map(toDealResponse), total, page, pageSize);
  }

  async findOne(organizationId: string, id: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id, organizationId, ...notDeleted },
      include: {
        contact: true,
        company: true,
        stage: true,
        pipeline: {
          include: {
            stages: {
              where: { deletedAt: null, archived: false },
              orderBy: { position: "asc" },
            },
          },
        },
        owner: { select: { id: true, name: true } },
        tags: { include: { tag: true } },
        activities: { take: 20, orderBy: { createdAt: "desc" } },
      },
    });
    if (!deal) throw new NotFoundException(`Deal ${id} not found`);
    return {
      ...toDealResponse(deal),
      pipeline: deal.pipeline,
      activities: deal.activities,
    };
  }

  async create(organizationId: string, dto: CreateDealDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.requireOrganizationUser(tx, organizationId, userId);
      await this.requireActivePipeline(tx, organizationId, dto.pipelineId);
      const stage = await this.requireActiveStage(tx, organizationId, dto.pipelineId, dto.stageId);
      const ownerId = dto.ownerId === undefined ? userId : dto.ownerId;
      await this.validateOptionalRelations(tx, organizationId, {
        ...dto,
        ownerId,
      });

      const now = new Date();
      const leadSequence = await allocateLeadSequence(tx, organizationId);
      const created = await tx.deal.create({
        data: {
          ...dto,
          ownerId,
          organizationId,
          leadSequence,
          createdById: userId,
          updatedById: userId,
          ...this.stageTransitionData(stage, now),
        },
        include: {
          stage: true,
          contact: true,
          company: true,
          owner: { select: { id: true, name: true } },
        },
      });

      await tx.dealStageHistory.create({
        data: {
          dealId: created.id,
          stageId: stage.id,
          fromStageId: null,
          movedById: userId,
          movedAt: now,
        },
      });
      await tx.activity.create({
        data: {
          organizationId,
          type: ActivityType.DEAL_CREATED,
          title: `Deal created in ${stage.name}`,
          dealId: created.id,
          contactId: created.contactId,
          companyId: created.companyId,
          actorId: userId,
          metadata: {
            pipelineId: dto.pipelineId,
            stageId: stage.id,
            stageName: stage.name,
          },
        },
      });

      return created;
    });
  }

  async lookupManualLead(organizationId: string, dto: LookupManualLeadDto, allowedPipelineIds?: string[] | null) {
    const phone = dto.phone?.trim() ? normalizePhone(dto.phone) : null;
    const email = dto.email?.trim().toLowerCase() || null;
    const contact = phone
      ? await this.prisma.contact.findFirst({
          where: {
            organizationId,
            deletedAt: null,
            OR: [{ phone }, { whatsapp: phone }],
          },
          include: {
            deals: {
              where: { deletedAt: null, ...(allowedPipelineIds ? { pipelineId: { in: allowedPipelineIds } } : {}) },
              orderBy: { updatedAt: "desc" },
              include: {
                stage: { select: { id: true, name: true, type: true } },
                pipeline: { select: { id: true, name: true } },
                owner: { select: { id: true, name: true } },
              },
            },
          },
        })
      : null;
    const possibleEmailContact =
      !contact && email
        ? await this.prisma.contact.findFirst({
            where: {
              organizationId,
              deletedAt: null,
              email: { equals: email, mode: "insensitive" },
            },
            select: { id: true, firstName: true, lastName: true, email: true },
          })
        : null;
    const activeDeal = contact?.deals.find(
      (deal) => deal.pipelineId === dto.pipelineId && deal.status === "OPEN",
    );
    return {
      phone,
      contact: contact
        ? {
            ...contact,
            name: [contact.firstName, contact.lastName].filter(Boolean).join(" "),
          }
        : null,
      activeDeal: activeDeal ?? null,
      possibleEmailContact,
    };
  }

  async createManualLead(organizationId: string, dto: CreateManualLeadDto, userId: string) {
    const phone = normalizePhone(dto.phone);
    const contactName = dto.contactName.trim().replace(/\s+/g, " ");
    if (!contactName) throw new BadRequestException("Informe o nome do contato");
    const taskDueAt = dto.taskDueAt ? new Date(dto.taskDueAt) : null;
    if (taskDueAt && Number.isNaN(taskDueAt.getTime())) {
      throw new BadRequestException("Informe um prazo de tarefa válido");
    }

    return this.prisma.$transaction(async (tx) => {
      await this.requireOrganizationUser(tx, organizationId, userId);
      await this.requireActivePipeline(tx, organizationId, dto.pipelineId);
      const stage = await this.requireActiveStage(tx, organizationId, dto.pipelineId, dto.stageId);
      const ownerId = dto.ownerId ?? userId;
      await this.validateOptionalRelations(tx, organizationId, { ownerId });

      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${organizationId}:${dto.pipelineId}:${phone}`}))`;
      let contact = await tx.contact.findFirst({
        where: { organizationId, deletedAt: null, OR: [{ phone }, { whatsapp: phone }] },
      });
      if (!contact) {
        const [firstName, ...lastName] = contactName.split(" ");
        contact = await tx.contact.create({
          data: {
            organizationId,
            firstName,
            lastName: lastName.join(" ") || null,
            phone,
            whatsapp: phone,
            email: dto.email?.trim().toLowerCase() || null,
            ownerId,
            createdById: userId,
            updatedById: userId,
            source: "manual",
          },
        });
      }

      const duplicate = await tx.deal.findFirst({
        where: {
          organizationId,
          pipelineId: dto.pipelineId,
          contactId: contact.id,
          status: "OPEN",
          deletedAt: null,
        },
        select: { id: true, leadSequence: true, stageId: true },
      });
      if (duplicate) {
        throw new ConflictException({
          message: "Este lead já existe nesta esteira",
          code: "ACTIVE_LEAD_EXISTS",
          deal: duplicate,
        });
      }

      const now = new Date();
      const leadSequence = await allocateLeadSequence(tx, organizationId);
      const leadCode = formatLeadCode(leadSequence)!;
      const contactDisplayName = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
      const created = await tx.deal.create({
        data: {
          organizationId,
          pipelineId: dto.pipelineId,
          stageId: stage.id,
          contactId: contact.id,
          ownerId,
          name: `${leadCode} · ${contactDisplayName}`,
          leadSequence,
          value: dto.value,
          source: dto.informedSource?.trim() || "manual",
          createdById: userId,
          updatedById: userId,
          ...this.stageTransitionData(stage, now),
        },
        include: { stage: true, contact: true, owner: { select: { id: true, name: true } } },
      });
      await tx.dealStageHistory.create({
        data: { dealId: created.id, stageId: stage.id, movedById: userId, movedAt: now },
      });
      await tx.activity.create({
        data: {
          organizationId,
          type: "DEAL_CREATED",
          title: "Lead criado",
          dealId: created.id,
          contactId: contact.id,
          actorId: userId,
          metadata: {
            pipelineId: dto.pipelineId,
            stageId: stage.id,
            stageName: stage.name,
            leadCode,
          },
        },
      });
      if (dto.informedSource?.trim()) {
        await tx.attribution.create({
          data: {
            organizationId,
            contactId: contact.id,
            source: "manual",
            medium: dto.informedSource.trim(),
          },
        });
      }
      if (dto.note?.trim()) {
        const note = await tx.note.create({
          data: {
            organizationId,
            content: dto.note.trim(),
            authorId: userId,
            contactId: contact.id,
            dealId: created.id,
          },
        });
        await tx.activity.create({
          data: {
            organizationId,
            type: "NOTE_CREATED",
            title: "Nota adicionada",
            dealId: created.id,
            contactId: contact.id,
            actorId: userId,
            metadata: { noteId: note.id },
          },
        });
      }
      if (dto.taskTitle?.trim()) {
        const status = await tx.taskStatusDefinition.findFirst({
          where: {
            organizationId,
            deletedAt: null,
            archived: false,
            active: true,
            category: "OPEN",
          },
          orderBy: { position: "asc" },
        });
        if (!status) throw new BadRequestException("Nenhum status de tarefa aberto configurado");
        const task = await tx.task.create({
          data: {
            organizationId,
            title: dto.taskTitle.trim(),
            statusDefinitionId: status.id,
            status: "PENDING",
            type: "FOLLOW_UP",
            assigneeId: ownerId,
            createdById: userId,
            contactId: contact.id,
            dealId: created.id,
            pipelineId: dto.pipelineId,
            stageId: stage.id,
            dueAt: taskDueAt,
          },
        });
        await tx.activity.create({
          data: {
            organizationId,
            type: "TASK_CREATED",
            title: "Tarefa criada",
            taskId: task.id,
            dealId: created.id,
            contactId: contact.id,
            actorId: userId,
          },
        });
      }
      return created;
    });
  }

  async update(organizationId: string, id: string, dto: UpdateDealDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const deal = await this.requireDeal(tx, organizationId, id);
      await this.requireOrganizationUser(tx, organizationId, userId);

      const pipelineId = dto.pipelineId ?? deal.pipelineId;
      const stageId = dto.stageId ?? deal.stageId;
      await this.requireActivePipeline(tx, organizationId, pipelineId);
      const stage = await this.requireActiveStage(tx, organizationId, pipelineId, stageId);
      await this.validateOptionalRelations(tx, organizationId, dto);

      const now = new Date();
      const stageChanged = pipelineId !== deal.pipelineId || stageId !== deal.stageId;
      const data: Prisma.DealUncheckedUpdateInput = {
        ...dto,
        pipelineId,
        stageId,
        updatedById: userId,
      };

      if (stageChanged) {
        Object.assign(data, this.stageTransitionData(stage, now));
      } else if (dto.status !== undefined) {
        Object.assign(data, this.explicitStatusData(dto.status, deal.closedAt, now));
      }

      const updated = await tx.deal.update({
        where: { id: deal.id },
        data,
        include: {
          stage: true,
          contact: true,
          company: true,
          owner: { select: { id: true, name: true } },
        },
      });

      if (stageChanged) {
        await this.recordStageChange(tx, organizationId, deal, stage, userId, now);
      }
      if (dto.ownerId !== undefined && dto.ownerId !== deal.ownerId) {
        const users = await tx.user.findMany({
          where: {
            id: { in: [deal.ownerId, dto.ownerId].filter(Boolean) as string[] },
            organizationId,
          },
          select: { id: true, name: true },
        });
        const names = new Map(users.map((user) => [user.id, user.name]));
        await tx.activity.create({
          data: {
            organizationId,
            type: ActivityType.OWNER_CHANGED,
            title: "Deal owner changed",
            dealId: deal.id,
            contactId: deal.contactId,
            actorId: userId,
            metadata: {
              fromOwnerId: deal.ownerId,
              fromOwnerName: deal.ownerId
                ? (names.get(deal.ownerId) ?? "Usuário indisponível")
                : "Não atribuído",
              toOwnerId: dto.ownerId,
              toOwnerName: dto.ownerId
                ? (names.get(dto.ownerId) ?? "Usuário indisponível")
                : "Não atribuído",
            },
          },
        });
      }
      return updated;
    });
  }

  async addTag(organizationId: string, id: string, tagId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const deal = await this.requireDeal(tx, organizationId, id);
      const tag = await tx.tag.findFirst({ where: { id: tagId, organizationId, ...notDeleted } });
      if (!tag) throw new NotFoundException(`Tag ${tagId} not found`);
      const result = await tx.dealTag.createMany({
        data: [{ dealId: id, tagId }],
        skipDuplicates: true,
      });
      if (result.count) {
        await tx.activity.create({
          data: {
            organizationId,
            type: ActivityType.TAG_ADDED,
            title: `Tag adicionada: ${tag.name}`,
            dealId: id,
            contactId: deal.contactId,
            actorId: userId,
            metadata: { tagId, tagName: tag.name },
          },
        });
      }
      return { updated: result.count > 0, tag };
    });
  }

  async removeTag(organizationId: string, id: string, tagId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.requireDeal(tx, organizationId, id);
      const tag = await tx.tag.findFirst({
        where: { id: tagId, organizationId, ...notDeleted },
        select: { id: true },
      });
      if (!tag) throw new NotFoundException(`Tag ${tagId} not found`);
      const result = await tx.dealTag.deleteMany({ where: { dealId: id, tagId } });
      return { updated: result.count > 0 };
    });
  }

  async remove(organizationId: string, id: string, userId?: string) {
    await this.findOne(organizationId, id);
    return this.prisma.deal.update({
      where: { id },
      data: {
        ...softDeleteData(),
        ...(userId ? { updatedById: userId } : {}),
      },
    });
  }

  async moveStage(organizationId: string, id: string, dto: MoveStageDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const deal = await this.requireDeal(tx, organizationId, id);
      await this.requireOrganizationUser(tx, organizationId, userId);
      await this.requireActivePipeline(tx, organizationId, deal.pipelineId);
      const stage = await this.requireActiveStage(tx, organizationId, deal.pipelineId, dto.stageId);
      if (stage.id === deal.stageId) {
        return tx.deal.findUniqueOrThrow({ where: { id: deal.id }, include: { stage: true } });
      }
      const now = new Date();

      const updated = await tx.deal.update({
        where: { id: deal.id },
        data: {
          stageId: stage.id,
          updatedById: userId,
          ...this.stageTransitionData(stage, now),
        },
        include: { stage: true },
      });
      await this.recordStageChange(tx, organizationId, deal, stage, userId, now);
      return updated;
    });
  }

  async win(organizationId: string, id: string, dto: WinLoseDto, userId: string) {
    return this.closeDeal(organizationId, id, PipelineStageType.WON, dto, userId);
  }

  async lose(organizationId: string, id: string, dto: WinLoseDto, userId: string) {
    return this.closeDeal(organizationId, id, PipelineStageType.LOST, dto, userId);
  }

  async bulkMove(organizationId: string, dto: BulkMoveDealsDto, userId: string) {
    const dealIds = [...new Set(dto.dealIds)];
    if (!dealIds.length) {
      throw new BadRequestException("dealIds must contain at least one deal");
    }
    if (dealIds.length !== dto.dealIds.length) {
      throw new BadRequestException("dealIds must not contain duplicates");
    }

    return this.prisma.$transaction(async (tx) => {
      await this.requireOrganizationUser(tx, organizationId, userId);
      const stage = await tx.pipelineStage.findFirst({
        where: {
          id: dto.stageId,
          organizationId,
          deletedAt: null,
          archived: false,
        },
        select: {
          id: true,
          pipelineId: true,
          name: true,
          type: true,
          isWon: true,
          isLost: true,
        },
      });
      if (!stage) {
        throw new BadRequestException(
          `Stage ${dto.stageId} is not an active stage in this organization`,
        );
      }
      await this.requireActivePipeline(tx, organizationId, stage.pipelineId);

      const deals = await tx.deal.findMany({
        where: {
          id: { in: dealIds },
          organizationId,
          ...notDeleted,
        },
        select: dealMutationSelect,
      });
      if (deals.length !== dealIds.length) {
        throw new NotFoundException("One or more deals were not found in this organization");
      }
      if (deals.some((deal) => deal.pipelineId !== stage.pipelineId)) {
        throw new BadRequestException("All deals must belong to the target stage pipeline");
      }

      const previousStages = await tx.pipelineStage.findMany({
        where: { id: { in: [...new Set(deals.map((deal) => deal.stageId))] } },
        select: { id: true, name: true },
      });
      const previousStageNames = new Map(previousStages.map((item) => [item.id, item.name]));
      const now = new Date();
      const result = await tx.deal.updateMany({
        where: {
          id: { in: dealIds },
          organizationId,
          pipelineId: stage.pipelineId,
          ...notDeleted,
        },
        data: {
          stageId: stage.id,
          updatedById: userId,
          ...this.stageTransitionData(stage, now),
        },
      });
      if (result.count !== deals.length) {
        throw new ConflictException("Deals changed while the bulk move was running");
      }

      await tx.dealStageHistory.createMany({
        data: deals.map((deal) => ({
          dealId: deal.id,
          stageId: stage.id,
          fromStageId: deal.stageId,
          movedById: userId,
          movedAt: now,
        })),
      });
      await tx.activity.createMany({
        data: deals.map((deal) => ({
          organizationId,
          type: ActivityType.STAGE_CHANGED,
          title: `Deal moved to ${stage.name}`,
          dealId: deal.id,
          contactId: deal.contactId,
          companyId: deal.companyId,
          actorId: userId,
          metadata: {
            fromStageId: deal.stageId,
            fromStageName: previousStageNames.get(deal.stageId) ?? "Etapa anterior",
            stageId: stage.id,
            stageName: stage.name,
            pipelineId: stage.pipelineId,
          },
        })),
      });

      return { updated: result.count };
    });
  }

  /**
   * Legacy endpoint kept for compatibility. Its payload intentionally mirrors
   * GET /pipelines/:id/board so clients do not need two Kanban contracts.
   */
  async kanban(organizationId: string, pipelineId: string) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id: pipelineId, organizationId, ...notDeleted },
      include: {
        defaultTeam: { select: { id: true, name: true } },
        defaultOwner: { select: { id: true, name: true, avatarUrl: true } },
        stages: {
          where: { deletedAt: null, archived: false },
          orderBy: { position: "asc" },
          include: {
            deals: {
              where: { deletedAt: null, status: DealStatus.OPEN },
              include: {
                contact: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                  },
                },
                company: {
                  select: { id: true, legalName: true, tradeName: true },
                },
                owner: { select: { id: true, name: true, avatarUrl: true } },
                tags: { include: { tag: true } },
              },
              orderBy: { updatedAt: "desc" },
            },
          },
        },
      },
    });
    if (!pipeline) {
      throw new NotFoundException(`Pipeline ${pipelineId} not found`);
    }

    return {
      ...pipeline,
      stages: pipeline.stages.map((stage) => ({
        ...stage,
        position: stage.position,
        deals: stage.deals.map((deal) => toDealResponse(deal)),
      })),
    };
  }

  private async closeDeal(
    organizationId: string,
    id: string,
    targetType: "WON" | "LOST",
    dto: WinLoseDto,
    userId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const deal = await this.requireDeal(tx, organizationId, id);
      await this.requireOrganizationUser(tx, organizationId, userId);
      await this.requireActivePipeline(tx, organizationId, deal.pipelineId);
      const targetStage = await tx.pipelineStage.findFirst({
        where: {
          organizationId,
          pipelineId: deal.pipelineId,
          deletedAt: null,
          archived: false,
          OR:
            targetType === PipelineStageType.WON
              ? [{ type: PipelineStageType.WON }, { isWon: true }]
              : [{ type: PipelineStageType.LOST }, { isLost: true }],
        },
        orderBy: { position: "asc" },
        select: {
          id: true,
          pipelineId: true,
          name: true,
          type: true,
          isWon: true,
          isLost: true,
        },
      });
      if (!targetStage) {
        throw new BadRequestException(
          `Pipeline ${deal.pipelineId} has no active ${targetType} stage`,
        );
      }

      const now = new Date();
      const updated = await tx.deal.update({
        where: { id: deal.id },
        data: {
          stageId: targetStage.id,
          updatedById: userId,
          ...(dto.value !== undefined ? { value: dto.value } : {}),
          ...this.stageTransitionData(
            targetStage,
            now,
            targetType === PipelineStageType.LOST ? dto.reason : null,
          ),
        },
        include: { stage: true },
      });
      await tx.dealStageHistory.create({
        data: {
          dealId: deal.id,
          stageId: targetStage.id,
          fromStageId: deal.stageId,
          movedById: userId,
          movedAt: now,
        },
      });
      await tx.activity.create({
        data: {
          organizationId,
          type: ActivityType.OTHER,
          title:
            targetType === PipelineStageType.WON
              ? `Deal won${dto.reason ? `: ${dto.reason}` : ""}`
              : `Deal lost${dto.reason ? `: ${dto.reason}` : ""}`,
          dealId: deal.id,
          contactId: deal.contactId,
          companyId: deal.companyId,
          actorId: userId,
          metadata: {
            fromStageId: deal.stageId,
            stageId: targetStage.id,
            pipelineId: deal.pipelineId,
            outcome: targetType,
          },
        },
      });
      return updated;
    });
  }

  private async requireDeal(db: DbClient, organizationId: string, id: string) {
    const deal = await db.deal.findFirst({
      where: { id, organizationId, ...notDeleted },
      select: dealMutationSelect,
    });
    if (!deal) throw new NotFoundException(`Deal ${id} not found`);
    return deal;
  }

  private async requireActivePipeline(db: DbClient, organizationId: string, pipelineId: string) {
    const pipeline = await db.pipeline.findFirst({
      where: {
        id: pipelineId,
        organizationId,
        deletedAt: null,
        archived: false,
      },
      select: { id: true },
    });
    if (!pipeline) {
      throw new NotFoundException(`Active pipeline ${pipelineId} not found`);
    }
    return pipeline;
  }

  private async requireActiveStage(
    db: DbClient,
    organizationId: string,
    pipelineId: string,
    stageId: string,
  ): Promise<ActiveStage> {
    const stage = await db.pipelineStage.findFirst({
      where: {
        id: stageId,
        organizationId,
        pipelineId,
        deletedAt: null,
        archived: false,
      },
      select: {
        id: true,
        pipelineId: true,
        name: true,
        type: true,
        isWon: true,
        isLost: true,
      },
    });
    if (!stage) {
      throw new BadRequestException(
        `Stage ${stageId} is not an active stage in pipeline ${pipelineId}`,
      );
    }
    return stage;
  }

  private async requireOrganizationUser(db: DbClient, organizationId: string, userId: string) {
    const user = await db.user.findFirst({
      where: { id: userId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!user) {
      throw new BadRequestException(`User ${userId} does not belong to this organization`);
    }
    return user;
  }

  private async validateOptionalRelations(
    db: DbClient,
    organizationId: string,
    relationIds: Partial<OptionalRelationIds>,
  ) {
    const [contact, company, owner, team, conversation] = await Promise.all([
      typeof relationIds.contactId === "string"
        ? db.contact.findFirst({
            where: {
              id: relationIds.contactId,
              organizationId,
              deletedAt: null,
            },
            select: { id: true },
          })
        : null,
      typeof relationIds.companyId === "string"
        ? db.company.findFirst({
            where: {
              id: relationIds.companyId,
              organizationId,
              deletedAt: null,
            },
            select: { id: true },
          })
        : null,
      typeof relationIds.ownerId === "string"
        ? db.user.findFirst({
            where: {
              id: relationIds.ownerId,
              organizationId,
              deletedAt: null,
            },
            select: { id: true },
          })
        : null,
      typeof relationIds.teamId === "string"
        ? db.team.findFirst({
            where: {
              id: relationIds.teamId,
              organizationId,
              deletedAt: null,
            },
            select: { id: true },
          })
        : null,
      typeof relationIds.conversationId === "string"
        ? db.conversation.findFirst({
            where: {
              id: relationIds.conversationId,
              organizationId,
              deletedAt: null,
            },
            select: { id: true },
          })
        : null,
    ]);

    const invalidRelation =
      (typeof relationIds.contactId === "string" && !contact && "Contact") ||
      (typeof relationIds.companyId === "string" && !company && "Company") ||
      (typeof relationIds.ownerId === "string" && !owner && "Owner") ||
      (typeof relationIds.teamId === "string" && !team && "Team") ||
      (typeof relationIds.conversationId === "string" && !conversation && "Conversation");
    if (invalidRelation) {
      throw new BadRequestException(`${invalidRelation} does not belong to this organization`);
    }
  }

  private stageTransitionData(
    stage: Pick<ActiveStage, "type" | "isWon" | "isLost">,
    now: Date,
    lostReason?: string | null,
  ): StageTransitionData {
    const status = stage.isWon
      ? DealStatus.WON
      : stage.isLost
        ? DealStatus.LOST
        : (stage.type as DealStatus);

    if (status === DealStatus.WON) {
      return {
        enteredStageAt: now,
        status,
        closedAt: now,
        lostReason: null,
      };
    }
    if (status === DealStatus.LOST) {
      return {
        enteredStageAt: now,
        status,
        closedAt: now,
        lostReason: lostReason ?? null,
      };
    }
    return {
      enteredStageAt: now,
      status: DealStatus.OPEN,
      closedAt: null,
      lostReason: null,
    };
  }

  private explicitStatusData(
    status: DealStatus,
    previousClosedAt: Date | null,
    now: Date,
  ): ExplicitStatusData {
    if (status === DealStatus.OPEN) {
      return { status, closedAt: null, lostReason: null };
    }
    if (status === DealStatus.WON) {
      return {
        status,
        closedAt: previousClosedAt ?? now,
        lostReason: null,
      };
    }
    if (status === DealStatus.LOST) {
      return { status, closedAt: previousClosedAt ?? now };
    }
    return { status };
  }

  private async recordStageChange(
    tx: Prisma.TransactionClient,
    organizationId: string,
    deal: Prisma.DealGetPayload<{ select: typeof dealMutationSelect }>,
    stage: ActiveStage,
    userId: string,
    movedAt: Date,
  ) {
    const previousStage = await tx.pipelineStage.findUnique({
      where: { id: deal.stageId },
      select: { name: true },
    });
    await tx.dealStageHistory.create({
      data: {
        dealId: deal.id,
        stageId: stage.id,
        fromStageId: deal.stageId,
        movedById: userId,
        movedAt,
      },
    });
    await tx.activity.create({
      data: {
        organizationId,
        type: ActivityType.STAGE_CHANGED,
        title: `Deal moved to ${stage.name}`,
        dealId: deal.id,
        contactId: deal.contactId,
        companyId: deal.companyId,
        actorId: userId,
        metadata: {
          fromStageId: deal.stageId,
          fromStageName: previousStage?.name ?? "Etapa anterior",
          stageId: stage.id,
          stageName: stage.name,
          pipelineId: stage.pipelineId,
        },
      },
    });
  }
}
