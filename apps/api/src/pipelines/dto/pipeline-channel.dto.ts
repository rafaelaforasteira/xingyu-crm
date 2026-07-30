import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export const PIPELINE_DUPLICATE_STRATEGIES = ["MERGE", "CREATE_NEW", "REJECT"] as const;
export const PIPELINE_ROUTING_MODES = ["PIPELINE_DEFAULTS", "FIXED", "ROUND_ROBIN"] as const;

export type PipelineDuplicateStrategyValue = (typeof PIPELINE_DUPLICATE_STRATEGIES)[number];
export type PipelineRoutingModeValue = (typeof PIPELINE_ROUTING_MODES)[number];

export class ConnectPipelineChannelDto {
  @ApiProperty({
    description: "Existing Channel id. Channel is the shared integration account.",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  channelId!: string;

  @ApiProperty({ description: "Initial stage for leads routed by this connection" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  defaultStageId!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  defaultOwnerId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  defaultTeamId?: string | null;

  @ApiPropertyOptional({ type: [String], maxItems: 50, default: [] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsString({ each: true })
  defaultTagIds?: string[];

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  source?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  campaignId?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  createContact?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  createConversation?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  createDeal?: boolean;

  @ApiPropertyOptional({
    enum: PIPELINE_DUPLICATE_STRATEGIES,
    default: "MERGE",
  })
  @IsOptional()
  @IsIn(PIPELINE_DUPLICATE_STRATEGIES)
  duplicateStrategy?: PipelineDuplicateStrategyValue;

  @ApiPropertyOptional({
    enum: PIPELINE_ROUTING_MODES,
    default: "PIPELINE_DEFAULTS",
  })
  @IsOptional()
  @IsIn(PIPELINE_ROUTING_MODES)
  routingMode?: PipelineRoutingModeValue;
}

export class UpdatePipelineChannelDto extends PartialType(
  OmitType(ConnectPipelineChannelDto, ["channelId"] as const),
) {}
