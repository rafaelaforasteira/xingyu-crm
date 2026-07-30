import { Transform, Type, type TransformFnParams } from "class-transformer";
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";

export const PIPELINE_STAGE_TYPES = ["OPEN", "WON", "LOST"] as const;
export type PipelineStageTypeValue = (typeof PIPELINE_STAGE_TYPES)[number];

function optionalBoolean({ value, obj, key }: TransformFnParams) {
  const raw =
    obj && typeof obj === "object" && key in obj
      ? (obj as Record<string, unknown>)[key]
      : value;
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (raw === true || raw === "true" || raw === "1") return true;
  if (raw === false || raw === "false" || raw === "0") return false;
  return raw;
}

export class CreateStageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  color?: string;

  @ApiPropertyOptional({ enum: PIPELINE_STAGE_TYPES, default: "OPEN" })
  @IsOptional()
  @IsIn(PIPELINE_STAGE_TYPES)
  type?: PipelineStageTypeValue;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isInitial?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  maxDurationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  probability?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  archived?: boolean;

  /** @deprecated Kept for backward-compatible API clients. Prefer `type`. */
  @ApiPropertyOptional({ deprecated: true })
  @IsOptional()
  @IsBoolean()
  isWon?: boolean;

  /** @deprecated Kept for backward-compatible API clients. Prefer `type`. */
  @ApiPropertyOptional({ deprecated: true })
  @IsOptional()
  @IsBoolean()
  isLost?: boolean;

  /** @deprecated Kept for backward-compatible API clients. Prefer `maxDurationMinutes`. */
  @ApiPropertyOptional({ deprecated: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxDaysInStage?: number;
}

export class UpdateStageDto extends PartialType(CreateStageDto) {}

export class CreatePipelineDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  favorite?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  archived?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  defaultTeamId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  defaultOwnerId?: string;

  @ApiPropertyOptional({ type: [CreateStageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStageDto)
  stages?: CreateStageDto[];
}

export class UpdatePipelineDto extends PartialType(CreatePipelineDto) {}

export class DuplicatePipelineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;
}

export class ReorderStagesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  stageIds!: string[];
}

export class DeleteStageDto {
  @ApiPropertyOptional({
    description: "Destination stage used when the deleted stage has active deals",
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  targetStageId?: string;
}

export class QueryStagesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(optionalBoolean)
  @IsBoolean()
  archived?: boolean;
}

export class QueryPipelinesDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(optionalBoolean)
  @IsBoolean()
  archived?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(optionalBoolean)
  @IsBoolean()
  favorite?: boolean;
}
