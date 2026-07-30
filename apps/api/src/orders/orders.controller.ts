import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from "@nestjs/common";
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
} from "./dto/order.dto";

@ApiTags("orders")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: "List orders" })
  findAll(@OrganizationId() orgId: string, @Query() query: QueryOrdersDto) {
    return this.ordersService.findAll(orgId, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get order" })
  findOne(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.ordersService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: "Create order with items" })
  create(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.create(orgId, dto, user.id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update order" })
  update(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.ordersService.update(orgId, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft-delete order" })
  remove(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.ordersService.remove(orgId, id);
  }

  @Post(":id/payments")
  @ApiOperation({ summary: "Add payment" })
  addPayment(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.ordersService.addPayment(orgId, id, dto);
  }

  @Post(":id/shipments")
  @ApiOperation({ summary: "Add shipment" })
  addShipment(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: CreateShipmentDto,
  ) {
    return this.ordersService.addShipment(orgId, id, dto);
  }

  @Patch(":id/status/:status")
  @ApiOperation({ summary: "Update order status" })
  updateStatus(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Param("status") status: string,
  ) {
    return this.ordersService.updateStatus(orgId, id, status);
  }
}
