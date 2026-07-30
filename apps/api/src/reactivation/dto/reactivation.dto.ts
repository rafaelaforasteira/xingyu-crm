import { ContactStatus } from "@xingyu/database";
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsISO8601,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";

export enum ReactivationSegment {
  NEVER_PURCHASED = "lead_nunca_comprou",
  PURCHASED_ONCE = "comprou_uma_vez",
  LAPSED_REPEAT_CUSTOMER = "recorrente_parou",
  UNRESPONSIVE_CUSTOMER = "cliente_sem_resposta",
}

export enum ReactivationCandidateStatus {
  LEAD = "LEAD",
  QUALIFIED = "QUALIFIED",
  ACTIVE_CUSTOMER = "ACTIVE_CUSTOMER",
  INACTIVE = "INACTIVE",
}

export enum ReactivationSortBy {
  SCORE = "score",
  DAYS_INACTIVE = "daysInactive",
  LAST_PURCHASE_AT = "lastPurchaseAt",
  LAST_INTERACTION_AT = "lastInteractionAt",
  NAME = "name",
}

export enum ReactivationActionType {
  APPROACHED = "APPROACHED",
  POSTPONED = "POSTPONED",
  DISCARDED = "DISCARDED",
}

export class CreateReactivationTaskDto {
  @ApiProperty({ maxLength: 200 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ format: "date-time" })
  @IsOptional()
  @IsISO8601({ strict: true })
  dueAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  assigneeId?: string;
}

export class CreateReactivationOpportunityDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ minimum: 0, type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  value?: number;

  @ApiProperty()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  pipelineId!: string;

  @ApiProperty()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  stageId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  ownerId?: string;

  @ApiPropertyOptional({ type: [String], maxItems: 50, uniqueItems: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(100, { each: true })
  tagIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  conversationId?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  createConversation?: boolean;

  @ApiPropertyOptional({ type: () => CreateReactivationTaskDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateReactivationTaskDto)
  task?: CreateReactivationTaskDto;
}

export class CreateReactivationActionDto {
  @ApiProperty({ enum: ReactivationActionType })
  @IsEnum(ReactivationActionType)
  type!: ReactivationActionType;

  @ApiPropertyOptional({
    format: "date-time",
    description: "Required and future-dated for POSTPONED",
  })
  @ValidateIf((dto: CreateReactivationActionDto) => dto.type === ReactivationActionType.POSTPONED)
  @IsISO8601({ strict: true })
  snoozedUntil?: string;

  @ApiPropertyOptional({ maxLength: 1000, description: "Required for DISCARDED" })
  @ValidateIf((dto: CreateReactivationActionDto) => dto.type === ReactivationActionType.DISCARDED)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  reason?: string;
}

export class QueryReactivationDto extends PaginationQueryDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  override search?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  scoreMin?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  scoreMax?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  inactiveDaysMin?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  inactiveDaysMax?: number;

  @ApiPropertyOptional({ enum: ReactivationCandidateStatus })
  @IsOptional()
  @IsEnum(ReactivationCandidateStatus)
  status?: ReactivationCandidateStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  teamId?: string;

  @ApiPropertyOptional({ format: "date-time" })
  @IsOptional()
  @IsISO8601({ strict: true })
  lastPurchaseFrom?: string;

  @ApiPropertyOptional({ format: "date-time" })
  @IsOptional()
  @IsISO8601({ strict: true })
  lastPurchaseTo?: string;

  @ApiPropertyOptional({ format: "date-time" })
  @IsOptional()
  @IsISO8601({ strict: true })
  lastInteractionFrom?: string;

  @ApiPropertyOptional({ format: "date-time" })
  @IsOptional()
  @IsISO8601({ strict: true })
  lastInteractionTo?: string;

  @ApiPropertyOptional({ enum: ReactivationSegment })
  @IsOptional()
  @IsEnum(ReactivationSegment)
  segment?: ReactivationSegment;

  @ApiPropertyOptional({
    enum: ReactivationSortBy,
    default: ReactivationSortBy.SCORE,
  })
  @IsOptional()
  @IsEnum(ReactivationSortBy)
  override sortBy?: ReactivationSortBy = ReactivationSortBy.SCORE;

  @ApiPropertyOptional({ enum: ["asc", "desc"], default: "desc" })
  @IsOptional()
  @IsIn(["asc", "desc"])
  override sortOrder?: "asc" | "desc" = "desc";
}

export class ReactivationRelationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class ReactivationContactDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty({ nullable: true, type: String })
  lastName!: string | null;

  @ApiProperty({ nullable: true, type: String })
  email!: string | null;

  @ApiProperty({ nullable: true, type: String })
  phone!: string | null;

  @ApiProperty({ nullable: true, type: String })
  whatsapp!: string | null;

  @ApiProperty({ nullable: true, type: String })
  instagram!: string | null;

  @ApiProperty({ type: Number })
  totalPurchased!: number;

  @ApiProperty({ type: Number })
  averageTicket!: number;

  @ApiProperty({ type: Number })
  orderCount!: number;
}

export class ReactivationOpenDealDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  pipelineId!: string;

  @ApiProperty()
  stageId!: string;

  @ApiProperty({ nullable: true, type: String })
  conversationId!: string | null;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;
}

export class ReactivationConversationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ nullable: true, type: String })
  subject!: string | null;

  @ApiProperty({ nullable: true, type: String, format: "date-time" })
  lastMessageAt!: string | null;
}

export class ReactivationWorkflowDto {
  @ApiProperty({ enum: ["APPROACHED", "POSTPONED", "DISCARDED", "CONVERTED"] })
  status!: "APPROACHED" | "POSTPONED" | "DISCARDED" | "CONVERTED";

  @ApiProperty({ format: "date-time" })
  actedAt!: string;

  @ApiProperty({ nullable: true, type: String, format: "date-time" })
  snoozedUntil!: string | null;

  @ApiProperty({ nullable: true, type: String })
  reason!: string | null;

  @ApiProperty({ type: () => ReactivationRelationDto, nullable: true })
  actor!: ReactivationRelationDto | null;
}

export class ReactivationItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ type: () => ReactivationContactDto, nullable: true })
  contact!: ReactivationContactDto | null;

  @ApiProperty({ minimum: 0, maximum: 100 })
  score!: number;

  @ApiProperty()
  reason!: string;

  @ApiProperty({ enum: ContactStatus })
  status!: ContactStatus;

  @ApiProperty({ enum: ReactivationSegment })
  classification!: ReactivationSegment;

  @ApiProperty({ minimum: 0 })
  daysInactive!: number;

  @ApiProperty({ nullable: true, type: String, format: "date-time" })
  lastInteractionAt!: string | null;

  @ApiProperty({ nullable: true, type: String, format: "date-time" })
  lastPurchaseAt!: string | null;

  @ApiProperty({ type: () => ReactivationRelationDto, nullable: true })
  owner!: ReactivationRelationDto | null;

  @ApiProperty({ type: () => ReactivationRelationDto, nullable: true })
  team!: ReactivationRelationDto | null;

  @ApiProperty({ nullable: true, type: String })
  existingOpenDealId!: string | null;

  @ApiProperty({ type: () => ReactivationOpenDealDto, nullable: true })
  existingOpenDeal!: ReactivationOpenDealDto | null;

  @ApiProperty({ type: () => ReactivationConversationDto, nullable: true })
  latestConversation!: ReactivationConversationDto | null;

  @ApiProperty({ type: () => ReactivationWorkflowDto, nullable: true })
  workflow!: ReactivationWorkflowDto | null;
}

export class ReactivationPaginationMetaDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  totalPages!: number;
}

export class PaginatedReactivationResponseDto {
  @ApiProperty({ type: () => ReactivationItemDto, isArray: true })
  data!: ReactivationItemDto[];

  @ApiProperty({ type: () => ReactivationPaginationMetaDto })
  meta!: ReactivationPaginationMetaDto;
}
