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
  SendMessageDto,
} from "./dto/conversation.dto";

@ApiTags("conversations")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("conversations")
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: "List conversations" })
  findAll(@OrganizationId() orgId: string, @Query() query: QueryConversationsDto) {
    return this.conversationsService.findAll(orgId, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get conversation" })
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

  @Get(":id/messages")
  @ApiOperation({ summary: "List messages" })
  listMessages(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Query() query: QueryConversationsDto,
  ) {
    return this.conversationsService.listMessages(orgId, id, query);
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
