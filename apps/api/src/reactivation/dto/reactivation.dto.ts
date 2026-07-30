import { ContactStatus } from "@xingyu/database";
import { Transform, Type } from "class-transformer";
import {
  IsEnum,
  IsIn,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
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
