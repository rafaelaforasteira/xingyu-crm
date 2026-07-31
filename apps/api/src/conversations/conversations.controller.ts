import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiHeader } from "@nestjs/swagger";
import { ConversationsService } from "./conversations.service";
import { OrganizationId } from "../common/decorators/organization.decorator";
import { DemoUser, type DemoUser as DemoUserType } from "../common/decorators/demo-user.decorator";
import {
  CreateConversationDto,
  UpdateConversationDto,
  QueryConversationsDto,
  QueryMessagesDto,
  SendMessageDto,
} from "./dto/conversation.dto";

@ApiTags("conversations")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("conversations")
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: "List conversations (light inbox payload)" })
  findAll(@OrganizationId() orgId: string, @Query() query: QueryConversationsDto) {
    return this.conversationsService.findAll(orgId, query);
  }

  @Get(":id/context")
  @ApiOperation({
    summary: "Lead context panel summary",
    description:
      "Returns counts and summaries only. Use notes/tasks/orders APIs with entity ids from this payload for full lists.",
  })
  getContext(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.conversationsService.getContext(orgId, id);
  }

  @Get(":id/messages")
  @ApiOperation({ summary: "List messages with cursor pagination" })
  listMessages(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Query() query: QueryMessagesDto,
  ) {
    return this.conversationsService.listMessages(orgId, id, query);
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "Mark conversation as read" })
  markAsRead(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.conversationsService.markAsRead(orgId, id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get conversation detail (no message history)" })
  findOne(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.conversationsService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: "Create conversation" })
  create(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Body() dto: CreateConversationDto,
  ) {
    return this.conversationsService.create(orgId, dto, user.id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update conversation" })
  update(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.conversationsService.update(orgId, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft-delete conversation" })
  remove(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.conversationsService.remove(orgId, id);
  }

  @Post(":id/messages")
  @ApiOperation({ summary: "Send message (demo mode)" })
  sendMessage(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Param("id") id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.conversationsService.sendMessage(orgId, id, dto, user.id);
  }
}
