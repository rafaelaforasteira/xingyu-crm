import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";

export class CreateAutomationDto {
  @ApiProperty() @IsString() @MaxLength(200) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scopeType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scopeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() templateKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() definition?: Record<string, unknown>;
}

export class SaveDraftDto {
  @ApiProperty() @IsObject() definition!: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsInt() revision?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() settings?: Record<string, unknown>;
}

export class QueryAutomationsDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() triggerType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pipelineId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enabled?: boolean;
}

export class QueryExecutionsDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() automationId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subjectId?: string;
}

export class ToggleAutomationDto {
  @ApiProperty() @IsBoolean() enabled!: boolean;
}

export class TestAutomationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() dealId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() orderId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() dryRun?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsObject() context?: Record<string, unknown>;
}

export class TestNodeDto {
  @ApiProperty() @IsString() type!: string;
  @ApiProperty() @IsObject() config!: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsObject() context?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() dryRun?: boolean;
}

export class RetryExecutionDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() fromStart?: boolean;
}

export class ManualRunDto {
  @ApiPropertyOptional() @IsOptional() @IsString() dealId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() orderId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() dryRun?: boolean;
}

export class AutomationConditionDto {
  @ApiProperty() @IsString() field!: string;
  @ApiProperty() @IsString() operator!: string;
  @ApiPropertyOptional() @IsOptional() value?: unknown;
}

export class AutomationActionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() id?: string;
  @ApiProperty() @IsString() type!: string;
  @ApiProperty() @IsObject() config!: Record<string, unknown>;
}

export class UpdateAutomationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() triggerType?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() triggerConfig?: Record<string, unknown>;
  @ApiPropertyOptional({ type: [AutomationConditionDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => AutomationConditionDto) conditions?: AutomationConditionDto[];
  @ApiPropertyOptional({ type: [AutomationActionDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => AutomationActionDto) actions?: AutomationActionDto[];
  @ApiPropertyOptional() @IsOptional() @IsIn(["always", "once", "skipIfActive", "replace", "cooldown"]) reentry?: string;
}
