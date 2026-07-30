import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PipelineStageType, Prisma } from "@xingyu/database";
import { PrismaService } from "../prisma/prisma.service";
import { paginate, paginationArgs } from "../common/types/paginated-response";
import {
  CreatePipelineDto,
  CreateStageDto,
  DeleteStageDto,
  DuplicatePipelineDto,
  QueryPipelinesDto,
  QueryStagesDto,
  ReorderStagesDto,
  UpdatePipelineDto,
  UpdateStageDto,
} from "./dto/pipeline.dto";

const activeStageWhere = { deletedAt: null, archived: false } as const;
const pipelineChannelConnectionsInclude = {
  where: { deletedAt: null },
  orderBy: { createdAt: "asc" },
  select: {
    active: true,
    channel: {
      select: {
        id: true,
        name: true,
        displayName: true,
        type: true,
        isActive: true,
      },
    },
  },
} satisfies Prisma.Pipeline$channelConnectionsArgs;

type DbClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class PipelinesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: QueryPipelinesDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { skip, take } = paginationArgs(page, pageSize);
    const where: Prisma.PipelineWhereInput = {
      organizationId,
      deletedAt: null,
      archived: query.archived ?? false,
      ...(query.favorite === undefined ? {} : { favorite: query.favorite }),
      ...(query.search
        ? { name: { contains: query.search.trim(), mode: "insensitive" } }
        : {}),
    };

    const [pipelines, total] = await Promise.all([
      this.prisma.pipeline.findMany({
        where,
        skip,
        take,
        orderBy: [{ position: "asc" }, { name: "asc" }],
        include: {
          defaultTeam: { select: { id: true, name: true } },
          defaultOwner: { select: { id: true, name: true, avatarUrl: true } },
          stages: {
            where: activeStageWhere,
            orderBy: { position: "asc" },
          },
          channelConnections: pipelineChannelConnectionsInclude,
        },
      }),
      this.prisma.pipeline.count({ where }),
    ]);

    const ids = pipelines.map((pipeline) => pipeline.id);
    const [dealCounts, openValues] = ids.length
      ? await Promise.all([
          this.prisma.deal.groupBy({
            by: ["pipelineId"],
            where: {
              organizationId,
              pipelineId: { in: ids },
              deletedAt: null,
            },
            _count: { _all: true },
          }),
          this.prisma.deal.groupBy({
            by: ["pipelineId"],
            where: {
              organizationId,
              pipelineId: { in: ids },
              deletedAt: null,
              status: "OPEN",
            },
            _sum: { value: true },
          }),
        ])
      : [[], []];

    const countByPipeline = new Map(
      dealCounts.map((entry) => [entry.pipelineId, entry._count._all]),
    );
    const valueByPipeline = new Map(
      openValues.map((entry) => [entry.pipelineId, Number(entry._sum.value ?? 0)]),
    );

    return paginate(
      pipelines.map(({ channelConnections, ...pipeline }) => ({
        ...pipeline,
        stagesCount: pipeline.stages.length,
        dealsCount: countByPipeline.get(pipeline.id) ?? 0,
        openValue: valueByPipeline.get(pipeline.id) ?? 0,
        channels: channelConnections.map(({ active, channel }) => ({
          id: channel.id,
          name: channel.displayName ?? channel.name,
          type: channel.type,
          enabled: active && channel.isActive,
        })),
      })),
      total,
      page,
      pageSize,
    );
  }

  async findOne(organizationId: string, id: string, db: DbClient = this.prisma) {
    const pipeline = await db.pipeline.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        defaultTeam: { select: { id: true, name: true } },
        defaultOwner: { select: { id: true, name: true, avatarUrl: true } },
        stages: {
          where: { deletedAt: null },
          orderBy: { position: "asc" },
        },
        channelConnections: pipelineChannelConnectionsInclude,
        _count: { select: { deals: { where: { deletedAt: null } } } },
      },
    });
    if (!pipeline) throw new NotFoundException(`Pipeline ${id} not found`);

    const openValue = await db.deal.aggregate({
      where: {
        organizationId,
        pipelineId: id,
        deletedAt: null,
        status: "OPEN",
      },
      _sum: { value: true },
    });

    const { _count, channelConnections, ...result } = pipeline;
    return {
      ...result,
      stagesCount: result.stages.filter((stage) => !stage.archived).length,
      dealsCount: _count.deals,
      openValue: Number(openValue._sum.value ?? 0),
      channels: channelConnections.map(({ active, channel }) => ({
        id: channel.id,
        name: channel.displayName ?? channel.name,
        type: channel.type,
        enabled: active && channel.isActive,
      })),
    };
  }

  async board(organizationId: string, id: string) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        defaultTeam: { select: { id: true, name: true } },
        defaultOwner: { select: { id: true, name: true, avatarUrl: true } },
        stages: {
          where: activeStageWhere,
          orderBy: { position: "asc" },
          include: {
            deals: {
              where: { deletedAt: null, status: "OPEN" },
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
    if (!pipeline) throw new NotFoundException(`Pipeline ${id} not found`);

    return {
      ...pipeline,
      stages: pipeline.stages.map((stage) => ({
        ...stage,
        deals: stage.deals.map((deal) => ({
          ...deal,
          value: Number(deal.value),
          unreadCount: deal.unreadMessages,
          contact: deal.contact
            ? {
                ...deal.contact,
                name: [deal.contact.firstName, deal.contact.lastName]
                  .filter(Boolean)
                  .join(" "),
              }
            : null,
          company: deal.company
            ? {
                ...deal.company,
                name: deal.company.tradeName ?? deal.company.legalName,
              }
            : null,
          tags: deal.tags.map(({ tag }) => tag),
        })),
      })),
    };
  }

  async create(
    organizationId: string,
    dto: CreatePipelineDto,
    userId: string,
  ) {
    const name = this.normalizeName(dto.name);
    await this.ensurePipelineNameAvailable(organizationId, name);
    await this.validateDefaults(
      organizationId,
      dto.defaultTeamId,
      dto.defaultOwnerId,
    );
    const stages = this.prepareStages(dto.stages);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.pipeline.updateMany({
          where: { organizationId, deletedAt: null, isDefault: true },
          data: { isDefault: false, updatedById: userId },
        });
      }
      const maxPosition = await tx.pipeline.aggregate({
        where: { organizationId, deletedAt: null },
        _max: { position: true },
      });
      const pipeline = await tx.pipeline.create({
        data: {
          organizationId,
          name,
          description: this.optionalText(dto.description),
          color: dto.color,
          icon: dto.icon,
          isDefault: dto.isDefault ?? false,
          favorite: dto.favorite ?? false,
          archived: dto.archived ?? false,
          position: dto.position ?? (maxPosition._max.position ?? -1) + 1,
          defaultTeamId: dto.defaultTeamId || null,
          defaultOwnerId: dto.defaultOwnerId || null,
          createdById: userId,
          updatedById: userId,
        },
      });
      await tx.pipelineStage.createMany({
        data: stages.map((stage, index) => ({
          ...stage,
          organizationId,
          pipelineId: pipeline.id,
          position: stage.position ?? index,
        })),
      });
      await this.audit(tx, organizationId, userId, "CREATE", pipeline.id, null, {
        name: pipeline.name,
      });
      return this.findOne(organizationId, pipeline.id, tx);
    });
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdatePipelineDto,
    userId: string,
  ) {
    const existing = await this.findOne(organizationId, id);
    const name = dto.name === undefined ? undefined : this.normalizeName(dto.name);
    if (name) await this.ensurePipelineNameAvailable(organizationId, name, id);
    await this.validateDefaults(
      organizationId,
      dto.defaultTeamId,
      dto.defaultOwnerId,
    );

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.pipeline.updateMany({
          where: {
            organizationId,
            deletedAt: null,
            isDefault: true,
            id: { not: id },
          },
          data: { isDefault: false, updatedById: userId },
        });
      }
      const pipeline = await tx.pipeline.update({
        where: { id },
        data: {
          ...(name === undefined ? {} : { name }),
          ...(dto.description === undefined
            ? {}
            : { description: this.optionalText(dto.description) }),
          ...(dto.color === undefined ? {} : { color: dto.color }),
          ...(dto.icon === undefined ? {} : { icon: dto.icon }),
          ...(dto.isDefault === undefined ? {} : { isDefault: dto.isDefault }),
          ...(dto.favorite === undefined ? {} : { favorite: dto.favorite }),
          ...(dto.archived === undefined ? {} : { archived: dto.archived }),
          ...(dto.position === undefined ? {} : { position: dto.position }),
          ...("defaultTeamId" in dto
            ? { defaultTeamId: dto.defaultTeamId || null }
            : {}),
          ...("defaultOwnerId" in dto
            ? { defaultOwnerId: dto.defaultOwnerId || null }
            : {}),
          updatedById: userId,
        },
      });
      await this.audit(
        tx,
        organizationId,
        userId,
        "UPDATE",
        id,
        this.pipelineSnapshot(existing),
        this.pipelineSnapshot(pipeline),
      );
      return this.findOne(organizationId, id, tx);
    });
  }

  async duplicate(
    organizationId: string,
    id: string,
    dto: DuplicatePipelineDto,
    userId: string,
  ) {
    const source = await this.findOne(organizationId, id);
    const name = dto.name
      ? this.normalizeName(dto.name)
      : await this.nextCopyName(organizationId, source.name);
    await this.ensurePipelineNameAvailable(organizationId, name);

    return this.prisma.$transaction(async (tx) => {
      const maxPosition = await tx.pipeline.aggregate({
        where: { organizationId, deletedAt: null },
        _max: { position: true },
      });
      const copy = await tx.pipeline.create({
        data: {
          organizationId,
          name,
          description: source.description,
          color: source.color,
          icon: source.icon,
          favorite: false,
          archived: false,
          position: (maxPosition._max.position ?? -1) + 1,
          defaultTeamId: source.defaultTeamId,
          defaultOwnerId: source.defaultOwnerId,
          createdById: userId,
          updatedById: userId,
        },
      });
      await tx.pipelineStage.createMany({
        data: source.stages
          .filter((stage) => !stage.deletedAt && !stage.archived)
          .map((stage) => ({
            organizationId,
            pipelineId: copy.id,
            name: stage.name,
            description: stage.description,
            color: stage.color,
            position: stage.position,
            type: stage.type,
            isInitial: stage.isInitial,
            maxDurationMinutes: stage.maxDurationMinutes,
            probability: stage.probability,
            isWon: stage.isWon,
            isLost: stage.isLost,
            maxDaysInStage: stage.maxDaysInStage,
            rules: stage.rules ?? Prisma.JsonNull,
          })),
      });
      await this.audit(tx, organizationId, userId, "DUPLICATE", copy.id, null, {
        sourcePipelineId: id,
        name,
      });
      return this.findOne(organizationId, copy.id, tx);
    });
  }

  async archive(organizationId: string, id: string, userId: string) {
    const existing = await this.findOne(organizationId, id);
    if (existing.isDefault) {
      throw new ConflictException("The default pipeline cannot be archived");
    }
    return this.setArchived(organizationId, id, true, userId);
  }

  async restore(organizationId: string, id: string, userId: string) {
    await this.findOne(organizationId, id);
    return this.setArchived(organizationId, id, false, userId);
  }

  async remove(organizationId: string, id: string, userId: string) {
    const existing = await this.findOne(organizationId, id);
    if (existing.isDefault) {
      throw new ConflictException("The default pipeline cannot be deleted");
    }
    if (existing.dealsCount > 0) {
      throw new ConflictException("Pipeline has deals and cannot be deleted");
    }
    return this.prisma.$transaction(async (tx) => {
      const deletedAt = new Date();
      const pipeline = await tx.pipeline.update({
        where: { id },
        data: { deletedAt, archived: true, updatedById: userId },
      });
      await tx.pipelineStage.updateMany({
        where: { pipelineId: id, deletedAt: null },
        data: { deletedAt, archived: true },
      });
      await this.audit(
        tx,
        organizationId,
        userId,
        "DELETE",
        id,
        this.pipelineSnapshot(existing),
        null,
      );
      return pipeline;
    });
  }

  async getStages(
    organizationId: string,
    pipelineId: string,
    query: QueryStagesDto,
  ) {
    await this.findOne(organizationId, pipelineId);
    return this.prisma.pipelineStage.findMany({
      where: {
        organizationId,
        pipelineId,
        deletedAt: null,
        archived: query.archived ?? false,
      },
      orderBy: { position: "asc" },
      include: { _count: { select: { deals: { where: { deletedAt: null } } } } },
    });
  }

  async addStage(
    organizationId: string,
    pipelineId: string,
    dto: CreateStageDto,
    userId: string,
  ) {
    await this.findOne(organizationId, pipelineId);
    const stage = this.normalizeStage(dto);

    return this.prisma.$transaction(async (tx) => {
      if (stage.isInitial) {
        await tx.pipelineStage.updateMany({
          where: { pipelineId, deletedAt: null, isInitial: true },
          data: { isInitial: false },
        });
      }
      const maxPosition = await tx.pipelineStage.aggregate({
        where: { pipelineId, deletedAt: null, archived: false },
        _max: { position: true },
      });
      const created = await tx.pipelineStage.create({
        data: {
          ...stage,
          organizationId,
          pipelineId,
          position: dto.position ?? (maxPosition._max.position ?? -1) + 1,
        },
      });
      await this.audit(
        tx,
        organizationId,
        userId,
        "CREATE_STAGE",
        created.id,
        null,
        this.stageSnapshot(created),
      );
      return created;
    });
  }

  async updateStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
    dto: UpdateStageDto,
    userId: string,
  ) {
    await this.findOne(organizationId, pipelineId);
    const existing = await this.requireStage(organizationId, pipelineId, stageId);
    const type = this.resolveStageType(dto, existing.type);
    const isInitial =
      type === "OPEN" && dto.archived !== true
        ? (dto.isInitial ?? existing.isInitial)
        : false;

    if (
      existing.type === "OPEN" &&
      (type !== "OPEN" || dto.archived === true)
    ) {
      await this.ensureAnotherOpenStage(pipelineId, stageId);
    }

    return this.prisma.$transaction(async (tx) => {
      if (isInitial) {
        await tx.pipelineStage.updateMany({
          where: {
            pipelineId,
            deletedAt: null,
            isInitial: true,
            id: { not: stageId },
          },
          data: { isInitial: false },
        });
      } else if (existing.isInitial && (type !== "OPEN" || dto.archived === true)) {
        const replacement = await tx.pipelineStage.findFirst({
          where: {
            pipelineId,
            deletedAt: null,
            archived: false,
            type: "OPEN",
            id: { not: stageId },
          },
          orderBy: { position: "asc" },
          select: { id: true },
        });
        if (replacement) {
          await tx.pipelineStage.update({
            where: { id: replacement.id },
            data: { isInitial: true },
          });
        }
      }
      const updated = await tx.pipelineStage.update({
        where: { id: stageId },
        data: {
          ...(dto.name === undefined
            ? {}
            : { name: this.normalizeName(dto.name) }),
          ...(dto.description === undefined
            ? {}
            : { description: this.optionalText(dto.description) }),
          ...(dto.color === undefined ? {} : { color: dto.color }),
          ...(dto.position === undefined ? {} : { position: dto.position }),
          ...(dto.maxDurationMinutes === undefined
            ? {}
            : { maxDurationMinutes: dto.maxDurationMinutes }),
          ...(dto.maxDaysInStage === undefined
            ? {}
            : {
                maxDaysInStage: dto.maxDaysInStage,
                maxDurationMinutes: dto.maxDaysInStage * 1440,
              }),
          ...(dto.probability === undefined
            ? {}
            : { probability: dto.probability }),
          ...(dto.archived === undefined ? {} : { archived: dto.archived }),
          type,
          isInitial,
          isWon: type === "WON",
          isLost: type === "LOST",
        },
      });
      await this.audit(
        tx,
        organizationId,
        userId,
        "UPDATE_STAGE",
        stageId,
        this.stageSnapshot(existing),
        this.stageSnapshot(updated),
      );
      return updated;
    });
  }

  async reorderStages(
    organizationId: string,
    pipelineId: string,
    dto: ReorderStagesDto,
    userId: string,
  ) {
    await this.findOne(organizationId, pipelineId);
    const stages = await this.prisma.pipelineStage.findMany({
      where: { organizationId, pipelineId, ...activeStageWhere },
      select: { id: true },
      orderBy: { position: "asc" },
    });
    const currentIds = stages.map((stage) => stage.id);
    if (
      dto.stageIds.length !== currentIds.length ||
      dto.stageIds.some((id) => !currentIds.includes(id))
    ) {
      throw new BadRequestException(
        "stageIds must contain every active stage in this pipeline exactly once",
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await Promise.all(
        dto.stageIds.map((stageId, position) =>
          tx.pipelineStage.update({ where: { id: stageId }, data: { position } }),
        ),
      );
      await this.audit(
        tx,
        organizationId,
        userId,
        "REORDER_STAGES",
        pipelineId,
        { stageIds: currentIds },
        { stageIds: dto.stageIds },
      );
    });
    return this.getStages(organizationId, pipelineId, {});
  }

  async removeStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
    dto: DeleteStageDto,
    userId: string,
  ) {
    await this.findOne(organizationId, pipelineId);
    const stage = await this.requireStage(organizationId, pipelineId, stageId);
    if (stage.type === "OPEN") await this.ensureAnotherOpenStage(pipelineId, stageId);

    const deals = await this.prisma.deal.findMany({
      where: { organizationId, pipelineId, stageId, deletedAt: null },
      select: { id: true },
    });
    let target:
      | Awaited<ReturnType<PipelinesService["requireStage"]>>
      | undefined;
    if (deals.length) {
      if (!dto.targetStageId) {
        throw new ConflictException(
          "Stage has deals; select targetStageId before deleting it",
        );
      }
      if (dto.targetStageId === stageId) {
        throw new BadRequestException("Target stage must be different");
      }
      target = await this.requireStage(
        organizationId,
        pipelineId,
        dto.targetStageId,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (target && deals.length) {
        const movedAt = new Date();
        await tx.deal.updateMany({
          where: { id: { in: deals.map((deal) => deal.id) } },
          data: {
            stageId: target.id,
            enteredStageAt: movedAt,
            status:
              target.type === "WON"
                ? "WON"
                : target.type === "LOST"
                  ? "LOST"
                  : "OPEN",
            closedAt: target.type === "OPEN" ? null : movedAt,
            updatedById: userId,
          },
        });
        await tx.dealStageHistory.createMany({
          data: deals.map((deal) => ({
            dealId: deal.id,
            stageId: target!.id,
            fromStageId: stage.id,
            movedById: userId,
            movedAt,
            note: "Stage removed; deal moved transactionally",
          })),
        });
        await tx.activity.createMany({
          data: deals.map((deal) => ({
            organizationId,
            type: "STAGE_CHANGED",
            title: `Deal moved to ${target!.name}`,
            description: `Source stage ${stage.name} was removed`,
            dealId: deal.id,
            actorId: userId,
          })),
        });
      }
      const deletedAt = new Date();
      const removed = await tx.pipelineStage.update({
        where: { id: stageId },
        data: { archived: true, deletedAt, isInitial: false },
      });
      const remaining = await tx.pipelineStage.findMany({
        where: { pipelineId, ...activeStageWhere },
        orderBy: { position: "asc" },
        select: { id: true },
      });
      await Promise.all(
        remaining.map((entry, position) =>
          tx.pipelineStage.update({
            where: { id: entry.id },
            data: { position },
          }),
        ),
      );
      await this.audit(
        tx,
        organizationId,
        userId,
        "DELETE_STAGE",
        stageId,
        this.stageSnapshot(stage),
        target ? { movedDeals: deals.length, targetStageId: target.id } : null,
      );
      return removed;
    });
  }

  private async setArchived(
    organizationId: string,
    id: string,
    archived: boolean,
    userId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const pipeline = await tx.pipeline.update({
        where: { id },
        data: { archived, updatedById: userId },
      });
      await this.audit(
        tx,
        organizationId,
        userId,
        archived ? "ARCHIVE" : "RESTORE",
        id,
        { archived: !archived },
        { archived },
      );
      return this.findOne(organizationId, id, tx);
    });
  }

  private prepareStages(input?: CreateStageDto[]) {
    const source =
      input?.length
        ? input
        : [
            {
              name: "Nova oportunidade",
              color: "#A78BFA",
              type: "OPEN" as const,
              isInitial: true,
              probability: 10,
            },
          ];
    const stages = source.map((stage) => this.normalizeStage(stage));
    if (!stages.some((stage) => stage.type === "OPEN")) {
      throw new BadRequestException("Pipeline needs at least one open stage");
    }
    const requestedInitials = stages.filter((stage) => stage.isInitial);
    if (requestedInitials.length > 1) {
      throw new BadRequestException("Pipeline can have only one initial stage");
    }
    if (!requestedInitials.length) {
      const firstOpen = stages.find((stage) => stage.type === "OPEN");
      if (firstOpen) firstOpen.isInitial = true;
    }
    return stages;
  }

  private normalizeStage(dto: CreateStageDto) {
    const type = this.resolveStageType(dto, "OPEN");
    if (dto.isInitial && type !== "OPEN") {
      throw new BadRequestException("Won or lost stages cannot be initial");
    }
    return {
      name: this.normalizeName(dto.name),
      description: this.optionalText(dto.description),
      color: dto.color,
      position: dto.position,
      type,
      isInitial: dto.isInitial ?? false,
      maxDurationMinutes:
        dto.maxDurationMinutes ??
        (dto.maxDaysInStage === undefined
          ? undefined
          : dto.maxDaysInStage * 1440),
      probability: dto.probability,
      archived: dto.archived ?? false,
      isWon: type === "WON",
      isLost: type === "LOST",
      maxDaysInStage: dto.maxDaysInStage,
    };
  }

  private resolveStageType(
    dto: Pick<CreateStageDto, "type" | "isWon" | "isLost">,
    fallback: PipelineStageType,
  ): PipelineStageType {
    if (dto.isWon && dto.isLost) {
      throw new BadRequestException("Stage cannot be won and lost at the same time");
    }
    if (dto.type && dto.isWon && dto.type !== "WON") {
      throw new BadRequestException("type conflicts with isWon");
    }
    if (dto.type && dto.isLost && dto.type !== "LOST") {
      throw new BadRequestException("type conflicts with isLost");
    }
    if (dto.type) return dto.type as PipelineStageType;
    if (dto.isWon) return "WON";
    if (dto.isLost) return "LOST";
    if (dto.isWon === false && fallback === "WON") return "OPEN";
    if (dto.isLost === false && fallback === "LOST") return "OPEN";
    return fallback;
  }

  private async requireStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
  ) {
    const stage = await this.prisma.pipelineStage.findFirst({
      where: {
        id: stageId,
        organizationId,
        pipelineId,
        deletedAt: null,
        archived: false,
      },
    });
    if (!stage) throw new NotFoundException(`Stage ${stageId} not found`);
    return stage;
  }

  private async ensureAnotherOpenStage(pipelineId: string, excludedId: string) {
    const count = await this.prisma.pipelineStage.count({
      where: {
        pipelineId,
        deletedAt: null,
        archived: false,
        type: "OPEN",
        id: { not: excludedId },
      },
    });
    if (!count) {
      throw new ConflictException("Pipeline must keep at least one open stage");
    }
  }

  private async ensurePipelineNameAvailable(
    organizationId: string,
    name: string,
    excludedId?: string,
  ) {
    const existing = await this.prisma.pipeline.findFirst({
      where: {
        organizationId,
        deletedAt: null,
        name: { equals: name, mode: "insensitive" },
        ...(excludedId ? { id: { not: excludedId } } : {}),
      },
      select: { id: true },
    });
    if (existing) throw new ConflictException("A pipeline with this name already exists");
  }

  private async validateDefaults(
    organizationId: string,
    teamId?: string | null,
    ownerId?: string | null,
  ) {
    if (teamId) {
      const team = await this.prisma.team.findFirst({
        where: { id: teamId, organizationId, deletedAt: null },
        select: { id: true },
      });
      if (!team) throw new BadRequestException("Default team is invalid");
    }
    if (ownerId) {
      const owner = await this.prisma.user.findFirst({
        where: { id: ownerId, organizationId, deletedAt: null },
        select: { id: true },
      });
      if (!owner) throw new BadRequestException("Default owner is invalid");
    }
  }

  private async nextCopyName(organizationId: string, sourceName: string) {
    const base = `${sourceName} (cópia)`;
    for (let suffix = 1; suffix < 1000; suffix += 1) {
      const candidate = suffix === 1 ? base : `${base} ${suffix}`;
      const exists = await this.prisma.pipeline.findFirst({
        where: {
          organizationId,
          deletedAt: null,
          name: { equals: candidate, mode: "insensitive" },
        },
        select: { id: true },
      });
      if (!exists) return candidate;
    }
    throw new ConflictException("Could not generate a unique pipeline copy name");
  }

  private normalizeName(value: string) {
    const normalized = value.trim();
    if (!normalized) throw new BadRequestException("Name cannot be empty");
    return normalized;
  }

  private optionalText(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private pipelineSnapshot(pipeline: {
    name: string;
    description?: string | null;
    color?: string | null;
    icon?: string | null;
    favorite?: boolean;
    archived?: boolean;
    isDefault?: boolean;
  }) {
    return {
      name: pipeline.name,
      description: pipeline.description ?? null,
      color: pipeline.color ?? null,
      icon: pipeline.icon ?? null,
      favorite: pipeline.favorite ?? false,
      archived: pipeline.archived ?? false,
      isDefault: pipeline.isDefault ?? false,
    };
  }

  private stageSnapshot(stage: {
    name: string;
    type: PipelineStageType;
    position: number;
    isInitial: boolean;
    archived: boolean;
  }) {
    return {
      name: stage.name,
      type: stage.type,
      position: stage.position,
      isInitial: stage.isInitial,
      archived: stage.archived,
    };
  }

  private async audit(
    tx: Prisma.TransactionClient,
    organizationId: string,
    userId: string,
    action: string,
    entityId: string,
    before: Prisma.InputJsonValue | null,
    after: Prisma.InputJsonValue | null,
  ) {
    await tx.auditLog.create({
      data: {
        organizationId,
        userId,
        action,
        entityType: action.includes("STAGE") ? "PipelineStage" : "Pipeline",
        entityId,
        before: before ?? Prisma.JsonNull,
        after: after ?? Prisma.JsonNull,
      },
    });
  }
}
