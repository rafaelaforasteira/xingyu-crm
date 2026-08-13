import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { GoalMetric, GoalScope } from "@xingyu/database";
import { IsDateString, IsEnum, IsOptional, IsString, Matches } from "class-validator";

export class UpsertGoalDto {
  @ApiProperty({ enum: GoalMetric }) @IsEnum(GoalMetric) metric!: GoalMetric;
  @ApiProperty({ enum: GoalScope }) @IsEnum(GoalScope) scope!: GoalScope;
  @ApiPropertyOptional() @IsOptional() @IsString() teamId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() userId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pipelineId?: string;
  @ApiProperty({ example: "150000.00" })
  @IsString()
  @Matches(/^\d{1,12}(\.\d{1,2})?$/)
  targetValue!: string;
  @ApiProperty() @IsDateString() periodStart!: string;
  @ApiProperty() @IsDateString() periodEnd!: string;
}

export class QueryGoalsDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;
  @ApiPropertyOptional({ enum: GoalMetric }) @IsOptional() @IsEnum(GoalMetric) metric?: GoalMetric;
  @ApiPropertyOptional({ enum: GoalScope }) @IsOptional() @IsEnum(GoalScope) scope?: GoalScope;
  @ApiPropertyOptional() @IsOptional() @IsString() teamId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() userId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pipelineId?: string;
}
