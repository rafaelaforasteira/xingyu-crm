import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { Type } from "class-transformer";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";

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
  @ApiProperty()
  @IsString()
  @MaxLength(10000)
  body!: string;

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
}
