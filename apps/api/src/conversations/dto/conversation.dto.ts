import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";

function splitCsvIds(value: unknown): string[] | undefined {
  if (value == null || value === "") return undefined;
  const parts = Array.isArray(value)
    ? value.map(String)
    : String(value).split(",");
  const unique = Array.from(
    new Set(parts.map((part) => part.trim()).filter(Boolean)),
  );
  return unique.length ? unique.slice(0, 50) : undefined;
}

export class CreateConversationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeId?: string;
}

export class UpdateConversationDto extends PartialType(CreateConversationDto) {}

export class QueryConversationsDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactId?: string;

  @ApiPropertyOptional({ description: "Alias: integration account (Channel) id" })
  @IsOptional()
  @IsString()
  channelId?: string;

  @ApiPropertyOptional({ description: "Alias for channelId (IntegrationAccount)" })
  @IsOptional()
  @IsString()
  integrationAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pipelineId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stageId?: string;

  @ApiPropertyOptional({
    description: "Comma-separated channel ids (OR within group)",
  })
  @IsOptional()
  @Transform(({ value }) => splitCsvIds(value))
  @IsArray()
  @IsString({ each: true })
  channels?: string[];

  @ApiPropertyOptional({
    description: "Comma-separated stage ids (OR within group)",
  })
  @IsOptional()
  @Transform(({ value }) => splitCsvIds(value))
  @IsArray()
  @IsString({ each: true })
  stages?: string[];

  @ApiPropertyOptional({
    description: "Comma-separated tag ids (OR within group)",
  })
  @IsOptional()
  @Transform(({ value }) => splitCsvIds(value))
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tagId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unreadOnly?: boolean;

  @ApiPropertyOptional({
    description:
      "OPEN conversations whose latest non-internal message is INBOUND (awaiting team reply)",
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  awaitingReply?: boolean;

  @ApiPropertyOptional({
    description: "mine = awaiting seller reply; customer = awaiting client reply",
    enum: ["mine", "customer"],
  })
  @IsOptional()
  @IsIn(["mine", "customer"])
  replyStatus?: "mine" | "customer";

  @ApiPropertyOptional({
    description: "open = OPEN/PENDING; closed = RESOLVED/ARCHIVED",
    enum: ["open", "closed"],
  })
  @IsOptional()
  @IsIn(["open", "closed"])
  conversationState?: "open" | "closed";

  @ApiPropertyOptional({
    enum: ["today", "7d", "30d", "older30"],
  })
  @IsOptional()
  @IsIn(["today", "7d", "30d", "older30"])
  period?: "today" | "7d" | "30d" | "older30";

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  withoutAssignee?: boolean;

  @ApiPropertyOptional({ description: "Cursor conversation id or ISO lastMessageAt" })
  @IsOptional()
  @IsString()
  cursor?: string;
}

export class QueryMessagesDto {
  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  pageSize?: number = 50;

  @ApiPropertyOptional({ description: "Message id or ISO sentAt for pagination anchor" })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: "When true, load messages older than cursor" })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  before?: boolean;
}

export class SendMessageDto {
  @ApiPropertyOptional({
    description: "Optional when one or more files are attached",
  })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  body?: string;

  @ApiPropertyOptional({ default: "outbound" })
  @IsOptional()
  @IsString()
  direction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contentType?: string;

  @ApiPropertyOptional({
    description: 'Use "automation" for automated outbound messages',
  })
  @IsOptional()
  @IsString()
  senderType?: string;
}
