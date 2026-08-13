import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  ArrayUnique,
  IsEmail,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { Transform, Type } from "class-transformer";

export const PIPELINE_DUPLICATE_STRATEGIES = ["MERGE", "CREATE_NEW", "REJECT"] as const;
export const PIPELINE_ROUTING_MODES = ["PIPELINE_DEFAULTS", "FIXED", "ROUND_ROBIN"] as const;
export const CHANNEL_ACCESS_MODES = ["ORGANIZATION", "PIPELINE", "PERSONAL"] as const;

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

export class UpdateChannelOwnershipDto {
  @ApiProperty({ enum: CHANNEL_ACCESS_MODES })
  @IsIn(CHANNEL_ACCESS_MODES)
  accessMode!: (typeof CHANNEL_ACCESS_MODES)[number];

  @ApiPropertyOptional({ nullable: true, description: "Required for PERSONAL channels" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  ownerUserId?: string | null;
}

function trimmedString({ value }: { value: unknown }) {
  return typeof value === "string" ? value.trim() : value;
}

export class SimulatePipelineLeadDto {
  @ApiProperty({ example: "Marina Oliveira" })
  @Transform(trimmedString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({
    example: "+55 11 99999-0000",
    description:
      "Normalized for duplicate lookup; Brazilian local numbers receive country code +55",
  })
  @IsOptional()
  @Transform(trimmedString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({ example: "marina@example.com" })
  @IsOptional()
  @Transform(trimmedString)
  @IsEmail()
  @MaxLength(320)
  email?: string;

  @ApiPropertyOptional({ example: "@marina.semijoias" })
  @IsOptional()
  @Transform(trimmedString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  instagram?: string;

  @ApiProperty({ example: "Olá, gostaria de receber o catálogo." })
  @Transform(trimmedString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message!: string;

  @ApiPropertyOptional({
    minimum: 0,
    maximum: 999999999999.99,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999999999.99)
  estimatedValue?: number;
}
