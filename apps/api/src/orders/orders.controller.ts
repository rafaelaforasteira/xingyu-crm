import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ForbiddenException,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { ApiTags, ApiOperation, ApiHeader } from "@nestjs/swagger";
import { OrdersService } from "./orders.service";
import { OrganizationId } from "../common/decorators/organization.decorator";
import { DemoUser, type DemoUser as DemoUserType } from "../common/decorators/demo-user.decorator";
import {
  CreateOrderDto,
  UpdateOrderDto,
  QueryOrdersDto,
  CreatePaymentDto,
  CreateShipmentDto,
  CreateOrderStageDto,
  UpdateOrderStageDto,
  ReorderOrderStagesDto,
  UpdateOrderItemSeparationDto,
  UpdateShipmentDto,
  CreateShipmentEventDto,
} from "./dto/order.dto";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types";
import { PipelineAccessService } from "../pipelines/pipeline-access.service";
import { uploadMaxBytes } from "../common/upload/upload.util";

@ApiTags("orders")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("orders")
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly access: PipelineAccessService,
  ) {}

  @Get("stages")
  stages(@OrganizationId() orgId: string, @Query("includeArchived") archived?: string) {
    return this.ordersService.stages(orgId, archived === "true");
  }

  @Post("stages")
  createStage(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrderStageDto,
  ) {
    if (user.role !== "ADMIN") throw new ForbiddenException();
    return this.ordersService.createStage(orgId, dto);
  }
  @Patch("stages/:stageId")
  updateStage(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("stageId") id: string,
    @Body() dto: UpdateOrderStageDto,
  ) {
    if (user.role !== "ADMIN") throw new ForbiddenException();
    return this.ordersService.updateStage(orgId, id, dto);
  }
  @Post("stages/reorder")
  reorderStages(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReorderOrderStagesDto,
  ) {
    if (user.role !== "ADMIN") throw new ForbiddenException();
    return this.ordersService.reorderStages(orgId, dto.stageIds);
  }

  @Get()
  @ApiOperation({ summary: "List orders" })
  async findAll(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryOrdersDto,
  ) {
    return this.ordersService.findAll(orgId, query, await this.access.accessiblePipelineIds(user));
  }

  @Get(":id")
  @ApiOperation({ summary: "Get order" })
  async findOne(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    await this.access.assertOrderAccess(user, id);
    return this.ordersService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: "Create order with items" })
  async create(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Body() dto: CreateOrderDto,
    @CurrentUser() authUser: AuthenticatedUser,
  ) {
    if (dto.dealId) await this.access.assertDealAccess(authUser, dto.dealId);
    return this.ordersService.create(orgId, dto, user.id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update order" })
  async update(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: UpdateOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.access.assertOrderAccess(user, id);
    if (dto.dealId) await this.access.assertDealAccess(user, dto.dealId);
    return this.ordersService.update(orgId, id, dto);
  }

  @Patch(":orderId/items/:itemId")
  @ApiOperation({ summary: "Update an order item's separation state" })
  async updateItemSeparation(
    @OrganizationId() orgId: string,
    @Param("orderId") orderId: string,
    @Param("itemId") itemId: string,
    @Body() dto: UpdateOrderItemSeparationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.access.assertOrderAccess(user, orderId);
    return this.ordersService.updateItemSeparation(orgId, orderId, itemId, dto.isSeparated);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft-delete order" })
  async remove(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    await this.access.assertOrderAccess(user, id);
    return this.ordersService.remove(orgId, id);
  }

  @Post(":id/payments")
  @ApiOperation({ summary: "Add payment" })
  async addPayment(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.access.assertOrderAccess(user, id);
    return this.ordersService.addPayment(orgId, id, dto);
  }

  @Post(":orderId/payments/:paymentId/receipt")
  @ApiOperation({ summary: "Upload a payment receipt when none was provided automatically" })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: uploadMaxBytes(), files: 1 },
    }),
  )
  async uploadPaymentReceipt(
    @OrganizationId() orgId: string,
    @Param("orderId") orderId: string,
    @Param("paymentId") paymentId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.access.assertOrderAccess(user, orderId);
    return this.ordersService.uploadPaymentReceipt(orgId, orderId, paymentId, file);
  }

  @Post(":id/shipments")
  @ApiOperation({ summary: "Add shipment" })
  async addShipment(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: CreateShipmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.access.assertOrderAccess(user, id);
    return this.ordersService.addShipment(orgId, id, dto);
  }

  @Patch(":orderId/shipments/:shipmentId")
  @ApiOperation({ summary: "Update shipment tracking or posting data" })
  async updateShipment(
    @OrganizationId() orgId: string,
    @Param("orderId") orderId: string,
    @Param("shipmentId") shipmentId: string,
    @Body() dto: UpdateShipmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.access.assertOrderAccess(user, orderId);
    return this.ordersService.updateShipment(orgId, orderId, shipmentId, dto);
  }

  @Post(":orderId/shipments/:shipmentId/events")
  @ApiOperation({ summary: "Record a normalized shipment event" })
  async addShipmentEvent(
    @OrganizationId() orgId: string,
    @Param("orderId") orderId: string,
    @Param("shipmentId") shipmentId: string,
    @Body() dto: CreateShipmentEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.access.assertOrderAccess(user, orderId);
    return this.ordersService.addShipmentEvent(orgId, orderId, shipmentId, dto);
  }

  @Patch(":id/status/:status")
  @ApiOperation({ summary: "Update order status" })
  async updateStatus(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Param("status") status: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.access.assertOrderAccess(user, id);
    return this.ordersService.updateStatus(orgId, id, status);
  }
}
