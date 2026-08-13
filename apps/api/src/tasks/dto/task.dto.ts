import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";

export class CreateTaskDto {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statusDefinitionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dueAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dealId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pipelineId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stageId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ description: "Source note that originated this task" })
  @IsOptional()
  @IsString()
  sourceNoteId?: string;
}

export class UpdateTaskDto extends PartialType(CreateTaskDto) {}

export class QueryTasksDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ["mine", "team", "all"] })
  @IsOptional()
  @IsString()
  scope?: "mine" | "team" | "all";

  @ApiPropertyOptional({ enum: ["open", "completed"] })
  @IsOptional()
  @IsString()
  state?: "open" | "completed";
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statusDefinitionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dealId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pipelineId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stageId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ description: "overdue | today | upcoming | no-date | week" })
  @IsOptional()
  @IsString()
  due?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  override search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  overdue?: boolean;
}

export class RescheduleTaskDto {
  @ApiProperty()
  @IsString()
  dueAt!: string;
}

export class CreateTaskStatusDto {
  @ApiProperty()
  @IsString()
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ enum: ["OPEN", "IN_PROGRESS", "DONE"] })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  position?: number;
}

export class UpdateTaskStatusDto extends PartialType(CreateTaskStatusDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  archived?: boolean;
}

export class ReorderTaskStatusesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  statusIds!: string[];
}
