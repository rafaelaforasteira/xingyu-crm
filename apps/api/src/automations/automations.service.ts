import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { paginate, paginationArgs } from "../common/types/paginated-response";
import { notDeleted, softDeleteData } from "../common/utils/soft-delete";
import {
  CreateAutomationDto,
  UpdateAutomationDto,
  QueryAutomationsDto,
  ToggleAutomationDto,
} from "./dto/automation.dto";
import { PaginationQueryDto } from "../common/dto/pagination.dto";

@Injectable()
export class AutomationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: QueryAutomationsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { skip, take } = paginationArgs(page, pageSize);
    const where: Record<string, unknown> = {
      organizationId,
      ...notDeleted,
      ...(query.enabled !== undefined ? { enabled: query.enabled } : {}),
      ...(query.triggerType ? { triggerType: query.triggerType } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: "insensitive" } }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.automation.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: "desc" },
      }),
      this.prisma.automation.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async findOne(organizationId: string, id: string) {
    const item = await this.prisma.automation.findFirst({
      where: { id, organizationId, ...notDeleted },
    });
    if (!item) throw new NotFoundException(`Automation ${id} not found`);
    return item;
  }

  async create(organizationId: string, dto: CreateAutomationDto) {
    return this.prisma.automation.create({
      data: {
        ...dto,
        organizationId,
        enabled: dto.enabled ?? false,
        triggerConfig: dto.triggerConfig ?? {},
        actions: dto.actions ?? {},
      },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateAutomationDto) {
    await this.findOne(organizationId, id);
    return this.prisma.automation.update({ where: { id }, data: dto });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.automation.update({ where: { id }, data: softDeleteData() });
  }

  async toggle(organizationId: string, id: string, dto: ToggleAutomationDto) {
    await this.findOne(organizationId, id);
    return this.prisma.automation.update({
      where: { id },
      data: { enabled: dto.enabled },
    });
  }

  async listExecutions(organizationId: string, automationId: string, query: PaginationQueryDto) {
    await this.findOne(organizationId, automationId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { skip, take } = paginationArgs(page, pageSize);
    const where = { automationId, organizationId };
    const [data, total] = await Promise.all([
      this.prisma.automationExecution.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.automationExecution.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }
}
