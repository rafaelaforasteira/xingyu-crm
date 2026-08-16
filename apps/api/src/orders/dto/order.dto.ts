import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";

export class OrderItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() productName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sku?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() externalProductId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() externalVariantId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantTitle?: string;
}

export class OrderCustomerSnapshotDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
}

export class OrderAddressSnapshotDto {
  @ApiPropertyOptional() @IsOptional() @IsString() recipientName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address1?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address2?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() number?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() complement?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() neighborhood?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() province?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() postalCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() countryCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() formattedAddress?: string;
}

export class OrderTrackingSnapshotDto {
  @ApiPropertyOptional() @IsOptional() @IsString() source?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() medium?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() campaign?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() content?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() term?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() landingPage?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referrer?: string;
}

export class CreateOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsString() number?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() orderedAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() channel?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() source?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() campaign?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dealId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() operationalStageId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() operationalAssigneeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() operationalPriority?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() operationalDueAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() operationalIssue?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() fulfillmentStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currentLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  total?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() grossValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() shippingCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() taxes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [OrderItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items?: OrderItemDto[];

  @ApiPropertyOptional() @IsOptional() @IsString() externalId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() externalName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() externalUrl?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsIn([
    "PENDING",
    "AWAITING_PAYMENT",
    "AUTHORIZED",
    "PARTIALLY_PAID",
    "PAID",
    "PAYMENT_APPROVED",
    "DECLINED",
    "OVERDUE",
    "PARTIALLY_REFUNDED",
    "REFUNDED",
    "VOIDED",
    "CANCELLED",
  ])
  financialStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentGateway?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() coupon?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFirstPurchase?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) purchaseOrdinal?: number;

  @ApiPropertyOptional({ type: OrderCustomerSnapshotDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderCustomerSnapshotDto)
  customerSnapshot?: OrderCustomerSnapshotDto;

  @ApiPropertyOptional({ type: OrderAddressSnapshotDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderAddressSnapshotDto)
  addressSnapshot?: OrderAddressSnapshotDto;

  @ApiPropertyOptional({ type: OrderTrackingSnapshotDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderTrackingSnapshotDto)
  trackingSnapshot?: OrderTrackingSnapshotDto;
}

export class UpdateOrderDto extends PartialType(CreateOrderDto) {}

export class QueryOrdersDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dealId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() stageId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() operationalAssigneeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() financialStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fulfillmentStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() @Type(() => Boolean) issue?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() @Type(() => Boolean) overdue?: boolean;
}

export class CreateOrderStageDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isInitial?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFinal?: boolean;
  @ApiPropertyOptional() @IsOptional() translations?: Record<string, string>;
}
export class UpdateOrderStageDto extends PartialType(CreateOrderStageDto) {
  @ApiPropertyOptional() @IsOptional() @IsInt() position?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() archived?: boolean;
}
export class ReorderOrderStagesDto {
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) stageIds!: string[];
}

export class CreatePaymentDto {
  @ApiProperty()
  @IsNumber()
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paidAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateShipmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  carrier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trackingCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shippedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  estimatedArrival?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
